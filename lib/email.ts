import nodemailer from 'nodemailer';
import crypto from 'crypto';

// ─── Transport ────────────────────────────────────────────────────────────────
// All emails are sent FROM the address in SMTP_USER.
// SMTP_FROM is optional — if not set it falls back to SMTP_USER automatically.
// To change the sending address: just update SMTP_USER (and SMTP_PASS) in .env.

const smtpUser = process.env.SMTP_USER || '';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: process.env.SMTP_SECURE !== 'false', // defaults true; set SMTP_SECURE=false for port 587
  auth: {
    user: smtpUser,
    pass: process.env.SMTP_PASS || '',
  },
});

// "From" header: use SMTP_FROM if explicitly set, otherwise fall back to SMTP_USER.
function getSender(): string {
  const custom = (process.env.SMTP_FROM || '').trim();
  return custom || smtpUser;
}

// ─── OTP email ────────────────────────────────────────────────────────────────
export async function sendOtpEmail(to: string, otp: string) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const resetLink = `${baseUrl}/forgot-password?email=${encodeURIComponent(to)}&otp=${otp}`;

  // Dev fallback: if SMTP is not configured just log — never crash in development.
  if (!smtpUser) {
    console.log(`[DEV] OTP for ${to}: ${otp}`);
    console.log(`[DEV] Reset link: ${resetLink}`);
    return;
  }

  await transporter.sendMail({
    from: getSender(),
    to,
    subject: 'Your OTP Verification Code',
    text: `Your OTP is: ${otp}. It will expire in 10 minutes.\nReset link: ${resetLink}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e2e8f0;border-radius:12px;">
        <h2 style="color:#0f172a;margin-bottom:16px;">Your OTP Verification Code</h2>
        <p style="color:#475569;font-size:14px;line-height:20px;">
          Please use the following 6-digit code to complete your verification.
        </p>
        <div style="background:#f8fafc;padding:16px;text-align:center;font-size:28px;letter-spacing:6px;font-weight:bold;border-radius:8px;color:#0f172a;margin:24px 0;border:1px dashed #cbd5e1;">
          ${otp}
        </div>
        <p style="color:#475569;font-size:14px;line-height:20px;text-align:center;margin-bottom:24px;">
          This code will expire in 10 minutes.
        </p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${resetLink}" style="background:#0f172a;color:#fff;padding:12px 24px;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;display:inline-block;">
            Reset Password Directly
          </a>
        </div>
        <p style="font-size:11px;color:#94a3b8;line-height:16px;margin-top:32px;border-top:1px solid #e2e8f0;padding-top:16px;">
          Or copy and paste this link in your browser:<br/>
          <a href="${resetLink}" style="color:#2563eb;text-decoration:none;">${resetLink}</a>
        </p>
        <p style="color:#94a3b8;font-size:12px;margin-top:16px;">
          If you did not request this, please ignore this email.
        </p>
      </div>
    `,
  });
}

// ─── OTP generator ────────────────────────────────────────────────────────────
export function generateOtp(): string {
  return crypto.randomInt(100_000, 1_000_000).toString();
}
