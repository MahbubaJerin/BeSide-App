// Frontend/hooks/usePendingTrips.js
import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config';

export function usePendingTrips(pollingInterval = 10000, enabled = false) {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);
  const isActiveRef = useRef(true);

  const fetchPending = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      setLoading(true);
      setError(null);

      const API_URL = BASE_URL.replace(/\/+$/, '');
      const res = await fetch(`${API_URL}/api/v1/trip/sent-requests-status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(result?.message || 'Failed to fetch pending requests');
      }

      const all = Array.isArray(result?.data?.requests) ? result.data.requests : [];
      const pending = all.filter(r => r.status === 'pending' || r.status === 'request_sent');
      setPendingRequests(pending);
    } catch (e) {
      setError(e.message || 'Unknown error');
      setPendingRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    fetchPending();
    pollRef.current = setInterval(() => {
      if (isActiveRef.current) fetchPending();
    }, pollingInterval);
  }, [fetchPending, pollingInterval]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      stopPolling();
      return;
    }
    isActiveRef.current = true;
    startPolling();
    return () => {
      isActiveRef.current = false;
      stopPolling();
    };
  }, [enabled, startPolling, stopPolling]);

  const cancelRequest = useCallback(async (tripReqId) => {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('No authentication token');
    const API_URL = BASE_URL.replace(/\/+$/, '');
    const res = await fetch(`${API_URL}/api/v1/trip/cancel-request`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tripReqId })
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok || result?.status !== 'success') {
      throw new Error(result?.message || 'Failed to cancel request');
    }
    // Refresh after cancel
    await fetchPending();
    return true;
  }, [fetchPending]);

  const clear = useCallback(() => {
    setPendingRequests([]);
  }, []);

  return {
    pendingRequests,
    loading,
    error,
    refresh: fetchPending,
    cancelRequest,
    startPolling,
    stopPolling,
    clear,
  };
}
