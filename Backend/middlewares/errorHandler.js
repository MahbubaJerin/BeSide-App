/**
 * Enhanced global error handling middleware with better categorization and logging
 */
const AppError = require("../utils/AppError");

// Database error handlers
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg?.match(/(["'])(\\?.)*?\1/)?.[0] || 'unknown field';
  const message = `Duplicate field value: ${value}. Please use another value`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join(". ")}`;
  return new AppError(message, 400);
};

// Authentication error handlers
const handleJWTError = () =>
  new AppError("Invalid token. Please log in again", 401);

const handleJWTExpiredError = () =>
  new AppError("Your token has expired. Please log in again", 401);

// Network error handlers
const handleNetworkError = (err) => {
  if (err.code === 'ECONNREFUSED') {
    return new AppError("Service temporarily unavailable. Please try again later.", 503);
  }
  if (err.code === 'ETIMEDOUT') {
    return new AppError("Request timeout. Please check your connection and try again.", 408);
  }
  if (err.code === 'ENOTFOUND') {
    return new AppError("Network error. Please check your connection.", 503);
  }
  return new AppError("Network error occurred. Please try again.", 503);
};

// MongoDB specific error handlers
const handleMongoNetworkError = () =>
  new AppError("Database connection error. Please try again later.", 503);

const handleMongoTimeoutError = () =>
  new AppError("Database operation timed out. Please try again.", 408);

const handleMongoServerSelectionError = () =>
  new AppError("Database server unavailable. Please try again later.", 503);

// File upload error handlers
const handleMulterError = (err) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return new AppError("File size too large. Maximum size is 5MB.", 400);
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return new AppError("Too many files uploaded.", 400);
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return new AppError("Unexpected file field.", 400);
  }
  return new AppError("File upload error occurred.", 400);
};

// Rate limiting error handler
const handleRateLimitError = () =>
  new AppError("Too many requests. Please try again later.", 429);

// Enhanced error logging
const logError = (err, req) => {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    method: req?.method,
    url: req?.originalUrl,
    ip: req?.ip || req?.connection?.remoteAddress,
    userAgent: req?.get('User-Agent'),
    userId: req?.user?._id,
    userName: req?.user?.userName,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      code: err.code,
      statusCode: err.statusCode,
      isOperational: err.isOperational
    }
  };

  // Log different severity levels
  if (err.statusCode >= 500) {
    console.error('🚨 [CRITICAL ERROR]', JSON.stringify(errorInfo, null, 2));
  } else if (err.statusCode >= 400) {
    console.warn('⚠️ [CLIENT ERROR]', JSON.stringify(errorInfo, null, 2));
  } else {
    console.log('ℹ️ [INFO ERROR]', JSON.stringify(errorInfo, null, 2));
  }
};

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    // Programming or other unknown error: don't leak error details
    console.error("ERROR 💥", err);
    res.status(500).json({
      status: "error",
      message: "Something went wrong",
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  // Log all errors
  logError(err, req);

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Database errors
    if (error.name === "CastError") error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === "ValidationError") error = handleValidationErrorDB(error);
    
    // Authentication errors
    if (error.name === "JsonWebTokenError") error = handleJWTError();
    if (error.name === "TokenExpiredError") error = handleJWTExpiredError();
    
    // Network errors
    if (['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'].includes(error.code)) {
      error = handleNetworkError(error);
    }
    
    // MongoDB specific errors
    if (error.name === "MongoNetworkError") error = handleMongoNetworkError();
    if (error.name === "MongoTimeoutError") error = handleMongoTimeoutError();
    if (error.name === "MongoServerSelectionError") error = handleMongoServerSelectionError();
    
    // File upload errors
    if (error.name === "MulterError") error = handleMulterError(error);
    
    // Rate limiting errors
    if (error.name === "RateLimitError" || error.statusCode === 429) {
      error = handleRateLimitError();
    }

    sendErrorProd(error, res);
  }
};