import React, { useEffect, useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Alert,
  TouchableOpacity,
  Text,
  Image,
  StatusBar,
  Dimensions,
  ScrollView,
  FlatList,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import CountryPicker from "react-native-country-picker-modal";
import RNPickerSelect from "react-native-picker-select";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { useThemeColor } from "@/hooks/useThemeColor";
import { ThemedText } from "@/components/ThemedText";
import { ThemedButton } from "@/components/ThemedButton";
import { BASE_URL, GOOGLE_PLACES_API_KEY } from "@/config";
import { LogBox } from "react-native";


// Date picker
import DateTimePicker from "@react-native-community/datetimepicker";

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get("window");
const WIZARD_KEY = "register_step_seen_v1";

/* -------------------------- Small utilities -------------------------- */
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
function isFutureDate(d) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const picked = new Date(d);
  picked.setHours(0, 0, 0, 0);
  return picked.getTime() > today.getTime();
}
function calcAge(d) {
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}
function getPasswordStrength(pw, identity = "") {
  const checks = [
    { label: "At least 8 characters", ok: pw.length >= 8 },
    { label: "Contains a number", ok: /[0-9]/.test(pw) },
    { label: "Contains a lowercase letter", ok: /[a-z]/.test(pw) },
    { label: "Contains an uppercase letter", ok: /[A-Z]/.test(pw) },
    { label: "Contains a symbol", ok: /[^A-Za-z0-9]/.test(pw) },
    {
      label: "Doesn’t include your email/username",
      ok: identity ? !pw.toLowerCase().includes(identity.toLowerCase().split("@")[0]) : true,
    },
  ];
  const scoreRaw = checks.reduce((acc, c) => acc + (c.ok ? 1 : 0), 0);
  const score = scoreRaw >= 5 ? 3 : scoreRaw >= 3 ? 2 : scoreRaw >= 2 ? 1 : 0;
  const label = ["Weak", "Fair", "Good", "Strong"][score];
  return { score, label, checks };
}
function getStrengthColor(score) {
  return score === 3
    ? "#22c55e"
    : score === 2
    ? "#f59e0b"
    : score === 1
    ? "#f97316"
    : "#ef4444";
}

