# Teacher Enrollment Management - Testing & Troubleshooting Guide

## 🧪 Testing Guide

### Test 1: Navigate to Enrollment Requests (Smoke Test)

**Objective**: Verify basic navigation works

**Steps**:
1. [ ] Launch app
2. [ ] Login as teacher
3. [ ] See Teacher Dashboard
4. [ ] Locate "Enrollments" action card (📋 icon)
5. [ ] Click on it
6. [ ] Verify TeacherEnrollmentRequestsScreen loads
7. [ ] See header with "Enrollment Requests" title
8. [ ] See back button
9. [ ] Click back button
10. [ ] Return to Teacher Dashboard

**Expected**: Navigation works smoothly, no crashes

---

### Test 2: View Pending Enrollments

**Objective**: Verify requests display correctly

**Precondition**: At least one pending enrollment exists in database

**Steps**:
1. [ ] Open Enrollment Requests screen
2. [ ] Wait for data to load (see spinner)
3. [ ] Verify list of requests appears
4. [ ] Check each request card shows:
   - [ ] Student avatar with initials
   - [ ] Student full name
   - [ ] Student grade level (if available)
   - [ ] Student phone (if available)
   - [ ] Request date
   - [ ] Subject name with 📚 icon
   - [ ] Subject description
   - [ ] Monthly fee with green background
   - [ ] Level ID (if applicable)
   - [ ] "PENDING" status badge in orange
   - [ ] "Reject" button (red)
   - [ ] "Approve" button (green)

**Expected**: All information displays correctly, readable fonts, good spacing

---

### Test 3: Empty State Display

**Objective**: Verify empty state when no requests

**Precondition**: No pending enrollments for this teacher

**Steps**:
1. [ ] Open Enrollment Requests screen
2. [ ] Wait for data to load
3. [ ] See empty state message:
   - [ ] 📭 icon displays
   - [ ] "No Pending Requests" heading
   - [ ] "You don't have any enrollment requests at the moment" text

**Expected**: Empty state is friendly and informative

---

### Test 4: Approve Enrollment

**Objective**: Verify approval functionality

**Precondition**: At least one pending enrollment exists

**Steps**:
1. [ ] Open Enrollment Requests screen
2. [ ] Note number of requests in badge (if any)
3. [ ] Click "Approve" button on first request
4. [ ] Verify button shows spinner/loading state
5. [ ] Wait for action to complete
6. [ ] See success alert: "Enrollment approved for [StudentName]"
7. [ ] Click OK on alert
8. [ ] Verify request removed from list
9. [ ] Count decreased in badge (if it was showing)

**Expected**: Approval completes successfully, request disappears from list

---

### Test 5: Reject Enrollment with Confirmation

**Objective**: Verify rejection flow with confirmation

**Precondition**: At least one pending enrollment exists

**Steps**:
1. [ ] Open Enrollment Requests screen
2. [ ] Click "Reject" button on first request
3. [ ] See confirmation dialog:
   - [ ] Title: "Confirm Rejection"
   - [ ] Message includes student name
   - [ ] Two buttons: "Cancel" and "Reject"
4. [ ] Click "Cancel"
5. [ ] Verify dialog closes, request stays in list
6. [ ] Click "Reject" again
7. [ ] Click "Reject" button in dialog
8. [ ] Verify loading spinner on button
9. [ ] See success alert
10. [ ] Verify request removed from list

**Expected**: Rejection works with proper confirmation

---

### Test 6: Pull-to-Refresh

**Objective**: Verify manual refresh functionality

**Steps**:
1. [ ] Open Enrollment Requests screen
2. [ ] Pull down from top of list
3. [ ] See refresh spinner appear
4. [ ] Wait for refresh to complete
5. [ ] Spinner should disappear
6. [ ] List should update with latest data

**Expected**: Refresh works and fetches latest data

---

### Test 7: Network Error Handling

**Objective**: Verify graceful error handling

**Steps**:
1. [ ] Disable network (toggle WiFi/mobile data)
2. [ ] Try to open Enrollment Requests
3. [ ] See error message in alert
4. [ ] Close alert
5. [ ] Enable network again
6. [ ] Pull to refresh
7. [ ] Verify requests load successfully

**Expected**: Errors are handled gracefully with retry capability

---

### Test 8: Authentication Validation

**Objective**: Verify auth protection

**Steps**:
1. [ ] Clear AsyncStorage (simulating logged out state)
   - Manually via code: `await AsyncStorage.clear()`
2. [ ] Navigate to Enrollment Requests
3. [ ] System should handle missing token gracefully
4. [ ] Likely redirects to login

**Expected**: Auth is properly validated

---

### Test 9: Concurrent Actions

**Objective**: Verify UI doesn't break during multiple actions

