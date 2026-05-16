// Mock expo-av for Expo Go — provides Audio.Sound stub
class Sound {
  constructor() { this._status = {}; }
  async loadAsync() {}
  async playAsync() {}
  async pauseAsync() {}
  async stopAsync() {}
  async unloadAsync() {}
  async setPositionAsync() {}
  async setRateAsync() {}
  async setIsAsyncEnabledAsync() {}
  async getStatusAsync() { return { positionMillis: 0, durationMillis: 0 }; }
  async getDurationAsync() { return Promise.resolve(0); }
}

const Audio = {
  Sound,
  AVPlaybackStatus: {},
  AVPlaybackStatusToSet: {},
  RECORDING_STATUS_ACTIVE: 0,
  RECORDING_STATUS_STOPPED: 1,
};

module.exports = { Audio, Video: function(){} };
module.exports.default = Audio;
