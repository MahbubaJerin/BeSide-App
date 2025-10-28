// components/__tests__/verify.test.js
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// --- Router ---
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}));

// --- Theme ---
jest.mock('@/hooks/useThemeColor', () => ({
  useThemeColor: () => '#000',
}));

// --- Themed components ---
jest.mock('@/components/ThemedText', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    ThemedText: ({ children, onPress, ...rest }) =>
      React.createElement(Text, { onPress, ...rest }, children),
  };
});

jest.mock('@/components/ThemedButton', () => {
  const React = require('react');
  const { Text, TouchableOpacity } = require('react-native');
  return {
    ThemedButton: ({ title, onPress, disabled, testID, ...rest }) => {
      const id =
        testID || 'btn-' + String(title || '').toLowerCase().replace(/\s+/g, '-');
      return React.createElement(
        TouchableOpacity,
        { onPress: disabled ? undefined : onPress, testID: id, ...rest },
        React.createElement(Text, null, title)
      );
    },
  };
});

// --- Native picker stub ---
jest.mock('@react-native-picker/picker', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Picker = ({ children }) => React.createElement(View, null, children);
  Picker.Item = () => null;
  return { Picker };
});

// --- AsyncStorage mock ---
jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// --- Network + Alert ---
global.fetch = jest.fn();
import { Alert } from 'react-native';
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// --- SUT ---
import VerifyScreen from '../../app/verify';

beforeEach(() => {
  fetch.mockReset();
  jest.clearAllMocks();

  const AsyncStorage = require('@react-native-async-storage/async-storage');
  AsyncStorage.getItem.mockReset?.();
  AsyncStorage.setItem.mockReset?.();

  // Default: pretend a logged-in user exists so handleVerify won't early-return
  AsyncStorage.getItem.mockResolvedValue(JSON.stringify({ userName: 'jane' }));
});

describe('VerifyScreen', () => {
  it('alerts and redirects to /login when no user is stored', async () => {
    const { router } = require('expo-router');
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    AsyncStorage.getItem.mockResolvedValueOnce(null); // no "user" in storage

    render(<VerifyScreen />);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'No user is logged in.');
      expect(router.replace).toHaveBeenCalledWith('/login');
    });
  });

  it('shows "Missing field" for the first empty required field', async () => {
    const { getByTestId } = render(<VerifyScreen />);

    // Wait for useEffect to finish reading user from storage
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await waitFor(() =>
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('user')
    );

    // Press verify immediately — validation should flag "First Name"
    fireEvent.press(getByTestId('verify-button'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Missing field',
        expect.stringContaining('First Name')
      );
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  it('shows "Invalid date" when expiry or dob is not DD-MM-YYYY', async () => {
    const { getByPlaceholderText, getByTestId } = render(<VerifyScreen />);

    // Wait for user to load
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await waitFor(() =>
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('user')
    );

    fireEvent.changeText(getByPlaceholderText('First Name'), 'Jane');
    fireEvent.changeText(getByPlaceholderText('Last Name'), 'Doe');
    fireEvent.changeText(getByPlaceholderText('ID Number'), 'A12345');
    // invalid formats:
    fireEvent.changeText(
      getByPlaceholderText('Expiry Date (DD-MM-YYYY)'),
      '2025/01/01'
    );
    fireEvent.changeText(
      getByPlaceholderText('Date of Birth (DD-MM-YYYY)'),
      '01/01/1990'
    );

    fireEvent.press(getByTestId('verify-button'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Invalid date',
        'Use DD-MM-YYYY for Expiry and DOB.'
      );
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  it('posts payload, stores updated user, alerts success, and navigates to /home', async () => {
    const { router } = require('expo-router');
    const AsyncStorage = require('@react-native-async-storage/async-storage');

    // Success response
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { user: { id: 1, userName: 'jane' } } }),
    });

    const { getByPlaceholderText, getByTestId } = render(<VerifyScreen />);

    // Wait for user to load
    await waitFor(() =>
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('user')
    );

    fireEvent.changeText(getByPlaceholderText('First Name'), 'Jane');
    fireEvent.changeText(getByPlaceholderText('Last Name'), 'Doe');
    fireEvent.changeText(getByPlaceholderText('ID Number'), 'A12345');
    fireEvent.changeText(
      getByPlaceholderText('Expiry Date (DD-MM-YYYY)'),
      '01-01-2027'
    );
    fireEvent.changeText(
      getByPlaceholderText('Date of Birth (DD-MM-YYYY)'),
      '02-02-1990'
    );

    fireEvent.press(getByTestId('verify-button'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
      const [calledUrl, init] = fetch.mock.calls[0];
      expect(calledUrl).toMatch(/\/api\/v1\/auth\/verify$/);
      expect(init.method).toBe('POST');

      const body = JSON.parse(init.body);
      expect(body).toEqual({
        userName: 'jane',
        verificationIdType: 'wwcc', // default
        firstName: 'Jane',
        lastName: 'Doe',
        number: 'A12345',
        expiry: '01-01-2027',
        dob: '02-02-1990',
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'user',
        expect.stringContaining('"isVerified":true')
      );
      expect(Alert.alert).toHaveBeenCalledWith('Success', 'Verification completed!');
      expect(router.replace).toHaveBeenCalledWith('/home');
    });
  });

  it('alerts backend error message on non-OK response', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');

    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Verification failed' }),
    });

    const { getByPlaceholderText, getByTestId } = render(<VerifyScreen />);

    //  Wait for user to load
    await waitFor(() =>
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('user')
    );

    fireEvent.changeText(getByPlaceholderText('First Name'), 'Jane');
    fireEvent.changeText(getByPlaceholderText('Last Name'), 'Doe');
    fireEvent.changeText(getByPlaceholderText('ID Number'), 'A12345');
    fireEvent.changeText(
      getByPlaceholderText('Expiry Date (DD-MM-YYYY)'),
      '01-01-2027'
    );
    fireEvent.changeText(
      getByPlaceholderText('Date of Birth (DD-MM-YYYY)'),
      '02-02-1990'
    );

    fireEvent.press(getByTestId('verify-button'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Verification failed');
    });
  });
});
