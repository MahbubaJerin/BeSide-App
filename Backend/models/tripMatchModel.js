// Backend/models/tripMatchModel.js
const mongoose = require('mongoose');

const tripMatchSchema = new mongoose.Schema({
  // Unique identifier for the match
  matchId: {
    type: String,
    required: true
  },
  
  // Original trip request that led to this match
  originalTripRequest: {
    tripReqId: { type: String, required: true }
  },
  
  // Trip organizer (the person who sent the original request)
  organizer: {
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    userImage: { type: String },
    joinedAt: { type: Date, default: Date.now }
  },
  
  // Companion (the person who accepted the request)
  companion: {
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    userImage: { type: String },
    joinedAt: { type: Date, default: Date.now }
  },
  
  // Trip details (copied from original request for reference)
  tripDetails: {
    destination: { type: String, required: true },
    destinationType: { type: String, required: true },
    startLocation: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      address: { type: String }
    },
    destinationLocation: {
      latitude: { type: Number },
      longitude: { type: Number },
      address: { type: String }
    },
    routeCoordinates: [{
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true }
    }],
    plannedDate: { type: Date, required: true },
    plannedTime: { type: String, required: true },
    genderPreference: { type: String, default: 'any' }
  },
  
  // Match status
  status: {
    type: String,
    enum: ['active', 'in-progress', 'completed', 'cancelled'],
    default: 'active'
  },
  
  // Trip progression
  progression: {
    matched: { type: Date, default: Date.now },
    started: { type: Date },
    completed: { type: Date },
    cancelled: { type: Date }
  },
  
  // Communication
  lastMessage: {
    content: { type: String },
    senderId: { type: String },
    senderName: { type: String },
    timestamp: { type: Date }
  },
  
  // Safety and tracking
  safety: {
    emergencyContactsShared: { type: Boolean, default: false },
    lastCheckIn: { type: Date },
    checkInInterval: { type: Number, default: 1800000 } // 30 minutes in ms
  },
  
  // Meeting point
  meetingPoint: {
    name: { type: String },
    description: { type: String },
    location: {
      latitude: { type: Number },
      longitude: { type: Number }
    },
    address: { type: String },
    type: { 
      type: String, 
      enum: ['midpoint', 'organizer', 'companion', 'current', 'custom'],
      default: 'custom'
    },
    setBy: { type: String },
    setAt: { type: Date }
  },

  // Location sharing
  liveLocationSharing: {
    enabled: { type: Boolean, default: false },
    organizerLocation: {
      latitude: { type: Number },
      longitude: { type: Number },
      lastUpdated: { type: Date }
    },
    companionLocation: {
      latitude: { type: Number },
      longitude: { type: Number },
      lastUpdated: { type: Date }
    }
  },
  
  // Rating and feedback (filled after completion)
  feedback: {
    organizerRating: {
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String },
      submittedAt: { type: Date }
    },
    companionRating: {
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String },
      submittedAt: { type: Date }
    }
  },
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for efficient querying
tripMatchSchema.index({ 'organizer.userId': 1 });
tripMatchSchema.index({ 'companion.userId': 1 });
tripMatchSchema.index({ status: 1 });
tripMatchSchema.index({ createdAt: -1 });
tripMatchSchema.index({ matchId: 1 }, { unique: true });

// Compound index for user-specific queries
tripMatchSchema.index({ 
  $or: [{ 'organizer.userId': 1 }, { 'companion.userId': 1 }],
  status: 1 
});

// Pre-save middleware to update the updatedAt timestamp
tripMatchSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to generate unique match ID
tripMatchSchema.statics.generateMatchId = function() {
  const prefix = 'MATCH';
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp}${random}`;
};

// Static method to find active matches for a user
tripMatchSchema.statics.findUserActiveMatches = async function(userId) {
  // Clean up old matches that should no longer be active
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  // Cancel matches that have been 'active' for more than 10 minutes without progressing
  await this.updateMany({
    $or: [
      { 'organizer.userId': userId },
      { 'companion.userId': userId }
    ],
    status: 'active',
    'progression.matched': { $lt: tenMinutesAgo },
    'progression.started': { $exists: false } // Not started yet
  }, {
    $set: { 
      status: 'cancelled',
      'progression.cancelled': new Date()
    }
  });

  // Delete very old completed/cancelled matches (older than 24 hours)
  await this.deleteMany({
    $or: [
      { 'organizer.userId': userId },
      { 'companion.userId': userId }
    ],
    status: { $in: ['completed', 'cancelled'] },
    $or: [
      { 'progression.completed': { $lt: oneDayAgo } },
      { 'progression.cancelled': { $lt: oneDayAgo } }
    ]
  });

  // Return only truly active or in-progress matches
  return this.find({
    $or: [
      { 'organizer.userId': userId },
      { 'companion.userId': userId }
    ],
    status: { $in: ['active', 'in-progress'] }
  }).sort({ 'progression.matched': -1 }); // Newest first
};

// Static method to find match history for a user
tripMatchSchema.statics.findUserMatchHistory = function(userId, limit = 10) {
  return this.find({
    $or: [
      { 'organizer.userId': userId },
      { 'companion.userId': userId }
    ]
  })
  .sort({ createdAt: -1 })
  .limit(limit);
};

// Instance method to get the other user in the match
tripMatchSchema.methods.getOtherUser = function(currentUserId) {
  const userIdStr = currentUserId.toString();
  if (this.organizer.userId.toString() === userIdStr) {
    return this.companion;
  } else if (this.companion.userId.toString() === userIdStr) {
    return this.organizer;
  }
  return null;
};

// Instance method to check if user is part of this match
tripMatchSchema.methods.includesUser = function(userId) {
  const userIdStr = userId.toString();
  return this.organizer.userId.toString() === userIdStr || this.companion.userId.toString() === userIdStr;
};

const TripMatch = mongoose.model('TripMatch', tripMatchSchema);

module.exports = TripMatch;
