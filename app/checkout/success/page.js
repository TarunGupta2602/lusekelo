"use client";

import { Suspense } from "react";
import SuccessPageContent from "./SuccessPageContent";

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="text-center py-20">Loading...</div>}>
      <SuccessPageContent />
    </Suspense>
  );
}
