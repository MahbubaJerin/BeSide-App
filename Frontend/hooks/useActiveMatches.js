// Frontend/hooks/useActiveMatches.js
import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config';

export function useActiveMatches(pollingInterval = 15000) { // Reduced to 15s for better responsiveness
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasNewMatches, setHasNewMatches] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  
  const pollRef = useRef(null);
  const lastMatchCountRef = useRef(0);
  const isActiveRef = useRef(true);
  const rateLimitRef = useRef(false);
  const errorCountRef = useRef(0);

  // Fetch active matches from API
  const fetchActiveMatches = useCallback(async () => {
    try {
      // Skip if rate limited
      if (rateLimitRef.current) {
        console.log('⏳ [MATCH POLLING] Rate limited, skipping...');
        return;
      }

      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setError('No authentication token found');
        return;
      }

      setLoading(true);
      setError(null);

      const API_URL = BASE_URL.replace(/\/+$/, '');
      const response = await fetch(`${API_URL}/api/v1/trip/active-matches`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000 // 15 second timeout
      });

      if (response.status === 429) {
        console.log('⚠️ [MATCH POLLING] Rate limited by server');
        rateLimitRef.current = true;
        
        // Back off for 60 seconds
        setTimeout(() => {
          rateLimitRef.current = false;
        }, 60000);
        return;
      }

      // Check content type and parse response
      const contentType = response.headers.get('content-type');
      const responseText = await response.text();
      
      if (!contentType || !contentType.includes('application/json')) {
        console.error('❌ [MATCH POLLING] Non-JSON response:', responseText.substring(0, 200));
        throw new Error('Server returned non-JSON response: ' + responseText.substring(0, 100));
      }

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ [MATCH POLLING] JSON parse error. Response text:', responseText.substring(0, 200));
        throw new Error('Invalid JSON response from server: ' + responseText.substring(0, 100));
      }

      if (!response.ok) {
        throw new Error(result?.message || 'Failed to fetch active matches');
      }

      if (result.status === 'success') {
        const newMatches = result.data.matches || [];
        
        console.log('🎯 [MATCH POLLING] Active matches fetched:', newMatches.length);
        
        // Reset error count on success
        errorCountRef.current = 0;
        
        // Check for new matches
        if (newMatches.length > lastMatchCountRef.current) {
          setHasNewMatches(true);
          console.log('🎉 [MATCH POLLING] New match detected!');
        }
        
        setMatches(newMatches);
        setMatchCount(newMatches.length);
        lastMatchCountRef.current = newMatches.length;
      } else {
        throw new Error(result.message || 'Invalid response format');
      }
    } catch (err) {
      console.error('❌ [MATCH POLLING] Error fetching matches:', err.message);
      errorCountRef.current += 1;
      
      // Implement exponential backoff for errors
      if (errorCountRef.current >= 3) {
        console.log('💀 [MATCH POLLING] Too many errors, backing off...');
        setError(`Network issues - reducing poll frequency (${errorCountRef.current} errors)`);
        rateLimitRef.current = true;
        
        // Back off for increasing duration
        const backoffTime = Math.min(errorCountRef.current * 30000, 300000); // Max 5 minutes
        setTimeout(() => {
          rateLimitRef.current = false;
          errorCountRef.current = Math.max(0, errorCountRef.current - 1);
        }, backoffTime);
      } else {
        setError(`${err.message} (${errorCountRef.current}/3)`);
      }
      
      setMatches([]);
      setMatchCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // Start polling for active matches
  const startPolling = useCallback(() => {
    if (pollRef.current) return; // Already polling
    
    console.log('🔄 [MATCH POLLING] Starting match polling...');
    
    // Initial fetch
    fetchActiveMatches();
    
    // Set up polling
    pollRef.current = setInterval(() => {
      if (isActiveRef.current) {
        fetchActiveMatches();
      }
    }, pollingInterval);
  }, [fetchActiveMatches, pollingInterval]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      console.log('⏹️ [MATCH POLLING] Stopping match polling');
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // Mark new matches as viewed
  const markAsViewed = useCallback(() => {
    setHasNewMatches(false);
  }, []);

  // Manually refresh matches
  const refresh = useCallback(async () => {
    await fetchActiveMatches();
  }, [fetchActiveMatches]);

  // Update match status (for trip progression)
  const updateMatchStatus = useCallback(async (matchId, status) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const API_URL = BASE_URL.replace(/\/+$/, '');
      const response = await fetch(`${API_URL}/api/v1/trip/match/${matchId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      if (response.status === 429) {
        throw new Error('Too many requests. Please try again later.');
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update match status');
      }

      console.log('✅ [MATCH UPDATE] Status updated:', matchId, 'to', status);
      
      // Refresh matches after update
      await fetchActiveMatches();
      
      return result.data.match;
    } catch (err) {
      console.error('❌ [MATCH UPDATE] Error updating status:', err.message);
      throw err;
    }
  }, [fetchActiveMatches]);

  // Get match details
  const getMatchDetails = useCallback(async (matchId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const API_URL = BASE_URL.replace(/\/+$/, '');
      const response = await fetch(`${API_URL}/api/v1/trip/match/${matchId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch match details');
      }

      return result.data.match;
    } catch (err) {
      console.error('❌ [MATCH DETAILS] Error fetching details:', err.message);
      throw err;
    }
  }, []);

  // Set meeting point for a match
  const setMeetingPoint = useCallback(async (matchId, meetingPoint) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const API_URL = BASE_URL.replace(/\/+$/, '');
      const response = await fetch(`${API_URL}/api/v1/trip/match/${matchId}/meeting-point`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: meetingPoint.name,
          description: meetingPoint.description,
          latitude: meetingPoint.latitude,
          longitude: meetingPoint.longitude,
          type: meetingPoint.type
        })
      });

      if (response.status === 429) {
        throw new Error('Too many requests. Please try again later.');
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to set meeting point');
      }

      console.log('📍 [MEETING POINT] Meeting point set:', meetingPoint.name);
      
      // Refresh matches after setting meeting point
      await fetchActiveMatches();
      
      return result.data.meetingPoint;
    } catch (err) {
      console.error('❌ [MEETING POINT] Error setting meeting point:', err.message);
      throw err;
    }
  }, [fetchActiveMatches]);

  // Update live location for a match
  const updateLiveLocation = useCallback(async (matchId, latitude, longitude) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const API_URL = BASE_URL.replace(/\/+$/, '');
      const response = await fetch(`${API_URL}/api/v1/trip/match/${matchId}/location`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ latitude, longitude })
      });

      if (response.status === 429) {
        throw new Error('Too many requests. Please try again later.');
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update location');
      }

      console.log('📍 [LOCATION UPDATE] Location updated successfully');
      return result.data;
    } catch (err) {
      console.error('❌ [LOCATION UPDATE] Error:', err.message);
      throw err;
    }
  }, []);

  // Get live locations for a match
  const getLiveLocations = useCallback(async (matchId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const API_URL = BASE_URL.replace(/\/+$/, '');
      const response = await fetch(`${API_URL}/api/v1/trip/match/${matchId}/locations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 429) {
        throw new Error('Too many requests. Please try again later.');
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to get locations');
      }

      return result.data;
    } catch (err) {
      console.error('❌ [GET LOCATIONS] Error:', err.message);
      throw err;
    }
  }, []);

  // Setup and cleanup effects
  useEffect(() => {
    isActiveRef.current = true;
    startPolling();
    
    return () => {
      isActiveRef.current = false;
      stopPolling();
    };
  }, [startPolling, stopPolling]);

  // Get active request for persistent search
  const getActiveRequest = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return null;

      const API_URL = BASE_URL.replace(/\/+$/, '');
      const response = await fetch(`${API_URL}/api/v1/trip/active-request`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      if (result.status === 'success') {
        return result.data.activeRequest;
      }
      return null;
    } catch (error) {
      console.error('Error fetching active request:', error);
      return null;
    }
  }, []);

  // Update trip request with route and location data
  const updateTripRequest = useCallback(async (tripReqId, updateData) => {
    try {
      console.log('🔄 [FRONTEND UPDATE] Updating trip request:', tripReqId);
      console.log('🔄 [FRONTEND UPDATE] Update data:', JSON.stringify(updateData, null, 2));
      
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const API_URL = BASE_URL.replace(/\/+$/, '');
      const url = `${API_URL}/api/v1/trip/${tripReqId}`;
      console.log('🌐 [FRONTEND UPDATE] Request URL:', url);
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      console.log('📡 [FRONTEND UPDATE] Response status:', response.status);
      const result = await response.json();
      console.log('📊 [FRONTEND UPDATE] Response data:', JSON.stringify(result, null, 2));
      
      if (result.status === 'success') {
        console.log('✅ [FRONTEND UPDATE] Trip request updated successfully');
        return result.data.tripRequest;
      }
      throw new Error(result.message || 'Failed to update trip request');
    } catch (error) {
      console.error('💥 [FRONTEND UPDATE] Error updating trip request:', error);
      throw error;
    }
  }, []);

  // Complete receiver consent
  const completeReceiverConsent = useCallback(async (tripReqId, userId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const API_URL = BASE_URL.replace(/\/+$/, '');
      const response = await fetch(`${API_URL}/api/v1/trip/${tripReqId}/receiver-consent`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });

      const result = await response.json();
      if (result.status === 'success') {
        return result.data.tripRequest;
      }
      throw new Error(result.message || 'Failed to complete consent');
    } catch (error) {
      console.error('Error completing receiver consent:', error);
      throw error;
    }
  }, []);

  return {
    // State
    matches,
    loading,
    error,
    hasNewMatches,
    matchCount,
    
    // Actions
    refresh,
    markAsViewed,
    updateMatchStatus,
    getMatchDetails,
    setMeetingPoint,
    updateLiveLocation,
    getLiveLocations,
    startPolling,
    stopPolling,
    getActiveRequest,
    updateTripRequest,
    completeReceiverConsent,
  };
}