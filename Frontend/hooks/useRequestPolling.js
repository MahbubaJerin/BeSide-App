import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config';

export const useRequestPolling = (intervalMs = 10000, enabled = true) => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [hasNewRequests, setHasNewRequests] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef(null);
  const lastCountRef = useRef(0);

  const fetchRequests = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const API_URL = BASE_URL.replace(/\/+$/, "");
      const response = await fetch(`${API_URL}/api/v1/trip/pending-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const result = await response.json();
      if (result.status === "success") {
        const newRequests = result.data.requests || [];
        
        // Check if there are new requests (more than before)
        if (newRequests.length > lastCountRef.current && lastCountRef.current > 0) {
          setHasNewRequests(true);
        }
        
        lastCountRef.current = newRequests.length;
        setPendingRequests(newRequests);
      }
    } catch (error) {
      console.error("Error polling requests:", error);
    }
  };

  const startPolling = () => {
    if (intervalRef.current || !enabled) return;
    
    setIsPolling(true);
    fetchRequests(); // Initial fetch
    intervalRef.current = setInterval(fetchRequests, intervalMs);
  };

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  };

  const markAsViewed = () => {
    setHasNewRequests(false);
  };

  // Auto-start/stop based on enabled prop
  useEffect(() => {
    if (enabled) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => stopPolling(); // Cleanup on unmount
  }, [enabled, intervalMs]);

  // Reset new requests flag when requests list changes
  useEffect(() => {
    if (pendingRequests.length === 0) {
      setHasNewRequests(false);
      lastCountRef.current = 0;
    }
  }, [pendingRequests.length]);

  return {
    pendingRequests,
    hasNewRequests,
    isPolling,
    startPolling,
    stopPolling,
    markAsViewed,
    refetch: fetchRequests,
    requestCount: pendingRequests.length
  };
};