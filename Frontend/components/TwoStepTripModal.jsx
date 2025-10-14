// Frontend/components/TwoStepTripModal.jsx - Complete Two-Step Trip System
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
} from "react-native";
import MapView, { Marker, Polyline, Circle } from "react-native-maps";
import { ThemedButton } from "@/components/ThemedButton";
import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get('window');
const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

// Polyline decoder utility
const decodePolyline = (encoded) => {
  const coordinates = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    coordinates.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return coordinates;
};

export default function TwoStepTripModal({
  visible,
  onClose,
  onConfirmTrip,
  tripData,
  userLocation,
  companionLocation,
}) {
  const [step, setStep] = useState(1); // 1: Meeting Point Selection, 2: Route to Destination
  const [selectedMeetingPoint, setSelectedMeetingPoint] = useState(null);
  const [meetingPointRoute, setMeetingPointRoute] = useState([]);
  const [destinationRoute, setDestinationRoute] = useState([]);
  const [routeCalculating, setRouteCalculating] = useState(false);

  // Calculate route between two points
  const calculateRoute = async (origin, destination, transportMode = "walking") => {
    try {
      setRouteCalculating(true);
      const url = 
        "https://maps.googleapis.com/maps/api/directions/json" +
        `?origin=${origin.latitude},${origin.longitude}` +
        `&destination=${destination.latitude},${destination.longitude}` +
        `&mode=${transportMode}` +
        `&key=${GOOGLE_MAPS_KEY}`;

      const response = await fetch(url);
      const data = await response.json();
      
      if (data.routes && data.routes[0]) {
        const points = data.routes[0].overview_polyline.points;
        const coords = decodePolyline(points);
        return coords.filter(
          (c) =>
            c.latitude >= -90 &&
            c.latitude <= 90 &&
            c.longitude >= -180 &&
            c.longitude <= 180
        );
      }
      return [];
    } catch (error) {
      console.error('Route calculation error:', error);
      return [];
    } finally {
      setRouteCalculating(false);
    }
  };

  // Step 1: Meeting Point Selection
  const handleMeetingPointSelect = async (point) => {
    setSelectedMeetingPoint(point);
    
    // Calculate routes to meeting point for both users
    if (userLocation && companionLocation) {
      const userRoute = await calculateRoute(userLocation, point);
      const companionRoute = await calculateRoute(companionLocation, point);
      
      setMeetingPointRoute([...userRoute, ...companionRoute]);
    }
  };

  // Step 2: Proceed to destination planning
  const proceedToStep2 = async () => {
    if (!selectedMeetingPoint) {
      Alert.alert("Error", "Please select a meeting point first");
      return;
    }

    // Calculate route from meeting point to destination
    if (tripData.destinationLocation) {
      const route = await calculateRoute(
        selectedMeetingPoint, 
        tripData.destinationLocation, 
        tripData.transportMode
      );
      setDestinationRoute(route);
    }
    
    setStep(2);
  };

  // Confirm the complete two-step trip
  const handleConfirmTwoStepTrip = () => {
    if (!selectedMeetingPoint) {
      Alert.alert("Error", "Meeting point not selected");
      return;
    }

    const tripPlan = {
      step1: {
        description: "Meet at designated point",
        meetingPoint: selectedMeetingPoint,
        routes: {
          userRoute: meetingPointRoute.slice(0, Math.floor(meetingPointRoute.length / 2)),
          companionRoute: meetingPointRoute.slice(Math.floor(meetingPointRoute.length / 2))
        }
      },
      step2: {
        description: "Travel together to destination",
        fromMeetingPoint: selectedMeetingPoint,
        toDestination: tripData.destinationLocation,
        route: destinationRoute,
        transportMode: tripData.transportMode
      }
    };

    onConfirmTrip(tripPlan);
    onClose();
  };

  // Generate suggested meeting points
  const generateMeetingPoints = () => {
    if (!userLocation || !companionLocation) return [];

    const suggestions = [];

    // Midpoint between users
    const midpoint = {
      latitude: (userLocation.latitude + companionLocation.latitude) / 2,
      longitude: (userLocation.longitude + companionLocation.longitude) / 2,
      type: "Midpoint",
      description: "Halfway between both users"
    };
    suggestions.push(midpoint);

    // Closer to user
    suggestions.push({
      latitude: userLocation.latitude + (companionLocation.latitude - userLocation.latitude) * 0.25,
      longitude: userLocation.longitude + (companionLocation.longitude - userLocation.longitude) * 0.25,
      type: "Near You",
      description: "Closer to your location"
    });

    // Closer to companion
    suggestions.push({
      latitude: companionLocation.latitude + (userLocation.latitude - companionLocation.latitude) * 0.25,
      longitude: companionLocation.longitude + (userLocation.longitude - userLocation.longitude) * 0.25,
      type: "Near Companion",
      description: "Closer to companion's location"
    });

    return suggestions;
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Step 1: Choose Meeting Point</Text>
        <Text style={styles.stepDescription}>
          Select where you and your companion will meet before traveling together
        </Text>
      </View>

      <MapView
        style={styles.map}
        region={{
          latitude: userLocation ? userLocation.latitude : 0,
          longitude: userLocation ? userLocation.longitude : 0,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        onPress={(e) => handleMeetingPointSelect(e.nativeEvent.coordinate)}
      >
        {/* User location */}
        {userLocation && (
          <Marker
            coordinate={userLocation}
            title="Your Location"
            pinColor="blue"
          />
        )}

        {/* Companion location */}
        {companionLocation && (
          <Marker
            coordinate={companionLocation}
            title="Companion Location"
            pinColor="green"
          />
        )}

        {/* Selected meeting point */}
        {selectedMeetingPoint && (
          <>
            <Marker
              coordinate={selectedMeetingPoint}
              title="Meeting Point"
              description="Selected meeting location"
              pinColor="purple"
            />
            <Circle
              center={selectedMeetingPoint}
              radius={100}
              fillColor="rgba(128, 0, 128, 0.2)"
              strokeColor="purple"
              strokeWidth={2}
            />
          </>
        )}

        {/* Route to meeting point */}
        {meetingPointRoute.length > 0 && (
          <Polyline
            coordinates={meetingPointRoute}
            strokeColor={Colors.light.tint}
            strokeWidth={3}
            strokePattern={[5, 5]}
          />
        )}
      </MapView>

      <ScrollView horizontal style={styles.suggestionsContainer}>
        {generateMeetingPoints().map((point, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.suggestionCard,
              selectedMeetingPoint && 
              selectedMeetingPoint.latitude === point.latitude && 
              styles.selectedCard
            ]}
            onPress={() => handleMeetingPointSelect(point)}
          >
            <Text style={styles.suggestionType}>{point.type}</Text>
            <Text style={styles.suggestionDesc}>{point.description}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.stepFooter}>
        <ThemedButton
          title="Cancel"
          onPress={onClose}
          style={styles.cancelButton}
        />
        <ThemedButton
          title="Next: Plan Route →"
          onPress={proceedToStep2}
          disabled={!selectedMeetingPoint}
          style={styles.nextButton}
        />
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Step 2: Route to Destination</Text>
        <Text style={styles.stepDescription}>
          Review the complete journey: Meeting point → Final destination
        </Text>
      </View>

      <MapView
        style={styles.map}
        region={{
          latitude: selectedMeetingPoint ? selectedMeetingPoint.latitude : 0,
          longitude: selectedMeetingPoint ? selectedMeetingPoint.longitude : 0,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
      >
        {/* Meeting point */}
        {selectedMeetingPoint && (
          <Marker
            coordinate={selectedMeetingPoint}
            title="Meeting Point"
            description="Start together from here"
            pinColor="purple"
          />
        )}

        {/* Destination */}
        {tripData.destinationLocation && (
          <Marker
            coordinate={tripData.destinationLocation}
            title="Destination"
            description="Final destination"
            pinColor="red"
          />
        )}

        {/* Route from meeting point to destination */}
        {destinationRoute.length > 0 && (
          <Polyline
            coordinates={destinationRoute}
            strokeColor="#28a745"
            strokeWidth={4}
          />
        )}
      </MapView>

      <View style={styles.journeyInfo}>
        <Text style={styles.journeyTitle}>Complete Journey Plan</Text>
        
        <View style={styles.journeyStep}>
          <Ionicons name="people" size={20} color={Colors.light.tint} />
          <View style={styles.journeyDetails}>
            <Text style={styles.journeyStepTitle}>1. Meet at designated point</Text>
            <Text style={styles.journeyStepDesc}>
              Both users arrive at the selected meeting location
            </Text>
          </View>
        </View>

        <View style={styles.journeyStep}>
          <Ionicons name="arrow-forward" size={20} color="#28a745" />
          <View style={styles.journeyDetails}>
            <Text style={styles.journeyStepTitle}>2. Travel together to destination</Text>
            <Text style={styles.journeyStepDesc}>
              Journey together using {tripData.transportMode || 'planned transport'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.stepFooter}>
        <ThemedButton
          title="← Back"
          onPress={() => setStep(1)}
          style={styles.backButton}
        />
        <ThemedButton
          title="Confirm Trip Plan"
          onPress={handleConfirmTwoStepTrip}
          style={styles.confirmButton}
        />
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Two-Step Trip Planning</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.light.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.progressIndicator}>
          <View style={[styles.progressStep, step >= 1 && styles.activeStep]}>
            <Text style={[styles.progressText, step >= 1 && styles.activeText]}>1</Text>
          </View>
          <View style={[styles.progressLine, step >= 2 && styles.activeLine]} />
          <View style={[styles.progressStep, step >= 2 && styles.activeStep]}>
            <Text style={[styles.progressText, step >= 2 && styles.activeText]}>2</Text>
          </View>
        </View>

        {step === 1 ? renderStep1() : renderStep2()}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.light.text,
  },
  closeButton: {
    padding: 4,
  },
  progressIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    backgroundColor: "#f8f9fa",
  },
  progressStep: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
  },
  activeStep: {
    backgroundColor: Colors.light.tint,
  },
  progressText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#666",
  },
  activeText: {
    color: "#fff",
  },
  progressLine: {
    width: 60,
    height: 2,
    backgroundColor: "#ddd",
    marginHorizontal: 10,
  },
  activeLine: {
    backgroundColor: Colors.light.tint,
  },
  stepContainer: {
    flex: 1,
  },
  stepHeader: {
    padding: 20,
    backgroundColor: "#f8f9fa",
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: Colors.light.text,
    opacity: 0.7,
  },
  map: {
    flex: 1,
  },
  suggestionsContainer: {
    maxHeight: 120,
    backgroundColor: "#f8f9fa",
    paddingVertical: 10,
  },
  suggestionCard: {
    backgroundColor: "#fff",
    margin: 8,
    padding: 12,
    borderRadius: 12,
    minWidth: 140,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  selectedCard: {
    borderColor: Colors.light.tint,
    borderWidth: 2,
    backgroundColor: Colors.light.tint + "10",
  },
  suggestionType: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 4,
  },
  suggestionDesc: {
    fontSize: 12,
    color: Colors.light.text,
    opacity: 0.7,
  },
  journeyInfo: {
    backgroundColor: "#f8f9fa",
    padding: 20,
    maxHeight: 200,
  },
  journeyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 16,
  },
  journeyStep: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  journeyDetails: {
    flex: 1,
    marginLeft: 12,
  },
  journeyStepTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.light.text,
    marginBottom: 4,
  },
  journeyStepDesc: {
    fontSize: 14,
    color: Colors.light.text,
    opacity: 0.7,
  },
  stepFooter: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    backgroundColor: "#f8f9fa",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#6c757d",
  },
  backButton: {
    flex: 1,
    backgroundColor: "#6c757d",
  },
  nextButton: {
    flex: 2,
    backgroundColor: Colors.light.tint,
  },
  confirmButton: {
    flex: 2,
    backgroundColor: "#28a745",
  },
});