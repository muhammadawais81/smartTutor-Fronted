# Agora Error Debugging - Enhanced Error Messages

## 🔍 What Information is Displayed in Errors

When an Agora error occurs, the app now shows:

### Error 110: Invalid Agora App ID

**Shown in Alert Dialog:**
```
❌ Invalid Agora App ID Error

Please verify your Agora configuration:

📋 Current Setup:
App ID: [first 16 chars]...
Token: [first 20 chars]...
Channel: [channel_name]
UID: [uid]

✅ To Fix:
1. Check config/agoraConfig.ts
2. Verify App ID matches backend
3. Clear cache: npx react-native start --reset-cache
4. Rebuild: npx react-native run-android
```

### Error 2: Token Error

**Shown in Alert Dialog:**
```
❌ Token Error

Token is invalid or expired

Token: [first 20 chars]...
Channel: [channel_name]

Please try starting the class again.
```

---

## 📟 Console Logs - What You'll See

### When Agora Initializes (Teacher)

```
[Agora] Initializing with App ID: 5918efb2...
[Agora] 📋 Configuration Details:
[Agora]   App ID: 5918efb24fd94...0242f
[Agora]   Token (Teacher): 007eJxTYPj/xsvD0pHE...
[Agora]   Channel: channel_12_1708150800_a1b2c3d4
[Agora]   UID: 1
[Agora]   Call ID: 15
[Agora] ✅ Engine initialized successfully
```

### When Agora Initializes (Student)

```
[Agora] Student initializing with App ID: 5918efb2...
[Agora] 📋 Configuration Details:
[Agora]   App ID: 5918efb24fd94...0242f
[Agora]   Token (Student): 007eJxTYPj/xsvD0pHE...
[Agora]   Channel: channel_12_1708150800_a1b2c3d4
[Agora]   UID: 2
[Agora]   Call ID: 15
[Agora] ✅ Student engine initialized successfully
```

### When API Returns Token (Initiate Call)

```
[VIDEO API] Initiating video call...
[VIDEO API] Endpoint: http://localhost:8000/api/video/initiate
[VIDEO API] Payload: {
  "call_type": "one_to_one",
  "student_id": 21,
  "subject_id": 4
}
[VIDEO API] Headers: {...}
[VIDEO API] Initiate success: {
  "id": 15,
  "channel_name": "channel_12_1708150800_a1b2c3d4",
  ...
}
[VIDEO API] ✅ Token Details:
[VIDEO API]   Token: 007eJxTYPj/xsvD0pHE...
[VIDEO API]   Channel: channel_12_1708150800_a1b2c3d4
[VIDEO API]   UID: 1
[VIDEO API]   Call ID: 15
```

### When API Returns Token (Student Join)

```
[VIDEO API] Student joining video call...
[VIDEO API] Endpoint: http://localhost:8000/api/video/join
[VIDEO API] Payload: {
  "video_call_id": 15
}
[VIDEO API] Headers Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
[VIDEO API] Join success: {
  "token": "007eJxTYPj/xsvD0pHE...",
  "channel_name": "channel_12_1708150800_a1b2c3d4",
  "uid": 2,
  "teacher_id": 12,
  "status": "ongoing",
  "message": "Joined video call successfully"
}
[VIDEO API] ✅ Token Details:
[VIDEO API]   Token: 007eJxTYPj/xsvD0pHE...
[VIDEO API]   Channel: channel_12_1708150800_a1b2c3d4
[VIDEO API]   UID: 2
[VIDEO API]   Teacher ID: 12
[VIDEO API]   Status: ongoing
```

---

## 🔧 How to Use This Information for Debugging

### Step 1: Identify the Problem

Look for error logs:
```
❌ [Agora] Error: 110        → App ID problem
❌ [Agora] Error: 2          → Token problem
❌ [Agora] Error: -7000      → Frequent connection errors
```

### Step 2: Check the Token

In console logs after `[VIDEO API] ✅ Token Details:`, you'll see:
- **Token:** First 30 characters displayed (full token in JSON above)
- **Channel:** The Agora channel name
- **UID:** Unique ID in the channel (1=teacher, 2+=students)

### Step 3: Verify Configuration

The error alert shows:
- **App ID:** Partial ID shown (verify full ID in config/agoraConfig.ts)
- **Token:** Partial token shown (full token in console)
- **Channel:** Exact channel name
- **UID:** Your unique ID in the channel

---

## ✅ What Should Work

### If Everything Works

