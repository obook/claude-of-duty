/*
 * test-format-reset.js
 * Checks the reset formatting: empty for no date, a remaining time within a
 * day, and a weekday label further out.
 *
 * Author: øbook
 * Date: July 2026
 * Licence: MIT
 */

"use strict";

const assert = require("assert");
const { loadModules } = require("./helpers");

const { monitor } = loadModules();
const formatReset = monitor.formatReset;

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// No reset date yields an empty string.
assert.strictEqual(formatReset(null), "");
assert.strictEqual(formatReset(""), "");

// Within a day: hours and minutes. The small offset avoids a rounding tie.
const inHours = new Date(Date.now() + 2 * HOUR + 30 * MINUTE + 10 * 1000).toISOString();
const hoursText = formatReset(inHours);
assert.ok(/^Resets in \d+ h \d+ min$/.test(hoursText), "hours format: " + hoursText);

// Under an hour: minutes only.
const inMinutes = new Date(Date.now() + 12 * MINUTE + 10 * 1000).toISOString();
const minutesText = formatReset(inMinutes);
assert.ok(/^Resets in \d+ min$/.test(minutesText), "minutes format: " + minutesText);

// More than a day: a weekday label, not a "Resets in" duration.
const later = new Date(Date.now() + 3 * DAY).toISOString();
const laterText = formatReset(later);
assert.ok(laterText.startsWith("Resets "), "weekday format: " + laterText);
assert.ok(!/^Resets in /.test(laterText), "should not be a duration: " + laterText);

console.log("ok - formatReset");
