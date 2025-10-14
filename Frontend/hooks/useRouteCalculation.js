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
      // Enhanced Google Maps Directions API request with navigation details
      const url = `https://maps.googleapis.com/maps/api/directions/json?` +
        `origin=${receiverLocation.latitude},${receiverLocation.longitude}` +
        `&destination=${destinationLocation.latitude},${destinationLocation.longitude}` +
        `&mode=${transportMode}` +
        `&alternatives=true` +  // Get alternative routes
        `&optimize=true` +      // Optimize waypoints
        `&avoid=tolls` +        // Avoid tolls for better user experience
        `&units=metric` +       // Use metric units
        `&language=en` +        // English instructions
        `&region=au` +          // Australia region
        `&key=${GOOGLE_MAPS_KEY}`;

      console.log('🗺️ [NAVIGATION] Calculating detailed navigation route...');
      console.log('- From:', `${receiverLocation.latitude}, ${receiverLocation.longitude}`);
      console.log('- To:', `${destinationLocation.latitude}, ${destinationLocation.longitude}`);
      console.log('- Mode:', transportMode);
      console.log('- URL:', url.replace(GOOGLE_MAPS_KEY, 'API_KEY_HIDDEN'));

      const response = await fetch(url);
      console.log('📡 [NAVIGATION] Response status:', response.status);
      console.log('📡 [NAVIGATION] Response ok:', response.ok);
      
      if (!response.ok) {
        throw new Error(`Google Maps API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📊 [NAVIGATION] API Status:', data.status);
      
      if (data.status !== 'OK') {
        console.error('❌ [NAVIGATION] API Error:', data.error_message || data.status);
        throw new Error(`Navigation error: ${data.status} - ${data.error_message || 'Unknown error'}`);
      }

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0]; // Use the best route
        const leg = route.legs[0];    // First (and usually only) leg of the journey
        
        // Extract polyline coordinates for route display
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

        // Extract turn-by-turn navigation steps
        const navigationSteps = leg.steps.map((step, index) => ({
          stepNumber: index + 1,
          instruction: step.html_instructions.replace(/<[^>]*>/g, ''), // Remove HTML tags
          distance: step.distance.text,
          duration: step.duration.text,
          maneuver: step.maneuver || 'straight',
          startLocation: {
            latitude: step.start_location.lat,
            longitude: step.start_location.lng
          },
          endLocation: {
            latitude: step.end_location.lat,
            longitude: step.end_location.lng
          },
          polyline: step.polyline ? decodePolyline(step.polyline.points) : []
        }));

        const routeInfo = {
          // Basic route information
          coordinates: validCoords,
          distance: leg.distance?.text || 'Unknown',
          duration: leg.duration?.text || 'Unknown',
          distanceValue: leg.distance?.value || 0,
          durationValue: leg.duration?.value || 0,
          
          // Navigation-specific data
          navigationSteps: navigationSteps,
          startAddress: leg.start_address,
          endAddress: leg.end_address,
          
          // Route bounds for map fitting
          bounds: {
            northeast: route.bounds.northeast,
            southwest: route.bounds.southwest
          },
          
          // Alternative routes (if available)
          alternativeRoutes: data.routes.slice(1).map(altRoute => ({
            distance: altRoute.legs[0]?.distance?.text || 'Unknown',
            duration: altRoute.legs[0]?.duration?.text || 'Unknown',
            coordinates: decodePolyline(altRoute.overview_polyline.points)
          })),
          
          // Metadata
          transportMode: transportMode,
          apiProvider: 'google-maps'
        };

        console.log('✅ [NAVIGATION] Detailed route calculated successfully');
        console.log('- Total coordinates:', validCoords.length);
        console.log('- Navigation steps:', navigationSteps.length);
        console.log('- Distance:', routeInfo.distance);
        console.log('- Duration:', routeInfo.duration);
        console.log('- Start:', routeInfo.startAddress);
        console.log('- End:', routeInfo.endAddress);
        console.log('- Alternative routes:', routeInfo.alternativeRoutes.length);

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

  // Function to open Google Maps navigation
  const openGoogleMapsNavigation = useCallback((destination, origin = null, transportMode = 'walking') => {
    try {
      console.log('🗺️ [NAVIGATION] Opening Google Maps for navigation...');
      
      let navigationUrl;
      
      if (origin) {
        // Navigation from specific origin to destination
        navigationUrl = `https://www.google.com/maps/dir/?api=1` +
          `&origin=${origin.latitude},${origin.longitude}` +
          `&destination=${destination.latitude},${destination.longitude}` +
          `&travelmode=${transportMode === 'walking' ? 'walking' : transportMode === 'driving' ? 'driving' : 'transit'}`;
      } else {
        // Navigation from current location to destination
        navigationUrl = `https://www.google.com/maps/dir/?api=1` +
          `&destination=${destination.latitude},${destination.longitude}` +
          `&travelmode=${transportMode === 'walking' ? 'walking' : transportMode === 'driving' ? 'driving' : 'transit'}`;
      }
      
      console.log('🔗 [NAVIGATION] Google Maps URL:', navigationUrl);
      
      // Open Google Maps navigation
      import('expo-linking').then(({ default: Linking }) => {
        Linking.openURL(navigationUrl).catch(err => {
          console.error('❌ [NAVIGATION] Failed to open Google Maps:', err);
          
          // Fallback: Try opening with different URL scheme
          const fallbackUrl = `google.navigation:q=${destination.latitude},${destination.longitude}&mode=${transportMode}`;
          Linking.openURL(fallbackUrl).catch(fallbackErr => {
            console.error('❌ [NAVIGATION] Fallback also failed:', fallbackErr);
            throw new Error('Unable to open navigation app. Please check if Google Maps is installed.');
          });
        });
      });
      
    } catch (error) {
      console.error('❌ [NAVIGATION] Error opening navigation:', error);
      throw error;
    }
  }, []);

  // Function to get navigation instructions as text (useful for in-app display)
  const getNavigationInstructions = useCallback((routeInfo) => {
    if (!routeInfo || !routeInfo.navigationSteps) {
      return [];
    }
    
    return routeInfo.navigationSteps.map(step => ({
      step: step.stepNumber,
      instruction: step.instruction,
      distance: step.distance,
      duration: step.duration,
      icon: getNavigationIcon(step.maneuver)
    }));
  }, []);

  // Helper function to get navigation icons
  const getNavigationIcon = (maneuver) => {
    const iconMap = {
      'turn-left': '↰',
      'turn-right': '↱',
      'turn-slight-left': '↖',
      'turn-slight-right': '↗',
      'turn-sharp-left': '↙',
      'turn-sharp-right': '↘',
      'uturn-left': '↶',
      'uturn-right': '↷',
      'straight': '↑',
      'ramp-left': '↰',
      'ramp-right': '↱',
      'merge': '↗',
      'fork-left': '↖',
      'fork-right': '↗',
      'ferry': '🚢',
      'roundabout-left': '↺',
      'roundabout-right': '↻'
    };
    
    return iconMap[maneuver] || '↑';
  };

  return {
    calculating,
    error,
    calculateReceiverRoute,
    calculateTwoStepRoute,
    geocodeAddress,
    getMapRegion,
    testApiKey,
    openGoogleMapsNavigation,
    getNavigationInstructions,
    clearError: () => setError(null)
  };
}