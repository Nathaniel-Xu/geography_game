/*
 * Backend sync: mirrors the two local models into SpacetimeDB and back.
 *
 * The rule is that localStorage stays authoritative for *playing* — every answer
 * is written locally first and the game never blocks on the network. The account
 * copy is reconciled by a merge that keeps the better of each pair, which makes
 * the design offline-tolerant without a queue: any write lost to a dropped
 * connection is folded back in by the next merge, from either side.
 */
import { DbConnection, tables } from '../vendor/spacetimedb/bindings.js';
import { SPACETIME } from './config.js';

/** Which account's progress the local cache belongs to. */
const OWNER_KEY = 'geoquiz.auth.owner';

export class Cloud {
  #stats;
  #course;
  #onStatus;
  #onData;
  #conn = null;
  #state = 'off';
  #detail = '';
  /** Whether this session ever completed a sync, which separates "refused" from "dropped". */
  #everSynced = false;

  /**
   * @param {{stats: object, course: object,
   *          onStatus: (state: string, detail: string) => void,
   *          onData: () => void}} deps
   */
  constructor({ stats, course, onStatus, onData }) {
    this.#stats = stats;
    this.#course = course;
    this.#onStatus = onStatus;
    this.#onData = onData;
  }

  /** 'off' | 'connecting' | 'synced' | 'offline' | 'error' */
  get state() {
    return this.#state;
  }

  get detail() {
    return this.#detail;
  }

  /**
   * Open a session for `sub` (the OIDC subject) using `token` (an id token).
   *
   * @param {string} token
   * @param {string} sub
   */
  connect(token, sub) {
    this.disconnect();

    // A different account on this browser must not inherit — or upload — the
    // progress cached for the previous one.
    let owner = null;
    try {
      owner = localStorage.getItem(OWNER_KEY);
      localStorage.setItem(OWNER_KEY, sub);
    } catch {
      /* private mode */
    }
    if (owner && owner !== sub) {
      this.#stats.clearLocal();
      this.#course.clearLocal();
      this.#onData();
    }

    this.#everSynced = false;
    this.#set('connecting');
    this.#conn = DbConnection.builder()
      .withUri(SPACETIME.host)
      .withDatabaseName(SPACETIME.dbName)
      .withToken(token)
      .onConnect((conn) => {
        conn
          .subscriptionBuilder()
          .onApplied(() => this.#sync())
          .onError((_ctx, err) => this.#set('error', String(err?.message || err || 'subscription failed')))
          .subscribe([tables.player, tables.countryStat, tables.setProgress]);
      })
      .onConnectError((_ctx, err) => this.#set('error', this.#explain(err)))
      .onDisconnect((_ctx, err) => {
        this.#unsink();
        if (this.#state === 'off') return; // we asked for it
        // A token the module refuses still completes the WebSocket handshake and
        // is closed straight afterwards, so a never-synced session that ends is a
        // rejection — calling it "offline" would promise a reconnect that cannot
        // happen. Only a session that worked degrades to 'offline'.
        if (this.#everSynced) this.#set('offline');
        else this.#set('error', this.#explain(err));
      })
      .build();
  }

  disconnect() {
    this.#unsink();
    const conn = this.#conn;
    this.#conn = null;
    this.#set('off');
    try {
      conn?.disconnect();
    } catch {
      /* already gone */
    }
  }

  /* --------------------------------------------------------------- internals */

  #sync() {
    const conn = this.#conn;
    if (!conn?.isActive) return;

    const statRows = [...conn.db.countryStat.iter()].map((r) => ({
      country: r.country,
      seen: r.seen,
      correct: r.correct,
      streak: r.streak,
      lastMs: Number(r.lastMs),
    }));
    const setRows = [...conn.db.setProgress.iter()].map((r) => ({
      setN: r.setN,
      learned: r.learned,
      choice: r.choice,
      typed: r.typed,
      done: r.done,
    }));

    const stats = this.#stats.mergeCloud(statRows);
    const sets = this.#course.mergeCloud(setRows);

    if (stats.length || sets.length) {
      conn.reducers
        .importProgress({
          stats: stats.map((s) => ({
            country: s.country,
            seen: s.seen,
            correct: s.correct,
            streak: s.streak,
            lastMs: BigInt(Math.max(0, Math.round(s.last || 0))),
          })),
          sets: sets.map((s) => ({
            setN: s.setN,
            learned: Boolean(s.learned),
            choice: s.choice || 0,
            typed: s.typed || 0,
            done: Boolean(s.done),
          })),
        })
        .catch((err) => this.#set('error', String(err?.message || err)));
    }

    this.#watch(conn);
    this.#sink(conn);
    this.#everSynced = true;
    this.#set('synced');
    this.#onData();
  }

  /** Fold in changes made on another device while this tab is open. */
  #watch(conn) {
    const pullStat = (row) => {
      this.#stats.mergeCloud([
        {
          country: row.country,
          seen: row.seen,
          correct: row.correct,
          streak: row.streak,
          lastMs: Number(row.lastMs),
        },
      ]);
      this.#onData();
    };
    const pullSet = (row) => {
      this.#course.mergeCloud([
        { setN: row.setN, learned: row.learned, choice: row.choice, typed: row.typed, done: row.done },
      ]);
      this.#onData();
    };
    conn.db.countryStat.onInsert((_ctx, row) => pullStat(row));
    conn.db.countryStat.onUpdate((_ctx, _old, row) => pullStat(row));
    conn.db.setProgress.onInsert((_ctx, row) => pullSet(row));
    conn.db.setProgress.onUpdate((_ctx, _old, row) => pullSet(row));
  }

  /**
   * Mirror local mutations to the module. Reducers report *what happened* and
   * the module derives the totals, so these calls cannot forge progress.
   */
  #sink(conn) {
    const send = (run) => {
      // Dropped while offline on purpose: the next #sync() reconciles it.
      if (!this.#conn?.isActive) return;
      try {
        run().catch((err) => this.#set('error', String(err?.message || err)));
      } catch (err) {
        this.#set('error', String(err?.message || err));
      }
    };
    this.#stats.sink = {
      answer: (country, ok) => send(() => conn.reducers.recordAnswer({ country, ok })),
      resetStats: () => send(() => conn.reducers.resetStats()),
    };
    this.#course.sink = {
      learned: (setN) => send(() => conn.reducers.markLearned({ setN })),
      quiz: (setN, phase, accuracy) => send(() => conn.reducers.recordQuiz({ setN, phase, accuracy })),
      resetCourse: () => send(() => conn.reducers.resetCourse()),
    };
  }

  #unsink() {
    this.#stats.sink = null;
    this.#course.sink = null;
  }

  #set(state, detail = '') {
    this.#state = state;
    this.#detail = detail;
    this.#onStatus(state, detail);
  }

  /** Connection failures are usually one of a few knowable things. */
  #explain(err) {
    const msg = String(err?.message || err || '');
    if (/401|unauthor|token|jwt|not accepted|auth policy|issuer|audience/i.test(msg)) {
      return `Sign-in refused by the database: ${msg}`;
    }
    if (/404|not found|no such database/i.test(msg)) {
      return `No database named "${SPACETIME.dbName}" at ${SPACETIME.host}.`;
    }
    if (!msg) {
      // The module refuses a connection by closing it, often without a reason
      // reaching the client, so name the likely cause instead of guessing.
      return 'The database closed the session. Its auth policy may not accept this sign-in.';
    }
    return msg;
  }
}
