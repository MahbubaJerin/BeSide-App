const UserLocation = require("../models/userLocationModel");
const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// Update user's current location
const updateLocation = catchAsync(async (req, res, next) => {
  const { latitude, longitude, accuracy, speed, heading } = req.body;
  const userId = req.user._id;
  const userName = req.user.userName;

  console.log(`📍 [LOCATION UPDATE] User: ${userName} (${userId})`);
  console.log(`   Coordinates: ${latitude}, ${longitude}`);
  console.log(`   Accuracy: ${accuracy}m, Speed: ${speed}m/s, Heading: ${heading}°`);
  console.log(`   Timestamp: ${new Date().toISOString()}`);

  // Validate coordinates
  if (!latitude || !longitude) {
    console.log(`❌ [LOCATION UPDATE] Validation failed - Missing coordinates for user: ${userName}`);
    return next(new AppError("Latitude and longitude are required", 400));
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    console.log(`❌ [LOCATION UPDATE] Validation failed - Invalid coordinates ${latitude}, ${longitude} for user: ${userName}`);
    return next(new AppError("Invalid coordinates", 400));
  }

      try {
      console.log(`🔍 [LOCATION UPDATE] Fetching user info for: ${userName}`);
      
      // Get user info for the location record
      const user = await User.findById(userId).select(
        "firstName lastName gender profilePhoto"
      );

      if (!user) {
        console.log(`❌ [LOCATION UPDATE] User not found in database: ${userId}`);
        return next(new AppError("User not found", 404));
      }
      
      console.log(`✅ [LOCATION UPDATE] User info fetched: ${user.firstName} ${user.lastName}`);

          // Find existing location record or create new one
      let userLocation = await UserLocation.findOne({ userId });

      if (userLocation) {
        console.log(`🔄 [LOCATION UPDATE] Updating existing location record for: ${userName}`);
        // Update existing location
        await userLocation.updateLocation(
          longitude,
          latitude,
          accuracy,
          speed,
          heading
        );
        console.log(`✅ [LOCATION UPDATE] Location updated successfully for: ${userName}`);
      } else {
        console.log(`🆕 [LOCATION UPDATE] Creating new location record for: ${userName}`);
        // Create new location record
        userLocation = new UserLocation({
          userId,
          userName,
          location: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          isActive: true,
          locationAccuracy: accuracy,
          speed,
          heading,
          userInfo: {
            firstName: user.firstName,
            lastName: user.lastName,
            gender: user.gender,
            profilePhoto: user.profilePhoto,
          },
        });
        await userLocation.save();
        console.log(`✅ [LOCATION UPDATE] New location record created for: ${userName}`);
      }

          console.log(`🎯 [LOCATION UPDATE] Success response sent for: ${userName}`);
      res.status(200).json({
        status: "success",
        message: "Location updated successfully",
        data: {
          location: userLocation,
        },
      });
    } catch (error) {
      console.log(`💥 [LOCATION UPDATE] Error updating location for ${userName}:`, error.message);
      return next(new AppError("Failed to update location", 500));
    }
});

