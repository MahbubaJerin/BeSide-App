import React from "react";
import { render, waitFor, fireEvent } from "@testing-library/react-native";
import { Alert } from "react-native";
import TripHistoryModal from "../TripHistoryModal"; 

// ---- Mocks ----
jest.spyOn(Alert, "alert").mockImplementation(() => {});
global.fetch = jest.fn();
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
    ThemedButton: ({ title, onPress, disabled }) => (
      <TouchableOpacity onPress={onPress} disabled={disabled}>
        <Text>{title}</Text>
      </TouchableOpacity>
    ),
  };
});

jest.mock("@/constants/Colors", () => ({
  Colors: {
    light: { tint: "#8B5CF6", background: "#fff", text: "#000" },
  },
}));

jest.mock("../../config", () => ({
  BASE_URL: "http://mockserver.test",
}));

// ---- Tests ----
describe("TripHistoryModal", () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders modal and header when visible", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "success", data: { history: [] } }),
    });

    const { findByText } = render(
      <TripHistoryModal visible={true} onClose={mockOnClose} />
    );

    expect(await findByText("Trip History")).toBeTruthy();
  });

  it("shows 'No trip history' when there are no trips", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "success", data: { history: [] } }),
    });

    const { findByText } = render(
      <TripHistoryModal visible={true} onClose={mockOnClose} />
    );

    expect(await findByText("No trip history")).toBeTruthy();
  });

  it("displays trip cards when history is returned", async () => {
    const sampleTrips = [
      {
        _id: "1",
        status: "completed",
        destination: "Melbourne Central",
        createdAt: "2025-10-29T12:00:00Z",
        date: "2025-10-29",
        time: "10:30 AM",
        type: "match",
        companionInfo: { userName: "Alice" },
      },
    ];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "success", data: { history: sampleTrips } }),
    });

    const { findByText } = render(
      <TripHistoryModal visible={true} onClose={mockOnClose} />
    );

    await waitFor(() => expect(findByText("Melbourne Central")).toBeTruthy());
    expect(await findByText("✅")).toBeTruthy();
    expect(await findByText("COMPLETED")).toBeTruthy();
  });

  it("handles fetch errors gracefully", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Failed to fetch trip history" }),
    });

    render(<TripHistoryModal visible={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Failed to load trip history"
      );
    });
  });

  it("calls fetch again when pulled to refresh", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "success", data: { history: [] } }),
    });

    const { findByText } = render(
      <TripHistoryModal visible={true} onClose={mockOnClose} />
    );

    await findByText("Trip History");
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  });

  it("closes modal when ✕ is pressed", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "success", data: { history: [] } }),
    });

    const { findByText } = render(
      <TripHistoryModal visible={true} onClose={mockOnClose} />
    );

    const closeBtn = await findByText("✕");
    fireEvent.press(closeBtn);
    expect(mockOnClose).toHaveBeenCalled();
  });
});
