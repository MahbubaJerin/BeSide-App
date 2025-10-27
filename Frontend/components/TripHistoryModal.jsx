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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedButton } from "@/components/ThemedButton";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import { BASE_URL } from "../config";

export default function TripHistoryModal({ visible, onClose }) {
  const [tripHistory, setTripHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchTripHistory();
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
        return "#4CAF50"; // Green
      case "cancelled":
        return "#f44336"; // Red  
      case "expired":
        return "#757575"; // Gray
      case "declined":
        return "#FF9800"; // Orange
      default:
        return "#2196F3"; // Blue
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return "✅";
      case "cancelled":
        return "❌";
      case "expired":
        return "⏰";
      case "declined":
        return "❌";
      default:
        return "ℹ️";
    }
  };

  const getStatusText = (request) => {
    switch (request.status) {
      case "completed":
        return "Trip completed successfully";
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
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <ThemedText type="subtitle">Trip History</ThemedText>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <ThemedText style={styles.closeText}>✕</ThemedText>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.historyList}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          >
            {loading && tripHistory.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ThemedText>Loading trip history...</ThemedText>
              </View>
            ) : tripHistory.length === 0 ? (
              <View style={styles.emptyContainer}>
                <ThemedText style={styles.emptyText}>No trip history</ThemedText>
                <ThemedText style={styles.emptySubtext}>
                  Your completed, cancelled and expired trips will appear here
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
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    minHeight: "60%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  closeButton: {
    padding: 5,
  },
  closeText: {
    fontSize: 18,
    color: "#666",
  },
  historyList: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    alignItems: "center",
    padding: 40,
  },
  emptyContainer: {
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  historyCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  statusIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  dateText: {
    fontSize: 12,
    color: "#666",
  },
  destination: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  dateTime: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  statusDescription: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
    marginBottom: 8,
  },
  companionInfo: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "500",
  },
});