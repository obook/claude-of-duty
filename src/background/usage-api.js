/*
 * usage-api.js
 * Reads the Claude usage figures straight from the site's own API, using the
 * signed-in session cookie. This is what lets Claude of Duty work without the
 * usage page (or any specific page) being open.
 *
 * Two ways to reach the API:
 *   1. A direct fetch from the background page. The extension's host
 *      permission attaches the cookies and lifts CORS, so this normally works
 *      even with no Claude tab open at all.
 *   2. If that direct call is refused (some origin checks), a relay through an
 *      open Claude tab, where the request is genuinely same-origin.
 *
 * The public entry point is window.ClaudeOfDuty.usageApi.fetchUsageReadings().
 *
 * Author: øbook
 * Date: July 2026
 * Licence: MIT
 */

(function () {
  const CLAUDE_ORIGIN = "https://claude.ai";
  const ORGANIZATIONS_PATH = "/api/organizations";
  const CLAUDE_TABS_QUERY = { url: "https://claude.ai/*" };
  const JSON_HEADERS = { accept: "application/json" };

  /* Path of the usage endpoint for a given organization. */
  function usagePath(organizationId) {
    return "/api/organizations/" + organizationId + "/usage";
  }

  /* Direct call from the background page (host permission attaches cookies). */
  async function fetchJsonDirect(path) {
    const response = await fetch(CLAUDE_ORIGIN + path, {
      credentials: "include",
      headers: JSON_HEADERS
    });
    if (!response.ok) {
      throw new Error("HTTP " + response.status + " for " + path);
    }
    return response.json();
  }

  /* Fallback: ask an open Claude tab to do the same-origin fetch for us. */
  async function fetchJsonViaTab(path) {
    const tabs = await browser.tabs.query(CLAUDE_TABS_QUERY);
    for (const tab of tabs) {
      try {
        const result = await browser.tabs.sendMessage(tab.id, {
          command: "fetch-json",
          path: path
        });
        if (result && result.ok) {
          return result.data;
        }
      } catch (error) {
        /* Tab without our content script yet: try the next one. */
      }
    }
    throw new Error("No Claude tab could fetch " + path);
  }

  /* Tries the direct call, then the tab relay. */
  async function fetchJson(path) {
    try {
      return await fetchJsonDirect(path);
    } catch (directError) {
      return fetchJsonViaTab(path);
    }
  }

  /*
   * Picks the consumer plan organization (the one that can chat), so we do not
   * accidentally read an API-only organization that has no plan limits.
   */
  function pickOrganizationId(organizations) {
    if (!Array.isArray(organizations) || organizations.length === 0) {
      return null;
    }
    const chatOrg = organizations.find((org) =>
      Array.isArray(org.capabilities) && org.capabilities.includes("chat"));
    const chosen = chatOrg || organizations[0];
    return chosen ? chosen.uuid : null;
  }

  /*
   * Turns one raw "limit" entry into a meter we watch, or null for kinds we
   * ignore. The scoped weekly limit is labelled with its model name (e.g.
   * "Fable"), so it keeps working even if that model is renamed.
   */
  function meterFromLimit(limit) {
    if (limit.kind === "session") {
      return { key: "session", label: browser.i18n.getMessage("meterSession") };
    }
    if (limit.kind === "weekly_all") {
      return { key: "weekly-all", label: browser.i18n.getMessage("meterAllModels") };
    }
    if (limit.kind === "weekly_scoped") {
      const hasModel = limit.scope && limit.scope.model;
      const modelName = hasModel ? limit.scope.model.display_name : null;
      // A per-model key keeps several scoped limits (e.g. Fable and Opus) apart
      // instead of overwriting one another. The model name itself is not
      // translated; only the fallback label is.
      const slug = modelName ? modelName.toLowerCase().replace(/[^a-z0-9]+/g, "-") : "model";
      const label = modelName || browser.i18n.getMessage("meterScopedFallback");
      return { key: "weekly-scoped-" + slug, label: label };
    }
    return null;
  }

  /* Extracts the watched meters from a raw usage payload. */
  function readingsFromUsage(usage) {
    const limits = usage && Array.isArray(usage.limits) ? usage.limits : [];
    const readings = [];
    for (const limit of limits) {
      const meter = meterFromLimit(limit);
      if (meter && typeof limit.percent === "number") {
        readings.push({
          key: meter.key,
          label: meter.label,
          percent: limit.percent,
          resetsAt: limit.resets_at || null
        });
      }
    }
    return readings;
  }

  /* Remembered between polls to avoid re-listing organizations every time. */
  let cachedOrganizationId = null;

  /* Fetches and parses the current usage meters. */
  async function fetchUsageReadings() {
    if (!cachedOrganizationId) {
      const organizations = await fetchJson(ORGANIZATIONS_PATH);
      cachedOrganizationId = pickOrganizationId(organizations);
    }
    if (!cachedOrganizationId) {
      throw new Error("No organization found");
    }
    try {
      const usage = await fetchJson(usagePath(cachedOrganizationId));
      return readingsFromUsage(usage);
    } catch (error) {
      // The cached organization may be stale: force a re-discovery next time.
      cachedOrganizationId = null;
      throw error;
    }
  }

  window.ClaudeOfDuty = window.ClaudeOfDuty || {};
  window.ClaudeOfDuty.usageApi = { fetchUsageReadings: fetchUsageReadings };
})();
