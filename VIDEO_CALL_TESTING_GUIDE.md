# Video Call System - Final Verification & Testing Guide

Complete testing methodology and verification checklist to ensure all video calling features work correctly.

## Pre-Testing Checklist

Before running any tests, verify:

- [x] Backend is running and video endpoints are active
- [x] Agora App ID is: `5918efb24fd94892b6e2b7a61600242f`
- [x] Database migrations applied
- [x] Teacher and student test accounts exist
- [x] Android emulator/device is connected: `adb devices`
- [x] App is rebuilt with `npx react-native run-android`
- [x] Camera and microphone permissions granted
- [x] Network connectivity verified

---

## Test Suite 1: Core Video Functionality

### Test 1.1: Teacher Initiates One-to-One Call

**Pre-requisites:**
- Teacher account logged in
- At least one approved student in system
- Subject assigned to both teacher and student

**Steps:**
1. Navigate to "Live Video Class" (teaching tab)
2. Select a subject from dropdown
3. Select exactly ONE student from list
4. Verify "Call Type" shows "One-to-One" (only one student selected)
5. Click "Start Class" button
6. Wait for video room to load

**Verification Points:**
- ✓ Teacher video room opens
- ✓ "Channel: {channel_name}" visible
- ✓ Agora engine initializes (no error dialog)
- ✓ Local video preview visible (black with avatar if camera off)
- ✓ Controls visible: Mute, Camera, Switch Camera, End Class
- ✓ "Participants: 1" shown
- ✓ Console shows: `[VIDEO API] Initiate success:`

**Expected Outcome:**
✅ Teacher is now broadcasting in the channel

**If it fails:**
- Check Console: Look for `[VIDEO API]` errors
- Check Backend logs for token generation errors
- Verify camera permission granted
- Try again with "reset-cache"

---

### Test 1.2: Student Receives Call and Joins

**Pre-requisites:**
- Test 1.1 is running (teacher in call)
- Student account logged in on different device/emulator
- Same subject as teacher

**Steps:**
1. Student goes to Dashboard (home tab)
2. Look for "Join Live Class" card
3. Should appear within 5 seconds of teacher starting
4. Verify call_link is displayed
5. Tap "Open Link" button
6. App should navigate to StudentJoinClassScreen
7. Verify active call details shown
8. Click "Join Class" button
9. Wait for video room to load

**Verification Points:**
- ✓ "Join Live Class" card appears (max 5 sec wait)
- ✓ Opens StudentJoinClassScreen with active call info
- ✓ Student video room opens
- ✓ Local video preview visible
- ✓ Teacher's video visible in remote feed
- ✓ Conference layout shows both videos
- ✓ Controls visible: Mute, Camera, Switch Camera, Leave
- ✓ "Participants: 2" shown
- ✓ Console shows: `[VIDEO API] Join success:`

**Expected Outcome:**
✅ Student and teacher can see each other's video

**If it fails:**
- Check StudentDashboard console: `[VIDEO][Student] Active call check`
- If not appearing: Backend call status might be wrong
- If join fails: Backend token generation error
- Verify student is in participants list

---

### Test 1.3: Group Call with Multiple Students

**Pre-requisites:**
- Teacher account logged in
- At least 3 approved students in system
- All with same subject

**Steps:**
1. Navigate to "Live Video Class"
2. Select subject
3. Select 3+ students (checkmarks appear)
4. Verify "Call Type" shows "Group" (multiple selected)
5. Click "Start Class"
6. Teacher video room opens

**Simultaneously (in parallel):**
- Have 2-3 different student accounts login
- Each goes to Dashboard
- Each sees "Join Live Class" card
- Each clicks "Open Link"
- Each clicks "Join Class"

**Verification Points (Teacher View):**
- ✓ Starts as "Participants: 1" (just teacher)
- ✓ Updates to "Participants: 2" as first student joins
- ✓ Updates to "Participants: 3" as second student joins
- ✓ Grid layout shows all participants' videos
- ✓ Each student has unique UID (teacher=1, students=2,3,4...)

**Verification Points (Each Student View):**
- ✓ Can see teacher's video
- ✓ Can see other students' videos
- ✓ Participant count updates as others join

**Expected Outcome:**
✅ All participants can see each other simultaneously

**If it fails:**
- Check all students are in the teacher_video_call_participants table
- Verify call_type="group" in database
- Ensure all students have same subject as teacher

