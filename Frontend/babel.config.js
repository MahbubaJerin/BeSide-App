module.exports = function(api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', {
        jsxImportSource: 'react'
      }]
    ],
    plugins: [
      ['@babel/plugin-transform-flow-strip-types'],
      ['@babel/plugin-proposal-decorators', { legacy: true }],
      ['@babel/plugin-proposal-class-properties', { loose: true }],
      // Add compatibility transforms for older Android devices
      ['@babel/plugin-transform-runtime', {
        helpers: true,
        regenerator: true,
        version: '^7.20.0'
      }],
      // Add support for older JavaScript features
      ['@babel/plugin-transform-async-to-generator'],
      ['@babel/plugin-transform-arrow-functions'],
      ['@babel/plugin-transform-block-scoping'],
      // Expo Router plugin
      require.resolve('expo-router/babel'),
    ]
  };
};