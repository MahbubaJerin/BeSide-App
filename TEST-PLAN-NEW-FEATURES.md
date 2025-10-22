# 🧪 Test Plan for New Features - BeSide App

**Date:** October 22, 2025  
**Branch:** feature/companion-request-system  
**Backend Status:** ✅ Running on port 5000

---

## 📋 Overview of Implemented Features

### 1. **Logging Reduction** (99% less spam)
- Backend: Rate-limited logging (30-60 second intervals)
- Frontend: Removed verbose polling logs
- **Expected:** Terminal shows minimal logs during operation

### 2. **ReceiverPhotoConsentModal State Management**
- Added useEffect to reset state when modal closes
- Enhanced tracking logs for debugging
- **Expected:** Camera works, photo uploads, modal resets properly

### 3. **Strengthened Trip Cleanup**
- Auto-cancel "active" trips older than 10 minutes
- Delete completed/cancelled trips older than 24 hours
- Show newest trips first
- **Expected:** Only current active trips visible, old trips removed

### 4. **Fixed Stringified Photo Objects**
- Photo URLs now properly extracted from objects
- **Expected:** User photos display correctly in all modals

---

## 🧪 Test Scenarios

### **Test 1: Logging Reduction Verification**

**Objective:** Confirm terminal logs are minimal and not flooding

**Steps:**
1. ✅ Backend is already running
2. Start the frontend: `cd Frontend; npx expo start`
3. Login with two test users on different devices/emulators
4. Let the app run for 2-3 minutes
5. Observe terminal output

**Expected Results:**
- ❌ NO continuous flood of logs every few seconds
- ✅ Only occasional logs (every 30-60 seconds):
  - "🔍 [BACKEND] Getting pending requests" (max once per 30 sec)
  - "🧹 [BACKEND] Cleaning up..." (max once per 60 sec)
- ✅ Frontend console shows minimal polling logs
- ✅ Only shows "🔔 New request received!" when actual new request arrives

**Status:** ⬜ Not Started | ⬜ Pass | ⬜ Fail

---

### **Test 2: Complete Receiver Flow - Photo Capture & Accept**

**Objective:** Test receiver can take photo and accept request successfully

**Prerequisites:**
- User A (Sender) logged in
- User B (Receiver) logged in
- Both users in same area

**Steps:**

1. **User A (Sender):** Create a trip request
   - Go to home screen
   - Fill in trip details (destination, time, etc.)
   - Submit request

2. **User B (Receiver):** Receive notification
   - Wait for notification badge to appear (should be quick)
   - Tap notification to open RequestNotificationModal
   - Verify sender's photo appears (not stringified object)

3. **User B (Receiver):** Accept with photo
   - Tap "ACCEPT" button
   - ReceiverPhotoConsentModal should open
   - Read the consent message

4. **User B (Receiver):** Take photo
   - Tap "📷 Take Photo" button
   - **Watch terminal logs for:**
     ```
     📷 [RECEIVER PHOTO] Take photo button pressed
     🔐 [RECEIVER PHOTO] Permission status: granted
     ✅ [RECEIVER PHOTO] Photo captured: file://...
     ```
   - Camera should open
   - Take a photo
   - Photo preview should appear

5. **User B (Receiver):** Confirm acceptance
   - Tap "✓ Upload & Accept" button
   - **Watch terminal logs for:**
     ```
     📤 [RECEIVER PHOTO] Uploading photo and accepting request
     ```
   - Modal should close
   - Should see success message

6. **User B (Receiver):** Close modal
   - **Watch terminal logs for:**
     ```
     🔄 [RECEIVER PHOTO] Resetting modal state
     ❌ [RECEIVER PHOTO] Modal closed
     ```

**Expected Results:**
- ✅ Camera opens without issues
- ✅ Photo preview displays correctly
- ✅ Upload & Accept button responds immediately
- ✅ Modal closes and state resets
- ✅ Both users see "Active Trip" notification
- ✅ Match is created in database

**Status:** ⬜ Not Started | ⬜ Pass | ⬜ Fail

**Notes:**
_Record any issues or unexpected behavior here_

---

### **Test 3: Current Active Trips Display**

**Objective:** Verify only current active trips show, not old ones

**Prerequisites:**
- Complete Test 2 (match created between User A & B)
- Optionally: Have some old trips in database from previous sessions

**Steps:**

1. **User A & B:** Check active trips immediately after match
   - Both users tap "Active Trip" or navigate to active matches screen
   - **Watch for logs:**
     ```
     🔍 [BACKEND] Getting active matches for user...
     ```

2. **Verify current trip appears:**
   - Trip should show the JUST CREATED match
   - Should display:
     - Companion name
     - Companion photo (not stringified)
     - Destination
     - Meeting point
     - Status: "active" or "in-progress"

3. **Verify sorting:**
   - If multiple active trips exist, newest should be first
   - Sorted by matched time (most recent at top)

4. **Wait 11 minutes** (if you want to test auto-cleanup):
   - Check active trips again
   - Trips older than 10 minutes with status "active" should be cancelled

5. **Check database directly (optional):**
   ```bash
   # In MongoDB or using test script
   # Verify old completed/cancelled trips (24+ hours) are deleted
   ```

