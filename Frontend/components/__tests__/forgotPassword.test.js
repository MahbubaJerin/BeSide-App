import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// expo-router mock
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}));

// theme
jest.mock('@/hooks/useThemeColor', () => ({
  useThemeColor: () => '#000',
}));

// ThemedText
jest.mock('@/components/ThemedText', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    ThemedText: ({ children, onPress, ...rest }) =>
      React.createElement(Text, { onPress, ...rest }, children),
  };
});

// ThemedButton → adds predictable testID ("Send OTP" → "btn-send-otp")
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

// BASE_URL
jest.mock('@/config', () => ({ BASE_URL: 'http://localhost/' }));

// AsyncStorage (not used directly here, but safe to mock)
jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// global fetch + Alert
global.fetch = jest.fn();
import { Alert } from 'react-native';
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// SUT
import ForgotPasswordScreen from '../../app/forgotPassword';

beforeEach(() => {
  fetch.mockReset();
  jest.clearAllMocks();
});

describe('ForgotPasswordScreen', () => {
  it('shows inline validation error when email is empty', async () => {
    const { getByTestId, getByText } = render(<ForgotPasswordScreen />);
    // "Send OTP" → testID "btn-send-otp"
    fireEvent.press(getByTestId('btn-send-otp'));

    await waitFor(() => {
      expect(getByText('Email is required.')).toBeTruthy();
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('shows inline validation error for invalid email', async () => {
    const { getByPlaceholderText, getByTestId, getByText } = render(<ForgotPasswordScreen />);
    fireEvent.changeText(
      getByPlaceholderText('Enter your registered email'),
      'bad-email'
    );
    fireEvent.press(getByTestId('btn-send-otp'));

    await waitFor(() => {
      expect(
        getByText('Please enter a valid email (e.g., name@example.com).')
      ).toBeTruthy();
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('POSTs email, alerts success, and navigates to /verifyOTP with params on OK', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ ok: true }),
    });

    const { getByPlaceholderText, getByTestId } = render(<ForgotPasswordScreen />);
    fireEvent.changeText(
      getByPlaceholderText('Enter your registered email'),
      'test@example.com'
    );
    fireEvent.press(getByTestId('btn-send-otp'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
      const [calledUrl, init] = fetch.mock.calls[0];
      expect(calledUrl).toContain('/api/v1/auth/send-otp');
      expect(init.method).toBe('POST');
      const body = JSON.parse(init.body);
      expect(body).toEqual({ email: 'test@example.com' });

      expect(Alert.alert).toHaveBeenCalledWith(
        'OTP Sent',
        'A verification code has been sent to your email.'
      );
      const { router } = require('expo-router');
      expect(router.push).toHaveBeenCalledWith({
        pathname: '/verifyOTP',
        params: { email: 'test@example.com', context: 'reset' },
      });
    });
  });

  it('alerts error message from server on non-OK response', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      text: async () => JSON.stringify({ message: 'Email not found' }),
    });

    const { getByPlaceholderText, getByTestId } = render(<ForgotPasswordScreen />);
    fireEvent.changeText(
      getByPlaceholderText('Enter your registered email'),
      'missing@example.com'
    );
    fireEvent.press(getByTestId('btn-send-otp'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Email not found');
    });
  });

  it('Back to Login link navigates to /login', () => {
    const { getByText } = render(<ForgotPasswordScreen />);
    const { router } = require('expo-router');
    fireEvent.press(getByText('Back to Login'));
    expect(router.replace).toHaveBeenCalledWith('/login');
  });
});
