import { haversineKm } from './projection.js';
import { sampleWeighted, shuffle } from './store.js';
import { matchName, identify, NEAR_MISS, normalizeName } from './names.js';

export const MODES = {
  find: {
    label: 'Find on map',
    blurb: 'We name a country — you click it.',
    kind: 'click',
    prompt: (c) => c.name,
    hint: (c) => `Capital: ${c.capital ?? '—'} · ${c.subregion}`,
  },
  capital: {
    label: 'Capital to country',
    blurb: 'We name a capital city — you click its country.',
    kind: 'click',
    prompt: (c) => c.capital,
    hint: (c) => c.subregion,
  },
  name: {
    label: 'Name the country',
    blurb: 'We highlight a country — you pick its name.',
    kind: 'choice',
    prompt: () => 'Which country is highlighted?',
    hint: (c) => c.subregion,
  },
  type: {
    label: 'Type the name',
    blurb: 'We highlight a country — you type its name from memory.',
    kind: 'text',
    prompt: () => 'Type the highlighted country',
    hint: (c) => `${c.subregion} · capital ${c.capital ?? '—'}`,
  },
};

export const MAX_ATTEMPTS = 3;

/** One quiz session: question order, attempts, scoring. No DOM, no map. */
export class Quiz {
  /**
   * @param {{countries:Array, ids:string[], mode:keyof MODES, length:number, stats:import('./store.js').Stats}} opts
   */
  constructor({ countries, ids, mode, length, stats }) {
    this.mode = mode;
    this.spec = MODES[mode];
    this.stats = stats;
    this.all = countries;
    this.byId = new Map(countries.map((c) => [c.id, c]));
    this.pool = ids.filter((id) => this.byId.has(id) && (mode !== 'capital' || this.byId.get(id).capital));
    this.order = sampleWeighted(this.pool, length || this.pool.length, (id) => stats.weight(id));
    this.index = 0;
    this.attempts = 0;
    this.revealed = false;
    this.right = 0;
    this.missed = []; // revealed without ever getting it
    this.shaky = []; // got it, but not on the first try
    this.startedAt = Date.now();
    this.#makeChoices();
  }

  get total() {
    return this.order.length;
  }

  get country() {
    return this.byId.get(this.order[this.index]);
  }

  get done() {
    return this.index >= this.order.length;
  }

  get promptText() {
    return this.spec.prompt(this.country);
  }

  /** Neighbour-biased distractors: same subregion first, then same region. */
  #makeChoices() {
    if (this.done || this.spec.kind !== 'choice') {
      this.choices = null;
      return;
    }
    const target = this.country;
    const rank = (c) =>
      c.subregion === target.subregion ? 0 : c.region === target.region ? 1 : 2;
    const others = [...this.byId.values()]
      .filter((c) => c.id !== target.id)
      .sort((a, b) => rank(a) - rank(b) || Math.random() - 0.5)
      .slice(0, 12);
    this.choices = shuffle([target, ...shuffle(others).slice(0, 3)]);
  }

  /**
   * Judge a map click.
   * @returns {{ok:boolean, revealed:boolean, attempts:number, distanceKm:number|null, picked:object|null}}
   */
  answerClick(picked, ll) {
    if (this.done || this.revealed) return null;
    const target = this.country;
    const ok = picked?.id === target.id;
    this.attempts++;
    if (ok) return this.#settle(true, { picked, distanceKm: 0 });
    const distanceKm = ll ? haversineKm(ll, target.center) : null;
    if (this.attempts >= MAX_ATTEMPTS) return this.#settle(false, { picked, distanceKm });
    return { ok: false, revealed: false, attempts: this.attempts, distanceKm, picked };
  }

  /** Judge a multiple-choice answer (one attempt, then reveal). */
  answerChoice(id) {
    if (this.done || this.revealed) return null;
    this.attempts++;
    return this.#settle(id === this.country.id, { picked: this.byId.get(id), distanceKm: null });
  }

  /**
   * Judge a typed answer. A spelling slip still counts (at second-try credit),
   * because the point is knowing which country it is, not orthography.
   * @returns {{ok:boolean, revealed:boolean, attempts:number, verdict:string,
   *            picked:object|null, note:string|null}}
   */
  answerText(text) {
    if (this.done || this.revealed) return null;
    const input = String(text ?? '').trim();
    if (!input) return null;
    const target = this.country;
    this.attempts++;
    const verdict = matchName(input, target, this.all);
    const picked = verdict === 'exact' ? target : this.byId.get(identify(input, this.all)) ?? null;
    // "England" and "Korea" are wrong for a reason worth explaining.
    const note = verdict === 'exact' ? null : NEAR_MISS[normalizeName(input)] ?? null;
    const extra = { verdict, note, input, distanceKm: null };
    if (verdict === 'exact') return this.#settle(true, { ...extra, picked });
    if (verdict === 'close') {
      // Spelt wrong but unmistakably this country: accept, never at full credit.
      if (this.attempts === 1) this.attempts = 2;
      return this.#settle(true, { ...extra, picked: target });
    }
    if (this.attempts >= MAX_ATTEMPTS) return this.#settle(false, { ...extra, picked });
    return { ok: false, revealed: false, attempts: this.attempts, picked, ...extra };
  }

  /** Give up on the current question: counts as missed, reveals the answer. */
  reveal() {
    if (this.done || this.revealed) return null;
    this.attempts = MAX_ATTEMPTS;
    return this.#settle(false, { picked: null, distanceKm: null });
  }

  #settle(ok, extra) {
    this.revealed = true;
    const firstTry = ok && this.attempts === 1;
    if (ok) this.right += firstTry ? 1 : 0.5;
    if (!ok) this.missed.push(this.country.id);
    else if (!firstTry) this.shaky.push(this.country.id);
    // Only a clean first-try answer counts as knowing it.
    this.stats.record(this.country.id, firstTry);
    return { ok, revealed: true, attempts: this.attempts, firstTry, ...extra };
  }

  next() {
    this.index++;
    this.attempts = 0;
    this.revealed = false;
    this.#makeChoices();
    return this.done ? null : this.country;
  }

  results() {
    // Ending early scores what you actually answered, not the planned length.
    const asked = this.done ? this.total : this.index + (this.revealed ? 1 : 0);
    return {
      score: this.right,
      asked,
      total: this.total,
      accuracy: asked ? this.right / asked : 0,
      missed: [...new Set(this.missed)],
      shaky: [...new Set(this.shaky)],
      seconds: Math.round((Date.now() - this.startedAt) / 1000),
    };
  }
}
