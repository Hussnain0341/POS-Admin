#!/usr/bin/env node
/**
 * Database Backup Script
 * Run this via cron job for daily backups
 * Example cron: 0 2 * * * /usr/bin/node /path/to/scripts/backup-database.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.join(__dirname, '../backups');
const DB_NAME = process.env.DB_NAME || 'license_admin';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 5432;

// Create backups directory if it doesn't exist
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Generate backup filename with timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
const backupFile = path.join(BACKUP_DIR, `license_admin_${timestamp}.sql`);

// PG_DUMP command
const pgDumpCommand = `PGPASSWORD="${process.env.DB_PASSWORD}" pg_dump -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -F c -f "${backupFile}"`;

console.log(`🔄 Starting database backup: ${backupFile}`);

exec(pgDumpCommand, (error, stdout, stderr) => {
  if (error) {
    console.error(`❌ Backup failed: ${error.message}`);
    process.exit(1);
  }

  if (stderr) {
    console.error(`⚠️  Warning: ${stderr}`);
  }

  console.log(`✅ Backup completed: ${backupFile}`);
  
  // Get file size
  const stats = fs.statSync(backupFile);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`   Size: ${fileSizeMB} MB`);

  // Clean up old backups (keep last 30 days)
  console.log('🧹 Cleaning up old backups...');
  const files = fs.readdirSync(BACKUP_DIR);
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  files.forEach(file => {
    if (file.startsWith('license_admin_') && file.endsWith('.sql')) {
      const filePath = path.join(BACKUP_DIR, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtime.getTime() > thirtyDays) {
        fs.unlinkSync(filePath);
        console.log(`   Deleted old backup: ${file}`);
      }
    }
  });

  console.log('✅ Backup process completed');
});


