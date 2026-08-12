/*
 * Atlas Drill — persistent per-user progress.
 *
 * The browser game is fully playable offline against localStorage. This module
 * is the durable, cross-device copy of the same two models:
 *
 *   country_stat   mirrors src/store.js  Stats   { seen, correct, streak, last }
 *   set_progress   mirrors src/course.js Course  { learned, choice, typed, done }
 *
 * Progress-advancing logic lives here rather than in the client, so a tampered
 * client cannot mark 195 countries mastered: the client reports *what happened*
 * ("answered Chad, correctly") and the server derives the new totals.
 */
import { schema, table, t, SenderError } from 'spacetimedb/server';
import type { ReducerCtx, InferSchema } from 'spacetimedb/server';
import type { Identity } from 'spacetimedb';

/**
 * Who may connect, as *seed* data.
 *
 * The live policy lives in the `auth_policy` table so it can be changed with a
 * reducer call instead of a republish; these constants only seed it on first
 * publish. An empty `audience` means "any audience from this issuer" — fill in
 * your SpacetimeAuth client id (the same one `src/config.js` uses) to pin
 * tokens to this application, so a token minted for a different project cannot
 * be replayed here:
 *
 *   { issuer: 'https://auth.spacetimedb.com/oidc', audience: 'client_XXXX' }
 *
 * To trust an additional provider later (a local one during development, say),
 * as the owner — each argument is a separate JSON value:
 *
 *   spacetime call geography-game allow_auth \
 *     '"http://127.0.0.1:9876/oidc"' '"my-dev-client"'
 */
const SEED_POLICY: { issuer: string; audience: string }[] = [
  { issuer: 'https://auth.spacetimedb.com/oidc', audience: '' },
];

/** A set is mastered once you type this share of its names. Matches Course.PASS. */
const PASS = 0.8;

const player = table(
  { name: 'player', public: true },
  {
    identity: t.identity().primaryKey(),
    sub: t.string(),
    issuer: t.string(),
    name: t.string(),
    picture: t.string(),
    first_seen: t.timestamp(),
    last_seen: t.timestamp(),
  }
);

const country_stat = table(
  {
    name: 'country_stat',
    public: true,
    // Every lookup is "this player's row for this country"; the leading column
    // also serves the "all of this player's rows" prefix scan.
    indexes: [{ accessor: 'by_owner_country', algorithm: 'btree', columns: ['owner', 'country'] }],
  },
  {
    id: t.u64().primaryKey().autoInc(),
    owner: t.identity(),
    country: t.string(),
    seen: t.u32(),
    correct: t.u32(),
    streak: t.u32(),
    // Epoch milliseconds, matching the client model, so merges are plain
    // number comparisons on both sides of the wire.
    last_ms: t.i64(),
  }
);

const set_progress = table(
  {
    name: 'set_progress',
    public: true,
    indexes: [{ accessor: 'by_owner_set', algorithm: 'btree', columns: ['owner', 'set_n'] }],
  },
  {
    id: t.u64().primaryKey().autoInc(),
    owner: t.identity(),
    set_n: t.u32(),
    learned: t.bool(),
    choice: t.f32(),
    typed: t.f32(),
    done: t.bool(),
  }
);

/**
 * The publisher's identity, captured on first publish.
 *
 * Without this, tightening the policy below would also lock out the owner's own
 * `spacetime sql`/`logs` and the web dashboard, because those authenticate with
 * a token the *host* issued rather than one from the app's provider.
 */
const module_owner = table({ name: 'module_owner' }, {
  id: t.u32().primaryKey(),
  owner: t.identity(),
});

/** Issuer/audience pairs that may connect. Private: it is not player data. */
const auth_policy = table({ name: 'auth_policy' }, {
  id: t.u64().primaryKey().autoInc(),
  issuer: t.string(),
  audience: t.string(),
});

const spacetimedb = schema({ player, country_stat, set_progress, module_owner, auth_policy });
export default spacetimedb;

type Ctx = ReducerCtx<InferSchema<typeof spacetimedb>>;

/* ------------------------------------------------------------- visibility */

// Progress is private to its owner. Without these, `public: true` would let any
// client subscribe to every player's rows.
export const playerVisible = spacetimedb.clientVisibilityFilter.sql(
  'SELECT * FROM player WHERE player.identity = :sender'
);
export const countryStatVisible = spacetimedb.clientVisibilityFilter.sql(
  'SELECT * FROM country_stat WHERE country_stat.owner = :sender'
);
export const setProgressVisible = spacetimedb.clientVisibilityFilter.sql(
  'SELECT * FROM set_progress WHERE set_progress.owner = :sender'
);

/* ---------------------------------------------------------------- helpers */

function statOf(ctx: Ctx, owner: Identity, country: string) {
  for (const row of ctx.db.country_stat.by_owner_country.filter([owner, country])) return row;
  return null;
}