/* ---------------------------- Carousel ---------------------------- */
const FieldsCarousel = ({ items, pageSize = 6 }) => {
  const pages = [];
  for (let i = 0; i < items.length; i += pageSize) pages.push(items.slice(i, i + pageSize));

  return (
    <ScrollView
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ alignItems: "center" }}
      accessibilityLabel="Additional fields pages"
      style={{ width: "100%" }}
    >
      {pages.map((page, i) => (
        <View
          key={i}
          style={{
            width: SCREEN_W - 40,
            paddingHorizontal: 2,
          }}
        >
          {page.map((el, j) => (
            <View key={j} style={{ marginBottom: 12 }}>
              {el}
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
};

/* ============================ Screen ============================ */
export default function RegisterScreen() {
  // ----- Form state -----
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState(null);
const emailValid = email.includes("@") && email.endsWith(".com");

  // Address & geo
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [countryCode, setCountryCode] = useState("AU");
  const [country, setCountry] = useState("Australia");
  const [geo, setGeo] = useState(null); // { lat, lng }

  // Terms
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Wizard
  const [step, setStep] = useState(0); // 0..3 => 4 steps
  const STEPS_TOTAL = 4;

  // Theme
  const background = useThemeColor({}, "surface");
  const text = useThemeColor({}, "text");
  const border = useThemeColor({}, "primary");
  const danger = useThemeColor({}, "danger");
  const surface = useThemeColor({}, "surface");

  // ----- DOB (frontend only) -----
  const [dob, setDob] = useState(null);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [dobError, setDobError] = useState("");

  const MIN_AGE = 13;
  const debugDob = (msg, data) => console.log(`[Register][DOB] ${msg}`, data ?? "");

  function validateDob(d) {
    if (!d) {
      setDobError("Date of birth is required");
      return false;
    }
    if (isFutureDate(d)) {
      setDobError("Date of birth cannot be in the future");
      return false;
    }
    const age = calcAge(d);
    if (age < MIN_AGE) {
      setDobError(`You must be at least ${MIN_AGE} years old`);
      return false;
    }
    setDobError("");
    return true;
  }

  function onDobChange(event, selectedDate) {
    if (event.type === "dismissed") {
      setShowDobPicker(false);
      debugDob("Picker dismissed");
      return;
    }
    const currentDate = selectedDate ? new Date(selectedDate) : dob;
    debugDob("Raw selected", currentDate?.toISOString?.());
    if (currentDate) {
      if (validateDob(currentDate)) {
        setDob(currentDate);
        debugDob("DOB accepted", {
          iso: currentDate.toISOString(),
          pretty: formatDatePretty(currentDate),
          ymd: formatDateYMD(currentDate),
          age: calcAge(currentDate),
        });
      } else {
        debugDob("DOB rejected (validation failed)");
      }
    }
    if (Platform.OS === "android") setShowDobPicker(false);
  }

  // Restore last step (optional)
  useEffect(() => {
    (async () => {
      try {
        const s = await AsyncStorage.getItem(WIZARD_KEY);
        if (s !== null) {
          const n = Number(s);
          if (!Number.isNaN(n)) setStep(Math.min(Math.max(n, 0), STEPS_TOTAL - 1));
        }
      } catch (e) {
        console.warn("[Register] restore step failed:", e);
      }
    })();
  }, []);

  // Persist step (optional)
  useEffect(() => {
    AsyncStorage.setItem(WIZARD_KEY, String(step)).catch(() =>
      console.warn("[Register] persist step failed")
    );
  }, [step]);

  // ----- Password strength -----
  const strength = getPasswordStrength(password, email || username);
  const strengthOk = strength.score >= 2; // Fair+

  // ----- Places selection handler -----
  const onPlaceSelected = (details) => {
    try {
      console.log("[Register] place selected");
      if (!details) return;
      const lat = details?.geometry?.location?.lat;
      const lng = details?.geometry?.location?.lng;
      if (lat && lng) setGeo({ lat, lng });

      const comps = details?.address_components || [];
      const get = (type) =>
        comps.find((c) => (c.types || []).includes(type))?.long_name || "";

      const streetNum = get("street_number");
      const route = get("route");
      const locality = get("locality") || get("sublocality") || "";
      const admin1 = get("administrative_area_level_1") || "";
      const postal = get("postal_code") || "";
      const countryName = get("country") || "";
      const countryShort =
        comps.find((c) => (c.types || []).includes("country"))?.short_name || "";

      setStreet([streetNum, route].filter(Boolean).join(" ").trim());
      setCity(locality);
      setState(admin1);
      setPostalCode(postal);
      if (countryName) setCountry(countryName);
      if (countryShort) setCountryCode(countryShort);

      console.log("[Register] parsed address:", {
        street: [streetNum, route].filter(Boolean).join(" ").trim(),
        city: locality,
        state: admin1,
        postal,
        countryName,
        countryShort,
      });
    } catch (e) {
      console.warn("[Register] place parse error:", e);
    }
  };

  /* ----------------------- Validation & Navigation ----------------------- */
  const canGoNext = () => {
    if (step === 0)
  return (
    !!firstName &&
    !!lastName &&
    !!email &&
    emailValid &&    
    validateDob(dob)
  );

    if (step === 1) return !!mobileNo; // username optional
    if (step === 2) return !!password && strengthOk;
    if (step === 3) return termsAccepted; // preferences optional
    return true;
  };

  const onNext = () => {
    if (!canGoNext()) {
      console.log("[Register] next blocked: validation failed on step", step);
      Alert.alert("Missing info", STEP_ERRORS[step] || "Please complete required fields.");
      return;
    }
    if (step < STEPS_TOTAL - 1) {
      console.log("[Register] next from", step, "to", step + 1);
      setStep((s) => s + 1);
    }
  };

  const onBack = () => {
    if (step > 0) {
      console.log("[Register] back from", step, "to", step - 1);
      setStep((s) => s - 1);
    }
  };

  // ----- Submit -----
  const handleRegister = async () => {
    console.log("[Register] submit tapped");
    if (!canGoNext()) {
      Alert.alert("Missing info", STEP_ERRORS[step] || "Please complete required fields.");
      return;
    }
const dobYMD = dob ? formatDateYMD(dob) : undefined;

    try {
      const payload = {
        userName: username || email,
        email,
        mobileNo,
        password,
        firstName,
        lastName,
          dateOfBirth: dobYMD,  
        gender,
        address: {
          street,
          city,
          state,
          postalCode,
          country,
          countryCode,
          dateOfBirth: dob ? formatDateYMD(dob) : undefined

        },
        geo,
      };
console.log("[Register] payload (includes DOB):", JSON.stringify(payload, null, 2));

      console.log("[Register] payload (no DOB to backend):", JSON.stringify(payload, null, 2));

      const res = await fetch(`${BASE_URL}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("[Register] server error:", res.status, data);
        Alert.alert("Registration failed", data?.message || "Please try again.");
        return;
      }

      const verify = await fetch(`${BASE_URL}/api/v1/auth/send-verification-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const vdata = await verify.json().catch(() => ({}));
      if (!verify.ok) {
        console.warn("[Register] verify failed:", verify.status, vdata);
        Alert.alert(
          "Verify email",
          vdata?.message || "User registered but email verification failed"
        );
        return;
      }

      Alert.alert(
        "Registration Successful",
        "A verification email has been sent. Please verify before logging in.",
        [
          {
            text: "OK",
            onPress: () => router.push({ pathname: "/verifyEmail", params: { email } }),
          },
        ]
      );
    } catch (err) {
      console.error("[Register] submit error:", err);
      Alert.alert("Error", "Something went wrong during registration.");
    }
  };

  /* ------------------------------- UI ------------------------------- */
  const onlyNext = step === 0; // no Back on step 0

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle={Platform.OS === "ios" ? "light-content" : "default"} />

      {/* Page header: centered title & step text */}
      <View style={styles.headerTop}>
        <ThemedText type="title" style={styles.title}>
          Register
        </ThemedText>

        <ThemedText
          type="subtitle"
          style={styles.stepSubtitle}
          accessibilityLabel={`Step ${step + 1} of ${STEPS_TOTAL}`}
        >
          {`Step ${String(step + 1).padStart(2, "0")}/${String(STEPS_TOTAL).padStart(2, "0")}`}
        </ThemedText>

        <View style={[styles.progressTrack, { backgroundColor: surface }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: border, width: `${((step + 1) / STEPS_TOTAL) * 100}%` },
            ]}
          />
        </View>
      </View>

      <View style={styles.footerNote}>
        <ThemedText type="default" style={styles.loginHint}>
          Already have an account?{" "}
          <ThemedText style={styles.loginLink} onPress={() => router.push("/login")}>
            Login
          </ThemedText>
        </ThemedText>
      </View>

      <FlatList
  data={[]} 
  keyExtractor={() => "form"} 
  renderItem={null}
  keyboardShouldPersistTaps="handled"
  contentInsetAdjustmentBehavior="always"
  accessibilityLabel="Registration form"
  ListHeaderComponent={
    <View
      style={[
        styles.stepWrap,
        {
          flexGrow: 1,
          justifyContent: "center",
          alignItems: "center",
        },
      ]}
    >
            {/* STEP 0 — Identity */}
            {step === 0 && (
              <View style={[styles.stepInner]}>
                <ThemedText
                  type="default"
                  style={[styles.sectionLead, { fontSize: 21, textAlign: "center", padding: 30 }]}
                >
                  Personal Details
                </ThemedText>

                <View style={styles.fieldBlock}>
                  <ThemedText style={styles.label}>First name*</ThemedText>
                  <TextInput
                    style={[styles.input, { borderColor: border, color: text, backgroundColor: surface }]}
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                    autoCorrect={false}
                    accessibilityLabel="First name"
                  />
                </View>

                <View style={styles.fieldBlock}>
                  <ThemedText style={styles.label}>Last name*</ThemedText>
                  <TextInput
                    style={[styles.input, { borderColor: border, color: text, backgroundColor: surface }]}
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                    autoCorrect={false}
                    accessibilityLabel="Last name"
                  />
                </View>

                <View style={styles.fieldBlock}>
  <ThemedText style={styles.label}>Email*</ThemedText>
  <TextInput
    style={[
      styles.input,
      {
        borderColor: !email || emailValid ? border : "#B00020", // red border if invalid
        color: text,
        backgroundColor: surface,
      },
    ]}
    value={email}
    onChangeText={setEmail}
    keyboardType="email-address"
    autoCapitalize="none"
    autoCorrect={false}
    textContentType="emailAddress"
    autoComplete="email"
    accessibilityLabel="Email address"
  />
  {!!email && !emailValid && (
    <ThemedText style={{ fontSize: 12, color: "#B00020", marginTop: 6 }}>
      Please enter a valid email (must include @ and end with .com)
    </ThemedText>
  )}
</View>


                {/* DOB (frontend only) */}
                <View style={{ width: "100%", marginTop: 12 }}>
                  <ThemedText style={styles.label}>Date of Birth*</ThemedText>

                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Open date of birth calendar"
                    onPress={() => {
                      setShowDobPicker(true);
                      debugDob("Opening DOB picker");
                    }}
                    style={{
                      height: 52,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: dobError ? "#B00020" : border,
                      justifyContent: "center",
                      paddingHorizontal: 14,
                      backgroundColor: surface,
                    }}
                  >
                    <ThemedText style={{ fontSize: 16, opacity: dob ? 1 : 0.6, color: text }}>
                      {dob ? formatDatePretty(dob) : "Select your date of birth"}
                    </ThemedText>
                  </TouchableOpacity>

                  {!!dobError && (
                    <ThemedText style={{ fontSize: 12, color: "#B00020", marginTop: 6 }}>{dobError}</ThemedText>
                  )}

                  {showDobPicker && (
                    <DateTimePicker
                      value={dob ?? new Date(2000, 0, 1)}
                      mode="date"
                      display={Platform.OS === "ios" ? "inline" : "calendar"}
                      maximumDate={new Date()}
                      onChange={onDobChange}
                    />
                  )}
                </View>
              </View>
            )}

            {/* STEP 1 — Contact */}
            {step === 1 && (
              <View style={[styles.stepInner, { flex: 1 }]}>
                <ThemedText
                  type="default"
                  style={[styles.sectionLead, { fontSize: 21, textAlign: "center", padding: 30 }]}
                >
                  Contact details
                </ThemedText>

                <View style={[styles.row, { alignItems: "center" }]}>
              <CountryPicker
  countryCode={countryCode}
  onSelect={(c) => {
    setCountryCode(c.cca2);
    setCountry(c.name?.common || c.name);
  }}
  withFlag={true}
  withCallingCode={true}
  withCloseButton={true}
  withCallingCodeButton={true}
  withAlphaFilter={true}
  containerButtonStyle={[styles.ccBtn, { borderColor: border, backgroundColor: surface }]}
  accessible={true}
  accessibilityLabel="Country code selector"
/>

                  <View style={{ flex: 1, marginBottom: 22 }}>
                    <ThemedText style={styles.label}>Mobile number*</ThemedText>
                    <TextInput
                      style={[styles.input, { borderColor: border, color: text, backgroundColor: surface }]}
                      value={mobileNo}
                      onChangeText={setMobileNo}
                      keyboardType="phone-pad"
                      textContentType="telephoneNumber"
                      autoComplete="tel"
                      accessibilityLabel="Mobile number"
                    />
                  </View>
                </View>

                <View style={styles.fieldBlock}>
                  <ThemedText style={styles.label}>Username (optional)</ThemedText>
                  <TextInput
                    style={[
                      styles.input,
                      { borderColor: border, color: text, backgroundColor: surface, marginBottom: 4 },
                    ]}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                    accessibilityLabel="Username (optional)"
                  />
                </View>

                <ThemedText style={styles.label}>Gender</ThemedText>
                <View
                  style={{
                    borderColor: border,
                    backgroundColor: surface,
                    borderWidth: 1,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    marginTop: 7,
                    height: 55,
                    justifyContent: "center",
                  }}
                >
                  {/* picker */}
                  <RNPickerSelect
                    onValueChange={setGender}
                    value={gender}
                    placeholder={{ label: "Select…", value: null }}
                    items={[
                      { label: "Female", value: "female" },
                      { label: "Male", value: "male" },
                      { label: "Non-binary", value: "non-binary" },
                      { label: "Prefer not to say", value: "prefer-not-to-say" },
                      { label: "Other", value: "other" },
                    ]}
                  />
                </View>
              </View>
            )}

            {/* STEP 2 — Security */}
            {step === 2 && (
              <View style={styles.stepInner}>
                <ThemedText
                  type="default"
                  style={[styles.sectionLead, { fontSize: 21, textAlign: "center", padding: 30 }]}
                >
                  Create a secure password
                </ThemedText>

                <View style={styles.fieldBlock}>
                  <ThemedText style={styles.label}>Password*</ThemedText>
                  <TextInput
                    style={[styles.input, { borderColor: border, color: text, backgroundColor: surface }]}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    textContentType="password"
                    autoComplete="password-new"
                    autoCorrect={false}
                    accessibilityLabel="Password"
                  />
                </View>

                {/* Strength meter & checklist */}
                <View style={styles.strengthBarWrap}>
                  <View style={[styles.strengthBar, { backgroundColor: getStrengthColor(strength.score) }]} />
                  <ThemedText type="default" style={{ marginLeft: 8, opacity: 0.8 }}>
                    {strength.label}
                  </ThemedText>
                </View>

                <View style={styles.checkList}>
                  {strength.checks.map((c, idx) => (
                    <Text key={idx} style={{ color: c.ok ? text : danger, fontSize: 13 }}>
                      {c.ok ? "✓" : "•"} {c.label}
                    </Text>
                  ))}
                </View>
              </View>
            )}
            {/* STEP 3 — Address */}
            {step === 3 && (
              <View style={styles.stepInner}>
                <ThemedText
                  type="default"
                  style={[
                    styles.sectionLead,
                    { fontSize: 21, textAlign: "center", padding: 30, marginTop: 10 },
                  ]}
                >
                  Current Location and T&C
                </ThemedText>

                {/* Address Search */}
                <View style={{ height: 300, width: "100%" }}>
                  <GooglePlacesAutocomplete
                    placeholder="Type an address"
                    fetchDetails={true}
                    query={{ key: GOOGLE_PLACES_API_KEY, language: "en" }}
                    styles={{
                      container: { flex: 1 },
                      textInput: {
                        height: 52,
                        borderWidth: 1,
                        borderRadius: 12,
                        paddingHorizontal: 14,
                      },
                      listView: {
                        backgroundColor: "white",
                        borderRadius: 8,
                        marginTop: 6,
                        elevation: 2,
                        zIndex: 100,
                      },
                    }}
                  />
                </View>


                {/* Terms & Conditions */}
                <View style={[styles.termsRow, { marginTop: 20 }]}>
                  <TouchableOpacity
                    onPress={() => setTermsAccepted((v) => !v)}
                    style={[styles.checkbox, { borderColor: border }]}
                  >
                    {termsAccepted ? (
                      <View style={[styles.checkboxInner, { backgroundColor: border }]} />
                    ) : null}
                  </TouchableOpacity>
                  <Text style={{ color: text }}>
                    I agree to the{" "}
                    <Text
                      style={{ color: border, textDecorationLine: "underline" }}
                      onPress={() =>
                        Alert.alert("Terms & Conditions", "Link to Terms & Privacy here.")
                      }
                    >
                      Terms & Conditions
                    </Text>
                  </Text>
                </View>
              </View>
            )}
          </View>
        }
      />

      {/* CTA bar */}
      <View
        style={[
          styles.footerBar,
          onlyNext ? styles.footerBarCentered : styles.footerBarSplit,
          { borderTopColor: surface },
        ]}
      >
        {!onlyNext && (
          <ThemedButton
            title="Back"
            onPress={onBack}
            type="secondary"
            style={styles.btnHalf}
            textStyle={styles.btnText}
            titleProps={{ numberOfLines: 1, adjustsFontSizeToFit: true }}
          />
        )}

        <ThemedButton
          title={step < STEPS_TOTAL - 1 ? "Next" : "Register"}
          onPress={step < STEPS_TOTAL - 1 ? onNext : handleRegister}
          disabled={step === 3 && !termsAccepted}
          style={onlyNext ? styles.btnCenter : styles.btnHalf}
          textStyle={styles.btnText}
          titleProps={{ numberOfLines: 1, adjustsFontSizeToFit: true }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  headerTop: {
    paddingTop: Platform.OS === "android" ? 18 : 22,
    paddingHorizontal: 20,
    paddingBottom: 8,
    alignItems: "center",
  },
  title: {
    marginTop: 4,
    textAlign: "center",
    alignSelf: "center",
  },
  stepSubtitle: {
    marginTop: 6,
    textAlign: "center",
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    marginTop: 10,
    overflow: "hidden",
    width: "100%",
    maxWidth: 640,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },

  stepWrap: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  stepInner: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 640,
  },

  sectionLead: {
    textAlign: "center",
    opacity: 0.9,
    marginTop: 12,
    marginBottom: 16,
    fontWeight: "bold",
  },

  row: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },

  fieldBlock: { marginBottom: 12 },

  label: {
    fontSize: 14,
    opacity: 0.9,
    marginBottom: 6,
  },

  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  ccBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    height: 48,
    minWidth: 90,
    borderWidth: 1,
    borderRadius: 10,
    justifyContent: "center",
  },

  strengthBarWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  strengthBar: {
    height: 8,
    borderRadius: 100,
    width: 120,
  },
  checkList: { marginTop: 8, gap: 4 },

  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 10,
  },
  checkbox: {
    height: 20,
    width: 20,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  checkboxInner: { height: 10, width: 10 },

  // CTA bar
  footerBar: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 35,
  },
  footerBarCentered: {
    flexDirection: "row",
    justifyContent: "center",
  },
  footerBarSplit: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  btnCenter: {
    minHeight: 48,
    minWidth: 200,
    alignSelf: "center",
  },
  btnHalf: {
    height: 48,
    minWidth: 140,
  },
  btnText: {
    includeFontPadding: false,
    textAlignVertical: "center",
    flexShrink: 1,
    fontSize: 18,
  },
  footerNote: {
    marginTop: 22,
    paddingTop: 16,
    paddingHorizontal: 20,
    width: "100%",
    alignItems: "flex-end",
  },
  loginHint: {
    fontSize: 16,
    opacity: 0.8,
    fontFamily: Platform.OS === "android" ? "sans-serif" : undefined,

  },
  loginLink: {
    textDecorationLine: "underline",
    fontFamily: Platform.OS === "android" ? "sans-serif" : undefined,
    fontWeight: "bold",
  },
});

//error messages

const STEP_ERRORS = {
  0: "First name, last name, a valid email (must include @ and end with .com), and a valid DOB (13+ years) are required.",
  1: "Please enter your mobile number.",
  2: "Password is too weak. Follow the tips to strengthen it.",
  3: "Please accept the Terms & Conditions to continue.",
};
