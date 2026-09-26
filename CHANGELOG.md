# Changelog

All notable changes to Loop Deck are documented here.

## [1.1.2] — 2026-09-24

### Fixed
- **Session history and stats no longer reset on app update** — the history file was read with a broken synchronous call that always returned empty. Now properly loaded on startup.
- **Saved Loops popup could not be closed** — added tap-outside-to-dismiss so tapping the dark overlay closes the sheet (in addition to the Close button).

### Added
- **Settings → Data: Clear Session History** — one-tap (with confirmation) to wipe all session history and reset totals.
- **Settings → Data: Manage Saved Loops** — lists every saved loop across all files. Delete individually or "Delete All" (with a warning showing the count before proceeding).

## [1.1.1] — 2026-09-21

### Fixed
- **Duck / Isolate was not actually lowering the volume** (it used an invalid `setVolume` call that silently did nothing). Now it correctly sets the player volume, so the levels (−6/−12/−18 dB and Mute) work as intended.

## [1.1.0] — 2026-09-16

### Added
- **Duck / Isolate (Karaoke mode)** — lower the original's volume to focus on your own part. Five levels (Off / −6 / −12 / −18 dB / Mute), available on the player (below Speed) and in Settings. Applies immediately and is remembered for the file you load next.

### Improved
- The time display now follows the scrubber while you drag, and snaps to the real position on release.

## [1.0.2] — 2026-09-13

### Fixed
- Saved loops (and the current loop) were lost after navigating away from the player and back. The player now keeps the loaded file's state instead of reloading it.
- Manual "Set Loop Time" did not move the audio. It now jumps to point A immediately and follows the A→B loop.

### Changed
- Set Loop Time now requires both A and B; a blank field is flagged by name.
- Clearer instructions in the Set Loop Time screen (e.g. `90` = 90 seconds, `1:30` = 1 min 30 sec).

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
