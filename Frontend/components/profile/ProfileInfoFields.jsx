import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { Picker } from "@react-native-picker/picker";
import PlacesAutocomplete from "@/app/PlacesAutocomplete";

export default function ProfileInfoFields({
  fields,
  setters,
  editMode,
  colors,
}) {
  const { firstName, lastName, email, mobileNo, address, gender, dateOfBirth } =
    fields;
  const { setEmail, setMobileNo, setAddress, setGender, setDateOfBirth } =
    setters;
  const { text } = colors;

  return (
    <View style={styles.card}>
      {/* Full Name */}
      <View style={styles.row}>
        <Text style={styles.label}>Full Name</Text>
        <Text style={styles.value}>
          {`${firstName || ""} ${lastName || ""}`.trim() || "Not specified"}
        </Text>
      </View>

      <View style={styles.separator} />

      {/* Email */}
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

      {/* Mobile Number */}
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

      {/* Date of Birth */}
      <View style={styles.row}>
        <Text style={styles.label}>Date of Birth</Text>
        {editMode ? (
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={dateOfBirth || ""}
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

      {/* Gender */}
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
            <Picker.Item
              label="Prefer not to say"
              value="Prefer not to say"
            />
          </Picker>
        ) : (
          <Text style={styles.value}>{gender || "Not specified"}</Text>
        )}
      </View>

      <View style={styles.separator} />

      {/* Location */}
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
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginBottom: 25,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  label: {
    fontSize: 15,
    color: "#6B7280",
    fontFamily: "Arial",
    flex: 1.3,
  },
  value: {
    fontSize: 15,
    color: "#111827",
    fontFamily: "Arial",
    fontWeight: "500",
    flex: 2,
    textAlign: "right",
  },
  input: {
    flex: 2,
    height: 40,
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#F9FAFB",
    textAlign: "right",
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
});
