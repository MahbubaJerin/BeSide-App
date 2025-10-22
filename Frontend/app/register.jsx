// app/register.jsx
import React, { useEffect, useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Alert,
  TouchableOpacity,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
  Text,
  StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import CountryPicker from "react-native-country-picker-modal";
import RNPickerSelect from "react-native-picker-select";
import DateTimePicker from "@react-native-community/datetimepicker";
import PlacesAutocomplete from "./PlacesAutocomplete";
import { useThemeColor } from "@/hooks/useThemeColor";
import { ThemedText } from "@/components/ThemedText";
import { ThemedButton } from "@/components/ThemedButton";
import { BASE_URL } from "@/config";

/* ---------------- Utility helpers ---------------- */
function formatDateYMD(d) {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function formatDatePretty(d) {
  return d
    ? d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Select your date of birth";
}
function calcAge(d) {
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}
function getStrengthColor(label) {
  return label === "Strong"
    ? "#22c55e"
    : label === "Fair"
    ? "#f59e0b"
    : label === "Weak"
    ? "#ef4444"
    : "#d1d5db";
}
function getPasswordChecks(pw) {
  return [
    { label: "At least 8 characters", ok: pw.length >= 8 },
    { label: "Contains number", ok: /\d/.test(pw) },
    { label: "Contains uppercase", ok: /[A-Z]/.test(pw) },
    { label: "Contains lowercase", ok: /[a-z]/.test(pw) },
    { label: "Contains symbol", ok: /[^A-Za-z0-9]/.test(pw) },
  ];
}

/* ---------------- Main Screen ---------------- */
export default function RegisterScreen() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState(null);
  const [dob, setDob] = useState(null);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [step, setStep] = useState(0);
  const [geo, setGeo] = useState(null);
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [countryCode, setCountryCode] = useState("AU");
  const [country, setCountry] = useState("Australia");

  const emailValid = email.includes("@") && email.endsWith(".com");

  const background = useThemeColor({}, "surface");
  const text = useThemeColor({}, "text");
  const border = useThemeColor({}, "primary");
  const surface = useThemeColor({}, "surface");

  const passwordStrength =
    password.length >= 10
      ? "Strong"
      : password.length >= 6
      ? "Fair"
      : password.length > 0
      ? "Weak"
      : "";

  const passwordChecks = getPasswordChecks(password);

  const validateStep = () => {
    if (step === 0) {
      if (!firstName || !lastName || !emailValid || !dob) return false;
      const age = calcAge(dob);
      if (age < 13) {
        Alert.alert("Age Restriction", "You must be at least 13 years old to register.");
        return false;
      }
      return true;
    }
    if (step === 1) {
      if (!mobileNo) return false;
      return true;
    }
    if (step === 2) {
      if (passwordChecks.some((c) => !c.ok)) return false;
      return true;
    }
    if (step === 3) {
      if (!street || !termsAccepted) return false;
      return true;
    }
    return false;
  };

  const handleRegister = async () => {
    if (!validateStep()) {
      Alert.alert(
        "Missing Info",
        "Please complete all required fields before continuing."
      );
      return;
    }
  try {
    const payload = {
      userName: username || email,
      email: email.trim().toLowerCase(),
      mobileNo: mobileNo.trim(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      gender,
      dob: dob ? formatDateYMD(dob) : undefined,
      address: {
        street: street.trim(),
        city: city.trim(),
        state: state.trim(),
        postalCode: postalCode.trim(),
        country,
        countryCode,
        addressString: street.trim(), // For display purposes
      },
      geo: geo ? {
        lat: Number(geo.lat),
        lng: Number(geo.lng)
      } : null
    };

      const registerResponse = await fetch(`${BASE_URL}api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const registerData = await registerResponse.json();
      if (!registerResponse.ok) {
        Alert.alert(
          "Registration Failed",
          registerData.message || "Try again."
        );
        return;
      }

      const otpResponse = await fetch(`${BASE_URL}api/v1/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const otpData = await otpResponse.json();
      if (!otpResponse.ok) {
        Alert.alert(
          "Email Error",
          otpData.message || "User registered but OTP not sent."
        );
        return;
      }

      Alert.alert(
        "Success",
        "We’ve sent a 6-digit OTP to your email. Please verify to continue.",
        [
          {
            text: "OK",
            onPress: () =>
              router.push({
                pathname: "/verifyOTP",
                params: { email, context: "signup", next: "/login" },
              }),
          },
        ]
      );
    } catch (err) {
      console.error("[Register Error]", err);
      Alert.alert("Error", "Something went wrong during registration.");
    }
  };

  /* ---------------- UI Layout ---------------- */
  const stepsTotal = 4;

  return (
    <KeyboardAvoidingView
  style={{ flex: 1, backgroundColor: background }}
  behavior={Platform.OS === "ios" ? "padding" : "height"}
  keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
>

      <StatusBar
        barStyle={Platform.OS === "ios" ? "light-content" : "default"}
      />

      {/* Header */}
      <View style={styles.headerTop}>
        <ThemedText type="title" style={styles.title}>
          Register
        </ThemedText>
        <ThemedText type="subtitle" style={styles.stepSubtitle}>
          Step {String(step + 1).padStart(2, "0")}/
          {String(stepsTotal).padStart(2, "0")}
        </ThemedText>
        <View style={[styles.progressTrack, { backgroundColor: surface }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: border,
                width: `${((step + 1) / stepsTotal) * 100}%`,
              },
            ]}
          />
        </View>
      </View>

      {/* Login link */}
      <View style={styles.footerNote}>
        <ThemedText style={styles.loginHint}>
          Already have an account?{" "}
          <ThemedText
            style={styles.loginLink}
            onPress={() => router.push("/login")}
          >
            Login
          </ThemedText>
        </ThemedText>
      </View>

{/* Steps */}
<TouchableWithoutFeedback onPress={Keyboard.dismiss}>
  <ScrollView
    contentContainerStyle={styles.scrollContainer}
    keyboardShouldPersistTaps="handled"
    showsVerticalScrollIndicator={false}
        >
          <View style={styles.stepWrap}>
        {/* STEP 0 */}
        {step === 0 && (
          <View style={styles.stepInner}>
            <ThemedText style={styles.sectionLead}>Personal Details</ThemedText>

            <ThemedText style={styles.label}>First Name*</ThemedText>
            <TextInput
              style={[
                styles.input,
                { borderColor: border, color: text, backgroundColor: surface },
              ]}
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              autoCorrect={false}
            />

            <ThemedText style={styles.label}>Last Name*</ThemedText>
            <TextInput
              style={[
                styles.input,
                { borderColor: border, color: text, backgroundColor: surface },
              ]}
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              autoCorrect={false}
            />

            <ThemedText style={styles.label}>Email*</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: !email || emailValid ? border : "#B00020",
                  color: text,
                  backgroundColor: surface,
                },
              ]}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {!!email && !emailValid && (
              <ThemedText style={{ fontSize: 12, color: "#B00020" }}>
                Please enter a valid email (must include @ and end with .com)
              </ThemedText>
            )}

            <ThemedText style={styles.label}>Date of Birth*</ThemedText>
            <TouchableOpacity
              style={[
                styles.input,
                {
                  justifyContent: "center",
                  borderColor: dob ? border : "#ccc",
                  backgroundColor: surface,
                },
              ]}
              onPress={() => setShowDobPicker(true)}
            >
              <Text style={{ color: dob ? text : "#777" }}>
                {dob ? formatDatePretty(dob) : "Select your date of birth"}
              </Text>
            </TouchableOpacity>

            {showDobPicker && (
              <DateTimePicker
                value={dob ?? new Date(2000, 0, 1)}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "calendar"}
                maximumDate={new Date()}
                onChange={(e, selected) => {
                  if (selected) setDob(selected);
                  setShowDobPicker(false);
                }}
              />
            )}
          </View>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <View style={styles.stepInner}>
            <ThemedText style={styles.sectionLead}>Contact Details</ThemedText>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <CountryPicker
                withFlag
                withCallingCode
                withFilter
                countryCode={countryCode}
                onSelect={(c) => {
                  setCountryCode(c.cca2);
                  setCountry(c.name?.common || c.name);
                }}
                containerButtonStyle={styles.ccBtn}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <ThemedText style={styles.label}>Mobile Number*</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: border,
                      color: text,
                      backgroundColor: surface,
                    },
                  ]}
                  value={mobileNo}
                  onChangeText={setMobileNo}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <ThemedText style={styles.label}>Username (optional)</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: border,
                  color: text,
                  backgroundColor: surface,
                },
              ]}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />

            <ThemedText style={styles.label}>Gender</ThemedText>
            <View style={styles.pickerWrap}>
              <RNPickerSelect
                onValueChange={setGender}
                value={gender}
                placeholder={{ label: "Select Gender", value: null }}
                items={[
                  { label: "Male", value: "male" },
                  { label: "Female", value: "female" },
                  { label: "Non-binary", value: "non-binary" },
                  { label: "Other", value: "other" },
                ]}
              />
            </View>
          </View>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <View style={styles.stepInner}>
            <ThemedText style={styles.sectionLead}>Create Password</ThemedText>
            <ThemedText style={styles.label}>Password*</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: border,
                  color: text,
                  backgroundColor: surface,
                },
              ]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            {password.length > 0 && (
              <>
                <View style={styles.strengthBarWrap}>
                  <View
                    style={[
                      styles.strengthBar,
                      {
                        backgroundColor: getStrengthColor(passwordStrength),
                      },
                    ]}
                  />
                  <ThemedText style={{ marginLeft: 8 }}>
                    {passwordStrength}
                  </ThemedText>
                </View>
                <View style={styles.checkList}>
                  {passwordChecks.map((c, i) => (
                    <Text
                      key={i}
                      style={{
                        color: c.ok ? "#22c55e" : "#ef4444",
                        fontSize: 14,
                        marginVertical: 2,
                      }}
                    >
                      {c.ok ? "✓" : "✗"} {c.label}
                    </Text>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <View style={styles.stepInner}>
            <ThemedText style={styles.sectionLead}>Location & Terms</ThemedText>
            <PlacesAutocomplete
              placeholder="Type your address"
              value={street}
              onChangeText={setStreet}
              onSelect={(place) => {
                if (place) {
                  setStreet(place.description);
                  setGeo({ lat: place.lat, lng: place.lng });
                }
              }}
              style={{ marginTop: 8 }}
            />

            <View style={{ flexDirection: "row", marginTop: 20 }}>
              <TouchableOpacity
                onPress={() => setTermsAccepted(!termsAccepted)}
                style={styles.checkbox}
              >
                {termsAccepted && (
                  <View
                    style={[styles.checkboxInner, { backgroundColor: border }]}
                  />
                )}
              </TouchableOpacity>
              <Text style={{ color: text }}>
                I agree to the{" "}
                <Text
                  style={{ color: border, textDecorationLine: "underline" }}
                  onPress={() =>
                    Alert.alert(
                      "Terms & Conditions",
                      "Link to Terms & Privacy here."
                    )
                  }
                >
                  Terms & Conditions
                </Text>
              </Text>
            </View>
          </View>
        )}

        <View style={styles.footerBar}>
          {step > 0 && (
            <ThemedButton
              title="Back"
              onPress={() => setStep(step - 1)}
              style={styles.btnHalf}
              textStyle={styles.btnText}
            />
          )}
          <ThemedButton
            title={step < 3 ? "Next" : "Register"}
            onPress={() => {
              if (!validateStep()) {
                Alert.alert(
                  "Missing Info",
                  "Please complete all * fields correctly before proceeding."
                );
                return;
              }
              if (step < 3) setStep(step + 1);
              else handleRegister();
            }}
            disabled={step === 3 && !termsAccepted}
            style={step === 0 ? styles.btnSingleCenter : styles.btnHalf}
            textStyle={styles.btnText}
          />
        </View>
      </View>
  </ScrollView>
  </TouchableWithoutFeedback>
    </KeyboardAvoidingView>);
}

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  headerTop: {
    paddingTop: Platform.OS === "android" ? 30 : 40,
    paddingHorizontal: 20,
    paddingBottom: 8,
    alignItems: "center",
  },
  title: { marginTop: 6, textAlign: "center", paddingTop: 6 },
  stepSubtitle: { marginTop: 6, textAlign: "center" },
  progressTrack: {
    height: 6,
    marginTop: 20,
    borderRadius: 100,
    overflow: "hidden",
    width: "100%",
    maxWidth: 640,
  },
  progressFill: { height: "100%", borderRadius: 100 },
  stepWrap: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  stepInner: {
    alignItems: "stretch",
    alignSelf: "center",
    width: "90%",
    maxWidth: 400,
  },
  footerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 20,
  },

  sectionLead: {
    textAlign: "left",
    alignSelf: "center",
    opacity: 0.9,
    fontWeight: "bold",
    fontSize: 20,
  },

  label: {
    fontSize: 14,
    opacity: 0.9,
    marginBottom: 6,
    marginTop: 10,
    textAlign: "left",
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    marginBottom: 12,
    alignSelf: "stretch",
  },

  pickerWrap: {
    borderWidth: 1,
    borderRadius: 10,
    borderColor: "#ccc",
    paddingHorizontal: 12,
    height: 50,
    justifyContent: "center",
  },
  ccBtn: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fff",
  },
  strengthBarWrap: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  strengthBar: { height: 8, borderRadius: 100, width: 120 },
  checkList: { marginTop: 8, gap: 4 },
  checkbox: {
    height: 20,
    width: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#888",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  checkboxInner: { height: 10, width: 10 },
  btnCenter: { minHeight: 48, minWidth: 200, alignSelf: "center" },
  btnHalf: {
    height: 50,
    minWidth: 140,
    marginHorizontal: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  btnText: {
    fontSize: 16,
    textAlign: "center",
    textAlignVertical: "center",
  },
  btnSingleCenter: {
    height: 50,
    width: "80%",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    borderRadius: 33,
  },
 

  footerNote: {
    marginTop: 20,
    marginBottom: 15,
    paddingHorizontal: 20,
    alignItems: "flex-end",
  },
  loginHint: { fontSize: 15, opacity: 0.8 },
  loginLink: { textDecorationLine: "underline", fontWeight: "bold" },
});
