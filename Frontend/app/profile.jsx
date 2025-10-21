import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  TouchableOpacity,
  Dimensions,
  Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useThemeColor } from "@/hooks/useThemeColor";
import { router } from "expo-router";

import { BASE_URL } from "../config";

import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileSettingsModal from "@/components/profile/ProfileSettingsSidebar";
import ProfileVisibilityModal from "@/components/profile/ProfileVisibilityModal";
import ProfilePreviewModal from "@/components/profile/ProfilePreviewModal";
import ProfileCard from "@/components/profile/ProfileCard";

const API_BASE_URL = `${BASE_URL}api/v1/user`;

export default function ProfileScreen() {
  const [profile, setProfile] = useState(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [gender, setGender] = useState("");
  const [photo, setPhoto] = useState(null);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [address, setAddress] = useState({});
  const [userName, setUserName] = useState("");
  const [availability, setAvailability] = useState(true);
  const [consentGiven, setConsentGiven] = useState(false);
const renderVisibilityField = (label, fieldKey) => (
  <View style={{
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10
  }}>
    <Text style={{ fontSize: 16, color: text }}>{label}</Text>
    <MaterialIcons
      name={visibility[fieldKey] ? "visibility" : "visibility-off"}
      size={24}
      color={text}
    />
  </View>
);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [visibilityModal, setVisibilityModal] = useState(false);

  const [visibility, setVisibility] = useState({
    email: true,
    mobileNo: true,
    address: true,
    gender: true,
    userName: true,
  });
  const [originalVisibility, setOriginalVisibility] = useState({});
  const [isPublic, setIsPublic] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const text = useThemeColor({}, "text");
  const surface = useThemeColor({}, "surface");

  useEffect(() => {
    fetchProfile();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const fetchProfile = async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP error ${res.status}: ${errorText}`);
      }

      const data = await res.json();
      if (data.status === "success") {
        const user = data.data.user;

        setProfile(user);
        setFirstName(user.firstName || "");
        setLastName(user.lastName || "");
        setEmail(user.email || "");
        setDateOfBirth(user.dob || user.dateOfBirth || "");
        setMobileNo(user.mobileNo || "");
        setGender(user.gender || "");
        setPhoto(user.profilePhoto?.url || null);
        setUserName(user.userName || "");
        setAvailability(user.availability ?? true);
        setAddress(
          user.address || {
            street: "",
            city: "",
            state: "",
            country: "",
            postalCode: "",
          }
        );
        setConsentGiven(user.consentGiven || false);
        setIsPublic(user.profileSettings?.public || false);

        const sharedInfo = user.profileSettings?.sharedInfo || [];
        const newVisibility = {
          email: sharedInfo.includes("email"),
          mobileNo: sharedInfo.includes("mobileNo"),
          address: sharedInfo.includes("address"),
          gender: sharedInfo.includes("gender"),
          userName: true,
        };

        setVisibility(newVisibility);
        setOriginalVisibility(newVisibility);
      } else {
        throw new Error(data.message || "Failed to fetch profile.");
      }
    } catch (e) {
      Alert.alert("Error", "Failed to fetch profile: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userName || !mobileNo) {
      Alert.alert("Validation Error", "Username and Mobile Number are required.");
      return;
    }

    const payload = {
      userName,
      email,
      dob: dateOfBirth,
      mobileNo,
      gender,
      address: {
        street: address?.addressString || "",
        city: "",
        state: "",
        postalCode: "",
        country: "Australia",
        countryCode: "AU",
      },
      availability,
    };

    setSaving(true);
    const token = await AsyncStorage.getItem("token");

    try {
      const res = await fetch(`${API_BASE_URL}/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        Alert.alert("Success", "Profile updated successfully");
        setEditMode(false);
        fetchProfile();
      } else {
        Alert.alert("Error", data.message || "Failed to update profile.");
      }
    } catch (e) {
      Alert.alert("Error", "Failed to update profile: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfile = async () => {
    Alert.alert("Delete Profile", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        onPress: async () => {
          const token = await AsyncStorage.getItem("token");
          try {
            const res = await fetch(`${API_BASE_URL}/profile`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              await AsyncStorage.removeItem("token");
              Alert.alert("Success", "Profile deleted");
              router.replace("/login");
            } else {
              const data = await res.json();
              Alert.alert("Error", data.message || "Failed to delete profile.");
            }
          } catch (e) {
            Alert.alert("Error", "Failed to delete profile: " + e.message);
          }
        },
      },
    ]);
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        onPress: async () => {
          await AsyncStorage.removeItem("token");
          router.replace("/login");
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={text} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.loading}>
        <Text style={[styles.label, { color: text }]}>
          Failed to load profile
        </Text>
        <TouchableOpacity onPress={fetchProfile}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* Header */}
      <ProfileHeader onSettingsPress={() => setSettingsModalVisible(true)} />

      {/* Profile Card */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <ProfileCard
            profile={profile}
            fields={{
              photo,
              userName,
              email,
              gender,
              firstName,
              lastName,
              mobileNo,
              availability,
              dateOfBirth,
              address,
            }}
            setters={{
              setUserName,
              setMobileNo,
              setAddress,
            }}
            editMode={editMode}
            colors={{ text }}
            onSave={handleSave}
            onCancel={() => {
              setEditMode(false);
              fetchProfile();
            }}
            saving={saving}
          />
        </Animated.View>
      </ScrollView>

      {/* Settings Sidebar */}
      <ProfileSettingsModal
        visible={settingsModalVisible}
        onClose={() => setSettingsModalVisible(false)}
        onEdit={() => setEditMode(true)}
        onVisibility={() => setVisibilityModal(true)}
        onDelete={handleDeleteProfile}
        onLogout={handleLogout}
        text={text}
        surface={surface}
      />

      {/* Visibility Modal */}
     <ProfileVisibilityModal
  visible={visibilityModal}
  onClose={() => setVisibilityModal(false)}
  onSave={() => {}}
  onPreview={() => setPreviewVisible(true)}
  onCancel={() => setVisibilityModal(false)}
  renderVisibilityField={renderVisibilityField}
  text={text}
  surface={surface}
/>



      {/* Preview Modal */}
      <ProfilePreviewModal
        visible={previewVisible}
        onClose={() => setPreviewVisible(false)}
        profile={profile}
        photo={photo}
        text={text}
        surface={surface}
        visibility={visibility}
        email={email}
        mobileNo={mobileNo}
        gender={gender}
        address={address}
        firstName={firstName}
        lastName={lastName}
        userName={userName}
      />
    </KeyboardAvoidingView>
  );
}

/* ---- Styles ---- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  retryText: {
    color: "#3B82F6",
    marginTop: 8,
    fontSize: 16,
  },
});
