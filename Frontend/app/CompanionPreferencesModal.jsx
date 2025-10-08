// Frontend/app/CompanionPreferencesModal.jsx
import React, { useEffect, useState } from "react";
import { View, Text, Modal, StyleSheet, Switch, Alert } from "react-native";
import * as Location from "expo-location";
import { Picker } from "@react-native-picker/picker";
import PlacesAutocomplete from "./PlacesAutocomplete";
import { ThemedButton } from "@/components/ThemedButton";

export default function CompanionPreferencesModal({
  visible,
  onClose,
  onSubmit,
  prefillStart = null,
  prefillDestination = null,
}) {
  const [talk, setTalk] = useState(false);
  const [useCurrent, setUseCurrent] = useState(false);

  const [startText, setStartText] = useState("");
  const [destText, setDestText] = useState("");

  const [startCoordinates, setStartCoordinates] = useState(null);        // { latitude, longitude }
  const [destinationCoordinates, setDestinationCoordinates] = useState(null);

  const [transport, setTransport] = useState("walk");
  const [gender, setGender] = useState("any");
  const [loading, setLoading] = useState(false);

  // Prefills coming from map/home.jsx (optional)
  useEffect(() => {
    if (prefillStart) {
      setUseCurrent(false);
      setStartCoordinates(prefillStart);
      setStartText(`Pinned (${prefillStart.latitude.toFixed(5)}, ${prefillStart.longitude.toFixed(5)})`);
    }
  }, [prefillStart]);
  useEffect(() => {
    if (prefillDestination) {
      setDestinationCoordinates(prefillDestination);
      setDestText(`Pinned (${prefillDestination.latitude.toFixed(5)}, ${prefillDestination.longitude.toFixed(5)})`);
    }
  }, [prefillDestination]);

  // Use current location
  useEffect(() => {
    if (!useCurrent) return;
    (async () => {
      try {
        setLoading(true);
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") { Alert.alert("Permission required", "Location permission is needed."); setUseCurrent(false); return; }
        const pos = await Location.getCurrentPositionAsync({});
        setStartCoordinates({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setStartText("Current location");
      } catch (e) {
        console.log("Use current location error:", e);
        setUseCurrent(false);
      } finally { setLoading(false); }
    })();
  }, [useCurrent]);

  // Selection handlers from PlacesAutocomplete
const handleStartSelected = (item) => {
  console.log('\n=== Start Location Selected ===');
  console.log('Selected item:', item);
  
  if (!item?.coordinates) {
    console.log('❌ No coordinates in selected item');
    return;
  }
  
  setUseCurrent(false);
  setStartText(item.description);
  console.log('Setting start coordinates:', item.coordinates);
  setStartCoordinates(item.coordinates);
};

const handleDestSelected = (item) => {
  console.log('\n=== Destination Selected ===');
  console.log('Selected item:', item);
  
  if (!item?.coordinates) {
    console.log('❌ No coordinates in selected item');
    return;
  }
  
  setDestText(item.description);
  console.log('Setting destination coordinates:', item.coordinates);
  setDestinationCoordinates(item.coordinates);
};

  const handleConfirm = () => {
    if (!startCoordinates) return Alert.alert("Missing start", "Please choose a starting point.");
    if (!destinationCoordinates) return Alert.alert("Missing destination", "Please choose a destination.");

    onSubmit({
      startCoordinates,
      destinationCoordinates,
      transport,
      gender,
      talk,
      useCurrentLocation: useCurrent,
    });
    onClose?.();
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Companion Preferences</Text>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Would you like to talk?</Text>
            <Switch value={talk} onValueChange={setTalk} />
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Use Current Location</Text>
            <Switch value={useCurrent} onValueChange={setUseCurrent} />
          </View>

          {!useCurrent && (
            <>
              <Text style={styles.label}>Starting point</Text>
              <PlacesAutocomplete
                placeholder="Starting point"
                value={startText}
                onChangeText={setStartText}
                onSelect={handleStartSelected}
                country="au"
              />
            </>
          )}

          <Text style={[styles.label, { marginTop: 12 }]}>Destination</Text>
          <PlacesAutocomplete
            placeholder="Destination"
            value={destText}
            onChangeText={setDestText}
            onSelect={handleDestSelected}
            country="au"
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Choose Transport:</Text>
          <Picker selectedValue={transport} onValueChange={setTransport} style={styles.picker}>
            <Picker.Item label="Walking" value="walking" />
            <Picker.Item label="Driving" value="driving" />
            <Picker.Item label="Transit" value="transit" />
          </Picker>

          <Text style={[styles.label, { marginTop: 12 }]}>Preferred Gender:</Text>
          <Picker selectedValue={gender} onValueChange={setGender} style={styles.picker}>
            <Picker.Item label="Any" value="any" />
            <Picker.Item label="Female" value="female" />
            <Picker.Item label="Male" value="male" />
          </Picker>

          <ThemedButton title={loading ? "Please wait..." : "Confirm"} disabled={loading} onPress={handleConfirm} />
          <View style={{ height: 8 }} />
          <ThemedButton variant="secondary" title="Cancel" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  sheet: { width: "90%", maxHeight: "88%", backgroundColor: "#fff", borderRadius: 18, padding: 16, elevation: 12 },
  title: { fontSize: 20, fontWeight: "600", marginBottom: 8, textAlign: "center" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  rowLabel: { fontSize: 16 },
  label: { fontSize: 14, marginBottom: 6 },
  picker: { borderWidth: 1, borderColor: "#dfe1e5", borderRadius: 10, backgroundColor: "#fff" },
});
