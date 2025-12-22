
// jest.config.js
module.exports = {
  preset: 'react-native',

  // Mocks that must exist before modules are loaded
  setupFiles: ['<rootDir>/jest.setup.js'],

  // Matchers/extensions that rely on global `expect`
  setupFilesAfterEnv: ['<rootDir>/jest.setupEnv.js'],

  transformIgnorePatterns: [
    'node_modules/(?!react-native|@react-native|react-native-gesture-handler|react-native-reanimated|@react-navigation|@react-native-firebase)'
  ],
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],
};
``
