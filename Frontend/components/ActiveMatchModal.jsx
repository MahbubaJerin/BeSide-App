// Frontend/components/ActiveMatchModal.jsx
import React, { useState, useRef, useEffect } from "react";
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert,
  Animated,
  Dimensions,
  Animated,
  Dimensions,
} from "react-native";
import { ThemedButton } from "@/components/ThemedButton";
import { ThemedText } from "@/components/ThemedText";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../config";
import NavigationModal from "./NavigationModal";
import TripMessagingModal from "./TripMessagingModal";

const { width } = Dimensions.get('window');

export default function ActiveMatchModal({
  visible,
  onClose,
  matches = [],
  isLoading = false,
  onRefresh,
  onUpdateStatus,
  currentUserId,
  arrivalStatus, // Add arrival status prop
  onBothArrived, // NEW: Callback when both users arrive
}) {
  const [navigationModalVisible, setNavigationModalVisible] = useState(false);
  const [messagingModalVisible, setMessagingModalVisible] = useState(false);
  const [messagingModalVisible, setMessagingModalVisible] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [cachedMatches, setCachedMatches] = useState([]);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Cache matches to preserve them when child modals open
  useEffect(() => {
    if (matches && matches.length > 0) {
      console.log(`📋 [ACTIVE MATCH MODAL] Caching ${matches.length} matches`);
      setCachedMatches(matches);
    } else if (matches && matches.length === 0) {
      // Clear cache when matches array is explicitly empty (after refresh)
      console.log(`🗑️ [ACTIVE MATCH MODAL] Clearing cached matches - refresh detected`);
      setCachedMatches([]);
    }
  }, [matches]);

  // Use cached matches if current matches is empty but we have cached data
  const displayMatches = (matches && matches.length > 0) ? matches : cachedMatches;
  
  // Debug log
  useEffect(() => {
    console.log(`🔍 [ACTIVE MATCH MODAL] visible=${visible}, matches=${matches?.length || 0}, cached=${cachedMatches.length}, display=${displayMatches.length}`);
  }, [visible, matches, cachedMatches, displayMatches]);

  // Animate on mount
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      // Pulse animation for stats
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      scaleAnim.setValue(0.95);
    }
  }, [visible]);

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "#4CAF50";
      case "in-progress":
        return "#FF9800";
      case "completed":
        return "#2196F3";
      case "cancelled":
        return "#F44336";
      default:
        return Colors.light.tabIconDefault;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "active":
        return "checkmark-circle";
      case "in-progress":
        return "play-circle";
      case "completed":
        return "checkmark-done-circle";
      case "cancelled":
        return "close-circle";
      default:
        return "help-circle";
    }
  };

  const handleStartTrip = async (match) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("No authentication token");

      const response = await fetch(
        `${BASE_URL.replace(/\/+$/, "")}/api/trip/match/${match.matchId}/start-sharing`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();
      if (result.status === "success") {
        Alert.alert("Trip Started", "Live location sharing is now active!");
        if (onRefresh) onRefresh();
      } else {
        throw new Error(result.message || "Failed to start trip");
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to start trip");
    }
  };

  const handleCancelMatch = async (matchId) => {
    Alert.alert(
      "Cancel Trip",
      "Are you sure you want to cancel this trip? Your companion will be notified.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("token");
              if (!token) {
                Alert.alert("Error", "You must be logged in");
                return;
              }

              console.log(`🚫 [CANCEL] Cancelling match: ${matchId}`);
              
              const response = await fetch(
                `${BASE_URL}api/v1/trip/match/${matchId}/cancel`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    reason: "User cancelled the trip",
                  }),
                }
              );

              const result = await response.json();
              
              if (result.status === "success") {
                console.log("✅ [CANCEL] Trip cancelled successfully");
                
                // Refresh immediately after successful cancellation
                if (onRefresh) {
                  console.log("🔄 [CANCEL] Refreshing active matches...");
                  onRefresh();
                }
                
                Alert.alert(
                  "Trip Cancelled",
                  "The trip has been cancelled. Your companion has been notified.",
                  [{ text: "OK" }]
                );
              } else {
                throw new Error(result.message || "Failed to cancel trip");
              }
            } catch (error) {
              console.error("❌ [CANCEL] Error:", error);
              Alert.alert("Error", error.message || "Failed to cancel trip");
            }
          },
        },
      ]
    );
  };

  const getUserRole = (match) => {
    if (!match || !currentUserId) return "companion";
    return match.organizer.userId === currentUserId ? "organizer" : "companion";
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim }
              ]
            }
          ]}
        >
          {/* Purple Gradient Header */}
          <View style={styles.modernHeader}>
            <View style={styles.headerGradient}>
              <View style={styles.headerContent}>
                <View style={styles.headerLeft}>
                  <View style={styles.headerIconContainer}>
                    <Ionicons name="car-sport" size={28} color="white" />
                  </View>
                  <View>
                    <Text style={styles.headerTitle}>Active Trips</Text>
                    <Text style={styles.headerSubtitle}>Your ongoing journeys</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
              </View>

              <View style={styles.statsRow}>
                <Animated.View 
                  style={[
                    styles.statCard,
                    { transform: [{ scale: pulseAnim }] }
                  ]}
                >
                  <View style={styles.statIconCircle}>
                    <Ionicons name="map" size={20} color="#8B5CF6" />
                  </View>
                  <Text style={styles.statNumber}>{displayMatches.length}</Text>
                  <Text style={styles.statLabel}>
                    Active {displayMatches.length === 1 ? "Trip" : "Trips"}
                  </Text>
                </Animated.View>
                
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={onRefresh}
                  disabled={isLoading}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name="refresh" 
                    size={18} 
                    color="white" 
                    style={isLoading && { transform: [{ rotate: '360deg' }] }}
                  />
                  <Text style={styles.refreshButtonText}>
                    {isLoading ? "Refreshing..." : "Refresh"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Trip List */}
          <ScrollView
            style={styles.matchesList}
            refreshControl={
              <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
          >
            {displayMatches.length === 0 ? (
              <View style={styles.emptyContainer}>
                <ThemedText style={styles.emptyIcon}>🗺️</ThemedText>
                <ThemedText style={styles.emptyText}>No active trips</ThemedText>
                <ThemedText style={styles.emptySubtext}>
                  When you match with someone for a trip, it will appear here.
                </ThemedText>
              </View>
            ) : (
              displayMatches.map((match) => {
                const userRole = getUserRole(match);
                const isOrganizer = userRole === "organizer";
                const otherUser = isOrganizer
                  ? match.companion
                  : match.organizer;

                return (
                  <View key={match.matchId} style={styles.matchCard}>
                    {/* Header */}
                    <View style={styles.matchHeader}>
                      <View style={styles.matchInfo}>
                        <ThemedText style={styles.matchTitle}>
                          Trip to {match.tripDetails?.destination || "Unknown"}
                        </ThemedText>
                        <View style={styles.statusContainer}>
                          <Ionicons
                            name={getStatusIcon(match.status)}
                            size={16}
                            color={getStatusColor(match.status)}
                          />
                          <ThemedText
                            style={[
                              styles.statusText,
                              { color: getStatusColor(match.status) },
                            ]}
                          >
                            {match.status.toUpperCase()}
                          </ThemedText>
                        </View>
                      </View>
                      <View style={styles.roleBadge}>
                        <ThemedText style={styles.roleText}>
                          {userRole.charAt(0).toUpperCase() +
                            userRole.slice(1)}
                        </ThemedText>
                      </View>
                    </View>

                    {/* Companion Info */}
                    <View style={styles.companionCard}>
                      <View style={styles.companionHeader}>
                        <Image
                          source={{
                            uri:
                              otherUser.userImage &&
                              otherUser.userImage !== "default.jpg"
                                ? otherUser.userImage
                                : "https://via.placeholder.com/80?text=No+Photo",
                          }}
                          style={styles.companionPhoto}
                        />
                        <View style={styles.companionInfo}>
                          <Text style={styles.companionName}>
                            {otherUser.userName}
                          </Text>
                          <Text style={styles.companionRole}>
                            {isOrganizer
                              ? "🤝 Your Companion"
                              : "💼 Trip Organizer"}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Meeting Point Section */}
                    <View style={styles.meetingPointCard}>
                      <View style={styles.meetingPointHeader}>
                        <View style={styles.meetingPointIcon}>
                          <Text style={styles.meetingIconText}>📍</Text>
                        </View>
                        <View style={styles.meetingPointContent}>
                          <Text style={styles.meetingPointTitle}>
                            Meeting Point
                          </Text>

                          {match.meetingPoint ? (
                            <>
                              <Text style={styles.meetingPointLocation}>
                                {match.meetingPoint.name || "Unnamed location"}
                              </Text>
                              <Text style={styles.meetingPointSubtext}>
                                {match.meetingPoint.description ||
                                  "Tap navigate to view route"}
                              </Text>
                            </>
                          ) : (
                            <Text style={styles.meetingPointSubtext}>
                              No meeting point set yet.
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>

                    {/* Action Buttons - Three buttons */}
                    <View style={styles.actionButtonsContainer}>
                      <View style={styles.buttonRow}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.navigationButton]}
                          onPress={() => {
                            setSelectedMatch(match);
                            setNavigationModalVisible(true);
                          }}
                          disabled={!match.meetingPoint}
                        >
                          <Ionicons name="navigate-outline" size={16} color="#fff" />
                          <Text style={styles.actionButtonText}>Navigate</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionButton, styles.messageButton]}
                          onPress={() => {
                            setSelectedMatch(match);
                            setMessagingModalVisible(true);
                          }}
                        >
                          <Ionicons name="chatbubble-outline" size={16} color="#fff" />
                          <Text style={styles.actionButtonText}>Message</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionButton, styles.cancelButton]}
                          onPress={() => handleCancelMatch(match.matchId)}
                        >
                          <Ionicons name="close-circle-outline" size={16} color="#fff" />
                          <Text style={styles.actionButtonText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <ThemedText style={styles.footerText}>
              ℹ️ Trip status updates automatically. Pull to refresh for latest
              information.
            </ThemedText>
            <ThemedButton
              title="Close"
              onPress={onClose}
              style={styles.closeButtonBottom}
            />
          </View>

          {/* Navigation Modal */}
          {selectedMatch && (
            <NavigationModal
              visible={navigationModalVisible}
              onClose={() => setNavigationModalVisible(false)}
              tripMatch={selectedMatch}
              userRole={getUserRole(selectedMatch)}
              arrivalStatus={arrivalStatus} // Pass arrival status
              onBothArrived={onBothArrived} // Pass both arrived callback
            />
          )}

          {/* Messaging Modal */}
          {selectedMatch && (
            <TripMessagingModal
              visible={messagingModalVisible}
              onClose={() => setMessagingModalVisible(false)}
              tripMatch={selectedMatch}
              currentUserId={currentUserId}
            />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(139, 92, 246, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    backgroundColor: "#fff",
    borderRadius: 24,
    width: "100%",
    maxWidth: 420,
    maxHeight: "90%",
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  modernHeader: {
    backgroundColor: "#8B5CF6",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerGradient: {
    padding: 24,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  headerLeft: { 
    flexDirection: "row", 
    alignItems: "center",
    flex: 1,
  },
  headerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTitle: { 
    fontSize: 24, 
    fontWeight: "700", 
    color: "white",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: { 
    fontSize: 32, 
    fontWeight: "700", 
    color: "#8B5CF6",
    marginBottom: 4,
  },
  statLabel: { 
    fontSize: 12, 
    color: "#6B7280",
    fontWeight: '600',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  refreshButtonText: { 
    color: "white", 
    fontWeight: "600",
    fontSize: 14,
  },
  matchesList: { paddingHorizontal: 20 },
  emptyContainer: { alignItems: "center", padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  emptySubtext: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
    textAlign: "center",
  },
  matchCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#E9D5FF",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  matchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  matchTitle: { fontSize: 16, fontWeight: "600" },
  statusContainer: { flexDirection: "row", alignItems: "center" },
  statusText: { fontSize: 12, fontWeight: "bold", marginLeft: 4 },
  roleBadge: {
    backgroundColor: "#E8F5E8",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: { fontSize: 10, fontWeight: "bold", color: "#2E7D32" },
  companionCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  companionHeader: { flexDirection: "row", alignItems: "center" },
  companionPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
    borderWidth: 3,
    borderColor: "#8B5CF6",
  },
  companionName: { fontSize: 16, fontWeight: "700", color: "#1f2937" },
  companionRole: {
    fontSize: 13,
    color: "#8B5CF6",
    fontWeight: "600",
    marginBottom: 2,
  },
  meetingPointCard: {
    backgroundColor: "#F3E8FF",
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  meetingPointHeader: { flexDirection: "row", alignItems: "flex-start" },
  meetingPointIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#8B5CF6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  meetingIconText: { fontSize: 20 },
  meetingPointContent: { flex: 1 },
  meetingPointTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6B21A8",
    marginBottom: 4,
  },
  meetingPointLocation: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8B5CF6",
    marginBottom: 6,
  },
  meetingPointSubtext: { fontSize: 12, color: "#6b7280", lineHeight: 16 },
  
  // Action Buttons - Simplified
  actionButtonsContainer: {
    marginTop: 12,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8B5CF6",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 6,
    elevation: 3,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  navigationButton: {
    backgroundColor: "#10B981",
    shadowColor: "#10B981",
  },
  messageButton: {
    backgroundColor: "#C77DFF",
    shadowColor: "#C77DFF",
  },
  cancelButton: {
    backgroundColor: "#EF4444",
    shadowColor: "#EF4444",
  },
  
  navigateButton: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#8B5CF6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  navigateButtonText: { color: "white", fontSize: 12, fontWeight: "600" },
  startTripButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  startTripButtonText: { color: "white", fontSize: 14, fontWeight: "600" },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: "#E9D5FF",
    backgroundColor: "#F9FAFB",
  },
  footerText: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 18,
  },
  closeButtonBottom: { 
    backgroundColor: "#8B5CF6",
    borderRadius: 12,
  },
});