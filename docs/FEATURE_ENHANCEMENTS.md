# Loop Deck — Feature Enhancements: Scope & Design

Prioritized design doc for proposed enhancements. Each feature: **What it does**, **Scope** (MVP → later), **Design** (data, state, UI, technical approach, files to touch), **Effort**, **Risks/deps**.

Stack context: React Native + Expo SDK 54 (pure Expo, no native modules today), `expo-audio` for playback, `zustand` for state, `react-native-svg`, local-only persistence via `expo-file-system`. Key files: `store/playerStore.js`, `screens/PlayerScreen.js`, `utils/audioAdapter.js`, `app.json`.

---

## At a glance

| # | Feature | Value | Effort | Native? | Phase |
|---|---------|:-----:|:------:|:-------:|:-----:|
| 1 | Record over the loop | High | L | verify rec API | 2 |
| 2 | Ducking / isolate (Karaoke) | High | S | No | 1 |
| 3 | Metronome + count-in | High | M | No | 2 |
| 4 | Pitch shift (transpose) | High | L | Yes (DSP) | 3 |
| 5 | Loop queue (multiple loops) | High | M | No | 1 |
| 6 | Practice analytics | High | M | No | 1 |
| 7 | Mastery badges / streaks | Med | S–M | No | 2 |
| 8 | Crossfade at the loop point | Med | S–M | No | 2 |
| 9 | Tap-tempo / BPM | Med | S / L | detect = native | 2 |
| 10 | EQ / vocal (center) removal | Med | L | Yes (DSP) | 3 |
| 11 | Chapters / marks (generalize ayah) | Med | S–M | No | 1 |
| 12 | Transcript sync (lyrics in time) | High | M | No | 2 |
| 13 | Favourites / recent / search | Med | S | No | 1 |
| 14 | Export / import backup | Med | S–M | No | 1 |
| 15 | Home-screen widget | Med | L | Platform | 3 |
| 16 | HW buttons + loop-point haptics | Med | M | No | 2 |

**Phases**
- **Phase 1 — quick wins, pure Expo, high value:** #2 Ducking, #5 Loop queue, #6 Analytics, #11 Chapters/marks, #13 Favourites/recent/search, #14 Backup.
- **Phase 2 — moderate, pure Expo:** #1 Record, #3 Metronome, #12 Transcript sync, #8 Crossfade, #9 Tap-tempo, #7 Badges, #16 HW buttons + haptics.
- **Phase 3 — native DSP / platform (bigger):** #4 Pitch shift, #10 EQ/vocal removal, #15 Widget.

---

## Tier 1 — Highest impact

### 1. Record over the loop  (Phase 2 · L)
**What:** While a loop plays, record the user's mic/instrument as a "take," save it, and play it back alone or layered over the original. The feature that turns a loop player into a practice+review tool.

**Scope**
- MVP: Record mic during playback → save take (m4a) per loop → list takes per file → play a take (solo or mixed over the original, independent volume) → delete take.
- Later: multiple takes, A/B compare, trim, export/share, auto-name takes by loop.

**Design**
- New `utils/recorderAdapter.js` wrapping the recorder. **Confirm the recording module for SDK 54 first** — `expo-av` `Audio.Recording` (or `expo-mic`); verify it coexists cleanly with `expo-audio` playback in the same session. `RECORD_AUDIO` + `MODIFY_AUDIO_SETTINGS` are already in `app.json`.
- State (`playerStore`): `takes: [{ id, loopId, fileUri, createdAt, duration, ms }]` per `audioFile`, persisted like `savedLoops` (own JSON per file under `DOCUMENTS_DIR/takes/<fileId>/`).
- Playback: a second `AudioPlayer` instance for the take; mixing = play original (looped) + take simultaneously with independent `setVolume`. 
- UI: a mic button in the transport row (recording shows a red dot + running timer); a "Takes" sheet to list/play/delete; a small balance control (original vs take volume) when a take is playing.
- Files: new `utils/recorderAdapter.js`, store actions (`startTake`, `stopTake`, `playTake`, `deleteTake`), new `TakesSheet` in `PlayerScreen.js`.

