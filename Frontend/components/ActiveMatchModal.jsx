// Frontend/components/ActiveMatchModal.jsx
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
  Image,
} from "react-native";
import { ThemedButton } from "@/components/ThemedButton";
import { ThemedText } from "@/components/ThemedText";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import LiveTripModal from "./LiveTripModal";
import NavigationModal from "./NavigationModal";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config';

export default function ActiveMatchModal({
  visible,
  onClose,
  matches = [],
  isLoading = false,
  onRefresh,
  onUpdateStatus,
  onViewDetails,
  onSetMeetingPoint,
  currentLocation,
  currentUserId,
}) {
  const [liveTripModalVisible, setLiveTripModalVisible] = useState(false);
  const [navigationModalVisible, setNavigationModalVisible] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " at " + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#4CAF50';
      case 'in-progress': return '#FF9800';
      case 'completed': return '#2196F3';
      case 'cancelled': return '#F44336';
      default: return Colors.light.tabIconDefault;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return 'checkmark-circle';
      case 'in-progress': return 'play-circle';
      case 'completed': return 'checkmark-done-circle';
      case 'cancelled': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const handleStatusUpdate = async (match, newStatus) => {
    const statusMessages = {
      'in-progress': 'Start this trip and enable live location sharing?',
      'completed': 'Mark this trip as completed?',
      'cancelled': 'Cancel this trip?'
    };

    Alert.alert(
      "Update Trip Status",
      statusMessages[newStatus],
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            try {
              if (newStatus === 'in-progress') {
                // For starting trip, call the specialized start location sharing endpoint
                await handleStartTrip(match);
              } else {
                // For other status changes, use the regular status update
                await onUpdateStatus(match.matchId, newStatus);
                Alert.alert("Success", `Trip ${newStatus} successfully!`);
              }
            } catch (error) {
              Alert.alert("Error", error.message || "Failed to update trip status");
            }
          }
        }
      ]
    );
  };

  const handleStartTrip = async (match) => {
    try {
      // Call the start location sharing endpoint which also updates status to in-progress
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`${BASE_URL.replace(/\/+$/, '')}/api/trip/match/${match.matchId}/start-sharing`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      if (result.status === 'success') {
        Alert.alert("Trip Started! 🚀", "Live location sharing is now active. You can track each other's real-time location.");
        // Refresh the matches to show updated status
        if (onRefresh) onRefresh();
      } else {
        throw new Error(result.message || 'Failed to start trip');
      }
    } catch (error) {
      throw error;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Modern Purple Header */}
          <View style={styles.modernHeader}>
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <Text style={styles.headerIcon}>🚗</Text>
                <Text style={styles.headerTitle}>Active Trips</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{matches.length}</Text>
                <Text style={styles.statLabel}>Active {matches.length === 1 ? 'Trip' : 'Trips'}</Text>
              </View>
              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={onRefresh}
                disabled={isLoading}
              >
                <Text style={styles.refreshButtonText}>
                  {isLoading ? "🔄 Refreshing..." : "🔄 Refresh"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.matchesList}
            refreshControl={
              <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
          >
            {matches.length === 0 ? (
              <View style={styles.emptyContainer}>
                <ThemedText style={styles.emptyIcon}>🗺️</ThemedText>
                <ThemedText style={styles.emptyText}>
                  No active trips
                </ThemedText>
                <ThemedText style={styles.emptySubtext}>
                  When you match with someone for a trip, it will appear here. You can track your journey and communicate with your companion.
                </ThemedText>
              </View>
            ) : (
              matches.map((match) => {
                // Safety checks
                if (!match?.organizer?.userId || !match?.companion?.userId || !currentUserId) {
                  return null;
                }
                
                // Determine if current user is organizer or companion
                const isOrganizer = match.organizer.userId === currentUserId;
                const otherUser = isOrganizer ? match.companion : match.organizer;
                const myRole = isOrganizer ? 'Organizer' : 'Companion';

                return (
                  <View key={match.matchId} style={styles.matchCard}>
                    <View style={styles.matchHeader}>
                      <View style={styles.matchInfo}>
                        <ThemedText style={styles.matchTitle}>
                          Trip to {match.tripDetails?.destination || 'Unknown destination'}
                        </ThemedText>
                        <View style={styles.statusContainer}>
                          <Ionicons 
                            name={getStatusIcon(match.status)} 
                            size={16} 
                            color={getStatusColor(match.status)} 
                          />
                          <ThemedText style={[styles.statusText, { color: getStatusColor(match.status) }]}>
                            {match.status.toUpperCase()}
                          </ThemedText>
                        </View>
                      </View>
                      <View style={styles.roleBadge}>
                        <ThemedText style={styles.roleText}>{myRole}</ThemedText>
                      </View>
                    </View>

                    {/* Companion Info Card */}
                    <View style={styles.companionCard}>
                      <View style={styles.companionHeader}>
                        <Image 
                          source={{ uri: otherUser.userImage && otherUser.userImage !== 'default.jpg' 
                            ? otherUser.userImage 
                            : 'https://via.placeholder.com/80?text=No+Photo' 
                          }} 
                          style={styles.companionPhoto}
                        />
                        <View style={styles.companionInfo}>
                          <Text style={styles.companionName}>{otherUser.userName}</Text>
                          <Text style={styles.companionRole}>{myRole === 'Organizer' ? '🤝 Your Companion' : '💼 Trip Organizer'}</Text>
                          {otherUser.joinedAt && (
                            <Text style={styles.companionJoined}>
                              Joined: {formatTimeAgo(otherUser.joinedAt)}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>

                    <View style={styles.matchDetails}>
                      <View style={styles.detailRow}>
                        <Ionicons name="location-outline" size={16} color={Colors.light.tabIconDefault} />
                        <ThemedText style={styles.detailText}>
                          {match.tripDetails?.destination || 'Unknown'} • {match.tripDetails?.destinationType || 'Unknown type'}
                        </ThemedText>
                      </View>

                      <View style={styles.detailRow}>
                        <Ionicons name="time-outline" size={16} color={Colors.light.tabIconDefault} />
                        <ThemedText style={styles.detailText}>
                          Planned: {match.tripDetails?.plannedDate ? formatDate(match.tripDetails.plannedDate) : 'Not set'}
                        </ThemedText>
                      </View>

                      <View style={styles.detailRow}>
                        <Ionicons name="calendar-outline" size={16} color={Colors.light.tabIconDefault} />
                        <ThemedText style={styles.detailText}>
                          Matched: {formatTimeAgo(match.createdAt)}
                        </ThemedText>
                      </View>
                    </View>

                    {/* Modern Meeting Point Section */}
                    <View style={styles.meetingPointCard}>
                      <View style={styles.meetingPointHeader}>
                        <View style={styles.meetingPointIcon}>
                          <Text style={styles.meetingIconText}>📍</Text>
                        </View>
                        <View style={styles.meetingPointContent}>
                          <Text style={styles.meetingPointTitle}>Meeting Point</Text>
                          <Text style={styles.meetingPointLocation}>
                            {myRole === 'Organizer' ? 'Your starting location' : `${match.organizer.userName}'s starting location`}
                          </Text>
                          <Text style={styles.meetingPointSubtext}>
                            {myRole === 'Organizer' 
                              ? '💼 Wait here for your companion to arrive' 
                              : '🚶‍♂️ Navigate to this location to meet up'}
                          </Text>
                        </View>
                      </View>
                      
                      {myRole === 'Companion' && (
                        <TouchableOpacity 
                          style={styles.navigateButton}
                          onPress={() => {
                            setSelectedMatch(match);
                            setNavigationModalVisible(true);
                          }}
                        >
                          <Text style={styles.navigateButtonText}>🧭 Navigate</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    <View style={styles.actionButtons}>
                      <ThemedButton
                        title="📱 View Details"
                        onPress={() => onViewDetails(match)}
                        style={[styles.actionButton, styles.detailsButton]}
                      />

                      {match.status === 'active' && (
                        <ThemedButton
                          title="▶️ Start Trip"
                          onPress={() => handleStatusUpdate(match, 'in-progress')}
                          style={[styles.actionButton, styles.startButton]}
                        />
                      )}
                      
                      {match.status === 'active' && (
                        <ThemedButton
                          title="🗺️ View Route & Navigate"
                          onPress={() => {
                            setSelectedMatch(match);
                            setNavigationModalVisible(true);
                          }}
                          style={[styles.actionButton, styles.navigationButton]}
                        />
                      )}

                      {match.status === 'in-progress' && (
                        <>
                          <ThemedButton
                            title="🗺️ Live Tracking"
                            onPress={() => {
                              setSelectedMatch(match);
                              setLiveTripModalVisible(true);
                            }}
                            style={[styles.actionButton, styles.liveTrackingButton]}
                          />
                          <ThemedButton
                            title="🧭 Navigation"
                            onPress={() => {
                              setSelectedMatch(match);
                              setNavigationModalVisible(true);
                            }}
                            style={[styles.actionButton, styles.navigationButton]}
                          />
                          <ThemedButton
                            title="✅ Complete"
                            onPress={() => handleStatusUpdate(match, 'completed')}
                            style={[styles.actionButton, styles.completeButton]}
                          />
                        </>
                      )}
                      
                      {['active', 'in-progress'].includes(match.status) && (
                        <ThemedButton
                          title="❌ Cancel"
                          onPress={() => handleStatusUpdate(match, 'cancelled')}
                          style={[styles.actionButton, styles.cancelButton]}
                        />
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          <View style={styles.footer}>
            <ThemedText style={styles.footerText}>
              ℹ️ Trip status updates automatically. Pull to refresh for latest information.
            </ThemedText>
            <ThemedButton
              title="Close"
              onPress={onClose}
              style={styles.closeButtonBottom}
            />
          </View>
        </View>
      </View>

      {/* Live Trip Modal */}
      <LiveTripModal
        visible={liveTripModalVisible}
        onClose={() => {
          setLiveTripModalVisible(false);
          setSelectedMatch(null);
        }}
        match={selectedMatch}
        currentUserId={currentUserId}
        onUpdateTripStatus={onUpdateStatus}
      />

      {/* Navigation Modal */}
      <NavigationModal
        visible={navigationModalVisible}
        onClose={() => {
          setNavigationModalVisible(false);
          setSelectedMatch(null);
        }}
        tripMatch={selectedMatch}
        userRole={selectedMatch?.organizer?.userId === currentUserId ? 'organizer' : 'companion'}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: "100%",
    maxWidth: 400,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  
  // Modern Purple Header
  modernHeader: {
    backgroundColor: "#8B5CF6",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "white",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statItem: {
    alignItems: "flex-start",
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "700",
    color: "white",
  },
  statLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
  refreshButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  refreshButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
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
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: Colors.light.tint,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  statLabel: {
    fontSize: 12,
    color: "#fff",
    opacity: 0.9,
    textAlign: "center",
    marginTop: 4,
  },
  refreshContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  refreshButton: {
    backgroundColor: "#4CAF50",
  },
  refreshButtonDisabled: {
    backgroundColor: Colors.light.tabIconDefault,
  },
  matchesList: {
    paddingHorizontal: 20,
    maxHeight: "60%",
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
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
    textAlign: "center",
    lineHeight: 20,
  },
  matchCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  matchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  matchInfo: {
    flex: 1,
  },
  matchTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 4,
  },
  roleB

: {
    backgroundColor: "#E8F5E8",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#2E7D32",
  },
  matchDetails: {
    backgroundColor: "#F8F9FA",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  detailText: {
    fontSize: 12,
    color: Colors.light.text,
    marginLeft: 6,
    flex: 1,
  },
  actionButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    minWidth: "45%",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  detailsButton: {
    backgroundColor: "#8B5CF6",
  },
  startButton: {
    backgroundColor: "#10b981",
  },
  meetingButton: {
    backgroundColor: "#f59e0b",
  },
  liveTrackingButton: {
    backgroundColor: "#8B5CF6",
  },
  navigationButton: {
    backgroundColor: "#06b6d4",
  },
  completeButton: {
    backgroundColor: "#3b82f6",
  },
  cancelButton: {
    backgroundColor: "#F44336",
  },
  // Modern Meeting Point Card
  meetingPointCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  meetingPointHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  meetingPointIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#8B5CF6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  meetingIconText: {
    fontSize: 20,
  },
  meetingPointContent: {
    flex: 1,
  },
  meetingPointTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  meetingPointLocation: {
    fontSize: 14,
    fontWeight: "500",
    color: "#8B5CF6",
    marginBottom: 6,
  },
  meetingPointSubtext: {
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 16,
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
  navigateButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    marginTop: 20,
    backgroundColor: "#f8fafc",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
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
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  companionCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  companionHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  companionPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#e2e8f0",
    marginRight: 12,
    borderWidth: 2,
    borderColor: "#8B5CF6",
  },
  companionInfo: {
    flex: 1,
  },
  companionName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 2,
  },
  companionRole: {
    fontSize: 13,
    color: "#8B5CF6",
    fontWeight: "600",
    marginBottom: 2,
  },
  companionJoined: {
    fontSize: 11,
    color: "#6b7280",
  },
});