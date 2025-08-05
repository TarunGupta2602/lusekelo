'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { getCartKeyFromUser } from '../cart/page';
import Link from 'next/link';
import CustomAuthModal from '../../components/CustomAuthModal';

export default function CheckoutPage() {
  const [cartItems, setCartItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Initialize Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    };
    fetchUser();
  }, [supabase.auth]);

  const getCartKey = useCallback(() => getCartKeyFromUser(user), [user]);

  useEffect(() => {
    const cartKey = getCartKey();
    const cartRaw = localStorage.getItem(cartKey);
    let cart = [];
    try {
      cart = JSON.parse(cartRaw || '[]');
      if (!Array.isArray(cart)) cart = [];
    } catch (e) {
      cart = [];
    }
    console.log('Cart Items:', cart); // Debug: Log cart items to inspect structure
    setCartItems(cart);
    const totalAmount = cart.reduce(
      (acc, item) => acc + (item.price || 0) * (item.quantity || 1),
      0
    );
    setTotal(totalAmount);
    setLoading(false);
  }, [getCartKey]);

  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const handlePayment = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    const res = await loadRazorpayScript();
    if (!res) {
      alert('Razorpay SDK failed to load.');
      return;
    }

    // Validate cart items for product_id
    const invalidItems = cartItems.filter(item => !item.product_id && !item.id);
    if (invalidItems.length > 0) {
      console.error('Invalid cart items (missing product_id):', invalidItems);
      alert('Some items in your cart are invalid. Please check your cart and try again.');
      return;
    }

    // Create order records in Supabase for each cart item
    const orderPromises = cartItems.map(async (item) => {
      const productId = item.product_id || item.id; // Use product_id if available, fallback to id
      console.log('Creating order for item:', { ...item, product_id: productId }); // Debug: Log item data
      const { data, error } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          product_id: productId,
          quantity: item.quantity || 1,
          total_amount: (item.price || 0) * (item.quantity || 1),
          status: 'pending',
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating order:', error);
        throw new Error(`Failed to create order for product ${productId}: ${error.message}`);
      }
      return data.id;
    });

    let orderIds;
    try {
      orderIds = await Promise.all(orderPromises);
    } catch (error) {
      console.error('Order creation failed:', error);
      alert('Failed to create orders. Please try again.');
      return;
    }

    // Create Razorpay order
    const orderRes = await fetch('/api/razorpay-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: total }),
    });

    const order = await orderRes.json();
    if (!order.id) {
      console.error('Razorpay order creation failed:', order);
      alert('Failed to create Razorpay order.');
      return;
    }

    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      name: 'My Store',
      description: 'Test Transaction',
      order_id: order.id,
      handler: async function (response) {
        try {
          // Update order status to 'completed' in Supabase
          const updatePromises = orderIds.map((orderId) =>
            supabase
              .from('orders')
              .update({
                payment_id: response.razorpay_payment_id,
                status: 'completed',
              })
              .eq('id', orderId)
          );

          await Promise.all(updatePromises);
          
          // Clear cart aggressively
          const cartKey = getCartKey();
          localStorage.removeItem(cartKey);
          localStorage.removeItem('cart_guest'); // Also clear guest cart

          // Dispatch multiple events to ensure all components update
          for (let i = 0; i < 3; i++) {
            setTimeout(() => {
              window.dispatchEvent(new Event('cartUpdated'));
            }, i * 50);
          }

          // Add delay before redirect
          setTimeout(() => {
            router.push('/checkout/success?payment_id=' + response.razorpay_payment_id);
          }, 300);
          
        } catch (error) {
          console.error('Error in payment handler:', error);
          alert('Payment successful but there was an error updating your order. Please contact support.');
        }
      },
      prefill: {
        name: user?.user_metadata?.name || 'Customer',
        email: user?.email || '',
        contact: '',
      },
      theme: {
        color: '#0d6efd',
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  if (loading) {
    return <div className="p-10 text-center text-xl text-gray-500">Loading checkout...</div>;
  }

  if (cartItems.length === 0) {
    return (
      <div className="p-10 text-center text-xl text-gray-500">
        Your cart is empty.<br />
        <Link href="/cart" className="text-blue-600 underline">Go to Cart</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow mt-25 rounded-lg">
      <h1 className="text-2xl font-bold mb-6 text-center">Checkout</h1>
      <ul className="divide-y mb-4">
        {cartItems.map((item, index) => (
          <li key={index} className="py-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="font-semibold text-gray-800">{item.name}</div>
              <div className="text-gray-500 text-sm">Qty: {item.quantity}</div>
              <div className="text-gray-500 text-sm">Product ID: {item.product_id || item.id || 'N/A'}</div>
            </div>
            <div className="font-semibold text-blue-700 text-lg">₹{(item.price * item.quantity).toFixed(2)}</div>
          </li>
        ))}
      </ul>
      <div className="text-xl font-semibold mb-4 text-right">Total: <span className="text-blue-700">₹{total.toFixed(2)}</span></div>
      <button
        onClick={handlePayment}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold text-lg mt-2 shadow"
      >
        Pay with Razorpay
      </button>
      <CustomAuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}