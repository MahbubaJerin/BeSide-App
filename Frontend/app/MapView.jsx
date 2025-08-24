// Frontend/app/MapView.jsx
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View, Dimensions, Text, Platform } from "react-native";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";

const INITIAL_REGION = {
  latitude: 37.78825,
  longitude: -122.4324,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

const DEBUG = __DEV__;

const MapComponent = () => {
  const mapRef = useRef(null);
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const [region, setRegion] = useState(INITIAL_REGION);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    console.log("[MapView.jsx] Mounted", {
      platform: Platform.OS,
      DEBUG,
    });
    return () => console.log("[MapView.jsx] Unmounted");
  }, []);

  const onContainerLayout = (e) => {
    const { width, height } = e.nativeEvent.layout;
    setLayout({ width, height });
    console.log("[MapView.jsx] Container layout", { width, height });
  };

  const handleMapReady = () => {
    setMapReady(true);
    console.log("[MapView.jsx] onMapReady", {
      hasRef: !!mapRef.current,
      provider: "google",
    });
  };

  const handleMapLoaded = () => {
    console.log("[MapView.jsx] onMapLoaded (Android/Google)");
  };

  const handleRegionChangeComplete = (rgn) => {
    setRegion(rgn);
    console.log("[MapView.jsx] onRegionChangeComplete", rgn);
  };

  const handlePress = (e) => {
    const { coordinate } = e.nativeEvent;
    console.log("[MapView.jsx] onPress @", coordinate);
  };

  return (
    <View style={styles.container} onLayout={onContainerLayout}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={INITIAL_REGION}
        // Don't log the full key; just presence.
        apiKey={"<key provided>" ? "REDACTED" : undefined}
        onMapReady={handleMapReady}
        onMapLoaded={handleMapLoaded}
        onRegionChangeComplete={handleRegionChangeComplete}
        onPress={handlePress}
      />
      {DEBUG && (
        <View style={styles.debugBadge}>
          <Text style={styles.debugText}>
            {`provider: google | ready: ${mapReady} | ` +
              `w:${Math.round(layout.width)} h:${Math.round(
                layout.height
              )} | ` +
              `lat:${region.latitude.toFixed(4)} lng:${region.longitude.toFixed(
                4
              )} `}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff", // helps spot zero-height issues
    alignItems: "center",
    justifyContent: "center",
  },
  map: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  },
  debugBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 8,
  },
  debugText: {
    color: "#fff",
    fontSize: 12,
  },
});

export default MapComponent;
