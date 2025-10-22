import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// expo-router mock
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}));

// theme hook mock
jest.mock('@/hooks/useThemeColor', () => ({
  useThemeColor: () => '#000',
}));

// Themed components
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
    ThemedButton: ({ title, onPress, disabled, ...rest }) =>
      React.createElement(
        TouchableOpacity,
        { onPress: disabled ? undefined : onPress, testID: `btn-${title}`, ...rest },
        React.createElement(Text, null, title)
      ),
  };
});

// native deps → stub
jest.mock('react-native-country-picker-modal', () => 'CountryPicker');
jest.mock('react-native-picker-select', () => 'RNPickerSelect');
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
// 🔧 FIXED: correct relative path to app/
jest.mock('../../app/PlacesAutocomplete', () => 'PlacesAutocomplete');

// config
jest.mock('@/config', () => ({ BASE_URL: 'http://localhost/' }));

// Alert spy
import { Alert } from 'react-native';
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// SUT (🔧 FIXED PATH)
import RegisterScreen from '../../app/register';

describe('RegisterScreen', () => {
  it('shows "Missing Info" alert when pressing Next with empty required fields (Step 0)', () => {
    const { getByText } = render(<RegisterScreen />);
    fireEvent.press(getByText('Next'));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Missing Info',
      expect.stringMatching(/Please complete all/i)
    );
  });

  it('navigates to Login when "Login" link is pressed', () => {
    const { router } = require('expo-router');
    const { getByText } = render(<RegisterScreen />);
    fireEvent.press(getByText('Login'));
    expect(router.push).toHaveBeenCalledWith('/login');
  });

  it('renders Step 01/04 indicator', () => {
    const { getByText } = render(<RegisterScreen />);
    expect(getByText(/Step 01\/04/i)).toBeTruthy();
  });
});
