"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from '@supabase/supabase-js';
import { FaTrashAlt, FaShoppingBag, FaArrowLeft, FaShieldAlt } from "react-icons/fa";
import { MdOutlineShoppingCart, MdSecurity } from "react-icons/md";
import { HiOutlineShoppingBag, HiOutlineLockClosed } from "react-icons/hi";
import CustomAuthModal from '../../components/CustomAuthModal';
import { useRouter } from "next/navigation";

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

export default function CartPage() {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [user, setUser] = useState(null);
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
      }
    };
    fetchUser();
  }, []);

  // Migrate guest cart to DB when user logs in
  useEffect(() => {
    const migrateGuestCart = async () => {
      if (!user) return;

      const guestCartKey = 'cart_guest';
      const guestCart = JSON.parse(localStorage.getItem(guestCartKey)) || [];
      if (guestCart.length === 0) return;

      try {
        // Fetch current DB cart
        const { data, error } = await supabase
          .from('carts')
          .select('store_carts')
          .eq('user_id', user.id)
          .single();

        let currentCart = [];
        if (data && data.store_carts) {
          currentCart = data.store_carts;
        }

        // Merge guest cart into current cart
        guestCart.forEach((guestItem) => {
          const existingItem = currentCart.find((item) => item.itemId === guestItem.itemId);
          if (existingItem) {
            existingItem.quantity += guestItem.quantity;
          } else {
            currentCart.push(guestItem);
          }
        });

        // Upsert updated cart to DB
        const { error: upsertError } = await supabase
          .from('carts')
          .upsert(
            {
              user_id: user.id,
              store_carts: currentCart,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );

        if (upsertError) {
          console.error('Error migrating cart:', upsertError);
          setErrorMessage('Failed to migrate guest cart.');
          setTimeout(() => setErrorMessage(''), 3000);
        } else {
          localStorage.removeItem(guestCartKey);
          window.dispatchEvent(new Event('cartUpdated'));
        }
      } catch (err) {
        console.error('Error during cart migration:', err);
        setErrorMessage('An error occurred while migrating cart.');
        setTimeout(() => setErrorMessage(''), 3000);
      }
    };

    migrateGuestCart();
  }, [user]);

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

  // Protect cart page: show modal if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      setShowAuthModal(true);
    } else {
      setShowAuthModal(false);
    }
  }, [user, loading]);

  const handleAddToCart = async (product) => {
    if (!product || !product.product_id || !product.itemId) {
      console.error('Invalid product data:', product);
      setErrorMessage('Invalid product data.');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    try {
      let updatedCart = [...cartItems];
      const existingItem = updatedCart.find((item) => item.itemId === product.itemId);

      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        updatedCart.push({ ...product, quantity: 1 });
      }

      if (!user) {
        // Update guest cart in localStorage
        localStorage.setItem('cart_guest', JSON.stringify(updatedCart));
      } else {
        // Update authenticated user cart in DB
        const { error } = await supabase
          .from('carts')
          .upsert(
            {
              user_id: user.id,
              store_carts: updatedCart,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );

        if (error) {
          console.error('Error updating cart:', error);
          setErrorMessage('Failed to add product to cart.');
          setTimeout(() => setErrorMessage(''), 3000);
          return;
        }
      }

      setCartItems(updatedCart);
      const newTotal = updatedCart.reduce(
        (acc, item) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 1),
        0
      );
      setTotal(newTotal);
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (error) {
      console.error('Error in handleAddToCart:', error);
      setErrorMessage('An error occurred while adding to cart.');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleRemoveItem = async (itemId) => {
    try {
      let updatedCart = cartItems.filter((item) => item.itemId !== itemId);

      if (!user) {
        // Update guest cart in localStorage
        localStorage.setItem('cart_guest', JSON.stringify(updatedCart));
      } else {
        // Update authenticated user cart in DB
        const { error } = await supabase
          .from('carts')
          .upsert(
            {
              user_id: user.id,
              store_carts: updatedCart,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );

        if (error) {
          console.error('Error removing item:', error);
          setErrorMessage('Failed to remove item from cart.');
          setTimeout(() => setErrorMessage(''), 3000);
          return;
        }
      }

      setCartItems(updatedCart);
      const newTotal = updatedCart.reduce(
        (acc, item) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 1),
        0
      );
      setTotal(newTotal);
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (error) {
      console.error('Error in handleRemoveItem:', error);
      setErrorMessage('An error occurred while removing item.');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleIncreaseQuantity = async (itemId) => {
    try {
      let updatedCart = cartItems.map((item) =>
        item.itemId === itemId ? { ...item, quantity: item.quantity + 1 } : item
      );

      if (!user) {
        // Update guest cart in localStorage
        localStorage.setItem('cart_guest', JSON.stringify(updatedCart));
      } else {
        // Update authenticated user cart in DB
        const { error } = await supabase
          .from('carts')
          .upsert(
            {
              user_id: user.id,
              store_carts: updatedCart,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );

        if (error) {
          console.error('Error increasing quantity:', error);
          setErrorMessage('Failed to update quantity.');
          setTimeout(() => setErrorMessage(''), 3000);
          return;
        }
      }

      setCartItems(updatedCart);
      const newTotal = updatedCart.reduce(
        (acc, item) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 1),
        0
      );
      setTotal(newTotal);
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (error) {
      console.error('Error in handleIncreaseQuantity:', error);
      setErrorMessage('An error occurred while updating quantity.');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleDecreaseQuantity = async (itemId) => {
    try {
      let updatedCart = cartItems.map((item) =>
        item.itemId === itemId && item.quantity > 1
          ? { ...item, quantity: item.quantity - 1 }
          : item
      );

      if (!user) {
        // Update guest cart in localStorage
        localStorage.setItem('cart_guest', JSON.stringify(updatedCart));
      } else {
        // Update authenticated user cart in DB
        const { error } = await supabase
          .from('carts')
          .upsert(
            {
              user_id: user.id,
              store_carts: updatedCart,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );

        if (error) {
          console.error('Error decreasing quantity:', error);
          setErrorMessage('Failed to update quantity.');
          setTimeout(() => setErrorMessage(''), 3000);
          return;
        }
      }

      setCartItems(updatedCart);
      const newTotal = updatedCart.reduce(
        (acc, item) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 1),
        0
      );
      setTotal(newTotal);
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (error) {
      console.error('Error in handleDecreaseQuantity:', error);
      setErrorMessage('An error occurred while updating quantity.');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleClearCart = async () => {
    try {
      if (!user) {
        // Clear guest cart in localStorage
        localStorage.removeItem('cart_guest');
      } else {
        // Clear authenticated user cart in DB
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
          setErrorMessage('Failed to clear cart.');
          setTimeout(() => setErrorMessage(''), 3000);
          return;
        }
      }

      setCartItems([]);
      setTotal(0);
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (error) {
      console.error('Error in handleClearCart:', error);
      setErrorMessage('An error occurred while clearing cart.');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleProceedToCheckout = (e) => {
    if (!user) {
      e.preventDefault();
      setShowAuthModal(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="container mx-auto px-4 py-8 pt-24">
          <div className="max-w-6xl mx-auto">
            {/* Loading Header */}
            <div className="mb-8">
              <div className="h-8 bg-gray-200 rounded-lg w-48 mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
            </div>
            
            {/* Loading Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-6 border-b border-gray-100 last:border-b-0">
                      <div className="w-20 h-20 bg-gray-200 rounded-xl animate-pulse"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2 mb-2 animate-pulse"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                      </div>
                      <div className="text-right">
                        <div className="h-4 bg-gray-200 rounded w-16 mb-2 animate-pulse"></div>
                        <div className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="h-6 bg-gray-200 rounded w-32 mb-4 animate-pulse"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                    <div className="h-8 bg-gray-200 rounded w-full animate-pulse"></div>
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="container mx-auto px-4 py-8 pt-24">
          <div className="max-w-lg mx-auto text-center">
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-12">
              <div className="w-32 h-32 mx-auto mb-8 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center">
                <HiOutlineShoppingBag className="text-6xl text-blue-400" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Your cart is empty</h1>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Discover amazing products and start building your perfect collection.
              </p>
              <Link href="/">
                <button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-4 rounded-xl font-semibold shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-3 mx-auto">
                  <FaShoppingBag className="text-lg" />
                  Start Shopping
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-2">
              <Link href="/" className="text-gray-500 hover:text-gray-700 transition-colors">
                <FaArrowLeft className="text-lg" />
              </Link>
              <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 flex items-center gap-3">
                <MdOutlineShoppingCart className="text-blue-600" />
                Shopping Cart
              </h1>
            </div>
            <p className="text-gray-600 ml-8">{cartItems.length} item{cartItems.length !== 1 ? 's' : ''} in your cart</p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-6 mx-auto max-w-4xl">
              <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl text-sm flex items-center gap-3">
                <div className="w-5 h-5 bg-red-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold">!</span>
                </div>
                {errorMessage}
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {cartItems.map((item, index) => {
                    const normalizedImages = normalizeImagePath(item.image);
                    const imageUrl = normalizeImageUrl(normalizedImages[0] || '/placeholder-product.jpg');

                    return (
                      <div key={item.itemId || index} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex flex-col sm:flex-row gap-6">
                          {/* Product Image */}
                          <div className="flex-shrink-0">
                            <Link href={`/products/${item.product_id}`} className="block group">
                              <div className="w-24 h-24 sm:w-28 sm:h-28 bg-white rounded-xl border border-gray-200 overflow-hidden group-hover:shadow-md transition-shadow">
                                <Image
                                  src={imageUrl}
                                  alt={item.name || 'Product image'}
                                  width={112}
                                  height={112}
                                  className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                                />
                              </div>
                            </Link>
                          </div>

                          {/* Product Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
                              <div className="flex-1">
                                <Link href={`/products/${item.product_id}`} className="group">
                                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
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

                                <div className="mt-3 flex items-center justify-between">
                                  {/* Quantity Controls */}
                                  <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200">
                                    <button
                                      onClick={() => handleDecreaseQuantity(item.itemId)}
                                      disabled={item.quantity <= 1}
                                      className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-l-lg transition-colors"
                                      aria-label="Decrease quantity"
                                    >
                                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                                      </svg>
                                    </button>
                                    <span className="px-4 py-2 text-sm font-semibold bg-white border-x border-gray-200 min-w-[3rem] text-center">
                                      {item.quantity || 1}
                                    </span>
                                    <button
                                      onClick={() => handleIncreaseQuantity(item.itemId)}
                                      className="p-2 hover:bg-gray-100 rounded-r-lg transition-colors"
                                      aria-label="Increase quantity"
                                    >
                                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                      </svg>
                                    </button>
                                  </div>

                                  {/* Remove Button */}
                                  <button
                                    onClick={() => handleRemoveItem(item.itemId)}
                                    className="text-gray-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors group"
                                    aria-label="Remove item"
                                  >
                                    <FaTrashAlt className="text-sm group-hover:scale-110 transition-transform" />
                                  </button>
                                </div>
                              </div>

                              {/* Price Info */}
                              <div className="text-right flex-shrink-0">
                                <div className="text-xs text-gray-500 mb-1">Unit Price</div>
                                <div className="text-sm font-medium text-gray-700 mb-2">${Number(item.price || 0).toFixed(2)}</div>
                                <div className="text-xs text-gray-500 mb-1">Subtotal</div>
                                <div className="text-xl font-bold text-gray-900">
                                  ${(Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2)}
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
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <div className="w-2 h-6 bg-blue-600 rounded-full"></div>
                  Order Summary
                </h2>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal ({cartItems.length} items)</span>
                    <span className="font-medium">${total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Shipping</span>
                    <span className="font-medium text-green-600">Free</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax</span>
                    <span className="font-medium">Calculated at checkout</span>
                  </div>
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-900">Total</span>
                      <span className="text-2xl font-bold text-blue-600">${total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Link href="/checkout" onClick={handleProceedToCheckout} className="block">
                    <button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-4 px-6 rounded-xl font-semibold shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-3">
                      <HiOutlineLockClosed className="text-lg" />
                      Secure Checkout
                    </button>
                  </Link>
                  
                  <button
                    onClick={handleClearCart}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-6 rounded-xl font-medium transition-colors border border-gray-200"
                  >
                    Clear Cart
                  </button>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
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