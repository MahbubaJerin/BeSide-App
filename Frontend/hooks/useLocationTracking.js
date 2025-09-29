import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { BASE_URL } from '../config';

export const useLocationTracking = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(null);
  const [error, setError] = useState(null);
  const [isSharing, setIsSharing] = useState(false);
  
  const locationSubscription = useRef(null);
  const updateInterval = useRef(null);
  const lastUpdateTime = useRef(0);

  // Request location permissions
  const requestLocationPermission = async () => {
    try {
      console.log('📍 [FRONTEND] Requesting location permission...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log(`📍 [FRONTEND] Location permission status: ${status}`);
      setLocationPermission(status === 'granted');
      return status === 'granted';
    } catch (err) {
      console.error('💥 [FRONTEND] Error requesting location permission:', err);
      setError('Failed to request location permission');
      return false;
    }
  };

  // Get current location
  const getCurrentLocation = async () => {
    try {
      console.log('📍 [FRONTEND] Getting current location...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 10000,
      });
      
      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        speed: location.coords.speed,
        heading: location.coords.heading,
        timestamp: location.timestamp,
      };
      
      console.log(`📍 [FRONTEND] Location obtained: ${locationData.latitude}, ${locationData.longitude} (accuracy: ${locationData.accuracy}m)`);
      setCurrentLocation(locationData);
      return locationData;
    } catch (err) {
      console.error('💥 [FRONTEND] Error getting current location:', err);
      setError('Failed to get current location');
      return null;
    }
  };

  // Update location on server
  const updateLocationOnServer = async (locationData) => {
    try {
      console.log('🌐 [FRONTEND] Updating location on server...');
      
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${BASE_URL}api/v1/location/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: locationData.accuracy,
          speed: locationData.speed,
          heading: locationData.heading,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to update location');
      }

      console.log('✅ [FRONTEND] Location updated on server successfully');
      return result;
    } catch (err) {
      console.error('💥 [FRONTEND] Error updating location on server:', err);
      setError('Failed to update location on server');
      return null;
    }
  };

  // Start location tracking
  const startTracking = async (shareLocation = true) => {
    try {
      console.log('🚀 [FRONTEND] Starting location tracking...');
      
      const hasPermission = locationPermission || await requestLocationPermission();
      
      if (!hasPermission) {
        console.log('❌ [FRONTEND] Location permission denied');
        setError('Location permission denied');
        return false;
      }

      console.log(`✅ [FRONTEND] Location tracking started (sharing: ${shareLocation})`);
      setIsTracking(true);
      setIsSharing(shareLocation);
      setError(null);

      // Get initial location
      const initialLocation = await getCurrentLocation();
      if (initialLocation && shareLocation) {
        console.log('🌐 [FRONTEND] Sending initial location to server...');
        await updateLocationOnServer(initialLocation);
      }

      // Set up location watching
      console.log('👀 [FRONTEND] Setting up location watching (10s intervals, 10m distance)...');
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000, // 10 seconds
          distanceInterval: 10, // 10 meters
        },
        (location) => {
          const locationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            speed: location.coords.speed,
            heading: location.coords.heading,
            timestamp: location.timestamp,
          };
          
          console.log(`📍 [FRONTEND] Location updated: ${locationData.latitude}, ${locationData.longitude}`);
          setCurrentLocation(locationData);
        }
      );

      // Set up periodic server updates (every 1 minute)
      if (shareLocation) {
        console.log('⏰ [FRONTEND] Setting up periodic server updates (every 1 minute)...');
        updateInterval.current = setInterval(async () => {
          console.log('⏰ [FRONTEND] Running periodic location update...');
          const location = await getCurrentLocation();
          if (location) {
            await updateLocationOnServer(location);
            lastUpdateTime.current = Date.now();
            console.log(`⏰ [FRONTEND] Periodic update completed at ${new Date().toISOString()}`);
          }
        }, 60000); // 1 minute
      }

      return true;
    } catch (err) {
      console.error('Error starting location tracking:', err);
      setError('Failed to start location tracking');
      setIsTracking(false);
      return false;
    }
  };

  // Stop location tracking
  const stopTracking = async () => {
    try {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }

      if (updateInterval.current) {
        clearInterval(updateInterval.current);
        updateInterval.current = null;
      }

      // Update server to set user as inactive
      if (isSharing) {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          await fetch(`${BASE_URL}api/v1/location/stop-searching`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
        }
      }

      setIsTracking(false);
      setIsSharing(false);
      setError(null);
    } catch (err) {
      console.error('Error stopping location tracking:', err);
      setError('Failed to stop location tracking');
    }
  };

  // Update location sharing preference
  const updateSharingPreference = async (shareLocation) => {
    try {
      setIsSharing(shareLocation);
      
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      await fetch(`${BASE_URL}api/v1/location/preferences`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          shareLocation,
          visibleToOthers: shareLocation,
        }),
      });

      if (shareLocation && currentLocation) {
        // Start server updates if not already running
        if (!updateInterval.current) {
          updateInterval.current = setInterval(async () => {
            const location = await getCurrentLocation();
            if (location) {
              await updateLocationOnServer(location);
              lastUpdateTime.current = Date.now();
            }
          }, 60000);
        }
      } else if (!shareLocation && updateInterval.current) {
        // Stop server updates
        clearInterval(updateInterval.current);
        updateInterval.current = null;
      }
    } catch (err) {
      console.error('Error updating sharing preference:', err);
      setError('Failed to update sharing preference');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
      if (updateInterval.current) {
        clearInterval(updateInterval.current);
      }
    };
  }, []);

  return {
    isTracking,
    currentLocation,
    locationPermission,
    error,
    isSharing,
    startTracking,
    stopTracking,
    getCurrentLocation,
    updateSharingPreference,
    requestLocationPermission,
    lastUpdateTime: lastUpdateTime.current,
  };
};
