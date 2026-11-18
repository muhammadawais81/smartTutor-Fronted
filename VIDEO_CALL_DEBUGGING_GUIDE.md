# Video Call Debugging Guide - Quick Reference

Fastest way to solve video calling issues in SmartTutor.

## 🚨 Most Common Issues

### Issue #1: Agora Error 110 (Invalid App ID)

**Symptoms:**
- App shows "App ID Error" dialog with code 110
- Dialog shows partial ID: "5918efb2..." or "cc826196..."
- Cannot initialize video call

**Quick Fix:**
```bash
# 1. Verify config file has correct App ID
cat f:\smarttutor\config\agoraConfig.ts

# Should show:
# export const AGORA_BACKEND_APP_ID = '5918efb24fd94892b6e2b7a61600242f';

# 2. Clear everything and rebuild
cd f:\smarttutor
npx react-native start --reset-cache &  # Start in background
cd android && .\gradlew clean && cd ..
npx react-native run-android

# 3. If still failing
adb shell pm clear com.smarttutor
```

**Why it happens:** Frontend App ID doesn't match backend
- Frontend should be: `5918efb24fd94892b6e2b7a61600242f`
- Backend should be: `5918efb24fd94892b6e2b7a61600242f`

---

### Issue #2: Student Doesn't See the Class Link

**Symptoms:**
- StudentDashboard shows "No Active Class" even though teacher started
- StudentJoinClassScreen shows nothing
- No "Open Link" button visible

**Quick Fix (In Order):**
1. **Verify backend call exists:**
   ```bash
   # Check if call was created in backend database
   SELECT * FROM teacher_video_calls WHERE status = 'initiated';
   ```

2. **Verify student is in participants:**
   ```bash
   # Check if student_id was saved
   SELECT * FROM teacher_video_call_participants 
   WHERE student_id = {STUDENT_ID};
   ```

3. **Check polling is running:**
   - Open StudentDashboard
   - Watch console for: `[VIDEO][Student] Active call check succeeded`
   - Should appear every 5 seconds
   - If you see `Active call check failed:` → API error

4. **Test API directly:**
   ```bash
   curl -X GET http://localhost:8000/api/video/active \
     -H "Authorization: Bearer YOUR_STUDENT_TOKEN"
   # Should return the call object, not null
   ```

5. **Force refresh:**
   - Close StudentDashboard app completely
   - Reopen it
   - Pull down to refresh
   - Wait 5 seconds for first poll

**Why it happens:**
- Student not in participants list
- CallType not set correctly (missing student_id in backend)
- Polling not enabled
- Network timeout in polling

---

### Issue #3: Cannot Join the Call (Video Room Shows Error)

**Symptoms:**
- Click "Join" but get error alert
- "Cannot join channel" or token error
- Video room opens but is blank/black

**Quick Fix:**
1. **Check network:**
   - WiFi or mobile data enabled?
   - Can open browser? Can ping 8.8.8.8?

2. **Check permissions:**
   - Settings → Apps → SmartTutor → Permissions
   - Camera: Allow
   - Microphone: Allow
   - Phone: Allow

3. **Check token is valid:**
   - Console should show: `[VIDEO API] Join success: {...}`
   - Token should start with: `007eJx...`
   - If missing or error, backend token generation failed

4. **Check Agora account:**
   - Is Agora account active?
   - Does account have credits?
   - Check: https://console.agora.io/

5. **Try again:**
   - Leave and rejoin
   - Or refresh page and rejoin
   - Token might be stale

**Why it happens:**
- Agora servers unreachable (network issue)
- Token expired or invalid
- Agora account issue or no credits
- App ID mismatch

---

### Issue #4: Video is Black/No Video Appears

**Symptoms:**
- Video room opens successfully
- Agora initializes
- But video feed is black on both ends
- Or one-way video (teacher sees student but not vice versa)

**Quick Fix:**
1. **Restart Agora engine:**
   - Leave call and rejoin
   - Usually fixes temporary glitches

2. **Check camera permission step-by-step:**
   ```bash
   # In video room, add this console log to see permission state
   ```

3. **Test camera works:**
   - Open Camera app → should see live preview
   - If camera app works but video call doesn't → Agora issue

