import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import Auth0Provider from "next-auth/providers/auth0";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import connectToDatabase from "./mongodb";
import User from "../models/User";
import { appendAuditLog } from "./sheets";
import { escapeRegex } from "./utils-internal";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      profile(profile) {
        // Security: Block all Google logins unless the email matches an allowlist
        // or belongs to an approved domain. Configure via environment variables:
        //   GOOGLE_ALLOWED_EMAILS=admin@company.com,ops@company.com
        //   GOOGLE_ALLOWED_DOMAIN=company.com
        const allowedEmails = (process.env.GOOGLE_ALLOWED_EMAILS || "")
          .split(",")
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean);
        const allowedDomain = (process.env.GOOGLE_ALLOWED_DOMAIN || "").trim().toLowerCase();
        const email = (profile.email || "").toLowerCase();

        const isAllowedByEmail = allowedEmails.length > 0 && allowedEmails.includes(email);
        const isAllowedByDomain =
          allowedDomain.length > 0 && email.endsWith(`@${allowedDomain}`);

        if (!isAllowedByEmail && !isAllowedByDomain) {
          // When no allowlist is configured at all, reject all Google logins to fail-safe.
          if (allowedEmails.length === 0 && !allowedDomain) {
            throw new Error(
              "Google sign-in is not configured. Set GOOGLE_ALLOWED_EMAILS or GOOGLE_ALLOWED_DOMAIN."
            );
          }
          throw new Error(
            `Access denied: ${profile.email} is not authorized to access this application.`
          );
        }

        return {
          id: profile.sub,
          username: profile.email.split("@")[0],
          name: profile.name,
          displayName: profile.name,
          role: "sub-admin" as const,
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
          // TODO(owner): gate admin role behind an allowlist once SSO usage in prod is confirmed.
          return {
            id: profile.sub,
            username: profile.nickname || profile.name || "sso_user",
            name: profile.name,
            displayName: profile.name || "SSO User",
            role: "sub-admin" as const,
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
        const user = await User.findOne({
          username: { $regex: new RegExp(`^${escapeRegex(credentials.username)}$`, "i") },
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
        if (session?.gender !== undefined) token.gender = session.gender;

        // Always re-fetch perSheetPermissions and gender from DB to pick up any changes
        // (e.g. new sheet access auto-granted by addConnectedSheet)
        if (token.username) {
          try {
            await connectToDatabase();
            const freshUser = await User.findOne({
              username: { $regex: new RegExp(`^${escapeRegex(token.username as string)}$`, "i") },
            });
            if (freshUser) {
              token.allowedColumns = freshUser.allowedColumns;
              token.gender = freshUser.gender || "";
              token.perSheetPermissions = freshUser.perSheetPermissions
                ? Object.fromEntries((freshUser.perSheetPermissions as Map<string, string[]>).entries())
                : {};
            }
          } catch (dbErr) {
            console.error("[auth jwt update] Failed to refresh permissions/gender from DB:", dbErr);
          }
        }
      }

      // Backward compatibility fallback: if session JWT does not contain gender (pre-migration session),
      // fetch it dynamically from DB so user gets their correct gender-specific avatar immediately.
      if (!token.gender && token.username) {
        try {
          await connectToDatabase();
          const freshUser = await User.findOne({
            username: { $regex: new RegExp(`^${escapeRegex(token.username as string)}$`, "i") },
          });
          if (freshUser) {
            token.gender = freshUser.gender || "";
          }
        } catch (dbErr) {
          console.error("[auth jwt fallback] Failed to fetch gender from DB:", dbErr);
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
  secret: process.env.NEXTAUTH_SECRET,
};

