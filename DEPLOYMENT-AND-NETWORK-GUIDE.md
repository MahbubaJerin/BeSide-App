# DEPLOYMENT & NETWORK CONNECTIVITY GUIDE
## BeSide App - Complete Setup for Production

---

## 🎯 QUICK ANSWER: What You Need to Deploy

```
✅ Backend (Node.js + Express + MongoDB)  - Must be deployed
✅ Frontend (React Native + Expo)         - Must be deployed
✅ Network Configuration                  - This is your PROBLEM
✅ Environment Variables                  - Critical for connection
✅ CORS Settings                          - Allow frontend to call backend
✅ SSL Certificates                       - For HTTPS connections
```

**Your Current Issue:** "Network request failed" on photo upload and trip request
- **Root Cause:** Frontend cannot connect to backend API
- **Reason:** Hardcoded `localhost:5000` doesn't work on mobile/deployed apps
- **Solution:** Use actual backend URL (Railway or AWS, etc.)

---

## PART 1: UNDERSTAND YOUR CURRENT SETUP

### **Current Configuration Issues:**

```javascript
// ❌ WRONG - frontend/config.js
export const BASE_URL = 'http://localhost:5000/';
// This works ONLY during local development with adb reverse
// Does NOT work on production
```

---

## PART 2: BACKEND DEPLOYMENT CHECKLIST

### **Step 1: Prepare Backend for Deployment**

#### **1.1 Check your `.env` file structure:**

```bash
# Backend/.env (for local development)
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/beside_dev
PORT=5000
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=development
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
GOOGLE_MAPS_API_KEY=your_maps_key
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8081,exp://localhost:8081
```

#### **1.2 Update for Production (.env.production or Railway vars):**

```bash
# Production Environment Variables
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/beside_production
PORT=8080  # Or whatever Railway assigns
JWT_SECRET=your_production_jwt_secret_key_here
NODE_ENV=production
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
GOOGLE_MAPS_API_KEY=your_maps_key
ALLOWED_ORIGINS=https://your-frontend-domain.com,exp://your-frontend-domain.com
```

#### **1.3 Fix CORS Configuration (Critical!):**

**File: Backend/app.js**

```javascript
// ❌ CURRENT - Only allows localhost
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:3000"];

// ✅ CORRECT - Allow all origins during development, specific in production
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["*"]; // Allow all in development

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      
      // Allow development
      if (process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      
      // Strict production mode
      if (allowedOrigins.indexOf(origin) === -1) {
        return callback(new AppError("CORS policy violation", 403), false);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);
```

---

### **Step 2: Deploy Backend to Railway**

#### **2.1 Sign Up and Initial Setup:**

1. Go to https://railway.app
2. Click "Start Project"
3. Select "Deploy from GitHub"
4. Connect your GitHub account
5. Select your repository

#### **2.2 Configure Railway Settings:**

```yaml
# railway.toml (Create this in Backend root)
[build]
builder = "nix"
nixpkgs = "nixpkgs-23.11"

[build.buildpacks]
- "heroku/nodejs"

[deploy]
startCommand = "node server.js"
```

#### **2.3 Add Environment Variables to Railway:**

```bash
Dashboard → Project → Variables → Add:

MONGO_URI = mongodb+srv://username:password@cluster.mongodb.net/beside_production
JWT_SECRET = your_production_secret
NODE_ENV = production
CLOUDINARY_CLOUD_NAME = your_cloud
CLOUDINARY_API_KEY = your_key
CLOUDINARY_API_SECRET = your_secret
GOOGLE_MAPS_API_KEY = your_key
ALLOWED_ORIGINS = https://your-frontend-url.com
```

#### **2.4 Railway Deployment URL:**

After deployment, you'll get a URL like:
```
https://beside-app-production-abcd1234.up.railway.app
```

**SAVE THIS URL - You need it for frontend!**

---

## PART 3: FRONTEND DEPLOYMENT CHECKLIST

### **Step 1: Update Frontend Configuration**

#### **1.1 Fix the config.js file with PRODUCTION URL**

**File: Frontend/config.js**

```javascript
// ✅ CORRECT APPROACH

// Development (local with adb reverse)
const DEV_BASE_URL = 'http://localhost:5000/';

// Production (Railway or deployed backend)
const PROD_BASE_URL = 'https://beside-app-production-abcd1234.up.railway.app/';

// Use appropriate URL based on environment
const BASE_URL = __DEV__ 
  ? DEV_BASE_URL 
  : PROD_BASE_URL;

// For local debugging without adb reverse:
// const BASE_URL = 'http://192.168.x.x:5000/'; // Your local IP

export { BASE_URL, DEV_BASE_URL, PROD_BASE_URL };

// Optional socket configuration if using real-time
export const SOCKET_URL = BASE_URL;

export default {
  BASE_URL,
  SOCKET_URL,
};
```

