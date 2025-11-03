// config.js
// Environment-aware configuration

// Determine which backend to use
let BASE_URL;

if (__DEV__) {
  // Development: Local backend with adb reverse
  // Run: adb reverse tcp:5000 tcp:5000
  BASE_URL = "http://localhost:5000/";
} else {
  // Production: Railway backend
  BASE_URL = "https://beside-backend-2pdx.onrender.com/";
}

// If you also have Socket.IO (or another realtime service) on 3001,
// run: adb reverse tcp:3001 tcp:3001  and uncomment below.
// export const SOCKET_URL = __DEV__ ? 'http://localhost:3001/' : 'https://beside-backend-2pdx.onrender.com';

// Optional default export (works if some files do import config from './config')
export default {
  BASE_URL,
  // SOCKET_URL,
};

export { BASE_URL };