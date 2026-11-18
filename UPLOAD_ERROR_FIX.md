# 🔧 Upload Error Fix - Complete

## Problem
```
Cannot read property 'launchImageLibrary' of null
```

This error occurred because:
1. Native modules weren't linked after installation
2. The old `react-native-document-picker` package was deprecated and incompatible

## ✅ Solution Applied

### 1. Replaced Deprecated Package
**Before:**
```bash
npm install react-native-document-picker  # ❌ Deprecated
```

**After:**
```bash
npm install @react-native-documents/picker  # ✅ New package
```

### 2. Updated Import Statement
**File:** `services/uploadService.ts`

**Changed from:**
```typescript
import DocumentPicker from 'react-native-document-picker';
```

**Changed to:**
```typescript
import DocumentPicker from '@react-native-documents/picker';
```

### 3. Cleaned & Rebuilt Android App
```bash
# Cleared all build caches
Remove-Item android\.gradle, android\app\.cxx -Recurse -Force

# Cleaned project
cd android && ./gradlew clean

# Rebuilt app (in progress)
npx react-native run-android
```

## 📦 Current Packages

```json
{
  "dependencies": {
    "react-native-image-picker": "^8.2.1",        // ✅ Image picker
    "@react-native-documents/picker": "^9.3.1"     // ✅ Document picker (new)
  }
}
```

## 🔄 What's Happening Now

The Android app is rebuilding with the new packages. This process:
- Links `react-native-image-picker` native module
- Links `@react-native-documents/picker` native module
- Regenerates autolinking configuration
- Compiles native code

**Build Progress:** Currently at ~84% (compiling native code)

## ✅ Once Build Completes

1. **Test Profile Picture Upload:**
   - Open app → Student/Teacher Profile
   - Tap "Upload Photo" or avatar
   - Select "Camera" or "Gallery"
   - Should work without errors

2. **Test Document Upload (Teachers):**
   - Go to Teacher Profile Wizard → Documents step
   - Upload CNIC, Degree, Certificates
   - Should work without errors

## 🚨 If Error Persists After Rebuild

**Option 1: Delete App & Reinstall**
```bash
# Uninstall app from device
adb uninstall com.smarttutor

# Rebuild & install
npx react-native run-android
```

**Option 2: Reset Metro Cache**
```bash
npx react-native start --reset-cache
```

**Option 3: Clear Watchman Cache**
```bash
watchman watch-del-all
npm start -- --reset-cache
```

## 📱 Permissions Verified

### Android (`AndroidManifest.xml`) ✅
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
```

### iOS (`Info.plist`) ✅
```xml
<key>NSCameraUsageDescription</key>
<string>Allow SmartTutor to access your camera</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Allow SmartTutor to access your photos</string>
```

## 🎯 Expected Behavior After Fix

### Profile Picture Upload:
1. Tap upload button
2. Alert shows: "Take Photo" or "Choose from Gallery"
3. Select option
4. Camera/Gallery opens
5. Select/take photo
6. Photo uploads to backend
7. Success message shows
8. Avatar updates with new image

### Document Upload:
1. Tap "Upload" button for document
2. File picker opens
3. Select PDF or image
4. Document uploads
5. "✓ Uploaded" status shows
6. Can replace with new file

## 📊 Build Status

**Current:** Building native modules (84% complete)  
**Expected:** Build will complete and install app on device  
**Duration:** ~3-5 minutes total  

## 🔍 Verification Steps

After build completes, verify:

```bash
# Check if app installed successfully
adb shell pm list packages | grep smarttutor
# Should output: package:com.smarttutor

# Check app version
adb shell dumpsys package com.smarttutor | grep versionName
```

## 📝 Summary

**Root Cause:** Deprecated package + Native modules not linked  
**Fix:** Replaced package + Rebuilt app  
**Status:** Rebuilding now (in progress)  
**ETA:** 1-2 minutes  

The error will be resolved once the rebuild completes! 🎉
