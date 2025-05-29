import { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Dimensions,
  TouchableOpacity,
  Platform,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import MapView, { Marker, Callout } from "react-native-maps";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";


import { Colors } from "@/constants/Colors";
import { ThemedText } from "@/components/ThemedText";
import { ThemedButton } from "@/components/ThemedButton";
import ConsentModal from "./ConsentModal";
import CompanionPreferencesModal from "./CompanionPreferencesModal";

const { width } = Dimensions.get("window");

const customMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "water", stylers: [{ color: "#c9c9c9" }] },
];

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [consentVisible, setConsentVisible] = useState(false);
  const [preferencesVisible, setPreferencesVisible] = useState(false);
  const [consent, setConsent] = useState({
    noTouch: false,
    respectful: false,
    safety: false,
  });

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const stored = await AsyncStorage.getItem("user");
        if (stored) {
          setUser(JSON.parse(stored));
        } else {
          router.replace("/login");
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Highest,
          });

          setCurrentLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        } catch {
          setCurrentLocation({
            latitude: -37.8136,
            longitude: 144.9631,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        }
      };

      load();
    }, [])
  );

  const handleLogout = async () => {
    await AsyncStorage.removeItem("user");
    router.replace("/login");
  };

  const handleFindCompanion = async () => {
    const storedUser = await AsyncStorage.getItem("user");
    if (!storedUser) {
      router.replace("/login");
      return;
    }

    const parsed = JSON.parse(storedUser);
    if (parsed.isVerified) {
      setConsentVisible(true); // SHOW CONSENT FORM FIRST
    } else {
      setModalVisible(true); // NOT VERIFIED YET
    }
  };

  const handlePreferencesSubmit = async (preferences) => {
    console.log("User Preferences:", preferences);
    Alert.alert("Success", "Your companion preferences have been saved.");
    setPreferencesVisible(false);
    // You can now also call a backend function here to fetch matching users
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText type="title">BeSide</ThemedText>
        <TouchableOpacity onPress={() => setMenuVisible(true)}>
          <ThemedText type="defaultSemiBold">☰</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Menu Modal */}
      <Modal transparent animationType="fade" visible={menuVisible}>
        <TouchableOpacity
          style={styles.menuOverlay}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuBox}>
            <TouchableOpacity onPress={() => router.push("/profile")}>
              <ThemedText type="defaultSemiBold" style={styles.menuItem}>
                Account
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout}>
              <ThemedText
                type="defaultSemiBold"
                style={[styles.menuItem, { color: Colors.light.danger }]}
              >
                Logout
              </ThemedText>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Map */}
      <View style={styles.mapContainer}>
        {currentLocation && (
          <MapView
            customMapStyle={customMapStyle}
            mapType="standard"
            style={styles.map}
            showsUserLocation
            followsUserLocation
            region={currentLocation}
          >
            <Marker coordinate={currentLocation}>
              <Callout>
                <View style={{ width: 140 }}>
                  <ThemedText type="defaultSemiBold">You are here</ThemedText>
                  <ThemedText type="caption">Live GPS location</ThemedText>
                </View>
              </Callout>
            </Marker>
          </MapView>
        )}
      </View>

      {/* Find Companion Button */}
      <ThemedButton
        title="Find a Companion"
        onPress={handleFindCompanion}
        style={styles.actionButton}
      />

      {/* Not Verified Popup */}
      <Modal transparent animationType="slide" visible={modalVisible}>
        <View style={styles.popupOverlay}>
          <View style={styles.popupBox}>
            <ThemedText type="subtitle">Oops!</ThemedText>
            <ThemedText type="default">
              It looks like you're not verified yet.
            </ThemedText>
            <ThemedButton
              title="Verify Now"
              type="primary"
              onPress={() => {
                setModalVisible(false);
                router.push("/verify");
              }}
              style={styles.verifyButton}
            />
          </View>
        </View>
      </Modal>

      {/* Consent Form Modal */}
      <ConsentModal
        visible={consentVisible}
        onClose={() => setConsentVisible(false)}
        consent={consent}
        setConsent={setConsent}
        onSubmit={() => {
          setConsentVisible(false);
          setPreferencesVisible(true);
        }}
      />

      {/* Preferences Modal */}
      <CompanionPreferencesModal
        visible={preferencesVisible}
        onClose={() => setPreferencesVisible(false)}
        onSubmit={handlePreferencesSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    paddingTop: Platform.OS === "android" ? 40 : 60,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    alignItems: "center",
  },
  mapContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
  },
  map: {
    width: "90%",
    height: "90%",
  },
  actionButton: {
    width: "100%",
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    padding: 20,
  },
  menuBox: {
    backgroundColor: Colors.light.surface,
    borderRadius: 10,
    padding: 12,
    width: 180,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  menuItem: {
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  popupOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  popupBox: {
    backgroundColor: Colors.light.surface,
    padding: 24,
    borderRadius: 14,
    width: width * 0.8,
    alignItems: "center",
  },
  verifyButton: {
    marginTop: 20,
    width: "80%",
  },
});