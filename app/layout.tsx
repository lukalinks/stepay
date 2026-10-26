import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MuiProvider } from "@/components/MuiProvider";
import { ChunkLoadRecovery } from "@/components/ChunkLoadRecovery";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'Stepay | Your dollar wallet for Africa',
  description:
    'Send money across Africa, hold USDC, and get paid — all from one non-custodial wallet. Mobile money on-ramp, ~5s transfers on Stellar, no bank account needed.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <MuiProvider>
          <ChunkLoadRecovery />
          {children}
        </MuiProvider>
      </body>
    </html>
  );
}
