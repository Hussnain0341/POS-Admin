# API Documentation - HisaabKitab License Admin System

## Base URL

Production: `https://your-domain.com/api`  
Development: `http://localhost:3001/api`

## Authentication

Most admin endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <token>
```

## Admin Endpoints

### POST /api/admin/login

Admin login endpoint.

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "admin",
    "role": "superadmin"
  }
}
```

### GET /api/admin/licenses

Get all licenses with optional filters.

**Query Parameters:**
- `status` (optional): Filter by status (active, expired, revoked, suspended)
- `tenantName` (optional): Search by tenant name (partial match)
- `plan` (optional): Filter by plan
- `licenseKey` (optional): Search by license key (partial match)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)

**Response:**
```json
{
  "licenses": [
    {
      "id": "uuid",
      "licenseKey": "HK-XXXX-XXXX-XXXX",
      "tenantName": "Shop Name",
      "plan": "Pro",
      "maxDevices": 3,
      "maxUsers": 5,
      "features": {
        "reports": true,
        "profitLoss": true
      },
      "startDate": "2024-01-01",
      "expiryDate": "2024-12-31",
      "status": "active",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 50
}
```

### GET /api/admin/licenses/:id

Get a single license with activations.

**Response:**
```json
{
  "id": "uuid",
  "licenseKey": "HK-XXXX-XXXX-XXXX",
  "tenantName": "Shop Name",
  "plan": "Pro",
  "maxDevices": 3,
  "maxUsers": 5,
  "features": {
    "reports": true,
    "profitLoss": true
  },
  "startDate": "2024-01-01",
  "expiryDate": "2024-12-31",
  "status": "active",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z",
  "activations": [
    {
      "id": "uuid",
      "licenseId": "uuid",
      "deviceId": "hashed-device-id",
      "activatedAt": "2024-01-01T00:00:00Z",
      "lastCheck": "2024-01-15T00:00:00Z",
      "status": "active"
    }
  ]
}
```

### POST /api/admin/licenses

Create a new license.

**Request:**
```json
{
  "tenantName": "Shop Name",
  "plan": "Pro",
  "maxDevices": 3,
  "maxUsers": 5,
  "features": {
    "reports": true,
    "profitLoss": true
  },
  "startDate": "2024-01-01",
  "expiryDate": "2024-12-31",
  "licenseKey": "HK-XXXX-XXXX-XXXX" // Optional, auto-generated if not provided
}
```

