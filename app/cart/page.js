"use client";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from '@supabase/supabase-js';
import { FaTrashAlt } from "react-icons/fa";
import { MdOutlineShoppingCart } from "react-icons/md";
import CustomAuthModal from '../../components/CustomAuthModal';
import { useRouter } from "next/navigation";

// Shared cart key utility
export function getCartKeyFromUser(user) {
  if (user && user.id) {
    return `cart_${user.id}`;
  }
  return 'cart_guest';
}

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function CartPage() {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const router = useRouter();

  // Fetch user on mount
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
  }, []);

  const getCartKey = useCallback(() => getCartKeyFromUser(user), [user]);

  // Fetch cart items from localStorage when the component is mounted
  useEffect(() => {
    const fetchCartItems = () => {
      try {
        const cart = JSON.parse(localStorage.getItem(getCartKey()) || "[]");
        console.log('Cart items:', cart); // Debug log to inspect cart data
        setCartItems(cart);

        // Calculate the total price with validation
        const totalPrice = cart.reduce(
          (acc, item) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 1),
          0
        );
        setTotal(totalPrice);
      } catch (error) {
        console.error("Error fetching cart items:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCartItems();
    // Listen for cart updates (for cross-tab sync)
    const handleCartUpdate = () => fetchCartItems();
    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, [user, getCartKey]);

  // Protect cart page: show modal if not authenticated
  useEffect(() => {
    if (!loading && (!user || !user.id)) {
      setShowAuthModal(true);
    } else {
      setShowAuthModal(false);
    }
  }, [user, loading]);

  const handleAddToCart = (product) => {
    // Validate product data before adding
    if (!product || !product.product_id || (!product.image && !Array.isArray(product.image))) {
      console.error('Invalid product data:', product);
      return;
    }
    const cartKey = getCartKey();
    const existingCart = JSON.parse(localStorage.getItem(cartKey) || "[]");
    const existingItemIndex = existingCart.findIndex(
      (item) => item.product_id === product.product_id
    );

    let updatedCart;

    if (existingItemIndex !== -1) {
      updatedCart = existingCart.map((item, index) =>
        index === existingItemIndex
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
    } else {
      updatedCart = [...existingCart, { ...product, quantity: 1 }];
    }

    localStorage.setItem(cartKey, JSON.stringify(updatedCart));
    window.dispatchEvent(new Event("cartUpdated"));
  };

  const handleRemoveItem = (productId) => {
    const cartKey = getCartKey();
    const updatedCart = cartItems.filter((item) => item.product_id !== productId);
    localStorage.setItem(cartKey, JSON.stringify(updatedCart));
    setCartItems(updatedCart);

    const newTotal = updatedCart.reduce(
      (acc, item) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 1),
      0
    );
    setTotal(newTotal);

    window.dispatchEvent(new Event("cartUpdated"));
  };

  const handleIncreaseQuantity = (productId) => {
    const cartKey = getCartKey();
    const updatedCart = cartItems.map((item) =>
      item.product_id === productId
        ? { ...item, quantity: item.quantity + 1 }
        : item
    );
    localStorage.setItem(cartKey, JSON.stringify(updatedCart));
    setCartItems(updatedCart);

    const newTotal = updatedCart.reduce(
      (acc, item) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 1),
      0
    );
    setTotal(newTotal);

    window.dispatchEvent(new Event("cartUpdated"));
  };

  const handleDecreaseQuantity = (productId) => {
    const cartKey = getCartKey();
    const updatedCart = cartItems.map((item) =>
      item.product_id === productId && item.quantity > 1
        ? { ...item, quantity: item.quantity - 1 }
        : item
    );
    localStorage.setItem(cartKey, JSON.stringify(updatedCart));
    setCartItems(updatedCart);

    const newTotal = updatedCart.reduce(
      (acc, item) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 1),
      0
    );
    setTotal(newTotal);

    window.dispatchEvent(new Event("cartUpdated"));
  };

  const handleClearCart = () => {
    const cartKey = getCartKey();
    localStorage.removeItem(cartKey);
    setCartItems([]);
    setTotal(0);
    window.dispatchEvent(new Event("cartUpdated"));
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

  if (!user || !user.id) {
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

      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow border border-gray-200">
        <div className="divide-y divide-gray-100">
          {cartItems.map((item, index) => {
            // Normalize image paths and select the first valid one
            const normalizedImages = normalizeImagePath(item.image);
            const imageUrl = normalizeImageUrl(normalizedImages[0] || '/placeholder-product.jpg');

            return (
              <div
                key={item.product_id || index}
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
                    {item.category && (
                      <span className="text-xs text-gray-500">{item.category}</span>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <span>Unit Price:</span>
                      <span className="font-semibold text-gray-800">${Number(item.price || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => handleDecreaseQuantity(item.product_id)}
                        className="border border-gray-300 rounded px-2 py-1 text-base font-bold text-gray-700 hover:bg-gray-100"
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <span className="text-base font-semibold px-2">{item.quantity || 1}</span>
                      <button
                        onClick={() => handleIncreaseQuantity(item.product_id)}
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
                    onClick={() => handleRemoveItem(item.product_id)}
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