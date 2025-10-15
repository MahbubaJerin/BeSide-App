// Modal for showing navigation route to meeting point
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import RouteMapView from './RouteMapView';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config';

const NavigationModal = ({ 
  visible, 
  onClose, 
  tripMatch,
  userRole = 'companion' // 'organizer' or 'companion'
}) => {
  const [isNavigating, setIsNavigating] = useState(false);
  const [tripStatus, setTripStatus] = useState('active');

  const handleNavigationStart = () => {
    setIsNavigating(true);
    Alert.alert(
      '🚀 Navigation Started!',
      'You will now be redirected to Google Maps for turn-by-turn directions. The app will track your progress.',
      [{ text: 'Got it!', style: 'default' }]
    );
  };

  const handleArrivalDetected = async () => {
    try {
      // Notify server about arrival
      const token = await AsyncStorage.getItem('token');
      const API_URL = BASE_URL.replace(/\/+$/, '');
      
      await fetch(`${API_URL}/api/v1/trip/update-arrival`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          matchId: tripMatch.matchId,
          userRole: userRole,
          arrivedAt: new Date().toISOString()
        })
      });

      setTripStatus('meeting');
      
    } catch (error) {
      console.error('Error updating arrival:', error);
    }
  };

  const handleTripComplete = async () => {
    Alert.alert(
      '✅ Complete Trip?',
      'Have you successfully met and completed your journey together?',
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: 'Yes, Complete!',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              const API_URL = BASE_URL.replace(/\/+$/, '');
              
              await fetch(`${API_URL}/api/v1/trip/complete-match`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  matchId: tripMatch.matchId,
                  completedBy: userRole
                })
              });

              Alert.alert('🎉 Trip Completed!', 'Thank you for using BeSide. We hope you had a safe journey!');
              onClose();
              
            } catch (error) {
              console.error('Error completing trip:', error);
              Alert.alert('Error', 'Failed to complete trip. Please try again.');
            }
          }
        }
      ]
    );
  };

  const getTripInstructions = () => {
    const hasMeetingPoint = tripMatch?.meetingPoint?.location;
    
    if (userRole === 'organizer') {
      return {
        title: '👥 Coordinate with Your Companion',
        subtitle: `${tripMatch?.companion?.userName || 'Your companion'} ${hasMeetingPoint ? 'is on their way!' : 'needs a meeting point!'}`,
        instructions: hasMeetingPoint ? [
          '📍 Your companion can see the meeting point on their map',
          '📱 They will receive navigation to reach you',
          '⏰ Wait at the meeting point for their arrival',
          '📞 You can contact them if needed'
        ] : [
          '📍 Set a meeting point first using "Set Meeting Point"',
          '👥 Your companion is waiting for the location',
          '📱 Once set, they can navigate to meet you',
          '📞 You can contact them to coordinate'
        ]
      };
    } else {
      return {
        title: hasMeetingPoint ? '🚶‍♀️ Navigate to Meeting Point' : '📍 Waiting for Meeting Point',
        subtitle: hasMeetingPoint 
          ? `Go to meet ${tripMatch?.organizer?.userName || 'your trip organizer'}`
          : `${tripMatch?.organizer?.userName || 'Your organizer'} needs to set a meeting point`,
        instructions: hasMeetingPoint ? [
          '📍 The blue route shows your path to the meeting point',
          '🗺️ Tap "Start Navigation" for turn-by-turn directions',
          '📱 The app will detect when you arrive (within 50m)',
          '👋 Look for your companion at the green flag marker'
        ] : [
          '⏰ Please wait while the organizer sets a meeting point',
          '📱 You will be notified when the location is available',
          '📍 Once set, you can start navigation',
          '📞 You can contact the organizer if needed'
        ]
      };
    }
  };

  const instructions = getTripInstructions();

  if (!tripMatch) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{instructions.title}</Text>
            <Text style={styles.headerSubtitle}>{instructions.subtitle}</Text>
          </View>
        </View>

        {/* Instructions Panel - only show if not navigating */}
        {!isNavigating && (
          <View style={styles.instructionsPanel}>
            <Text style={styles.instructionsTitle}>📝 How it works:</Text>
            {instructions.instructions.map((instruction, index) => (
              <Text key={index} style={styles.instructionItem}>
                {instruction}
              </Text>
            ))}
          </View>
        )}

        {/* Map Component */}
        <View style={styles.mapContainer}>
          <RouteMapView
            tripMatch={tripMatch}
            userRole={userRole}
            onNavigationStart={handleNavigationStart}
            onArrivalDetected={handleArrivalDetected}
          />
        </View>

        {/* Status Footer */}
        <View style={styles.statusFooter}>
          {tripStatus === 'meeting' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
              onPress={handleTripComplete}
            >
              <Ionicons name="checkmark-circle" size={24} color="white" />
              <Text style={styles.actionButtonText}>Trip Completed</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#FF5722' }]}
            onPress={() => {
              Alert.alert(
                'Cancel Trip?',
                'Are you sure you want to cancel this trip match?',
                [
                  { text: 'No', style: 'cancel' },
                  { text: 'Yes, Cancel', onPress: onClose }
                ]
              );
            }}
          >
            <Ionicons name="close-circle" size={24} color="white" />
            <Text style={styles.actionButtonText}>Cancel Trip</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 8,
    marginRight: 15,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  instructionsPanel: {
    backgroundColor: 'white',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  instructionItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    lineHeight: 20,
  },
  mapContainer: {
    flex: 1,
    borderRadius: 15,
    margin: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statusFooter: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 0.48,
    justifyContent: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default NavigationModal;