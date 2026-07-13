/*
 * popup.js
 * Fills the toolbar popup from stored readings and wires its two buttons.
 *
 * The background page writes the latest readings to storage; here we only read
 * and display them, refresh live on storage changes, and let the user force a
 * refresh or replay the readings as test notifications.
 *
 * Author: øbook
 * Date: July 2026
 * Licence: MIT
 */

const READINGS_KEY = "readings";

/* Preferred display order; any scoped-model meters are appended after these. */
const METER_ORDER = ["session", "weekly-all"];

const metersList = document.getElementById("meters");
const emptyItem = document.getElementById("empty");

/* Builds one meter row element from a stored reading. */
function buildMeterRow(reading) {
  const item = document.createElement("li");
  item.className = "meter";

  const top = document.createElement("div");
  top.className = "meter-top";

  const label = document.createElement("span");
  label.className = "meter-label";
  label.textContent = reading.label;

  const percent = document.createElement("span");
  percent.className = "meter-percent";
  percent.textContent = reading.percentText + "%";

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
    metersList.appendChild(buildMeterRow(readings[key]));
  }
}

document.getElementById("refresh").addEventListener("click", () => {
  browser.runtime.sendMessage({ command: "refresh" });
});

document.getElementById("test").addEventListener("click", () => {
  browser.runtime.sendMessage({ command: "test" });
});

// Keep the popup live while it is open.
browser.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[READINGS_KEY]) {
    render();
  }
});

render();