**Response:**
```json
{
  "id": "uuid",
  "licenseKey": "HK-XXXX-XXXX-XXXX",
  "tenantName": "Shop Name",
  "plan": "Pro",
  "maxDevices": 3,
  "maxUsers": 5,
  "features": {
    "reports": true,
    "profitLoss": true
  },
  "startDate": "2024-01-01",
  "expiryDate": "2024-12-31",
  "status": "active",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### PUT /api/admin/licenses/:id

Update a license.

**Request:**
```json
{
  "tenantName": "Updated Shop Name",
  "maxDevices": 5,
  "expiryDate": "2025-12-31",
  "status": "active"
}
```

All fields are optional. Only provided fields will be updated.

**Response:**
Updated license object.

### POST /api/admin/licenses/:id/revoke

Revoke a license.

**Response:**
```json
{
  "id": "uuid",
  "licenseKey": "HK-XXXX-XXXX-XXXX",
  "status": "revoked",
  ...
}
```

### GET /api/admin/dashboard/stats

Get dashboard statistics.

**Response:**
```json
{
  "licenses": {
    "active_licenses": "50",
    "expired_licenses": "10",
    "revoked_licenses": "5",
    "total_licenses": "65"
  },
  "activations": {
    "total_devices": "120"
  }
}
```

### GET /api/admin/audit-logs

Get audit logs.

**Query Parameters:**
- `licenseId` (optional): Filter by license ID
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 100)

**Response:**
```json
[
  {
    "id": "uuid",
    "licenseId": "uuid",
    "action": "license_created",
    "details": {
      "licenseKey": "HK-XXXX-XXXX-XXXX",
      "tenantName": "Shop Name"
    },
    "ipAddress": "192.168.1.1",
    "userAgent": "Mozilla/5.0...",
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

## POS Integration Endpoints

### POST /api/license/validate

POS license validation (activation check). This endpoint does not require authentication.

**Request:**
```json
{
  "licenseKey": "HK-XXXX-XXXX-XXXX",
  "deviceId": "unique-device-fingerprint",
  "appVersion": "1.0.0" // Optional
}
```

**Response (Valid License):**
```json
{
  "valid": true,
  "licenseId": "uuid",
  "tenantName": "Shop Name",
  "features": {
    "reports": true,
    "profitLoss": true
  },
  "expiryDate": "2024-12-31",
  "maxUsers": 5,
  "maxDevices": 3
}
```

**Response (Invalid License):**
```json
{
  "valid": false,
  "reason": "License has expired",
  "expiryDate": "2023-12-31"
}
```

Possible reasons:
- `License key not found`
- `License is revoked`
- `License is expired`
- `Maximum device limit reached`
- `License is suspended`

### GET /api/license/status

POS periodic status check. This endpoint does not require authentication.

**Query Parameters:**
- `licenseId`: License ID
- `deviceId`: Device fingerprint

**Response (Valid):**
```json
{
  "valid": true,
  "status": "active",
  "features": {
    "reports": true,
    "profitLoss": true
  },
  "expiryDate": "2024-12-31",
  "maxUsers": 5,
  "lastCheck": "2024-01-15T00:00:00Z"
}
```

**Response (Invalid):**
```json
{
  "valid": false,
  "status": "expired",
  "reason": "License has expired",
  "expiryDate": "2023-12-31"
}
```

## Error Responses

All endpoints may return error responses:

**400 Bad Request:**
```json
{
  "error": "Validation error",
  "errors": [
    {
      "msg": "Tenant name is required",
      "param": "tenantName"
    }
  ]
}
```

**401 Unauthorized:**
```json
{
  "error": "Access token required"
}
```

**403 Forbidden:**
```json
{
  "error": "Invalid or expired token"
}
```

**404 Not Found:**
```json
{
  "error": "License not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error"
}
```

## POS Integration Example

```javascript
// POS License Validation
async function validateLicense(licenseKey, deviceId) {
  try {
    const response = await fetch('https://your-domain.com/api/license/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        licenseKey,
        deviceId,
        appVersion: '1.0.0'
      })
    });

    const data = await response.json();
    
    if (data.valid) {
      // Store license info locally (encrypted)
      localStorage.setItem('license', JSON.stringify(data));
      return true;
    } else {
      console.error('License validation failed:', data.reason);
      return false;
    }
  } catch (error) {
    console.error('License server unavailable:', error);
    // Check grace period
    const lastCheck = localStorage.getItem('lastLicenseCheck');
    if (lastCheck) {
      const daysSinceCheck = (Date.now() - parseInt(lastCheck)) / (1000 * 60 * 60 * 24);
      if (daysSinceCheck > 7) {
        // Grace period exceeded
        return false;
      }
    }
    return true; // Allow offline operation within grace period
  }
}

// Periodic Status Check
async function checkLicenseStatus(licenseId, deviceId) {
  try {
    const response = await fetch(
      `http://localhost:3001/api/license/status?licenseId=${licenseId}&deviceId=${deviceId}`
    );
    const data = await response.json();
    
    if (data.valid) {
      localStorage.setItem('lastLicenseCheck', Date.now().toString());
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error('Status check failed:', error);
    // Use grace period logic
    return true;
  }
}
```

## License Key Format

License keys follow the format: `HK-XXXX-XXXX-XXXX`

Where `XXXX` represents 4 alphanumeric characters (uppercase).

Example: `HK-A1B2-C3D4-E5F6`

## Security Notes

1. Device IDs are hashed using SHA-256 before storage
2. All admin endpoints require JWT authentication
3. POS endpoints are public but validate license status
4. HTTPS is required in production
5. Audit logs track all license operations

