# Changelog

All notable changes to Claude of Duty are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/obook/claude-of-duty/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/obook/claude-of-duty/releases/tag/v1.0.1
