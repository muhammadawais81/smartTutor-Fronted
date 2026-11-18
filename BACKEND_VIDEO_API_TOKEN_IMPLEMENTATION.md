# Backend Video API Implementation - Token Status

## 📋 Backend Response Structure

### `/api/video/initiate` Response

Your backend should return this structure:

```json
{
  "id": 15,
  "channel_name": "channel_12_1708150800_a1b2c3d4",
  "call_type": "one_to_one",
  "status": "initiated",
  "call_link": "smarttutor://video/15",
  "token": "007eJxTYPj/xsvD0pHE1sHNx1vHI1HfXMPQyMHJydLBydXVwcHB...",
  "uid": 1,
  "message": "Video call initiated successfully",
  
  "token_status": "new",
  "token_generated_at": "2026-02-24T10:30:45.123456Z",
  "token_expires_at": "2026-02-24T11:30:45.123456Z",
  "token_ttl_seconds": 3600
}
```

### `/api/video/join` Response

```json
{
  "token": "007eJxTYPj/xsvD0pHE1sHNx1vHI1HfXMPQyMHJydLBydXVwcHB...",
  "channel_name": "channel_12_1708150800_a1b2c3d4",
  "uid": 2,
  "teacher_id": 12,
  "status": "ongoing",
  "message": "Joined video call successfully",
  
  "token_status": "new",
  "token_generated_at": "2026-02-24T10:30:45.123456Z",
  "token_expires_at": "2026-02-24T11:30:45.123456Z",
  "token_ttl_seconds": 3600
}
```

---

## 🔧 Django Backend Implementation

### Models/Serializers Update

```python
# serializers.py
from rest_framework import serializers
from datetime import timezone, timedelta

class TokenDetailsSerializer(serializers.Serializer):
    """Mixin for token details in responses"""
    token_status = serializers.CharField()  # 'new' or 'reused'
    token_generated_at = serializers.DateTimeField()
    token_expires_at = serializers.DateTimeField()
    token_ttl_seconds = serializers.IntegerField()

class InitiateVideoCallResponseSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    channel_name = serializers.CharField()
    call_type = serializers.CharField()
    status = serializers.CharField()
    call_link = serializers.CharField()
    token = serializers.CharField()
    uid = serializers.IntegerField()
    message = serializers.CharField()
    
    # NEW FIELDS
    token_status = serializers.CharField()
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
    
    # NEW FIELDS
    token_status = serializers.CharField()
    token_generated_at = serializers.DateTimeField()
    token_expires_at = serializers.DateTimeField()
    token_ttl_seconds = serializers.IntegerField()
```

### Views Implementation

