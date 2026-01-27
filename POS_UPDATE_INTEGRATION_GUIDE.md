# HisaabKitab POS Desktop - Update Integration Guide

## Overview
This guide explains how your POS desktop application should integrate with the update API to check for updates, download them, and install them automatically.

---

## API Endpoints

### 1. Check for Updates (Public API)
**Endpoint:** `GET /pos-updates/latest`

**Base URL:**
- Production: `https://api.zentryasolutions.com`
- Development: `http://localhost:3001`

**Full URL:** `https://api.zentryasolutions.com/pos-updates/latest`

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `platform` | string | No | `windows` | Platform identifier (`windows`, `mac`, `linux`) |

**Example Request:**
```http
GET https://api.zentryasolutions.com/pos-updates/latest?platform=windows
```

**Success Response (200 OK):**
```json
{
  "version": "1.2.0",
  "download_url": "https://api.zentryasolutions.com/pos-updates/files/windows/1.2.0/HisaabKitab-Setup-1.2.0.exe",
  "checksum": "a3f5b8c9d2e1f4a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0",
  "mandatory": false,
  "release_date": "2024-01-15T10:30:00.000Z"
}
```

**Response Fields:**
- `version` (string): Version number in semantic versioning format (e.g., "1.2.0")
- `download_url` (string): Direct download URL for the installer file
- `checksum` (string): SHA256 checksum of the file for integrity verification
- `mandatory` (boolean): Whether this update is mandatory (user cannot skip)
- `release_date` (string): ISO 8601 timestamp of when the version was published

**Error Responses:**

**404 Not Found** (No live version available):
```json
{
  "error": "No live version available",
  "version": null
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error"
}
```

---

### 2. Download Update File
**Endpoint:** Direct file download from `download_url` in the response above.

**Example:**
```http
GET https://api.zentryasolutions.com/pos-updates/files/windows/1.2.0/HisaabKitab-Setup-1.2.0.exe
```

**Response:**
- Content-Type: `application/x-msdownload` or `application/octet-stream`
- Content-Disposition: `attachment; filename="HisaabKitab-Setup-1.2.0.exe"`
- File stream (binary data)

---

## End-to-End Integration Flow

### Step 1: Check Current Version
Your POS app should store its current version (e.g., in a config file, registry, or database).

**Example Storage:**
```json
{
  "version": "1.1.0",
  "installPath": "C:\\Program Files\\HisaabKitab",
  "lastUpdateCheck": "2024-01-10T08:00:00.000Z"
}
```

---

### Step 2: Check for Updates
Periodically check for updates (recommended: on app startup and every 24 hours).

**Pseudo-code:**
```javascript
async function checkForUpdates() {
  try {
    const currentVersion = getCurrentVersion(); // e.g., "1.1.0"
    const platform = getPlatform(); // "windows"
    
    const response = await fetch(
      `https://api.zentryasolutions.com/pos-updates/latest?platform=${platform}`
    );
    
    if (response.status === 404) {
      console.log("No updates available");
      return { hasUpdate: false };
    }
    
    if (!response.ok) {
      throw new Error(`Update check failed: ${response.status}`);
    }
    
    const updateInfo = await response.json();
    const latestVersion = updateInfo.version;
    
    // Compare versions (semantic versioning)
    if (compareVersions(latestVersion, currentVersion) > 0) {
      return {
        hasUpdate: true,
        updateInfo: updateInfo
      };
    }
    
    return { hasUpdate: false };
  } catch (error) {
    console.error("Update check error:", error);
    return { hasUpdate: false, error: error.message };
  }
}
```

**Version Comparison Function:**
```javascript
function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;
    
    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }
  
  return 0;
}
```

---

### Step 3: Notify User (Optional for Non-Mandatory Updates)
If update is available and not mandatory, show a notification to the user.

**Example UI:**
```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Update Available                   â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ Version 1.2.0 is now available.   â”‚
â”‚                                     â”‚
â”‚ [Download Now]  [Remind Later]     â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**For Mandatory Updates:**
- Show a blocking dialog
- User cannot proceed without updating
- Auto-download starts immediately

---

### Step 4: Download Update File
Download the installer file from the `download_url`.

**Pseudo-code:**
```javascript
async function downloadUpdate(updateInfo, progressCallback) {
  try {
    const downloadUrl = updateInfo.download_url;
    const response = await fetch(downloadUrl);
    
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }
    
    const contentLength = parseInt(response.headers.get('content-length') || '0');
    const reader = response.body.getReader();
    const chunks = [];
    let receivedLength = 0;
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      chunks.push(value);
      receivedLength += value.length;
      
      // Report progress
      if (progressCallback && contentLength > 0) {
        const progress = (receivedLength / contentLength) * 100;
        progressCallback(progress, receivedLength, contentLength);
      }
    }
    
    // Combine chunks into single buffer
    const allChunks = new Uint8Array(receivedLength);
    let position = 0;
    for (const chunk of chunks) {
      allChunks.set(chunk, position);
      position += chunk.length;
    }
    
    return allChunks;
  } catch (error) {
    console.error("Download error:", error);
    throw error;
  }
}
```

