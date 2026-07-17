/*
 * chart.js
 * Draws the popup's 7-day usage chart from the stored history.
 *
 * Every meter present in the history gets its own colored polyline over a
 * 7-day window, with a dashed threshold at the configured alert step and a
 * legend naming each line. The chart hides itself while no meter has enough
 * points. popup.js triggers a redraw on load and on storage changes.
 *
 * The public entry point is window.ClaudeOfDuty.chart.render().
 *
 * Author: Olivier Booklage
 * Date: July 2026
 * Licence: MIT
 */

(function () {
  const HISTORY_KEY = "usageHistory";
  const ALERT_STEP_KEY = "alertStep";
  const READINGS_KEY = "readings";
  const DEFAULT_ALERT_STEP = 5;

  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const CHART_WIDTH = 300;
  const CHART_PLOT_HEIGHT = 48;
  const CHART_LABEL_HEIGHT = 12;
  const CHART_HEIGHT = CHART_PLOT_HEIGHT + CHART_LABEL_HEIGHT;
  const CHART_MIN_POINTS = 2;

  /* One line color per meter, readable on both themes; cycles if exceeded. */
  const CHART_COLORS = ["#d97757", "#5b8dd9", "#7dae6b", "#b07ad9", "#d9a35b"];

  /* Preferred series order; any scoped-model meters are appended after. */
  const METER_ORDER = ["session", "weekly-all"];

  const SVG_NS = "http://www.w3.org/2000/svg";
  const chartBox = document.getElementById("chart-box");
  const chartContainer = document.getElementById("history-chart");
  const legendContainer = document.getElementById("chart-legend");

  /* Creates one namespaced SVG element with the given attributes. */
  function createSvgElement(tagName, attributes) {
    const element = document.createElementNS(SVG_NS, tagName);
    for (const name of Object.keys(attributes)) {
      element.setAttribute(name, attributes[name]);
    }
    return element;
  }

  /* Every meter key that appears in the history, in display order. */
  function historyKeys(history) {
    const seen = new Set();
    for (const entry of history) {
      for (const key of Object.keys(entry)) {
        if (key !== "ts") {
          seen.add(key);
        }
      }
    }
    const keys = Array.from(seen);
    const known = METER_ORDER.filter((key) => keys.includes(key));
    // Insertion order, like popup.js and badge.js use for the same meters,
    // so the chart legend lists them in the same order as the rest of the UI.
    const extra = keys.filter((key) => !METER_ORDER.includes(key));
    return known.concat(extra);
  }

  /* Readable fallback ("weekly-scoped-opus" -> "Opus") for a meter missing
   * from the current readings but still present in the history window. */
  function fallbackLabel(key) {
    return key
      .replace(/^weekly-scoped-/, "")
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  /* "x,y" pairs for one meter's polyline, over a 7-day window. */
  function chartPoints(history, windowStart, key) {
    return history
      .filter((entry) => typeof entry[key] === "number")
      .map((entry) => {
        const x = ((entry.ts - windowStart) / SEVEN_DAYS_MS) * CHART_WIDTH;
        const clampedPercent = Math.max(0, Math.min(100, entry[key]));
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

  /* Builds the chart's SVG element: one line per series, threshold, days. */
  function buildChartSvg(seriesList, thresholdPercent, dayLabels) {
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

    for (const series of seriesList) {
      svg.appendChild(createSvgElement("polyline", {
        class: "chart-line",
        stroke: series.color,
        points: series.points.join(" ")
      }));
    }

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

  /* One legend entry: a colored dot followed by the meter's label. */
  function buildLegendEntry(series) {
    const entry = document.createElement("span");
    entry.className = "chart-legend-entry";
    const dot = document.createElement("span");
    dot.className = "chart-legend-dot";
    dot.style.background = series.color;
    entry.appendChild(dot);
    entry.appendChild(document.createTextNode(series.label));
    return entry;
  }

  /* Redraws the 7-day chart, or hides it with too little data. */
  async function render() {
    const stored = await browser.storage.local.get([HISTORY_KEY, ALERT_STEP_KEY, READINGS_KEY]);
    const history = Array.isArray(stored[HISTORY_KEY]) ? stored[HISTORY_KEY] : [];
    const alertStep = typeof stored[ALERT_STEP_KEY] === "number" ? stored[ALERT_STEP_KEY] : DEFAULT_ALERT_STEP;
    const readings = stored[READINGS_KEY] || {};

    const now = Date.now();
    const windowStart = now - SEVEN_DAYS_MS;

    const seriesList = [];
    historyKeys(history).forEach((key, index) => {
      const points = chartPoints(history, windowStart, key);
      if (points.length >= CHART_MIN_POINTS) {
        seriesList.push({
          points: points,
          color: CHART_COLORS[index % CHART_COLORS.length],
          label: readings[key] ? readings[key].label : fallbackLabel(key)
        });
      }
    });

    chartContainer.innerHTML = "";
    legendContainer.innerHTML = "";
    if (seriesList.length === 0) {
      chartBox.hidden = true;
      return;
    }

    chartBox.hidden = false;
    chartContainer.appendChild(buildChartSvg(seriesList, alertStep, chartDayLabels(now)));
    for (const series of seriesList) {
      legendContainer.appendChild(buildLegendEntry(series));
    }
  }

  window.ClaudeOfDuty = window.ClaudeOfDuty || {};
  window.ClaudeOfDuty.chart = { render: render };
})();
