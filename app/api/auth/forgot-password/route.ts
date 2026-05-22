import { NextRequest, NextResponse } from "next/server";
import { getUsers, updateUser } from "@/lib/sheets";
import { generateOtp, sendOtpEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const users = await getUsers();
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      // For security, don't reveal if the email exists or not, just return success
      // but in an internal tool, returning 404 is fine.
      return NextResponse.json(
        { error: "No account associated with this email." },
        { status: 404 }
      );
    }

    // Server-side safe cooldown rate limiting: 60 seconds cooldown derived from otpExpiry
    if (user.otpExpiry) {
      const lastSentTime = new Date(user.otpExpiry).getTime() - 10 * 60 * 1000;
      const timePassed = Date.now() - lastSentTime;
      const cooldown = 60 * 1000; // 60 seconds cooldown
      if (timePassed < cooldown) {
        const secondsLeft = Math.ceil((cooldown - timePassed) / 1000);
        return NextResponse.json(
          { error: `Please wait ${secondsLeft} seconds before requesting another code.` },
          { status: 429 }
        );
      }
    }

    const otp = generateOtp();
    // Expiry 10 minutes from now
    const expiry = new Date(Date.now() + 10 * 60000).toISOString();

    await updateUser(
      user.username,
      { otpCode: otp, otpExpiry: expiry }
    );

    await sendOtpEmail(email, otp);

    return NextResponse.json({ success: true, message: "OTP sent successfully" });
  } catch (error: any) {
    console.error("Forgot password API error:", error);
    return NextResponse.json(
      { error: "Failed to process forgot password request." },
      { status: 500 }
    );
  }
}
