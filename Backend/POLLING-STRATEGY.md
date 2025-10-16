# Polling Rate Limiting Strategy for BeSide App

## Current Performance
- **Response Time**: 150-200ms per polling request
- **Backend Load**: Minimal with current MongoDB setup
- **User Experience**: Real-time feel without overwhelming backend

## Recommended Rate Limiting Strategy

### 1. **Adaptive Polling Intervals**

```javascript
// Frontend polling strategy
const POLLING_INTERVALS = {
  ACTIVE_SEARCH: 3000,      // 3 seconds - when user actively looking
  BACKGROUND_NORMAL: 8000,   // 8 seconds - normal background activity  
  BACKGROUND_IDLE: 15000,    // 15 seconds - when app backgrounded
  LOW_BATTERY: 30000         // 30 seconds - when device battery low
};

// Usage example:
let currentInterval = POLLING_INTERVALS.BACKGROUND_NORMAL;

function startPolling() {
  const poll = async () => {
    try {
      const response = await fetch('/api/v1/trip/pending-requests');
      const data = await response.json();
      
      // Process results...
      
      // Adjust interval based on app state
      if (appState.isActivelySearching) {
        currentInterval = POLLING_INTERVALS.ACTIVE_SEARCH;
      } else if (appState.isBackgrounded) {
        currentInterval = POLLING_INTERVALS.BACKGROUND_IDLE;
      } else {
        currentInterval = POLLING_INTERVALS.BACKGROUND_NORMAL;
      }
      
    } catch (error) {
      console.log('Polling error:', error);
      // Exponential backoff on errors
      currentInterval = Math.min(currentInterval * 1.5, 60000);
    }
    
    // Schedule next poll
    setTimeout(poll, currentInterval);
  };
  
  poll(); // Start initial poll
}
```

### 2. **Backend Rate Limiting Middleware**

```javascript
// Add to notification controller or as middleware
const rateLimit = require("express-rate-limit");

const pollRateLimit = rateLimit({
  windowMs: 60 * 1000,      // 1 minute window
  max: 20,                  // Max 20 requests per minute per user
  message: {
    status: "error",
    message: "Too many polling requests. Please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id || req.ip, // Rate limit per user
});

// Apply to polling endpoints
router.get("/pending-requests", pollRateLimit, notificationController.getPendingRequests);
```

### 3. **Smart Polling Optimization**

```javascript
// Frontend optimization strategies
class SmartPoller {
  constructor() {
    this.consecutiveEmptyPolls = 0;
    this.lastRequestCount = 0;
  }
  
  adjustInterval(requestCount) {
    // If no requests for multiple polls, slow down
    if (requestCount === 0) {
      this.consecutiveEmptyPolls++;
      if (this.consecutiveEmptyPolls > 3) {
        return POLLING_INTERVALS.BACKGROUND_IDLE;
      }
    } else {
      this.consecutiveEmptyPolls = 0;
      // New requests appeared, poll more frequently
      return POLLING_INTERVALS.ACTIVE_SEARCH;
    }
    
    return POLLING_INTERVALS.BACKGROUND_NORMAL;
  }
}
```

### 4. **Battery & Performance Considerations**

```javascript
// React Native optimization
import { AppState, NetInfo } from 'react-native';
import Battery from '@react-native-async-storage/async-storage';

class AdaptivePoller {
  startPolling() {
    // Monitor app state changes
    AppState.addEventListener('change', this.handleAppStateChange);
    
    // Monitor network status
    NetInfo.addEventListener(this.handleNetworkChange);
    
    // Monitor battery level (if available)
    this.checkBatteryLevel();
  }
  
  handleAppStateChange = (nextAppState) => {
    if (nextAppState === 'background') {
      this.currentInterval = POLLING_INTERVALS.BACKGROUND_IDLE;
    } else if (nextAppState === 'active') {
      this.currentInterval = POLLING_INTERVALS.BACKGROUND_NORMAL;
    }
  };
  
  handleNetworkChange = (state) => {
    if (!state.isConnected) {
      this.stopPolling();
    } else {
      this.resumePolling();
    }
  };
}
```

## Recommended Implementation Timeline

1. **Phase 1 (Immediate)**: Implement basic 8-second polling interval
2. **Phase 2 (Next Sprint)**: Add adaptive intervals based on app state
3. **Phase 3 (Future)**: Add battery and network optimization
4. **Phase 4 (Advanced)**: Consider WebSocket for real-time updates

## Performance Targets

- **Normal Background**: 8-10 seconds between polls
- **Active Search**: 3-5 seconds between polls  
- **Idle/Background**: 15-30 seconds between polls
- **Error Recovery**: Exponential backoff with max 60 seconds
- **Rate Limit**: Max 20 requests/minute per user

This strategy ensures:
✅ Responsive user experience during active use
✅ Battery-friendly background operation  
✅ Backend protection from excessive requests
✅ Graceful handling of network issues