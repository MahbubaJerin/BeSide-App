import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedButton } from "@/components/ThemedButton";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import { BASE_URL } from "../config";

// Separate component for each request card to properly handle hooks
function RequestCard({ request, onMarkViewed, onResponse, respondingTo, formatDate, formatTimeRemaining }) {
  // Mark as viewed when component mounts
  useEffect(() => {
    onMarkViewed(request.tripReqId);
  }, [request.tripReqId, onMarkViewed]);

  return (
    <View style={styles.requestCard}>
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <ThemedText style={styles.avatarText}>
              {request.user.userName.charAt(0).toUpperCase()}
            </ThemedText>
          </View>
          <View>
            <ThemedText style={styles.userName}>
              {request.user.userName}
            </ThemedText>
            <ThemedText style={styles.timeAgo}>
              {formatTimeRemaining(request.expiresAt)}
            </ThemedText>
          </View>
        </View>
        <View style={styles.urgencyBadge}>
          <ThemedText style={styles.urgencyText}>NEW</ThemedText>
        </View>
      </View>

      <View style={styles.requestDetails}>
        <View style={styles.detailRow}>
          <ThemedText style={styles.detailIcon}>📍</ThemedText>
          <ThemedText style={styles.detailText}>
            Going to: {request.destination}
          </ThemedText>
        </View>
        
        <View style={styles.detailRow}>
          <ThemedText style={styles.detailIcon}>🚶</ThemedText>
          <ThemedText style={styles.detailText}>
            Transport: {request.destinationType}
          </ThemedText>
        </View>

        <View style={styles.detailRow}>
          <ThemedText style={styles.detailIcon}>⏰</ThemedText>
          <ThemedText style={styles.detailText}>
            {formatDate(request.date)} 
          </ThemedText>
        </View>

        <View style={styles.detailRow}>
          <ThemedText style={styles.detailIcon}>👥</ThemedText>
          <ThemedText style={styles.detailText}>
            Prefers: {request.genderPreference === "any" ? "Anyone" : request.genderPreference}
          </ThemedText>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <ThemedButton
          title={respondingTo === request.tripReqId ? "..." : "✅ Accept"}
          onPress={() => onResponse(request.tripReqId, "accepted")}
          style={[styles.button, styles.acceptButton]}
          disabled={respondingTo === request.tripReqId}
        />
        <ThemedButton
          title={respondingTo === request.tripReqId ? "..." : "❌ Decline"}
          onPress={() => onResponse(request.tripReqId, "declined")}
          style={[styles.button, styles.declineButton]}
          disabled={respondingTo === request.tripReqId}
        />
      </View>
    </View>
  );
}

export default function RequestNotificationModal({ visible, onClose, onRequestAccepted }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [respondingTo, setRespondingTo] = useState(null);

  useEffect(() => {
    if (visible) {
      fetchPendingRequests();
    }
  }, [visible]);

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const API_URL = BASE_URL.replace(/\/+$/, "");
      const response = await fetch(`${API_URL}/api/v1/trip/pending-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const result = await response.json();
      if (result.status === "success") {
        setRequests(result.data.requests);
      } else {
        console.log("No pending requests or error:", result.message);
        setRequests([]);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPendingRequests();
    setRefreshing(false);
  };

  const handleResponse = async (tripReqId, response) => {
    if (respondingTo === tripReqId) return; // Prevent double-tap
    
    try {
      setRespondingTo(tripReqId);
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const API_URL = BASE_URL.replace(/\/+$/, "");
      const apiResponse = await fetch(`${API_URL}/api/v1/trip/respond-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tripReqId, response }),
      });

      const result = await apiResponse.json();
      if (result.status === "success") {
        if (response === "accepted") {
          Alert.alert(
            "🎉 Match Found!", 
            "You've successfully joined this trip! The trip organizer has been notified.",
            [
              { 
                text: "Great!", 
                onPress: () => {
                  onRequestAccepted?.(result.data.tripRequest);
                  onClose();
                }
              }
            ]
          );
        } else {
          Alert.alert("Request Declined", "You've declined this trip request.");
        }
        
        // Refresh the list to remove the responded request
        await fetchPendingRequests();
      } else {
        throw new Error(result.message || "Failed to respond to request");
      }
    } catch (error) {
      console.error("Error responding to request:", error);
      Alert.alert("Error", error.message || "Failed to respond to request");
    } finally {
      setRespondingTo(null);
    }
  };

  const markAsViewed = async (tripReqId) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const API_URL = BASE_URL.replace(/\/+$/, "");
      await fetch(`${API_URL}/api/v1/trip/mark-viewed`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tripReqId }),
      });
    } catch (error) {
      console.error("Error marking as viewed:", error);
    }
  };

  const formatTimeRemaining = (expiresAt) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry - now;
    
    if (diff <= 0) return "Expired";
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s left`;
    }
    return `${seconds}s left`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " at " + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <ThemedText type="subtitle">🔔 Trip Requests</ThemedText>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <ThemedText style={styles.closeText}>✕</ThemedText>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.requestsList}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          >
            {loading && requests.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ThemedText>Loading requests...</ThemedText>
              </View>
            ) : requests.length === 0 ? (
              <View style={styles.emptyContainer}>
                <ThemedText style={styles.emptyIcon}>📭</ThemedText>
                <ThemedText style={styles.emptyText}>No trip requests</ThemedText>
                <ThemedText style={styles.emptySubtext}>
                  New companion requests from nearby users will appear here
                </ThemedText>
              </View>
            ) : (
              requests.map((request) => (
                <RequestCard 
                  key={request.tripReqId}
                  request={request}
                  onMarkViewed={markAsViewed}
                  onResponse={handleResponse}
                  respondingTo={respondingTo}
                  formatDate={formatDate}
                  formatTimeRemaining={formatTimeRemaining}
                />
              ))
            )}
          </ScrollView>

          <ThemedButton
            title="Close"
            onPress={onClose}
            style={styles.closeButtonBottom}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    backgroundColor: Colors.light.background,
    borderRadius: 20,
    width: "95%",
    maxHeight: "85%",
    paddingVertical: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.tabIconDefault,
    justifyContent: "center",
    alignItems: "center",
  },
  closeText: {
    fontSize: 18,
    color: Colors.light.background,
    fontWeight: "bold",
  },
  requestsList: {
    paddingHorizontal: 16,
    maxHeight: "75%",
  },
  loadingContainer: {
    alignItems: "center",
    padding: 40,
  },
  emptyContainer: {
    alignItems: "center",
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
    textAlign: "center",
    lineHeight: 20,
  },
  requestCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E3F2FD",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.tint,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
  },
  timeAgo: {
    fontSize: 12,
    color: "#FF6B6B",
    fontWeight: "500",
  },
  urgencyBadge: {
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  urgencyText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  requestDetails: {
    backgroundColor: "#F8F9FA",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  detailIcon: {
    fontSize: 16,
    marginRight: 8,
    width: 20,
  },
  detailText: {
    fontSize: 14,
    color: Colors.light.text,
    flex: 1,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
  },
  acceptButton: {
    backgroundColor: "#4CAF50",
  },
  declineButton: {
    backgroundColor: "#FF6B6B",
  },
  closeButtonBottom: {
    marginTop: 16,
    marginHorizontal: 20,
  },
});