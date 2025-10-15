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
      {/* Header with curved background similar to appointment card */}
      <View style={styles.curvedHeader}>
        <View style={styles.headerContent}>
          <View style={styles.headerTopRow}>
            <Text style={styles.headerTitle}>🚶 Companion Request</Text>
            <View style={styles.urgencyBadgeHeader}>
              <Text style={styles.urgencyTextHeader}>•</Text>
            </View>
          </View>
          
          <View style={styles.dateTimeHeader}>
            <Text style={styles.dateTextHeader}>
              {new Date(request.date).toLocaleDateString('en-US', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric' 
              })}
            </Text>
            <Text style={styles.timeTextHeader}>
              {formatTimeRemaining(request.expiresAt)}
            </Text>
          </View>
        </View>
        
        {/* Sender photo positioned like in appointment card */}
        <View style={styles.photoContainer}>
          {request.photo?.url ? (
            <Image 
              source={{ uri: request.photo.url }}
              style={styles.senderPhotoCard}
              onError={() => console.log('Error loading sender photo')}
            />
          ) : (
            <View style={styles.senderPhotoPlaceholderCard}>
              <Text style={styles.senderPhotoTextCard}>
                {request.user.userName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        
        {/* Phone icon like in appointment card */}
        <View style={styles.phoneIconContainer}>
          <View style={styles.phoneIcon}>
            <Text style={styles.phoneIconText}>📱</Text>
          </View>
        </View>
      </View>

      {/* White content section */}
      <View style={styles.whiteSection}>
        <View style={styles.senderInfo}>
          <Text style={styles.senderName}>{request.user.userName}</Text>
          <Text style={styles.senderLabel}>Sender</Text>
        </View>

        <View style={styles.messageSection}>
          <Text style={styles.messageLabel}>Message</Text>
          <Text style={styles.messageText}>
            Hi! I'm looking for a travel companion to {request.destination}. 
            {request.destinationType !== "By Walk" ? ` We'll be going ${request.destinationType.toLowerCase()}.` : ' Let\'s walk together!'}
            {request.genderPreference !== "any" ? ` I prefer traveling with ${request.genderPreference} companions.` : ''}
          </Text>
        </View>

        <View style={styles.tripSummary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryIcon}>📍</Text>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabel}>Destination</Text>
              <Text style={styles.summaryValue}>{request.destination}</Text>
            </View>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryIcon}>�</Text>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabel}>Transport</Text>
              <Text style={styles.summaryValue}>{request.destinationType}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.actionButtonsCard}>
        <TouchableOpacity
          style={[styles.actionButtonCard, styles.acceptButtonCard, respondingTo === request.tripReqId && styles.disabledButton]}
          onPress={() => {
            console.log('🚨 [DEBUG] Accept button pressed for request:', request.tripReqId);
            console.log('🚨 [DEBUG] Button is disabled?', respondingTo === request.tripReqId);
            onResponse(request.tripReqId, "accepted");
          }}
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
  const [isClosing, setIsClosing] = useState(false);

  const { 
    calculateReceiverRoute, 
    getMapRegion, 
    calculating, 
    openGoogleMapsNavigation, 
    getNavigationInstructions 
  } = useRouteCalculation();

  const safeClose = () => {
    setIsClosing(false);
    setRespondingTo(null);
    onClose();
  };

  useEffect(() => {
    if (visible) {
      setIsClosing(false);
      setRespondingTo(null);
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
      
      // Handle non-JSON error responses (like 429 Too Many Requests)
      let result;
      try {
        const responseText = await apiResponse.text();
        console.log('🔥 [DEBUG] Raw response text:', responseText);
        
        // Try to parse as JSON
        result = JSON.parse(responseText);
        console.log('🔥 [DEBUG] Parsed JSON result:', JSON.stringify(result, null, 2));
      } catch (parseError) {
        console.error('💥 [DEBUG] Failed to parse response as JSON:', parseError.message);
        
        // Handle specific HTTP status codes without JSON
        if (apiResponse.status === 429) {
          console.error("❌ Too many requests - rate limited");
          Alert.alert("Too Many Requests", "Please wait a moment before trying again. The server is busy.");
          return;
        } else if (apiResponse.status === 500) {
          console.error("❌ Server error");
          Alert.alert("Server Error", "There was an issue with the server. Please try again later.");
          return;
        } else {
          console.error("❌ Non-JSON error response");
          Alert.alert("Connection Error", "Unable to process your request. Please check your connection and try again.");
          return;
        }
      }
      
      if (!apiResponse.ok) {
        // Handle specific error cases with JSON responses
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
        throw new Error(result?.message || "Failed to respond to request");
      }

      if (result.status === "success") {
        if (response === "accepted") {
          safeClose();
          
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
          
          console.log('🔥 [DEBUG] Processing ACCEPTED response...');
          console.log('🔥 [DEBUG] Has currentLocation:', !!currentLocation);
          console.log('🔥 [DEBUG] Has senderCurrentLocation:', !!result.data.senderCurrentLocation);
          console.log('🔥 [DEBUG] Has onRouteUpdate callback:', !!onRouteUpdate);
          
          // CORRECTED FLOW: Route to meeting point (sender's start location)
          if (currentLocation && result.data.routeData && onRouteUpdate) {
            // Start route calculation asynchronously (don't block modal closing)
            setTimeout(async () => {
            try {
              console.log('🚀 [MEETING POINT ROUTE] Starting meeting point route calculation...');
              console.log('📍 [MEETING POINT ROUTE] Receiver location:', currentLocation);
              console.log('📍 [MEETING POINT ROUTE] Route data:', result.data.routeData);
              
              // Meeting point is automatically set from sender's starting location
              const tripRequest = result.data.tripRequest;
              let meetingPoint = tripRequest.meetingPoint;
              const finalDestination = tripRequest.destinationLocation;
              
              console.log('🔍 [DEBUG] Trip request data:', JSON.stringify(tripRequest, null, 2));
              console.log('🔍 [DEBUG] Meeting point from trip:', meetingPoint);
              
              if (!meetingPoint || !meetingPoint.latitude || !meetingPoint.longitude) {
                console.log('❌ [DEBUG] Meeting point validation failed:', {
                  hasMeetingPoint: !!meetingPoint,
                  hasLat: meetingPoint?.latitude,
                  hasLng: meetingPoint?.longitude,
                  fullTripRequest: tripRequest
                });
                
                // Try fallback to startingLocation if meetingPoint is not set
                const startingLocation = tripRequest.startingLocation;
                if (startingLocation && startingLocation.latitude && startingLocation.longitude) {
                  console.log('🔄 [DEBUG] Using startingLocation as fallback:', startingLocation);
                  meetingPoint = startingLocation;
                } else {
                  console.log('❌ [DEBUG] No valid starting location either:', startingLocation);
                  throw new Error('Meeting point (sender start location) not available');
                }
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
              
              // Show success message with navigation options
              const companionName = result.data.routeData?.senderName || 'your companion';
              const meetingAddress = meetingPoint.address || 'the meeting point';
              
              Alert.alert(
                "🎉 Match Found!", 
                `Route calculated! Distance: ${routeToMeetingPoint.distance}, Duration: ${routeToMeetingPoint.duration}\n\nNavigate to ${meetingAddress} to meet ${companionName}.`,
                [
                  { 
                    text: "View Route", 
                    style: "default",
                    onPress: () => {
                      console.log('📱 [NAVIGATION] User chose to view route in-app');
                      // Route is already displayed on map via onRouteUpdate
                    }
                  },
                  { 
                    text: "Open Maps", 
                    style: "default",
                    onPress: () => {
                      try {
                        console.log('🗺️ [NAVIGATION] Opening Google Maps navigation');
                        openGoogleMapsNavigation(meetingPoint, currentLocation, 'walking');
                      } catch (error) {
                        Alert.alert('Navigation Error', 'Could not open navigation app. Please ensure Google Maps is installed.');
                      }
                    }
                  },
                  { 
                    text: "Got it!", 
                    style: "default"
                  }
                ]
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
            }, 100); // End setTimeout - run route calculation async
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
              [{ 
                text: "Great!"
              }]
            );
          }


        } else if (response === "declined") {
          // Close modal immediately for better UX
          safeClose();
          
          Alert.alert(
            "Request Declined ❌", 
            "You have declined the companion request. The sender will be notified.",
            [{ text: "OK" }]
          );
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
      
      // Close modal even on error to prevent freeze
      safeClose();
      
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
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1}
        onPress={safeClose}
      >
        <TouchableOpacity 
          style={styles.container}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <ThemedText type="subtitle">🔔 Trip Requests</ThemedText>
            <TouchableOpacity onPress={safeClose} style={styles.closeButton}>
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
                  New companion requests from nearby users will appear here.
                </ThemedText>
                <ThemedText style={[styles.emptySubtext, {marginTop: 16, color: '#888', fontSize: 12}]}>
                  💡 Tip: The Accept/Decline buttons will appear when there are active requests to respond to.
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
            onPress={safeClose}
            style={styles.closeButtonBottom}
          />
        </TouchableOpacity>
      </TouchableOpacity>
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
    backgroundColor: "#F8F9FA",
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
    paddingHorizontal: 20,
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
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    overflow: 'hidden',
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
  // Appointment card style design
  curvedHeader: {
    backgroundColor: "#6C5CE7",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 60,
    position: "relative",
  },
  headerContent: {
    paddingHorizontal: 20,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  urgencyBadgeHeader: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF6B6B",
  },
  urgencyTextHeader: {
    color: "#FF6B6B",
    fontSize: 20,
    textAlign: "center",
  },
  dateTimeHeader: {
    alignItems: "center",
  },
  dateTextHeader: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  timeTextHeader: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    fontWeight: "500",
  },
  photoContainer: {
    position: "absolute",
    bottom: -35,
    left: 20,
    zIndex: 10,
    elevation: 10,
  },
  senderPhotoCard: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  senderPhotoPlaceholderCard: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  senderPhotoTextCard: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 20,
  },
  phoneIconContainer: {
    position: "absolute",
    bottom: -25,
    right: 20,
    zIndex: 10,
    elevation: 10,
  },
  phoneIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#00BCD4",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  phoneIconText: {
    fontSize: 20,
  },
  whiteSection: {
    backgroundColor: "#fff",
    paddingTop: 45,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  senderInfo: {
    marginBottom: 20,
  },
  senderName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2C3E50",
    marginBottom: 4,
  },
  senderLabel: {
    fontSize: 14,
    color: "#7F8C8D",
  },
  messageSection: {
    marginBottom: 20,
  },
  messageLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2C3E50",
    marginBottom: 8,
  },
  messageText: {
    fontSize: 14,
    color: "#7F8C8D",
    lineHeight: 20,
  },
  tripSummary: {
    marginBottom: 20,
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryIcon: {
    fontSize: 16,
    marginRight: 12,
    width: 20,
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#7F8C8D",
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#2C3E50",
  },
  actionButtonsCard: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  actionButtonCard: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: "center",
  },
  acceptButtonCard: {
    backgroundColor: "#6C5CE7",
  },
  declineButtonCard: {
    backgroundColor: "#E8E8E8",
  },
  disabledButton: {
    opacity: 0.6,
  },
  acceptButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  declineButtonText: {
    color: "#7F8C8D",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
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
  urgencyBadgeTop: {
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    position: "absolute",
    top: 0,
    right: 16,
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