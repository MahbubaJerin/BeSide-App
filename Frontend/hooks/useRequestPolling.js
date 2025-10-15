import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config';

export const useRequestPolling = (intervalMs = 30000, enabled = true) => { // Increased default from 10s to 30s
  const [pendingRequests, setPendingRequests] = useState([]);
  const [hasNewRequests, setHasNewRequests] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [networkError, setNetworkError] = useState(null);
  const intervalRef = useRef(null);
  const lastCountRef = useRef(0);
  const rateLimitRef = useRef(false);
  const errorCountRef = useRef(0);

  const fetchRequests = async () => {
    try {
      // Skip if rate limited
      if (rateLimitRef.current) {
        console.log("⏳ Rate limited, skipping poll cycle...");
        return;
      }

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
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000 // Add 15 second timeout
      });

      console.log("📥 Polling response status:", response.status, response.ok);
      
      // Handle rate limiting
      if (response.status === 429) {
        console.log("⚠️ Rate limited by server");
        rateLimitRef.current = true;
        setNetworkError("Rate limited - reducing polling frequency");
        
        // Back off for 60 seconds
        setTimeout(() => {
          rateLimitRef.current = false;
          setNetworkError(null);
        }, 60000);
        return;
      }
      
      const result = await response.json();
      console.log("📥 Polling result:", JSON.stringify(result, null, 2));
      
      if (result.status === "success") {
        const newRequests = result.data.requests || [];
        console.log("✅ Found requests:", newRequests.length);
        
        // Reset error count on success
        errorCountRef.current = 0;
        setNetworkError(null);
        
        // Check if there are new requests (more than before)
        if (newRequests.length > lastCountRef.current && lastCountRef.current >= 0) {
          console.log("🔔 New requests detected! Previous:", lastCountRef.current, "Current:", newRequests.length);
          setHasNewRequests(true);
        }
        
        lastCountRef.current = newRequests.length;
        setPendingRequests(newRequests);

        // Send heartbeat to keep user visible for notifications
        try {
          console.log("💓 Sending heartbeat to stay visible...");
          const heartbeatUrl = `${API_URL}/api/v1/trip/heartbeat`;
          await fetch(heartbeatUrl, {
            method: "POST",
            headers: { 
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            },
          });
          console.log("✅ Heartbeat sent successfully");
        } catch (heartbeatError) {
          console.log("⚠️ Heartbeat failed:", heartbeatError.message);
          // Don't let heartbeat failure affect main polling
        }
      } else {
        console.log("❌ Polling API error:", result.message);
        setNetworkError(result.message);
      }
    } catch (error) {
      console.error("🚨 Polling network error:", error);
      errorCountRef.current += 1;
      
      // Implement exponential backoff for errors
      if (errorCountRef.current >= 3) {
        console.log("💀 Too many errors, backing off...");
        setNetworkError("Network issues - reducing poll frequency");
        rateLimitRef.current = true;
        
        // Back off for increasing duration based on error count
        const backoffTime = Math.min(errorCountRef.current * 30000, 300000); // Max 5 minutes
        setTimeout(() => {
          rateLimitRef.current = false;
          errorCountRef.current = Math.max(0, errorCountRef.current - 1);
        }, backoffTime);
      } else {
        setNetworkError(`Network error (${errorCountRef.current}/3)`);
      }
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
    networkError,
    startPolling,
    stopPolling,
    markAsViewed,
    refetch: fetchRequests,
    requestCount: pendingRequests.length,
    requests: pendingRequests, // Alias for compatibility
    isRateLimited: rateLimitRef.current,
    errorCount: errorCountRef.current
  };
};