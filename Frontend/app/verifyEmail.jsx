import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { ThemedButton } from "@/components/ThemedButton";

export default function VerifyEmailOtpScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams();
  const [otp, setOtp] = useState("");

  const handleVerify = async () => {
    if (!otp || !email) {
      Alert.alert("Error", "Please enter the OTP.");
      return;
    }

    try {
      const response = await fetch("http://10.0.2.2:5000/api/v1/auth/verify-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Verification Failed", data.message || "Invalid OTP.");
        return;
      }

      Alert.alert("Success", "Your email has been verified!", [
        { text: "OK", onPress: () => router.replace("/login") },
      ]);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Something went wrong during verification.");
    }
  };

  return (
    <View style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Verify Email with OTP
      </ThemedText>

      <ThemedText type="default" style={styles.message}>
        Enter the 6-digit OTP sent to:
      </ThemedText>
      <ThemedText type="defaultSemiBold" style={styles.email}>
        {email}
      </ThemedText>

      <TextInput
        style={styles.input}
        placeholder="Enter OTP"
        value={otp}
        onChangeText={setOtp}
        keyboardType="numeric"
        maxLength={6}
        placeholderTextColor="#9B5377"
      />

      <ThemedButton
        title="Verify OTP"
        onPress={handleVerify}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#FFF0EB",
  },
  title: {
    textAlign: "center",
    marginBottom: 20,
  },
  message: {
    textAlign: "center",
    marginBottom: 8,
  },
  email: {
    textAlign: "center",
    fontSize: 16,
    color: "#9B5377",
    marginBottom: 16,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 20,
    borderColor: "#9B5377",
    color: "#000",
    backgroundColor: "#fff",
  },
  button: {
    alignSelf: "center",
    width: "60%",
  },
});
