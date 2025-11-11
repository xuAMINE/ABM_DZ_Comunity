// babel.config.js (root)

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'], // includes expo-router
    plugins: [
      ['module-resolver', {
        root: ['./'],
        alias: { '@': './' },
      }],
      'react-native-reanimated/plugin', // 👈 MUST be last
    ],
  };
};





/*module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'], // <-- this includes expo-router now
    plugins: [
      ['module-resolver', {
        root: ['./'],
        alias: { '@': './' },
      }],
    ],
  };
};*/

