import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import ActiveMatchModal from "../ActiveMatchModal";

// ---------------------- Mocks ----------------------
jest.spyOn(Alert, "alert").mockImplementation(() => {});
jest.spyOn(console, "log").mockImplementation(() => {});
jest.spyOn(console, "error").mockImplementation(() => {});

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve("mock-token")),
}));

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
    ThemedButton: ({ title, onPress }) => (
      <TouchableOpacity onPress={onPress}>
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
  };
});

jest.mock("@/constants/Colors", () => ({
  Colors: {
    light: {
      tint: "#8B5CF6",
      background: "#fff",
      text: "#000",
      tabIconDefault: "#888",
    },
  },
}));

jest.mock("../../config", () => ({
  BASE_URL: "http://mockserver.test/",
}));

jest.mock("../NavigationModal", () => {
  const React = require("react");
  const { View, Text } = require("react-native");
  return {
    __esModule: true,
    default: ({ visible }) =>
      visible ? (
        <View testID="mockNavigationModal">
          <Text>NavigationModal visible</Text>
        </View>
      ) : null,
  };
});

jest.mock("../TripMessagingModal", () => {
  const React = require("react");
  const { View, Text } = require("react-native");
  return {
    __esModule: true,
    default: ({ visible }) =>
      visible ? (
        <View testID="mockMessagingModal">
          <Text>MessagingModal visible</Text>
        </View>
      ) : null,
  };
});

global.fetch = jest.fn();

// ---------------------- Tests ----------------------
describe("ActiveMatchModal", () => {
  const mockOnClose = jest.fn();
  const mockOnRefresh = jest.fn();

  const sampleMatch = {
    matchId: "m1",
    status: "active",
    organizer: { userId: "u1", userName: "Organizer", userImage: "default.jpg" },
    companion: { userId: "u2", userName: "Companion", userImage: "default.jpg" },
    meetingPoint: { name: "Library", description: "Main entrance" },
    tripDetails: { destination: "Campus" },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders correctly with no matches", async () => {
    const { getAllByText, getByText } = render(
      <ActiveMatchModal
        visible={true}
        matches={[]}
        onClose={mockOnClose}
        onRefresh={mockOnRefresh}
      />
    );

    // Use getAllByText to handle multiple occurrences
    const titles = getAllByText("Active Trips");
    expect(titles.length).toBeGreaterThan(0);

    expect(getByText("No active trips")).toBeTruthy();
  });

  it("renders trip card and shows trip info", async () => {
    const { getByText } = render(
      <ActiveMatchModal
        visible={true}
        matches={[sampleMatch]}
        currentUserId="u1"
      />
    );

    expect(getByText("Trip to Campus")).toBeTruthy();
    expect(getByText("ACTIVE")).toBeTruthy(); // ✅ uppercase
    expect(getByText("Companion")).toBeTruthy();
  });

  it("opens navigation modal when 'Navigate' is pressed", async () => {
    const { getByText, getByTestId } = render(
      <ActiveMatchModal visible={true} matches={[sampleMatch]} currentUserId="u1" />
    );

    fireEvent.press(getByText("Navigate"));
    await waitFor(() => expect(getByTestId("mockNavigationModal")).toBeTruthy());
  });

  it("opens messaging modal when 'Message' is pressed", async () => {
    const { getByText, getByTestId } = render(
      <ActiveMatchModal visible={true} matches={[sampleMatch]} currentUserId="u1" />
    );

    fireEvent.press(getByText("Message"));
    await waitFor(() => expect(getByTestId("mockMessagingModal")).toBeTruthy());
  });

  it("triggers cancel flow with Alert confirmation", async () => {
    const { getByText } = render(
      <ActiveMatchModal visible={true} matches={[sampleMatch]} currentUserId="u1" />
    );

    fireEvent.press(getByText("Cancel"));

    expect(Alert.alert).toHaveBeenCalledWith(
      "Cancel Trip",
      expect.stringContaining("Are you sure you want to cancel this trip?"),
      expect.any(Array)
    );

    // simulate user confirming cancel
    const confirm = Alert.alert.mock.calls[0][2].find((b) => b.text === "Yes, Cancel");
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "success" }),
    });
    await confirm.onPress();

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        "Trip Cancelled",
        expect.stringContaining("The trip has been cancelled."),
        expect.any(Array)
      )
    );
  });

  it("handles cancel error properly", async () => {
    const { getByText } = render(
      <ActiveMatchModal visible={true} matches={[sampleMatch]} currentUserId="u1" />
    );

    fireEvent.press(getByText("Cancel"));
    const confirm = Alert.alert.mock.calls[0][2].find((b) => b.text === "Yes, Cancel");

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "error", message: "Failed" }),
    });
    await confirm.onPress();

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith("Error", expect.stringContaining("Failed"))
    );
  });

  it("closes modal when ✕ is pressed", () => {
    const { getByText } = render(
      <ActiveMatchModal visible={true} matches={[]} onClose={mockOnClose} />
    );
    fireEvent.press(getByText("✕"));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("refresh button calls onRefresh", () => {
    const { getByText } = render(
      <ActiveMatchModal visible={true} matches={[]} onRefresh={mockOnRefresh} />
    );
    fireEvent.press(getByText("🔄 Refresh"));
    expect(mockOnRefresh).toHaveBeenCalled();
  });
});
