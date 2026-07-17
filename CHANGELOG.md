# Changelog

All notable changes to Claude of Duty are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.1] - 2026-07-17

### Fixed

- The popup could go stale while kept open: meters and the chart only
  redrew on a storage change event, with no fallback if one was missed.
  They now also refresh on the existing 30-second timer.

## [1.2.0] - 2026-07-17

### Added

- "Keep open" button in the alert window: cancels the countdown so the window
  stays until closed by hand, even when new alerts arrive (they still update
  the meters, play the sound, and take focus).
- "Snooze 1 h" button in the alert window: silences alerts for an hour and
  closes the window. The popup shows the running snooze with a button to end
  it early.
- Data freshness in the popup: an "Updated X min ago" line, and a clear
  failure message when the last check did not go through. A failed poll now
  shows a gray "?" badge instead of silently clearing it.
- Adaptive polling: the usage is checked every minute (instead of every
  5 minutes) once any meter reaches 80%.
- Dedicated "Limit reset" alert title when meters cross a step downward,
  instead of presenting a reset like a usage alert.
- Tooltip on the toolbar button listing every meter with its percentage and
  trend.
- Alert sound volume slider.
- Per-meter alert filter: unchecked meters never trigger alerts.
- The 7-day chart now plots every meter (not only the session) with a legend.
- Organization picker for accounts that belong to several Claude
  organizations. Defaults to automatic detection.
- Warning banner in the popup when the usage API response stops looking as
  expected (previously only logged to the console).

### Changed

- All settings now live in the preferences page (alert step, duration, sound,
  volume, meter filter, organization); the popup gains a "Settings" button in
  their place.

### Fixed

- The linear usage trend no longer blends readings from before and after a
  limit reset, which used to understate how fast usage was climbing right
  after a reset.
- The trend line no longer floors its projection at "~1h": once a meter is at
  or effectively at 100%, it now says "Limit reached." instead.
- The alert step and volume percentage outputs in the preferences page no
  longer wrap onto two lines at 100%.
- The popup's API-warning banner and snooze status rows are now properly
  hidden when inactive (an added CSS rule was silently overriding the
  `hidden` attribute).
- Switching organization now resets the alert buckets and 7-day history, so
  it no longer fires a false "Limit reset" alert or mixes two organizations'
  data in the chart and trend.
- The organization picker no longer silently reverts to "Automatic" (without
  updating storage) when it cannot verify a stored choice while offline; it
  now only clears the choice once the organization is confirmed gone.
- Muting a meter that later disappears from the API response (and so is not
  rendered as a checkbox) no longer gets silently unmuted next time another
  meter is toggled.
- A failure while reacting to a successful poll (e.g. opening the alert
  window) no longer shows a misleading "Are you signed in?" message; only a
  failure to fetch the usage does.
- The fast, 1-minute polling period now backs off to the normal period as
  soon as a poll fails, instead of retrying every minute indefinitely.
- The alert window is now tall enough for its three footer buttons to wrap
  onto a second row without clipping.
- The 7-day chart legend now shows a readable label instead of the raw
  internal key for a meter that dropped out of the latest reading, and its
  ordering now matches the popup list and toolbar tooltip.

## [1.1.0] - 2026-07-16

### Added

- Preferences page to choose the alert step (5%, 10%, or 25%) with a slider.
  Defaults to 5% for existing and new installs.
- The session limit row is now visually distinct in the popup (accent border
  and tinted background), since it resets much sooner than the weekly limits.
- Toolbar badge showing the current session usage percentage, colored green
  below 70%, orange from 70% to 89%, and red from 90% up. Cleared on a
  failed poll.
- Usage trend line in the popup: a rolling history of readings (last 7 days,
  shared with the chart below) is kept per meter, and a simple linear
  projection over its most recent points shows either "On track for reset."
  or "At this rate: limit in ~Xh", once at least 3 points are available.
- 7-day chart in the popup, plotting the session limit's history as an inline
  SVG line with a dashed threshold at the configured alert step. Hidden until
  at least 2 data points are available.

### Changed

- The alert window now shows every current meter when one crosses a step,
  instead of only the meter that crossed.

### Fixed

- Adjusted the volume of the dong alert sound.

## [1.0.1] - 2026-07-13

### Added

- Read usage from the Claude API (`/api/organizations/{id}/usage`) with the
  session cookie, so alerts work in the background without the usage page open.
- Watch three limits: the current 5-hour session, the weekly all-models limit,
  and the weekly per-model limit (Fable).
- Persistent alert window with progress bars. It closes after a delay you set,
  or stays open when the delay is 0.
- Choice of alert sound (bell, ding, dong, zingz) or silence, with a preview in
  the popup.
- English and French interface, following the browser language.
- PNG icons for the toolbar and the AMO listing.
- Schema guard that warns when the usage API response stops looking as expected.

### Changed

- Read the figures from the API instead of scraping the usage page, so a change
  to the site's HTML no longer breaks the extension.

## [1.0.0] - 2026-07-13

### Added

- Initial version.

[Unreleased]: https://github.com/obook/claude-of-duty/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/obook/claude-of-duty/releases/tag/v1.2.0
[1.1.0]: https://github.com/obook/claude-of-duty/releases/tag/v1.1.0
[1.0.1]: https://github.com/obook/claude-of-duty/releases/tag/v1.0.1
