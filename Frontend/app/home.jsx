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
import ActiveMatchModal from "@/components/ActiveMatchModal";
import BeSideLogo from "../assets/images/BeSide.png";
import { BASE_URL } from "../config";
import { useRequestPolling } from "../hooks/useRequestPolling";
import { useActiveMatches } from "../hooks/useActiveMatches";

// ========= Inline hooks (single-file edition) =========

// useLocationTracking: starts/stops foreground location tracking and POSTs to backend
function useLocationTracking() {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [watcher, setWatcher] = useState(null);
  const [isTracking, setIsTracking] = useState(false);

  const postUpdate = useCallback(async (coords) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const url = `${BASE_URL.replace(/\/+$/, "")}/api/v1/location/update`;
      await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy ?? null,
          speed: coords.speed ?? null,
          heading: coords.heading ?? null,
        }),
      }).catch(() => {});
    } catch (_) {}
  }, []);

  const startTracking = useCallback(
    async (askPermission = true) => {
      try {
        if (askPermission) {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== "granted") {
            Alert.alert("Permission required", "Please enable location access.");
            return false;
          }
        }
        const last = await Location.getCurrentPositionAsync({});
        const coords = {
          latitude: last.coords.latitude,
          longitude: last.coords.longitude,
          accuracy: last.coords.accuracy,
          speed: last.coords.speed,
          heading: last.coords.heading,
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
              speed: p.coords.speed,
              heading: p.coords.heading,
            };
            setCurrentLocation(c);
            postUpdate(c);
          }
        );
        setWatcher(sub);
        setIsTracking(true);
        return true;
      } catch (e) {
        console.log("startTracking error:", e?.message || e);
        return false;
      }
    },
    [postUpdate]
  );

  const stopTracking = useCallback(() => {
    try {
      watcher?.remove();
    } catch (_) {}
    setWatcher(null);
    setIsTracking(false);
  }, [watcher]);

  return { currentLocation, isTracking, startTracking, stopTracking };
}

// useCompanionSearch: polls /nearby to find active users around a center
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
      const url = new URL(
        `${BASE_URL.replace(/\/+$/, "")}/api/v1/location/nearby`
      );
      url.searchParams.set("latitude", String(centerRef.current.latitude));
      url.searchParams.set("longitude", String(centerRef.current.longitude));
      url.searchParams.set("radius", String(searchRadius));
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.status === "success") {
        setCompanions(json.data?.companions || []);
        if (typeof json.data?.searchRadius === "number") {
          setSearchRadius(json.data.searchRadius);
        }
      }
    } catch (e) {
      console.log("companion fetch error:", e?.message || e);
    } finally {
      setLoading(false);
    }
  }, [searchRadius]);

  const startSearch = useCallback(
    async (center, radius = 500, intervalMs = 30000) => {
      centerRef.current = center;
      setSearchRadius(radius);
      setIsSearching(true);
      await fetchOnce();
      pollRef.current && clearInterval(pollRef.current);
      pollRef.current = setInterval(fetchOnce, Math.max(8000, intervalMs));
      return true;
    },
    [fetchOnce]
  );

  const stopSearch = useCallback(async () => {
    pollRef.current && clearInterval(pollRef.current);
    pollRef.current = null;
    setIsSearching(false);
    try {
      const token = await AsyncStorage.getItem("token");
      if (token) {
        await fetch(
          `${BASE_URL.replace(/\/+$/, "")}/api/v1/location/stop-searching`,
          { method: "PATCH", headers: { Authorization: `Bearer ${token}` } }
        );
      }
    } catch (_) {}
  }, []);

  const cleanup = useCallback(() => {
    pollRef.current && clearInterval(pollRef.current);
    pollRef.current = null;
  }, []);

  return {
    companions,
    isSearching,
    loading,
    searchRadius,
    startSearch,
    stopSearch,
    cleanup,
  };
}

// =======================================================

