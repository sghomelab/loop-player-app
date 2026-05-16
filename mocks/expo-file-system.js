// Mock expo-file-system for Expo Go
module.exports = {
  Paths: class Paths {
    static get cache() { return { name: '' }; }
    static get bundle() { return { name: '' }; }
    static get document() { return { name: '' }; }
  },
  documentDirectory: 'file:///mock/',
  cacheDirectory: 'file:///mock/',
  bundleDirectory: 'file:///mock/',
  async readDirectoryAsync() { return []; },
  async copyAsync() {},
  async deleteAsync() {},
  async getInfoAsync() { return { exists: false }; },
  async makeDirectoryAsync() {},
  async writeAsStringAsync() {},
  async readAsStringAsync() { return '[]'; },
  async downloadAsync() { return { md5: '', uri: '' }; },
  async uploadAsync() {},
};
module.exports.default = module.exports;
