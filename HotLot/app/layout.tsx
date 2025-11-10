import "./globals.css";
import React from "react";

export const metadata = {
  title: "HotLot — Property Shortlister MVP",
  description: "Match buyer strategy to properties with growth, commute, and quietness scoring.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
