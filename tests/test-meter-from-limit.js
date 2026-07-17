/*
 * test-meter-from-limit.js
 * Checks how a raw "limit" entry maps to a watched meter, including the
 * scoped-model cases (Fable now, another model later, or none).
 *
 * Author: Olivier Booklage
 * Date: July 2026
 * Licence: MIT
 */

"use strict";

const assert = require("assert");
const { loadModules } = require("./helpers");

const { usageApi } = loadModules();
const meterFromLimit = usageApi.meterFromLimit;

assert.deepStrictEqual(
  meterFromLimit({ kind: "session" }),
  { key: "session", label: "Current session" }
);

assert.deepStrictEqual(
  meterFromLimit({ kind: "weekly_all" }),
  { key: "weekly-all", label: "All models" }
);

// The scoped weekly limit is keyed and labelled by its model name.
assert.deepStrictEqual(
  meterFromLimit({ kind: "weekly_scoped", scope: { model: { display_name: "Fable" } } }),
  { key: "weekly-scoped-fable", label: "Fable" }
);

// A different model gets its own key, so several scoped limits never collide.
assert.deepStrictEqual(
  meterFromLimit({ kind: "weekly_scoped", scope: { model: { display_name: "Opus 4.8" } } }),
  { key: "weekly-scoped-opus-4-8", label: "Opus 4.8" }
);

// A scoped limit with no model falls back to a generic label.
assert.deepStrictEqual(
  meterFromLimit({ kind: "weekly_scoped", scope: null }),
  { key: "weekly-scoped-model", label: "Scoped model" }
);

// Unknown kinds are ignored.
assert.strictEqual(meterFromLimit({ kind: "spend" }), null);

console.log("ok - meterFromLimit mapping");
