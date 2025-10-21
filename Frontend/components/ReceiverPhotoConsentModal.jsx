import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ThemedText } from "@/components/ThemedText";

export default function ReceiverPhotoConsentModal({ 
  visible, 
  onClose, 
  onConfirm,
  senderName 
}) {
  const [receiverPhoto, setReceiverPhoto] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Camera Permission Required",
        "Please enable camera access to take your verification photo."
      );
      return false;
    }
    return true;
  };

  const handleTakePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setReceiverPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Error", "Failed to take photo. Please try again.");
    }
  };

  const handleRetakePhoto = () => {
    setReceiverPhoto(null);
  };

  const handleConfirm = () => {
    if (!receiverPhoto) {
      Alert.alert("Photo Required", "Please take your photo before accepting the request.");
      return;
    }

    setIsUploading(true);
    onConfirm(receiverPhoto);
    // Reset state after confirmation
    setTimeout(() => {
      setIsUploading(false);
      setReceiverPhoto(null);
    }, 500);
  };

  const handleClose = () => {
    setReceiverPhoto(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>📸 Safety Verification</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <View style={styles.infoBox}>
              <Text style={styles.infoIcon}>🛡️</Text>
              <Text style={styles.infoText}>
                For both users' safety, please take a verification photo before accepting {senderName}'s request.
              </Text>
            </View>

            {/* Photo section */}
            {receiverPhoto ? (
              <View style={styles.photoPreviewContainer}>
                <Image source={{ uri: receiverPhoto }} style={styles.photoPreview} />
                <TouchableOpacity 
                  style={styles.retakeButton}
                  onPress={handleRetakePhoto}
                >
                  <Text style={styles.retakeButtonText}>🔄 Retake Photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.cameraButton}
                onPress={handleTakePhoto}
              >
                <Text style={styles.cameraIcon}>📷</Text>
                <Text style={styles.cameraButtonText}>Take Verification Photo</Text>
                <Text style={styles.cameraButtonSubtext}>Tap to open camera</Text>
              </TouchableOpacity>
            )}

            {/* Safety notes */}
            <View style={styles.notesContainer}>
              <Text style={styles.notesTitle}>Why we need this:</Text>
              <Text style={styles.noteItem}>✓ Helps {senderName} identify you at the meeting point</Text>
              <Text style={styles.noteItem}>✓ Ensures accountability for both users</Text>
              <Text style={styles.noteItem}>✓ Enhances trip safety and security</Text>
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={isUploading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                (!receiverPhoto || isUploading) && styles.confirmButtonDisabled
              ]}
              onPress={handleConfirm}
              disabled={!receiverPhoto || isUploading}
            >
              {isUploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmButtonText}>
                  {receiverPhoto ? "✓ Upload & Accept" : "Take Photo First"}
                </Text>
              )}
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
    maxWidth: 450,
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    backgroundColor: "#8B5CF6",
    paddingVertical: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeText: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "600",
  },
  content: {
    padding: 20,
  },
  infoBox: {
    backgroundColor: "#F3E8FF",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#6B21A8",
    lineHeight: 20,
  },
  cameraButton: {
    backgroundColor: "#F9FAFB",
    borderWidth: 2,
    borderColor: "#8B5CF6",
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
    marginBottom: 20,
  },
  cameraIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  cameraButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#8B5CF6",
    marginBottom: 4,
  },
  cameraButtonSubtext: {
    fontSize: 13,
    color: "#9CA3AF",
  },
  photoPreviewContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  photoPreview: {
    width: 200,
    height: 266,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: "#8B5CF6",
  },
  retakeButton: {
    backgroundColor: "#F3E8FF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  retakeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8B5CF6",
  },
  notesContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
  },
  noteItem: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 6,
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  confirmButton: {
    flex: 1,
    backgroundColor: "#8B5CF6",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  confirmButtonDisabled: {
    backgroundColor: "#D1D5DB",
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});
