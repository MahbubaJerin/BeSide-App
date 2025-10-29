// Frontend/components/__tests__/CompanionPreferencesModal.test.js
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// Theme
jest.mock('@/hooks/useThemeColor', () => ({
  useThemeColor: () => '#000',
}));

// ThemedText
jest.mock('@/components/ThemedText', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    ThemedText: ({ children, ...rest }) =>
      React.createElement(Text, { ...rest }, children),
  };
});

// ✅ Fixed ThemedButton mock
jest.mock('@/components/ThemedButton', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  const Btn = ({ title, onPress, disabled, testID, style }) =>
    React.createElement(
      TouchableOpacity,
      {
        onPress: disabled ? undefined : onPress,
        disabled: !!disabled,
        testID: testID || 'confirm-btn',
        accessibilityState: { disabled: !!disabled }, // key fix
        style,
      },
      React.createElement(Text, null, title)
    );
  return { __esModule: true, ThemedButton: Btn };
});

// Ionicons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Ionicons = ({ name }) =>
    React.createElement(Text, { testID: `ion-${name}` }, String(name));
  return { __esModule: true, Ionicons };
});

// Maps
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  const MapView = ({ children, ...rest }) =>
    React.createElement(View, { ...rest, testID: 'mock-map' }, children);
  const Marker = ({ children }) =>
    React.createElement(Text, { testID: 'mock-marker' }, children);
  const Polyline = (props) =>
    React.createElement(View, { ...props, testID: 'mock-polyline' });
  return { __esModule: true, default: MapView, Marker, Polyline };
});

// PlacesAutocomplete
jest.mock('../../app/PlacesAutocomplete', () => {
  const React = require('react');
  const { View, TextInput, TouchableOpacity, Text } = require('react-native');
  const Comp = ({ placeholder, onSelect }) =>
    React.createElement(
      View,
      { testID: `places-${placeholder}` },
      React.createElement(TextInput, { placeholder, testID: `input-${placeholder}` }),
      React.createElement(
        TouchableOpacity,
        {
          testID: `select-${placeholder.toLowerCase().includes('meeting') ? 'start' : 'dest'}`,
          onPress: () =>
            onSelect?.({
              description:
                placeholder.toLowerCase().includes('meeting')
                  ? 'Federation Square'
                  : 'Flinders Street Station',
              lat: -37.8183,
              lng: 144.9671,
            }),
        },
        React.createElement(Text, null, 'SelectFirstOption')
      )
    );
  return { __esModule: true, default: Comp };
});

// SUT
import CompanionPreferencesModal from '../../app/CompanionPreferencesModal';

const baseProps = { visible: true, onClose: jest.fn(), onSubmit: jest.fn() };

describe('CompanionPreferencesModal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders correctly', () => {
    const { getByText, getByTestId } = render(
      <CompanionPreferencesModal {...baseProps} />
    );
    expect(getByText('Meeting Point & Destination')).toBeTruthy();
    expect(getByText('Add Destination')).toBeTruthy();
    expect(getByTestId('mock-map')).toBeTruthy();
  });

  it('keeps confirm button disabled until a destination is set', () => {
    const { getByTestId } = render(<CompanionPreferencesModal {...baseProps} />);
    const confirm = getByTestId('confirm-btn');
    expect(confirm.props.accessibilityState.disabled).toBe(true); // fixed
  });

  it('enables confirm and calls onSubmit when prefilled', async () => {
    const onSubmit = jest.fn();
    const start = { latitude: -37.8136, longitude: 144.9631 };
    const dest = { latitude: -37.8183, longitude: 144.9671 };

    const { getByTestId } = render(
      <CompanionPreferencesModal
        {...baseProps}
        onSubmit={onSubmit}
        prefillStart={start}
        prefillDestination={dest}
      />
    );

    const confirm = getByTestId('confirm-btn');
    expect(confirm.props.accessibilityState.disabled).toBe(false); // fixed
    fireEvent.press(confirm);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });

  it('updates transport and gender selections safely', () => {
    const { getAllByTestId, getByText } = render(
      <CompanionPreferencesModal {...baseProps} />
    );

    fireEvent.press(getAllByTestId('ion-bus').pop());   
    fireEvent.press(getAllByTestId('ion-train').pop());
    fireEvent.press(getAllByTestId('ion-car').pop());
    fireEvent.press(getByText('Female'));
    fireEvent.press(getByText('Male'));
  });

  it('resets state when shouldReset toggles', async () => {
    const { rerender, getByText } = render(
      <CompanionPreferencesModal {...baseProps} shouldReset={false} />
    );
    rerender(<CompanionPreferencesModal {...baseProps} shouldReset={true} />);
    expect(getByText('Add Destination')).toBeTruthy();
  });
});