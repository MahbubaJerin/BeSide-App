// Frontend/store/locationStore.js
import { create } from 'zustand';

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
};

// Estimate walking time based on distance (average walking speed: 5 km/h)
const estimateWalkingTime = (distance) => {
  const walkingSpeedKmh = 5;
  const timeInHours = distance / walkingSpeedKmh;
  const timeInMinutes = Math.round(timeInHours * 60);
  return timeInMinutes;
};

export const useLocationStore = create((set, get) => ({
  // User's current location
  userLocation: null,
  
  // Selected destination
  destinationLocation: null,
  
  // Journey state
  journeyState: 'idle', // 'idle' | 'planning' | 'navigating' | 'completed'
  
  // Route information
  routeInfo: null,
  
  // Live tracking data
  isTracking: false,
  trackingData: [],
  
  // Actions
  setUserLocation: (location) => {
    console.log('📍 [LOCATION STORE] Setting user location:', location);
    set({ userLocation: location });
  },
  
  setDestinationLocation: (location) => {
    console.log('🎯 [LOCATION STORE] Setting destination:', location);
    const { userLocation } = get();
    
    let routeInfo = null;
    if (userLocation && location) {
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        location.latitude,
        location.longitude
      );
      
      const walkingTime = estimateWalkingTime(distance);
      
      routeInfo = {
        distance: distance,
        duration: walkingTime,
        mode: 'walking'
      };
    }
    
    set({ 
      destinationLocation: location,
      routeInfo: routeInfo,
      journeyState: location ? 'planning' : 'idle'
    });
  },
  
  setJourneyState: (state) => {
    console.log('🚶 [LOCATION STORE] Journey state changed:', state);
    set({ journeyState: state });
  },
  
  startTracking: () => {
    console.log('🔄 [LOCATION STORE] Starting location tracking');
    set({ 
      isTracking: true,
      trackingData: []
    });
  },
  
  stopTracking: () => {
    console.log('⏹️ [LOCATION STORE] Stopping location tracking');
    set({ isTracking: false });
  },
  
  addTrackingPoint: (location) => {
    const { trackingData } = get();
    const newPoint = {
      ...location,
      timestamp: new Date().toISOString()
    };
    
    set({ 
      trackingData: [...trackingData, newPoint]
    });
  },
  
  clearDestination: () => {
    console.log('🧹 [LOCATION STORE] Clearing destination');
    set({ 
      destinationLocation: null,
      routeInfo: null,
      journeyState: 'idle'
    });
  },
  
  clearAllData: () => {
    console.log('🧹 [LOCATION STORE] Clearing all location data');
    set({ 
      userLocation: null,
      destinationLocation: null,
      routeInfo: null,
      journeyState: 'idle',
      isTracking: false,
      trackingData: []
    });
  },
  
  // Helper functions
  getDistanceToDestination: () => {
    const { userLocation, destinationLocation } = get();
    
    if (!userLocation || !destinationLocation) {
      return null;
    }
    
    return calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      destinationLocation.latitude,
      destinationLocation.longitude
    );
  },
  
  getEstimatedArrivalTime: () => {
    const { routeInfo } = get();
    
    if (!routeInfo) {
      return null;
    }
    
    const now = new Date();
    const arrivalTime = new Date(now.getTime() + (routeInfo.duration * 60 * 1000));
    return arrivalTime;
  }
}));

// Export helper functions for use outside the store
export { calculateDistance, estimateWalkingTime };