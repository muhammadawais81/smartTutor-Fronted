# Enrollment Feature - Code Examples & Reference

## Quick Reference

### 1. Using the Enrollment Hook

#### Basic Usage
```typescript
import { useEnrollment } from '../../hooks/useEnrollment';

const MyComponent = () => {
  const {
    subjects,
    enrollments,
    loading,
    error,
    loadingTeacherSubjects,
    loadingEnrollment,
    fetchTeacherSubjects,
    enrollInSubject,
    fetchMyEnrollments,
    clearError,
  } = useEnrollment();

  // Load teacher subjects
  const handleLoadSubjects = async (teacherId: number) => {
    try {
      await fetchTeacherSubjects(teacherId);
      console.log('Subjects:', subjects);
    } catch (err) {
      console.error('Failed to load subjects:', err);
    }
  };

  // Enroll in subject
  const handleEnroll = async (teacherId: number, subjectId: number) => {
    try {
      const enrollment = await enrollInSubject({
        teacher_id: teacherId,
        subject_id: subjectId,
        level_id: 1, // optional
      });
      console.log('Successfully enrolled:', enrollment);
    } catch (err) {
      console.error('Failed to enroll:', err);
    }
  };

  return (
    <View>
      <Button onPress={() => handleLoadSubjects(1)} title="Load Subjects" />
      <Button onPress={() => handleEnroll(1, 1)} title="Enroll" />
    </View>
  );
};
```

### 2. Importing Enrollment Types

```typescript
import type {
  TeacherSubject,
  EnrollmentResponse,
  CreateEnrollmentRequest,
  Subject,
} from '../../api/enrollment';
```

### 3. API Functions Direct Usage

If you prefer not to use the hook:

```typescript
import {
  getTeacherSubjects,
  createEnrollment,
  getMyEnrollments,
  getPendingEnrollments,
  approveEnrollment,
  rejectEnrollment,
} from '../../api/enrollment';

// Load subjects
const subjects = await getTeacherSubjects(teacherId);

// Create enrollment
const enrollment = await createEnrollment({
  teacher_id: 12,
  subject_id: 4,
  level_id: 2,
});

// Get my enrollments
const myEnrollments = await getMyEnrollments();

// Teacher: Get pending enrollments
const pending = await getPendingEnrollments();

// Teacher: Approve enrollment
const approved = await approveEnrollment('1a9b0f23-9b46-4fa4-9a1a-8f3e9c0c7d11');

// Teacher: Reject enrollment
const rejected = await rejectEnrollment('1a9b0f23-9b46-4fa4-9a1a-8f3e9c0c7d11');
```

## Component Examples

### Example 1: Subject Selection Component

```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useEnrollment } from '../../hooks/useEnrollment';
import type { TeacherSubject } from '../../api/enrollment';

interface SubjectSelectorProps {
  teacherId: number;
  onSelectSubject: (subject: TeacherSubject) => void;
}

export const SubjectSelector: React.FC<SubjectSelectorProps> = ({
  teacherId,
  onSelectSubject,
}) => {
  const { subjects, loadingTeacherSubjects, fetchTeacherSubjects } = useEnrollment();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    fetchTeacherSubjects(teacherId);
  }, [teacherId]);

  if (loadingTeacherSubjects) {
    return <ActivityIndicator size="large" />;
  }

  return (
    <FlatList
      data={subjects}
      keyExtractor={(item) => `${item.id}`}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => {
            setSelectedId(item.id);
            onSelectSubject(item);
          }}
          style={[
            styles.item,
            selectedId === item.id && styles.itemSelected,
          ]}
        >
          <Text style={styles.name}>{item.subject.name}</Text>
          <Text style={styles.fee}>Rs. {item.fee_per_month}/month</Text>
        </TouchableOpacity>
      )}
    />
  );
};

const styles = StyleSheet.create({
  item: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  itemSelected: {
    backgroundColor: '#E8F5E9',
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  fee: {
    fontSize: 14,
    color: '#28a745',
    marginTop: 4,
  },
});
```

