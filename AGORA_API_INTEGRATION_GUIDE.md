# Agora Video Call API Integration Guide

Complete implementation reference for SmartTutor's video calling system using Agora RTC SDK.

## Table of Contents
1. [Overview](#overview)
2. [API Endpoints](#api-endpoints)
3. [Implementation Flow](#implementation-flow)
4. [Error Handling](#error-handling)
5. [Token Management](#token-management)
6. [Deep Link Handling](#deep-link-handling)
7. [Troubleshooting](#troubleshooting)

---

## Overview

**Agora App ID (Frontend):** `5918efb24fd94892b6e2b7a61600242f`

**Call Flow:**
```
1. Teacher initiates call → Backend generates Agora token
2. System notifies students with deep link
3. Student taps link or polls dashboard → Joins call
4. Backend validates and generates student token
5. Both use Agora RTC to establish peer-to-peer connection
6. Teacher or student can end/leave call
```

**Call States:**
- `initiated` - Call created, waiting for participants
- `ongoing` - At least one participant joined
- `ended` - Call terminated (teacher ended it)
- `cancelled` - Call cancelled before anyone joined

---

## API Endpoints

### 1. Generate Agora Token (Utility)
**Purpose:** Request Agora RTC token for joining a channel
**Caller:** Both teacher and student (called by backend)

```
POST /api/video/token
Headers: Authorization: Bearer {token}
Body: {
  "channel_name": "channel_12_1708150800_a1b2c3d4",
  "uid": 1
}

Response: {
  "token": "007eJxTYPj/xsvD0pHE1sHNx...",
  "channel_name": "channel_12_1708150800_a1b2c3d4",
  "uid": 1,
  "expires_in": 3600
}
```

**Notes:**
- Token expires in 1 hour; request new token if call exceeds 60 minutes
- UID: 1 for teacher, 2+ for students
- Called automatically by video room screens when initializing Agora engine

---

### 2. Initiate Video Call (Teacher Only)
**Purpose:** Teacher starts a one-to-one or group video class

```
POST /api/video/initiate
Headers: Authorization: Bearer {token}
Body (ONE_TO_ONE): {
  "call_type": "one_to_one",
  "student_id": 21,
  "subject_id": 4
}

Body (GROUP): {
  "call_type": "group",
  "student_id": 21,
  "student_ids": [21, 22, 23],
  "subject_id": 4
}

Response: {
  "id": 15,
  "channel_name": "channel_12_1708150800_a1b2c3d4",
  "call_type": "one_to_one",
  "status": "initiated",
  "call_link": "smarttutor://video?channel=channel_12_1708150800_a1b2c3d4&call_id=15&role=student",
  "token": "007eJxTYPj/xsvD0pHE1sHNx...",
  "uid": 1,
  "message": "Video call initiated..."
}
```

**Frontend Implementation (TeacherVideoClassScreen.tsx):**
```typescript
const handleStartCall = async () => {
  const payload = callType === 'one_to_one'
    ? { call_type: 'one_to_one', student_id: selected[0], subject_id }
    : { call_type: 'group', student_id: selected[0], student_ids: selected, subject_id };

  const response = await initiateVideoCall(payload);
  
  // Response contains token + channel_name + uid
  // Navigate to video room
  if (onNavigateToRoom) {
    onNavigateToRoom({
      callId: response.id,
      token: response.token,
      channelName: response.channel_name,
      uid: response.uid,
    });
  }
};
```

**Important Notes:**
- For ONE_TO_ONE: Must provide `student_id` (single student)
- For GROUP: Must provide `student_ids` array (multiple students) AND first student via `student_id`
- Teacher automatically gets UID=1
- Only one active call per teacher; must end previous call first
- Students saved as "pending" until they actually join

---

### 3. Get Active Call (Student Only)
**Purpose:** Student polls to check for incoming calls

```
GET /api/video/active
Headers: Authorization: Bearer {token}

Response (Call Available): {
  "id": 15,
  "channel_name": "channel_12_1708150800_a1b2c3d4",
  "teacher_name": "Dr. Ahmad Hassan",
  "teacher_id": 12,
  "call_type": "one_to_one",
  "call_link": "smarttutor://video?channel=channel_12_1708150800_a1b2c3d4&call_id=15&role=student",
  "status": "initiated"
}

Response (No Active Call): null
```

**Frontend Implementation (StudentDashboard.jsx & StudentJoinClassScreen.tsx):**
```typescript
useEffect(() => {
  const loadActiveClass = async () => {
    try {
      const call = await getActiveVideoCall();
      if (mounted) {
        setActiveClass(call || null);
      }
    } catch (error) {
      if (mounted) {
        setActiveClass(null);
      }
    }
  };

  loadActiveClass();
  const interval = setInterval(loadActiveClass, 5000); // Poll every 5 seconds

  return () => {
    clearInterval(interval);
  };
}, []);
```

**Polling Strategy:**
- Poll every 5-10 seconds while app is active
- Stop polling when app goes to background
- Resume when app returns to foreground
- Show visual indicator when call is active

---

### 4. Join Video Call (Student Only)
**Purpose:** Student joins a call they received

```
POST /api/video/join
Headers: Authorization: Bearer {token}
Body: {
  "video_call_id": 15
}

Response: {
  "token": "007eJxTYPj/xsvD0pHE1sHNx...",
  "channel_name": "channel_12_1708150800_a1b2c3d4",
  "uid": 2,
  "teacher_id": 12,
  "status": "ongoing",
  "message": "Joined video call successfully"
}
```

**Frontend Implementation (StudentJoinClassScreen.tsx):**
```typescript
const handleJoin = async () => {
  if (!activeCall?.id) {
    Alert.alert('No Active Class', 'Teacher has not started a class yet.');
    return;
  }

  try {
    setJoining(true);
    const response = await joinVideoCall({ video_call_id: activeCall.id });
    
    // Response contains token + channel_name + uid
    // Navigate to video room
    if (onNavigateToRoom) {
      onNavigateToRoom({
        callId: activeCall.id,
        token: response.token,
        channelName: response.channel_name,
        uid: response.uid,
      });
    }
  } catch (error) {
    Alert.alert('Unable to Join', error?.message);
  } finally {
    setJoining(false);
  }
};
```

**Important Notes:**
- Call status changes from "initiated" → "ongoing" on first student join
- Students can accept calls they weren't explicitly invited to
- UID auto-assigned by backend (2 for first, 3 for second, etc.)
- Returns Agora token with student's UID

---

### 5. Get Call Details
**Purpose:** Get full call information including all active participants

```
GET /api/video/{call_id}
Headers: Authorization: Bearer {token}

Response: {
  "id": 15,
  "teacher_id": 12,
  "subject_id": 4,
  "call_type": "one_to_one",
  "channel_name": "channel_12_1708150800_a1b2c3d4",
  "status": "ongoing",
  "call_link": "smarttutor://video?channel=...",
  "started_at": "2026-02-17T14:30:00.123Z",
  "ended_at": null,
  "participants": [
    {
      "id": 1,
      "user_id": 5,
      "student_id": null,
      "uid": 1,
      "joined_at": "2026-02-17T14:30:05.000Z",
      "left_at": null,
      "is_active": true
    },
    {
      "id": 2,
      "user_id": 8,
      "student_id": 21,
      "uid": 2,
      "joined_at": "2026-02-17T14:30:15.000Z",
      "left_at": null,
      "is_active": true
    }
  ]
}
```

**Usage:**
- Call after joining to get participant list
- Use to display "2 people in this call" UI
- Show participant avatars and names
- Track who is active in the call

---

### 6. Leave Video Call (Student Only)
**Purpose:** Student leaves a call (teacher continues)

```
POST /api/video/{call_id}/leave
Headers: Authorization: Bearer {token}

Response: {
  "message": "Left video call successfully",
  "video_call_id": 15
}
```

**Frontend Implementation (StudentVideoCallRoomScreen.tsx):**
```typescript
const handleLeave = async () => {
  Alert.alert('Leave Class', 'Do you want to leave this video class?', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Leave',
      style: 'destructive',
      onPress: async () => {
        try {
          await leaveVideoCall(callId);
          setJoinedCall(null);
          engine.leaveChannel();
          onBack?.();
        } catch (error) {
          Alert.alert('Error', error?.message);
        }
      },
    },
  ]);
};
```

**Important Notes:**
- Only marks student as "left" - teacher can continue
- Call status remains "ongoing"
- Sets `is_active` to false for the student
- Records `left_at` timestamp

---

### 7. End Video Call (Teacher Only)
**Purpose:** Teacher ends call for all participants

```
POST /api/video/{call_id}/end
Headers: Authorization: Bearer {token}

Response: {
  "message": "Video call ended successfully",
  "video_call_id": 15,
  "status": "ended"
}
```

**Frontend Implementation (TeacherVideoCallRoomScreen.tsx):**
```typescript
const handleEndCall = async () => {
  Alert.alert('End Class', 'This will disconnect all students.', [
    { text: 'Cancel' },
    {
      text: 'End Class',
      style: 'destructive',
      onPress: async () => {
        try {
          setIsEnding(true);
          await endVideoCall(callId);
          engine.leaveChannel();
          onBack?.();
        } catch (error) {
          Alert.alert('Error', error?.message);
        }
      },
    },
  ]);
};
```

**Important Notes:**
- Only teacher can end call
- Ends call for ALL participants
- Call status changes to "ended"
- All participants should disconnect from Agora channel
- Cannot rejoin after ended

---

## Implementation Flow

### Teacher Initiating a Call

```
TeacherVideoClassScreen
  ↓
1. Select students + subject
2. Choose call_type (one_to_one or group)
3. Click "Start Class"
  ↓
4. API: POST /api/video/initiate
   - Send: call_type, student_id(s), subject_id
   - Receive: token, channel_name, uid, call_link
  ↓
5. Navigate to TeacherVideoCallRoomScreen
   - Pass: token, channel_name, uid, callId
  ↓
6. Initialize Agora engine
   - Call: generateAgoraToken(channel_name, uid)
   - Join channel with token
  ↓
7. Teacher in live video call
   - Can mute/unmute, toggle camera, switch camera
   - Can see all students' video
  ↓
8. Click "End Class" → API: POST /api/video/{callId}/end
   - Ends for all participants
   - Navigate back
```

### Student Receiving and Joining a Call

```
StudentDashboard
  ↓
1. Polling every 5 seconds: GET /api/video/active
   - If result: Show "Live Class" card with call_link
   - If null: No active class
  ↓
2. Student taps "Open Link" on dashboard
   OR
   Student navigates to StudentJoinClassScreen
  ↓
3. Click "Join Class"
  ↓
4. API: POST /api/video/join
   - Send: video_call_id
   - Receive: token, channel_name, uid, status=ongoing
  ↓
5. Navigate to StudentVideoCallRoomScreen
   - Pass: token, channel_name, uid, callId
  ↓
6. Initialize Agora engine
   - Call: generateAgoraToken(channel_name, uid)
   - Join channel with token
  ↓
7. Student in live video call
   - See teacher and other students
   - Can mute/unmute, toggle camera, switch camera
  ↓
8. Click "Leave Class" → API: POST /api/video/{callId}/leave
   - Leaves the call (teacher continues)
   - Disconnect from Agora channel
```

### Deep Link Handling (Mobile App Launch via Link)

When student taps the deep link from notification:

```
smarttutor://video?channel=channel_12_1708150800_a1b2c3d4&call_id=15&role=student
  ↓
App.tsx detects deep link
  ↓
Routes to StudentJoinClassScreen with call_id=15
  ↓
Auto-populate the activeCall data
  ↓
Show "Join now?" button
  ↓
On join: POST /api/video/join with video_call_id=15
```

---

## Error Handling

### Common Errors and Solutions

**Error 1: "401 Unauthorized"**
- Cause: Invalid or missing JWT token
- Solution: Check AsyncStorage access_token, retry login

**Error 2: "403 Forbidden - User not allowed"**
- Cause: Student trying to initiate call (only teacher can)
- Solution: Verify user role before showing "Start Class" button

**Error 3: "400 Bad Request - Teacher already has active call"**
- Cause: Teacher tried to start second call without ending first
- Solution: Show previous call in UI, ask to end it first

**Error 4: "400 Bad Request - Missing student_id or student_ids"**
- Cause: No students selected
- Solution: Validate student selection before API call

**Error 5: "Agora Error 110 - Invalid AppID"**
- Cause: Frontend App ID doesn't match backend
- Frontend: `5918efb24fd94892b6e2b7a61600242f`
- Backend: Must also use `5918efb24fd94892b6e2b7a61600242f`
- Solution: Clear app cache, rebuild, verify config/agoraConfig.ts

**Error 6: "Cannot join channel" or black screen**
- Cause: Token expired, network issue, or permission denied
- Solution:
  1. Check camera/microphone permissions
  2. Request new token if call > 1 hour
  3. Verify network connectivity
  4. Check Agora account balance

**Error 7: "Call not found" when joining**
- Cause: Call was ended or doesn't exist
- Solution: Offer to go back and poll for new calls

---

## Token Management

### Token Lifecycle

```
Token Request
  ↓
Backend generates token (expires in 3600 seconds = 1 hour)
  ↓
Frontend receives token
  ↓
Pass to Agora engine for channel join
  ↓
At ~1050 seconds (approaching expiry): Request new token
  ↓
Agora will automatically use new token
```

### Token Refresh Logic

**Current Implementation:** None (assumes calls < 1 hour)

**For Longer Calls:** Add this to video room screens:

```typescript
useEffect(() => {
  // Refresh token every 50 minutes (3000 seconds)
  const refreshInterval = setInterval(async () => {
    try {
      const newTokenResponse = await generateAgoraToken({
        channel_name: channelName,
        uid: uid,
      });
      // Agora SDK will switch to new token automatically
      console.log('Token refreshed');
    } catch (error) {
      console.log('Token refresh failed:', error);
    }
  }, 3000 * 1000); // 50 minutes

  return () => clearInterval(refreshInterval);
}, [channelName, uid]);
```

---

## Deep Link Handling

### URL Scheme Setup

**Android (AndroidManifest.xml):**
Already configured with:
```xml
<data
  android:scheme="smarttutor"
  android:host="video"
  android:pathPrefix="/" />
```

**iOS (Info.plist):**
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>smarttutor</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>smarttutor</string>
    </array>
  </dict>
</array>
```

### Deep Link Format

```
smarttutor://video?channel={channel_name}&call_id={call_id}&role=student
```

**Query Parameters:**
- `channel` - Agora channel name
- `call_id` - Video call ID from backend
- `role` - Either "student" or "teacher"

### Handling in App

```typescript
// In App.tsx or deep link handler
const handleDeepLink = (url: string) => {
  const parsed = new URL(url);
  const channel = parsed.searchParams.get('channel');
  const callId = parseInt(parsed.searchParams.get('call_id') ?? '0');
  const role = parsed.searchParams.get('role');

  if (role === 'student' && callId) {
    // Navigate to StudentJoinClassScreen
    // with the active call info
    navigateToStudentJoinClass();
  }
};
```

---

## Troubleshooting

### "Agora Error 110: Invalid AppID"

**Checklist:**
1. ✓ Frontend config/agoraConfig.ts has: `5918efb24fd94892b6e2b7a61600242f`
2. ✓ Backend .env has: `AGORA_APP_ID=5918efb24fd94892b6e2b7a61600242f`
3. ✓ Clear device app cache: Settings → Apps → SmartTutor → Storage → Clear Cache
4. ✓ Kill Metro bundler and run: `npx react-native start --reset-cache`
5. ✓ Rebuild app: `npx react-native run-android`

### "Cannot get active call" (null response in polling)

**Solutions:**
1. Verify student is invited to the call
2. Check backend call status is "initiated" or "ongoing"
3. Confirm student's JWT token is valid
4. Try manual refresh: Pull-down to refresh

### Black screen in video

**Checklist:**
1. Grant camera permission: Allow when prompted
2. Check Settings → Permissions → Camera → Allow SmartTutor
3. Check another app (camera, Google Meet) works first
4. Restart phone and try again
5. Try different network (WiFi vs mobile data)

### "Cannot join channel" error in Agora

**Solutions:**
1. Verify token is not expired
2. Check channel name matches exactly
3. Verify UID matches (teacher=1, student=2+)
4. Check Agora account has credits
5. Verify internet connectivity

### Students not seeing the class link

**Checklist:**
1. Ensure polling is running every 5 seconds
2. Verify backend call status is "initiated"
3. Check student is in the call participants list
4. Manually refresh StudentDashboard
5. Check StudentJoinClassScreen directly

---

## Implementation Checklist

- [x] Agora App ID configured: `5918efb24fd94892b6e2b7a61600242f`
- [x] API types match backend specification
- [x] Video API functions implement all 7 endpoints
- [x] TeacherVideoClassScreen: One-to-one and group call selection
- [x] StudentDashboard: Active call polling and link display
- [x] StudentJoinClassScreen: Join call + leave functionality
- [x] TeacherVideoCallRoomScreen: Full Agora RTC integration
- [x] StudentVideoCallRoomScreen: Full Agora RTC integration
- [x] Error handling for all API endpoints
- [x] Deep link handling for mobile launch
- [x] Android permissions configured
- [x] AsyncStorage persistence for active calls
- [ ] Token refresh logic (for calls > 1 hour)
- [ ] Background app state handling
- [ ] Notification system for incoming calls

---

## References

- [Agora Documentation](https://docs.agora.io/)
- [React Native Agora SDK](https://docs.agora.io/en/video-calling/get-started/get-started-sdk?platform=react-native)
- [Backend Video API Reference](./backend/VIDEO_API_REFERENCE.md)

