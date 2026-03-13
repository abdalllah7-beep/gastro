import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gastro MCQ Bank - Gastroenterology Questions",
  description: "Comprehensive MCQ bank for gastroenterology with 300 practice questions, explanations, and key points. Track your progress and ace your exams.",
  keywords: ["Gastroenterology", "MCQ", "Medical", "Exam", "Questions", "GI", "Gastro", "Study"],
  authors: [{ name: "Gastro MCQ Bank" }],
  icons: {
    icon: "/favicon.png",
  },
  openGraph: {
    title: "Gastro MCQ Bank",
    description: "300 Gastroenterology MCQs with explanations",
    url: "https://gastro-mcq.vercel.app",
    siteName: "Gastro MCQ Bank",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gastro MCQ Bank",
    description: "300 Gastroenterology MCQs with explanations",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
