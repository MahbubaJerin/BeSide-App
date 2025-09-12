import React, { useState, useEffect } from "react";
import { Picker } from "@react-native-picker/picker";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Platform,
  Alert,
} from "react-native";
import { ThemedButton } from "@/components/ThemedButton";
import PlacesAutocomplete from "@/app/PlacesAutocomplete";
import * as Location from "expo-location";

export default function CompanionPreferencesModal({
  visible,
  onClose,
  onSubmit,
}) {
  const [chatPreference, setChatPreference] = useState(false);

  // Display strings for inputs
  const [startLocation, setStartLocation] = useState("");
  const [destination, setDestination] = useState("");

  // Coordinates we’ll pass back to Home
  const [startCoordinates, setStartCoordinates] = useState(null);
  const [destinationCoordinates, setDestinationCoordinates] = useState(null);

  const [transport, setTransport] = useState({ mode: "walking" });
  const [genderPreference, setGenderPreference] = useState("any");
  const [isLoading, setIsLoading] = useState(false);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);

  useEffect(() => {
    if (useCurrentLocation) {
      (async () => {
        try {
          setIsLoading(true);
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== "granted") {
            Alert.alert("Permission Denied", "Location permission is required.");
            setUseCurrentLocation(false);
            return;
          }
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Highest,
          });
          setStartCoordinates({
            latitude: parseFloat(location.coords.latitude.toFixed(6)),
            longitude: parseFloat(location.coords.longitude.toFixed(6)),
          });
          setStartLocation("Current Location");
        } catch (e) {
          Alert.alert("Error", "Could not fetch your current location.");
          setUseCurrentLocation(false);
        } finally {
          setIsLoading(false);
        }
      })();
    } else {
      // If toggled off, clear the current-location start
      setStartCoordinates(null);
      setStartLocation("");
    }
  }, [useCurrentLocation]);

  // Accept selection object from PlacesAutocomplete: { name, address, latitude, longitude }
  const onStartPicked = (sel) => {
    setUseCurrentLocation(false);
    setStartLocation(sel.address || sel.name || "");
    setStartCoordinates({
      latitude: parseFloat(Number(sel.latitude).toFixed(6)),
      longitude: parseFloat(Number(sel.longitude).toFixed(6)),
    });
  };

  const onDestinationPicked = (sel) => {
    setDestination(sel.address || sel.name || "");
    setDestinationCoordinates({
      latitude: parseFloat(Number(sel.latitude).toFixed(6)),
      longitude: parseFloat(Number(sel.longitude).toFixed(6)),
    });
  };

    const valid = (c) =>
    c &&
    typeof c.latitude === "number" &&
    typeof c.longitude === "number" &&
    c.latitude >= -90 &&
    c.latitude <= 90 &&
    c.longitude >= -180 &&
    c.longitude <= 180;

  const handleSubmit = () => {
    if (!valid(startCoordinates) || !valid(destinationCoordinates)) {
      Alert.alert("Error", "Please select both start and destination locations.");
      return;
    }
    const preferences = {
      chat: chatPreference,
      startLocation,
      destination,
      startCoordinates,
      destinationCoordinates,
      transport,
      gender: genderPreference,
      useCurrentLocation,
    };
    onSubmit(preferences); // Home’s handlePreferencesSubmit consumes these
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>Companion Preferences</Text>

          <View style={styles.row}>
            <Switch value={chatPreference} onValueChange={setChatPreference} />
            <Text style={styles.label}>Would you like to talk?</Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <Switch value={useCurrentLocation} onValueChange={setUseCurrentLocation} />
            <Text style={styles.label}>Use Current Location</Text>
          </View>

          {/* Start location (hidden when using current location) */}
          {!useCurrentLocation && (
            <View style={{ zIndex: 10000, elevation: 10000 }}>
              <PlacesAutocomplete
                placeholder="Starting point"
                onPlaceSelected={onStartPicked}
                style={styles.input}
                disabled={isLoading}
              />
              {!!startLocation && (
                <Text style={styles.helperText} numberOfLines={1}>
                  {startLocation}
                </Text>
              )}
            </View>
          )}

          {/* Destination */}
          <View style={{ zIndex: 9999, elevation: 9999 }}>
            <PlacesAutocomplete
              placeholder="Destination"
              onPlaceSelected={onDestinationPicked}
              style={styles.input}
              disabled={isLoading}
            />
            {!!destination && (
              <Text style={styles.helperText} numberOfLines={1}>
                {destination}
              </Text>
            )}
          </View>

          <Text style={[styles.label, { marginTop: 12 }]}>Choose Transport:</Text>
          <Picker
            selectedValue={
              transport.mode + (transport.transit_mode ? ":" + transport.transit_mode : "")
            }
            style={styles.picker}
            onValueChange={(val) => {
              if (val.startsWith("transit:")) {
                const sub = val.split(":")[1];
                setTransport({ mode: "transit", transit_mode: sub });
              } else {
                setTransport({ mode: val });
              }
            }}
            enabled={!isLoading}
          >
            <Picker.Item label="Walk" value="walking" />
            <Picker.Item label="Drive" value="driving" />
            <Picker.Item label="Bicycle" value="bicycling" />
            <Picker.Item label="Bus" value="transit:bus" />
            <Picker.Item label="Train" value="transit:train" />
            <Picker.Item label="Subway" value="transit:subway" />
            <Picker.Item label="Tram" value="transit:tram" />
          </Picker>

          <Text style={styles.label}>Preferred Gender:</Text>
          <Picker
            selectedValue={genderPreference}
            style={styles.picker}
            onValueChange={setGenderPreference}
            enabled={!isLoading}
          >
            <Picker.Item label="Any" value="any" />
            <Picker.Item label="Male" value="male" />
            <Picker.Item label="Female" value="female" />
            <Picker.Item label="Non-binary" value="nonbinary" />
          </Picker>

          <ThemedButton
            title={isLoading ? "Loading..." : "Confirm"}
            onPress={handleSubmit}
            disabled={isLoading}
          />

          <Pressable onPress={onClose} style={{ marginTop: 12 }}>
            <Text style={{ color: "#aaa", textAlign: "center" }}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  box: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    width: "90%",
    maxHeight: "80%",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    marginLeft: 10,
    marginTop: 10,
  },
  helperText: {
    marginTop: 4,
    color: "#666",
  },
  input: {
    marginVertical: 6,
  },
  picker: {
    ...Platform.select({
      ios: { height: 100 },
      android: { height: 50 },
    }),
    width: "100%",
    marginBottom: 16,
  },
});
