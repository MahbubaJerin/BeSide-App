import React, { useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedButton } from "@/components/ThemedButton";
import { useThemeColor } from "@/hooks/useThemeColor";
import { router, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "@/config";

const VERIFY_PATH = "api/v1/auth/verify-otp";

export default function VerifyOTPScreen() {
  const { email, context, next } = useLocalSearchParams();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpErr, setOtpErr] = useState("");
  const [apiErr, setApiErr] = useState("");

  const background = useThemeColor({}, "surface");
  const text = useThemeColor({}, "text");
  const border = useThemeColor({}, "primary");
  const danger = useThemeColor({}, "danger");

  const validate = () => {
    setOtpErr("");
    setApiErr("");
    const trimmed = otp.trim();
    const onlyDigits = /^\d{4,8}$/.test(trimmed);

    if (!trimmed) {
      setOtpErr("OTP is required.");
      return false;
    }
    if (!onlyDigits) {
      setOtpErr("Please enter a valid numeric OTP.");
      return false;
    }
    return true;
  };

  const handleVerify = async () => {
    Keyboard.dismiss();
    if (!validate()) return;
    const normalizedOtp = otp.trim();
    setLoading(true);

    try {
      const url = new URL(VERIFY_PATH, BASE_URL).toString();
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: normalizedOtp }),
      });

      const raw = await response.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {}

      if (response.ok) {
        const token =
          data?.token || data?.data?.token || data?.accessToken || null;

        if (!token) {
          Alert.alert("Error", "Verification succeeded but no token returned.");
          return;
        }

        // Redirect based on context (signup / reset / other)
        if (context === "reset") {
          await AsyncStorage.setItem("resetToken", String(token));
          Alert.alert("Success", "OTP verified! Now reset your password.");
          router.push({ pathname: "/resetPassword", params: { email } });
        } else if (context === "signup") {
          Alert.alert("Success", "Email verified successfully!");
          router.replace(next || "/login");
        } else {
          Alert.alert("Success", "OTP verified.");
          router.replace("/home");
        }
      } else {
        const msg = data?.message || "Invalid OTP. Please try again.";
        setApiErr(msg);
        Alert.alert("Invalid OTP", msg);
      }
    } catch (error) {
      console.error("[VerifyOTP] error:", error?.message || error);
      Alert.alert("Error", "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          <ThemedText type="title" style={styles.title}>
            Verify OTP
          </ThemedText>

          <TextInput
            style={[
              styles.input,
              { borderColor: otpErr ? danger : border, color: text },
            ]}
            placeholder="Enter OTP"
            placeholderTextColor={border}
            keyboardType="number-pad"
            value={otp}
            onChangeText={(v) => {
              const digitsOnly = v.replace(/\D+/g, "");
              setOtp(digitsOnly);
              if (otpErr) setOtpErr("");
              if (apiErr) setApiErr("");
            }}
            returnKeyType="done"
            onSubmitEditing={handleVerify}
            maxLength={8}
          />

          {!!otpErr && (
            <ThemedText style={[styles.helper, { color: danger }]}>
              {otpErr}
            </ThemedText>
          )}
          {!!apiErr && (
            <ThemedText style={[styles.apiError, { color: danger }]}>
              {apiErr}
            </ThemedText>
          )}

          <ThemedButton
            title={loading ? "Verifying..." : "Verify OTP"}
            onPress={handleVerify}
            disabled={loading}
            style={styles.btn}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  form: {
    width: "100%",
    maxWidth: 540,
    alignSelf: "center",
  },
  title: {
    textAlign: "center",
    marginBottom: 24,
  },
  input: {
    height: 50,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 12,
  },
  helper: {
    marginBottom: 8,
    fontSize: 13,
  },
  apiError: {
    marginBottom: 12,
    textAlign: "center",
  },
  btn: {
    marginTop: 4,
  },
});
