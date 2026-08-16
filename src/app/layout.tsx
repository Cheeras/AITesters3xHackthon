import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TraceQA | AI Test Case Generator",
  description:
    "Generate deterministic, traceable QA test cases from Jira, GitHub, PRDs, and pasted requirements.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
