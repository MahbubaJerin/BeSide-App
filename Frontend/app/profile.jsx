import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  TouchableOpacity,
  Dimensions,
  Modal,
  Animated,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useThemeColor } from "@/hooks/useThemeColor";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { BASE_URL } from "../config";

const API_BASE_URL = `${BASE_URL}api/v1/user`; // ✅ correct usage
const { width, height } = Dimensions.get("window");

export default function ProfileScreen() {
  const [profile, setProfile] = useState(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [gender, setGender] = useState("");
  const [photo, setPhoto] = useState(null);
  const [address, setAddress] = useState({});
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
  const [consentGiven, setConsentGiven] = useState(false);
  const [isPublic, setIsPublic] = useState(false);

  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const [userName, setUserName] = useState("");
  const [availability, setAvailability] = useState(true);

  const border = useThemeColor({}, "primary");
  const secondary = useThemeColor({}, "secondary");
  const text = useThemeColor({}, "text");
  const surface = useThemeColor({}, "surface");
  const muted = useThemeColor({}, "muted");

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
    if (!token) return router.replace("/login");
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
        console.log(
          "[Profile][Fetch] isVerified from backend:",
          user.isVerified
        );
        setProfile(user);
        setFirstName(user.firstName || "");
        setLastName(user.lastName || "");
        setEmail(user.email || "");
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

    const payload = {
      userName,
      firstName,
      lastName,
      email,
      mobileNo,
      gender,
      address,
      availability,
    };

    setSaving(true);
    const token = await AsyncStorage.getItem("token");
    try {
      console.log("Sending payload:", payload);
      const res = await fetch(`${API_BASE_URL}/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          firstName,
          lastName,
          email,
          mobileNo,
          gender,
          availability,
          userName,
          address,
        }),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      console.log("Backend response:", data);
      if (res.ok) {
        Alert.alert("Success", "Profile Updated");
        setEditMode(false);
        fetchProfile();
      } else {
        Alert.alert("Error", data.message || "Failed to update profile.");
      }
    } catch (e) {
      console.log("Error during save:", e.message);
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
              style={{ color: text, fontFamily: "SpaceMono" }}
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

  const updateConsent = async () => {
    const token = await AsyncStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE_URL}/consent`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ consentGiven: !consentGiven }),
      });
      const data = await res.json();
      if (res.ok) {
        setConsentGiven(!consentGiven);
        Alert.alert("Success", "Consent updated");
      } else {
        Alert.alert("Error", data.message || "Failed to update consent.");
      }
    } catch (e) {
      Alert.alert("Error", "Failed to update consent: " + e.message);
    }
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.goBackButton]}
            onPress={() => router.back()}
            accessibilityLabel="Go back from Settings"
            accessibilityRole="button"
          >
            <MaterialIcons name="arrow-back" size={30} color={text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.settingsButton, {}]}
            onPress={handleSettingsPress}
            accessibilityLabel="Open Settings"
            accessibilityRole="button"
          >
            <MaterialIcons name="more-vert" size={28} color={text} />
          </TouchableOpacity>
        </View>
        <Animated.View style={[styles.profileSection, { opacity: fadeAnim }]}>
          <TouchableOpacity
            onPress={() => setPhotoModalVisible(true)}
            accessibilityLabel="View or change profile photo"
            accessibilityRole="button"
          >
            <Image
              source={{ uri: photo || "https://via.placeholder.com/150" }}
              style={[
                styles.profileImage,
                editMode && { borderColor: border, borderWidth: 2 },
              ]}
              accessibilityLabel="User's profile photo"
            />
          </TouchableOpacity>
          <Modal
            animationType="fade"
            transparent={true}
            visible={photoModalVisible}
            onRequestClose={() => setPhotoModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View
                style={[styles.photoModalView, { backgroundColor: surface }]}
              >
                <Image
                  source={{ uri: photo || "https://via.placeholder.com/150" }}
                  style={styles.fullScreenImage}
                  accessibilityLabel="Full-screen profile photo"
                />
                <TouchableOpacity
                  style={styles.floatingCloseButton}
                  onPress={() => setPhotoModalVisible(false)}
                  accessibilityLabel="Close Profile Picture Modal"
                  accessibilityRole="button"
                >
                  <MaterialIcons name="close" size={28} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
          {editMode && (
            <TouchableOpacity
              style={styles.editPhotoButton}
              onPress={pickImage}
              accessibilityLabel="Change Profile Photo"
              accessibilityRole="button"
            >
              <MaterialIcons name="edit" size={24} color={text} />
            </TouchableOpacity>
          )}
          <View style={styles.nameSection}>
            {editMode ? (
              <TextInput
                style={{
                  borderBottomWidth: 1,
                  borderBottomColor: border,
                  fontSize: 22,
                  fontWeight: "600",
                  color: text,
                }}
                value={userName}
                onChangeText={setUserName}
                placeholder="Enter Username"
              />
            ) : (
              <Text
                style={[styles.name, { color: text }]}
                accessibilityLabel={`User's username: ${userName}`}
                accessibilityRole="text"
              >
                {userName || "No username set"}
              </Text>
            )}

            <Text style={[styles.subtext, { color: text }]}>
              User ID: {profile.userId || "Not generated"}
            </Text>

            <Text style={[styles.subtext, { color: text }]}>
              {profile?.tripCount || "0"} Trips Completed
            </Text>

            {profile.isVerified && (
              <Text style={[styles.subtext, { color: "green" }]}>Verified</Text>
            )}

            {profile.dateOfBirth && (
              <Text style={[styles.label, { color: text, fontSize: 14 }]}>
                DOB:{" "}
                {new Date(profile.dateOfBirth).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
            )}
            <Text style={[styles.label, { color: text, fontSize: 14 }]}>
              Gender: {gender || "Not specified"}
            </Text>

            <Text style={[styles.subtext, { color: text }]}>
              Availability: {availability ? "Available" : "Unavailable"}
            </Text>
          </View>
        </Animated.View>

        <View style={styles.infoContainer}>
          {renderField("First Name", firstName, editMode, setFirstName)}
          {renderField("Last Name", lastName, editMode, setLastName)}
          {renderField("Email", email, editMode, setEmail)}
          {renderField("Mobile Number", mobileNo, editMode, setMobileNo)}
          {renderField("Street", address.street || "", editMode, (text) =>
            setAddress((prev) => ({ ...prev, street: text }))
          )}
          {renderField("City", address.city || "", editMode, (text) =>
            setAddress((prev) => ({ ...prev, city: text }))
          )}
          {renderField("State", address.state || "", editMode, (text) =>
            setAddress((prev) => ({ ...prev, state: text }))
          )}
          {renderField("Country", address.country || "", editMode, (text) =>
            setAddress((prev) => ({ ...prev, country: text }))
          )}
          {renderField(
            "Postal Code",
            address.postalCode || "",
            editMode,
            (text) => setAddress((prev) => ({ ...prev, postalCode: text }))
          )}
        </View>

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
      <Modal
        animationType="fade"
        transparent={true}
        visible={previewVisible}
        onRequestClose={() => setPreviewVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalView, { backgroundColor: surface }]}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setPreviewVisible(false)}
              accessibilityLabel="Close Preview"
              accessibilityRole="button"
            >
              <MaterialIcons name="close" size={24} color={text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: text }]}>
              Profile Preview
            </Text>
            <ScrollView>
              <View style={styles.profileSection}>
                <Image
                  source={{ uri: photo || "https://via.placeholder.com/150" }}
                  style={styles.profileImage}
                />
                <View style={styles.nameSection}>
                  <Text style={[styles.name, { color: text }]}>
                    {firstName} {lastName}
                  </Text>
                  <Text style={[styles.subtext, { color: text }]}>
                    User ID: {profile.userId || "Not generated"}
                  </Text>
                  <Text style={[styles.subtext, { color: text }]}>
                    {profile?.tripCount || "0"} Trips Completed
                  </Text>
                  {profile.isVerified && (
                    <Text style={[styles.subtext, { color: "green" }]}>
                      Verified
                    </Text>
                  )}
                  <Text style={[styles.subtext, { color: text }]}>
                    Status: {profile.accountStatus}
                  </Text>
                </View>
              </View>
              <View style={styles.infoContainer}>
                {visibility.email && email ? (
                  <Text style={[styles.label, { color: text }]}>
                    Email: {email}
                  </Text>
                ) : null}
                {visibility.mobileNo && mobileNo ? (
                  <Text style={[styles.label, { color: text }]}>
                    Mobile: {mobileNo}
                  </Text>
                ) : null}
                {visibility.gender && gender ? (
                  <Text style={[styles.label, { color: text }]}>
                    Gender: {gender}
                  </Text>
                ) : null}
                {visibility.address && address ? (
                  <Text style={[styles.label, { color: text }]}>
                    Address:{" "}
                    {[
                      address.street,
                      address.city,
                      address.state,
                      address.country,
                      address.postalCode,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </Text>
                ) : null}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal
        animationType="fade"
        transparent={true}
        visible={settingsModalVisible}
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={styles.sidebarOverlay}>
          {/* Overlay background */}
          <TouchableOpacity
            style={styles.overlayTouchable}
            onPress={() => setSettingsModalVisible(false)}
            activeOpacity={1}
          />

          {/* Sidebar content */}
          <View style={[styles.sidebarContainer, { backgroundColor: surface }]}>
            {/* Topbar inside sidebar */}
            <View style={styles.topBar}>
              <Text style={[styles.topBarTitle, { color: text }]}>
                Settings
              </Text>
              <TouchableOpacity onPress={() => setSettingsModalVisible(false)}>
                <MaterialIcons name="close" size={28} color={text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.settingsContent}>
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  setEditMode(true);
                  setSettingsModalVisible(false);
                }}
              >
                <View style={styles.modalOptionRow}>
                  <MaterialIcons name="edit" size={24} color={text} />
                  <Text style={[styles.modalText, { color: text }]}>Edit</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  setVisibilityModal(true);
                  setSettingsModalVisible(false);
                }}
              >
                <View style={styles.modalOptionRow}>
                  <MaterialIcons name="visibility" size={24} color={text} />
                  <Text style={[styles.modalText, { color: text }]}>
                    Visibility
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalOption}
                onPress={handleDeleteProfile}
              >
                <View style={styles.modalOptionRow}>
                  <MaterialIcons name="delete" size={24} color={text} />
                  <Text style={[styles.modalText, { color: text }]}>
                    Delete
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  setSettingsModalVisible(false);
                  handleLogout();
                }}
              >
                <View style={styles.modalOptionRow}>
                  <MaterialIcons name="logout" size={24} color={text} />
                  <Text style={[styles.modalText, { color: text }]}>
                    Logout
                  </Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={visibilityModal}
        onRequestClose={() => setVisibilityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalView, { backgroundColor: surface }]}>
            <Text style={[styles.modalTitle, { color: text }]}>
              Profile Visibility
            </Text>
            <ScrollView>
              <TouchableOpacity
                style={styles.previewButton}
                onPress={() => setPreviewVisible(true)}
                accessibilityLabel="Preview Profile"
                accessibilityRole="button"
              >
                <MaterialIcons name="visibility" size={24} color={text} />
                <Text style={[styles.previewText, { color: text }]}>
                  Preview
                </Text>
              </TouchableOpacity>
              {renderVisibilityField("Email", "email")}
              {renderVisibilityField("Mobile Number", "mobileNo")}
              {renderVisibilityField("Address", "address")}

              {renderVisibilityField("Gender", "gender")}
              <View style={styles.visibilityField}></View>
            </ScrollView>
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                onPress={handleVisibilitySave}
                accessibilityLabel="Save Visibility Changes"
                accessibilityRole="button"
              >
                <Text style={styles.buttonText}>Save Changes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setVisibility(originalVisibility);
                  setVisibilityModal(false);
                }}
                accessibilityLabel="Cancel Visibility Changes"
                accessibilityRole="button"
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={previewVisible}
        onRequestClose={() => setPreviewVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalView, { backgroundColor: surface }]}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setPreviewVisible(false)}
              accessibilityLabel="Close Preview"
              accessibilityRole="button"
            >
              <MaterialIcons name="close" size={24} color={text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: text }]}>
              Profile Preview
            </Text>
            <ScrollView>
              <View style={styles.profileSection}>
                <Image
                  source={{ uri: photo || "https://via.placeholder.com/150" }}
                  style={styles.profileImage}
                />
                <View style={styles.nameSection}>
                  <Text style={[styles.name, { color: text }]}>
                    {userName || "No username set"}
                  </Text>

                  <Text style={[styles.subtext, { color: text }]}>
                    User ID: {profile.userId || "Not generated"}
                  </Text>
                  <Text style={[styles.subtext, { color: text }]}>
                    {profile?.tripCount || "0"} Trips Completed
                  </Text>
                  {profile.isVerified && (
                    <Text style={[styles.subtext, { color: "green" }]}>
                      Verified
                    </Text>
                  )}
                  <Text style={[styles.subtext, { color: text }]}>
                    Status: {profile.accountStatus}
                  </Text>
                </View>
              </View>
              <View style={styles.infoContainer}>
                {visibility.email && email ? (
                  <Text style={[styles.label, { color: text }]}>
                    Email: {email}
                  </Text>
                ) : null}
                {visibility.mobileNo && mobileNo ? (
                  <Text style={[styles.label, { color: text }]}>
                    Mobile: {mobileNo}
                  </Text>
                ) : null}
                {visibility.gender && gender ? (
                  <Text style={[styles.label, { color: text }]}>
                    Gender: {gender}
                  </Text>
                ) : null}
                {visibility.address && address ? (
                  <Text style={[styles.label, { color: text }]}>
                    Address:{" "}
                    {[
                      address.street,
                      address.city,
                      address.state,
                      address.country,
                      address.postalCode,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </Text>
                ) : null}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    flexGrow: 1,
  },
  container: { flex: 1 },
  scrollContent: { padding: 20, flexGrow: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingHorizontal: 10,
    width: "100%",
  },
  profileSection: { flexDirection: "row", alignItems: "center" },
  profileImage: {
    width: width * 0.2,
    height: width * 0.2,
    borderRadius: (width * 0.2) / 2,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  editPhotoButton: {
    padding: 3,
    borderRadius: 13,
    position: "flex-end",
    backgroundColor: "#76b6ff",
    top: 10,
    right: 10,
  },
  modalCloseButton: {
    backgroundColor: "#f0f0f0",
    padding: 4,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    top: 10,
    right: 10,
  },
  nameSection: {
    marginLeft: 15,
    marginRight: 15,
    flex: 1,
    flexDirection: "column",
  },
  subtext: {
    fontSize: 15,
    fontFamily: "SpaceMono",
    marginBottom: 4,
  },
  name: {
    fontSize: 28,
    fontWeight: "bold",
    fontFamily: "SpaceMono",
    letterSpacing: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  infoContainer: {
    alignItems: "center",
    padding: 15,
    marginTop: 20,
    marginRight: 10, marginBottom: 20,
  },
  fieldContainer: { width: "100%", marginBottom: 20 },
  label: {
    fontSize: 16,
    fontWeight: "500",
    fontFamily: "SpaceMono",
    marginBottom: 5,
  },
  input: {
    height: 50,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: "SpaceMono",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: "SpaceMono",
  },
  settingsContent: {
    padding: 16,
  },
  settingsCard: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 5,
  },

  inputText: {
    fontSize: 16,
    fontFamily: "SpaceMono",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1.5,
    marginHorizontal: 5,
    ...(Platform.OS === "ios"
      ? {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
        }
      : { elevation: 4 }),
  },
  buttonText: { fontSize: 16, fontWeight: "bold", fontFamily: "SpaceMono" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
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
    maxHeight: height * 0.8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  floatingCloseButton: {
    position: "absolute",
    top: 15,
    right: 15,
    backgroundColor: "#00000080", // semi-transparent black
    borderRadius: 20,
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6, // Android shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 10,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  photoModalView: {
    width: width * 0.9,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#ffffff90",
    borderRadius: 20,
    shadowColor: "black",
    borderWidth: 3,
    padding: 8,
    zIndex: 1,
  },

  sidebarOverlay: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.5)", // dim background
  },
  overlayTouchable: {
    flex: 1, // covers right side, closes on tap
  },
  sidebarContainer: {
    width: "70%", // sidebar width
    height: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },

  fullScreenImage: {
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: 12,
    resizeMode: "cover",
  },
  largePhoto: {
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: 12,
    marginBottom: 20,
  },
  modalChangeButton: {
    position: "absolute",
    top: 10,
    left: 10,
    padding: 10,
    borderRadius: 20,
    backgroundColor: "border" + 20,
  },
  modalCloseButton: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: 10,
    borderRadius: 20,
    backgroundColor: "text" + 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: "SpaceMono",
    marginBottom: 20,
    textAlign: "center",
  },
  modalOption: {
    paddingVertical: 15,
    justifyContent: "center",
    marginBottom: 10,
    paddingVertical: 18,
    width: "100%",
    justifyContent: "flex-start",
    paddingHorizontal: 20,
  },
  modalOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    alignItems: "center",
  },
  modalText: {
    fontSize: 18,
    textAlign: "center",
    fontFamily: "SpaceMono",
    marginLeft: 10,
    fontSize: 18,
    fontFamily: "SpaceMono",
    marginLeft: 12,
  },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: "#ccc",
    borderRadius: 2.5,
    alignSelf: "center",
    marginBottom: 10,
  },
  visibilityField: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  previewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  previewText: { marginLeft: 5, fontSize: 16, fontFamily: "SpaceMono" },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    borderWidth: 2,
    borderRadius: 8,
  },
  buttonContainer: {
    flexDirection: "row",
    color: "#fff",
    shadowColor: "black",
    justifyContent: "space-between",
    marginTop: 20,
  },
});
