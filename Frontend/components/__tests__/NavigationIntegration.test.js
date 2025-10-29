import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { Alert, Linking, Platform } from "react-native";
import NavigationIntegration from "../NavigationIntegration";

// Mocks
jest.spyOn(Alert, "alert").mockImplementation(() => {});
jest.spyOn(console, "error").mockImplementation(() => {});
jest.spyOn(console, "log").mockImplementation(() => {});

jest.mock("@/components/ThemedText", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    __esModule: true,
    ThemedText: ({ children, ...props }) => <Text {...props}>{children}</Text>,
  };
});

jest.mock("@/components/ThemedButton", () => {
  const React = require("react");
  const { TouchableOpacity, Text } = require("react-native");
  return {
    __esModule: true,
    ThemedButton: ({ title, onPress, disabled }) => (
      <TouchableOpacity onPress={onPress} disabled={disabled}>
        <Text>{title}</Text>
      </TouchableOpacity>
    ),
  };
});

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    Ionicons: ({ name }) => <Text testID={`ion-${name}`}>{name}</Text>,
    MaterialCommunityIcons: ({ name }) => <Text testID={`mci-${name}`}>{name}</Text>,
  };
});

jest.mock("@/constants/Colors", () => ({
  Colors: {
    light: {
      background: "#fff",
      tint: "#8B5CF6",
      text: "#000",
      tabIconDefault: "#999",
    },
  },
}));

// Mock Linking
Linking.canOpenURL = jest.fn(() => Promise.resolve(true));
Linking.openURL = jest.fn(() => Promise.resolve(true));

describe("NavigationIntegration", () => {
  const tripMatch = {
    destinationLocation: {
      latitude: -37.8136,
      longitude: 144.9631,
      address: "Federation Square, Melbourne",
    },
    distance: 2.4,
  };

  const mockOnClose = jest.fn();
  const mockOnStart = jest.fn();
  const mockOnComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders null when not visible", () => {
    const { toJSON } = render(
      <NavigationIntegration tripMatch={tripMatch} isVisible={false} />
    );
    expect(toJSON()).toBeNull();
  });

  it("renders trip details and navigation options", () => {
    const { getByText } = render(
      <NavigationIntegration tripMatch={tripMatch} isVisible={true} />
    );

    expect(getByText("Start Navigation")).toBeTruthy();
    expect(getByText("Federation Square, Melbourne")).toBeTruthy();
    expect(getByText("Google Maps")).toBeTruthy();
    expect(getByText("Waze")).toBeTruthy();
  });

  it("alerts when no destination is available", () => {
    const tripNoDest = {};
    render(
      <NavigationIntegration
        tripMatch={tripNoDest}
        isVisible={true}
        onClose={mockOnClose}
      />
    );

    fireEvent.press(render(
      <NavigationIntegration tripMatch={tripNoDest} isVisible={true} />
    ).getByText("Google Maps"));

    expect(Alert.alert).toHaveBeenCalledWith(
      "Error",
      "No destination available for navigation"
    );
  });

  it("shows confirmation alert when selecting a navigation app", () => {
    const { getByText } = render(
      <NavigationIntegration tripMatch={tripMatch} isVisible={true} />
    );

    const google = getByText("Google Maps");
    fireEvent.press(google);

    expect(Alert.alert).toHaveBeenCalledWith(
      expect.stringContaining("Open Google Maps?"),
      expect.stringContaining("turn-by-turn directions"),
      expect.any(Array)
    );
  });

  it("handles navigation start successfully", async () => {
    Platform.OS = "android"; // Simulate Android
    const { getByText } = render(
      <NavigationIntegration
        tripMatch={tripMatch}
        isVisible={true}
        onNavigationStart={mockOnStart}
        onTripComplete={mockOnComplete}
      />
    );

    // Simulate pressing Google Maps option
    const google = getByText("Google Maps");
    fireEvent.press(google);

    // Manually invoke the alert "Open" button callback
    const openCallback = Alert.alert.mock.calls[0][2].find(
      (b) => b.text === "Open"
    ).onPress;

    await openCallback();

    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalled();
      expect(mockOnStart).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith(
        "Navigation Started! 🧭",
        expect.stringContaining("Google Maps"),
        expect.any(Array)
      );
    });

    // Simulate pressing "Mark as Completed" in second alert
    const completeCallback = Alert.alert.mock.calls
      .flatMap((call) => call[2])
      .find((b) => b.text === "Mark as Completed").onPress;

    completeCallback?.();

    expect(mockOnComplete).toHaveBeenCalled();
  });

  it("handles Linking errors gracefully", async () => {
    Linking.openURL.mockRejectedValueOnce(new Error("Failed"));
    const { getByText } = render(
      <NavigationIntegration tripMatch={tripMatch} isVisible={true} />
    );

    const waze = getByText("Waze");
    fireEvent.press(waze);

    const openCallback = Alert.alert.mock.calls[0][2].find(
      (b) => b.text === "Open"
    ).onPress;

    await openCallback();

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Navigation Error",
        expect.stringContaining("Could not open Waze"),
        expect.any(Array)
      );
    });
  });

  it("calls onClose and onTripComplete from footer buttons", () => {
    const { getByText } = render(
      <NavigationIntegration
        tripMatch={tripMatch}
        isVisible={true}
        onClose={mockOnClose}
        onTripComplete={mockOnComplete}
      />
    );

    fireEvent.press(getByText("Close"));
    expect(mockOnClose).toHaveBeenCalled();

    fireEvent.press(getByText("Mark Complete"));

    const confirmCallback = Alert.alert.mock.calls
      .flatMap((call) => call[2])
      .find((b) => b.text === "Complete").onPress;

    confirmCallback();
    expect(mockOnComplete).toHaveBeenCalled();
  });
});
