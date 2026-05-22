import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates a Dicebear "notionists" avatar URL based on username and role.
 * Role-themed background colors are applied for premium styling:
 * - SabaAdmin: Warm amber-gold (fde68a)
 * - Admin: Royal soft blue (bfdbfe)
 * - Sub-admin: Emerald pastel green (a7f3d0)
 */
export function getAvatarUrl(username: string, role?: string): string {
  const cleanUsername = (username || "user").trim();
  const lowerUsername = cleanUsername.toLowerCase();
  
  let bg = "bfdbfe"; // default soft blue for general admin/user
  
  if (lowerUsername === "sabaadmin") {
    bg = "fde68a"; // Warm amber gold
  } else if (role === "admin" || lowerUsername.includes("admin")) {
    bg = "bfdbfe"; // Premium soft blue
  } else {
    bg = "a7f3d0"; // Premium soft green
  }
  
  return `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(cleanUsername)}&backgroundColor=${bg}&radius=50`;
}

