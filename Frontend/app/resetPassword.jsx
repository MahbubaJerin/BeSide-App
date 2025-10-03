import React, { useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Keyboard,
} from "react-native";
import { useThemeColor } from "@/hooks/useThemeColor";
import { ThemedText } from "@/components/ThemedText";
import { ThemedButton } from "@/components/ThemedButton";
import { router, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "@/config";

const RESET_PATH = "api/v1/auth/reset-password";

export default function ResetPasswordScreen() {
  const { email } = useLocalSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [apiErr, setApiErr] = useState("");

  const background = useThemeColor({}, "surface");
  const text = useThemeColor({}, "text");
  const border = useThemeColor({}, "primary");
  const danger = useThemeColor({}, "danger");

  const validate = () => {
    setApiErr("");
    if (!password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields.");
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return false;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long.");
      return false;
    }
    return true;
  };

  const handleResetPassword = async () => {
    Keyboard.dismiss();
    if (!validate()) return;

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("resetToken");
      if (!token) {
        Alert.alert("Error", "Session expired. Please request a new OTP.");
        return;
      }

      const response = await fetch(new URL(RESET_PATH, BASE_URL).toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email, password, confirmPassword }),
      });

      const raw = await response.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        // non-JSON response
      }

      if (!response.ok) {
        const msg = data?.message || "Reset failed. Please try again.";
        setApiErr(msg);
        Alert.alert("Error", msg);
        return;
      }

      await AsyncStorage.removeItem("resetToken");
      Alert.alert("Success", "Password has been reset. Please log in.");
      router.replace("/login");
    } catch (error) {
      console.error("[ResetPassword] error:", error?.message || error);
      Alert.alert("Error", "Something went wrong. Please try again.");
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
            Reset Password
          </ThemedText>

          {/* New Password (with Show/Hide) */}
          <View style={styles.passwordRow}>
            <TextInput
              style={[
                styles.input,
                styles.passwordInput,
                { borderColor: border, color: text },
              ]}
              placeholder="New Password"
              placeholderTextColor={border}
              secureTextEntry={!showPassword} // ← CHANGED
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((s) => !s)}
              style={styles.eyeTap}
              accessibilityRole="button"
              accessibilityLabel={
                showPassword ? "Hide password" : "Show password"
              }
            >
              <ThemedText type="link">
                {showPassword ? "Hide" : "Show"}
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Confirm Password (with Show/Hide) */}
          <View style={styles.passwordRow}>
            <TextInput
              style={[
                styles.input,
                styles.passwordInput,
                { borderColor: border, color: text },
              ]}
              placeholder="Confirm Password"
              placeholderTextColor={border}
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword((s) => !s)}
              style={styles.eyeTap}
              accessibilityRole="button"
              accessibilityLabel={
                showConfirmPassword ? "Hide password" : "Show password"
              }
            >
              <ThemedText type="link">
                {showConfirmPassword ? "Hide" : "Show"}
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Inline API error */}
          {!!apiErr && (
            <ThemedText style={[styles.apiError, { color: danger }]}>
              {apiErr}
            </ThemedText>
          )}

          {/* Submit */}
          <ThemedButton
            title={loading ? "Resetting…" : "Reset Password"}
            onPress={handleResetPassword}
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
    marginBottom: 16,
  },
  passwordRow: {
    position: "relative",
    justifyContent: "center",
  },
  passwordInput: {
    paddingRight: 72,
  },
  eyeTap: {
    position: "absolute",
    right: 12,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },

  apiError: {
    marginBottom: 12,
    textAlign: "center",
  },
  btn: {
    marginTop: 4,
  },
});
