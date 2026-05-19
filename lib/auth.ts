import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import Auth0Provider from "next-auth/providers/auth0";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import connectToDatabase from "./mongodb";
import User from "../models/User";
import { appendAuditLog } from "./sheets";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      profile(profile) {
        return {
          id: profile.sub,
          username: profile.email.split("@")[0],
          name: profile.name,
          displayName: profile.name,
          role: "admin",
          allowedColumns: "*",
        };
      },
    }),
    ...(process.env.AUTH0_CLIENT_ID && process.env.AUTH0_ISSUER ? [
      Auth0Provider({
        clientId: process.env.AUTH0_CLIENT_ID,
        clientSecret: process.env.AUTH0_CLIENT_SECRET || "",
        issuer: process.env.AUTH0_ISSUER,
        profile(profile) {
          return {
            id: profile.sub,
            username: profile.nickname || profile.name || "sso_user",
            name: profile.name,
            displayName: profile.name || "SSO Administrator",
            role: "admin",
            allowedColumns: "*",
          };
        },
      })
    ] : []),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Missing username or password");
        }

        await connectToDatabase();
        const user = await User.findOne({ 
          username: { $regex: new RegExp(`^${credentials.username}$`, "i") } 
        });

        if (!user) {
          throw new Error("Invalid username or password");
        }

        if (!user.isActive) {
          throw new Error("Your account has been deactivated");
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);

        if (!isPasswordValid) {
          throw new Error("Invalid username or password");
        }

        return {
          id: user.username,
          username: user.username,
          name: user.displayName,
          displayName: user.displayName,
          role: user.role,
          allowedColumns: user.allowedColumns,
          perSheetPermissions: user.perSheetPermissions ? Object.fromEntries(user.perSheetPermissions.entries()) : {},
        };
      },
    }),
  ],
  useSecureCookies: !!process.env.VERCEL || (process.env.NEXTAUTH_URL?.startsWith("https://") ?? false),
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.username = (user as any).username;
        token.displayName = (user as any).displayName;
        token.role = (user as any).role;
        token.allowedColumns = (user as any).allowedColumns;
        token.perSheetPermissions = (user as any).perSheetPermissions;
        token.name = (user as any).displayName;
      }
      if (trigger === "update" && session) {
        if (session.displayName !== undefined) {
          token.displayName = session.displayName;
          token.name = session.displayName;
        }
        if (session.allowedColumns !== undefined) token.allowedColumns = session.allowedColumns;
        if (session.perSheetPermissions !== undefined) token.perSheetPermissions = session.perSheetPermissions;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).username = token.username;
        (session.user as any).displayName = token.displayName;
        (session.user as any).role = token.role;
        (session.user as any).allowedColumns = token.allowedColumns;
        (session.user as any).perSheetPermissions = token.perSheetPermissions;
        session.user.name = token.displayName as string;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      const timestamp = new Date().toISOString();
      await appendAuditLog({
        timestamp,
        actor: user.username || (user as any).id || "unknown",
        actorDisplayName: user.name || user.username || "SSO User",
        actorRole: (user as any).role || "admin",
        action: "LOGIN",
        targetRow: "SESSION",
        ip: "captured-at-login",
        details: `User ${user.name} logged in via ${user.image ? "OAuth" : "Credentials"}`
      });
    },
    async signOut({ token }) {
      const timestamp = new Date().toISOString();
      await appendAuditLog({
        timestamp,
        actor: token.username as string || "unknown",
        actorDisplayName: token.displayName as string || "User",
        actorRole: token.role as string || "unknown",
        action: "LOGOUT",
        targetRow: "SESSION",
        details: "User logged out"
      });
    },
  },
  pages: {
    signIn: "/login",
    error: "/auth-error",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET || "fallback-secret-key-at-least-32-characters-long",
};

