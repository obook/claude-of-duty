/*
 * options.js
 * Fills the preferences page and saves every setting on change.
 *
 * All the tunable settings live here: the alert step, the alert window
 * duration, the alert sound and its volume, which meters may trigger alerts,
 * and which Claude organization to poll. Each control loads its stored value
 * on open and writes it back on every change, so the background page picks
 * the new value up on the very next poll. The organization list and the
 * meter list are filled from live data: the organizations come from the
 * background page, the meters from the latest stored readings.
 *
 * Author: Olivier Booklage
 * Date: July 2026
 * Licence: MIT
 */

const ALERT_STEP_KEY = "alertStep";
const DURATION_KEY = "alertDurationSeconds";
const SOUND_KEY = "soundChoice";
const VOLUME_KEY = "soundVolume";
const MUTED_KEY = "mutedMeters";
const ORGANIZATION_KEY = "organizationId";
const READINGS_KEY = "readings";

const DEFAULT_ALERT_STEP = 5;
const ALERT_STEPS = [5, 10, 25];
const DEFAULT_DURATION = 20;
const MIN_DURATION = 0; // 0 keeps the alert window open until the next alert
const MAX_DURATION = 300;
const DEFAULT_VOLUME = 100;

const stepInput = document.getElementById("step");
const stepOutput = document.getElementById("step-output");
const durationInput = document.getElementById("duration");
const soundSelect = document.getElementById("sound");
const volumeInput = document.getElementById("volume");
const volumeOutput = document.getElementById("volume-output");
const meterList = document.getElementById("meter-list");
const organizationSelect = document.getElementById("organization");

const SOUND_FILES = {
  bell: "sounds/bell.mp3",
  ding: "sounds/ding.mp3",
  dong: "sounds/dong.mp3",
  zingz: "sounds/zingz.mp3"
};

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

// ===============================================================
//  ALERT STEP
// ===============================================================

/* Shows the percentage matching the slider's current index. */
function updateStepOutput() {
  const step = ALERT_STEPS[Number(stepInput.value)];
  stepOutput.textContent = browser.i18n.getMessage("percentValue", [String(step)]);
}

/* Loads the saved alert step, then saves it back on every slider move. */
async function initStep() {
  const stored = await browser.storage.local.get(ALERT_STEP_KEY);
  const savedStep = typeof stored[ALERT_STEP_KEY] === "number" ? stored[ALERT_STEP_KEY] : DEFAULT_ALERT_STEP;
  const savedIndex = ALERT_STEPS.indexOf(savedStep);

  stepInput.value = savedIndex >= 0 ? savedIndex : ALERT_STEPS.indexOf(DEFAULT_ALERT_STEP);
  updateStepOutput();

  stepInput.addEventListener("input", () => {
    updateStepOutput();
    browser.storage.local.set({ [ALERT_STEP_KEY]: ALERT_STEPS[Number(stepInput.value)] });
  });
}

// ===============================================================
//  ALERT DURATION
// ===============================================================

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

// ===============================================================
//  SOUND AND VOLUME
// ===============================================================

/* Plays a short preview of the sound choice at the chosen volume. */
async function previewSound() {
  const file = SOUND_FILES[soundSelect.value];
  if (!file) {
    return;
  }
  try {
    const audio = new Audio(browser.runtime.getURL(file));
    audio.volume = Number(volumeInput.value) / 100;
    audio.play().catch(() => {});
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
    previewSound();
  });
}

/* Loads the volume, saves it on release, and previews the new level. */
async function initVolume() {
  const stored = await browser.storage.local.get(VOLUME_KEY);
  const volume = typeof stored[VOLUME_KEY] === "number" ? stored[VOLUME_KEY] : DEFAULT_VOLUME;
  volumeInput.value = volume;
  volumeOutput.textContent = browser.i18n.getMessage("percentValue", [String(volume)]);

  volumeInput.addEventListener("input", () => {
    volumeOutput.textContent = browser.i18n.getMessage("percentValue", [volumeInput.value]);
  });
  volumeInput.addEventListener("change", () => {
    browser.storage.local.set({ [VOLUME_KEY]: Number(volumeInput.value) });
    previewSound();
  });
}

