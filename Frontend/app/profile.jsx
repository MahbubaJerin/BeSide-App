import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  TouchableOpacity,
  Dimensions,
  Modal,
  Animated,
  Switch,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { BASE_URL } from "../config";
import { useThemeColor } from "@/hooks/useThemeColor";
import PlacesAutocomplete from "./PlacesAutocomplete";
import { formatDateYMD, formatDatePretty } from "../utils/dateUtils";

const API_BASE_URL = `${BASE_URL}api/v1/user`;
const { width, height } = Dimensions.get("window");

const ProfileHeader = ({ onSettingsPress, text, border }) => {
  const handleGoBack = () => {
    try {
      console.log("Header back pressed");
      router.back();
      setTimeout(() => {
        router.replace("/");
      }, 300);
    } catch (e) {
      console.warn("Back navigation failed:", e.message);
    }
  };

  return (
    <View style={styles.headerStyle}>
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
};

const ProfileInfoFields = ({ fields, setters, editMode, colors }) => {
  const { firstName, lastName, email, mobileNo, address, gender, dateOfBirth } =
    fields;
  const { setEmail, setMobileNo, setAddress, setGender, setDateOfBirth } =
    setters;
  const { text } = colors;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.label}>Full Name</Text>
        <Text style={styles.value}>
          {`${firstName || ""} ${lastName || ""}`.trim() || "Not specified"}
        </Text>
      </View>
      <View style={styles.separator} />
      <View style={styles.row}>
        <Text style={styles.label}>Email</Text>
        {editMode ? (
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        ) : (
          <Text style={styles.value}>{email || "Not specified"}</Text>
        )}
      </View>
      <View style={styles.separator} />
      <View style={styles.row}>
        <Text style={styles.label}>Mobile Number</Text>
        {editMode ? (
          <TextInput
            style={styles.input}
            value={mobileNo}
            onChangeText={setMobileNo}
            keyboardType="phone-pad"
          />
        ) : (
          <Text style={styles.value}>{mobileNo || "Not specified"}</Text>
        )}
      </View>
      <View style={styles.separator} />
      <View style={styles.row}>
        <Text style={styles.label}>Date of Birth</Text>
        {editMode ? (
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={dateOfBirth ? formatDateYMD(dateOfBirth) : ""}
            onChangeText={setDateOfBirth}
          />
        ) : (
          <Text style={styles.value}>
            {dateOfBirth
              ? new Date(dateOfBirth).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : "Not specified"}
          </Text>
        )}
      </View>
      <View style={styles.separator} />
      <View style={styles.row}>
        <Text style={styles.label}>Gender</Text>
        {editMode ? (
          <Picker
            selectedValue={gender}
            onValueChange={(val) => setGender(val)}
            style={styles.picker}
          >
            <Picker.Item label="Select Gender" value="" />
            <Picker.Item label="Female" value="Female" />
            <Picker.Item label="Male" value="Male" />
            <Picker.Item label="Non-binary" value="Non-binary" />
            <Picker.Item label="Other" value="Other" />
            <Picker.Item label="Prefer not to say" value="Prefer not to say" />
          </Picker>
        ) : (
          <Text style={styles.value}>{gender || "Not specified"}</Text>
        )}
      </View>
      <View style={styles.separator} />
      <View style={styles.row}>
        <Text style={styles.label}>Location</Text>
        {editMode ? (
          <PlacesAutocomplete
            placeholder="Enter your location"
            value={address?.addressString || ""}
            onChangeText={(t) =>
              setAddress((prev) => ({ ...prev, addressString: t }))
            }
            onSelect={(place) =>
              setAddress((prev) => ({
                ...prev,
                addressString: place?.description || "",
                lat: place?.lat,
                lng: place?.lng,
              }))
            }
          />
        ) : (
          <Text style={styles.value}>
            {address?.addressString || address?.street || "Not specified"}
          </Text>
        )}
      </View>
    </View>
  );
};