#### **1.2 Update API calls to use BASE_URL:**

**File: Frontend/app/home.jsx (Check all API calls)**

```javascript
// ❌ WRONG - Hardcoded URLs
const response = await fetch('http://localhost:5000/api/v1/trip/create-request', {
  method: 'POST',
  body: formData,
});

// ✅ CORRECT - Use BASE_URL from config
import { BASE_URL } from '../config.js';

const response = await fetch(`${BASE_URL}api/v1/trip/create-request`, {
  method: 'POST',
  body: formData,
});
```

#### **1.3 Update Axios if using it:**

```javascript
import axios from 'axios';
import { BASE_URL } from '../config.js';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = AsyncStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
```

---

### **Step 2: Deploy Frontend to Expo/EAS**

#### **2.1 Setup EAS Build:**

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo account
eas login

# Configure EAS for your project
eas build:configure
```

#### **2.2 Update eas.json:**

**File: Frontend/eas.json**

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "preview2": {
      "android": {
        "buildType": "app-bundle"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      },
      "ios": {
        "buildType": "archive"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccount": "path/to/service-account.json",
        "track": "production"
      },
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "your-app-id"
      }
    }
  }
}
```

#### **2.3 Create Production Build:**

```bash
# For Android APK (testing)
eas build --platform android --profile preview

# For Android Play Store (production)
eas build --platform android --profile production

# For iOS TestFlight (testing)
eas build --platform ios --profile preview

# For iOS App Store (production)
eas build --platform ios --profile production
```

---

## PART 4: NETWORK CONNECTIVITY FIX

### **Problem: "Network request failed"**

This happens when:
1. ❌ Frontend URL is `localhost` (doesn't work on mobile)
2. ❌ Backend is not accessible from phone's network
3. ❌ CORS is blocking requests
4. ❌ SSL certificate issues
5. ❌ Firewall blocking port
6. ❌ Network connection type mismatch (HTTP vs HTTPS)

### **Solution Matrix:**

| Scenario | What to Do |
|----------|-----------|
| **Local Development (Emulator)** | Use `adb reverse tcp:5000 tcp:5000` + `localhost:5000` |
| **Local Development (Physical Phone)** | Use your PC's local IP: `http://192.168.x.x:5000/` |
| **Production (Mobile App)** | Use deployed backend URL: `https://railway-url.com` |
| **Mixed Test** | Keep `__DEV__` flag check in config.js |

---

### **Solution 1: For Local Development with ADB Reverse**

```bash
# Terminal 1: Start Backend
cd Backend
npm start
# Backend runs on http://localhost:5000

# Terminal 2: Setup adb reverse
adb reverse tcp:5000 tcp:5000

# Terminal 3: Start Frontend with Expo
cd Frontend
expo start

# Select: Press 'a' for Android emulator
# Backend will be accessible via localhost:5000 inside emulator
```

---

### **Solution 2: For Local Network Testing (Phone on same WiFi)**

#### **2.1 Find your PC's IP address:**

```bash
# Windows
ipconfig
# Look for IPv4 Address: 192.168.x.x

# Mac/Linux
ifconfig
# Look for inet address
```

#### **2.2 Update Frontend config.js:**

```javascript
// Use your actual PC IP
const DEV_BASE_URL = 'http://192.168.1.100:5000/'; // Replace with your IP

const BASE_URL = __DEV__ 
  ? DEV_BASE_URL 
  : PROD_BASE_URL;
```

#### **2.3 Ensure Backend accepts connections:**

```javascript
// Backend/app.js - Update CORS
const allowedOrigins = [
  "http://localhost:5000",
  "http://localhost:3000",
  "http://192.168.1.100:8081",  // Your frontend
  "http://192.168.1.100:5000",  // Your backend
  "exp://192.168.1.100:8081"    // Expo
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
```

#### **2.4 Start backend accepting all interfaces:**

```javascript
// Backend/server.js - Change to listen on 0.0.0.0
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Server running on http://0.0.0.0:${port}`);
  console.log(`✅ Accessible from local network`);
});
```

---

### **Solution 3: For Production Deployment**

#### **3.1 Backend URL from Railway:**

```
Backend URL: https://beside-app-production-abcd1234.up.railway.app
```

#### **3.2 Update Frontend config.js:**

```javascript
const PROD_BASE_URL = 'https://beside-app-production-abcd1234.up.railway.app/';

const BASE_URL = __DEV__ 
  ? DEV_BASE_URL 
  : PROD_BASE_URL;
```

#### **3.3 Ensure HTTPS works:**

```javascript
// Backend should have proper SSL certificates
// Railway provides this automatically

// But if you get SSL errors, disable cert verification temporarily:
const httpsAgent = new https.Agent({
  rejectUnauthorized: false // ⚠️ ONLY for testing!
});

