const KEY = 'geoquiz.course.v1';

/** A set is mastered once you type this share of its names from memory. */
export const PASS = 0.8;

/**
 * The study course: the ranked sets from data/countries.json plus the player's
 * progress through each one. A set is worked in three phases —
 *
 *   learn   flip through every country on the map
 *   choice  "Name the country", multiple choice, over that set
 *   type    same question, but you type the name from memory
 *
 * Progress is per set: { learned, choice, typed, done }, where choice/typed are
 * best accuracies (0..1) and `done` latches once typed >= PASS.
 */
export class Course {
  /**
   * @param {{n:number, ids:string[]}[]} sets ranked sets from the data file
   * @param {Map<string, object>} byId country lookup
   */
  constructor(sets, byId) {
    this.sets = Array.isArray(sets) ? sets.filter((s) => s && Array.isArray(s.ids) && s.ids.length) : [];
    this.byId = byId;
    let raw = null;
    try {
      raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    } catch {
      raw = null;
    }
    this.data = raw && raw.s ? raw.s : {};
  }

  /** False when the data file predates the course (no ranked sets in it). */
  get available() {
    return this.sets.length > 0;
  }

  get count() {
    return this.sets.length;
  }

  ids(n) {
    return this.sets.find((s) => s.n === n)?.ids ?? [];
  }

  countries(n) {
    return this.ids(n).map((id) => this.byId.get(id)).filter(Boolean);
  }

  progress(n) {
    return this.data[n] || { learned: false, choice: 0, typed: 0, done: false };
  }

  /** Three headline names, so a set advertises itself without a made-up title. */
  preview(n) {
    return this.countries(n).slice(0, 3).map((c) => c.name).join(' · ');
  }

  markLearned(n) {
    this.#update(n, (p) => ({ ...p, learned: true }));
  }

  /** Record a finished quiz over the set; only improvements are kept. */
  recordQuiz(n, phase, accuracy) {
    const key = phase === 'type' ? 'typed' : 'choice';
    this.#update(n, (p) => ({
      ...p,
      learned: true,
      [key]: Math.max(p[key], accuracy),
      done: p.done || (key === 'typed' && accuracy >= PASS),
    }));
  }

  /** Where "Continue" goes: the first unfinished set, or null with no sets. */
  nextSet() {
    if (!this.available) return null;
    for (const s of this.sets) if (!this.progress(s.n).done) return s.n;
    return this.sets[this.sets.length - 1].n;
  }

  /** Which phase that set should open in. */
  nextPhase(n) {
    const p = this.progress(n);
    if (!p.learned) return 'learn';
    if (p.choice < PASS) return 'choice';
    return 'type';
  }

  summary() {
    const done = this.sets.filter((s) => this.progress(s.n).done).length;
    const started = this.sets.filter((s) => {
      const p = this.progress(s.n);
      return !p.done && (p.learned || p.choice || p.typed);
    }).length;
    return { total: this.sets.length, done, started };
  }

  reset() {
    this.data = {};
    this.#save();
  }

  #update(n, fn) {
    this.data[n] = fn(this.progress(n));
    this.#save();
  }

  #save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ v: 1, s: this.data }));
    } catch {
      /* private mode: play on, just without a saved course */
    }
  }
}
