/*
 * helpers.js
 * Loads the background modules in Node for unit testing.
 *
 * The modules are browser content/background scripts: they assign their public
 * API to window.ClaudeOfDuty and call browser.i18n at runtime. Here we provide
 * minimal window and browser stubs, then require the files for their side
 * effect and return the populated namespace.
 *
 * Author: Olivier Booklage
 * Date: July 2026
 * Licence: MIT
 */

"use strict";

const path = require("path");

/* Deterministic stand-in for browser.i18n.getMessage. */
function getMessage(key, substitutions) {
  const first = substitutions && substitutions.length ? substitutions[0] : "";
  const messages = {
    meterSession: "Current session",
    meterAllModels: "All models",
    meterScopedFallback: "Scoped model",
    resetIn: "Resets in " + first,
    resetAt: "Resets " + first,
    trendOnTrack: "On track for reset.",
    trendLimitReached: "Limit reached.",
    trendLimitIn: "At this rate: limit in ~" + first + "h"
  };
  return Object.prototype.hasOwnProperty.call(messages, key) ? messages[key] : key;
}

/*
 * Minimal in-memory stand-in for browser.storage.local, keyed by an object
 * so tests can seed it and read it back after calling the module under test.
 */
function createStorageStub(initialValues) {
  const store = Object.assign({}, initialValues);
  return {
    local: {
      get: async (keys) => {
        if (keys === null || keys === undefined) {
          return Object.assign({}, store);
        }
        const keyList = Array.isArray(keys) ? keys : [keys];
        const result = {};
        for (const key of keyList) {
          if (Object.prototype.hasOwnProperty.call(store, key)) {
            result[key] = store[key];
          }
        }
        return result;
      },
      set: async (values) => {
        Object.assign(store, values);
      },
      remove: async (keys) => {
        const keyList = Array.isArray(keys) ? keys : [keys];
        for (const key of keyList) {
          delete store[key];
        }
      }
    }
  };
}

/*
 * Loads the background scripts and returns window.ClaudeOfDuty. Pass
 * initialStorage to seed a fake browser.storage.local for tests that
 * exercise storage-backed functions (returned as `storage` for inspection).
 */
function loadModules(initialStorage) {
  global.window = {};
  const storage = createStorageStub(initialStorage || {});
  global.browser = { i18n: { getMessage: getMessage }, storage: storage };

  const backgroundDir = path.join(__dirname, "..", "src", "background");
  require(path.join(backgroundDir, "usage-api.js"));
  require(path.join(backgroundDir, "history.js"));
  require(path.join(backgroundDir, "monitor.js"));
  require(path.join(backgroundDir, "badge.js"));

  const namespace = Object.assign({}, global.window.ClaudeOfDuty);
  namespace.storage = storage;
  return namespace;
}

module.exports = { loadModules: loadModules, getMessage: getMessage, createStorageStub: createStorageStub };
