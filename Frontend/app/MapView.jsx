import React from "react";
import { StyleSheet, View, Dimensions } from "react-native";
import MapView, { PROVIDER_GOOGLE, Marker } from "react-native-maps";

const MapComponent = ({ geo, currentLocation, customMapStyle }) => {
  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        customMapStyle={customMapStyle}
        style={styles.map}
        showsUserLocation
        initialRegion={{
          latitude: geo?.lat || currentLocation?.latitude || 37.78825,
          longitude: geo?.lng || currentLocation?.longitude || -122.4324,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {geo && (
          <Marker
            coordinate={{ latitude: geo.lat, longitude: geo.lng }}
            title="Selected location"
          />
        )}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  map: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  },
});

export default MapComponent;
