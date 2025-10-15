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

// Simple request card component with sender photo
function RequestCard({ request, onResponse, respondingTo }) {
  return (
    <View style={styles.requestCard}>
      {/* Header with curved background */}
      <View style={styles.curvedHeader}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>🚶 Companion Request</Text>
          <Text style={styles.dateTextHeader}>
            {new Date(request.date).toLocaleDateString()}
          </Text>
        </View>
        
        {/* Sender photo */}
        <View style={styles.photoContainer}>
          {request.photo?.url ? (
            <Image 
              source={{ uri: request.photo.url }}
              style={styles.senderPhotoCard}
            />
          ) : (
            <View style={styles.senderPhotoPlaceholderCard}>
              <Text style={styles.senderPhotoTextCard}>
                {request.user.userName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Content section */}
      <View style={styles.whiteSection}>
        <View style={styles.senderInfo}>
          <Text style={styles.senderName}>{request.user.userName}</Text>
          <Text style={styles.senderLabel}>Sender</Text>
        </View>

        <View style={styles.messageSection}>
          <Text style={styles.messageLabel}>Trip Details</Text>
          <View style={styles.tripDetailsContainer}>
            <View style={styles.tripDetailRow}>
              <Text style={styles.tripDetailIcon}>📍</Text>
              <View style={styles.tripDetailContent}>
                <Text style={styles.tripDetailLabel}>Destination</Text>
                <Text style={styles.tripDetailValue}>{request.destination}</Text>
              </View>
            </View>
            
            <View style={styles.tripDetailRow}>
              <Text style={styles.tripDetailIcon}>🚌</Text>
              <View style={styles.tripDetailContent}>
                <Text style={styles.tripDetailLabel}>Transport</Text>
                <Text style={styles.tripDetailValue}>{request.destinationType}</Text>
              </View>
            </View>
            
            <View style={styles.tripDetailRow}>
              <Text style={styles.tripDetailIcon}>📅</Text>
              <View style={styles.tripDetailContent}>
                <Text style={styles.tripDetailLabel}>Date & Time</Text>
                <Text style={styles.tripDetailValue}>
                  {new Date(request.date).toLocaleDateString()} at {request.time}
                </Text>
              </View>
            </View>
            
            {request.startingLocation?.address && (
              <View style={styles.tripDetailRow}>
                <Text style={styles.tripDetailIcon}>🚩</Text>
                <View style={styles.tripDetailContent}>
                  <Text style={styles.tripDetailLabel}>Starting From</Text>
                  <Text style={styles.tripDetailValue}>{request.startingLocation.address}</Text>
                </View>
              </View>
            )}
            
            {request.genderPreference !== "any" && (
              <View style={styles.tripDetailRow}>
                <Text style={styles.tripDetailIcon}>👥</Text>
                <View style={styles.tripDetailContent}>
                  <Text style={styles.tripDetailLabel}>Preference</Text>
                  <Text style={styles.tripDetailValue}>{request.genderPreference} companions</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionButtonsCard}>
          <TouchableOpacity
            style={[styles.actionButtonCard, styles.acceptButtonCard, respondingTo === request.tripReqId && styles.disabledButton]}
            onPress={() => onResponse(request.tripReqId, "accepted")}
            disabled={respondingTo === request.tripReqId}
          >
            <Text style={styles.acceptButtonText}>
              {respondingTo === request.tripReqId ? "..." : "ACCEPT"}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButtonCard, styles.declineButtonCard, respondingTo === request.tripReqId && styles.disabledButton]}
            onPress={() => onResponse(request.tripReqId, "declined")}
            disabled={respondingTo === request.tripReqId}
          >
            <Text style={styles.declineButtonText}>
              {respondingTo === request.tripReqId ? "..." : "DECLINE"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function RequestNotificationModal({ 
  visible, 
  onClose, 
  onRequestAccepted,
  currentLocation
}) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [respondingTo, setRespondingTo] = useState(null);

  const fetchPendingRequests = async () => {
    // Prevent multiple simultaneous requests
    if (loading) return;
    
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        console.log("❌ [NOTIFICATIONS] No token found");
        return;
      }

      setLoading(true);
      const API_URL = BASE_URL.replace(/\/+$/, "");
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${API_URL}/api/v1/trip/pending-requests`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        if (result.status === "success") {
          const pendingRequests = result.data.requests || [];
          setRequests(pendingRequests);
          console.log(`📋 [NOTIFICATIONS] Found ${pendingRequests.length} pending requests`);
        } else {
          console.log("❌ [NOTIFICATIONS] API error:", result.message);
          setRequests([]); // Clear on error
        }
      } else {
        console.log("❌ [NOTIFICATIONS] HTTP Error:", response.status);
        setRequests([]); // Clear on error
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log("⏱️ [NOTIFICATIONS] Request timed out");
      } else {
        console.error("❌ [NOTIFICATIONS] Network error:", error);
      }
      setRequests([]); // Clear on error to prevent freeze
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (tripReqId, response) => {
    if (respondingTo === tripReqId) return;
    
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
          onClose();
          Alert.alert(
            "Request Accepted! 🎉", 
            "You have successfully accepted the companion request.",
            [{ 
              text: "OK",
              onPress: () => {
                onRequestAccepted?.(result.data.tripRequest);
              }
            }]
          );
        } else {
          Alert.alert("Success", "Request declined successfully");
        }
        
        // Remove the request from the list
        setRequests(prev => prev.filter(req => req.tripReqId !== tripReqId));
      } else {
        throw new Error(result.message || "Failed to respond to request");
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to respond to request");
    } finally {
      setRespondingTo(null);
    }
  };

  useEffect(() => {
    if (visible) {
      setRespondingTo(null);
      setRequests([]); // Clear previous requests
      fetchPendingRequests();
      
      // Safety timeout to prevent freezing
      const safetyTimeout = setTimeout(() => {
        if (loading) {
          console.log("⚠️ [NOTIFICATIONS] Safety timeout - closing loading state");
          setLoading(false);
        }
      }, 15000); // 15 second safety timeout
      
      return () => clearTimeout(safetyTimeout);
    } else {
      // Reset state when modal closes
      setRequests([]);
      setLoading(false);
      setRespondingTo(null);
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <ThemedText type="subtitle">🔔 Trip Requests</ThemedText>
            <TouchableOpacity 
              onPress={() => {
                console.log("🚪 [NOTIFICATIONS] Closing modal");
                setLoading(false);
                setRequests([]);
                setRespondingTo(null);
                onClose();
              }} 
              style={styles.closeButton}
            >
              <ThemedText style={styles.closeText}>✕</ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.contentContainer}>
            {loading ? (
              <View style={styles.emptyContainer}>
                <ThemedText style={styles.loadingText}>Loading...</ThemedText>
              </View>
            ) : requests.length === 0 ? (
              <View style={styles.emptyContainer}>
                <ThemedText style={styles.emptyIcon}>📭</ThemedText>
                <ThemedText style={styles.emptyText}>No trip requests</ThemedText>
                <ThemedText style={styles.emptySubtext}>
                  New companion requests from nearby users will appear here.
                </ThemedText>
                <TouchableOpacity 
                  style={styles.refreshButton}
                  onPress={fetchPendingRequests}
                >
                  <ThemedText style={styles.refreshButtonText}>🔄 Refresh</ThemedText>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView style={styles.requestsList}>
                {requests.map((request) => (
                  <RequestCard 
                    key={request.tripReqId}
                    request={request}
                    onResponse={handleResponse}
                    respondingTo={respondingTo}
                  />
                ))}
              </ScrollView>
            )}
          </View>

          <ThemedButton
            title="Close"
            onPress={() => {
              console.log("🚪 [NOTIFICATIONS] Force closing modal");
              setLoading(false);
              setRequests([]);
              setRespondingTo(null);
              onClose();
            }}
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
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    width: "90%",
    maxHeight: "80%",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    fontSize: 18,
    color: Colors.light.text,
  },
  requestsList: {
    maxHeight: 400,
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
    color: Colors.light.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: "center",
    marginBottom: 20,
  },
  refreshButton: {
    backgroundColor: "#8B5CF6",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: "center",
  },
  refreshButtonText: {
    color: "white",
    fontWeight: "600",
  },
  loadingText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  contentContainer: {
    flex: 1,
  },
  closeButtonBottom: {
    margin: 16,
  },
  
  // Request card styles
  requestCard: {
    margin: 16,
    borderRadius: 16,
    backgroundColor: Colors.light.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  curvedHeader: {
    backgroundColor: '#4A90E2',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    position: 'relative',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  dateTextHeader: {
    fontSize: 12,
    color: 'white',
    opacity: 0.9,
  },
  photoContainer: {
    position: 'absolute',
    right: 20,
    top: -10,
    bottom: -10,
    justifyContent: 'center',
  },
  senderPhotoCard: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: 'white',
  },
  senderPhotoPlaceholderCard: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  senderPhotoTextCard: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  whiteSection: {
    backgroundColor: 'white',
    padding: 20,
  },
  senderInfo: {
    marginBottom: 16,
  },
  senderName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  senderLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  messageSection: {
    marginBottom: 20,
  },
  tripDetailsContainer: {
    marginTop: 8,
  },
  tripDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tripDetailIcon: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 2,
    width: 20,
  },
  tripDetailContent: {
    flex: 1,
  },
  tripDetailLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginBottom: 2,
  },
  tripDetailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  messageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  messageText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  actionButtonsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButtonCard: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonCard: {
    backgroundColor: '#28A745',
  },
  declineButtonCard: {
    backgroundColor: '#DC3545',
  },
  disabledButton: {
    opacity: 0.6,
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  declineButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});