**Console shows:**
```
✅ [Agora] Engine initialized successfully
✅ Teacher joined channel successfully
✅ Student joined channel successfully
✅ Joined channel successfully
```

**No errors:**
- [Agora] Error: 110 should NOT appear
- [Agora] Error: 2 should NOT appear

**Video appears:**
- Local preview shows
- Remote feed shows after other person joins
- Audio works (test with mute toggle)

---

## ❌ If You Get Error 110

**Error Alert Shows:**
```
❌ Invalid Agora App ID Error
...
App ID: 5918efb2...
Token: 007eJxTYPj/x...
Channel: channel_...
UID: 1
```

**What This Means:**
- Frontend App ID doesn't match backend App ID
- OR Agora servers don't recognize the App ID

**How to Fix:**
1. Check `config/agoraConfig.ts` shows: `5918efb24fd94892b6e2b7a61600242f`
2. Ask backend team to verify same ID is in `.env`
3. Clear cache: `npx react-native start --reset-cache`
4. Rebuild: `npx react-native run-android`

**Verify the fix worked:**
- Console shows: `✅ Engine initialized successfully`
- Error 110 does NOT appear
- Video call works

---

## ❌ If You Get Error 2

**Error Alert Shows:**
```
❌ Token Error

Token is invalid or expired

Token: 007eJxTYPj/x...
Channel: channel_...

Please try starting the class again.
```

**What This Means:**
- Token is invalid (bad format or corrupted)
- Token is expired (older than 1 hour)
- Token doesn't match the channel

**How to Fix:**
1. Start the call again (get new token)
2. If it's an old call (>1 hour), it won't work anyway
3. Check backend token generation is working
4. Verify call_id is correct

**Verify the fix worked:**
- New token obtained
- Call joins successfully
- Video appears within 2-3 seconds

---

## 📊 Token Format Reference

### What a Valid Token Looks Like

```
007eJxTYPj/xsvD0pHE1sHNx1vHI1HfXMPQyMHJydLBydXVwcHB...
```

**Breakdown:**
- Starts with `007e` (indicates version)
- Contains base64-encoded data
- 200-500+ characters long
- Generated by backend `/api/video/token` endpoint

### What Token Preview Shows

If full token is: `007eJxTYPj/xsvD0pHE1sHNx1vHI1HfXMPQyMHJydLBydXVwcHBQZGR...`

Console shows: `007eJxTYPj/xsvD0pHE...` (first 30 chars)
Alert shows: `007eJxTYPj/x...` (first 20 chars)

---

## 🔐 Security Note

**Tokens shown in logs are for debugging only:**
- Token expires after 1 hour
- Each token is unique to a channel + UID combination
- Don't share tokens with untrusted parties
- Don't expose in production logs to end users
- Only show partial token in error messages (as implemented)

---

## 🎯 Complete Error Debugging Checklist

When you get an Agora error, check this:

- [ ] Check console for `[VIDEO API] ✅ Token Details:`
  - [ ] Token: Starts with `007e`?
  - [ ] Channel: Non-empty string?
  - [ ] UID: 1 for teacher, 2+ for student?

- [ ] Check console for `[Agora] ✅ Engine initialized successfully`
  - [ ] If missing, check App ID error above it

- [ ] If Error 110:
  - [ ] Verify App ID in `config/agoraConfig.ts`
  - [ ] Verify backend `.env` has same App ID
  - [ ] Clear cache and rebuild

- [ ] If Error 2:
  - [ ] Token is not empty?
  - [ ] Call started less than 1 hour ago?
  - [ ] Try rejoining to get new token

- [ ] Network connectivity:
  - [ ] WiFi or mobile data enabled?
  - [ ] Can open websites?
  - [ ] Agora servers reachable? (check https://status.agora.io/)

---

## 📞 When Reporting Issues

Include:

1. **The error number:** (110, 2, etc.)
2. **The error message:** (from alert dialog)
3. **Console logs:** (copy everything with `[Agora]` and `[VIDEO API]` tags)
4. **Token details:** (from the error alert)
5. **Device info:** (Android version, device model)
6. **Steps to reproduce:** (how you triggered the error)

---

## 🚀 Testing the Enhanced Logging

**To test Error 110 message:**
1. Change `AGORA_CONFIG.appId` to `"wrongappid"`
2. Try to start a video call
3. Should see detailed error with token info

**To test Error 2 message:**
1. Start a call, wait for token
2. Modify the token string in JS console (if possible)
3. Try to join with invalid token
4. Should see token error with details

---

