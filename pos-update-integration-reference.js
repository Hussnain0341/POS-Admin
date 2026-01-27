/**
 * =================================================================================
 * HISAABKITAB POS DESKTOP - UPDATE INTEGRATION GUIDE
 * =================================================================================
 * 
 * This file contains the complete integration guide for connecting your POS
 * desktop application with the update API server.
 * 
 * ENDPOINT: GET /pos-updates/latest
 * Base URL: https://api.zentryasolutions.com
 * Full URL: https://api.zentryasolutions.com/pos-updates/latest?platform=windows
 * 
 * =================================================================================
 * API RESPONSE STRUCTURE
 * =================================================================================
 */

// SUCCESS RESPONSE (200 OK):
const successResponse = {
  version: "1.2.0",                    // Semantic version (e.g., "1.2.0")
  download_url: "https://api.zentryasolutions.com/pos-updates/files/windows/1.2.0/HisaabKitab-Setup-1.2.0.exe",
  checksum: "a3f5b8c9d2e1f4a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0", // SHA256 hash
  mandatory: false,                     // true = user cannot skip, false = optional
  release_date: "2024-01-15T10:30:00.000Z" // ISO 8601 timestamp
};

// ERROR RESPONSE - NO UPDATE (404):
const noUpdateResponse = {
  error: "No live version available",
  version: null
};

// ERROR RESPONSE - SERVER ERROR (500):
const serverErrorResponse = {
  error: "Internal server error"
};

/**
 * =================================================================================
 * COMPLETE INTEGRATION EXAMPLE
 * =================================================================================
 */

class UpdateManager {
  constructor(config) {
    this.apiBaseUrl = config.apiBaseUrl || 'https://api.zentryasolutions.com';
    this.currentVersion = config.currentVersion; // e.g., "1.1.0"
    this.platform = config.platform || 'windows';
    this.checkInterval = config.checkInterval || 24 * 60 * 60 * 1000; // 24 hours
    this.onUpdateAvailable = config.onUpdateAvailable || null;
    this.onDownloadProgress = config.onDownloadProgress || null;
  }

  /**
   * Start automatic update checking
   * Call this when your app starts
   */
  startAutoCheck() {
    // Check immediately on startup
    this.checkForUpdates();
    
    // Then check periodically (every 24 hours by default)
    setInterval(() => {
      this.checkForUpdates();
    }, this.checkInterval);
  }

  /**
   * STEP 1: Check for updates
   * Returns: { hasUpdate: boolean, updateInfo?: object, error?: string }
   */
  async checkForUpdates() {
    try {
      const url = `${this.apiBaseUrl}/pos-updates/latest?platform=${this.platform}`;
      const response = await fetch(url);
      
      // No update available
      if (response.status === 404) {
        return { hasUpdate: false };
      }
      
      // Server error
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      // Parse response
      const updateInfo = await response.json();
      
      // Compare versions
      if (this.compareVersions(updateInfo.version, this.currentVersion) > 0) {
        // Update available - notify callback
        if (this.onUpdateAvailable) {
          this.onUpdateAvailable(updateInfo);
        }
        return { hasUpdate: true, updateInfo };
      }
      
      // No update needed
      return { hasUpdate: false };
    } catch (error) {
      console.error('Update check failed:', error);
      return { hasUpdate: false, error: error.message };
    }
  }

  /**
   * STEP 2: Compare semantic versions
   * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
   */
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

