/*
 * test-alert-decisions.js
 * Checks the pure decision helpers behind alerts: crossing direction, alert
 * kind, snooze, and the adaptive polling period.
 *
 * Author: Olivier Booklage
 * Date: July 2026
 * Licence: MIT
 */

"use strict";

const assert = require("assert");
const { loadModules } = require("./helpers");

const { monitor } = loadModules();

// A higher bucket means usage climbed; a lower one means the limit reset.
assert.strictEqual(monitor.directionOf(5, 10), "up");
assert.strictEqual(monitor.directionOf(95, 0), "down");

// One climbing meter makes the whole batch a usage alert.
assert.strictEqual(monitor.kindForDirections(["up"]), "usage");
assert.strictEqual(monitor.kindForDirections(["down", "up"]), "usage");
assert.strictEqual(monitor.kindForDirections(["down"]), "reset");
assert.strictEqual(monitor.kindForDirections(["down", "down"]), "reset");

// Snoozed strictly until the stored timestamp; missing value means active.
assert.strictEqual(monitor.isSnoozed(1000, 999), true);
assert.strictEqual(monitor.isSnoozed(1000, 1000), false);
assert.strictEqual(monitor.isSnoozed(undefined, 1000), false);
assert.strictEqual(monitor.isSnoozed(null, 1000), false);

// Polling stays at 5 minutes below 80% and tightens to 1 minute from there.
assert.strictEqual(monitor.pollPeriodFor([{ percent: 10 }, { percent: 79.9 }]), 5);
assert.strictEqual(monitor.pollPeriodFor([{ percent: 80 }, { percent: 10 }]), 1);
assert.strictEqual(monitor.pollPeriodFor([]), 5);

console.log("ok - alert decisions (direction, kind, snooze, poll period)");