---

### Test 1.4: Mute/Unmute Functionality

**Pre-requisites:**
- Teacher and student in active call (Test 1.2 complete)
- Both can see video

**Steps (Teacher):**
1. Click microphone icon in video room
2. Icon should change (typically have slash through it)
3. Try speaking - no audio transmitted
4. Click again to unmute
5. Audio should resume

**Steps (Student):**
1. Repeat same steps
2. Both should see each other's mute state

**Verification Points:**
- ✓ Mute icon toggles visual state
- ✓ Teacher/student acknowledge mute is active
- ✓ Camera continues to show video
- ✓ Audio cutoff is immediate (no lag)

**Expected Outcome:**
✅ Mute/unmute works in real-time

---

### Test 1.5: Camera Toggle Functionality

**Pre-requisites:**
- Teacher and student in active call
- Both have cameras enabled

**Steps:**
1. Click camera icon (usually eye in circle)
2. Local video should turn off (see black screen with name)
3. Remote user should see black screen
4. Click again to turn camera back on
5. Video should resume

**Verification Points:**
- ✓ Camera toggle works immediately
- ✓ Both local and remote video affected
- ✓ Name/avatar shown when camera off
- ✓ No audio affected

**Expected Outcome:**
✅ Camera can be toggled on/off as needed

---

### Test 1.6: Switch Camera (Front/Back)

**Pre-requisites:**
- Device has front and back cameras
- In active call with camera enabled

**Steps:**
1. Click "camera switch" icon (rotating icon)
2. Screen should briefly flash
3. Camera should switch to back (if was front)
4. Click again to switch back

**Verification Points:**
- ✓ Camera switches within 1-2 seconds
- ✓ No audio interruption
- ✓ Remote user still sees video
- ✓ Both user and remote see switched view

**Expected Outcome:**
✅ Camera switching works smoothly

---

### Test 1.7: Leave Call (Student)

**Pre-requisites:**
- Test 1.2 complete (both in call)

**Steps (Student):**
1. Click "Leave" button
2. Confirmation dialog appears: "Do you want to leave?"
3. Click "Leave" button in dialog
4. Should return to StudentJoinClassScreen
5. Active call should show as "Call ended" or gone

**Verification Points (Student Side):**
- ✓ Confirmation dialog appears
- ✓ Video room closes
- ✓ Returns to StudentJoinClassScreen
- ✓ Can rejoin if call still active
- ✓ Console shows: `[VIDEO API] Leave success:`

**Verification Points (Teacher Side):**
- ✓ Teacher's view still shows call as "Participants: 1"
- ✓ Student's video was removed from grid
- ✓ Teacher can continue in call
- ✓ Teacher's video still visible to other students (if any)

**Expected Outcome:**
✅ Student leaves, teacher continues

---

### Test 1.8: End Call (Teacher)

**Pre-requisites:**
- Teacher in call, possibly with students

**Steps (Teacher):**
1. Click "End Class" button
2. Confirmation: "This will disconnect all students"
3. Click "End Class" in dialog
4. Call ends, back to TeacherVideoClassScreen

**Verification Points (Teacher Side):**
- ✓ Confirmation dialog shown
- ✓ Video room closes
- ✓ Returns to TeacherVideoClassScreen
- ✓ No "Return to Call" button visible
- ✓ Console shows: `[VIDEO API] End success:`

**Verification Points (Student Side - if any in call):**
- ✓ Video feed goes black
- ✓ Might see error or auto-disconnect
- ✓ Or return to previous screen

**Expected Outcome:**
✅ All participants disconnected, call ended

---

## Test Suite 2: Call Persistence & Recovery

### Test 2.1: Minimize Call and Return

**Pre-requisites:**
- Test 1.2 complete (both in call)

**Steps:**
1. Teacher in active video call
2. Click "Back" button or minimize
3. Should return to TeacherVideoClassScreen
4. Look for "Return to Call" button or link
5. Click "Return to Call"
6. Should navigate back to video room
7. Call should still be ongoing

**Verification Points:**
- ✓ "Return to Call" button visible
- ✓ Returns to video room with same channel/token
- ✓ Call is still active
- ✓ Remote user still in call
- ✓ Video feed resumes

**Expected Outcome:**
✅ Can minimize and return to active call

---