### Example 2: Enrollment History Component

```typescript
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useEnrollment } from '../../hooks/useEnrollment';

export const EnrollmentHistory: React.FC = () => {
  const { enrollments, loading, fetchMyEnrollments } = useEnrollment();

  useEffect(() => {
    fetchMyEnrollments();
  }, []);

  if (loading) {
    return <ActivityIndicator size="large" />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Enrollments</Text>
      <FlatList
        data={enrollments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.enrollmentItem}>
            <View style={styles.header}>
              <Text style={styles.subjectName}>
                {item.teacher_subject.subject.name}
              </Text>
              <Text style={[
                styles.status,
                item.status === 'approved' ? styles.statusApproved : 
                item.status === 'pending' ? styles.statusPending :
                styles.statusRejected,
              ]}>
                {item.status.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.teacher}>
              Teacher ID: {item.teacher_subject.teacher_id}
            </Text>
            <Text style={styles.fee}>
              Rs. {item.teacher_subject.fee_per_month}/month
            </Text>
            <Text style={styles.date}>
              Enrolled: {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No enrollments yet</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  enrollmentItem: {
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  status: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusApproved: {
    backgroundColor: '#C8E6C9',
    color: '#2E7D32',
  },
  statusPending: {
    backgroundColor: '#FFF9C4',
    color: '#F57F17',
  },
  statusRejected: {
    backgroundColor: '#FFCDD2',
    color: '#C62828',
  },
  teacher: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  fee: {
    fontSize: 14,
    fontWeight: '600',
    color: '#28a745',
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
  empty: {
    textAlign: 'center',
    marginTop: 20,
    color: '#999',
  },
});
```

### Example 3: Quick Enroll Button Component

```typescript
import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useEnrollment } from '../../hooks/useEnrollment';

interface QuickEnrollProps {
  teacherId: number;
  subjectId: number;
  levelId?: number;
}

export const QuickEnrollButton: React.FC<QuickEnrollProps> = ({
  teacherId,
  subjectId,
  levelId,
}) => {
  const { enrollInSubject, loadingEnrollment } = useEnrollment();

  const handleQuickEnroll = async () => {
    try {
      await enrollInSubject({
        teacher_id: teacherId,
        subject_id: subjectId,
        level_id: levelId,
      });
      Alert.alert('Success', 'Enrolled successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to enroll. Please try again.');
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        loadingEnrollment && styles.buttonDisabled,
      ]}
      onPress={handleQuickEnroll}
      disabled={loadingEnrollment}
    >
      {loadingEnrollment ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.text}>Quick Enroll</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#28a745',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  text: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
```

## Hook Usage Patterns

### Pattern 1: Load on Component Mount

```typescript
useEffect(() => {
  if (teacherId) {
    fetchTeacherSubjects(teacherId);
  }
}, [teacherId, fetchTeacherSubjects]);
```

### Pattern 2: Track Loading State

```typescript
{loadingTeacherSubjects ? (
  <ActivityIndicator />
) : subjects.length === 0 ? (
  <Text>No subjects available</Text>
) : (
  <FlatList data={subjects} {...props} />
)}
```

### Pattern 3: Display Errors

```typescript
{error && (
  <View style={styles.errorBox}>
    <Text style={styles.errorText}>{error}</Text>
    <TouchableOpacity onPress={clearError}>
      <Text>Dismiss</Text>
    </TouchableOpacity>
  </View>
)}
```

### Pattern 4: Form with Hook State

```typescript
const [selectedSubject, setSelectedSubject] = useState<TeacherSubject | null>(null);
const { enrollInSubject, loadingEnrollment } = useEnrollment();

const handleSubmit = async () => {
  if (!selectedSubject) return;
  
  try {
    await enrollInSubject({
      teacher_id: teacherId,
      subject_id: selectedSubject.subject_id,
      level_id: selectedSubject.level_id,
    });
  } catch (error) {
    // Error handling
  }
};
```

