/*
 * test-chart-fallback-label.js
 * Checks the popup chart's readable fallback label for a meter that has
 * dropped out of the current readings but still has history points.
 *
 * chart.js is a popup script (it touches the DOM at load time), so the pure
 * fallbackLabel logic is duplicated here rather than loaded through
 * helpers.js, which only wires up the background scripts.
 *
 * Author: Olivier Booklage
 * Date: July 2026
 * Licence: MIT
 */

"use strict";

const assert = require("assert");

/* Mirrors src/popup/chart.js's fallbackLabel. */
function fallbackLabel(key) {
  return key
    .replace(/^weekly-scoped-/, "")
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

assert.strictEqual(fallbackLabel("weekly-scoped-opus"), "Opus");
assert.strictEqual(fallbackLabel("weekly-scoped-claude-fable"), "Claude Fable");
assert.strictEqual(fallbackLabel("session"), "Session");

console.log("ok - chart fallback label");
