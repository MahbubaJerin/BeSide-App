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
  TouchableOpacity,
  Dimensions,
  Modal,
  Animated,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { BASE_URL } from "../config";

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
        Alert.alert("Success", "Profile Updated");
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

  const handleVisibilitySave = async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) {
      Alert.alert("Error", "Authentication token missing. Please log in again.");
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
      Alert.alert("Error", "Failed to save visibility: " + e.message);
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
                Alert.alert("Error", data.message || "Failed to delete profile.");
              }
            } catch (e) {
              Alert.alert("Error", "Failed to delete profile: " + e.message);
            }
          },
        },
      ]
    );
  };

  const renderVisibilityField = (label, fieldKey) => (
    <View style={styles.visibilityField}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        onPress={() => toggleVisibility(fieldKey)}
        accessibilityLabel={`Toggle ${label} visibility`}
        accessibilityRole="button"
      >
        <MaterialIcons
          name={visibility[fieldKey] ? "visibility" : "visibility-off"}
          size={24}
          color="#333"
        />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1c52c8" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>Failed to load profile</Text>
        <TouchableOpacity onPress={fetchProfile} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Modern Gradient Header */}
        <View style={styles.gradientHeader}>
          {/* Top Navigation */}
          <View style={styles.topNav}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => router.back()}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Profile</Text>

            <TouchableOpacity
              style={styles.navButton}
              onPress={() => setSettingsModalVisible(true)}
              accessibilityLabel="Open Settings"
              accessibilityRole="button"
            >
              <MaterialIcons name="more-vert" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Profile Photo Section */}
          <Animated.View style={[styles.profilePhotoSection, { opacity: fadeAnim }]}>
            <TouchableOpacity
              onPress={() => setPhotoModalVisible(true)}
              accessibilityLabel="View or change profile photo"
              accessibilityRole="button"
            >
              <Image
                source={{ uri: photo || "https://via.placeholder.com/150" }}
                style={styles.profileImage}
                accessibilityLabel="User's profile photo"
              />
            </TouchableOpacity>

            {editMode && (
              <TouchableOpacity
                style={styles.editPhotoButton}
                onPress={pickImage}
                accessibilityLabel="Change Profile Photo"
                accessibilityRole="button"
              >
                <MaterialIcons name="camera-alt" size={20} color="#fff" />
              </TouchableOpacity>
            )}

            {/* Username */}
            <Text style={styles.userName}>{userName || "lululemom"}</Text>
            <Text style={styles.userEmail}>{email || "lululemom@gmail.com"}</Text>
            
            {/* Verified Badge */}
            {profile.isVerified && (
              <View style={styles.verifiedBadge}>
                <MaterialIcons name="verified" size={14} color="#2ca07b" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </Animated.View>
        </View>

        {/* Profile Details Card */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Name:</Text>
            {editMode ? (
              <View style={styles.editFieldRow}>
                <TextInput
                  style={[styles.editInput, { marginRight: 5 }]}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First"
                  placeholderTextColor="#999"
                />
                <TextInput
                  style={styles.editInput}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last"
                  placeholderTextColor="#999"
                />
              </View>
            ) : (
              <Text style={styles.detailValue}>
                {firstName && lastName ? `${firstName} ${lastName}` : "Lulu Orange"}
              </Text>
            )}
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Username:</Text>
            {editMode ? (
              <TextInput
                style={[styles.editInput, { flex: 0.6 }]}
                value={userName}
                onChangeText={setUserName}
                placeholder="Username"
                placeholderTextColor="#999"
              />
            ) : (
              <Text style={styles.detailValue}>{userName || "lululemom"}</Text>
            )}
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>User ID:</Text>
            <Text style={styles.detailValue}>{profile.userId || "XXX-XXX-754428"}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date of Birth:</Text>
            <Text style={styles.detailValue}>
              {profile.dateOfBirth
                ? new Date(profile.dateOfBirth).toLocaleDateString()
                : "2 October 2004"}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Gender:</Text>
            {editMode ? (
              <View style={[styles.pickerContainer, { flex: 0.6 }]}>
                <Picker
                  selectedValue={gender}
                  onValueChange={(itemValue) => setGender(itemValue)}
                  style={styles.picker}
                >
                  <Picker.Item label="Select" value="" />
                  <Picker.Item label="Female" value="Female" />
                  <Picker.Item label="Male" value="Male" />
                  <Picker.Item label="Non-binary" value="Non-binary" />
                  <Picker.Item label="Other" value="Other" />
                </Picker>
              </View>
            ) : (
              <Text style={styles.detailValue}>{gender || "non-binary"}</Text>
            )}
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Mobile:</Text>
            {editMode ? (
              <TextInput
                style={[styles.editInput, { flex: 0.6 }]}
                value={mobileNo}
                onChangeText={setMobileNo}
                placeholder="Mobile"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.detailValue}>{mobileNo || "0452500023"}</Text>
            )}
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Availability:</Text>
            <View style={[styles.availabilityContainer, { flex: 0.6, justifyContent: "flex-end" }]}>
              <View style={[styles.statusDot, availability ? styles.statusActive : styles.statusInactive]} />
              <Text style={styles.detailValue}>{availability ? "Active" : "Inactive"}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Location:</Text>
            {editMode ? (
              <View style={[styles.addressEditContainer, { flex: 0.6 }]}>
                <TextInput
                  style={styles.editInput}
                  value={address.street || ""}
                  onChangeText={(text) => setAddress((prev) => ({ ...prev, street: text }))}
                  placeholder="Street"
                  placeholderTextColor="#999"
                />
                <TextInput
                  style={[styles.editInput, { marginTop: 5 }]}
                  value={address.city || ""}
                  onChangeText={(text) => setAddress((prev) => ({ ...prev, city: text }))}
                  placeholder="City"
                  placeholderTextColor="#999"
                />
              </View>
            ) : (
              <Text style={[styles.detailValue, { flex: 0.6 }]} numberOfLines={2}>
                {address.street && address.city
                  ? `${address.street}, ${address.city}${address.state ? `, ${address.state}` : ""}`
                  : "12 Coe Street, Laverton VIC, Australia"}
              </Text>
            )}
          </View>

          {/* Action Buttons */}
          {editMode && (
            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => {
                  setEditMode(false);
                  fetchProfile();
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.saveButton]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Photo Preview Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={photoModalVisible}
        onRequestClose={() => setPhotoModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.photoModalView}>
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

      {/* Settings Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={settingsModalVisible}
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={styles.sidebarOverlay}>
          <TouchableOpacity
            style={styles.overlayTouchable}
            onPress={() => setSettingsModalVisible(false)}
            activeOpacity={1}
          />

          <View style={styles.sidebarContainer}>
            <View style={styles.topBar}>
              <Text style={styles.topBarTitle}>Settings</Text>
              <TouchableOpacity onPress={() => setSettingsModalVisible(false)}>
                <MaterialIcons name="close" size={28} color="#333" />
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
                  <MaterialIcons name="edit" size={24} color="#333" />
                  <Text style={styles.modalText}>Edit</Text>
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
                  <MaterialIcons name="visibility" size={24} color="#333" />
                  <Text style={styles.modalText}>Visibility</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalOption}
                onPress={handleDeleteProfile}
              >
                <View style={styles.modalOptionRow}>
                  <MaterialIcons name="delete" size={24} color="#e32002" />
                  <Text style={[styles.modalText, { color: "#e32002" }]}>Delete</Text>
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
                  <MaterialIcons name="logout" size={24} color="#333" />
                  <Text style={styles.modalText}>Logout</Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Visibility Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={visibilityModal}
        onRequestClose={() => setVisibilityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Profile Visibility</Text>
            <ScrollView style={{ maxHeight: height * 0.6 }}>
              {renderVisibilityField("Email", "email")}
              {renderVisibilityField("Mobile Number", "mobileNo")}
              {renderVisibilityField("Address", "address")}
              {renderVisibilityField("Gender", "gender")}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => {
                  setVisibility(originalVisibility);
                  setVisibilityModal(false);
                }}
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveModalButton]}
                onPress={handleVisibilitySave}
              >
                <Text style={styles.saveModalText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 15,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#1c52c8",
    borderRadius: 8,
  },
  retryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  
  // Header Styles
  gradientHeader: {
    backgroundColor: "#8c52ff", // Purple gradient
    paddingTop: Platform.OS === "ios" ? 50 : 30,
    paddingBottom: 30,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  topNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    letterSpacing: 0.5,
  },
  
  // Profile Photo Section
  profilePhotoSection: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: "#fff",
    marginBottom: 15,
  },
  editPhotoButton: {
    position: "absolute",
    top: 70,
    right: width / 2 - 60,
    backgroundColor: "#1c52c8",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  userName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8f5f1",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  verifiedText: {
    color: "#2ca07b",
    fontSize: 11,
    fontWeight: "500",
    marginLeft: 4,
  },
  genderBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginTop: 5,
  },
  genderText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 4,
  },
  
  // Details Card
  detailsCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: -15,
    borderRadius: 15,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#e8f1ff",
  },
  editButtonText: {
    color: "#1c52c8",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 4,
  },
  
  // Detail Rows
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "400",
    flex: 0.4,
  },
  detailValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
    flex: 0.6,
    textAlign: "right",
  },
  
  // Edit Mode
  editFieldRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    flex: 0.6,
    gap: 5,
  },
  editInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: "#333",
    backgroundColor: "#f9f9f9",
  },
  addressEditContainer: {
    marginTop: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
    marginTop: 4,
  },
  picker: {
    height: 50,
    color: "#333",
  },
  
  // Availability
  availabilityContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusActive: {
    backgroundColor: "#2ca07b",
  },
  statusInactive: {
    backgroundColor: "#e32002",
  },
  
  // Action Buttons
  editActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#f0f0f0",
  },
  cancelButtonText: {
    color: "#333",
    fontSize: 14,
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#1c52c8",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  
  // Modals
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  photoModalView: {
    width: width * 0.9,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  fullScreenImage: {
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: 12,
  },
  floatingCloseButton: {
    position: "absolute",
    top: 15,
    right: 15,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 20,
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  
  // Settings Sidebar
  sidebarOverlay: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  overlayTouchable: {
    flex: 1,
  },
  sidebarContainer: {
    width: "70%",
    height: "100%",
    backgroundColor: "#fff",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    marginTop: Platform.OS === "ios" ? 40 : 0,
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  settingsContent: {
    padding: 16,
  },
  modalOption: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalOptionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalText: {
    fontSize: 16,
    marginLeft: 12,
    color: "#333",
  },
  
  // Visibility Modal
  modalView: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    maxHeight: height * 0.8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  visibilityField: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  label: {
    fontSize: 14,
    color: "#333",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelModalButton: {
    backgroundColor: "#f0f0f0",
  },
  cancelModalText: {
    color: "#333",
    fontSize: 14,
    fontWeight: "600",
  },
  saveModalButton: {
    backgroundColor: "#1c52c8",
  },
  saveModalText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
