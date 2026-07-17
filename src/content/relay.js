/*
 * relay.js
 * Same-origin fetch relay for the background page.
 *
 * Runs on claude.ai. When the background page cannot read the usage API
 * directly, it asks an open Claude tab to run the fetch here, where the
 * request is genuinely same-origin and carries the right cookies and origin.
 * This file never reads the DOM; it only forwards a fetch.
 *
 * Author: Olivier Booklage
 * Date: July 2026
 * Licence: MIT
 */

browser.runtime.onMessage.addListener((message) => {
  if (!message || message.command !== "fetch-json") {
    return undefined;
  }
  // Returning a promise makes sendMessage resolve with the fetched result.
  return fetch(message.path, {
    credentials: "include",
    headers: { accept: "application/json" }
  })
    .then((response) => {
      if (!response.ok) {
        return { ok: false, status: response.status };
      }
      return response.json().then((data) => ({ ok: true, data: data }));
    })
    .catch((error) => ({ ok: false, error: String(error) }));
});
