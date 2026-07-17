/*
 * alert.js
 * Fills the persistent alert window and closes it after a delay.
 *
 * The background page writes the crossed meters to storage under alertPayload
 * and opens this window. Here we render the meters, run a visible countdown
 * from the configured duration, and close the window when it reaches zero. A
 * new alert arriving while the window is open re-renders it and restarts the
 * countdown. The "keep open" button cancels the countdown for good, so the
 * window stays until it is closed by hand. The snooze button silences alerts
 * for an hour (monitor.js checks snoozeUntil) and closes the window. A
 * payload of kind "reset" swaps the title for the limit-reset one.
 *
 * Author: Olivier Booklage
 * Date: July 2026
 * Licence: MIT
 */

const PAYLOAD_KEY = "alertPayload";
const DURATION_KEY = "alertDurationSeconds";
const SNOOZE_KEY = "snoozeUntil";
const DEFAULT_DURATION = 20;
const SNOOZE_MS = 60 * 60 * 1000;

const titleEl = document.getElementById("title");
const metersList = document.getElementById("meters");
const countdownEl = document.getElementById("countdown");
const keepOpenButton = document.getElementById("keep-open");

let countdownTimer = null;

/* True once the user asked the window to stay open; no countdown runs then. */
let pinned = false;

/* Replaces the text of every [data-i18n] element with its localized message. */
function applyTranslations() {
  const nodes = document.querySelectorAll("[data-i18n]");
  for (const node of nodes) {
    const message = browser.i18n.getMessage(node.getAttribute("data-i18n"));
    if (message) {
      node.textContent = message;
    }
  }
}

/* Builds one meter row from a display-ready meter. */
function buildMeterRow(meter) {
  const item = document.createElement("li");
  item.className = "meter";

  const top = document.createElement("div");
  top.className = "meter-top";

  const label = document.createElement("span");
  label.className = "meter-label";
  label.textContent = meter.label;

  const percent = document.createElement("span");
  percent.className = "meter-percent";
  percent.textContent = browser.i18n.getMessage("percentValue", [meter.percentText]);

  top.appendChild(label);
  top.appendChild(percent);

  const bar = document.createElement("div");
  bar.className = "meter-bar";
  const fill = document.createElement("div");
  fill.className = "meter-fill";
  fill.style.width = Math.min(100, Number(meter.percentText)) + "%";
  bar.appendChild(fill);

  const reset = document.createElement("div");
  reset.className = "meter-reset";
  reset.textContent = meter.reset || "";

  item.appendChild(top);
  item.appendChild(bar);
  item.appendChild(reset);
  return item;
}

/* Redraws the title and meter list from the stored payload. */
async function render() {
  const stored = await browser.storage.local.get(PAYLOAD_KEY);
  const payload = stored[PAYLOAD_KEY] || { meters: [] };
  titleEl.textContent = browser.i18n.getMessage(payload.kind === "reset" ? "alertResetTitle" : "alertTitle");
  metersList.innerHTML = "";
  for (const meter of payload.meters) {
    metersList.appendChild(buildMeterRow(meter));
  }
}

function updateCountdown(seconds) {
  countdownEl.textContent = browser.i18n.getMessage("alertCloseIn", [String(seconds)]);
}

/* Stops any running countdown and shows the given persistent message. */
function stopCountdown(messageKey) {
  if (countdownTimer !== null) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
  countdownEl.textContent = browser.i18n.getMessage(messageKey);
  keepOpenButton.hidden = true;
}

/*
 * Counts down from the configured duration and closes the window at zero.
 * A duration of 0 means the window stays open until it is closed by hand or
 * replaced by the next alert. A pinned window never restarts its countdown.
 */
async function startCountdown() {
  const stored = await browser.storage.local.get(DURATION_KEY);
  const duration = typeof stored[DURATION_KEY] === "number" ? stored[DURATION_KEY] : DEFAULT_DURATION;

  if (countdownTimer !== null) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }

  if (pinned || duration <= 0) {
    stopCountdown(pinned ? "alertPinned" : "alertPersistent");
    return;
  }
  keepOpenButton.hidden = false;

  let remaining = duration;
  updateCountdown(remaining);
  countdownTimer = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(countdownTimer);
      countdownTimer = null;
      window.close();
      return;
    }
    updateCountdown(remaining);
  }, 1000);
}

document.getElementById("close").addEventListener("click", () => {
  window.close();
});

// Cancel the countdown: the window stays open until it is closed by hand.
keepOpenButton.addEventListener("click", () => {
  pinned = true;
  stopCountdown("alertPinned");
});

// Silence alerts for an hour and close the window.
document.getElementById("snooze").addEventListener("click", async () => {
  await browser.storage.local.set({ [SNOOZE_KEY]: Date.now() + SNOOZE_MS });
  window.close();
});

// A new alert while the window is open: re-render and restart the countdown.
browser.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[PAYLOAD_KEY]) {
    render();
    startCountdown();
  }
});

applyTranslations();
render();
startCountdown();
