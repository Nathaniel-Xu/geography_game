const KEY = 'geoquiz.stats.v1';

/**
 * Per-country mastery, persisted in localStorage:
 *   { seen, correct, streak, last }  (last = epoch ms)
 * Used both for the progress panel and for weighted question sampling.
 *
 * `sink` is an optional backend mirror (see src/cloud.js). Local state is always
 * written first, so play never waits on — or breaks with — the network.
 */
export class Stats {
  constructor() {
    let raw = null;
    try {
      raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    } catch {
      raw = null;
    }
    this.data = raw && raw.c ? raw.c : {};
    this.sink = null;
  }

  get(id) {
    return this.data[id] || { seen: 0, correct: 0, streak: 0, last: 0 };
  }

  record(id, ok) {
    const s = this.get(id);
    const next = {
      seen: s.seen + 1,
      correct: s.correct + (ok ? 1 : 0),
      streak: ok ? s.streak + 1 : 0,
      last: Date.now(),
    };
    this.data[id] = next;
    this.#save();
    this.sink?.answer(id, ok);
    return next;
  }

  /** 0..1 confidence that the country is learned; drives sampling + colours. */
  mastery(id) {
    const { seen, correct, streak } = this.get(id);
    if (!seen) return 0;
    const rate = correct / seen;
    return Math.max(0, Math.min(1, rate * 0.6 + Math.min(streak, 3) / 3 * 0.4));
  }

  /**
   * Sampling weight: never-seen countries come first, then the ones you keep
   * missing, then a light refresher on things you got right a while ago.
   */
  weight(id) {
    const s = this.get(id);
    if (!s.seen) return 6;
    const w = 1 + 6 * (1 - this.mastery(id));
    const days = (Date.now() - s.last) / 86400000;
    return w * (1 + Math.min(days, 14) / 14);
  }

  reset() {
    this.data = {};
    this.#save();
    this.sink?.resetStats();
  }

  /** Forget this browser's copy without touching the account's copy. */
  clearLocal() {
    this.data = {};
    this.#save();
  }

  /**
   * Fold the account's rows into the local copy, keeping the better of each
   * pair, and report the countries where this browser is still ahead.
   *
   * Same max-based rule as the module's `importProgress`, so the two can run in
   * either order and converge — which is what makes offline play safe: every
   * missed write is reconciled by the next merge.
   *
   * @param {{country:string, seen:number, correct:number, streak:number, lastMs:number}[]} rows
   * @returns {{country:string, seen:number, correct:number, streak:number, last:number}[]}
   */
  mergeCloud(rows) {
    const cloud = new Map(rows.map((r) => [r.country, r]));
    for (const [country, r] of cloud) {
      const local = this.data[country];
      if (!local) {
        this.data[country] = { seen: r.seen, correct: r.correct, streak: r.streak, last: r.lastMs };
        continue;
      }
      // Whichever side has answered more times owns the accuracy.
      const cloudAhead = r.seen > local.seen;
      this.data[country] = {
        seen: Math.max(local.seen, r.seen),
        correct: cloudAhead ? Math.max(local.correct, r.correct) : local.correct,
        streak: Math.max(local.streak, r.streak),
        last: Math.max(local.last, r.lastMs),
      };
    }

    const ahead = [];
    for (const [country, s] of Object.entries(this.data)) {
      if (!s.seen) continue;
      const r = cloud.get(country);
      if (!r || s.seen !== r.seen || s.correct !== r.correct || s.streak !== r.streak || s.last !== r.lastMs) {
        ahead.push({ country, ...s });
      }
    }
    this.#save();
    return ahead;
  }

  summary(ids) {
    let learned = 0, seen = 0, shaky = 0;
    for (const id of ids) {
      const s = this.get(id);
      if (!s.seen) continue;
      seen++;
      if (this.mastery(id) >= 0.8) learned++;
      else shaky++;
    }
    return { total: ids.length, seen, learned, shaky };
  }

  #save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ v: 1, c: this.data }));
    } catch {
      /* private mode: keep playing, just don't persist */
    }
  }
}

/** Weighted sample of `n` distinct ids (weights from `weightOf`). */
export function sampleWeighted(ids, n, weightOf) {
  const pool = ids.slice();
  const out = [];
  n = Math.min(n, pool.length);
  while (out.length < n) {
    let total = 0;
    for (const id of pool) total += weightOf(id);
    let r = Math.random() * total;
    let i = 0;
    for (; i < pool.length - 1; i++) {
      r -= weightOf(pool[i]);
      if (r <= 0) break;
    }
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
