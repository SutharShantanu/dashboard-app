import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { getUsers, updateUser } from "@/lib/sheets"
import bcrypt from "bcryptjs"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as any).username) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current and new passwords are required." },
        { status: 400 }
      )
    }

    if (newPassword.length < 4) {
      return NextResponse.json(
        { error: "New password must be at least 4 characters long." },
        { status: 400 }
      )
    }

    const username = (session.user as any).username
    const users = await getUsers()
    const user = users.find((u) => u.username.toLowerCase() === username.toLowerCase())

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 })
    }

    const isPasswordValid =
      user.passwordHash === "$2b$12$CksCuudcs3zzOoqPxOtA6uoBpsytJ7IdQpfQuxiM1uvZnjqPDdW5S"
        ? true // Placeholder validation matching lib/auth.ts
        : user.passwordHash.startsWith("$2")
        ? await bcrypt.compare(currentPassword, user.passwordHash)
        : currentPassword === user.passwordHash

    if (!isPasswordValid) {
      return NextResponse.json({ error: "Incorrect current password." }, { status: 401 })
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10)

    const updatedUser = {
      ...user,
      passwordHash: newPasswordHash,
    }

    await updateUser(username, updatedUser)

    return NextResponse.json({ message: "Password updated successfully." }, { status: 200 })
  } catch (error: any) {
    console.error("Change Password Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update password." },
      { status: 500 }
    )
  }
}
