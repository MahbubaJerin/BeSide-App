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
import TripHistoryModal from "@/components/TripHistoryModal";
import EnhancedConsentModal from "@/components/EnhancedConsentModal";
import TwoStepTripModal from "@/components/TwoStepTripModal";
import { usePersistentSearch } from "@/hooks/usePersistentSearch";
import RequestNotificationModal from "@/components/RequestNotificationModal";
import SenderAcceptanceNotificationModal from "@/components/SenderAcceptanceNotificationModal";
import ActiveMatchModal from "@/components/ActiveMatchModal";
import BeSideLogo from "../assets/images/BeSide.png";
import { BASE_URL } from "../config";
import { useRequestPolling } from "../hooks/useRequestPolling";
import { useActiveMatches } from "../hooks/useActiveMatches";
import { useTripNotifications } from "../hooks/useTripNotifications";
import { useRouteCalculation } from "../hooks/useRouteCalculation";
import { useRealTimeUpdates } from "../hooks/useRealTimeUpdates";

// Enhanced Google Maps functionality
import { useLocationStore } from "../store/locationStore";
import GooglePlacesInput from "../components/GooglePlacesInput";
import NavigationIntegration from "../components/NavigationIntegration";

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
  const [tripHistoryVisible, setTripHistoryVisible] = useState(false);
  const [enhancedConsentVisible, setEnhancedConsentVisible] = useState(false);
  const [twoStepTripVisible, setTwoStepTripVisible] = useState(false);
  const [navigationVisible, setNavigationVisible] = useState(false);
  const [activeTripMatch, setActiveTripMatch] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Enhanced persistent search hook
  const persistentSearch = usePersistentSearch();
  const [requestNotificationVisible, setRequestNotificationVisible] = useState(false);
  const [activeMatchModalVisible, setActiveMatchModalVisible] = useState(false);
  const [senderAcceptanceVisible, setSenderAcceptanceVisible] = useState(false);
  const [acceptanceData, setAcceptanceData] = useState(null);

  const [consent, setConsent] = useState({ noTouch: false, respectful: false, safety: false });
  const [photoUrl, setPhotoUrl] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [startMarker, setStartMarker] = useState(null);
  const [endMarker, setEndMarker] = useState(null);
  const [currentNavigationRoute, setCurrentNavigationRoute] = useState(null);
  const [arrivalStatus, setArrivalStatus] = useState({
    isNearMeetingPoint: false,
    hasArrivedAtMeetingPoint: false,
    distanceToMeetingPoint: null,
    canStartFinalJourney: false,
    bothUsersArrived: false
  });

  const [tripStatus, setTripStatus] = useState({
    userReady: false,
    bothUsersReady: false,
    tripStarted: false
  });

  const loadingAnimation = useRef(new Animated.Value(0)).current;
  const mapRef = useRef(null);
  const [currentTripRequestId, setCurrentTripRequestId] = useState(null);
  const [showRadius, setShowRadius] = useState(false);

  // hooks
  const locationTracking = useLocationTracking();
  const companionSearch = useCompanionSearch();
  const requestPolling = useRequestPolling(5000, true); // Poll every 5 seconds for incoming requests
  const activeMatches = useActiveMatches(15000); // Poll for matches every 15 seconds
  const tripNotifications = useTripNotifications();
  const realTimeUpdates = useRealTimeUpdates();
  const { 
    openGoogleMapsNavigation, 
    getNavigationInstructions,
    calculateDistance,
    checkArrivalAtMeetingPoint 
  } = useRouteCalculation();

  // State for sender notifications
  const [senderRequestStatus, setSenderRequestStatus] = useState(null);

  // Safe modal management functions
  const safeCloseModal = useCallback((modalSetter) => {
    try {
      if (isMounted.current) {
        modalSetter(false);
      }
    } catch (error) {
      console.error('Error closing modal:', error);
    }
  }, []);

  const resetAllModals = useCallback(() => {
    try {
      if (!isMounted.current) return;
      
      setModalVisible(false);
      setPhotoUploadVisible(false);
      setConsentVisible(false);
      setPreferencesVisible(false);
      setSentRequestStatusVisible(false);
      setTripHistoryVisible(false);
      setEnhancedConsentVisible(false);
      setTwoStepTripVisible(false);
      setRequestNotificationVisible(false);
      setActiveMatchModalVisible(false);
      setAvailabilityModalVisible(false);
    } catch (error) {
      console.error('Error resetting modals:', error);
    }
  }, []);

  // Force close notification modal function
  const forceCloseNotificationModal = useCallback(() => {
    setRequestNotificationVisible(false);
  }, []);

  const handleNotificationRouteUpdate = useCallback(
    (routeInfo) => {
      if (!routeInfo) return;

      const normalizePoint = (point) =>
        point && typeof point.latitude === "number" && typeof point.longitude === "number"
          ? { latitude: point.latitude, longitude: point.longitude, address: point.address }
          : null;

      const routePoints = Array.isArray(routeInfo.routeCoordinates)
        ? routeInfo.routeCoordinates.filter(
            (coord) =>
              coord &&
              typeof coord.latitude === "number" &&
              typeof coord.longitude === "number"
          )
        : [];

      setRouteCoordinates(routePoints);

      const meetingSource =
        routeInfo.meetingPoint?.location ||
        routeInfo.meetingPoint ||
        routeInfo.startLocation;
      const meetingPoint = normalizePoint(meetingSource);

      if (meetingPoint) {
        setStartMarker({
          latitude: meetingPoint.latitude,
          longitude: meetingPoint.longitude,
          address:
            routeInfo.meetingPoint?.address ||
            routeInfo.startLocation?.address ||
            meetingPoint.address ||
            "Meeting Point",
        });
      } else {
        setStartMarker(null);
      }

      const destinationPoint = normalizePoint(routeInfo.destinationLocation);
      if (destinationPoint) {
        setEndMarker({
          latitude: destinationPoint.latitude,
          longitude: destinationPoint.longitude,
          address: destinationPoint.address || "Destination",
        });
      } else {
        setEndMarker(null);
      }

      const receiverPoint =
        normalizePoint(routeInfo.receiverLocation) ||
        normalizePoint(currentLocation);

      const fitTargets = [];
      if (routePoints.length) {
        fitTargets.push(...routePoints);
      }
      if (meetingPoint) {
        fitTargets.push({
          latitude: meetingPoint.latitude,
          longitude: meetingPoint.longitude,
        });
      }
      if (destinationPoint) {
        fitTargets.push({
          latitude: destinationPoint.latitude,
          longitude: destinationPoint.longitude,
        });
      }
      if (receiverPoint) {
        fitTargets.push({
          latitude: receiverPoint.latitude,
          longitude: receiverPoint.longitude,
        });
      }

      if (fitTargets.length >= 2 && mapRef.current?.fitToCoordinates) {
        mapRef.current.fitToCoordinates(fitTargets, {
          edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
          animated: true,
        });
      }

      setCurrentNavigationRoute({
        origin: receiverPoint || undefined,
        destination: destinationPoint
          ? { latitude: destinationPoint.latitude, longitude: destinationPoint.longitude }
          : undefined,
        destinationAddress: destinationPoint?.address || "Destination",
        meetingPoint: meetingPoint
          ? { latitude: meetingPoint.latitude, longitude: meetingPoint.longitude }
          : undefined,
        meetingPointAddress:
          routeInfo.meetingPoint?.address ||
          routeInfo.startLocation?.address ||
          meetingPoint?.address ||
          "Meeting Point",
        routeInfo: {
          coordinates: routePoints,
          transportMode: routeInfo.transportMode || "walking",
        },
        type: "accepted-route",
        tripMatchId: routeInfo.tripMatch?.matchId,
      });

      setShowRadius(true);
    },
    [currentLocation]
  );

  // Sender request status polling is now handled in useEffect

  const currentLocation = locationTracking.currentLocation;
  const isSearching = companionSearch.isSearching;
  const companions = companionSearch.companions;
  const searchRadius = companionSearch.searchRadius;

  // Sync location with location store for Google Maps integration
  useEffect(() => {
    if (currentLocation) {
      const { setUserLocation } = useLocationStore.getState();
      setUserLocation({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        address: 'Current location'
      });
    }
  }, [currentLocation]);

  // Get the current active request from matches - using the getActiveRequest method
  const [activeRequest, setActiveRequest] = useState(null);
  
  // Update active request when matches change - with debouncing to avoid excessive calls
  useEffect(() => {
    const updateActiveRequest = async () => {
      if (activeMatches?.getActiveRequest && isMounted.current) {
        try {
          const request = await activeMatches.getActiveRequest();
          if (isMounted.current) {
            setActiveRequest(request);
          }
        } catch (error) {
          console.error('Error getting active request:', error);
          if (isMounted.current) {
            setActiveRequest(null);
          }
        }
      }
    };
    
    // Debounce the call to avoid excessive requests
    const timeoutId = setTimeout(updateActiveRequest, 1000);
    return () => clearTimeout(timeoutId);
  }, [activeMatches?.matches?.length]); // Only trigger when matches count changes

  // Auto-open active match modal when new matches are detected (for sender when request is accepted)
  const [previousMatchCount, setPreviousMatchCount] = useState(0);
  
  useEffect(() => {
    const currentMatchCount = activeMatches?.matches?.length || 0;
    
    // Show success when new matches are detected
    if (currentMatchCount > previousMatchCount && currentMatchCount > 0 && isMounted.current) {
      setRequestNotificationVisible(false);
      setSentRequestStatusVisible(false);
      
      Alert.alert(
        "Match Created! 🎉",
        "You've successfully matched with a companion! Your trip routes and meeting point are now displayed on the map.",
        [{ text: "Great!" }]
      );
    }
    
    if (isMounted.current) {
      setPreviousMatchCount(currentMatchCount);
    }
  }, [activeMatches?.matches?.length]); // Removed previousMatchCount dependency to prevent loops

  // Handle real-time events for active matches
  useEffect(() => {
    if (!activeMatches?.handleTripEvent) return;

    // Listen to real-time events
    const handleRealtimeEvent = (eventType, eventData) => {
      console.log('🏠 [HOME] Real-time event received:', eventType, eventData);
      
      // Pass events to active matches handler
      activeMatches.handleTripEvent(eventType, eventData);
      
      // Handle specific events for UI updates
      switch (eventType) {
        case 'request_response':
          if (eventData.response === 'accepted') {
            // New match created - show sender acceptance modal
            const modalData = {
              receiverName: eventData.responderName,
              receiverPhoto: eventData.responderPhoto,
              receiverLocation: eventData.receiverLocation,
              destination: eventData.destination,
              transportMode: eventData.transportMode
            };
            setAcceptanceData(modalData);
            setSenderAcceptanceVisible(true);
          } else if (eventData.response === 'declined') {
            // Request declined - show brief notification
            setTimeout(() => {
              Alert.alert(
                "Request Update",
                eventData.detailedMessage,
                [{ text: "OK" }]
              );
            }, 500);
          }
          break;
          
        case 'request_status_update':
          // Show status updates to sender (request sent, awaiting responses, etc.)
          if (eventData.status === 'request_sent') {
            setTimeout(() => {
              Alert.alert(
                "Request Sent 📤",
                eventData.detailedMessage,
                [
                  { text: "View Status", onPress: () => setSentRequestModalVisible(true) },
                  { text: "OK" }
                ]
              );
            }, 1000);
          }
          break;
          
        case 'meeting_point_set':
          Alert.alert(
            "Meeting Point Set 📍",
            `${eventData.setByName} set the meeting point: ${eventData.meetingPoint?.name}`,
            [{ text: "OK" }]
          );
          break;
          
        case 'trip_started':
          Alert.alert(
            "Trip Started 🚀",
            eventData.message,
            [{ text: "OK" }]
          );
          break;
          
        case 'trip_cancelled':
          Alert.alert(
            "Trip Cancelled ❌",
            eventData.message,
            [{ text: "OK" }]
          );
          break;
      }
    };

    // Since real-time updates are handled in the useRealTimeUpdates hook,
    // we need to find a way to connect them. For now, we'll let the polling handle updates
    // This is a placeholder for when real-time integration is fully connected

    return () => {
      // Cleanup if needed
    };
  }, [activeMatches?.handleTripEvent]);

  // Clear active matches on logout
  useEffect(() => {
    const clearMatchesOnLogout = async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token && activeMatches?.clearMatches) {
        activeMatches.clearMatches();
      }
    };
    
    clearMatchesOnLogout();
  }, [activeMatches?.clearMatches]);

  // Poll sender status when there's an active trip request
  useEffect(() => {
    if (!currentTripRequestId) return;

    // Define polling function inside useEffect to avoid stale closure issues
    const pollStatus = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) return;

        const API_URL = BASE_URL.replace(/\/+$/, "");
        const response = await fetch(`${API_URL}/api/v1/trip/sent-requests-status`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.ok) {
          const result = await response.json();
          const myRequest = result.data.requests.find(req => req.tripReqId === currentTripRequestId);
          
          if (myRequest && myRequest.status !== senderRequestStatus?.status) {
            // Only update state if component is still mounted
            if (isMounted.current) {
              setSenderRequestStatus(myRequest);
              
              // Show notification if status changed
              if (myRequest.status === 'accepted') {
                Alert.alert(
                  "Request Accepted! 🎉",
                  `${myRequest.acceptedBy?.userName || 'Someone'} has accepted your companion request! You can now set a meeting point.`,
                  [{ text: "OK" }]
                );
              }
            }
          }
        }
      } catch (error) {
        console.error('Error polling sender status:', error);
      }
    };

    // Poll immediately
    pollStatus();

    // Then poll every 15 seconds while request is active
    const pollInterval = setInterval(pollStatus, 15000);
    
    return () => clearInterval(pollInterval);
  }, [currentTripRequestId]); // Removed pollSenderStatus dependency

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        try {
          const stored = await AsyncStorage.getItem("user");
          if (stored) {
            const parsed = JSON.parse(stored);
            setUser(parsed);
            await locationTracking.startTracking(true);
          } else {
            router.replace("/login");
          }
        } catch (error) {
          console.error('Error loading user data:', error);
          router.replace("/login");
        }
      };
      load();
      return () => {
        try {
          locationTracking.stopTracking();
          companionSearch.cleanup();
          resetAllModals(); // Ensure all modals are closed when leaving
        } catch (error) {
          console.error('Error during cleanup:', error);
        }
      };
    }, [resetAllModals])
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

  // Monitor distance to meeting point
  useEffect(() => {
    if (currentLocation && activeRequest?.meetingPointCoordinates) {
      const distance = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        activeRequest.meetingPointCoordinates.lat,
        activeRequest.meetingPointCoordinates.lng
      );

      const isNear = distance <= 50; // 50 meters threshold

      setArrivalStatus(prev => ({
        ...prev,
        isNearMeetingPoint: isNear,
        distanceToMeetingPoint: Math.round(distance),
      }));
    }
  }, [currentLocation, activeRequest?.meetingPointCoordinates]);

  const handleLogout = async () => {
    await AsyncStorage.removeItem("user");
    await AsyncStorage.removeItem("token");
    router.replace("/login");
  };

  const handleMarkArrived = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token || !activeRequest) return;

      // Mark this user as arrived at meeting point
      const response = await fetch(`${BASE_URL}/api/v1/trip/markArrived`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requestId: activeRequest._id,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        setArrivalStatus(prev => ({
          ...prev,
          hasArrivedAtMeetingPoint: true,
          bothUsersArrived: result.data.canStartFinalJourney || false
        }));
        
        Alert.alert(
          "Arrival Confirmed",
          result.data.canStartFinalJourney 
            ? "Both companions have arrived! You can now navigate to your final destination."
            : "You've marked yourself as arrived at the meeting point. Waiting for your companion to arrive.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("Error marking arrival:", error);
      Alert.alert("Error", "Failed to mark arrival. Please try again.");
    }
  };

  const handleStartTrip = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token || !activeRequest) return;

      // Mark this user as ready to start the trip
      const response = await fetch(`${BASE_URL}/api/v1/trip/startTrip`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requestId: activeRequest._id,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update local trip status
        setTripStatus({
          userReady: true,
          bothUsersReady: result.data.bothUsersReady,
          tripStarted: result.data.bothUsersReady
        });
        
        if (result.data.bothUsersReady) {
          // Both users are ready - show confirmation and start route
          Alert.alert(
            "Trip Started! 🚀",
            "Both companions are ready! Navigate together to your destination using Google Maps.",
            [
              {
                text: "Open Google Maps",
                onPress: () => handleStartFinalJourney()
              },
              { text: "OK" }
            ]
          );
        } else {
          Alert.alert(
            "Ready to Start! ✅",
            "You're ready to start the trip. Waiting for your companion to also press 'Start Trip'.",
            [{ text: "OK" }]
          );
        }
      }
    } catch (error) {
      console.error("Error starting trip:", error);
      Alert.alert("Error", "Failed to start trip. Please try again.");
    }
  };

  const handleStartFinalJourney = () => {
    if (activeRequest?.destinationLocation && currentLocation) {
      // Set up navigation to final destination
      setCurrentNavigationRoute({
        destination: {
          latitude: activeRequest.destinationLocation.latitude,
          longitude: activeRequest.destinationLocation.longitude
        },
        origin: currentLocation,
        destinationAddress: activeRequest.destinationLocation.address || activeRequest.destination,
        routeInfo: null,
        companion: null // No longer meeting, now traveling together
      });

      // Start route calculation to final destination - using navigation to Google Maps instead
      // since this is for the final journey together
      console.log('🚀 Starting final journey to destination');
    }
  };

  const handleCancelTrip = async () => {
    Alert.alert(
      "Cancel Trip?",
      "Are you sure you want to cancel this trip? This will notify your companion.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("token");
              if (!token || !activeRequest) return;

              const response = await fetch(`${BASE_URL}/api/v1/trip/cancelTrip`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  requestId: activeRequest._id,
                }),
              });

              if (response.ok) {
                Alert.alert(
                  "Trip Cancelled",
                  "The trip has been cancelled successfully. Your companion has been notified.",
                  [{ text: "OK" }]
                );
                
                // Reset all states
                setCurrentNavigationRoute(null);
                setRouteCoordinates([]);
                setStartMarker(null);
                setEndMarker(null);
                setActiveRequest(null);
                setArrivalStatus({
                  isNearMeetingPoint: false,
                  hasArrivedAtMeetingPoint: false,
                  distanceToMeetingPoint: null,
                  canStartFinalJourney: false,
                  bothUsersArrived: false
                });
                setTripStatus({
                  userReady: false,
                  bothUsersReady: false,
                  tripStarted: false
                });
              }
            } catch (error) {
              console.error("Error cancelling trip:", error);
              Alert.alert("Error", "Failed to cancel trip. Please try again.");
            }
          }
        }
      ]
    );
  };

  const handleEndTrip = async () => {
    Alert.alert(
      "End Trip?",
      "Are you sure you want to end this trip? This indicates you've reached your destination safely.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, End Trip",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("token");
              if (!token || !activeRequest) return;

              const response = await fetch(`${BASE_URL}/api/v1/trip/endTrip`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  requestId: activeRequest._id,
                }),
              });

              if (response.ok) {
                Alert.alert(
                  "Trip Completed! 🎉",
                  "Thank you for using our companion service! We hope you had a safe journey.",
                  [{ text: "OK" }]
                );
                
                // Reset all states
                setCurrentNavigationRoute(null);
                setRouteCoordinates([]);
                setStartMarker(null);
                setEndMarker(null);
                setActiveRequest(null);
                setArrivalStatus({
                  isNearMeetingPoint: false,
                  hasArrivedAtMeetingPoint: false,
                  distanceToMeetingPoint: null,
                  canStartFinalJourney: false,
                  bothUsersArrived: false
                });
                setTripStatus({
                  userReady: false,
                  bothUsersReady: false,
                  tripStarted: false
                });
              }
            } catch (error) {
              console.error("Error ending trip:", error);
              Alert.alert("Error", "Failed to end trip. Please try again.");
            }
          }
        }
      ]
    );
  };

  // ⬇️ CHANGED: no search starts here; only createTripReq + open modal
  const handleFindCompanion = async () => {
    try {
      console.log("🚀 [FIND COMPANION] Starting companion search flow...");
      const storedUser = await AsyncStorage.getItem("user");
      const token = await AsyncStorage.getItem("token");
      if (!storedUser || !token) {
        console.log("❌ [FIND COMPANION] No user/token found, redirecting to login");
        router.replace("/login");
        return;
      }
      const parsed = JSON.parse(storedUser);
      console.log("👤 [FIND COMPANION] User:", parsed.userName, "ID:", parsed._id);

      if (!parsed.isVerified) {
        console.log("⚠️ [FIND COMPANION] User not verified");
        setModalVisible(true);
        return;
      }
      if (!currentLocation) {
        console.log("❌ [FIND COMPANION] No current location");
        Alert.alert("Location Required", "Please enable location services to find companions.");
        return;
      }

      console.log("📍 [FIND COMPANION] Current location:", currentLocation);

      // 1) create trip request
      const API_URL = BASE_URL.replace(/\/+$/, "");
      console.log("📤 [CREATE REQUEST] Calling API:", `${API_URL}/api/v1/trip/createTripReq`);
      const response = await fetch(`${API_URL}/api/v1/trip/createTripReq`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user: { userId: parsed._id, userName: parsed.userName, userImage: parsed.userImage || "default.jpg" },
          destination: "Find Companion", // Will be updated with actual preferences
          destinationType: "By Walk", // Will be updated with actual preferences  
          date: new Date(),
          time: "12:00",
          genderPreference: "any", // Will be updated with actual preferences
          startLocation: {
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            address: "Current location"
          },
          destinationLocation: null, // Will be updated when preferences are submitted
          routeCoordinates: [], // Will be updated when route is calculated
          transportMode: "walking" // Will be updated when preferences are submitted
        }),
      });
      
      console.log("📥 [CREATE REQUEST] Response status:", response.status);
      const result = await response.json();
      console.log("📋 [CREATE REQUEST] Result:", JSON.stringify(result, null, 2));

      if (result.status !== "success") {
        console.log("❌ [CREATE REQUEST] Failed:", result.message);
        throw new Error(result.message || "Failed to create trip request");
      }
      
      const tripReqId = result.data.tripRequest.tripReqId;
      console.log("✅ [CREATE REQUEST] Success! Trip Request ID:", tripReqId);
      setCurrentTripRequestId(tripReqId);

      // 2) prompt consent -> selfie -> preferences
      console.log("📝 [FIND COMPANION] Opening consent modal...");
      setConsentVisible(true);

      // 3) DO NOT START SEARCH YET
      setShowRadius(false);
    } catch (e) {
      console.error("❌ [FIND COMPANION] Error:", e);
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
      console.log("📡 [SEND TO NEARBY] Starting...");
      const token = await AsyncStorage.getItem("token");
      const user = await AsyncStorage.getItem("user");

      if (!token || !currentTripRequestId) {
        console.log("❌ [SEND TO NEARBY] Missing token or trip request ID");
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

      console.log("📤 [SEND TO NEARBY] Request body:", JSON.stringify(requestBody, null, 2));
      console.log("📤 [SEND TO NEARBY] Calling API:", `${API_URL}/api/v1/trip/send-to-nearby`);

      const response = await fetch(`${API_URL}/api/v1/trip/send-to-nearby`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log("📥 [SEND TO NEARBY] Response status:", response.status);
      const result = await response.json();
      console.log("📋 [SEND TO NEARBY] Result:", JSON.stringify(result, null, 2));

      if (result.status === "success") {
        console.log(`✅ [SEND TO NEARBY] Success! Sent to ${result.data.recipientCount} users`);
        Alert.alert(
          "Request Sent! 🚀",
          `Your companion request has been sent to ${result.data.recipientCount} active users within 500m radius.\n\nThe request is valid for 30 minutes. You'll be notified when someone accepts your request.`,
          [{ text: "OK" }]
        );
        
        // Stop any searching animation since request is sent
        await companionSearch.stopSearch();
      } else {
        console.log("❌ [SEND TO NEARBY] Failed:", result.message);
        Alert.alert("API Error", result.message || "Failed to send request");
        throw new Error(result.message || "Failed to send request to nearby users");
      }
    } catch (error) {
      console.error("❌ [SEND TO NEARBY] Error:", error);
      Alert.alert("Debug Error", `Network/Parse Error: ${error.message}`);
    }
  };

  const handlePreferencesSubmit = async (preferences) => {
    try {
      setStartMarker(preferences.startCoordinates);
      setEndMarker(preferences.destinationCoordinates);
      setShowRadius(true);

      // Calculate route
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
      console.log('🗺️ [ROUTE CALC] Making Google Maps API call:', url);
      const response = await fetch(url);
      console.log('📡 [ROUTE CALC] Response status:', response.status);
      
      const data = await response.json();
      console.log('📊 [ROUTE CALC] Google Maps response:', JSON.stringify(data, null, 2));
      
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
        
        // Update trip request with route data for persistence
        if (currentTripRequestId && validCoords.length > 0) {
          console.log('📍 [ROUTE UPDATE] Updating trip request with route data:', {
            tripReqId: currentTripRequestId,
            routePoints: validCoords.length,
            transportMode: preferences.transport === "car" ? "driving" : 
                          preferences.transport === "walk" ? "walking" : "transit",
            startCoords: preferences.startCoordinates,
            destCoords: preferences.destinationCoordinates
          });
          
          await activeMatches.updateTripRequest(currentTripRequestId, {
            destination: preferences.destinationAddress || 'Destination',
            destinationType: preferences.transport === "car" ? "By Car" : 
                            preferences.transport === "walk" ? "By Walk" : "By Transit",
            routeCoordinates: validCoords,
            startLocation: {
              latitude: preferences.startCoordinates.latitude,
              longitude: preferences.startCoordinates.longitude,
              address: preferences.startAddress || 'Start location'
            },
            destinationLocation: {
              latitude: preferences.destinationCoordinates.latitude,
              longitude: preferences.destinationCoordinates.longitude,
              address: preferences.destinationAddress || 'Destination'
            },
            transportMode: preferences.transport === "car" ? "driving" : 
                          preferences.transport === "walk" ? "walking" : "transit"
          });
          
          console.log('✅ [ROUTE UPDATE] Trip request updated successfully');
        } else {
          console.warn('⚠️ [ROUTE UPDATE] Cannot update trip request:', {
            hasTripRequestId: !!currentTripRequestId,
            routePointsCount: validCoords.length
          });
        }
        
        if (validCoords.length > 0) {
          mapRef.current?.fitToCoordinates(validCoords, {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true,
          });
        }

        // Send trip request to nearby users (no persistent searching)
        if (currentTripRequestId) {
          await sendTripRequestToNearby(preferences.startCoordinates);
          
          // Set 2-minute timeout for the request
          setTimeout(async () => {
            try {
              const token = await AsyncStorage.getItem("token");
              if (token && currentTripRequestId) {
                await fetch(`${BASE_URL}/api/v1/trip/${currentTripRequestId}/expire`, {
                  method: 'PUT',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  }
                });
                
                Alert.alert(
                  "Request Expired ⏰",
                  "Your companion request has expired after 2 minutes. You can send a new request if needed.",
                  [{ text: "OK" }]
                );
              }
            } catch (error) {
              console.error('Error expiring request:', error);
            }
          }, 2 * 60 * 1000); // 2 minutes
        }
      } else {
        console.warn('⚠️ [ROUTE CALC] No routes found in Google Maps response');
        Alert.alert(
          "Route Not Found", 
          "We couldn't calculate a route between these locations. You can still send the request manually."
        );
        
        // Still send trip request even without route
        if (currentTripRequestId) {
          await sendTripRequestToNearby(preferences.startCoordinates);
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to fetch route information");
    }
  };

  // Enhanced cancel search - keeps route but stops search
  const cancelSearch = async () => {
    await companionSearch.stopSearch();
    
    // Ask user if they want to keep the route visible
    Alert.alert(
      "Search Cancelled",
      "Would you like to keep your route visible for when you search again?",
      [
        {
          text: "Clear Route",
          style: "destructive",
          onPress: () => {
            setRouteCoordinates([]);
            setStartMarker(null);
            setEndMarker(null);
            setShowRadius(false);
            setCurrentTripRequestId(null);
          }
        },
        {
          text: "Keep Route",
          onPress: () => {
            // Route stays visible, only stop searching
            setShowRadius(false);
          }
        }
      ]
    );
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

  // Removed ActiveMatchModal related functions

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

  const [availability, setAvailability] = useState(true);
  const [availabilityModalVisible, setAvailabilityModalVisible] = useState(false);

  // Component mount tracking to prevent state updates after unmount
  const isMounted = useRef(true);
  
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Remove excessive rendering logs to reduce noise
  // console.log("🏠 [HOME RENDER] Rendering home screen...");
  
  // Safety check to prevent crashes
  if (!user) {
    console.log("⚠️ [HOME] No user found, showing loading state...");
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ThemedText type="default">Loading user data...</ThemedText>
      </View>
    );
  }

  // UI
  return (
    <View style={styles.container}>
      {/* Purple Gradient Header */}
      <View style={styles.gradientHeader}>
        <View style={styles.headerTop}>
          <View style={styles.userInfo}>
            <View style={styles.avatarContainer}>
              <Ionicons name="person-circle" size={40} color="white" />
            </View>
            <View>
              <ThemedText style={styles.userName}>{user?.userName || 'Your Name'}</ThemedText>
              <ThemedText style={styles.userSubtext}>12 min (3.4 Km)</ThemedText>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton} onPress={handleCurrentLocation}>
              <Ionicons name="location" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={() => setAvailabilityModalVisible(true)}>
              <Ionicons name={availability ? "toggle" : "toggle-outline"} size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Service Cards */}
        <View style={styles.serviceCards}>
          <TouchableOpacity style={[styles.serviceCard, styles.primaryCard]} onPress={() => setTripHistoryVisible(true)}>
            <Ionicons name="car" size={24} color="#8B5CF6" />
            <ThemedText style={styles.serviceCardTitle}>Trips</ThemedText>
            <ThemedText style={styles.serviceCardSubtext}>4.1 Km, 12 min</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.serviceCard, styles.primaryCard]} onPress={() => setActiveMatchModalVisible(true)}>
            <Ionicons name="people" size={24} color="#8B5CF6" />
            <ThemedText style={styles.serviceCardTitle}>Active</ThemedText>
            <ThemedText style={styles.serviceCardSubtext}>2.3 Km, 15 min</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.serviceCard, styles.primaryCard]} onPress={() => handleSOS("000")}>
            <Ionicons name="shield-checkmark" size={24} color="#8B5CF6" />
            <ThemedText style={styles.serviceCardTitle}>SOS Station</ThemedText>
            <ThemedText style={styles.serviceCardSubtext}>4.5 Km, 18 min</ThemedText>
          </TouchableOpacity>
        </View>
        
        {/* Secondary Service Row */}
        <View style={styles.secondaryServices}>
          <TouchableOpacity style={styles.secondaryCard} onPress={() => router.push('/profile')}>
            <Ionicons name="wallet" size={20} color="#8B5CF6" />
            <ThemedText style={styles.secondaryCardText}>Profile</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.secondaryCard} onPress={() => setTripHistoryVisible(true)}>
            <Ionicons name="restaurant" size={20} color="#8B5CF6" />
            <ThemedText style={styles.secondaryCardText}>History</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.secondaryCard} onPress={() => router.push('/emergencyContacts')}>
            <Ionicons name="medical" size={20} color="#8B5CF6" />
            <ThemedText style={styles.secondaryCardText}>Emergency</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Central Find Companion Section */}
      <View style={styles.findCompanionSection}>
        <View style={styles.companionContainer}>
          <ThemedText style={styles.companionTitle}>Find Your Travel Companion</ThemedText>
          <ThemedText style={styles.companionSubtext}>Connect with nearby travelers for safer journeys</ThemedText>
          
          <TouchableOpacity 
            style={styles.findCompanionButton}
            onPress={handleFindCompanion}
            disabled={isSearching}
          >
            <View style={styles.findButtonContent}>
              <Ionicons name="people" size={24} color="white" />
              <ThemedText style={styles.findButtonText}>
                {isSearching ? 'Searching...' : 'Find Companion'}
              </ThemedText>
            </View>
            {isSearching && (
              <View style={styles.searchingIndicator}>
                <Ionicons name="radio-button-on" size={12} color="white" />
              </View>
            )}
          </TouchableOpacity>
          
          {senderRequestStatus?.status === 'pending' && (
            <TouchableOpacity 
              style={styles.statusButton}
              onPress={() => setSentRequestStatusVisible(true)}
            >
              <ThemedText style={styles.statusButtonText}>View Request Status</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Compact Map */}
      <View style={styles.compactMapContainer}>
        {currentLocation && currentLocation.latitude && currentLocation.longitude ? (
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            customMapStyle={customMapStyle}
            style={styles.compactMap}
            showsUserLocation
            followsUserLocation
            region={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
            showsCompass={false}
            showsScale={false}
            showsTraffic={false}
            showsBuildings={true}
            showsIndoors={false}
            showsMyLocationButton={false}
            showsPointsOfInterest={true}
            zoomEnabled={true}
            zoomControlEnabled={false}
            rotateEnabled={false}
            scrollEnabled={true}
            pitchEnabled={false}
            toolbarEnabled={false}
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
          <View style={styles.loadingMapContainer}>
            <ThemedText type="default" style={styles.loadingMapText}>Loading map...</ThemedText>
          </View>
        )}
      </View>

      {/* Show searching status when active */}
      {isSearching && (
        <View style={styles.searchingContainer}>
          {/* Persistent Search Status */}
          {persistentSearch.isSearchActive && (
            <View style={styles.searchStatusContainer}>
              <View style={styles.searchStatusInfo}>
                <ThemedText style={styles.searchStatusTitle}>🔍 Search Active</ThemedText>
                <ThemedText style={styles.searchStatusTime}>
                  Expires in: {persistentSearch.formatRemainingTime(persistentSearch.remainingTime)}
                </ThemedText>
              </View>
            </View>
          )}
          
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

      {/* Navigation Button - appears when route is active */}
      {currentNavigationRoute && (
        <View style={styles.navigationContainer}>
          <View style={styles.navigationInfo}>
            <ThemedText type="defaultSemiBold" style={styles.navigationTitle}>
              {arrivalStatus.bothUsersArrived 
                ? `🎯 Final Destination: ${currentNavigationRoute.destinationAddress}`
                : `🗺️ Navigation to ${currentNavigationRoute.destinationAddress}`}
            </ThemedText>
            {currentNavigationRoute.routeInfo && (
              <ThemedText type="caption" style={styles.navigationDetails}>
                Distance: {currentNavigationRoute.routeInfo.distance} • 
                Duration: {currentNavigationRoute.routeInfo.duration}
              </ThemedText>
            )}
            {currentNavigationRoute.companion && (
              <ThemedText type="caption" style={styles.navigationDetails}>
                Meeting {currentNavigationRoute.companion}
              </ThemedText>
            )}
            {arrivalStatus.isNearMeetingPoint && !arrivalStatus.hasArrivedAtMeetingPoint && (
              <ThemedText type="caption" style={[styles.navigationDetails, { color: Colors.light.tint }]}>
                📍 Near meeting point ({arrivalStatus.distanceToMeetingPoint}m away)
              </ThemedText>
            )}
            {arrivalStatus.hasArrivedAtMeetingPoint && !arrivalStatus.bothUsersArrived && (
              <ThemedText type="caption" style={[styles.navigationDetails, { color: '#4CAF50' }]}>
                ✅ Arrived - Waiting for companion
              </ThemedText>
            )}
            {arrivalStatus.bothUsersArrived && !tripStatus.userReady && (
              <ThemedText type="caption" style={[styles.navigationDetails, { color: '#FF6B35' }]}>
                🎉 Both companions arrived! Ready to start trip
              </ThemedText>
            )}
            {tripStatus.userReady && !tripStatus.bothUsersReady && (
              <ThemedText type="caption" style={[styles.navigationDetails, { color: '#FFA500' }]}>
                ⏳ You're ready - Waiting for companion to start trip
              </ThemedText>
            )}
            {tripStatus.bothUsersReady && (
              <ThemedText type="caption" style={[styles.navigationDetails, { color: '#4CAF50' }]}>
                🚀 Trip started! Navigate to destination together
              </ThemedText>
            )}
          </View>
          <View style={styles.navigationButtons}>
            {/* Show different buttons based on arrival status */}
            {arrivalStatus.bothUsersArrived && !tripStatus.userReady && (
              <ThemedButton 
                title="🚀 Start Trip" 
                onPress={handleStartTrip}
                style={[styles.navigationButton, { backgroundColor: '#FF6B35' }]} 
              />
            )}
            {tripStatus.userReady && !tripStatus.bothUsersReady && (
              <ThemedButton 
                title="⏳ Waiting for Companion" 
                disabled={true}
                style={[styles.navigationButton, { backgroundColor: '#FFA500', opacity: 0.7 }]} 
              />
            )}
            {tripStatus.bothUsersReady && (
              <ThemedButton 
                title="🗺️ Navigate to Destination" 
                onPress={handleStartFinalJourney}
                style={[styles.navigationButton, { backgroundColor: '#4CAF50' }]} 
              />
            )}
            {arrivalStatus.isNearMeetingPoint && !arrivalStatus.hasArrivedAtMeetingPoint && (
              <ThemedButton 
                title="✅ Arrived" 
                onPress={handleMarkArrived}
                style={[styles.navigationButton, { backgroundColor: '#4CAF50' }]} 
              />
            )}
            <ThemedButton 
              title="📱 Open Maps" 
              onPress={() => {
                try {
                  openGoogleMapsNavigation(
                    currentNavigationRoute.destination,
                    currentNavigationRoute.origin,
                    'walking'
                  );
                } catch (error) {
                  Alert.alert('Navigation Error', 'Could not open navigation app. Please ensure Google Maps is installed.');
                }
              }} 
              style={styles.navigationButton} 
            />
            {tripStatus.tripStarted ? (
              <ThemedButton 
                title="🏁 End Trip" 
                onPress={handleEndTrip}
                style={[styles.navigationButton, { backgroundColor: '#4CAF50' }]} 
              />
            ) : (
              <ThemedButton 
                title="❌ Cancel" 
                onPress={handleCancelTrip}
                style={[styles.navigationButton, { backgroundColor: '#FF4444' }]} 
              />
            )}
            <ThemedButton 
              title="✕" 
              onPress={() => {
                setCurrentNavigationRoute(null);
                setRouteCoordinates([]);
                setStartMarker(null);
                setEndMarker(null);
              }} 
              style={styles.closeNavigationButton} 
            />
          </View>
        </View>
      )}

      {/* Modern Bottom Navigation */}
      <View style={[styles.bottomNavigation, { paddingBottom: insets.bottom || 10 }]}>
        <TouchableOpacity 
          style={styles.bottomNavItem} 
          onPress={() => {
            console.log("🔔 Opening Notifications Modal");
            console.log(`📊 Current requests count: ${requestPolling.pendingRequests?.length || 0}`);
            console.log(`📊 Requests data:`, requestPolling.pendingRequests);
            try {
              setRequestNotificationVisible(true);
              requestPolling.markAsViewed();
            } catch (error) {
              console.error("❌ Error opening notifications:", error);
              Alert.alert("Error", "Could not open notifications. Please try again.");
            }
          }}
        >
          <View style={styles.navIconWithBadge}>
            <Ionicons name="notifications-outline" size={24} color="#8B5CF6" />
            {requestPolling.hasNewRequests && (
              <View style={styles.modernBadge}>
                <ThemedText style={styles.modernBadgeText}>
                  {requestPolling.requestCount || 0}
                </ThemedText>
              </View>
            )}
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.bottomNavItem}
          onPress={() => {
            console.log("🚗 Opening Active Trips Modal");
            setActiveMatchModalVisible(true);
          }}
        >
          <View style={styles.navIconWithBadge}>
            <Ionicons name="car-outline" size={24} color="#8B5CF6" />
            {(activeMatches?.matches?.length || 0) > 0 && (
              <View style={styles.modernBadge}>
                <ThemedText style={styles.modernBadgeText}>
                  {activeMatches?.matches?.length || 0}
                </ThemedText>
              </View>
            )}
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.bottomNavItem}
          onPress={handleCurrentLocation}
        >
          <Ionicons name="location-outline" size={24} color="#8B5CF6" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.bottomNavItem}
          onPress={() => router.push("/profile")}
        >
          <Ionicons name="person-outline" size={24} color="#8B5CF6" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.bottomNavItem}
          onPress={() => router.push('/emergencyContacts')}
        >
          <Ionicons name="shield-outline" size={24} color="#8B5CF6" />
        </TouchableOpacity>
      </View>

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

      {/* Emergency close button for stuck modals */}
      {requestNotificationVisible && (
        <TouchableOpacity 
          style={styles.emergencyCloseButton}
          onPress={forceCloseNotificationModal}
        >
          <Ionicons name="close-circle" size={32} color="#ff4444" />
          <ThemedText style={styles.emergencyCloseText}>Close Modal</ThemedText>
        </TouchableOpacity>
      )}

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
      <TripHistoryModal
        visible={tripHistoryVisible}
        onClose={() => setTripHistoryVisible(false)}
      />
      <RequestNotificationModal
        visible={requestNotificationVisible}
        onClose={() => safeCloseModal(setRequestNotificationVisible)}
        currentLocation={currentLocation}
        requests={requestPolling.pendingRequests}
        isPolling={requestPolling.isPolling}
        onRefetch={requestPolling.refetch}
        onRequestAccepted={(payload) => {
          console.log("Request accepted:", payload);
          activeMatches.refresh?.();
          setRequestNotificationVisible(false);

          if (payload?.routeData) {
            handleNotificationRouteUpdate({
              ...payload.routeData,
              senderLocation: payload.senderCurrentLocation,
              receiverLocation: payload.receiverLocation,
              tripMatch: payload.tripMatch,
              tripRequest: payload.tripRequest,
            });
          }

          const acceptedDestination =
            payload?.tripRequest?.destination || payload?.tripMatch?.tripDetails?.destination;

          Alert.alert(
            "Request Accepted! dYZ%",
            acceptedDestination
              ? `You've accepted the companion request to ${acceptedDestination}. The shared route is now visible.`
              : "You've successfully accepted the companion request. Your trip routes are now displayed on the map.",
            [{ text: "Got it!" }]
          );
        }}
        onRouteUpdate={(routeData) => {
          handleNotificationRouteUpdate(routeData);
        }}
      />

      {/* Active Match Modal */}
      <ActiveMatchModal
        visible={activeMatchModalVisible}
        onClose={() => setActiveMatchModalVisible(false)}
        matches={activeMatches?.matches || []}
        isLoading={activeMatches?.loading}
        onRefresh={() => activeMatches?.refresh()}
        onUpdateStatus={async (matchId, status) => {
          try {
            await activeMatches.updateMatchStatus(matchId, status);
            Alert.alert("Success", `Trip ${status === 'in-progress' ? 'started' : status} successfully!`);
          } catch (error) {
            Alert.alert("Error", error.message || "Failed to update trip status");
          }
        }}
        onViewDetails={(match) => {
          // For now, just show an alert. Later we can integrate TripMatchCoordinationModal
          Alert.alert(
            "Trip Details",
            `Match ID: ${match.matchId}\nStatus: ${match.status}\nDestination: ${match.tripDetails?.destination || 'Unknown'}`,
            [{ text: "OK" }]
          );
        }}
        onSetMeetingPoint={(matchId, meetingPoint) => {
          return activeMatches.setMeetingPoint(matchId, meetingPoint);
        }}
      />

      {/* Sender Acceptance Notification Modal */}
      <SenderAcceptanceNotificationModal
        visible={senderAcceptanceVisible}
        onClose={() => {
          setSenderAcceptanceVisible(false);
          setAcceptanceData(null);
          // Refresh active matches when sender acknowledges
          activeMatches.refresh?.();
          // Optionally show active matches modal
          setActiveMatchModalVisible(true);
        }}
        acceptanceData={acceptanceData}
      />
        currentLocation={currentLocation}
        currentUserId={user?._id}
      />

      {/* Enhanced Consent Modal for Receivers */}
      <EnhancedConsentModal
        visible={enhancedConsentVisible}
        onClose={() => setEnhancedConsentVisible(false)}
        onSubmit={(consentData) => {
          // Handle receiver consent submission
          if (selectedRequest) {
            activeMatches.completeReceiverConsent(selectedRequest.tripReqId, user._id)
              .then(() => {
                Alert.alert("Success", "Consent completed! You can now proceed with the trip.");
                setEnhancedConsentVisible(false);
                setTwoStepTripVisible(true); // Open meeting point selection
              })
              .catch((error) => {
                Alert.alert("Error", "Failed to complete consent: " + error.message);
              });
          }
        }}
        userRole="receiver"
        requestDetails={selectedRequest}
      />

      {/* Two-Step Trip Planning Modal */}
      <TwoStepTripModal
        visible={twoStepTripVisible}
        onClose={() => setTwoStepTripVisible(false)}
        onConfirmTrip={(tripPlan) => {
          // Handle two-step trip confirmation
          console.log("Two-step trip plan confirmed:", tripPlan);
          Alert.alert(
            "Trip Plan Confirmed! 🎉",
            "Step 1: Meet at the designated point\nStep 2: Travel together to destination\n\nBoth users will receive notifications with meeting details.",
            [{ text: "OK", onPress: () => setTwoStepTripVisible(false) }]
          );
        }}
        tripData={selectedRequest}
        userLocation={currentLocation}
        companionLocation={selectedRequest?.user?.location}
      />

      {/* Navigation Integration Modal */}
      <Modal
        visible={navigationVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setNavigationVisible(false)}
      >
        <NavigationIntegration
          tripMatch={activeTripMatch}
          isVisible={navigationVisible}
          onClose={() => {
            setNavigationVisible(false);
            setActiveTripMatch(null);
          }}
          onNavigationStart={() => {
            console.log('🗺️ Navigation started for trip:', activeTripMatch?.id);
          }}
          onTripComplete={() => {
            console.log('🏁 Trip completed for:', activeTripMatch?.id);
            setNavigationVisible(false);
            setActiveTripMatch(null);
            
            // Clear destination and reset journey state
            const { clearDestination, setJourneyState } = useLocationStore.getState();
            clearDestination();
            setJourneyState('idle');
          }}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  
  // Purple Gradient Header
  gradientHeader: {
    backgroundColor: "#8B5CF6",
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatarContainer: {
    marginRight: 12,
  },
  userName: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  userSubtext: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
  },
  headerActions: {
    flexDirection: "row",
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  
  // Service Cards
  serviceCards: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  serviceCard: {
    flex: 1,
    backgroundColor: "white",
    padding: 15,
    borderRadius: 15,
    alignItems: "center",
    marginHorizontal: 4,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryCard: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.1)",
  },
  serviceCardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginTop: 8,
  },
  serviceCardSubtext: {
    fontSize: 10,
    color: "#6b7280",
    marginTop: 2,
  },
  
  // Secondary Services
  secondaryServices: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  secondaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  secondaryCardText: {
    color: "white",
    fontSize: 12,
    marginLeft: 6,
  },
  
  // Find Companion Section
  findCompanionSection: {
    padding: 20,
    backgroundColor: "#f8fafc",
  },
  companionContainer: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.1)",
  },
  companionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 8,
    textAlign: "center",
  },
  companionSubtext: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 20,
  },
  findCompanionButton: {
    backgroundColor: "#8B5CF6",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 0,
  },
  findButtonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  findButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  searchingIndicator: {
    marginLeft: 12,
  },
  statusButton: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: "#f3f4f6",
    borderRadius: 15,
  },
  statusButtonText: {
    color: "#8B5CF6",
    fontSize: 14,
    fontWeight: "500",
  },
  
  // Compact Map
  compactMapContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  compactMap: { 
    width: "100%", 
    height: "100%",
    minHeight: 200,
  },
  
  // Bottom Navigation
  bottomNavigation: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "white",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(139, 92, 246, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 8,
  },
  bottomNavItem: {
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    borderRadius: 12,
    minWidth: 48,
    minHeight: 48,
  },
  navIconWithBadge: {
    position: "relative",
  },
  modernBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#ef4444",
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "white",
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  modernBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "700",
  },
  
  // Loading states
  loadingMapContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
  },
  loadingMapText: {
    color: "#6b7280",
    fontSize: 16,
  },
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
  destinationSearchContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  destinationInputContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.tint,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  
  // Network status indicators
  errorIndicator: {
    position: "absolute",
    top: -4,
    left: -4,
    backgroundColor: "#ff4444",
    borderRadius: 6,
    width: 12,
    height: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  rateLimitText: {
    fontSize: 8,
    color: "#ffaa00",
    fontWeight: "bold",
  },
  
  // Enhanced persistent search styles
  searchStatusContainer: {
    backgroundColor: Colors.light.tint + "10",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.light.tint + "30",
  },
  searchStatusInfo: {
    alignItems: "center",
  },
  searchStatusTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.tint,
    marginBottom: 4,
  },
  searchStatusTime: {
    fontSize: 14,
    color: Colors.light.text,
    opacity: 0.8,
  },
  
  // Navigation styles
  navigationContainer: {
    position: 'absolute',
    bottom: 120,
    left: 16,
    right: 16,
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  navigationInfo: {
    flex: 1,
    marginRight: 12,
  },
  navigationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  navigationDetails: {
    fontSize: 12,
    color: Colors.light.text,
    opacity: 0.8,
    marginBottom: 2,
  },
  navigationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navigationButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  closeNavigationButton: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 40,
  },
  
  // Emergency close button styles
  emergencyCloseButton: {
    position: 'absolute',
    top: 100,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 9999,
  },
  emergencyCloseText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#ff4444',
  },
});
