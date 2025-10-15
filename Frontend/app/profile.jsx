import React, { useState, useEffect } from "react";
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
import * as ImagePicker from "expo-image-picker";
import { useThemeColor } from "@/hooks/useThemeColor";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";

import { BASE_URL } from "../config";

import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileSettingsModal from "@/components/profile/ProfileSettingsSidebar";
import ProfileVisibilityModal from "@/components/profile/ProfileVisibilityModal";
import ProfilePreviewModal from "@/components/profile/ProfilePreviewModal";
import ProfileCard from "@/components/profile/ProfileCard";

const API_BASE_URL = `${BASE_URL}api/v1/user`;
const { width, height } = Dimensions.get("window");


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
  const [consentGiven, setConsentGiven] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [visibilityModal, setVisibilityModal] = useState(false);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [visibility, setVisibility] = useState({
    email: true,
    mobileNo: true,
    address: true,
    gender: true,
    userName: true,
  });

  const [originalVisibility, setOriginalVisibility] = useState({});
  const [isPublic, setIsPublic] = useState(false);

  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const [userName, setUserName] = useState("");
  const [availability, setAvailability] = useState(true);

  const border = useThemeColor({}, "primary");
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
      console.log("[PROFILE][RAW_RESPONSE] /api/v1/user/profile →");
try {
  console.log(JSON.stringify(data, null, 2));
} catch (e) {
  console.log(data);
}
      if (data.status === "success") {
        const user = data.data.user;
        console.log("[PROFILE][USER_MAPPED_FIELDS]", {
  userName: user?.userName,
  email: user?.email,
  mobileNo: user?.mobileNo,
  firstName: user?.firstName,
  lastName: user?.lastName,
  gender: user?.gender,
  dob: user?.dob,                // if backend uses `dob`
  dateOfBirth: user?.dateOfBirth, // if backend uses `dateOfBirth`
  address: user?.address,
  availability: user?.availability,
  profileSettings: user?.profileSettings,
  isVerified: user?.isVerified,
});
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
      console.log("Fetch profile error:", e.message);
      Alert.alert("Error", "Failed to fetch profile: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    console.log("pickImage triggered");
    const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
    const galleryPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (cameraPerm.status !== "granted" || galleryPerm.status !== "granted") {
      Alert.alert("Permission Required", "Camera and gallery access required.");
      return;
    }
    Alert.alert("Select Image Source", "Choose an option", [
      {
        text: "Camera",
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
          });
          handleImageResult(result);
        },
      },
      {
        text: "Gallery",
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
          });
          handleImageResult(result);
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleImageResult = async (result) => {
    if (!result.canceled && result.assets.length > 0) {
      const selected = result.assets[0];
      const token = await AsyncStorage.getItem("token");
      const formData = new FormData();
      formData.append("photo", {
        uri: selected.uri,
        name: "profile.jpg",
        type: "image/jpeg",
      });
      try {
        const response = await fetch(`${API_BASE_URL}/profile-photo`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
          body: formData,
        });
        const data = await response.json();
        if (response.ok) {
          setPhoto(data.data.user.profilePhoto.url);
          Alert.alert("Success", "Photo updated!");
        } else {
          Alert.alert("Error", data.message || "Upload failed.");
        }
      } catch (e) {
        Alert.alert("Error", "Upload failed: " + e.message);
      }
    }
  };

