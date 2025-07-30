// app/NavbarWrapper.jsx
"use client";

import { usePathname } from "next/navigation";
import Navbar from "./navbar/page";
import Footer from "./footer/page";

export default function NavbarWrapper() {
  const pathname = usePathname();
  const isVendorRoute =
    pathname?.startsWith("/vendor") || pathname?.startsWith("/admin");

  return (
    <>
      {!isVendorRoute && <Navbar />}
      {!isVendorRoute && <Footer />}
    </>
  );
}
