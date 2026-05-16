const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Replace native modules with mocks for Expo Go compatibility
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const mocks = {
    'expo-av': './mocks/expo-av.js',
    'expo-file-system': './mocks/expo-file-system.js',
    'expo-document-picker': './mocks/expo-document-picker.js',
  };

  if (mocks[moduleName]) {
    return context.resolveRequest(
      context.moduleRoot,
      mocks[moduleName],
      platform
    );
  }

  return context.resolveRequest(moduleName, platform);
};

module.exports = config;
