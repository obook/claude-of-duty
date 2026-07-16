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
const HISTORY_KEY = "usageHistory";
const ALERT_STEP_KEY = "alertStep";
const DEFAULT_DURATION = 20;
const MIN_DURATION = 0; // 0 keeps the alert window open until the next alert
const MAX_DURATION = 300;
const DEFAULT_ALERT_STEP = 5;

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const CHART_WIDTH = 300;
const CHART_PLOT_HEIGHT = 48;
const CHART_LABEL_HEIGHT = 12;
const CHART_HEIGHT = CHART_PLOT_HEIGHT + CHART_LABEL_HEIGHT;
const CHART_MIN_POINTS = 2;

/* Preferred display order; any scoped-model meters are appended after these. */
const METER_ORDER = ["session", "weekly-all"];

const metersList = document.getElementById("meters");
const emptyItem = document.getElementById("empty");

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

// ===============================================================
//  7-DAY CHART
// ===============================================================

const SVG_NS = "http://www.w3.org/2000/svg";
const chartContainer = document.getElementById("history-chart");

/* Creates one namespaced SVG element with the given attributes. */
function createSvgElement(tagName, attributes) {
  const element = document.createElementNS(SVG_NS, tagName);
  for (const name of Object.keys(attributes)) {
    element.setAttribute(name, attributes[name]);
  }
  return element;
}

/* "x,y" pairs for the session percentage polyline, over a 7-day window. */
function chartPoints(history, windowStart) {
  return history
    .filter((entry) => typeof entry.session === "number")
    .map((entry) => {
      const x = ((entry.ts - windowStart) / SEVEN_DAYS_MS) * CHART_WIDTH;
      const clampedPercent = Math.max(0, Math.min(100, entry.session));
      const y = CHART_PLOT_HEIGHT - (clampedPercent / 100) * CHART_PLOT_HEIGHT;
      return x.toFixed(1) + "," + y.toFixed(1);
    });
}

/* Weekday-abbreviation labels for the 7 days ending today. */
function chartDayLabels(now) {
  const labels = [];
  for (let daysAgo = 6; daysAgo >= 0; daysAgo -= 1) {
    const date = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
    labels.push(date.toLocaleDateString(undefined, { weekday: "short" }));
  }
  return labels;
}

/* Builds the chart's SVG element: the session line, its threshold, and days. */
function buildChartSvg(points, thresholdPercent, dayLabels) {
  const svg = createSvgElement("svg", {
    viewBox: "0 0 " + CHART_WIDTH + " " + CHART_HEIGHT,
    width: "100%",
    height: String(CHART_HEIGHT)
  });

  const thresholdY = (CHART_PLOT_HEIGHT - (thresholdPercent / 100) * CHART_PLOT_HEIGHT).toFixed(1);
  svg.appendChild(createSvgElement("line", {
    class: "chart-threshold",
    x1: "0",
    y1: thresholdY,
    x2: String(CHART_WIDTH),
    y2: thresholdY
  }));

  svg.appendChild(createSvgElement("polyline", {
    class: "chart-line",
    points: points.join(" ")
  }));

  const dayWidth = CHART_WIDTH / dayLabels.length;
  for (let index = 0; index < dayLabels.length; index += 1) {
    const x = ((index + 0.5) * dayWidth).toFixed(1);
    const dayText = createSvgElement("text", {
      class: "chart-day",
      x: x,
      y: String(CHART_HEIGHT),
      "text-anchor": "middle"
    });
    dayText.textContent = dayLabels[index];
    svg.appendChild(dayText);
  }

  return svg;
}

/* Redraws the 7-day session usage chart, or hides it with too little data. */
async function renderChart() {
  const stored = await browser.storage.local.get([HISTORY_KEY, ALERT_STEP_KEY]);
  const history = Array.isArray(stored[HISTORY_KEY]) ? stored[HISTORY_KEY] : [];
  const alertStep = typeof stored[ALERT_STEP_KEY] === "number" ? stored[ALERT_STEP_KEY] : DEFAULT_ALERT_STEP;

  const now = Date.now();
  const points = chartPoints(history, now - SEVEN_DAYS_MS);

  chartContainer.innerHTML = "";
  if (points.length < CHART_MIN_POINTS) {
    chartContainer.hidden = true;
    return;
  }

  chartContainer.hidden = false;
  chartContainer.appendChild(buildChartSvg(points, alertStep, chartDayLabels(now)));
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
  if (area !== "local") {
    return;
  }
  if (changes[READINGS_KEY]) {
    render();
  }
  if (changes[HISTORY_KEY] || changes[ALERT_STEP_KEY]) {
    renderChart();
  }
});

applyTranslations();
render();
renderChart();
initDuration();
initSound();
