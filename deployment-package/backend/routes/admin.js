const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');
const { generateLicenseKey, validateLicenseKeyFormat } = require('../utils/licenseKey');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Admin Login
router.post('/login', [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    // MySQL query - use ? placeholders
    const [rows] = await pool.query(
      'SELECT id, username, passwordHash, role FROM AdminUsers WHERE username = ?',
      [username]
    );

    if (rows.length === 0) {
      await auditLog('login_failed', { username, reason: 'user_not_found' }, null, req);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    
    if (!user.passwordHash) {
      console.error('Login error: passwordHash is missing for user:', username);
      await auditLog('login_failed', { username, reason: 'password_hash_missing' }, null, req);
      return res.status(500).json({ error: 'Admin user configuration error. Please contact administrator.' });
    }
    
    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      await auditLog('login_failed', { username, reason: 'invalid_password' }, null, req);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '24h' }
    );

    await auditLog('login_success', { username, userId: user.id }, null, req);

    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all licenses (with filters)
router.get('/licenses', authenticateToken, async (req, res) => {
  try {
    const { status, tenantName, plan, licenseKey, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // MySQL query with LIKE for case-insensitive search
    let query = 'SELECT * FROM Licenses WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (tenantName) {
      query += ' AND tenantName LIKE ?';
      params.push(`%${tenantName}%`);
    }

    if (plan) {
      query += ' AND plan = ?';
      params.push(plan);
    }

    if (licenseKey) {
      query += ' AND licenseKey LIKE ?';
      params.push(`%${licenseKey}%`);
    }

    query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.query(query, params);
    const [countRows] = await pool.query('SELECT COUNT(*) as count FROM Licenses');

    // Map to camelCase for frontend
    const licenses = rows.map(row => ({
      id: row.id,
      licenseKey: row.licenseKey,
      tenantName: row.tenantName,
      plan: row.plan,
      maxDevices: row.maxDevices,
      maxUsers: row.maxUsers,
      features: typeof row.features === 'string' ? JSON.parse(row.features) : row.features,
      startDate: row.startDate,
      expiryDate: row.expiryDate,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }));

    res.json({
      licenses,
      total: parseInt(countRows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Get licenses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single license with activations
router.get('/licenses/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [licenseRows] = await pool.query('SELECT * FROM Licenses WHERE id = ?', [id]);
    if (licenseRows.length === 0) {
      return res.status(404).json({ error: 'License not found' });
    }

    const [activationRows] = await pool.query(
      'SELECT * FROM Activations WHERE licenseId = ? ORDER BY lastCheck DESC',
      [id]
    );

    const license = licenseRows[0];
    const activations = activationRows.map(row => ({
      id: row.id,
      licenseId: row.licenseId,
      deviceId: row.deviceId,
      activatedAt: row.activatedAt,
      lastCheck: row.lastCheck,
      status: row.status
    }));

    res.json({
      id: license.id,
      licenseKey: license.licenseKey,
      tenantName: license.tenantName,
      plan: license.plan,
      maxDevices: license.maxDevices,
      maxUsers: license.maxUsers,
      features: typeof license.features === 'string' ? JSON.parse(license.features) : license.features,
      startDate: license.startDate,
      expiryDate: license.expiryDate,
      status: license.status,
      createdAt: license.createdAt,
      updatedAt: license.updatedAt,
      activations
    });
  } catch (error) {
    console.error('Get license error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create license
router.post('/licenses', authenticateToken, [
  body('tenantName').notEmpty().withMessage('Tenant name is required'),
  body('expiryDate').notEmpty().withMessage('Expiry date is required'),
  body('maxDevices').optional().isInt({ min: 1 }),
  body('maxUsers').optional().isInt({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      tenantName,
      plan,
      maxDevices = 1,
      maxUsers = 1,
      features = {},
      startDate,
      expiryDate,
      licenseKey
    } = req.body;

    // Auto-generate license key if not provided
    const finalLicenseKey = licenseKey && licenseKey.trim() ? licenseKey.trim() : generateLicenseKey();

    if (!validateLicenseKeyFormat(finalLicenseKey)) {
      return res.status(400).json({ error: 'Invalid license key format. Must be HK-XXXX-XXXX-XXXX' });
    }

    // Check if license key already exists
    const [existing] = await pool.query('SELECT id FROM Licenses WHERE licenseKey = ?', [finalLicenseKey]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'License key already exists' });
    }

    const id = uuidv4();
    
    // MySQL INSERT - no RETURNING clause, use separate SELECT
    await pool.query(
      `INSERT INTO Licenses (id, licenseKey, tenantName, plan, maxDevices, maxUsers, features, startDate, expiryDate, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [id, finalLicenseKey, tenantName, plan || null, maxDevices, maxUsers, JSON.stringify(features), startDate || null, expiryDate]
    );

    // Get the inserted license
    const [newLicense] = await pool.query('SELECT * FROM Licenses WHERE id = ?', [id]);
    const license = newLicense[0];

    await auditLog('license_created', { licenseKey: finalLicenseKey, tenantName }, id, req);

    res.status(201).json({
      id: license.id,
      licenseKey: license.licenseKey,
      tenantName: license.tenantName,
      plan: license.plan,
      maxDevices: license.maxDevices,
      maxUsers: license.maxUsers,
      features: typeof license.features === 'string' ? JSON.parse(license.features) : license.features,
      startDate: license.startDate,
      expiryDate: license.expiryDate,
      status: license.status,
      createdAt: license.createdAt,
      updatedAt: license.updatedAt
    });
  } catch (error) {
    console.error('Create license error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update license
router.put('/licenses/:id', authenticateToken, [
  body('maxDevices').optional().isInt({ min: 1 }),
  body('maxUsers').optional().isInt({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const {
      tenantName,
      plan,
      maxDevices,
      maxUsers,
      features,
      startDate,
      expiryDate,
      status
    } = req.body;

    // Check if license exists
    const [existing] = await pool.query('SELECT * FROM Licenses WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'License not found' });
    }

    const updateFields = [];
    const params = [];

    if (tenantName !== undefined) {
      updateFields.push('tenantName = ?');
      params.push(tenantName);
    }
    if (plan !== undefined) {
      updateFields.push('plan = ?');
      params.push(plan);
    }
    if (maxDevices !== undefined) {
      updateFields.push('maxDevices = ?');
      params.push(maxDevices);
    }
    if (maxUsers !== undefined) {
      updateFields.push('maxUsers = ?');
      params.push(maxUsers);
    }
    if (features !== undefined) {
      updateFields.push('features = ?');
      params.push(JSON.stringify(features));
    }
    if (startDate !== undefined) {
      updateFields.push('startDate = ?');
      params.push(startDate);
    }
    if (expiryDate !== undefined) {
      updateFields.push('expiryDate = ?');
      params.push(expiryDate);
    }
    if (status !== undefined) {
      updateFields.push('status = ?');
      params.push(status);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    const query = `UPDATE Licenses SET ${updateFields.join(', ')} WHERE id = ?`;

    await pool.query(query, params);

    // Get updated license
    const [updated] = await pool.query('SELECT * FROM Licenses WHERE id = ?', [id]);
    const license = updated[0];

    await auditLog('license_updated', { changes: req.body }, id, req);

    res.json({
      id: license.id,
      licenseKey: license.licenseKey,
      tenantName: license.tenantName,
      plan: license.plan,
      maxDevices: license.maxDevices,
      maxUsers: license.maxUsers,
      features: typeof license.features === 'string' ? JSON.parse(license.features) : license.features,
      startDate: license.startDate,
      expiryDate: license.expiryDate,
      status: license.status,
      createdAt: license.createdAt,
      updatedAt: license.updatedAt
    });
  } catch (error) {
    console.error('Update license error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Revoke license
router.post('/licenses/:id/revoke', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query('UPDATE Licenses SET status = ? WHERE id = ?', ['revoked', id]);

    const [updated] = await pool.query('SELECT * FROM Licenses WHERE id = ?', [id]);
    if (updated.length === 0) {
      return res.status(404).json({ error: 'License not found' });
    }

    // Also revoke all activations
    await pool.query('UPDATE Activations SET status = ? WHERE licenseId = ?', ['revoked', id]);

    await auditLog('license_revoked', {}, id, req);

    const license = updated[0];
    res.json({
      id: license.id,
      licenseKey: license.licenseKey,
      tenantName: license.tenantName,
      plan: license.plan,
      maxDevices: license.maxDevices,
      maxUsers: license.maxUsers,
      features: typeof license.features === 'string' ? JSON.parse(license.features) : license.features,
      startDate: license.startDate,
      expiryDate: license.expiryDate,
      status: 'revoked',
      createdAt: license.createdAt,
      updatedAt: license.updatedAt
    });
  } catch (error) {
    console.error('Revoke license error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get dashboard stats
router.get('/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    // MySQL uses CASE WHEN instead of FILTER
    const [stats] = await pool.query(`
      SELECT 
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_licenses,
        SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired_licenses,
        SUM(CASE WHEN status = 'revoked' THEN 1 ELSE 0 END) as revoked_licenses,
        COUNT(*) as total_licenses
      FROM Licenses
    `);

    const [activations] = await pool.query(`
      SELECT COUNT(*) as total_devices
      FROM Activations
      WHERE status = 'active'
    `);

    res.json({
      licenses: stats[0],
      activations: activations[0]
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get audit logs
router.get('/audit-logs', authenticateToken, async (req, res) => {
  try {
    const { licenseId, page = 1, limit = 100 } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM AuditLogs WHERE 1=1';
    const params = [];

    if (licenseId) {
      query += ' AND licenseId = ?';
      params.push(licenseId);
    }

    query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.query(query, params);

    // Parse JSON details if string
    const logs = rows.map(row => ({
      ...row,
      details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details
    }));

    res.json(logs);
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
