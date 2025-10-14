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
import { useRouteCalculation } from "@/hooks/useRouteCalculation";

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

        {/* Route Information */}
        <View style={styles.routeInfo}>
          <ThemedText style={styles.routeTitle}>📍 Trip Information</ThemedText>
          <ThemedText style={styles.routeDetail}>
            Destination: {request.destination || 'Not specified'}
          </ThemedText>
          <ThemedText style={styles.routeDetail}>
            Transport: {request.destinationType || 'Walking'}
          </ThemedText>
          {request.transportMode && (
            <ThemedText style={styles.routeDetail}>
              Mode: {request.transportMode.charAt(0).toUpperCase() + request.transportMode.slice(1)}
            </ThemedText>
          )}
          <ThemedText style={styles.routeHelp}>
            💡 Route will be calculated when you accept
          </ThemedText>
        </View>
        
        {request.meetingPoint && request.meetingPoint.isSelected && (
          <View style={styles.meetingInfo}>
            <ThemedText style={styles.meetingTitle}>🤝 Meeting Point Set</ThemedText>
            <ThemedText style={styles.meetingDetail}>
              {request.meetingPoint.address || 'Meeting location selected'}
            </ThemedText>
          </View>
        )}
      </View>

      <View style={styles.actionButtons}>
        <ThemedButton
          title={respondingTo === request.tripReqId ? "..." : "✅ Accept"}
          onPress={() => {
            console.log('🚨 [DEBUG] Accept button pressed for request:', request.tripReqId);
            console.log('🚨 [DEBUG] Button is disabled?', respondingTo === request.tripReqId);
            onResponse(request.tripReqId, "accepted");
          }}
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

