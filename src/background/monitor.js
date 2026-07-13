/*
 * monitor.js
 * Threshold logic, run in the background page.
 *
 * For each meter we remember the last 5% "bucket" we alerted on (0, 5, 10 ...).
 * A fresh reading in a different bucket (up when usage climbs, down when the
 * limit resets) is worth an alert. The first time a meter is ever seen we only
 * store the baseline, so nothing fires until something actually changes.
 *
 * When one or more meters cross a step in the same poll, they are shown
 * together in a single persistent popup window (see alert-window.js). Readings
 * are also mirrored to storage so the toolbar popup can show current values.
 *
 * Author: øbook
 * Date: July 2026
 * Licence: MIT
 */

(function () {
  const THRESHOLD_STEP = 5;
  const BUCKET_KEY_PREFIX = "bucket:";
  const READINGS_KEY = "readings";
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  /* Lowest 5% multiple at or below a percentage. */
  function bucketOf(percent) {
    return Math.floor(percent / THRESHOLD_STEP) * THRESHOLD_STEP;
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

  /* Mirrors the latest readings to storage for the toolbar popup. */
  async function saveReadings(readings) {
    const map = {};
    for (const reading of readings) {
      map[reading.key] = toDisplayMeter(reading);
    }
    await browser.storage.local.set({ [READINGS_KEY]: map });
  }

  // ===============================================================
  //  DECISION
  // ===============================================================

  /* Returns true when the meter crossed into a new 5% bucket. */
  async function evaluateReading(reading) {
    const currentBucket = bucketOf(reading.percent);
    const lastBucket = await getStoredBucket(reading.key);

    // First observation: record the baseline silently, no alert.
    if (lastBucket === null) {
      await setStoredBucket(reading.key, currentBucket);
      return false;
    }
    if (currentBucket !== lastBucket) {
      await setStoredBucket(reading.key, currentBucket);
      return true;
    }
    return false;
  }

  /* Saves readings, then shows one alert window for any crossed meters. */
  async function processReadings(readings) {
    await saveReadings(readings);

    const crossed = [];
    for (const reading of readings) {
      const didCross = await evaluateReading(reading);
      if (didCross) {
        crossed.push(toDisplayMeter(reading));
      }
    }
    if (crossed.length > 0) {
      await window.ClaudeOfDuty.alertWindow.show(crossed);
    }
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

  window.ClaudeOfDuty = window.ClaudeOfDuty || {};
  window.ClaudeOfDuty.monitor = {
    processReadings: processReadings,
    showCurrentReadings: showCurrentReadings
  };
})();
