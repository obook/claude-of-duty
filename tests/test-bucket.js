/*
 * test-bucket.js
 * Checks the bucket logic (default and configured steps) and the percentage
 * formatting.
 *
 * Author: Olivier Booklage
 * Date: July 2026
 * Licence: MIT
 */

"use strict";

const assert = require("assert");
const { loadModules } = require("./helpers");

const { monitor } = loadModules();

// Buckets default to the lowest 5% multiple at or below the value.
assert.strictEqual(monitor.bucketOf(0), 0);
assert.strictEqual(monitor.bucketOf(4), 0);
assert.strictEqual(monitor.bucketOf(5), 5);
assert.strictEqual(monitor.bucketOf(37), 35);
assert.strictEqual(monitor.bucketOf(99.9), 95);
assert.strictEqual(monitor.bucketOf(100), 100);

// A configured step (10% or 25%) changes the bucket size accordingly.
assert.strictEqual(monitor.bucketOf(37, 10), 30);
assert.strictEqual(monitor.bucketOf(9, 10), 0);
assert.strictEqual(monitor.bucketOf(60, 25), 50);
assert.strictEqual(monitor.bucketOf(100, 25), 100);

// Percentages show one decimal at most, without a trailing ".0".
assert.strictEqual(monitor.formatPercent(10), "10");
assert.strictEqual(monitor.formatPercent(2), "2");
assert.strictEqual(monitor.formatPercent(73.647), "73.6");

console.log("ok - bucket logic and percentage formatting");
