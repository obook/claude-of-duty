/*
 * alert-window.js
 * Opens and reuses a single persistent popup window for usage alerts.
 *
 * Firefox notifications cannot be kept on screen from the extension, so instead
 * of an OS notification we open a small chromeless browser window (type
 * "popup") that shows the crossed meters and closes itself after a configurable
 * delay. If an alert is already open, we reuse it: the payload in storage is
 * updated and the page re-renders, rather than stacking a second window.
 *
 * The public API is window.ClaudeOfDuty.alertWindow.show(meters).
 *
 * Author: øbook
 * Date: July 2026
 * Licence: MIT
 */

(function () {
  const ALERT_URL = "alert/alert.html";
  const ALERT_PAYLOAD_KEY = "alertPayload";
  const ALERT_WIDTH = 360;
  const ALERT_HEIGHT = 340;
  const SCREEN_MARGIN = 24;
  const SOUND_KEY = "soundChoice";
  const SOUND_FILES = {
    bell: "sounds/bell.mp3",
    ding: "sounds/ding.mp3",
    dong: "sounds/dong.mp3",
    zingz: "sounds/zingz.mp3"
  };

  /* Id of the currently open alert window, or null. */
  let alertWindowId = null;

  browser.windows.onRemoved.addListener((windowId) => {
    if (windowId === alertWindowId) {
      alertWindowId = null;
    }
  });

  /* Top-right corner of the screen the browser is on. */
  function topRightPosition() {
    const availWidth = (window.screen && window.screen.availWidth) || 1280;
    return {
      top: SCREEN_MARGIN,
      left: Math.max(0, availWidth - ALERT_WIDTH - SCREEN_MARGIN)
    };
  }

  async function windowStillExists(windowId) {
    try {
      await browser.windows.get(windowId);
      return true;
    } catch (error) {
      return false;
    }
  }

  /* Plays the chosen alert sound, or nothing when set to silence. */
  async function playSelectedSound() {
    const stored = await browser.storage.local.get(SOUND_KEY);
    const file = SOUND_FILES[stored[SOUND_KEY]];
    if (!file) {
      return;
    }
    try {
      const audio = new Audio(browser.runtime.getURL(file));
      await audio.play();
    } catch (error) {
      // A missing sound file or a blocked play must not break the alert.
    }
  }

  /*
   * Shows the given meters. meters is an array of display-ready objects:
   * { label, percentText, reset }.
   */
  async function show(meters) {
    playSelectedSound();

    // The timestamp guarantees the alert page sees a change and resets its
    // countdown, even when the same meters cross again.
    await browser.storage.local.set({
      [ALERT_PAYLOAD_KEY]: { meters: meters, at: Date.now() }
    });

    if (alertWindowId !== null && await windowStillExists(alertWindowId)) {
      browser.windows.update(alertWindowId, { focused: true, drawAttention: true });
      return;
    }

    const position = topRightPosition();
    const created = await browser.windows.create({
      url: browser.runtime.getURL(ALERT_URL),
      type: "popup",
      width: ALERT_WIDTH,
      height: ALERT_HEIGHT,
      top: position.top,
      left: position.left,
      focused: true
    });
    alertWindowId = created.id;
  }

  window.ClaudeOfDuty = window.ClaudeOfDuty || {};
  window.ClaudeOfDuty.alertWindow = { show: show };
})();
