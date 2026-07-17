/*
 * test-format-trend.js
 * Checks the trend line: hidden with no projection or no reset time, "on
 * track" when the reset comes first, a duration otherwise.
 *
 * Author: Olivier Booklage
 * Date: July 2026
 * Licence: MIT
 */

"use strict";

const assert = require("assert");
const { loadModules } = require("./helpers");

const { monitor } = loadModules();

const HOUR_MS = 60 * 60 * 1000;
const now = Date.now();

// A perfectly linear climb of 10 points per hour, ending "now": the meter
// reaches 100% seven hours after the last reading.
const climbingHistory = [
  { ts: now - 2 * HOUR_MS, session: 10 },
  { ts: now - HOUR_MS, session: 20 },
  { ts: now, session: 30 }
];

// No history point for this key at all: nothing to project.
assert.strictEqual(monitor.formatTrend({ key: "session", resetsAt: null }, []), "");

// A projection exists, but there is no reset time to compare it against.
assert.strictEqual(monitor.formatTrend({ key: "session", resetsAt: null }, climbingHistory), "");

// The reset comes before the projected limit (5h < 7h): the user is fine,
// the window resets before usage would ever reach 100%.
const resetSoon = new Date(now + 5 * HOUR_MS).toISOString();
assert.strictEqual(
  monitor.formatTrend({ key: "session", resetsAt: resetSoon }, climbingHistory),
  "On track for reset."
);

// The projected limit comes before the reset (7h < 10h): show the duration.
const resetLater = new Date(now + 10 * HOUR_MS).toISOString();
assert.strictEqual(
  monitor.formatTrend({ key: "session", resetsAt: resetLater }, climbingHistory),
  "At this rate: limit in ~7h"
);

// Already at 100%: show "Limit reached." regardless of the projection, since
// a minimum-1h floor would otherwise understate how close usage already is.
assert.strictEqual(
  monitor.formatTrend({ key: "session", percent: 100, resetsAt: resetLater }, climbingHistory),
  "Limit reached."
);

// Not yet at 100%, but the projection lands under 30 minutes out: still
// "Limit reached.", not a misleading "~1h".
const almostThereHistory = [
  { ts: now - 2 * HOUR_MS, session: 10 },
  { ts: now - HOUR_MS, session: 55 },
  { ts: now, session: 99 }
];
assert.strictEqual(
  monitor.formatTrend({ key: "session", percent: 99, resetsAt: resetLater }, almostThereHistory),
  "Limit reached."
);

console.log("ok - formatTrend");
