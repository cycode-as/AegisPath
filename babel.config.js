module.exports = function (api) {
  const isTest = api.env('test');
  api.cache(!isTest);
  return {
    presets: [
      [
        require.resolve('expo/internal/babel-preset'),
        isTest
          ? {
              // Disable the reanimated plugin in test environment since
              // react-native-worklets (required by reanimated v4 plugin) is
              // not installed. The module itself is mocked via moduleNameMapper.
              reanimated: false,
            }
          : {},
      ],
    ],
  };
};