  /**
   * STEP 3: Download update file with progress tracking
   * Returns: Uint8Array buffer of the downloaded file
   */
  async downloadUpdate(updateInfo, progressCallback) {
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
        
        // Report progress (0-100)
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

  /**
   * STEP 4: Verify file integrity using SHA256 checksum
   * Throws error if checksum doesn't match
   */
  async verifyChecksum(fileBuffer, expectedChecksum) {
    // For Node.js/Electron:
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(fileBuffer);
    const calculatedChecksum = hash.digest('hex');
    
    if (calculatedChecksum.toLowerCase() !== expectedChecksum.toLowerCase()) {
      throw new Error("Checksum mismatch! File may be corrupted.");
    }
    
    return true;
    
    // For C#/.NET, use System.Security.Cryptography.SHA256
    // For Python, use hashlib.sha256()
  }

  /**
   * STEP 5: Save installer to temporary location
   * Returns: Full path to saved file
   */
  saveInstaller(fileBuffer, filename) {
    // For Node.js/Electron:
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    
    const tempDir = path.join(os.tmpdir(), 'HisaabKitab-Updates');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const filePath = path.join(tempDir, filename);
    fs.writeFileSync(filePath, fileBuffer);
    return filePath;
    
    // Windows temp path example: C:\Users\{User}\AppData\Local\Temp\HisaabKitab-Updates\
  }

  /**
   * STEP 6: Extract filename from download URL
   */
  extractFilename(url) {
    const parts = url.split('/');
    return parts[parts.length - 1];
  }

  /**
   * STEP 7: Install the update
   * For Windows: Executes installer with silent flags
   */
  async installUpdate(installerPath) {
    // For Node.js/Electron:
    const { spawn } = require('child_process');
    
    return new Promise((resolve, reject) => {
      // Silent installation flags: /S = silent, /NCRC = skip CRC check
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
    
    // For C#/.NET:
    // var processInfo = new ProcessStartInfo {
    //   FileName = installerPath,
    //   Arguments = "/S /NCRC",
    //   UseShellExecute = true,
    //   CreateNoWindow = true
    // };
    // var process = Process.Start(processInfo);
    // await process.WaitForExitAsync();
  }

  /**
   * STEP 8: Complete update flow - Download, Verify, Install
   */
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
}

/**
 * =================================================================================
 * USAGE EXAMPLE
 * =================================================================================
 */

// Initialize update manager
const updateManager = new UpdateManager({
  currentVersion: '1.1.0',  // Your app's current version
  platform: 'windows',      // 'windows', 'mac', or 'linux'
  apiBaseUrl: 'https://api.zentryasolutions.com',
  
  // Callback when update is available
  onUpdateAvailable: (updateInfo) => {
    console.log(`Update available: ${updateInfo.version}`);
    
    if (updateInfo.mandatory) {
      // Mandatory update - force installation
      console.log('Mandatory update - starting download...');
      updateManager.downloadAndInstall(updateInfo)
        .then(() => {
          console.log('Update installed! App will restart.');
          // Your app should restart here
        })
        .catch((error) => {
          console.error('Update failed:', error);
          // Show error to user
        });
    } else {
      // Optional update - ask user
      const userChoice = confirm(
        `Version ${updateInfo.version} is available. Do you want to install it now?`
      );
      
      if (userChoice) {
        updateManager.downloadAndInstall(updateInfo)
          .then(() => {
            console.log('Update installed! App will restart.');
            // Your app should restart here
          })
          .catch((error) => {
            console.error('Update failed:', error);
            alert('Update installation failed. Please try again later.');
          });
      }
    }
  },
  
  // Callback for download progress
  onDownloadProgress: (progress, downloaded, total) => {
    console.log(`Download progress: ${progress.toFixed(1)}% (${(downloaded/1024/1024).toFixed(2)} MB / ${(total/1024/1024).toFixed(2)} MB)`);
    // Update your UI progress bar here
  }
});

// Start automatic update checking
updateManager.startAutoCheck();

/**
 * =================================================================================
 * ERROR HANDLING
 * =================================================================================
 * 
 * Network Errors:
 *   - Retry with exponential backoff (3 attempts)
 *   - Show user-friendly error message
 *   - Allow manual retry
 * 
 * Checksum Mismatch:
 *   - Delete corrupted file
 *   - Retry download
 *   - If fails 3 times, show error and allow manual download
 * 
 * Installation Failures:
 *   - Log error details
 *   - Show user-friendly message
 *   - Provide manual installation instructions
 *   - Keep old version running
 * 
 * =================================================================================
 * SECURITY CONSIDERATIONS
 * =================================================================================
 * 
 * 1. HTTPS Only: Always use HTTPS in production
 * 2. Checksum Verification: Always verify file integrity before installation
 * 3. Signed Installers: Consider code signing your installer files
 * 4. User Permissions: Ensure installer has necessary permissions
 * 5. Rollback Capability: Keep previous version for rollback if needed
 * 
 * =================================================================================
 * TESTING CHECKLIST
 * =================================================================================
 * 
 * [ ] Check for updates when no update is available
 * [ ] Check for updates when update is available
 * [ ] Handle network errors gracefully
 * [ ] Verify checksum validation works
 * [ ] Test mandatory vs optional updates
 * [ ] Test installation process
 * [ ] Test rollback if installation fails
 * [ ] Test on different Windows versions
 * [ ] Test with slow/unstable network connections
 * 
 * =================================================================================
 * API ENDPOINT DETAILS
 * =================================================================================
 * 
 * Endpoint: GET /pos-updates/latest
 * Base URL: https://api.zentryasolutions.com
 * 
 * Query Parameters:
 *   - platform (optional): "windows" | "mac" | "linux" (default: "windows")
 * 
 * Example Request:
 *   GET https://api.zentryasolutions.com/pos-updates/latest?platform=windows
 * 
 * Success Response (200):
 *   {
 *     "version": "1.2.0",
 *     "download_url": "https://api.zentryasolutions.com/pos-updates/files/windows/1.2.0/HisaabKitab-Setup-1.2.0.exe",
 *     "checksum": "sha256_hash_here",
 *     "mandatory": false,
 *     "release_date": "2024-01-15T10:30:00.000Z"
 *   }
 * 
 * Error Response (404):
 *   {
 *     "error": "No live version available",
 *     "version": null
 *   }
 * 
 * Error Response (500):
 *   {
 *     "error": "Internal server error"
 *   }
 * 
 * =================================================================================
 */

