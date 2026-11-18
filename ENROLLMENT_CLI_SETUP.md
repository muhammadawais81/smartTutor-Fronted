# Enrollment Feature - CLI Setup & Usage Guide

## Overview
This guide provides instructions for integrating and testing the enrollment feature in your React Native CLI project (not Expo).

## File Structure After Integration

```
smarttutor/
├── api/
│   ├── enrollment/                      (NEW)
│   │   ├── enrollmentApi.ts            (NEW)
│   │   ├── types.ts                    (NEW)
│   │   └── index.ts                    (NEW)
│   └── ...existing files...
├── hooks/                               (NEW)
│   ├── useEnrollment.ts                (NEW)
│   └── ...existing hooks...
├── component/
│   └── teacher/
│       └── TeacherDetailScreen.tsx      (UPDATED)
├── ENROLLMENT_INTEGRATION_GUIDE.md      (NEW)
├── ENROLLMENT_IMPLEMENTATION_SUMMARY.md (NEW)
└── ENROLLMENT_CLI_SETUP.md             (NEW - this file)
```

## Quick Start

### 1. Verify File Creation

Ensure these new files exist in your project:

```bash
# Check API files
ls -la api/enrollment/

# Check hook file
ls -la hooks/

# Check documentation
ls -la ENROLLMENT_*.md
```

### 2. No Additional Package Installation Required

The enrollment feature uses only packages already in your project:
- `react-native` (Modal, FlatList, etc.)
- `@react-native-async-storage/async-storage` (Token management)
- `react-native-safe-area-context` (Safe area handling)

**No npm install needed for this feature!**

### 3. Build and Run

#### For Android
```bash
# Clean build
npx react-native clean-gradle-build

# Run on emulator
npx react-native run-android

# Or run on physical device
npx react-native run-android --variant=release
```

#### For iOS
```bash
# Install pods (if needed)
cd ios && pod install && cd ..

# Run on simulator
npx react-native run-ios

# Or run on physical device
npx react-native run-ios --simulator="iPhone 14"
```

## Testing the Feature

### Prerequisites
1. User must be logged in (student role)
2. Student profile must exist
3. Backend API must be running and accessible

### Test Steps

#### 1. Launch App
```bash
npx react-native start
npx react-native run-android  # in another terminal
```

#### 2. Login as Student
- Use student credentials to login
- Verify JWT token is stored in AsyncStorage

#### 3. Navigate to Student Dashboard
- Verify teacher list loads
- Look for at least one teacher

#### 4. Click Teacher Profile
- Teacher details should load
- Verify existing buttons (Chat, Book Session) work

#### 5. Click "Enroll Now" Button
- Modal should slide up from bottom
- Subject list should load from API
- Verify subjects display with:
  - Subject name
  - Subject description (if available)
  - Monthly fee
  - Active state indicator

#### 6. Select a Subject
- Subject should highlight in green
- Checkmark should appear
- Summary section should update with selected subject

#### 7. Confirm Enrollment
- Click "Confirm Enrollment" button
- Loading spinner should appear
- Success alert should show
- Modal should close automatically

#### 8. Verify Enrollment Created
- Check backend database for new enrollment
- Enrollment status should be "pending"
- Verify enrollment record includes:
  - student_id
  - teacher_subject_id
  - status: "pending"

### Error Testing

#### Test 1: No Login
1. Close app and clear AsyncStorage: `npx react-native clean-gradle-build`
2. Click "Enroll Now" without logging in
3. Should show: "Please login to enroll in courses"

#### Test 2: No Subject Selected
1. Open enrollment modal
2. Try confirming without selecting subject
3. Button should be disabled until subject selected

#### Test 3: Network Error
1. Stop backend API
2. Click "Enroll Now"
3. Should show appropriate error message

#### Test 4: Duplicate Enrollment
1. Enroll in same subject twice
2. Backend should return error
3. Error message should display in modal

## Debugging

### Enable Debug Logging

The code includes console.log statements. Enable verbose logging in React Native:

```bash
# Show all logs
npx react-native start --reset-cache

# Or use logcat for Android
adb logcat | grep "ENROLLMENT_API"
```

### Check AsyncStorage

Add this to debug user/token:

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