**Risks:** two simultaneous audio sources (sync + volume balance); recorder/playback interaction on Android. Mitigate by starting with "record, then play back" (not necessarily live monitoring).

### 2. Ducking / isolate (Karaoke mode)  (Phase 1 · S)
**What:** Lower or mute the original so the user can focus on their own part (sing/play over a quiet backing).

**Scope**
- MVP: A "Duck" control with levels — Off / −6 / −12 / −18 / Mute. Applies to the main player volume.
- Later: auto-duck only during the loop region; per-section duck; a "vocal up" preset. (True center-channel/vocal isolation is a separate DSP feature — see #10.)

**Design**
- State: `duckLevel: number` (0 = off; map to a volume 0..1, e.g. 0→1.0, 6→0.85, 12→0.6, 18→0.3, mute→0).
- Apply via `audioAdapter` `setVolume(v)` on the active player (expo-audio `player.setVolume`).
- UI: a compact control in the transport row (a speaker icon that cycles levels, or a small chip row like the skip control). Persist in settings.
- Files: store field + `setDuckLevel`, a `DuckControl` in `PlayerScreen.js`, a row in `SettingsScreen.js`.

**Risks:** minimal. Just don't let ducking fight with playback-rate/volume changes; store the "base" volume separately from duck.

### 3. Metronome + count-in  (Phase 2 · M)
**What:** A click track (metronome) and an optional count-in (e.g. 4 clicks or "3-2-1") before the loop/play starts, so the user launches in time.

**Scope**
- MVP: metronome on/off, set BPM (slider 40–240 + tap-tempo), optional count-in length (1–4 beats) triggered on play/loop-start.
- Later: time-signature feel (accented downbeat), sync metronome to the loop length.

**Design**
- Sound: bundle a short tick `.wav` (or two: downbeat/accent) in `assets/`; play via a lightweight `expo-audio` player.
- Timing: a beat scheduler driven by `requestAnimationFrame`/`setInterval` computed from BPM. **Accuracy is the tricky part** — use a lookahead scheduler (schedule a few beats ahead against a performance clock) to avoid drift. Keep it in `utils/metronome.js`.
- State: `metronomeEnabled`, `bpm`, `countInBeats`.
- UI: a metronome button + BPM readout; count-in option in a small sheet; integrate with Play so "count-in then loop" is one action.
- Files: `utils/metronome.js`, store fields, `MetronomeSheet` + transport button.

**Risks:** timer drift/jitter. Mitigate with the lookahead scheduler and by tying ticks to a monotonic clock, not raw `setInterval` cadence.

### 4. Pitch shift (transpose)  (Phase 3 · L · needs native)
**What:** Shift playback pitch up/down N semitones **without** changing tempo (for vocal/singing practice in a comfortable key).

**Scope:** ±12 semitones, live; a "keep original" reset.

**Design**
- `expo-audio` only exposes `setPlaybackRate` (changes tempo too), so this **needs a native audio DSP**: iOS `AVAudioEngine` with a `AVAudioUnitVarispeed`/pitch node, or a SoundTouch-based module; Android via `AudioEffect`/native. Either a custom Expo module or a vetted prebuilt one.
- State: `pitchSemitones: number`. UI: a +/− stepper or slider in the transport/settings.
- Files: new native module (or dependency) + a `pitchSemitones` in store + a `PitchControl`.

**Risks:** highest-effort item (dual-platform native, audio pipeline). Prototype on one platform first.

### 5. Loop queue (multiple loops / sequence)  (Phase 1 · M)
**What:** Define an ordered list of A/B sections and auto-advance through them (verse → chorus → verse). Optionally repeat the whole sequence or stop at the end.

**Scope**
- MVP: a "sequence" = ordered items `{pointA, pointB, repeats}`; player loops the current item `repeats`× then jumps to the next; on-end = stop or repeat-sequence. Save sequences per file (like saved loops).
- Later: reorder/duplicate, per-item name, "play item N" from the list.

**Design**
- Data: `sequences: [{ id, name, items: [{pointA, pointB, repeats}], onEnd: 'stop'|'repeat' }]` persisted per file.
- State: `activeSequenceId`, `sequenceIndex`. Extend the existing `_onTimeUpdate` loop logic: when `current >= pointB` of the current item and its repeat count is reached → advance `sequenceIndex` and `seekTo(next.pointA)`; if last item, apply `onEnd`.
- Reuses the current single-loop machinery + `savedLoops` persistence pattern — low new-surface.
- UI: a "Sequence" sheet (add from current A/B, reorder, remove, set repeats per item, pick on-end); a transport indicator "item 2/5".
- Files: store (`activeSequence`, `sequenceIndex`, advance logic in `_onTimeUpdate`), `SequenceSheet` in `PlayerScreen.js`.

**Risks:** interaction with the existing single-loop + loopMax logic — isolate sequence-advance as its own branch so single-loop behavior is unchanged.

### 6. Practice analytics  (Phase 1 · M)
**What:** Track practice over time — minutes per file/loop, daily/weekly totals, streaks, and a daily goal with progress. Builds on the existing `totalPlayTime` / `totalRepeats` / session history.

**Scope**
- MVP: a `practiceLog` of per-day totals; a Stats screen with all-time + today + this-week, a 7/30-day bar chart, current streak, and a daily-goal progress ring.
- Later: per-file/per-loop breakdown, CSV export, goals by loop.

**Design**
- Data: `practiceLog: [{ date: 'YYYY-MM-DD', ms, repeats }]` persisted as JSON. Accumulate elapsed play time (bucket by local date) as the user practices; they already track `totalPlayTime` — just also append to the daily log.
- Aggregation on read (sum ranges, compute streak).
- Charts: `react-native-svg` (already a dependency) — simple bar chart, no heavy chart lib. A small `lib/charts.js` or inline SVG bars.
- UI: a new `StatsScreen` (or a tab on Library/Settings).
- Files: store (`practiceLog`, `logPractice`), new `StatsScreen.js`, route in `App.js`.

**Risks:** time-bucketing edge cases (midnight rollover) — flush the current bucket when the date changes / on pause.

### 7. Mastery badges / streaks  (Phase 2 · S–M)
**What:** Per-loop streaks and achievement badges (e.g. "100 repeats this week", "7-day streak"). Extends the existing milestone system.

**Design:** Reuse `loopCounter` + `practiceLog`. Compute badges from thresholds in `lib/badges.js`. UI: a badges section on the Stats screen; a subtle toast when a badge is earned (reuse `Vibration` + toast).

---

## Tier 2 — Audio refinement

### 8. Crossfade at the loop point  (Phase 2 · S–M)
**What:** A short fade at the seam so the loop wrap sounds seamless instead of an abrupt cut.

**Scope:** "Loop fade" toggle + duration (0.1–0.5 s).

**Design:** Single-player approach (approximate but effective): in `_onTimeUpdate`, when within `loopFadeMs` of `pointB`, ramp the player volume down toward ~0; right after the seek to `pointA`, ramp back up. `loopFadeMs` in store. (A true two-buffer crossfade is possible later but overkill for v1.)

**Risks:** volume ramp granularity vs. the 100 ms status cadence — use a short timer to smooth the ramp; keep fade off by default.

### 9. Tap-tempo / BPM  (Phase 2 · S for tap, L for detect)
**What:** Tap a button to set the metronome tempo; optionally auto-detect BPM.

**Design:** Tap-tempo = timestamp taps, average recent intervals → `BPM = 60000 / avgMs` (ignore gaps > ~2 s). Feeds `bpm` from #3. **Auto-detection needs DSP** (onset detection) → Phase 3 / optional.

### 10. EQ / vocal (center-channel) removal  (Phase 3 · L · needs native)
**What:** Basic EQ, or remove the center channel (vocals) for Karaoke.

**Design:** Needs sample-level DSP — native module (iOS `AVAudioEngine` + filters; Android Oboe/JNI). Center-channel removal = subtract the center component (L−R phase inversion). This and #4 are the two "native DSP" items.

---

## Tier 3 — Organization & quality of life

### 11. Chapters / marks (generalize ayah markers)  (Phase 1 · S–M)
**What:** Drop labeled "marks" at any point for any audio (chapters, sections, practice spots) — generalizing the Quran ayah-marker system.

**Scope:** manual marks `{time, label}` for all files; keep auto-split ayahs as the Quran-specific case.

**Design:** Reuse the `ayahMarkers` structure/logic. Generalize the UI to a "Marks" sheet (add at current time + optional label, list, jump, delete). Persist per file like ayah markers.
**Files:** store (`marks`, or unify with `ayahMarkers`), `MarksSheet` in `PlayerScreen.js`.

### 12. Transcript sync (lyrics/words in time)  (Phase 2 · M)
**What:** Show a text transcript synced to the audio — highlight the current line, tap a line to seek. Natural extension of the Quran text feature for language learning / lyrics.

**Scope**
- MVP: import SRT/VTT (or a simple timed text) per file → list of `{start, end, text}` → highlight active line by `currentTime` → tap to seek → auto-scroll.
- Later: word-level karaoke highlighting (needs word timings), manual line editor.

**Design:** `utils/transcript.js` (SRT/VTT parser). Data: `transcript: { lines: [...] }` per file (persisted). UI: a "Transcript" overlay/sheet with the active line highlighted (reuse the time-driven index logic already used for ayahs). 
**Files:** `utils/transcript.js`, store (`transcript`, `currentLineIndex`), `TranscriptSheet`.

### 13. Favourites / recently played / library search  (Phase 1 · S)
**What:** Star files, a Recent list, and a search box to filter the library by name.

**Design:** Store: `favourites: [fileId]`, `recent: [{ fileId, ts }]` (persist). `LibraryScreen`: a `TextInput` search filter + a Favourites/Recent row. Low surface area.

### 14. Export / import backup  (Phase 1 · S–M)
**What:** Back up all per-file data (loops, sequences, marks, transcripts, favourites, settings, practice log) as one portable JSON; restore it. Important for a local-only app.

**Design:** `utils/backup.js` — serialize the store's persisted data to a JSON bundle; write to a temp file and trigger the system share sheet (`expo-sharing`); import reads a JSON file and merges into the store + re-persists. UI: a "Backup & Restore" section in Settings (two buttons + a last-backup timestamp).

### 15. Home-screen widget  (Phase 3 · L · platform)
**What:** A widget showing the current file/loop + counter, tap to open. (Quick controls optional.)

**Design:** iOS WidgetKit (e.g. `react-native-widget`/HomeWidget) + Android Glance. Share state via an app-group (iOS) / shared prefs (Android) file the app writes on state change. **MVP = display-only** (no remote controls) to keep it tractable.

### 16. Hardware / headphone buttons + loop-point haptics  (Phase 2 · M)
**What:** Media/headphone buttons for play/skip; an optional subtle haptic tick at each loop point.

**Design:** Media buttons via the platform media-session (iOS remote commands / Android media-button receiver); they already use `setActiveForLockScreen`, so some controls may already work — extend to skip. Haptics: `Vibration.vibrate()` on loop wrap (they already vibrate on milestones) — add an optional per-loop setting.

---

## Recommended build order (value ÷ effort)

1. **Ducking** (S, high value) — fastest visible win.
2. **Loop queue** (M) — core practice upgrade, reuses existing loop logic.
3. **Analytics** (M) — builds on existing session tracking; adds retention/motivation.
4. **Chapters/marks + Favourites/recent/search** (S–M) — organization.
5. **Backup** (S–M) — peace of mind for a local-only app.
6. **Record over the loop** (L) — the marquee practice feature.
7. **Metronome + count-in** (M) — musician essential.
8. **Transcript sync** (M) — language-learning differentiator.
9. Then the native-DSP tier (pitch, EQ) and the widget, when it's worth the platform investment.