```python
# views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from .models import VideoCall
from .serializers import InitiateVideoCallResponseSerializer

class InitiateVideoCallView(APIView):
    """
    POST /api/video/initiate
    
    Teacher initiates a video call and gets a token with expiration info
    """
    
    def post(self, request):
        # Validate request
        call_type = request.data.get('call_type')
        student_ids = request.data.get('student_ids')
        
        # Generate channel name (unique per call)
        import time
        timestamp = int(time.time())
        call_id = str(request.user.id) + '_' + str(timestamp)
        channel_name = f"channel_{request.user.id}_{timestamp}_{call_id}"
        
        # Check if token already exists for this session (reuse logic)
        existing_call = self._get_existing_call(request.user.id)
        
        if existing_call and self._is_token_valid(existing_call):
            # REUSE EXISTING TOKEN
            token = existing_call.token
            token_status = "reused"
            generated_at = existing_call.token_generated_at
            expires_at = existing_call.token_expires_at
            ttl = self._calculate_ttl(expires_at)
        else:
            # GENERATE NEW TOKEN
            token = self._generate_agora_token(
                channel_name=channel_name,
                uid=1,  # Teacher always UID 1
                role='publisher'
            )
            token_status = "new"
            generated_at = timezone.now()
            expires_at = generated_at + timedelta(hours=1)  # 1 hour TTL
            ttl = 3600  # seconds
        
        # Create or update video call record
        video_call = VideoCall.objects.create(
            teacher=request.user,
            call_type=call_type,
            channel_name=channel_name,
            token=token,
            status='initiated',
            token_generated_at=generated_at,
            token_expires_at=expires_at,
        )
        
        response_data = {
            'id': video_call.id,
            'channel_name': channel_name,
            'call_type': call_type,
            'status': 'initiated',
            'call_link': f"smarttutor://video/{video_call.id}",
            'token': token,
            'uid': 1,  # Teacher UID
            'message': f'Video call initiated successfully',
            
            'token_status': token_status,
            'token_generated_at': generated_at,
            'token_expires_at': expires_at,
            'token_ttl_seconds': ttl,
        }
        
        serializer = InitiateVideoCallResponseSerializer(response_data)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    def _get_existing_call(self, teacher_id):
        """Get the most recent call for this teacher"""
        try:
            return VideoCall.objects.filter(
                teacher_id=teacher_id,
                status__in=['initiated', 'ongoing']
            ).latest('created_at')
        except VideoCall.DoesNotExist:
            return None
    
    def _is_token_valid(self, video_call):
        """Check if token hasn't expired"""
        return timezone.now() < video_call.token_expires_at
    
    def _calculate_ttl(self, expires_at):
        """Calculate time-to-live in seconds"""
        return int((expires_at - timezone.now()).total_seconds())
    
    def _generate_agora_token(self, channel_name, uid, role='publisher'):
        """
        Generate Agora RTC token
        
        Install: pip install agora-token-builder
        """
        from agora_token_builder import RtcTokenBuilder
        import os
        
        app_id = os.getenv('AGORA_APP_ID')
        app_certificate = os.getenv('AGORA_APP_CERTIFICATE')
        
        privilege = RtcTokenBuilder.RtcTokenBuilder.RolePublisher if role == 'publisher' else RtcTokenBuilder.RtcTokenBuilder.RoleSubscriber
        
        token = RtcTokenBuilder.buildTokenWithUid(
            appId=app_id,
            appCertificate=app_certificate,
            channelName=channel_name,
            uid=uid,
            role=privilege,
            privilegeExpiredTs=int(timezone.now().timestamp()) + 3600  # 1 hour
        )
        
        return token


class JoinVideoCallView(APIView):
    """
    POST /api/video/join
    
    Student joins a video call and gets a token with expiration info
    """
    
    def post(self, request):
        video_call_id = request.data.get('video_call_id')
        
        try:
            video_call = VideoCall.objects.get(id=video_call_id)
        except VideoCall.DoesNotExist:
            return Response(
                {'error': 'Video call not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if call is still ongoing
        if video_call.status not in ['initiated', 'ongoing']:
            return Response(
                {'error': 'This call is no longer available'},
                status=status.HTTP_410_GONE
            )
        
        # Generate new token for student
        student_uid = video_call.participants.count() + 1
        
        token = self._generate_agora_token(
            channel_name=video_call.channel_name,
            uid=student_uid,
            role='publisher'
        )
        
        token_generated_at = timezone.now()
        token_expires_at = token_generated_at + timedelta(hours=1)
        
        # Record participant
        from .models import VideoCallParticipant
        VideoCallParticipant.objects.create(
            video_call=video_call,
            user=request.user,
            uid=student_uid,
        )
        
        # Update call status
        if video_call.status == 'initiated':
            video_call.status = 'ongoing'
            video_call.started_at = timezone.now()
            video_call.save()
        
        response_data = {
            'token': token,
            'channel_name': video_call.channel_name,
            'uid': student_uid,
            'teacher_id': video_call.teacher_id,
            'status': 'ongoing',
            'message': 'Joined video call successfully',
            
            'token_status': 'new',
            'token_generated_at': token_generated_at,
            'token_expires_at': token_expires_at,
            'token_ttl_seconds': 3600,
        }
        
        serializer = JoinVideoCallResponseSerializer(response_data)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def _generate_agora_token(self, channel_name, uid, role='publisher'):
        """Generate Agora RTC token"""
        from agora_token_builder import RtcTokenBuilder
        import os
        
        app_id = os.getenv('AGORA_APP_ID')
        app_certificate = os.getenv('AGORA_APP_CERTIFICATE')
        
        privilege = RtcTokenBuilder.RtcTokenBuilder.RolePublisher if role == 'publisher' else RtcTokenBuilder.RtcTokenBuilder.RoleSubscriber
        
        token = RtcTokenBuilder.buildTokenWithUid(
            appId=app_id,
            appCertificate=app_certificate,
            channelName=channel_name,
            uid=uid,
            role=privilege,
            privilegeExpiredTs=int(timezone.now().timestamp()) + 3600
        )
        
        return token
```

