/*
 * history.js
 * Keeps a rolling history of readings, for both a short-term trend and the
 * popup's 7-day chart.
 *
 * Every poll appends one entry (timestamp plus each meter's percentage) to
 * storage, discarding anything older than MAX_HISTORY_AGE_MS. Two things read
 * that history: millisecondsUntilLimit fits a straight line through the last
 * few points for one meter and returns how long, at that rate, until it
 * reaches 100% (or null when there is not enough data yet, or usage is flat
 * or decreasing); the popup separately reads the raw history to draw its
 * 7-day chart.
 *
 * Author: øbook
 * Date: July 2026
 * Licence: MIT
 */

(function () {
  const HISTORY_KEY = "usageHistory";
  const MAX_HISTORY_AGE_MS = 7 * 24 * 60 * 60 * 1000;
  const PROJECTION_WINDOW = 10;
  const MIN_POINTS_FOR_PROJECTION = 3;
  const MS_PER_HOUR = 60 * 60 * 1000;

  /* Drops entries older than MAX_HISTORY_AGE_MS, relative to `now`. */
  function pruneHistory(history, now) {
    const cutoff = now - MAX_HISTORY_AGE_MS;
    return history.filter((entry) => entry.ts >= cutoff);
  }

  /* One history entry: a timestamp plus each reading's percent, by key. */
  function entryFromReadings(readings, timestamp) {
    const entry = { ts: timestamp };
    for (const reading of readings) {
      entry[reading.key] = reading.percent;
    }
    return entry;
  }

  async function getHistory() {
    const stored = await browser.storage.local.get(HISTORY_KEY);
    return Array.isArray(stored[HISTORY_KEY]) ? stored[HISTORY_KEY] : [];
  }

  /* Appends a fresh reading batch to the stored history, prunes, and saves it. */
  async function appendHistory(readings, timestamp) {
    const history = await getHistory();
    history.push(entryFromReadings(readings, timestamp));
    const pruned = pruneHistory(history, timestamp);
    await browser.storage.local.set({ [HISTORY_KEY]: pruned });
    return pruned;
  }

  /*
   * Fits a straight line (least squares) through the last PROJECTION_WINDOW
   * points that have a value for `key`, then solves it for 100%. Returns the
   * projected time until that point, in milliseconds, or null when there are
   * fewer than MIN_POINTS_FOR_PROJECTION points or the fitted slope is not
   * strictly positive (flat or decreasing usage).
   */
  function millisecondsUntilLimit(history, key) {
    const points = history.filter((entry) => typeof entry[key] === "number").slice(-PROJECTION_WINDOW);
    if (points.length < MIN_POINTS_FOR_PROJECTION) {
      return null;
    }

    const originTs = points[0].ts;
    let sumHours = 0;
    let sumPercent = 0;
    let sumHoursPercent = 0;
    let sumHoursSquared = 0;
    for (const point of points) {
      const hours = (point.ts - originTs) / MS_PER_HOUR;
      sumHours += hours;
      sumPercent += point[key];
      sumHoursPercent += hours * point[key];
      sumHoursSquared += hours * hours;
    }

    const count = points.length;
    const slope = (count * sumHoursPercent - sumHours * sumPercent) / (count * sumHoursSquared - sumHours * sumHours);
    if (!Number.isFinite(slope) || slope <= 0) {
      return null;
    }

    const intercept = (sumPercent - slope * sumHours) / count;
    const lastHours = (points[points.length - 1].ts - originTs) / MS_PER_HOUR;
    const hoursFromNowTo100 = (100 - intercept) / slope - lastHours;
    return Math.max(0, hoursFromNowTo100) * MS_PER_HOUR;
  }

  window.ClaudeOfDuty = window.ClaudeOfDuty || {};
  window.ClaudeOfDuty.history = {
    appendHistory: appendHistory,
    // Exposed so the unit tests can exercise the pure helpers.
    pruneHistory: pruneHistory,
    entryFromReadings: entryFromReadings,
    millisecondsUntilLimit: millisecondsUntilLimit
  };
})();