function progressOf(ctx: Ctx, owner: Identity, setN: number) {
  for (const row of ctx.db.set_progress.by_owner_set.filter([owner, setN])) return row;
  return null;
}

/** A string claim from the JWT payload, or '' when the provider omitted it. */
function claim(payload: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = payload[k];
    if (typeof v === 'string' && v) return v;
  }
  return '';
}

/** True for the identity that published the module. */
function isOwner(ctx: Ctx): boolean {
  const row = ctx.db.module_owner.id.find(0);
  return Boolean(row && row.owner.equals(ctx.sender));
}

/* -------------------------------------------------------------- lifecycle */

export const init = spacetimedb.init(ctx => {
  ctx.db.module_owner.insert({ id: 0, owner: ctx.sender });
  for (const p of SEED_POLICY) {
    ctx.db.auth_policy.insert({ id: 0n, issuer: p.issuer, audience: p.audience });
  }
});

export const onConnect = spacetimedb.clientConnected(ctx => {
  const jwt = ctx.senderAuth.jwt;
  if (!jwt) {
    throw new SenderError('Sign in to sync your progress: this database requires an OIDC token.');
  }

  // The owner's own tooling (spacetime sql/logs, the web dashboard) authenticates
  // with a host-issued token, which will never match an app policy.
  if (!isOwner(ctx)) {
    const policy = [...ctx.db.auth_policy.iter()];
    if (!policy.length) {
      // Only reachable if `init` never ran; refuse rather than accept anyone.
      throw new SenderError('This database has no auth policy configured.');
    }
    const ok = policy.some(
      (p) => p.issuer === jwt.issuer && (!p.audience || jwt.audience.includes(p.audience))
    );
    if (!ok) {
      throw new SenderError(
        `Token from "${jwt.issuer}" for "${jwt.audience.join(',')}" is not accepted by this database.`
      );
    }
  }

  const payload = jwt.fullPayload as Record<string, unknown>;
  const name =
    claim(payload, 'name', 'preferred_username', 'nickname', 'email') || `player-${jwt.subject.slice(0, 6)}`;
  const picture = claim(payload, 'picture');

  const existing = ctx.db.player.identity.find(ctx.sender);
  if (existing) {
    // Display fields can change upstream (renamed GitHub account, new avatar).
    ctx.db.player.identity.update({ ...existing, name, picture, last_seen: ctx.timestamp });
  } else {
    ctx.db.player.insert({
      identity: ctx.sender,
      sub: jwt.subject,
      issuer: jwt.issuer,
      name,
      picture,
      first_seen: ctx.timestamp,
      last_seen: ctx.timestamp,
    });
  }
});

/* ----------------------------------------------------------- auth policy */

/** Trust another issuer (audience '' means any audience from it). Owner only. */
export const allowAuth = spacetimedb.reducer(
  { issuer: t.string(), audience: t.string() },
  (ctx, { issuer, audience }) => {
    if (!isOwner(ctx)) throw new SenderError('Only the module owner can change the auth policy.');
    if (!issuer) throw new SenderError('issuer is required');
    const already = [...ctx.db.auth_policy.iter()].some(
      (p) => p.issuer === issuer && p.audience === audience
    );
    if (!already) ctx.db.auth_policy.insert({ id: 0n, issuer, audience });
  }
);

/** Stop trusting an issuer entirely. Owner only. */
export const denyAuth = spacetimedb.reducer({ issuer: t.string() }, (ctx, { issuer }) => {
  if (!isOwner(ctx)) throw new SenderError('Only the module owner can change the auth policy.');
  for (const row of [...ctx.db.auth_policy.iter()].filter((p) => p.issuer === issuer)) {
    ctx.db.auth_policy.id.delete(row.id);
  }
});

/* ---------------------------------------------------------------- writing */

/**
 * One answered question. Mirrors Stats.record: a miss zeroes the streak, and
 * `seen` counts every attempt so accuracy stays honest.
 */
export const recordAnswer = spacetimedb.reducer(
  { country: t.string(), ok: t.bool() },
  (ctx, { country, ok }) => {
    if (!country) throw new SenderError('country is required');
    const lastMs = ctx.timestamp.microsSinceUnixEpoch / 1000n;
    const row = statOf(ctx, ctx.sender, country);
    if (row) {
      ctx.db.country_stat.id.update({
        ...row,
        seen: row.seen + 1,
        correct: row.correct + (ok ? 1 : 0),
        streak: ok ? row.streak + 1 : 0,
        last_ms: lastMs,
      });
    } else {
      ctx.db.country_stat.insert({
        id: 0n,
        owner: ctx.sender,
        country,
        seen: 1,
        correct: ok ? 1 : 0,
        streak: ok ? 1 : 0,
        last_ms: lastMs,
      });
    }
  }
);

