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

export default function SentRequestStatusModal({ visible, onClose }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchSentRequests();
    }
  }, [visible]);

  const fetchSentRequests = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const API_URL = BASE_URL.replace(/\/+$/, "");
      const response = await fetch(`${API_URL}/api/v1/trip/sent-requests-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const result = await response.json();
      if (result.status === "success") {
        setRequests(result.data.requests);
      } else {
        throw new Error(result.message || "Failed to fetch sent requests");
      }
    } catch (error) {
      console.error("Error fetching sent requests:", error);
      Alert.alert("Error", "Failed to load sent requests");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSentRequests();
    setRefreshing(false);
  };

  const cancelRequest = async (tripReqId) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      Alert.alert(
        "Cancel Request",
        "Are you sure you want to cancel this trip request?",
        [
          { text: "No", style: "cancel" },
          {
            text: "Yes",
            style: "destructive",
            onPress: async () => {
              const API_URL = BASE_URL.replace(/\/+$/, "");
              const response = await fetch(`${API_URL}/api/v1/trip/cancel-request`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ tripReqId }),
              });

              const result = await response.json();
              if (result.status === "success") {
                Alert.alert("Success", "Request cancelled successfully");
                fetchSentRequests(); // Refresh list
              } else {
                throw new Error(result.message || "Failed to cancel request");
              }
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert("Error", "Failed to cancel request");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "#FFA500"; // Orange
      case "accepted":
        return "#4CAF50"; // Green
      case "expired":
        return "#757575"; // Gray
      default:
        return "#2196F3"; // Blue
    }
  };

  const getStatusText = (request) => {
    if (request.status === "accepted") {
      return `✅ Accepted by ${request.acceptedBy?.userName || "someone"}`;
    }
    if (request.status === "expired") {
      return "⏰ Expired";
    }
    
    // Use enhanced status info if available
    if (request.statusInfo) {
      return request.statusInfo.message;
    }
    
    const respondedCount = request.recipients?.filter(r => 
      ["accepted", "declined"].includes(r.responseStatus)
    ).length || 0;
    
    const totalCount = request.recipients?.length || 0;
    
    return `⏳ Pending - ${respondedCount}/${totalCount} responded`;
  };

  const formatTimeRemaining = (expiresAt) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry - now;
    
    if (diff <= 0) return "Expired";
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')} remaining`;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <ThemedText type="subtitle">My Trip Requests</ThemedText>
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
                <ThemedText>Loading...</ThemedText>
              </View>
            ) : requests.length === 0 ? (
              <View style={styles.emptyContainer}>
                <ThemedText style={styles.emptyText}>No active requests</ThemedText>
                <ThemedText style={styles.emptySubtext}>
                  Your sent companion requests will appear here
                </ThemedText>
              </View>
            ) : (
              requests.map((request) => (
                <View key={request.tripReqId} style={styles.requestCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.statusBadge}>
                      <View 
                        style={[
                          styles.statusDot, 
                          { backgroundColor: getStatusColor(request.status) }
                        ]} 
                      />
                      <ThemedText style={styles.statusText}>
                        {request.status.toUpperCase()}
                      </ThemedText>
                    </View>
                    {request.status === "pending" && (
                      <ThemedText style={styles.timeRemaining}>
                        {formatTimeRemaining(request.expiresAt)}
                      </ThemedText>
                    )}
                  </View>

                  <ThemedText style={styles.destination}>
                    📍 {request.destination}
                  </ThemedText>
                  
                  <ThemedText style={styles.dateTime}>
                    📅 {new Date(request.date).toLocaleDateString()} at {request.time}
                  </ThemedText>
                  
                  <ThemedText style={styles.statusMessage}>
                    {getStatusText(request)}
                  </ThemedText>
                  
                  {/* Enhanced status info display */}
                  {request.statusInfo && (
                    <View style={styles.statusDetails}>
                      <View style={styles.statusRow}>
                        <ThemedText style={styles.statusLabel}>📤 Sent to:</ThemedText>
                        <ThemedText style={styles.statusValue}>{request.statusInfo.totalRecipients} users</ThemedText>
                      </View>
                      {request.statusInfo.viewedCount > 0 && (
                        <View style={styles.statusRow}>
                          <ThemedText style={styles.statusLabel}>👁️ Viewed:</ThemedText>
                          <ThemedText style={styles.statusValue}>{request.statusInfo.viewedCount} users</ThemedText>
                        </View>
                      )}
                      {request.statusInfo.awaitingCount > 0 && (
                        <View style={styles.statusRow}>
                          <ThemedText style={styles.statusLabel}>⏳ Awaiting:</ThemedText>
                          <ThemedText style={[styles.statusValue, styles.awaitingText]}>
                            {request.statusInfo.awaitingCount} responses
                          </ThemedText>
                        </View>
                      )}
                      {request.statusInfo.isExpiringSoon && (
                        <View style={[styles.statusRow, styles.warningRow]}>
                          <ThemedText style={styles.warningText}>
                            ⚠️ Expires in {request.statusInfo.timeRemainingMinutes} minutes
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  )}

                  <ThemedText style={styles.statusDescription}>
                    {getStatusText(request)}
                  </ThemedText>

                  {request.recipients && request.recipients.length > 0 && (
                    <View style={styles.recipientInfo}>
                      <ThemedText style={styles.recipientLabel}>
                        Sent to {request.recipients.length} nearby users
                      </ThemedText>
                    </View>
                  )}

                  {request.status === "pending" && (
                    <View style={styles.actionButtons}>
                      <ThemedButton
                        title="Cancel Request"
                        onPress={() => cancelRequest(request.tripReqId)}
                        style={styles.cancelButton}
                      />
                    </View>
                  )}

                  {request.status === "accepted" && (
                    <View style={styles.matchInfo}>
                      <ThemedText style={styles.matchText}>
                        🎉 Match found! Trip is ready to start.
                      </ThemedText>
                    </View>
                  )}
                </View>
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
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    width: "90%",
    maxHeight: "80%",
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
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.light.tabIconDefault,
    justifyContent: "center",
    alignItems: "center",
  },
  closeText: {
    fontSize: 16,
    color: Colors.light.background,
  },
  requestsList: {
    paddingHorizontal: 20,
    maxHeight: "70%",
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
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
    textAlign: "center",
  },
  requestCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.tabIconDefault + "20",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  timeRemaining: {
    fontSize: 12,
    color: "#FF6B6B",
    fontWeight: "500",
  },
  destination: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  statusMessage: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
    marginVertical: 6,
  },
  statusDetails: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  statusValue: {
    fontSize: 12,
    color: "#333",
    fontWeight: "600",
  },
  awaitingText: {
    color: "#8B5CF6",
  },
  warningRow: {
    backgroundColor: "#fff3cd",
    borderRadius: 4,
    padding: 6,
    marginTop: 4,
  },
  warningText: {
    fontSize: 12,
    color: "#856404",
    fontWeight: "600",
    textAlign: "center",
  },
  dateTime: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
    marginBottom: 8,
  },
  statusDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  recipientInfo: {
    backgroundColor: Colors.light.background,
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  recipientLabel: {
    fontSize: 12,
    color: Colors.light.tabIconDefault,
  },
  actionButtons: {
    marginTop: 8,
  },
  cancelButton: {
    backgroundColor: "#FF6B6B",
  },
  matchInfo: {
    backgroundColor: "#E8F5E8",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  matchText: {
    color: "#2E7D32",
    fontWeight: "600",
    textAlign: "center",
  },
  closeButtonBottom: {
    marginTop: 16,
    marginHorizontal: 20,
  },
});