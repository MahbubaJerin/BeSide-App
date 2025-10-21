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

export default function ProfileSettingsModal({
  visible,
  onClose,
  onEdit,
  onVisibility,
  onDelete,
  onLogout,
  text,
}) {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Dim background */}
        <TouchableOpacity style={styles.overlayTouchable} onPress={onClose} />

        {/* Sidebar */}
        <View style={styles.sidebar}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Settings</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={26} color="#111827" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scroll}>
            {/* Section 1 */}
            <Text style={styles.sectionTitle}>Profile</Text>
            <SidebarItem
              icon="edit"
              label="Edit Profile"
              onPress={() => {
                onEdit();
                onClose();
              }}
            />
  
            {/* Section 2 */}
            <Text style={styles.sectionTitle}>Account</Text>
            <SidebarItem
              icon="delete-outline"
              label="Delete Account"
              danger
              onPress={onDelete}
            />
            <SidebarItem
              icon="logout"
              label="Logout"
              onPress={onLogout}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function SidebarItem({ icon, label, onPress, danger }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.item,
        danger && { backgroundColor: "#FEF2F2" },
      ]}
      activeOpacity={0.8}
    >
      <View style={styles.itemRow}>
        <MaterialIcons
          name={icon}
          size={22}
          color={danger ? "#B91C1C" : "#111827"}
        />
        <Text
          style={[
            styles.itemText,
            danger && { color: "#B91C1C", fontWeight: "600" },
          ]}
        >
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  overlayTouchable: { flex: 1 },
  sidebar: {
    width: "72%",
    height: "100%",
    backgroundColor: "#ECF0F0",
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: -2, height: 0 },
    elevation: 6,
    paddingVertical: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    fontFamily: "Arial",
  },
  scroll: {
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 10,
    marginLeft: 24,
    textTransform: "uppercase",
    fontFamily: "Arial",
  },
  item: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 8,
    marginHorizontal: 10,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  itemRow: { flexDirection: "row", alignItems: "center" },
  itemText: {
    fontSize: 15,
    marginLeft: 14,
    color: "#111827",
    fontFamily: "Arial",
  },
});