const handleSave = async () => {
  if (!email || !mobileNo) {
    Alert.alert("Validation Error", "Email and Mobile Number are required.");
    return;
  }

  // 🧠 Map addressString → street so backend accepts it
  const payload = {
    userName,
    email,
    dob: dateOfBirth,
    mobileNo,
    gender,
    address: {
      street: address?.addressString || "", // send the entire string here
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
    console.log("📤 Sending payload:", payload);
    const res = await fetch(`${API_BASE_URL}/profile`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    console.log("✅ Backend response:", data);

    if (res.ok) {
      Alert.alert("Success", "Profile updated successfully");
      setEditMode(false);
      fetchProfile(); // refresh view
    } else {
      Alert.alert("Error", data.message || "Failed to update profile.");
    }
  } catch (e) {
    console.log("❌ Error during save:", e.message);
    Alert.alert("Error", "Failed to update profile: " + e.message);
  } finally {
    setSaving(false);
  }
};


  const handleVisibilitySave = async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) {
      Alert.alert(
        "Error",
        "Authentication token missing. Please log in again."
      );
      router.replace("/login");
      return;
    }
    try {
      const sharedInfo = Object.keys(visibility).filter(
        (key) =>
          visibility[key] &&
          ["email", "mobileNo", "address", "gender"].includes(key)
      );
      const payload = { public: isPublic, sharedInfo };
      const res = await fetch(`${API_BASE_URL}/profile-settings`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        const updatedSharedInfo =
          data.data?.user?.profileSettings?.sharedInfo || sharedInfo;
        setVisibility({
          email: updatedSharedInfo.includes("email"),
          mobileNo: updatedSharedInfo.includes("mobileNo"),
          address: updatedSharedInfo.includes("address"),
          gender: updatedSharedInfo.includes("gender"),
          userName: true,
        });
        setOriginalVisibility({ ...visibility });
        Alert.alert("Success", "Visibility Updated");
        setVisibilityModal(false);
        fetchProfile();
      } else {
        throw new Error(data.message || "Unexpected response format");
      }
    } catch (e) {
      console.log("Visibility save error:", e.message);
      Alert.alert(
        "Error",
        "Failed to save visibility on server: " +
          e.message +
          "\nChanges applied locally."
      );
      setOriginalVisibility(visibility);
      setVisibilityModal(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        onPress: async () => {
          await AsyncStorage.removeItem("token");
          Alert.alert("Success", "Logged out");
          router.replace("/login");
        },
      },
    ]);
  };

  const toggleVisibility = (field) => {
    setVisibility((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleSettingsPress = () => {
    setSettingsModalVisible(true);
  };

  const renderField = (label, value, editable, onChangeText, type = "text") => (
    <View style={styles.fieldContainer}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
      {type === "picker" ? (
        <View
          style={[
            styles.input,
            {
              borderColor: border,
              backgroundColor: surface,
              paddingVertical: 0,
              justifyContent: "center",
            },
          ]}
        >
          {editable ? (
            <Picker
              selectedValue={value}
              onValueChange={(itemValue) => onChangeText(itemValue)}
              style={{ color: text, fontFamily: "Arial" }}
              enabled={editable}
              accessibilityLabel={`Select ${label}`}
              accessibilityRole="combobox"
            >
              <Picker.Item label="Select Gender" value="" />
              <Picker.Item label="Female" value="Female" />
              <Picker.Item label="Male" value="Male" />
              <Picker.Item label="Non-binary" value="Non-binary" />
              <Picker.Item label="Other" value="Other" />
              <Picker.Item
                label="Prefer not to say"
                value="Prefer not to say"
              />
            </Picker>
          ) : (
            <Text style={[styles.inputText, { color: text }]}>
              {value || "Not specified"}
            </Text>
          )}
        </View>
      ) : (
        <TextInput
          style={[
            styles.input,
            { borderColor: border, color: text, backgroundColor: surface },
          ]}
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          accessibilityLabel={label}
          accessibilityRole="text"
        />
      )}
    </View>
  );

  const renderVisibilityField = (label, fieldKey) => (
    <View style={styles.visibilityField}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
      <TouchableOpacity
        onPress={() => toggleVisibility(fieldKey)}
        accessibilityLabel={`Toggle ${label} visibility`}
        accessibilityRole="button"
      >
        <MaterialIcons
          name={visibility[fieldKey] ? "visibility" : "visibility-off"}
          size={24}
          color={text}
        />
      </TouchableOpacity>
    </View>
  );

  const handleDeleteProfile = async () => {
    Alert.alert(
      "Delete Profile",
      "Are you sure you want to delete your profile? This action cannot be undone.",
      [
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
                Alert.alert(
                  "Error",
                  data.message || "Failed to delete profile."
                );
              }
            } catch (e) {
              Alert.alert("Error", "Failed to delete profile: " + e.message);
            }
          },
        },
      ]
    );
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
        <TouchableOpacity
          onPress={fetchProfile}
          accessibilityLabel="Retry Loading Profile"
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* Fixed header */}
      <ProfileHeader onSettingsPress={handleSettingsPress} />
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
    setEmail,
    setGender,
    setDateOfBirth,
    setAddress,
  }}
  editMode={editMode}
  colors={{ text }}
/>
      {/* Scrollable content below */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >

        {editMode && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              accessibilityLabel="Save Profile"
              accessibilityRole="button"
            >
              {saving ? (
                <ActivityIndicator size="small" color={surface} />
              ) : (
                <Text style={styles.buttonText}>Save Profile</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setEditMode(false);
                fetchProfile();
              }}
              accessibilityLabel="Cancel Edit"
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

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

      <ProfileVisibilityModal
        visible={visibilityModal}
        onClose={() => setVisibilityModal(false)}
        onSave={handleVisibilitySave}
        onPreview={() => setPreviewVisible(true)}
        onCancel={() => {
          setVisibility(originalVisibility);
          setVisibilityModal(false);
        }}
        renderVisibilityField={renderVisibilityField}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  button: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1.5,
    ...(Platform.OS === "ios"
      ? {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
        }
      : { elevation: 4 }),
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "Arial",
    borderWidth: 2,
    padding: 10,
    borderRadius: 12,
    marginBottom: 50,
  },
  visibilityField: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  buttonContainer: {
    flexDirection: "row",
    color: "#fff",
    borderColor: "black",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 30,
  },
});
