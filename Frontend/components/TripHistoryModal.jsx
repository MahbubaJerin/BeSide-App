import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Animated,
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedButton } from "@/components/ThemedButton";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import { BASE_URL } from "../config";

export default function TripHistoryModal({ visible, onClose }) {
  const [tripHistory, setTripHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      fetchTripHistory();
      // Animate in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Reset animation
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const fetchTripHistory = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const API_URL = BASE_URL.replace(/\/+$/, "");
      const response = await fetch(`${API_URL}/api/v1/trip/trip-history`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const result = await response.json();
      if (result.status === "success") {
        // Use the new combined history if available, otherwise fall back to requests
        setTripHistory(result.data.history || result.data.requests || []);
        console.log("📋 [TRIP HISTORY] Loaded history items:", result.data.history?.length || result.data.requests?.length || 0);
      } else {
        throw new Error(result.message || "Failed to fetch trip history");
      }
    } catch (error) {
      console.error("Error fetching trip history:", error);
      Alert.alert("Error", "Failed to load trip history");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTripHistory();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "#10b981"; // Modern green
      case "cancelled":
        return "#ef4444"; // Modern red  
      case "expired":
        return "#6b7280"; // Modern gray
      case "declined":
        return "#f59e0b"; // Modern orange
      default:
        return "#3b82f6"; // Modern blue
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case "completed":
        return { icon: "checkmark-circle", color: "#10b981", bg: "#d1fae5" };
      case "cancelled":
        return { icon: "close-circle", color: "#ef4444", bg: "#fee2e2" };
      case "expired":
        return { icon: "time", color: "#6b7280", bg: "#f3f4f6" };
      case "declined":
        return { icon: "alert-circle", color: "#f59e0b", bg: "#fef3c7" };
      default:
        return { icon: "information-circle", color: "#3b82f6", bg: "#dbeafe" };
    }
  };

  const getStatusText = (request) => {
    switch (request.status) {
      case "completed":
        return request.type === 'match' ? "Journey completed with companion" : "Trip completed successfully";
      case "cancelled":
        return "Trip was cancelled";
      case "expired":
        return "Request expired";
      case "declined":
        return "Request was declined";
      default:
        return request.status;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const formatDateTime = (dateString, timeString) => {
    if (!dateString) return "Date not available";
    
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
    
    return timeString ? `${dateStr} • ${timeString}` : dateStr;
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#8B5CF6" />
        
        {/* Modern Gradient Header */}
        <View style={styles.gradientHeader}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.backButton} onPress={onClose}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <ThemedText style={styles.headerTitle}>Trip History</ThemedText>
          </View>
          <ThemedText style={styles.headerSubtitle}>
            Your recent journey memories
          </ThemedText>
        </View>

        {/* Content */}
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <ScrollView
            style={styles.historyList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={handleRefresh}
                tintColor="#8B5CF6"
                colors={["#8B5CF6"]}
              />
            }
          >
            {loading && tripHistory.length === 0 ? (
              <View style={styles.loadingContainer}>
                <Ionicons name="hourglass-outline" size={48} color="#8B5CF6" />
                <ThemedText style={styles.loadingText}>Loading your journey history...</ThemedText>
              </View>
            ) : tripHistory.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="map-outline" size={64} color="#d1d5db" />
                <ThemedText style={styles.emptyText}>No trips yet</ThemedText>
                <ThemedText style={styles.emptySubtext}>
                  Your completed and cancelled trips will appear here
                </ThemedText>
                <ThemedText style={styles.emptyHint}>
                  Start your first journey to build your travel history!
                </ThemedText>
              </View>
            ) : (
              tripHistory.map((trip) => (
                <View key={trip.matchId || trip.tripReqId || trip.id || trip._id} style={styles.historyCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.statusBadge}>
                      <ThemedText style={styles.statusIcon}>
                        {getStatusIcon(trip.status)}
                      </ThemedText>
                      <ThemedText style={[styles.statusText, { color: getStatusColor(trip.status) }]}>
                        {trip.status.toUpperCase()}
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.dateText}>
                      {formatDate(trip.createdAt)}
                    </ThemedText>
                    <ThemedText style={styles.statLabel}>With Companion</ThemedText>
                  </View>

                  <ThemedText style={styles.destination}>
                    📍 {trip.destination}
                  </ThemedText>
                  
                  <ThemedText style={styles.dateTime}>
                    📅 {trip.plannedDate ? new Date(trip.plannedDate).toLocaleDateString() : new Date(trip.date).toLocaleDateString()} at {trip.plannedTime || trip.time}
                  </ThemedText>

                  <ThemedText style={styles.statusDescription}>
                    {getStatusText(trip)}
                  </ThemedText>

                  {/* Show companion info for completed matches */}
                  {trip.type === 'match' && trip.companionInfo && (
                    <ThemedText style={styles.companionInfo}>
                      👥 Traveled with: {trip.companionInfo.userName || "Anonymous"}
                    </ThemedText>
                  )}

                  {/* Show trip type badge */}
                  {trip.type === 'match' && trip.status === 'completed' && (
                    <ThemedText style={styles.tripTypeBadge}>
                      🎉 Completed Journey
                    </ThemedText>
                  )}

                  {trip.acceptedBy && trip.type !== 'match' && (
                    <ThemedText style={styles.companionInfo}>
                      👥 Companion: {trip.acceptedBy.userName || "Anonymous"}
                    </ThemedText>
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenHeight < 700;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  
  // Modern Gradient Header
  gradientHeader: {
    background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
    backgroundColor: '#8B5CF6',
    paddingTop: isSmallScreen ? 8 : 10,
    paddingHorizontal: screenWidth * 0.05,
    paddingBottom: isSmallScreen ? 20 : 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: isSmallScreen ? 5 : 10,
    marginBottom: isSmallScreen ? 8 : 12,
  },
  backButton: {
    width: screenWidth * 0.1,
    height: screenWidth * 0.1,
    borderRadius: screenWidth * 0.05,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: screenWidth * 0.04,
  },
  headerTitle: {
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: '700',
    color: 'white',
    flex: 1,
  },
  headerSubtitle: {
    fontSize: isSmallScreen ? 14 : 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },

  // Content
  content: {
    flex: 1,
  },
  historyList: {
    flex: 1,
    paddingHorizontal: screenWidth * 0.05,
    paddingTop: isSmallScreen ? 16 : 20,
  },

  // Loading State
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: screenHeight * 0.15,
  },
  loadingText: {
    fontSize: isSmallScreen ? 16 : 18,
    color: '#6b7280',
    marginTop: 16,
    fontWeight: '500',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: screenHeight * 0.12,
    paddingHorizontal: screenWidth * 0.1,
  },
  emptyText: {
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Stats Section
  statsContainer: {
    flexDirection: 'row',
    marginBottom: isSmallScreen ? 20 : 24,
    gap: isSmallScreen ? 8 : 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: isSmallScreen ? 12 : 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: '700',
    color: '#8B5CF6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: isSmallScreen ? 11 : 12,
    color: '#6b7280',
    fontWeight: '500',
    textAlign: 'center',
  },

  // Modern Trip Cards
  modernCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: isSmallScreen ? 12 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },

  // Card Header
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: isSmallScreen ? 14 : 16,
    paddingBottom: isSmallScreen ? 10 : 12,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  statusIconContainer: {
    width: isSmallScreen ? 36 : 40,
    height: isSmallScreen ? 36 : 40,
    borderRadius: isSmallScreen ? 18 : 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: isSmallScreen ? 15 : 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  cardDate: {
    fontSize: isSmallScreen ? 12 : 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  statusChip: {
    paddingHorizontal: isSmallScreen ? 8 : 10,
    paddingVertical: isSmallScreen ? 4 : 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: isSmallScreen ? 11 : 12,
    fontWeight: '600',
  },

  // Card Content
  cardContent: {
    paddingHorizontal: isSmallScreen ? 14 : 16,
    paddingBottom: isSmallScreen ? 14 : 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: isSmallScreen ? 6 : 8,
  },
  detailText: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#4b5563',
    marginLeft: 8,
    flex: 1,
  },
  statusRow: {
    marginTop: isSmallScreen ? 4 : 6,
    marginBottom: isSmallScreen ? 8 : 10,
  },
  statusDescription: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#6b7280',
    fontStyle: 'italic',
    lineHeight: 20,
  },

  // Companion Section
  companionSection: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: isSmallScreen ? 10 : 12,
    marginTop: isSmallScreen ? 6 : 8,
  },
  companionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  companionAvatar: {
    width: isSmallScreen ? 28 : 32,
    height: isSmallScreen ? 28 : 32,
    borderRadius: isSmallScreen ? 14 : 16,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  companionName: {
    fontSize: isSmallScreen ? 13 : 14,
    fontWeight: '600',
    color: '#374151',
  },
  companionLabel: {
    fontSize: isSmallScreen ? 11 : 12,
    color: '#8B5CF6',
    fontWeight: '500',
  },

  // Success Badge
  successBadge: {
    backgroundColor: '#fef3c7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isSmallScreen ? 8 : 10,
    marginTop: isSmallScreen ? 8 : 10,
  },
  successText: {
    fontSize: isSmallScreen ? 12 : 13,
    fontWeight: '600',
    color: '#f59e0b',
    marginLeft: 6,
  },

  // Footer
  footerHint: {
    alignItems: 'center',
    paddingVertical: isSmallScreen ? 20 : 24,
    marginTop: isSmallScreen ? 12 : 16,
  },
  hintText: {
    fontSize: isSmallScreen ? 12 : 13,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
});