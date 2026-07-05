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
  title: 'Stepay | Send, save & get paid across Africa',
  description: 'Dollar wallet for people, freelancers, and businesses. Send across Africa, hold USDC & XLM, accept payments, and cash out to mobile money. No bank account needed.',
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
