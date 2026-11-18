# File Upload Integration - Implementation Complete ✅

## What Was Implemented

### 1. Upload Service (`services/uploadService.ts`)
- **Profile Picture Upload**: `uploadProfilePicture()`, `takeProfilePhoto()`
- **CNIC Upload**: `uploadCNIC(side, useCamera)`
- **Degree Upload**: `uploadDegree(degreeName)`
- **Certificate Upload**: `uploadCertificate(certificateName)`
- **Upload Info**: `getUploadInfo()` - get limits and allowed types

### 2. UI Components

#### ProfilePictureUpload (`component/upload/ProfilePictureUpload.tsx`)
- Circular avatar with camera/gallery options
- Shows uploaded image preview
- Loading states during upload
- Works for all user types (student, teacher, parent, admin)

#### TeacherDocumentUpload (`component/upload/TeacherDocumentUpload.tsx`)
- Document list with upload buttons
- CNIC Front & Back (camera or gallery option)
- Degree Certificate (PDF/image picker)
- Other Certificate (optional, PDF/image picker)
- Shows ✓ Uploaded status for each document
- Replace functionality for uploaded docs

### 3. TeacherProfileWizard Integration
**Updated to 6-step wizard:**
1. **Basic Info** - Now uses ProfilePictureUpload component instead of text input
2. **Professional** - Qualifications, experience, bio
3. **Location** - City, area, teaching mode
4. **Documents** ✨ NEW - Upload CNIC, degree, certificates using TeacherDocumentUpload
5. **Subjects** - Add subjects with levels and fees
6. **Availability** - Set weekly time slots

**Form Data Updates:**
- `profile_picture` - Uploaded via ProfilePictureUpload component
- `cnic_front_image` - Uploaded CNIC front image URL
- `cnic_back_image` - Uploaded CNIC back image URL
- `degree_certificate` - Uploaded degree certificate URL
- `other_certificate` - Optional certificates URL
- `cnic` - CNIC number text input (in documents step)

### 4. API Integration
All uploads are sent to backend:
- `POST /api/upload/profile-picture` - Profile picture
- `POST /api/upload/teacher/cnic` - CNIC (with side param)
- `POST /api/upload/teacher/degree` - Degree certificate
- `POST /api/upload/teacher/certificate` - Additional certificate

Files are stored on Supabase Storage and URLs are returned.

---

## Required Dependencies

You need to install these packages:

```bash
npm install react-native-image-picker react-native-document-picker
```

### Android Permissions

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

### iOS Permissions

Add to `ios/smarttutor/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>Allow SmartTutor to access your camera to take photos</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Allow SmartTutor to access your photo library</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>Allow SmartTutor to save photos to your library</string>
```

### Linking (React Native < 0.60)

If you're using React Native version below 0.60, you need to link:

```bash
npx react-native link react-native-image-picker
npx react-native link react-native-document-picker
```

For React Native 0.60+, autolinking will handle this automatically.

---

## API URL Configuration

Update the API URL in `services/uploadService.ts` (line 6):

```typescript
const API_URL = 'http://YOUR_SERVER_IP:8080';  // Change this to your backend IP
```

Current value: `http://192.168.100.6:8080`

---

## Testing Checklist

### Profile Picture (All Users)
- [ ] Upload from gallery
- [ ] Take photo with camera
- [ ] View preview after upload
- [ ] Change existing photo

### Teacher Documents
- [ ] Upload CNIC front (camera)
- [ ] Upload CNIC front (gallery)
- [ ] Upload CNIC back (camera)
- [ ] Upload CNIC back (gallery)
- [ ] Upload degree certificate (PDF)
- [ ] Upload degree certificate (image)
- [ ] Upload optional certificate
- [ ] Replace uploaded documents
- [ ] Submit profile with all documents

### Validation
- [ ] Profile picture required in Step 1
- [ ] CNIC front/back required in Step 4
- [ ] Degree certificate required in Step 4
- [ ] CNIC number required in Step 4
- [ ] Optional certificate can be skipped

---

## Teacher Profile Completion Flow

