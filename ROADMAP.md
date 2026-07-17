# Roadmap

Ideas and known gaps not scheduled yet. Check an item off when it ships, with
a note in `CHANGELOG.md` under `[Unreleased]`.

## Features

- [ ] **Usage credits meter.** claude.ai's settings page has a "Usage
      credits" panel (spend this month, monthly spend limit, current
      balance) separate from the session/weekly plan limits this extension
      already tracks. Needs the exact API endpoint and response shape before
      it can be implemented: open the settings page where it appears, F12 >
      Network tab, reload, and capture the request's URL and JSON body.
- [ ] **Manifest V3 / Chrome port.** The extension is Firefox-only
      (Manifest V2, persistent background page). Porting to MV3 (service
      worker background, no persistent `window`) would widen the audience to
      Chrome/Edge, but touches every background module and is a separate
      chantier from incremental Firefox changes.

## Cleanup (from the 2026-07-17 code review, deferred as lower priority)

- [ ] **Organization auto-fallback.** If a user-chosen organization
      (`organizationId` in storage) is later removed or left, polling stays
      stuck on it forever. `resolveOrganizationId` in `usage-api.js` could
      fall back to auto-detection when the chosen id no longer resolves,
      instead of only falling back when no id is stored at all.
- [ ] **Shared storage-key constants.** Storage key strings ("snoozeUntil",
      "apiWarning", "lastPoll", "readings", ...) are now duplicated as
      literals across background, popup, options, and alert scripts. A
      single constants script loaded by every page would remove the typo /
      drift risk.
