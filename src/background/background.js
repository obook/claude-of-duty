/*
 * background.js
 * Entry point of the background page: schedules polling and wires messages.
 *
 * On a timer (and at install / browser start) it fetches the usage readings
 * through usage-api.js, then hands them to monitor.js which decides whether to
 * notify, and to badge.js which keeps the toolbar badge in sync. The polling
 * period tightens when a meter nears its limit (monitor.pollPeriodFor) and
 * backs off to the normal period as soon as a poll fails, so a broken session
 * is not retried every minute forever. Every poll stamps lastPoll in storage
 * so the popup can show data freshness. Fetching and reacting to the reading
 * are two separate steps: only a failure to fetch counts as a failed poll (it
 * is the "signed out?" case), so a downstream failure (e.g. opening the alert
 * window) does not mislabel perfectly good readings as a failed check.
 * The popup can trigger an immediate refresh or replay the current readings
 * as a test; the preferences page asks here for the organization list, and
 * changing organization resets the alert baseline through monitor.js so the
 * previous organization's buckets and history are not carried over.
 *
 * Author: Olivier Booklage
 * Date: July 2026
 * Licence: MIT
 */

(function () {
  const usageApi = window.ClaudeOfDuty.usageApi;
  const monitor = window.ClaudeOfDuty.monitor;
  const badge = window.ClaudeOfDuty.badge;

  const POLL_ALARM_NAME = "poll-usage";
  const DEFAULT_POLL_MINUTES = 5;
  const LAST_POLL_KEY = "lastPoll";

  function ensurePollAlarm(periodInMinutes) {
    browser.alarms.create(POLL_ALARM_NAME, { periodInMinutes: periodInMinutes || DEFAULT_POLL_MINUTES });
  }

  /* One polling cycle: fetch the usage, then let the monitor and badge react. */
  async function poll() {
    let readings;
    try {
      readings = await usageApi.fetchUsageReadings();
    } catch (error) {
      // A failed fetch (signed out, network down ...) must not stop the
      // alarm, but it does mean the fast adaptive period should back off:
      // retrying every minute while broken would just hammer the API.
      console.warn("[Claude of Duty] Poll failed:", error);
      badge.error();
      ensurePollAlarm();
      browser.storage.local.set({ [LAST_POLL_KEY]: { ts: Date.now(), ok: false } });
      return;
    }

    browser.storage.local.set({ [LAST_POLL_KEY]: { ts: Date.now(), ok: true } });
    try {
      await monitor.processReadings(readings);
      badge.update(readings);
      // Re-creating the alarm applies the adaptive period from this batch.
      ensurePollAlarm(monitor.pollPeriodFor(readings));
    } catch (error) {
      // The readings themselves are fine; only reacting to them failed
      // (e.g. opening the alert window), so this is not a "signed out?"
      // situation and lastPoll above already recorded a successful check.
      console.warn("[Claude of Duty] Failed to process the fetched readings:", error);
    }
  }

  browser.runtime.onInstalled.addListener(() => {
    ensurePollAlarm();
    poll();
  });

  browser.runtime.onStartup.addListener(() => {
    ensurePollAlarm();
    poll();
  });

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === POLL_ALARM_NAME) {
      poll();
    }
  });

  browser.runtime.onMessage.addListener((message) => {
    if (!message) {
      return;
    }
    if (message.command === "refresh") {
      poll();
    } else if (message.command === "test") {
      monitor.showCurrentReadings();
    } else if (message.command === "list-organizations") {
      // Returning the promise sends the resolved list back to the caller.
      return usageApi.listOrganizations();
    } else if (message.command === "set-organization") {
      // Reset the baseline before polling: the new organization's first
      // reading must not be compared against the previous one's buckets.
      return (async () => {
        await browser.storage.local.set({ organizationId: message.organizationId });
        await monitor.resetBaseline();
        await poll();
      })();
    }
  });
})();
