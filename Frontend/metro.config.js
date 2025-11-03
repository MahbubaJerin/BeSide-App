const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configuration for older Android devices compatibility
config.transformer = {
  ...config.transformer,
  // Target ES5 for older devices
  minifierConfig: {
    ecma: 5,
    compress: {
      drop_console: false, // Keep console logs for debugging
    },
    mangle: {
      keep_fnames: true,
    },
  },
};

// Enhanced resolver for better compatibility
config.resolver = {
  ...config.resolver,
  platforms: ['native', 'android', 'ios', 'web'],
  alias: {
    // Add any aliases if needed
  },
};

// Optimize for older devices
config.serializer = {
  ...config.serializer,
  getModulesRunBeforeMainModule: () => [
    require.resolve('react-native/Libraries/Core/InitializeCore'),
  ],
};

module.exports = config;