### Models Update

```python
# models.py
from django.db import models
from django.contrib.auth.models import User

class VideoCall(models.Model):
    STATUS_CHOICES = [
        ('initiated', 'Initiated'),
        ('ongoing', 'Ongoing'),
        ('ended', 'Ended'),
        ('cancelled', 'Cancelled'),
    ]
    
    teacher = models.ForeignKey(User, on_delete=models.CASCADE)
    call_type = models.CharField(max_length=20)
    channel_name = models.CharField(max_length=255, unique=True)
    token = models.TextField()  # Agora token
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='initiated')
    
    # Token metadata
    token_generated_at = models.DateTimeField(auto_now_add=True)
    token_expires_at = models.DateTimeField()
    
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def is_token_valid(self):
        from django.utils import timezone
        return timezone.now() < self.token_expires_at
```

---

## 🔗 URL Configuration

```python
# urls.py
from django.urls import path
from .views import InitiateVideoCallView, JoinVideoCallView

urlpatterns = [
    path('api/video/initiate', InitiateVideoCallView.as_view(), name='initiate-video-call'),
    path('api/video/join', JoinVideoCallView.as_view(), name='join-video-call'),
]
```

---

## 📝 Frontend Usage

The frontend already logs this info updated in `api/video/videoApi.ts`:

```typescript
console.log('[VIDEO API] ✅ Token Details:');
console.log('[VIDEO API]   Token:', data.token?.substring(0, 30) + '...');
console.log('[VIDEO API]   Status:', data.token_status);  // "new" or "reused"
console.log('[VIDEO API]   Generated:', data.token_generated_at);
console.log('[VIDEO API]   Expires:', data.token_expires_at);
console.log('[VIDEO API]   TTL (seconds):', data.token_ttl_seconds);
```

---

## 🔐 Token Validation Rules

### When to Reuse Token

- ✅ Token is still valid (not expired)
- ✅ Same channel name
- ✅ Same video call ID
- ✅ Generated less than 55 minutes ago (leave 5-minute buffer)

### When to Generate New Token

- ❌ Token is expired
- ❌ Different channel
- ❌ Different video call
- ❌ Older than 55 minutes
- ❌ First time user joins

---

## 🧪 Testing

### Test Token Generation

```bash
# Start call as teacher
curl -X POST http://localhost:8000/api/video/initiate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"call_type": "one_to_one", "student_id": 2, "subject_id": 4}'

# Response should include token_status, token_generated_at, token_expires_at
```

### Test Token Reuse

```bash
# Make the same initiate call again within 1 hour
# Should get token_status: "reused" if logic is implemented

# Or generate new by waiting for expiration or using different student_id
```

---

## 📊 Response Timestamps Example

```
Token generated: 2026-02-24T10:30:45.123456Z
Token expires:   2026-02-24T11:30:45.123456Z
TTL (seconds):   3600

Frontend receives:
- token_status: "new"           (helps identify if this is fresh)
- token_generated_at: ISO date  (debugging timestamp)
- token_expires_at: ISO date    (know when to refresh)
- token_ttl_seconds: 3600       (easy calculation, no date parsing)
```

---

## ⚠️ Important Notes

1. **Token TTL:** Always 3600 seconds (1 hour) as per Agora requirements
2. **Timezone:** Use UTC/ISO 8601 format for timestamps
3. **Token Generation:** Use Agora's official token builder library
4. **Token Storage:** Don't hardcode tokens; generate fresh on each request
5. **Security:** Verify user authentication before generating tokens
6. **Logging:** Log token generation for audit trail

---

