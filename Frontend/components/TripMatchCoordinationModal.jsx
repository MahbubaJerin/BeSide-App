// Frontend/components/TripMatchCoordinationModal.jsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config';

const TripMatchCoordinationModal = ({ 
  visible, 
  onClose, 
  tripMatch, 
  userRole, // 'organizer' or 'companion'
  onLocationUpdate 
}) => {
  const [loading, setLoading] = useState(false);
  const [meetingPointSet, setMeetingPointSet] = useState(false);
  const [locationSharingStarted, setLocationSharingStarted] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapRegion, setMapRegion] = useState(null);

  useEffect(() => {
    if (tripMatch) {
      // Check if meeting point is already set
      setMeetingPointSet(!!tripMatch.meetingPoint?.location);
      
      // Check if location sharing is enabled
      setLocationSharingStarted(tripMatch.liveLocationSharing?.enabled || false);

      // Set initial map region based on destination or meeting point
      if (tripMatch.meetingPoint?.location) {
        setMapRegion({
          latitude: tripMatch.meetingPoint.location.latitude,
          longitude: tripMatch.meetingPoint.location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      } else if (tripMatch.tripDetails?.destinationLocation) {
        setMapRegion({
          latitude: tripMatch.tripDetails.destinationLocation.latitude,
          longitude: tripMatch.tripDetails.destinationLocation.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      }
    }
  }, [tripMatch]);

  const handleMapPress = (event) => {
    if (!meetingPointSet) {
      const coordinate = event.nativeEvent.coordinate;
      setSelectedLocation(coordinate);
    }
  };

  const setMeetingPoint = async () => {
    if (!selectedLocation) {
      Alert.alert('Error', 'Please select a location on the map for the meeting point');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      
      const response = await fetch(`${BASE_URL}/api/trip/match/${tripMatch.matchId}/meeting-point`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          meetingPoint: {
            name: 'Meeting Point',
            description: 'Selected meeting location',
            location: selectedLocation,
            type: 'custom'
          }
        }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        setMeetingPointSet(true);
        setSelectedLocation(null);
        Alert.alert('Success', 'Meeting point set successfully!');
        // Update parent component if callback provided
        if (onLocationUpdate) {
          onLocationUpdate(data.data.tripMatch);
        }
      } else {
        Alert.alert('Error', data.message || 'Failed to set meeting point');
      }
    } catch (error) {
      console.error('Error setting meeting point:', error);
      Alert.alert('Error', 'Failed to set meeting point. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startLocationSharing = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      
      const response = await fetch(`${BASE_URL}/api/trip/match/${tripMatch.matchId}/start-sharing`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.status === 'success') {
        setLocationSharingStarted(true);
        Alert.alert('Success', 'Live location sharing started! Trip is now in progress.');
        // Update parent component if callback provided
        if (onLocationUpdate) {
          onLocationUpdate(data.data.tripMatch);
        }
      } else {
        Alert.alert('Error', data.message || 'Failed to start location sharing');
      }
    } catch (error) {
      console.error('Error starting location sharing:', error);
      Alert.alert('Error', 'Failed to start location sharing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const cancelTrip = async () => {
    Alert.alert(
      'Cancel Trip',
      'Are you sure you want to cancel this trip match? This cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const token = await AsyncStorage.getItem('token');
              
              const response = await fetch(`${BASE_URL}/api/trip/match/${tripMatch.matchId}/cancel`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                  reason: 'Cancelled by user'
                }),
              });

              const data = await response.json();

              if (data.status === 'success') {
                Alert.alert('Trip Cancelled', 'The trip match has been cancelled.');
                onClose();
              } else {
                Alert.alert('Error', data.message || 'Failed to cancel trip');
              }
            } catch (error) {
              console.error('Error cancelling trip:', error);
              Alert.alert('Error', 'Failed to cancel trip. Please try again.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (!tripMatch) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <ScrollView style={styles.scrollContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Trip Coordination</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Trip Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trip Details</Text>
            <Text style={styles.detailText}>Destination: {tripMatch.tripDetails.destination}</Text>
            <Text style={styles.detailText}>
              {userRole === 'organizer' ? 'Companion' : 'Organizer'}: {
                userRole === 'organizer' 
                  ? tripMatch.companion.userName 
                  : tripMatch.organizer.userName
              }
            </Text>
            <Text style={styles.detailText}>
              Status: {tripMatch.status.charAt(0).toUpperCase() + tripMatch.status.slice(1)}
            </Text>
          </View>

          {/* Map for Meeting Point */}
          {mapRegion && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {meetingPointSet ? 'Meeting Point Set' : 'Select Meeting Point'}
              </Text>
              
              <View style={styles.mapContainer}>
                <MapView
                  provider={PROVIDER_GOOGLE}
                  style={styles.map}
                  region={mapRegion}
                  onPress={handleMapPress}
                >
                  {/* Meeting point marker */}
                  {tripMatch.meetingPoint?.location && (
                    <Marker
                      coordinate={tripMatch.meetingPoint.location}
                      title="Meeting Point"
                      description={tripMatch.meetingPoint.description}
                      pinColor="green"
                    />
                  )}
                  
                  {/* Selected location marker (temporary) */}
                  {selectedLocation && !meetingPointSet && (
                    <Marker
                      coordinate={selectedLocation}
                      title="Selected Meeting Point"
                      pinColor="orange"
                    />
                  )}
                  
                  {/* Destination marker */}
                  {tripMatch.tripDetails?.destinationLocation && (
                    <Marker
                      coordinate={tripMatch.tripDetails.destinationLocation}
                      title="Destination"
                      description={tripMatch.tripDetails.destination}
                      pinColor="red"
                    />
                  )}
                </MapView>
              </View>

              {/* Meeting Point Actions */}
              {!meetingPointSet && (
                <TouchableOpacity 
                  style={[styles.actionButton, selectedLocation ? styles.enabledButton : styles.disabledButton]}
                  onPress={setMeetingPoint}
                  disabled={!selectedLocation || loading}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.buttonText}>Set Meeting Point</Text>
                  )}
                </TouchableOpacity>
              )}

              {meetingPointSet && tripMatch.meetingPoint?.setBy && (
                <Text style={styles.infoText}>
                  Meeting point set by {tripMatch.meetingPoint.setBy}
                </Text>
              )}
            </View>
          )}

          {/* Location Sharing */}
          {meetingPointSet && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Live Location Sharing</Text>
              
              {!locationSharingStarted ? (
                <View>
                  <Text style={styles.infoText}>
                    Start live location sharing when you're ready to begin the trip.
                    This will allow both of you to see each other's real-time location.
                  </Text>
                  
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.startButton]}
                    onPress={startLocationSharing}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={styles.buttonText}>Start Location Sharing</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <Text style={styles.successText}>✅ Live location sharing is active</Text>
                  <Text style={styles.infoText}>
                    Your location is being shared with your companion. 
                    You can see each other's real-time location on the map.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Cancel Option */}
          <View style={styles.section}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.cancelButton]}
              onPress={cancelTrip}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel Trip Match</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  detailText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  mapContainer: {
    height: 200,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 15,
  },
  map: {
    flex: 1,
  },
  actionButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  enabledButton: {
    backgroundColor: '#007AFF',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  startButton: {
    backgroundColor: '#28a745',
  },
  cancelButton: {
    backgroundColor: '#dc3545',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  successText: {
    fontSize: 16,
    color: '#28a745',
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: 'bold',
  },
});

export default TripMatchCoordinationModal;
