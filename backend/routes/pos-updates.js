const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// ============================================
// FILE STORAGE CONFIGURATION
// ============================================
// Use relative path for development, absolute path for production
const UPDATES_BASE_DIR = process.env.UPDATES_BASE_DIR || 
  (process.env.NODE_ENV === 'production' 
    ? '/var/www/updates/hisaabkitab'
    : path.join(__dirname, '../../uploads/pos-updates'));
const UPDATES_PUBLIC_URL = process.env.UPDATES_PUBLIC_URL || 
  (process.env.NODE_ENV === 'production'
    ? 'https://api.zentryasolutions.com/pos-updates/files'
    : 'http://localhost:3001/pos-updates/files');

// Ensure base directory exists
const ensureDirectories = () => {
  const dirs = [
    UPDATES_BASE_DIR,
    path.join(UPDATES_BASE_DIR, 'windows'),
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
};

// Initialize directories on module load
ensureDirectories();

// ============================================
// MULTER CONFIGURATION (File Upload)
// ============================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use temp directory first, will be moved after validation
    const tempDir = path.join(UPDATES_BASE_DIR, 'temp');
    
    // Create temp directory
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    // Keep original filename
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Only allow .exe files for Windows
  if (file.mimetype === 'application/x-msdownload' || 
      file.mimetype === 'application/x-msdos-program' ||
      path.extname(file.originalname).toLowerCase() === '.exe') {
    cb(null, true);
  } else {
    cb(new Error('Only .exe installer files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB max
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

// Calculate SHA256 checksum
const calculateChecksum = (filePath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
};

// Generate latest.json metadata
const generateLatestJson = async (platform = 'windows') => {
  try {
    const result = await pool.query(
      `SELECT version, download_url, checksum_sha256, mandatory, published_at
       FROM pos_versions
       WHERE platform = $1 AND status = 'live'
       ORDER BY published_at DESC
       LIMIT 1`,
      [platform]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const version = result.rows[0];
    return {
      version: version.version,
      download_url: version.download_url,
      checksum: version.checksum_sha256,
      mandatory: version.mandatory,
      release_date: version.published_at
    };
  } catch (error) {
    console.error('Error generating latest.json:', error);
    return null;
  }
};

// Log update action
const logUpdateAction = async (action, versionId, adminUserId, status, message, metadata = {}) => {
  try {
    await pool.query(
      `INSERT INTO pos_update_logs (id, version_id, admin_user_id, action, status, message, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [uuidv4(), versionId, adminUserId, action, status, message, JSON.stringify(metadata)]
    );
  } catch (error) {
    console.error('Error logging update action:', error);
  }
};

// ============================================
// PUBLIC API (Consumed by POS App)
// ============================================

// GET /api/pos-updates/latest - Get latest live version (Public API for POS app)
router.get('/latest', async (req, res) => {
  try {
    const platform = req.query.platform || 'windows';
    const latest = await generateLatestJson(platform);

    if (!latest) {
      return res.status(404).json({
        error: 'No live version available',
        version: null
      });
    }

    res.json(latest);
  } catch (error) {
    console.error('Error fetching latest version:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// ADMIN APIs (Protected)
// ============================================

// GET /pos-updates/versions - List all versions
router.get('/versions', authenticateToken, async (req, res) => {
  try {
    const { platform, status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM pos_versions WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (platform) {
      paramCount++;
      query += ` AND platform = $${paramCount}`;
      params.push(platform);
    }

    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(status);
    }

    query += ` ORDER BY uploaded_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    const countResult = await pool.query('SELECT COUNT(*) FROM pos_versions');

    res.json({
      versions: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Error fetching versions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /pos-updates/versions/:id - Get version details
router.get('/versions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT v.*, u.username as uploaded_by_username
       FROM pos_versions v
       LEFT JOIN adminusers u ON u.id = v.uploaded_by
       WHERE v.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Version not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching version:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /pos-updates/upload - Upload new version
router.post('/upload', authenticateToken, upload.single('installer'), [
  body('version').notEmpty().withMessage('Version is required'),
  body('platform').optional().isIn(['windows', 'macos', 'linux']),
  body('mandatory').optional().isBoolean(),
  body('releaseNotes').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Installer file is required' });
    }

    const { version, platform = 'windows', mandatory = false, releaseNotes } = req.body;
    const adminUserId = req.user.id;

    // Check if version already exists
    const existing = await pool.query(
      'SELECT id FROM pos_versions WHERE version = $1',
      [version]
    );

    if (existing.rows.length > 0) {
      // Delete uploaded file if version exists
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Version already exists' });
    }

    // Move file from temp to version directory
    const versionDir = path.join(UPDATES_BASE_DIR, platform, version);
    if (!fs.existsSync(versionDir)) {
      fs.mkdirSync(versionDir, { recursive: true });
    }
    const finalFilePath = path.join(versionDir, req.file.filename);
    
    // Move file to final location
    fs.renameSync(req.file.path, finalFilePath);

    // Calculate checksum
    const checksum = await calculateChecksum(finalFilePath);

    // Generate download URL
    const downloadUrl = `${UPDATES_PUBLIC_URL}/${platform}/${version}/${req.file.filename}`;

    // Insert into database
    const result = await pool.query(
      `INSERT INTO pos_versions 
       (id, version, platform, filename, filepath, filesize, checksum_sha256, download_url, 
        mandatory, release_notes, status, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        uuidv4(),
        version,
        platform,
        req.file.filename,
        finalFilePath,
        req.file.size,
        checksum,
        downloadUrl,
        mandatory === 'true' || mandatory === true,
        releaseNotes || null,
        'draft',
        adminUserId
      ]
    );

    const versionRecord = result.rows[0];

    // Log action
    await logUpdateAction(
      'UPLOAD',
      versionRecord.id,
      adminUserId,
      'SUCCESS',
      `Version ${version} uploaded successfully`,
      { filename: req.file.filename, filesize: req.file.size }
    );

    res.status(201).json({
      message: 'Version uploaded successfully',
      version: versionRecord
    });
  } catch (error) {
    console.error('Error uploading version:', error);
    
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /pos-updates/publish/:version - Publish version (make it live)
router.post('/publish/:version', authenticateToken, async (req, res) => {
  try {
    const { version } = req.params;
    const adminUserId = req.user.id;

    // Get version
    const versionResult = await pool.query(
      'SELECT * FROM pos_versions WHERE version = $1',
      [version]
    );

    if (versionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Version not found' });
    }

    const versionRecord = versionResult.rows[0];

    // Verify file exists
    if (!fs.existsSync(versionRecord.filepath)) {
      await logUpdateAction(
        'PUBLISH',
        versionRecord.id,
        adminUserId,
        'FAILED',
        `Installer file not found: ${versionRecord.filepath}`,
        {}
      );
      return res.status(404).json({ error: 'Installer file not found' });
    }

    // Update status to live (trigger will handle archiving old live version)
    await pool.query(
      `UPDATE pos_versions 
       SET status = 'live', published_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE version = $1`,
      [version]
    );

    // Regenerate latest.json
    await generateLatestJson(versionRecord.platform);

    // Log action
    await logUpdateAction(
      'PUBLISH',
      versionRecord.id,
      adminUserId,
      'SUCCESS',
      `Version ${version} published successfully`,
      { platform: versionRecord.platform }
    );

    res.json({
      message: 'Version published successfully',
      version: version
    });
  } catch (error) {
    console.error('Error publishing version:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /pos-updates/rollback/:version - Rollback to previous version
router.post('/rollback/:version', authenticateToken, async (req, res) => {
  try {
    const { version } = req.params;
    const adminUserId = req.user.id;

    // Get current live version
    const currentLive = await pool.query(
      `SELECT * FROM pos_versions 
       WHERE status = 'live' AND platform = (SELECT platform FROM pos_versions WHERE version = $1)
       ORDER BY published_at DESC LIMIT 1`,
      [version]
    );

    if (currentLive.rows.length === 0) {
      return res.status(404).json({ error: 'No live version found to rollback from' });
    }

    // Get target version (the one to rollback to)
    const targetVersion = await pool.query(
      'SELECT * FROM pos_versions WHERE version = $1',
      [version]
    );

    if (targetVersion.rows.length === 0) {
      return res.status(404).json({ error: 'Target version not found' });
    }

    const target = targetVersion.rows[0];

    // Verify target file exists
    if (!fs.existsSync(target.filepath)) {
      await logUpdateAction(
        'ROLLBACK',
        target.id,
        adminUserId,
        'FAILED',
        `Installer file not found: ${target.filepath}`,
        {}
      );
      return res.status(404).json({ error: 'Target installer file not found' });
    }

    // Mark current live as rollback
    await pool.query(
      `UPDATE pos_versions 
       SET status = 'rollback', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [currentLive.rows[0].id]
    );

    // Set target as live
    await pool.query(
      `UPDATE pos_versions 
       SET status = 'live', published_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE version = $1`,
      [version]
    );

    // Regenerate latest.json
    await generateLatestJson(target.platform);

    // Log action
    await logUpdateAction(
      'ROLLBACK',
      target.id,
      adminUserId,
      'SUCCESS',
      `Rolled back from ${currentLive.rows[0].version} to ${version}`,
      { 
        from_version: currentLive.rows[0].version,
        to_version: version,
        platform: target.platform
      }
    );

    res.json({
      message: 'Rollback successful',
      from_version: currentLive.rows[0].version,
      to_version: version
    });
  } catch (error) {
    console.error('Error rolling back version:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /pos-updates/archive/:version - Archive version
router.post('/archive/:version', authenticateToken, async (req, res) => {
  try {
    const { version } = req.params;
    const adminUserId = req.user.id;

    const result = await pool.query(
      'SELECT * FROM pos_versions WHERE version = $1',
      [version]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Version not found' });
    }

    const versionRecord = result.rows[0];

    if (versionRecord.status === 'live') {
      return res.status(400).json({ error: 'Cannot archive live version. Rollback first.' });
    }

    await pool.query(
      `UPDATE pos_versions 
       SET status = 'archived', updated_at = CURRENT_TIMESTAMP
       WHERE version = $1`,
      [version]
    );

    // Log action
    await logUpdateAction(
      'ARCHIVE',
      versionRecord.id,
      adminUserId,
      'SUCCESS',
      `Version ${version} archived`,
      {}
    );

    res.json({
      message: 'Version archived successfully',
      version: version
    });
  } catch (error) {
    console.error('Error archiving version:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /pos-updates/versions/:version - Delete version (cannot delete live)
router.delete('/versions/:version', authenticateToken, async (req, res) => {
  try {
    const { version } = req.params;
    const adminUserId = req.user.id;

    // Get version
    const versionResult = await pool.query(
      'SELECT * FROM pos_versions WHERE version = $1',
      [version]
    );

    if (versionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Version not found' });
    }

    const versionRecord = versionResult.rows[0];

    // Prevent deleting live versions
    if (versionRecord.status === 'live') {
      await logUpdateAction(
        'DELETE',
        versionRecord.id,
        adminUserId,
        'FAILED',
        `Cannot delete live version ${version}. Rollback first.`,
        {}
      );
      return res.status(400).json({ 
        error: 'Cannot delete live version. Please rollback to a different version first, then delete this one.' 
      });
    }

    // Get file path
    const filePath = versionRecord.filepath;

    // Delete from database first
    await pool.query('DELETE FROM pos_versions WHERE version = $1', [version]);

    // Delete associated logs
    await pool.query('DELETE FROM pos_update_logs WHERE version_id = $1', [versionRecord.id]);

    // Delete the file from filesystem
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        // Also try to remove the version directory if empty
        const versionDir = path.dirname(filePath);
        try {
          const files = fs.readdirSync(versionDir);
          if (files.length === 0) {
            fs.rmdirSync(versionDir);
          }
        } catch (err) {
          // Ignore directory removal errors
        }
      } catch (fileError) {
        console.error('Error deleting file:', fileError);
        // Continue even if file deletion fails
      }
    }

    // Log action
    await logUpdateAction(
      'DELETE',
      versionRecord.id,
      adminUserId,
      'SUCCESS',
      `Version ${version} deleted permanently`,
      { filename: versionRecord.filename }
    );

    res.json({
      message: 'Version deleted successfully',
      deletedVersion: {
        version: versionRecord.version,
        filename: versionRecord.filename
      }
    });
  } catch (error) {
    console.error('Error deleting version:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /pos-updates/logs - Get update logs
router.get('/logs', authenticateToken, async (req, res) => {
  try {
    const { versionId, page = 1, limit = 100 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT l.*, v.version, u.username as admin_username
      FROM pos_update_logs l
      LEFT JOIN pos_versions v ON v.id = l.version_id
      LEFT JOIN adminusers u ON u.id = l.admin_user_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (versionId) {
      paramCount++;
      query += ` AND l.version_id = $${paramCount}`;
      params.push(versionId);
    }

    query += ` ORDER BY l.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    const countResult = await pool.query('SELECT COUNT(*) FROM pos_update_logs');

    res.json({
      logs: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// STATIC FILE SERVING (for POS app downloads)
// ============================================
// Note: This route must be registered in index.js before other routes
// The static files are served at /pos-updates/files/*

module.exports = router;

