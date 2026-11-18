# Image Loading Debug Guide

## How to Identify Backend vs Frontend Issue

### Step 1: Check Console Logs

When you load pending teachers and expand a teacher card:

**Look for these logs:**
```
[TEACHER 1] John Doe:
  - profile_picture: https://api.example.com/uploads/profile_123.jpg
  - cnic_image: https://api.example.com/uploads/cnic_123.jpg
  - degree_certificate: https://api.example.com/uploads/cert_123.jpg

[IMAGE LOAD START] profile-123
[IMAGE LOAD SUCCESS] profile-123
[IMAGE LOAD ERROR] cnic-123: Error loading image
```

### Step 2: Check Debug UI in the App

When you expand a teacher card, you'll see:

**🔧 Image URLs (Debug) section** that shows:
```
Profile: https://api.example.com/uploads/profile_123.jpg
CNIC: NOT PROVIDED
Degree: https://api.example.com/uploads/cert_123.jpg
```

## Diagnosing the Issue

### **Issue: URLs are NOT PROVIDED / MISSING**
🔴 **This is a BACKEND issue**
- The backend API is not returning image URLs
- Check: `getPendingTeachers()` API response
- Solution: Backend needs to return `profile_picture`, `cnic_image`, `degree_certificate` fields

### **Issue: URLs look like "null" or empty strings**
🔴 **This is a BACKEND issue**
- The backend is returning null/empty instead of actual URLs
- Check with: POST request to `/api/admin/teachers/pending`
- Expected response should have:
```json
{
  "profile_picture": "https://...",
  "cnic_image": "https://...",
  "degree_certificate": "https://..."
}
```

### **Issue: URLs are shown, but images fail to load**
❓ **Could be EITHER**

**Check these:**

1. **Are URLs accessible in browser?**
   - Copy the URL from debug section
   - Open in browser: `https://your-api.com/uploads/image.jpg`
   - If error → **BACKEND issue** (URL is wrong, file doesn't exist, no CORS)
   - If works → **FRONTEND issue** (how we're loading is wrong)

2. **Check file extensions**
   - Valid: `.jpg`, `.jpeg`, `.png`, `.gif`
   - Invalid: `.exe`, `.pdf`, `.docx` (won't display as images)

3. **Check file size**
   - Very large files (>10MB) may timeout
   - Optimal: 1-5MB per image

4. **Check CORS headers**
   - Backend must return: `Access-Control-Allow-Origin: *`
   - Or specific domain: `Access-Control-Allow-Origin: https://mobile-app-domain`

5. **Check if URLs are complete**
   - Should start with `http://` or `https://`
   - Invalid: `/uploads/image.jpg`, `image.jpg`, `uploads/image.jpg`

## Testing Image URLs

### Method 1: Test in Browser
```
1. Open Chrome/Firefox
2. Copy URL from debug section
3. Paste in address bar
4. Image should load
```

### Method 2: Use Mobile Network Inspector
- Android: Enable USB debugging, use Chrome DevTools
- iOS: Use Xcode console
- Look at network requests for:
  - ✅ 200 status = Success
  - ❌ 404 = File not found (backend)
  - ❌ 403 = Permission denied (backend)
  - ❌ CORS error = Missing headers (backend)

### Method 3: Check API Response Directly

**Windows PowerShell:**
```powershell
$uri = "http://your-api.com/api/admin/teachers/pending"
$headers = @{
    "Authorization" = "Bearer YOUR_TOKEN"
}
$response = Invoke-WebRequest -Uri $uri -Headers $headers -UseBasicParsing
$response.Content | ConvertFrom-Json | ConvertTo-Json | Out-String
```

Look for `profile_picture`, `cnic_image`, `degree_certificate` fields.

### Method 4: cURL Command
```bash
curl -X GET http://your-api.com/api/admin/teachers/pending \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

## Common Issues & Solutions

| Issue | Root Cause | Solution |
|-------|-----------|----------|
| `profile_picture: MISSING` | API not returning field | Backend must include field in response |
| `profile_picture: null` | Field exists but null | Backend must upload image or set URL |
| URL shown but image won't load | Invalid/broken URL | Check if URL works in browser |
| Image loads in browser but not in app | CORS issue | Backend must allow cross-origin requests |
| Warning icon appears on thumbnail | Network error during load | Check network, try again later |
| Degree cert doesn't show but profile does | Different file format | Ensure degree cert is jpg/png/gif |

## Error Messages in App

### "No Image Available"
- URL is empty or missing
- Tap: Shows which field is missing
- Fix: Backend needs to provide the URL

### Warning Icon (⚠) on Thumbnail
- Image failed to download
- Indicates network/URL issue
- Check: Is URL accessible in browser?

### "Error Loading Image" (in full viewer)
- Shows the URL and error details
- Common reasons:
  - File doesn't exist at URL
  - CORS not enabled
  - File format not supported
  - Server is down
  - Network timeout

## Next Steps

1. **Run the app on Android/iOS**
2. **Expand a pending teacher**
3. **Look at:**
   - 🔧 Debug section (shows all URLs)
   - Console logs (what succeeded/failed)
   - Image thumbnails (green = success, red = error)
4. **Take screenshot of:**
   - Debug URLs section
   - Console logs showing MISSING or errors
5. **Test URLs in browser** to see if backend files are accessible

## If Issue Persists

**Provide these details:**
1. Screenshot of 🔧 Image URLs (Debug) section
2. Screenshot of browser console logs
3. Result when testing URL directly in browser
4. Backend API response JSON (from curl or postman)
5. Screenshot of warning icons on thumbnails

---

**Remember:** 
- ✅ Profile picture loading = Frontend works fine
- ❌ CNIC/Certificate not loading = Either backend not returning, or wrong file format/location
