// Frontend/components/FinalJourneyModal.jsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config';

const { width, height } = Dimensions.get('window');
const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

const FinalJourneyModal = ({ 
  visible, 
  onClose, 
  tripMatch,
  userRole = 'companion', // 'organizer' or 'companion'
  currentUserId,
  onTripCompleted, // New callback for when trip is completed
}) => {
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tripStatus, setTripStatus] = useState('in-progress');
  const [endTripStatus, setEndTripStatus] = useState({
    userEnded: false,
    waitingForOther: false,
    bothEnded: false,
    tripCompleted: false
  });

  useEffect(() => {
    console.log("🗺️ [FINAL JOURNEY MODAL] Modal state - visible:", visible, "tripMatch:", tripMatch ? "EXISTS" : "NULL");
    
    if (visible && tripMatch) {
      // Check initial trip ending status
      if (currentUserId && tripMatch.endedUsers) {
        const userEnded = tripMatch.endedUsers.includes(currentUserId);
        const bothEnded = tripMatch.tripEnded || tripMatch.endedUsers.length === 2;
        const tripCompleted = tripMatch.status === 'completed' && bothEnded;
        
        setEndTripStatus({
          userEnded,
          waitingForOther: userEnded && !bothEnded,
          bothEnded,
          tripCompleted
        });
      }
      
      if (tripMatch.meetingPoint && tripMatch.tripDetails?.destinationLocation) {
        console.log("🗺️ [FINAL JOURNEY MODAL] Calculating route from meeting point to destination");
        calculateRoute();
      } else {
        console.log("🗺️ [FINAL JOURNEY MODAL] Not calculating route - missing data");
        console.log("- visible:", visible);
        console.log("- tripMatch:", tripMatch ? "EXISTS" : "NULL"); 
        console.log("- meetingPoint:", tripMatch?.meetingPoint ? "EXISTS" : "NULL");
        console.log("- destinationLocation:", tripMatch?.tripDetails?.destinationLocation ? "EXISTS" : "NULL");
      }
    }
  }, [visible, tripMatch, currentUserId]);

  const calculateRoute = async () => {
    try {
      setLoading(true);
      
      // Get route from meeting point to destination
      const origin = tripMatch?.meetingPoint?.location;
      const destination = tripMatch?.tripDetails?.destinationLocation;
      
      console.log("🗺️ [ROUTE DEBUG] Origin:", origin);
      console.log("🗺️ [ROUTE DEBUG] Destination:", destination);
      
      if (!origin || !destination) {
        console.log('❌ [ROUTE DEBUG] Missing route information:', { origin, destination });
        Alert.alert('Error', 'Missing route information');
        setLoading(false);
        return;
      }

      if (!origin.latitude || !origin.longitude || !destination.latitude || !destination.longitude) {
        console.log('❌ [ROUTE DEBUG] Invalid coordinates:', { 
          originLat: origin.latitude, 
          originLng: origin.longitude,
          destLat: destination.latitude,
          destLng: destination.longitude
        });
        Alert.alert('Error', 'Invalid coordinates');
        setLoading(false);
        return;
      }

      if (!GOOGLE_MAPS_KEY) {
        console.log('❌ [ROUTE DEBUG] Google Maps API key not found');
        Alert.alert('Error', 'Google Maps API key not configured');
        setLoading(false);
        return;
      }

      const apiUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${GOOGLE_MAPS_KEY}`;
      console.log("🗺️ [ROUTE DEBUG] API URL:", apiUrl.replace(GOOGLE_MAPS_KEY, 'API_KEY_HIDDEN'));

      const response = await fetch(apiUrl);
      const data = await response.json();
      
      console.log("🗺️ [ROUTE DEBUG] API Response:", data);
      
      if (data.status !== 'OK') {
        console.log('❌ [ROUTE DEBUG] API Error:', data.status, data.error_message);
        Alert.alert('Error', `Could not calculate route: ${data.status}`);
        setLoading(false);
        return;
      }
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const points = decode(route.overview_polyline.points);
        
        console.log("✅ [ROUTE DEBUG] Route calculated successfully, points:", points.length);
        
        setRouteData({
          coordinates: points,
          distance: route.legs[0].distance.text,
          duration: route.legs[0].duration.text,
          origin: origin,
          destination: destination,
        });
      } else {
        console.log('❌ [ROUTE DEBUG] No routes found in response');
        Alert.alert('Error', 'Could not calculate route - no routes found');
      }
    } catch (error) {
      console.error('❌ [ROUTE DEBUG] Route calculation error:', error);
      Alert.alert('Error', 'Failed to calculate route');
    } finally {
      setLoading(false);
    }
  };

  // Decode polyline function (Google Maps polyline decoding)
  const decode = (polyline) => {
    const points = [];
    let index = 0;
    const len = polyline.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b;
      let shift = 0;
      let result = 0;
      do {
        b = polyline.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = polyline.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }
    return points;
  };

  const handleEndTrip = async () => {
    try {
      if (endTripStatus.userEnded) {
        Alert.alert(
          'Trip Already Ended',
          endTripStatus.bothEnded 
            ? 'Both users have confirmed the trip has ended!' 
            : 'You have already ended this trip. Waiting for your companion to confirm.',
          [{ text: 'OK' }]
        );
        return;
      }

      Alert.alert(
        'End Trip',
        'Are you sure you want to end this trip? You will need to wait for your companion to also confirm before the trip is completed.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'End Trip', 
            style: 'destructive',
            onPress: async () => {
              try {
                const token = await AsyncStorage.getItem('token');
                const API_URL = BASE_URL.replace(/\/+$/, '');
                
                const response = await fetch(`${API_URL}/api/v1/trip/match/${tripMatch.matchId}/end-trip`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  }
                });

                const result = await response.json();

                if (!response.ok) {
                  throw new Error(result.message || 'Failed to end trip');
                }

                const { userEnded, waitingForOther, bothEnded, tripCompleted } = result.data;
                
                setEndTripStatus({
                  userEnded,
                  waitingForOther,
                  bothEnded,
                  tripCompleted
                });

                if (tripCompleted) {
                  Alert.alert(
                    '🎉 Trip Completed!',
                    'Both users have confirmed the trip has ended. Thank you for traveling with BeSide!',
                    [{ 
                      text: 'View Trip History', 
                      onPress: () => {
                        onClose();
                        onTripCompleted && onTripCompleted();
                      }
                    }]
                  );
                } else if (waitingForOther) {
                  Alert.alert(
                    '✅ Trip Ended',
                    'You have successfully ended the trip. Waiting for your companion to confirm.',
                    [{ text: 'OK' }]
                  );
                }
              } catch (error) {
                console.error('❌ [END TRIP] Error ending trip:', error);
                Alert.alert('Error', error.message || 'Failed to end trip. Please try again.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ [END TRIP] Error in handleEndTrip:', error);
      Alert.alert('Error', 'Failed to end trip. Please try again.');
    }
  };

  const getInitialRegion = () => {
    if (!routeData) return null;
    
    const { origin, destination } = routeData;
    
    // Calculate center point between origin and destination
    const centerLat = (origin.latitude + destination.latitude) / 2;
    const centerLng = (origin.longitude + destination.longitude) / 2;
    
    // Calculate deltas to show both points
    const latDelta = Math.abs(origin.latitude - destination.latitude) * 1.5;
    const lngDelta = Math.abs(origin.longitude - destination.longitude) * 1.5;
    
    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: Math.max(latDelta, 0.01),
      longitudeDelta: Math.max(lngDelta, 0.01),
    };
  };

  const companionInfo = userRole === 'organizer' ? tripMatch?.companion : tripMatch?.organizer;

  // Early return if no tripMatch data
  if (!tripMatch) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={onClose}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Loading Trip...</Text>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Loading trip details...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onClose}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Final Journey</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Trip Info */}
        <View style={styles.tripInfo}>
          <View style={styles.tripInfoRow}>
            <Ionicons name="people" size={20} color="#4CAF50" />
            <Text style={styles.tripInfoText}>
              Traveling with {companionInfo?.userName || 'Companion'}
            </Text>
          </View>
          {routeData && (
            <View style={styles.tripInfoRow}>
              <Ionicons name="time" size={20} color="#2196F3" />
              <Text style={styles.tripInfoText}>
                {routeData.distance} • {routeData.duration}
              </Text>
            </View>
          )}
          
          {/* Trip Status Indicator */}
          {endTripStatus.tripCompleted ? (
            <View style={styles.tripInfoRow}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={[styles.tripInfoText, { color: '#4CAF50' }]}>
                Trip completed by both users
              </Text>
            </View>
          ) : endTripStatus.userEnded ? (
            <View style={styles.tripInfoRow}>
              <Ionicons name="hourglass" size={20} color="#FF9800" />
              <Text style={[styles.tripInfoText, { color: '#FF9800' }]}>
                Waiting for companion to end trip
              </Text>
            </View>
          ) : null}
        </View>

        {/* Map */}
        <View style={styles.mapContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4CAF50" />
              <Text style={styles.loadingText}>Calculating route...</Text>
            </View>
          ) : routeData ? (
            <MapView
              style={styles.map}
              initialRegion={getInitialRegion()}
              showsUserLocation={true}
              showsMyLocationButton={true}
            >
              {/* Meeting Point Marker */}
              <Marker
                coordinate={routeData.origin}
                title="Meeting Point"
                description="Start of your journey together"
                pinColor="green"
              >
                <View style={styles.markerContainer}>
                  <Ionicons name="flag" size={30} color="#4CAF50" />
                </View>
              </Marker>

              {/* Destination Marker */}
              <Marker
                coordinate={routeData.destination}
                title="Destination"
                description="Your final destination"
                pinColor="red"
              >
                <View style={styles.markerContainer}>
                  <Ionicons name="location" size={30} color="#F44336" />
                </View>
              </Marker>

              {/* Route Polyline */}
              <Polyline
                coordinates={routeData.coordinates}
                strokeColor="#4CAF50"
                strokeWidth={4}
                lineDashPattern={[5, 5]}
              />
            </MapView>
          ) : (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={50} color="#F44336" />
              <Text style={styles.errorText}>Unable to load route</Text>
            </View>
          )}
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <View style={styles.instructionItem}>
            <Ionicons name="navigate" size={20} color="#4CAF50" />
            <Text style={styles.instructionText}>
              Follow the green route to your destination
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Ionicons name="people" size={20} color="#2196F3" />
            <Text style={styles.instructionText}>
              Stay together with your companion during the journey
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {endTripStatus.tripCompleted ? (
            // Both users have ended - show trip history button
            <TouchableOpacity
              style={styles.tripHistoryButton}
              onPress={() => {
                onClose();
                onTripCompleted && onTripCompleted();
              }}
            >
              <Ionicons name="list" size={24} color="white" />
              <Text style={styles.tripHistoryButtonText}>View Trip History</Text>
            </TouchableOpacity>
          ) : (
            // Trip not completed - show end trip button
            <TouchableOpacity
              style={[
                styles.endTripButton,
                endTripStatus.userEnded && styles.endTripButtonDisabled
              ]}
              onPress={handleEndTrip}
              disabled={endTripStatus.userEnded}
            >
              <Ionicons 
                name={endTripStatus.userEnded ? "checkmark-circle" : "stop-circle"} 
                size={24} 
                color="white" 
              />
              <Text style={styles.endTripButtonText}>
                {endTripStatus.userEnded ? "Trip Ended - Waiting" : "End Trip"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 34,
  },
  tripInfo: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tripInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tripInfoText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  mapContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: '#F44336',
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructions: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  instructionText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'white',
  },
  endTripButton: {
    backgroundColor: '#F44336',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  endTripButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  endTripButtonDisabled: {
    backgroundColor: '#95A5A6',
  },
  tripHistoryButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  tripHistoryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});

export default FinalJourneyModal;