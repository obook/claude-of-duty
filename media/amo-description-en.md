# AMO description

## Short description

Watches your Claude plan usage and notifies you as a limit approaches, with a toolbar badge, a usage trend, and a 7-day chart.

> This extension **never** knows your Claude login details.
> There is no login form, and the extension never reads, stores, or sends your password or your session token.

**Description**
Claude of Duty is a small Firefox extension that watches your Claude plan usage and notifies you as a limit approaches, so you know it is coming before you hit it.

It reads your usage from Claude's own API using your signed-in session, so it works in the background. You do not need to keep the usage page open.

**What it watches**
Three limits, each with its own notification when it crosses the alert step and again when it resets:

- Current session: the rolling 5-hour window (reset shown in hours).
- All models: the weekly limit across every model (reset shown by day).
- Scoped model: the weekly limit for whichever model is currently subject to one, labelled with that model's own name. If the model changes, the label updates automatically.

The alert step defaults to 5% and can be set to 10% or 25% from the extension's preferences. When any limit crosses a step, the alert window shows all three limits together, not just the one that changed.

**In the popup**
- The current session row is visually highlighted, since it resets much sooner than the weekly ones.
- A trend line projects, from recent readings, either "On track for reset." or "At this rate: limit in ~Xh".
- A 7-day chart plots the session limit's history, with a dashed line at the configured alert step.
- The toolbar icon always shows the current session usage as a badge, colored green, orange, or red depending on how close it is to the limit.

**How it works**
- Calls GET /api/organizations/{id}/usage on claude.ai, authenticated by your session cookie. The extension never sees or stores your token.
- Finds your organization automatically from /api/organizations.
- Polls on a background timer, at browser start, and on demand from the popup.
