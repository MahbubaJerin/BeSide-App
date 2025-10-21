import React from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";

export default function SenderAcceptanceNotificationModal({ 
  visible, 
  onClose, 
  acceptanceData 
}) {
  // Debug logging
  console.log("🎉 [SENDER MODAL] Visible:", visible);
  console.log("🎉 [SENDER MODAL] Acceptance Data:", JSON.stringify(acceptanceData, null, 2));

  if (!acceptanceData) {
    console.warn("⚠️ [SENDER MODAL] No acceptance data provided");
    return null;
  }

  const { 
    receiverName, 
    receiverPhoto, 
    receiverLocation,
    destination,
    transportMode 
  } = acceptanceData;

  // Validate required data
  if (!receiverName) {
    console.warn("⚠️ [SENDER MODAL] Missing receiver name");
  }
  if (!receiverPhoto) {
    console.warn("⚠️ [SENDER MODAL] Missing receiver photo");
  }

  const handleAcknowledge = () => {
    console.log("👍 [SENDER MODAL] User acknowledged");
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Success header */}
          <View style={styles.header}>
            <View style={styles.successBadge}>
              <Text style={styles.successIcon}>✓</Text>
            </View>
            <Text style={styles.headerTitle}>Match Found!</Text>
            <Text style={styles.headerSubtitle}>Your companion is ready</Text>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Receiver photo */}
            <View style={styles.photoSection}>
              {receiverPhoto ? (
                <Image 
                  source={{ uri: receiverPhoto }} 
                  style={styles.receiverPhoto}
                />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoPlaceholderText}>
                    {receiverName?.charAt(0).toUpperCase() || "?"}
                  </Text>
                </View>
              )}
            </View>

            {/* Acceptance message */}
            <View style={styles.messageSection}>
              <Text style={styles.receiverName}>{receiverName}</Text>
              <Text style={styles.acceptanceMessage}>
                accepted your request! 🎉
              </Text>
            </View>

            {/* Trip details */}
            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>📍</Text>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Coming from</Text>
                  <Text style={styles.detailValue}>
                    {receiverLocation?.address || "Current location"}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>🎯</Text>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Destination</Text>
                  <Text style={styles.detailValue}>{destination || "Your destination"}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>🚶</Text>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Transport</Text>
                  <Text style={styles.detailValue}>
                    {transportMode === "walking" ? "By Walk" : 
                     transportMode === "public_transport" ? "Public Transport" :
                     transportMode || "By Walk"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Safety reminder */}
            <View style={styles.safetyBox}>
              <Text style={styles.safetyIcon}>🛡️</Text>
              <Text style={styles.safetyText}>
                Both photos are now shared for safety. Please verify your companion's identity at the meeting point.
              </Text>
            </View>
          </View>

          {/* Action button */}
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={styles.thanksButton}
              onPress={handleAcknowledge}
            >
              <Text style={styles.thanksButtonText}>❤️ Thanks!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "90%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    backgroundColor: "#8B5CF6",
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  successBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  successIcon: {
    fontSize: 32,
    color: "#10B981",
    fontWeight: "700",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.9)",
  },
  content: {
    padding: 24,
  },
  photoSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  receiverPhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "#8B5CF6",
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#E9D5FF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#8B5CF6",
  },
  photoPlaceholderText: {
    fontSize: 48,
    fontWeight: "700",
    color: "#8B5CF6",
  },
  messageSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  receiverName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  acceptanceMessage: {
    fontSize: 16,
    color: "#6B7280",
  },
  detailsContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  detailIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 2,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 15,
    color: "#374151",
    fontWeight: "500",
  },
  safetyBox: {
    flexDirection: "row",
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    padding: 14,
    alignItems: "flex-start",
  },
  safetyIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  safetyText: {
    flex: 1,
    fontSize: 13,
    color: "#92400E",
    lineHeight: 18,
  },
  actionSection: {
    padding: 24,
    paddingTop: 0,
  },
  thanksButton: {
    backgroundColor: "#8B5CF6",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  thanksButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
});
