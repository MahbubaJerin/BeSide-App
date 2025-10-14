// Frontend/components/MeetingPointModal.jsx - Enhanced with Two-Step Meeting System
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

const { width, height } = Dimensions.get('window');

export default function MeetingPointModal({
  visible,
  onClose,
  onSelectMeetingPoint,
  startLocation,
  destinationLocation,
  companionLocation, // Other user's current location
  routeCoordinates = [],
}) {
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [suggestedPoints, setSuggestedPoints] = useState([]);

  // Calculate midpoint between two locations
  const calculateMidpoint = (loc1, loc2) => {
    if (!loc1 || !loc2) return null;
    
    return {
      latitude: (loc1.latitude + loc2.latitude) / 2,
      longitude: (loc1.longitude + loc2.longitude) / 2,
    };
  };

  // Find points along the route for meeting suggestions
  const findRoutePoints = () => {
    if (routeCoordinates.length === 0) return [];
    
    const points = [];
    const totalPoints = routeCoordinates.length;
    
    // Get points at 25%, 50%, and 75% of the route
    [0.25, 0.5, 0.75].forEach(ratio => {
      const index = Math.floor(totalPoints * ratio);
      if (routeCoordinates[index]) {
        points.push({
          ...routeCoordinates[index],
          type: `${Math.round(ratio * 100)}% along route`,
        });
      }
    });
    
    return points;
  };

  // Calculate suggested meeting points
  useEffect(() => {
    if (!startLocation || !companionLocation) return;

    const suggestions = [];

    // 1. Midpoint between users' current locations
    const midpoint = calculateMidpoint(startLocation, companionLocation);
    if (midpoint) {
      suggestions.push({
        ...midpoint,
        type: "Midpoint between current locations",
        description: "Equal distance from both users",
      });
    }

    // 2. Points along the planned route
    const routePoints = findRoutePoints();
    routePoints.forEach(point => {
      suggestions.push({
        ...point,
        description: "Meeting point on planned route",
      });
    });

    // 3. Closer to companion if they're far from start
    if (companionLocation) {
      const closerToCompanion = calculateMidpoint(startLocation, companionLocation);
      if (closerToCompanion) {
        suggestions.push({
          latitude: closerToCompanion.latitude + (companionLocation.latitude - startLocation.latitude) * 0.3,
          longitude: closerToCompanion.longitude + (companionLocation.longitude - startLocation.longitude) * 0.3,
          type: "Closer to companion",
          description: "More convenient for your companion",
        });
      }
    }

    setSuggestedPoints(suggestions);
    
    // Auto-select the midpoint as default
    if (midpoint) {
      setSelectedPoint({
        ...midpoint,
        type: "Midpoint between current locations",
      });
    }
  }, [startLocation, companionLocation, routeCoordinates]);

  const handleMapPress = (event) => {
    const coordinate = event.nativeEvent.coordinate;
    setSelectedPoint({
      ...coordinate,
      type: "Custom location",
      description: "Manually selected meeting point",
    });
  };

  const handleConfirm = () => {
    if (!selectedPoint) {
      Alert.alert("No Selection", "Please select a meeting point");
      return;
    }

    onSelectMeetingPoint({
      latitude: selectedPoint.latitude,
      longitude: selectedPoint.longitude,
      address: selectedPoint.description || "Selected meeting point",
    });
    
    onClose();
  };

  const renderSuggestedPoints = () => (
    <ScrollView horizontal style={styles.suggestionsContainer} showsHorizontalScrollIndicator={false}>
      {suggestedPoints.map((point, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.suggestionCard,
            selectedPoint && 
            selectedPoint.latitude === point.latitude && 
            selectedPoint.longitude === point.longitude && 
            styles.selectedCard
          ]}
          onPress={() => setSelectedPoint(point)}
        >
          <Text style={styles.suggestionType}>{point.type}</Text>
          <Text style={styles.suggestionDescription}>{point.description}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const mapRegion = startLocation ? {
    latitude: startLocation.latitude,
    longitude: startLocation.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  } : null;

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Select Meeting Point</Text>
          <Text style={styles.subtitle}>Choose where you and your companion will meet</Text>
        </View>

        {mapRegion && (
          <MapView
            style={styles.map}
            region={mapRegion}
            onPress={handleMapPress}
          >
            {/* Start location marker */}
            {startLocation && (
              <Marker
                coordinate={startLocation}
                title="Your Location"
                description="Your current position"
                pinColor="blue"
              />
            )}

            {/* Companion location marker */}
            {companionLocation && (
              <Marker
                coordinate={companionLocation}
                title="Companion Location"
                description="Your companion's position"
                pinColor="green"
              />
            )}

            {/* Destination marker */}
            {destinationLocation && (
              <Marker
                coordinate={destinationLocation}
                title="Destination"
                description="Final destination"
                pinColor="red"
              />
            )}

            {/* Route polyline */}
            {routeCoordinates.length > 0 && (
              <Polyline
                coordinates={routeCoordinates}
                strokeColor={Colors.light.tint}
                strokeWidth={3}
                strokePattern={[5, 5]}
              />
            )}

            {/* Suggested meeting points */}
            {suggestedPoints.map((point, index) => (
              <Marker
                key={index}
                coordinate={point}
                title={point.type}
                description={point.description}
                pinColor="orange"
              />
            ))}

            {/* Selected meeting point */}
            {selectedPoint && (
              <>
                <Marker
                  coordinate={selectedPoint}
                  title="Selected Meeting Point"
                  description="Tap confirm to set this location"
                  pinColor="purple"
                />
                <Circle
                  center={selectedPoint}
                  radius={50}
                  fillColor="rgba(128, 0, 128, 0.2)"
                  strokeColor="purple"
                  strokeWidth={2}
                />
              </>
            )}
          </MapView>
        )}

        {renderSuggestedPoints()}

        <View style={styles.footer}>
          <Text style={styles.instruction}>
            Tap on the map or choose a suggested point below
          </Text>
          
          <View style={styles.buttonContainer}>
            <ThemedButton
              title="Cancel"
              onPress={onClose}
              style={[styles.button, styles.cancelButton]}
              textStyle={styles.cancelButtonText}
            />
            
            <ThemedButton
              title="Confirm Meeting Point"
              onPress={handleConfirm}
              disabled={!selectedPoint}
              style={[styles.button, styles.confirmButton]}
            />
          </View>
        </View>
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
    padding: 20,
    paddingTop: 40,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.light.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.text,
    textAlign: "center",
    marginTop: 8,
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
    minWidth: 160,
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
  suggestionDescription: {
    fontSize: 12,
    color: Colors.light.text,
    opacity: 0.7,
  },
  footer: {
    padding: 20,
    backgroundColor: "#f8f9fa",
  },
  instruction: {
    fontSize: 14,
    color: Colors.light.text,
    textAlign: "center",
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
  },
  cancelButton: {
    backgroundColor: "#6c757d",
  },
  cancelButtonText: {
    color: "#fff",
  },
  confirmButton: {
    backgroundColor: Colors.light.tint,
  },
});