"use client"

import { Check, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function isStrongPassword(password: string): boolean {
  if (!password) return false;
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  return hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecial;
}

interface PasswordStrengthProps {
  password?: string;
  className?: string;
}

export function PasswordStrength({ password = "", className }: PasswordStrengthProps) {
  const requirements = [
    { label: "At least 8 characters", test: (pw: string) => pw.length >= 8 },
    { label: "At least one uppercase letter", test: (pw: string) => /[A-Z]/.test(pw) },
    { label: "At least one lowercase letter", test: (pw: string) => /[a-z]/.test(pw) },
    { label: "At least one number", test: (pw: string) => /[0-9]/.test(pw) },
    { label: "At least one special character", test: (pw: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pw) },
  ];

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {requirements.map((req, i) => {
          const isMet = req.test(password);
          return (
            <div key={i} className="flex items-center gap-2">
              {isMet ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-muted-foreground/40" />
              )}
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors",
                  isMet ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                )}
              >
                {req.label}
              </span>
            </div>
          );
        })}
      </div>
      
      {/* Progress Bar for visual feedback */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[9px] uppercase tracking-wider font-black">
          <span className="text-muted-foreground/60">Security Score</span>
          <span className={cn(
            isStrongPassword(password) ? "text-emerald-500" : "text-muted-foreground/40"
          )}>
            {isStrongPassword(password) ? "Shield Active" : "Vulnerable"}
          </span>
        </div>
        <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full transition-all duration-700 ease-in-out",
              isStrongPassword(password) ? "w-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "w-1/4 bg-muted-foreground/20"
            )} 
          />
        </div>
      </div>
    </div>
  );
}
