import { Raleway, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { cn } from "@/lib/utils";

const raleway = Raleway({
  subsets: ["latin"],
  variable: "--font-raleway",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata = {
  title: "Saba Admin Dashboard",
  description: "Secure administrative dashboard for managing student records, analyzing metrics, and syncing sheets.",
  applicationName: "Saba Dashboard",
  keywords: ["Saba", "Dashboard", "Admin", "Student Records", "Analytics"],
  authors: [{ name: "Saba Team" }],
  metadataBase: new URL("https://dashboard.saba.edu"),
  openGraph: {
    title: "Saba Admin Dashboard",
    description: "Secure administrative dashboard for managing student records, analyzing metrics, and syncing sheets.",
    url: "https://dashboard.saba.edu",
    siteName: "Saba Admin Dashboard",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Saba Admin Dashboard Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Saba Admin Dashboard",
    description: "Secure administrative dashboard for managing student records and analytics.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, raleway.variable, "font-sans")}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}