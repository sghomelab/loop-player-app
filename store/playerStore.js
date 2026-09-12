import { create } from 'zustand';
import { FileSystemAdapter } from '../utils/fileSystemAdapter';
import { getAudio, setAudioPlaybackMode, setAudioInactive } from '../utils/audioAdapter';

// Use the new SDK 54 filesystem API (Paths.document/File/Directory), adapted
// to the legacy interface this store was written against.
const FileSystem = FileSystemAdapter;

const DOCUMENTS_DIR = FileSystem.documentDirectory;

// Safe unique ID generator (React Native may not expose a global `crypto`).
function generateId(prefix) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export const usePlayerStore = create((set, get) => ({
  selectedFile: null,
  audioFile: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  playbackRate: 1.0,
  loopRegion: null,
  sound: null,
  library: [],
  loopCounter: 0,
  loopMax: 0,
  milestone: null,
  lastSession: null,
  ayahMarkers: [],
  currentAyahIndex: -1,
  surahData: null,
  loadError: null,
  sessionHistory: [],
  totalRepeats: 0,
  totalPlayTime: 0,
  quranSurahEnabled: false,
  colorScheme: 'dark',
  customAccent: '#1F6FEB',
  skipSeconds: 5,

  async loadFile(file) {
    const AudioModule = await getAudio();
    const { sound, lastSession } = get();
    if (sound) { await sound.stopAsync(); await sound.unloadAsync(); }
    try {
      const newSound = new AudioModule.Sound();
      await newSound.loadAsync({ uri: file.uri, title: file.name }, {}, true);
      const status = await newSound.getStatusAsync();
      const dur = status.durationMillis ? status.durationMillis / 1000 : 0;
      const savedSpeed = lastSession?.speed || 1.0;
      const ayahMarkers = file.ayahMarkers || await loadAyahMarkers(file.name);
      set({
        audioFile: file,
        duration: dur,
        currentTime: 0,
        isPlaying: false,
        loopRegion: null,
        sound: newSound,
        loopCounter: 0,
        playbackRate: savedSpeed,
        ayahMarkers,
        currentAyahIndex: -1,
        loadError: null,
      });
      // Wire up native status updates (emits ~every 100ms during playback)
      newSound.setOnStatus((status) => {
        get()._onTimeUpdate(status);
      });
      if (savedSpeed !== 1.0) {
        try { await newSound.setRateAsync(savedSpeed, true); } catch {}
      }
    } catch (e) {
      const errMsg = e && (e.message || e.code) ? `${e.message || ''}${e.code ? ' (' + e.code + ')' : ''}` : String(e);
      set({ loadError: errMsg });
      console.error('LOAD_FILE FAILED:', errMsg, e);
    }
  },

  async play() {
    const { sound } = get();
    if (!sound) return;
    try {
      try { await setAudioPlaybackMode(); } catch (e) { console.warn('setAudioMode failed', e); }
      await sound.playAsync();
      await sound.setIsAsyncEnabledAsync(true);
      set({ isPlaying: true });
      get()._startProgress();
    } catch (e) { console.error(e); }
  },

  async pause() {
    const { sound } = get();
    if (!sound) return;
    try {
      await sound.pauseAsync();
      set({ isPlaying: false });
      get()._stopProgress();
      try { await setAudioInactive(); } catch (e) {}
    } catch (e) { console.error(e); }
  },

  async togglePlayPause() {
    const { isPlaying } = get();
    if (isPlaying) get().pause();
    else get().play();
  },

  async stop() {
    const { sound } = get();
    if (!sound) return;
    try {
      await sound.stopAsync();
      set({ isPlaying: false, currentTime: 0 });
      get()._stopProgress();
      try { await setAudioInactive(); } catch (e) {}
    } catch (e) { console.error(e); }
  },

  async seekTo(time) {
    const { sound } = get();
    if (!sound) return;
    try {
      await sound.setPositionAsync(time * 1000);
      set({ currentTime: time });
    } catch (e) { console.error(e); }
  },

  async setPlaybackRate(rate) {
    const { sound } = get();
    if (!sound) return;
    const clamped = Math.max(0.25, Math.min(4.0, rate));
    try {
      await sound.setRateAsync(clamped, true);
      set({ playbackRate: clamped });
    } catch (e) { console.error(e); }
  },

  setLoopRegion(region) {
    set({ loopRegion: region });
  },

  setLoopMax(max) {
    set({ loopMax: max });
  },

  resetLoopCounter() {
    set({ loopCounter: 0 });
  },

  toggleLoop() {
    const { loopRegion } = get();
    if (!loopRegion) {
      set({ loopRegion: { pointA: 0, pointB: get().duration, delay: 0, enabled: true } });
    } else {
      set({ loopRegion: { ...loopRegion, enabled: !loopRegion.enabled } });
    }
  },

  saveLoop(name, pointA, pointB, delay) {
    const { audioFile } = get();
    if (!audioFile) return null;
    const loop = {
      id: generateId('loop'),
      name, pointA, pointB, delay,
      createdAt: Date.now(),
    };
    const newLoops = [...(audioFile.savedLoops || []), loop];
    const updatedFile = { ...audioFile, savedLoops: newLoops };
    set({ audioFile: updatedFile });
    persistLoops(updatedFile);
    return loop;
  },

  loadLoop(loop) {
    const region = {
      pointA: loop.pointA, pointB: loop.pointB,
      delay: loop.delay, enabled: true,
    };
    set({ loopRegion: region, loopCounter: 0 });
    get().seekTo(loop.pointA);
  },

  deleteLoop(loopId) {
    const { audioFile } = get();
    if (!audioFile) return;
    const newLoops = audioFile.savedLoops.filter(l => l.id !== loopId);
    const updatedFile = { ...audioFile, savedLoops: newLoops };
    set({ audioFile: updatedFile });
    persistLoops(updatedFile);
  },

  async scanFiles() {
    try {
      const dir = DOCUMENTS_DIR;
      const contents = await FileSystemAdapter.readDirectoryAsync(dir);
      const audioExts = ['mp3', 'm4a', 'aac', 'wav', 'flac', 'ogg', 'aiff', 'wma'];
      const files = [];
      for (const item of contents) {
        if (item === 'loops' || item === '.expo-internal') continue;
        const ext = item.split('.').pop().toLowerCase();
        if (!audioExts.includes(ext)) continue;
        const uri = DOCUMENTS_DIR + item;
        const loops = await loadLoops(item);
        const ayahMarkers = await loadAyahMarkers(item);
        const name = item.replace(/\.[^.]+$/, '');
        files.push({ id: uri, name, uri, savedLoops: loops, ayahMarkers });
      }
      files.sort((a, b) => a.name.localeCompare(b.name));
      set({ library: files });
    } catch (e) {
      console.error('scanFiles error:', e);
      set({ library: [] });
    }
  },

  async importFile(sourceUri) {
    try {
      const filename = (sourceUri.split('/').pop() || 'imported').replace(/[?#].*$/, '');
      const destUri = DOCUMENTS_DIR + filename;
      await FileSystem.copyAsync({ from: sourceUri, to: destUri });
      await get().scanFiles();
    } catch (e) { console.error('IMPORT_FILE error:', e); }
  },

  async deleteFile(file) {
    try {
      await FileSystem.deleteAsync(file.uri, { idempotent: true });
      const loopsDir = DOCUMENTS_DIR + 'loops/';
      const loopsFile = loopsDir + file.name + '.json';
      const ayahFile = loopsDir + file.name + '-ayahs.json';
      try { await FileSystem.deleteAsync(loopsFile, { idempotent: true }); } catch {}
      try { await FileSystem.deleteAsync(ayahFile, { idempotent: true }); } catch {}
      await get().scanFiles();
    } catch (e) { console.error(e); }
  },

  saveSession() {
    const { audioFile, currentTime, playbackRate, sessionHistory, totalRepeats, totalPlayTime } = get();
    if (!audioFile) return;
    const session = {
      fileId: audioFile.id,
      fileName: audioFile.name,
      currentTime,
      speed: playbackRate,
      repeats: get().loopCounter,
      timestamp: Date.now(),
    };
    const updatedHistory = [session, ...sessionHistory.slice(0, 49)].slice(0, 50);
    const newTotalRepeats = totalRepeats + get().loopCounter;
    const newTotalPlayTime = totalPlayTime + currentTime;
    set({ lastSession: session, sessionHistory: updatedHistory, totalRepeats: newTotalRepeats, totalPlayTime: newTotalPlayTime });
    persistSession(session);
    persistSessionHistory(updatedHistory, newTotalRepeats, newTotalPlayTime);
  },

  restoreSession() {
    const session = loadSession();
    if (!session) return;
    const history = loadSessionHistory();
    if (history) {
      set({ sessionHistory: history.history || [], totalRepeats: history.totalRepeats || 0, totalPlayTime: history.totalPlayTime || 0 });
    }
    set({ lastSession: session });
    return session;
  },

  setAyahMarkers(markers) {
    set({ ayahMarkers: markers, currentAyahIndex: -1 });
    const { audioFile } = get();
    if (audioFile) {
      persistAyahMarkers(audioFile.name, markers);
    }
  },

  addAyahMarker(time, surahNumber, ayahNumber, label) {
    const { ayahMarkers, duration } = get();
    if (time < 0 || time > duration) return;
    const marker = {
      id: generateId('ayah'),
      time,
      surahNumber,
      ayahNumber,
      label: label || `Ayah ${ayahNumber}`,
    };
    const newMarkers = [...ayahMarkers, marker].sort((a, b) => a.time - b.time);
    set({ ayahMarkers: newMarkers });
    const { audioFile } = get();
    if (audioFile) {
      persistAyahMarkers(audioFile.name, newMarkers);
    }
  },

  deleteAyahMarker(markerId) {
    const { ayahMarkers } = get();
    const newMarkers = ayahMarkers.filter(m => m.id !== markerId);
    set({ ayahMarkers: newMarkers });
    const { audioFile } = get();
    if (audioFile) {
      persistAyahMarkers(audioFile.name, newMarkers);
    }
  },

  setCurrentAyahIndex(index) {
    set({ currentAyahIndex: index });
  },

  setSurahData(data) {
    set({ surahData: data });
  },

  setQuranSurahEnabled(enabled) {
    set({ quranSurahEnabled: enabled });
  },

  setColorScheme(scheme) {
    set({ colorScheme: scheme });
  },

  setCustomAccent(color) {
    set({ customAccent: color });
  },

  setSkipSeconds(seconds) {
    set({ skipSeconds: seconds });
  },

  autoSplitAyahMarkers(numAyahs) {
    const { duration } = get();
    if (duration <= 0 || numAyahs <= 0) return;
    const segmentDuration = duration / numAyahs;
    const markers = [];
    for (let i = 0; i < numAyahs; i++) {
      markers.push({
        id: `auto-${i}`,
        time: i * segmentDuration,
        surahNumber: 1,
        ayahNumber: i + 1,
        label: `Ayah ${i + 1}`,
      });
    }
    set({ ayahMarkers: markers, currentAyahIndex: -1 });
    const { audioFile } = get();
    if (audioFile) {
      persistAyahMarkers(audioFile.name, markers);
    }
  },

  _progressTimer: null,
  _lastPointA: -1,
  _onTimeUpdate(status) {
    const current = (status && status.currentTime) || 0;
    // Duration may arrive slightly later than load; update it when known.
    const statusDur = (status && status.duration) || 0;
    if (statusDur > 0 && Math.abs(get().duration - statusDur) > 0.01) {
      set({ duration: statusDur });
    }
    const { duration, isPlaying } = get();
    if (!isPlaying) return;
    // Check end of track
    if (current >= duration && duration > 0) {
      set({ isPlaying: false, currentTime: current });
      get()._stopProgress();
      return;
    }
    const loop = get().loopRegion;
    if (loop?.enabled && loop.pointB != null && current >= loop.pointB) {
      const newCount = get().loopCounter + 1;
      set({ loopCounter: newCount });
      persistLoopCounts();
      const milestones = [10, 25, 50, 100, 200, 500, 1000];
      if (milestones.includes(newCount)) {
        set({ milestone: newCount });
      }
      const loopMax = get().loopMax;
      if (loopMax > 0 && newCount >= loopMax) {
        const { sound } = get();
        if (sound) sound.stopAsync();
        set({ isPlaying: false, milestone: newCount });
        get()._stopProgress();
        return;
      }
      const { sound } = get();
      if (sound) {
        if (loop.delay > 0) {
          sound.stopAsync();
          setTimeout(async () => {
            await sound.setPositionAsync(loop.pointA * 1000);
            await sound.playAsync();
            get()._startProgress();
          }, loop.delay * 1000);
          set({ isPlaying: false });
          get()._stopProgress();
          return;
        } else {
          sound.setPositionAsync(loop.pointA * 1000);
        }
      }
    }
    set({ currentTime: current });
    // Update ayah index
    const markers = get().ayahMarkers;
    if (markers.length > 0) {
      let idx = -1;
      for (let i = markers.length - 1; i >= 0; i--) {
        if (current >= markers[i].time) { idx = i; break; }
      }
      if (idx !== get().currentAyahIndex) {
        set({ currentAyahIndex: idx });
      }
    }
  },
  _startProgress() {
    // No-op: time updates come from native events via _onTimeUpdate
    // Kept for compatibility with delay-based loop restarts
    const { _stopProgress } = get();
    _stopProgress();
  },
  _stopProgress() {
    const { _progressTimer } = get();
    if (_progressTimer) { clearInterval(_progressTimer); set({ _progressTimer: null }); }
  },
}));

// --- Persistence helpers ---
const LOOPS_DIR = DOCUMENTS_DIR + 'loops/';

async function ensureLoopsDir() {
  const dirInfo = await FileSystem.getInfoAsync(LOOPS_DIR);
  if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(LOOPS_DIR, { intermediates: true });
}

async function persistLoops(file) {
  await ensureLoopsDir();
  await FileSystem.writeAsStringAsync(LOOPS_DIR + file.name + '.json', JSON.stringify(file.savedLoops));
}

async function loadLoops(filename) {
  try {
    const path = LOOPS_DIR + filename + '.json';
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return [];
    const raw = await FileSystem.readAsStringAsync(path);
    return JSON.parse(raw);
  } catch { return []; }
}

async function persistSession(session) {
  await FileSystem.writeAsStringAsync(
    DOCUMENTS_DIR + '.loop-player-session.json',
    JSON.stringify(session)
  );
}

function loadSession() {
  try {
    const path = DOCUMENTS_DIR + '.loop-player-session.json';
    const raw = FileSystem.readAsStringAsync(path);
    if (raw && typeof raw === 'string') return JSON.parse(raw);
    return null;
  } catch { return null; }
}

async function persistLoopCounts() {
  const { audioFile, loopCounter } = get();
  if (!audioFile) return;
  const updatedLoops = (audioFile.savedLoops || []).map(l => ({
    ...l,
    repeatCount: (l.repeatCount || 0),
  }));
  const totalCounts = updatedLoops.reduce((sum, l) => sum + (l.repeatCount || 0), 0);
  await ensureLoopsDir();
  await FileSystem.writeAsStringAsync(
    LOOPS_DIR + '.loop-counts.json',
    JSON.stringify({ fileName: audioFile.name, totalRepeats: totalCounts })
  );
}

async function persistAyahMarkers(fileName, markers) {
  await ensureLoopsDir();
  await FileSystem.writeAsStringAsync(
    LOOPS_DIR + fileName + '-ayahs.json',
    JSON.stringify(markers)
  );
}

async function loadAyahMarkers(fileName) {
  try {
    const path = LOOPS_DIR + fileName + '-ayahs.json';
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return [];
    const raw = await FileSystem.readAsStringAsync(path);
    return JSON.parse(raw);
  } catch { return []; }
}

async function persistSessionHistory(history, totalRepeats, totalPlayTime) {
  await FileSystem.writeAsStringAsync(
    DOCUMENTS_DIR + '.loop-player-history.json',
    JSON.stringify({ history, totalRepeats, totalPlayTime })
  );
}

function loadSessionHistory() {
  try {
    const path = DOCUMENTS_DIR + '.loop-player-history.json';
    const raw = FileSystem.readAsStringAsync(path);
    if (raw && typeof raw === 'string') return JSON.parse(raw);
    return null;
  } catch { return null; }
}
