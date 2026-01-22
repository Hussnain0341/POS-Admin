# 🔐 License Validation API Documentation

## Overview

The License Validation API allows your POS application to verify license keys and check if they are valid, active, and bound to devices.

**Base URL:** `https://api.zentryasolutions.com/api`

---

## Endpoint 1: Validate License (Activation Check)

**Primary endpoint for license verification and device activation.**

### Request

**Method:** `POST`  
**URL:** `https://api.zentryasolutions.com/api/license/validate`  
**Content-Type:** `application/json`

### Required Parameters

```json
{
  "licenseKey": "HK-XXXX-XXXX-XXXX",
  "deviceId": "unique-device-identifier"
}
```

### Optional Parameters

```json
{
  "licenseKey": "HK-XXXX-XXXX-XXXX",
  "deviceId": "unique-device-identifier",
  "appVersion": "1.0.0"
}
```

### Parameter Details

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `licenseKey` | string | ✅ Yes | The license key in format `HK-XXXX-XXXX-XXXX` |
| `deviceId` | string | ✅ Yes | Unique device identifier (will be hashed before storage) |
| `appVersion` | string | ❌ No | Your POS app version (for tracking/audit) |

### Success Response (200 OK)

When license is valid and device can be activated:

```json
{
  "valid": true,
  "licenseId": "uuid-of-license",
  "tenantName": "Shop Name",
  "features": {
    "feature1": true,
    "feature2": false
  },
  "expiryDate": "2025-12-31",
  "maxUsers": 5,
  "maxDevices": 3
}
```

### Error Responses

#### License Not Found (200 OK)

```json
{
  "valid": false,
  "reason": "License key not found"
}
```

#### License Expired (200 OK)

```json
{
  "valid": false,
  "reason": "License has expired",
  "expiryDate": "2024-01-01"
}
```

#### License Revoked/Suspended (200 OK)

```json
{
  "valid": false,
  "reason": "License is revoked",
  "status": "revoked"
}
```

#### Device Limit Exceeded (200 OK)

```json
{
  "valid": false,
  "reason": "Maximum device limit reached",
  "maxDevices": 3,
  "currentDevices": 3
}
```

#### Invalid Request (400 Bad Request)

```json
{
  "errors": [
    {
      "msg": "License key is required",
      "param": "licenseKey"
    }
  ]
}
```

### Example cURL Request

```bash
curl -X POST https://api.zentryasolutions.com/api/license/validate \
  -H "Content-Type: application/json" \
  -d '{
    "licenseKey": "HK-ABCD-1234-EFGH",
    "deviceId": "device-unique-id-12345",
    "appVersion": "1.0.0"
  }'
```

### Example JavaScript/TypeScript

```javascript
async function validateLicense(licenseKey, deviceId, appVersion = null) {
  const response = await fetch('https://api.zentryasolutions.com/api/license/validate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      licenseKey,
      deviceId,
      appVersion
    })
  });
  
  const data = await response.json();
  return data;
}

// Usage
const result = await validateLicense('HK-ABCD-1234-EFGH', 'device-12345', '1.0.0');
if (result.valid) {
  console.log('License valid!', result);
} else {
  console.error('License invalid:', result.reason);
}
```

---

## Endpoint 2: Status Check (Periodic Validation)

**Use this for periodic checks after initial activation.**

### Request

**Method:** `GET`  
**URL:** `https://api.zentryasolutions.com/api/license/status`  
**Query Parameters:** `licenseId` and `deviceId`

### Required Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `licenseId` | UUID | ✅ Yes | License ID returned from `/validate` endpoint |
| `deviceId` | string | ✅ Yes | Same device ID used in `/validate` |

### Success Response (200 OK)

```json
{
  "valid": true,
  "status": "active",
  "features": {
    "feature1": true,
    "feature2": false
  },
  "expiryDate": "2025-12-31",
  "maxUsers": 5,
  "lastCheck": "2024-01-22T21:30:00.000Z"
}
```

### Error Responses

#### Device Not Activated (200 OK)

```json
{
  "valid": false,
  "reason": "Device not activated for this license"
}
```

#### License Expired (200 OK)

```json
{
  "valid": false,
  "reason": "License has expired",
  "expiryDate": "2024-01-01"
}
```

#### Device Blocked (200 OK)

```json
{
  "valid": false,
  "status": "blocked",
  "reason": "Device activation is blocked"
}
```

### Example cURL Request

```bash
curl "https://api.zentryasolutions.com/api/license/status?licenseId=uuid-here&deviceId=device-unique-id-12345"
```

### Example JavaScript/TypeScript

```javascript
async function checkLicenseStatus(licenseId, deviceId) {
  const url = `https://api.zentryasolutions.com/api/license/status?licenseId=${licenseId}&deviceId=${deviceId}`;
  const response = await fetch(url);
  const data = await response.json();
  return data;
}

// Usage
const status = await checkLicenseStatus('license-uuid', 'device-12345');
if (status.valid) {
  console.log('License still valid!', status);
} else {
  console.error('License issue:', status.reason);
}
```

---

## Complete Integration Example

```javascript
class LicenseValidator {
  constructor(baseUrl = 'https://api.zentryasolutions.com/api') {
    this.baseUrl = baseUrl;
    this.licenseId = null;
    this.deviceId = this.getDeviceId();
  }

