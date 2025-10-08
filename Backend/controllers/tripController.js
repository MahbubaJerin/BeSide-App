const User = require("../models/userModel");
const Trip = require("../models/tripModel");
const TripRequest = require("../models/tripRequestModel");
const { uploadToCloudinary, deleteFromCloudinary } = require("../utils/fileUpload");

const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");

// Add Google Maps client initialization
const { Client } = require("@googlemaps/google-maps-services-js");
const client = new Client({});

  exports.createTripReq = catchAsync(async (req, res, next) => {
    const { user, destination, destinationType, date, time, genderPreference } = req.body;
  
    if (!user || !user.userName) {
      return next(new AppError("User name is required", 400));
    }
  
    // Find user by userName
    const existingUser = await User.findOne({ userName: user.userName });
    if (!existingUser) {
      return next(new AppError("User not found", 404));
    }
  
    // Generate trip request ID
    const tripReqId = existingUser.userName.slice(0, 3).toUpperCase() + Date.now();
  
    // Create new TripRequest using full user data
    const newTripRequest = await TripRequest.create({
      tripReqId,
      user: {
        userId: existingUser._id.toString(), // Inject required field
        userName: existingUser.userName,
        userImage: existingUser.profilePhoto || "default.jpg"
      },
      destination,
      destinationType,
      date,
      time,
      genderPreference
    });
  
    res.status(201).json({
      status: "success",
      data: {
        tripRequest: newTripRequest,
      },
    });
  });  

  
exports.createTrip = catchAsync(async (req, res, next) => {
  const { user, companion, consent, distanceMaintained, distancePreferred, genderPreference, imageVerification } = req.body;

  if (!user?.userName || !companion?.userName) {
    return next(new AppError("Both user and companion usernames are required", 400));
  }

  // Find user and companion by username
  const existingUser = await User.findOne({ userName: user.userName });
  if (!existingUser) return next(new AppError("User not found", 404));

  const existingCompanion = await User.findOne({ userName: companion.userName });
  if (!existingCompanion) return next(new AppError("Companion not found", 404));

  // Generate unique trip ID
  const tripId = existingUser.userName.slice(0, 3).toUpperCase() + existingCompanion.userName.slice(0, 3).toUpperCase() + Date.now();

  // Create trip
  const newTrip = await Trip.create({
    tripId,
    user: {
      userId: existingUser._id.toString(),
      userName: existingUser.userName,
      userImage: existingUser.profilePhoto || "default.jpg"
    },
    companion: {
      userId: existingCompanion._id.toString(),
      userName: existingCompanion.userName,
      userImage: existingCompanion.profilePhoto || "default.jpg"
    },
    consent,
    distanceMaintained,
    distancePreferred,
    genderPreference,
    imageVerification
  });

  res.status(201).json({
    status: "success",
    data: {
      trip: newTrip
    }
  });
});

exports.getTripReq = catchAsync(async (req, res, next) => {
    const { tripReqId } = req.body;

    if (!tripReqId) {
        return next(new AppError("Trip Request ID is required", 400));
    }

    const tripRequest = await TripRequest.findOne({ tripReqId });

    if (!tripRequest) {
        return next(new AppError("Trip Request not found", 404));
    }

    res.status(200).json({
        status: "success",
        data: {
            tripRequest,
        },
    });
});

exports.getTrip = catchAsync(async (req, res, next) => {
    const { tripId } = req.body;

    if (!tripId) {
        return next(new AppError("Trip ID is required", 400));
    }

    const trip = await Trip.findOne({ tripId });

    if (!trip) {
        return next(new AppError("Trip not found", 404));
    }

    res.status(200).json({
        status: "success",
        data: {
            trip,
        },
    });
});

exports.uploadTripPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError("No file uploaded", 400));
  }

  const { tripReqId } = req.params;
  if (!tripReqId) {
    return next(new AppError("Trip Request ID is required", 400));
  }

  const tripRequest = await TripRequest.findOne({ tripReqId });
  if (!tripRequest) {
    return next(new AppError("Trip Request not found", 404));
  }

  // Delete existing photo if any
  if (tripRequest.photo?.publicId) {
    await deleteFromCloudinary(tripRequest.photo.publicId);
  }

  // Upload new photo
  const uploadResult = await uploadToCloudinary(
    req.file,
    "trip-photos",
    tripRequest.user.userId
  );

  // Update trip request with new photo
  tripRequest.photo = uploadResult;
  await tripRequest.save();

  res.status(200).json({
    status: "success",
    message: "Photo uploaded successfully",
    data: {
      photoUrl: uploadResult.url
    }
  });
});

