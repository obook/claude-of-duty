/*
 * test-badge-title.js
 * Checks the toolbar tooltip built from the stored display meters.
 *
 * Author: Olivier Booklage
 * Date: July 2026
 * Licence: MIT
 */

"use strict";

const assert = require("assert");
const { loadModules } = require("./helpers");

const { badge } = loadModules();

// No meters yet: the tooltip is just the extension name.
assert.strictEqual(badge.titleFromMap({}), "Claude of Duty");

// Known meters come first, in order, each with its percentage and trend.
const title = badge.titleFromMap({
  "weekly-scoped-fable": { label: "Fable", percentText: "3" },
  "session": { label: "Current session", percentText: "42", trend: "At this rate: limit in ~3h" },
  "weekly-all": { label: "All models", percentText: "12" }
});
assert.strictEqual(title, [
  "Claude of Duty",
  "Current session 42% - At this rate: limit in ~3h",
  "All models 12%",
  "Fable 3%"
].join("\n"));

console.log("ok - badge tooltip title");
