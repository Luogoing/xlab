import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "XLAB · 专利研习",
  description: "检索专利，读懂证据，形成研究判断。",
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