exports.updateTripRequest = catchAsync(async (req, res, next) => {
  const { tripReqId } = req.params;
  const { destination, destinationType, date, time, genderPreference } = req.body;

  if (!tripReqId) {
    return next(new AppError("Trip Request ID is required", 400));
  }

  const tripRequest = await TripRequest.findOne({ tripReqId });
  if (!tripRequest) {
    return next(new AppError("Trip Request not found", 404));
  }

  // Update fields if provided
  if (destination) tripRequest.destination = destination;
  if (destinationType) tripRequest.destinationType = destinationType;
  if (date) tripRequest.date = date;
  if (time) tripRequest.time = time;
  if (genderPreference) tripRequest.genderPreference = genderPreference;

  await tripRequest.save();

  res.status(200).json({
    status: "success",
    message: "Trip request updated successfully",
    data: {
      tripRequest
    }
  });
});

exports.getRoute = catchAsync(async (req, res, next) => {
  console.log('\n=== Route Request Details ===');
  console.log('Raw request body:', req.body);
  
  const { origin, destination, mode = 'walking' } = req.body;

  // Detailed debug logs
  console.log('\nParsed request data:');
  console.log('Origin:', {
    latitude: origin?.latitude,
    longitude: origin?.longitude,
    type: typeof origin,
    isValid: origin && typeof origin.latitude === 'number' && typeof origin.longitude === 'number'
  });
  console.log('Destination:', {
    latitude: destination?.latitude,
    longitude: destination?.longitude,
    type: typeof destination,
    isValid: destination && typeof destination.latitude === 'number' && typeof destination.longitude === 'number'
  });
  console.log('Transport Mode:', mode);

  // Validate mode
  const validModes = ['walking', 'driving', 'transit'];
  if (!validModes.includes(mode)) {
    console.log('❌ Invalid transport mode:', mode);
    return next(new AppError(`Invalid transport mode. Must be one of: ${validModes.join(', ')}`, 400));
  }

  // Validate input
  if (!origin?.latitude || !origin?.longitude || !destination?.latitude || !destination?.longitude) {
    console.log('Invalid coordinates received');
    return next(new AppError('Invalid origin or destination coordinates', 400));
  }

  // Validate coordinate ranges
  if (Math.abs(origin.latitude) > 90 || Math.abs(origin.longitude) > 180 ||
      Math.abs(destination.latitude) > 90 || Math.abs(destination.longitude) > 180) {
    return next(new AppError('Coordinates out of valid range', 400));
  }

    try {
      console.log('\n=== Making Google Maps API Request ===');
      const requestParams = {
        origin: `${origin.latitude},${origin.longitude}`,
        destination: `${destination.latitude},${destination.longitude}`,
        mode: mode,
        key: process.env.GOOGLE_MAPS_API_KEY
      };
      console.log('Request params:', {
        ...requestParams,
        key: 'HIDDEN' // Don't log API key
      });

      // Get route from Google Maps Directions API
      const response = await client.directions({
        params: requestParams
      });

      console.log('\n=== Google Maps API Response ===');
      console.log('Status:', response.data.status);
      if (response.data.status !== 'OK') {
        console.log('Error details:', response.data.error_message || 'No error message provided');
        return next(new AppError(`Failed to get route: ${response.data.status}${response.data.error_message ? ' - ' + response.data.error_message : ''}`, 400));
      }    const route = response.data.routes[0];
    if (!route || !route.overview_polyline || !route.overview_polyline.points) {
      return next(new AppError('No route found between the given points', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        route: {
          points: route.overview_polyline.points,
          distance: route.legs[0].distance.value, // in meters
          duration: route.legs[0].duration.value, // in seconds
          start_address: route.legs[0].start_address,
          end_address: route.legs[0].end_address
        }
      }
    });
  } catch (error) {
    console.error('Google Maps API error:', error);
    return next(new AppError('Failed to fetch route information', 500));
  }
});
