// app/layout.js (server component)
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavbarWrapper from "./NavbarWrapper"; // Client component
import Footer from "./footer/page";
import AddressSyncWrapper from "./AddressSyncWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "A quick commerce Web application",
  description: "We deliver the best products to your doorstep",
  icons: {
    icon: "/logo.jpg", // Path in /public
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <NavbarWrapper />
         <AddressSyncWrapper />
      </body>
    </html>
  );
}
