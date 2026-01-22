const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { auditLog } = require('../middleware/audit');
const { hashDeviceId } = require('../utils/licenseKey');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// POS License Validation (Activation Check)
router.post('/validate', [
  body('licenseKey').notEmpty().withMessage('License key is required'),
  body('deviceId').notEmpty().withMessage('Device ID is required'),
  body('appVersion').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { licenseKey, deviceId, appVersion } = req.body;
    const hashedDeviceId = hashDeviceId(deviceId);

    // MySQL query - use ? placeholder
    const [licenseRows] = await pool.query(
      'SELECT * FROM Licenses WHERE licenseKey = ?',
      [licenseKey]
    );

    if (licenseRows.length === 0) {
      await auditLog('validation_failed', { licenseKey, reason: 'license_not_found', deviceId: hashedDeviceId }, null, req);
      return res.status(404).json({
        valid: false,
        reason: 'License key not found'
      });
    }

    const license = licenseRows[0];

    // Check if license is active
    if (license.status !== 'active') {
      await auditLog('validation_failed', { licenseKey, reason: `license_${license.status}`, deviceId: hashedDeviceId }, license.id, req);
      return res.status(403).json({
        valid: false,
        reason: `License is ${license.status}`,
        status: license.status
      });
    }

    // Check expiry
    const today = new Date();
    const expiryDate = new Date(license.expiryDate);
    if (expiryDate < today) {
      // Update license status to expired
      await pool.query('UPDATE Licenses SET status = ? WHERE id = ?', ['expired', license.id]);
      
      await auditLog('validation_failed', { licenseKey, reason: 'license_expired', deviceId: hashedDeviceId }, license.id, req);
      return res.status(403).json({
        valid: false,
        reason: 'License has expired',
        expiryDate: license.expiryDate
      });
    }

    // Check existing activations
    const [activationRows] = await pool.query(
      'SELECT * FROM Activations WHERE licenseId = ? AND deviceId = ?',
      [license.id, hashedDeviceId]
    );

    const existingActivation = activationRows[0];

    // Count active activations
    const [activeCountRows] = await pool.query(
      'SELECT COUNT(*) as count FROM Activations WHERE licenseId = ? AND status = ?',
      [license.id, 'active']
    );

    const activeCount = parseInt(activeCountRows[0].count);

    // Check device limit
    if (!existingActivation && activeCount >= license.maxDevices) {
      await auditLog('validation_failed', { licenseKey, reason: 'device_limit_exceeded', deviceId: hashedDeviceId }, license.id, req);
      return res.status(403).json({
        valid: false,
        reason: 'Maximum device limit reached',
        maxDevices: license.maxDevices,
        currentDevices: activeCount
      });
    }

    // Create or update activation
    if (existingActivation) {
      // Update last check
      await pool.query(
        'UPDATE Activations SET lastCheck = CURRENT_TIMESTAMP, status = ? WHERE id = ?',
        ['active', existingActivation.id]
      );
    } else {
      // Create new activation
      await pool.query(
        'INSERT INTO Activations (id, licenseId, deviceId, status) VALUES (?, ?, ?, ?)',
        [uuidv4(), license.id, hashedDeviceId, 'active']
      );
    }

    await auditLog('validation_success', { licenseKey, deviceId: hashedDeviceId, appVersion }, license.id, req);

    res.status(200).json({
      valid: true,
      licenseId: license.id,
      licenseKey: license.licenseKey,
      tenantName: license.tenantName,
      features: typeof license.features === 'string' ? JSON.parse(license.features) : (license.features || {}),
      expiryDate: license.expiryDate,
      maxUsers: license.maxUsers,
      maxDevices: license.maxDevices
    });
  } catch (error) {
    console.error('Validation error:', error);
    await auditLog('validation_error', { error: error.message }, null, req);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POS Periodic Status Check
// Supports both licenseKey and licenseId for flexibility
router.get('/status', async (req, res) => {
  try {
    const { licenseKey, licenseId, deviceId } = req.query;

    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    if (!licenseKey && !licenseId) {
      return res.status(400).json({ error: 'licenseKey or licenseId is required' });
    }

    const hashedDeviceId = hashDeviceId(deviceId);

    // Find license by key or ID
    let licenseRows;
    if (licenseKey) {
      [licenseRows] = await pool.query('SELECT * FROM Licenses WHERE licenseKey = ?', [licenseKey]);
    } else {
      [licenseRows] = await pool.query('SELECT * FROM Licenses WHERE id = ?', [licenseId]);
    }
    
    if (licenseRows.length === 0) {
      return res.status(404).json({
        valid: false,
        reason: 'License not found'
      });
    }

    const license = licenseRows[0];

    // Check activation
    const [activationRows] = await pool.query(
      'SELECT * FROM Activations WHERE licenseId = ? AND deviceId = ?',
      [license.id, hashedDeviceId]
    );

    if (activationRows.length === 0) {
      return res.status(403).json({
        valid: false,
        reason: 'Device not activated for this license'
      });
    }

    const activation = activationRows[0];

    // Check if license is still valid
    if (license.status !== 'active') {
      return res.status(403).json({
        valid: false,
        status: license.status,
        reason: `License is ${license.status}`
      });
    }

    // Check expiry
    const today = new Date();
    const expiryDate = new Date(license.expiryDate);
    if (expiryDate < today) {
      await pool.query('UPDATE Licenses SET status = ? WHERE id = ?', ['expired', license.id]);
      return res.status(403).json({
        valid: false,
        reason: 'License has expired',
        expiryDate: license.expiryDate
      });
    }

    // Check if activation is blocked
    if (activation.status !== 'active') {
      return res.status(403).json({
        valid: false,
        status: activation.status,
        reason: `Device activation is ${activation.status}`
      });
    }

    // Count active devices
    const [activeDevicesRows] = await pool.query(
      'SELECT COUNT(*) as count FROM Activations WHERE licenseId = ? AND status = ?',
      [license.id, 'active']
    );
    const currentDevices = parseInt(activeDevicesRows[0].count);

    // Update last check
    await pool.query(
      'UPDATE Activations SET lastCheck = CURRENT_TIMESTAMP WHERE id = ?',
      [activation.id]
    );

    res.status(200).json({
      valid: true,
      status: 'active',
      features: typeof license.features === 'string' ? JSON.parse(license.features) : (license.features || {}),
      expiryDate: license.expiryDate,
      maxDevices: license.maxDevices,
      currentDevices: currentDevices,
      maxUsers: license.maxUsers,
      lastCheck: activation.lastCheck
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
