// Frontend/hooks/useRouteCalculation.js
import { useState, useCallback } from 'react';

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

export function useRouteCalculation() {
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState(null);

  // Calculate route from receiver's location to sender's destination
  const calculateReceiverRoute = useCallback(async (receiverLocation, destinationLocation, transportMode = "walking") => {
    if (!receiverLocation || !destinationLocation) {
      throw new Error('Both receiver location and destination are required');
    }

    setCalculating(true);
    setError(null);

    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?` +
        `origin=${receiverLocation.latitude},${receiverLocation.longitude}` +
        `&destination=${destinationLocation.latitude},${destinationLocation.longitude}` +
        `&mode=${transportMode}` +
        `&key=${GOOGLE_MAPS_KEY}`;

      console.log('🗺️ [ROUTE CALC] Calculating route for receiver...');
      console.log('- From:', receiverLocation);
      console.log('- To:', destinationLocation);
      console.log('- Mode:', transportMode);

      const response = await fetch(url);
      const data = await response.json();

      if (data.routes && data.routes[0]) {
        const route = data.routes[0];
        const points = route.overview_polyline.points;
        const coordinates = decodePolyline(points);
        
        // Filter valid coordinates
        const validCoords = coordinates.filter(
          (c) =>
            c.latitude >= -90 &&
            c.latitude <= 90 &&
            c.longitude >= -180 &&
            c.longitude <= 180
        );

        const routeInfo = {
          coordinates: validCoords,
          distance: route.legs[0]?.distance?.text || 'Unknown',
          duration: route.legs[0]?.duration?.text || 'Unknown',
          distanceValue: route.legs[0]?.distance?.value || 0,
          durationValue: route.legs[0]?.duration?.value || 0
        };

        console.log('✅ [ROUTE CALC] Route calculated successfully');
        console.log('- Coordinates:', validCoords.length);
        console.log('- Distance:', routeInfo.distance);
        console.log('- Duration:', routeInfo.duration);

        return routeInfo;
      } else {
        throw new Error('No route found');
      }
    } catch (err) {
      console.error('💥 [ROUTE CALC] Error:', err);
      setError(err.message);
      throw err;
    } finally {
      setCalculating(false);
    }
  }, []);

  // Calculate two-step route: receiver → meeting point → destination
  const calculateTwoStepRoute = useCallback(async (receiverLocation, meetingPoint, destinationLocation, transportMode = "walking") => {
    setCalculating(true);
    setError(null);

    try {
      console.log('🗺️ [TWO-STEP ROUTE] Calculating two-step route...');
      
      // Step 1: Receiver to meeting point
      const step1Route = await calculateReceiverRoute(receiverLocation, meetingPoint, "walking");
      
      // Step 2: Meeting point to destination
      const step2Route = await calculateReceiverRoute(meetingPoint, destinationLocation, transportMode);

      const combinedRoute = {
        step1: {
          description: 'To meeting point',
          coordinates: step1Route.coordinates,
          distance: step1Route.distance,
          duration: step1Route.duration
        },
        step2: {
          description: 'To destination',
          coordinates: step2Route.coordinates,
          distance: step2Route.distance,
          duration: step2Route.duration
        },
        totalDistance: `${step1Route.distanceValue + step2Route.distanceValue}m`,
        totalDuration: `${Math.round((step1Route.durationValue + step2Route.durationValue) / 60)} mins`
      };

      console.log('✅ [TWO-STEP ROUTE] Two-step route calculated');
      return combinedRoute;
    } catch (err) {
      console.error('💥 [TWO-STEP ROUTE] Error:', err);
      setError(err.message);
      throw err;
    } finally {
      setCalculating(false);
    }
  }, [calculateReceiverRoute]);

  // Get optimal map region to fit all points
  const getMapRegion = useCallback((coordinates) => {
    if (!coordinates || coordinates.length === 0) return null;

    let minLat = coordinates[0].latitude;
    let maxLat = coordinates[0].latitude;
    let minLng = coordinates[0].longitude;
    let maxLng = coordinates[0].longitude;

    coordinates.forEach(coord => {
      minLat = Math.min(minLat, coord.latitude);
      maxLat = Math.max(maxLat, coord.latitude);
      minLng = Math.min(minLng, coord.longitude);
      maxLng = Math.max(maxLng, coord.longitude);
    });

    const latDelta = (maxLat - minLat) * 1.2; // Add 20% padding
    const lngDelta = (maxLng - minLng) * 1.2;

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(latDelta, 0.01), // Minimum zoom level
      longitudeDelta: Math.max(lngDelta, 0.01)
    };
  }, []);

  return {
    calculating,
    error,
    calculateReceiverRoute,
    calculateTwoStepRoute,
    getMapRegion,
    clearError: () => setError(null)
  };
}