const { v4: uuidv4 } = require('uuid');

/**
 * Generate a license key in format: HK-XXXX-XXXX-XXXX
 */
const generateLicenseKey = () => {
  const segments = [];
  segments.push('HK');
  
  for (let i = 0; i < 3; i++) {
    const segment = Math.random().toString(36).substring(2, 6).toUpperCase();
    segments.push(segment);
  }
  
  return segments.join('-');
};

/**
 * Validate license key format
 */
const validateLicenseKeyFormat = (key) => {
  const pattern = /^HK-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  return pattern.test(key);
};

/**
 * Hash device ID for storage
 */
const hashDeviceId = (deviceId) => {
  // Simple hash - in production, use crypto.createHash('sha256')
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(deviceId).digest('hex');
};

module.exports = {
  generateLicenseKey,
  validateLicenseKeyFormat,
  hashDeviceId
};

