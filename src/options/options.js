/*
 * options.js
 * Lets the user pick how often (in percent) alerts fire.
 *
 * The step is one of a small fixed set of choices, picked with a range
 * slider whose position is an index into ALERT_STEPS rather than the
 * percentage itself. The chosen value is written to storage on every input
 * event, so monitor.js picks it up on the very next poll.
 *
 * Author: øbook
 * Date: July 2026
 * Licence: MIT
 */

const ALERT_STEP_KEY = "alertStep";
const DEFAULT_ALERT_STEP = 5;
const ALERT_STEPS = [5, 10, 25];

const stepInput = document.getElementById("step");
const stepOutput = document.getElementById("step-output");

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

/* Shows the percentage matching the slider's current index. */
function updateOutput() {
  const step = ALERT_STEPS[Number(stepInput.value)];
  stepOutput.textContent = browser.i18n.getMessage("percentValue", [String(step)]);
}

/* Loads the saved alert step, then saves it back on every slider move. */
async function initStep() {
  const stored = await browser.storage.local.get(ALERT_STEP_KEY);
  const savedStep = typeof stored[ALERT_STEP_KEY] === "number" ? stored[ALERT_STEP_KEY] : DEFAULT_ALERT_STEP;
  const savedIndex = ALERT_STEPS.indexOf(savedStep);

  stepInput.value = savedIndex >= 0 ? savedIndex : ALERT_STEPS.indexOf(DEFAULT_ALERT_STEP);
  updateOutput();

  stepInput.addEventListener("input", () => {
    updateOutput();
    browser.storage.local.set({ [ALERT_STEP_KEY]: ALERT_STEPS[Number(stepInput.value)] });
  });
}

applyTranslations();
initStep();
