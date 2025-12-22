module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/jest.setup.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setupEnv.js'],

  transformIgnorePatterns: [
    'node_modules/(?!react-native|@react-native|react-native-gesture-handler|react-native-reanimated|@react-navigation|@react-native-firebase)'
  ],
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],
};


