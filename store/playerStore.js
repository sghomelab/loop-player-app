import { create } from 'zustand';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';

const DOCUMENTS_DIR = FileSystem.documentDirectory;

export const usePlayerStore = create((set, get) => ({
  // State
  selectedFile: null,       // queued file to load when player opens
  audioFile: null,          // { id, name, uri, duration, savedLoops }
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  playbackRate: 1.0,
  loopRegion: null,         // { pointA, pointB, delay, enabled }
  sound: null,

  // --- Audio control ---
  async loadFile(file) {
    const { sound } = get();
    if (sound) { await sound.stopAsync(); await sound.unloadAsync(); }
    try {
      const newSound = new Audio.Sound();
      await newSound.loadAsync({ uri: file.uri }, {}, true); // true = enableRate
      const status = await newSound.getStatusAsync();
      const dur = status.durationMillis ? status.durationMillis / 1000 : 0;
      set({
        audioFile: file,
        duration: dur,
        currentTime: 0,
        isPlaying: false,
        loopRegion: null,
        sound: newSound,
      });
    } catch (e) {
      console.error('Failed to load audio:', e);
    }
  },

  async play() {
    const { sound } = get();
    if (!sound) return;
    try {
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
      await sound.setRateAsync(clamped, true); // true = preserve pitch
      set({ playbackRate: clamped });
    } catch (e) { console.error(e); }
  },

  setLoopRegion(region) {
    set({ loopRegion: region });
  },

  toggleLoop() {
    const { loopRegion } = get();
    if (!loopRegion) {
      set({ loopRegion: { pointA: 0, pointB: get().duration, delay: 0, enabled: true } });
    } else {
      set({ loopRegion: { ...loopRegion, enabled: !loopRegion.enabled } });
    }
  },

  // --- Saved loops ---
  saveLoop(name, pointA, pointB, delay) {
    const { audioFile } = get();
    if (!audioFile) return null;
    const loop = {
      id: crypto.randomUUID?.() || Date.now().toString(),
      name,
      pointA,
      pointB,
      delay,
      createdAt: Date.now(),
    };
    const newLoops = [...audioFile.savedLoops, loop];
    const updatedFile = { ...audioFile, savedLoops: newLoops };
    set({ audioFile: updatedFile });
    persistLoops(updatedFile);
    return loop;
  },

  loadLoop(loop) {
    const region = {
      pointA: loop.pointA,
      pointB: loop.pointB,
      delay: loop.delay,
      enabled: true,
    };
    set({ loopRegion: region });
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

  // --- File management ---
  async scanFiles() {
    try {
      const dir = DOCUMENTS_DIR;
      const contents = await FileSystem.readDirectoryAsync(dir);
      const audioExts = ['mp3', 'm4a', 'aac', 'wav', 'flac', 'ogg', 'aiff', 'wma'];
      const files = [];
      for (const item of contents) {
        if (item === 'loops' || item === '.expo-internal') continue;
        const ext = item.split('.').pop().toLowerCase();
        if (!audioExts.includes(ext)) continue;
        const uri = FileSystem.documentDirectory + item;
        const loops = await loadLoops(item);
        const name = item.replace(/\.[^.]+$/, '');
        files.push({ id: uri, name, uri, savedLoops: loops });
      }
      files.sort((a, b) => a.name.localeCompare(b.name));
      set({ library: files });
    } catch (e) { console.error(e); }
  },

  async importFile(sourceUri) {
    try {
      const filename = sourceUri.split('/').pop() || 'imported';
      const destUri = DOCUMENTS_DIR + filename;
      await FileSystem.copyAsync({ from: sourceUri, to: destUri });
      await get().scanFiles();
    } catch (e) { console.error(e); }
  },

  async deleteFile(file) {
    try {
      await FileSystem.deleteAsync(file.uri, { idempotent: true });
      // Also delete persisted loops
      const loopsDir = DOCUMENTS_DIR + 'loops/';
      const loopsFile = loopsDir + file.name + '.json';
      try { await FileSystem.deleteAsync(loopsFile, { idempotent: true }); } catch {}
      await get().scanFiles();
    } catch (e) { console.error(e); }
  },

  // --- Internal ---
  _progressTimer: null,
  _startProgress() {
    const { _stopProgress } = get();
    _stopProgress();
    const tick = async () => {
      const { sound } = get();
      if (!sound) return;
      try {
        const status = await sound.getStatusAsync();
        const current = (status.positionMillis || 0) / 1000;
        const dur = status.durationMillis ? status.durationMillis / 1000 : 0;

        // Loop boundary check
        const loop = get().loopRegion;
        if (loop?.enabled && current >= loop.pointB) {
          if (loop.delay > 0) {
            await sound.stopAsync();
            setTimeout(async () => {
              await sound.setPositionAsync(loop.pointA * 1000);
              await sound.playAsync();
              get()._startProgress();
            }, loop.delay * 1000);
            set({ isPlaying: false });
            get()._stopProgress();
            return;
          } else {
            await sound.setPositionAsync(loop.pointA * 1000);
          }
        }

        // Auto-stop at end
        if (!loop?.enabled && current >= dur && dur > 0) {
          set({ isPlaying: false, currentTime: current });
          get()._stopProgress();
          return;
        }

        set({ currentTime: current });
      } catch (e) { /* ignore */ }
    };
    const timer = setInterval(tick, 250);
    set({ _progressTimer: timer });
  },
  _stopProgress() {
    const { _progressTimer } = get();
    if (_progressTimer) { clearInterval(_progressTimer); set({ _progressTimer: null }); }
  },
}));

// --- Persistence helpers ---
const LOOPS_DIR = FileSystem.documentDirectory + 'loops/';

async function ensureLoopsDir() {
  const dirInfo = await FileSystem.getInfoAsync(LOOPS_DIR);
  if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(LOOPS_DIR, { intermediates: true });
}

async function persistLoops(file) {
  await ensureLoopsDir();
  const path = LOOPS_DIR + file.name + '.json';
  await FileSystem.writeAsStringAsync(path, JSON.stringify(file.savedLoops));
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
