import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "SkyCast | Modern Weather",
    template: "%s | SkyCast",
  },

  description:
    "Get real-time weather conditions, temperature, humidity, wind speed and a 7-day forecast for cities worldwide.",

  applicationName: "SkyCast",

  keywords: [
    "weather",
    "weather forecast",
    "live weather",
    "current weather",
    "weather app",
    "temperature",
    "7 day forecast",
  ],

  authors: [
    {
      name: "SkyCast",
    },
  ],

  creator: "SkyCast",
  publisher: "SkyCast",

  metadataBase: new URL("https://knowaboutweather.vercel.app"),

  robots: {
    index: true,
    follow: true,
  },

  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },

  appleWebApp: {
    capable: true,
    title: "SkyCast",
    statusBarStyle: "black-translucent",
  },

  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,

  themeColor: [
    {
      media: "(prefers-color-scheme: dark)",
      color: "#071A3D",
    },
    {
      media: "(prefers-color-scheme: light)",
      color: "#071A3D",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}