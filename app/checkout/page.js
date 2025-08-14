'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import Image from 'next/image';
import CustomAuthModal from '../../components/CustomAuthModal';
import { FaArrowLeft, FaShieldAlt, FaCheckCircle } from 'react-icons/fa';
import { MdOutlineShoppingCart } from 'react-icons/md';
import { HiOutlineLockClosed } from 'react-icons/hi';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Normalize image path to handle both single strings and arrays
const normalizeImagePath = (path) => {
  if (!path) return ['/placeholder-product.jpg'];
  if (Array.isArray(path)) {
    const normalized = path
      .map((p) => (p ? p.replace(/^(\.\.\/)+assets\//, '/') : null))
      .filter((p) => p);
    return normalized.length > 0 ? normalized : ['/placeholder-product.jpg'];
  }
  return [path.replace(/^(\.\.\/)+assets\//, '/')];
};

// Normalize image URL to ensure proper format
const normalizeImageUrl = (url) => {
  if (!url) return '/placeholder-product.jpg';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return url;
  return url;
};

export default function CheckoutPage() {
  const [cartItems, setCartItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();

  // Fetch user on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!error && data?.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Error fetching user:', err);
        setErrorMessage('Failed to fetch user data.');
        setTimeout(() => setErrorMessage(''), 3000);
      }
    };
    fetchUser();
  }, []);

  // Fetch cart items
  const fetchCartItems = useCallback(async () => {
    try {
      setLoading(true);
      let cart = [];

      if (!user) {
        // Guest cart from localStorage
        cart = JSON.parse(localStorage.getItem('cart_guest') || '[]');
      } else {
        // Authenticated user cart from DB
        const { data, error } = await supabase
          .from('carts')
          .select('store_carts')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116: No rows found
          console.error('Error fetching cart:', error);
          setErrorMessage('Failed to fetch cart.');
          setTimeout(() => setErrorMessage(''), 3000);
          return;
        }
        cart = data?.store_carts || [];
      }

      console.log('Cart items:', cart); // Debug log
      setCartItems(cart);

      // Calculate total price
      const totalPrice = cart.reduce(
        (acc, item) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 1),
        0
      );
      setTotal(totalPrice);
    } catch (error) {
      console.error('Error fetching cart items:', error);
      setErrorMessage('An error occurred while fetching cart.');
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCartItems();
    // Listen for cart updates
    const handleCartUpdate = () => fetchCartItems();
    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, [fetchCartItems]);

  // Protect checkout page: show modal if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      setShowAuthModal(true);
    } else {
      setShowAuthModal(false);
    }
  }, [user, loading]);

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
      setErrorMessage('Razorpay SDK failed to load.');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    // Validate cart items for product_id
    const invalidItems = cartItems.filter(item => !item.product_id && !item.itemId);
    if (invalidItems.length > 0) {
      console.error('Invalid cart items (missing product_id or itemId):', invalidItems);
      setErrorMessage('Some items in your cart are invalid. Please check your cart and try again.');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    // Create order records in Supabase for each cart item
    const orderPromises = cartItems.map(async (item) => {
      const productId = item.product_id || item.itemId; // Use product_id if available, fallback to itemId
      console.log('Creating order for item:', { ...item, product_id: productId }); // Debug: Log item data
      const { data, error } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          product_id: productId,
          quantity: item.quantity || 1,
          total_amount: (Number(item.price) || 0) * (Number(item.quantity) || 1),
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
      setErrorMessage('Failed to create orders. Please try again.');
      setTimeout(() => setErrorMessage(''), 3000);
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
      setErrorMessage('Failed to create Razorpay order.');
      setTimeout(() => setErrorMessage(''), 3000);
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

          // Clear cart in Supabase or localStorage
          if (!user) {
            localStorage.removeItem('cart_guest');
          } else {
            const { error } = await supabase
              .from('carts')
              .upsert(
                {
                  user_id: user.id,
                  store_carts: [],
                  updated_at: new Date().toISOString(),
                },
                { onConflict: 'user_id' }
              );

            if (error) {
              console.error('Error clearing cart:', error);
              setErrorMessage('Failed to clear cart after payment.');
              setTimeout(() => setErrorMessage(''), 3000);
            }
          }

          // Dispatch cart update event
          window.dispatchEvent(new Event('cartUpdated'));

          // Redirect to success page
          setTimeout(() => {
            router.push('/checkout/success?payment_id=' + response.razorpay_payment_id);
          }, 300);
        } catch (error) {
          console.error('Error in payment handler:', error);
          setErrorMessage('Payment successful but there was an error updating your order. Please contact support.');
          setTimeout(() => setErrorMessage(''), 3000);
        }
      },
      prefill: {
        name: user?.user_metadata?.name || 'Customer',
        email: user?.email || '',
        contact: '',
      },
      theme: {
        color: '#2563eb',
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20">
          <div className="max-w-7xl mx-auto">
            {/* Loading Header */}
            <div className="mb-8">
              <div className="h-10 bg-gray-200 rounded-lg w-64 mb-3 animate-pulse"></div>
              <div className="h-5 bg-gray-200 rounded w-48 animate-pulse"></div>
            </div>
            {/* Loading Content */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-4 border-b border-gray-100 last:border-b-0">
                      <div className="w-24 h-24 bg-gray-200 rounded-xl animate-pulse"></div>
                      <div className="flex-1">
                        <div className="h-5 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2 animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                      </div>
                      <div className="text-right">
                        <div className="h-4 bg-gray-200 rounded w-16 mb-2 animate-pulse"></div>
                        <div className="h-5 bg-gray-200 rounded w-20 animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                  <div className="h-6 bg-gray-200 rounded w-40 mb-4 animate-pulse"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                    <div className="h-10 bg-gray-200 rounded w-full animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <CustomAuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />;
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20">
          <div className="max-w-md mx-auto text-center">
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-10">
              <div className="w-28 h-28 mx-auto mb-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full flex items-center justify-center">
                <MdOutlineShoppingCart className="text-5xl text-blue-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Your cart is empty</h1>
              <p className="text-gray-600 mb-6 text-sm">
                Add some items to your cart before proceeding to checkout.
              </p>
              <Link href="/cart">
                <button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-semibold shadow-md transition-all duration-300 hover:scale-105 flex items-center gap-2 mx-auto">
                  <MdOutlineShoppingCart className="text-lg" />
                  Go to Cart
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20">
        <div className="max-w-7xl mx-auto">
          {/* Progress Indicator */}
          <div className="mb-8 flex items-center justify-center gap-4 text-sm font-medium text-gray-600">
            <div className="flex items-center gap-2">
              <FaCheckCircle className="text-blue-600" />
              <span>Cart</span>
            </div>
            <span className="text-gray-400">→</span>
            <div className="flex items-center gap-2 font-semibold text-blue-600">
              <FaCheckCircle className="text-blue-600" />
              <span>Checkout</span>
            </div>
            <span className="text-gray-400">→</span>
            <div className="flex items-center gap-2">
              <span>Confirmation</span>
            </div>
          </div>

          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/cart" className="text-gray-500 hover:text-gray-700 transition-colors">
                <FaArrowLeft className="text-lg" />
              </Link>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                <MdOutlineShoppingCart className="text-blue-600" />
                Checkout
              </h1>
            </div>
            <p className="text-gray-600 text-sm">{cartItems.length} item{cartItems.length !== 1 ? 's' : ''}</p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-6 mx-auto max-w-4xl">
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2 shadow-sm">
                <div className="w-4 h-4 bg-red-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold">!</span>
                </div>
                {errorMessage}
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Order Items */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {cartItems.map((item, index) => {
                    const normalizedImages = normalizeImagePath(item.image);
                    const imageUrl = normalizeImageUrl(normalizedImages[0] || '/placeholder-product.jpg');

                    return (
                      <div key={item.itemId || index} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors duration-200">
                        <div className="flex flex-col sm:flex-row gap-4">
                          {/* Product Image */}
                          <div className="flex-shrink-0">
                            <Link href={`/products/${item.product_id || item.itemId}`} className="block group">
                              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden group-hover:shadow-md transition-shadow duration-300">
                                <Image
                                  src={imageUrl}
                                  alt={item.name || 'Product image'}
                                  width={96}
                                  height={96}
                                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                                />
                              </div>
                            </Link>
                          </div>

                          {/* Product Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                              <div className="flex-1">
                                <Link href={`/products/${item.product_id || item.itemId}`} className="group">
                                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                                    {item.name || 'Unnamed Product'}
                                  </h3>
                                </Link>
                                
                                {item.variation && (
                                  <div className="mt-1 flex items-center gap-2">
                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                      {item.variation.size && item.variation.color
                                        ? `${item.variation.size} / ${item.variation.color}`
                                        : item.variation.size || item.variation.color || 'Variation'}
                                    </span>
                                  </div>
                                )}

                                <div className="mt-2 text-sm text-gray-600">
                                  Quantity: {item.quantity || 1}
                                </div>
                              </div>

                              {/* Price Info */}
                              <div className="text-right flex-shrink-0">
                                <div className="text-xs text-gray-500 mb-1">Unit Price</div>
                                <div className="text-sm font-medium text-gray-700 mb-2">₹{Number(item.price || 0).toFixed(2)}</div>
                                <div className="text-xs text-gray-500 mb-1">Subtotal</div>
                                <div className="text-lg sm:text-xl font-bold text-gray-900">
                                  ₹{(Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-20">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <div className="w-2 h-6 bg-blue-600 rounded-full"></div>
                  Order Summary
                </h2>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal ({cartItems.length} items)</span>
                    <span className="font-medium">₹{total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Shipping</span>
                    <span className="font-medium text-green-600">Free</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax</span>
                    <span className="font-medium">No Tax</span>
                  </div>
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-base sm:text-lg font-bold text-gray-900">Total</span>
                      <span className="text-xl sm:text-2xl font-bold text-blue-600">₹{total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handlePayment}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 sm:py-4 px-6 rounded-lg font-semibold shadow-md transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
                >
                  <HiOutlineLockClosed className="text-lg" />
                  Pay Now
                </button>

                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <FaShieldAlt className="text-green-500 flex-shrink-0" />
                    <span>Secure payment with 256-bit SSL encryption</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <CustomAuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </div>
    </div>
  );
}