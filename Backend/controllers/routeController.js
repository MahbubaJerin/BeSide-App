const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

exports.getRouteInformation = catchAsync(async (req, res, next) => {
  const { startCoordinates, endCoordinates, transportMode } = req.body;

  if (!startCoordinates || !endCoordinates || !transportMode) {
    return next(new AppError("Missing required route parameters", 400));
  }

  // Map frontend transport modes to Google Maps modes
  const googleMapsMode = {
    "walk": "walking",
    "bus": "transit",
    "train": "transit",
    "car": "driving"
  }[transportMode.toLowerCase()] || "driving";

  try {
    const url = `https://maps.googleapis.com/maps/api/directions/json` +
      `?origin=${startCoordinates.latitude},${startCoordinates.longitude}` +
      `&destination=${endCoordinates.latitude},${endCoordinates.longitude}` +
      `&mode=${googleMapsMode}` +
      `&key=${process.env.GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      return next(new AppError(data.error_message || 'Failed to get route', 400));
    }

    res.status(200).json({
      status: "success",
      data: {
        route: data.routes[0],
        mode: googleMapsMode,
        distance: data.routes[0].legs[0].distance.text,
        duration: data.routes[0].legs[0].duration.text
      }
    });
  } catch (error) {
    return next(new AppError("Failed to fetch route information", 500));
  }
});