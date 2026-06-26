import type { Metadata } from "next";
import "./globals.css";
import LangInitializer from "@/components/layout/lang-initializer";

export const metadata: Metadata = {
  title: "PCB Inspect",
  description: "Automated PCB defect detection",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LangInitializer />
        {children}
      </body>
    </html>
  );
}
