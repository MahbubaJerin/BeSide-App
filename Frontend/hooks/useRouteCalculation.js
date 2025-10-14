// Frontend/hooks/useRouteCalculation.js
import { useState, useCallback } from 'react';

const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

// Debug the API key
console.log('🔑 [GOOGLE MAPS] API Key available:', !!GOOGLE_MAPS_KEY);
console.log('🔑 [GOOGLE MAPS] API Key length:', GOOGLE_MAPS_KEY ? GOOGLE_MAPS_KEY.length : 0);
console.log('🔑 [GOOGLE MAPS] API Key preview:', GOOGLE_MAPS_KEY ? `${GOOGLE_MAPS_KEY.substring(0, 10)}...` : 'N/A');

if (!GOOGLE_MAPS_KEY) {
  console.error('❌ [GOOGLE MAPS] API Key is missing!');
} else if (GOOGLE_MAPS_KEY.length < 30) {
  console.warn('⚠️ [GOOGLE MAPS] API Key seems too short, might be invalid');
}

// Geocoding utility to convert address text to coordinates
const geocodeAddress = async (address) => {
  try {
    console.log('🌍 [GEOCODING] Converting address to coordinates:', address);
    
    if (!GOOGLE_MAPS_KEY) {
      throw new Error('Google Maps API key is not configured');
    }
    
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_KEY}`;
    console.log('🌐 [GEOCODING] Request URL:', url);
    
    const response = await fetch(url);
    console.log('📡 [GEOCODING] Response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`Geocoding API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    console.log('📊 [GEOCODING] API Response:', JSON.stringify(data, null, 2));
    
    if (data.status !== 'OK') {
      console.warn('⚠️ [GEOCODING] API returned error status:', data.status);
      if (data.error_message) {
        console.warn('⚠️ [GEOCODING] Error message:', data.error_message);
      }
      throw new Error(`Geocoding failed: ${data.status} - ${data.error_message || 'Unknown error'}`);
    }
    
    if (data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      const coordinates = {
        latitude: location.lat,
        longitude: location.lng,
        address: data.results[0].formatted_address
      };
      console.log('✅ [GEOCODING] Address converted successfully:', coordinates);
      return coordinates;
    }
    
    throw new Error('No geocoding results found');
  } catch (error) {
    console.error('💥 [GEOCODING] Error:', error.message);
    throw error;
  }
};

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

  // Test Google Maps API key validity
  const testApiKey = useCallback(async () => {
    try {
      if (!GOOGLE_MAPS_KEY) {
        throw new Error('No API key configured');
      }
      
      // Simple geocoding test with a well-known address
      const testUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=Melbourne&key=${GOOGLE_MAPS_KEY}`;
      const response = await fetch(testUrl);
      const data = await response.json();
      
      if (data.status === 'OK') {
        console.log('✅ [API TEST] Google Maps API key is valid');
        return true;
      } else {
        console.error('❌ [API TEST] API key test failed:', data.status, data.error_message);
        return false;
      }
    } catch (error) {
      console.error('💥 [API TEST] API key test error:', error);
      return false;
    }
  }, []);

  // Calculate route from receiver's location to sender's destination
  const calculateReceiverRoute = useCallback(async (receiverLocation, destinationLocation, transportMode = "walking") => {
    if (!receiverLocation || !destinationLocation) {
      throw new Error('Both receiver location and destination are required');
    }

    // Validate coordinates exist
    if (!receiverLocation.latitude || !receiverLocation.longitude || 
        !destinationLocation.latitude || !destinationLocation.longitude) {
      throw new Error('Invalid coordinates provided');
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
      console.log('- URL:', url);

      const response = await fetch(url);
      console.log('📡 [ROUTE CALC] Response status:', response.status);
      console.log('📡 [ROUTE CALC] Response ok:', response.ok);
      
      const data = await response.json();
      console.log('📊 [ROUTE CALC] Response data:', JSON.stringify(data, null, 2));

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
      
      // Validate all locations have coordinates
      if (!receiverLocation?.latitude || !receiverLocation?.longitude ||
          !meetingPoint?.latitude || !meetingPoint?.longitude ||
          !destinationLocation?.latitude || !destinationLocation?.longitude) {
        throw new Error('Invalid coordinates for two-step route calculation');
      }
      
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

  // Enhanced function to calculate receiver route with multiple fallback options
  const calculateReceiverRouteEnhanced = useCallback(async (routeData, receiverLocation, senderCurrentLocation) => {
    setCalculating(true);
    setError(null);

    try {
      console.log('🚀 [ENHANCED ROUTE] Starting enhanced route calculation...');
      console.log('📍 [ENHANCED ROUTE] Receiver location:', receiverLocation);
      console.log('📍 [ENHANCED ROUTE] Sender current location:', senderCurrentLocation);
      console.log('📊 [ENHANCED ROUTE] Route data:', routeData);

      let destinationCoords = null;

      // Option 1: Use stored destination coordinates if available
      if (routeData.destinationLocation && routeData.destinationLocation.latitude && routeData.destinationLocation.longitude) {
        console.log('✅ [ENHANCED ROUTE] Using stored destination coordinates');
        destinationCoords = routeData.destinationLocation;
      }
      // Option 2: Geocode destination text
      else if (routeData.destinationText && 
               routeData.destinationText !== 'Placeholder' && 
               routeData.destinationText !== 'Find Companion' &&
               routeData.destinationText !== 'Destination') {
        console.log('🌍 [ENHANCED ROUTE] Geocoding destination text:', routeData.destinationText);
        
        // Test API key first if this is the first geocoding attempt
        const isApiValid = await testApiKey();
        if (!isApiValid) {
          console.warn('⚠️ [ENHANCED ROUTE] API key test failed, skipping geocoding');
        } else {
          try {
            destinationCoords = await geocodeAddress(routeData.destinationText);
          } catch (geocodeError) {
            console.warn('⚠️ [ENHANCED ROUTE] Geocoding failed:', geocodeError);
          }
        }
      } else {
        console.log('⚠️ [ENHANCED ROUTE] Skipping geocoding for placeholder destination:', routeData.destinationText);
      }

      // Option 3: Fallback to sender's current location as destination
      if (!destinationCoords && senderCurrentLocation && senderCurrentLocation.latitude && senderCurrentLocation.longitude) {
        console.log('🔄 [ENHANCED ROUTE] Using sender current location as fallback destination');
        destinationCoords = {
          latitude: senderCurrentLocation.latitude,
          longitude: senderCurrentLocation.longitude,
          address: `${routeData.senderName || 'Sender'}'s location`
        };
      }

      // Option 4: Use a default location as last resort (Melbourne CBD as example)
      if (!destinationCoords) {
        console.log('🏙️ [ENHANCED ROUTE] Using default location as last resort');
        destinationCoords = {
          latitude: -37.8136,
          longitude: 144.9631,
          address: 'Melbourne CBD (Default destination)'
        };
      }

      console.log('✅ [ENHANCED ROUTE] Final destination determined:', destinationCoords);

      console.log('🎯 [ENHANCED ROUTE] Final destination coordinates:', destinationCoords);

      // Calculate the route
      const route = await calculateReceiverRoute(receiverLocation, destinationCoords, routeData.transportMode || 'walking');

      // Enhanced route data
      const enhancedRoute = {
        ...route,
        routeType: 'receiver-to-destination',
        destinationInfo: {
          coordinates: destinationCoords,
          address: destinationCoords.address || routeData.destinationText || 'Destination',
          senderName: routeData.senderName,
          receiverName: routeData.receiverName
        },
        transportMode: routeData.transportMode || 'walking'
      };

      console.log('✅ [ENHANCED ROUTE] Enhanced route calculated successfully');
      return enhancedRoute;

    } catch (error) {
      console.error('💥 [ENHANCED ROUTE] Enhanced route calculation failed:', error);
      setError(error.message);
      throw error;
    } finally {
      setCalculating(false);
    }
  }, [calculateReceiverRoute]);

  return {
    calculating,
    error,
    calculateReceiverRoute,
    calculateTwoStepRoute,
    calculateReceiverRouteEnhanced,
    geocodeAddress,
    getMapRegion,
    testApiKey,
    clearError: () => setError(null)
  };
}