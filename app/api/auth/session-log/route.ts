import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { appendAuditLog } from "@/lib/sheets";

// Minimal UA parser — no external deps needed
function parseUserAgent(ua: string): { browser: string; os: string; device: string } {
  if (!ua) return { browser: "Unknown", os: "Unknown", device: "Unknown" };

  // Browser detection (order matters — Edge before Chrome, etc.)
  let browser = "Unknown";
  if (/Edg\//.test(ua)) browser = `Edge ${(ua.match(/Edg\/([\d.]+)/) || [])[1] || ""}`.trim();
  else if (/OPR\/|Opera/.test(ua)) browser = `Opera ${(ua.match(/OPR\/([\d.]+)/) || [])[1] || ""}`.trim();
  else if (/Firefox\//.test(ua)) browser = `Firefox ${(ua.match(/Firefox\/([\d.]+)/) || [])[1] || ""}`.trim();
  else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = `Safari ${(ua.match(/Version\/([\d.]+)/) || [])[1] || ""}`.trim();
  else if (/Chrome\//.test(ua)) browser = `Chrome ${(ua.match(/Chrome\/([\d.]+)/) || [])[1] || ""}`.trim();
  else if (/MSIE |Trident\//.test(ua)) browser = "Internet Explorer";

  // OS detection
  let os = "Unknown";
  if (/Windows NT 10/.test(ua)) os = "Windows 10/11";
  else if (/Windows NT 6\.3/.test(ua)) os = "Windows 8.1";
  else if (/Windows NT 6\.1/.test(ua)) os = "Windows 7";
  else if (/Windows/.test(ua)) os = "Windows";
  else if (/iPhone OS/.test(ua)) os = `iOS ${(ua.match(/iPhone OS ([\d_]+)/) || [])[1]?.replace(/_/g, ".") || ""}`.trim();
  else if (/iPad/.test(ua)) os = `iPadOS ${(ua.match(/OS ([\d_]+)/) || [])[1]?.replace(/_/g, ".") || ""}`.trim();
  else if (/Android/.test(ua)) os = `Android ${(ua.match(/Android ([\d.]+)/) || [])[1] || ""}`.trim();
  else if (/Mac OS X/.test(ua)) os = `macOS ${(ua.match(/Mac OS X ([\d_]+)/) || [])[1]?.replace(/_/g, ".") || ""}`.trim();
  else if (/Linux/.test(ua)) os = "Linux";
  else if (/CrOS/.test(ua)) os = "ChromeOS";

  // Device type
  let device = "Desktop";
  if (/Mobi|Android(?!.*Tablet)|iPhone/.test(ua)) device = "Mobile";
  else if (/Tablet|iPad|PlayBook|Silk/.test(ua)) device = "Tablet";

  return { browser, os, device };
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;

    // Capture real IP from headers
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "Unknown";

    const rawUA = request.headers.get("user-agent") || "";
    const { browser, os, device } = parseUserAgent(rawUA);

    // Try geo-lookup via ip-api (free, no key needed, works server-side)
    let location = "Unknown location";
    try {
      // Skip for loopback / private ranges
      const isPrivate = /^(127\.|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.|::1$|localhost)/.test(ip);
      if (!isPrivate && ip !== "Unknown") {
        const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,city,regionName,country`, {
          signal: AbortSignal.timeout(2000),
        });
        const geo = await geoRes.json();
        if (geo.status === "success") {
          location = [geo.city, geo.regionName, geo.country].filter(Boolean).join(", ");
        }
      } else {
        location = "Local / Private network";
      }
    } catch {
      // Geo lookup is best-effort — don't fail the whole request
    }

    const details = [
      `Signed in via Credentials`,
      `Browser: ${browser}`,
      `OS: ${os}`,
      `Device: ${device}`,
      `Location: ${location}`,
      `IP: ${ip}`,
    ].join(" · ");

    await appendAuditLog({
      timestamp: new Date().toISOString(),
      actor: user.username || "unknown",
      actorDisplayName: user.name || user.username || "User",
      actorRole: user.role || "user",
      action: "LOGIN",
      targetRow: "SESSION",
      ip,
      userAgent: rawUA,
      details,
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[POST /api/auth/session-log] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to log session" }, { status: 500 });
  }
}
