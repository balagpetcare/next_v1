import "@/src/styles/globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BPA Owner Panel",
  description: "Owner Panel UI (Sidebar + Branch Management)"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
