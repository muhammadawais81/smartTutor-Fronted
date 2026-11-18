# Agora Error 110 - Troubleshooting Guide

## What Changed
✅ **Fixed**: Student Dashboard now has a prominent blue "Join Live Class" button at the top
✅ **Added**: Better error handling and validation for Agora initialization
✅ **Added**: Detailed console logging to help diagnose issues

## Error 110 Explanation
**Agora Error Code 110** means: **Invalid App ID** or **App ID not initialized properly**

## Root Cause Analysis

Your current App ID: `cc8261964f9c4f65b67c0d4d0b6fdba8`

### Common Causes:

1. **Backend/Frontend App ID Mismatch** ⚠️ MOST COMMON
   - Your frontend has App ID: `cc8261964f9c4f65b67c0d4d0b6fdba8`
   - Your backend might be using a DIFFERENT App ID
   - When backend generates tokens with different App ID, they won't work with your frontend

2. **Wrong Agora Project**
   - The App ID belongs to a different Agora account/project
   - Token generator is configured for a different project

3. **App ID from Wrong Region**
   - Using an App ID from incorrect Agora region

## How to Fix

### Step 1: Verify Backend Configuration

Check your backend's Agora configuration:

**Backend should have:**
```python
# In your backend environment or config
AGORA_APP_ID = "cc8261964f9c4f65b67c0d4d0b6fdba8"
AGORA_APP_CERTIFICATE = "your_app_certificate_here"
```

**❗ CRITICAL**: The `AGORA_APP_ID` in backend MUST match the `appId` in `config/agoraConfig.ts`

### Step 2: Test Token Generation

Add this to your backend to verify it's using the correct App ID:

```python
# When generating token, log the App ID
print(f"Generating token with App ID: {AGORA_APP_ID}")
print(f"Token details - Channel: {channel_name}, UID: {uid}")
```

### Step 3: Verify in Agora Console

1. Go to https://console.agora.io/
2. Navigate to your project
3. Verify the App ID matches: `cc8261964f9c4f65b67c0d4d0b6fdba8`
4. Check if App Certificate is enabled (it should be for token-based authentication)

### Step 4: Check Console Logs

When you start a video call, you should see:

**Teacher Side:**
```
[Agora] Initializing with App ID: cc8261964...
[Agora] Engine initialized successfully
[Agora] Joining channel: <channel_name> UID: <uid>
[Agora] joinChannel result: 0
Teacher joined channel successfully
```

**If you see Error 110**, check:
- Is the App ID printed correctly?
- Does the backend log show the same App ID?

### Step 5: Regenerate Credentials (If Needed)

If the App IDs don't match:

**Option A**: Update frontend to match backend
1. Open `config/agoraConfig.ts`
2. Replace App ID with the one from backend

**Option B**: Update backend to match frontend
1. Copy App ID from `config/agoraConfig.ts`: `cc8261964f9c4f65b67c0d4d0b6fdba8`
2. Update backend environment variable
3. Get the matching App Certificate from Agora Console
4. Restart backend server

## Quick Test

Run this command to check your configuration:

```javascript
// Add to TeacherVideoCallRoomScreen.tsx temporarily in setupAgoraEngine
import diagnoseAgoraSetup from '../../config/agoraDiagnostics';

// In setupAgoraEngine, before engine.initialize:
diagnoseAgoraSetup();
```

## Expected Behavior After Fix

### Teacher Flow:
1. Click "Start Class" → Select students → Click "Start Class"
2. Should see: "Class Started" message
3. Navigate to video room
4. Camera preview appears immediately
5. No Error 110 in console

### Student Flow:
1. See prominent blue "Join Live Class" button on dashboard
2. Click button → See active class
3. Click "Join Class"
4. Navigate to video room
5. See teacher's video
6. No errors

## Still Not Working?

### Additional Checks:

1. **Network/Firewall**
   - Agora requires UDP ports 1080, 4000-4030
   - Check if corporate firewall blocks Agora servers

2. **Token Expiry**
   - Tokens expire after a set time
   - Backend should generate fresh tokens for each call

3. **Region Issues**
   - Ensure using correct Agora region
   - Some regions have different App ID formats

4. **App ID Format**
   - Must be exactly 32 characters
   - Only lowercase hex (0-9, a-f)

### Debug Command:

```bash
# Check if your backend is running and accessible
curl -X POST http://YOUR_BACKEND/api/video/initiate \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"student_id": 1, "subject_id": 1, "call_type": "one_to_one"}'

# Look for the response - does it contain a token?
# Does it log the App ID being used?
```

## Contact Support

If none of this works, provide:
1. Console logs from both teacher and student sides
2. Backend logs showing token generation
3. Screenshot of Agora Console project settings
4. Confirm both frontend and backend App IDs

---

**Quick Summary:**
- ✅ Student Dashboard Join Class button is now visible and prominent
- ✅ Better error messages added to help diagnose
- ⚠️  Error 110 = App ID mismatch between frontend/backend
- 🔧 Fix: Ensure `cc8261964f9c4f65b67c0d4d0b6fdba8` is used in BOTH frontend and backend