**Steps**:
1. [ ] Have 3+ pending enrollments
2. [ ] Click approve on first, but while loading:
3. [ ] Try clicking reject on second (should be disabled)
4. [ ] First action completes
5. [ ] Verify only first request removed
6. [ ] Second request still visible, clickable
7. [ ] Reject second request
8. [ ] Verify it removed

**Expected**: Actions are properly sequenced, no UI glitches

---

### Test 10: Device Orientation Changes

**Objective**: Verify responsive design

**Steps**:
1. [ ] Open Enrollment Requests screen
2. [ ] Rotate device to landscape
3. [ ] Verify layout adapts correctly
4. [ ] All text still readable
5. [ ] Buttons still clickable
6. [ ] List scrolls properly
7. [ ] Rotate back to portrait
8. [ ] Verify layout restores correctly

**Expected**: Layout is responsive and readable in all orientations

---

## 🐛 Troubleshooting Guide

### Issue: "No Pending Requests" Always Shows

**Symptoms**:
- Empty state always displayed
- No requests visible even if students enrolled

**Possible Causes**:
1. No students submitted enrollment requests
2. All requests already approved/rejected
3. Backend not returning data correctly
4. Wrong teacher account logged in

**Solutions**:
```
1. Check database for pending enrollments:
   SELECT * FROM enrollments WHERE status = 'pending' AND teacher_id = YOUR_TEACHER_ID;

2. Verify backend endpoint:
   GET /enrollments/pending
   Authorization: Bearer <token>

3. Check API response format matches EnrollmentResponse interface

4. Test with curl:
   curl -X GET http://localhost:8080/enrollments/pending \
     -H "Authorization: Bearer <token>"

5. Verify you're logged in as correct teacher account
```

**Test Endpoint**:
- Use Postman to test `/enrollments/pending` endpoint
- Should return array of enrollment objects
- Check response status and format

---

### Issue: Approve/Reject Buttons Don't Work

**Symptoms**:
- Clicking buttons has no effect
- No loading spinner appears
- No error message shown

**Possible Causes**:
1. Network not connected
2. JWT token expired
3. Component not properly mounted
4. API endpoint not working

**Solutions**:
```
1. Check network connection:
   - Verify WiFi/mobile data is connected
   - Check internet speed

2. Verify JWT token:
   - Check AsyncStorage: console.log(await AsyncStorage.getItem('access_token'))
   - Token should exist and be non-empty

3. Check API endpoint:
   curl -X POST http://localhost:8080/enrollments/{id}/approve \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{}'

4. Check browser network tab:
   - See if request is being made
   - Check response status code
   - Look for error messages
```

**Debug Code**:
```typescript
// Add to component temporarily
const handleApproveDebug = async (enrollmentId: string) => {
  console.log('[DEBUG] Approving:', enrollmentId);
  try {
    const result = await approveEnrollment(enrollmentId);
    console.log('[DEBUG] Success:', result);
  } catch (error) {
    console.log('[DEBUG] Error:', error);
  }
};
```

---

### Issue: "Enrollment already approved/rejected" Error

**Symptoms**:
- Success alert appears but request still in list
- Error: "Enrollment already approved/rejected"

**Possible Causes**:
1. Request was already processed by another user/session
2. Race condition from multiple approvals
3. List not updating correctly

**Solutions**:
```
1. Reload page/screen:
   - Navigate away and back
   - Pull to refresh

2. Check database:
   - Verify enrollment status changed
   - May just be a UI sync issue

3. Restart app:
   - Clear state and refetch
```

---

### Issue: Loading Spinner Never Finishes

**Symptoms**:
- Spinner keeps spinning
- Action seems frozen
- No error or success message

**Possible Causes**:
1. API call hung/timeout
2. Network dropped mid-request
3. Backend not responding

**Solutions**:
```
1. Check network:
   - Verify connection still active
   - Try disabling and re-enabling

2. Check backend:
   - Is API server still running?
   - Check server logs for errors
   - Restart server if needed

3. Timeout handling:
   - Network request may have 30s timeout
   - If it exceeds, connection drops
   - Retry with fresh network

4. Debug:
   - Check React Native console for errors
   - Time the API call from logs
```

---

### Issue: Can't See Enrollment Requests Button

**Symptoms**:
- "Enrollments" action card not visible on dashboard
- No 📋 icon showing

**Possible Causes**:
1. TeacherDashboard not updated
2. Prop not passed correctly
3. Component not exported

**Solutions**:
```
1. Verify TeacherDashboard.jsx has:
   - onNavigateToEnrollmentRequests prop in signature
   - ActionCard with onPress={onNavigateToEnrollmentRequests}

2. Verify App.tsx has:
   - import for TeacherEnrollmentRequestsScreen
   - navigateToTeacherEnrollmentRequests function
   - onNavigateToEnrollmentRequests prop on TeacherDashboard

3. Verify exports:
   - component/teacher/index.ts exports TeacherEnrollmentRequestsScreen

4. Verify screen rendering:
   - currentScreen includes 'teacherEnrollmentRequests'
   - Screen render logic present in JSX
```

