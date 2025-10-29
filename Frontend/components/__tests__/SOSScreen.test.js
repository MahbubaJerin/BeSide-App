import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

// ✅ FIXED: import path — make sure this matches your actual file name!
// If your file is named "sos.jsx", use the lowercase version below.
import SOSScreen from "../../app/sos"; 

// Mocks
jest.spyOn(Alert, "alert").mockImplementation(() => {});
global.fetch = jest.fn();
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve("mock-token")),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: "granted" })
  ),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({
      coords: { latitude: -37.8136, longitude: 144.9631, accuracy: 10 },
    })
  ),
  Accuracy: { Highest: 1 },
}));

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}));

jest.mock("../../config", () => ({
  BASE_URL: "http://mockserver.test",
}));

describe("SOSScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows loading indicator while checking contacts", async () => {
    global.fetch.mockImplementationOnce(
      () => new Promise(() => {}) // never resolves
    );

    const { getByText } = render(<SOSScreen />);
    expect(getByText("Checking emergency contacts…")).toBeTruthy();
  });

  it("shows 'no contacts' screen when user has none", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    const { getByText, findByText } = render(<SOSScreen />);
    expect(await findByText("No emergency contacts")).toBeTruthy();
    expect(getByText("Add at least one contact to enable SOS.")).toBeTruthy();
  });

  it("shows main SOS screen when contacts exist", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ name: "Alice" }] }),
    });

    const { findByText } = render(<SOSScreen />);
    expect(await findByText("Emergency SOS")).toBeTruthy();
  });

  it("sends SOS successfully", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ name: "Alice" }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "success" }),
      });

    const { findByText, getByPlaceholderText } = render(<SOSScreen />);
    await findByText("SEND SOS");

    fireEvent.changeText(
      getByPlaceholderText(/feel unsafe/i),
      "Testing SOS feature"
    );

    const sendButton = await findByText("SEND SOS");
    fireEvent.press(sendButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(Alert.alert).toHaveBeenCalledWith(
        "Sent",
        expect.stringContaining("Your SOS has been registered")
      );
    });
  });

  it("shows error when SOS sending fails", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ name: "Alice" }] }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: "Failed to send SOS" }),
      });

    const { findByText } = render(<SOSScreen />);
    const sendButton = await findByText("SEND SOS");
    fireEvent.press(sendButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Error",
        expect.stringContaining("Failed to send SOS")
      );
    });
  });

  it("shows error if location permission denied", async () => {
    const mockLoc = require("expo-location");
    mockLoc.requestForegroundPermissionsAsync.mockResolvedValueOnce({
      status: "denied",
    });

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ name: "Bob" }] }),
    });

    const { findByText } = render(<SOSScreen />);
    const sendButton = await findByText("SEND SOS");
    fireEvent.press(sendButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Permission required",
        expect.stringContaining("Location permission")
      );
    });
  });
});