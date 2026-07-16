/*
 * test-badge-color.js
 * Checks the green / orange / red badge color thresholds.
 *
 * Author: øbook
 * Date: July 2026
 * Licence: MIT
 */

"use strict";

const assert = require("assert");
const { loadModules } = require("./helpers");

const { badge } = loadModules();

const GREEN = "#2e7d32";
const ORANGE = "#e08a34";
const RED = "#c62828";

// Below 70%: green.
assert.strictEqual(badge.colorFor(0), GREEN);
assert.strictEqual(badge.colorFor(69), GREEN);

// From 70% to 89%: orange.
assert.strictEqual(badge.colorFor(70), ORANGE);
assert.strictEqual(badge.colorFor(89), ORANGE);

// From 90% up: red.
assert.strictEqual(badge.colorFor(90), RED);
assert.strictEqual(badge.colorFor(100), RED);

console.log("ok - badge color thresholds");