  // Generate or retrieve unique device ID
  getDeviceId() {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      // Generate unique device ID (use device fingerprint, MAC address, etc.)
      deviceId = this.generateDeviceId();
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  generateDeviceId() {
    // Use device fingerprint, MAC address, or other unique identifier
    // This is just an example
    return `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Validate license (call this on app startup)
  async validate(licenseKey, appVersion = null) {
    try {
      const response = await fetch(`${this.baseUrl}/license/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          licenseKey,
          deviceId: this.deviceId,
          appVersion
        })
      });

      const data = await response.json();

      if (data.valid) {
        // Store license ID for status checks
        this.licenseId = data.licenseId;
        localStorage.setItem('licenseId', data.licenseId);
        localStorage.setItem('licenseKey', licenseKey);
        
        return {
          success: true,
          data: data
        };
      } else {
        return {
          success: false,
          reason: data.reason,
          data: data
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Check status periodically (call this every few minutes)
  async checkStatus() {
    if (!this.licenseId) {
      this.licenseId = localStorage.getItem('licenseId');
    }

    if (!this.licenseId) {
      return {
        success: false,
        reason: 'License not validated yet'
      };
    }

    try {
      const url = `${this.baseUrl}/license/status?licenseId=${this.licenseId}&deviceId=${this.deviceId}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.valid) {
        return {
          success: true,
          data: data
        };
      } else {
        return {
          success: false,
          reason: data.reason,
          data: data
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Usage in your POS app
const validator = new LicenseValidator();

// On app startup
const result = await validator.validate('HK-ABCD-1234-EFGH', '1.0.0');
if (result.success) {
  console.log('License activated!', result.data);
  // Start your app
} else {
  console.error('License validation failed:', result.reason);
  // Show error to user, prevent app from starting
}

// Periodic status check (every 5 minutes)
setInterval(async () => {
  const status = await validator.checkStatus();
  if (!status.success) {
    console.error('License status check failed:', status.reason);
    // Handle license issue (show warning, disable features, etc.)
  }
}, 5 * 60 * 1000); // 5 minutes
```

---

## Important Notes

### Device ID

- **Must be unique per device** - Use device fingerprint, MAC address, or hardware ID
- **Will be hashed** - The API hashes the device ID before storage for security
- **Must be consistent** - Use the same device ID for all requests from the same device
- **Storage** - Store device ID locally (localStorage, preferences, etc.)

### License Key Format

- Format: `HK-XXXX-XXXX-XXXX` (where X is alphanumeric)
- Case-insensitive (API converts to uppercase)
- Must match exactly as created in admin panel

### Validation Flow

1. **First Time (Activation):**
   - Call `/validate` with `licenseKey` and `deviceId`
   - If valid, store `licenseId` returned in response
   - Device is automatically activated

2. **Subsequent Checks:**
   - Call `/status` with `licenseId` and `deviceId`
   - This is faster and doesn't create new activations
   - Use for periodic validation (every 5-10 minutes)

3. **Re-validation:**
   - If `/status` fails, call `/validate` again
   - This will reactivate if license is still valid

### Error Handling

- All validation errors return HTTP 200 with `valid: false`
- Check `result.valid` to determine if license is valid
- Check `result.reason` for specific error message
- HTTP 400/500 errors indicate API/server issues

### Security

- **No authentication required** - These are public endpoints
- **Device ID is hashed** - Original device ID is never stored
- **Rate limiting** - API has rate limiting enabled
- **Audit logging** - All validation attempts are logged

---

## Testing

### Test with Valid License

```bash
# Replace with actual license key from admin panel
curl -X POST https://api.zentryasolutions.com/api/license/validate \
  -H "Content-Type: application/json" \
  -d '{
    "licenseKey": "HK-XXXX-XXXX-XXXX",
    "deviceId": "test-device-123",
    "appVersion": "1.0.0"
  }'
```

### Test with Invalid License

```bash
curl -X POST https://api.zentryasolutions.com/api/license/validate \
  -H "Content-Type: application/json" \
  -d '{
    "licenseKey": "HK-INVALID-KEY",
    "deviceId": "test-device-123"
  }'
```

---

## Response Fields Reference

### Success Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `valid` | boolean | `true` if license is valid |
| `licenseId` | UUID | Unique license identifier (store this) |
| `tenantName` | string | Shop/company name |
| `features` | object | Feature flags (key-value pairs) |
| `expiryDate` | string | License expiry date (YYYY-MM-DD) |
| `maxUsers` | number | Maximum number of POS users allowed |
| `maxDevices` | number | Maximum number of devices allowed |

### Error Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `valid` | boolean | Always `false` for errors |
| `reason` | string | Human-readable error reason |
| `status` | string | License status (if applicable) |
| `expiryDate` | string | Expiry date (if expired) |
| `maxDevices` | number | Device limit (if exceeded) |
| `currentDevices` | number | Current activations (if exceeded) |

---

**Need help?** Check the admin panel at `https://api.zentryasolutions.com/licenses` to view and manage licenses.