/** The learn phase of a course set was flipped through to the end. */
export const markLearned = spacetimedb.reducer({ set_n: t.u32() }, (ctx, { set_n }) => {
  const row = progressOf(ctx, ctx.sender, set_n);
  if (row) {
    if (!row.learned) ctx.db.set_progress.id.update({ ...row, learned: true });
  } else {
    ctx.db.set_progress.insert({
      id: 0n,
      owner: ctx.sender,
      set_n,
      learned: true,
      choice: 0,
      typed: 0,
      done: false,
    });
  }
});

/**
 * A finished quiz over one set. Only improvements are kept, and `done` latches
 * on once the typed phase clears PASS — mirrors Course.recordQuiz.
 */
export const recordQuiz = spacetimedb.reducer(
  { set_n: t.u32(), phase: t.string(), accuracy: t.f32() },
  (ctx, { set_n, phase, accuracy }) => {
    if (phase !== 'type' && phase !== 'choice') {
      throw new SenderError(`unknown phase: ${phase}`);
    }
    const typed = phase === 'type';
    const acc = Math.max(0, Math.min(1, accuracy));
    const row = progressOf(ctx, ctx.sender, set_n);
    if (row) {
      ctx.db.set_progress.id.update({
        ...row,
        learned: true,
        choice: typed ? row.choice : Math.max(row.choice, acc),
        typed: typed ? Math.max(row.typed, acc) : row.typed,
        done: row.done || (typed && acc >= PASS),
      });
    } else {
      ctx.db.set_progress.insert({
        id: 0n,
        owner: ctx.sender,
        set_n,
        learned: true,
        choice: typed ? 0 : acc,
        typed: typed ? acc : 0,
        done: typed && acc >= PASS,
      });
    }
  }
);

/* -------------------------------------------------------------- migration */

const StatRow = t.object('StatRow', {
  country: t.string(),
  seen: t.u32(),
  correct: t.u32(),
  streak: t.u32(),
  last_ms: t.i64(),
});

const SetRow = t.object('SetRow', {
  set_n: t.u32(),
  learned: t.bool(),
  choice: t.f32(),
  typed: t.f32(),
  done: t.bool(),
});

/**
 * Fold offline progress into the account, taking the better of each pair.
 *
 * Runs when a player signs in on a device that has been played anonymously, and
 * whenever a queued offline write is flushed. Merging by `max` rather than
 * overwriting means it is safe to call repeatedly and from several devices.
 */
export const importProgress = spacetimedb.reducer(
  { stats: t.array(StatRow), sets: t.array(SetRow) },
  (ctx, { stats, sets }) => {
    for (const incoming of stats) {
      if (!incoming.country || incoming.seen === 0) continue;
      const row = statOf(ctx, ctx.sender, incoming.country);
      if (row) {
        // `seen` is the yardstick for "further along"; keep the richer streak
        // and the more recent timestamp regardless.
        const ahead = incoming.seen > row.seen;
        ctx.db.country_stat.id.update({
          ...row,
          seen: Math.max(row.seen, incoming.seen),
          correct: ahead ? Math.max(row.correct, incoming.correct) : row.correct,
          streak: Math.max(row.streak, incoming.streak),
          last_ms: incoming.last_ms > row.last_ms ? incoming.last_ms : row.last_ms,
        });
      } else {
        ctx.db.country_stat.insert({
          id: 0n,
          owner: ctx.sender,
          country: incoming.country,
          seen: incoming.seen,
          correct: Math.min(incoming.correct, incoming.seen),
          streak: Math.min(incoming.streak, incoming.seen),
          last_ms: incoming.last_ms,
        });
      }
    }

    for (const incoming of sets) {
      const acc = (v: number) => Math.max(0, Math.min(1, v));
      const row = progressOf(ctx, ctx.sender, incoming.set_n);
      if (row) {
        ctx.db.set_progress.id.update({
          ...row,
          learned: row.learned || incoming.learned,
          choice: Math.max(row.choice, acc(incoming.choice)),
          typed: Math.max(row.typed, acc(incoming.typed)),
          done: row.done || incoming.done || acc(incoming.typed) >= PASS,
        });
      } else {
        ctx.db.set_progress.insert({
          id: 0n,
          owner: ctx.sender,
          set_n: incoming.set_n,
          learned: incoming.learned,
          choice: acc(incoming.choice),
          typed: acc(incoming.typed),
          done: incoming.done || acc(incoming.typed) >= PASS,
        });
      }
    }
  }
);

/* ---------------------------------------------------------------- erasing */

export const resetStats = spacetimedb.reducer(ctx => {
  // Materialise before deleting: the filter is a live iterator over the index.
  for (const row of [...ctx.db.country_stat.by_owner_country.filter(ctx.sender)]) {
    ctx.db.country_stat.id.delete(row.id);
  }
});

export const resetCourse = spacetimedb.reducer(ctx => {
  for (const row of [...ctx.db.set_progress.by_owner_set.filter(ctx.sender)]) {
    ctx.db.set_progress.id.delete(row.id);
  }
});
