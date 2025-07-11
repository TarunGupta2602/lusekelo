"use client";
import { Suspense } from 'react';
import SuccessContent from './SuccessContent';

export default function CheckoutSuccess() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-xl text-gray-500">Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
