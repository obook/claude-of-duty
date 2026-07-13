/*
 * monitor.js
 * Threshold logic and notifications, run in the background page.
 *
 * For each meter we remember the last 5% "bucket" we notified about
 * (0, 5, 10 ...). A fresh reading in a higher bucket means the user crossed a
 * step; a lower bucket means the limit was reset. Both are worth a
 * notification. The first time a meter is ever seen we only store the
 * baseline, so nothing fires until something actually changes.
 *
 * Readings are also mirrored to storage so the popup can show current values.
 *
 * The public API is exposed on window.ClaudeOfDuty.monitor.
 *
 * Author: øbook
 * Date: July 2026
 * Licence: MIT
 */

(function () {
  const THRESHOLD_STEP = 5;
  const BUCKET_KEY_PREFIX = "bucket:";
  const READINGS_KEY = "readings";
  const NOTIFICATION_ID_PREFIX = "claude-of-duty-";
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
   * Turns an ISO reset timestamp into a short, human line. Within a day we show
   * the remaining time ("Resets in 4 h 41 min"); further away we show the
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

  /* Mirrors the latest readings to storage for the popup. */
  async function saveReadings(readings) {
    const map = {};
    for (const reading of readings) {
      map[reading.key] = {
        label: reading.label,
        percentText: formatPercent(reading.percent),
        reset: formatReset(reading.resetsAt)
      };
    }
    await browser.storage.local.set({ [READINGS_KEY]: map });
  }

  // ===============================================================
  //  NOTIFICATIONS
  // ===============================================================

  function showNotification(key, title, body) {
    browser.notifications.create(NOTIFICATION_ID_PREFIX + key, {
      type: "basic",
      iconUrl: browser.runtime.getURL("icons/icon-128.png"),
      title: title,
      message: body || ""
    });
  }

  function notifyReading(reading) {
    const title = browser.i18n.getMessage("meterTitle", [reading.label, formatPercent(reading.percent)]);
    showNotification(reading.key, title, formatReset(reading.resetsAt));
  }

  // ===============================================================
  //  DECISION
  // ===============================================================

  async function evaluateReading(reading) {
    const currentBucket = bucketOf(reading.percent);
    const lastBucket = await getStoredBucket(reading.key);

    // First observation: record the baseline silently, no notification.
    if (lastBucket === null) {
      await setStoredBucket(reading.key, currentBucket);
      return;
    }

    const crossedStep = currentBucket > lastBucket;
    const limitReset = currentBucket < lastBucket;
    if (crossedStep || limitReset) {
      notifyReading(reading);
      await setStoredBucket(reading.key, currentBucket);
    }
  }

  /* Saves readings for the popup, then alerts on any crossed 5% step. */
  async function processReadings(readings) {
    await saveReadings(readings);
    for (const reading of readings) {
      await evaluateReading(reading);
    }
  }

  /* Replays the latest stored readings as notifications (popup "Test"). */
  async function showStoredReadings() {
    const stored = await browser.storage.local.get(READINGS_KEY);
    const readings = stored[READINGS_KEY] || {};
    for (const key of Object.keys(readings)) {
      const reading = readings[key];
      const title = browser.i18n.getMessage("meterTitle", [reading.label, reading.percentText]);
      showNotification(key, title, reading.reset);
    }
  }

  window.ClaudeOfDuty = window.ClaudeOfDuty || {};
  window.ClaudeOfDuty.monitor = {
    processReadings: processReadings,
    showStoredReadings: showStoredReadings
  };
})();
