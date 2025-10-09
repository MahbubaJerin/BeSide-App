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
import { router } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { ThemedButton } from "@/components/ThemedButton";
import { useThemeColor } from "@/hooks/useThemeColor";
import { BASE_URL } from "@/config";

const FORGOT_PATH = "api/v1/auth/send-otp";
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value);

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailErr, setEmailErr] = useState("");
  const [apiErr, setApiErr] = useState("");

  const background = useThemeColor({}, "surface");
  const text = useThemeColor({}, "text");
  const border = useThemeColor({}, "primary");
  const danger = useThemeColor({}, "danger");

  const validate = () => {
    setEmailErr("");
    setApiErr("");

    const trimmed = email.trim().toLowerCase();

    if (!trimmed) {
      setEmailErr("Email is required.");
      return false;
    }

    if (!isValidEmail(trimmed)) {
      setEmailErr("Please enter a valid email (e.g., name@example.com).");
      return false;
    }

    return true;
  };

  const handleReset = async () => {
    Keyboard.dismiss();
    if (!validate()) return;

    const normalizedEmail = email.trim().toLowerCase();
    setLoading(true);

    try {
      console.log("[ForgotPassword] POST ->", new URL(FORGOT_PATH, BASE_URL).toString());
      console.log("[ForgotPassword] payload ->", { email: normalizedEmail });

      const response = await fetch(new URL(FORGOT_PATH, BASE_URL).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const raw = await response.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        // non-JSON response
      }

      if (response.ok) {
        Alert.alert("OTP Sent", "A verification code has been sent to your email.");
        router.push({
  pathname: "/verifyOTP",
  params: { email: normalizedEmail, context: "reset" },
});
      } else {
        const msg = data?.message || "Unable to send OTP. Please try again.";
        setApiErr(msg);
        // Show popup alert with backend error message
        Alert.alert("Error", msg);
        throw new Error(msg);
      }
    } catch (error) {
      console.error("[ForgotPassword] error:", error?.message || error);
      if (!apiErr) {
        Alert.alert("Error", "Unable to send OTP. Please try again.");
      }
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
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          <ThemedText type="title" style={styles.title}>
            Forgot Password
          </ThemedText>

          {/* Email input */}
          <TextInput
            style={[styles.input, { borderColor: emailErr ? danger : border, color: text }]}
            placeholder="Enter your registered email"
            placeholderTextColor={border}
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              if (emailErr) setEmailErr("");
              if (apiErr) setApiErr("");
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            textContentType="emailAddress"
            autoComplete="email"
            returnKeyType="send"
            onSubmitEditing={handleReset}
            accessibilityLabel="Email"
          />

          {/* Inline validation */}
          {!!emailErr && (
            <ThemedText style={[styles.helper, { color: danger }]}>{emailErr}</ThemedText>
          )}
          {!!apiErr && (
            <ThemedText style={[styles.apiError, { color: danger }]}>{apiErr}</ThemedText>
          )}

          {/* Submit */}
          <ThemedButton
            title={loading ? "Sending..." : "Send OTP"}
            onPress={handleReset}
            disabled={loading}
            style={styles.btn}
            accessibilityLabel="Send one-time password to email"
          />

          {/* Footer */}
          <View style={styles.footerTextContainer}>
            <ThemedText type="link" onPress={() => router.replace("/login")}>
              Back to Login
            </ThemedText>
          </View>
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
  footerTextContainer: {
    marginTop: 24,
    alignItems: "center",
  },
});
