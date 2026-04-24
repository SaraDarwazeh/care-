import type { Metadata } from "next";
import { Nunito, Source_Sans_3 } from "next/font/google";
import AppProviders from "@/components/providers/AppProviders";
import "./globals.css";

const headingFont = Nunito({
  variable: "--font-heading",
  subsets: ["latin"],
});

const bodyFont = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Care Plus",
  description: "Beginner-friendly healthcare MVP foundation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${headingFont.variable} ${bodyFont.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground font-sans">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
