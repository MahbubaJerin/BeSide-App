const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserLocationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    userName: {
      type: String,
      required: [true, "Username is required"],
      index: true,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: [true, "Coordinates are required"],
        validate: {
          validator: function (coords) {
            return (
              Array.isArray(coords) &&
              coords.length === 2 &&
              coords[0] >= -180 &&
              coords[0] <= 180 && // longitude
              coords[1] >= -90 &&
              coords[1] <= 90 // latitude
            );
          },
          message: "Invalid coordinates. Must be [longitude, latitude]",
        },
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isSearching: {
      type: Boolean,
      default: false,
      index: true,
    },
    searchRadius: {
      type: Number,
      default: 500, // meters
      min: 100,
      max: 5000,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
      index: true,
    },
    locationAccuracy: {
      type: Number,
      default: null, // in meters
    },
    speed: {
      type: Number,
      default: null, // in m/s
    },
    heading: {
      type: Number,
      default: null, // in degrees
    },
    // Privacy settings
    shareLocation: {
      type: Boolean,
      default: true,
    },
    visibleToOthers: {
      type: Boolean,
      default: true,
    },
    // Additional user info for quick access
    userInfo: {
      firstName: String,
      lastName: String,
      gender: String,
      profilePhoto: {
        url: String,
        publicId: String,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Create geospatial index for location-based queries
UserLocationSchema.index({ location: "2dsphere" });

// Compound indexes for efficient queries
UserLocationSchema.index({ isActive: 1, isSearching: 1, lastSeen: -1 });
UserLocationSchema.index({ userId: 1, isActive: 1 });

// Pre-save hook to update lastSeen
UserLocationSchema.pre("save", function (next) {
  this.lastSeen = new Date();
  next();
});

// Pre-update hooks to update lastSeen
UserLocationSchema.pre(["updateOne", "findOneAndUpdate"], function (next) {
  this.set({ lastSeen: new Date() });
  next();
});

// Static method to find nearby users
UserLocationSchema.statics.findNearbyUsers = function (
  longitude,
  latitude,
  radiusInMeters = 500,
  excludeUserId = null
) {
  const query = {
    location: {
      $nearSphere: {
        $geometry: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        $maxDistance: radiusInMeters,
      },
    },
    isActive: true,
    shareLocation: true,
    visibleToOthers: true,
    lastSeen: {
      $gte: new Date(Date.now() - 15 * 60 * 1000), // Last 15 minutes
    },
  };

  if (excludeUserId) {
    query.userId = { $ne: excludeUserId };
  }

  return this.find(query).select(
    "userId userName location userInfo lastSeen isSearching"
  );
};

// Static method to clean old locations
UserLocationSchema.statics.cleanOldLocations = function (olderThanMinutes = 10) {
  const cutoffTime = new Date(Date.now() - olderThanMinutes * 60 * 1000);
  return this.updateMany(
    { lastSeen: { $lt: cutoffTime } },
    { $set: { isActive: false } }
  );
};

// Instance method to update location
UserLocationSchema.methods.updateLocation = function (
  longitude,
  latitude,
  accuracy = null,
  speed = null,
  heading = null
) {
  this.location.coordinates = [longitude, latitude];
  this.locationAccuracy = accuracy;
  this.speed = speed;
  this.heading = heading;
  this.isActive = true;
  this.lastSeen = new Date();
  return this.save();
};

// Instance method to toggle search mode
UserLocationSchema.methods.toggleSearchMode = function (isSearching = true) {
  this.isSearching = isSearching;
  return this.save();
};

module.exports = mongoose.model("UserLocation", UserLocationSchema);