const { width } = Dimensions.get("window");
const placeholderImage = require("../assets/images/placeholder2.jpg");
const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

const customMapStyle = [
  { featureType: "all", elementType: "geometry", stylers: [{ visibility: "on" }] },
  { featureType: "all", elementType: "labels.text.fill" },
  { featureType: "all", elementType: "labels.text.stroke", stylers: [{ lightness: "-37" }] },
  { featureType: "all", elementType: "labels.icon", stylers: [{ visibility: "on" }] },
  { featureType: "administrative", elementType: "geometry.fill", stylers: [{ color: "#fefefe" }, { lightness: "20" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#fefefe" }, { lightness: "17" }, { weight: "1.2" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#f5f5f5" }, { lightness: "20" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#f5f5f5" }, { lightness: "21" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#dedede" }, { lightness: "21" }] },
  { featureType: "road.highway", elementType: "geometry.fill", stylers: [{ color: "#ffffff" }, { lightness: "17" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#ffffff" }, { lightness: "29" }, { weight: "0.2" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#ffffff" }, { lightness: "18" }] },
  { featureType: "road.local", elementType: "geometry", stylers: [{ color: "#ffffff" }, { lightness: "16" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#f2f2f2" }, { lightness: "19" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#e9e9e9" }, { lightness: "17" }] },
];

// Hardcoded users (demo pins)
const hardcodedUsers = [
  { userName: "AliceSmith", latitude: -33.8688, longitude: 151.2093, userImage: placeholderImage, genderPreference: "Woman" },
  { userName: "BobJohnson", latitude: -33.865, longitude: 151.205, userImage: placeholderImage, genderPreference: "Man" },
  { userName: "CharlieNonbinary", latitude: -33.872, longitude: 151.215, userImage: placeholderImage, genderPreference: "LGBTQ+" },
  { userName: "DanaOther", latitude: -33.86, longitude: 151.2, userImage: placeholderImage, genderPreference: "Other" },
];

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const insets = useSafeAreaInsets();
  // modal stack
  const [modalVisible, setModalVisible] = useState(false); // not verified
  const [photoUploadVisible, setPhotoUploadVisible] = useState(false);
  const [consentVisible, setConsentVisible] = useState(false);
  const [preferencesVisible, setPreferencesVisible] = useState(false);
  const [sentRequestStatusVisible, setSentRequestStatusVisible] = useState(false);
  const [requestNotificationVisible, setRequestNotificationVisible] = useState(false);
  const [activeMatchModalVisible, setActiveMatchModalVisible] = useState(false);

  const [consent, setConsent] = useState({ noTouch: false, respectful: false, safety: false });
  const [photoUrl, setPhotoUrl] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [startMarker, setStartMarker] = useState(null);
  const [endMarker, setEndMarker] = useState(null);

  const loadingAnimation = useRef(new Animated.Value(0)).current;
  const mapRef = useRef(null);
  const [currentTripRequestId, setCurrentTripRequestId] = useState(null);
  const [showRadius, setShowRadius] = useState(false);

  // hooks
  const locationTracking = useLocationTracking();
  const companionSearch = useCompanionSearch();
  const requestPolling = useRequestPolling(10000, true); // Poll every 10 seconds
  const activeMatches = useActiveMatches(15000); // Poll for matches every 15 seconds

  const currentLocation = locationTracking.currentLocation;
  const isSearching = companionSearch.isSearching;
  const companions = companionSearch.companions;
  const searchRadius = companionSearch.searchRadius;

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const stored = await AsyncStorage.getItem("user");
        if (stored) {
          const parsed = JSON.parse(stored);
          setUser(parsed);
          await locationTracking.startTracking(true);
        } else {
          router.replace("/login");
        }
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
    } else {
      loadingAnimation.setValue(0);
    }
  }, [isSearching]);

  const handleLogout = async () => {
    await AsyncStorage.removeItem("user");
    await AsyncStorage.removeItem("token");
    router.replace("/login");
  };

  // ⬇️ CHANGED: no search starts here; only createTripReq + open modal
  const handleFindCompanion = async () => {
    try {
      const storedUser = await AsyncStorage.getItem("user");
      const token = await AsyncStorage.getItem("token");
      if (!storedUser || !token) {
        router.replace("/login");
        return;
      }
      const parsed = JSON.parse(storedUser);

      if (!parsed.isVerified) {
        setModalVisible(true);
        return;
      }
      if (!currentLocation) {
        Alert.alert("Location Required", "Please enable location services to find companions.");
        return;
      }

      // 1) create trip request
      const API_URL = BASE_URL.replace(/\/+$/, "");
      const response = await fetch(`${API_URL}/api/v1/trip/createTripReq`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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

      if (result.status !== "success") {
        throw new Error(result.message || "Failed to create trip request");
      }
      setCurrentTripRequestId(result.data.tripRequest.tripReqId);

      // 2) prompt consent -> selfie -> preferences
      setConsentVisible(true);

      // 3) DO NOT START SEARCH YET
      setShowRadius(false);
    } catch (e) {
      Alert.alert("Error", e?.message || "Failed to start companion search.");
    }
  };

  const handlePhotoSubmit = async (uri) => {
    if (!currentTripRequestId) {
      Alert.alert("Error", "No active trip request found.");
      return;
    }
    try {
      const storedUser = await AsyncStorage.getItem("user");
      const token = await AsyncStorage.getItem("token");
      if (!storedUser || !token) {
        Alert.alert("Error", "User not logged in.");
        router.replace("/login");
        return;
      }
      const API_URL = BASE_URL;
      const formData = new FormData();
      formData.append("photo", { uri, type: "image/jpeg", name: `selfie-${Date.now()}.jpg` });
      const response = await fetch(`${API_URL}api/v1/trip/upload-photo/${currentTripRequestId}`, {
        method: "POST",
        body: formData,
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.status === "success") {
        setPhotoUrl(result.data.photoUrl);
        setPhotoUploadVisible(false);
        setPreferencesVisible(true);
      } else {
        throw new Error(result.message || "Failed to upload photo");
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to upload photo.");
    }
  };

  // NEW: Send trip request to nearby users
  const sendTripRequestToNearby = async (startCoordinates) => {
    try {
      const token = await AsyncStorage.getItem("token");
      const user = await AsyncStorage.getItem("user");

      if (!token || !currentTripRequestId) {
        Alert.alert(
          "Debug Error",
          `Missing: ${!token ? "Token" : ""} ${!currentTripRequestId ? "Trip Request ID" : ""}`
        );
        return;
      }

      const API_URL = BASE_URL.replace(/\/+$/, "");
      const requestBody = {
        tripReqId: currentTripRequestId,
        startCoordinates: { longitude: startCoordinates.longitude, latitude: startCoordinates.latitude },
        searchRadius: 500,
      };

      const response = await fetch(`${API_URL}/api/v1/trip/send-to-nearby`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (result.status === "success") {
        Alert.alert(
          "Request Sent! 🚀",
          `Your companion request has been sent to ${result.data.recipientCount} nearby users\n\nDEBUG INFO:\n- Trip ID: ${currentTripRequestId}\n- Coordinates: ${startCoordinates.latitude}, ${startCoordinates.longitude}\n- Recipients: ${result.data.recipientCount}`,
          [{ text: "OK" }]
        );
      } else {
        Alert.alert("API Error", result.message || "Failed to send request");
        throw new Error(result.message || "Failed to send request to nearby users");
      }
    } catch (error) {
      Alert.alert("Debug Error", `Network/Parse Error: ${error.message}`);
    }
  };

  const handlePreferencesSubmit = async (preferences) => {
    try {
      setStartMarker(preferences.startCoordinates);
      setEndMarker(preferences.destinationCoordinates);
      setShowRadius(true);

      // Route (Google Directions)
      const url =
        "https://maps.googleapis.com/maps/api/directions/json" +
        `?origin=${preferences.startCoordinates.latitude},${preferences.startCoordinates.longitude}` +
        `&destination=${preferences.destinationCoordinates.latitude},${preferences.destinationCoordinates.longitude}` +
        `&mode=${
          preferences.transport === "car"
            ? "driving"
            : preferences.transport === "walk"
            ? "walking"
            : "transit"
        }` +
        `&key=${GOOGLE_MAPS_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.routes && data.routes[0]) {
        const points = data.routes[0].overview_polyline.points;
        const coords = decodePolyline(points);
        const validCoords = coords.filter(
          (c) =>
            c.latitude >= -90 &&
            c.latitude <= 90 &&
            c.longitude >= -180 &&
            c.longitude <= 180
        );
        setRouteCoordinates(validCoords);
        if (validCoords.length > 0) {
          mapRef.current?.fitToCoordinates(validCoords, {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true,
          });
        }

        // ✅ Start companion search ONLY now
        await companionSearch.startSearch(preferences.startCoordinates, searchRadius, 30000);

        // Send trip request to nearby users
        if (currentTripRequestId) {
          await sendTripRequestToNearby(preferences.startCoordinates);
        }
      } else {
        Alert.alert("Error", "No route found between the selected locations");
      }
    } catch (error) {
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

  const handleSendRequest = async (selectedUser) => {
    if (!consent.noTouch || !consent.respectful || !consent.safety) {
      Alert.alert("Error", "Please complete the consent form first.");
      setConsentVisible(true);
      return;
    }
    if (!photoUrl) {
      Alert.alert("Error", "Please upload a selfie first.");
      setPhotoUploadVisible(true);
      return;
    }

    try {
      const storedUser = await AsyncStorage.getItem("user");
      const token = await AsyncStorage.getItem("token");
      if (!storedUser || !token) {
        Alert.alert("Error", "User not logged in.");
        router.replace("/login");
        return;
      }
      const me = JSON.parse(storedUser);
      const API_URL = BASE_URL;

      const res = await fetch(`${API_URL}api/v1/trip-request/sendRequest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          senderId: me._id,
          receiverId: selectedUser.userId || selectedUser.userName,
          consent: consent,
          preferences: { gender: me.genderPreference || "any" },
          photoUrl: photoUrl,
        }),
      });

      const result = await res.json();
      if (result.status === "success") {
        Alert.alert("Success", "Request sent to " + (selectedUser.userName || "user"));
        setSelectedUser(null);
      } else {
        throw new Error(result.message || "Failed to send request");
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to send request.");
    }
  };

  const handleCurrentLocation = () => {
    if (currentLocation) {
      const region = {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      mapRef.current?.animateToRegion(region, 1000);
    }
  };

  // Match management functions
  const handleViewActiveMatches = () => {
    setActiveMatchModalVisible(true);
  };

  const handleUpdateMatchStatus = async (matchId, newStatus) => {
    try {
      await activeMatches.updateMatchStatus(matchId, newStatus);
      console.log(`✅ Trip ${matchId} status updated to ${newStatus}`);
    } catch (error) {
      console.error("Error updating match status:", error);
      throw error; // Re-throw to let ActiveMatchModal handle the alert
    }
  };

  const handleViewMatchDetails = (match) => {
    Alert.alert(
      `Trip Details - ${match.tripDetails?.destination || 'Unknown'}`,
      `Status: ${match.status || 'Unknown'}\n` +
      `Companion: ${match.companion?.userName || 'Unknown'}\n` +
      `Planned: ${match.tripDetails?.plannedDate ? new Date(match.tripDetails.plannedDate).toLocaleDateString() : 'Not set'}\n` +
      `Transport: ${match.tripDetails?.destinationType || 'Unknown'}`,
      [{ text: "OK" }]
    );
  };

  const handleSOS = async (num = "000") => {
    const url = Platform.OS === "ios" ? `telprompt:${num}` : `tel:${num}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Cannot open dialer", `Please call ${num} manually.`);
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong while opening the dialer.");
      console.error("Dial error:", error);
    }
  };

  const decodePolyline = (encoded) =>
    polyline.decode(encoded).map(([latitude, longitude]) => ({ latitude, longitude }));

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const [availability, setAvailability] = useState(true);
  const [availabilityModalVisible, setAvailabilityModalVisible] = useState(false);

  // UI
  return (
    <View style={styles.container}>
      {/* Top Bar — Logo + Title + Buttons */}
      <View style={styles.topBar}>
        <View style={styles.logoContainer}>
          <Image source={BeSideLogo} style={styles.logo} resizeMode="contain" accessibilityLabel="BeSide app logo" />
        </View>

        <View style={{ flex: 1, alignItems: "center" }}>
          <ThemedText type="title" style={styles.titleText}>BeSide</ThemedText>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            style={[styles.topIconButton, { backgroundColor: "#fceaea" }]}
            onPress={handleCurrentLocation}
            accessibilityLabel="Center map on current location"
          >
            <Ionicons name="location" size={28} color="#e63946" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.topIconButton, { backgroundColor: availability ? "#e6f8f1" : "#f0f0f0" }]}
            onPress={() => setAvailabilityModalVisible(true)}
            accessibilityLabel="Change availability status"
          >
            <Ionicons name={availability ? "toggle" : "toggle-outline"} size={28} color={availability ? "#2ca07b" : "#999"} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        {currentLocation ? (
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            customMapStyle={customMapStyle}
            style={styles.map}
            showsUserLocation
            followsUserLocation
            region={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            showsCompass
            showsScale
            showsTraffic
            showsBuildings
            showsIndoors
            showsMyLocationButton={false}
            showsPointsOfInterest
            zoomEnabled
            zoomControlEnabled
            rotateEnabled
            scrollEnabled
            pitchEnabled
            toolbarEnabled
          >
            <Marker coordinate={currentLocation}>
              <Callout>
                <View style={{ width: 140 }}>
                  <ThemedText type="defaultSemiBold">You are here</ThemedText>
                  <ThemedText type="caption">Live GPS location</ThemedText>
                </View>
              </Callout>
            </Marker>

            {startMarker && (
              <Marker coordinate={startMarker}>
                <View style={styles.markerContainer}>
                  <MaterialCommunityIcons name="map-marker" size={30} color="#4CAF50" />
                </View>
                <Callout>
                  <View style={{ width: 140 }}>
                    <ThemedText type="defaultSemiBold">Start Point</ThemedText>
                  </View>
                </Callout>
              </Marker>
            )}

            {endMarker && (
              <Marker coordinate={endMarker}>
                <View style={styles.markerContainer}>
                  <MaterialCommunityIcons name="map-marker" size={30} color="#F44336" />
                </View>
                <Callout>
                  <View style={{ width: 140 }}>
                    <ThemedText type="defaultSemiBold">Destination</ThemedText>
                  </View>
                </Callout>
              </Marker>
            )}

            {routeCoordinates.length > 0 && (
              <Polyline coordinates={routeCoordinates} strokeWidth={4} strokeColor="#2196F3" />
            )}

            {showRadius && currentLocation && (
              <Circle
                center={currentLocation}
                radius={searchRadius || 500}
                strokeColor="rgba(76, 175, 80, 0.5)"
                fillColor="rgba(76, 175, 80, 0.2)"
              />
            )}

            {/* Real companions */}
            {companions.map((c) => (
              <Marker
                key={String(c.userId)}
                coordinate={{ latitude: c.location.latitude, longitude: c.location.longitude }}
                onPress={() =>
                  setSelectedUser({
                    userId: c.userId,
                    userName: c.userName,
                    distance: (c.distance || 0) / 1000,
                    userInfo: c.userInfo,
                    lastSeen: c.lastSeen,
                    isSearching: c.isSearching,
                    userImage: placeholderImage,
                  })
                }
              >
                <View style={[styles.userMarkerContainer, c.isSearching && styles.searchingMarker]}>
                  <MaterialCommunityIcons
                    name={c.isSearching ? "account-search" : "account"}
                    size={24}
                    color={c.isSearching ? "#4CAF50" : "#FF5722"}
                  />
                </View>
                <Callout>
                  <View style={{ width: 160 }}>
                    <ThemedText type="defaultSemiBold">{c.userName}</ThemedText>
                    <ThemedText type="caption">{Math.round(c.distance)}m away</ThemedText>
                    <ThemedText type="caption">
                      {c.isSearching ? "🔍 Searching" : "📍 Available"}
                    </ThemedText>
                    {c.userInfo?.gender && (
                      <ThemedText type="caption">Gender: {c.userInfo.gender}</ThemedText>
                    )}
                  </View>
                </Callout>
              </Marker>
            ))}

            {/* Demo pins */}
            {hardcodedUsers.map((u, i) => {
              const distance = calculateDistance(
                currentLocation.latitude,
                currentLocation.longitude,
                u.latitude,
                u.longitude
              );
              return (
                <Marker
                  key={i}
                  coordinate={{ latitude: u.latitude, longitude: u.longitude }}
                  title={u.userName}
                  onPress={() => setSelectedUser({ ...u, distance })}
                >
                  <Callout>
                    <View style={{ width: 140 }}>
                      <ThemedText type="defaultSemiBold">{u.userName}</ThemedText>
                      <ThemedText type="caption">Gender: {u.genderPreference}</ThemedText>
                    </View>
                  </Callout>
                </Marker>
              );
            })}
          </MapView>
        ) : (
          <ThemedText type="default">Loading map...</ThemedText>
        )}
      </View>

      {/* Find/CANCEL */}
      {!isSearching ? (
        <TouchableOpacity
          style={[styles.actionButton, styles.connectButton]}
          onPress={handleFindCompanion}
          activeOpacity={0.8}
        >
          <Ionicons name="people" size={22} color="#fff" style={{ marginRight: 8 }} />
          <ThemedText type="buttonText" style={{ color: "#fff", fontSize: 16 }}>
            Find Companion
          </ThemedText>
        </TouchableOpacity>
      ) : (
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
                ? `${companions.length} people found in your area`
                : "Looking for people nearby..."}
            </ThemedText>
            {companionSearch.loading && <ThemedText type="caption">Updating...</ThemedText>}
          </View>
          <ThemedButton title="Cancel Search" onPress={cancelSearch} style={styles.cancelButton} />
        </View>
      )}

      {/* Bottom Navigation Bar (hidden while searching) */}
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
            <TouchableOpacity style={styles.navButton} onPress={handleViewActiveMatches}>
              <View style={styles.notificationIconContainer}>
                <Ionicons name="people" size={24} color="#fff" />
                {activeMatches.length > 0 && (
                  <View style={styles.notificationBadge}>
                    <ThemedText style={styles.badgeText}>{activeMatches.length}</ThemedText>
                  </View>
                )}
              </View>
              <ThemedText style={styles.navLabel}>Active Trips</ThemedText>
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

      {/* User Card */}
      <Modal transparent animationType="slide" visible={!!selectedUser} onRequestClose={() => setSelectedUser(null)}>
        <View style={styles.popupOverlay}>
          <View style={styles.userCard}>
            {selectedUser?.userImage && (
              <Image source={selectedUser.userImage} style={styles.userImage} resizeMode="cover" />
            )}
            <ThemedText type="subtitle">{selectedUser?.userName}</ThemedText>
            <ThemedText type="caption">Distance: {(selectedUser?.distance || 0).toFixed(2)} km</ThemedText>
            {selectedUser?.genderPreference ? (
              <ThemedText type="caption">Gender Preference: {selectedUser?.genderPreference}</ThemedText>
            ) : null}
            <ThemedButton
              title="View Profile"
              onPress={() => router.push(`/profile?userName=${selectedUser?.userName}`)}
              style={styles.cardButton}
            />
            <ThemedButton title="Send Request" onPress={() => handleSendRequest(selectedUser)} style={styles.cardButton} />
            <ThemedButton
              title="Close"
              onPress={() => setSelectedUser(null)}
              style={[styles.cardButton, { backgroundColor: Colors.light.danger }]}
            />
          </View>
        </View>
      </Modal>

      {/* Not Verified Popup */}
      <Modal transparent animationType="slide" visible={modalVisible}>
        <View style={styles.popupOverlay}>
          <View style={styles.popupBox}>
            <ThemedText type="subtitle">Oops!</ThemedText>
            <ThemedText type="default">You're not verified yet.</ThemedText>
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

      {/* Consent → Selfie → Preferences */}
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
        onSubmit={handlePhotoSubmit}
      />
      <CompanionPreferencesModal
        visible={preferencesVisible}
        onClose={() => setPreferencesVisible(false)}
        onSubmit={handlePreferencesSubmit}
      />
      <SentRequestStatusModal
        visible={sentRequestStatusVisible}
        onClose={() => setSentRequestStatusVisible(false)}
      />
      <RequestNotificationModal
        visible={requestNotificationVisible}
        onClose={() => setRequestNotificationVisible(false)}
        onRequestAccepted={(tripRequest) => {
          console.log("Request accepted:", tripRequest);
        }}
      />
      <ActiveMatchModal
        visible={activeMatchModalVisible}
        onClose={() => setActiveMatchModalVisible(false)}
        matches={activeMatches?.matches || []}
        isLoading={activeMatches?.loading || false}
        onRefresh={activeMatches?.refresh}
        onUpdateStatus={handleUpdateMatchStatus}
        onViewDetails={handleViewMatchDetails}
        onSetMeetingPoint={activeMatches?.setMeetingPoint}
        currentLocation={currentLocation}
        currentUserId={user?._id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.surface },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.light.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 40,
    borderBottomWidth: 1,
    borderColor: "#e0e0e0",
  },
  mapContainer: { flex: 1 },
  map: { width: "100%", height: "100%" },
  actionButton: {
    position: "absolute",
    bottom: 130,
    left: 60,
    right: 60,
    paddingBottom: 15,
    paddingTop: 15,
    marginBottom: 20,
    backgroundColor: Colors.light.secondary,
  },
  connectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 50,
    borderColor: Colors.light.accent,
    borderWidth: 2,
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
  menuItem: { paddingVertical: 10, paddingHorizontal: 10 },
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
    width: Dimensions.get("window").width * 0.8,
    alignItems: "center",
  },
  verifyButton: { marginTop: 20, width: "80%" },
  userCard: {
    backgroundColor: Colors.light.surface,
    padding: 20,
    borderRadius: 14,
    width: Dimensions.get("window").width * 0.8,
    alignItems: "center",
  },
  cardButton: { marginTop: 10, width: "80%" },
  userImage: { width: 80, height: 80, borderRadius: 40, marginBottom: 10 },
  markerContainer: { alignItems: "center", justifyContent: "center" },
  userMarkerContainer: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 5,
    borderWidth: 2,
    borderColor: "#FF5722",
  },
  searchingMarker: { borderColor: "#4CAF50", backgroundColor: "#E8F5E8" },
  searchingContainer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: Colors.light.surface,
    borderRadius: 10,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
    borderRadius: 2,
  },
  searchingInfo: { alignItems: "center", marginBottom: 10 },
  cancelButton: { backgroundColor: Colors.light.danger, borderColor: Colors.light.danger, marginBottom: 25 },
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