---

### Step 5: Verify File Integrity
Verify the downloaded file using SHA256 checksum.

**Pseudo-code:**
```javascript
const crypto = require('crypto'); // Node.js
// OR use a crypto library for your desktop framework

async function verifyChecksum(fileBuffer, expectedChecksum) {
  const hash = crypto.createHash('sha256');
  hash.update(fileBuffer);
  const calculatedChecksum = hash.digest('hex');
  
  if (calculatedChecksum.toLowerCase() !== expectedChecksum.toLowerCase()) {
    throw new Error("Checksum mismatch! File may be corrupted.");
  }
  
  return true;
}
```

**If checksum fails:**
- Delete the corrupted file
- Retry download (max 3 attempts)
- Show error to user

---

### Step 6: Save Installer File
Save the downloaded file to a temporary location.

**Example Paths:**
- Windows: `%TEMP%\HisaabKitab-Updates\HisaabKitab-Setup-1.2.0.exe`
- Or: `C:\Users\{User}\AppData\Local\HisaabKitab\Updates\`

**Pseudo-code:**
```javascript
const fs = require('fs');
const path = require('path');
const os = require('os');

function getTempUpdatePath(filename) {
  const tempDir = path.join(os.tmpdir(), 'HisaabKitab-Updates');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  return path.join(tempDir, filename);
}

async function saveInstaller(fileBuffer, filename) {
  const filePath = getTempUpdatePath(filename);
  fs.writeFileSync(filePath, fileBuffer);
  return filePath;
}
```

---

### Step 7: Install Update
Execute the installer file.

**Windows (Node.js/Electron):**
```javascript
const { spawn } = require('child_process');
const path = require('path');

