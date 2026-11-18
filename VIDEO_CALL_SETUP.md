# Video Call Integration - Setup Guide

## Overview
The SmartTutor app now has full video calling capabilities using Agora RTC SDK. Teachers can start one-to-one or group video classes, and students can join live classes with real-time video/audio streaming.

## What Was Implemented

### 1. **Agora RTC SDK Integration**
- Installed `react-native-agora` (v4.5.3)
- Created video call room screens with actual video streaming
- Integrated with existing backend video APIs

### 2. **Teacher Side Features**
- **TeacherVideoClassScreen**: Select students and subject, start class
- **TeacherVideoCallRoomScreen**: Live video streaming with controls
  - View all joined students in grid layout
  - Toggle microphone (mute/unmute)
  - Toggle camera (start/stop video)
  - Switch camera (front/back)
  - End class (disconnects all students)
  - Real-time participant count

### 3. **Student Side Features**
- **StudentJoinClassScreen**: Detect active classes, join calls
- **StudentVideoCallRoomScreen**: Join live video classes
  - See teacher and other students
  - Toggle microphone (mute/unmute)
  - Toggle camera (start/stop video)
  - Switch camera (front/back)
  - Leave class
  - Live indicator

### 4. **Navigation Flow**
```
Teacher Flow:
Dashboard → Start Class → Select Students → Video Room → End Class → Dashboard

Student Flow:
Dashboard → Join Class → Detect Active Class → Video Room → Leave → Dashboard
```

### 5. **Permissions**
Android permissions added to AndroidManifest.xml:
- CAMERA
- RECORD_AUDIO
- MODIFY_AUDIO_SETTINGS
- BLUETOOTH
- BLUETOOTH_CONNECT

## Setup Instructions

### Step 1: Get Agora App ID

