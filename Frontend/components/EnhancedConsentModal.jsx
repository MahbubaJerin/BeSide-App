// Frontend/components/EnhancedConsentModal.jsx
import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from "react-native";
import { ThemedButton } from "@/components/ThemedButton";
import { Colors } from "@/constants/Colors";

export default function EnhancedConsentModal({ 
  visible, 
  onClose, 
  onSubmit, 
  userRole = "sender", // "sender" or "receiver"
  requestDetails = null // Trip request details for receiver
}) {
  const [consent, setConsent] = useState({
    noTouch: false,
    respectful: false,
    safety: false,
    route: false // New: receiver agrees to route/meeting point
  });

  const isComplete = consent.noTouch && consent.respectful && consent.safety && 
    (userRole === "sender" || consent.route);

  const handleSubmit = () => {
    if (isComplete) {
      onSubmit(consent);
      onClose();
    }
  };

  const renderSenderConsent = () => (
    <ScrollView style={{ marginBottom: 16 }}>
      <Text style={styles.description}>
        As a companion seeker, you agree to the following safety guidelines:
      </Text>

      <View style={styles.row}>
        <Switch
          value={consent.noTouch}
          onValueChange={() =>
            setConsent({ ...consent, noTouch: !consent.noTouch })
          }
          trackColor={{ false: '#ccc', true: Colors.light.tint }}
        />
        <Text style={styles.label}>I agree to the no-touch rule during the entire trip</Text>
      </View>

      <View style={styles.row}>
        <Switch
          value={consent.respectful}
          onValueChange={() =>
            setConsent({ ...consent, respectful: !consent.respectful })
          }
          trackColor={{ false: '#ccc', true: Colors.light.tint }}
        />
        <Text style={styles.label}>I will maintain respectful behavior and communication</Text>
      </View>

      <View style={styles.row}>
        <Switch
          value={consent.safety}
          onValueChange={() =>
            setConsent({ ...consent, safety: !consent.safety })
          }
          trackColor={{ false: '#ccc', true: Colors.light.tint }}
        />
        <Text style={styles.label}>I understand and agree to follow all safety guidelines</Text>
      </View>

      <Text style={styles.note}>
        By proceeding, you acknowledge that this is a companion app for shared travel safety, 
        not for social dating or inappropriate interactions.
      </Text>
    </ScrollView>
  );

  const renderReceiverConsent = () => (
    <ScrollView style={{ marginBottom: 16 }}>
      {requestDetails && (
        <View style={styles.requestInfo}>
          <Text style={styles.requestTitle}>Trip Request Details</Text>
          <Text style={styles.requestDetail}>
            From: {requestDetails.user?.userName}
          </Text>
          <Text style={styles.requestDetail}>
            Destination: {requestDetails.destinationLocation?.address || requestDetails.destination}
          </Text>
          <Text style={styles.requestDetail}>
            Transport: {requestDetails.transportMode || requestDetails.destinationType}
          </Text>
        </View>
      )}

      <Text style={styles.description}>
        As a potential companion, you agree to the following:
      </Text>

      <View style={styles.row}>
        <Switch
          value={consent.noTouch}
          onValueChange={() =>
            setConsent({ ...consent, noTouch: !consent.noTouch })
          }
          trackColor={{ false: '#ccc', true: Colors.light.tint }}
        />
        <Text style={styles.label}>I agree to the no-touch rule - no physical contact whatsoever</Text>
      </View>

      <View style={styles.row}>
        <Switch
          value={consent.respectful}
          onValueChange={() =>
            setConsent({ ...consent, respectful: !consent.respectful })
          }
          trackColor={{ false: '#ccc', true: Colors.light.tint }}
        />
        <Text style={styles.label}>I will maintain respectful boundaries and communication</Text>
      </View>

      <View style={styles.row}>
        <Switch
          value={consent.safety}
          onValueChange={() =>
            setConsent({ ...consent, safety: !consent.safety })
          }
          trackColor={{ false: '#ccc', true: Colors.light.tint }}
        />
        <Text style={styles.label}>I understand this is for travel safety, not social interaction</Text>
      </View>

      <View style={styles.row}>
        <Switch
          value={consent.route}
          onValueChange={() =>
            setConsent({ ...consent, route: !consent.route })
          }
          trackColor={{ false: '#ccc', true: Colors.light.tint }}
        />
        <Text style={styles.label}>I agree to the proposed route and meeting arrangements</Text>
      </View>

      <Text style={styles.note}>
        By tapping "Tap On", you acknowledge understanding of the no-touch policy 
        and agree to accompany the requester safely to the destination.
      </Text>
    </ScrollView>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>
            {userRole === "sender" ? "Safety Consent Form" : "Companion Agreement"}
          </Text>

          {userRole === "sender" ? renderSenderConsent() : renderReceiverConsent()}

          <View style={styles.buttonContainer}>
            <ThemedButton
              title={userRole === "sender" ? "I Agree" : "Tap On"}
              onPress={handleSubmit}
              disabled={!isComplete}
              style={[
                styles.submitButton,
                !isComplete && styles.disabledButton,
                userRole === "receiver" && styles.tapOnButton
              ]}
              textStyle={[
                styles.submitButtonText,
                userRole === "receiver" && styles.tapOnButtonText
              ]}
            />

            <Pressable onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </div>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
    width: "90%",
    maxHeight: "80%",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
    color: Colors.light.text,
  },
  description: {
    fontSize: 16,
    color: Colors.light.text,
    marginBottom: 20,
    lineHeight: 22,
  },
  requestInfo: {
    backgroundColor: Colors.light.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  requestTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    color: Colors.light.text,
  },
  requestDetail: {
    fontSize: 14,
    color: Colors.light.text,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
    paddingHorizontal: 4,
  },
  label: {
    marginLeft: 12,
    fontSize: 15,
    flex: 1,
    lineHeight: 20,
    color: Colors.light.text,
  },
  note: {
    fontSize: 13,
    color: Colors.light.text,
    fontStyle: "italic",
    marginTop: 16,
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    lineHeight: 18,
  },
  buttonContainer: {
    marginTop: 20,
  },
  submitButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  tapOnButton: {
    backgroundColor: "#28a745", // Green for "Tap On"
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  tapOnButtonText: {
    fontSize: 20,
    fontWeight: "bold",
  },
  cancelButton: {
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: Colors.light.text,
    textAlign: "center",
    fontSize: 16,
  },
});