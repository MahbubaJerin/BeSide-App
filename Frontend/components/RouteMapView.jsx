// Enhanced MapView component for route visualization
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Dimensions,
  Alert,
  TouchableOpacity,
  Text,
  Linking,
  Platform
} from 'react-native';
import MapView, { 
  PROVIDER_GOOGLE, 
  Marker, 
  Polyline,
  Circle
} from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config';

const RouteMapView = ({ 
  tripMatch, 
  userRole, // 'organizer' or 'companion'
  onNavigationStart,
  onArrivalDetected,
  hideOverlays = false // New prop to hide overlays
}) => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [hasArrived, setHasArrived] = useState(false); // Track if current user has arrived
  const [bothArrived, setBothArrived] = useState(false); // Track if both users have arrived
  const [mapRegion, setMapRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  // Debug logging
  useEffect(() => {
    console.log('🗺️ [ROUTE MAP] Component mounted with:', {
      tripMatch: tripMatch ? {
        matchId: tripMatch.matchId,
        status: tripMatch.status,
        hasMeetingPoint: !!tripMatch.meetingPoint,
        meetingPointLocation: tripMatch.meetingPoint?.location
      } : null,
      userRole
    });
  }, [tripMatch, userRole]);

  // Check initial arrival status
  useEffect(() => {
    if (tripMatch?.arrivedUsers && tripMatch.arrivedUsers.length > 0) {
      // Check if current user has arrived (you'll need to get current user ID)
      // For now, let's check based on the trip status
      if (tripMatch.status === 'ready-to-start') {
        setBothArrived(true);
        setHasArrived(true);
      }
    }
  }, [tripMatch]);

  // Get current location
  useEffect(() => {
    getCurrentLocation();
    const interval = setInterval(getCurrentLocation, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required for navigation');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setCurrentLocation(newLocation);
      
      // Update map region if first time
      if (!currentLocation) {
        setMapRegion({
          ...newLocation,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }

      // Check for arrival if navigating
      if (isNavigating && tripMatch?.meetingPoint) {
        // Handle both data structures: meetingPoint.location.latitude or meetingPoint.latitude
        const meetingPointData = tripMatch.meetingPoint;
        const meetingPoint = meetingPointData?.location ? meetingPointData.location : meetingPointData;
        
        if (meetingPoint?.latitude && meetingPoint?.longitude) {
          checkArrival(newLocation, meetingPoint);
        }
      }

    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  // Check if user has arrived at meeting point
  const checkArrival = (currentPos, meetingPoint) => {
    const distance = calculateDistance(
      currentPos.latitude,
      currentPos.longitude,
      meetingPoint.latitude,
      meetingPoint.longitude
    );

    // If within 50 meters, consider arrived
    if (distance <= 50) {
      setIsNavigating(false);
      onArrivalDetected && onArrivalDetected();
      Alert.alert(
        '🎉 Arrival Detected!',
        'You have arrived at the meeting point. Have you met your companion?',
        [
          { text: 'Not Yet', style: 'cancel' },
          { text: 'Yes, Met!', onPress: () => handleMeetingConfirmed() }
        ]
      );
    }
  };

  const handleMeetingConfirmed = () => {
    // Update trip status or notify other user
    Alert.alert('Great!', 'Enjoy your trip together. Stay safe!');
  };

  // Calculate distance between two coordinates
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  // Generate route coordinates based on user role and workflow
  const generateRouteCoordinates = () => {
    if (!currentLocation) {
      console.log('🗺️ [ROUTE MAP] No current location for route generation');
      return [];
    }
    
    // Get meeting point (sender's starting location) and destination
    const meetingPointData = tripMatch?.meetingPoint;
    const destination = tripMatch?.destinationLocation;
    
    // Handle both data structures: meetingPoint.location.latitude or meetingPoint.latitude
    const meetingPoint = meetingPointData?.location ? {
      latitude: meetingPointData.location.latitude,
      longitude: meetingPointData.location.longitude
    } : meetingPointData;
    
    if (!meetingPoint?.latitude || !meetingPoint?.longitude) {
      console.log('🗺️ [ROUTE MAP] No meeting point coordinates available');
      console.log('🗺️ [ROUTE MAP] Meeting point data:', meetingPointData);
      return [];
    }

    console.log('🗺️ [ROUTE MAP] Generating route for:', {
      userRole,
      hasMeetingPoint: !!meetingPoint,
      hasDestination: !!destination,
      meetingPoint: {lat: meetingPoint.latitude, lng: meetingPoint.longitude},
      destination: destination ? {lat: destination.latitude, lng: destination.longitude} : 'not available'
    });

    // SENDER (organizer): Route from Meeting Point (starting location) → Destination
    if (userRole === 'organizer') {
      if (!destination?.latitude || !destination?.longitude) {
        console.log('🗺️ [ROUTE MAP] No destination for sender route');
        return [];
      }
      
      const senderRoute = [
        {latitude: meetingPoint.latitude, longitude: meetingPoint.longitude}, // Meeting point (sender's start)
        {latitude: destination.latitude, longitude: destination.longitude}    // Destination
      ];
      
      console.log('🗺️ [ROUTE MAP] Sender route: Meeting Point → Destination', senderRoute);
      return senderRoute;
    }
    
    // RECEIVER (companion): Route from Current Location → Meeting Point → Destination  
    else if (userRole === 'companion') {
      const receiverRoute = [currentLocation]; // Start from current location
      
      // Add meeting point
      receiverRoute.push({
        latitude: meetingPoint.latitude, 
        longitude: meetingPoint.longitude
      });
      
      // Add destination if available
      if (destination?.latitude && destination?.longitude) {
        receiverRoute.push({
          latitude: destination.latitude, 
          longitude: destination.longitude
        });
      }
      
      console.log('🗺️ [ROUTE MAP] Receiver route: Current → Meeting Point → Destination', receiverRoute);
      return receiverRoute;
    }
    
    return [];
  };

  // Start in-app navigation instead of external navigation
  const startInAppNavigation = () => {
    const meetingPointData = tripMatch?.meetingPoint;
    const destination = tripMatch?.destinationLocation;
    
    // Handle both data structures: meetingPoint.location.latitude or meetingPoint.latitude
    const meetingPoint = meetingPointData?.location ? {
      latitude: meetingPointData.location.latitude,
      longitude: meetingPointData.location.longitude
    } : meetingPointData;
    
    if (!meetingPoint?.latitude || !meetingPoint?.longitude) {
      Alert.alert('Error', 'Meeting point not available');
      console.log('🗺️ [NAVIGATION] Meeting point data:', meetingPointData);
      return;
    }

    let targetLocation, navType;

    // SENDER: Navigate from Meeting Point to Final Destination
    if (userRole === 'organizer') {
      if (!destination?.latitude || !destination?.longitude) {
        Alert.alert('Error', 'Destination not available');
        return;
      }
      targetLocation = destination;
      navType = 'Meeting Point → Destination';
    }
    // RECEIVER: Navigate from Current Location to Meeting Point
    else if (userRole === 'companion') {
      targetLocation = meetingPoint;
      navType = 'Current Location → Meeting Point';
    }
    
    console.log('🧭 [IN-APP NAVIGATION] Starting in-app navigation:', {
      userRole,
      navType,
      target: {lat: targetLocation.latitude, lng: targetLocation.longitude}
    });
    
    // Enable in-app navigation mode
    setIsNavigating(true);
    onNavigationStart && onNavigationStart();
    
    Alert.alert(
      '🚀 Navigation Started!',
      `In-app navigation is now active. Follow the route on the map to reach your ${userRole === 'organizer' ? 'destination' : 'meeting point'}.`,
      [{ text: 'Got it!', style: 'default' }]
    );
  };

  // Handle "Almost There" button press
  const handleAlmostThere = async () => {
    if (!tripMatch?.matchId) {
      Alert.alert('Error', 'Trip match not found');
      return;
    }

    try {
      console.log('📍 [ALMOST THERE] User pressed Almost There button, distance:', distance);
      
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Please log in again');
        return;
      }

      const API_URL = BASE_URL.replace(/\/+$/, '');
      const response = await fetch(`${API_URL}/api/v1/trip/match/${tripMatch.matchId}/arrived`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          distance: Math.round(distance)
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to mark arrival');
      }

      if (result.data.bothArrived) {
        setBothArrived(true);
        setHasArrived(true);
        Alert.alert(
          '🎉 Both Users Have Arrived!',
          'Great! Both you and your companion have arrived at the meeting point. You can now start your trip together.',
          [{ text: 'Let\'s Go!', style: 'default' }]
        );
      } else {
        setHasArrived(true);
        Alert.alert(
          '✅ Arrival Confirmed!',
          'You have been marked as arrived at the meeting point. Waiting for your companion to arrive as well.',
          [{ text: 'OK', style: 'default' }]
        );
      }

      console.log('✅ [ALMOST THERE] Arrival marked successfully:', result.data);

    } catch (error) {
      console.error('❌ [ALMOST THERE] Error marking arrival:', error);
      Alert.alert('Error', 'Failed to mark arrival. Please try again.');
    }
  };

  // Get markers for map based on new workflow
  const getMapMarkers = () => {
    const markers = [];

    // Current location marker (only for receiver)
    if (currentLocation && userRole === 'companion') {
      markers.push(
        <Marker
          key="current"
          coordinate={currentLocation}
          title="Your Location"
          description="You are here"
        >
          <View style={styles.currentLocationMarker}>
            <Ionicons name="person" size={16} color="white" />
          </View>
        </Marker>
      );
    }

    // Meeting Point marker (sender's starting location)
    const meetingPointData = tripMatch?.meetingPoint;
    
    // Handle both data structures: meetingPoint.location.latitude or meetingPoint.latitude
    const meetingPoint = meetingPointData?.location ? {
      latitude: meetingPointData.location.latitude,
      longitude: meetingPointData.location.longitude
    } : meetingPointData;
    
    if (meetingPoint?.latitude && meetingPoint?.longitude) {
      const meetingCoord = {
        latitude: meetingPoint.latitude,
        longitude: meetingPoint.longitude
      };
      
      markers.push(
        <Marker
          key="meeting"
          coordinate={meetingCoord}
          title={userRole === 'organizer' ? "Your Starting Point" : "Meeting Point"}
          description={
            userRole === 'organizer' 
              ? "Your journey starts here" 
              : "Meet your companion here"
          }
          pinColor="green"
        >
          <View style={styles.meetingPointMarker}>
            <Ionicons name={userRole === 'organizer' ? "play" : "flag"} size={16} color="white" />
          </View>
        </Marker>
      );
    }

    // Destination marker
    const destination = tripMatch?.destinationLocation;
    if (destination?.latitude && destination?.longitude) {
      const destCoord = {
        latitude: destination.latitude,
        longitude: destination.longitude
      };
      
      markers.push(
        <Marker
          key="destination"
          coordinate={destCoord}
          title="Destination"
          description={destination.address || "Your final destination"}
          pinColor="red"
        >
          <View style={styles.destinationMarker}>
            <Ionicons name="location" size={16} color="white" />
          </View>
        </Marker>
      );
    }

    // Companion location (if available and user is organizer)
    if (userRole === 'organizer' && tripMatch?.liveLocationSharing?.companionLocation) {
      markers.push(
        <Marker
          key="companion"
          coordinate={tripMatch.liveLocationSharing.companionLocation}
          title="Your Companion"
          description={`${tripMatch.companion.userName} is here`}
          pinColor="blue"
        >
          <View style={styles.companionMarker}>
            <Ionicons name="person-circle" size={16} color="white" />
          </View>
        </Marker>
      );
    }

    return markers;
  };

  const routeCoords = generateRouteCoordinates();
  const distance = currentLocation && tripMatch?.meetingPoint?.location
    ? calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        tripMatch.meetingPoint.location.latitude,
        tripMatch.meetingPoint.location.longitude
      )
    : 0;

  // Handle missing meeting point data
  if (!tripMatch?.meetingPoint?.location) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Text style={styles.errorTitle}>⚠️ Meeting Point Required</Text>
        <Text style={styles.errorMessage}>
          A meeting point needs to be set before navigation can begin.
        </Text>
        <Text style={styles.errorHint}>
          Ask your companion to set a meeting point first!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={mapRegion}
        showsUserLocation={true}
        showsMyLocationButton={false}
        followsUserLocation={false}
        apiKey="AIzaSyBpelv4QoqO2lHJQVGj46W0xk-sVDv6KQk"
      >
        {getMapMarkers()}
        
        {/* Route polyline */}
        {routeCoords.length > 1 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor="#2196F3"
            strokeWidth={4}
            lineDashPattern={[5, 5]}
          />
        )}

        {/* Meeting point radius circle */}
        {tripMatch?.meetingPoint?.location && (
          <Circle
            center={tripMatch.meetingPoint.location}
            radius={50}
            strokeColor="rgba(34, 150, 243, 0.3)"
            fillColor="rgba(34, 150, 243, 0.1)"
          />
        )}
      </MapView>

      {/* Route info overlay - only show if hideOverlays is false */}
      {!hideOverlays && (
        <View style={styles.routeInfo}>
          <Text style={styles.routeTitle}>
            {userRole === 'organizer' ? '📍 Your Route (Sender)' : '🚶 Your Journey (Receiver)'}
          </Text>
          <Text style={styles.routeDescription}>
            {userRole === 'organizer' 
              ? 'From Starting Point → Final Destination'
              : 'Current Location → Meeting Point → Destination'
            }
          </Text>
          {userRole === 'companion' && distance > 0 && (
            <Text style={styles.distanceText}>
              📍 {Math.round(distance)}m to meeting point
            </Text>
          )}
          <Text style={styles.meetingPointText}>
            📍 {tripMatch?.meetingPoint?.name || 'Meeting Point'}
          </Text>
        </View>
      )}

      {/* Navigation controls - only show if hideOverlays is false */}
      {!hideOverlays && (
        <View style={styles.navigationControls}>
          <TouchableOpacity
            style={[
              styles.navigationButton,
              { backgroundColor: isNavigating ? '#FF5722' : '#4CAF50' }
            ]}
            onPress={isNavigating ? () => setIsNavigating(false) : startInAppNavigation}
          >
            <Ionicons 
              name={isNavigating ? "stop" : "navigate"} 
              size={24} 
              color="white" 
            />
            <Text style={styles.navigationButtonText}>
              {isNavigating ? 'Stop Navigation' : 'Start Navigation'}
            </Text>
          </TouchableOpacity>
          
          {/* Almost There / Arrival Status Button */}
          {distance > 0 && distance <= 100 && !hasArrived && (
            <TouchableOpacity
              style={[styles.navigationButton, { backgroundColor: '#2196F3' }]}
              onPress={handleAlmostThere}
            >
              <Ionicons name="checkmark-circle" size={24} color="white" />
              <Text style={styles.navigationButtonText}>Almost There!</Text>
            </TouchableOpacity>
          )}
          
          {hasArrived && !bothArrived && (
            <TouchableOpacity
              style={[styles.navigationButton, { backgroundColor: '#FFC107' }]}
              disabled={true}
            >
              <Ionicons name="time" size={24} color="white" />
              <Text style={styles.navigationButtonText}>Waiting for Companion</Text>
            </TouchableOpacity>
          )}
          
          {bothArrived && (
            <TouchableOpacity
              style={[styles.navigationButton, { backgroundColor: '#4CAF50' }]}
              onPress={() => Alert.alert('Ready to Start!', 'Both users have arrived. You can now start your trip together!')}
            >
              <Ionicons name="rocket" size={24} color="white" />
              <Text style={styles.navigationButtonText}>Ready to Start Trip!</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  currentLocationMarker: {
    backgroundColor: '#2196F3',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  meetingPointMarker: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  destinationMarker: {
    backgroundColor: '#F44336',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  companionMarker: {
    backgroundColor: '#FF9800',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  routeInfo: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  routeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  routeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  distanceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  meetingPointText: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  navigationControls: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
  },
  navigationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  navigationButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 30,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF5722',
    textAlign: 'center',
    marginBottom: 15,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 22,
  },
  errorHint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default RouteMapView;