// In a test component
const debugStorage = async () => {
  const user = await AsyncStorage.getItem('user');
  const token = await AsyncStorage.getItem('access_token');
  console.log('User:', JSON.parse(user || '{}'));
  console.log('Token:', token?.substring(0, 20) + '...');
};
```

### Network Requests

Use React Native Network Interceptor or logbox to see API calls:

```javascript
// In api/enrollment/enrollmentApi.ts (temporarily)
console.log('[ENROLLMENT API] Request:', url, enrollmentData);
console.log('[ENROLLMENT API] Response:', data);
```

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Modal doesn't open | User not logged in | Login first |
| Subjects don't load | API endpoint wrong | Check API_BASE_URL in config |
| "Please login" error | No token in AsyncStorage | Clear app data and login again |
| Button disabled | Required fields missing | Select subject before confirming |
| Network error in modal | Backend unreachable | Check backend is running, correct IP in config |
| TypeScript errors | Missing types | Ensure api/enrollment/types.ts exists |

## Development Mode

### Hot Reload
Changes to code will auto-reload on save:

```bash
# Start with watch mode
npx react-native start --reset-cache
```

### Direct Testing of Hook

Create a test file to verify hook works:

```typescript
// test-enrollment.ts
import { useEnrollment } from './hooks/useEnrollment';

// Mock test
async function testEnrollmentHook() {
  const enrollment = useEnrollment();
  
  // Test fetchTeacherSubjects
  await enrollment.fetchTeacherSubjects(1);
  console.log('Subjects:', enrollment.subjects);
  
  // Test enrollInSubject
  try {
    const result = await enrollment.enrollInSubject({
      teacher_id: 1,
      subject_id: 1,
    });
    console.log('Enrollment created:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}
```

## API Configuration

### Update API Base URL (if needed)

Edit `api/config.ts`:

```typescript
// For Android emulator
export const API_BASE_URL = 'http://10.0.2.2:8080';

// For iOS simulator
export const API_BASE_URL = 'http://localhost:8080';

// For physical device
export const API_BASE_URL = 'http://YOUR_COMPUTER_IP:8080';

// For development machine
export const API_BASE_URL = 'http://192.168.x.x:8080';
```

## Release Build Testing

### Android Release Build

```bash
# Create release build
cd android && ./gradlew assembleRelease && cd ..

# Install on device
adb install -r android/app/build/outputs/apk/release/app-release.apk

# Or build and run
npx react-native run-android --variant=release
```

### iOS Release Build

```bash
# Build for device
npx react-native run-ios --configuration Release

# Or build archive
xcodebuild -workspace ios/smarttutor.xcworkspace \
  -scheme smarttutor \
  -configuration Release
```

## Performance Optimization

### For Large Subject Lists

The modal uses FlatList which optimizes rendering of large lists:

```typescript
// Already implemented in EnrollmentModal
<FlatList
  data={subjects}
  scrollEnabled={false}  // Use modal's scroll instead
  renderItem={({ item }) => <SubjectItem {...item} />}
/>
```

### Reduce Modal Re-renders

The component uses React.FC memoization automatically. For custom optimization:

```typescript
const EnrollmentModal = React.memo(({ subjects, ...props }) => {
  // Component only re-renders if props change
  return (...)
});
```

## Deployment Checklist

Before deploying to production:

- [ ] Verify all API endpoints are working
- [ ] Test on Android device
- [ ] Test on iOS device
- [ ] Verify error messages are user-friendly
- [ ] Check loading states work properly
- [ ] Test with slow network (device throttling)
- [ ] Verify TypeScript compiles without errors
- [ ] Test on minimum supported Android/iOS version
- [ ] Verify all strings are localized (if applicable)
- [ ] Check accessibility (screen readers, large text)

## Support & Troubleshooting

### Check Logs

```bash
# Android
adb logcat -s "React"

# iOS
xcrun simctl spawn booted log stream --predicate 'subsystem contains "smarttutor"'
```

### Reset Project

```bash
# Complete reset
npx react-native clean-gradle-build
rm -rf node_modules
npm install
npx react-native start --reset-cache
```

## Next Steps

1. **Test the feature** using the steps above
2. **Verify API responses** match expected format
3. **Review user feedback** from testing
4. **Deploy to beta** environment
5. **Gather metrics** on enrollment usage

## Related Documentation

- [Enrollment Integration Guide](./ENROLLMENT_INTEGRATION_GUIDE.md)
- [Implementation Summary](./ENROLLMENT_IMPLEMENTATION_SUMMARY.md)
- [Backend API Reference](./provide-your-docs.md) (from backend team)
