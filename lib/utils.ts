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
export function getAvatarUrl(username: string, role?: string, gender?: string): string {
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
  
  // Calculate a stable index for seeded avatars
  let hash = 0;
  for (let i = 0; i < cleanUsername.length; i++) {
    hash += cleanUsername.charCodeAt(i);
  }
  
  let seed = cleanUsername;
  const cleanGender = (gender || "").toLowerCase().trim();
  if (cleanGender === "female") {
    const femaleSeeds = ["Sarah", "Lily", "Emily", "Sophia", "Chloe", "Zoe", "Grace", "Aria", "Mia", "Ella"];
    seed = femaleSeeds[hash % femaleSeeds.length];
  } else if (cleanGender === "male") {
    const maleSeeds = ["John", "Jack", "James", "Oliver", "Harry", "Charlie", "Thomas", "George", "Leo", "Noah"];
    seed = maleSeeds[hash % maleSeeds.length];
  }
  
  return `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${bg}&radius=50`;
}


export function generateSecurePassword(): string {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  const lowercase = "abcdefghijklmnopqrstuvwxyz"
  const numbers = "0123456789"
  const specials = "!@#$%^&*()_+~`|}{[]:;?><,./-="

  let password = ""
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += specials[Math.floor(Math.random() * specials.length)]

  const allChars = uppercase + lowercase + numbers + specials
  for (let i = 0; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }

  return password
}
