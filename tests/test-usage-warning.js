/*
 * test-usage-warning.js
 * Checks the guard that flags an unexpected usage API response.
 *
 * Author: Olivier Booklage
 * Date: July 2026
 * Licence: MIT
 */

"use strict";

const assert = require("assert");
const { loadModules } = require("./helpers");

const { usageApi } = loadModules();

const sessionLimit = { kind: "session", percent: 42, resets_at: null };
const unknownLimit = { kind: "brand_new_kind", percent: 42 };

/* Readings parsed from a payload, without console noise in the test output. */
function readingsOf(usage) {
  const originalWarn = console.warn;
  console.warn = function () {};
  const readings = usageApi.readingsFromUsage(usage);
  console.warn = originalWarn;
  return readings;
}

/* True when the payload should raise the popup's API warning banner. */
function looksUnexpected(usage) {
  return usageApi.usageLooksUnexpected(usage, readingsOf(usage));
}

// A well-formed payload with at least one known kind is fine.
assert.strictEqual(looksUnexpected({ limits: [sessionLimit] }), false);
assert.strictEqual(looksUnexpected({ limits: [sessionLimit, unknownLimit] }), false);

// An empty limits array is unusual but not an API change.
assert.strictEqual(looksUnexpected({ limits: [] }), false);

// No limits array, or only unknown kinds: the API probably changed.
assert.strictEqual(looksUnexpected(null), true);
assert.strictEqual(looksUnexpected({}), true);
assert.strictEqual(looksUnexpected({ limits: [unknownLimit] }), true);

console.log("ok - usage API change guard");
