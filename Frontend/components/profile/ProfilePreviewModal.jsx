// components/profile/ProfilePreviewModal.jsx
import React from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

/**
 * ProfilePreviewModal
 * Props:
 *  - visible (boolean)
 *  - onClose (function)
 *  - profile (object)
 *  - photo (string)
 *  - text (color)
 *  - surface (color)
 *  - visibility (object)
 *  - email, mobileNo, gender, address, firstName, lastName, userName (string)
 */
export default function ProfilePreviewModal({
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
}) {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalView, { backgroundColor: surface }]}>
         <TouchableOpacity
  style={styles.closeButton}
  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
  activeOpacity={0.7}
  onPress={() => requestAnimationFrame(onClose)}
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
                <Text style={[styles.label, { color: text }]}>Email: {email}</Text>
              ) : null}

              {visibility?.mobileNo && mobileNo ? (
                <Text style={[styles.label, { color: text }]}>
                  Mobile: {mobileNo}
                </Text>
              ) : null}

              {visibility?.gender && gender ? (
                <Text style={[styles.label, { color: text }]}>
                  Gender: {gender}
                </Text>
              ) : null}

              {visibility?.address && address ? (
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
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalView: {
    width: "100%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    borderWidth: 2,
    borderRadius: 8,
    padding: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: "Arial",
    marginBottom: 20,
    textAlign: "center",
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    marginBottom: 15,
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
  subtext: {
    fontSize: 15,
    fontFamily: "Arial",
    marginBottom: 4,
  },
  infoContainer: {
    padding: 10,
    marginTop: 10,
  },
  label: {
    fontSize: 16,
    fontFamily: "Arial",
    marginBottom: 8,
  },
});
