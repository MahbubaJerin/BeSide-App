// Frontend/hooks/useTripCoordination.js
import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config';

export const useTripCoordination = (matchId) => {
  const [tripMatch, setTripMatch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState(null);

  // Fetch trip match details
  const fetchTripMatchDetails = async () => {
    if (!matchId) return;
    
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      
      const response = await fetch(`${BASE_URL}/api/trip/match/${matchId}/details`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.status === 'success') {
        setTripMatch(data.data.tripMatch);
        setUserRole(data.data.userRole);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch trip details');
      }
    } catch (error) {
      console.error('Error fetching trip match details:', error);
      Alert.alert('Error', 'Failed to fetch trip details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Update live location
  const updateLiveLocation = async (latitude, longitude) => {
    if (!matchId || !tripMatch?.liveLocationSharing?.enabled) return;

    try {
      const token = await AsyncStorage.getItem('token');
      
      const response = await fetch(`${BASE_URL}/api/trip/match/${matchId}/update-location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          latitude,
          longitude,
        }),
      });

      const data = await response.json();

      if (data.status !== 'success') {
        console.error('Failed to update location:', data.message);
      }
    } catch (error) {
      console.error('Error updating live location:', error);
    }
  };

  // Handle real-time events for trip coordination
  const handleRealTimeEvent = (eventType, eventData) => {
    switch (eventType) {
      case 'meeting_point_set':
        setTripMatch(prev => ({
          ...prev,
          meetingPoint: eventData.meetingPoint
        }));
        Alert.alert(
          'Meeting Point Set', 
          eventData.message,
          [{ text: 'OK' }]
        );
        break;

      case 'trip_started':
        setTripMatch(prev => ({
          ...prev,
          status: 'in-progress',
          liveLocationSharing: {
            ...prev.liveLocationSharing,
            enabled: true
          },
          progression: {
            ...prev.progression,
            started: eventData.timestamp
          }
        }));
        Alert.alert(
          'Trip Started', 
          eventData.message,
          [{ text: 'OK' }]
        );
        break;

      case 'location_update':
        if (tripMatch) {
          const isOrganizerUpdate = eventData.userId === tripMatch.organizer.userId;
          const locationField = isOrganizerUpdate ? 'organizerLocation' : 'companionLocation';
          
          setTripMatch(prev => ({
            ...prev,
            liveLocationSharing: {
              ...prev.liveLocationSharing,
              [locationField]: {
                ...eventData.location,
                lastUpdated: eventData.timestamp
              }
            }
          }));
        }
        break;

      case 'trip_cancelled':
        setTripMatch(prev => ({
          ...prev,
          status: 'cancelled',
          progression: {
            ...prev.progression,
            cancelled: eventData.timestamp
          }
        }));
        Alert.alert(
          'Trip Cancelled', 
          eventData.message,
          [{ text: 'OK' }]
        );
        break;

      default:
        console.log('Unknown trip coordination event:', eventType, eventData);
    }
  };

  // Get companion's current location for map display
  const getCompanionLocation = () => {
    if (!tripMatch || !userRole) return null;

    const isOrganizer = userRole === 'organizer';
    const companionLocationField = isOrganizer ? 'companionLocation' : 'organizerLocation';
    
    return tripMatch.liveLocationSharing?.[companionLocationField] || null;
  };

  // Get companion's name
  const getCompanionName = () => {
    if (!tripMatch || !userRole) return '';
    
    return userRole === 'organizer' 
      ? tripMatch.companion.userName 
      : tripMatch.organizer.userName;
  };

  // Check if user can set meeting point (if not already set)
  const canSetMeetingPoint = () => {
    return tripMatch && !tripMatch.meetingPoint?.location;
  };

  // Check if user can start location sharing (if meeting point is set and sharing not started)
  const canStartLocationSharing = () => {
    return tripMatch && 
           tripMatch.meetingPoint?.location && 
           !tripMatch.liveLocationSharing?.enabled;
  };

  // Refresh trip match data
  const refreshTripMatch = () => {
    fetchTripMatchDetails();
  };

  useEffect(() => {
    if (matchId) {
      fetchTripMatchDetails();
    }
  }, [matchId]);

  return {
    tripMatch,
    userRole,
    loading,
    updateLiveLocation,
    handleRealTimeEvent,
    getCompanionLocation,
    getCompanionName,
    canSetMeetingPoint,
    canStartLocationSharing,
    refreshTripMatch,
    fetchTripMatchDetails
  };
};

export default useTripCoordination;