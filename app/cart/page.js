
"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from '@supabase/supabase-js';
import { FaTrashAlt } from "react-icons/fa";
import { MdOutlineShoppingCart } from "react-icons/md";
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
      <div className="flex flex-col justify-center items-center min-h-screen text-gray-600 text-xl">
        <MdOutlineShoppingCart className="text-6xl mb-4 text-gray-400" />
        Loading your cart...
      </div>
    );
  }

  if (!user) {
    return <CustomAuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />;
  }

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen text-gray-500 text-xl">
        <MdOutlineShoppingCart className="text-7xl mb-4 text-gray-300" />
        <span>Your cart is empty.</span>
        <Link href="/" className="mt-6">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold shadow transition">
            Continue Shopping
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl mt-15 mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 flex items-center gap-3 border-b pb-4">
        <MdOutlineShoppingCart className="text-3xl text-blue-600" />
        Your Cart
      </h1>

      {errorMessage && (
        <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
          {errorMessage}
        </div>
      )}

      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow border border-gray-200">
        <div className="divide-y divide-gray-100">
          {cartItems.map((item, index) => {
            // Normalize image paths and select the first valid one
            const normalizedImages = normalizeImagePath(item.image);
            const imageUrl = normalizeImageUrl(normalizedImages[0] || '/placeholder-product.jpg');

            return (
              <div
                key={item.itemId || index}
                className="flex flex-col md:flex-row md:items-center justify-between py-6"
              >
                <div className="flex items-center gap-6 w-full md:w-2/3">
                  <Link href={`/products/${item.product_id}`} className="block">
                    <Image
                      src={imageUrl}
                      alt={item.name || 'Product image'}
                      width={90}
                      height={90}
                      className="w-20 h-20 object-contain rounded-lg border border-gray-200 bg-white"
                    />
                  </Link>
                  <div className="flex flex-col gap-1 w-full">
                    <Link href={`/products/${item.product_id}`} className="hover:underline">
                      <h3 className="text-base font-semibold text-gray-900">{item.name || 'Unnamed Product'}</h3>
                    </Link>
                    {item.variation && (
                      <span className="text-xs text-gray-500">
                        {item.variation.size && item.variation.color
                          ? `${item.variation.size} / ${item.variation.color}`
                          : item.variation.size || item.variation.color || 'Variation'}
                      </span>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <span>Unit Price:</span>
                      <span className="font-semibold text-gray-800">${Number(item.price || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => handleDecreaseQuantity(item.itemId)}
                        className="border border-gray-300 rounded px-2 py-1 text-base font-bold text-gray-700 hover:bg-gray-100"
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <span className="text-base font-semibold px-2">{item.quantity || 1}</span>
                      <button
                        onClick={() => handleIncreaseQuantity(item.itemId)}
                        className="border border-gray-300 rounded px-2 py-1 text-base font-bold text-gray-700 hover:bg-gray-100"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end mt-4 md:mt-0 w-full md:w-1/3">
                  <div className="text-base font-semibold text-gray-800 mb-2">
                    Subtotal: ${(Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2)}
                  </div>
                  <button
                    onClick={() => handleRemoveItem(item.itemId)}
                    className="flex items-center gap-2 text-red-600 hover:text-white hover:bg-red-500 border border-red-200 px-3 py-1 rounded font-semibold transition-colors"
                    aria-label="Remove item"
                  >
                    <FaTrashAlt />
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Cart Total */}
        <div className="flex flex-col md:flex-row justify-between items-center mt-10 border-t pt-6">
          <h3 className="text-xl font-bold text-gray-700 mb-4 md:mb-0">Total:</h3>
          <span className="text-2xl font-extrabold text-blue-700">${total.toFixed(2)}</span>
        </div>

        <div className="mt-8 flex flex-col md:flex-row gap-4 justify-center">
          <button
            onClick={handleClearCart}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-8 rounded-lg font-semibold shadow border border-gray-300 transition-colors"
          >
            Clear Cart
          </button>
          <Link href="/checkout" onClick={handleProceedToCheckout}>
            <button className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-10 rounded-lg font-bold shadow border border-blue-700 transition-all text-lg">
              Proceed to Checkout
            </button>
          </Link>
          <CustomAuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
        </div>
      </div>
    </div>
  );
}
