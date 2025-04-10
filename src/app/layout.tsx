import type { Metadata } from "next";
import { ChatProvider } from "@/app/context/ChatContext";
import { ApiKeyProvider } from "@/app/context/APIContext";
import { Toaster } from "react-hot-toast";
import { Analytics } from '@vercel/analytics/next';
import { Inter } from 'next/font/google';
import "@/app/globals.css";
 
export const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "Conceptify.AI",
  description: "Conceptify.AI lets you build interactive concept maps from your conversations with AI - supporting meaningful learning by making it easier to visually organize ideas and recall information.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} antialiased`}
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