// Find nearby companions
const findNearbyCompanions = catchAsync(async (req, res, next) => {
  const { latitude, longitude, radius = 500 } = req.query;
  const userId = req.user._id;

  console.log(`🔍 [COMPANION SEARCH] User ${userId} searching for companions`);
  console.log(`   Search center: ${latitude}, ${longitude}`);
  console.log(`   Search radius: ${radius}m`);
  console.log(`   Timestamp: ${new Date().toISOString()}`);

  // Validate coordinates
  if (!latitude || !longitude) {
    console.log(`❌ [COMPANION SEARCH] Validation failed - Missing coordinates for user: ${userId}`);
    return next(new AppError("Latitude and longitude are required", 400));
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const searchRadius = parseInt(radius);

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    console.log(`❌ [COMPANION SEARCH] Validation failed - Invalid coordinates ${lat}, ${lng} for user: ${userId}`);
    return next(new AppError("Invalid coordinates", 400));
  }

  if (searchRadius < 100 || searchRadius > 5000) {
    console.log(`❌ [COMPANION SEARCH] Validation failed - Invalid radius ${searchRadius}m for user: ${userId}`);
    return next(new AppError("Radius must be between 100m and 5000m", 400));
  }

  try {
    console.log(`🔄 [COMPANION SEARCH] Updating user location and setting search mode for: ${userId}`);
    
    // Update current user's location and set searching mode
    await UserLocation.findOneAndUpdate(
      { userId },
      {
        location: {
          type: "Point",
          coordinates: [lng, lat],
        },
        isActive: true,
        isSearching: true,
        searchRadius,
        lastSeen: new Date(),
      },
      { upsert: true, new: true }
    );
    
    console.log(`✅ [COMPANION SEARCH] User location updated and search mode enabled for: ${userId}`);

    // Find nearby users
    console.log(`🔍 [COMPANION SEARCH] Searching for companions within ${searchRadius}m radius...`);
    const nearbyUsers = await UserLocation.findNearbyUsers(
      lng,
      lat,
      searchRadius,
      userId
    );
    
    console.log(`📊 [COMPANION SEARCH] Found ${nearbyUsers.length} nearby companions for user: ${userId}`);

    // Calculate distances and add additional info
    console.log(`🧮 [COMPANION SEARCH] Calculating distances for ${nearbyUsers.length} companions...`);
    const companionsWithDistance = nearbyUsers.map((companion) => {
      const [compLng, compLat] = companion.location.coordinates;
      const distance = calculateDistance(lat, lng, compLat, compLng);

      return {
        userId: companion.userId,
        userName: companion.userName,
        location: {
          latitude: compLat,
          longitude: compLng,
        },
        distance: Math.round(distance),
        userInfo: companion.userInfo,
        lastSeen: companion.lastSeen,
        isSearching: companion.isSearching,
      };
    });
    
    console.log(`📏 [COMPANION SEARCH] Distance calculations completed for user: ${userId}`);

    // Sort by distance
    companionsWithDistance.sort((a, b) => a.distance - b.distance);
    console.log(`📈 [COMPANION SEARCH] Results sorted by distance for user: ${userId}`);

    console.log(`🎯 [COMPANION SEARCH] Success response sent for user: ${userId} - ${companionsWithDistance.length} companions found`);
    res.status(200).json({
      status: "success",
      results: companionsWithDistance.length,
      data: {
        companions: companionsWithDistance,
        searchRadius,
        searchCenter: {
          latitude: lat,
          longitude: lng,
        },
      },
    });
  } catch (error) {
    console.log(`💥 [COMPANION SEARCH] Error finding companions for user ${userId}:`, error.message);
    return next(new AppError("Failed to find nearby companions", 500));
  }
});

// Stop searching for companions
const stopSearching = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  try {
    const userLocation = await UserLocation.findOneAndUpdate(
      { userId },
      { isSearching: false },
      { new: true }
    );

    if (!userLocation) {
      return next(new AppError("User location not found", 404));
    }

    res.status(200).json({
      status: "success",
      message: "Search mode disabled",
      data: {
        location: userLocation,
      },
    });
  } catch (error) {
    return next(new AppError("Failed to stop searching", 500));
  }
});

// Get user's current location status
const getLocationStatus = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  try {
    const userLocation = await UserLocation.findOne({ userId });

    if (!userLocation) {
      return res.status(200).json({
        status: "success",
        data: {
          hasLocation: false,
          isActive: false,
          isSearching: false,
        },
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        hasLocation: true,
        location: {
          latitude: userLocation.location.coordinates[1],
          longitude: userLocation.location.coordinates[0],
        },
        isActive: userLocation.isActive,
        isSearching: userLocation.isSearching,
        lastSeen: userLocation.lastSeen,
        searchRadius: userLocation.searchRadius,
      },
    });
  } catch (error) {
    return next(new AppError("Failed to get location status", 500));
  }
});

// Update location sharing preferences
const updateLocationPreferences = catchAsync(async (req, res, next) => {
  const { shareLocation, visibleToOthers } = req.body;
  const userId = req.user._id;

  try {
    const userLocation = await UserLocation.findOneAndUpdate(
      { userId },
      {
        shareLocation: shareLocation !== undefined ? shareLocation : true,
        visibleToOthers: visibleToOthers !== undefined ? visibleToOthers : true,
      },
      { new: true, upsert: true }
    );

    res.status(200).json({
      status: "success",
      message: "Location preferences updated",
      data: {
        preferences: {
          shareLocation: userLocation.shareLocation,
          visibleToOthers: userLocation.visibleToOthers,
        },
      },
    });
  } catch (error) {
    return next(new AppError("Failed to update location preferences", 500));
  }
});

// Clean old locations (utility endpoint for admin)
const cleanOldLocations = catchAsync(async (req, res, next) => {
  const { olderThanMinutes = 10 } = req.query;

  try {
    const result = await UserLocation.cleanOldLocations(
      parseInt(olderThanMinutes)
    );

    res.status(200).json({
      status: "success",
      message: `Cleaned ${result.modifiedCount} old location records`,
      data: {
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    return next(new AppError("Failed to clean old locations", 500));
  }
});

// Utility function to calculate distance between two points using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

module.exports = {
  updateLocation,
  findNearbyCompanions,
  stopSearching,
  getLocationStatus,
  updateLocationPreferences,
  cleanOldLocations,
};
