import { useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { BASE_URL } from '../config';

export const useCompanionSearch = () => {
  const [isSearching, setIsSearching] = useState(false);
  const [companions, setCompanions] = useState([]);
  const [searchRadius, setSearchRadius] = useState(500);
  const [searchCenter, setSearchCenter] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const searchInterval = useRef(null);

  // Find companions near a specific location
  const findCompanions = async (latitude, longitude, radius = 500) => {
    try {
      console.log(`🔍 [FRONTEND] Searching for companions at ${latitude}, ${longitude} (radius: ${radius}m)`);
      setLoading(true);
      setError(null);

            const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('🌐 [FRONTEND] Sending companion search request to server...');
      const response = await fetch(
        `${BASE_URL}api/v1/location/nearby?latitude=${latitude}&longitude=${longitude}&radius=${radius}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to find companions');
      }

      console.log(`✅ [FRONTEND] Found ${result.data.companions?.length || 0} companions`);
      setCompanions(result.data.companions || []);
      setSearchRadius(result.data.searchRadius);
      setSearchCenter(result.data.searchCenter);

      return result.data.companions || [];
    } catch (err) {
      console.error('💥 [FRONTEND] Error finding companions:', err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Start continuous companion search
  const startSearch = async (currentLocation, radius = 500, intervalMs = 30000) => {
    try {
      console.log(`🚀 [FRONTEND] Starting companion search at ${currentLocation.latitude}, ${currentLocation.longitude}`);
      console.log(`   Search radius: ${radius}m, Update interval: ${intervalMs}ms`);
      
      if (!currentLocation) {
        throw new Error('Current location is required');
      }

      setIsSearching(true);
      setError(null);

      // Initial search
      console.log('🔍 [FRONTEND] Performing initial companion search...');
      await findCompanions(currentLocation.latitude, currentLocation.longitude, radius);

      // Set up periodic search updates
      console.log(`⏰ [FRONTEND] Setting up periodic search updates every ${intervalMs}ms...`);
      searchInterval.current = setInterval(async () => {
        try {
          console.log('⏰ [FRONTEND] Running periodic companion search...');
          await findCompanions(currentLocation.latitude, currentLocation.longitude, radius);
        } catch (err) {
          console.error('💥 [FRONTEND] Error in periodic companion search:', err);
        }
      }, intervalMs); // Default: 30 seconds

      console.log('✅ [FRONTEND] Companion search started successfully');
      return true;
    } catch (err) {
      console.error('💥 [FRONTEND] Error starting companion search:', err);
      setError(err.message);
      setIsSearching(false);
      return false;
    }
  };

  // Stop companion search
  const stopSearch = async () => {
    try {
      if (searchInterval.current) {
        clearInterval(searchInterval.current);
        searchInterval.current = null;
      }

      // Notify server to stop searching
      const token = await AsyncStorage.getItem('token');
      if (token) {
        await fetch(`${BASE_URL}api/v1/location/stop-searching`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }

      setIsSearching(false);
      setCompanions([]);
      setSearchCenter(null);
      setError(null);
    } catch (err) {
      console.error('Error stopping companion search:', err);
      setError('Failed to stop companion search');
    }
  };

  // Update search radius and restart search if active
  const updateSearchRadius = async (newRadius, currentLocation) => {
    setSearchRadius(newRadius);
    
    if (isSearching && currentLocation) {
      await findCompanions(currentLocation.latitude, currentLocation.longitude, newRadius);
    }
  };

  // Get companion details by user ID
  const getCompanionDetails = (userId) => {
    return companions.find(companion => companion.userId === userId);
  };

  // Filter companions by criteria
  const filterCompanions = (criteria = {}) => {
    return companions.filter(companion => {
      if (criteria.maxDistance && companion.distance > criteria.maxDistance) {
        return false;
      }
      
      if (criteria.isSearching !== undefined && companion.isSearching !== criteria.isSearching) {
        return false;
      }
      
      if (criteria.gender && companion.userInfo?.gender !== criteria.gender) {
        return false;
      }
      
      return true;
    });
  };

  // Sort companions by different criteria
  const sortCompanions = (sortBy = 'distance') => {
    const sorted = [...companions];
    
    switch (sortBy) {
      case 'distance':
        return sorted.sort((a, b) => a.distance - b.distance);
      case 'lastSeen':
        return sorted.sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));
      case 'name':
        return sorted.sort((a, b) => a.userName.localeCompare(b.userName));
      default:
        return sorted;
    }
  };

  // Clean up on unmount or when stopping
  const cleanup = () => {
    if (searchInterval.current) {
      clearInterval(searchInterval.current);
      searchInterval.current = null;
    }
  };

  return {
    isSearching,
    companions,
    searchRadius,
    searchCenter,
    loading,
    error,
    findCompanions,
    startSearch,
    stopSearch,
    updateSearchRadius,
    getCompanionDetails,
    filterCompanions,
    sortCompanions,
    cleanup,
  };
};