// ===============================================================
//  METER FILTER
// ===============================================================

/*
 * Saves the unchecked meter keys as the muted list, merged with whatever was
 * already stored. Only the meters currently rendered are updated: a meter
 * temporarily absent from the latest readings (and so not rendered as a
 * checkbox) keeps its previous muted state instead of silently unmuting.
 */
async function saveMutedMeters() {
  const stored = await browser.storage.local.get(MUTED_KEY);
  const muted = new Set(Array.isArray(stored[MUTED_KEY]) ? stored[MUTED_KEY] : []);

  const boxes = meterList.querySelectorAll("input[type=checkbox]");
  for (const box of boxes) {
    if (box.checked) {
      muted.delete(box.value);
    } else {
      muted.add(box.value);
    }
  }
  browser.storage.local.set({ [MUTED_KEY]: Array.from(muted) });
}

/* One labelled checkbox row for a meter; checked means it may alert. */
function buildMeterRow(key, label, isMuted) {
  const item = document.createElement("li");
  const rowLabel = document.createElement("label");
  const box = document.createElement("input");
  box.type = "checkbox";
  box.value = key;
  box.checked = !isMuted;
  box.addEventListener("change", saveMutedMeters);
  rowLabel.appendChild(box);
  rowLabel.appendChild(document.createTextNode(" " + label));
  item.appendChild(rowLabel);
  return item;
}

/* Builds the meter checkboxes from the latest stored readings. */
async function initMeterFilter() {
  const stored = await browser.storage.local.get([READINGS_KEY, MUTED_KEY]);
  const readings = stored[READINGS_KEY] || {};
  const muted = new Set(Array.isArray(stored[MUTED_KEY]) ? stored[MUTED_KEY] : []);

  meterList.innerHTML = "";
  for (const key of Object.keys(readings)) {
    meterList.appendChild(buildMeterRow(key, readings[key].label, muted.has(key)));
  }
}

// ===============================================================
//  ORGANIZATION
// ===============================================================

/*
 * Fills the organization list and saves the choice ("" means automatic).
 *
 * The stored choice is only cleared when the organization list loaded fine
 * and no longer contains it (the organization was actually left or removed).
 * When the list could not be checked at all (signed out, offline), the
 * stored choice is kept and shown as-is instead of silently falling back to
 * "Automatic", so a temporary network hiccup never looks like a reset.
 */
async function initOrganization() {
  const stored = await browser.storage.local.get(ORGANIZATION_KEY);
  const chosen = typeof stored[ORGANIZATION_KEY] === "string" ? stored[ORGANIZATION_KEY] : "";

  let organizations = null;
  try {
    organizations = await browser.runtime.sendMessage({ command: "list-organizations" });
  } catch (error) {
    organizations = null;
  }

  for (const organization of organizations || []) {
    const option = document.createElement("option");
    option.value = organization.id;
    option.textContent = organization.name;
    organizationSelect.appendChild(option);
  }

  const isKnown = chosen === "" || (organizations || []).some((organization) => organization.id === chosen);
  if (!isKnown && organizations !== null) {
    // The list loaded fine: the chosen organization is genuinely gone.
    await browser.storage.local.set({ [ORGANIZATION_KEY]: "" });
    organizationSelect.value = "";
  } else if (!isKnown) {
    // Could not verify (offline): keep showing the stored id rather than
    // silently switching the display to "Automatic".
    const placeholder = document.createElement("option");
    placeholder.value = chosen;
    placeholder.textContent = chosen;
    organizationSelect.appendChild(placeholder);
    organizationSelect.value = chosen;
  } else {
    organizationSelect.value = chosen;
  }

  organizationSelect.addEventListener("change", () => {
    // set-organization resets the alert baseline before refreshing, so the
    // previous organization's buckets and history are not carried over.
    browser.runtime.sendMessage({ command: "set-organization", organizationId: organizationSelect.value });
  });
}

applyTranslations();
initStep();
initDuration();
initSound();
initVolume();
initMeterFilter();
initOrganization();
