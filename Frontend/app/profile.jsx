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
import DateTimePicker from '@react-native-community/datetimepicker';
import { useThemeColor } from "@/hooks/useThemeColor";
import { router } from "expo-router";
import { formatDateYMD, formatDatePretty } from '../utils/dateUtils';
import { BASE_URL } from "../config";
import PlacesAutocomplete from "./PlacesAutocomplete";

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
  const [dateOfBirth, setDateOfBirth] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [address, setAddress] = useState({
    addressString: "",
    city: "",
    state: "",
    postalCode: "",
    country: "Australia",
    countryCode: "AU",
    lat: null,
    lng: null
  });
  const [userName, setUserName] = useState("");
  const [availability, setAvailability] = useState(true);
  const [consentGiven, setConsentGiven] = useState(false);
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
  const [tempVisibility, setTempVisibility] = useState({
    email: true,
    mobileNo: true,
    address: true,
    gender: true,
  });
  const [previewVisibility, setPreviewVisibility] = useState(null);

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
        setDateOfBirth(user.dob ? new Date(user.dob) : null);
        setMobileNo(user.mobileNo || "");
        setGender(user.gender || "");
        setPhoto(user.profilePhoto?.url || null);
        setUserName(user.userName || "");
        setAvailability(user.availability ?? true);
        setAddress({
          addressString: user.address?.street || "",
          city: user.address?.city || "",
          state: user.address?.state || "",
          postalCode: user.address?.postalCode || "",
          country: user.address?.country || "Australia",
          countryCode: user.address?.countryCode || "AU",
          lat: user.geo?.lat || null,
          lng: user.geo?.lng || null
        });
        
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
        setTempVisibility(newVisibility);
      } else {
        throw new Error(data.message || "Failed to fetch profile.");
      }
    } catch (e) {
      console.error('Profile fetch error:', e);
      Alert.alert("Error", "Failed to fetch profile: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceSelect = (place) => {
    if (!place) return;
    
    setAddress(prev => ({
      ...prev,
      addressString: place.description,
      lat: place.lat,
      lng: place.lng,
      city: place.city || prev.city,
      state: place.state || prev.state,
      postalCode: place.postalCode || prev.postalCode,
    }));
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      // Validate age
      const age = ((new Date()).getFullYear() - selectedDate.getFullYear());
      if (age < 13) {
        Alert.alert("Invalid Age", "You must be at least 13 years old.");
        return;
      }
      setDateOfBirth(selectedDate);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!userName || !userName.trim()) {
      Alert.alert("Validation Error", "Username is required.");
      return;
    }

    if (!mobileNo || !mobileNo.trim()) {
      Alert.alert("Validation Error", "Mobile number is required.");
      return;
    }

    // Age validation
    if (dateOfBirth) {
      const age = ((new Date()).getFullYear() - dateOfBirth.getFullYear());
      if (age < 13) {
        Alert.alert("Invalid Age", "You must be at least 13 years old.");
        return;
      }
    }

    const payload = {
      userName: userName.trim(),
      email: email.trim(),
      dob: dateOfBirth ? formatDateYMD(dateOfBirth) : undefined,
      mobileNo: mobileNo.trim(),
      gender,
      address: {
        street: address.addressString,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
        countryCode: address.countryCode,
      },
      geo: (address.lat && address.lng) ? {
        lat: Number(address.lat),
        lng: Number(address.lng)
      } : null,
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
        await fetchProfile(); // Refresh profile data
      } else {
        throw new Error(data.message || "Failed to update profile");
      }
    } catch (e) {
      console.error('Profile update error:', e);
      Alert.alert("Error", "Failed to update profile: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfile = async () => {
    Alert.alert(
      "Delete Profile",
      "This action cannot be undone. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const token = await AsyncStorage.getItem("token");
            try {
              const res = await fetch(`${API_BASE_URL}/profile`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              });
              
              if (res.ok) {
                await AsyncStorage.removeItem("token");
                Alert.alert("Success", "Profile deleted successfully");
                router.replace("/login");
              } else {
                const data = await res.json();
                throw new Error(data.message || "Failed to delete profile");
              }
            } catch (e) {
              console.error('Profile deletion error:', e);
              Alert.alert("Error", "Failed to delete profile: " + e.message);
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem("token");
              router.replace("/login");
            } catch (e) {
              console.error('Logout error:', e);
              Alert.alert("Error", "Failed to logout: " + e.message);
            }
          },
        },
      ]
    );
  };

