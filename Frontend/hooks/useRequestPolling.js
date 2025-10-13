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
      const user = await AsyncStorage.getItem("user");
      
      console.log("🔄 Polling for requests...");
      console.log("Token exists:", !!token);
      console.log("User exists:", !!user);
      
      if (!token) {
        console.log("❌ No token found, stopping polling");
        return;
      }

      const API_URL = BASE_URL.replace(/\/+$/, "");
      const url = `${API_URL}/api/v1/trip/pending-requests`;
      console.log("🌐 Polling URL:", url);
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log("📥 Polling response status:", response.status, response.ok);
      
      const result = await response.json();
      console.log("📥 Polling result:", JSON.stringify(result, null, 2));
      
      if (result.status === "success") {
        const newRequests = result.data.requests || [];
        console.log("✅ Found requests:", newRequests.length);
        
        // Check if there are new requests (more than before)
        if (newRequests.length > lastCountRef.current && lastCountRef.current >= 0) {
          console.log("🔔 New requests detected! Previous:", lastCountRef.current, "Current:", newRequests.length);
          setHasNewRequests(true);
        }
        
        lastCountRef.current = newRequests.length;
        setPendingRequests(newRequests);
      } else {
        console.log("❌ Polling API error:", result.message);
      }
    } catch (error) {
      console.error("🚨 Polling network error:", error);
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
    requestCount: pendingRequests.length,
    requests: pendingRequests // Alias for compatibility
  };
};