import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ChatProvider } from "./context/ChatContext";
import { Toaster } from "react-hot-toast";
import { Analytics } from '@vercel/analytics/next';
import { ApiKeyProvider } from "./context/APIContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Conceptify.AI",
  description: "App for generating concept maps from conversations with LLMs.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ApiKeyProvider>
          <ChatProvider>
            {children}
          </ChatProvider>
        </ApiKeyProvider>
        <Toaster position="top-center" />
        <Analytics />
      </body>
    </html>
  );
}