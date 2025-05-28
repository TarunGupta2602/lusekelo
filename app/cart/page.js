"use client";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from '@supabase/supabase-js';

// Helper function to normalize image paths
const normalizeImagePath = (path) => {
  if (!path) return '';
  return path.replace(/^(\.\.\/)+assets\//, '/');
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

  const getCartKey = useCallback(() => {
    if (user && user.id) {
      return `cart_${user.id}`;
    }
    return 'cart_guest';
  }, [user]);

  // Fetch cart items from localStorage when the component is mounted
  useEffect(() => {
    const fetchCartItems = () => {
      try {
        const cart = JSON.parse(localStorage.getItem(getCartKey()) || "[]");
        setCartItems(cart);

        // Calculate the total price
        const totalPrice = cart.reduce(
          (acc, item) => acc + item.price * item.quantity,
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
    // Listen for cart updates (optional, for cross-tab sync)
    const handleCartUpdate = () => fetchCartItems();
    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, [user, getCartKey]);

  const handleAddToCart = (product) => {
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

    // 🔔 This is the key line:
    window.dispatchEvent(new Event("cartUpdated"));
  };

  const handleRemoveItem = (productId) => {
    const cartKey = getCartKey();
    const updatedCart = cartItems.filter((item) => item.product_id !== productId);
    localStorage.setItem(cartKey, JSON.stringify(updatedCart));
    setCartItems(updatedCart);

    const newTotal = updatedCart.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    );
    setTotal(newTotal);

    // Notify others
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
      (acc, item) => acc + item.price * item.quantity,
      0
    );
    setTotal(newTotal);

    // Notify others
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
      (acc, item) => acc + item.price * item.quantity,
      0
    );
    setTotal(newTotal);

    // Notify others
    window.dispatchEvent(new Event("cartUpdated"));
  };

  const handleClearCart = () => {
    const cartKey = getCartKey();
    localStorage.removeItem(cartKey);
    setCartItems([]);
    setTotal(0);

    // Notify others
    window.dispatchEvent(new Event("cartUpdated"));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen text-gray-600 text-xl">
        Loading...
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen text-gray-600 text-xl">
        Your cart is empty.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mt-9 mx-auto">
      <h1 className="text-4xl font-bold mt-10 mb-20 text-gray-800 ml-14">Your Cart</h1>

      <div className="bg-white p-8 rounded-2xl shadow-2xl border border-gray-100">
        <div className="space-y-6">
          {cartItems.map((item, index) => (
            <div
              key={item.product_id || index}
              className="flex flex-col md:flex-row md:items-center justify-between bg-gray-50 p-6 rounded-xl shadow group hover:shadow-lg transition-shadow border border-gray-100"
            >
              <div className="flex items-center gap-6 w-full md:w-2/3">
                <Link href={`/products/${item.product_id}`} className="block">
                  <Image
                    src={normalizeImagePath(item.image)}
                    alt={item.name}
                    width={100}
                    height={100}
                    className="w-24 h-24 object-contain rounded-lg border border-gray-200 bg-white shadow-sm hover:scale-105 transition-transform"
                  />
                </Link>
                <div className="flex flex-col gap-1 w-full">
                  <Link href={`/products/${item.product_id}`} className="hover:underline">
                    <h3 className="text-lg font-semibold text-gray-800 line-clamp-2">{item.name}</h3>
                  </Link>
                  {item.category && (
                    <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full w-fit font-medium mb-1">{item.category}</span>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>Unit Price:</span>
                    <span className="font-bold text-green-700">${item.price}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => handleDecreaseQuantity(item.product_id)}
                      className="bg-gray-200 hover:bg-gray-300 rounded-full p-2 w-8 h-8 flex items-center justify-center text-lg font-bold"
                      aria-label="Decrease quantity"
                    >
                      -
                    </button>
                    <span className="text-lg font-semibold px-2">{item.quantity}</span>
                    <button
                      onClick={() => handleIncreaseQuantity(item.product_id)}
                      className="bg-gray-200 hover:bg-gray-300 rounded-full p-2 w-8 h-8 flex items-center justify-center text-lg font-bold"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end mt-4 md:mt-0 w-full md:w-1/3">
                <div className="text-lg font-bold text-green-600 mb-2">Subtotal: ${(item.price * item.quantity).toFixed(2)}</div>
                <button
                  onClick={() => handleRemoveItem(item.product_id)}
                  className="text-red-600 hover:text-white hover:bg-red-500 border border-red-200 px-4 py-2 rounded-lg font-semibold transition-colors"
                  aria-label="Remove item"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Cart Total */}
        <div className="flex flex-col md:flex-row justify-between items-center mt-12 border-t pt-8">
          <h3 className="text-2xl font-semibold text-gray-700 mb-4 md:mb-0">Total:</h3>
          <span className="text-3xl font-bold text-green-700">${total.toFixed(2)}</span>
        </div>

        <div className="mt-8 flex flex-col md:flex-row gap-4 justify-center">
          <button
            onClick={handleClearCart}
            className="bg-red-600 hover:bg-red-700 text-white py-3 px-8 rounded-xl font-semibold shadow-md border border-red-200 transition-colors"
          >
            Clear Cart
          </button>
          <Link href="/checkout">
            <button className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white py-3 px-10 rounded-xl font-bold shadow-md border border-blue-200 transition-all text-lg">
              Proceed to Checkout
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
