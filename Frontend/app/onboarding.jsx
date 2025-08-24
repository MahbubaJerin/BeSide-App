import React from "react";
import { View, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { ThemedButton } from "@/components/ThemedButton";

export default function Onboarding() {
  const router = useRouter();

  const handleGetStarted = async () => {
    await AsyncStorage.setItem("firstRunDone", "true");
    const token = await AsyncStorage.getItem("token");
    router.replace(token ? "/home" : "/login");
  };

  return (
    <View style={styles.container}>
      <ThemedText type="title">Welcome to BeSide</ThemedText>
      <ThemedText style={{ textAlign: "center", marginVertical: 12 }}>
        Quick intro and safety guidelines. You can change these later in
        Profile.
      </ThemedText>
      <ThemedButton title="Get Started" onPress={handleGetStarted} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
});
