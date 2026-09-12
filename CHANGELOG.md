# Changelog

All notable changes to Loop Deck are documented here.

## [1.0.1] — 2026-09-12

### Added
- Configurable skip amount (3s / 5s / 10s / 15s / 30s) in Settings → Playback, displayed on the skip buttons.
- Jump to **Loop Start** and **Loop End** transport buttons (falls back to track start/end when no loop is set).
- Manual time entry — set exact A/B loop points by typing (M:SS or seconds) via the "Time" button.

### Fixed
- Crash when saving a loop (unsafe `crypto.randomUUID` usage in React Native).
- Progress slider not tracking playback and seeking not jumping audio to the right time (wrong `expo-audio` status event fields).

## [1.0.0] — 2026-08-31

### Added
- Initial release.
- A/B looping with repeat counter, loop delay, and repeat limit.
- Speed control (0.25x to 4.0x).
- Waveform visualization with loop region and ayah marker overlays.
- Quran Surah search and ayah markers.
- Saved loops per audio file.
- Background playback with lock-screen controls.
- Color themes (Dark, Midnight, Ocean, Charcoal, White) + custom accent.
