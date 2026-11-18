# Admin Module Documentation

Complete admin module for SmartTutor React Native app based on backend API documentation.

## Overview

This admin module provides a complete interface for admin users to:
- View all teachers with filtering and search
- Approve/reject teacher profiles
- Suspend teachers
- View detailed teacher information
- Access statistics and analytics

## Components

### 1. **AdminDashboard**
Main admin dashboard with quick stats and navigation options.

**Features:**
- Real-time statistics (Active teachers, pending approvals, total teachers)
- Quick access buttons to different admin modules
- Logout functionality
- Pull-to-refresh statistics

**Props:**
```typescript
{
  onLogout?: () => void;
  onNavigateToTeachers?: () => void;
  onNavigateToAllTeachers?: () => void;
}
```

**Usage:**
```tsx
<AdminDashboard 
  onLogout={handleLogout}
  onNavigateToTeachers={() => navigation.navigate('ManageTeachers')}
  onNavigateToAllTeachers={() => navigation.navigate('AllTeachers')}
/>
```

---

### 2. **ManageTeachersScreen**
Displays pending teachers for approval/rejection.

**Features:**
- List of teachers pending approval
- Expandable teacher cards with full details
- Approve/reject functionality
- Rejection reason modal
- Admin access verification

**Props:**
```typescript
{
  onBack?: () => void;
}
```

**Usage:**
```tsx
<ManageTeachersScreen onBack={() => navigation.goBack()} />
```

---

### 3. **AllTeachersScreen**
Comprehensive teacher management with filtering and search.

**Features:**
- View all teachers in the system
- Filter by status (all, incomplete, pending, approved, rejected, suspended)
- Search by name, phone, or city
- Statistics for each status category
- Pull-to-refresh
- Tap to view details

**Props:**
```typescript
{
  onBack?: () => void;
  onSelectTeacher?: (teacherId: number) => void;
}
```

**Usage:**
```tsx
<AllTeachersScreen 
  onBack={() => navigation.goBack()}
  onSelectTeacher={(id) => navigation.navigate('TeacherDetail', { teacherId: id })}
/>
```

---

### 4. **TeacherDetailScreen**
Detailed view of individual teacher profile.

**Features:**
- Full teacher information display
- Basic, professional, and location details
- Subjects offered with fees
- Availability schedule
- Verification documents
- Approval history
- Rating and reviews info

**Props:**
```typescript
{
  teacherId: number;
  onBack?: () => void;
  onEdit?: (teacherId: number) => void;
}
```

**Usage:**
```tsx
<TeacherDetailScreen 
  teacherId={123}
  onBack={() => navigation.goBack()}
/>
```

---

### 5. **TeacherApprovalScreen**
Complete approval workflow for teacher profiles.

**Features:**
- Approval checklist (profile complete, docs, subjects, availability)
- Detailed teacher summary
- Qualifications and teaching details
- Subjects offered list
- Approve, reject, or suspend actions
- Modals for rejection/suspension reasons
- Status-specific actions

**Props:**
```typescript
{
  teacherId: number;
  onBack?: () => void;
  onApprovalComplete?: () => void;
}
```

**Usage:**
```tsx
<TeacherApprovalScreen 
  teacherId={123}
  onBack={() => navigation.goBack()}
  onApprovalComplete={() => {
    navigation.goBack();
    otherScreenRefresh();
  }}
/>
```

---

## Hooks

### `useTeacherList`
Manages teacher list loading and filtering.

```typescript
const { teachers, loading, error, loadTeachers } = useTeacherList();

// Load with pagination and status filter
loadTeachers(0, 50, 'pending_approval');
```

### `usePendingTeachers`
Loads teachers pending approval.

```typescript
const { teachers, loading, error, loadPendingTeachers } = usePendingTeachers();

loadPendingTeachers(0, 50);
```

### `useTeacherStats`
Fetches teacher statistics.

```typescript
const { stats, loading, error, loadStats } = useTeacherStats();

loadStats();
```

### `useTeacherApproval`
Handles approval/rejection/suspension actions.

```typescript
const { processing, handleApprove, handleReject, handleSuspend } = useTeacherApproval();

// Approve a teacher
const success = await handleApprove(teacherId);

// Reject with reason
const success = await handleReject(teacherId, 'Incomplete documents');

// Suspend with optional reason
const success = await handleSuspend(teacherId, 'Policy violation');
```

---

## Utility Functions

### `formatStatus(status: string)`
Formats status for display.

```typescript
formatStatus('pending_approval'); // Returns: 'Pending Approval'
```

### `getStatusColor(status: string)`
Returns color code for status.

```typescript
getStatusColor('approved'); // Returns: '#4CAF50'
```

