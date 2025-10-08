import React, { useEffect, useRef, useState } from "react";
import { View, TextInput, FlatList, TouchableOpacity, Text, StyleSheet } from "react-native";
import Constants from 'expo-constants';

// Using environment variable directly for API key
const GOOGLE_KEY = Constants.expoConfig?.extra?.expoPublicGoogleMapsApiKey || 'AIzaSyBGfvZy7uxsDpUNoUFE3CpSgAlGhtsZgoA';

/**
 * Lightweight Google Places Autocomplete powered by the Web Service API.
 * Props:
 *  - placeholder, value, onChangeText
 *  - onSelect: ({ description, place_id, coordinates: { latitude, longitude } })
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
}) {
  const [predictions, setPredictions] = useState([]);
  const [open, setOpen] = useState(false);
  const sessionRef = useRef(`${Date.now()}-${Math.random()}`);

  useEffect(() => {
    if (disabled) { setPredictions([]); return; }
    if (!value || value.trim().length < 2) { setPredictions([]); return; }
    const h = setTimeout(() => fetchPredictions(value.trim()), 250); // debounce
    return () => clearTimeout(h);
  }, [value, disabled]);

  async function fetchPredictions(input) {
    try {
      if (!GOOGLE_KEY) { 
        console.warn("Missing Google Maps API Key"); 
        return; 
      }
      const url =
        "https://maps.googleapis.com/maps/api/place/autocomplete/json" +
        `?input=${encodeURIComponent(input)}` +
        `&key=${GOOGLE_KEY}` +
        `&types=address` +
        `&location=-37.8136,144.9631` +
        `&radius=50000` +
        (country ? `&components=country:${country}` : "") +
        `&sessiontoken=${sessionRef.current}`;
      
      const res = await fetch(url);
      const data = await res.json();
      
      if (data?.status === "OK") {
        setPredictions(data.predictions || []);
      } else { 
        setPredictions([]); 
        if (data?.status && data.status !== "ZERO_RESULTS") 
          console.warn("Places API Error:", data.status, data?.error_message); 
      }
    } catch (e) {
      console.warn("Places autocomplete error:", e?.message || e);
      setPredictions([]);
    }
  }

  // Update the fetchDetails function to ensure consistent coordinate format
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
      if (g && typeof g.lat === "number" && typeof g.lng === "number") {
        // Return coordinates in the exact format expected by MapView
        return {
          coordinates: {
            latitude: parseFloat(g.lat),
            longitude: parseFloat(g.lng)
          }
        };
      }
    }
    return null;
  } catch (e) { 
    console.warn("Place details error:", e); 
    return null; 
  }
}
// Add coordinate validation helper
function isValidCoordinate(lat, lng) {
  return (
    typeof lat === 'number' && 
    typeof lng === 'number' && 
    !isNaN(lat) && 
    !isNaN(lng) && 
    lat >= -90 && 
    lat <= 90 && 
    lng >= -180 && 
    lng <= 180
  );
}
  // Update handlePressPrediction to ensure coordinates are properly passed
const handlePressPrediction = async (item) => {
  const details = await fetchDetails(item.place_id);
  if (details?.coordinates) {
    onSelect({
      description: item.description,
      place_id: item.place_id,
      coordinates: details.coordinates
    });
    onChangeText(item.description);
  } else {
    onSelect(null);
  }
  setOpen(false);
};

  return (
    <View style={[styles.container, style]}>
      <TextInput
        value={value}
        placeholder={placeholder}
        editable={!disabled}
        onChangeText={(t) => { onChangeText?.(t); setOpen(true); }}
        onFocus={() => setOpen(true)}
        style={[styles.input, disabled && { backgroundColor: "#f2f2f2" }]}
        autoCorrect={false}
        autoCapitalize="none"
      />
      {open && predictions.length > 0 && (
        <FlatList
          keyboardShouldPersistTaps="handled"
          style={styles.list}
          data={predictions}
          keyExtractor={(it) => it.place_id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} onPress={() => handlePressPrediction(item)}>
              <Text numberOfLines={2} style={styles.rowText}>{item.description}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    position: "relative", 
    zIndex: 1000 
  },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#dfe1e5",
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  list: {
    position: "absolute",
    top: 48,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 10,
    maxHeight: 240,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
  },
  row: { 
    paddingVertical: 12, 
    paddingHorizontal: 12, 
    borderBottomWidth: StyleSheet.hairlineWidth, 
    borderBottomColor: "#eee" 
  },
  rowText: { 
    fontSize: 14, 
    color: "#222" 
  },
});