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

const RouteMapView = ({ 
  tripMatch, 
  userRole, // 'organizer' or 'companion'
  onNavigationStart,
  onArrivalDetected
}) => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [isNavigating, setIsNavigating] = useState(false);
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
      if (isNavigating && tripMatch?.meetingPoint?.location) {
        checkArrival(newLocation, tripMatch.meetingPoint.location);
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

  // Generate route coordinates (simplified - in real app, use Google Directions API)
  const generateRouteCoordinates = () => {
    if (!currentLocation) {
      console.log('🗺️ [ROUTE MAP] No current location for route generation');
      return [];
    }
    
    if (!tripMatch?.meetingPoint?.location) {
      console.log('🗺️ [ROUTE MAP] No meeting point location for route generation', {
        hasTripMatch: !!tripMatch,
        hasMeetingPoint: !!tripMatch?.meetingPoint,
        meetingPointLocation: tripMatch?.meetingPoint?.location
      });
      return [];
    }

    // Simple straight line route for demo
    // In production, use Google Directions API for real routes
    const route = [
      currentLocation,
      tripMatch.meetingPoint.location
    ];
    
    console.log('🗺️ [ROUTE MAP] Generated route coordinates:', route);
    return route;
  };

  // Open Google Maps for turn-by-turn navigation
  const startExternalNavigation = () => {
    if (!tripMatch?.meetingPoint?.location) {
      Alert.alert('Error', 'Meeting point not available');
      return;
    }

    const { latitude, longitude } = tripMatch.meetingPoint.location;
    const label = encodeURIComponent(tripMatch.meetingPoint.name || 'Meeting Point');
    
    let url;
    if (Platform.OS === 'ios') {
      url = `maps://0,0?q=${label}@${latitude},${longitude}`;
    } else {
      url = `geo:0,0?q=${latitude},${longitude}(${label})`;
    }

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          setIsNavigating(true);
          onNavigationStart && onNavigationStart();
          return Linking.openURL(url);
        } else {
          // Fallback to Google Maps web
          const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
          return Linking.openURL(webUrl);
        }
      })
      .catch((err) => {
        console.error('Navigation error:', err);
        Alert.alert('Error', 'Unable to open navigation app');
      });
  };

  // Get markers for map
  const getMapMarkers = () => {
    const markers = [];

    // Current location marker
    if (currentLocation) {
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

    // Meeting point marker
    if (tripMatch?.meetingPoint?.location) {
      markers.push(
        <Marker
          key="meeting"
          coordinate={tripMatch.meetingPoint.location}
          title="Meeting Point"
          description={tripMatch.meetingPoint.name || 'Meet your companion here'}
          pinColor="green"
        >
          <View style={styles.meetingPointMarker}>
            <Ionicons name="flag" size={16} color="white" />
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

      {/* Route info overlay */}
      <View style={styles.routeInfo}>
        <Text style={styles.distanceText}>
          📍 {Math.round(distance)}m to meeting point
        </Text>
        <Text style={styles.meetingPointText}>
          📍 {tripMatch?.meetingPoint?.name || 'Meeting Point'}
        </Text>
      </View>

      {/* Navigation controls */}
      <View style={styles.navigationControls}>
        <TouchableOpacity
          style={[
            styles.navigationButton,
            { backgroundColor: isNavigating ? '#FF5722' : '#4CAF50' }
          ]}
          onPress={isNavigating ? () => setIsNavigating(false) : startExternalNavigation}
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
        
        {distance > 0 && distance <= 100 && (
          <TouchableOpacity
            style={[styles.navigationButton, { backgroundColor: '#2196F3' }]}
            onPress={() => Alert.alert('Close!', 'You are very close to the meeting point!')}
          >
            <Ionicons name="checkmark-circle" size={24} color="white" />
            <Text style={styles.navigationButtonText}>Almost There!</Text>
          </TouchableOpacity>
        )}
      </View>
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