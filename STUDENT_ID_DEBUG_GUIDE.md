# Student ID Not Being Saved - Debug Guide

## Problem
Based on your database screenshot, the `video_call_participants` table shows:
- ✅ `video_call_id`: Correctly populated (12, 13, 15, 16, 17, 18, 19, 20)
- ❌ `student_id`: **NULL** (Should contain the actual student ID)
- ⚠️ `user_id`: All showing 48 (appears to be teacher's user_id)
- ✅ `uid`: Correctly showing 1 (Agora UID)
- ✅ `joined_at`: Correctly populated with timestamps

## Root Cause Analysis

### Frontend (Already Working) ✅
The frontend IS correctly sending student IDs:

**Teacher initiating call:**
```typescript
// One-to-one
{
  student_id: 123,        // ✅ Student ID is sent
  subject_id: 5,
  call_type: 'one_to_one'
}

// Group
{
  student_ids: [123, 456, 789],  // ✅ Student IDs are sent
  subject_id: 5,
  call_type: 'group'
}
```

**Student joining call:**
```typescript
{
  video_call_id: 12  // Only sends call ID
}
```

### Backend (Issue Here) ❌
The backend should:
1. **When teacher initiates**: Create participant records for selected students
   - Get `student_id` or `student_ids` from request
   - Create records with proper `student_id` values
   
2. **When student joins**: Create participant record for that student
   - Get `user_id` from JWT token
   - Look up `student_id` from `students` table where `user_id` matches
   - Create record with both `user_id` AND `student_id`

## New Logging Added

I've added comprehensive logging to help diagnose the issue. When you run the app, you'll see:

### Teacher Starts Call:
```
[VIDEO] Initiating call with payload: {
  "student_id": 123,
  "subject_id": 5,
  "call_type": "one_to_one"
}
[VIDEO] Student IDs being sent: 123
[VIDEO] Subject ID: 5
[VIDEO API] Initiating video call...
[VIDEO API] Endpoint: http://YOUR_BACKEND/api/video/initiate
[VIDEO API] Payload: {...}
[VIDEO API] Headers: {...}
[VIDEO API] Initiate success: {
  "id": 20,
  "channel_name": "...",
  "token": "...",
  ...
}
```

### Student Joins Call:
```
[VIDEO] Student joining call...
[VIDEO] Active call ID: 20
[VIDEO] Teacher: John Doe
[VIDEO] Sending join request with payload: {"video_call_id": 20}
[VIDEO API] Student joining video call...
[VIDEO API] Endpoint: http://YOUR_BACKEND/api/video/join
[VIDEO API] Payload: {"video_call_id": 20}
[VIDEO API] Headers Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI...
[VIDEO API] Join success: {
  "token": "...",
  "channel_name": "...",
  "uid": 2,
  "teacher_id": 48,
  "status": "ongoing"
}
```

## How to Debug

### Step 1: Check Teacher Request
1. Teacher starts a call
2. Check console logs
3. Verify payload shows correct `student_id` or `student_ids`
4. **Check backend logs** - Does it receive these IDs?

### Step 2: Check Backend Handling
**Backend should do this when teacher initiates:**
```python
# Example backend logic
def initiate_video_call(request):
    data = request.json
    student_id = data.get('student_id')
    student_ids = data.get('student_ids', [])
    
    # Create participant records
    if student_id:
        # One-to-one: Create record for this student
        create_participant(
            video_call_id=call.id,
            user_id=student.user_id,  # ← Get from students table
            student_id=student_id,     # ← Use from request
            uid=generate_uid()
        )
    elif student_ids:
        # Group: Create records for all students
        for sid in student_ids:
            student = get_student(sid)
            create_participant(
                video_call_id=call.id,
                user_id=student.user_id,  # ← Get from students table
                student_id=sid,            # ← Use from request
                uid=generate_uid()
            )
```

### Step 3: Check Student Join
1. Student joins call
2. Check console logs
3. Verify JWT token is sent in Authorization header
4. **Check backend logs** - Does it:
   - Extract user_id from JWT?
   - Look up student_id from students table?
   - Create participant with BOTH user_id and student_id?

**Backend should do this when student joins:**
```python
def join_video_call(request):
    # Get user from JWT token
    user_id = get_user_from_token(request.headers['Authorization'])
    
    # Look up student record
    student = Student.query.filter_by(user_id=user_id).first()
    
    if not student:
        raise Exception("User is not a student")
    
    # Create participant record
    participant = VideoCallParticipant(
        video_call_id=call.id,
        user_id=user_id,           # ← From JWT
        student_id=student.id,     # ← From database lookup
        uid=generate_uid(),
        joined_at=datetime.now()
    )
    db.session.add(participant)
    db.session.commit()
```

## Expected Database After Fix

After fixing the backend, the table should look like:

| id | video_call_id | student_id | user_id | uid | joined_at |
|----|---------------|------------|---------|-----|-----------|
| 1  | 12            | **25**     | 52      | 1   | 2026-02-17... |
| 2  | 12            | **26**     | 53      | 2   | 2026-02-17... |
| 3  | 13            | **27**     | 54      | 1   | 2026-02-17... |

- `student_id`: Should be populated (25, 26, 27, etc.)
- `user_id`: Should vary based on student (52, 53, 54, etc.)
- Teacher's user_id (48) should NOT appear unless teacher joins as participant

## Quick Backend Checklist

### When Teacher Initiates Call:
- [ ] Receive `student_id` or `student_ids` in request body
- [ ] For each student ID:
  - [ ] Look up student record: `SELECT * FROM students WHERE id = ?`
  - [ ] Get their `user_id`
  - [ ] Create participant with BOTH `student_id` and `user_id`
  - [ ] Generate unique Agora UID for each

### When Student Joins Call:
- [ ] Extract user_id from JWT token
- [ ] Look up student: `SELECT * FROM students WHERE user_id = ?`
- [ ] Verify student exists
- [ ] Create participant with:
  - [ ] `video_call_id` from request
  - [ ] `user_id` from JWT
  - [ ] `student_id` from database lookup
  - [ ] Generate Agora UID
  - [ ] Set `joined_at` timestamp

## Summary

**✅ Frontend is working correctly** - Student IDs are being sent

**❌ Backend needs fixing** - Student IDs are not being saved to database

**Next Step**: Check your backend code in the video call endpoints:
- `/api/video/initiate` - Should create participant records with student_ids
- `/api/video/join` - Should look up student_id from JWT token's user_id

Use the new console logs to verify the frontend is sending the correct data, then focus on fixing the backend participant creation logic.