const ProfileCard = ({
  profile,
  fields,
  setters,
  editMode,
  colors,
  onSave,
  onCancel,
  saving,
  onPickImage,
}) => {
  const {
    photo,
    userName,
    email,
    gender,
    availability,
    dateOfBirth,
    address,
    firstName,
    lastName,
    mobileNo,
  } = fields;
  const {
    setUserName,
    setMobileNo,
    setAddress,
    setDateOfBirth,
    setShowDatePicker,
  } = setters;
  const { text } = colors;
  const fullName =
    `${firstName || ""} ${lastName || ""}`.trim() || "Not specified";

  return (
    <View style={styles.profileCardContainer}>
      <View style={styles.headerBanner}>
        <View style={styles.headerInner}>
          <TouchableOpacity
            onPress={onPickImage}
            accessibilityLabel="Change profile photo"
          >
            <Image
              source={{ uri: photo || "https://via.placeholder.com/150" }}
              style={styles.profileImageCard}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.topSection}>
        <Text style={[styles.name, { color: text }]}>
          {userName || "Unknown User"}
        </Text>
        <Text style={styles.email}>{email || "No email provided"}</Text>
        {profile?.isVerified && (
          <View style={styles.verifiedRow}>
            <MaterialIcons name="verified" size={18} color="#1DA1F2" />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        )}
      </View>
      <View style={styles.infoList}>
        <InfoRow label="Name" value={fullName} />
        <InfoRow
          label="Username"
          value={userName}
          editMode={editMode}
          type="inputCard"
          onChange={setUserName}
          placeholder="Enter your username"
        />
        <InfoRow label="User ID" value={profile?.userId || "Not generated"} />
        <InfoRow
          label="Date of Birth"
          value={formatDatePretty(dateOfBirth)}
          editMode={false}
        />
        <InfoRow label="Gender" value={gender || "Not specified"} />
        <InfoRow
          label="Mobile Number"
          value={mobileNo}
          editMode={editMode}
          type="inputCard"
          onChange={setMobileNo}
          placeholder="Enter your mobile number"
        />
        <InfoRow
          label="Availability"
          valueComponent={
            <Text
              style={[
                styles.badge,
                {
                  backgroundColor: availability ? "#DCFCE7" : "#FEE2E2",
                  color: availability ? "#166534" : "#991B1B",
                },
              ]}
            >
              {availability ? "Active" : "Inactive"}
            </Text>
          }
        />
        <InfoRow
          label="Location"
          value={address?.addressString || null}
          editMode={editMode}
          type="places"
          onChange={(text) =>
            setAddress((prev) => ({ ...prev, addressString: text }))
          }
          onSelect={(place) =>
            setAddress((prev) => ({
              ...prev,
              addressString: place.description,
              lat: place.lat,
              lng: place.lng,
              city: place.city || prev.city,
              state: place.state || prev.state,
              postalCode: place.postalCode || prev.postalCode,
            }))
          }
        />
        {editMode && (
          <View style={styles.editButtons}>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={onSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Save Profile</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
            >
              <Text style={[styles.buttonText, { color: "#111827" }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const InfoRow = ({
  label,
  value,
  editMode,
  onChange,
  onSelect,
  type,
  placeholder,
  valueComponent,
}) => {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueWrap}>
        {valueComponent ? (
          valueComponent
        ) : (type === "input" || type === "inputCard") && editMode ? (
          <TextInput
            style={styles.inputCard}
            placeholder={placeholder}
            value={value}
            onChangeText={onChange}
          />
        ) : type === "places" && editMode ? (
          <PlacesAutocomplete
            placeholder="Enter your location"
            value={value}
            onChangeText={onChange}
            onSelect={onSelect}
          />
        ) : (
          <Text style={styles.value}>{value}</Text>
        )}
      </View>
    </View>
  );
};

const ProfileSettingsSidebar = ({
  visible,
  onClose,
  onEdit,
  onVisibility,
  onDelete,
  onLogout,
  text,
}) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.overlayTouchable} onPress={onClose} />
        <View style={styles.sidebar}>
          <View style={styles.headerSettings}>
            <Text style={styles.headerTitleSettings}>Settings</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={26} color="#111827" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.sectionTitle}>Profile</Text>
            <SidebarItem
              icon="edit"
              label="Edit Profile"
              onPress={() => {
                onEdit();
                onClose();
              }}
            />
            <SidebarItem
              icon="visibility"
              label="Profile Visibility"
              onPress={() => {
                onVisibility();
                onClose();
              }}
            />
            <Text style={styles.sectionTitle}>Account</Text>
            <SidebarItem
              icon="delete-outline"
              label="Delete Account"
              danger
              onPress={onDelete}
            />
            <SidebarItem icon="logout" label="Logout" onPress={onLogout} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const SidebarItem = ({ icon, label, onPress, danger }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.item, danger && { backgroundColor: "#FEF2F2" }]}
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
};

