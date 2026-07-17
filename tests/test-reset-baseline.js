/*
 * test-reset-baseline.js
 * Checks that switching organizations wipes the alert buckets and history,
 * without touching unrelated stored settings.
 *
 * Author: Olivier Booklage
 * Date: July 2026
 * Licence: MIT
 */

"use strict";

const assert = require("assert");
const { loadModules } = require("./helpers");

const { monitor, storage } = loadModules({
  "bucket:session": 60,
  "bucket:weekly-all": 10,
  usageHistory: [{ ts: 1, session: 60 }],
  alertStep: 10,
  readings: { session: { label: "Current session", percentText: "60" } }
});

monitor.resetBaseline().then(() => {
  return storage.local.get(null);
}).then((everything) => {
  // Every bucket and the history are gone: the next reading is a fresh
  // baseline, not compared or charted against the previous organization.
  assert.strictEqual(Object.prototype.hasOwnProperty.call(everything, "bucket:session"), false);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(everything, "bucket:weekly-all"), false);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(everything, "usageHistory"), false);

  // Unrelated settings survive the reset untouched.
  assert.strictEqual(everything.alertStep, 10);
  assert.deepStrictEqual(everything.readings, { session: { label: "Current session", percentText: "60" } });

  console.log("ok - reset baseline clears buckets and history, keeps other settings");
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