## API Response Examples

### Success Response: Create Enrollment

```json
{
  "id": "1a9b0f23-9b46-4fa4-9a1a-8f3e9c0c7d11",
  "student_id": 21,
  "teacher_subject_id": 55,
  "status": "pending",
  "created_at": "2026-02-17T10:15:00.123Z",
  "teacher_subject": {
    "id": 55,
    "teacher_id": 12,
    "subject_id": 4,
    "level_id": 2,
    "fee_per_month": 5000,
    "is_active": true,
    "subject": {
      "id": 4,
      "name": "Mathematics",
      "description": "Algebra, geometry, and calculus"
    }
  }
}
```

### Success Response: Get Teacher Subjects

```json
[
  {
    "id": 55,
    "teacher_id": 12,
    "subject_id": 4,
    "level_id": 2,
    "fee_per_month": 5000,
    "is_active": true,
    "subject": {
      "id": 4,
      "name": "Mathematics",
      "description": "Algebra, geometry, and calculus"
    }
  },
  {
    "id": 56,
    "teacher_id": 12,
    "subject_id": 5,
    "level_id": null,
    "fee_per_month": 4000,
    "is_active": true,
    "subject": {
      "id": 5,
      "name": "Physics",
      "description": "Classical mechanics and thermodynamics"
    }
  }
]
```

## Error Handling Examples

### Handle Different Error Types

```typescript
try {
  await enrollInSubject(enrollmentData);
} catch (error: any) {
  if (error.message.includes('401')) {
    // Unauthorized - redirect to login
  } else if (error.message.includes('409')) {
    // Conflict - duplicate enrollment
    Alert.alert('Already Enrolled', 'You are already enrolled in this subject');
  } else if (error.message.includes('404')) {
    // Not found
    Alert.alert('Not Found', 'Teacher or subject not found');
  } else {
    // Generic error
    Alert.alert('Error', error.message);
  }
}
```

## Testing Examples

### Unit Test Example (Jest)

```typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useEnrollment } from '../../hooks/useEnrollment';
import * as enrollmentApi from '../../api/enrollment';

jest.mock('../../api/enrollment');

describe('useEnrollment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch teacher subjects', async () => {
    const mockSubjects = [
      {
        id: 1,
        teacher_id: 1,
        subject_id: 1,
        fee_per_month: 5000,
        is_active: true,
        subject: { id: 1, name: 'Math' },
      },
    ];

    (enrollmentApi.getTeacherSubjects as jest.Mock).mockResolvedValue(mockSubjects);

    const { result } = renderHook(() => useEnrollment());

    await act(async () => {
      await result.current.fetchTeacherSubjects(1);
    });

    expect(result.current.subjects).toEqual(mockSubjects);
  });

  it('should handle enrollment error', async () => {
    (enrollmentApi.createEnrollment as jest.Mock).mockRejectedValue(
      new Error('Network error')
    );

    const { result } = renderHook(() => useEnrollment());

    await act(async () => {
      try {
        await result.current.enrollInSubject({
          teacher_id: 1,
          subject_id: 1,
        });
      } catch (err) {
        expect(err.message).toBe('Network error');
      }
    });
  });
});
```

## Integration Checklist

- [ ] API files created in `api/enrollment/`
- [ ] Hook created in `hooks/useEnrollment.ts`
- [ ] TeacherDetailScreen.tsx updated
- [ ] Imports verified  
- [ ] No TypeScript errors
- [ ] API endpoints configured correctly
- [ ] User authentication verified
- [ ] Test enrollment flow works
- [ ] Error handling tested
- [ ] Mobile responsiveness checked

## Next Steps

1. **Implement Teacher Console** - Show pending enrollments
2. **Add Notifications** - Notify on approval/rejection
3. **Payment Integration** - Handle subscription payments
4. **Session Booking* - Allow booking after approval
5. **Analytics** - Track enrollment metrics