**Expected Results:**
- ✅ Current trip appears immediately after match
- ✅ Newest trips show first
- ✅ Old "active" trips (10+ min) auto-cancelled
- ✅ Very old trips (24+ hours, completed/cancelled) deleted from database
- ❌ NO old/stale trips cluttering the list

**Status:** ⬜ Not Started | ⬜ Pass | ⬜ Fail

**Notes:**
_Record trip IDs, timestamps, and cleanup behavior_

---

### **Test 4: Decline/Cancel Functionality**

**Objective:** Test receiver can decline pending requests

**Prerequisites:**
- User A (Sender) creates new trip request
- User B (Receiver) receives notification

**Steps:**

1. **User B (Receiver):** View pending request
   - Open RequestNotificationModal
   - See sender's trip details

2. **User B (Receiver):** Decline request
   - Tap "DECLINE" button
   - Should see confirmation or success message
   - Modal should close

3. **User B (Receiver):** Verify request removed
   - Reopen notifications
   - Declined request should NOT appear in pending list

4. **User A (Sender):** Check status
   - Should see notification that User B declined
   - Request still active for other users (if multi-user search)

**Expected Results:**
- ✅ DECLINE button responds immediately
- ✅ Success message displays
- ✅ Request removed from receiver's pending list
- ✅ Sender notified of decline
- ❌ NO errors or crashes

**Status:** ⬜ Not Started | ⬜ Pass | ⬜ Fail

**Notes:**
_Any issues with decline flow_

---

### **Test 5: Photo Object Display Fix**

**Objective:** Verify user photos display correctly (not as stringified objects)

**Steps:**

1. **Check Pending Requests Modal:**
   - User receives request
   - Opens RequestNotificationModal
   - Verify sender's photo shows as IMAGE, not text like:
     ```
     ❌ BAD: "{ filename: 'photo.jpg', url: 'https://...' }"
     ✅ GOOD: Actual image displays
     ```

2. **Check Active Match Modal:**
   - Open active trip
   - Verify companion photo displays correctly
   - Should show actual profile picture

3. **Check After Photo Upload:**
   - After receiver accepts with photo
   - Sender sees receiver's photo in acceptance modal
   - Should display the uploaded photo

**Expected Results:**
- ✅ All user photos display as images
- ❌ NO stringified object text visible
- ✅ Photos load from Cloudinary URLs

**Status:** ⬜ Not Started | ⬜ Pass | ⬜ Fail

---

### **Test 6: Modal State Reset Between Uses**

**Objective:** Ensure ReceiverPhotoConsentModal resets properly

**Steps:**

1. **User B:** Accept first request with photo
   - Open modal, take photo, accept
   - Modal closes

2. **User A:** Send another request to User B

3. **User B:** Accept second request
   - Open ReceiverPhotoConsentModal again
   - **Verify:**
     - Previous photo is NOT shown
     - Modal is in fresh/clean state
     - "Take Photo" button available
     - No upload in progress

4. **Take new photo and accept**
   - Should work without issues
   - Should not use old photo

**Expected Results:**
- ✅ Modal resets completely between uses
- ✅ No leftover state from previous acceptance
- ✅ useEffect reset logic works properly
- ✅ Logs show "🔄 [RECEIVER PHOTO] Resetting modal state"

**Status:** ⬜ Not Started | ⬜ Pass | ⬜ Fail

---

## 🐛 Known Issues to Watch For

1. **Camera Permission Denied:**
   - If you see "🔐 [RECEIVER PHOTO] Permission status: denied"
   - Grant camera permissions in device settings

2. **Upload Stuck:**
   - If "isUploading" stays true forever
   - Check backend logs for errors
   - Verify Cloudinary configuration

3. **Old Trips Not Cleaning:**
   - If trips older than 10 minutes still show
   - Check database directly
   - Verify `findUserActiveMatches` is being called

4. **Photo Not Displaying:**
   - If photo shows as text
   - Check `getActiveMatches` photo parsing logic
   - Verify Cloudinary URL format

---

## 📊 Test Results Summary

| Test # | Feature | Status | Notes |
|--------|---------|--------|-------|
| 1 | Logging Reduction | ⬜ | |
| 2 | Receiver Photo Flow | ⬜ | |
| 3 | Active Trips Display | ⬜ | |
| 4 | Decline Functionality | ⬜ | |
| 5 | Photo Display Fix | ⬜ | |
| 6 | Modal State Reset | ⬜ | |

**Overall Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete

---

## 🎯 Success Criteria

✅ **All tests pass**  
✅ **No terminal flooding**  
✅ **Camera works reliably**  
✅ **Photos display correctly**  
✅ **Only current trips visible**  
✅ **Old trips auto-removed**  
✅ **Modal resets between uses**  
✅ **Decline button works**

---

## 📝 Notes & Observations

_Use this section to record any additional findings, edge cases, or suggestions_

---

## 🚀 Next Steps After Testing

- [ ] Fix any bugs discovered
- [ ] Optimize performance if needed
- [ ] Update documentation
- [ ] Merge to main branch
- [ ] Deploy to production

---

**Happy Testing! 🎉**
