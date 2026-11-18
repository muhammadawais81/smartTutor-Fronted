# Student Enrollment Integration Guide

## Overview
This guide explains the new subject-wise enrollment feature integrated into the SmartTutor application. Students can now view teacher profiles and enroll in specific subjects offered by teachers.

## Architecture

### API Integration Files

#### 1. **api/enrollment/types.ts**
TypeScript interfaces for enrollment-related API responses and requests:
- `TeacherSubject` - Subject offering details with fee and availability
- `EnrollmentResponse` - Enrollment request status and details
- `CreateEnrollmentRequest` - Request body for creating enrollment

#### 2. **api/enrollment/enrollmentApi.ts**
API functions for enrollment operations:
- `getTeacherSubjects(teacherId)` - Fetch all subjects for a teacher
- `createEnrollment(data)` - Submit enrollment request
- `getMyEnrollments()` - Fetch student's enrollments
- `getPendingEnrollments()` - Fetch pending enrollments (teacher only)
- `approveEnrollment(enrollmentId)` - Approve enrollment (teacher only)
- `rejectEnrollment(enrollmentId)` - Reject enrollment (teacher only)

#### 3. **api/enrollment/index.ts**
Re-exports all enrollment API functions and types for clean imports

### Custom Hook

#### **hooks/useEnrollment.ts**
React hook for managing enrollment state and operations:

```typescript
interface UseEnrollmentReturn {
  subjects: TeacherSubject[];
  enrollments: EnrollmentResponse[];
  loading: boolean;
  error: string | null;
  loadingTeacherSubjects: boolean;
  loadingEnrollment: boolean;
  fetchTeacherSubjects: (teacherId: number) => Promise<void>;
  enrollInSubject: (enrollmentData: CreateEnrollmentRequest) => Promise<EnrollmentResponse>;
  fetchMyEnrollments: () => Promise<void>;
  clearError: () => void;
}
```

**Key Features:**
- Manages subject list, enrollment list, and loading states
- Handles all enrollment API calls
- Error handling and state management
- Auto-refreshes enrollments after successful enrollment

### UI Components

#### **component/teacher/TeacherDetailScreen.tsx** (Updated)
Enhanced teacher profile screen with enrollment functionality:

**New Features:**
- "Enroll Now" button (green) alongside existing buttons
- `EnrollmentModal` component for subject selection
- Integration with enrollment hook
- Loading and error states

**EnrollmentModal Component:**
- Displays list of teacher's available subjects
- Shows fee information for each subject
- Single subject selection
- Summary of selected subject
- Enrollment confirmation with loading state
- Error message display

## User Flow

### Student Enrollment Journey

1. **Student Views Teacher Profile**
   - Navigate to student dashboard
   - Click on a teacher profile
   - Teacher's details page loads

2. **Opens Enrollment Modal**
   - Click "🎓 Enroll Now" button
   - Modal slides up from bottom
   - Available subjects are fetched and displayed

3. **Selects Subject**
   - Taps on desired subject
   - Subject is highlighted (green border, checkmark)
   - Summary section updates showing selected subject and fee

4. **Confirms Enrollment**
   - Taps "Confirm Enrollment" button
   - Loading animation displays
   - Success alert shows "Enrollment request submitted"
   - Modal closes automatically

5. **Pending Approval**
   - Teacher receives enrollment request
   - Teacher can approve or reject
   - Student is notified of approval status

## Integration with Existing Code

### 1. No Changes Required in StudentDashboard
The existing dashboard automatically works with the new feature.

### 2. TeacherDetailScreen Now Includes:
- Enrollment button between chat and booking buttons
- Modal component for subject selection
- Uses enrolled subject API endpoints
- Maintains existing chat and profile functionality

### 3. API Endpoints Used:
- `GET /subjects/teacher/{teacher_id}` - Load teacher subjects
- `POST /enrollments` - Create enrollment request

## Error Handling

The implementation includes comprehensive error handling:

1. **Authentication Errors**
   - Alerts user if not logged in before enrollment
   - Validates JWT token before API calls

2. **Network Errors**
   - Displays error messages in modal
   - Allows user to try again
   - Clear error on modal close

3. **Business Logic Errors**
   - Prevents duplicate enrollments (handled by backend)
   - Validates subject selection before submission
   - Shows detailed error messages from backend

## Styling

### Colors
- **Enroll Button**: Green (#28a745) - distinct from blue chat button
- **Modal Header**: Dark (#333333)
- **Selected Subject**: Green background (#E8F5E9) with green border
- **Error Messages**: Red (#D32F2F) background
- **Checkmark**: Green (#28a745) with white text

### Responsive Design
- Modal responsive to different screen sizes
- Scrollable subject list for many subjects
- Touch-friendly button sizes (44+ pixels)
- Proper spacing and padding

## Backend Requirements

For the enrollment feature to work, the following backend APIs must be available:

### 1. Get Teacher Subjects
```
GET /subjects/teacher/{teacher_id}
Authorization: Bearer <token>
Response: Array<TeacherSubject>
```

### 2. Create Enrollment
```
POST /enrollments
Authorization: Bearer <token>
Body: {
  "teacher_id": number,
  "subject_id": number,
  "level_id"?: number (optional)
}
Response: EnrollmentResponse
```

## Testing

### Manual Testing Checklist

1. **Basic Flow**
   - [ ] Open student dashboard
   - [ ] Click on teacher profile
   - [ ] Click "Enroll Now" button
   - [ ] Subjects load in modal
   - [ ] Can select subject
   - [ ] Can confirm enrollment
   - [ ] Success message displays

2. **Error Handling**
   - [ ] Test without login (should prompt to login)
   - [ ] Test with invalid teacher ID
   - [ ] Test with network error
   - [ ] Test modal close/cancel buttons

3. **Subject Selection**
   - [ ] Multiple subjects display correctly
   - [ ] Selected subject highlights properly
   - [ ] Summary updates when selection changes
   - [ ] Fees display correctly

4. **Integrations**
   - [ ] Chat functionality still works
   - [ ] Profile details still display
   - [ ] Navigation back works
   - [ ] No interference with other screens

## Dependencies

The implementation requires the following React Native packages:
- `react-native` - Core UI components (Modal, FlatList, etc.)
- `react-native-safe-area-context` - Safe area handling
- `@react-native-async-storage/async-storage` - Token storage

All these are likely already installed in your project.

## Future Enhancements

Possible improvements for future versions:

1. **Multiple Subject Enrollment**
   - Allow selecting multiple subjects at once
   - Bulk enrollment submission

2. **Level Selection**
   - Show level options for subjects that have levels
   - Level-based pricing

3. **Enrollment Status Tracking**
   - Show enrollment status (pending/approved/rejected)
   - Display enrollment history in student profile

4. **Calendar Integration**
   - Show available slots after enrollment
   - Allow booking sessions immediately

5. **Notifications**
   - Push notification when enrollment is approved
   - In-app notifications for status updates

## Support

For issues or questions about the enrollment integration:
1. Check API endpoints in `api/config.ts`
2. Verify backend endpoints are returning correct format
3. Check network requests in browser dev tools
4. Review console logs for detailed error information
