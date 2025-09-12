import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Dimensions,
  TouchableOpacity,
  Platform,
  Alert,
  Image,
  Animated,
  Switch,
  ActivityIndicator,
  Pressable,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import MapView, {
  Marker,
  Callout,
  PROVIDER_GOOGLE,
  Circle,
  Polyline,
} from "react-native-maps";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import polyline from "@mapbox/polyline";
import { Colors } from "@/constants/Colors";
import { ThemedText } from "@/components/ThemedText";
import { ThemedButton } from "@/components/ThemedButton";
import ConsentModal from "./ConsentModal";
import CompanionPreferencesModal from "./CompanionPreferencesModal";
import PhotoUploadModal from "./PhotoUploadModal";
import { BASE_URL } from "../config";
import Constants from "expo-constants";
import { Linking } from "react-native";

const { width, height } = Dimensions.get("window");

// Placeholder image
const placeholderImage = require("../assets/images/placeholder2.jpg");

// Logo assets (replace with your actual paths)
const logoBlue = require("../assets/images/BeSide.png");
const logoDark = require("../assets/images/lightlogo.png");

const hardcodedUsers = [
  {
    userName: "AliceSmith",
    latitude: -33.8688,
    longitude: 151.2093,
    userImage: placeholderImage,
    genderPreference: "Woman",
  },
  {
    userName: "BobJohnson",
    latitude: -33.865,
    longitude: 151.205,
    userImage: placeholderImage,
    genderPreference: "Man",
  },
  {
    userName: "CharlieNonbinary",
    latitude: -33.872,
    longitude: 151.215,
    userImage: placeholderImage,
    genderPreference: "LGBTQ+",
  },
  {
    userName: "DanaOther",
    latitude: -33.86,
    longitude: 151.2,
    userImage: placeholderImage,
    genderPreference: "Other",
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  // Menu
  const [menuVisible, setMenuVisible] = useState(false);
  const [availability, setAvailability] = useState(true);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [availabilityModalVisible, setAvailabilityModalVisible] = useState(false);

  // Emergency contacts
  const [contactsVisible, setContactsVisible] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const loadEmergencyContacts = useCallback(async () => {
    try {
      console.log("[Contacts] Loading from AsyncStorage...");
      const raw = await AsyncStorage.getItem("emergencyContacts");
      if (raw) {
        const parsed = JSON.parse(raw);
        console.log("[Contacts] Loaded:", parsed);
        setEmergencyContacts(Array.isArray(parsed) ? parsed : []);
      } else {
        console.log("[Contacts] No saved contacts, seeding example...");
        const seed = [
          { name: "Primary Guardian", phone: "+61XXXXXXXXX" },
          { name: "Trusted Friend", phone: "+61YYYYYYYYY" },
        ];
        await AsyncStorage.setItem("emergencyContacts", JSON.stringify(seed));
        setEmergencyContacts(seed);
      }
    } catch (e) {
      console.log("[Contacts] Error loading contacts:", e);
      Alert.alert("Could not load emergency contacts.");
    }
  }, []);

  const openContacts = async () => {
    console.log("[UI] Opening Contacts modal");
    await loadEmergencyContacts();
    setContactsVisible(true);
  };

  const handleSOS = async () => {
    console.log("[SOS] Triggered");
    Alert.alert(
      "Confirm SOS",
      "This will attempt to call emergency services (000) and notify your trusted contacts.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Proceed",
          style: "destructive",
          onPress: async () => {
            try {
              console.log("[SOS] Calling 000 via Linking");
              await Linking.openURL("tel:000");
            } catch (e) {
              console.log("[SOS] Dial error:", e);
              Alert.alert("Unable to open dialer.");
            }

            // 🚨 Broadcast SMS to emergency contacts
            for (const c of emergencyContacts) {
              await smsContact(c.phone);
            }
          },
        },
      ]
    );
  };


  const smsContact = async (phone) => {
    try {
      console.log("[SMS] Preparing SMS to", phone);
      let locText = "";
      if (currentLocation) {
        const { latitude, longitude } = currentLocation;
        const gmaps = `https://maps.google.com/?q=${latitude},${longitude}`;
        locText = ` I'm at ${gmaps}`;
      }
      const body = encodeURIComponent(
        `Emergency: I need help. Please call or reach me.${locText}`
      );
      const url = Platform.select({
        ios: `sms:${phone}&body=${body}`,
        android: `sms:${phone}?body=${body}`,
        default: `sms:${phone}`,
      });
      await Linking.openURL(url);
      console.log("[SMS] Launched SMS intent:", url);
    } catch (e) {
      console.log("[SMS] Error launching SMS:", e);
      Alert.alert("Unable to open SMS app.");
    }
  };

  const callContact = async (phone) => {
    try {
      console.log("[Call] Calling", phone);
      await Linking.openURL(`tel:${phone}`);
    } catch (e) {
      console.log("[Call] Error:", e);
      Alert.alert("Unable to open dialer.");
    }
  };

  // Map & matching
  const [modalVisible, setModalVisible] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [photoUploadVisible, setPhotoUploadVisible] = useState(false);
  const [consentVisible, setConsentVisible] = useState(false);
  const [preferencesVisible, setPreferencesVisible] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [consent, setConsent] = useState({
    noTouch: false,
    respectful: false,
    safety: false,
  });
  const [photoUrl, setPhotoUrl] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [dummyUsers, setDummyUsers] = useState([]);
  const [startMarker, setStartMarker] = useState(null);
  const [endMarker, setEndMarker] = useState(null);
  const [nearbyUsers, setNearbyUsers] = useState(0);
  const [searchTimer, setSearchTimer] = useState(null);
  const loadingAnimation = useRef(new Animated.Value(0)).current;
  const mapRef = useRef(null);
  const [currentTripRequestId, setCurrentTripRequestId] = useState(null);
  const [showRadius, setShowRadius] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let locationSubscription;

      const load = async () => {
        const stored = await AsyncStorage.getItem("user");
        if (stored) {
          const parsed = JSON.parse(stored);
          setUser(parsed);
          if (typeof parsed?.availability === "boolean")
            setAvailability(parsed.availability);
        } else {
          router.replace("/login");
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        console.log("[Location] Permission status:", status);
        if (status !== "granted") {
          console.log("[Location] Using fallback location");
          setCurrentLocation({
            latitude: -33.8688,
            longitude: 151.2093,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
          return;
        }
        

        try {
          console.log("[Location] Fetching initial position…");
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Highest,
            timeout: 10000,
            mayShowUserSettingsDialog: true,
          });
          console.log("[Location] Initial:", location.coords);
          setCurrentLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });

          locationSubscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              timeInterval: 5000,
              distanceInterval: 10,
            },
            (newLocation) => {
              console.log("[Location] Update:", newLocation.coords);
              setCurrentLocation({
                latitude: newLocation.coords.latitude,
                longitude: newLocation.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              });
            }
          );
        } catch (error) {
          console.error("[Location] Error:", error?.message);
          Alert.alert("Location Error", "Using fallback location.");
          setCurrentLocation({
            latitude: -33.8688,
            longitude: 151.2093,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        }
      };

      load();

      return () => {
        if (locationSubscription) locationSubscription.remove();
      };
    }, [router])
  );
  

  useEffect(() => {
    if (isSearching) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(loadingAnimation, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(loadingAnimation, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      loadingAnimation.setValue(0);
    }
  }, [isSearching, loadingAnimation]);

  // Cleanup searchTimer on unmount
  useEffect(() => {
    return () => {
      if (searchTimer) clearInterval(searchTimer);
    };
  }, [searchTimer]);

  const handleLogout = async () => {
    console.log("[Auth] Logging out");
    await AsyncStorage.removeItem("user");
    router.replace("/login");
  };

  const handleFindCompanion = async () => {
    console.log("[Trip] Create trip request");
    const storedUser = await AsyncStorage.getItem("user");
    const tokenFromStorage = await AsyncStorage.getItem("token");
    if (!storedUser) {
      router.replace("/login");
      return;
    }

    const parsed = JSON.parse(storedUser);
    const token = tokenFromStorage || parsed?.token;
    if (!token) {
      Alert.alert("Not Authenticated", "Please login again.");
      router.replace("/login");
      return;
    }

    if (!parsed.isVerified) {
      setModalVisible(true);
      return;
    }

    try {
      // BASE_URL already ends with /
      const response = await fetch(`${BASE_URL}api/v1/trip/createTripReq`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user: {
            userId: parsed._id,
            userName: parsed.userName,
            userImage: parsed.userImage || "default.jpg",
          },
          destination: "Placeholder",
          destinationType: "By Walk",
          date: new Date(),
          time: "12:00",
          genderPreference: "any",
        }),
      });

      const result = await response.json();
      if (response.ok && result?.data?.tripRequest?.tripReqId) {
        console.log("[Trip] Created:", result.data.tripRequest.tripReqId);
        setCurrentTripRequestId(result.data.tripRequest.tripReqId);
        setConsentVisible(true); // proceed to Consent
      } else {
        throw new Error(result?.message || `Trip request failed (${response.status})`);
      }
    } catch (error) {
      console.log("[Trip] Error:", error?.message);
      Alert.alert("Error", error.message || "Failed to create trip request.");
    }
  };

  const handlePhotoSubmit = async (url) => {
    if (!currentTripRequestId) {
      Alert.alert("Error", "No active trip request found.");
      return;
    }

    try {
      const storedUser = await AsyncStorage.getItem("user");
      const tokenFromStorage = await AsyncStorage.getItem("token");
      if (!storedUser) {
        Alert.alert("Error", "User not logged in.");
        router.replace("/login");
        return;
      }

      const parsed = JSON.parse(storedUser);
      const token = tokenFromStorage || parsed?.token;
      if (!token) {
        Alert.alert("Not Authenticated", "Please login again.");
        router.replace("/login");
        return;
      }

      const formData = new FormData();
      formData.append("photo", {
        uri: url,
        type: "image/jpeg",
        name: `selfie-${Date.now()}.jpg`,
      });

      const response = await fetch(
        `${BASE_URL}/api/v1/trip/upload-photo/${currentTripRequestId}`,
        {
          method: "POST",
          body: formData,
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const result = await response.json();
      if (response.ok && result?.status === "success") {
        console.log("[Photo] Uploaded:", result.data.photoUrl);
        setPhotoUrl(result.data.photoUrl);
        setPhotoUploadVisible(false);
        setPreferencesVisible(true); // next: Preferences
      } else {
        throw new Error(result?.message || "Failed to upload photo");
      }
    } catch (error) {
      console.log("[Photo] Error:", error?.message);
      Alert.alert("Error", error.message || "Failed to upload photo.");
    }
    if (response.ok && result?.status === "success") {
      console.log("[Photo] Uploaded:", result.data.photoUrl);
      setPhotoUrl(result.data.photoUrl);
      setPhotoUploadVisible(false);
      setPreferencesVisible(true);

      // Trigger backend verification flag
      try {
        const verifyRes = await fetch(`${BASE_URL}/api/v1/user/verify`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ isVerified: true }),
        });
        const verifyData = await verifyRes.json();
        if (verifyRes.ok) {
          console.log("[Verify] User marked as verified:", verifyData?.data?.user?.userName);
          // Also sync AsyncStorage so profile & home both see the update
          await AsyncStorage.setItem("user", JSON.stringify(verifyData.data.user));
          setUser(verifyData.data.user);
        } else {
          console.warn("[Verify] Failed to set verified:", verifyData?.message);
        }
      } catch (err) {
        console.error("[Verify] Error:", err.message);
      }
    }

  };

  const handlePreferencesSubmit = async (preferences) => {
    try {
      console.log("[Prefs] Start:", preferences.startCoordinates, "Dest:", preferences.destinationCoordinates);
      setStartMarker(preferences.startCoordinates);
      setEndMarker(preferences.destinationCoordinates);

      // radius & dummy users
      setShowRadius(true);
      const users = generateDummyUsers(
        preferences.startCoordinates,
        500,
        3 + Math.floor(Math.random() * 3)
      );
      setDummyUsers(users);
      setNearbyUsers(users.length);

      // Generate route coordinates using Google Directions API
      const GOOGLE_MAPS_API_KEY =
        Constants.expoConfig.android.config.googleMaps.apiKey;
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${preferences.startCoordinates.latitude},${preferences.startCoordinates.longitude}&destination=${preferences.destinationCoordinates.latitude},${preferences.destinationCoordinates.longitude}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.routes && data.routes[0]) {
        const points = data.routes[0].overview_polyline.points;
        const coords = decodePolyline(points);
        const validCoords = coords.filter(
          (coord) =>
            coord.latitude >= -90 &&
            coord.latitude <= 90 &&
            coord.longitude >= -180 &&
            coord.longitude <= 180
        );
        console.log("[Directions] Points:", validCoords.length);
        setRouteCoordinates(validCoords);
        if (validCoords.length > 0) {
          mapRef.current?.fitToCoordinates(validCoords, {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true,
          });
        }
        startSearching();
      } else {
        console.log("[Directions] No route found. Status:", data?.status);
        Alert.alert("Error", "No route found between the selected locations");
      }
    } catch (error) {
      console.log("[Directions] Fetch error:", error);
      Alert.alert("Error", "Failed to fetch route information");
    }
  };

  const decodePolyline = (encoded) =>
    polyline.decode(encoded).map(([latitude, longitude]) => ({ latitude, longitude }));

  const generateDummyUsers = (
    centerLocation,
    radiusMeters = 500,
    numUsers = 4
  ) => {
    const users = [];
    const earthRadius = 6371000; // meters
    for (let i = 0; i < numUsers; i++) {
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * radiusMeters;
      const deltaLat =
        ((distance * Math.cos(angle)) / earthRadius) * (180 / Math.PI);
      const deltaLng =
        ((distance * Math.sin(angle)) /
          (earthRadius * Math.cos((centerLocation.latitude * Math.PI) / 180))) *
        (180 / Math.PI);
      users.push({
        id: `dummy-${i}`,
        coordinate: {
          latitude: centerLocation.latitude + deltaLat,
          longitude: centerLocation.longitude + deltaLng,
        },
      });
    }
    return users;
  };

  const startSearching = () => {
    console.log("[Search] Start polling nearby users…");
    setIsSearching(true);
    const timer = setInterval(() => {
      const newCount = Math.floor(Math.random() * 3) + 2; // 2–4 users
      setNearbyUsers(newCount);
      if (startMarker)
        setDummyUsers(generateDummyUsers(startMarker, 500, newCount));
      if (startMarker) setDummyUsers(generateDummyUsers(startMarker, 500, newCount));
      console.log("[Search] Nearby users ~", newCount);
    }, 3000);
    setSearchTimer(timer);
  };

  const cancelSearch = () => {
    console.log("[Search] Cancel");
    if (searchTimer) clearInterval(searchTimer);
    setIsSearching(false);
    setNearbyUsers(0);
    setDummyUsers([]);
    setRouteCoordinates([]);
    setStartMarker(null);
    setEndMarker(null);
  };

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

  const handleSendRequest = async (selUser) => {
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
      const tokenFromStorage = await AsyncStorage.getItem("token");
      if (!storedUser) {
        Alert.alert("Error", "User not logged in.");
        router.replace("/login");
        return;
      }
      const parsed = JSON.parse(storedUser);
      const token = tokenFromStorage || parsed?.token;
      if (!token) {
        Alert.alert("Not Authenticated", "Please login again.");
        router.replace("/login");
        return;
      }

      const response = await fetch(`${BASE_URL}/api/v1/trip-request/sendRequest`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          senderId: parsed._id,
          receiverId: selUser.userName,
          consent,
          preferences: { gender: parsed.genderPreference || "any" },
          photoUrl,
        }),
      });

      const result = await response.json();
      if (response.ok && result?.status === "success") {
        console.log("[Request] Sent to", selUser.userName);
        Alert.alert("Success", "Request sent to " + selUser.userName);
        setSelectedUser(null);
      } else {
        throw new Error(result?.message || "Failed to send request");
      }
    } catch (error) {
      console.log("[Request] Error:", error?.message);
      Alert.alert("Error", error.message || "Failed to send request.");
    }
  };
 
  const handleCurrentLocation = async () => {
    try {
      console.log("[Map] Fetching current location…");

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("[Map] Permission denied → fallback");
        Alert.alert(
          "Location Permission Denied",
          "Please enable location services in your device settings."
        );
        setCurrentLocation({
          latitude: -33.8688,
          longitude: 151.2093,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        return;
      }

      // Fetch latest location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
        timeout: 10000,
        mayShowUserSettingsDialog: true,
      });

      console.log("[Map] Button pressed → GPS:", location.coords);

      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setCurrentLocation(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);

    } catch (error) {
      console.error("[Map] Error fetching location:", error?.message);
      Alert.alert("Location Error", "Could not fetch current GPS position.");
    }
  };
  
  const onToggleAvailability = async (newValue) => {
    const prev = availability;
    setAvailability(newValue);
    setSavingAvailability(true);

    try {
      const [token, rawUser] = await Promise.all([
        AsyncStorage.getItem("token"),
        AsyncStorage.getItem("user"),
      ]);
      const parsedUser = rawUser ? JSON.parse(rawUser) : null;
      const bearer = token || parsedUser?.token;
      if (!bearer) throw new Error("Not authenticated");

      const res = await fetch(`${BASE_URL}/api/v1/user/availability`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${bearer}`,
        },
        body: JSON.stringify({ availability: newValue }),
      });

      const data = await res.json();
      if (!res.ok || data?.status !== "success") {
        throw new Error(data?.message || `HTTP ${res.status}`);
      }

      if (data?.data?.user) {
        await AsyncStorage.setItem("user", JSON.stringify(data.data.user));
        setUser(data.data.user);
        console.log("[Availability] Updated:", newValue);
      }
    } catch (err) {
      console.log("[Availability] Error:", err?.message);
      setAvailability(prev); // rollback on failure
      Alert.alert("Couldn’t update status", err?.message ?? "Please try again.");
    } finally {
      setSavingAvailability(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.logoContainer}>
          <Image
            source={Colors === "light" ? logoBlue : logoDark}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.titleContainer}>
          <ThemedText type="title" style={styles.titleText}>
            BeSide
          </ThemedText>
        </View>

        {/* Location button */}
        <TouchableOpacity
          style={[styles.topIconButton, { backgroundColor: "#fceaea" }]}
          onPress={handleCurrentLocation}
          accessibilityRole="button"
          accessibilityLabel="Show Current Location"
        >
          <Ionicons name="location" size={30} color="#e63946" />
        </TouchableOpacity>

        {/* Availability toggle */}
        <TouchableOpacity
          style={[
            styles.topIconButton,
            { backgroundColor: availability ? "#e6f8f1" : "#f0f0f0" },
          ]}
          onPress={() => setAvailabilityModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Toggle availability"
        >
          <Ionicons
            name={availability ? "toggle" : "toggle-outline"}
            size={34}
            color={availability ? "#2ca07b" : "#999"}
          />
        </TouchableOpacity>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        {currentLocation ? (
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            mapType="standard"
            style={styles.map}
            showsUserLocation
            followsUserLocation
            region={currentLocation}
            mapPadding={{ top: 60, right: 20, bottom: 140, left: 0 }}
          >
            {/* Current location marker */}
            <Marker coordinate={currentLocation}>
              <Callout>
                <View style={{ width: 140 }}>
                  <ThemedText type="defaultSemiBold">You are here</ThemedText>
                  <ThemedText type="caption">Live GPS location</ThemedText>
                </View>
              </Callout>
            </Marker>

            {/* Start / End markers */}
            {startMarker && (
              <Marker coordinate={startMarker}>
                <MaterialCommunityIcons name="map-marker" size={30} color="#4CAF50" />
              </Marker>
            )}
            {endMarker && (
              <Marker coordinate={endMarker}>
                <MaterialCommunityIcons name="map-marker" size={30} color="#F44336" />
              </Marker>
            )}

            {/* Route polyline */}
            {routeCoordinates.length > 0 && (
              <Polyline coordinates={routeCoordinates} strokeWidth={4} strokeColor="#2196F3" />
            )}

            {/* Radius */}
            {showRadius && startMarker && (
              <Circle
                center={startMarker}
                radius={500}
                strokeColor="rgba(158, 158, 255, 0.5)"
                fillColor="rgba(158, 158, 255, 0.2)"
              />
            )}

            {/* Dummy users */}
            {dummyUsers.map((u) => (
              <Marker key={u.id} coordinate={u.coordinate}>
                <MaterialCommunityIcons name="account" size={24} color="#FF5722" />
              </Marker>
            ))}

            {/* Hardcoded users */}
            {hardcodedUsers.map((u, index) => {
              const distance = calculateDistance(
                currentLocation.latitude,
                currentLocation.longitude,
                u.latitude,
                u.longitude
              );
              return (
                <Marker
                  key={index}
                  coordinate={{ latitude: u.latitude, longitude: u.longitude }}
                  title={u.userName}
                  onPress={() => setSelectedUser({ ...u, distance })}
                />
              );
            })}
          </MapView>
        ) : (
          <ThemedText type="default">Loading map...</ThemedText>
        )}
      </View>
      {/* Searching Overlay */}
      {isSearching && (
        <View style={styles.searchingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <ThemedText type="defaultSemiBold" style={{ marginTop: 10 }}>
            Searching for companions...
          </ThemedText>
          <ThemedText type="caption">
            {nearbyUsers > 0
              ? `${nearbyUsers} people found nearby`
              : "Looking for people in your area..."}
          </ThemedText>
          <ThemedButton
            title="Cancel Search"
            onPress={cancelSearch}
            style={[styles.cardButton, { backgroundColor: Colors.light.danger, marginTop: 10 }]}
          />
        </View>
      )}

      {/* Find Companion button */}
      <View style={styles.findCompanionContainer}>

        <TouchableOpacity
          style={styles.findButton}
          onPress={handleFindCompanion}
          accessibilityLabel="Find a Companion"
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="account-search-outline" size={32} color="#fff" />
          <ThemedText style={styles.navLabel}>Find</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Bottom Navigation Bar */}
      <View style={styles.navContainer}>
        <View style={styles.navBar}>
          {/* Profile */}
          <TouchableOpacity style={styles.navButton} onPress={() => router.push("/profile")}>
            <Ionicons name="person-circle-outline" size={24} color="#fff" />
            <ThemedText style={styles.navLabel}>Profile</ThemedText>
          </TouchableOpacity>

          {/* Contacts */}
          <TouchableOpacity style={styles.navButton} onPress={openContacts}>
            <Ionicons name="people-outline" size={24} color="#fff" />
            <ThemedText style={styles.navLabel}>Contacts</ThemedText>
          </TouchableOpacity>

          {/* SOS */}
          <TouchableOpacity style={styles.navButton} onPress={handleSOS}>
            <Ionicons name="alert" size={24} color="#fff" />
            <ThemedText style={styles.navLabel}>SOS</ThemedText>
          </TouchableOpacity>

          {/* More */}
          <TouchableOpacity style={styles.navButton} onPress={() => setMenuVisible(true)}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
            <ThemedText style={styles.navLabel}>More</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Emergency Contacts Modal */}
      <Modal transparent animationType="fade" visible={contactsVisible} onRequestClose={() => setContactsVisible(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setContactsVisible(false)} />
        <View style={styles.contactsBox}>
          <ThemedText type="defaultSemiBold">Emergency Contacts</ThemedText>
          {emergencyContacts.length === 0 ? (
            <ThemedText type="caption">No contacts saved.</ThemedText>
          ) : (
            emergencyContacts.map((c, i) => (
              <View key={i} style={styles.contactRow}>
                <ThemedText type="defaultSemiBold">{c.name}</ThemedText>
                <ThemedText type="caption">{c.phone}</ThemedText>
                <TouchableOpacity onPress={() => callContact(c.phone)}>
                  <Ionicons name="call" size={18} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => smsContact(c.phone)}>
                  <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </Modal>
      {/* Selected User Card Modal */}
      {selectedUser && (
        <Modal transparent animationType="slide" visible={!!selectedUser} onRequestClose={() => setSelectedUser(null)}>
          <View style={styles.popupOverlay}>
            <View style={styles.userCard}>
              {selectedUser?.userImage && (
                <Image source={selectedUser.userImage} style={styles.userImage} resizeMode="cover" />
              )}
              <ThemedText type="subtitle">{selectedUser?.userName}</ThemedText>
              <ThemedText type="caption">
                Distance: {(selectedUser?.distance || 0).toFixed(2)} km
              </ThemedText>
              <ThemedText type="caption">
                Gender Preference: {selectedUser?.genderPreference}
              </ThemedText>
              <ThemedButton
                title="Send Request"
                onPress={() => handleSendRequest(selectedUser)}
                style={styles.cardButton}
              />
              <ThemedButton
                title="Close"
                onPress={() => setSelectedUser(null)}
                style={[styles.cardButton, { backgroundColor: Colors.light.danger }]}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* More Menu Modal */}
      <Modal transparent animationType="fade" visible={menuVisible} onRequestClose={() => setMenuVisible(false)}>

        <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)} />
        <View style={styles.menuBox}>
          <TouchableOpacity onPress={() => { setMenuVisible(false); router.push("/settings"); }}>
            <ThemedText style={styles.menuItem}>⚙️ Settings</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setMenuVisible(false); router.push("/help"); }}>
            <ThemedText style={styles.menuItem}>❓ Help</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setMenuVisible(false); handleLogout(); }}>
            <ThemedText style={[styles.menuItem, { color: Colors.light.danger }]}>🚪 Logout</ThemedText>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Consent / Preferences / Photo Upload */}
      <ConsentModal
        visible={consentVisible}
        onClose={() => setConsentVisible(false)}
        consent={consent}
        setConsent={setConsent}
        onSubmit={() => { setConsentVisible(false); setPhotoUploadVisible(true); }}
      />
      <CompanionPreferencesModal
        visible={preferencesVisible}
        onClose={() => setPreferencesVisible(false)}
        onSubmit={handlePreferencesSubmit}
      />
      <PhotoUploadModal
        visible={photoUploadVisible}
        onClose={() => setPhotoUploadVisible(false)}
        onSubmit={handlePhotoSubmit}
      />

      {/* Availability Confirmation Modal */}
      <Modal
        transparent
        animationType="fade"
        visible={availabilityModalVisible}
        onRequestClose={() => setAvailabilityModalVisible(false)}
      >
        <View style={styles.popupOverlay}>
          <View style={styles.popupBox}>
            <ThemedText type="subtitle">Availability</ThemedText>
            <ThemedText type="default" style={{ textAlign: "center", marginVertical: 12 }}>
              Do you want to {availability ? "become unavailable" : "become available"}?
            </ThemedText>
            <ThemedButton
              title={availability ? "Set Unavailable" : "Set Available"}
              onPress={() => {
                setAvailabilityModalVisible(false);
                onToggleAvailability(!availability);
              }}
              style={{ marginTop: 10, width: "80%" }}
            />
            <ThemedButton
              title="Cancel"
              type="secondary"
              onPress={() => setAvailabilityModalVisible(false)}
              style={{ marginTop: 10, width: "80%" }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );


};

const styles = StyleSheet.create({
  container: { flex: 1 },

  // --- Top Bar ---
  topBar: {
    backgroundColor: Colors.light.surface,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.08)",
    justifyContent: "space-between",
  },
  logoContainer: {
    padding: 4,
    marginLeft: 5,
  },
  logo: {
    width: 50,
    height: 70,
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
  },
  titleText: {
    fontSize: 22,
    fontWeight: "bold",
  },
  topIconButton: {
    padding: 10,
    borderRadius: 12,
    marginHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 44,
    minHeight: 44,
  },
  searchingContainer: {
    position: "absolute",
    bottom: 180,
    left: 20,
    right: 20,
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },

  // --- Map ---
  mapContainer: { flex: 1 },
  map: { width: "100%", height: "100%" },
  markerContainer: { alignItems: "center", justifyContent: "center" },
  userMarkerContainer: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 5,
    borderWidth: 2,
    borderColor: "#FF5722",
  },

  // --- Find Companion Button ---
  findCompanionContainer: {
    position: "absolute",
    bottom: 90,
    alignSelf: "center",
    zIndex: 10,
  },
  findButton: {
    width: 100,
    height: 60,
    borderRadius: 90,
    backgroundColor: "#2ca07b",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6, // Android shadow
    shadowColor: "#000", // iOS shadow
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 3.5,
    borderWidth: 3,
    borderColor: "#fff",
    flexDirection: "row",
    gap: 6,
  },

  // --- Bottom Navigation ---
  navContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
  },
  navBar: {
    flexDirection: "row",
    backgroundColor: Colors.light.primary,
    width: "100%",
    height: 70,
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 0,
    borderTopWidth: 1,
    borderTopColor: Colors.light.info,
  },
  navButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  navLabel: {
    color: "#fff",
    fontSize: 12,
    marginTop: 4,
  },

  // --- Modals & Popups ---
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
  verifyButton: { marginTop: 20, width: "80%" },
  userCard: {
    backgroundColor: Colors.light.surface,
    padding: 20,
    borderRadius: 14,
    width: width * 0.8,
    alignItems: "center",
  },
  cardButton: { marginTop: 10, width: "80%" },
  userImage: { width: 80, height: 80, borderRadius: 40, marginBottom: 10 },

  // --- Emergency Contacts ---
  menuOverlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  contactsBox: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 280,
    backgroundColor: Colors.light.surface,
    padding: 16,
    borderLeftWidth: 1,
    borderLeftColor: "rgba(0,0,0,0.1)",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  smallBtn: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginLeft: 6,
  },

  // --- More Menu ---
  menuBox: {
    position: "absolute",
    bottom: 80,
    right: 20,
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 12,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  menuItem: {
    paddingVertical: 10,
    fontSize: 16,
  },
});