```
1. Signup (role = "teacher")
   ↓
2. Navigate to Profile Wizard
   ↓
3. Step 1 - Basic Info
   • Upload profile picture (camera/gallery)
   • Enter name, phone, gender, DOB
   ↓
4. Step 2 - Professional
   • Qualification, institute, experience, bio
   ↓
5. Step 3 - Location
   • Select city, teaching mode, session type
   ↓
6. Step 4 - Documents ✨
   • Upload CNIC front/back
   • Upload degree certificate
   • Upload optional certificate
   • Enter CNIC number
   ↓
7. Step 5 - Subjects
   • Add subjects with levels and fees
   ↓
8. Step 6 - Availability
   • Set weekly time slots
   ↓
9. Submit for Approval
   • Profile status = "pending_approval"
   • Admin reviews documents
   ↓
10. Admin Approves/Rejects
    • Teacher gets notification
    • Profile becomes visible to students
```

---

## File Restrictions

### Profile Pictures
- **Allowed types**: JPEG, PNG, GIF, WebP
- **Max size**: 5 MB
- **Recommended**: Square aspect ratio (1:1)

### Teacher Documents
- **Allowed types**: JPEG, PNG, PDF
- **Max size**: 10 MB

---

## Error Handling

Common errors handled:
- Permission denied (camera/gallery)
- User cancelled
- File too large
- Invalid file type
- Authentication required (401)
- Upload failed (server error)

All errors show user-friendly alerts.

---

## Next Steps

1. **Install dependencies**:
   ```bash
   npm install react-native-image-picker react-native-document-picker
   ```

2. **Add Android permissions** to `android/app/src/main/AndroidManifest.xml`:
   ```xml
   <uses-permission android:name="android.permission.CAMERA" />
   <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
   <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
   ```

3. **Add iOS permissions** to `ios/smarttutor/Info.plist`:
   ```xml
   <key>NSCameraUsageDescription</key>
   <string>Allow SmartTutor to access your camera</string>
   <key>NSPhotoLibraryUsageDescription</key>
   <string>Allow SmartTutor to access your photos</string>
   ```

4. **Update API URL** in `services/uploadService.ts`:
   ```typescript
   const API_URL = 'http://YOUR_SERVER_IP:8080';
   ```

5. **Rebuild the app**:
   ```bash
   # For Android
   npx react-native run-android
   
   # For iOS (on Mac only)
   cd ios && pod install && cd ..
   npx react-native run-ios
   ```

6. **Test on physical device** (camera features require real device)

---

## Files Created/Modified

### Created:
- ✅ `services/uploadService.ts`
- ✅ `component/upload/ProfilePictureUpload.tsx`
- ✅ `component/upload/TeacherDocumentUpload.tsx`
- ✅ `component/upload/index.ts`

### Modified:
- ✅ `component/teacher/TeacherProfileWizard.tsx`
  - Added ProfilePictureUpload in Step 1
  - Added Documents step (Step 4)
  - Updated form data structure
  - Renumbered subsequent steps

---

## Support

If you encounter issues:

1. **"Cannot find module" errors**: Run `npm install react-native-image-picker react-native-document-picker`
2. **Camera not working**: Test on physical device, not simulator
3. **Upload fails**: Check API URL and backend server is running
4. **Permission denied**: 
   - Android: Check AndroidManifest.xml permissions
   - iOS: Check Info.plist permissions
5. **File too large**: Compress images before uploading
6. **Linking issues (RN < 0.60)**: Run `npx react-native link react-native-image-picker` and `npx react-native link react-native-document-picker`

---

## Backend API Reference

All endpoints are documented in the Frontend Integration Guide you provided.

Key endpoints:
- `POST /api/upload/profile-picture` - Upload profile picture
- `POST /api/upload/teacher/cnic?side=front|back` - Upload CNIC
- `POST /api/upload/teacher/degree` - Upload degree certificate
- `POST /api/upload/teacher/certificate` - Upload additional certificate
- `GET /api/upload/info` - Get upload limits and allowed types

Authentication required: All endpoints require Bearer token in Authorization header.
