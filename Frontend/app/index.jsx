// Frontend/app/index.jsx
import React, { useEffect, useMemo } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Platform,
  useColorScheme,
  StatusBar,
  Image,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { ThemedButton } from "@/components/ThemedButton";
import { Typography } from "@/constants/Typography";
import { LightTheme, DarkTheme } from "@/constants/theme";
import 'react-native-get-random-values';

const { width, height } = Dimensions.get("window");

export default function WelcomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? DarkTheme : LightTheme;

  // Pick logo based on theme
  const logoSource = useMemo(() => {
    try {
      return colorScheme === "dark"
        ? require("../assets/images/darklogo.png")
        : require("../assets/images/lightlogo.png");
    } catch {
      return require("../assets/images/BeSide.png"); // fallback
    }
  }, [colorScheme]);

  const handleLogin = () => router.push("/login");
  const handleRegister = () => router.push("/register");

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
      />

      {/* Center content */}
      <View style={styles.centerBlock}>

        {/* Brand logo */}
        <Image
          source={logoSource}
          resizeMode="contain"
          accessibilityLabel="BeSide logo"
          style={styles.logo}
        />

        {/* Subtitle */}
        <ThemedText
          style={[Typography.subtitle, styles.subtitle, { color: theme.text }]}
        >
          Your journey, made safer. Join us today
        </ThemedText>

        {/* Buttons */}
        <View style={styles.ctaGroup}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleLogin}
            style={styles.ctaTouch}
          >
            <ThemedButton
              title="Login"
              type="secondary"
              onPress={handleLogin}
              style={styles.ctaSameSize}
            />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleRegister}
            style={[styles.ctaTouch, { marginTop: 14 }]}
          >
            <ThemedButton
              title="Register"
              type="primary"
              onPress={handleRegister}
              style={styles.ctaSameSize}
            />
          </TouchableOpacity>
        </View>

        {/* Trust line */}
        <ThemedText
          style={[
            Typography.caption,
            styles.reassure,
            { color: theme.text, opacity: 0.7 },
          ]}
        >
          Your privacy is respected. Your safety is our priority.
        </ThemedText>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <ThemedText
          style={[
            Typography.caption,
            { color: theme.text, textAlign: "center" },
          ]}
        >
          Brought to you by — the BeSide team
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  centerBlock: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "android" ? 24 : 40,
    alignItems: "center",
    justifyContent: "center",
  },

  logo: {
    width: Math.min(width * 0.7, 320), 
    height: Math.min(height * 0.9, 290),
  },


  subtitle: {
    textAlign: "center",
    marginBottom: 20,
  },

  ctaGroup: {
    width: "100%",
    alignItems: "center",
    marginTop: 10,
  },
  ctaTouch: {
    width: "80%",
  },
  ctaSameSize: {
    width: "100%",
    height: 52,
    alignSelf: "center",
  },

  reassure: {
    marginTop: 24,
    textAlign: "center",
    fontStyle: "italic",
    maxWidth: 340,
  },

  footer: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
