import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config';

export const useMessaging = (matchId, intervalMs = 3000, enabled = true) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [networkError, setNetworkError] = useState(null);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const intervalRef = useRef(null);
  const lastMessageId = useRef(null);
  const rateLimitRef = useRef(false);
  const errorCountRef = useRef(0);

  const API_URL = BASE_URL.replace(/\/+$/, "");

  const fetchMessages = useCallback(async () => {
    if (!matchId || !enabled) return;

    try {
      // Skip if rate limited
      if (rateLimitRef.current) {
        console.log("⏳ [MESSAGING] Rate limited, skipping poll cycle...");
        return;
      }

      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      setIsLoading(true);
      
      // Build URL with optional lastMessageId for incremental updates
      let url = `${API_URL}/api/v1/trip/match/${matchId}/messages`;
      if (lastMessageId.current) {
        url += `?lastMessageId=${lastMessageId.current}`;
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000
      });

      // Handle rate limiting
      if (response.status === 429) {
        rateLimitRef.current = true;
        setNetworkError("Rate limited - reducing polling frequency");
        
        setTimeout(() => {
          rateLimitRef.current = false;
          setNetworkError(null);
        }, 60000);
        return;
      }

      const result = await response.json();
      
      if (result.status === "success") {
        const newMessages = result.data.messages || [];
        
        // Reset error count on success
        errorCountRef.current = 0;
        setNetworkError(null);

        if (lastMessageId.current && newMessages.length > 0) {
          // Incremental update - append new messages, avoiding duplicates
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.messageId));
            const uniqueNewMessages = newMessages.filter(m => !existingIds.has(m.messageId));
            return [...prev, ...uniqueNewMessages];
          });
          
          if (newMessages.length > 0) {
            setHasNewMessages(true);
          }
          
          // Count unread messages (messages not sent by current user)
          const currentUserId = await AsyncStorage.getItem("userId");
          const newUnreadCount = newMessages.filter(msg => 
            msg.senderId !== currentUserId && 
            !msg.readBy.some(read => read.userId === currentUserId)
          ).length;
          
          if (newUnreadCount > 0) {
            setUnreadCount(prev => prev + newUnreadCount);
          }
        } else if (!lastMessageId.current) {
          // Initial load - set all messages
          setMessages(newMessages);
          
          // Count initial unread messages
          const currentUserId = await AsyncStorage.getItem("userId");
          const initialUnreadCount = newMessages.filter(msg => 
            msg.senderId !== currentUserId && 
            !msg.readBy.some(read => read.userId === currentUserId)
          ).length;
          setUnreadCount(initialUnreadCount);
        }

        // Update last message ID for next incremental fetch
        if (newMessages.length > 0) {
          lastMessageId.current = newMessages[newMessages.length - 1].messageId;
        }
      } else {
        setNetworkError(result.message);
      }
    } catch (error) {
      errorCountRef.current += 1;
      
      // Implement exponential backoff for errors
      if (errorCountRef.current >= 3) {
        setNetworkError("Network issues - reducing poll frequency");
        rateLimitRef.current = true;
        
        const backoffTime = Math.min(errorCountRef.current * 20000, 120000); // Max 2 minutes
        setTimeout(() => {
          rateLimitRef.current = false;
          errorCountRef.current = Math.max(0, errorCountRef.current - 1);
        }, backoffTime);
      } else {
        setNetworkError(`Network error (${errorCountRef.current}/3)`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [matchId, enabled, API_URL]);

  const sendMessage = useCallback(async (messageContent) => {
    if (!matchId || !messageContent.trim()) return false;

    try {
      setIsSending(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) return false;

      const response = await fetch(`${API_URL}/api/v1/trip/match/${matchId}/messages`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: messageContent.trim() })
      });

      const result = await response.json();
      
      if (result.status === "success") {
        // Add the new message to local state immediately for better UX
        const newMessage = result.data.message;
        
        // Only add if not already present (avoid duplicates)
        setMessages(prev => {
          const exists = prev.some(m => m.messageId === newMessage.messageId);
          if (exists) return prev;
          return [...prev, newMessage];
        });
        
        lastMessageId.current = newMessage.messageId;
        
        // Trigger a fresh fetch after a delay to get any messages we might have missed
        // But don't do it immediately to avoid race conditions
        setTimeout(() => fetchMessages(), 2000);
        
        return true;
      } else {
        setNetworkError(result.message);
        return false;
      }
    } catch (error) {
      setNetworkError("Failed to send message");
      return false;
    } finally {
      setIsSending(false);
    }
  }, [matchId, API_URL, fetchMessages]);

  const markAsRead = useCallback(() => {
    setHasNewMessages(false);
    setUnreadCount(0);
  }, []);

  const startPolling = useCallback(() => {
    if (intervalRef.current || !enabled || !matchId) return;
    
    fetchMessages(); // Initial fetch
    intervalRef.current = setInterval(fetchMessages, intervalMs);
  }, [fetchMessages, enabled, matchId, intervalMs]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const resetMessages = useCallback(() => {
    setMessages([]);
    setHasNewMessages(false);
    setUnreadCount(0);
    lastMessageId.current = null;
  }, []);

  // Auto-start/stop based on enabled prop and matchId
  useEffect(() => {
    if (enabled && matchId) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => stopPolling(); // Cleanup on unmount
  }, [enabled, matchId, startPolling, stopPolling]);

  // Reset when matchId changes
  useEffect(() => {
    if (matchId) {
      resetMessages();
    }
  }, [matchId, resetMessages]);

  return {
    messages,
    isLoading,
    isSending,
    networkError,
    hasNewMessages,
    unreadCount,
    sendMessage,
    markAsRead,
    refetch: fetchMessages,
    resetMessages,
    isPolling: !!intervalRef.current,
    isRateLimited: rateLimitRef.current,
    errorCount: errorCountRef.current
  };
};