// Mock expo-document-picker for Expo Go
module.exports = {
  getDocumentAsync() { return Promise.resolve({ canceled: true }); },
  pickAsync() { return Promise.resolve({ canceled: true }); },
};
module.exports.default = module.exports;
