# BeSide-App
 Real-Time Location Tracking & Companion Finding System

## Overview
This system enables users to share their real-time location and find companions within a 500-meter radius. The system automatically tracks location every minute and updates the server, allowing users to discover nearby companions when they click "Find Companion".

## Architecture

### Backend Components

#### 1. UserLocation Model (`models/userLocationModel.js`)
- Stores user locations with GeoJSON Point format
- Includes geospatial indexing for efficient radius queries
- Tracks user status (active, searching, location sharing preferences)
- Auto-cleanup of stale location data

**Key Features:**
- 2dsphere index for location-based queries
- Built-in methods for finding nearby users
- Automatic cleanup of old locations (5+ minutes)
- Distance calculation using Haversine formula

#### 2. Location Controller (`controllers/locationController.js`)
- `POST /api/v1/location/update` - Update user's current location
- `GET /api/v1/location/nearby` - Find companions within radius
- `PATCH /api/v1/location/stop-searching` - Stop searching for companions
- `GET /api/v1/location/status` - Get user's location status
- `PATCH /api/v1/location/preferences` - Update location sharing preferences

#### 3. Location Service (`services/locationService.js`)
- Automatic cleanup service running every 5 minutes
- Location statistics and monitoring
- Future: WebSocket broadcasting for real-time updates

### Frontend Components

#### 1. Location Tracking Hook (`hooks/useLocationTracking.js`)
- Manages GPS permissions and location watching
- Automatic server updates every 1 minute
- Background location tracking
- Location sharing preferences

**Key Features:**
- Automatic permission requests
- High-accuracy GPS tracking
- Periodic server synchronization
- Error handling and fallbacks

#### 2. Companion Search Hook (`hooks/useCompanionSearch.js`)
- Search for companions within configurable radius
- Real-time updates every 30 seconds during search
- Filtering and sorting capabilities
- Loading states and error handling

**Key Features:**
- Configurable search radius (100m - 5km)
- Real-time companion updates
- Distance-based sorting
- Advanced filtering options

#### 3. Enhanced Home Screen (`app/home.jsx`)
- Integrated with new location system
- Real-time companion markers on map
- Visual search radius display
- Enhanced companion information display

## Data Flow

1. **Location Tracking Start:**
   - User opens app → Auto-start location tracking
   - Request GPS permissions
   - Start watching position changes
   - Begin 1-minute server update intervals

2. **Find Companions Process:**
   - User clicks "Find Companion"
   - Check location permissions and current location
   - Start companion search with 500m radius
   - Display search radius circle on map
   - Show consent and photo upload modals

3. **Real-Time Updates:**
   - Every 30 seconds: Search for nearby companions
   - Every 1 minute: Update user's location on server
   - Every 5 minutes: Server cleans up old locations
   - Real-time display of companion markers

4. **Companion Display:**
   - Show companions as markers on map
   - Different icons for searching vs available users
   - Distance information in callouts
   - Tap markers to view companion details

## API Endpoints

### Location Management
```
POST   /api/v1/location/update          - Update user location
GET    /api/v1/location/status          - Get location status
PATCH  /api/v1/location/preferences     - Update sharing preferences
```

### Companion Search
```
GET    /api/v1/location/nearby          - Find nearby companions
PATCH  /api/v1/location/stop-searching  - Stop companion search
```

### Admin/Utility
```
DELETE /api/v1/location/clean-old       - Clean old locations (admin)
```

## Database Schema

### UserLocation Collection
```javascript
{
  userId: ObjectId,           // Reference to User
  userName: String,           // Quick access to username
  location: {
    type: "Point",
    coordinates: [lng, lat]   // GeoJSON format
  },
  isActive: Boolean,          // Currently sharing location
  isSearching: Boolean,       // Currently searching for companions
  searchRadius: Number,       // Search radius in meters
  lastSeen: Date,            // Last location update
  shareLocation: Boolean,     // Privacy: share location
  visibleToOthers: Boolean,  // Privacy: visible to others
  userInfo: {               // Cached user info for quick access
    firstName: String,
    lastName: String,
    gender: String,
    profilePhoto: Object
  }
}
```

## Privacy & Security Features

1. **Location Sharing Controls:**
   - Users can disable location sharing
   - Users can make themselves invisible to others
   - Automatic cleanup of old location data

2. **Data Retention:**
   - Locations older than 5 minutes marked as inactive
   - Automatic cleanup prevents data accumulation
   - Users can stop sharing at any time

3. **Permission Management:**
   - Proper GPS permission requests
   - Graceful fallbacks when permissions denied
   - User control over location sharing

## Performance Optimizations

1. **Database Indexing:**
   - 2dsphere index for geospatial queries
   - Compound indexes for efficient filtering
   - Optimized query patterns

2. **Frontend Optimization:**
   - Efficient React hooks with proper cleanup
   - Debounced location updates
   - Minimal re-renders with state management

3. **Server Optimization:**
   - Automatic cleanup of stale data
   - Efficient geospatial queries
   - Proper error handling and validation

## Usage Instructions

### For Users:
1. Open the app (location tracking starts automatically)
2. Grant location permissions when prompted
3. Click "Find Companion" to start searching
4. Complete consent and photo upload
5. View nearby companions on the map
6. Tap companion markers to see details
7. Click "Cancel Search" to stop searching

### For Developers:
1. Ensure MongoDB is running with geospatial support
2. Start the backend server
3. Start the React Native app
4. Monitor location updates in server logs
5. Test with multiple users for full functionality

## Future Enhancements

1. **Real-Time Updates:**
   - WebSocket implementation for instant updates
   - Push notifications for nearby companions
   - Real-time location broadcasting

2. **Advanced Features:**
   - Route-based companion matching
   - Companion preferences and filtering
   - Location history and analytics
   - Geofencing and location-based alerts

3. **Performance Improvements:**
   - Redis caching for frequent queries
   - Location clustering for better performance
   - Background location sync optimization




## 📁 **Backend Files**

### **New Files Created:**
1. `models/userLocationModel.js` - Location data model with geospatial indexing
2. `controllers/locationController.js` - Location API endpoints and logic
3. `routes/locationRoutes.js` - Location API routes
4. `services/locationService.js` - Automatic cleanup and monitoring service

### **Modified Files:**
5. `app.js` - Added location routes import and endpoint
6. `server.js` - Added location service initialization

## 📱 **Frontend Files**

### **New Files Created:**
7. `hooks/useLocationTracking.js` - Location tracking custom hook
8. `hooks/useCompanionSearch.js` - Companion search custom hook

### **Modified Files:**
9. `app/home.jsx` - Complete integration of location system with map
10. `android/app/src/main/AndroidManifest.xml` - Added Google Maps API key
11. `app.json` - Added Google Maps configuration for Android and iOS

## 📋 **Documentation Files**



## 🗂️ **Summary by Category:**

**Backend Changes (6 files):**
- 4 new files
- 2 modified files

**Frontend Changes (5 files):**
- 2 new files  
- 3 modified files

**Documentation (1 file):**
- 1 new file

**Total: 12 files changed/created**

## 🔧 **Key Changes Made:**

1. **Complete backend location API** with MongoDB geospatial queries
2. **Real-time location tracking** with automatic 1-minute updates
3. **Companion search functionality** within 500m radius
4. **Map integration** with live companion markers
5. **Google Maps API configuration** for Android
6. **Automatic location cleanup** service
7. **Privacy controls** for location sharing
8. **Custom React hooks** for clean state management

