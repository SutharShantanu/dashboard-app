import { NextRequest, NextResponse } from "next/server";
import { getUsers, updateUser } from "@/lib/sheets";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { email, otp, newPassword } = await req.json();

    if (!email || !otp) {
      return NextResponse.json(
        { error: "Email and OTP are required" },
        { status: 400 }
      );
    }

    const users = await getUsers();
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or OTP." },
        { status: 400 }
      );
    }

    if (user.otpCode !== otp) {
      return NextResponse.json(
        { error: "Invalid OTP." },
        { status: 400 }
      );
    }

    if (user.otpExpiry && new Date(user.otpExpiry).getTime() < Date.now()) {
      return NextResponse.json(
        { error: "OTP has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // OTP is valid. Clear it out.
    const updates: any = {
      otpCode: "",
      otpExpiry: "",
    };

    let message = "Email verified successfully.";

    // If a new password is provided, reset it
    if (newPassword) {
      const passwordHash = await bcrypt.hash(newPassword, 12);
      updates.passwordHash = passwordHash;
      message = "Password reset successfully.";
    }

    await updateUser(
      user.username,
      updates
    );

    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    console.error("Verify OTP API error:", error);
    return NextResponse.json(
      { error: "Failed to verify OTP." },
      { status: 500 }
    );
  }
}
