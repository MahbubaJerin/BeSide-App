// Frontend/components/GooglePlacesInput.jsx
import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

export default function GooglePlacesInput({
  placeholder = "Where are you going?",
  onLocationSelected,
  icon = "location",
  containerStyle = {},
  currentLocationButton = true,
  onCurrentLocationPress
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handlePlaceSelect = (data, details = null) => {
    console.log('📍 [PLACES] Place selected:', data.description);
    console.log('📍 [PLACES] Place details:', details);

    if (details && details.geometry) {
      const location = {
        latitude: details.geometry.location.lat,
        longitude: details.geometry.location.lng,
        address: data.description,
        placeId: data.place_id,
        name: details.name || data.structured_formatting?.main_text || data.description
      };

      console.log('📍 [PLACES] Formatted location:', location);
      onLocationSelected?.(location);
    } else {
      Alert.alert(
        "Location Error",
        "Could not get location details. Please try selecting another location."
      );
    }
  };

  if (!GOOGLE_MAPS_KEY) {
    console.error('❌ [PLACES] Google Maps API key is missing');
    return null;
  }

  return (
    <View style={[styles.container, containerStyle]}>
      <GooglePlacesAutocomplete
        placeholder={placeholder}
        onPress={handlePlaceSelect}
        query={{
          key: GOOGLE_MAPS_KEY,
          language: 'en',
          types: 'establishment',
          components: 'country:au', // Restrict to Australia
        }}
        fetchDetails={true}
        enablePoweredByContainer={false}
        styles={{
          container: styles.autocompleteContainer,
          textInputContainer: styles.textInputContainer,
          textInput: styles.textInput,
          listView: styles.listView,
          row: styles.row,
          separator: styles.separator,
          description: styles.description,
          poweredContainer: {
            display: 'none'
          }
        }}
        textInputProps={{
          placeholderTextColor: Colors.light.tabIconDefault,
          returnKeyType: 'search',
          clearButtonMode: 'while-editing',
          selectTextOnFocus: true,
        }}
        renderLeftButton={() => (
          <View style={styles.iconContainer}>
            <Ionicons
              name={icon}
              size={20}
              color={Colors.light.tabIconDefault}
            />
          </View>
        )}
        renderRightButton={() => 
          currentLocationButton ? (
            <View style={styles.currentLocationButton}>
              <Ionicons
                name="locate"
                size={20}
                color={Colors.light.tint}
                onPress={onCurrentLocationPress}
              />
            </View>
          ) : null
        }
        debounce={300}
        minLength={2}
        nearbyPlacesAPI="GooglePlacesSearch"
        GooglePlacesSearchQuery={{
          rankby: 'distance',
        }}
        filterReverseGeocodingByTypes={[
          'locality',
          'administrative_area_level_3',
        ]}
        predefinedPlaces={[]}
        predefinedPlacesAlwaysVisible={false}
        suppressDefaultStyles={false}
        onFail={error => {
          console.error('❌ [PLACES] Google Places error:', error);
          Alert.alert(
            "Search Error",
            "Could not search for locations. Please check your internet connection."
          );
        }}
        onNotFound={() => {
          Alert.alert(
            "No Results",
            "No locations found for your search. Please try a different search term."
          );
        }}
        onTimeout={() => {
          Alert.alert(
            "Search Timeout",
            "Location search timed out. Please try again."
          );
        }}
        timeout={15000}
        keepResultsAfterBlur={false}
        disableScroll={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    zIndex: 1000,
  },
  autocompleteContainer: {
    flex: 0,
    zIndex: 1000,
  },
  textInputContainer: {
    backgroundColor: Colors.light.background,
    borderTopWidth: 0,
    borderBottomWidth: 0,
    paddingHorizontal: 0,
    marginHorizontal: 0,
    height: 50,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    backgroundColor: 'transparent',
    height: 50,
    borderRadius: 25,
    paddingVertical: 5,
    paddingHorizontal: 10,
    fontSize: 16,
    flex: 1,
    color: Colors.light.text,
  },
  iconContainer: {
    paddingLeft: 15,
    paddingRight: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentLocationButton: {
    paddingRight: 15,
    paddingLeft: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listView: {
    backgroundColor: Colors.light.background,
    borderRadius: 10,
    marginTop: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    maxHeight: 200,
  },
  row: {
    backgroundColor: Colors.light.background,
    padding: 13,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: Colors.light.tabIconDefault + '20',
    marginLeft: 13,
    marginRight: 13,
  },
  description: {
    fontSize: 14,
    color: Colors.light.text,
    flex: 1,
  },
});