export default function RequestNotificationModal({ 
  visible, 
  onClose, 
  onRequestAccepted,
  onRouteUpdate, // New prop to update parent map with receiver's route
  currentLocation // Receiver's current location
}) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [respondingTo, setRespondingTo] = useState(null);

  const { calculateReceiverRoute, getMapRegion, calculating } = useRouteCalculation();

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
    console.log('🔥 [DEBUG] === ACCEPT BUTTON CLICKED ===');
    console.log('🔥 [DEBUG] Trip Request ID:', tripReqId);
    console.log('🔥 [DEBUG] Response Type:', response);
    console.log('🔥 [DEBUG] Current respondingTo:', respondingTo);
    console.log('🔥 [DEBUG] Current Location:', currentLocation);
    
    if (respondingTo === tripReqId) {
      console.log('🚫 [DEBUG] Already responding to this request, preventing double-tap');
      return; // Prevent double-tap
    }
    
    try {
      console.log('🔥 [DEBUG] Setting respondingTo state...');
      setRespondingTo(tripReqId);
      
      console.log('🔥 [DEBUG] Getting token from AsyncStorage...');
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        console.log('❌ [DEBUG] No token found in AsyncStorage!');
        return;
      }
      console.log('✅ [DEBUG] Token retrieved successfully');

      console.log('🔥 [DEBUG] Preparing API request...');
      const API_URL = BASE_URL.replace(/\/+$/, "");
      console.log('🔥 [DEBUG] API URL:', `${API_URL}/api/v1/trip/respond-request`);
      console.log('🔥 [DEBUG] Request body:', { tripReqId, response });
      
      const apiResponse = await fetch(`${API_URL}/api/v1/trip/respond-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tripReqId, response }),
      });

      console.log('🔥 [DEBUG] API Response Status:', apiResponse.status);
      console.log('🔥 [DEBUG] API Response OK:', apiResponse.ok);
      
      const result = await apiResponse.json();
      console.log('🔥 [DEBUG] API Result:', JSON.stringify(result, null, 2));
      
      if (!apiResponse.ok) {
        // Handle specific error cases
        if (apiResponse.status === 404) {
          console.error("❌ Trip request not found - may have been cancelled or expired");
          Alert.alert("Request Expired", "This trip request is no longer available.");
          setRequests(prev => prev.filter(req => req.tripReqId !== tripReqId));
          return;
        } else if (apiResponse.status === 409) {
          console.error("❌ Trip request already processed");
          Alert.alert("Request Unavailable", "This request has already been accepted by someone else.");
          setRequests(prev => prev.filter(req => req.tripReqId !== tripReqId));
          return;
        } else if (apiResponse.status === 410) {
          console.error("❌ Trip request has expired");
          Alert.alert("Request Expired", "This trip request has expired.");
          setRequests(prev => prev.filter(req => req.tripReqId !== tripReqId));
          return;
        }
        throw new Error(result.message || "Failed to respond to request");
      }

      if (result.status === "success") {
        console.log('✅ [DEBUG] API Response successful!');
        console.log('🔥 [DEBUG] Result data:', JSON.stringify(result.data, null, 2));
        
        if (response === "accepted") {
          console.log('🔥 [DEBUG] Processing ACCEPTED response...');
          console.log('🔥 [DEBUG] Has currentLocation:', !!currentLocation);
          console.log('🔥 [DEBUG] Has senderCurrentLocation:', !!result.data.senderCurrentLocation);
          console.log('🔥 [DEBUG] Has onRouteUpdate callback:', !!onRouteUpdate);
          
          // CORRECTED FLOW: Route to meeting point (sender's start location)
          if (currentLocation && result.data.routeData && onRouteUpdate) {
            try {
              console.log('🚀 [MEETING POINT ROUTE] Starting meeting point route calculation...');
              console.log('📍 [MEETING POINT ROUTE] Receiver location:', currentLocation);
              console.log('📍 [MEETING POINT ROUTE] Route data:', result.data.routeData);
              
              // Meeting point is the sender's starting location
              const meetingPoint = result.data.routeData.startLocation;
              const finalDestination = result.data.routeData.destinationLocation;
              
              if (!meetingPoint || !meetingPoint.latitude || !meetingPoint.longitude) {
                throw new Error('Meeting point (sender start location) not available');
              }
              
              console.log('🎯 [MEETING POINT ROUTE] Meeting point:', meetingPoint);
              console.log('🏁 [MEETING POINT ROUTE] Final destination:', finalDestination);
              
              // Calculate route from receiver to meeting point
              const routeToMeetingPoint = await calculateReceiverRoute(
                currentLocation,
                meetingPoint,
                'walking'
              );
              
              console.log('✅ [MEETING POINT ROUTE] Route to meeting point calculated successfully');
              
              // Update parent map with receiver's route to meeting point
              onRouteUpdate({
                receiverRoute: routeToMeetingPoint,
                routeType: 'to-meeting-point',
                meetingPoint: {
                  coordinates: meetingPoint,
                  address: meetingPoint.address || 'Meeting Point',
                },
                finalDestination: {
                  coordinates: finalDestination,
                  address: finalDestination?.address || 'Final Destination',
                },
                companion: result.data.routeData?.senderName || 'Companion',
                mapRegion: getMapRegion([
                  currentLocation,
                  meetingPoint
                ])
              });
              
              // Show success message with meeting point info
              const companionName = result.data.routeData?.senderName || 'your companion';
              const meetingAddress = meetingPoint.address || 'the meeting point';
              
              Alert.alert(
                "🎉 Match Found!", 
                `Route calculated! Navigate to ${meetingAddress} to meet ${companionName}, then travel together to your destination.`,
                [{ text: "Let's go!" }]
              );
              
            } catch (routeError) {
              console.error('❌ [DEBUG] Route calculation failed with error:', routeError);
              console.error('❌ [DEBUG] Route error message:', routeError.message);
              console.error('❌ [DEBUG] Route error stack:', routeError.stack);
              
              Alert.alert(
                "✅ Match Successful!", 
                "Your match was successful! Please coordinate with your companion to meet up.",
                [{ text: "OK" }]
              );
            }
          } else {
            console.warn('⚠️ [SIMPLE ROUTE] Missing data for route calculation:', {
              hasCurrentLocation: !!currentLocation,
              hasSenderLocation: !!result.data.senderCurrentLocation,
              hasOnRouteUpdate: !!onRouteUpdate
            });
            
            // Still show success even without route calculation
            Alert.alert(
              "✅ Match Successful!", 
              "You've been matched with a companion! Please coordinate to meet up.",
              [{ text: "Great!" }]
            );
          }

          Alert.alert(
            "🎉 Match Found!", 
            "You've successfully joined this trip! Your route to the destination has been calculated and displayed on the map.",
            [
              { 
                text: "View Route", 
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
        
        console.log('🔥 [DEBUG] Refreshing requests list...');
        // Refresh the list to remove the responded request
        await fetchPendingRequests();
        console.log('✅ [DEBUG] Requests refreshed successfully');
      } else {
        console.error('❌ [DEBUG] API returned error status:', result.status);
        console.error('❌ [DEBUG] Error message:', result.message);
        throw new Error(result.message || "Failed to respond to request");
      }
    } catch (error) {
      console.error('💥 [DEBUG] === CRITICAL ERROR IN HANDLE RESPONSE ===');
      console.error('💥 [DEBUG] Error type:', error.constructor.name);
      console.error('💥 [DEBUG] Error message:', error.message);
      console.error('💥 [DEBUG] Error stack:', error.stack);
      console.error('💥 [DEBUG] Full error object:', error);
      
      Alert.alert("Error", error.message || "Failed to respond to request");
    } finally {
      console.log('🔥 [DEBUG] Cleaning up - setting respondingTo to null');
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
  routeInfo: {
    backgroundColor: Colors.light.tint + "10",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.light.tint,
  },
  routeTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.tint,
    marginBottom: 6,
  },
  routeDetail: {
    fontSize: 12,
    color: Colors.light.text,
    marginBottom: 2,
    opacity: 0.8,
  },
  routeHelp: {
    fontSize: 11,
    color: Colors.light.tabIconDefault,
    fontStyle: 'italic',
    marginTop: 6,
    opacity: 0.7,
  },
  meetingInfo: {
    backgroundColor: "#28a745" + "10",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#28a745",
  },
  meetingTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#28a745",
    marginBottom: 4,
  },
  meetingDetail: {
    fontSize: 12,
    color: Colors.light.text,
    opacity: 0.8,
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