### Test 2.2: App Restart During Call

**Pre-requisites:**
- Teacher in active call

**Steps:**
1. Teacher in video room
2. Pull app from recent apps to fully close it
3. Kill it from task manager
4. Reopen app
5. Re-login if needed
6. Check TeacherVideoClassScreen

**Verification Points:**
- ✓ Previous active call data restored from AsyncStorage
- ✓ Shows previous call details
- ✓ Can click "Return to Call" or similar
- ✓ Can continue in same call or end it

**Expected Outcome:**
✅ App persists active call across restarts

---

## Test Suite 3: API Error Handling

### Test 3.1: Network Error During API Call

**Pre-requisites:**
- About to start a call
- Network connectivity

**Steps:**
1. Turn off WiFi/mobile data
2. Try to start a video call
3. Should show error alert
4. Turn network back on
5. Try again

**Verification Points:**
- ✓ Error message shown to user
- ✓ Informative message about network
- ✓ Recoverable by retrying
- ✓ App doesn't crash

**Expected Outcome:**
✅ Graceful network error handling

---

### Test 3.2: Invalid Student ID

**Pre-requisites:**
- Course with no actual students enrolled

**Steps:**
1. Manually modify database to have fake student_id
2. Try to initiate call
3. Should handle gracefully

**Verification Points:**
- ✓ Either prevents action or handles error
- ✓ No app crash
- ✓ User given feedback

**Expected Outcome:**
✅ Validates student before calling

---

### Test 3.3: Agora Token Expiration

**Pre-requisites:**
- Long test duration (>1 hour) or manually expired token

**Steps:**
1. In video room after 1+ hour
2. Should either:
   - Auto-refresh token (if implemented), OR
   - Show error to rejoin

**Verification Points:**
- ✓ No silent failure
- ✓ User notified if action needed
- ✓ Can rejoin with fresh token

**Expected Outcome:**
✅ Handles token expiration gracefully

---

## Test Suite 4: UI/UX Verification

### Test 4.1: Visual States

**Verification Points:**
- ✓ TeacherVideoClassScreen: Clear student selection UI
- ✓ Call type selection prominent
- ✓ Active call card/status visible
- ✓ "Return to Call" buttons visible when call active
- ✓ StudentDashboard: "Join Live Class" card prominent
- ✓ Call link displayed when active
- ✓ Video room: Controls easy to reach
- ✓ Participant count visible
- ✓ Status indicators clear (muted, camera off, etc.)

---

### Test 4.2: Loading States

**Verification Points:**
- ✓ Loading spinner while initiating call
- ✓ Loading spinner while joining call
- ✓ Loading spinner while fetching active calls
- ✓ "Joining..." state on buttons
- ✓ No duplicate submissions
- ✓ Buttons disabled during operation

---

### Test 4.3: Error Messages

**Verification Points:**
- ✓ Error alerts are informative, not technical
- ✓ Suggest action to user (retry, check permissions, etc.)
- ✓ No confusing acronyms
- ✓ No sensitive data in error messages
- ✓ Consistent tone and language

---

## Test Suite 5: Permissions & Device Features

### Test 5.1: Camera Permission

**Steps:**
1. On fresh install, start call
2. App requests camera permission
3. Grant permission
4. Video starts immediately
5. Test again: Deny permission
6. Should show error about camera needed

**Verification Points:**
- ✓ Permission request appears
- ✓ Graceful handling of denial
- ✓ Clear messaging about why needed

---

### Test 5.2: Microphone Permission

**Steps:**
1. Fresh install, start call
2. App requests microphone permission
3. Grant it
4. Audio works (test mute/unmute)
5. Deny and retry

**Verification Points:**
- ✓ Permission request appears
- ✓ Can still see video if only audio denied
- ✓ Clear messaging

---

### Test 5.3: Background Audio

**Steps:**
1. In call, minimize app
2. Keep audio flowing (speaker on)
3. Backgrounded user should still hear both sides

**Verification Points:**
- ✓ Audio continues in background (if supported)
- ✓ Video pauses but audio continues
- ✓ Can return to call

---

## Performance & Quality Tests

### Test 6.1: Call Duration

**Scenario:** Full 30-minute call

**Track:**
- ✓ No crashes
- ✓ Video quality consistent
- ✓ Audio clear
- ✓ Device temperature normal (not overheating)
- ✓ Battery drain within acceptable range (<15% per 30 min)

