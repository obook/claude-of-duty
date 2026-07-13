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
const DURATION_KEY = "alertDurationSeconds";
const SOUND_KEY = "soundChoice";
const DEFAULT_DURATION = 20;
const MIN_DURATION = 0; // 0 keeps the alert window open until the next alert
const MAX_DURATION = 300;

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

const durationInput = document.getElementById("duration");

/* Loads the saved alert duration, then saves it back on every change. */
async function initDuration() {
  const stored = await browser.storage.local.get(DURATION_KEY);
  const value = typeof stored[DURATION_KEY] === "number" ? stored[DURATION_KEY] : DEFAULT_DURATION;
  durationInput.value = value;

  durationInput.addEventListener("change", () => {
    let seconds = parseInt(durationInput.value, 10);
    if (!Number.isFinite(seconds)) {
      seconds = DEFAULT_DURATION;
    }
    seconds = Math.max(MIN_DURATION, Math.min(MAX_DURATION, seconds));
    durationInput.value = seconds;
    browser.storage.local.set({ [DURATION_KEY]: seconds });
  });
}

const soundSelect = document.getElementById("sound");
const SOUND_FILES = {
  bell: "sounds/bell.mp3",
  ding: "sounds/ding.mp3",
  dong: "sounds/dong.mp3",
  zingz: "sounds/zingz.mp3"
};

/* Plays a short preview of a sound choice ("none" plays nothing). */
function previewSound(choice) {
  const file = SOUND_FILES[choice];
  if (!file) {
    return;
  }
  try {
    new Audio(browser.runtime.getURL(file)).play().catch(() => {});
  } catch (error) {
    /* Ignore preview playback errors. */
  }
}

/* Loads the sound choice, saves it on change, and previews the new choice. */
async function initSound() {
  const stored = await browser.storage.local.get(SOUND_KEY);
  soundSelect.value = stored[SOUND_KEY] || "none";

  soundSelect.addEventListener("change", () => {
    browser.storage.local.set({ [SOUND_KEY]: soundSelect.value });
    previewSound(soundSelect.value);
  });
}

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
  if (area === "local" && changes[READINGS_KEY]) {
    render();
  }
});

applyTranslations();
render();
initDuration();
initSound();
