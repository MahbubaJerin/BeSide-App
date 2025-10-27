// Modal for showing navigation route to meeting point - ENHANCED VERSION
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
  userRole = 'companion', // 'organizer' or 'companion'
  arrivalStatus, // Real-time arrival status from parent
  onBothArrived, // NEW: Callback when both users arrive
  arrivalStatus, // Real-time arrival status from parent
  onBothArrived, // NEW: Callback when both users arrive
}) => {
  const [isNavigating, setIsNavigating] = useState(false);
  const [tripStatus, setTripStatus] = useState('active');
  const [hasArrived, setHasArrived] = useState(false);
  const [bothArrived, setBothArrived] = useState(false);

  // Listen to real-time events for arrival updates
  useEffect(() => {
    // Update local state when arrivalStatus changes from parent
    if (arrivalStatus) {
      const wasBothArrived = bothArrived; // Track previous state
      setBothArrived(arrivalStatus.bothUsersArrived || false);
      
      // Show alert and trigger callback if both users have arrived and this is the first time we're seeing it
      if (arrivalStatus.bothUsersArrived && !wasBothArrived) {
        console.log("🚀 [NAVIGATION MODAL] Real-time event - both users arrived!");
        
        // Trigger the callback for the first person who already pressed "Almost There"
        if (onBothArrived) {
          console.log("🚀 [NAVIGATION MODAL] Triggering final journey callback from real-time event...");
          onBothArrived(tripMatch);
        }
        
        Alert.alert(
          '🎉 Both Users Have Arrived!',
          'Great! Both you and your companion have arrived at the meeting point. Starting your trip together now!',
          [{ 
            text: 'Let\'s Go!', 
            style: 'default',
            onPress: () => {
              onClose(); // Close NavigationModal
            }
          }]
        );
      }
    }
    
    // Also check initial state from tripMatch
    if (tripMatch?.arrivedUsers && tripMatch.arrivedUsers.length >= 2) {
      setBothArrived(true);
    }
    
    return () => {
      // Cleanup if needed
    };
  }, [arrivalStatus, tripMatch, bothArrived, onBothArrived, onClose]);

  // Add polling to check if both users have arrived (fallback for real-time events)
  useEffect(() => {
    if (!visible || !tripMatch || bothArrived) return;

    const checkBothArrived = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const API_URL = BASE_URL.replace(/\/+$/, '');
        const response = await fetch(`${API_URL}/api/v1/trip/match/${tripMatch.matchId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const result = await response.json();
        if (result.status === 'success' && result.data.match) {
          const match = result.data.match;
          console.log("🔄 [POLLING] Match status:", match.status, "Arrived users:", match.arrivedUsers?.length);
          
          if (match.arrivedUsers?.length >= 2 && !bothArrived) {
            console.log("🚀 [POLLING] Both users arrived! Triggering final journey...");
            setBothArrived(true);
            
            if (onBothArrived) {
              onBothArrived(match);
            }
            
            Alert.alert(
              '🎉 Both Users Have Arrived!',
              'Great! Both you and your companion have arrived at the meeting point. Starting your trip together now!',
              [{ 
                text: 'Let\'s Go!', 
                style: 'default',
                onPress: () => {
                  onClose(); // Close NavigationModal
                }
              }]
            );
          }
        }
      } catch (error) {
        console.error('❌ [POLLING] Error checking arrival status:', error);
      }
    };

    // Poll every 3 seconds to check if both users have arrived
    console.log("🔄 [POLLING] Starting polling for both users arrival...");
    const pollInterval = setInterval(checkBothArrived, 3000);
    
    return () => {
      console.log("🔄 [POLLING] Stopping polling...");
      clearInterval(pollInterval);
    };
  }, [visible, tripMatch, bothArrived, onBothArrived, onClose]);

  const handleNavigationStart = () => {
    setIsNavigating(true);
    Alert.alert(
      '🚀 Navigation Started!',
      'In-app navigation is now active. Follow the route on the map to reach your destination.',
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
      console.log('📍 [ALMOST THERE] User pressed Almost There button');
      
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
          distance: 50 // Placeholder distance
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to mark arrival');
      }

      if (result.data.bothArrived) {
        // Both users have arrived - close this modal and trigger final journey
        setHasArrived(true);
        
        // Immediately trigger the final journey
        if (onBothArrived) {
          console.log("🚀 [NAVIGATION MODAL] Both arrived! Triggering final journey callback...");
          onBothArrived(tripMatch);
        }
        
        Alert.alert(
          '🎉 Both Users Have Arrived!',
          'Great! Both you and your companion have arrived at the meeting point. Starting your trip together now!',
          [{ 
            text: 'Let\'s Go!', 
            style: 'default',
            onPress: () => {
              onClose(); // Close NavigationModal
            }
          }]
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

  const handleStartFinalJourney = async () => {
    if (!tripMatch?.matchId) {
      Alert.alert('Error', 'Trip match not found');
      return;
    }

    try {
      console.log('🚀 [FINAL JOURNEY] User pressed Start Trip button');
      
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Please log in again');
        return;
      }

      const API_URL = BASE_URL.replace(/\/+$/, '');
      const response = await fetch(`${API_URL}/api/v1/trip/match/${tripMatch.matchId}/start-final-journey`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to start final journey');
      }

      if (result.data.bothReady && result.data.tripStarted) {
        Alert.alert(
          '🚀 Final Journey Started!',
          'Both companions are ready! The route from meeting point to destination is now displayed on your home screen.',
          [
            {
              text: 'View Route',
              onPress: () => {
                // Close this modal and return to home page where route is displayed
                onClose();
              }
            }
          ]
        );
      } else {
        Alert.alert(
          '✅ Ready to Start!',
          'You\'re ready to begin the final journey. Waiting for your companion to also press "Start Trip".',
          [{ text: 'OK' }]
        );
      }

      console.log('✅ [FINAL JOURNEY] Final journey status updated:', result.data);

    } catch (error) {
      console.error('❌ [FINAL JOURNEY] Error starting final journey:', error);
      Alert.alert('Error', 'Failed to start final journey. Please try again.');
    }
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
            onClose={onClose}
            hideOverlays={true} // Hide the overlays so we can show them outside the map
          />
        </View>

        {/* Route Information Card */}
        <View style={styles.routeInfoCard}>
          <Text style={styles.routeTitle}>
            {userRole === 'organizer' ? '📍 Your Route (Sender)' : '🚶 Your Journey (Receiver)'}
          </Text>
          <Text style={styles.routeDescription}>
            {userRole === 'organizer' 
              ? 'From Starting Point → Final Destination'
              : 'Current Location → Meeting Point → Destination'
            }
          </Text>
          <Text style={styles.meetingPointText}>
            📍 {tripMatch?.meetingPoint?.address || tripMatch?.meetingPoint?.name || 'Meeting Point'}
          </Text>
        </View>

        {/* Navigation Controls */}
        <View style={styles.navigationControls}>
          <TouchableOpacity
            style={[styles.navigationButton, { backgroundColor: isNavigating ? '#FF5722' : '#4CAF50' }]}
            onPress={isNavigating ? () => setIsNavigating(false) : handleNavigationStart}
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
          
          {!hasArrived && (
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
              onPress={handleStartFinalJourney}
            >
              <Ionicons name="rocket" size={24} color="white" />
              <Text style={styles.navigationButtonText}>Ready to Start Trip!</Text>
            </TouchableOpacity>
          )}
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
  routeInfoCard: {
    backgroundColor: 'white',
    margin: 15,
    marginTop: 0,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  routeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  routeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  meetingPointText: {
    fontSize: 14,
    color: '#1c52c8',
    fontWeight: '600',
  },
  navigationControls: {
    flexDirection: 'row',
    padding: 15,
    paddingTop: 0,
    gap: 10,
  },
  navigationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
  },
  navigationButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
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
    justifyContent: 'center',
    width: '100%', // Take full width since we only have one button now
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default NavigationModal;