const response = await fetch(url, {
  method: 'POST',
  agent: httpsAgent,
  body: JSON.stringify(data),
});
```

---

## PART 5: COMPLETE DEPLOYMENT WORKFLOW

### **For Production Deployment:**

```
STEP 1: Backend
├─ Push code to GitHub
├─ Setup Railway project
├─ Add environment variables
└─ Railway auto-deploys and gives URL

STEP 2: Frontend Configuration
├─ Update config.js with Railway URL
├─ Commit changes
└─ Push to GitHub

STEP 3: Frontend Build
├─ Run: eas build --platform android --profile production
├─ Wait for build to complete
└─ Download APK/AAB

STEP 4: Testing
├─ Install APK on test device
├─ Test all features (login, request, photo upload)
└─ Verify network connectivity

STEP 5: App Store Submission
├─ For Android: Submit to Google Play Store
├─ For iOS: Submit to Apple App Store
└─ Wait for approval
```

---

## PART 6: TROUBLESHOOTING NETWORK ERRORS

### **Error: "Network request failed"**

```javascript
// Solution: Add error logging to see actual error
fetch(url, options)
  .then(res => res.json())
  .then(data => console.log('Success:', data))
  .catch(error => {
    console.error('Detailed Error:', error.message);
    console.error('Full Error:', JSON.stringify(error));
  });

// This will show:
// - "Network request failed" → Server not running
// - "ERR_NAME_NOT_RESOLVED" → Domain not found
// - "ERR_CONNECTION_REFUSED" → Port not open
// - "CORS policy" → Backend CORS settings wrong
// - "SSL error" → Certificate issue
```

### **Error: "CORS policy violation"**

```javascript
// Backend/app.js - Debug CORS
app.use((req, res, next) => {
  console.log('Request from origin:', req.headers.origin);
  console.log('Request URL:', req.originalUrl);
  next();
});

// This shows what origin is being rejected
```

### **Error: "Connection timeout"**

```javascript
// Increase timeout in config
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,  // 30 seconds instead of 10
  headers: {
    'Content-Type': 'application/json',
  }
});
```

---

## PART 7: QUICK REFERENCE - FILE LOCATIONS TO UPDATE

| File | Changes Needed |
|------|-----------------|
| **Frontend/config.js** | Update `BASE_URL` to backend URL |
| **Backend/.env** | Set `MONGO_URI`, `PORT`, secrets |
| **Backend/app.js** | Update `CORS` allowed origins |
| **Backend/server.js** | Optional: Change bind address to `0.0.0.0` |
| **Frontend/app/home.jsx** | Use `BASE_URL` from config in all fetch calls |
| **Frontend/eas.json** | Configure for production builds |

---

## PART 8: FINAL CHECKLIST BEFORE DEPLOYMENT

### **Backend Checklist:**
- ✅ `.env` file has all required variables
- ✅ CORS is configured for frontend origin
- ✅ Server listens on `0.0.0.0` or proper interface
- ✅ MongoDB connection string is correct
- ✅ All API endpoints tested with Postman
- ✅ Error handling is in place
- ✅ Deployed to Railway with proper URL

### **Frontend Checklist:**
- ✅ `config.js` has correct backend URL
- ✅ All API calls use `BASE_URL` from config
- ✅ No hardcoded `localhost` URLs
- ✅ Error handling for network failures
- ✅ Loading states during API calls
- ✅ Network connectivity verification
- ✅ Proper SSL certificate handling

### **Network Checklist:**
- ✅ Backend URL is accessible (test with curl/Postman)
- ✅ CORS allows frontend origin
- ✅ Firewall allows traffic on backend port
- ✅ SSL certificates are valid (for HTTPS)
- ✅ Frontend can reach backend from test device

---

## NEXT STEPS

1. **Update Frontend config.js** with your Railway URL
2. **Test API calls** with Postman (use Railway URL)
3. **Deploy Frontend** to Expo/EAS
4. **Test on Physical Device** with production build
5. **Monitor Logs** for any network errors

---

## EXAMPLE: Complete Working Setup

### **After Deployment:**

```
BACKEND:
├─ URL: https://beside-app-prod-xyz.up.railway.app
├─ MongoDB: Connected to Atlas
├─ CORS: Allows https://beside-app.com
└─ Status: ✅ Running

FRONTEND:
├─ config.js: BASE_URL = 'https://beside-app-prod-xyz.up.railway.app/'
├─ App: Built with Expo
├─ Platform: Android (Google Play) & iOS (App Store)
└─ Status: ✅ Working

USER FLOW:
1. User downloads app from Store
2. Login → calls https://backend-url/api/v1/auth/login
3. Upload photo → calls https://backend-url/api/v1/trip/upload-photo
4. Request trip → calls https://backend-url/api/v1/trip/create-request
5. Everything works! 🎉
```

---

**End of Deployment Guide**
