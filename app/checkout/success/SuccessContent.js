"use client";
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { MdOutlineShoppingCart } from "react-icons/md";

export default function SuccessContent() {
  const params = useSearchParams();
  const paymentId = params.get('payment_id');
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white rounded-xl shadow p-8 max-w-md w-full flex flex-col items-center">
        <MdOutlineShoppingCart className="text-6xl text-green-500 mb-4" />
        <h1 className="text-2xl font-bold text-green-700 mb-2">Payment Successful!</h1>
        <p className="text-gray-700 mb-4 text-center">
          Thank you for your purchase.<br />
          {paymentId && (
            <span className="block text-sm text-gray-500 mt-2">Payment ID: <span className="font-mono">{paymentId}</span></span>
          )}
        </p>
        <Link href="/" className="w-full">
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold mt-2">Continue Shopping</button>
        </Link>
      </div>
    </div>
  );
}
