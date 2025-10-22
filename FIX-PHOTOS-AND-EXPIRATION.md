# Bug Fixes: Photo Display & False Expiration Notifications

## 🐛 Issues Fixed

### Issue 1: Selfie Photos Not Displaying in Active Trips
**Problem**: Active Match Modal showed default/profile photos instead of the verification selfies uploaded during the trip flow.

### Issue 2: Expiration Notification Shown After Match Created  
**Problem**: "Request Expired" alert appeared after 2 minutes even when a match was successfully created.

---

## ✅ Fix 1: Display Verification Selfies

### Root Cause
When creating TripMatch documents, the backend was using:
- Sender: `tripRequest.user.userImage` (user's profile photo)
- Receiver: `req.user.profilePhoto.url` (user's profile photo)

But the actual selfies were stored in:
- Sender: `tripRequest.photo.url` (uploaded via `/upload-photo/:tripReqId`)
- Receiver: `receiverPhotoData.url` (uploaded during request acceptance)

### Solution
**File**: `Backend/controllers/notificationController.js`

Updated the `respondToTripRequest` function (line ~533) to prioritize selfie photos:

```javascript
// BEFORE (Wrong - used profile photos)
organizer: {
    userImage: tripRequest.user.userImage, // ❌ Profile photo
},
companion: {
    userImage: req.user.profilePhoto?.url || "default.jpg", // ❌ Profile photo
},

// AFTER (Correct - uses selfies with fallback)
organizer: {
    userImage: tripRequest.photo?.url || tripRequest.user.userImage || "default.jpg", // ✅ Selfie first
},
companion: {
    userImage: receiverPhotoData?.url || req.user.profilePhoto?.url || "default.jpg", // ✅ Selfie first
},
```

---

## ✅ Fix 2: Smart Expiration Logic

### Solution Summary
1. ✅ Added `expirationTimeoutRef` to store timeout ID
2. ✅ Check for active matches before showing expiration
3. ✅ Clear timeout when match is created
4. ✅ Cleanup timeout on component unmount

**Result**: Expiration alert only shows when NO ONE accepts the request!

---

## 🧪 Testing

### Test Selfie Photos:
1. User A creates request & uploads selfie
2. User B accepts & uploads selfie  
3. Both check "Active Trips" → Should see each other's selfies ✅

### Test Expiration (No Match):
1. User A creates request
2. Wait 2 minutes without acceptance
3. "Request Expired" alert appears ✅

### Test No Expiration (Match Created):
1. User A creates request
2. User B accepts within 2 minutes
3. NO expiration alert appears ✅
