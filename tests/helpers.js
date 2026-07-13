/*
 * helpers.js
 * Loads the background modules in Node for unit testing.
 *
 * The modules are browser content/background scripts: they assign their public
 * API to window.ClaudeOfDuty and call browser.i18n at runtime. Here we provide
 * minimal window and browser stubs, then require the files for their side
 * effect and return the populated namespace.
 *
 * Author: øbook
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
    resetAt: "Resets " + first
  };
  return Object.prototype.hasOwnProperty.call(messages, key) ? messages[key] : key;
}

/* Loads usage-api.js and monitor.js and returns window.ClaudeOfDuty. */
function loadModules() {
  global.window = {};
  global.browser = { i18n: { getMessage: getMessage } };

  const backgroundDir = path.join(__dirname, "..", "src", "background");
  require(path.join(backgroundDir, "usage-api.js"));
  require(path.join(backgroundDir, "monitor.js"));

  return global.window.ClaudeOfDuty;
}

module.exports = { loadModules: loadModules, getMessage: getMessage };
