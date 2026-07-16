# Changelog

All notable changes to Claude of Duty are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/obook/claude-of-duty/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/obook/claude-of-duty/releases/tag/v1.1.0
[1.0.1]: https://github.com/obook/claude-of-duty/releases/tag/v1.0.1
