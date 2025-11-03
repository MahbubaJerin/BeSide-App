// config.js
// Configuration for both development and production environments

const getBaseUrl = () => {
  // Check if we're in development mode
  if (__DEV__) {
    // For development, you can choose:
    // 1. Local backend (if running locally)
    // return "http://localhost:5000";
    
    // 2. Railway URL for development testing (recommended)
    return "https://beside-production.up.railway.app";
  } else {
    // Production - always use Railway URL
    return "https://beside-production.up.railway.app";
  }
};

export const BASE_URL = getBaseUrl();

// API endpoints
export const API_ENDPOINTS = {
  // Auth endpoints
  REGISTER: '/api/auth/register',
  LOGIN: '/api/v1/auth/login',
  LOGOUT: '/api/v1/auth/logout',
  CURRENT_USER: '/api/v1/auth/current-user',
  FORGOT_PASSWORD: '/api/v1/auth/send-otp-reset',
  VERIFY_OTP: '/api/v1/auth/verify-otp',
  RESET_PASSWORD: '/api/v1/auth/reset-password',
  
  // User endpoints
  PROFILE: '/api/users/profile',
  UPDATE_PROFILE: '/api/users/profile',
  UPLOAD_PHOTO: '/api/users/upload-photo',
  DELETE_PHOTO: '/api/users/delete-photo',
  PRIVACY_SETTINGS: '/api/users/privacy-settings',
  AVAILABILITY: '/api/users/availability',
  
  // Trip endpoints (when implemented)
  CREATE_TRIP: '/api/trips/create-request',
  MY_TRIPS: '/api/trips/my-requests',
  AVAILABLE_TRIPS: '/api/trips/available',
  JOIN_TRIP: '/api/trips/join',
};

// Network configuration
export const NETWORK_CONFIG = {
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};

// Optional default export (works if some files do import config from './config')
export default {
  BASE_URL,
  API_ENDPOINTS,
  NETWORK_CONFIG,
};

export { BASE_URL };