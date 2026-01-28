const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');
const { generateLicenseKey, validateLicenseKeyFormat } = require('../utils/licenseKey');
const { v4: uuidv4 } = require('uuid');
const { send2FACode, sendPasswordChange2FA } = require('../services/email');

const router = express.Router();

// Generate 6-digit code
function generate2FACode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Check and automatically expire licenses that have passed their expiry date
 * This function should be called whenever licenses are queried to ensure
 * expired licenses are automatically marked as expired
 * Uses PostgreSQL CURRENT_DATE for accurate date comparison
 */
async function checkAndExpireLicenses() {
  try {
    // Find all active licenses that have expired (using PostgreSQL CURRENT_DATE)
    const expiredResult = await pool.query(
      `SELECT id, licensekey, tenantname, expirydate 
       FROM licenses 
       WHERE status = 'active' 
       AND expirydate < CURRENT_DATE`
    );

    if (expiredResult.rows.length > 0) {
      // Update all expired licenses
      const updateResult = await pool.query(
        `UPDATE licenses 
         SET status = 'expired', updatedat = CURRENT_TIMESTAMP 
         WHERE status = 'active' 
         AND expirydate < CURRENT_DATE
         RETURNING id, licensekey, tenantname, expirydate`
      );

      // Log each expired license
      for (const license of updateResult.rows) {
        await auditLog(
          'license_expired_auto',
          {
            licenseKey: license.licensekey,
            tenantName: license.tenantname,
            expiryDate: license.expirydate,
            reason: 'automatic_expiration_check'
          },
          license.id,
          null // No request object available in utility function
        );
      }

      console.log(`Automatically expired ${updateResult.rows.length} license(s)`);
      return updateResult.rows.length;
    }

    return 0;
  } catch (error) {
    console.error('Error checking license expiration:', error);
    // Don't throw - we don't want to break the request if expiration check fails
    return 0;
  }
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

// POST /api/admin/change-password/request - Request password change (verify current password, send 2FA)
router.post('/change-password/request', authenticateToken, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Get user from database
    const userResult = await pool.query(
      'SELECT id, username, passwordhash as "passwordHash" FROM adminusers WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Verify current password
    if (!user.passwordHash) {
      return res.status(500).json({ error: 'Password hash not found' });
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      await auditLog('password_change_failed', { userId, reason: 'invalid_current_password' }, userId, req);
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Check if new password is same as current
    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      return res.status(400).json({ error: 'New password must be different from current password' });
    }

    // Generate 2FA code
    const code = generate2FACode();
    const tempToken = uuidv4();
    const twoFAEmail = process.env.TWO_FA_EMAIL || 'hussnain0341@gmail.com';
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Hash the new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    
    // Clean old pending password change 2FA for this user
    await pool.query(
      'DELETE FROM login_2fa_codes WHERE user_id = $1 AND temp_token LIKE $2',
      [userId, 'pwd_change_%']
    );

    // Store 2FA code with prefix to distinguish from login 2FA
    // Store new password hash in email field temporarily (format: "email|hash")
    await pool.query(
      `INSERT INTO login_2fa_codes (temp_token, user_id, code, email, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [`pwd_change_${tempToken}`, userId, code, `${twoFAEmail}|${newPasswordHash}`, expiresAt]
    );

    // Send 2FA email
    const emailResult = await sendPasswordChange2FA(code, user.username);
    if (!emailResult.sent) {
      await pool.query('DELETE FROM login_2fa_codes WHERE temp_token = $1', [`pwd_change_${tempToken}`]);
      await auditLog('password_change_failed', { userId, reason: '2fa_email_failed' }, userId, req);
      return res.status(503).json({
        error: 'Could not send verification email. Please check SMTP configuration or try again later.',
        detail: process.env.NODE_ENV === 'development' ? emailResult.error : undefined
      });
    }

    await auditLog('password_change_2fa_sent', { userId, username: user.username }, userId, req);

    res.json({
      require2FA: true,
      tempToken,
      email: twoFAEmail,
      message: `Verification code sent to ${twoFAEmail}. Check your inbox.`
    });
  } catch (error) {
    console.error('Password change request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/change-password/verify - Verify 2FA and change password
router.post('/change-password/verify', authenticateToken, [
  body('tempToken').notEmpty().withMessage('Temporary token is required'),
  body('code').matches(/^\d{6}$/).withMessage('Code must be 6 digits')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { tempToken, code } = req.body;
    const userId = req.user.id;

    // Find 2FA record
    const result = await pool.query(
      `SELECT l2fa.*, au.username, au.role
       FROM login_2fa_codes l2fa
       JOIN adminusers au ON l2fa.user_id = au.id
       WHERE l2fa.temp_token = $1 AND l2fa.user_id = $2 AND l2fa.expires_at > NOW() AND l2fa.used_at IS NULL`,
      [`pwd_change_${tempToken}`, userId]
    );

    if (result.rows.length === 0) {
      await auditLog('password_change_failed', { userId, reason: 'invalid_or_expired_2fa' }, userId, req);
      return res.status(401).json({ error: 'Invalid or expired verification code' });
    }

    const rec = result.rows[0];
    
    // Verify 2FA code
    if (rec.code !== code) {
      await auditLog('password_change_failed', { userId, reason: 'invalid_2fa_code' }, userId, req);
      return res.status(401).json({ error: 'Invalid verification code' });
    }

    // Extract new password hash from email field (format: "email|hash")
    const emailField = rec.email;
    const parts = emailField.split('|');
    if (parts.length !== 2) {
      return res.status(500).json({ error: 'Password change data corrupted' });
    }
    const newPasswordHash = parts[1];

    // Update password
    await pool.query(
      'UPDATE adminusers SET passwordhash = $1 WHERE id = $2',
      [newPasswordHash, userId]
    );

    // Mark 2FA code as used
    await pool.query(
      'UPDATE login_2fa_codes SET used_at = CURRENT_TIMESTAMP WHERE temp_token = $1',
      [`pwd_change_${tempToken}`]
    );

    // Clean up old 2FA codes for this user
    await pool.query(
      'DELETE FROM login_2fa_codes WHERE user_id = $1 AND expires_at < NOW()',
      [userId]
    );

    await auditLog('password_change_success', { userId, username: rec.username }, userId, req);

    res.json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Password change verify error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all licenses (with filters)
router.get('/licenses', authenticateToken, async (req, res) => {
  try {
    // Check and expire licenses automatically before fetching
    await checkAndExpireLicenses();

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
    
    // Get total count with same filters
    let countQuery = 'SELECT COUNT(*) FROM licenses WHERE 1=1';
    const countParams = [];
    let countParamCount = 0;

    if (status) {
      countParamCount++;
      countQuery += ` AND status = $${countParamCount}`;
      countParams.push(status);
    }

    if (tenantName) {
      countParamCount++;
      countQuery += ` AND tenantname ILIKE $${countParamCount}`;
      countParams.push(`%${tenantName}%`);
    }

    if (plan) {
      countParamCount++;
      countQuery += ` AND plan = $${countParamCount}`;
      countParams.push(plan);
    }

    if (licenseKey) {
      countParamCount++;
      countQuery += ` AND licensekey ILIKE $${countParamCount}`;
      countParams.push(`%${licenseKey}%`);
    }

    const countResult = await pool.query(countQuery, countParams);

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
    // Check and expire licenses automatically before fetching
    await checkAndExpireLicenses();

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

// Delete license
router.delete('/licenses/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const adminUserId = req.user.id;

    // Check if license exists
    const licenseResult = await pool.query('SELECT * FROM licenses WHERE id = $1', [id]);
    if (licenseResult.rows.length === 0) {
      return res.status(404).json({ error: 'License not found' });
    }

    const license = licenseResult.rows[0];

    // Check if license has active activations
    const activationsResult = await pool.query(
      'SELECT COUNT(*) as count FROM activations WHERE licenseid = $1 AND status = $2',
      [id, 'active']
    );
    const activeActivations = parseInt(activationsResult.rows[0].count);

    if (activeActivations > 0) {
      return res.status(400).json({ 
        error: `Cannot delete license with ${activeActivations} active device activation(s). Revoke the license first or wait for activations to expire.` 
      });
    }

    // Delete all activations first (CASCADE should handle this, but being explicit)
    await pool.query('DELETE FROM activations WHERE licenseid = $1', [id]);

    // Delete audit logs related to this license
    await pool.query('DELETE FROM auditlogs WHERE licenseid = $1', [id]);

    // Delete the license
    await pool.query('DELETE FROM licenses WHERE id = $1', [id]);

    await auditLog('license_deleted', { 
      licenseKey: license.licensekey, 
      tenantName: license.tenantname 
    }, null, req);

    res.json({
      message: 'License deleted successfully',
      deletedLicense: {
        id: license.id,
        licenseKey: license.licensekey,
        tenantName: license.tenantname
      }
    });
  } catch (error) {
    console.error('Delete license error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get dashboard stats
router.get('/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    // Check and expire licenses automatically before fetching stats
    await checkAndExpireLicenses();

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

// Change password
router.post('/change-password', authenticateToken, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('New password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('New password must contain at least one lowercase letter')
    .matches(/\d/).withMessage('New password must contain at least one number')
    .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/).withMessage('New password must contain at least one special character')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id; // From authenticateToken middleware

    // Get current user
    const userResult = await pool.query(
      'SELECT id, username, passwordhash as "passwordHash" FROM adminusers WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      await auditLog('password_change_failed', { userId, reason: 'invalid_current_password' }, null, req);
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Check if new password is same as current
    const isSame = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSame) {
      return res.status(400).json({ error: 'New password must be different from current password' });
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password in database
    await pool.query(
      'UPDATE adminusers SET passwordhash = $1 WHERE id = $2',
      [newPasswordHash, userId]
    );

    await auditLog('password_changed', { userId, username: user.username }, null, req);

    res.json({
      message: 'Password changed successfully',
      username: user.username
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
