import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  TextInput,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import PlacesAutocomplete from "@/app/PlacesAutocomplete";

const { width } = Dimensions.get("window");

export default function ProfileCard({
  profile,
  fields,
  setters,
  editMode,
  colors,
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
  } = fields;

  const { setEmail, setGender, setDateOfBirth, setAddress } = setters;
  const { text } = colors;

  // combine first + last name
  const fullName = `${firstName || ""} ${lastName || ""}`.trim() || "Not specified";

  return (
    <View style={styles.container}>
      {/* Banner + avatar */}
      <View style={styles.headerBanner}>
        <Image
          source={{ uri: photo || "https://via.placeholder.com/150" }}
          style={styles.avatar}
        />
      </View>

      {/* Name & email */}
      <View style={styles.topSection}>
        <Text style={[styles.name, { color: text }]}>{userName || "Unknown User"}</Text>
        <Text style={styles.email}>{email || "No email provided"}</Text>
        {profile?.isVerified && (
          <View style={styles.verifiedRow}>
            <MaterialIcons name="verified" size={18} color="#1DA1F2" />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        )}
      </View>

      {/* Info list */}
      <View style={styles.infoList}>
        {/* ✅ New Full Name row */}
        <InfoRow label="Full Name" value={firstName + " " + lastName} />

        <InfoRow label="User ID" value={profile?.userId || "Not generated"} />

        <InfoRow
          label="Date of Birth"
          value={
            dateOfBirth
              ? new Date(dateOfBirth).toLocaleDateString(undefined, {
                           day: "numeric",
                  month: "long",
                         year: "numeric",

                })
              : "Not specified"
          }
          onChange={setDateOfBirth}
          placeholder="DD-MM-YYYY"
          type="input"
        />
        <InfoRow
          label="Gender"
          value={gender || "Not specified"}
          onChange={setGender}
          type="picker"
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
          editMode={editMode}
          value={address?.addressString || address?.street || "Not specified"}
          type="places"
          onSelect={setAddress}
        />
      </View>
    </View>
  );
}

/* ---- Reusable InfoRow ---- */
function InfoRow({ label, value, editMode, onChange, type, placeholder, valueComponent, onSelect }) {
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
        ) : type === "picker" && editMode ? (
          <Picker selectedValue={value} onValueChange={onChange} style={styles.picker}>
            <Picker.Item label="Select Gender" value="" />
            <Picker.Item label="Female" value="Female" />
            <Picker.Item label="Male" value="Male" />
            <Picker.Item label="Non-binary" value="Non-binary" />
            <Picker.Item label="Other" value="Other" />
            <Picker.Item label="Prefer not to say" value="Prefer not to say" />
          </Picker>
        ) : type === "places" && editMode ? (
          <PlacesAutocomplete
            placeholder="Enter your location"
            value={value}
            onChangeText={(t) => onSelect((prev) => ({ ...prev, addressString: t }))}
            onSelect={(place) =>
              onSelect((prev) => ({
                ...prev,
                addressString: place?.description || "",
                lat: place?.lat,
                lng: place?.lng,
              }))
            }
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
  picker: {
    height: 40,
    color: "#111827",
  },
  badge: {
    fontSize: 13,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 10,
    overflow: "hidden",
    fontWeight: "600",
  },
});
