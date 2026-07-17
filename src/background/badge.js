/*
 * badge.js
 * Keeps the toolbar badge in sync with the current session usage.
 *
 * The badge always shows the session meter's whole-number percentage, and its
 * background color signals how close that is to the limit: green below 70%,
 * orange from 70% to 89%, red from 90% up. A failed poll shows a gray "?"
 * instead, so stale silence is visible; the badge is cleared when a poll
 * succeeds but has no session reading. The button's tooltip lists every
 * meter with its percentage and trend.
 *
 * Author: Olivier Booklage
 * Date: July 2026
 * Licence: MIT
 */

(function () {
  const GREEN = "#2e7d32";
  const ORANGE = "#e08a34";
  const RED = "#c62828";
  const GRAY = "#757575";
  const ORANGE_THRESHOLD = 70;
  const RED_THRESHOLD = 90;
  const READINGS_KEY = "readings";

  /* Preferred tooltip order; any scoped-model meters come after these. */
  const METER_ORDER = ["session", "weekly-all"];

  /* Badge color for a percentage, on the green / orange / red scale. */
  function colorFor(percent) {
    if (percent >= RED_THRESHOLD) {
      return RED;
    }
    if (percent >= ORANGE_THRESHOLD) {
      return ORANGE;
    }
    return GREEN;
  }

  /* Finds the session reading in a batch, or null if there isn't one. */
  function sessionReading(readings) {
    return readings.find((reading) => reading.key === "session") || null;
  }

  /* Multiline tooltip built from the stored display meters. */
  function titleFromMap(map) {
    const known = METER_ORDER.filter((key) => map[key]);
    const extra = Object.keys(map).filter((key) => METER_ORDER.indexOf(key) < 0);
    const lines = ["Claude of Duty"];
    for (const key of known.concat(extra)) {
      const meter = map[key];
      let line = meter.label + " " + meter.percentText + "%";
      if (meter.trend) {
        line += " - " + meter.trend;
      }
      lines.push(line);
    }
    return lines.join("\n");
  }

  /* Clears the badge, e.g. when a poll succeeds without a session reading. */
  function clear() {
    browser.browserAction.setBadgeText({ text: "" });
    browser.browserAction.setTitle({ title: null });
  }

  /* Gray "?" badge after a failed poll, so stale readings are visible. */
  function error() {
    browser.browserAction.setBadgeText({ text: "?" });
    browser.browserAction.setBadgeBackgroundColor({ color: GRAY });
    browser.browserAction.setTitle({ title: "Claude of Duty - " + browser.i18n.getMessage("popupPollFailed") });
  }

  /* Updates the toolbar badge and tooltip from a fresh batch of readings. */
  async function update(readings) {
    const session = sessionReading(readings);
    if (!session) {
      clear();
      return;
    }
    const rounded = String(Math.round(session.percent));
    browser.browserAction.setBadgeText({ text: rounded });
    browser.browserAction.setBadgeBackgroundColor({ color: colorFor(session.percent) });

    // monitor.js has just mirrored the display meters (labels, trends) here.
    const stored = await browser.storage.local.get(READINGS_KEY);
    browser.browserAction.setTitle({ title: titleFromMap(stored[READINGS_KEY] || {}) });
  }

  window.ClaudeOfDuty = window.ClaudeOfDuty || {};
  window.ClaudeOfDuty.badge = {
    update: update,
    clear: clear,
    error: error,
    // Exposed so the unit tests can exercise the pure helpers.
    colorFor: colorFor,
    titleFromMap: titleFromMap
  };
})();
