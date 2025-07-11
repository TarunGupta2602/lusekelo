"use client";
import { Geist, Geist_Mono } from "next/font/google";
import { usePathname } from "next/navigation"; // Import usePathname to get the current route
import "./globals.css";
import Navbar from "./navbar/page";
import Footer from "./footer/page";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


export default function RootLayout({ children }) {
  const pathname = usePathname(); // Get the current pathname
  const isVendorRoute =
    pathname === "/vendor" ||
    pathname === "/vendor/dashboard" ||
    pathname === "/vendor/edit-inventory" ||
    pathname === "/vendor/add-inventory" ||
    pathname === "/vendor/create-store" ||
    pathname === "/admin" ||
    pathname === "/admin/dashboard"; // Check if the route is vendor login or dashboard

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Render Navbar only if not on vendor login or dashboard */}
        {!isVendorRoute && <Navbar />}

        {children}

        {/* Render Footer only if not on vendor login or dashboard */}
        {!isVendorRoute && <Footer />}
      </body>
    </html>
  );
}