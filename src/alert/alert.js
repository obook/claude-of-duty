/*
 * alert.js
 * Fills the persistent alert window and closes it after a delay.
 *
 * The background page writes the crossed meters to storage under alertPayload
 * and opens this window. Here we render the meters, run a visible countdown
 * from the configured duration, and close the window when it reaches zero. A
 * new alert arriving while the window is open re-renders it and restarts the
 * countdown.
 *
 * Author: øbook
 * Date: July 2026
 * Licence: MIT
 */

const PAYLOAD_KEY = "alertPayload";
const DURATION_KEY = "alertDurationSeconds";
const DEFAULT_DURATION = 20;

const metersList = document.getElementById("meters");
const countdownEl = document.getElementById("countdown");

let countdownTimer = null;

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

/* Redraws the meter list from the stored payload. */
async function render() {
  const stored = await browser.storage.local.get(PAYLOAD_KEY);
  const payload = stored[PAYLOAD_KEY] || { meters: [] };
  metersList.innerHTML = "";
  for (const meter of payload.meters) {
    metersList.appendChild(buildMeterRow(meter));
  }
}

function updateCountdown(seconds) {
  countdownEl.textContent = browser.i18n.getMessage("alertCloseIn", [String(seconds)]);
}

/* Counts down from the configured duration and closes the window at zero. */
async function startCountdown() {
  const stored = await browser.storage.local.get(DURATION_KEY);
  let remaining = typeof stored[DURATION_KEY] === "number" ? stored[DURATION_KEY] : DEFAULT_DURATION;

  if (countdownTimer !== null) {
    clearInterval(countdownTimer);
  }
  updateCountdown(remaining);
  countdownTimer = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(countdownTimer);
      window.close();
      return;
    }
    updateCountdown(remaining);
  }, 1000);
}

document.getElementById("close").addEventListener("click", () => {
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
