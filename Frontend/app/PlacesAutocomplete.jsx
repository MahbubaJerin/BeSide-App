import React, { useEffect, useState } from 'react';
import { View, TextInput, FlatList, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Constants from 'expo-constants';

const GOOGLE_MAPS_API_KEY = Constants.expoConfig.android.config.googleMaps.apiKey;

function useDebounced(value, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/**
 * Props:
 * - placeholder?: string
 * - onPlaceSelected: (sel: { name, address, latitude, longitude }) => void
 * - style?: any
 * - disabled?: boolean
 */
export default function PlacesAutocomplete({
  placeholder = 'Search...',
  onPlaceSelected,
  style,
  disabled = false,
}) {
  const [input, setInput] = useState('');
  const debounced = useDebounced(input);
  const [predictions, setPredictions] = useState([]);
  const [sessionToken, setSessionToken] = useState(() =>
    Math.random().toString(36).slice(2)
  );

  // Query autocomplete
  useEffect(() => {
    if (disabled) return;
    if (!debounced || debounced.length < 2) {
      setPredictions([]);
      return;
    }
    const url =
      `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
      `?input=${encodeURIComponent(debounced)}` +
      `&key=${GOOGLE_MAPS_API_KEY}` +
      `&sessiontoken=${sessionToken}`;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(url);
        const json = await res.json();
        if (!cancelled) setPredictions(json?.predictions || []);
      } catch {
        if (!cancelled) setPredictions([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debounced, sessionToken, disabled]);

  // When user taps a prediction, fetch Place Details → lat/lng
  const pickPrediction = async (prediction) => {
    try {
      const detailsUrl =
        `https://maps.googleapis.com/maps/api/place/details/json` +
        `?place_id=${prediction.place_id}` +
        `&fields=geometry,name,formatted_address` +
        `&key=${GOOGLE_MAPS_API_KEY}` +
        `&sessiontoken=${sessionToken}`;
      const res = await fetch(detailsUrl);
      const json = await res.json();
      const loc = json?.result?.geometry?.location;
      if (loc && onPlaceSelected) {
        onPlaceSelected({
          name: json?.result?.name ?? prediction.description,
          address: json?.result?.formatted_address ?? prediction.description,
          latitude: loc.lat,
          longitude: loc.lng,
        });
      }
      // reset for next flow and reflect selection in the input
      setSessionToken(Math.random().toString(36).slice(2));
      setInput(prediction.description);
      setPredictions([]);
    } catch {
      // ignore
    }
  };

  return (
    <View style={[styles.container, style]}>
      <TextInput
        placeholder={placeholder}
        value={input}
        onChangeText={setInput}
        style={styles.input}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        editable={!disabled}
      />
      {predictions.length > 0 && !disabled && (
        <View style={styles.dropdown} pointerEvents="box-none">
          <FlatList
            keyboardShouldPersistTaps="handled"
            data={predictions}
            keyExtractor={(item) => item.place_id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.item} onPress={() => pickPrediction(item)}>
                <Text numberOfLines={2}>{item.description}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative' },
  input: {
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  dropdown: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    maxHeight: 260,
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden',
    zIndex: 9999,
    elevation: 9999,
  },
  item: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
});
