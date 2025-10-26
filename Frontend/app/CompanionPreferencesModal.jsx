// Frontend/app/CompanionPreferencesModal.jsx
import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  Modal, 
  StyleSheet, 
  Switch, 
  Alert, 
  TouchableOpacity, 
  ScrollView,
  TextInput,
  SafeAreaView,
  StatusBar
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline } from 'react-native-maps';
import PlacesAutocomplete from "./PlacesAutocomplete";
import { ThemedButton } from "@/components/ThemedButton";
import { ThemedText } from "@/components/ThemedText";

export default function CompanionPreferencesModal({
  visible,
  onClose,
  onSubmit,
  prefillStart = null,
  prefillDestination = null,
}) {
  const [talk, setTalk] = useState(false);

  const [startText, setStartText] = useState("");
  const [destText, setDestText] = useState("");

  const [startCoordinates, setStartCoordinates] = useState(null);        // { latitude, longitude }
  const [destinationCoordinates, setDestinationCoordinates] = useState(null);

  const [transport, setTransport] = useState("walk");
  const [gender, setGender] = useState("any");
  const [loading, setLoading] = useState(false);
  
  // New state for modern interface
  const [showDestinationSearch, setShowDestinationSearch] = useState(false);
  const [showMeetingPointSearch, setShowMeetingPointSearch] = useState(false);
  const [routeDistance, setRouteDistance] = useState("4.2 km");
  const [routeDuration, setRouteDuration] = useState("15 min");
  const [mapRef, setMapRef] = useState(null);
  const [region, setRegion] = useState({
    latitude: -37.8136,
    longitude: 144.9631,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  // Prefills coming from map/home.jsx (optional)
  useEffect(() => {
    if (prefillStart) {
      setStartCoordinates(prefillStart);
      setStartText(`Pinned (${prefillStart.latitude.toFixed(5)}, ${prefillStart.longitude.toFixed(5)})`);
    }
  }, [prefillStart]);
  useEffect(() => {
    if (prefillDestination) {
      setDestinationCoordinates(prefillDestination);
      setDestText(`Pinned (${prefillDestination.latitude.toFixed(5)}, ${prefillDestination.longitude.toFixed(5)})`);
    }
  }, [prefillDestination]);

  // Selection handlers from PlacesAutocomplete
  const handleStartSelected = (item) => {
    if (!item) return;
    setStartText(item.description);
    setStartCoordinates({ latitude: item.lat, longitude: item.lng });
  };
  const handleDestSelected = (item) => {
    if (!item) return;
    setDestText(item.description);
    const destCoords = { latitude: item.lat, longitude: item.lng };
    setDestinationCoordinates(destCoords);
    
    // Update map region to show destination
    setRegion({
      ...destCoords,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
    
    // Calculate approximate distance and duration (placeholder)
    setRouteDistance("4.2 km");
    setRouteDuration("15 min");
  };

  const handleConfirm = () => {
    if (!startCoordinates) return Alert.alert("Missing Meeting Point", "Please choose a meeting point where you'll meet your companion.");
    if (!destinationCoordinates) return Alert.alert("Missing destination", "Please choose a destination.");

    onSubmit({
      startCoordinates,
      destinationCoordinates,
      startAddress: startText,
      destinationAddress: destText,
      transport,
      gender,
      talk,
    });
    onClose?.();
  };

  return (
    <Modal animationType="slide" visible={visible} onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#8B5CF6" />
        
        {/* Purple Gradient Header - Same as Homepage */}
        <View style={styles.gradientHeader}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.backButton} onPress={onClose}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <ThemedText style={styles.headerTitle}>Meeting Point & Destination</ThemedText>
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="notifications-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Map Container */}
        <View style={styles.mapContainer}>
          <MapView
            ref={setMapRef}
            style={styles.map}
            region={region}
            onRegionChangeComplete={setRegion}
            showsUserLocation={true}
            showsMyLocationButton={false}
          >
            {startCoordinates && (
              <Marker
                coordinate={startCoordinates}
                title="Starting Point"
                pinColor="#10b981"
              />
            )}
            {destinationCoordinates && (
              <Marker
                coordinate={destinationCoordinates}
                title="Destination"
                pinColor="#8B5CF6"
              />
            )}
          </MapView>

          {/* Route Information Card */}
          <View style={styles.routeInfoCard}>
            <View style={styles.routeHeader}>
              <View style={styles.routeStats}>
                <View style={styles.routeStat}>
                  <Ionicons name="bus" size={16} color="#8B5CF6" />
                  <ThemedText style={styles.routeStatText}>{routeDistance}</ThemedText>
                </View>
                <View style={styles.routeStat}>
                  <Ionicons name="time" size={16} color="#8B5CF6" />
                  <ThemedText style={styles.routeStatText}>{routeDuration}</ThemedText>
                </View>
              </View>
            </View>
          </View>

          {/* Destination Cards */}
          <View style={styles.destinationCards}>
            {/* Meeting Point Card */}
            <TouchableOpacity style={styles.destinationCard} onPress={() => setShowMeetingPointSearch(true)}>
              <View style={styles.cardIcon}>
                <Ionicons name="people" size={20} color="#10b981" />
              </View>
              <View style={styles.cardContent}>
                <ThemedText style={styles.cardTitle}>{startText || "Meeting Point"}</ThemedText>
                <ThemedText style={styles.cardSubtext}>Where you'll meet</ThemedText>
              </View>
            </TouchableOpacity>

            {/* Current destination or add new */}
            {destText ? (
              <TouchableOpacity style={styles.destinationCard} onPress={() => setShowDestinationSearch(true)}>
                <View style={styles.cardIcon}>
                  <Ionicons name="flag" size={20} color="#8B5CF6" />
                </View>
                <View style={styles.cardContent}>
                  <ThemedText style={styles.cardTitle} numberOfLines={1}>{destText}</ThemedText>
                  <ThemedText style={styles.cardSubtext}>{routeDistance}</ThemedText>
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.addDestinationCard} onPress={() => setShowDestinationSearch(true)}>
                <View style={styles.addIcon}>
                  <Ionicons name="add" size={24} color="#8B5CF6" />
                </View>
                <ThemedText style={styles.addDestinationText}>Add Destination</ThemedText>
              </TouchableOpacity>
            )}
          </View>

          {/* Search Overlays */}
          {/* Meeting Point Search */}
          {showMeetingPointSearch && (
            <View style={styles.searchOverlay}>
              <View style={styles.searchHeader}>
                <TouchableOpacity onPress={() => setShowMeetingPointSearch(false)}>
                  <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <ThemedText style={styles.searchTitle}>Choose Meeting Point</ThemedText>
              </View>
              
              <PlacesAutocomplete
                placeholder="Search for meeting point..."
                value={startText}
                onChangeText={setStartText}
                onSelect={(item) => {
                  handleStartSelected(item);
                  setShowMeetingPointSearch(false);
                }}
                country="au"
                style={styles.searchInput}
              />
            </View>
          )}
          
          {/* Destination Search */}
          {showDestinationSearch && (
            <View style={styles.searchOverlay}>
              <View style={styles.searchHeader}>
                <TouchableOpacity onPress={() => setShowDestinationSearch(false)}>
                  <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <ThemedText style={styles.searchTitle}>Choose Destination</ThemedText>
              </View>
              <PlacesAutocomplete
                placeholder="Search destination..."
                value={destText}
                onChangeText={setDestText}
                onSelect={(item) => {
                  handleDestSelected(item);
                  setShowDestinationSearch(false);
                }}
                country="au"
                style={styles.searchInput}
              />
            </View>
          )}
        </View>

        {/* Bottom Panel */}
        <View style={styles.bottomPanel}>
          {/* Preferences Section */}
          <View style={styles.preferencesSection}>
            {/* Transport Mode */}
            <View style={styles.preferenceRow}>
              <ThemedText style={styles.preferenceLabel}>Transport Mode</ThemedText>
              <View style={styles.transportOptions}>
                {['walk', 'bus', 'train', 'car'].map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.transportButton, transport === mode && styles.transportButtonActive]}
                    onPress={() => setTransport(mode)}
                  >
                    <Ionicons 
                      name={mode === 'walk' ? 'walk' : mode === 'bus' ? 'bus' : mode === 'train' ? 'train' : 'car'} 
                      size={20} 
                      color={transport === mode ? 'white' : '#8B5CF6'} 
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Gender Preference */}
            <View style={styles.preferenceRow}>
              <ThemedText style={styles.preferenceLabel}>Companion Gender</ThemedText>
              <View style={styles.genderOptions}>
                {[{label: 'Any', value: 'any'}, {label: 'Female', value: 'female'}, {label: 'Male', value: 'male'}].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.genderButton, gender === option.value && styles.genderButtonActive]}
                    onPress={() => setGender(option.value)}
                  >
                    <ThemedText style={[styles.genderButtonText, gender === option.value && styles.genderButtonTextActive]}>
                      {option.label}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Talk Preference */}
            <View style={styles.preferenceRow}>
              <ThemedText style={styles.preferenceLabel}>Would you like to talk?</ThemedText>
              <Switch 
                value={talk} 
                onValueChange={setTalk}
                trackColor={{ false: "#e2e8f0", true: "#8B5CF6" }}
                thumbColor={talk ? "#ffffff" : "#f4f3f4"}
              />
            </View>
          </View>

          {/* Confirm Button */}
          <ThemedButton 
            title={loading ? "Finding Companions..." : "Find Companion"} 
            disabled={loading || !destinationCoordinates} 
            onPress={handleConfirm}
            style={styles.confirmButton}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  
  // Header Styles - Same as Homepage
  gradientHeader: {
    background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
    backgroundColor: '#8B5CF6',
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Map Container
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },

  // Route Info Card
  routeInfoCard: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routeStats: {
    flexDirection: 'row',
    gap: 20,
  },
  routeStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeStatText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },

  // Destination Cards
  destinationCards: {
    position: 'absolute',
    bottom: 200,
    left: 20,
    right: 20,
    gap: 12,
  },
  destinationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  cardSubtext: {
    fontSize: 14,
    color: '#6b7280',
  },
  addDestinationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  addIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addDestinationText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8B5CF6',
  },

  // Search Overlay
  searchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    padding: 20,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
  },
  searchTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  
  // Current Location Option in Search
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerText: {
    fontSize: 14,
    color: '#9ca3af',
    paddingHorizontal: 12,
    backgroundColor: 'white',
    zIndex: 1,
  },

  // Bottom Panel
  bottomPanel: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },

  // Preferences Section
  preferencesSection: {
    marginBottom: 20,
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  preferenceLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
  },

  // Transport Options
  transportOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  transportButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  transportButtonActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },

  // Gender Options
  genderOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  genderButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  genderButtonActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  genderButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  genderButtonTextActive: {
    color: 'white',
  },

  // Confirm Button
  confirmButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
  },
});
