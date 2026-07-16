/*
 * test-history.js
 * Checks history pruning, entry building, and the linear projection.
 *
 * Author: øbook
 * Date: July 2026
 * Licence: MIT
 */

"use strict";

const assert = require("assert");
const { loadModules } = require("./helpers");

const { history } = loadModules();

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

// pruneHistory drops anything older than 7 days, relative to `now`.
const now = 10 * ONE_DAY_MS;
const mixedAgeHistory = [
  { ts: now - 8 * ONE_DAY_MS }, // just over a week old: dropped
  { ts: now - 7 * ONE_DAY_MS - 1 }, // one millisecond past the cutoff: dropped
  { ts: now - 7 * ONE_DAY_MS }, // exactly at the cutoff: kept
  { ts: now - ONE_DAY_MS }, // well within the week: kept
  { ts: now } // now: kept
];
const pruned = history.pruneHistory(mixedAgeHistory, now);
assert.deepStrictEqual(
  pruned.map((entry) => entry.ts),
  [now - 7 * ONE_DAY_MS, now - ONE_DAY_MS, now]
);

// entryFromReadings builds one entry keyed by each reading's key.
const entry = history.entryFromReadings(
  [
    { key: "session", percent: 42 },
    { key: "weekly-all", percent: 18 }
  ],
  1000
);
assert.deepStrictEqual(entry, { ts: 1000, session: 42, "weekly-all": 18 });

// Fewer than 3 points: no projection.
assert.strictEqual(
  history.millisecondsUntilLimit(
    [
      { ts: 0, session: 10 },
      { ts: ONE_HOUR_MS, session: 20 }
    ],
    "session"
  ),
  null
);

// Flat usage: slope is zero, no projection.
assert.strictEqual(
  history.millisecondsUntilLimit(
    [
      { ts: 0, session: 30 },
      { ts: ONE_HOUR_MS, session: 30 },
      { ts: 2 * ONE_HOUR_MS, session: 30 }
    ],
    "session"
  ),
  null
);

// Decreasing usage (just reset): slope is negative, no projection.
assert.strictEqual(
  history.millisecondsUntilLimit(
    [
      { ts: 0, session: 80 },
      { ts: ONE_HOUR_MS, session: 40 },
      { ts: 2 * ONE_HOUR_MS, session: 5 }
    ],
    "session"
  ),
  null
);

// Perfectly linear climb (10% at t=0, +10 points per hour): reaches 100% at
// hour 9, i.e. 7 hours after the last (hour 2) reading.
const climbing = [
  { ts: 0, session: 10 },
  { ts: ONE_HOUR_MS, session: 20 },
  { ts: 2 * ONE_HOUR_MS, session: 30 }
];
assert.strictEqual(history.millisecondsUntilLimit(climbing, "session"), 7 * ONE_HOUR_MS);

// A key absent from every entry has no data points to project from.
assert.strictEqual(history.millisecondsUntilLimit(climbing, "weekly-all"), null);

console.log("ok - history pruning, entry building, and linear projection");
