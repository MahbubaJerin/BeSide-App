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
import FinalJourneyModal from "@/components/FinalJourneyModal";
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
        const foundCompanions = json.data?.companions || [];
        setCompanions(foundCompanions);
        console.log(`👥 [COMPANION SEARCH] Found ${foundCompanions.length} nearby companions within ${searchRadius}m`);
        if (typeof json.data?.searchRadius === "number") {
          setSearchRadius(json.data.searchRadius);
        }
      } else {
        console.log('⚠️ [COMPANION SEARCH] Search failed:', json?.message || 'Unknown error');
      }
    } catch (e) {
      console.log("❌ [COMPANION SEARCH] Error:", e?.message || e);
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
  const [isLoadingUser, setIsLoadingUser] = useState(true);
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
  const [finalJourneyModalVisible, setFinalJourneyModalVisible] = useState(false);
  const [currentTripMatch, setCurrentTripMatch] = useState(null);
  const [senderAcceptanceVisible, setSenderAcceptanceVisible] = useState(false);
  const [acceptanceData, setAcceptanceData] = useState(null);

  const [consent, setConsent] = useState({ noTouch: false, respectful: false, safety: false });
  const [photoUrl, setPhotoUrl] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [shouldResetModal, setShouldResetModal] = useState(false);

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
  const expirationTimeoutRef = useRef(null); // Store timeout ID to clear it when match is created

  // hooks
  const locationTracking = useLocationTracking();
  const companionSearch = useCompanionSearch();
  const requestPolling = useRequestPolling(5000, true); // Poll every 5 seconds for incoming requests
  // Enable match polling - always on to show active trip details
  const [enableMatchPolling, setEnableMatchPolling] = useState(true); // Changed from false to true
  const activeMatches = useActiveMatches(15000, enableMatchPolling); // polling enabled by default
  const tripNotifications = useTripNotifications();
  // Disable real-time updates for now (backend endpoint not active in RN)
  const realTimeUpdates = useRealTimeUpdates(false);
  const { 
    openGoogleMapsNavigation, 
    getNavigationInstructions,
    calculateDistance,
    checkArrivalAtMeetingPoint 
  } = useRouteCalculation();

  // State for sender notifications
  const [senderRequestStatus, setSenderRequestStatus] = useState(null);

  // Handle real-time trip completion events
  useEffect(() => {
    if (realTimeUpdates.addEventHandler) {
      // Handler for when trip is completed by both users
      realTimeUpdates.addEventHandler('trip_completed', (data) => {
        console.log('🎉 [REAL-TIME] Trip completed:', data);
        
        // Clear all preferences and route data on trip completion
        resetAllPreferencesAndRoute();
        
        // Refresh active matches to remove completed trip
        activeMatches.refresh();
        
        // Show completion alert
        Alert.alert(
          '🎉 Trip Completed!',
          data.message || 'Both users have confirmed the trip has ended.',
          [{ 
            text: 'View Trip History', 
            onPress: () => setTripHistoryVisible(true)
          }]
        );
        
        // Close any open modals
        setFinalJourneyModalVisible(false);
        setActiveTripMatch(null);
      });

      // Handler for when one user ends trip (waiting for other)
      realTimeUpdates.addEventHandler('trip_ending_waiting', (data) => {
        console.log('⏳ [REAL-TIME] Trip ending - waiting:', data);
        
        // Refresh active matches to update status
        activeMatches.refresh();
      });
    }

    // Cleanup event handlers
    return () => {
      if (realTimeUpdates.removeEventHandler) {
        realTimeUpdates.removeEventHandler('trip_completed');
        realTimeUpdates.removeEventHandler('trip_ending_waiting');
      }
    };
  }, [realTimeUpdates, activeMatches]);

  // Update activeTripMatch when activeMatches data changes
  useEffect(() => {
    if (activeTripMatch && activeMatches.matches) {
      // Find the updated match data
      const updatedMatch = activeMatches.matches.find(
        match => match.matchId === activeTripMatch.matchId
      );
      
      if (updatedMatch) {
        console.log('🔄 [ACTIVE TRIP MATCH] Updating active trip match with latest data');
        setActiveTripMatch(updatedMatch);
      } else if (activeTripMatch.matchId) {
        // Match no longer in active list (might be completed or cancelled)
        console.log('🏁 [ACTIVE TRIP MATCH] Match no longer active, checking reason...');
        
        // Always clear route from map when trip ends (completion or cancellation)
        clearRouteFromMap();
        
        // Check if trip was completed
        if (finalJourneyModalVisible) {
          // Show completion alert for the first user who is still in the modal
          Alert.alert(
            '🎉 Trip Completed!',
            'Both users have confirmed the trip has ended. Thank you for traveling with BeSide!',
            [{ 
              text: 'View Trip History', 
              onPress: () => {
                setFinalJourneyModalVisible(false);
                setActiveTripMatch(null);
                setTripHistoryVisible(true);
              }
            }]
          );
        } else {
          // Trip was likely cancelled, just clean up
          console.log('🧹 [ROUTE CLEANUP] Trip cancelled or ended, route cleared from map');
          setActiveTripMatch(null);
        }
      }
    }
  }, [activeMatches.matches, activeTripMatch, finalJourneyModalVisible, clearRouteFromMap]);

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

  // Clear all route-related data from map
  const clearRouteFromMap = useCallback(() => {
    console.log('🗺️ [ROUTE CLEANUP] Clearing all route data from map');
    setRouteCoordinates([]);
    setCurrentNavigationRoute(null);
    setStartMarker(null);
    setEndMarker(null);
  }, []);

  // Helper function to completely reset all preferences and state
  const resetAllPreferencesAndRoute = useCallback(() => {
    console.log('🧹 [RESET ALL] Clearing all preferences, consent, and route data');
    
    // Clear route and map markers
    setRouteCoordinates([]);
    setStartMarker(null);
    setEndMarker(null);
    setShowRadius(false);
    
    // Clear consent form data
    setConsent({ noTouch: false, respectful: false, safety: false });
    
    // Clear photo
    setPhotoUrl(null);
    
    // Clear trip request data
    setCurrentTripRequestId(null);
    setSelectedUser(null);
    
    // Clear modal states
    setConsentVisible(false);
    setPhotoUploadVisible(false);
    setPreferencesVisible(false);
    
    // Clear any navigation routes
    setCurrentNavigationRoute(null);
    
    // Trigger modal reset
    setShouldResetModal(true);
    setTimeout(() => setShouldResetModal(false), 100); // Reset flag after modal processes it
    
    console.log('✅ [RESET ALL] All preferences and route data cleared');
  }, []);

  // Helper function to reset just route and visual elements (lighter reset)
  const resetRouteAndVisuals = useCallback(() => {
    console.log('🧹 [RESET ROUTE] Clearing route and visual elements only');
    
    setRouteCoordinates([]);
    setStartMarker(null);
    setEndMarker(null);
    setShowRadius(false);
    setCurrentNavigationRoute(null);
    
    console.log('✅ [RESET ROUTE] Route and visual elements cleared');
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
    async (routeInfo) => {
      if (!routeInfo) return;

      const normalizePoint = (point) =>
        point && typeof point.latitude === "number" && typeof point.longitude === "number"
          ? { latitude: point.latitude, longitude: point.longitude, address: point.address }
          : null;

      const meetingSource =
        routeInfo.meetingPoint?.location ||
        routeInfo.meetingPoint ||
        routeInfo.startLocation;
      const meetingPoint = normalizePoint(meetingSource);
      const destinationPoint = normalizePoint(routeInfo.destinationLocation);
      const receiverPoint = normalizePoint(routeInfo.receiverLocation) || normalizePoint(currentLocation);

      // Calculate receiver's route: Current Location → Meeting Point → Destination
      if (receiverPoint && meetingPoint && destinationPoint) {
        try {
          console.log('🗺️ [RECEIVER ROUTE] Calculating route with waypoint...');
          console.log('  From:', receiverPoint);
          console.log('  Via (Meeting Point):', meetingPoint);
          console.log('  To:', destinationPoint);

          // Use Google Directions API with waypoint
          const url =
            "https://maps.googleapis.com/maps/api/directions/json" +
            `?origin=${receiverPoint.latitude},${receiverPoint.longitude}` +
            `&destination=${destinationPoint.latitude},${destinationPoint.longitude}` +
            `&waypoints=${meetingPoint.latitude},${meetingPoint.longitude}` +
            `&mode=walking` + // Can be made dynamic based on transport preference
            `&key=${GOOGLE_MAPS_KEY}`;

          const routeResponse = await fetch(url);
          const routeData = await routeResponse.json();

          if (routeData.routes && routeData.routes[0]) {
            const points = routeData.routes[0].overview_polyline.points;
            const coords = decodePolyline(points);
            const validCoords = coords.filter(
              (c) =>
                c.latitude >= -90 &&
                c.latitude <= 90 &&
                c.longitude >= -180 &&
                c.longitude <= 180
            );
            
            console.log('✅ [RECEIVER ROUTE] Route calculated with', validCoords.length, 'points');
            setRouteCoordinates(validCoords);

            // Fit map to show entire route
            if (validCoords.length > 0) {
              mapRef.current?.fitToCoordinates(validCoords, {
                edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
                animated: true,
              });
            }
          } else {
            console.log('⚠️ [RECEIVER ROUTE] No route found, using original route');
            // Fallback to original route if available
            const routePoints = Array.isArray(routeInfo.routeCoordinates)
              ? routeInfo.routeCoordinates.filter(
                  (coord) =>
                    coord &&
                    typeof coord.latitude === "number" &&
                    typeof coord.longitude === "number"
                )
              : [];
            setRouteCoordinates(routePoints);
          }
        } catch (error) {
          console.error('❌ [RECEIVER ROUTE] Error calculating route:', error);
          // Fallback to original route
          const routePoints = Array.isArray(routeInfo.routeCoordinates)
            ? routeInfo.routeCoordinates.filter(
                (coord) =>
                  coord &&
                  typeof coord.latitude === "number" &&
                  typeof coord.longitude === "number"
              )
            : [];
          setRouteCoordinates(routePoints);
        }
      } else {
        // Fallback: use original sender's route if receiver info not available
        const routePoints = Array.isArray(routeInfo.routeCoordinates)
          ? routeInfo.routeCoordinates.filter(
              (coord) =>
                coord &&
                typeof coord.latitude === "number" &&
                typeof coord.longitude === "number"
            )
          : [];
        setRouteCoordinates(routePoints);
      }

      // Set markers
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

      if (destinationPoint) {
        setEndMarker({
          latitude: destinationPoint.latitude,
          longitude: destinationPoint.longitude,
          address: destinationPoint.address || "Destination",
        });
      } else {
        setEndMarker(null);
      }

      const fitTargets = [];
      if (routeCoordinates.length) {
        // Will be fitted by the route calculation above
      } else if (meetingPoint && destinationPoint) {
        fitTargets.push(
          { latitude: meetingPoint.latitude, longitude: meetingPoint.longitude },
          { latitude: destinationPoint.latitude, longitude: destinationPoint.longitude }
        );
        if (receiverPoint) {
          fitTargets.push({ latitude: receiverPoint.latitude, longitude: receiverPoint.longitude });
        }
        
        if (fitTargets.length > 0 && mapRef.current) {
          mapRef.current.fitToCoordinates(fitTargets, {
            edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
            animated: true,
          });
        }
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
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  useEffect(() => {
    const currentMatchCount = activeMatches?.matches?.length || 0;
    
    // Show success when new matches are detected (but NOT on initial load)
    if (currentMatchCount > previousMatchCount && currentMatchCount > 0 && isMounted.current && !isInitialLoad) {
      setRequestNotificationVisible(false);
      setSentRequestStatusVisible(false);
      
      // Clear expiration timeout since match was created
      if (expirationTimeoutRef.current) {
        console.log("✅ Match created, clearing expiration timeout");
        clearTimeout(expirationTimeoutRef.current);
        expirationTimeoutRef.current = null;
      }
      
      Alert.alert(
        "Match Created! 🎉",
        "You've successfully matched with a companion! Your trip routes and meeting point are now displayed on the map.",
        [{ text: "Great!" }]
      );
    }
    
    // Mark initial load as complete after first check
    if (isInitialLoad && currentMatchCount >= 0) {
      console.log('📥 [HOME] Initial load complete, existing matches:', currentMatchCount);
      setIsInitialLoad(false);
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
            console.log("🎉 [HOME] Received acceptance event data:", JSON.stringify(eventData, null, 2));
            
            const modalData = {
              receiverName: eventData.responderName,
              receiverPhoto: eventData.responderPhoto,
              receiverLocation: eventData.receiverLocation,
              destination: eventData.destination,
              transportMode: eventData.transportMode
            };
            
            console.log("🎉 [HOME] Prepared modal data:", JSON.stringify(modalData, null, 2));
            setAcceptanceData(modalData);
            setSenderAcceptanceVisible(true);
          } else if (eventData.response === 'declined') {
            // Request declined - clear all preferences and route data
            setTimeout(() => {
              Alert.alert(
                "Request Declined",
                eventData.detailedMessage,
                [
                  { 
                    text: "OK", 
                    onPress: () => {
                      // Reset all preferences and route data when request is declined
                      resetAllPreferencesAndRoute();
                    }
                  }
                ]
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
          console.log("❌ [REAL-TIME] Trip cancelled event received:", eventData);
          
          // Clear all preferences, route data, and trip state
          resetAllPreferencesAndRoute();
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
          
          // Refresh matches
          if (activeMatches?.refreshMatches) {
            activeMatches.refreshMatches();
          }
          
          Alert.alert(
            "Trip Cancelled ❌",
            eventData.message || `${eventData.cancelledBy} cancelled the trip.`,
            [{ text: "OK" }]
          );
          break;

        case 'user_arrived':
          console.log("📍 [REAL-TIME] User arrived event received:", eventData);
          console.log("📍 [DEBUG] Both arrived:", eventData.bothArrived);
          console.log("📍 [DEBUG] Active matches:", activeMatches?.matches?.length);
          
          // Update arrival status for both users
          setArrivalStatus(prev => ({
            ...prev,
            bothUsersArrived: eventData.bothArrived || false,
            canStartFinalJourney: eventData.canStartTrip || false
          }));
          
          // If both users have arrived, start final journey automatically
          if (eventData.bothArrived) {
            console.log("🚀 [DEBUG] Both users arrived! Starting transition to final journey...");
            
            // First, refresh active matches to get the latest data
            if (activeMatches?.refresh) {
              console.log("🔄 [DEBUG] Refreshing active matches...");
              activeMatches.refresh(); // Remove await since this is not an async function
            }
            
            // Store the current trip match for the final journey modal
            if (eventData.matchId) {
              console.log("🔍 [DEBUG] Looking for match with ID:", eventData.matchId);
              const tripMatch = activeMatches?.matches?.find(m => m.matchId === eventData.matchId);
              console.log("🔍 [DEBUG] Found trip match:", tripMatch ? "YES" : "NO");
              
              if (tripMatch) {
                console.log("🎯 [DEBUG] Setting active trip match and opening final journey modal");
                setActiveTripMatch(tripMatch); // Set for FinalJourneyModal
                setActiveMatchModalVisible(false); // Close active match modal
                setFinalJourneyModalVisible(true); // Open final journey modal
              } else {
                console.log("❌ [DEBUG] Trip match not found, trying to refresh and retry...");
                // Fallback: refresh and retry after a delay
                setTimeout(() => {
                  if (activeMatches?.refresh) {
                    activeMatches.refresh();
                    setTimeout(() => {
                      const refreshedMatch = activeMatches?.matches?.find(m => m.matchId === eventData.matchId);
                      if (refreshedMatch) {
                        setActiveTripMatch(refreshedMatch);
                        setActiveMatchModalVisible(false);
                        setFinalJourneyModalVisible(true);
                      }
                    }, 500);
                  }
                }, 1000);
              }
            } else {
              console.log("❌ [DEBUG] No matchId in event data");
            }
            
            Alert.alert(
              "Trip Started! 🚀",
              "Both companions have arrived! Starting your final journey together.",
              [{ text: "Let's Go!" }]
            );
          } else {
            Alert.alert(
              "Companion Update 📍",
              eventData.message,
              [{ text: "OK" }]
            );
          }
          break;

        case 'final_journey_status':
          console.log("🚀 [REAL-TIME] Final journey status event received:", eventData);
          
          // Update trip status for both users
          setTripStatus(prev => ({
            ...prev,
            userReady: prev.userReady, // Keep current user's ready status
            bothUsersReady: eventData.bothReady || false,
            tripStarted: eventData.tripStarted || false
          }));
          
          // Show appropriate alert based on journey status
          if (eventData.bothReady && eventData.tripStarted) {
            Alert.alert(
              "Final Journey Started! 🚀",
              "Both companions are ready! The route from meeting point to destination is now displayed on your map. Use the navigation controls below to reach your destination.",
              [
                {
                  text: "View Route",
                  onPress: () => {
                    // Close any open navigation modal to show the route on home screen
                    setNavigationVisible(false);
                  }
                },
                { text: "OK" }
              ]
            );
          } else {
            Alert.alert(
              "Trip Status Update",
              eventData.message,
              [{ text: "OK" }]
            );
          }
          break;

        case 'trip_ended':
          console.log("🏁 [REAL-TIME] Trip ended event received:", eventData);
          
          // Clear all trip-related state
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
          
          // Refresh matches to remove completed match
          if (activeMatches?.refreshMatches) {
            activeMatches.refreshMatches();
          }
          
          Alert.alert(
            "Trip Completed! 🎉",
            eventData.message || "Your companion has completed the trip. Thank you for using BeSide!",
            [{ text: "Great!" }]
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
              } else if (myRequest.status === 'expired') {
                // Request expired - clear all preferences and route
                Alert.alert(
                  "Request Expired ⏰",
                  "Your companion request has expired. You can start a new search with fresh preferences.",
                  [
                    { 
                      text: "OK", 
                      onPress: () => {
                        resetAllPreferencesAndRoute();
                      }
                    }
                  ]
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
          setIsLoadingUser(true);
          const stored = await AsyncStorage.getItem("user");
          if (stored) {
            const parsed = JSON.parse(stored);
            setUser(parsed);
            setIsLoadingUser(false);
            await locationTracking.startTracking(true);
          } else {
            router.replace("/login");
          }
        } catch (error) {
          console.error('Error loading user data:', error);
          setIsLoadingUser(false);
          router.replace("/login");
        }
      };
      load();
      return () => {
        try {
          locationTracking.stopTracking();
          companionSearch.cleanup();
          resetAllModals(); // Ensure all modals are closed when leaving
          
          // Clear expiration timeout on unmount
          if (expirationTimeoutRef.current) {
            clearTimeout(expirationTimeoutRef.current);
            expirationTimeoutRef.current = null;
          }
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
    try {
      const token = await AsyncStorage.getItem("token");
      
      // Call cleanup endpoint before logging out
      if (token) {
        await fetch(`${BASE_URL}/api/v1/trip/cleanup-user-data`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error("Error during logout cleanup:", error);
    } finally {
      // Always clear local storage and logout
      await AsyncStorage.removeItem("user");
      await AsyncStorage.removeItem("token");
      router.replace("/login");
    }
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
                
                // Reset all states including preferences and route data
                resetAllPreferencesAndRoute();
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
              if (!token) return;

              // Check if this is a trip match (new system) or legacy trip request
              const activeTripMatch = activeMatches?.matches?.find(match => 
                match.status === 'in-progress' || match.tripStarted
              );

              if (activeTripMatch) {
                // Handle trip match ending
                const response = await fetch(`${BASE_URL}/api/v1/trip/match/${activeTripMatch.matchId}/end-trip`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                });

                if (response.ok) {
                  Alert.alert(
                    "Trip Completed! 🎉",
                    "Thank you for using BeSide! We hope you had a safe journey together.",
                    [{ text: "Great!" }]
                  );
                }
              } else if (activeRequest) {
                // Handle legacy trip request ending
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
                }
              }
                
              // Reset all states and preferences regardless of which system was used
              resetAllPreferencesAndRoute();
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
              
              // Refresh matches to remove completed match
              if (activeMatches?.refreshMatches) {
                activeMatches.refreshMatches();
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

  // ⬇️ CHANGED: Only open consent modal - NO trip creation yet!
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

      // Just open consent modal - trip will be created later with all data
      console.log("📝 [FIND COMPANION] Opening consent modal...");
      setConsentVisible(true);
      setShowRadius(false);
    } catch (e) {
      console.error("❌ [FIND COMPANION] Error:", e);
      Alert.alert("Error", e?.message || "Failed to start companion search.");
    }
  };

  const handlePhotoSubmit = async (uri) => {
    // Just store photo temporarily and move to preferences
    console.log("📸 [PHOTO] Photo captured, storing temporarily");
    setPhotoUrl(uri);
    setPhotoUploadVisible(false);
    setPreferencesVisible(true);
  };

  // NEW: Send trip request to nearby users
  const sendTripRequestToNearby = async (startCoordinates, tripReqId = null) => {
    try {
      console.log("📡 [SEND TO NEARBY] Starting...");
      const token = await AsyncStorage.getItem("token");
      const user = await AsyncStorage.getItem("user");

      // Use passed tripReqId or fallback to state
      const requestId = tripReqId || currentTripRequestId;

      if (!token || !requestId) {
        console.log("❌ [SEND TO NEARBY] Missing token or trip request ID");
        Alert.alert(
          "Debug Error",
          `Missing: ${!token ? "Token" : ""} ${!requestId ? "Trip Request ID" : ""}`
        );
        return;
      }

      const API_URL = BASE_URL.replace(/\/+$/, "");
      const requestBody = {
        tripReqId: requestId,
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
      console.log("📝 [PREFERENCES] Received preferences:", preferences);
      
      const storedUser = await AsyncStorage.getItem("user");
      const token = await AsyncStorage.getItem("token");
      if (!storedUser || !token) {
        Alert.alert("Error", "User not logged in.");
        router.replace("/login");
        return;
      }
      const parsed = JSON.parse(storedUser);

      setStartMarker(preferences.startCoordinates);
      setEndMarker(preferences.destinationCoordinates);
      setShowRadius(true);

      // Calculate route first
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
      console.log('🗺️ [ROUTE CALC] Making Google Maps API call');
      const routeResponse = await fetch(url);
      const routeData = await routeResponse.json();
      
      let validCoords = [];
      if (routeData.routes && routeData.routes[0]) {
        const points = routeData.routes[0].overview_polyline.points;
        const coords = decodePolyline(points);
        validCoords = coords.filter(
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
      }

      // NOW create trip request with ALL data (photo, preferences, route)
      console.log("📤 [CREATE REQUEST] Creating trip request with complete data...");
      
      const API_URL = BASE_URL.replace(/\/+$/, "");
      const formData = new FormData();
      
      // Add user data
      formData.append("user", JSON.stringify({
        userId: parsed._id,
        userName: parsed.userName,
        userImage: parsed.userImage || "default.jpg"
      }));
      
      // Add trip details
      formData.append("destination", preferences.destinationAddress || "Destination");
      formData.append("destinationType", preferences.transport === "car" ? "By Car" : 
                      preferences.transport === "walk" ? "By Walk" : "By Transit");
      formData.append("date", new Date().toISOString());
      formData.append("time", new Date().toLocaleTimeString());
      formData.append("genderPreference", preferences.genderPreference || "any");
      
      // Add locations
      formData.append("startLocation", JSON.stringify({
        latitude: preferences.startCoordinates.latitude,
        longitude: preferences.startCoordinates.longitude,
        address: preferences.startAddress || "Start location"
      }));
      
      formData.append("destinationLocation", JSON.stringify({
        latitude: preferences.destinationCoordinates.latitude,
        longitude: preferences.destinationCoordinates.longitude,
        address: preferences.destinationAddress || "Destination"
      }));
      
      if (validCoords.length > 0) {
        formData.append("routeCoordinates", JSON.stringify(validCoords));
      }
      
      formData.append("transportMode", preferences.transport === "car" ? "driving" : 
                      preferences.transport === "walk" ? "walking" : "transit");
      
      // Add photo if available
      if (photoUrl) {
        formData.append("photo", {
          uri: photoUrl,
          type: "image/jpeg",
          name: `selfie-${Date.now()}.jpg`
        });
      }
      
      const createResponse = await fetch(`${API_URL}/api/v1/trip/createTripReq`, {
        method: "POST",
        body: formData,
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log("📥 [CREATE REQUEST] Response status:", createResponse.status);
      const createResult = await createResponse.json();
      console.log("📋 [CREATE REQUEST] Result:", JSON.stringify(createResult, null, 2));

      if (createResult.status !== "success") {
        console.log("❌ [CREATE REQUEST] Failed:", createResult.message);
        throw new Error(createResult.message || "Failed to create trip request");
      }
      
      const tripReqId = createResult.data.tripRequest.tripReqId;
      console.log("✅ [CREATE REQUEST] Success! Trip Request ID:", tripReqId);
      setCurrentTripRequestId(tripReqId);

      // NOW send to nearby users (receivers will get complete info)
      // Pass tripReqId directly since state update is async
      await sendTripRequestToNearby(preferences.startCoordinates, tripReqId);
      
      // Set expiration timeout
      if (expirationTimeoutRef.current) {
        clearTimeout(expirationTimeoutRef.current);
      }
      
      expirationTimeoutRef.current = setTimeout(async () => {
        try {
          const token = await AsyncStorage.getItem("token");
          if (token && tripReqId) {
            // Check if a match was created before showing expiration
            const matchResponse = await fetch(`${BASE_URL.replace(/\/+$/, '')}/api/v1/trip/active-matches`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            const matchResult = await matchResponse.json();
            const hasActiveMatch = matchResult?.data?.matches?.length > 0;
            
            // Only expire and show alert if no match was created
            if (!hasActiveMatch) {
              await fetch(`${BASE_URL}/api/v1/trip/${tripReqId}/expire`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              Alert.alert(
                "Request Expired ⏰",
                "Your companion request has expired after 2 minutes. You can send a new request if needed.",
                [
                  { 
                    text: "OK", 
                    onPress: () => {
                      // Clear all preferences and route when request expires
                      resetAllPreferencesAndRoute();
                    }
                  }
                ]
              );
            } else {
              console.log("✅ Match was created, skipping expiration notification");
            }
          }
        } catch (error) {
          console.error('Error handling request expiration:', error);
        }
      }, 2 * 60 * 1000); // 2 minutes
      
      // Close preferences modal
      setPreferencesVisible(false);
    } catch (error) {
      console.error("❌ [PREFERENCES] Error:", error);
      Alert.alert("Error", error.message || "Failed to process your request");
    }
  };

  // Enhanced cancel search - gives user options for what to clear
  const cancelSearch = async () => {
    await companionSearch.stopSearch();
    
    // Ask user what they want to do with their preferences and route
    Alert.alert(
      "Search Cancelled",
      "What would you like to do with your saved preferences and route?",
      [
        {
          text: "Start Fresh",
          style: "destructive",
          onPress: () => {
            // Complete reset - clear everything
            resetAllPreferencesAndRoute();
          }
        },
        {
          text: "Clear Route Only",
          onPress: () => {
            // Just clear route and visual elements, keep consent and photo
            resetRouteAndVisuals();
          }
        },
        {
          text: "Keep Everything",
          onPress: () => {
            // Just stop searching, keep all data for next time
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
  
  // Show loading state while user data is being fetched
  if (isLoadingUser || !user) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ThemedText type="default">Loading...</ThemedText>
      </View>
    );
  }

  // UI
  return (
    <View style={styles.container}>
      {/* Simplified Header */}
      <View style={styles.gradientHeader}>
        <View style={styles.headerTop}>
          <View style={styles.userInfo}>
            <View style={styles.avatarContainer}>
              <Ionicons name="person-circle" size={40} color="white" />
            </View>
            <View>
              <ThemedText style={styles.userName}>{user?.userName || 'Your Name'}</ThemedText>
              <ThemedText style={styles.userSubtext}>Safe Journey Companion</ThemedText>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton} onPress={handleCurrentLocation}>
              <Ionicons name="location" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Compact Service Cards */}
        <View style={styles.serviceCards}>
          <TouchableOpacity style={styles.compactServiceCard} onPress={() => setTripHistoryVisible(true)}>
            <Ionicons name="time-outline" size={20} color="#8B5CF6" />
            <ThemedText style={styles.compactCardText}>History</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.compactServiceCard} onPress={() => router.push('/emergencyContacts')}>
            <Ionicons name="call-outline" size={20} color="#8B5CF6" />
            <ThemedText style={styles.compactCardText}>Emergency</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.compactServiceCard} onPress={() => handleSOS("000")}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#8B5CF6" />
            <ThemedText style={styles.compactCardText}>SOS</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Compact Map - Now appears first */}
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
                  <MaterialCommunityIcons name="account-multiple" size={30} color="#10b981" />
                </View>
                <Callout>
                  <View style={{ width: 160 }}>
                    <ThemedText type="defaultSemiBold">Meeting Point</ThemedText>
                    <ThemedText type="caption">{startMarker.address || "Where you'll meet"}</ThemedText>
                  </View>
                </Callout>
              </Marker>
            )}

            {endMarker && (
              <Marker coordinate={endMarker}>
                <View style={styles.markerContainer}>
                  <MaterialCommunityIcons name="flag-checkered" size={30} color="#F44336" />
                </View>
                <Callout>
                  <View style={{ width: 160 }}>
                    <ThemedText type="defaultSemiBold">Destination</ThemedText>
                    <ThemedText type="caption">{endMarker.address || "Final destination"}</ThemedText>
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

      {/* Compact Find Companion Section - Now appears after map */}
      <View style={styles.findCompanionSection}>
        <View style={styles.companionContainer}>
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
            // Polling is already enabled in background
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
        shouldReset={shouldResetModal}
      />
      <SentRequestStatusModal
        visible={sentRequestStatusVisible}
        onClose={() => setSentRequestStatusVisible(false)}
        onRequestCancelled={resetAllPreferencesAndRoute}
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
          console.log("✅ [RECEIVER] Request accepted:", payload);
          
          // Close the request modal immediately
          setRequestNotificationVisible(false);
          
          // Update route on map if available
          if (payload?.routeData) {
            handleNotificationRouteUpdate({
              ...payload.routeData,
              senderLocation: payload.senderCurrentLocation,
              receiverLocation: payload.receiverLocation,
              tripMatch: payload.tripMatch,
              tripRequest: payload.tripRequest,
            });
          }
          
          // Refresh active matches to show the new trip
          activeMatches.refresh?.();
          
          // Automatically show the active match modal after a brief delay
          setTimeout(() => {
            setActiveMatchModalVisible(true);
          }, 300);
        }}
        onRouteUpdate={(routeData) => {
          handleNotificationRouteUpdate(routeData);
        }}
      />

      {/* Active Match Modal */}
      <ActiveMatchModal
        visible={activeMatchModalVisible}
        onClose={() => {
          setActiveMatchModalVisible(false);
          // Keep polling enabled so match updates continue in background
        }}
        matches={activeMatches?.matches || []}
        isLoading={activeMatches?.loading}
        onRefresh={() => activeMatches?.refresh()}
        currentUserId={user?._id} // Pass current user ID to identify organizer vs companion
        arrivalStatus={arrivalStatus} // Pass real-time arrival status
        onBothArrived={(tripMatch) => {
          console.log("🚀 [HOME] Both users arrived callback triggered!");
          setActiveTripMatch(tripMatch);
          setActiveMatchModalVisible(false);
          setFinalJourneyModalVisible(true);
        }}
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

      {/* Final Journey Modal */}
      <FinalJourneyModal
        visible={finalJourneyModalVisible}
        onClose={() => {
          setFinalJourneyModalVisible(false);
          setActiveTripMatch(null);
        }}
        tripMatch={activeTripMatch}
        userRole={activeTripMatch ? 
          (activeTripMatch.organizer?.userId === user?._id ? 'organizer' : 'companion') 
          : 'companion'
        }
        currentUserId={user?._id}
        onTripCompleted={() => {
          clearRouteFromMap();
          setTripHistoryVisible(true);
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
    paddingBottom: 15,
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
    marginBottom: 15,
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
  
  // Compact Service Cards
  serviceCards: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  compactServiceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  compactCardText: {
    color: "white",
    fontSize: 12,
    marginLeft: 6,
    fontWeight: "500",
  },
  
  // Find Companion Section - Compact
  findCompanionSection: {
    padding: 15,
    backgroundColor: "#f8fafc",
  },
  companionContainer: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 16,
    alignItems: "center",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.1)",
  },
  companionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 6,
    textAlign: "center",
    display: "none", // Hide title to make it more compact
  },
  companionSubtext: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 12,
    display: "none", // Hide subtitle to make it more compact
  },
  findCompanionButton: {
    backgroundColor: "#8B5CF6",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 25,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 0,
  },
  findButtonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  findButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 8,
  },
  searchingIndicator: {
    marginLeft: 12,
  },
  statusButton: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
  },
  statusButtonText: {
    color: "#8B5CF6",
    fontSize: 13,
    fontWeight: "500",
  },
  
  // Compact Map - Takes more space
  compactMapContainer: {
    flex: 2,
    margin: 15,
    marginTop: 10,
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
    minHeight: 300,
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
})