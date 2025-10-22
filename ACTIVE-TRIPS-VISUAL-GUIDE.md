# Active Trips Feature - Visual Guide

## 🎯 What Users See

### 1. Bottom Navigation - Active Trips Button

```
┌─────────────────────────────────────┐
│  [🔔]  [🚗]  [📍]  [👤]  [🛡️]     │
│         ⬆️                           │
│      Badge: 1                       │
│   (Shows match count)               │
└─────────────────────────────────────┘
```

**Before Match**: No badge visible
**After Match**: Red badge with number appears (e.g., "1", "2")

---

### 2. Active Match Modal - Main View

When user taps the Active Trips button:

```
╔═══════════════════════════════════════════╗
║  🚗  Active Trips              ✕         ║
╠═══════════════════════════════════════════╣
║  📊 Stats:                                ║
║      1 Active Trip      [🔄 Refresh]      ║
╠═══════════════════════════════════════════╣
║                                           ║
║  ┌─────────────────────────────────────┐ ║
║  │ Trip to Shopping Mall                │ ║
║  │ Status: 🟢 ACTIVE     [Organizer]   │ ║
║  ├─────────────────────────────────────┤ ║
║  │                                      │ ║
║  │  ┌────┐                             │ ║
║  │  │ 📷 │  Alice Smith                │ ║
║  │  └────┘  🤝 Your Companion          │ ║
║  │                                      │ ║
║  ├─────────────────────────────────────┤ ║
║  │  📍 Meeting Point                   │ ║
║  │  Starting Point                     │ ║
║  │  Sender's starting location         │ ║
║  │                                      │ ║
║  │           [🧭 Navigate]             │ ║
║  ├─────────────────────────────────────┤ ║
║  │        [Start Trip]                 │ ║
║  └─────────────────────────────────────┘ ║
║                                           ║
║  ℹ️ Trip status updates automatically     ║
║               [Close]                     ║
╚═══════════════════════════════════════════╝
```

---

## 👥 User Perspectives

### For SENDER (Trip Organizer):

```
┌───────────────────────────────────┐
│ You sent a trip request           │
│        ⬇️                          │
│ Someone accepted                  │
│        ⬇️                          │
│ Match created                     │
└───────────────────────────────────┘

You see in Active Trips:
├─ Receiver's photo 📷
├─ Receiver's name
├─ Label: "🤝 Your Companion"
├─ Your role: [Organizer]
└─ Trip destination & meeting point
```

### For RECEIVER (Companion):

```
┌───────────────────────────────────┐
│ You accepted a trip request       │
│        ⬇️                          │
│ Match created                     │
└───────────────────────────────────┘

You see in Active Trips:
├─ Sender's photo 📷
├─ Sender's name
├─ Label: "💼 Trip Organizer"
├─ Your role: [Companion]
└─ Trip destination & meeting point
```

---

## 🔄 Data Flow Diagram

```
┌─────────────────────────────────────────────────┐
│                  BACKEND                        │
│  MongoDB: TripMatch Collection                  │
│                                                 │
│  {                                              │
│    matchId: "MTH123..."                        │
│    organizer: {                                │
│      userId: "user1"                           │
│      userName: "Alice"                         │
│      userImage: "cloudinary.com/photo1.jpg"   │
│    }                                           │
│    companion: {                                │
│      userId: "user2"                           │
│      userName: "Bob"                           │
│      userImage: "cloudinary.com/photo2.jpg"   │
│    }                                           │
│    tripDetails: {...}                          │
│    meetingPoint: {...}                         │
│    status: "active"                            │
│  }                                             │
└──────────────────┬──────────────────────────────┘
                   │
                   │ GET /api/v1/trip/active-matches
                   │ (Polling every 15 seconds)
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│              FRONTEND HOOK                      │
│  useActiveMatches(15000, true)                 │
│                                                 │
│  Fetches matches → Stores in state             │
│  ├─ matches: [...]                             │
│  ├─ loading: false                             │
│  ├─ error: null                                │
│  └─ matchCount: 1                              │
└──────────────────┬──────────────────────────────┘
                   │
                   │ Pass as props
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│         ACTIVE MATCH MODAL                      │
│  Receives:                                      │
│  ├─ matches={activeMatches?.matches || []}     │
│  ├─ currentUserId={user?._id}                  │
│  └─ onRefresh, onUpdateStatus, etc.            │
│                                                 │
│  Displays:                                      │
│  ├─ Companion photo & name                     │
│  ├─ Trip destination                           │
│  ├─ Meeting point                              │
│  ├─ Navigation button                          │
│  └─ Start trip button                          │
└─────────────────────────────────────────────────┘
```

---

## 📸 Photo Display Logic

```javascript
// In ActiveMatchModal.jsx

const otherUser = isOrganizer 
  ? match.companion   // Show companion's info
  : match.organizer;  // Show organizer's info

<Image
  source={{
    uri: otherUser.userImage && otherUser.userImage !== "default.jpg"
      ? otherUser.userImage  // ← Cloudinary URL
      : "https://via.placeholder.com/80?text=No+Photo"
  }}
  style={styles.companionPhoto}
/>
```

