/**
 * Jest config for the security test suite (`npm test`).
 * Babel options are inline so the app's Metro build is unaffected.
 */
module.exports = {
  preset: 'jest-expo/android',
  testTimeout: 30000,
  testMatch: ['<rootDir>/__tests__/**/*.test.ts?(x)'],
  setupFiles: ['<rootDir>/__tests__/setup-env.js'],
  transform: {
    '\\.[jt]sx?$': [
      'babel-jest',
      { configFile: false, babelrc: false, presets: ['babel-preset-expo'], caller: { name: 'metro', bundler: 'metro', platform: 'android' } },
    ],
  },
  modulePaths: ['<rootDir>/node_modules/expo/node_modules'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@supabase/.*|react-native-reanimated|react-native-worklets|aes-js)',
  ],
};
