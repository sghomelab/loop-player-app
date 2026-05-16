import { create } from 'zustand';

// Lazy-load expo-file-system — not available in Expo Go
let FileSystem = null;
async function getFileSystem() {
  if (!FileSystem) {
    try {
      const fs = await import('expo-file-system');
      FileSystem = fs.default || fs;
    } catch (e) {
      // expo-file-system native modules not available (Expo Go)
      FileSystem = {
        documentDirectory: 'file:///expo-go-mock/',
        async readDirectoryAsync() { return []; },
        async copyAsync() {},
        async deleteAsync() {},
        async getInfoAsync() { return { exists: false }; },
        async makeDirectoryAsync() {},
        async writeAsStringAsync() {},
        async readAsStringAsync() { return '[]'; },
      };
    }
  }
  return FileSystem;
}

// Lazy-load expo-av — not available in Expo Go
let Audio = null;
async function getAudio() {
  if (!Audio) {
    try {
      const av = await import('expo-av');
      Audio = av.Audio;
    } catch (e) {
      Audio = {
        Sound: class Sound {
          async loadAsync() {}
          async playAsync() {}
          async pauseAsync() {}
          async stopAsync() {}
          async unloadAsync() {}
          async setPositionAsync() {}
          async setRateAsync() {}
          async setIsAsyncEnabledAsync() {}
          async getStatusAsync() {
            return { positionMillis: 0, durationMillis: 0, isPlaying: false };
          }
        },
      };
    }
  }
  return Audio;
}

export const usePlayerStore = create((set, get) => ({
  // State
  selectedFile: null,
  audioFile: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  playbackRate: 1.0,
  loopRegion: null,
  sound: null,

  // --- Audio control ---
  async loadFile(file) {
    const AudioModule = await getAudio();
    const { sound } = get();
    if (sound) { await sound.stopAsync(); await sound.unloadAsync(); }
    try {
      const newSound = new AudioModule.Sound();
      await newSound.loadAsync({ uri: file.uri }, {}, true);
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
      await sound.setRateAsync(clamped, true);
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
  },

  // --- File management ---
  async scanFiles() {
    const fs = await getFileSystem();
    try {
      const dir = fs.documentDirectory;
      const contents = await fs.readDirectoryAsync(dir);
      const audioExts = ['mp3', 'm4a', 'aac', 'wav', 'flac', 'ogg', 'aiff', 'wma'];
      const files = [];
      for (const item of contents) {
        if (item === 'loops' || item === '.expo-internal') continue;
        const ext = item.split('.').pop().toLowerCase();
        if (!audioExts.includes(ext)) continue;
        const uri = fs.documentDirectory + item;
        const loops = await loadLoops(item, fs);
        const name = item.replace(/\.[^.]+$/, '');
        files.push({ id: uri, name, uri, savedLoops: loops });
      }
      files.sort((a, b) => a.name.localeCompare(b.name));
      set({ library: files });
    } catch (e) {
      console.error('scanFiles error:', e);
      set({ library: [] });
    }
  },

  async importFile(sourceUri) {
    const fs = await getFileSystem();
    try {
      const filename = sourceUri.split('/').pop() || 'imported';
      const destUri = fs.documentDirectory + filename;
      await fs.copyAsync({ from: sourceUri, to: destUri });
      await get().scanFiles();
    } catch (e) { console.error(e); }
  },

  async deleteFile(file) {
    const fs = await getFileSystem();
    try {
      await fs.deleteAsync(file.uri, { idempotent: true });
      const loopsDir = fs.documentDirectory + 'loops/';
      const loopsFile = loopsDir + file.name + '.json';
      try { await fs.deleteAsync(loopsFile, { idempotent: true }); } catch {}
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
async function ensureLoopsDir(fs) {
  const dirInfo = await fs.getInfoAsync(fs.documentDirectory + 'loops/');
  if (!dirInfo.exists) await fs.makeDirectoryAsync(fs.documentDirectory + 'loops/', { intermediates: true });
}

async function persistLoops(file, fs) {
  await ensureLoopsDir(fs);
  const path = fs.documentDirectory + 'loops/' + file.name + '.json';
  await fs.writeAsStringAsync(path, JSON.stringify(file.savedLoops));
}

async function loadLoops(filename, fs) {
  try {
    const path = fs.documentDirectory + 'loops/' + filename + '.json';
    const info = await fs.getInfoAsync(path);
    if (!info.exists) return [];
    const raw = await fs.readAsStringAsync(path);
    return JSON.parse(raw);
  } catch { return []; }
}
