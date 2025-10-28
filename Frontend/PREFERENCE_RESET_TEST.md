# Preference Reset Implementation Test

## Summary
This implementation adds comprehensive state reset functionality to clear user preferences and route data when requests are declined, cancelled, or expired.

## Changes Made

### 1. Added Helper Functions (home.jsx)
- `resetAllPreferencesAndRoute()`: Completely clears all state including consent, photo, route, markers, and trip data
- `resetRouteAndVisuals()`: Lighter reset that only clears route and visual elements

### 2. Updated Decline Handling (home.jsx)
- When a request is declined, user preferences and route are automatically cleared
- User sees "Request Declined" alert and state is reset on OK

### 3. Enhanced Cancel Search (home.jsx)
- User now gets 3 options when cancelling search:
  - "Start Fresh": Complete reset of all preferences and route
  - "Clear Route Only": Just remove route and visuals, keep consent/photo
  - "Keep Everything": Only stop searching, preserve all data

### 4. Request Cancellation (SentRequestStatusModal.jsx)
- Added callback `onRequestCancelled` to notify parent when request is cancelled
- Home screen automatically clears preferences when user cancels a request

### 5. Request Expiration Handling (home.jsx)
- When request expires (after 2 minutes), preferences are automatically cleared
- User sees "Request Expired" alert and can start fresh

## Test Scenarios

### Test 1: Request Declined
1. User fills consent form
2. User uploads photo
3. User sets preferences (transport, gender, talk, locations)
4. Route appears on map
5. Request is sent and later declined
6. **Expected**: Alert shows "Request Declined", preferences cleared, route removed

### Test 2: User Cancels Search
1. User completes flow and has active search
2. User clicks "Cancel Search"
3. **Expected**: Options dialog appears with 3 choices
4. Selecting "Start Fresh" should clear everything
5. Selecting "Clear Route Only" should preserve consent/photo but remove route
6. Selecting "Keep Everything" should only stop search

### Test 3: Request Expires
1. User completes flow and sends request
2. No one accepts within 2 minutes
3. **Expected**: "Request Expired" alert appears, preferences cleared on OK

### Test 4: Manual Request Cancellation
1. User has active request
2. User opens "View Status" modal
3. User clicks "Cancel Request"
4. **Expected**: Request cancelled, preferences cleared automatically

## State Elements That Are Cleared

### Complete Reset (resetAllPreferencesAndRoute):
- Route coordinates and visual markers
- Consent form data (noTouch, respectful, safety)
- Uploaded photo
- Trip request ID
- Selected user
- Modal states (consent, photo, preferences)
- Navigation routes
- Search radius

### Light Reset (resetRouteAndVisuals):
- Route coordinates only
- Map markers
- Search radius
- Navigation routes

## Files Modified
1. `Frontend/app/home.jsx` - Added reset functions and updated handlers
2. `Frontend/components/SentRequestStatusModal.jsx` - Added cancellation callback

This ensures that users start with a clean slate after any cancellation, decline, or expiration scenario.