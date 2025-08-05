"use client";
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MdOutlineShoppingCart } from "react-icons/md";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function SuccessContent() {
  const params = useSearchParams();
  const paymentId = params.get('payment_id');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cartCleared, setCartCleared] = useState(false);

  useEffect(() => {
    const clearCartAndProcess = async () => {
      try {
        // Get user to determine cart key
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        // Clear cart multiple times to ensure it's cleared
        const cartKeys = [];
        if (user) {
          cartKeys.push(`cart_${user.id}`);
        }
        cartKeys.push('cart_guest'); // Also clear guest cart
        
        // Clear all possible cart keys
        cartKeys.forEach(key => {
          localStorage.removeItem(key);
        });
        
        // Dispatch multiple events to ensure all components update
        for (let i = 0; i < 3; i++) {
          setTimeout(() => {
            window.dispatchEvent(new Event('cartUpdated'));
          }, i * 100);
        }
        
        setCartCleared(true);
        
        // Add a small delay to ensure everything is processed
        setTimeout(() => {
          setLoading(false);
        }, 500);
        
      } catch (error) {
        console.error('Error clearing cart:', error);
        setLoading(false);
      }
    };

    clearCartAndProcess();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white rounded-xl shadow p-8 max-w-md w-full flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Processing your payment...</h2>
          <p className="text-sm text-gray-500 text-center">
            Clearing your cart and confirming your order...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white rounded-xl shadow p-8 max-w-md w-full flex flex-col items-center">
        <MdOutlineShoppingCart className="text-6xl text-green-500 mb-4" />
        <h1 className="text-2xl font-bold text-green-700 mb-2">Payment Successful!</h1>
        <p className="text-gray-700 mb-4 text-center">
          Thank you for your purchase. Your order has been confirmed.<br />
          {paymentId && (
            <span className="block text-sm text-gray-500 mt-2">Payment ID: <span className="font-mono">{paymentId}</span></span>
          )}
        </p>
        <div className="w-full space-y-3">
          <Link href="/" className="w-full block">
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold">
              Continue Shopping
            </button>
          </Link>
          <Link href="/cart" className="w-full block">
            <button className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold text-sm">
              Check Cart (should be empty)
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
