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
          <Text style={styles.messageText}>
            Destination: {request.destination}
            {'\n'}Transport: {request.destinationType}
            {request.genderPreference !== "any" ? `\nPrefers: ${request.genderPreference} companions` : ''}
          </Text>
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
  const [refreshing, setRefreshing] = useState(false);
  const [respondingTo, setRespondingTo] = useState(null);

  const fetchPendingRequests = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      setLoading(true);
      const API_URL = BASE_URL.replace(/\/+$/, "");
      const response = await fetch(`${API_URL}/api/v1/trip/pending-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.status === "success") {
          setRequests(result.data.requests || []);
        }
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
      fetchPendingRequests();
    }
  }, [visible]);

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
              <View style={styles.emptyContainer}>
                <ThemedText>Loading requests...</ThemedText>
              </View>
            ) : requests.length === 0 ? (
              <View style={styles.emptyContainer}>
                <ThemedText style={styles.emptyIcon}>📭</ThemedText>
                <ThemedText style={styles.emptyText}>No trip requests</ThemedText>
                <ThemedText style={styles.emptySubtext}>
                  New companion requests from nearby users will appear here.
                </ThemedText>
              </View>
            ) : (
              requests.map((request) => (
                <RequestCard 
                  key={request.tripReqId}
                  request={request}
                  onResponse={handleResponse}
                  respondingTo={respondingTo}
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