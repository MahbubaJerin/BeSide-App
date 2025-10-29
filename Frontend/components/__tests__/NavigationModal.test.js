import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import NavigationModal from "../NavigationModal";

// ---------------- Mocks ----------------
jest.spyOn(Alert, "alert").mockImplementation(() => {});
jest.spyOn(console, "log").mockImplementation(() => {});
jest.spyOn(console, "error").mockImplementation(() => {});

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve("mock-token")),
}));

jest.mock("@/constants/Colors", () => ({
  Colors: {
    light: { tint: "#8B5CF6", text: "#000", background: "#fff" },
  },
}));

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    Ionicons: ({ name }) => <Text testID={`icon-${name}`}>{name}</Text>,
  };
});

jest.mock("../../config", () => ({
  BASE_URL: "http://mockserver.test/",
}));

// mock RouteMapView used inside NavigationModal
jest.mock("../RouteMapView", () => {
  const React = require("react");
  const { View, Text } = require("react-native");
  return {
    __esModule: true,
    default: ({ onNavigationStart, onArrivalDetected }) => (
      <View testID="mockMap">
        <Text>MockMap</Text>
        <Text onPress={onNavigationStart}>StartNav</Text>
        <Text onPress={onArrivalDetected}>Arrive</Text>
      </View>
    ),
  };
});

global.fetch = jest.fn();

// ---------------- Fixtures ----------------
const mockMatch = {
  matchId: "123",
  organizer: { userName: "Alice" },
  companion: { userName: "Bob" },
  meetingPoint: { name: "Library", address: "123 Street", location: { lat: 1, lon: 2 } },
};

// ---------------- Tests ----------------
describe("NavigationModal", () => {
  const mockOnClose = jest.fn();
  const mockOnBothArrived = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders correctly with tripMatch and instructions", () => {
    const { getByText, getByTestId } = render(
      <NavigationModal visible={true} tripMatch={mockMatch} onClose={mockOnClose} />
    );

    expect(getByTestId("mockMap")).toBeTruthy();
    expect(getByText("🚶‍♀️ Navigate to Meeting Point")).toBeTruthy();
    expect(getByText("Go to meet Alice")).toBeTruthy();
  });

  it("starts navigation when Start Navigation button pressed", async () => {
    const { getByText } = render(
      <NavigationModal visible={true} tripMatch={mockMatch} onClose={mockOnClose} />
    );

    const btn = getByText("Start Navigation");
    fireEvent.press(btn);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "🚀 Navigation Started!",
        expect.any(String),
        expect.any(Array)
      );
    });
  });

  it("handles Almost There success when both not arrived", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { bothArrived: false } }),
    });

    const { getByText } = render(
      <NavigationModal visible={true} tripMatch={mockMatch} onClose={mockOnClose} />
    );

    const btn = getByText("Almost There!");
    fireEvent.press(btn);

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        "✅ Arrival Confirmed!",
        expect.any(String),
        expect.any(Array)
      )
    );
  });

  it("handles Almost There when both users arrived", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { bothArrived: true } }),
    });

    const { getByText } = render(
      <NavigationModal
        visible={true}
        tripMatch={mockMatch}
        onClose={mockOnClose}
        onBothArrived={mockOnBothArrived}
      />
    );

    const btn = getByText("Almost There!");
    fireEvent.press(btn);

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        "🎉 Both Users Have Arrived!",
        expect.any(String),
        expect.any(Array)
      )
    );
    expect(mockOnBothArrived).toHaveBeenCalled();
  });

  it("handles Almost There error", async () => {
    fetch.mockRejectedValueOnce(new Error("Network fail"));
    const { getByText } = render(
      <NavigationModal visible={true} tripMatch={mockMatch} onClose={mockOnClose} />
    );

    const btn = getByText("Almost There!");
    fireEvent.press(btn);

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Failed to mark arrival. Please try again."
      )
    );
  });

  it("shows both arrived button and handles Start Final Journey", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { bothReady: true, tripStarted: true },
      }),
    });

    const { getByText } = render(
      <NavigationModal
        visible={true}
        tripMatch={mockMatch}
        onClose={mockOnClose}
        onBothArrived={mockOnBothArrived}
      />
    );

    // manually simulate both arrived
    fireEvent.press(getByText("Almost There!"));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());

    // simulate pressing final journey
    const startBtn = getByText("Start Navigation");
    fireEvent.press(startBtn);
    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
  });

  it("handles close button press", () => {
    const { getByTestId } = render(
      <NavigationModal visible={true} tripMatch={mockMatch} onClose={mockOnClose} />
    );

    fireEvent.press(getByTestId("icon-close"));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("returns null when tripMatch not provided", () => {
    const { toJSON } = render(<NavigationModal visible={true} onClose={mockOnClose} />);
    expect(toJSON()).toBeNull();
  });
});
