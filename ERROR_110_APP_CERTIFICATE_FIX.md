# 🔐 Fix Error 110 - App Certificate Issue

## The Real Problem

Your backend is generating tokens, but **Error 110** means the token is invalid for that App ID.

This happens when:
- ❌ App Certificate is wrong/doesn't match
- ❌ Token signing is incorrect
- ❌ Token format is invalid

---

## ✅ Solution: Verify App Certificate

### Step 1: Get App Certificate from Agora Console

1. Go to https://console.agora.io
2. Select your project
3. Go to **Project Settings**
4. Find **Primary Certificate** (also called "App Certificate")
5. Copy the full certificate (usually 32 characters, looks like: `abc123def456...`)

**Your App Certificate should look like:**
```
[32 character hex string]
```

### Step 2: Check Your Backend `.env` File

Your Django backend needs this in `.env`:

```
AGORA_APP_ID=5918efb24fd94892b6e2b7a61600242f
AGORA_APP_CERTIFICATE=[YOUR_32_CHAR_CERTIFICATE]
```

**Is this set correctly?** Check your:
- `.env` file
- `settings.py`
- Environment variables

### Step 3: Verify Token Generation Code

Your backend should use **agora-token-builder**:

```bash
pip install agora-token-builder
```

And generate tokens like this:

```python
from agora_token_builder import RtcTokenBuilder
import os

def generate_agora_token(channel_name, uid):
    app_id = os.getenv('AGORA_APP_ID')
    app_certificate = os.getenv('AGORA_APP_CERTIFICATE')
    
    token = RtcTokenBuilder.buildTokenWithUid(
        appId=app_id,
        appCertificate=app_certificate,
        channelName=channel_name,
        uid=uid,
        role=RtcTokenBuilder.RolePublisher,
        privilegeExpiredTs=int(time.time()) + 3600  # 1 hour
    )
    
    return token
```

**Check your backend uses this exact pattern!**

---

## 🚀 Quick Fix Steps

1. **Get App Certificate** from Agora console
2. **Update `.env`** with correct certificate
3. **Verify TokenBuilder** usage in backend
4. **Restart Django:** `python manage.py runserver`
5. **Rebuild frontend:** `npx react-native start --reset-cache && npx react-native run-android`

---

## 🧪 Test Token Generation

Your token should look like:
```
007[APP_ID][DATA][SIGNATURE]
```

Example (yours):
```
0075918efb24fd94892b6e2b7a61600242fchannel_8_1771910775_b2d8aabd...
↑↑↑ ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑ 
Ver  App ID (matches frontend ✓)
```

If this matches your App ID, then **the issue is the certificate**.

---

## ✅ Checklist

- [ ] Found App Certificate in Agora console
- [ ] App Certificate is in backend `.env`
- [ ] Backend uses `agora-token-builder` correctly
- [ ] Django restart after `.env` change
- [ ] Frontend rebuilt with clean cache
- [ ] Token still has correct App ID in it

---

## 📋 What to Provide

To help you further, share:

```
Frontend App ID: 5918efb24fd94892b6e2b7a61600242f
Console App ID: [CHECK]
Console Certificate: [CHECK]
Backend using: [TokenBuilder/other?]
Backend .env has certificate: [YES/NO]
```

---