---

### Test 6.2: Multiple Participants Stress

**Scenario:** 5+ students in group call

**Track:**
- ✓ All videos visible
- ✓ No lag
- ✓ Audio synced
- ✓ No memory leak
- ✓ Smooth grid layout

---

### Test 6.3: Network Switching

**Scenario:** Switch WiFi ↔ Mobile Data during call

**Track:**
- ✓ Call continues (brief pause acceptable)
- ✓ No complete disconnect
- ✓ Auto-reconnect if needed
- ✓ Video resumes quickly

---

## Regression Test Checklist

Run this every build to catch regressions:

- [ ] Teacher can start one-to-one call
- [ ] Teacher can start group call  
- [ ] Student sees active call on dashboard within 5 sec
- [ ] Student can join call
- [ ] Both can see video and hear audio
- [ ] Mute/unmute works
- [ ] Camera toggle works
- [ ] Student can leave
- [ ] Teacher can end
- [ ] No Agora Error 110
- [ ] No crashes in video room
- [ ] No crashes when navigating away
- [ ] "Return to Call" button works
- [ ] Active call persists across navigate
- [ ] No console errors

---

## Sign-Off Criteria

✅ All tests in Test Suite 1 pass
✅ All tests in Test Suite 2 pass
✅ All tests in Test Suite 3 pass
✅ No critical bugs remaining
✅ Performance acceptable
✅ User can complete end-to-end flow
✅ Error messages are clear
✅ No untraceable crashes

---

## Test Execution Report Template

```
Date: ___________
Tester: ___________
Device: ___________
OS Version: ___________
App Version: ___________

Test Suite 1: Core Video
  Test 1.1 One-to-One Call: ☐ PASS ☐ FAIL - Notes: _______
  Test 1.2 Student Joins: ☐ PASS ☐ FAIL - Notes: _______
  Test 1.3 Group Call: ☐ PASS ☐ FAIL - Notes: _______
  Test 1.4 Mute/Unmute: ☐ PASS ☐ FAIL - Notes: _______
  Test 1.5 Camera Toggle: ☐ PASS ☐ FAIL - Notes: _______
  Test 1.6 Switch Camera: ☐ PASS ☐ FAIL - Notes: _______
  Test 1.7 Leave Call: ☐ PASS ☐ FAIL - Notes: _______
  Test 1.8 End Call: ☐ PASS ☐ FAIL - Notes: _______

Test Suite 2: Persistence
  Test 2.1 Minimize & Return: ☐ PASS ☐ FAIL - Notes: _______
  Test 2.2 App Restart: ☐ PASS ☐ FAIL - Notes: _______

Test Suite 3: Error Handling
  Test 3.1 Network Error: ☐ PASS ☐ FAIL - Notes: _______
  Test 3.2 Invalid ID: ☐ PASS ☐ FAIL - Notes: _______
  Test 3.3 Token Expiration: ☐ PASS ☐ FAIL - Notes: _______

Test Suite 4: UI/UX
  Test 4.1 Visual States: ☐ PASS ☐ FAIL - Notes: _______
  Test 4.2 Loading States: ☐ PASS ☐ FAIL - Notes: _______
  Test 4.3 Error Messages: ☐ PASS ☐ FAIL - Notes: _______

Test Suite 5: Permissions
  Test 5.1 Camera Permission: ☐ PASS ☐ FAIL - Notes: _______
  Test 5.2 Microphone Permission: ☐ PASS ☐ FAIL - Notes: _______
  Test 5.3 Background Audio: ☐ PASS ☐ FAIL - Notes: _______

Overall Status: ☐ READY TO RELEASE ☐ ISSUES TO FIX

Critical Issues Found:
  1. _______________________
  2. _______________________

Non-Critical Issues:
  1. _______________________
  2. _______________________

Signature: ___________ Date: ___________
```

---

## Next Steps After Testing

If all tests pass:
1. ✅ Ready for beta/production release
2. ✅ Monitor Agora usage and billing
3. ✅ Set up error tracking (Sentry, Crashlytics)
4. ✅ Create user support documentation
5. ✅ Plan for advanced features (screen share, recording)

If issues found:
1. ✅ Document the issue with reproduction steps
2. ✅ Assign to developer
3. ✅ Retest after fix
4. ✅ Add regression test to checklist

