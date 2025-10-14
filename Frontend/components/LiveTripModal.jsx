// Frontend/components/LiveTripModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import MapView, { Marker, Polyline, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Colors } from '../constants/Colors';
import { BASE_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function LiveTripModal({
  visible,
  onClose,
  match,
  currentUserId,
  onUpdateTripStatus
}) {
  const [myLocation, setMyLocation] = useState(null);
  const [otherUserLocation, setOtherUserLocation] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [route, setRoute] = useState([]);
  const [error, setError] = useState(null);
  const [tripDistance, setTripDistance] = useState(null);
  const [estimatedTime, setEstimatedTime] = useState(null);

  const mapRef = useRef(null);
  const locationWatcher = useRef(null);
  const pollInterval = useRef(null);

  const isOrganizer = match?.organizer?.userId === currentUserId;
  const otherUser = isOrganizer ? match?.companion : match?.organizer;
  const myRole = isOrganizer ? 'Organizer' : 'Companion';

  useEffect(() => {
    if (visible && match) {
      startLiveTracking();
    } else {
      stopLiveTracking();
    }

    return () => stopLiveTracking();
  }, [visible, match]);

  // Start live location tracking
  const startLiveTracking = async () => {
    try {
      console.log('🎯 [LIVE TRIP] Starting live tracking for match:', match.matchId);
      
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission required for live tracking');
        return;
      }

      setIsTracking(true);
      setError(null);

      // Start watching my location
      locationWatcher.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10, // Update every 10 meters
        },
        (location) => {
          const coords = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          
          setMyLocation(coords);
          updateMyLocationOnServer(coords);
        }
      );

      // Start polling for other user's location
      pollInterval.current = setInterval(() => {
        fetchOtherUserLocation();
      }, 5000); // Poll every 5 seconds

      // Initial fetch
      await fetchOtherUserLocation();

    } catch (err) {
      console.error('❌ [LIVE TRIP] Error starting tracking:', err);
      setError('Failed to start location tracking');
    }
  };

  // Stop live tracking
  const stopLiveTracking = () => {
    console.log('⏹️ [LIVE TRIP] Stopping live tracking');
    
    if (locationWatcher.current) {
      locationWatcher.current.remove();
      locationWatcher.current = null;
    }

    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
    }

    setIsTracking(false);
  };

  // Update my location on server
  const updateMyLocationOnServer = async (coords) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const API_URL = BASE_URL.replace(/\/+$/, '');
      const response = await fetch(`${API_URL}/api/v1/trip/match/${match.matchId}/location`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          latitude: coords.latitude,
          longitude: coords.longitude
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update location on server');
      }

      console.log('📍 [LIVE TRIP] Location updated on server');
    } catch (err) {
      console.error('❌ [LIVE TRIP] Error updating location:', err);
    }
  };

  // Fetch other user's location
  const fetchOtherUserLocation = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const API_URL = BASE_URL.replace(/\/+$/, '');
      const response = await fetch(`${API_URL}/api/v1/trip/match/${match.matchId}/locations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (response.ok && result.status === 'success') {
        const { locationSharing } = result.data;
        
        if (locationSharing?.enabled) {
          const otherLocation = isOrganizer 
            ? locationSharing.companionLocation 
            : locationSharing.organizerLocation;

          if (otherLocation?.latitude && otherLocation?.longitude) {
            setOtherUserLocation({
              latitude: otherLocation.latitude,
              longitude: otherLocation.longitude,
              lastUpdated: otherLocation.lastUpdated
            });
          }
        }
      }
    } catch (err) {
      console.error('❌ [LIVE TRIP] Error fetching other user location:', err);
    }
  };

  // Calculate route between users
  useEffect(() => {
    if (myLocation && otherUserLocation) {
      calculateRoute();
      calculateDistance();
    }
  }, [myLocation, otherUserLocation]);

  const calculateRoute = async () => {
    try {
      // For demo purposes, create a simple straight line route
      // In production, you'd use Google Directions API
      const route = [myLocation, otherUserLocation];
      setRoute(route);
      
      // Fit map to show both locations
      if (mapRef.current) {
        const coordinates = route.filter(coord => coord !== null);
        if (coordinates.length > 1) {
          mapRef.current.fitToCoordinates(coordinates, {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true,
          });
        }
      }
    } catch (err) {
      console.error('❌ [LIVE TRIP] Error calculating route:', err);
    }
  };

  const calculateDistance = () => {
    if (!myLocation || !otherUserLocation) return;

    const R = 6371; // Earth's radius in kilometers
    const dLat = (otherUserLocation.latitude - myLocation.latitude) * Math.PI / 180;
    const dLon = (otherUserLocation.longitude - myLocation.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(myLocation.latitude * Math.PI / 180) * 
      Math.cos(otherUserLocation.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    setTripDistance(distance.toFixed(2));
    // Rough estimate: walking speed ~5 km/h
    setEstimatedTime(Math.ceil((distance / 5) * 60));
  };

  const handleCompleteTrip = () => {
    Alert.alert(
      'Complete Trip',
      'Mark this trip as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              await onUpdateTripStatus(match.matchId, 'completed');
              onClose();
              Alert.alert('Success', 'Trip completed successfully!');
            } catch (error) {
              Alert.alert('Error', 'Failed to complete trip');
            }
          }
        }
      ]
    );
  };

  const handleEmergency = () => {
    Alert.alert(
      'Emergency',
      'Do you need emergency assistance?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call Emergency', onPress: () => {/* Implement emergency call */} },
        { text: 'Share Location', onPress: () => {/* Share location with emergency contacts */} }
      ]
    );
  };

  if (!match) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          
          <View style={styles.headerInfo}>
            <Text style={styles.title}>Live Trip Tracking</Text>
            <Text style={styles.subtitle}>
              {match.tripDetails?.destination || 'Unknown destination'}
            </Text>
          </View>
          
          <TouchableOpacity onPress={handleEmergency} style={styles.emergencyButton}>
            <Ionicons name="alert" size={24} color="#FF4444" />
          </TouchableOpacity>
        </View>

        {/* Trip Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="people" size={20} color={Colors.light.tint} />
            <Text style={styles.statValue}>{myRole}</Text>
            <Text style={styles.statLabel}>Your Role</Text>
          </View>
          
          {tripDistance && (
            <View style={styles.statCard}>
              <Ionicons name="location" size={20} color={Colors.light.tint} />
              <Text style={styles.statValue}>{tripDistance} km</Text>
              <Text style={styles.statLabel}>Distance</Text>
            </View>
          )}
          
          {estimatedTime && (
            <View style={styles.statCard}>
              <Ionicons name="time" size={20} color={Colors.light.tint} />
              <Text style={styles.statValue}>{estimatedTime} min</Text>
              <Text style={styles.statLabel}>Est. Time</Text>
            </View>
          )}
        </View>

        {/* Map */}
        <View style={styles.mapContainer}>
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="warning" size={48} color="#FF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              initialRegion={{
                latitude: myLocation?.latitude || match.tripDetails?.startCoordinates?.latitude || 37.7749,
                longitude: myLocation?.longitude || match.tripDetails?.startCoordinates?.longitude || -122.4194,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              showsUserLocation={true}
              showsMyLocationButton={true}
            >
              {/* My Location */}
              {myLocation && (
                <Marker
                  coordinate={myLocation}
                  title={`${myRole} (You)`}
                  description="Your current location"
                  pinColor={isOrganizer ? '#4CAF50' : '#2196F3'}
                >
                  <View style={[styles.markerContainer, { backgroundColor: isOrganizer ? '#4CAF50' : '#2196F3' }]}>
                    <Ionicons name="person" size={20} color="white" />
                  </View>
                </Marker>
              )}

              {/* Other User Location */}
              {otherUserLocation && (
                <Marker
                  coordinate={otherUserLocation}
                  title={otherUser?.userName || 'Companion'}
                  description={`${isOrganizer ? 'Companion' : 'Organizer'} location`}
                  pinColor={isOrganizer ? '#2196F3' : '#4CAF50'}
                >
                  <View style={[styles.markerContainer, { backgroundColor: isOrganizer ? '#2196F3' : '#4CAF50' }]}>
                    <Ionicons name="person" size={20} color="white" />
                  </View>
                </Marker>
              )}

              {/* Meeting Point */}
              {match.meetingPoint?.location && (
                <Marker
                  coordinate={match.meetingPoint.location}
                  title="Meeting Point"
                  description={match.meetingPoint.name}
                  pinColor="#FF9800"
                >
                  <View style={[styles.markerContainer, { backgroundColor: '#FF9800' }]}>
                    <Ionicons name="flag" size={20} color="white" />
                  </View>
                </Marker>
              )}

              {/* Route Line */}
              {route.length > 1 && (
                <Polyline
                  coordinates={route}
                  strokeColor="#2196F3"
                  strokeWidth={3}
                  lineDashPattern={[5, 5]}
                />
              )}

              {/* Proximity Circle */}
              {otherUserLocation && tripDistance && parseFloat(tripDistance) < 0.5 && (
                <Circle
                  center={otherUserLocation}
                  radius={100}
                  fillColor="rgba(76, 175, 80, 0.2)"
                  strokeColor="#4CAF50"
                  strokeWidth={2}
                />
              )}
            </MapView>
          )}
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          {isTracking ? (
            <View style={styles.trackingIndicator}>
              <ActivityIndicator size="small" color={Colors.light.tint} />
              <Text style={styles.trackingText}>Live tracking active</Text>
            </View>
          ) : (
            <Text style={styles.trackingText}>Location tracking disabled</Text>
          )}

          <TouchableOpacity
            style={styles.completeButton}
            onPress={handleCompleteTrip}
          >
            <Ionicons name="checkmark-circle" size={20} color="white" />
            <Text style={styles.completeButtonText}>Complete Trip</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: Colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#E3F2FD',
  },
  backButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
    marginTop: 4,
  },
  emergencyButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.light.surface,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.light.tabIconDefault,
    marginTop: 2,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#FF4444',
    textAlign: 'center',
    marginTop: 16,
  },
  markerContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.light.surface,
    borderTopWidth: 1,
    borderTopColor: '#E3F2FD',
  },
  trackingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackingText: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
    marginLeft: 8,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  completeButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
});