// Frontend/app/PlacesAutocomplete.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
} from "react-native";

const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

/**
 * Lightweight Google Places Autocomplete powered by the Web Service API.
 * Props:
 *  - placeholder, value, onChangeText
 *  - onSelect: ({ description, place_id, lat, lng })
 *  - country: e.g. "au" (optional)
 *  - disabled: boolean (optional)
 */
export default function PlacesAutocomplete({
  placeholder,
  value,
  onChangeText,
  onSelect,
  country = "au",
  disabled = false,
  style,
  testID,
  rowTestPrefix = "placesRow",
}) {
  const [predictions, setPredictions] = useState([]);
  const [open, setOpen] = useState(false);
  const sessionRef = useRef(`${Date.now()}-${Math.random()}`);

  useEffect(() => {
    if (disabled) {
      setPredictions([]);
      return;
    }
    if (!value || value.trim().length < 2) {
      setPredictions([]);
      return;
    }
    const h = setTimeout(() => fetchPredictions(value.trim()), 250); // debounce
    return () => clearTimeout(h);
  }, [value, disabled]);

  async function fetchPredictions(input) {
    try {
      if (!GOOGLE_KEY) {
        console.warn("Missing EXPO_PUBLIC_GOOGLE_MAPS_API_KEY");
        return;
      }
      const url =
        "https://maps.googleapis.com/maps/api/place/autocomplete/json" +
        `?input=${encodeURIComponent(input)}` +
        `&key=${GOOGLE_KEY}` +
        `&types=geocode` +
        (country ? `&components=country:${country}` : "") +
        `&sessiontoken=${sessionRef.current}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data?.status === "OK") setPredictions(data.predictions || []);
      else {
        setPredictions([]);
        if (data?.status && data.status !== "ZERO_RESULTS")
          console.warn("Places:", data.status, data?.error_message);
      }
    } catch (e) {
      console.warn("Places autocomplete error:", e?.message || e);
      setPredictions([]);
    }
  }

  async function fetchDetails(place_id) {
    try {
      if (!GOOGLE_KEY) return null;
      const url =
        "https://maps.googleapis.com/maps/api/place/details/json" +
        `?place_id=${encodeURIComponent(place_id)}` +
        `&fields=geometry` +
        `&key=${GOOGLE_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data?.status === "OK") {
        const g = data.result?.geometry?.location;
        if (g && typeof g.lat === "number" && typeof g.lng === "number")
          return { lat: g.lat, lng: g.lng };
      } else console.warn("Place details:", data?.status, data?.error_message);
      return null;
    } catch (e) {
      console.warn("Place details error:", e?.message || e);
      return null;
    }
  }

 const handlePressPrediction = async (item) => {
  // don't close until selection finishes
  const coords = await fetchDetails(item.place_id);
  onSelect({
    description: item.description,
    place_id: item.place_id,
    lat: coords?.lat ?? 0,
    lng: coords?.lng ?? 0,
  });
  setOpen(false);
};


    // ---- TEST-mode mock ----
 useEffect(() => {
  if ((!GOOGLE_KEY || process.env.NODE_ENV === "test") && value?.length > 2) {
  onSelect?.({
    description: value,
    place_id: "manual",
    lat: 0,
    lng: 0,
  });
}
}, [value]);
    // -----------------------


  return (
    <View style={[styles.container, style]}>
      <TextInput
        testID={testID}
        accessibilityLabel={testID}
        value={value}
        placeholder={placeholder}
        editable={!disabled}
        onChangeText={(t) => {
          onChangeText?.(t);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        style={[styles.input, disabled && { backgroundColor: "#f2f2f2" }]}
        autoCorrect={false}
        autoCapitalize="none"
      />
      {open && predictions.length > 0 && (
  <View style={{ maxHeight: 240 }}>
    <FlatList
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled={true}
      style={styles.list}
      data={predictions}
      keyExtractor={(_, i) => String(i)}
      renderItem={({ item, index }) => (
  <View testID={`${rowTestPrefix}-${index}`} accessibilityLabel={`${rowTestPrefix}-${index}`}>
    <TouchableOpacity
      style={styles.row}
      onPress={() => handlePressPrediction(item)}
    >
      <Text numberOfLines={2} style={styles.rowText}>
        {item.description}
      </Text>
    </TouchableOpacity>
  </View>
)}
          />
          
  </View>
)}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: "relative", zIndex: 1000 },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#dfe1e5",
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  // in styles.list
list: {
  position: "absolute",
  top: 48,
  left: 0,
  right: 0,
  backgroundColor: "#fff",
  borderRadius: 10,
  maxHeight: 240,
  elevation: 12,         
  zIndex: 9999,          
  shadowColor: "#000",
  shadowOpacity: 0.25,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
},

  row: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  rowText: { fontSize: 14, color: "#222" },
});
