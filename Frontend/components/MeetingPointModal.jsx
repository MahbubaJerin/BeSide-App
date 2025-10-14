// Frontend/components/MeetingPointModal.jsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Colors } from '../constants/Colors';

export default function MeetingPointModal({
  visible,
  onClose,
  match,
  onSetMeetingPoint,
  currentLocation
}) {
  const [customLocation, setCustomLocation] = useState('');
  const [isSettingPoint, setIsSettingPoint] = useState(false);
  const [suggestedPoints, setSuggestedPoints] = useState([]);

  useEffect(() => {
    if (visible && currentLocation) {
      generateSuggestedMeetingPoints();
    }
  }, [visible, currentLocation]);

  const generateSuggestedMeetingPoints = () => {
    if (!currentLocation || !match) return;

    // Calculate midpoint between organizer and companion locations
    const org = match.organizer.location || currentLocation;
    const comp = match.companion.location || currentLocation;
    
    const midLat = (org.latitude + comp.latitude) / 2;
    const midLng = (org.longitude + comp.longitude) / 2;

    // Generate suggested meeting points around the midpoint
    const suggestions = [
      {
        id: 1,
        name: 'Midpoint Location',
        description: 'Halfway between both locations',
        latitude: midLat,
        longitude: midLng,
        type: 'midpoint'
      },
      {
        id: 2,
        name: 'Organizer\'s Location',
        description: 'Meet at trip organizer\'s location',
        latitude: org.latitude,
        longitude: org.longitude,
        type: 'organizer'
      },
      {
        id: 3,
        name: 'Companion\'s Location', 
        description: 'Meet at companion\'s location',
        latitude: comp.latitude,
        longitude: comp.longitude,
        type: 'companion'
      }
    ];

    setSuggestedPoints(suggestions);
  };

  const handleSetMeetingPoint = async (point) => {
    setIsSettingPoint(true);
    try {
      await onSetMeetingPoint(match.matchId, point);
      
      Alert.alert(
        'Meeting Point Set!',
        'Both users will be notified of the meeting location.',
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to set meeting point. Please try again.');
    } finally {
      setIsSettingPoint(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    if (!currentLocation) {
      Alert.alert('Error', 'Current location not available');
      return;
    }

    const point = {
      name: 'Current Location',
      description: 'My current location',
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      type: 'current'
    };

    await handleSetMeetingPoint(point);
  };

  const handleCustomLocation = async () => {
    if (!customLocation.trim()) {
      Alert.alert('Error', 'Please enter a location');
      return;
    }

    try {
      // Geocode the custom location
      const geocoded = await Location.geocodeAsync(customLocation);
      
      if (geocoded.length === 0) {
        Alert.alert('Error', 'Location not found. Please try a different address.');
        return;
      }

      const location = geocoded[0];
      const point = {
        name: customLocation,
        description: 'Custom meeting point',
        latitude: location.latitude,
        longitude: location.longitude,
        type: 'custom'
      };

      await handleSetMeetingPoint(point);
    } catch (error) {
      Alert.alert('Error', 'Failed to find location. Please try again.');
    }
  };

  if (!match) return null;

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
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Set Meeting Point</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          {/* Trip Info */}
          <View style={styles.tripInfo}>
            <Text style={styles.sectionTitle}>Trip Details</Text>
            <Text style={styles.tripDetail}>From: {match.trip.from}</Text>
            <Text style={styles.tripDetail}>To: {match.trip.to}</Text>
            <Text style={styles.tripDetail}>
              Time: {new Date(match.trip.departureTime).toLocaleString()}
            </Text>
          </View>

          {/* Current Meeting Point */}
          {match.meetingPoint && (
            <View style={styles.currentMeeting}>
              <Text style={styles.sectionTitle}>Current Meeting Point</Text>
              <View style={styles.meetingCard}>
                <Ionicons name="location" size={20} color={Colors.light.tint} />
                <View style={styles.meetingInfo}>
                  <Text style={styles.meetingName}>{match.meetingPoint.name}</Text>
                  <Text style={styles.meetingDesc}>{match.meetingPoint.description}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Suggested Points */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Suggested Meeting Points</Text>
            {suggestedPoints.map((point) => (
              <TouchableOpacity
                key={point.id}
                style={styles.suggestionCard}
                onPress={() => handleSetMeetingPoint(point)}
                disabled={isSettingPoint}
              >
                <Ionicons 
                  name={point.type === 'midpoint' ? 'git-merge' : 'location'} 
                  size={20} 
                  color={Colors.light.tint} 
                />
                <View style={styles.suggestionInfo}>
                  <Text style={styles.suggestionName}>{point.name}</Text>
                  <Text style={styles.suggestionDesc}>{point.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.light.tabIconDefault} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleUseCurrentLocation}
              disabled={isSettingPoint || !currentLocation}
            >
              <Ionicons name="locate" size={20} color={Colors.light.tint} />
              <Text style={styles.actionText}>Use My Current Location</Text>
            </TouchableOpacity>
          </View>

          {/* Custom Location */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Custom Location</Text>
            <View style={styles.customInput}>
              <TextInput
                style={styles.input}
                placeholder="Enter address or location name"
                value={customLocation}
                onChangeText={setCustomLocation}
                multiline
                numberOfLines={2}
              />
              <TouchableOpacity
                style={[styles.setButton, !customLocation.trim() && styles.setButtonDisabled]}
                onPress={handleCustomLocation}
                disabled={isSettingPoint || !customLocation.trim()}
              >
                {isSettingPoint ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.setButtonText}>Set Point</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
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
    borderBottomWidth: 1,
    borderBottomColor: '#E3F2FD',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  tripInfo: {
    backgroundColor: Colors.light.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
  },
  tripDetail: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
    marginBottom: 4,
  },
  currentMeeting: {
    marginBottom: 20,
  },
  meetingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.tint + '10',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.tint + '20',
  },
  meetingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  meetingName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  meetingDesc: {
    fontSize: 12,
    color: Colors.light.tabIconDefault,
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  suggestionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
  },
  suggestionDesc: {
    fontSize: 12,
    color: Colors.light.tabIconDefault,
    marginTop: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.tint + '30',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
    marginLeft: 12,
  },
  customInput: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: Colors.light.text,
    backgroundColor: Colors.light.surface,
    marginRight: 12,
    textAlignVertical: 'top',
  },
  setButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  setButtonDisabled: {
    backgroundColor: Colors.light.tabIconDefault,
  },
  setButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});