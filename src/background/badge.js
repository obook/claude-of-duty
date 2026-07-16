/*
 * badge.js
 * Keeps the toolbar badge in sync with the current session usage.
 *
 * The badge always shows the session meter's whole-number percentage, and its
 * background color signals how close that is to the limit: green below 70%,
 * orange from 70% to 89%, red from 90% up. The badge is cleared whenever no
 * session reading is available, for instance after a failed poll.
 *
 * Author: øbook
 * Date: July 2026
 * Licence: MIT
 */

(function () {
  const GREEN = "#2e7d32";
  const ORANGE = "#e08a34";
  const RED = "#c62828";
  const ORANGE_THRESHOLD = 70;
  const RED_THRESHOLD = 90;

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

  /* Clears the badge, e.g. after a failed poll or while signed out. */
  function clear() {
    browser.browserAction.setBadgeText({ text: "" });
  }

  /* Updates the toolbar badge from a fresh batch of readings. */
  function update(readings) {
    const session = sessionReading(readings);
    if (!session) {
      clear();
      return;
    }
    const rounded = String(Math.round(session.percent));
    browser.browserAction.setBadgeText({ text: rounded });
    browser.browserAction.setBadgeBackgroundColor({ color: colorFor(session.percent) });
  }

  window.ClaudeOfDuty = window.ClaudeOfDuty || {};
  window.ClaudeOfDuty.badge = {
    update: update,
    clear: clear,
    // Exposed so the unit tests can exercise the pure color logic.
    colorFor: colorFor
  };
})();
