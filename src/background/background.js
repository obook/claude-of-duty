/*
 * background.js
 * Entry point of the background page: schedules polling and wires messages.
 *
 * On a timer (and at install / browser start) it fetches the usage readings
 * through usage-api.js, then hands them to monitor.js which decides whether to
 * notify, and to badge.js which keeps the toolbar badge in sync. The popup can
 * trigger an immediate refresh or replay the current readings as a test.
 *
 * Author: øbook
 * Date: July 2026
 * Licence: MIT
 */

(function () {
  const usageApi = window.ClaudeOfDuty.usageApi;
  const monitor = window.ClaudeOfDuty.monitor;
  const badge = window.ClaudeOfDuty.badge;

  const POLL_ALARM_NAME = "poll-usage";
  const POLL_PERIOD_MINUTES = 5;

  function ensurePollAlarm() {
    browser.alarms.create(POLL_ALARM_NAME, { periodInMinutes: POLL_PERIOD_MINUTES });
  }

  /* One polling cycle: fetch the usage, then let the monitor and badge react. */
  async function poll() {
    try {
      const readings = await usageApi.fetchUsageReadings();
      await monitor.processReadings(readings);
      badge.update(readings);
    } catch (error) {
      // A failed poll (signed out, network down ...) must not stop the alarm.
      console.warn("[Claude of Duty] Poll failed:", error);
      badge.clear();
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
    }
  });
})();