const handleToggleVisibility = (field) => {
  const newVisibility = {
    ...tempVisibility,
    [field]: !tempVisibility[field],
  };
  setTempVisibility(newVisibility);
  setPreviewVisibility(newVisibility);
};


  const handleVisibilityClose = () => {
    setVisibilityModal(false);
    setTempVisibility(visibility); // Reset to original visibility settings
  };

  const handleSaveVisibility = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        throw new Error("No auth token found");
      }

      // Log the payload for debugging
      const payload = {
        sharedInfo: Object.entries(tempVisibility)
          .filter(([_, value]) => value)
          .map(([key]) => key)
      };
      console.log('Visibility update payload:', payload);

      const response = await fetch(`${API_BASE_URL}/profile/visibility`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Server returned error status');
      }

      // Update local state only after successful API call
      setVisibility(tempVisibility);
      setVisibilityModal(false);
      Alert.alert("Success", "Visibility settings updated");
      
    } catch (error) {
      console.error('Detailed visibility update error:', {
        message: error.message,
        stack: error.stack,
        tempVisibility
      });
      
      Alert.alert(
        "Error",
        "Failed to update visibility settings. Please try again.",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Retry",
            onPress: () => handleSaveVisibility()
          }
        ]
      );
    }
  };

  const handleShowPreview = () => {
  setPreviewVisibility(tempVisibility);
  setPreviewVisible(true);
};


  const renderVisibilityField = (label, fieldKey) => (
    <View style={styles.visibilityRow}>
      <Text style={[styles.visibilityLabel, { color: text }]}>{label}</Text>
      <MaterialIcons
        name={visibility[fieldKey] ? "visibility" : "visibility-off"}
        size={24}
        color={text}
      />
    </View>
  );

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
      <ProfileHeader onSettingsPress={() => setSettingsModalVisible(true)} />

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
              setDateOfBirth,
              setShowDatePicker,
            }}
            editMode={editMode}
            colors={{ text }}
            onSave={handleSave}
            onCancel={() => {
              setEditMode(false);
              fetchProfile();
            }}
            saving={saving}
            onPlaceSelect={handlePlaceSelect}
          />
        </Animated.View>
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={dateOfBirth || new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "calendar"}
          onChange={handleDateChange}
          maximumDate={new Date()}
          minimumDate={new Date(1900, 0, 1)}
        />
      )}

      <ProfileSettingsModal
        visible={settingsModalVisible}
        onClose={() => setSettingsModalVisible(false)}
        onEdit={() => {
          setEditMode(true);
          setSettingsModalVisible(false);
        }}
        onVisibility={() => {
          setVisibilityModal(true);
          setSettingsModalVisible(false);
        }}
        onDelete={handleDeleteProfile}
        onLogout={handleLogout}
        text={text}
        surface={surface}
      />

      <ProfileVisibilityModal
        visible={visibilityModal}
        onClose={handleVisibilityClose}
        onSave={handleSaveVisibility}
        onPreview={handleShowPreview}
        onCancel={handleVisibilityClose}
        visibility={tempVisibility}
        onToggleVisibility={handleToggleVisibility}
        text={text}
        surface={surface}
      />

      <ProfilePreviewModal
        visible={previewVisible}
        onClose={() => setPreviewVisible(false)}
        profile={profile}
        photo={photo}
        text={text}
        surface={surface}
        visibility={previewVisibility || visibility}
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
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  visibilityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  visibilityLabel: {
    fontSize: 16,
  },
});
