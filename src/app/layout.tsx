import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource/instrument-serif/400-italic.css";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import { AppProvider } from "@/components/providers/app-provider";

export const metadata: Metadata = {
  title: { default: "FixFlow — Incident to Resolution", template: "%s · FixFlow" },
  description: "Human-approved incident investigation and resolution workflows.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body><AppProvider>{children}</AppProvider></body>
    </html>
  );
}

