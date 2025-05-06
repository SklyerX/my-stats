import { Geist, Geist_Mono } from "next/font/google";
import React, { type ReactNode } from "react";
import "@workspace/ui/globals.css";
import { Providers } from "@/components/providers";
import Footer from "@/components/footer";

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
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased dark overflow-x-hidden`}
      >
        <Providers>{children}</Providers>
        <Footer />
      </body>
    </html>
  );
}
