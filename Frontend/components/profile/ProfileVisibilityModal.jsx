// components/profile/ProfileVisibilityModal.jsx
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

export default function ProfileVisibilityModal({
  visible,
  onClose,
  onSave,
  onPreview,
  onCancel,
  visibility,
  onToggleVisibility,
  text,
  surface,
}) {
  const [showPreview, setShowPreview] = useState(false);

  const handlePreviewPress = () => {
    setShowPreview((prev) => !prev);
    onPreview();
  };

  const handleClose = () => {
    setShowPreview(false);
    onClose();
  };

  const handleSave = async () => {
    try {
      await onSave();
    } catch (error) {
      console.error("ProfileVisibilityModal save error:", error);
      Alert.alert("Error", "Could not save visibility settings", [
        { text: "OK" },
      ]);
    }
  };

  if (!visibility) return null;

  const renderVisibilityField = (label, field) => (
    <View style={styles.visibilityRow}>
      <Text style={[styles.visibilityLabel, { color: text }]}>{label}</Text>
      <Switch
        value={visibility[field]}
        onValueChange={() => onToggleVisibility(field)}
        trackColor={{ false: "#767577", true: "#81b0ff" }}
        thumbColor={visibility[field] ? "#1DA1F2" : "#f4f3f4"}
      />
    </View>
  );

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={handleClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.modalView, { backgroundColor: surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Text style={[styles.modalTitle, { color: text }]}>
              Profile Visibility
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.closeButton}
            >
              <MaterialIcons name="close" size={24} color={text} />
            </TouchableOpacity>
          </View>

          <ScrollView>
            <TouchableOpacity
              style={[
                styles.previewButton,
                showPreview && styles.previewButtonActive,
              ]}
              onPress={handlePreviewPress}
            >
              <MaterialIcons
                name={showPreview ? "visibility" : "visibility_off"}
                size={20}
                color={showPreview ? "#1DA1F2" : text}
              />
              <Text
                style={[
                  styles.previewText,
                  { color: showPreview ? "#1DA1F2" : text },
                ]}
              >
                Preview Profile
              </Text>
            </TouchableOpacity>

            <View style={styles.visibilityContainer}>
              {renderVisibilityField("Email", "email")}
              {renderVisibilityField("Mobile Number", "mobileNo")}
              {renderVisibilityField("Address", "address")}
              {renderVisibilityField("Gender", "gender")}
            </View>
          </ScrollView>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalView: {
    width: "100%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButton: {
    position: "absolute",
    top: 15,
    right: 15,
    zIndex: 1,
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: "Arial",
    marginBottom: 20,
    textAlign: "center",
  },
  previewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  previewButtonActive: {
    backgroundColor: "#E8F4FF",
    borderRadius: 8,
    padding: 8,
  },
  previewText: {
    marginLeft: 5,
    fontSize: 16,
    fontFamily: "Arial",
  },
  visibilityContainer: {
    paddingHorizontal: 20,
  },
  visibilityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  visibilityLabel: {
    fontSize: 16,
    fontFamily: "Arial",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 120,
    alignItems: "center",
  },
  saveButton: {
    backgroundColor: "#1DA1F2",
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
});
