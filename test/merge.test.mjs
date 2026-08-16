/*
 * The sync merge has to be a *join*: order-independent, repeatable, and the
 * same rule on both sides. When it is not, two signed-in devices can settle
 * into permanently different numbers with no error anywhere - which is
 * exactly what a tie on `seen` with a different `correct` used to do.
 *
 *   node --test test/
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { Stats } from '../src/store.js';
import { Course } from '../src/course.js';

/** The module's `import_progress` rule, which the client must mirror exactly. */
const serverMergeStat = (row, inc) =>
  !row
    ? { ...inc }
    : {
        country: inc.country,
        seen: Math.max(row.seen, inc.seen),
        correct: Math.max(row.correct, inc.correct),
        streak: Math.max(row.streak, inc.streak),
        lastMs: Math.max(row.lastMs, inc.lastMs),
      };

const statsWith = (data) => {
  const s = new Stats();
  s.data = structuredClone(data);
  return s;
};

const rowsOf = (cloud) =>
  Object.entries(cloud).map(([country, r]) => ({ country, ...r }));

/** One sign-in: pull the account's rows, then push back whatever is ahead. */
function roundTrip(device, cloud) {
  const ahead = device.mergeCloud(rowsOf(cloud));
  for (const a of ahead) {
    cloud[a.country] = serverMergeStat(cloud[a.country], {
      country: a.country,
      seen: a.seen,
      correct: a.correct,
      streak: a.streak,
      lastMs: a.last,
    });
  }
  return cloud;
}

test('a tie on seen still adopts the better correct', () => {
  // The reported bug: phone and laptop both answered Brazil once, one right
  // and one wrong. `seen` matches, so a "whichever side has seen more wins"
  // rule leaves each device convinced of its own number, forever.
  const laptop = statsWith({ BRA: { seen: 1, correct: 0, streak: 0, last: 10 } });
  let cloud = { BRA: { seen: 1, correct: 1, streak: 1, lastMs: 20 } };

  roundTrip(laptop, cloud);

  assert.equal(laptop.get('BRA').correct, 1, 'device must adopt the better correct');
  assert.equal(cloud.BRA.correct, 1, 'account must keep the better correct');
});

test('two devices converge, whatever order they sync in', () => {
  // Deterministic pseudo-random states: same seed every run, no flakiness.
  let seed = 12345;
  const rnd = (n) => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) % n);

  for (let trial = 0; trial < 200; trial++) {
    const ids = ['BRA', 'FRA', 'JPN'];
    const make = () => {
      const d = {};
      for (const id of ids) {
        if (rnd(4) === 0) continue; // country unseen on this device
        const seen = rnd(5) + 1;
        d[id] = { seen, correct: rnd(seen + 1), streak: rnd(seen + 1), last: rnd(100) };
      }
      return d;
    };
    const a = statsWith(make());
    const b = statsWith(make());
    const cloud = {};

    // Interleave the two devices twice, in opposite orders.
    roundTrip(a, cloud);
    roundTrip(b, cloud);
    roundTrip(b, cloud);
    roundTrip(a, cloud);

    for (const id of ids) {
      assert.deepEqual(
        a.get(id),
        b.get(id),
        `trial ${trial}: ${id} diverged (${JSON.stringify(a.get(id))} vs ${JSON.stringify(b.get(id))})`
      );
      assert.ok(a.get(id).correct <= a.get(id).seen, `${id}: correct must not exceed seen`);
    }
  }
});

test('course sets converge too', () => {
  const sets = [{ n: 1, ids: [] }, { n: 2, ids: [] }];
  const phone = new Course(sets, new Map());
  const laptop = new Course(sets, new Map());
  phone.data = { 1: { learned: true, choice: 0.9, typed: 0.4, done: false } };
  laptop.data = { 1: { learned: false, choice: 0.3, typed: 0.85, done: true } };

  const cloudRows = () =>
    Object.entries(phone.data).map(([n, p]) => ({ setN: Number(n), ...p }));

  laptop.mergeCloud(cloudRows());
  phone.mergeCloud(
    Object.entries(laptop.data).map(([n, p]) => ({ setN: Number(n), ...p }))
  );

  assert.deepEqual(phone.progress(1), laptop.progress(1));
  assert.equal(phone.progress(1).choice, 0.9, 'best accuracy of the pair survives');
  assert.equal(phone.progress(1).typed, 0.85);
  assert.equal(phone.progress(1).done, true, 'done latches');
});
