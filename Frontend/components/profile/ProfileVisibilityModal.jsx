// components/profile/ProfileVisibilityModal.jsx
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

export default function ProfileVisibilityModal({
  visible,
  onClose,
  onSave,
  onPreview,
  onCancel,
  renderVisibilityField,
  text,
  surface,
}) {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalView, { backgroundColor: surface }]}>
          <Text style={[styles.modalTitle, { color: text }]}>
            Profile Visibility
          </Text>
          <ScrollView>
            <TouchableOpacity
              style={styles.previewButton}
              onPress={onPreview}
              accessibilityLabel="Preview Profile"
              accessibilityRole="button"
            >
              <MaterialIcons name="visibility" size={24} color={text} />
              <Text style={[styles.previewText, { color: text }]}>Preview</Text>
            </TouchableOpacity>

            {/* Visibility Toggles */}
            {renderVisibilityField("Email", "email")}
            {renderVisibilityField("Mobile Number", "mobileNo")}
            {renderVisibilityField("Address", "address")}
            {renderVisibilityField("Gender", "gender")}
          </ScrollView>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              onPress={onSave}
              accessibilityLabel="Save Visibility Changes"
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>Save Changes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onCancel}
              accessibilityLabel="Cancel Visibility Changes"
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalView: {
    width: "100%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
  previewText: {
    marginLeft: 5,
    fontSize: 16,
    fontFamily: "Arial",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 20,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "Arial",
    borderWidth: 2,
    padding: 10,
    borderRadius: 12,
  },
});
