import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import PlacesAutocomplete from "@/app/PlacesAutocomplete";
import { formatDatePretty } from "../../utils/dateUtils";

export default function ProfileCard({
  profile,
  fields,
  setters,
  editMode,
  colors,
  onSave,
  onCancel,
  saving,
}) {
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

  const { setUserName, setMobileNo, setAddress, setDateOfBirth, setShowDatePicker } =
    setters;
  const { text } = colors;

  const fullName =
    `${firstName || ""} ${lastName || ""}`.trim() || "Not specified";

  return (
    <View style={styles.container}>
      {/* Header Banner */}
      <View style={styles.headerBanner}>
        <Image
          source={{ uri: photo || "https://via.placeholder.com/150" }}
          style={styles.avatar}
        />
      </View>

      {/* Top Section */}
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

      {/* Info Fields */}
      <View style={styles.infoList}>
        <InfoRow label="Name" value={fullName} />

        {/* ✅ Username */}
        <InfoRow
          label="Username"
          value={userName}
          editMode={editMode}
          type="input"
          onChange={setUserName}
          placeholder="Enter your username"
        />

        <InfoRow label="User ID" value={profile?.userId || "Not generated"} />

        <InfoRow
          label="Date of Birth"
          value={formatDatePretty(fields.dateOfBirth)}
          editMode={false} 
        />

        <InfoRow label="Gender" value={gender || "Not specified"} />

        {/* ✅ Mobile Number */}
        <InfoRow
          label="Mobile Number"
          value={mobileNo}
          editMode={editMode}
          type="input"
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
          value={address?.addressString || null }
          editMode={editMode}
          type="places"
          onChange={(text) => setAddress(prev => ({ ...prev, addressString: text }))}
          onSelect={(place) => setAddress(prev => ({
            ...prev,
            addressString: place.description,
            lat: place.lat,
            lng: place.lng,
            city: place.city || prev.city,
            state: place.state || prev.state,
            postalCode: place.postalCode || prev.postalCode,
          }))}
        />

        {/* ✅ Save / Cancel Buttons */}
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
}

/* ---- Reusable InfoRow ---- */
function InfoRow({
  label,
  value,
  editMode,
  onChange,
  onSelect,
  type,
  placeholder,
  valueComponent,
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueWrap}>
        {valueComponent ? (
          valueComponent
        ) : type === "input" && editMode ? (
          <TextInput
            style={styles.input}
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
}

/* ---- Styles ---- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  headerBanner: {
    backgroundColor: "#953DED",
    height: 120,
    justifyContent: "center",
    alignItems: "center",
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
  topSection: {
    alignItems: "center",
    marginTop: 60,
    marginBottom: 16,
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Arial",
  },
  email: {
    color: "#6B7280",
    fontSize: 14,
    marginTop: 4,
  },
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  verifiedText: {
    fontSize: 13,
    color: "#1DA1F2",
    marginLeft: 4,
  },
  infoList: {
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: "#fff",
  },
  row: {
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingVertical: 10,
    borderBottomWidth: 0.8,
    borderColor: "#F3F4F6",
  },
  label: {
    width: 110,
    textAlign: "right",
    fontSize: 15,
    color: "#6B7280",
    fontFamily: "Arial",
    paddingRight: 10,
  },
  valueWrap: {
    flex: 1,
    justifyContent: "center",
  },
  value: {
    fontSize: 15,
    color: "#111827",
    fontFamily: "Arial",
    fontWeight: "500",
    textAlign: "left",
  },
  input: {
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
  badge: {
    fontSize: 13,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 10,
    overflow: "hidden",
    fontWeight: "600",
  },
  editButtons: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginTop: 25,
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
});
