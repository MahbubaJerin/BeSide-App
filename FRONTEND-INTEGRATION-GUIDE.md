# Frontend Integration Guide - Trip Request & Polling System

## 🎉 Status: Backend Fully Working!

The trip request and polling system is now fully functional on the backend. Here's what you need to update in the frontend:

## ✅ **What's Working:**
- ✅ Trip request creation with auto-distribution
- ✅ Nearby user discovery and notification  
- ✅ Recipient polling system
- ✅ Rate limiting and performance optimization
- ✅ User authentication and location sharing

## 🔧 **Frontend Updates Needed:**

### 1. **Correct API Endpoints**

Update your frontend to use these endpoints:

```javascript
// OLD (if you were using notifications routes)
// ❌ /api/v1/notifications/pending
// ❌ /api/v1/notifications/send-nearby

// NEW (correct endpoints)
// ✅ /api/v1/trip/pending-requests  
// ✅ /api/v1/trip/send-to-nearby (optional - now auto-handled)
```

### 2. **Simplified Trip Request Flow**

```javascript
// Frontend: Create trip request (auto-distributes now!)
const createTripRequest = async (tripData) => {
  try {
    // Just create the trip - it will auto-distribute to nearby users
    const response = await fetch('/api/v1/trip/createTripReq', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user: { userName: currentUser.userName },
        destination: tripData.destination,
        destinationType: tripData.transportMode,
        date: tripData.date,
        time: tripData.time,
        genderPreference: tripData.genderPreference,
        startLocation: {
          latitude: tripData.startLat,
          longitude: tripData.startLng,
          address: tripData.startAddress
        },
        destinationLocation: {
          latitude: tripData.destLat,
          longitude: tripData.destLng, 
          address: tripData.destination
        }
      })
    });
    
    const result = await response.json();
    
    if (result.status === 'success') {
      console.log('✅ Trip created and auto-distributed!');
      console.log('📋 Trip ID:', result.data.tripRequest.tripReqId);
      
      // No need to manually call send-to-nearby anymore!
      // The backend automatically distributes to nearby users
      
      return result.data.tripRequest;
    }
  } catch (error) {
    console.error('Trip creation failed:', error);
    throw error;
  }
};
```

### 3. **Polling Implementation**

```javascript
// Implement smart polling based on our strategy
const POLLING_INTERVALS = {
  ACTIVE_SEARCH: 3000,      // 3 seconds when actively looking
  BACKGROUND_NORMAL: 8000,   // 8 seconds normal background
  BACKGROUND_IDLE: 15000,    // 15 seconds when app backgrounded  
  LOW_BATTERY: 30000         // 30 seconds on low battery
};

class TripRequestPoller {
  constructor() {
    this.isPolling = false;
    this.currentInterval = POLLING_INTERVALS.BACKGROUND_NORMAL;
    this.pollingTimer = null;
  }
  
  startPolling() {
    if (this.isPolling) return;
    
    this.isPolling = true;
    this.poll();
  }
  
  stopPolling() {
    this.isPolling = false;
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
    }
  }
  
  async poll() {
    if (!this.isPolling) return;
    
    try {
      const response = await fetch('/api/v1/trip/pending-requests', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Handle incoming trip requests
        this.handleIncomingRequests(data.data.requests);
        
        // Adjust polling interval based on results
        this.adjustInterval(data.data.requests.length);
        
      } else {
        console.log('Polling failed:', response.status);
        // Exponential backoff on errors
        this.currentInterval = Math.min(this.currentInterval * 1.5, 60000);
      }
      
    } catch (error) {
      console.log('Polling error:', error);
      this.currentInterval = Math.min(this.currentInterval * 1.5, 60000);
    }
    
    // Schedule next poll
    this.pollingTimer = setTimeout(() => this.poll(), this.currentInterval);
  }
  
  handleIncomingRequests(requests) {
    requests.forEach(request => {
      // Show notification to user
      showTripRequestNotification({
        from: request.user.userName,
        destination: request.destination, 
        tripId: request.tripReqId,
        photo: request.user.displayPhoto
      });
    });
  }
  
  adjustInterval(requestCount) {
    // Adaptive polling based on activity
    if (requestCount === 0) {
      this.consecutiveEmptyPolls = (this.consecutiveEmptyPolls || 0) + 1;
      if (this.consecutiveEmptyPolls > 3) {
        this.currentInterval = POLLING_INTERVALS.BACKGROUND_IDLE;
      }
    } else {
      this.consecutiveEmptyPolls = 0;
      this.currentInterval = POLLING_INTERVALS.ACTIVE_SEARCH;
    }
  }
  
  // Call when app state changes
  setAppState(state) {
    switch(state) {
      case 'active':
        this.currentInterval = POLLING_INTERVALS.BACKGROUND_NORMAL;
        break;
      case 'background':
        this.currentInterval = POLLING_INTERVALS.BACKGROUND_IDLE;  
        break;
      case 'searching':
        this.currentInterval = POLLING_INTERVALS.ACTIVE_SEARCH;
        break;
    }
  }
}

// Usage
const poller = new TripRequestPoller();

// Start polling when user logs in
poller.startPolling();

// Adjust based on app state
AppState.addEventListener('change', (nextAppState) => {
  poller.setAppState(nextAppState);
});
```

### 4. **Location Updates**

Make sure users update their location properly:

```javascript
const updateUserLocation = async (latitude, longitude) => {
  try {
    await fetch('/api/v1/location/update', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        latitude,
        longitude,
        isActive: true,
        shareLocation: true,  // Required to receive requests
        visibleToOthers: true // Required to be discoverable
      })
    });
  } catch (error) {
    console.log('Location update failed:', error);
  }
};
```

## 📱 **React Native Integration Tips:**

### App State Monitoring
```javascript
import { AppState } from 'react-native';

useEffect(() => {
  const handleAppStateChange = (nextAppState) => {
    if (nextAppState === 'background') {
      poller.setAppState('background');
    } else if (nextAppState === 'active') {
      poller.setAppState('active');  
    }
  };
  
  AppState.addEventListener('change', handleAppStateChange);
  
  return () => {
    AppState.removeEventListener('change', handleAppStateChange);
  };
}, []);
```

### Network State Monitoring  
```javascript
import NetInfo from '@react-native-community/netinfo';

useEffect(() => {
  const unsubscribe = NetInfo.addEventListener(state => {
    if (state.isConnected) {
      poller.startPolling();
    } else {
      poller.stopPolling();
    }
  });
  
  return unsubscribe;
}, []);
```

## 🎯 **Key Changes Summary:**

1. **✅ No Manual Distribution**: Remove any manual calls to `send-to-nearby` - it's automatic now
2. **✅ Update Endpoints**: Use `/api/v1/trip/pending-requests` for polling  
3. **✅ Implement Smart Polling**: Use the adaptive intervals strategy
4. **✅ Proper Location Sharing**: Ensure `shareLocation: true` and `visibleToOthers: true`
5. **✅ App State Handling**: Adjust polling based on app foreground/background state

## 🔍 **Testing Credentials:**

Use these for testing:
- **Sender**: username `nammu`, password `Nammu@02`
- **Receiver**: username `lululemom`, password `Lululu3@`

Both users are confirmed working with the backend system! 🎉