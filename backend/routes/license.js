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

    // Find license (PostgreSQL converts to lowercase)
    const licenseResult = await pool.query(
      'SELECT * FROM licenses WHERE licensekey = $1',
      [licenseKey]
    );

    if (licenseResult.rows.length === 0) {
      await auditLog('validation_failed', { licenseKey, reason: 'license_not_found', deviceId: hashedDeviceId }, null, req);
      return res.json({
        valid: false,
        reason: 'License key not found'
      });
    }

    const license = licenseResult.rows[0];

    // Check if license is active
    if (license.status !== 'active') {
      await auditLog('validation_failed', { licenseKey, reason: `license_${license.status}`, deviceId: hashedDeviceId }, license.id, req);
      return res.json({
        valid: false,
        reason: `License is ${license.status}`,
        status: license.status
      });
    }

    // Check expiry
    const today = new Date();
    const expiryDate = new Date(license.expirydate);
    if (expiryDate < today) {
      // Update license status to expired
      await pool.query('UPDATE licenses SET status = $1 WHERE id = $2', ['expired', license.id]);
      
      await auditLog('validation_failed', { licenseKey, reason: 'license_expired', deviceId: hashedDeviceId }, license.id, req);
      return res.json({
        valid: false,
        reason: 'License has expired',
        expiryDate: license.expirydate
      });
    }

    // Check existing activations
    const activationResult = await pool.query(
      'SELECT * FROM activations WHERE licenseid = $1 AND deviceid = $2',
      [license.id, hashedDeviceId]
    );

    const existingActivation = activationResult.rows[0];

    // Count active activations
    const activeActivationsResult = await pool.query(
      'SELECT COUNT(*) as count FROM activations WHERE licenseid = $1 AND status = $2',
      [license.id, 'active']
    );

    const activeCount = parseInt(activeActivationsResult.rows[0].count);

    // Check device limit
    if (!existingActivation && activeCount >= license.maxdevices) {
      await auditLog('validation_failed', { licenseKey, reason: 'device_limit_exceeded', deviceId: hashedDeviceId }, license.id, req);
      return res.json({
        valid: false,
        reason: 'Maximum device limit reached',
        maxDevices: license.maxdevices,
        currentDevices: activeCount
      });
    }

    // Create or update activation
    if (existingActivation) {
      // Update last check
      await pool.query(
        'UPDATE activations SET lastcheck = CURRENT_TIMESTAMP, status = $1 WHERE id = $2',
        ['active', existingActivation.id]
      );
    } else {
      // Create new activation
      await pool.query(
        'INSERT INTO activations (id, licenseid, deviceid, status) VALUES ($1, $2, $3, $4)',
        [uuidv4(), license.id, hashedDeviceId, 'active']
      );
    }

    await auditLog('validation_success', { licenseKey, deviceId: hashedDeviceId, appVersion }, license.id, req);

    res.json({
      valid: true,
      licenseId: license.id,
      tenantName: license.tenantname,
      features: license.features || {},
      expiryDate: license.expirydate,
      maxUsers: license.maxusers,
      maxDevices: license.maxdevices
    });
  } catch (error) {
    console.error('Validation error:', error);
    await auditLog('validation_error', { error: error.message }, null, req);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POS Periodic Status Check
router.get('/status', async (req, res) => {
  try {
    const { licenseId, deviceId } = req.query;

    if (!licenseId || !deviceId) {
      return res.status(400).json({ error: 'licenseId and deviceId are required' });
    }

    const hashedDeviceId = hashDeviceId(deviceId);

    // Find license
    const licenseResult = await pool.query('SELECT * FROM licenses WHERE id = $1', [licenseId]);
    if (licenseResult.rows.length === 0) {
      return res.json({
        valid: false,
        reason: 'License not found'
      });
    }

    const license = licenseResult.rows[0];

    // Check activation
    const activationResult = await pool.query(
      'SELECT * FROM activations WHERE licenseid = $1 AND deviceid = $2',
      [licenseId, hashedDeviceId]
    );

    if (activationResult.rows.length === 0) {
      return res.json({
        valid: false,
        reason: 'Device not activated for this license'
      });
    }

    const activation = activationResult.rows[0];

    // Check if license is still valid
    if (license.status !== 'active') {
      return res.json({
        valid: false,
        status: license.status,
        reason: `License is ${license.status}`
      });
    }

    // Check expiry
    const today = new Date();
    const expiryDate = new Date(license.expirydate);
    if (expiryDate < today) {
      await pool.query('UPDATE licenses SET status = $1 WHERE id = $2', ['expired', license.id]);
      return res.json({
        valid: false,
        reason: 'License has expired',
        expiryDate: license.expirydate
      });
    }

    // Check if activation is blocked
    if (activation.status !== 'active') {
      return res.json({
        valid: false,
        status: activation.status,
        reason: `Device activation is ${activation.status}`
      });
    }

    // Update last check
    await pool.query(
      'UPDATE activations SET lastcheck = CURRENT_TIMESTAMP WHERE id = $1',
      [activation.id]
    );

    res.json({
      valid: true,
      status: 'active',
      features: license.features || {},
      expiryDate: license.expirydate,
      maxUsers: license.maxusers,
      lastCheck: activation.lastcheck
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
