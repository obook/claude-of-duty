# Claude of Duty

A small Firefox extension that watches your Claude plan usage and alerts you
at every 5% step, so you know a limit is coming before you hit it.

It reads your usage from Claude's own API using your signed-in session, so it
works in the background. You do not need to keep the usage page open.

> [!IMPORTANT]
> **Claude of Duty never knows your Claude login details.** There is no login
> form, and the extension never reads, stores, or sends your password or your
> session token. It relies only on the session cookie your browser already
> holds and attaches to requests on its own. That cookie is `httpOnly`, so no
> script, this extension included, can even read its value.

![The Claude of Duty popup](media/popup.png)

## What it watches

Three limits, each with its own alert when it crosses a 5% step and again when
it resets:

- **Current session**: the rolling 5-hour window (reset shown in hours).
- **All models**: the weekly limit across every model (reset shown by day).
- **Fable**: the weekly per-model limit (labelled with the model name).

## How it works

- Calls `GET /api/organizations/{id}/usage` on `claude.ai`, authenticated by
  your session cookie. The extension never sees or stores your token.
- Finds your organization automatically from `/api/organizations`.
- Polls on a background timer, at browser start, and on demand from the popup.
- Shows crossed limits in a small popup window that closes after a delay you
  set (20 seconds by default).

## Install

1. Build the archive:

   ```bash
   ./build-firefox.sh
   ```

   This creates `firefox-release/claude-of-duty.xpi`.

2. The `.xpi` is unsigned, so use **Firefox Developer Edition** or **Nightly**:
   set `xpinstall.signatures.required` to `false` in `about:config`, then
   install the file from `about:addons`.

   Quick test instead: open `about:debugging`, "Load Temporary Add-on...", and
   pick `src/manifest.json`.

## Permissions

- `storage`: remember the last notified step and latest readings.
- `alarms`: schedule the periodic poll.
- `https://claude.ai/*`: read your usage from the Claude API.

The alert window uses `browser.windows`, which needs no permission.

## Privacy and security

Your Claude credentials never pass through the extension.

| Question | Answer |
| --- | --- |
| Does it ask for or store your password? | Never. There is no login form anywhere in the extension. |
| Can it read your session token? | No. The session cookie is `httpOnly`, so it is invisible to every script, including this one. |
| How does it authenticate then? | Like the Claude website itself: the browser attaches your existing cookie automatically (`credentials: "include"`). The code never touches the cookie value. |
| Where does your usage data go? | Nowhere. It stays in your browser's local storage. |
| Does it contact any other server? | No. It only ever talks to `claude.ai`. |
| Analytics or telemetry? | None. |

The full source is in this repository under the MIT licence, so you can check
exactly what it does.

## Localization

The interface and alerts are available in English and French, following your
browser language.

## Licence

[MIT](LICENSE).