4. **Check App ID again:**
   - Console should NOT show: `[Agora] Error:`
   - Should show: "Agora engine initialized successfully"

5. **Check lighting:**
   - Is device in dark room?
   - Try with better lighting
   - Sometimes auto-exposure takes time

6. **Last resort:**
   - Restart phone
   - Reinstall app
   - Clear app cache (Settings → Apps → SmartTutor → Storage → Clear Cache)

**Why it happens:**
- Camera permission denied
- Camera in use by another app
- Network bandwidth too low
- Agora token expired mid-call
- Device running out of resources

---

## 🔍 Diagnostic Steps

### Step 1: Check Console Logs

**In VS Code Terminal (when app is running):**
```
Ctrl+Shift+J → Toggle Dev Tools
Or use: adb logcat | grep "VIDEO\|Agora"
```

**Look for these patterns:**

✅ Good signs:
```
[VIDEO API] Initiating video call...
[VIDEO API] Initiate success: ...
[VIDEO] Agora engine initialized successfully
[VIDEO] Joined channel successfully
```

❌ Bad signs:
```
[VIDEO API] Initiate failed: ...
[Agora] Error: 110
[Agora] Error: -7
Cannot join channel
```

### Step 2: Check Backend Logs

**SSH to backend server:**
```bash
cat /var/log/smarttutor/video.log | tail -100
# Or check backend console
```

**Look for:**
- ✅ Call created with ID
- ✅ Token generated successfully
- ❌ Student not in invite list
- ❌ Agora API error

### Step 3: Check Database

**Query active calls:**
```sql
-- Active calls
SELECT * FROM teacher_video_calls 
WHERE status IN ('initiated', 'ongoing')
LIMIT 5;

-- Participants
SELECT tvcp.*, tvcp.student_id, tvcp.uid
FROM teacher_video_call_participants tvcp
WHERE is_active = true;

-- Recent calls (for testing)
SELECT * FROM teacher_video_calls 
ORDER BY created_at DESC LIMIT 10;
```

### Step 4: Test API Endpoints Manually

**Using curl or Postman:**

```bash
# 1. Get access token first
curl -X POST http://localhost:8000/api/auth/token \
  -d "username=teacher@test.com&password=password"
# Copy the access_token

# 2. Test initiate call
curl -X POST http://localhost:8000/api/video/initiate \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "call_type": "one_to_one",
    "student_id": 21,
    "subject_id": 4
  }'

# 3. As student, check for active call
curl -X GET http://localhost:8000/api/video/active \
  -H "Authorization: Bearer {STUDENT_TOKEN}"

# 4. Student joins
curl -X POST http://localhost:8000/api/video/join \
  -H "Authorization: Bearer {STUDENT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"video_call_id": 15}'
```

---

## 🛠️ Quick Fixes Toolkit

### Fix #1: Clear Everything

```bash
cd f:\smarttutor

# Kill all node/adb processes
taskkill /F /IM node.exe
taskkill /F /IM adb.exe

# Clean build
cd android && .\gradlew clean && cd ..
rm -r node_modules\.cache android\app\build

# Rebuild
npx react-native start --reset-cache &
npx react-native run-android
```

### Fix #2: Restart Agora Engine

In video room screen, add button:
```typescript
const handleRestartAgora = async () => {
  try {
    engine.leaveChannel();
    await new Promise(r => setTimeout(r, 1000));
    engine.initialize({appId: AGORA_CONFIG.appId});
    engine.joinChannel(token, channelName, '', uid);
  } catch (e) {
    console.log('Restart failed:', e);
  }
};
```

### Fix #3: Force Polling Update

On StudentDashboard, add:
```typescript
const handleManualRefresh = async () => {
  const call = await getActiveVideoCall();
  setActiveClass(call);
};

// Add refresh button in UI:
<TouchableOpacity onPress={handleManualRefresh}>
  <Text>🔄 Refresh</Text>
</TouchableOpacity>
```

### Fix #4: Test with Hardcoded Data

Temporarily hardcode a call to test video room:
```typescript
// In StudentJoinClassScreen
const mockCall = {
  id: 999,
  channel_name: 'test_channel_123',
  token: 'YOUR_VALID_TOKEN',
  uid: 2
};

// Navigate to room directly for testing
onNavigateToRoom?.(mockCall);
```

