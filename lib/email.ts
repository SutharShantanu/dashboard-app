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
  // If SMTP is not configured, we'll just log the OTP for testing purposes.
  if (!process.env.SMTP_HOST) {
    console.log(`[TESTING] OTP for ${to} is: ${otp}`);
    return;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Aegis Sheet Portal" <noreply@example.com>',
      to,
      subject: 'Your OTP Verification Code',
      text: `Your OTP is: ${otp}. It will expire in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Your OTP Verification Code</h2>
          <p>Please use the following 6-digit code to complete your verification.</p>
          <div style="background-color: #f4f4f4; padding: 16px; text-align: center; font-size: 24px; letter-spacing: 4px; font-weight: bold; border-radius: 8px;">
            ${otp}
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you did not request this, please ignore this email.</p>
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