const ProfileVisibilityModal = ({
  visible,
  onClose,
  onSave,
  onPreview,
  onCancel,
  visibility,
  onToggleVisibility,
  text,
  surface,
}) => {
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
        style={styles.modalOverlay1}
        activeOpacity={1}
        onPress={handleClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.modalView, { backgroundColor: surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.headerVisibility}>
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
                name={showPreview ? "visibility" : "visibility-off"}
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
};

const ProfilePreviewModal = ({
  visible,
  onClose,
  profile,
  photo,
  text,
  surface,
  visibility,
  email,
  mobileNo,
  gender,
  address,
  firstName,
  lastName,
  userName,
}) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.modalPreview, { backgroundColor: surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          <TouchableOpacity
            style={styles.closeButtonPreview}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={onClose}
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
                  {userName || `${firstName} ${lastName}` || "No username set"}
                </Text>
                <Text style={[styles.subtext, { color: text }]}>
                  User ID: {profile?.userId || "Not generated"}
                </Text>
                <Text style={[styles.subtext, { color: text }]}>
                  {profile?.tripCount || "0"} Trips Completed
                </Text>

                {profile?.isVerified && (
                  <Text style={[styles.subtext, { color: "green" }]}>
                    Verified
                  </Text>
                )}
                <Text style={[styles.subtext, { color: text }]}>
                  Status: {profile?.accountStatus || "Active"}
                </Text>
              </View>
            </View>
            <View style={styles.infoContainer}>
              {visibility?.email && email ? (
                <Text style={[styles.labelPreview, { color: text }]}>
                  Email: {email}
                </Text>
              ) : null}
              {visibility?.mobileNo && mobileNo ? (
                <Text style={[styles.labelPreview, { color: text }]}>
                  Mobile: {mobileNo}
                </Text>
              ) : null}
              {visibility?.gender && gender ? (
                <Text style={[styles.labelPreview, { color: text }]}>
                  Gender: {gender}
                </Text>
              ) : null}
              {visibility?.address && address ? (
                <Text style={[styles.labelPreview, { color: text }]}>
                  Address:{" "}
                  {[
                    address.addressString,
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
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

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
    lng: null,
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
  const [tempVisibility, setTempVisibility] = useState({
    email: true,
    mobileNo: true,
    address: true,
    gender: true,
  });
  const [previewVisibility, setPreviewVisibility] = useState(null);
  const [isPublic, setIsPublic] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const text = useThemeColor({}, "text");
  const surface = useThemeColor({}, "surface");
  const border = useThemeColor({}, "outline");

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
      console.log("Fetched profile data:", data);
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
        setDateOfBirth(user.dob ? new Date(user.dob) : null);
        setAddress({
          addressString: user.address?.street || "",
          city: user.address?.city || "",
          state: user.address?.state || "",
          postalCode: user.address?.postalCode || "",
          country: user.address?.country || "Australia",
          countryCode: user.address?.countryCode || "AU",
          lat: user.geo?.lat || null,
          lng: user.geo?.lng || null,
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
      console.error("Fetch profile error:", e.message);
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
            mediaTypes: ImagePicker.MediaType.Images,
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
            mediaTypes: ImagePicker.MediaType.Images,
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

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const age = new Date().getFullYear() - selectedDate.getFullYear();
      if (age < 13) {
        Alert.alert("Invalid Age", "You must be at least 13 years old.");
        return;
      }
      setDateOfBirth(selectedDate);
    }
  };

  const handleSave = async () => {
    if (!userName || !userName.trim()) {
      Alert.alert("Validation Error", "Username is required.");
      return;
    }
    if (!mobileNo || !mobileNo.trim()) {
      Alert.alert("Validation Error", "Mobile number is required.");
      return;
    }
    if (dateOfBirth) {
      const age = new Date().getFullYear() - dateOfBirth.getFullYear();
      if (age < 13) {
        Alert.alert("Invalid Age", "You must be at least 13 years old.");
        return;
      }
    }
    const payload = {
      userName: userName.trim(),
      firstName,
      lastName,
      email: email.trim(),
      mobileNo: mobileNo.trim(),
      gender,
      address: {
        street: address.addressString,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
        countryCode: address.countryCode,
        dob: dateOfBirth ? dateOfBirth.toISOString() : null,
      },
      geo:
        address.lat && address.lng
          ? {
              lat: Number(address.lat),
              lng: Number(address.lng),
            }
          : null,
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
      console.log("Profile update payload:", payload);
      const data = await res.json();
      if (res.ok) {
        Alert.alert("Success", "Profile updated successfully");
        setEditMode(false);
        await fetchProfile();
      } else {
        throw new Error(data.message || "Failed to update profile");
      }
    } catch (e) {
      console.error("Profile update error:", e);
      Alert.alert("Error", "Failed to update profile: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleVisibilitySave = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        throw new Error("No auth token found");
      }
      const sharedInfo = Object.entries(tempVisibility)
        .filter(([_, value]) => value)
        .map(([key]) => key);
      const payload = { public: isPublic, sharedInfo };
      const response = await fetch(`${API_BASE_URL}/profile-settings`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to update visibility");
      }
      setVisibility(tempVisibility);
      setOriginalVisibility(tempVisibility);
      setVisibilityModal(false);
      Alert.alert("Success", "Visibility settings updated");
      await fetchProfile();
    } catch (error) {
      console.error("Visibility update error:", error);
      Alert.alert(
        "Error",
        "Failed to update visibility settings: " + error.message
      );
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
              console.error("Profile deletion error:", e);
              Alert.alert("Error", "Failed to delete profile: " + e.message);
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        onPress: async () => {
          try {
            await AsyncStorage.removeItem("token");
            Alert.alert("Success", "Logged out");
            router.replace("/login");
          } catch (e) {
            console.error("Logout error:", e);
            Alert.alert("Error", "Failed to logout: " + e.message);
          }
        },
      },
    ]);
  };

  const handleToggleVisibility = (field) => {
    const newVisibility = {
      ...tempVisibility,
      [field]: !tempVisibility[field],
    };
    setTempVisibility(newVisibility);
    setPreviewVisibility(newVisibility);
  };

  const handleShowPreview = () => {
    setPreviewVisibility(tempVisibility);
    setPreviewVisible(true);
  };

  const handleVisibilityClose = () => {
    setVisibilityModal(false);
    setTempVisibility(visibility);
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
      <ProfileHeader
        onSettingsPress={() => setSettingsModalVisible(true)}
        text={text}
        border={border}
      />
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
            onPickImage={pickImage}
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
      <ProfileSettingsSidebar
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
      />
      <ProfileVisibilityModal
        visible={visibilityModal}
        onClose={handleVisibilityClose}
        onSave={handleVisibilitySave}
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

  // ProfileHeader Styles
  headerStyle: {
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
    fontFamily: "Arial",
    letterSpacing: 1,
    zIndex: 0,
  },
  // ProfileInfoFields Styles
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    marginBottom: 25,
  },

  infoList: {
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingVertical: 8,
  },
  label: {
    width: 120,
    textAlign: "right",
    paddingRight: 12,
    color: "#6B7280",
    fontSize: 15,
    fontFamily: "Arial",
  },
  value: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    fontFamily: "Arial",
    fontWeight: "500",
    textAlign: "left",
  },
  input: {
    flex: 1,
    height: 40,
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#F9FAFB",
    textAlign: "left",
  },

  picker: {
    flex: 2,
    height: 40,
    color: "#111827",
  },
  separator: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 4,
  },
  // ProfileCard Styles
  profileCardContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  headerBanner: {
    backgroundColor: "#953DED",
    height: 130,
    justifyContent: "center",
    alignItems: "center",
  },

  headerInner: {
    position: "absolute",
    bottom: -45, // profile image overlaps the banner
    alignItems: "center",
    width: "100%",
  },

  profileImageCard: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: "#fff",
    backgroundColor: "#e5e5e5",
  },
  topSection: {
    marginTop: 60, // gives space below the banner overlap
    alignItems: "center",
  },

  inputCard: {
    height: 40,
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#F9FAFB",
    textAlign: "left",
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    position: "absolute",
    bottom: -45,
    borderWidth: 3,
    borderColor: "#fff",
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 8,
    color: "#111827",
  },
  email: {
    fontSize: 14,
    color: "#6B7280",
  },

  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },
  verifiedText: {
    color: "#1DA1F2",
    fontSize: 13,
    fontFamily: "Arial",
    marginLeft: 4,
  },

  valueWrap: {
    flex: 1,
    justifyContent: "center",
  },
  badge: {
    fontSize: 13,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#DCFCE7",
    color: "#166534",
    fontWeight: "600",
  },
  editButtons: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginTop: 28,
    marginBottom: 40,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  saveButton: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  cancelButton: {
    backgroundColor: "#fff",
    borderColor: "#111827",
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
  },

  // ProfileSettingsSidebar Styles
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
  headerSettings: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitleSettings: {
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
  // ProfileVisibilityModal Styles
  modalOverlay1: {
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
    shadowRadius: 4,
    elevation: 5,
  },
  headerVisibility: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  closeButton: {
    position: "absolute",
    right: 15,
    zIndex: 1,
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.05)",
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
  // ProfilePreviewModal Styles
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    marginBottom: 15,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalPreview: {
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
  profileImage: {
    width: width * 0.2,
    height: width * 0.2,
    borderRadius: (width * 0.2) / 2,
    marginRight: 15,
  },
  nameSection: {
    flex: 1,
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    fontFamily: "Arial",
  },
  closeButtonPreview: {
    position: "absolute",
    top: 15,
    right: 15,
    zIndex: 1,
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  subtext: {
    fontSize: 15,
    fontFamily: "Arial",
    marginBottom: 4,
  },
  infoContainer: {
    padding: 10,
    marginTop: 10,
  },
  labelPreview: {
    fontSize: 16,
    fontFamily: "Arial",
    marginBottom: 8,
  },
});
