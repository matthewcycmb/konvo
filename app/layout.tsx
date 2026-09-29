import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PostHogProvider } from "@/components/posthog-provider";
import { HumanBehaviorInit } from "./HumanBehaviorInit";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "Konvo: DMs Only",
  description: "Instagram DMs only. Konvo shows your messages and blocks the Feed, Explore and Reels, on iPhone and Mac.",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#b4d0ea",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <HumanBehaviorInit />
        <PostHogProvider>{children}</PostHogProvider>
        <Analytics />
      </body>
    </html>
  );
}