**Photo Sources**:
1. ✅ Sender's photo: Uploaded during trip request creation
2. ✅ Receiver's photo: Uploaded during request acceptance
3. ✅ Both stored in Cloudinary
4. ✅ URLs stored in TripMatch document

---

## 🎬 Complete User Journey

### Scenario: Alice (Sender) + Bob (Receiver)

```
┌─────────────────────────────────────────────────────┐
│ STEP 1: Alice Creates Trip Request                 │
├─────────────────────────────────────────────────────┤
│ 1. Clicks "Find Companion"                          │
│ 2. Gives consent                                    │
│ 3. Takes selfie 📸                                  │
│ 4. Sets preferences & destination                   │
│ 5. Request sent to nearby users                     │
└─────────────────────────────────────────────────────┘
                      ⬇️
┌─────────────────────────────────────────────────────┐
│ STEP 2: Bob Receives Notification                  │
├─────────────────────────────────────────────────────┤
│ 1. Sees badge on notification icon                  │
│ 2. Opens notification modal                         │
│ 3. Sees Alice's request with her photo              │
│ 4. Gives consent                                    │
│ 5. Takes selfie 📸                                  │
│ 6. Clicks "Accept"                                  │
└─────────────────────────────────────────────────────┘
                      ⬇️
┌─────────────────────────────────────────────────────┐
│ STEP 3: Match Created in Backend                   │
├─────────────────────────────────────────────────────┤
│ Backend creates TripMatch document:                 │
│ ├─ organizer: Alice (with photo)                   │
│ ├─ companion: Bob (with photo)                     │
│ ├─ tripDetails: destination, route, etc.           │
│ ├─ meetingPoint: auto-set to start location        │
│ └─ status: "active"                                │
└─────────────────────────────────────────────────────┘
                      ⬇️
┌─────────────────────────────────────────────────────┐
│ STEP 4: Both Users See Active Trip                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ALICE'S VIEW:                  BOB'S VIEW:          │
│ ┌──────────────┐              ┌──────────────┐     │
│ │ Active: 1 🚗 │              │ Active: 1 🚗 │     │
│ └──────────────┘              └──────────────┘     │
│                                                     │
│ Opens modal →                  Opens modal →        │
│                                                     │
│ Sees:                          Sees:                │
│ ├─ Bob's photo 📷             ├─ Alice's photo 📷  │
│ ├─ Bob's name                 ├─ Alice's name      │
│ ├─ "Your Companion"           ├─ "Trip Organizer"  │
│ ├─ Destination                ├─ Destination       │
│ ├─ Meeting point              ├─ Meeting point     │
│ └─ [Start Trip]               └─ [Start Trip]      │
│                                                     │
└─────────────────────────────────────────────────────┘
                      ⬇️
┌─────────────────────────────────────────────────────┐
│ STEP 5: Trip Progression                           │
├─────────────────────────────────────────────────────┤
│ Both users click "Start Trip"                       │
│        ⬇️                                            │
│ Status changes to "in-progress"                     │
│        ⬇️                                            │
│ Navigate to meeting point                           │
│        ⬇️                                            │
│ Meet up                                             │
│        ⬇️                                            │
│ Travel to destination together                      │
│        ⬇️                                            │
│ Complete trip                                       │
└─────────────────────────────────────────────────────┘
```

---

## 🔍 Debugging Checklist

### ✅ Check 1: Is Polling Working?

Open browser/app console and look for:
```
🔍 [BACKEND] Getting active matches for user: 68aec993...
📋 [BACKEND] Found active matches: 1
🎯 [MATCH POLLING] Active matches fetched: 1
```

### ✅ Check 2: Are Photos Loading?

Check response data:
```javascript
organizer: {
  userId: "...",
  userName: "Alice",
  userImage: "https://res.cloudinary.com/.../photo.jpg" // ← Should be URL, not stringified
}
```

### ✅ Check 3: Is Badge Showing?

Check in home.jsx:
```javascript
{(activeMatches?.matches?.length || 0) > 0 && (
  <View style={styles.modernBadge}>
    <ThemedText>{activeMatches?.matches?.length || 0}</ThemedText>
  </View>
)}
```

### ✅ Check 4: Is Modal Receiving Data?

In ActiveMatchModal, check:
```javascript
console.log("Matches received:", matches);
console.log("Current user ID:", currentUserId);
```

---

## 🎨 Styling Reference

The modal uses these key styles:

```javascript
companionCard: {
  backgroundColor: "#f8f9fa",
  borderRadius: 12,
  padding: 16,
  marginBottom: 12
}

companionPhoto: {
  width: 80,
  height: 80,
  borderRadius: 40,  // Circular
  marginRight: 16
}

companionName: {
  fontSize: 18,
  fontWeight: "600",
  color: "#1f2937"
}

companionRole: {
  fontSize: 14,
  color: "#6b7280"
}
```

---

## ✨ Summary

**What Changed:**
- ✅ Polling enabled by default (always running)
- ✅ CurrentUserId passed to modal
- ✅ Photos display from both users
- ✅ Role identification (Organizer vs Companion)
- ✅ Full trip details visible

**What Works Now:**
- Badge shows match count automatically
- Modal displays companion photo & info
- Meeting point with navigation
- Trip status tracking
- Start trip functionality
