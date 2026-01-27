const nodemailer = require('nodemailer');
const path = require('path');

// Ensure we load .env from backend directory
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const TWO_FA_EMAIL = process.env.TWO_FA_EMAIL || 'hussnain0341@gmail.com';

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true';

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

/**
 * Send 2FA code to the configured email
 * @param {string} code - 6-digit code
 * @param {string} username - Admin username (for the email body)
 * @returns {Promise<{ sent: boolean, error?: string }>}
 */
async function send2FACode(code, username) {
  const to = TWO_FA_EMAIL;
  const transporter = getTransporter();

  if (!transporter) {
    console.error('2FA Email: SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env');
    return { sent: false, error: 'Email service not configured' };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #2563eb;">HisaabKitab License Admin - Login Verification</h2>
      <p>Someone is trying to log in to the admin panel as <strong>${username}</strong>.</p>
      <p>Use this one-time code to complete login:</p>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #1e40af; background: #eff6ff; padding: 16px; border-radius: 8px; text-align: center;">${code}</p>
      <p style="color: #6b7280; font-size: 14px;">This code expires in 10 minutes. If you did not request this, ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
      <p style="color: #9ca3af; font-size: 12px;">HisaabKitab License Admin System</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"HisaabKitab Admin" <${from}>`,
      to,
      subject: `[HisaabKitab] Your login code: ${code}`,
      html,
      text: `Your HisaabKitab admin login code is: ${code}. It expires in 10 minutes.`,
    });
    return { sent: true };
  } catch (err) {
    console.error('2FA Email send error:', err.message);
    return { sent: false, error: err.message };
  }
}

/**
 * Send 2FA code for password change
 * @param {string} code - 6-digit code
 * @param {string} username - Admin username (for the email body)
 * @returns {Promise<{ sent: boolean, error?: string }>}
 */
async function sendPasswordChange2FA(code, username) {
  const to = TWO_FA_EMAIL;
  const transporter = getTransporter();

  if (!transporter) {
    console.error('Password Change 2FA Email: SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env');
    return { sent: false, error: 'Email service not configured' };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #dc2626;">HisaabKitab License Admin - Password Change Verification</h2>
      <p>A password change has been requested for the admin account <strong>${username}</strong>.</p>
      <p>Use this one-time code to confirm the password change:</p>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #dc2626; background: #fef2f2; padding: 16px; border-radius: 8px; text-align: center; border: 2px solid #fecaca;">${code}</p>
      <p style="color: #6b7280; font-size: 14px;">This code expires in 10 minutes. If you did not request this password change, please ignore this email and contact support immediately.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
      <p style="color: #9ca3af; font-size: 12px;">HisaabKitab License Admin System</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"HisaabKitab Admin" <${from}>`,
      to,
      subject: `[HisaabKitab] Password change verification code: ${code}`,
      html,
      text: `Your HisaabKitab admin password change verification code is: ${code}. It expires in 10 minutes. If you did not request this, please ignore this email.`,
    });
    return { sent: true };
  } catch (err) {
    console.error('Password Change 2FA Email send error:', err.message);
    return { sent: false, error: err.message };
  }
}

module.exports = { send2FACode, sendPasswordChange2FA, TWO_FA_EMAIL };