### `getStatusIcon(status: string)`
Returns emoji icon for status.

```typescript
getStatusIcon('approved'); // Returns: '✅'
```

---

## Integration with Navigation

### Stack Navigator Setup

```typescript
import {
  AdminDashboard,
  ManageTeachersScreen,
  AllTeachersScreen,
  TeacherDetailScreen,
  TeacherApprovalScreen,
} from './component/admin';

function AdminStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // Use custom headers in components
      }}>
      <Stack.Screen
        name="AdminDashboard"
        component={AdminDashboard}
        options={{ title: 'Admin Dashboard' }}
      />
      <Stack.Screen
        name="ManageTeachers"
        component={ManageTeachersScreen}
        options={{ title: 'Manage Teachers' }}
      />
      <Stack.Screen
        name="AllTeachers"
        component={AllTeachersScreen}
        options={{ title: 'All Teachers' }}
      />
      <Stack.Screen
        name="TeacherDetail"
        component={TeacherDetailScreen}
        options={{ title: 'Teacher Details' }}
      />
      <Stack.Screen
        name="TeacherApproval"
        component={TeacherApprovalScreen}
        options={{ title: 'Approval' }}
      />
    </Stack.Navigator>
  );
}
```

---

## API Endpoints Used

All endpoints require admin authentication. The admin module uses:

### Teacher Management
- `GET /api/admin/teachers` - Get all teachers (with filters)
- `GET /api/admin/teachers/pending` - Get pending teachers
- `GET /api/admin/teachers/{id}` - Get teacher details
- `POST /api/admin/teachers/{id}/approve` - Approve/reject teacher
- `POST /api/admin/teachers/{id}/suspend` - Suspend teacher

### Statistics
- `GET /api/admin/stats/teachers` - Get teacher statistics

---

## Profile Status Flow

```
Teacher Registration
    ↓
Profile Setup
    ↓
[incomplete] ← (not all fields filled)
    ↓
[pending_approval] ← (ready for admin review)
    ├→ Admin Approves → [approved] (visible to students)
    ├→ Admin Rejects → [rejected] (can reapply)
    └→ Admin Suspends → [suspended] (hidden from students)
```

**Status Definitions:**
- `incomplete` - Teacher hasn't completed all required profile fields
- `pending_approval` - Teacher profile complete, awaiting admin review
- `approved` - Approved and visible to students
- `rejected` - Rejected by admin (can be reapplied)
- `suspended` - Approved but later suspended for violations

---

## Authentication

All admin APIs require:
1. Valid JWT token in AsyncStorage under `access_token` key
2. User role must be `'admin'`

Token is automatically added to all requests via the API client.

---

## Error Handling

The module includes comprehensive error handling:
- Network errors with user-friendly messages
- API error responses (401, 403, 404, etc.)
- Form validation errors
- Toast notifications for failures

---

## Styling

All components use consistent styling with:
- **Primary Color:** #075E54 (dark teal)
- **Success Color:** #4CAF50 (green)
- **Alert Color:** #F44336 (red)
- **Warning Color:** #FFD700 (gold)
- **Background:** #F8FAFC (light gray)

---

## Best Practices

1. **Always check admin role** before navigating to admin screens
2. **Refresh data** using pull-to-refresh or manual reload buttons
3. **Provide rejection reasons** when rejecting profiles
4. **Verify profile completion** before approving
5. **Keep track of user actions** for audit purposes
6. **Handle network failures gracefully** with retry options

---

## Example Implementation

```tsx
import { useNavigation } from '@react-navigation/native';
import { AdminDashboard, ManageTeachersScreen } from './component/admin';

function AdminScreen() {
  const navigation = useNavigation();

  const handleLogout = () => {
    // Clear auth data and navigate to login
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  return (
    <AdminDashboard
      onLogout={handleLogout}
      onNavigateToTeachers={() => {
        navigation.navigate('ManageTeachers');
      }}
      onNavigateToAllTeachers={() => {
        navigation.navigate('AllTeachers');
      }}
    />
  );
}
```

---

## Troubleshooting

### Teachers list is empty
- Verify backend is running with teachers in database
- Check admin API endpoint configuration
- Ensure valid JWT token in AsyncStorage

### Approval action fails
- Verify user has admin role
- Check profile is marked as complete
- Ensure all required fields are filled

### Statistics not loading
- Check network connection
- Verify API endpoint is accessible
- Ensure user is authenticated

---

## Future Enhancements

- [ ] Export teacher data to CSV
- [ ] Bulk approval/rejection actions
- [ ] Admin notes and comments
- [ ] Email notifications to teachers
- [ ] Audit logs of all admin actions
- [ ] Advanced analytics and reporting
- [ ] Teacher performance metrics
- [ ] Student feedback integration
