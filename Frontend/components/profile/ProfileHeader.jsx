// Frontend/components/profile/ProfileHeader.jsx
import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useRouter } from "expo-router"; // ✅ use useRouter hook, not static router import

export default function ProfileHeader({ onSettingsPress }) {
  const text = useThemeColor({}, "text");
  const border = useThemeColor({}, "outline");
  const router = useRouter(); // ✅ dynamic router instance

  const handleGoBack = () => {
    try {
      console.log("Header back pressed");
      // fallback if router.back() fails (for tab/root screens)
      router.back();
      setTimeout(() => {
        router.replace("/"); // optional fallback: navigate home if back not possible
      }, 300);
    } catch (e) {
      console.warn("Back navigation failed:", e.message);
    }
  };

  return (
    <View style={styles.header}>
      <TouchableOpacity
        activeOpacity={0.7}
        style={[styles.goBackButton, { borderColor: border, zIndex: 10 }]}
        onPress={handleGoBack}
        accessibilityLabel="Go back"
        accessibilityRole="button"
      >
        <MaterialIcons name="arrow-back" size={28} color={text} />
      </TouchableOpacity>

      <Text style={[styles.headerTitle, { color: text }]}>Profile</Text>

      <TouchableOpacity
        activeOpacity={0.7}
        style={[styles.settingsButton, { zIndex: 10 }]}
        onPress={onSettingsPress}
        accessibilityLabel="Open Settings"
        accessibilityRole="button"
      >
        <MaterialIcons name="more-vert" size={28} color={text} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingVertical: 12,
    marginTop: 30,
    padding: 10,
    position: "relative",
  },
  goBackButton: {
    padding: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  settingsButton: {
    padding: 5,
  },
  headerTitle: {
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: "SpaceMono",
    letterSpacing: 1,
    zIndex: 0, 
  },
});
