const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const auditLog = async (action, details = {}, licenseId = null, req = null) => {
  try {
    const ipAddress = req ? (req.ip || req.connection.remoteAddress) : null;
    const userAgent = req ? req.get('user-agent') : null;

    await pool.query(
      'INSERT INTO AuditLogs (id, licenseId, action, details, ipAddress, userAgent) VALUES ($1, $2, $3, $4, $5, $6)',
      [uuidv4(), licenseId, action, JSON.stringify(details), ipAddress, userAgent]
    );
  } catch (error) {
    console.error('Audit log error:', error);
    // Don't throw - audit logging should not break the main flow
  }
};

module.exports = { auditLog };