---

### Issue: TypeScript Errors

**Symptoms**:
- Build fails with TypeScript errors
- Red squiggly lines in IDE

**Common Errors & Fixes**:

**Error**: `Cannot find module 'TeacherEnrollmentRequestsScreen'`
```typescript
// Fix: Verify import path
import TeacherEnrollmentRequestsScreen from './component/teacher/TeacherEnrollmentRequestsScreen';
```

**Error**: `Type error on currentScreen union`
```typescript
// Fix: Add 'teacherEnrollmentRequests' to enum
const [currentScreen, setCurrentScreen] = useState<'teacherEnrollmentRequests' | ...>('login');
```

**Error**: `Property 'onNavigateToEnrollmentRequests' does not exist`
```typescript
// Fix: Add prop to component interface/function signature
const TeacherDashboard = ({ onNavigateToEnrollmentRequests, ... }) => {
```

---

### Issue: Student Info Not Showing

**Symptoms**:
- Student section shows "Unknown Student"
- Phone number missing
- Grade level shows as undefined

**Possible Causes**:
1. Backend not returning student data
2. Student profile incomplete
3. Data structure mismatch

**Solutions**:
```
1. Check API response format:
   - Verify student object included
   - Check student fields populated
   - Compare with interface definition

2. Check database:
   - Verify student record exists
   - Verify student fields have values
   - Check foreign key relationships

3. Check data binding:
   - Verify destructuring correct
   - Check optional chaining (?.)
   - Print to console to debug
```

---

## 📊 Performance Testing

### Test: Large List Performance

**Steps**:
1. Create 50+ pending enrollments in database
2. Open Enrollment Requests screen
3. Observe:
   - [ ] Initial load time (should be <2s)
   - [ ] Scrolling is smooth (60fps)
   - [ ] No frame drops
   - [ ] Memory usage reasonable
4. Scroll through entire list
5. Reject/approve items
6. Check refresh still fast

**Expected**: Smooth performance even with many items

---

### Test: Memory Leaks

**Steps**:
1. Open Enrollment Requests
2. Close/open 5+ times
3. Monitor memory usage (Android: adb, iOS: Xcode)
4. Should not continuously increase

**Expected**: Memory stable, no leaks

---

## 🔒 Security Testing

### Test: Token Validation

**Steps**:
1. Get valid JWT token
2. Modify token (change one character)
3. Try to approve/reject
4. Should get 401 error

**Expected**: Invalid tokens rejected

---

### Test: Permission Boundary

**Prerequisites**: Have two teachers with different subject offerings

**Steps**:
1. Teacher A has Math enrollments
2. Teacher B has English enrollments
3. Login as Teacher A
4. Should only see Math enrollments
5. Can't approve English enrollments

**Expected**: Proper permission boundary enforcement

---

## 📱 Device-Specific Testing

### Android Testing

**Emulator**:
```bash
# Start emulator
emulator -avd <device_name>

# View logs
adb logcat | grep TeacherEnrollment
```

**Real Device**:
```bash
# Connect device
adb connect <device_ip>:5555

# Push and run
npx react-native run-android --deviceId=<device_id>
```

---

### iOS Testing

**Simulator**:
```bash
npx react-native run-ios --simulator="iPhone 14"
```

**Real Device**:
```bash
npx react-native run-ios --device
```

---

## ✅ Pre-Launch Checklist

Before deploying to production:

**Code Quality**
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] No console.log statements (remove debug code)
- [ ] No commented-out code

**Functionality**
- [ ] Navigation works both ways
- [ ] All buttons functional
- [ ] Loading states show
- [ ] Error messages display
- [ ] Success notifications appear

**Testing**
- [ ] Tested on Android device
- [ ] Tested on iOS device
- [ ] Tested with 0 requests (empty state)
- [ ] Tested with 50+ requests (performance)
- [ ] Tested network failure scenarios

**UI/UX**
- [ ] All text readable (legible fonts)
- [ ] Buttons have good touch targets (44px+)
- [ ] Colors have good contrast
- [ ] Spacing is consistent
- [ ] Response feedback immediate

**Performance**
- [ ] Load time acceptable (<2s)
- [ ] Scrolling smooth (60fps)
- [ ] No memory leaks
- [ ] Minimal network requests

**Security**
- [ ] Token validation works
- [ ] Permission boundary enforced
- [ ] No sensitive data in logs
- [ ] Safe error handling

---

## 🎉 Launch Ready!

Once all tests pass, you're ready to deploy! 🚀
