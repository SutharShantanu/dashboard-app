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
          allowedColumns: "",
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
            allowedColumns: "",
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
        
        // Escape special regex characters to prevent query injection and ReDoS attacks
        const escapedUsername = credentials.username.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const user = await User.findOne({ 
          username: { $regex: new RegExp(`^${escapedUsername}$`, "i") } 
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
          gender: user.gender,
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
        token.gender = (user as any).gender;
        token.perSheetPermissions = (user as any).perSheetPermissions;
        token.name = (user as any).displayName;
      }
      if (trigger === "update") {
        // If explicit values are provided (e.g. profile update), use them
        if (session?.displayName !== undefined) {
          token.displayName = session.displayName;
          token.name = session.displayName;
        }
        if (session?.allowedColumns !== undefined) token.allowedColumns = session.allowedColumns;
        if (session?.perSheetPermissions !== undefined) token.perSheetPermissions = session.perSheetPermissions;

        // Always re-fetch perSheetPermissions from DB to pick up any changes
        // (e.g. new sheet access auto-granted by addConnectedSheet)
        if (token.username) {
          try {
            await connectToDatabase();
            const escapedUsername = (token.username as string).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const freshUser = await User.findOne({
              username: { $regex: new RegExp(`^${escapedUsername}$`, "i") }
            });
            if (freshUser) {
              token.allowedColumns = freshUser.allowedColumns;
              token.perSheetPermissions = freshUser.perSheetPermissions
                ? Object.fromEntries((freshUser.perSheetPermissions as Map<string, string[]>).entries())
                : {};
            }
          } catch (dbErr) {
            console.error("[auth jwt update] Failed to refresh permissions from DB:", dbErr);
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).username = token.username;
        (session.user as any).displayName = token.displayName;
        (session.user as any).role = token.role;
        (session.user as any).allowedColumns = token.allowedColumns;
        (session.user as any).gender = token.gender;
        (session.user as any).perSheetPermissions = token.perSheetPermissions;
        session.user.name = token.displayName as string;
      }
      return session;
    },
  },
  events: {
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

