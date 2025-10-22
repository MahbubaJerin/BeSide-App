// frontend/jest.setup.js

// ✅ AsyncStorage: official mock
jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Common RN/Expo mocks so tests don’t crash
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');
jest.mock('expo-constants', () => ({
  ...jest.requireActual('expo-constants'),
  expoConfig: {},
}));
