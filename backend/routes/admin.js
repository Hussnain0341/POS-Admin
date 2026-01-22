const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');
const { generateLicenseKey, validateLicenseKeyFormat } = require('../utils/licenseKey');
const { v4: uuidv4 } = require('uuid');
const { send2FACode } = require('../services/email');

const router = express.Router();

// Generate 6-digit code
function generate2FACode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Admin Login - Step 1: validate password, send 2FA code to email
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

    const result = await pool.query(
      'SELECT id, username, passwordhash as "passwordHash", role FROM adminusers WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      await auditLog('login_failed', { username, reason: 'user_not_found' }, null, req);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
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

    // 2FA ENABLED - Generate code, store, send email
    const code = generate2FACode();
    const tempToken = uuidv4();
    const twoFAEmail = process.env.TWO_FA_EMAIL || 'hussnain0341@gmail.com';
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Clean old pending 2FA for this user
    await pool.query('DELETE FROM login_2fa_codes WHERE user_id = $1', [user.id]);

    await pool.query(
      `INSERT INTO login_2fa_codes (temp_token, user_id, code, email, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [tempToken, user.id, code, twoFAEmail, expiresAt]
    );

    const emailResult = await send2FACode(code, user.username);
    if (!emailResult.sent) {
      await pool.query('DELETE FROM login_2fa_codes WHERE temp_token = $1', [tempToken]);
      await auditLog('login_failed', { username, reason: '2fa_email_failed' }, null, req);
      return res.status(503).json({
        error: 'Could not send verification email. Please check SMTP configuration or try again later.',
        detail: process.env.NODE_ENV === 'development' ? emailResult.error : undefined
      });
    }

    await auditLog('login_2fa_sent', { username, userId: user.id }, null, req);

    res.json({
      require2FA: true,
      tempToken,
      email: twoFAEmail,
      message: `Verification code sent to ${twoFAEmail}. Check your inbox.`
    });

    /* 2FA DISABLED - Direct token return (commented out)
    // To disable 2FA, uncomment the code below and comment out the 2FA code above
    
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '24h' }
    );

    await auditLog('login_success', { username, userId: user.id }, null, req);

    res.json({ 
      token, 
      user: { id: user.id, username: user.username, role: user.role } 
    });
    */
  } catch (error) {
    if (error.code === '42P01') {
      // undefined_table
      return res.status(503).json({
        error: '2FA is not set up. Run database/03_2FA_TABLE.sql in pgAdmin, then restart the server.'
      });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify 2FA - Step 2: validate code, return JWT
router.post('/verify-2fa', [
  body('tempToken').notEmpty().withMessage('Session token is required'),
  body('code').notEmpty().withMessage('Verification code is required').isLength({ min: 6, max: 6 }).withMessage('Code must be 6 digits')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { tempToken, code } = req.body;

    const row = await pool.query(
      `SELECT r.id, r.user_id, r.code, r.expires_at, u.username, u.role
       FROM login_2fa_codes r
       JOIN adminusers u ON u.id = r.user_id
       WHERE r.temp_token = $1 AND r.used_at IS NULL`,
      [tempToken]
    );

    if (row.rows.length === 0) {
      await auditLog('login_2fa_failed', { reason: 'invalid_or_used_token' }, null, req);
      return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
    }

    const rec = row.rows[0];
    if (new Date(rec.expires_at) < new Date()) {
      await pool.query('UPDATE login_2fa_codes SET used_at = NOW() WHERE id = $1', [rec.id]);
      await auditLog('login_2fa_failed', { reason: 'expired' }, null, req);
      return res.status(401).json({ error: 'Code expired. Please log in again.' });
    }

    if (rec.code !== String(code).trim()) {
      await auditLog('login_2fa_failed', { reason: 'wrong_code' }, null, req);
      return res.status(401).json({ error: 'Invalid verification code.' });
    }

    // Mark as used
    await pool.query('UPDATE login_2fa_codes SET used_at = NOW() WHERE id = $1', [rec.id]);

    const token = jwt.sign(
      { id: rec.user_id, username: rec.username, role: rec.role },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '24h' }
    );

    await auditLog('login_success', { username: rec.username, userId: rec.user_id, twoFA: true }, null, req);

    res.json({
      token,
      user: { id: rec.user_id, username: rec.username, role: rec.role }
    });
  } catch (error) {
    if (error.code === '42P01') {
      return res.status(503).json({
        error: '2FA is not set up. Run database/03_2FA_TABLE.sql in pgAdmin, then restart the server.'
      });
    }
    console.error('Verify 2FA error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all licenses (with filters)
router.get('/licenses', authenticateToken, async (req, res) => {
  try {
    const { status, tenantName, plan, licenseKey, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // PostgreSQL converts to lowercase, so use lowercase table/column names
    let query = 'SELECT * FROM licenses WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(status);
    }

    if (tenantName) {
      paramCount++;
      query += ` AND tenantname ILIKE $${paramCount}`;
      params.push(`%${tenantName}%`);
    }

    if (plan) {
      paramCount++;
      query += ` AND plan = $${paramCount}`;
      params.push(plan);
    }

    if (licenseKey) {
      paramCount++;
      query += ` AND licensekey ILIKE $${paramCount}`;
      params.push(`%${licenseKey}%`);
    }

    query += ` ORDER BY createdat DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    const countResult = await pool.query('SELECT COUNT(*) FROM licenses');

    // Map lowercase columns to camelCase for frontend
    const licenses = result.rows.map(row => ({
      id: row.id,
      licenseKey: row.licensekey,
      tenantName: row.tenantname,
      plan: row.plan,
      maxDevices: row.maxdevices,
      maxUsers: row.maxusers,
      features: row.features,
      startDate: row.startdate,
      expiryDate: row.expirydate,
      status: row.status,
      createdAt: row.createdat,
      updatedAt: row.updatedat
    }));

    res.json({
      licenses,
      total: parseInt(countResult.rows[0].count),
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

    const licenseResult = await pool.query('SELECT * FROM licenses WHERE id = $1', [id]);
    if (licenseResult.rows.length === 0) {
      return res.status(404).json({ error: 'License not found' });
    }

    const activationsResult = await pool.query(
      'SELECT * FROM activations WHERE licenseid = $1 ORDER BY lastcheck DESC',
      [id]
    );

    const license = licenseResult.rows[0];
    const activations = activationsResult.rows.map(row => ({
      id: row.id,
      licenseId: row.licenseid,
      deviceId: row.deviceid,
      activatedAt: row.activatedat,
      lastCheck: row.lastcheck,
      status: row.status
    }));

    res.json({
      id: license.id,
      licenseKey: license.licensekey,
      tenantName: license.tenantname,
      plan: license.plan,
      maxDevices: license.maxdevices,
      maxUsers: license.maxusers,
      features: license.features,
      startDate: license.startdate,
      expiryDate: license.expirydate,
      status: license.status,
      createdAt: license.createdat,
      updatedAt: license.updatedat,
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
    const existing = await pool.query('SELECT id FROM licenses WHERE licensekey = $1', [finalLicenseKey]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'License key already exists' });
    }

    const id = uuidv4();
    const result = await pool.query(
      `INSERT INTO licenses (id, licensekey, tenantname, plan, maxdevices, maxusers, features, startdate, expirydate, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
       RETURNING *`,
      [id, finalLicenseKey, tenantName, plan || null, maxDevices, maxUsers, JSON.stringify(features), startDate || null, expiryDate]
    );

    await auditLog('license_created', { licenseKey: finalLicenseKey, tenantName }, id, req);

    const license = result.rows[0];
    res.status(201).json({
      id: license.id,
      licenseKey: license.licensekey,
      tenantName: license.tenantname,
      plan: license.plan,
      maxDevices: license.maxdevices,
      maxUsers: license.maxusers,
      features: license.features,
      startDate: license.startdate,
      expiryDate: license.expirydate,
      status: license.status,
      createdAt: license.createdat,
      updatedAt: license.updatedat
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
    const existing = await pool.query('SELECT * FROM licenses WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'License not found' });
    }

    const updateFields = [];
    const params = [];
    let paramCount = 0;

    if (tenantName !== undefined) {
      paramCount++;
      updateFields.push(`tenantname = $${paramCount}`);
      params.push(tenantName);
    }
    if (plan !== undefined) {
      paramCount++;
      updateFields.push(`plan = $${paramCount}`);
      params.push(plan);
    }
    if (maxDevices !== undefined) {
      paramCount++;
      updateFields.push(`maxdevices = $${paramCount}`);
      params.push(maxDevices);
    }
    if (maxUsers !== undefined) {
      paramCount++;
      updateFields.push(`maxusers = $${paramCount}`);
      params.push(maxUsers);
    }
    if (features !== undefined) {
      paramCount++;
      updateFields.push(`features = $${paramCount}`);
      params.push(JSON.stringify(features));
    }
    if (startDate !== undefined) {
      paramCount++;
      updateFields.push(`startdate = $${paramCount}`);
      params.push(startDate);
    }
    if (expiryDate !== undefined) {
      paramCount++;
      updateFields.push(`expirydate = $${paramCount}`);
      params.push(expiryDate);
    }
    if (status !== undefined) {
      paramCount++;
      updateFields.push(`status = $${paramCount}`);
      params.push(status);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    paramCount++;
    params.push(id);
    const query = `UPDATE licenses SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, params);

    await auditLog('license_updated', { changes: req.body }, id, req);

    const license = result.rows[0];
    res.json({
      id: license.id,
      licenseKey: license.licensekey,
      tenantName: license.tenantname,
      plan: license.plan,
      maxDevices: license.maxdevices,
      maxUsers: license.maxusers,
      features: license.features,
      startDate: license.startdate,
      expiryDate: license.expirydate,
      status: license.status,
      createdAt: license.createdat,
      updatedAt: license.updatedat
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

    const result = await pool.query(
      'UPDATE licenses SET status = $1 WHERE id = $2 RETURNING *',
      ['revoked', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'License not found' });
    }

    // Also revoke all activations
    await pool.query(
      'UPDATE activations SET status = $1 WHERE licenseid = $2',
      ['revoked', id]
    );

    await auditLog('license_revoked', {}, id, req);

    const license = result.rows[0];
    res.json({
      id: license.id,
      licenseKey: license.licensekey,
      tenantName: license.tenantname,
      plan: license.plan,
      maxDevices: license.maxdevices,
      maxUsers: license.maxusers,
      features: license.features,
      startDate: license.startdate,
      expiryDate: license.expirydate,
      status: 'revoked',
      createdAt: license.createdat,
      updatedAt: license.updatedat
    });
  } catch (error) {
    console.error('Revoke license error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get dashboard stats
router.get('/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'active') as active_licenses,
        COUNT(*) FILTER (WHERE status = 'expired') as expired_licenses,
        COUNT(*) FILTER (WHERE status = 'revoked') as revoked_licenses,
        COUNT(*) as total_licenses
      FROM licenses
    `);

    const activations = await pool.query(`
      SELECT COUNT(*) as total_devices
      FROM activations
      WHERE status = 'active'
    `);

    res.json({
      licenses: stats.rows[0],
      activations: activations.rows[0]
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

    let query = 'SELECT * FROM auditlogs WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (licenseId) {
      paramCount++;
      query += ` AND licenseid = $${paramCount}`;
      params.push(licenseId);
    }

    query += ` ORDER BY createdat DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
