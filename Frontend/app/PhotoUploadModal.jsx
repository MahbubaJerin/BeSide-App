import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  Alert,
  Platform,
  Image,
} from "react-native";
import { Camera } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { ThemedButton } from "@/components/ThemedButton";

export default function PhotoUploadModal({ visible, onClose, onSubmit }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [photo, setPhoto] = useState(null);

  useEffect(() => {
    (async () => {
      const cameraStatus = await Camera.requestCameraPermissionsAsync();
      setHasPermission(cameraStatus.status === "granted");
    })();
  }, []);

  const takePhoto = async () => {
    if (!hasPermission) {
      Alert.alert(
        "Permission Denied",
        "Camera access is required to take a photo."
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.5,
    });

    if (!result.canceled && result.assets) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!photo) {
      Alert.alert("Error", "Please take a photo before proceeding.");
      return;
    }

    try {
      onSubmit(photo);
      setPhoto(null);
    } catch (error) {
      console.error("Error:", error);
      Alert.alert(
        "Error",
        "Failed to process photo. Please try again."
      );
    }
  };

  if (hasPermission === null) {
    return <View />;
  }
  if (hasPermission === false) {
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.box}>
            <Text style={styles.title}>Camera Access Required</Text>
            <Text style={styles.label}>
              Please grant camera permissions in settings.
            </Text>
            <Pressable onPress={onClose} style={{ marginTop: 12 }}>
              <Text style={{ color: "#aaa", textAlign: "center" }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Modern Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.headerIcon}>📸</Text>
              <Text style={styles.title}>Verify Your Identity</Text>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </Pressable>
            </View>
            <Text style={styles.subtitle}>
              Take a real-time selfie to verify your identity for this trip
            </Text>
          </View>

          {/* Photo Section */}
          <View style={styles.photoSection}>
            {photo ? (
              <View style={styles.photoContainer}>
                <Image source={{ uri: photo }} style={styles.preview} />
                <View style={styles.photoOverlay}>
                  <Text style={styles.photoStatusText}>✓ Photo captured</Text>
                </View>
              </View>
            ) : (
              <View style={styles.placeholder}>
                <View style={styles.cameraIcon}>
                  <Text style={styles.cameraIconText}>📷</Text>
                </View>
                <Text style={styles.placeholderText}>No photo taken yet</Text>
                <Text style={styles.placeholderSubtext}>Tap the button below to take your selfie</Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            <Pressable 
              style={[styles.modernButton, styles.takePhotoButton]} 
              onPress={takePhoto}
            >
              <Text style={styles.takePhotoButtonText}>
                {photo ? "📸 Retake Photo" : "📸 Take Selfie"}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.modernButton, styles.uploadButton, !photo && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={!photo}
            >
              <Text style={[styles.uploadButtonText, !photo && styles.disabledButtonText]}>
                ✨ Upload & Continue
              </Text>
            </Pressable>
          </View>

          {/* Security Note */}
          <View style={styles.securityNote}>
            <Text style={styles.securityText}>🔒 Your photo is encrypted and used only for verification</Text>
          </View>
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
    padding: 20,
  },
  container: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  
  // Header Section
  header: {
    backgroundColor: "#8B5CF6",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerIcon: {
    fontSize: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "white",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 16,
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
  subtitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  
  // Photo Section
  photoSection: {
    padding: 24,
    alignItems: "center",
  },
  photoContainer: {
    position: "relative",
  },
  preview: {
    width: 200,
    height: 200,
    borderRadius: 16,
    borderWidth: 4,
    borderColor: "#8B5CF6",
  },
  photoOverlay: {
    position: "absolute",
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: "rgba(139, 92, 246, 0.9)",
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  photoStatusText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  placeholder: {
    width: 200,
    height: 200,
    borderRadius: 16,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
  },
  cameraIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#8B5CF6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  cameraIconText: {
    fontSize: 24,
  },
  placeholderText: {
    color: "#64748b",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  placeholderSubtext: {
    color: "#94a3b8",
    fontSize: 12,
    textAlign: "center",
  },
  
  // Action Section
  actionSection: {
    padding: 24,
    paddingTop: 0,
  },
  modernButton: {
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  takePhotoButton: {
    backgroundColor: "#f8fafc",
    borderWidth: 2,
    borderColor: "#8B5CF6",
  },
  takePhotoButtonText: {
    color: "#8B5CF6",
    fontSize: 16,
    fontWeight: "600",
  },
  uploadButton: {
    backgroundColor: "#8B5CF6",
  },
  uploadButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    backgroundColor: "#e2e8f0",
    borderColor: "#e2e8f0",
  },
  disabledButtonText: {
    color: "#94a3b8",
  },
  
  // Security Note
  securityNote: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  securityText: {
    color: "#64748b",
    fontSize: 12,
    textAlign: "center",
    fontStyle: "italic",
  },
});
