const UserLocation = require("../models/userLocationModel");

class LocationService {
  constructor() {
    this.cleanupInterval = null;
    this.startAutoCleanup();
  }

  // Start automatic cleanup of old locations
  startAutoCleanup() {
    console.log(`🧹 [LOCATION SERVICE] Starting automatic cleanup service - runs every 5 minutes`);
    
    // Clean up old locations every 5 minutes
    this.cleanupInterval = setInterval(async () => {
      try {
        console.log(`🧹 [LOCATION SERVICE] Running scheduled cleanup...`);
        const result = await UserLocation.cleanOldLocations(5); // 5 minutes
        if (result.modifiedCount > 0) {
          console.log(`✅ [LOCATION SERVICE] Cleaned ${result.modifiedCount} old location records`);
        } else {
          console.log(`ℹ️ [LOCATION SERVICE] No old locations to clean`);
        }
      } catch (error) {
        console.error(`💥 [LOCATION SERVICE] Error cleaning old locations:`, error);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  // Stop automatic cleanup
  stopAutoCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  // Get real-time statistics
  async getLocationStats() {
    try {
      console.log(`📊 [LOCATION SERVICE] Fetching location statistics...`);
      
      const totalUsers = await UserLocation.countDocuments();
      const activeUsers = await UserLocation.countDocuments({ isActive: true });
      const searchingUsers = await UserLocation.countDocuments({ 
        isActive: true, 
        isSearching: true 
      });
      
      const recentlyActive = await UserLocation.countDocuments({
        lastSeen: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
      });

      const stats = {
        totalUsers,
        activeUsers,
        searchingUsers,
        recentlyActive,
        lastUpdate: new Date(),
      };
      
      console.log(`📊 [LOCATION SERVICE] Stats: ${activeUsers}/${totalUsers} active, ${searchingUsers} searching, ${recentlyActive} recently active`);
      
      return stats;
    } catch (error) {
      console.error(`💥 [LOCATION SERVICE] Error getting location stats:`, error);
      return null;
    }
  }

  // Broadcast location updates to nearby users (for future WebSocket implementation)
  async broadcastLocationUpdate(userId, location) {
    try {
      // Find users within 1km who might be interested in this update
      const nearbyUsers = await UserLocation.findNearbyUsers(
        location.coordinates[0],
        location.coordinates[1],
        1000, // 1km radius for notifications
        userId
      );

      // This would broadcast to WebSocket connections in a real implementation
      // For now, we'll just log it
      if (nearbyUsers.length > 0) {
        console.log(`Broadcasting location update to ${nearbyUsers.length} nearby users`);
      }

      return nearbyUsers;
    } catch (error) {
      console.error("Error broadcasting location update:", error);
      return [];
    }
  }
}

// Create a singleton instance
const locationService = new LocationService();

module.exports = locationService;
