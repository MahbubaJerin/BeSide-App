const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const validator = require("validator");

const UserSchema = new Schema(
  {
    userId: {
      type: String,
      unique: true,
      default: function () {
        return this._id.toString();
      },
    },       
    userName: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: [validator.isEmail, "Please provide a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
      select: false, // Don't include password in query results by default
    },
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    gender: {
      type: String,
      enum: ["male", "female", "non-binary", "prefer-not-to-say", "other"],
    },
    mobileNo: {
      type: String,
      required: [true, "Mobile number is required"],
      validate: {
        validator: function (v) {
          return /^[+]?[\d\s-]+$/.test(v);
        },
        message: (props) => `${props.value} is not a valid phone number!`,
      },
    },
dateOfBirth: {
  type: Date,
  required: [true, "Date of birth is required"],
  validate: {
    validator: function (v) {
      if (!v) return false;
      const today = new Date(); today.setHours(0,0,0,0);
      if (v > today) return false;
      let age = today.getFullYear() - v.getFullYear();
      const m = today.getMonth() - v.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < v.getDate())) age--;
      return age >= 13;
    },
    message: "Invalid DOB: must not be in the future and must be at least 13 years old",
  },
},


    // Location information
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      postalCode: { type: String },
      country: {
        type: String,
        required: [true, "Country is required"],
      },
      countryCode: {
        type: String,
        required: [true, "Country code is required"],
        uppercase: true,
        minlength: 2,
        maxlength: 3,
      },
    },
    profilePhoto: {
      url: {
        type: String,
        default: "/Users/nameranayat/Documents/GitHub/BeSide-App/Frontend/assets/images/placeholder2.jpg",
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
    isVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationToken: String,
    emailVerficationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    otpCode: String,
    otpExpires: Date,
    canResetPassword: {
      type: Boolean,
      default: false,
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    consentGiven: {
      type: Boolean,
      default: false,
    },
    profileSettings: {
      public: {
        type: Boolean,
        default: false,
      },
      sharedInfo: {
        type: [String],
        default: [],
      },
    },
    createdDate: {
      type: Date,
      default: Date.now,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    availability: {
      type: Boolean,
      default: true,
    },
    accountStatus: {
      type: String,
      enum: ["active", "suspended", "deactivated"],
      default: "active",
    },
    bio: {
      type: String,
      maxlength: 500,
    },

    // Emergency Contacts (NEW) 
    emergencyContacts: [
      {
        name: { type: String, required: true, trim: true },
        phone: { type: String, required: true, trim: true },
        relation: { type: String, trim: true },
        email: { type: String, trim: true },
        isPrimary: { type: Boolean, default: false },
        // keep default _id for subdocs so .id(contactId) works
      },
    ],
  },
  {
    timestamps: true,
  },

);

// Pre-save hook to update lastUpdated field
UserSchema.pre("save", function (next) {
  this.lastUpdated = Date.now();
  next();
});

// Pre-update hooks to update lastUpdated field
UserSchema.pre(["updateOne", "findOneAndUpdate"], function (next) {
  this.set({ lastUpdated: Date.now() });
  next();
});

module.exports = mongoose.model("User", UserSchema);
