// Frontend/app/home.jsx
import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Dimensions,
  TouchableOpacity,
  Alert,
  Image,
  Animated,
  Platform,
  Linking,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useFocusEffect } from "expo-router";
import MapView, {
  Marker,
  Callout,
  PROVIDER_GOOGLE,
  Circle,
  Polyline,
} from "react-native-maps";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import polyline from "@mapbox/polyline";
import { Colors } from "@/constants/Colors";
import { ThemedText } from "@/components/ThemedText";
import { ThemedButton } from "@/components/ThemedButton";
import ConsentModal from "./ConsentModal";
import CompanionPreferencesModal from "./CompanionPreferencesModal";
import PhotoUploadModal from "./PhotoUploadModal";
import SentRequestStatusModal from "@/components/SentRequestStatusModal";
import RequestNotificationModal from "@/components/RequestNotificationModal";
import BeSideLogo from "../assets/images/BeSide.png";
import { BASE_URL } from "../config";
import { useRequestPolling } from "../hooks/useRequestPolling";

// ========= Inline hooks =========

// useLocationTracking
function useLocationTracking() {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [watcher, setWatcher] = useState(null);

  const postUpdate = useCallback(async (coords) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      await fetch(`${BASE_URL.replace(/\/+$/, "")}/api/v1/location/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(coords),
      });
    } catch (_) {}
  }, []);

  const startTracking = useCallback(async (askPermission = true) => {
    try {
      if (askPermission) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission required", "Please enable location access.");
          return false;
        }
      }
      const pos = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      };
      setCurrentLocation(coords);
      postUpdate(coords);
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 15,
          timeInterval: 10000,
        },
        (p) => {
          const c = {
            latitude: p.coords.latitude,
            longitude: p.coords.longitude,
            accuracy: p.coords.accuracy,
          };
          setCurrentLocation(c);
          postUpdate(c);
        }
      );
      setWatcher(sub);
      return true;
    } catch (e) {
      console.log("Tracking error:", e);
      return false;
    }
  }, [postUpdate]);

  const stopTracking = useCallback(() => {
    watcher?.remove();
  }, [watcher]);

  return { currentLocation, startTracking, stopTracking };
}

// useCompanionSearch
function useCompanionSearch() {
  const [companions, setCompanions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchRadius, setSearchRadius] = useState(500);
  const pollRef = useRef(null);
  const centerRef = useRef(null);

  const fetchOnce = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token || !centerRef.current) return;
      setLoading(true);
      const url = new URL(`${BASE_URL}/api/v1/location/nearby`);
      url.searchParams.set("latitude", centerRef.current.latitude);
      url.searchParams.set("longitude", centerRef.current.longitude);
      url.searchParams.set("radius", searchRadius);
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok && json.status === "success") {
        setCompanions(json.data?.companions || []);
      }
    } catch (e) {
      console.log("companion fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [searchRadius]);

  const startSearch = useCallback(async (center, radius = 500, intervalMs = 30000) => {
    centerRef.current = center;
    setSearchRadius(radius);
    setIsSearching(true);
    await fetchOnce();
    pollRef.current && clearInterval(pollRef.current);
    pollRef.current = setInterval(fetchOnce, Math.max(8000, intervalMs));
    return true;
  }, [fetchOnce]);

  const stopSearch = useCallback(async () => {
    pollRef.current && clearInterval(pollRef.current);
    setIsSearching(false);
  }, []);

  const cleanup = useCallback(() => {
    pollRef.current && clearInterval(pollRef.current);
  }, []);

  return { companions, isSearching, loading, searchRadius, startSearch, stopSearch, cleanup };
}

// =======================================================

const { width } = Dimensions.get("window");
const placeholderImage = require("../assets/images/placeholder2.jpg");
const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

// =======================================================

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // States
  const [user, setUser] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [photoUploadVisible, setPhotoUploadVisible] = useState(false);
  const [consentVisible, setConsentVisible] = useState(false);
  const [preferencesVisible, setPreferencesVisible] = useState(false);
  const [sentRequestStatusVisible, setSentRequestStatusVisible] = useState(false);
  const [requestNotificationVisible, setRequestNotificationVisible] = useState(false);
  const [consent, setConsent] = useState({ noTouch: false, respectful: false, safety: false });
  const [photoUrl, setPhotoUrl] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [startMarker, setStartMarker] = useState(null);
  const [endMarker, setEndMarker] = useState(null);
  const [currentTripRequestId, setCurrentTripRequestId] = useState(null);
  const [showRadius, setShowRadius] = useState(false);
  const [availability, setAvailability] = useState(true);

  const mapRef = useRef(null);
  const loadingAnimation = useRef(new Animated.Value(0)).current;
  const locationTracking = useLocationTracking();
  const companionSearch = useCompanionSearch();
  const requestPolling = useRequestPolling(10000, true);
  const currentLocation = locationTracking.currentLocation;
  const { isSearching, companions, searchRadius } = companionSearch;

  // 🔹 Fix overlay visibility
  const overlayOpen = consentVisible || photoUploadVisible || preferencesVisible;

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const stored = await AsyncStorage.getItem("user");
        if (stored) {
          const parsed = JSON.parse(stored);
          setUser(parsed);
          await locationTracking.startTracking(true);
        } else router.replace("/login");
      };
      load();
      return () => {
        locationTracking.stopTracking();
        companionSearch.cleanup();
      };
    }, [])
  );

  useEffect(() => {
    if (isSearching) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(loadingAnimation, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(loadingAnimation, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ).start();
    } else loadingAnimation.setValue(0);
  }, [isSearching]);

  const handleLogout = async () => {
    await AsyncStorage.removeItem("user");
    await AsyncStorage.removeItem("token");
    router.replace("/login");
  };

  // ✅ FIX 1 — removed early search
  const handleFindCompanion = async () => {
    try {
      const storedUser = await AsyncStorage.getItem("user");
      const token = await AsyncStorage.getItem("token");
      if (!storedUser || !token) return router.replace("/login");
      const parsed = JSON.parse(storedUser);
      if (!parsed.isVerified) return setModalVisible(true);
      if (!currentLocation)
        return Alert.alert("Location Required", "Please enable location services to find companions.");

      const API_URL = BASE_URL.replace(/\/+$/, "");
      const response = await fetch(`${API_URL}/api/v1/trip/createTripReq`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          user: { userId: parsed._id, userName: parsed.userName, userImage: parsed.userImage || "default.jpg" },
          destination: "Placeholder",
          destinationType: "By Walk",
          date: new Date(),
          time: "12:00",
          genderPreference: "any",
        }),
      });
      const result = await response.json();
      if (result.status !== "success") throw new Error(result.message || "Failed to create trip request");

      setCurrentTripRequestId(result.data.tripRequest.tripReqId);
      setConsentVisible(true);
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to start companion search");
    }
  };

  // ✅ FIX 2 — start searching after preferences confirm
  const handlePreferencesSubmit = async (preferences) => {
    try {
      setStartMarker(preferences.startCoordinates);
      setEndMarker(preferences.destinationCoordinates);

      const url =
        "https://maps.googleapis.com/maps/api/directions/json" +
        `?origin=${preferences.startCoordinates.latitude},${preferences.startCoordinates.longitude}` +
        `&destination=${preferences.destinationCoordinates.latitude},${preferences.destinationCoordinates.longitude}` +
        `&mode=${preferences.transport === "car" ? "driving" : "walking"}` +
        `&key=${GOOGLE_MAPS_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.routes && data.routes[0]) {
        const points = data.routes[0].overview_polyline.points;
        const coords = polyline.decode(points).map(([latitude, longitude]) => ({ latitude, longitude }));
        setRouteCoordinates(coords);
        if (coords.length > 0)
          mapRef.current?.fitToCoordinates(coords, {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true,
          });

        await companionSearch.startSearch(preferences.startCoordinates, searchRadius, 30000);
        setShowRadius(true);
      } else Alert.alert("Error", "No route found");
    } catch (e) {
      Alert.alert("Error", "Failed to fetch route information");
    }
  };

  const cancelSearch = async () => {
    await companionSearch.stopSearch();
    setRouteCoordinates([]);
    setStartMarker(null);
    setEndMarker(null);
    setShowRadius(false);
  };

  const handleSOS = async (num = "000") => {
    const url = Platform.OS === "ios" ? `telprompt:${num}` : `tel:${num}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) await Linking.openURL(url);
  };

  // =======================================================
  // UI

  return (
    <View style={styles.container}>
      {/* ✅ Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.logoContainer}>
          <Image source={BeSideLogo} style={styles.logo} resizeMode="contain" />
        </View>
        <View style={{ flex: 1, alignItems: "center" }}>
          <ThemedText type="title" style={styles.titleText}>BeSide</ThemedText>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity style={[styles.topIconButton, { backgroundColor: "#fceaea" }]}>
            <Ionicons name="location" size={28} color="#e63946" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.topIconButton, { backgroundColor: availability ? "#e6f8f1" : "#f0f0f0" }]}
            onPress={() => setAvailability(!availability)}
          >
            <Ionicons name={availability ? "toggle" : "toggle-outline"} size={28} color={availability ? "#2ca07b" : "#999"} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Map View */}
      <View style={styles.mapContainer}>
        {currentLocation ? (
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            showsUserLocation
            followsUserLocation
            region={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
          >
            {startMarker && <Marker coordinate={startMarker} title="Start Point" />}
            {endMarker && <Marker coordinate={endMarker} title="Destination" />}
            {routeCoordinates.length > 0 && (
              <Polyline coordinates={routeCoordinates} strokeWidth={4} strokeColor="#2196F3" />
            )}
            {showRadius && currentLocation && (
              <Circle
                center={currentLocation}
                radius={searchRadius}
                strokeColor="rgba(76,175,80,0.5)"
                fillColor="rgba(76,175,80,0.2)"
              />
            )}
          </MapView>
        ) : (
          <ThemedText>Loading map...</ThemedText>
        )}
      </View>

      {/* ✅ FIX 3 — only show after confirm */}
      {!isSearching ? (
        <TouchableOpacity style={[styles.actionButton, styles.connectButton]} onPress={handleFindCompanion}>
          <Ionicons name="people" size={22} color="#fff" style={{ marginRight: 8 }} />
          <ThemedText type="buttonText" style={{ color: "#fff", fontSize: 16 }}>
            Find Companion
          </ThemedText>
        </TouchableOpacity>
      ) : (
        !overlayOpen && (
          <View style={styles.searchingContainer}>
            <View style={styles.loadingBarContainer}>
              <Animated.View
                style={[
                  styles.loadingBar,
                  {
                    transform: [
                      {
                        translateX: loadingAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-width, width],
                        }),
                      },
                    ],
                  },
                ]}
              />
            </View>
            <View style={styles.searchingInfo}>
              <ThemedText type="defaultSemiBold">Searching for companions...</ThemedText>
              <ThemedText type="caption">
                {companions.length > 0
                  ? `${companions.length} people found nearby`
                  : "Looking for people nearby..."}
              </ThemedText>
            </View>
            <ThemedButton title="Cancel Search" onPress={cancelSearch} style={styles.cancelButton} />
          </View>
        )
      )}

      {/* ✅ Bottom Navigation Bar */}
      {!isSearching && (
        <View style={[styles.navContainer, { paddingBottom: insets.bottom || 10 }]}>
          <View style={styles.navBar}>
            <TouchableOpacity style={styles.navButton} onPress={() => router.push("/profile")}>
              <Ionicons name="person-circle-outline" size={24} color="#fff" />
              <ThemedText style={styles.navLabel}>Profile</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navButton} onPress={() => router.push("/emergencyContacts")}>
              <Ionicons name="people-outline" size={24} color="#fff" />
              <ThemedText style={styles.navLabel}>Contacts</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navButton} onPress={() => setSentRequestStatusVisible(true)}>
              <Ionicons name="paper-plane-outline" size={24} color="#fff" />
              <ThemedText style={styles.navLabel}>My Requests</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => {
                setRequestNotificationVisible(true);
                requestPolling.markAsViewed();
              }}
            >
              <View style={styles.notificationIconContainer}>
                <Ionicons name="notifications-outline" size={24} color="#fff" />
                {requestPolling.hasNewRequests && (
                  <View style={styles.notificationBadge}>
                    <ThemedText style={styles.badgeText}>{requestPolling.requestCount}</ThemedText>
                  </View>
                )}
              </View>
              <ThemedText style={styles.navLabel}>Notifications</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navButton} onPress={() => handleSOS("000")}>
              <Ionicons name="alert" size={24} color="#fff" />
              <ThemedText style={styles.navLabel}>SOS</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navButton} onPress={handleLogout}>
              <Ionicons name="exit-outline" size={24} color="#fff" />
              <ThemedText style={styles.navLabel}>Logout</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Modals */}
      <ConsentModal
        visible={consentVisible}
        onClose={() => setConsentVisible(false)}
        consent={consent}
        setConsent={setConsent}
        onSubmit={() => {
          setConsentVisible(false);
          setPhotoUploadVisible(true);
        }}
      />
      <PhotoUploadModal
        visible={photoUploadVisible}
        onClose={() => setPhotoUploadVisible(false)}
        onSubmit={(uri) => {
          setPhotoUrl(uri);
          setPhotoUploadVisible(false);
          setPreferencesVisible(true);
        }}
      />
      <CompanionPreferencesModal
        visible={preferencesVisible}
        onClose={() => setPreferencesVisible(false)}
        onSubmit={handlePreferencesSubmit}
      />
      <SentRequestStatusModal visible={sentRequestStatusVisible} onClose={() => setSentRequestStatusVisible(false)} />
      <RequestNotificationModal visible={requestNotificationVisible} onClose={() => setRequestNotificationVisible(false)} />
    </View>
  );
}

// =======================================================

const { height, width: screenWidth } = Dimensions.get("window");
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.surface },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 40,
    borderBottomWidth: 1,
    borderColor: "#e0e0e0",
  },
  logoContainer: { width: 60, height: 60, justifyContent: "center", alignItems: "center" },
  logo: { width: 45, height: 45, borderRadius: 10 },
  titleText: { fontSize: 22, fontWeight: "bold", color: Colors.light.text, letterSpacing: 0.5 },
  topIconButton: {
    padding: 10,
    borderRadius: 12,
    marginHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 44,
    minHeight: 44,
  },
  mapContainer: { flex: 1 },
  map: { width: "100%", height: "100%" },
  actionButton: {
    position: "absolute",
    bottom: 130,
    left: 60,
    right: 60,
    paddingVertical: 15,
    backgroundColor: Colors.light.secondary,
    borderRadius: 50,
  },
  connectButton: { flexDirection: "row", justifyContent: "center" },
  searchingContainer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: Colors.light.surface,
    borderRadius: 10,
    padding: 15,
    shadowColor: "#000",
    elevation: 5,
  },
  loadingBarContainer: {
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 10,
  },
  loadingBar: {
    height: "100%",
    width: "100%",
    backgroundColor: Colors.light.secondary,
  },
  searchingInfo: { alignItems: "center", marginBottom: 10 },
  cancelButton: { backgroundColor: Colors.light.danger, borderColor: Colors.light.danger, marginTop: 10 },
  navContainer: {
    position: "absolute",
    left: 15,
    right: 15,
    bottom: 10,
    height: 80,
    marginBottom: 40,
    alignItems: "center",
    borderRadius: 36,
    backgroundColor: Colors.light.background,
  },
  navBar: {
    flexDirection: "row",
    width: "100%",
    height: 80,
    alignItems: "center",
    justifyContent: "space-around",
  },
  navButton: { alignItems: "center", justifyContent: "center" },
  navLabel: { color: "#fff", fontSize: 12, marginTop: 4 },
  notificationIconContainer: { position: "relative", alignItems: "center", justifyContent: "center" },
  notificationBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#FF4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
});
