import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// expo-router mock
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({ email: 'user@example.com', context: 'signup', next: '/login' }),
}));

// theme
jest.mock('@/hooks/useThemeColor', () => ({
  useThemeColor: () => '#000',
}));

// ThemedText mock
jest.mock('@/components/ThemedText', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    ThemedText: ({ children, onPress, ...rest }) =>
      React.createElement(Text, { onPress, ...rest }, children),
  };
});

// ThemedButton mock — adds a predictable testID like "btn-verify-otp"
jest.mock('@/components/ThemedButton', () => {
  const React = require('react');
  const { Text, TouchableOpacity } = require('react-native');
  return {
    ThemedButton: ({ title, onPress, disabled, ...rest }) => {
      const testID =
        'btn-' + String(title || '').toLowerCase().replace(/\s+/g, '-');
      return React.createElement(
        TouchableOpacity,
        { onPress: disabled ? undefined : onPress, testID, ...rest },
        React.createElement(Text, null, title)
      );
    },
  };
});

// Base URL
jest.mock('@/config', () => ({ BASE_URL: 'http://localhost/' }));

// AsyncStorage mock (belt & suspenders; also keep in jest.setup.js)
jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// global fetch + Alert
global.fetch = jest.fn();
import { Alert } from 'react-native';
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// SUT
import VerifyOTPScreen from '../../app/verifyOTP';

beforeEach(() => {
  fetch.mockReset();
  jest.clearAllMocks();
});

describe('VerifyOTPScreen', () => {
  it('shows validation error when OTP is empty (no Alert)', async () => {
    const { getByTestId, getByText } = render(<VerifyOTPScreen />);
    fireEvent.press(getByTestId('btn-verify-otp'));
    // validate() sets otpErr and returns false — no Alert
    await waitFor(() => {
      expect(getByText('OTP is required.')).toBeTruthy();
    });
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('shows validation error for non-numeric OTP (no Alert)', async () => {
    const { getByPlaceholderText, getByTestId, getByText } = render(<VerifyOTPScreen />);
    fireEvent.changeText(getByPlaceholderText('Enter OTP'), '12ab');
    fireEvent.press(getByTestId('btn-verify-otp'));
    await waitFor(() => {
      expect(getByText('Please enter a valid numeric OTP.')).toBeTruthy();
    });
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('calls API and alerts success on valid OTP (signup)', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ token: 'abc123' }),
    });

    const { getByPlaceholderText, getByTestId } = render(<VerifyOTPScreen />);
    fireEvent.changeText(getByPlaceholderText('Enter OTP'), '123456');
    fireEvent.press(getByTestId('btn-verify-otp'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost/api/v1/auth/verify-otp',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'user@example.com', otp: '123456' }),
        })
      );
      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'Email verified successfully!',
        expect.any(Array)
      );
    });
  });

  it('alerts API error on invalid OTP', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      text: async () => JSON.stringify({ message: 'Invalid OTP' }),
    });

    const { getByPlaceholderText, getByTestId } = render(<VerifyOTPScreen />);
    fireEvent.changeText(getByPlaceholderText('Enter OTP'), '000000');
    fireEvent.press(getByTestId('btn-verify-otp'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Invalid OTP', 'Invalid OTP');
    });
  });
});
