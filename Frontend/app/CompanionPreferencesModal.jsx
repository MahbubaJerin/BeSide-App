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
  StatusBar,
  Dimensions
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
  shouldReset = false, // New prop to trigger reset
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
  const [mapRef, setMapRef] = useState(null);
  const [region, setRegion] = useState({
    latitude: -37.8136,
    longitude: 144.9631,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  // Reset modal state when shouldReset prop changes
  useEffect(() => {
    if (shouldReset) {
      console.log('🧹 [MODAL RESET] Clearing CompanionPreferencesModal state');
      setTalk(false);
      setStartText("");
      setDestText("");
      setStartCoordinates(null);
      setDestinationCoordinates(null);
      setTransport("walk");
      setGender("any");
      setLoading(false);
      setShowDestinationSearch(false);
      setShowMeetingPointSearch(false);
      setRegion({
        latitude: -37.8136,
        longitude: 144.9631,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    }
  }, [shouldReset]);

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
                  <ThemedText style={styles.cardSubtext}>Destination</ThemedText>
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
            <View style={styles.fullScreenSearchOverlay}>
              <SafeAreaView style={styles.searchContainer}>
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
              </SafeAreaView>
            </View>
          )}
          
          {/* Destination Search */}
          {showDestinationSearch && (
            <View style={styles.fullScreenSearchOverlay}>
              <SafeAreaView style={styles.searchContainer}>
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
              </SafeAreaView>
            </View>
          )}
        </View>

        {/* Bottom Panel - Hide when searching */}
        {!showMeetingPointSearch && !showDestinationSearch && (
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
        )}
      </SafeAreaView>
    </Modal>
  );
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenHeight < 700;
const isMediumScreen = screenHeight >= 700 && screenHeight < 900;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  
  // Header Styles - Responsive
  gradientHeader: {
    background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
    backgroundColor: '#8B5CF6',
    paddingTop: isSmallScreen ? 8 : 10,
    paddingHorizontal: screenWidth * 0.05, // 5% of screen width
    paddingBottom: isSmallScreen ? 15 : 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: isSmallScreen ? 5 : 10,
    paddingHorizontal: screenWidth * 0.02, // Add consistent padding
  },
  backButton: {
    width: screenWidth * 0.1, // 10% of screen width
    height: screenWidth * 0.1,
    borderRadius: screenWidth * 0.05,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: 'white',
    flex: 1, // Take remaining space
    textAlign: 'center', // Center the text
    marginLeft: screenWidth * 0.02, // Consistent gap from back button
  },

  // Map Container
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },

  // Destination Cards - Responsive positioning
  destinationCards: {
    position: 'absolute',
    top: isSmallScreen ? '12%' : isMediumScreen ? '15%' : '18%',
    left: screenWidth * 0.05, // 5% margin
    right: screenWidth * 0.05,
    gap: isSmallScreen ? 8 : 12,
  },
  destinationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: isSmallScreen ? 12 : 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: isSmallScreen ? 60 : 70,
  },
  cardIcon: {
    width: isSmallScreen ? 35 : 40,
    height: isSmallScreen ? 35 : 40,
    borderRadius: isSmallScreen ? 17.5 : 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  cardSubtext: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#6b7280',
  },
  addDestinationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: isSmallScreen ? 12 : 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    minHeight: isSmallScreen ? 60 : 70,
  },
  addIcon: {
    width: isSmallScreen ? 35 : 40,
    height: isSmallScreen ? 35 : 40,
    borderRadius: isSmallScreen ? 17.5 : 20,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addDestinationText: {
    fontSize: isSmallScreen ? 14 : 16,
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
  fullScreenSearchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    zIndex: 1000,
  },
  searchContainer: {
    flex: 1,
    paddingHorizontal: screenWidth * 0.05,
    paddingTop: isSmallScreen ? 15 : 20,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: isSmallScreen ? 15 : 20,
    gap: 16,
  },
  searchTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: isSmallScreen ? 12 : 16,
    fontSize: isSmallScreen ? 14 : 16,
    minHeight: isSmallScreen ? 45 : 52,
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

  // Bottom Panel - Responsive
  bottomPanel: {
    backgroundColor: 'white',
    paddingHorizontal: screenWidth * 0.05,
    paddingVertical: isSmallScreen ? 16 : 24,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    maxHeight: screenHeight * 0.4, // Maximum 40% of screen height
  },

  // Preferences Section - Responsive
  preferencesSection: {
    marginBottom: isSmallScreen ? 12 : 20,
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isSmallScreen ? 12 : 16,
  },
  preferenceLabel: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
  },

  // Transport Options - Responsive
  transportOptions: {
    flexDirection: 'row',
    gap: isSmallScreen ? 6 : 8,
  },
  transportButton: {
    width: isSmallScreen ? 38 : 44,
    height: isSmallScreen ? 38 : 44,
    borderRadius: isSmallScreen ? 19 : 22,
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

  // Gender Options - Responsive
  genderOptions: {
    flexDirection: 'row',
    gap: isSmallScreen ? 6 : 8,
  },
  genderButton: {
    paddingHorizontal: isSmallScreen ? 12 : 16,
    paddingVertical: isSmallScreen ? 6 : 8,
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
    fontSize: isSmallScreen ? 12 : 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  genderButtonTextActive: {
    color: 'white',
  },

  // Confirm Button - Responsive
  confirmButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: isSmallScreen ? 12 : 16,
    marginTop: isSmallScreen ? 6 : 8,
    minHeight: isSmallScreen ? 45 : 52,
  },
});