1. Go to [Agora Console](https://console.agora.io/)
2. Sign up or log in
3. Create a new project:
   - Click "Project Management"
   - Click "Create"
   - Enter project name (e.g., "SmartTutor")
   - Select "Secured mode: APP ID + Token" (your backend generates tokens)
   - Click "Submit"
4. Copy the **App ID** from the project list

### Step 2: Configure the App

1. Open `config/agoraConfig.ts`
2. Paste your App ID:
```typescript
export const AGORA_CONFIG = {
  appId: 'YOUR_APP_ID_HERE', // Replace with actual App ID
  enableLog: __DEV__,
};
```

### Step 3: Verify Backend Configuration

Ensure your backend has the same Agora App ID and App Certificate configured. The backend is responsible for generating Agora tokens.

**Backend should have:**
- Agora App ID (same as frontend)
- Agora App Certificate (from Agora Console)
- Token generation endpoint working

### Step 4: Build and Run

#### For Android:

```bash
# Link native modules (if not auto-linked)
cd android
./gradlew clean
cd ..

# Run the app
npm run android
# or
yarn android
```

#### For iOS (if not already configured):

```bash
cd ios
pod install
cd ..

# Run the app
npm run ios
# or
yarn ios
```

**Note:** You may need to add iOS permissions to `ios/smarttutor/Info.plist`:
```xml
<key>NSCameraUsageDescription</key>
<string>We need access to your camera for video calls</string>
<key>NSMicrophoneUsageDescription</key>
<string>We need access to your microphone for video calls</string>
```

## How to Test

### Teacher Testing:
1. Log in as a teacher
2. Navigate to Dashboard
3. Click "Start Class" (🎥 icon)
4. Select a subject
5. Choose call type (One-to-One or Group)
6. Select student(s)
7. Click "Start Class"
8. You should enter the video room with your camera active
9. Wait for students to join

### Student Testing:
1. Log in as a student (enrolled with the teacher)
2. Navigate to Dashboard
3. Click "Join Class" in the Live Class card
4. If teacher has started a class, you'll see it
5. Click "Join Class"
6. You should enter the video room and see the teacher

### Testing Both Sides:
- Use two different devices (or emulator + physical device)
- One logged in as teacher, one as student
- Teacher starts class, student joins
- Both should see each other's video
- Test controls (mute, stop video, switch camera)

## Architecture

### File Structure
```
component/
├── teacher/
│   ├── TeacherVideoClassScreen.tsx      # Class management UI
│   └── TeacherVideoCallRoomScreen.tsx   # Live video streaming
├── student/
│   ├── StudentJoinClassScreen.tsx       # Join class UI
│   └── StudentVideoCallRoomScreen.tsx   # Live video streaming
api/
└── video/
    ├── videoApi.ts                       # API client functions
    ├── types.ts                          # TypeScript types
    └── index.ts                          # Exports
config/
└── agoraConfig.ts                        # Agora App ID configuration
```

### API Endpoints Used
- `POST /api/video/initiate` - Teacher starts class
- `POST /api/video/join` - Student joins class
- `GET /api/video/active` - Check for active classes
- `POST /api/video/leave` - Leave a class
- `POST /api/video/end` - Teacher ends class
- `GET /api/video/:id` - Get call details
- `POST /api/video/token` - Generate Agora token (called by backend)

### Data Flow
1. **Start Call**: Teacher → initiateVideoCall() → Backend generates token → Navigate to video room
2. **Join Channel**: Video room → Agora engine.joinChannel(token, channel, uid)
3. **Video Stream**: Agora handles peer-to-peer video/audio streaming
4. **Join Call**: Student → joinVideoCall() → Backend validates → Get token → Navigate to video room
5. **Leave/End**: UI → API call → engine.leaveChannel() → Cleanup

## Troubleshooting

### Video/Audio Not Working
1. **Check Agora App ID**: Make sure it's correctly set in `config/agoraConfig.ts`
2. **Verify Permissions**: 
   - Allow camera/microphone when prompted
   - Check Android settings if denied
3. **Backend Token**: Ensure backend is generating valid tokens
4. **Network**: Agora requires internet connection

### Black Screen in Video View
- Camera permission not granted
- Wrong App ID configured
- Token expired or invalid
- Network connectivity issues

### Cannot Join Channel
- Backend token generation failed
- Channel name mismatch
- App ID mismatch between frontend and backend
- Firewall blocking Agora servers

### "Already has an active call" Error
- Previous call wasn't properly ended
- Clear app data or restart the app
- Teacher needs to end previous call first

## Known Limitations

1. **iOS Configuration**: iOS permissions and setup not yet completed (only Android tested)
2. **Screen Sharing**: Not implemented (can be added)
3. **Chat During Call**: No in-call text chat (separate from video)
4. **Recording**: Call recording not implemented
5. **Network Quality Indicator**: Not showing connection quality
6. **Raise Hand**: No raise hand or student control features

## Next Steps (Optional Enhancements)

1. Add screen sharing capability
2. Implement in-call chat messages
3. Add call recording feature
4. Network quality indicators
5. Virtual backgrounds
6. Whiteboard integration
7. Student hand-raise feature
8. Call analytics and reports
9. Picture-in-picture mode
10. Call history with recordings

## Support

For Agora-specific issues:
- [Agora Documentation](https://docs.agora.io/en/)
- [React Native Agora SDK](https://docs.agora.io/en/video-calling/get-started/get-started-sdk?platform=react-native)

For app-specific issues:
- Check console logs for error messages
- Verify backend API responses
- Test with different network conditions
- Ensure all dependencies are installed correctly

## Important Notes

- **Token Security**: Tokens are generated server-side for security
- **App ID**: Keep this in a secure location in production
- **Rate Limits**: Agora has usage limits per project
- **Billing**: Monitor Agora usage in console (free tier available)
- **Production**: For production, consider using environment variables for App ID

---

**Implementation Complete!** 🎉

The video calling feature is now fully integrated. Configure your Agora App ID and start testing!
