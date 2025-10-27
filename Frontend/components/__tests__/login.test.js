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

// ThemedButton → adds predictable testID based on title ("Login" → "btn-login")
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

// AsyncStorage (also mocked globally in jest.setup.js, but keep here too)
jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// global fetch + Alert
global.fetch = jest.fn();
import { Alert } from 'react-native';
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// SUT
import LoginScreen from '../../app/login';

beforeEach(() => {
  fetch.mockReset();
  jest.clearAllMocks();
});

describe('LoginScreen', () => {
  it('shows inline validation errors and does not call API when empty', async () => {
    const { getByTestId, getByText } = render(<LoginScreen />);
    fireEvent.press(getByTestId('btn-login'));

    // Inline errors from validate()
    await waitFor(() => {
      expect(getByText('Username or email is required.')).toBeTruthy();
      expect(getByText('Password is required.')).toBeTruthy();
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  it('submits with email (sends { email, password }) and navigates to /home on success', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({ token: 't', user: { id: 1, name: 'E' } }),
    });

    const { getByPlaceholderText, getByTestId } = render(<LoginScreen />);
    fireEvent.changeText(
      getByPlaceholderText('Username or Email'),
      'test@example.com'
    );
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    fireEvent.press(getByTestId('btn-login'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
      const [calledUrl, init] = fetch.mock.calls[0];
      expect(calledUrl).toContain('/api/v1/auth/login');
      expect(init.method).toBe('POST');
      const body = JSON.parse(init.body);
      expect(body).toEqual({ email: 'test@example.com', password: 'password123' });
      const { router } = require('expo-router');
      expect(router.replace).toHaveBeenCalledWith('/home');
      expect(Alert.alert).not.toHaveBeenCalled();
    });
  });

  it('submits with username (sends { userName, password }) and navigates to /home on success', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({ token: 't', user: { id: 2, name: 'U' } }),
    });

    const { getByPlaceholderText, getByTestId } = render(<LoginScreen />);
    fireEvent.changeText(
      getByPlaceholderText('Username or Email'),
      'john_doe'
    );
    fireEvent.changeText(getByPlaceholderText('Password'), 'secret');
    fireEvent.press(getByTestId('btn-login'));

    await waitFor(() => {
      const [, init] = fetch.mock.calls[0];
      const body = JSON.parse(init.body);
      expect(body).toEqual({ userName: 'john_doe', password: 'secret' });
      const { router } = require('expo-router');
      expect(router.replace).toHaveBeenCalledWith('/home');
      expect(Alert.alert).not.toHaveBeenCalled();
    });
  });

  it('shows API error Alert on non-OK response', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      text: async () => JSON.stringify({ message: 'Invalid credentials' }),
      status: 401,
    });

    const { getByPlaceholderText, getByTestId } = render(<LoginScreen />);
    fireEvent.changeText(
      getByPlaceholderText('Username or Email'),
      'wrong@example.com'
    );
    fireEvent.changeText(getByPlaceholderText('Password'), 'badpass');
    fireEvent.press(getByTestId('btn-login'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith(
        'Login error',
        expect.stringMatching(/incorrect username|invalid credentials|please check/i)
      );
    });
  });

  it('navigates to Forgot Password and Register from links', () => {
    const { getByText } = render(<LoginScreen />);
    const { router } = require('expo-router');

    // "Forgot Password?" link
    fireEvent.press(getByText('Forgot Password?'));
    expect(router.push).toHaveBeenCalledWith('/forgotPassword');

    // "Register" link
    fireEvent.press(getByText('Register'));
    expect(router.push).toHaveBeenCalledWith('/register');
  });
});
