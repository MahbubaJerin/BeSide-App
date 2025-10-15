import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config';

export const useRealTimeUpdates = (enabled = true) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [lastEvent, setLastEvent] = useState(null);
  const [requestResponses, setRequestResponses] = useState([]);
  const [newRequests, setNewRequests] = useState([]);
  
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  
  // Event handlers
  const eventHandlers = useRef({
    request_response: (data) => {
      console.log('🎯 [REAL-TIME] Received request response:', data);
      setRequestResponses(prev => [data, ...prev.slice(0, 9)]); // Keep last 10
      setLastEvent({ type: 'request_response', data, timestamp: new Date() });
    },
    new_request: (data) => {
      console.log('🔔 [REAL-TIME] Received new request:', data);
      setNewRequests(prev => [data, ...prev.slice(0, 9)]); // Keep last 10
      setLastEvent({ type: 'new_request', data, timestamp: new Date() });
    },
    request_status_update: (data) => {
      console.log('📊 [REAL-TIME] Received request status update:', data);
      setLastEvent({ type: 'request_status_update', data, timestamp: new Date() });
    },
    connected: (data) => {
      console.log('🔌 [REAL-TIME] Connected to server:', data);
      setIsConnected(true);
      setConnectionError(null);
      reconnectAttempts.current = 0;
    },
    heartbeat: (data) => {
      // Silent heartbeat - just keep connection alive
    },
    meeting_point_set: (data) => {
      console.log('📍 [REAL-TIME] Meeting point set:', data);
      setLastEvent({ type: 'meeting_point_set', data, timestamp: new Date() });
    },
    trip_started: (data) => {
      console.log('🚀 [REAL-TIME] Trip started:', data);
      setLastEvent({ type: 'trip_started', data, timestamp: new Date() });
    },
    location_update: (data) => {
      console.log('📍 [REAL-TIME] Location update:', data);
      setLastEvent({ type: 'location_update', data, timestamp: new Date() });
    },
    trip_cancelled: (data) => {
      console.log('❌ [REAL-TIME] Trip cancelled:', data);
      setLastEvent({ type: 'trip_cancelled', data, timestamp: new Date() });
    }
  });

  const connect = useCallback(async () => {
    if (!enabled) return;
    
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('❌ [REAL-TIME] No token found, cannot connect');
        return;
      }

      console.log('🔌 [REAL-TIME] Connecting to real-time updates...');
      
      const API_URL = BASE_URL.replace(/\/+$/, '');
      const eventSource = new EventSource(`${API_URL}/api/trip/realtime?token=${encodeURIComponent(token)}`);

      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('✅ [REAL-TIME] Connection established');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const eventData = JSON.parse(event.data);
          console.log('📨 [REAL-TIME] Received event:', eventData);
          
          const handler = eventHandlers.current[eventData.type];
          if (handler) {
            handler(eventData.data);
          } else {
            console.log('⚠️ [REAL-TIME] No handler for event type:', eventData.type);
          }
        } catch (error) {
          console.error('❌ [REAL-TIME] Error parsing event data:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('❌ [REAL-TIME] Connection error:', error);
        setIsConnected(false);
        setConnectionError('Connection lost');
        
        // Close current connection
        eventSource.close();
        eventSourceRef.current = null;
        
        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`🔄 [REAL-TIME] Attempting reconnect in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else {
          console.error('💀 [REAL-TIME] Max reconnection attempts reached');
          setConnectionError('Connection failed - please restart app');
        }
      };

    } catch (error) {
      console.error('❌ [REAL-TIME] Failed to establish connection:', error);
      setConnectionError('Failed to connect');
    }
  }, [enabled]);

  const disconnect = useCallback(() => {
    console.log('🔌 [REAL-TIME] Disconnecting...');
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setIsConnected(false);
    reconnectAttempts.current = 0;
  }, []);

  const clearRequestResponses = useCallback(() => {
    setRequestResponses([]);
  }, []);

  const clearNewRequests = useCallback(() => {
    setNewRequests([]);
  }, []);

  const addEventHandler = useCallback((eventType, handler) => {
    eventHandlers.current[eventType] = handler;
  }, []);

  const removeEventHandler = useCallback((eventType) => {
    delete eventHandlers.current[eventType];
  }, []);

  // Auto-connect when enabled
  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  // Handle app state changes (reconnect when app becomes active)
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active' && enabled && !isConnected) {
        console.log('📱 [REAL-TIME] App became active - reconnecting...');
        connect();
      }
    };

    // Note: In a real React Native app, you'd use AppState from react-native
    // For now, we'll handle this manually
    
    return () => {
      // Cleanup listener
    };
  }, [enabled, isConnected, connect]);

  return {
    // Connection state
    isConnected,
    connectionError,
    
    // Events
    lastEvent,
    requestResponses,
    newRequests,
    
    // Actions
    connect,
    disconnect,
    clearRequestResponses,
    clearNewRequests,
    addEventHandler,
    removeEventHandler,
    
    // Utils
    reconnectAttempts: reconnectAttempts.current,
    maxReconnectAttempts
  };
};