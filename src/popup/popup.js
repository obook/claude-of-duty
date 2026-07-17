/*
 * popup.js
 * Fills the toolbar popup from stored readings and wires its buttons.
 *
 * The background page writes the latest readings, poll timestamps, and
 * warning flags to storage; here we only read and display them, refresh live
 * on storage changes, and let the user force a refresh, replay the readings
 * as a test alert, or open the preferences page. The status area shows data
 * freshness, a running snooze (with a button to end it early), and a banner
 * when the usage API stops looking as expected. The 7-day chart itself is
 * drawn by chart.js.
 *
 * Author: Olivier Booklage
 * Date: July 2026
 * Licence: MIT
 */

const READINGS_KEY = "readings";
const HISTORY_KEY = "usageHistory";
const ALERT_STEP_KEY = "alertStep";
const LAST_POLL_KEY = "lastPoll";
const SNOOZE_KEY = "snoozeUntil";
const API_WARNING_KEY = "apiWarning";

const STATUS_REFRESH_MS = 30 * 1000;

/* Preferred display order; any scoped-model meters are appended after these. */
const METER_ORDER = ["session", "weekly-all"];

const metersList = document.getElementById("meters");
const emptyItem = document.getElementById("empty");
const apiWarningEl = document.getElementById("api-warning");
const snoozeStatusEl = document.getElementById("snooze-status");
const snoozeTextEl = document.getElementById("snooze-text");
const freshnessEl = document.getElementById("freshness");

/* Builds one meter row element from a stored reading. */
function buildMeterRow(key, reading) {
  const item = document.createElement("li");
  item.className = key === "session" ? "meter limit-session" : "meter";

  const top = document.createElement("div");
  top.className = "meter-top";

  const label = document.createElement("span");
  label.className = "meter-label";
  label.textContent = reading.label;

  const percent = document.createElement("span");
  percent.className = "meter-percent";
  percent.textContent = browser.i18n.getMessage("percentValue", [reading.percentText]);

  top.appendChild(label);
  top.appendChild(percent);

  const bar = document.createElement("div");
  bar.className = "meter-bar";
  const fill = document.createElement("div");
  fill.className = "meter-fill";
  fill.style.width = Math.min(100, Number(reading.percentText)) + "%";
  bar.appendChild(fill);

  const reset = document.createElement("div");
  reset.className = "meter-reset";
  reset.textContent = reading.reset || "";

  item.appendChild(top);
  item.appendChild(bar);
  item.appendChild(reset);

  if (reading.trend) {
    const trend = document.createElement("div");
    trend.className = "meter-trend";
    trend.textContent = reading.trend;
    item.appendChild(trend);
  }

  return item;
}

/* Orders the stored meters: known keys first, then any extra ones. */
function orderedKeys(readings) {
  const known = METER_ORDER.filter((key) => readings[key]);
  const extra = Object.keys(readings).filter((key) => !METER_ORDER.includes(key));
  return known.concat(extra);
}

/* Redraws the whole list from the stored readings. */
async function render() {
  const stored = await browser.storage.local.get(READINGS_KEY);
  const readings = stored[READINGS_KEY] || {};
  const keys = orderedKeys(readings);

  metersList.innerHTML = "";
  if (keys.length === 0) {
    metersList.appendChild(emptyItem);
    return;
  }
  for (const key of keys) {
    metersList.appendChild(buildMeterRow(key, readings[key]));
  }
}

// ===============================================================
//  STATUS AREA
// ===============================================================

/* Short age of the last reading ("3 min", "1 h 05 min"), null under 1 min. */
function ageText(ageMs) {
  const minutes = Math.floor(ageMs / 60000);
  if (minutes < 1) {
    return null;
  }
  if (minutes < 60) {
    return minutes + " min";
  }
  return Math.floor(minutes / 60) + " h " + String(minutes % 60).padStart(2, "0") + " min";
}

/* Redraws the freshness line, the snooze status, and the API warning. */
async function renderStatus() {
  const stored = await browser.storage.local.get([LAST_POLL_KEY, SNOOZE_KEY, API_WARNING_KEY]);

  // Only show the API-change banner alongside a successful check: once polls
  // start failing, apiWarning stops being refreshed and would otherwise show
  // a stale, contradictory message next to "Last check failed".
  const lastPollOk = Boolean(stored[LAST_POLL_KEY] && stored[LAST_POLL_KEY].ok);
  apiWarningEl.hidden = !(stored[API_WARNING_KEY] === true && lastPollOk);

  const snoozeUntil = stored[SNOOZE_KEY];
  const snoozed = typeof snoozeUntil === "number" && Date.now() < snoozeUntil;
  snoozeStatusEl.hidden = !snoozed;
  if (snoozed) {
    const time = new Date(snoozeUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    snoozeTextEl.textContent = browser.i18n.getMessage("popupSnoozedUntil", [time]);
  }

  const lastPoll = stored[LAST_POLL_KEY];
  if (!lastPoll || typeof lastPoll.ts !== "number") {
    freshnessEl.textContent = "";
    return;
  }
  if (!lastPoll.ok) {
    freshnessEl.classList.add("stale");
    freshnessEl.textContent = browser.i18n.getMessage("popupPollFailed");
    return;
  }
  freshnessEl.classList.remove("stale");
  const age = ageText(Date.now() - lastPoll.ts);
  freshnessEl.textContent = age === null
    ? browser.i18n.getMessage("popupJustNow")
    : browser.i18n.getMessage("popupLastReading", [age]);
}

// ===============================================================
//  BUTTONS AND LIVE REFRESH
// ===============================================================

document.getElementById("refresh").addEventListener("click", () => {
  browser.runtime.sendMessage({ command: "refresh" });
});

document.getElementById("test").addEventListener("click", () => {
  browser.runtime.sendMessage({ command: "test" });
});

document.getElementById("options").addEventListener("click", () => {
  browser.runtime.openOptionsPage();
});

// Ends the snooze early; the storage change redraws the status area.
document.getElementById("snooze-cancel").addEventListener("click", () => {
  browser.storage.local.remove(SNOOZE_KEY);
});

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

// Keep the popup live while it is open.
browser.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") {
    return;
  }
  if (changes[READINGS_KEY]) {
    render();
  }
  if (changes[HISTORY_KEY] || changes[ALERT_STEP_KEY]) {
    window.ClaudeOfDuty.chart.render();
  }
  if (changes[LAST_POLL_KEY] || changes[SNOOZE_KEY] || changes[API_WARNING_KEY]) {
    renderStatus();
  }
});

// The freshness line ages even without a storage change.
setInterval(renderStatus, STATUS_REFRESH_MS);

applyTranslations();
render();
renderStatus();
window.ClaudeOfDuty.chart.render();
