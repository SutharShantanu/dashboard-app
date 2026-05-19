import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      username: string;
      displayName: string;
      role: "admin" | "sub-admin";
      allowedColumns: string;
      perSheetPermissions?: Record<string, string[]>;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    username: string;
    displayName: string;
    role: "admin" | "sub-admin";
    allowedColumns: string;
    perSheetPermissions?: Record<string, string[]>;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    username: string;
    displayName: string;
    role: "admin" | "sub-admin";
    allowedColumns: string;
    perSheetPermissions?: Record<string, string[]>;
  }
}