async function installUpdate(installerPath) {
  return new Promise((resolve, reject) => {
    // For silent installation (if installer supports it)
    const installer = spawn(installerPath, ['/S', '/NCRC'], {
      detached: true,
      stdio: 'ignore'
    });
    
    installer.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Installer exited with code ${code}`));
      }
    });
    
    installer.on('error', (error) => {
      reject(error);
    });
    
    // Unref to allow parent process to exit
    installer.unref();
  });
}
```

**Windows (C#/.NET):**
```csharp
using System.Diagnostics;

public async Task InstallUpdate(string installerPath)
{
    var processInfo = new ProcessStartInfo
    {
        FileName = installerPath,
        Arguments = "/S /NCRC", // Silent install, no CRC check
        UseShellExecute = true,
        CreateNoWindow = true
    };
    
    var process = Process.Start(processInfo);
    await process.WaitForExitAsync();
    
    if (process.ExitCode != 0)
    {
        throw new Exception($"Installer exited with code {process.ExitCode}");
    }
}
```

**Important Notes:**
- The installer should handle closing the current application
- After installation, the new version should start automatically
- Clean up old installer files after successful installation

---

### Step 8: Post-Installation Verification
After installation, verify the new version is running.

**Pseudo-code:**
```javascript
function verifyInstallation() {
  const newVersion = getCurrentVersion();
  const expectedVersion = updateInfo.version;
  
  if (newVersion === expectedVersion) {
    console.log("Update installed successfully!");
    // Clean up old installer files
    cleanupOldInstallers();
    return true;
  } else {
    console.error("Version mismatch after installation!");
    return false;
  }
}
```

---

## Complete Integration Example

### Main Update Manager Class

```javascript
class UpdateManager {
  constructor(config) {
    this.apiBaseUrl = config.apiBaseUrl || 'https://api.zentryasolutions.com';
    this.currentVersion = config.currentVersion;
    this.platform = config.platform || 'windows';
    this.checkInterval = config.checkInterval || 24 * 60 * 60 * 1000; // 24 hours
    this.onUpdateAvailable = config.onUpdateAvailable || null;
    this.onDownloadProgress = config.onDownloadProgress || null;
  }
  
  // Start automatic update checking
  startAutoCheck() {
    // Check immediately
    this.checkForUpdates();
    
    // Then check periodically
    setInterval(() => {
      this.checkForUpdates();
    }, this.checkInterval);
  }
  
  // Check for updates
  async checkForUpdates() {
    try {
      const url = `${this.apiBaseUrl}/pos-updates/latest?platform=${this.platform}`;
      const response = await fetch(url);
      
      if (response.status === 404) {
        return { hasUpdate: false };
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const updateInfo = await response.json();
      
      if (this.compareVersions(updateInfo.version, this.currentVersion) > 0) {
        if (this.onUpdateAvailable) {
          this.onUpdateAvailable(updateInfo);
        }
        return { hasUpdate: true, updateInfo };
      }
      
      return { hasUpdate: false };
    } catch (error) {
      console.error('Update check failed:', error);
      return { hasUpdate: false, error: error.message };
    }
  }
  
  // Download and install update
  async downloadAndInstall(updateInfo) {
    try {
      // Step 1: Download
      console.log('Downloading update...');
      const fileBuffer = await this.downloadUpdate(updateInfo, (progress) => {
        if (this.onDownloadProgress) {
          this.onDownloadProgress(progress);
        }
      });
      
      // Step 2: Verify checksum
      console.log('Verifying file integrity...');
      await this.verifyChecksum(fileBuffer, updateInfo.checksum);
      
      // Step 3: Save to temp location
      const filename = this.extractFilename(updateInfo.download_url);
      const installerPath = this.saveInstaller(fileBuffer, filename);
      
      // Step 4: Install
      console.log('Installing update...');
      await this.installUpdate(installerPath);
      
      console.log('Update installed successfully!');
      return { success: true };
    } catch (error) {
      console.error('Update installation failed:', error);
      throw error;
    }
  }
  
  // Helper: Compare versions
  compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;
      
      if (part1 > part2) return 1;
      if (part1 < part2) return -1;
    }
    
    return 0;
  }
  
  // Helper: Extract filename from URL
  extractFilename(url) {
    const parts = url.split('/');
    return parts[parts.length - 1];
  }
  
  // Download implementation (see Step 4 above)
  async downloadUpdate(updateInfo, progressCallback) {
    // Implementation from Step 4
  }
  
  // Verify checksum (see Step 5 above)
  async verifyChecksum(fileBuffer, expectedChecksum) {
    // Implementation from Step 5
  }
  
  // Save installer (see Step 6 above)
  saveInstaller(fileBuffer, filename) {
    // Implementation from Step 6
  }
  
  // Install update (see Step 7 above)
  async installUpdate(installerPath) {
    // Implementation from Step 7
  }
}
```

### Usage Example

```javascript
// Initialize update manager
const updateManager = new UpdateManager({
  currentVersion: '1.1.0',
  platform: 'windows',
  apiBaseUrl: 'https://api.zentryasolutions.com',
  onUpdateAvailable: (updateInfo) => {
    // Show notification to user
    if (updateInfo.mandatory) {
      // Force update
      updateManager.downloadAndInstall(updateInfo);
    } else {
      // Ask user
      const userChoice = showUpdateDialog(updateInfo);
      if (userChoice === 'install') {
        updateManager.downloadAndInstall(updateInfo);
      }
    }
  },
  onDownloadProgress: (progress) => {
    console.log(`Download progress: ${progress.toFixed(1)}%`);
  }
});

// Start automatic checking
updateManager.startAutoCheck();
```

---

## Error Handling

### Network Errors
- Retry with exponential backoff (3 attempts)
- Show user-friendly error message
- Allow manual retry

### Checksum Mismatch
- Delete corrupted file
- Retry download
- If fails 3 times, show error and allow manual download

### Installation Failures
- Log error details
- Show user-friendly message
- Provide manual installation instructions
- Keep old version running

---

## Security Considerations

1. **HTTPS Only**: Always use HTTPS in production
2. **Checksum Verification**: Always verify file integrity before installation
3. **Signed Installers**: Consider code signing your installer files
4. **User Permissions**: Ensure installer has necessary permissions
5. **Rollback Capability**: Keep previous version for rollback if needed

---

## Testing Checklist

- [ ] Check for updates when no update is available
- [ ] Check for updates when update is available
- [ ] Handle network errors gracefully
- [ ] Verify checksum validation works
- [ ] Test mandatory vs optional updates
- [ ] Test installation process
- [ ] Test rollback if installation fails
- [ ] Test on different Windows versions
- [ ] Test with slow/unstable network connections

---

## API Response Examples

### Success Response
```json
{
  "version": "1.2.0",
  "download_url": "https://api.zentryasolutions.com/pos-updates/files/windows/1.2.0/HisaabKitab-Setup-1.2.0.exe",
  "checksum": "a3f5b8c9d2e1f4a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0",
  "mandatory": false,
  "release_date": "2024-01-15T10:30:00.000Z"
}
```

### No Update Available (404)
```json
{
  "error": "No live version available",
  "version": null
}
```

### Server Error (500)
```json
{
  "error": "Internal server error"
}
```

---

## Support

For issues or questions:
- Check server logs in admin panel
- Verify API endpoint is accessible
- Ensure version format matches semantic versioning
- Contact admin if persistent issues occur

---

## Quick Reference

### API Endpoint
```
GET https://api.zentryasolutions.com/pos-updates/latest?platform=windows
```

### Response Fields
- `version`: Semantic version string (e.g., "1.2.0")
- `download_url`: Direct download URL for installer
- `checksum`: SHA256 hash for integrity verification
- `mandatory`: Boolean indicating if update is required
- `release_date`: ISO 8601 timestamp

### Integration Steps
1. Check current app version
2. Call API endpoint periodically
3. Compare versions using semantic versioning
4. Download file if update available
5. Verify SHA256 checksum
6. Save to temp directory
7. Execute installer
8. Verify installation success

---

**Document Version:** 1.0  
**Last Updated:** 2024-01-15  
**API Version:** v1
