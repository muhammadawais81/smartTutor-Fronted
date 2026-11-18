# Django Backend - Add Token Status Fields

## 📦 Update Your Actual API Responses

Your current response format is good. Now add the 4 token status fields to both endpoints.

### Current Response (Your Format)

```json
{
  "id": 54,
  "channel_name": "channel_8_1771909766_6a989347",
  "call_type": "one_to_one",
  "status": "initiated",
  "call_link": "smarttutor://video?channel=...",
  "token": "0075918efb24fd94892b6e2b7a61600242f...",
  "uid": 1,
  "message": "Video call initiated and selected students saved in call participants."
}
```

### Updated Response (Add These 4 Fields)

```json
{
  "id": 54,
  "channel_name": "channel_8_1771909766_6a989347",
  "call_type": "one_to_one",
  "status": "initiated",
  "call_link": "smarttutor://video?channel=...",
  "token": "0075918efb24fd94892b6e2b7a61600242f...",
  "uid": 1,
  "message": "Video call initiated and selected students saved in call participants.",
  
  "token_status": "new",
  "token_generated_at": "2026-02-24T10:30:45.123456Z",
  "token_expires_at": "2026-02-24T11:30:45.123456Z",
  "token_ttl_seconds": 3600
}
```

---

## 🔧 Django Implementation

### Step 1: Update Your View

Find your existing `InitiateVideoCall` view and modify the response:

```python
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta

class InitiateVideoCall(APIView):
    def post(self, request):
        # ... your existing logic to create call and generate token ...
        
        # Get current time (when token was generated)
        token_generated_at = timezone.now()
        
        # Calculate expiration (1 hour from now as per Agora requirement)
        token_expires_at = token_generated_at + timedelta(hours=1)
        
        # TTL in seconds (always 3600 for Agora tokens)
        token_ttl_seconds = 3600
        
        # Prepare response with existing + new fields
        response_data = {
            'id': video_call.id,
            'channel_name': channel_name,
            'call_type': call_type,
            'status': 'initiated',
            'call_link': call_link,
            'token': agora_token,  # Your generated token
            'uid': 1,
            'message': 'Video call initiated and selected students saved in call participants.',
            
            # NEW FIELDS - Always use "new" since you always generate fresh tokens
            'token_status': 'new',
            'token_generated_at': token_generated_at.isoformat(),  # ISO 8601 format with Z
            'token_expires_at': token_expires_at.isoformat(),
            'token_ttl_seconds': token_ttl_seconds,
        }
        
        return Response(response_data, status=status.HTTP_201_CREATED)
```

### Step 2: Update JoinVideoCall View

Same approach for the join endpoint:

```python
class JoinVideoCall(APIView):
    def post(self, request):
        # ... your existing logic ...
        
        video_call_id = request.data.get('video_call_id')
        video_call = VideoCall.objects.get(id=video_call_id)
        
        # Generate fresh token for each student
        student_uid = get_next_uid(video_call)  # e.g., 2, 3, 4...
        agora_token = generate_agora_token(
            channel=video_call.channel_name,
            uid=student_uid,
            role='publisher'
        )
        
        # Token timing
        token_generated_at = timezone.now()
        token_expires_at = token_generated_at + timedelta(hours=1)
        
        # Response
        response_data = {
            'token': agora_token,
            'channel_name': video_call.channel_name,
            'uid': student_uid,
            'teacher_id': video_call.teacher_id,
            'status': 'ongoing',
            'message': f'Student joined video call successfully',
            
            # NEW FIELDS
            'token_status': 'new',
            'token_generated_at': token_generated_at.isoformat(),
            'token_expires_at': token_expires_at.isoformat(),
            'token_ttl_seconds': 3600,
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
```

### Step 3: Update Serializers (Optional but Recommended)

Create serializers to ensure consistent response format:

