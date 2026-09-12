let audioModule = null;
try { audioModule = require('expo-audio'); } catch (e) { audioModule = null; }

async function setAudioPlaybackMode() {
  if (audioModule && audioModule.setAudioModeAsync) {
    await audioModule.setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'doNotMix',
      allowsRecording: false,
      shouldPlayInBackground: true,
    });
  }
  // Keep the audio subsystem active so playback survives backgrounding.
  if (audioModule && audioModule.setIsAudioActiveAsync) {
    try { await audioModule.setIsAudioActiveAsync(true); } catch (e) {}
  }
}

async function setAudioInactive() {
  if (audioModule && audioModule.setIsAudioActiveAsync) {
    try { await audioModule.setIsAudioActiveAsync(false); } catch (e) {}
  }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

let Audio = null;
async function getAudio() {
  if (Audio) return Audio;
  if (audioModule) {
    Audio = {
      setAudioModeAsync: setAudioPlaybackMode,
      Sound: class Sound {
        constructor() {
          this._player = null;
          this._onStatus = null;
        }
        async loadAsync(source, initialStatus, downloadFirst) {
          const uri = source && (source.uri || source);
          if (!this._player) {
            this._player = audioModule.createAudioPlayer(uri, {
              updateInterval: 100,
              downloadFirst: !!downloadFirst,
              keepAudioSessionActive: true,
            });
            try {
              this._player.addListener('playbackStatusUpdate', (status) => {
                if (this._onStatus) this._onStatus(status);
              });
            } catch (e) {
              console.warn('expo-audio listener failed', e);
            }
          } else {
            this._player.replace(uri);
          }
          if (initialStatus && initialStatus.isLooping) {
            this._player.loop = true;
          }
          // Show lock-screen / control-center metadata so playback is controllable in background
          const trackTitle = (source && source.title) || null;
          try {
            this._player.setActiveForLockScreen(true, {
              title: trackTitle || undefined,
              artist: 'Loop Player',
            });
          } catch (e) {}
          // Duration is async to arrive; wait up to ~3s for it.
          let duration = 0;
          for (let i = 0; i < 30; i++) {
            duration = this._player.duration || 0;
            if (duration > 0) break;
            await sleep(100);
          }
          return { isLoaded: true, durationMillis: Math.round(duration * 1000) };
        }
        setOnStatus(cb) {
          this._onStatus = cb;
        }
        async playAsync() {
          if (!this._player) return { isPlaying: false };
          this._player.play();
          return { isPlaying: true };
        }
        async pauseAsync() {
          if (this._player) this._player.pause();
          return { isPlaying: false };
        }
        async stopAsync() {
          if (!this._player) return {};
          this._player.pause();
          await this._player.seekTo(0);
          return {};
        }
        async unloadAsync() {
          try {
            if (this._player) this._player.clearLockScreenControls();
          } catch (e) {}
          try { if (this._player) this._player.remove(); } catch (e) {}
          this._player = null;
          this._onStatus = null;
          return {};
        }
        async setPositionAsync(positionMillis) {
          if (this._player) {
            await this._player.seekTo(positionMillis / 1000);
          }
          return {};
        }
        async setRateAsync(rate) {
          if (this._player) this._player.setPlaybackRate(rate);
          return {};
        }
        async setIsAsyncEnabledAsync() { return {}; }
        async getStatusAsync() {
          if (!this._player) return { positionMillis: 0, durationMillis: 0, isPlaying: false, isLoaded: false };
          return {
            positionMillis: Math.round((this._player.currentTime || 0) * 1000),
            durationMillis: Math.round((this._player.duration || 0) * 1000),
            isPlaying: !this._player.paused,
            isLoaded: this._player.isLoaded,
          };
        }
        getNativePlayer() { return this._player; }
      },
    };
  }
  return Audio;
}

export { getAudio, audioModule, setAudioPlaybackMode, setAudioInactive };