// Frontend/hooks/useActiveMatches.js
import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config';

export function useActiveMatches(pollingInterval = 30000) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasNewMatches, setHasNewMatches] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  
  const pollRef = useRef(null);
  const lastMatchCountRef = useRef(0);
  const isActiveRef = useRef(true);

  // Fetch active matches from API
  const fetchActiveMatches = useCallback(async () => {
    try {
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
        }
      });

      if (response.status === 429) {
        console.log('⚠️ [MATCH POLLING] Rate limited, waiting...');
        return; // Skip this poll cycle
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch active matches');
      }

      if (result.status === 'success') {
        const newMatches = result.data.matches || [];
        
        console.log('🎯 [MATCH POLLING] Active matches fetched:', newMatches.length);
        
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
      setError(err.message);
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

  // Setup and cleanup effects
  useEffect(() => {
    isActiveRef.current = true;
    startPolling();
    
    return () => {
      isActiveRef.current = false;
      stopPolling();
    };
  }, [startPolling, stopPolling]);

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
    startPolling,
    stopPolling
  };
}