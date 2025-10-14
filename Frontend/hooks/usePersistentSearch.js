// Frontend/hooks/usePersistentSearch.js
import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useActiveMatches } from './useActiveMatches';

export function usePersistentSearch() {
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [searchExpiry, setSearchExpiry] = useState(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [isSearchActive, setIsSearchActive] = useState(false);

  const { getActiveRequest, updateTripRequest } = useActiveMatches();
  const timerRef = useRef(null);
  const checkIntervalRef = useRef(null);

  // Check for existing active request on app start/resume
  const checkActiveRequest = useCallback(async () => {
    try {
      const activeRequest = await getActiveRequest();
      if (activeRequest) {
        setActiveRequestId(activeRequest.tripReqId);
        setSearchExpiry(new Date(activeRequest.expiresAt));
        setRouteCoordinates(activeRequest.routeCoordinates || []);
        setIsSearchActive(true);
        
        // Calculate remaining time
        const now = new Date();
        const expiry = new Date(activeRequest.expiresAt);
        const remaining = Math.max(0, expiry.getTime() - now.getTime());
        setRemainingTime(remaining);

        // Store in local storage for persistence
        await AsyncStorage.setItem('activeSearchRequest', JSON.stringify({
          tripReqId: activeRequest.tripReqId,
          expiresAt: activeRequest.expiresAt,
          routeCoordinates: activeRequest.routeCoordinates || []
        }));

        return activeRequest;
      } else {
        // Clear local storage if no active request
        await AsyncStorage.removeItem('activeSearchRequest');
        setActiveRequestId(null);
        setSearchExpiry(null);
        setRemainingTime(0);
        setIsSearchActive(false);
      }
    } catch (error) {
      console.error('Error checking active request:', error);
    }
  }, [getActiveRequest]);

  // Start persistent search timer
  const startSearchTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setRemainingTime(prev => {
        const newTime = Math.max(0, prev - 1000);
        if (newTime <= 0) {
          // Search expired
          setIsSearchActive(false);
          setActiveRequestId(null);
          setSearchExpiry(null);
          setRouteCoordinates([]);
          AsyncStorage.removeItem('activeSearchRequest');
          clearInterval(timerRef.current);
        }
        return newTime;
      });
    }, 1000);
  }, []);

  // Update route coordinates while keeping search active
  const updateSearchRoute = useCallback(async (tripReqId, routeData) => {
    try {
      await updateTripRequest(tripReqId, {
        routeCoordinates: routeData.routeCoordinates,
        startLocation: routeData.startLocation,
        destinationLocation: routeData.destinationLocation,
        transportMode: routeData.transportMode
      });
      
      setRouteCoordinates(routeData.routeCoordinates);
      
      // Update local storage
      const stored = await AsyncStorage.getItem('activeSearchRequest');
      if (stored) {
        const searchData = JSON.parse(stored);
        searchData.routeCoordinates = routeData.routeCoordinates;
        await AsyncStorage.setItem('activeSearchRequest', JSON.stringify(searchData));
      }
    } catch (error) {
      console.error('Error updating search route:', error);
      throw error;
    }
  }, [updateTripRequest]);

  // Cancel search and clear route
  const cancelSearch = useCallback(async () => {
    setIsSearchActive(false);
    setActiveRequestId(null);
    setSearchExpiry(null);
    setRouteCoordinates([]);
    setRemainingTime(0);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    await AsyncStorage.removeItem('activeSearchRequest');
  }, []);

  // Format remaining time for display
  const formatRemainingTime = useCallback((timeInMs) => {
    const minutes = Math.floor(timeInMs / 60000);
    const seconds = Math.floor((timeInMs % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Start periodic check for active requests
  useEffect(() => {
    // Check immediately on mount
    checkActiveRequest();

    // Set up periodic check every 30 seconds
    checkIntervalRef.current = setInterval(checkActiveRequest, 30000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [checkActiveRequest]);

  // Start timer when search becomes active
  useEffect(() => {
    if (isSearchActive && remainingTime > 0) {
      startSearchTimer();
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isSearchActive, startSearchTimer, remainingTime]);

  // Check local storage on app resume
  const checkLocalStorage = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('activeSearchRequest');
      if (stored) {
        const searchData = JSON.parse(stored);
        const now = new Date();
        const expiry = new Date(searchData.expiresAt);
        
        if (expiry > now) {
          setActiveRequestId(searchData.tripReqId);
          setSearchExpiry(expiry);
          setRouteCoordinates(searchData.routeCoordinates || []);
          setIsSearchActive(true);
          setRemainingTime(expiry.getTime() - now.getTime());
        } else {
          await AsyncStorage.removeItem('activeSearchRequest');
        }
      }
    } catch (error) {
      console.error('Error checking local storage:', error);
    }
  }, []);

  return {
    // State
    activeRequestId,
    searchExpiry,
    remainingTime,
    routeCoordinates,
    isSearchActive,
    
    // Actions
    checkActiveRequest,
    updateSearchRoute,
    cancelSearch,
    formatRemainingTime,
    checkLocalStorage
  };
}