import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, TextInput, Linking } from "react-native";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { BASE_URL } from '../config';

const join = (base, path) => `${base.replace(/\/+$/, '')}/${String(path).replace(/^\/+/, '')}`;

export default function SOSScreen() {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasContacts, setHasContacts] = useState(false);
  const [note, setNote] = useState("");

  const checkContacts = useCallback(async () => {
    try {
      setChecking(true);
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(
        join(BASE_URL, '/api/v1/user/emergency-contacts'),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to check contacts");
      setHasContacts((json.data || []).length > 0);
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => { checkContacts(); }, [checkContacts]);

  const handleSendSOS = async () => {
    try {
      if (!hasContacts) {
        Alert.alert("No contacts", "Add at least one emergency contact first.", [
          { text: "Add Contacts", onPress: () => router.replace("/emergencyContacts") },
          { text: "Cancel", style: "cancel" },
        ]);
        return;
      }

      setLoading(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLoading(false);
        Alert.alert("Permission required", "Location permission is required to send SOS.");
        return;
      }

      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest, timeout: 10000 });
      const payload = {
        location: {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        },
        note: note.trim() || undefined,
      };

      const token = await AsyncStorage.getItem("token");
      const res = await fetch(
        join(BASE_URL, '/api/v1/sos/send'),
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        }
      );

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.status !== "success") {
        throw new Error(json.message || "Failed to send SOS");
      }

      // Immediately open the dialer to call emergency services
      Linking.openURL("tel:000");
      Alert.alert("SOS sent", "Your contacts are being notified and 000 is being dialed.");
      setNote("");
    } catch (e) {
      Alert.alert("Error", e.message || "Unable to send SOS.");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text>Checking emergency contacts…</Text>
      </View>
    );
  }

  if (!hasContacts) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>No emergency contacts</Text>
        <Text style={styles.caption}>Add at least one contact to enable SOS.</Text>
        <TouchableOpacity style={styles.primary} onPress={() => router.replace("/emergencyContacts")}>
          <Text style={styles.primaryText}>Add Contacts</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Emergency SOS</Text>
      <Text style={styles.caption}>Optionally add a short note for responders.</Text>

      <TextInput
        style={styles.input}
        placeholder="e.g., I feel unsafe near the station entrance."
        value={note}
        onChangeText={setNote}
        multiline
      />

      <TouchableOpacity style={styles.sosButton} onPress={handleSendSOS} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.sosText}>SEND SOS</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.linkBtn} onPress={() => router.push("/emergencyContacts")}>
        <Text style={styles.linkText}>Manage Emergency Contacts</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff", justifyContent: "center" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 10, textAlign: "center" },
  caption: { color: "#666", textAlign: "center", marginBottom: 14 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, minHeight: 60, marginBottom: 20 },
  sosButton: { backgroundColor: "red", paddingVertical: 16, borderRadius: 12, alignItems: "center" },
  sosText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  primary: { marginTop: 14, backgroundColor: "#2c7be5", paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 },
  primaryText: { color: "#fff", fontWeight: "700" },
  linkBtn: { marginTop: 16, alignItems: "center" },
  linkText: { color: "#2c7be5", fontWeight: "600" },
});
