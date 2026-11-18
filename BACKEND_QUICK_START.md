# ✅ Frontend Updated - Backend Installation Guide

## 📝 Status

### Frontend ✅ COMPLETE
- Types updated (token fields optional)
- API logging updated (handles missing fields)
- Video room screens updated (graceful degradation)
- Error dialogs work with or without token status

### Backend ⏳ YOUR TASK
Add 4 new fields to both endpoints:
- `token_status`
- `token_generated_at`
- `token_expires_at`
- `token_ttl_seconds`

---

## 🎯 Quick Implementation (5 minutes)

Your Django view currently returns this:

```python
response_data = {
    'id': 54,
    'channel_name': 'channel_8_1771909766_6a989347',
    'call_type': 'one_to_one',
    'status': 'initiated',
    'call_link': 'smarttutor://video?channel=...',
    'token': '007591...',
    'uid': 1,
    'message': 'Video call initiated and selected students saved in call participants.'
}
return Response(response_data, status=status.HTTP_201_CREATED)
```

**Just add this before the return:**

```python
from django.utils import timezone
from datetime import timedelta

token_generated_at = timezone.now()
response_data['token_status'] = 'new'
response_data['token_generated_at'] = token_generated_at.isoformat()
response_data['token_expires_at'] = (token_generated_at + timedelta(hours=1)).isoformat()
response_data['token_ttl_seconds'] = 3600
```

**Result:**

```python
response_data = {
    ...existing fields...,
    'token_status': 'new',
    'token_generated_at': '2026-02-24T10:30:45.123456Z',
    'token_expires_at': '2026-02-24T11:30:45.123456Z',
    'token_ttl_seconds': 3600
}
```

---

## 📍 What You Need to Update

### File: Your Django View (likely `/api/video/views.py` or `/api/video/InitiateVideoCall`)

**Location 1:** `POST /api/video/initiate` endpoint

Find where you return the response and add the 4 fields.

**Location 2:** `POST /api/video/join` endpoint

Same addition for the join endpoint.

---

## 🔍 Example Complete View

```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from datetime import timedelta

class InitiateVideoCall(APIView):
    def post(self, request):
        # Your existing logic to validate, create call, generate token...
        
        video_call = VideoCall.objects.create(
            teacher=request.user,
            channel_name=channel_name,
            token=agora_token,
            # ... other fields ...
        )
        
        # GET CURRENT TIME FOR TOKEN DETAILS
        token_generated_at = timezone.now()
        
        # BUILD RESPONSE WITH NEW FIELDS
        response_data = {
            'id': video_call.id,
            'channel_name': video_call.channel_name,
            'call_type': call_type,
            'status': 'initiated',
            'call_link': f'smarttutor://video?channel={video_call.channel_name}...&call_id={video_call.id}',
            'token': agora_token,
            'uid': 1,
            'message': 'Video call initiated and selected students saved in call participants.',
            
            # ✨ NEW FIELDS ✨
            'token_status': 'new',  # Always new since you always generate fresh
            'token_generated_at': token_generated_at.isoformat(),  # 2026-02-24T10:30:45.123456Z
            'token_expires_at': (token_generated_at + timedelta(hours=1)).isoformat(),  # 1 hour later
            'token_ttl_seconds': 3600,  # Agora requirement: 1 hour in seconds
        }
        
        return Response(response_data, status=status.HTTP_201_CREATED)
```

---

## ✅ Testing Checklist

- [ ] Update your initiate view (add 4 fields before return)
- [ ] Update your join view (add 4 fields before return)
- [ ] Test with curl or Postman
- [ ] Verify response includes all 4 new fields
- [ ] Verify timestamp format is ISO 8601 (ends with Z)
- [ ] Verify token_status is "new"
- [ ] Verify token_ttl_seconds is 3600
- [ ] Restart Django server
- [ ] Test from mobile app

---

## 📊 Expected Response Format

After your backend update:

```json
{
  "id": 54,
  "channel_name": "channel_8_1771909766_6a989347",
  "call_type": "one_to_one",
  "status": "initiated",
  "call_link": "smarttutor://video?channel=channel_8_1771909766_6a989347&call_id=54&role=student",
  "token": "0075918efb24fd94892b6e2b7a61600242fchannel_8_1771909766_6a989347177192776813600msg:1:join:1:pub_a:1:pub_v:1:pub_d:1:dq+QP6hJw9P/JM6JrK5tYBk3Ag5Gw9ZLjjfgCbjeHwQ=",
  "uid": 1,
  "message": "Video call initiated and selected students saved in call participants.",
  
  "token_status": "new",
  "token_generated_at": "2026-02-24T10:30:45.123456Z",
  "token_expires_at": "2026-02-24T11:30:45.123456Z",
  "token_ttl_seconds": 3600
}
```

---

## 🔗 Reference Files

- **[BACKEND_IMPLEMENTATION_GUIDE.md](BACKEND_IMPLEMENTATION_GUIDE.md)** - Full backend implementation with Django examples
- **[TOKEN_STATUS_BACKEND_CHECKLIST.md](TOKEN_STATUS_BACKEND_CHECKLIST.md)** - Implementation checklist
- **Frontend is already prepared** - No further frontend changes needed

---

## 💡 Why These Fields?

| Field | Purpose | Example |
|-------|---------|---------|
| `token_status` | Indicates if token is new/fresh | `"new"` |
| `token_generated_at` | When token was created | `"2026-02-24T10:30:45.123456Z"` |
| `token_expires_at` | When token expires | `"2026-02-24T11:30:45.123456Z"` |
| `token_ttl_seconds` | Time until expiration in seconds | `3600` |

These help frontend developers:
- Know when token expires
- Handle token refresh/renewal
- Debug expiration-related issues
- Display token status in error messages

---

## 🚨 Common Mistakes to Avoid

❌ Wrong format: `'2026-02-24 10:30:45'` (missing Z and microseconds)
✅ Correct format: `'2026-02-24T10:30:45.123456Z'` (use `.isoformat()`)

❌ Wrong TTL: `'1 hour'` or `'life=3600'`
✅ Correct TTL: `3600` (integer, in seconds)

❌ Wrong status: `'fresh'` or `'generated'`
✅ Correct status: `'new'` (since you always generate new)

---

## ⏱️ Time Estimate

- **Simple addition (copy-paste):** 5 minutes
- **With testing:** 15 minutes
- **With deployment:** 30 minutes

---

## 🆘 Need Help?

See **[BACKEND_IMPLEMENTATION_GUIDE.md](BACKEND_IMPLEMENTATION_GUIDE.md)** for:
- Full Django implementation
- Serializer examples
- Test cases
- Troubleshooting

---

