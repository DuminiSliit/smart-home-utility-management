module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '\\.(png|jpg|jpeg|gif|webp)$': '<rootDir>/__mocks__/assetMock.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native(-community|-vector-icons)?|@react-navigation|react-native-vector-icons)/',
  ],
};
