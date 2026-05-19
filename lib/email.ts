import nodemailer from 'nodemailer';

const smtpConfig = {
  host: process.env.SMTP_HOST || '',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
};

const transporter = nodemailer.createTransport(smtpConfig);

export async function sendOtpEmail(to: string, otp: string) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const resetLink = `${baseUrl}/forgot-password?email=${encodeURIComponent(to)}&otp=${otp}`;

  // If SMTP is not configured, we'll just log the OTP and link for testing purposes.
  if (!process.env.SMTP_HOST) {
    console.log(`[TESTING] OTP for ${to} is: ${otp}`);
    console.log(`[TESTING] Reset link: ${resetLink}`);
    return;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Aegis Sheet Portal" <noreply@example.com>',
      to,
      subject: 'Your OTP Verification Code',
      text: `Your OTP is: ${otp}. It will expire in 10 minutes. Reset Link: ${resetLink}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #0f172a; margin-bottom: 16px;">Your OTP Verification Code</h2>
          <p style="color: #475569; font-size: 14px; line-height: 20px;">Please use the following 6-digit code to complete your verification.</p>
          <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 28px; letter-spacing: 6px; font-weight: bold; border-radius: 8px; color: #0f172a; margin: 24px 0; border: 1px dashed #cbd5e1;">
            ${otp}
          </div>
          <p style="color: #475569; font-size: 14px; line-height: 20px; text-align: center; margin-bottom: 24px;">This code will expire in 10 minutes.</p>
          
          <div style="text-align: center; margin: 24px 0;">
            <a href="${resetLink}" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 6px; display: inline-block; transition: background-color 0.2s;">
              Reset Password Directly
            </a>
          </div>
          
          <p style="font-size: 11px; color: #94a3b8; line-height: 16px; margin-top: 32px; border-t: 1px solid #e2e8f0; padding-top: 16px;">
            Or copy and paste this link in your browser:<br/>
            <a href="${resetLink}" style="color: #2563eb; text-decoration: none;">${resetLink}</a>
          </p>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 16px;">If you did not request this, please ignore this email.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send OTP email:', error);
    throw new Error('Failed to send email');
  }
}

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
