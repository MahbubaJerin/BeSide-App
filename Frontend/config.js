// config.js
<<<<<<< HEAD
// Configuration for both development and production environments

import Constants from 'expo-constants';

const getBaseUrl = () => {
  // Check if we're in development mode
  if (__DEV__) {
    // For development, you can use either:
    // 1. Your local IP address (replace with your actual IP)
    // return "http://192.168.1.100:5000"; // Replace 192.168.1.100 with your actual IP
    
    // 2. Use Railway URL for development testing
    return "https://beside-production.up.railway.app";
    
    // 3. If using adb reverse for Android emulator
    // return "http://localhost:5000";
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
=======
// Environment-aware configuration

// Determine which backend to use
let BASE_URL;

if (__DEV__) {
  // Development: Local backend with adb reverse
  // Run: adb reverse tcp:5000 tcp:5000
  BASE_URL = "http://localhost:5000/";
} else {
  // Production: Railway backend
  BASE_URL = "https://beside-production.up.railway.app/";
}

// If you also have Socket.IO (or another realtime service) on 3001,
// run: adb reverse tcp:3001 tcp:3001  and uncomment below.
// export const SOCKET_URL = __DEV__ ? 'http://localhost:3001/' : 'https://beside-production.up.railway.app/';
>>>>>>> fb729e44932fd7cf31724828a82b50fbe05e50c2

// Optional default export (works if some files do import config from './config')
export default {
  BASE_URL,
  API_ENDPOINTS,
  NETWORK_CONFIG,
};

export { BASE_URL };