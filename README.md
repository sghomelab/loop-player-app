# Loop Deck

A precision audio loop player built with React Native (Expo). Loop any section of any audio file, repeat it as many times as you need, and master your practice.

Built for musicians, language learners, Quran recitation practice, and anyone who needs to drill a specific part of audio.

## Features

- **A/B Looping** — Set two points and loop that exact section.
- **Repeat Counter** — Track how many times a section has looped, with an optional auto-stop after N repeats and milestone notifications.
- **Loop Delay** — Add a pause between loops for breathing room or note-taking.
- **Speed Control** — Play back from 0.25x to 4.0x.
- **Configurable Skip** — Jump forward/backward by a custom amount (3s to 30s, set in Settings).
- **Jump to Loop Start/End** — Return instantly to the beginning or end of your loop (or the track if no loop is set).
- **Manual Time Entry** — Set exact A/B points by typing them in (M:SS or seconds).
- **Waveform Visualization** — See your position with loop region and marker overlays.
- **Ayah Markers** — For Quran recitation, split audio into ayah markers and jump between them.
- **Saved Loops** — Save and recall named loops per audio file.
- **Background Playback** — Keep looping with the screen off; lock-screen controls supported.
- **Theming** — Dark, Midnight, Ocean, Charcoal, and White, plus a custom accent color.

## Tech Stack

- React Native + Expo (SDK 54)
- `expo-audio` for playback
- `@react-native-community/slider` for controls
- `react-native-svg` for the waveform
- `zustand` for state management
- `@expo/vector-icons` for icons

## Getting Started

```bash
npm install
npm start
```

Then press `i` (iOS), `a` (Android), or scan the QR code with Expo Go.

> Loop Deck runs in Expo Go for development. Production builds are made with EAS Build.

## Project Structure

```
app.json                 Expo config (name, icons, bundle id, version)
eas.json                 EAS build + submit profiles
App.js                   Root + navigation
lib/theme.js             Color schemes + theme generator
store/playerStore.js     Audio, loop, and settings state (zustand)
screens/
  LibraryScreen.js       Audio file browser
  PlayerScreen.js        Player + loop controls
  SettingsScreen.js      Theme, Quran toggle, skip amount
utils/
  audioAdapter.js        expo-audio wrapper (play, seek, status events)
  fileSystemAdapter.js   SDK 54 filesystem shim
  formatTime.js          Time formatting + parsing
  quranText.js           Surah/Ayah data
assets/                  Icons, adaptive icon, screenshots
secrets/                 Store credentials (git-ignored, NOT committed)
```

## Building

Production builds use [EAS Build](https://docs.expo.dev/build/):

```bash
eas build --platform all --profile production
```

App version and build numbers are set in `app.json` (local versioning).

## Versioning

See [CHANGELOG.md](./CHANGELOG.md) for release history.

## Privacy

Loop Deck processes all audio locally on your device. No accounts, no servers, no analytics. See [PRIVACY_POLICY.md](./PRIVACY_POLICY.md).