```python
from rest_framework import serializers

class InitiateVideoCallResponseSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    channel_name = serializers.CharField()
    call_type = serializers.CharField()
    status = serializers.CharField()
    call_link = serializers.CharField()
    token = serializers.CharField()
    uid = serializers.IntegerField()
    message = serializers.CharField()
    
    # Token details
    token_status = serializers.CharField()  # "new"
    token_generated_at = serializers.DateTimeField()
    token_expires_at = serializers.DateTimeField()
    token_ttl_seconds = serializers.IntegerField()


class JoinVideoCallResponseSerializer(serializers.Serializer):
    token = serializers.CharField()
    channel_name = serializers.CharField()
    uid = serializers.IntegerField()
    teacher_id = serializers.IntegerField()
    status = serializers.CharField()
    message = serializers.CharField()
    
    # Token details
    token_status = serializers.CharField()
    token_generated_at = serializers.DateTimeField()
    token_expires_at = serializers.DateTimeField()
    token_ttl_seconds = serializers.IntegerField()
```

---

## ✅ Important Points

### 1. Timestamp Format

Must be ISO 8601 with 'Z' suffix for UTC:
```python
timezone.now().isoformat()  # Returns: 2026-02-24T10:30:45.123456Z
```

### 2. Token Status

Always use `"new"` in your implementation:
```python
'token_status': 'new'  # You always generate fresh tokens
```

### 3. TTL (Time To Live)

Always 3600 seconds (1 hour) as per Agora requirement:
```python
'token_ttl_seconds': 3600  # Must be this value
```

### 4. Calculate Expiration

Expiration = now + 1 hour:
```python
token_generated_at = timezone.now()
token_expires_at = token_generated_at + timedelta(hours=1)  # 1 hour = 3600 seconds
```

---

## 🧪 Test Your Changes

### Test with curl

```bash
# Test initiate endpoint
curl -X POST http://localhost:8000/api/video/initiate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": 7,
    "subject_id": 2,
    "call_type": "one_to_one",
    "student_ids": [7]
  }'

# Response should include:
# "token_status": "new"
# "token_generated_at": "2026-02-24T10:30:45.123456Z"
# "token_expires_at": "2026-02-24T11:30:45.123456Z"
# "token_ttl_seconds": 3600
```

### Verify in Django Admin/Shell

```python
from django.utils import timezone
from datetime import timedelta

# Test timestamp format
now = timezone.now()
expires = now + timedelta(hours=1)

print(now.isoformat())      # 2026-02-24T10:30:45.123456Z
print(expires.isoformat())  # 2026-02-24T11:30:45.123456Z
```

---

## 📋 Implementation Checklist

- [ ] Update `InitiateVideoCall` view to add 4 fields
- [ ] Update `JoinVideoCall` view to add 4 fields
- [ ] Test responses include all fields
- [ ] Verify timestamp format (ISO 8601 with Z)
- [ ] Verify token_status is "new"
- [ ] Verify token_ttl_seconds is 3600
- [ ] Deploy to server
- [ ] Frontend already supports these fields (optional as of latest changes)

---

## 🚀 Quick Copy-Paste Solution

If you want the absolute simplest implementation, just modify your response dict:

### Current Code (Example)
```python
response_data = {
    'id': video_call.id,
    'channel_name': channel_name,
    'call_type': call_type,
    'status': 'initiated',
    'call_link': call_link,
    'token': token,
    'uid': 1,
    'message': 'Video call initiated and selected students saved in call participants.'
    # ADD BELOW THIS LINE
}
```

### Add This
```python
from django.utils import timezone
from datetime import timedelta

# Right before return statement in InitiateVideoCall
token_generated_at = timezone.now()
token_expires_at = token_generated_at + timedelta(hours=1)

response_data['token_status'] = 'new'
response_data['token_generated_at'] = token_generated_at.isoformat()
response_data['token_expires_at'] = token_expires_at.isoformat()
response_data['token_ttl_seconds'] = 3600
```

---

