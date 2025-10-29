import React, { useEffect, useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Text,
  Animated,
  SafeAreaView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ThemedButton } from "@/components/ThemedButton";
import { BASE_URL } from "../config"; 

export default function VerifyScreen() {
  const [userName, setUserName] = useState(null);
  const [verificationIdType, setVerificationIdType] = useState("wwcc");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [number, setNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [progressAnim] = useState(new Animated.Value(0));

  // Date picker states
  const [expiryDate, setExpiryDate] = useState(null);
  const [dobDate, setDobDate] = useState(null);
  const [showExpiryPicker, setShowExpiryPicker] = useState(false);
  const [showDobPicker, setShowDobPicker] = useState(false);

  // Form validation errors
  const [firstNameErr, setFirstNameErr] = useState("");
  const [lastNameErr, setLastNameErr] = useState("");
  const [numberErr, setNumberErr] = useState("");
  const [expiryErr, setExpiryErr] = useState("");
  const [dobErr, setDobErr] = useState("");
  const [apiErr, setApiErr] = useState("");

  // Calculate completion progress
  const completedFields = [
    firstName.trim(),
    lastName.trim(), 
    number.trim(),
    expiryDate,
    dobDate,
  ].filter(Boolean).length;
  const totalFields = 5;
  const progressPercent = (completedFields / totalFields) * 100;

  // Date formatting utility functions
  const formatDateToDDMMYYYY = (date) => {
    if (!date) return "";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatDatePretty = (date) => {
    if (!date) return "";
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };


  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("user");
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUserName(parsedUser.userName);
        } else {
          Alert.alert("Error", "No user is logged in.");
          router.replace("/login");
        }
      } catch (error) {
        console.error("Error loading user from storage:", error);
      }
    };
    loadUser();
  }, []);

  // Animate progress bar
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progressPercent,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progressPercent]);

  const validate = () => {
    let isValid = true;
    
    // Clear previous errors
    setFirstNameErr("");
    setLastNameErr("");
    setNumberErr("");
    setExpiryErr("");
    setDobErr("");
    setApiErr("");

    // Validate required fields
    if (!firstName.trim()) {
      setFirstNameErr("First name is required");
      isValid = false;
    }
    if (!lastName.trim()) {
      setLastNameErr("Last name is required");
      isValid = false;
    }
    if (!number.trim()) {
      setNumberErr("ID number is required");
      isValid = false;
    }
    if (!expiryDate) {
      setExpiryErr("Expiry date is required");
      isValid = false;
    } else {
      // Check if expiry date is in the future
      const today = new Date();
      if (expiryDate <= today) {
        setExpiryErr("Expiry date must be in the future");
        isValid = false;
      }
    }
    if (!dobDate) {
      setDobErr("Date of birth is required");
      isValid = false;
    } else {
      // Check if person is at least 13 years old
      const today = new Date();
      const age = today.getFullYear() - dobDate.getFullYear();
      const monthDiff = today.getMonth() - dobDate.getMonth();
      const finalAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate()) ? age - 1 : age;
      
      if (finalAge < 13) {
        setDobErr("You must be at least 13 years old");
        isValid = false;
      }
    }

    return isValid;
  };

  const handleVerify = async () => {
    if (!userName) {
      setApiErr("User is not logged in.");
      return;
    }

    if (!validate()) return;

    const payload = {
      userName,
      verificationIdType,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      number: number.trim(),
      expiry: formatDateToDDMMYYYY(expiryDate),
      dob: formatDateToDDMMYYYY(dobDate),
    };

    try {
      setSubmitting(true);
      setApiErr("");
      
      const res = await fetch(`${BASE_URL}api/v1/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data = {};
      try {
        data = await res.json();
      } catch (_) {}

      if (res.ok && data && data.data && data.data.user) {
        const updatedUser = data.data.user;
        updatedUser.isVerified = true;
        await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
        Alert.alert("Success", "Identity verification completed successfully!", [
          {
            text: "Continue",
            onPress: () => router.replace("/home"),
          },
        ]);
      } else {
        const errorMsg = (data && data.message) || "Verification failed. Please check your details and try again.";
        setApiErr(errorMsg);
      }
    } catch (err) {
      console.error("Verification error:", err);
      setApiErr("Something went wrong. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#8B5CF6" />
      
      {/* Purple Gradient Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark" size={48} color="white" />
          </View>
          <Text style={styles.headerTitle}>Identity Verification</Text>
          <Text style={styles.headerSubtitle}>
            Secure your account with verified credentials
          </Text>
        </View>
        
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressInfo}>
            <Text style={styles.progressText}>{completedFields} of {totalFields}</Text>
            <Text style={styles.progressLabel}>Fields Completed</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <Animated.View 
              style={[
                styles.progressBarFill,
                { 
                  width: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%']
                  })
                }
              ]}
            />
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          {/* ID Type Selection Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="card-outline" size={24} color="#8B5CF6" />
              <Text style={styles.cardTitle}>Identification Type</Text>
            </View>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={verificationIdType}
                onValueChange={(itemValue) => setVerificationIdType(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="🎫 Working with Children Check (WWCC)" value="wwcc" />
                <Picker.Item label="🪪 Driver's License" value="license" />
              </Picker>
            </View>
          </View>

          {/* Personal Information Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="person-outline" size={24} color="#8B5CF6" />
              <Text style={styles.cardTitle}>Personal Information</Text>
            </View>

            {/* First Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>First Name *</Text>
              <View style={[styles.inputWrapper, firstNameErr && styles.inputError]}>
                <Ionicons name="person" size={20} color={firstNameErr ? "#EF4444" : "#8B5CF6"} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your first name"
                  value={firstName}
                  onChangeText={(v) => {
                    setFirstName(v);
                    if (firstNameErr) setFirstNameErr("");
                    if (apiErr) setApiErr("");
                  }}
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                />
                {firstName.trim() && (
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                )}
              </View>
              {!!firstNameErr && (
                <Text style={styles.errorText}>{firstNameErr}</Text>
              )}
            </View>

            {/* Last Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Last Name *</Text>
              <View style={[styles.inputWrapper, lastNameErr && styles.inputError]}>
                <Ionicons name="person" size={20} color={lastNameErr ? "#EF4444" : "#8B5CF6"} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your last name"
                  value={lastName}
                  onChangeText={(v) => {
                    setLastName(v);
                    if (lastNameErr) setLastNameErr("");
                    if (apiErr) setApiErr("");
                  }}
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                />
                {lastName.trim() && (
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                )}
              </View>
              {!!lastNameErr && (
                <Text style={styles.errorText}>{lastNameErr}</Text>
              )}
            </View>

            {/* ID Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ID Number *</Text>
              <View style={[styles.inputWrapper, numberErr && styles.inputError]}>
                <Ionicons name="key" size={20} color={numberErr ? "#EF4444" : "#8B5CF6"} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your ID number"
                  value={number}
                  onChangeText={(v) => {
                    setNumber(v);
                    if (numberErr) setNumberErr("");
                    if (apiErr) setApiErr("");
                  }}
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="next"
                />
                {number.trim() && (
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                )}
              </View>
              {!!numberErr && (
                <Text style={styles.errorText}>{numberErr}</Text>
              )}
            </View>

            {/* Date of Birth */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Date of Birth *</Text>
              <TouchableOpacity
                style={[styles.inputWrapper, dobErr && styles.inputError]}
                onPress={() => setShowDobPicker(true)}
              >
                <Ionicons name="calendar" size={20} color={dobErr ? "#EF4444" : "#8B5CF6"} />
                <Text style={[styles.dateText, !dobDate && styles.placeholderText]}>
                  {dobDate ? formatDatePretty(dobDate) : "Select your date of birth"}
                </Text>
                {dobDate && (
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                )}
              </TouchableOpacity>
              {!!dobErr && (
                <Text style={styles.errorText}>{dobErr}</Text>
              )}
              {showDobPicker && (
                <DateTimePicker
                  value={dobDate || new Date(2000, 0, 1)}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  maximumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    setShowDobPicker(false);
                    if (selectedDate) {
                      setDobDate(selectedDate);
                      if (dobErr) setDobErr("");
                      if (apiErr) setApiErr("");
                    }
                  }}
                />
              )}
            </View>

            {/* Expiry Date */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ID Expiry Date *</Text>
              <TouchableOpacity
                style={[styles.inputWrapper, expiryErr && styles.inputError]}
                onPress={() => setShowExpiryPicker(true)}
              >
                <Ionicons name="time" size={20} color={expiryErr ? "#EF4444" : "#8B5CF6"} />
                <Text style={[styles.dateText, !expiryDate && styles.placeholderText]}>
                  {expiryDate ? formatDatePretty(expiryDate) : "Select expiry date"}
                </Text>
                {expiryDate && (
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                )}
              </TouchableOpacity>
              {!!expiryErr && (
                <Text style={styles.errorText}>{expiryErr}</Text>
              )}
              {showExpiryPicker && (
                <DateTimePicker
                  value={expiryDate || new Date()}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  minimumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    setShowExpiryPicker(false);
                    if (selectedDate) {
                      setExpiryDate(selectedDate);
                      if (expiryErr) setExpiryErr("");
                      if (apiErr) setApiErr("");
                    }
                  }}
                />
              )}
            </View>
          </View>

          {/* API Error */}
          {!!apiErr && (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle" size={24} color="#EF4444" />
              <Text style={styles.errorCardText}>{apiErr}</Text>
            </View>
          )}

          {/* Security Notice */}
          <View style={styles.securityCard}>
            <View style={styles.securityHeader}>
              <Ionicons name="lock-closed" size={22} color="#8B5CF6" />
              <Text style={styles.securityTitle}>Your Data is Secure</Text>
            </View>
            <Text style={styles.securityText}>
              All information is encrypted and used only for verification. We comply with privacy regulations and never share your data.
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, (!completedFields || submitting) && styles.submitButtonDisabled]}
            onPress={submitting ? undefined : handleVerify}
            disabled={!completedFields || submitting}
            activeOpacity={0.8}
          >
            <View style={styles.buttonContent}>
              {submitting ? (
                <>
                  <Ionicons name="hourglass-outline" size={24} color="white" />
                  <Text style={styles.buttonText}>Verifying...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="shield-checkmark" size={24} color="white" />
                  <Text style={styles.buttonText}>Verify My Identity</Text>
                </>
              )}
            </View>
          </TouchableOpacity>

          {/* Help Link */}
          <TouchableOpacity
            style={styles.helpButton}
            onPress={() => 
              Alert.alert(
                "Need Help?", 
                "If you're having trouble with verification, please contact our support team for assistance.",
                [{ text: "OK" }]
              )
            }
          >
            <Ionicons name="help-circle-outline" size={20} color="#8B5CF6" />
            <Text style={styles.helpText}>Need help with verification?</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  flex: {
    flex: 1,
  },
  
  // Purple Gradient Header
  header: {
    backgroundColor: '#8B5CF6',
    paddingTop: Platform.OS === 'ios' ? 20 : 30,
    paddingBottom: 30,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Progress Indicator
  progressContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 16,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressText: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
  },
  progressLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  
  // Scroll Content
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  
  // Card Styles
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  
  // Picker
  pickerWrapper: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  picker: {
    height: 52,
    width: '100%',
    color: '#1F2937',
  },
  
  // Input Group
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    height: 52,
    gap: 10,
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    height: '100%',
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginTop: 6,
    marginLeft: 4,
  },
  
  // Error Card
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  errorCardText: {
    flex: 1,
    fontSize: 14,
    color: '#991B1B',
    lineHeight: 20,
  },
  
  // Security Card
  securityCard: {
    backgroundColor: '#F3E8FF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B21A8',
  },
  securityText: {
    fontSize: 13,
    color: '#7C3AED',
    lineHeight: 20,
  },
  
  // Submit Button
  submitButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
    paddingVertical: 18,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#E5E7EB',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  
  // Help Button
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  helpText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '600',
  },
});
