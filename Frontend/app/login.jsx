// login.jsx
import React, { useRef, useState } from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useThemeColor } from "@/hooks/useThemeColor";
import { ThemedText } from "@/components/ThemedText";
import { ThemedButton } from "@/components/ThemedButton";
import { BASE_URL } from "@/config";

const LOGIN_PATH = "api/v1/auth/login";

export default function LoginScreen() {
  const [username, setUsername] = useState(""); // email or username
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // UI/UX additions
  const [showPassword, setShowPassword] = useState(false);
  const [usernameErr, setUsernameErr] = useState("");
  const [passwordErr, setPasswordErr] = useState("");
  const [apiErr, setApiErr] = useState("");

  const background = useThemeColor({}, "surface");
  const text = useThemeColor({}, "text");
  const border = useThemeColor({}, "primary");
  const danger = useThemeColor({}, "danger");

  const passwordRef = useRef(null);

  const saveAuth = async (payload) => {
    const token =
      payload?.token ||
      payload?.accessToken ||
      payload?.data?.token ||
      payload?.data?.accessToken ||
      null;

    const user = payload?.user || payload?.data?.user || null;

    if (user) await AsyncStorage.setItem("user", JSON.stringify(user));
    if (token) await AsyncStorage.setItem("token", String(token));
  };

  const validate = () => {
    let ok = true;
    setUsernameErr("");
    setPasswordErr("");
    setApiErr("");

    if (!username.trim()) {
      setUsernameErr("Username or email is required.");
      ok = false;
    }
    if (!password) {
      setPasswordErr("Password is required.");
      ok = false;
    }
    return ok;
  };

  const friendlyMessageForStatus = (status, serverMsg) => {
    if (status === 400)
      return serverMsg || "Please check your details and try again.";
    if (status === 401) return "Incorrect username/email or password.";
    if (status === 403)
      return (
        serverMsg ||
        "Your account isn’t verified yet. Please verify your email."
      );
    return serverMsg || "Something went wrong. Please try again.";
  };

  const handleLogin = async () => {
    Keyboard.dismiss();
    if (!validate()) return;

    try {
      setLoading(true);

      const res = await fetch(`${BASE_URL}${LOGIN_PATH}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: username.trim(),
          userName: username.trim(),
          password,
        }),
      });

      const raw = await res.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        // non-JSON error page
      }

      if (!res.ok) {
        const msg = friendlyMessageForStatus(
          res.status,
          data?.message || data?.error
        );
        setApiErr(msg);
        throw new Error(msg);
      }

      await saveAuth(data);
      router.replace("/home");
    } catch (err) {
      console.error("Login error:", err?.message || err);
      if (!apiErr) {
        Alert.alert("Login error", String(err?.message || "Something went wrong"));
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          <ThemedText type="title" style={styles.title}>
            Login
          </ThemedText>

          {/* Username */}
          <View style={styles.fieldGroup}>
            <TextInput
              style={[
                styles.input,
                { borderColor: usernameErr ? danger : border, color: text },
              ]}
              placeholder="Username or Email"
              value={username}
              onChangeText={(v) => {
                setUsername(v);
                if (usernameErr) setUsernameErr("");
                if (apiErr) setApiErr("");
              }}
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor={border}
              returnKeyType="next"
              onSubmitEditing={() =>
                passwordRef.current && passwordRef.current.focus()
              }
            />
            {!!usernameErr && (
              <ThemedText style={[styles.helper, { color: danger }]}>
                {usernameErr}
              </ThemedText>
            )}
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <View style={styles.passwordRow}>
              <TextInput
                ref={passwordRef}
                style={[
                  styles.input,
                  styles.passwordInput,
                  { borderColor: passwordErr ? danger : border, color: text },
                ]}
                placeholder="Password"
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  if (passwordErr) setPasswordErr("");
                  if (apiErr) setApiErr("");
                }}
                secureTextEntry={!showPassword}
                placeholderTextColor={border}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />

              <TouchableOpacity
                onPress={() => setShowPassword((s) => !s)}
                style={styles.eyeTap}
              >
                <ThemedText type="link">
                  {showPassword ? "Hide" : "Show"}
                </ThemedText>
              </TouchableOpacity>
            </View>
            {!!passwordErr && (
              <ThemedText style={[styles.helper, { color: danger }]}>
                {passwordErr}
              </ThemedText>
            )}
          </View>

          {/* Forgot password */}
          <ThemedText
            type="link"
            onPress={() => router.push("/forgotPassword")}
            style={styles.forgotLink}
          >
            Forgot Password?
          </ThemedText>

          {/* API error */}
          {!!apiErr && (
            <ThemedText style={[styles.apiError, { color: danger }]}>
              {apiErr}
            </ThemedText>
          )}

          {/* Submit */}
          <ThemedButton
            title={loading ? "Signing in…" : "Login"}
            onPress={handleLogin}
            disabled={loading}
            style={styles.loginBtn}
          />

          {/* Footer */}
          <View style={styles.footerTextContainer}>
            <ThemedText type="default">
              Don’t have an account?{" "}
              <ThemedText
                type="link"
                style={styles.loginHint}
                onPress={() => router.push("/register")}
              >
                Register
              </ThemedText>
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
  fieldGroup: { marginBottom: 16 },
  input: {
    height: 50,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  helper: {
    marginTop: 6,
    fontSize: 13,
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
  },
  forgotLink: {
    textAlign: "right",
    marginBottom: 12,
    textDecorationLine: "underline",
    fontWeight: "bold",
  },
  apiError: {
    marginBottom: 12,
    textAlign: "center",
  },
  loginBtn: {
    marginTop: 4,
  },
  loginHint: {
    fontSize: 15,
    textDecorationLine: "underline",
    fontWeight: "bold",
  },
  footerTextContainer: {
    marginTop: 24,
    alignItems: "center",
  },
});