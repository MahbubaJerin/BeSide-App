# 🚀 QUICK FIX: Network Request Failed Error

## Your Problem
**Login works but "Network request failed" on photo upload and trip request**

---

## Root Cause Analysis

Your frontend is using:
```javascript
BASE_URL = 'http://localhost:5000/'  // ❌ This is the problem!
```

This works for **login** because it might be cached, but fails for **photo upload** because:
1. File upload is a fresh request
2. Multipart/form-data requests are stricter
3. Network connectivity to localhost:5000 is lost mid-request

---

## IMMEDIATE FIX (5 minutes)

### **Step 1: Check Your PC's IP Address**

**Windows:**
```bash
ipconfig
```

Find line like: `IPv4 Address: 192.168.x.x`

**Mac/Linux:**
```bash
ifconfig | grep "inet "
```

---

### **Step 2: Update Frontend/config.js**

```javascript
// OLD ❌
export const BASE_URL = 'http://localhost:5000/';

// NEW ✅
export const BASE_URL = 'http://192.168.1.100:5000/';  // Replace with YOUR IP
```

---

### **Step 3: Update Backend to Listen on All Interfaces**

**File: Backend/server.js**

Find this line:
```javascript
const server = app.listen(port, async () => {
```

Change to:
```javascript
const server = app.listen(port, '0.0.0.0', async () => {
  console.log(`✅ Server accessible at http://0.0.0.0:${port}`);
  console.log(`✅ From this PC: http://192.168.1.100:${port}`);
```

---

### **Step 4: Restart Everything**

```bash
# Terminal 1: Stop and restart Backend
cd Backend
npm start
# Should show: Server accessible at http://192.168.1.100:5000

# Terminal 2: Restart Frontend
cd Frontend
expo start
# Press 'a' for Android or scan QR code
```

---

### **Step 5: Test**

1. Install app on phone
2. Connect phone to same WiFi as PC
3. Try login again
4. Try uploading photo
5. Should work! ✅

---

## If Above Doesn't Work

### **Check Network Connectivity**

```bash
# On your phone, test if backend is reachable
# Open Terminal on PC and run:

# Windows
ipconfig

# Get your IPv4 address, then on phone:
# Open browser and visit: http://192.168.1.100:5000
# You should see "Cannot find / on this server" (means backend is working)
```

---

## For Production Deployment

Once testing works locally, deploy to Railway:

```bash
# 1. Deploy Backend to Railway
# Get URL: https://beside-app-prod-xyz.up.railway.app

# 2. Update config.js
export const BASE_URL = 'https://beside-app-prod-xyz.up.railway.app/';

# 3. Build and deploy Frontend
eas build --platform android --profile production

# 4. Test on real phone - should work everywhere!
```

---

## Quick Checklist

- [ ] Found PC IP address (e.g., 192.168.1.100)
- [ ] Updated config.js with IP
- [ ] Updated server.js to listen on 0.0.0.0
- [ ] Restarted Backend
- [ ] Restarted Frontend
- [ ] Phone on same WiFi as PC
- [ ] Tested login - works? ✅
- [ ] Tested photo upload - works? ✅

---

## Still Not Working?

Check these:

```bash
# 1. Is backend running?
curl http://192.168.1.100:5000

# 2. Is phone on same WiFi?
Phone: Settings → WiFi → Select same network as PC

# 3. Is firewall blocking port 5000?
Windows Defender → Allow through firewall → Node.js

# 4. Is port 5000 actually being used?
netstat -ano | findstr :5000
```

---

**Need help? Check DEPLOYMENT-AND-NETWORK-GUIDE.md for detailed solutions!**