---

## 📊 Data Flow Validation

### Teacher Start Call Flow

```
TeacherVideoClassScreen
  ↓ Select students + subject
  ↓ Click "Start Class"
  ↓ initiateVideoCall({call_type, student_id, subject_id})
  ↓ API: POST /api/video/initiate
  ↓ Backend:
    ✓ Check teacher has profile
    ✓ Generate Agora token + channel name
    ✓ Create teacher_video_calls record
    ✓ Add students to teacher_video_call_participants
  ↓ Response: {id, token, channel_name, uid, call_link}
  ↓ Frontend: Navigate to video room
  ↓ Agora: Initialize engine + join channel
```

**Where it can break:**
1. Backend doesn't return proper response ← Check backend logs
2. Token is invalid/expired ← Check Agora console
3. Channel name is empty ← Check response object
4. Student_id not in database ← Check enrollments

### Student Join Call Flow

```
StudentDashboard
  ↓ Polling: GET /api/video/active every 5 seconds
  ↓ Backend finds active call with this student in participants
  ↓ Response: {id, channel_name, teacher_name, call_link}
  ↓ Frontend: Show "Join Live Class" card
  ↓ User taps: "Open Link" or goes to StudentJoinClassScreen  
  ↓ Display active call info
  ↓ User clicks: "Join Class"
  ↓ joinVideoCall({video_call_id: id})
  ↓ API: POST /api/video/join
  ↓ Backend:
    ✓ Find video call by ID
    ✓ Add student to participants (or mark as joined if already there)
    ✓ Generate Agora token with student's UID
    ✓ Update call status to 'ongoing' (if first join)
  ↓ Response: {token, channel_name, uid, teacher_id, status}
  ↓ Frontend: Navigate to video room
  ↓ Agora: Initialize engine + join channel
```

**Where it can break:**
1. Polling doesn't find call ← Check backend call status
2. Student not in participants ← Check teacher sent student_id
3. Join fails ← Check call status is 'initiated' or 'ongoing'
4. Token invalid ← Check Agora App ID matches backend

---

## 🎯 30-Second Fixes

| Issue | Fix |
|-------|-----|
| "Error 110" | Clear cache: `npx react-native start --reset-cache` |
| No link visible | Student refresh dashboard, wait 5 seconds |
| Cannot join | Check camera permissions → Settings → Permissions |
| Black video | Restart phone, check lighting, try WiFi |
| API fails | Check backend is running, internet connected |
| Token error | Clear AsyncStorage app data, re-login |
| Agora timeout | Check Agora console for account/credits |
| Network error | Switch WiFi ↔ mobile, try again |

---

## 📞 Escalation Path

If none of the above work:

1. **Collect logs:**
   ```bash
   adb logcat > /tmp/logs.txt
   # Run the failing scenario
   # Save logs
   ```

2. **Check all installed packages:**
   ```bash
   npm list react-native-agora
   npm list react-native
   ```

3. **Review recent changes:**
   - Did you change Agora App ID?
   - Did you change API endpoints?
   - Did you change permissions?

4. **Contact support with:**
   - Console logs from above
   - Backend logs
   - Database query results
   - Screenshots of error dialogs

---

## 🧪 Testing Scenarios

### Test Scenario 1: Basic Flow (5 min)
1. Login as teacher
2. Start one-to-one call
3. Logout, login as invited student
4. Join the call from dashboard
5. Both mute/unmute
6. Student leaves
7. Teacher ends call
✓ Expected: All steps work, video visible

### Test Scenario 2: Group Call (10 min)
1. Login as teacher
2. Select 3 students
3. Start group call
4. Have all 3 students join
5. Verify teacher sees all 3 videos
6. One student leaves
7. Teacher ends call
✓ Expected: All students disconnect, video visible

### Test Scenario 3: Link Sharing (5 min)
1. Teacher starts call
2. Copy the call_link from response
3. Send to student via chat/email
4. Student clicks link
5. App opens StudentJoinClassScreen
6. Click Join
✓ Expected: Student joins the call

### Test Scenario 4: Network Switch (5 min)
1. Student in call on WiFi
2. Disable WiFi (enable mobile data)
3. Should stay connected
4. Or reconnect automatically
✓ Expected: Video might flicker but call continues

---

