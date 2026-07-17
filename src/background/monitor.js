/*
 * monitor.js
 * Threshold logic, run in the background page.
 *
 * For each meter we remember the last "bucket" we alerted on (0, 5, 10 ... for
 * the default 5% step, or 0, 10, 20 ... / 0, 25, 50 ... for a coarser step
 * chosen in the preferences page). A fresh reading in a different bucket (up
 * when usage climbs, down when the limit resets) is worth an alert. The first
 * time a meter is ever seen we only store the baseline, so nothing fires until
 * something actually changes.
 *
 * When one or more meters cross a step in the same poll, every current meter
 * (not just the one that crossed) is shown together in a single persistent
 * popup window (see alert-window.js), so the user always sees the full
 * picture. Crossings on muted meters and crossings during a snooze are
 * counted (the buckets move) but never open the window. A batch where every
 * crossing goes down is a limit reset and is shown with a dedicated title.
 * Readings are also mirrored to storage, alongside a trend line from
 * history.js, so the toolbar popup can show current values and a projection.
 *
 * Author: Olivier Booklage
 * Date: July 2026
 * Licence: MIT
 */

(function () {
  const DEFAULT_ALERT_STEP = 5;
  const ALERT_STEP_KEY = "alertStep";
  const BUCKET_KEY_PREFIX = "bucket:";
  const READINGS_KEY = "readings";
  const SNOOZE_KEY = "snoozeUntil";
  const MUTED_KEY = "mutedMeters";
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  /* Polling tightens when any meter gets close to its limit. */
  const NORMAL_POLL_MINUTES = 5;
  const FAST_POLL_MINUTES = 1;
  const FAST_POLL_THRESHOLD_PERCENT = 80;

  /* Lowest multiple of `step` at or below a percentage. */
  function bucketOf(percent, step) {
    const alertStep = step || DEFAULT_ALERT_STEP;
    return Math.floor(percent / alertStep) * alertStep;
  }

  /* "up" when usage climbed into a higher bucket, "down" when a limit reset. */
  function directionOf(lastBucket, currentBucket) {
    return currentBucket > lastBucket ? "up" : "down";
  }

  /* A batch of crossings is a usage alert as soon as one meter climbed. */
  function kindForDirections(directions) {
    return directions.indexOf("up") >= 0 ? "usage" : "reset";
  }

  /* True while a user-requested snooze is still running. */
  function isSnoozed(snoozeUntil, now) {
    return typeof snoozeUntil === "number" && now < snoozeUntil;
  }

  /* Minutes until the next poll: shorter once any meter nears its limit. */
  function pollPeriodFor(readings) {
    const highest = readings.reduce((max, reading) => Math.max(max, reading.percent), 0);
    return highest >= FAST_POLL_THRESHOLD_PERCENT ? FAST_POLL_MINUTES : NORMAL_POLL_MINUTES;
  }

  /* Reads the user's alert step from storage, falling back to the default. */
  async function getAlertStep() {
    const stored = await browser.storage.local.get(ALERT_STEP_KEY);
    const value = stored[ALERT_STEP_KEY];
    return typeof value === "number" ? value : DEFAULT_ALERT_STEP;
  }

  /* Formats a percentage: one decimal at most, no trailing ".0". */
  function formatPercent(percent) {
    return String(Math.round(percent * 10) / 10);
  }

  /*
   * Turns an ISO reset timestamp into a short, localized line. Within a day we
   * show the remaining time ("Resets in 4 h 11 min"); further away we show the
   * weekday and time ("Resets Fri 11:00").
   */
  function formatReset(resetsAt) {
    if (!resetsAt) {
      return "";
    }
    const resetDate = new Date(resetsAt);
    const remainingMs = resetDate.getTime() - Date.now();
    if (remainingMs > 0 && remainingMs < ONE_DAY_MS) {
      const totalMinutes = Math.round(remainingMs / 60000);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const parts = [];
      if (hours > 0) {
        parts.push(hours + " h");
      }
      parts.push(minutes + " min");
      return browser.i18n.getMessage("resetIn", [parts.join(" ")]);
    }
    const when = resetDate.toLocaleString(undefined, {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
    return browser.i18n.getMessage("resetAt", [when]);
  }

  /* Display-ready meter for the popup and the alert window. */
  function toDisplayMeter(reading) {
    return {
      label: reading.label,
      percentText: formatPercent(reading.percent),
      reset: formatReset(reading.resetsAt)
    };
  }

  /*
   * Localized trend line for the popup ("At this rate: limit in ~3h", "On
   * track for reset.", or "Limit reached." once the meter is already at
   * 100%), or "" when there is no projection to show yet (see history.js) or
   * no reset time to compare it against.
   */
  function formatTrend(reading, history) {
    if (reading.percent >= 100) {
      return browser.i18n.getMessage("trendLimitReached");
    }
    const projectedMs = window.ClaudeOfDuty.history.millisecondsUntilLimit(history, reading.key);
    if (projectedMs === null || !reading.resetsAt) {
      return "";
    }
    const remainingToResetMs = new Date(reading.resetsAt).getTime() - Date.now();
    if (projectedMs > remainingToResetMs) {
      return browser.i18n.getMessage("trendOnTrack");
    }
    // The projection already rounds down to under 30 minutes: showing "~1h"
    // here would understate how close the meter already is to the limit.
    if (projectedMs < 30 * 60 * 1000) {
      return browser.i18n.getMessage("trendLimitReached");
    }
    const hours = Math.round(projectedMs / (60 * 60 * 1000));
    return browser.i18n.getMessage("trendLimitIn", [String(hours)]);
  }

  // ===============================================================
  //  STORAGE
  // ===============================================================

  async function getStoredBucket(key) {
    const storageKey = BUCKET_KEY_PREFIX + key;
    const stored = await browser.storage.local.get(storageKey);
    const value = stored[storageKey];
    return typeof value === "number" ? value : null;
  }

  async function setStoredBucket(key, bucket) {
    const storageKey = BUCKET_KEY_PREFIX + key;
    await browser.storage.local.set({ [storageKey]: bucket });
  }

  /*
   * Wipes every stored bucket, e.g. when switching organizations (see
   * background.js): the next reading from the new organization must be
   * treated as a fresh baseline, not compared against the previous
   * organization's usage.
   */
  async function clearBuckets() {
    const all = await browser.storage.local.get(null);
    const bucketKeys = Object.keys(all).filter((key) => key.indexOf(BUCKET_KEY_PREFIX) === 0);
    if (bucketKeys.length > 0) {
      await browser.storage.local.remove(bucketKeys);
    }
  }

  /* Mirrors the latest readings to storage for the toolbar popup. */
  async function saveReadings(readings, history) {
    const map = {};
    for (const reading of readings) {
      const meter = toDisplayMeter(reading);
      meter.trend = formatTrend(reading, history);
      map[reading.key] = meter;
    }
    await browser.storage.local.set({ [READINGS_KEY]: map });
  }

  // ===============================================================
  //  DECISION
  // ===============================================================

  /* Crossing direction ("up" or "down") for the meter, or null without one. */
  async function evaluateReading(reading, alertStep) {
    const currentBucket = bucketOf(reading.percent, alertStep);
    const lastBucket = await getStoredBucket(reading.key);

    // First observation: record the baseline silently, no alert.
    if (lastBucket === null) {
      await setStoredBucket(reading.key, currentBucket);
      return null;
    }
    if (currentBucket !== lastBucket) {
      await setStoredBucket(reading.key, currentBucket);
      return directionOf(lastBucket, currentBucket);
    }
    return null;
  }

  /*
   * Saves readings, then, if any unmuted meter crossed a step outside a
   * snooze, shows the alert window with every current meter (not just the one
   * that crossed), so the user always sees the full picture.
   */
  async function processReadings(readings) {
    const history = await window.ClaudeOfDuty.history.appendHistory(readings, Date.now());
    await saveReadings(readings, history);

    const alertStep = await getAlertStep();
    const stored = await browser.storage.local.get([SNOOZE_KEY, MUTED_KEY]);
    const muted = new Set(Array.isArray(stored[MUTED_KEY]) ? stored[MUTED_KEY] : []);

    const directions = [];
    for (const reading of readings) {
      const direction = await evaluateReading(reading, alertStep);
      if (direction !== null && !muted.has(reading.key)) {
        directions.push(direction);
      }
    }

    if (directions.length === 0 || isSnoozed(stored[SNOOZE_KEY], Date.now())) {
      return;
    }
    const allMeters = readings.map((reading) => toDisplayMeter(reading));
    await window.ClaudeOfDuty.alertWindow.show(allMeters, kindForDirections(directions));
  }

  /* Shows the current readings in the alert window (toolbar "Test" button). */
  async function showCurrentReadings() {
    const stored = await browser.storage.local.get(READINGS_KEY);
    const map = stored[READINGS_KEY] || {};
    const meters = Object.keys(map).map((key) => map[key]);
    if (meters.length > 0) {
      await window.ClaudeOfDuty.alertWindow.show(meters);
    }
  }

  /*
   * Resets the alert baseline: forgets every meter's last bucket and clears
   * the history, so the very next reading is a silent baseline instead of
   * being compared or charted against a different organization's usage.
   */
  async function resetBaseline() {
    await clearBuckets();
    await window.ClaudeOfDuty.history.clearHistory();
  }

  window.ClaudeOfDuty = window.ClaudeOfDuty || {};
  window.ClaudeOfDuty.monitor = {
    processReadings: processReadings,
    showCurrentReadings: showCurrentReadings,
    pollPeriodFor: pollPeriodFor,
    resetBaseline: resetBaseline,
    // Exposed so the unit tests can exercise the pure helpers.
    bucketOf: bucketOf,
    formatPercent: formatPercent,
    formatReset: formatReset,
    formatTrend: formatTrend,
    directionOf: directionOf,
    kindForDirections: kindForDirections,
    isSnoozed: isSnoozed
  };
})();
