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
} from "react-native";
import { ThemedButton } from "@/components/ThemedButton";
import { ThemedText } from "@/components/ThemedText";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import MeetingPointModal from "./MeetingPointModal";
import LiveTripModal from "./LiveTripModal";

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
  const [meetingPointModalVisible, setMeetingPointModalVisible] = useState(false);
  const [liveTripModalVisible, setLiveTripModalVisible] = useState(false);
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
      'in-progress': 'Start this trip?',
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
              await onUpdateStatus(match.matchId, newStatus);
              Alert.alert("Success", `Trip ${newStatus === 'in-progress' ? 'started' : newStatus} successfully!`);
            } catch (error) {
              Alert.alert("Error", error.message || "Failed to update trip status");
            }
          }
        }
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <ThemedText type="subtitle">🚀 Active Trips</ThemedText>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <ThemedText style={styles.closeText}>✕</ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <ThemedText style={styles.statNumber}>
                {matches.length}
              </ThemedText>
              <ThemedText style={styles.statLabel}>
                Active {matches.length === 1 ? 'Trip' : 'Trips'}
              </ThemedText>
            </View>
          </View>

          <View style={styles.refreshContainer}>
            <ThemedButton
              title={isLoading ? "Refreshing..." : "🔄 Refresh"}
              onPress={onRefresh}
              disabled={isLoading}
              style={[styles.refreshButton, isLoading && styles.refreshButtonDisabled]}
            />
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
                  console.warn('⚠️ Missing user data in match:', match);
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

                    <View style={styles.matchDetails}>
                      <View style={styles.detailRow}>
                        <Ionicons name="person-outline" size={16} color={Colors.light.tabIconDefault} />
                        <ThemedText style={styles.detailText}>
                          With: {otherUser.userName}
                        </ThemedText>
                      </View>
                      
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

                    {/* Meeting Point Info */}
                    {match.meetingPoint && (
                      <View style={styles.meetingInfo}>
                        <Ionicons name="location" size={16} color={Colors.light.primary} />
                        <ThemedText style={styles.meetingText}>
                          Meeting at: {match.meetingPoint.name}
                        </ThemedText>
                      </View>
                    )}

                    <View style={styles.actionButtons}>
                      <ThemedButton
                        title="📱 View Details"
                        onPress={() => onViewDetails(match)}
                        style={[styles.actionButton, styles.detailsButton]}
                      />

                      {match.status === 'active' && (
                        <>
                          <ThemedButton
                            title="📍 Set Meeting Point"
                            onPress={() => {
                              setSelectedMatch(match);
                              setMeetingPointModalVisible(true);
                            }}
                            style={[styles.actionButton, styles.meetingButton]}
                          />
                          <ThemedButton
                            title="▶️ Start Trip"
                            onPress={() => handleStatusUpdate(match, 'in-progress')}
                            style={[styles.actionButton, styles.startButton]}
                          />
                        </>
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

      {/* Meeting Point Modal */}
      <MeetingPointModal
        visible={meetingPointModalVisible}
        onClose={() => {
          setMeetingPointModalVisible(false);
          setSelectedMatch(null);
        }}
        match={selectedMatch}
        onSetMeetingPoint={onSetMeetingPoint}
        currentLocation={currentLocation}
      />

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
    maxHeight: "90%",
    paddingVertical: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
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
    gap: 8,
  },
  actionButton: {
    flex: 1,
    minWidth: "45%",
    paddingVertical: 10,
  },
  detailsButton: {
    backgroundColor: Colors.light.tint,
  },
  startButton: {
    backgroundColor: "#4CAF50",
  },
  meetingButton: {
    backgroundColor: "#FF9800",
  },
  liveTrackingButton: {
    backgroundColor: "#9C27B0",
  },
  completeButton: {
    backgroundColor: "#2196F3",
  },
  cancelButton: {
    backgroundColor: "#F44336",
  },
  meetingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E3F2FD',
  },
  meetingText: {
    fontSize: 12,
    color: Colors.light.tint,
    marginLeft: 6,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E3F2FD",
    marginTop: 16,
  },
  footerText: {
    fontSize: 12,
    color: Colors.light.tabIconDefault,
    textAlign: "center",
    marginBottom: 12,
  },
  closeButtonBottom: {
    backgroundColor: Colors.light.tabIconDefault,
  },
});