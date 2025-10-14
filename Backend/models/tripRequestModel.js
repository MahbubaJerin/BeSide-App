const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const User = require("./userModel"); // Assuming you have a user model
const TripReqSchema = new Schema(
    {
    tripReqId: {
      type: String,
      required: [true, "Trip ID is required"],
      unique: true,
    },
    user: {
        userId: {
          type: String,
          required: [true, "User ID is required"],
        },
        userName: {
          type: String,
          required: [true, "User name is required"],
        },
        userImage: {
          type: String,
          default: "default.jpg",
        },
    },

    destination: {
        type: String,
        required: [true, "Destination is required"],
      },

    destinationType: {
        type: String,
        enum: ["By Bus", "By Tram", "By Train", "By Car", "By Bike", "By Walk", "Other"],
        required: [true, "Destination type is required"],
      },

    date: {
        type: Date,
        required: [true, "Date is required"],
      },

    time: {
        type: String,
        required: [true, "Time is required"],
      },

    genderPreference: {
        type: String,
        enum: ["any", "male", "female", "nonbinary"],
        required: [true, "Gender preference is required"],
    },

    photo: {
        url: {
            type: String,
            default: "",
        },
        filename: {
            type: String,
            default: "",
        },
        publicId: {
            type: String,
            default: "",
        },
    },

    // New fields for notification system
    status: {
        type: String,
        enum: ["pending", "accepted", "declined", "expired", "completed"],
        default: "pending"
    },

    recipients: [{
        userId: {
            type: String,
            required: true
        },
        userName: {
            type: String,
            required: true
        },
        notifiedAt: {
            type: Date,
            default: Date.now
        },
        responseStatus: {
            type: String,
            enum: ["notified", "viewed", "accepted", "declined"],
            default: "notified"
        }
    }],

    acceptedBy: {
        userId: {
            type: String,
            default: ""
        },
        userName: {
            type: String,
            default: ""
        },
        acceptedAt: {
            type: Date,
            default: null
        }
    },

    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from creation (extended for better UX)
    },

    searchDuration: {
        type: Number,
        default: 30 * 60 * 1000 // 30 minutes in milliseconds
    },

    routeCoordinates: [{
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true }
    }],

    startLocation: {
        latitude: { type: Number },
        longitude: { type: Number },
        address: { type: String }
    },

    destinationLocation: {
        latitude: { type: Number },
        longitude: { type: Number },
        address: { type: String }
    },

    transportMode: {
        type: String,
        enum: ["walking", "driving", "transit"],
        default: "walking"
    },

    meetingPoint: {
        latitude: { type: Number },
        longitude: { type: Number },
        address: { type: String },
        isSelected: { type: Boolean, default: false }
    },

    consent: {
        noTouchAgreed: { type: Boolean, default: false },
        senderConsent: { type: Boolean, default: false },
        receiverConsent: { type: Boolean, default: false },
        consentCompletedAt: { type: Date }
    },

    matchedTripId: {
        type: String,
        default: ""
    },
}, {
    timestamps: true // This adds createdAt and updatedAt automatically
});
module.exports = mongoose.model("TripRequest", TripReqSchema);
