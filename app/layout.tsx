import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "专利研习 | 科研主题探索",
  description: "面向工科学生的专利情报学习与科研主题探索。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
