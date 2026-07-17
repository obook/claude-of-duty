/*
 * test-readings-from-usage.js
 * Checks parsing of a real usage payload into meters, that a missing Fable
 * limit degrades gracefully, and that the schema guards warn on odd responses.
 *
 * Author: Olivier Booklage
 * Date: July 2026
 * Licence: MIT
 */

"use strict";

const assert = require("assert");
const { loadModules } = require("./helpers");

const { usageApi } = loadModules();
const readingsFromUsage = usageApi.readingsFromUsage;

/* Runs a function while counting console.warn calls. */
function countWarnings(run) {
  const original = console.warn;
  let warnings = 0;
  console.warn = function () {
    warnings += 1;
  };
  try {
    const result = run();
    return { result: result, warnings: warnings };
  } finally {
    console.warn = original;
  }
}

// A realistic payload gives the three watched meters, in order.
const payload = {
  limits: [
    { kind: "session", percent: 8, resets_at: "2026-07-13T08:50:00Z" },
    { kind: "weekly_all", percent: 37, resets_at: "2026-07-17T09:00:00Z" },
    {
      kind: "weekly_scoped",
      percent: 36,
      resets_at: "2026-07-17T09:00:00Z",
      scope: { model: { display_name: "Fable" } }
    }
  ]
};
const readings = readingsFromUsage(payload);
assert.strictEqual(readings.length, 3);
assert.deepStrictEqual(
  readings.map((reading) => reading.key),
  ["session", "weekly-all", "weekly-scoped-fable"]
);
assert.strictEqual(readings[1].percent, 37);
assert.strictEqual(readings[2].label, "Fable");
assert.strictEqual(readings[0].resetsAt, "2026-07-13T08:50:00Z");

// If the scoped (Fable) limit disappears, the other two still work.
const withoutFable = readingsFromUsage({
  limits: [
    { kind: "session", percent: 8 },
    { kind: "weekly_all", percent: 37 }
  ]
});
assert.strictEqual(withoutFable.length, 2);
assert.ok(!withoutFable.some((reading) => reading.key.startsWith("weekly-scoped")));

// Guard: a response with no "limits" array returns nothing and warns once.
const missing = countWarnings(function () {
  return readingsFromUsage({});
});
assert.strictEqual(missing.result.length, 0);
assert.strictEqual(missing.warnings, 1);

// Guard: limits present but no known kind returns nothing and warns once.
const unknown = countWarnings(function () {
  return readingsFromUsage({ limits: [{ kind: "mystery", percent: 50 }] });
});
assert.strictEqual(unknown.result.length, 0);
assert.strictEqual(unknown.warnings, 1);

console.log("ok - readingsFromUsage and schema guards");
