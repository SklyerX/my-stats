import { Geist, Geist_Mono } from "next/font/google";
import React, { type ReactNode } from "react";
import "@workspace/ui/globals.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased dark`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
