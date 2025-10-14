// Frontend/hooks/useTripNotifications.js
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { BASE_URL } from '../config';

export function useTripNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Send notification to other user in match
  const sendTripNotification = useCallback(async (matchId, type, message, data = {}) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const API_URL = BASE_URL.replace(/\/+$/, '');
      const response = await fetch(`${API_URL}/api/v1/trip/match/${matchId}/notify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type, // 'status_change', 'location_update', 'meeting_point_set', 'emergency'
          message,
          data
        })
      });

      if (response.ok) {
        console.log('📱 [NOTIFICATION] Sent:', type, message);
      }
    } catch (err) {
      console.error('❌ [NOTIFICATION] Error sending:', err);
    }
  }, []);

  // Show local notification
  const showLocalNotification = useCallback((title, message, onPress = null) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Dismiss', style: 'cancel' },
        ...(onPress ? [{ text: 'View', onPress }] : [])
      ]
    );

    // Add to notifications list
    const notification = {
      id: Date.now().toString(),
      title,
      message,
      timestamp: new Date(),
      read: false
    };

    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
  }, []);

  // Mark notification as read
  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, read: true }
          : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    sendTripNotification,
    showLocalNotification,
    markAsRead,
    clearAll
  };
}