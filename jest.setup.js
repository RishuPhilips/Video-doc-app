
// jest.setup.js
// DO NOT import '@testing-library/jest-native/extend-expect' here

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
    useRoute: () => ({ params: {} }),
  };
});

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

try {
  jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
} catch {}

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('@react-native-firebase/auth', () => {
  return () => ({
    onAuthStateChanged: jest.fn(),
    signInWithCredential: jest.fn(),
    currentUser: null,
  });
});

global.fetch = jest.fn();
import { Linking } from 'react-native';
jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
