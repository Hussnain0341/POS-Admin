# 🧪 Quick Test Scripts for License Validation

## Test License Validation

### Test 1: Validate License (cURL)

```bash
curl -X POST https://api.zentryasolutions.com/api/license/validate \
  -H "Content-Type: application/json" \
  -d '{
    "licenseKey": "HK-XXXX-XXXX-XXXX",
    "deviceId": "test-device-12345",
    "appVersion": "1.0.0"
  }'
```

**Replace `HK-XXXX-XXXX-XXXX` with an actual license key from your admin panel.**

### Test 2: Check Status (cURL)

```bash
# First get licenseId from validate response, then:
curl "https://api.zentryasolutions.com/api/license/status?licenseId=YOUR-LICENSE-ID&deviceId=test-device-12345"
```

### Test 3: JavaScript Test (Browser Console)

```javascript
// Test validation
fetch('https://api.zentryasolutions.com/api/license/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    licenseKey: 'HK-XXXX-XXXX-XXXX', // Replace with actual key
    deviceId: 'test-device-12345',
    appVersion: '1.0.0'
  })
})
.then(r => r.json())
.then(data => console.log('Result:', data))
.catch(err => console.error('Error:', err));
```

### Test 4: Python Test

```python
import requests

url = "https://api.zentryasolutions.com/api/license/validate"
data = {
    "licenseKey": "HK-XXXX-XXXX-XXXX",  # Replace with actual key
    "deviceId": "test-device-12345",
    "appVersion": "1.0.0"
}

response = requests.post(url, json=data)
print(response.json())
```

---

## Expected Responses

### ✅ Valid License Response

```json
{
  "valid": true,
  "licenseId": "550e8400-e29b-41d4-a716-446655440000",
  "tenantName": "My Shop",
  "features": {},
  "expiryDate": "2025-12-31",
  "maxUsers": 5,
  "maxDevices": 3
}
```

### ❌ Invalid License Response

```json
{
  "valid": false,
  "reason": "License key not found"
}
```

---

## Get a Test License Key

1. Go to: `https://api.zentryasolutions.com/licenses`
2. Login with: `admin` / `admin123`
3. Click "Create License"
4. Copy the generated license key
5. Use it in the test requests above

