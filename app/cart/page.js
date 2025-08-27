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
  // Address from Supabase
  const [userAddress, setUserAddress] = useState(null);
  const [editingAddress, setEditingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState("");
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState("");
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [storeOptions, setStoreOptions] = useState({});
  const [storeDurations, setStoreDurations] = useState({});
  const [durationsLoading, setDurationsLoading] = useState(false);
  const router = useRouter();

  // Fetch user and address
  useEffect(() => {
    const fetchUserAndAddress = async () => {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData?.user) {
          console.error('Error fetching user:', userError);
          setUser(null);
          setUserAddress(null);
          setAuthChecked(true);
          return;
        }

        setUser(userData.user);
        console.log('Logged-in user ID:', userData.user.id);

        // Fetch the last used address for the user
        let { data: addressData, error: addressError } = await supabase
          .from('addresses')
          .select('id, full_address, is_last_used, created_at')
          .eq('user_id', userData.user.id)
          .eq('is_last_used', true)
          .single();

        console.log('Address query (is_last_used):', { addressData, addressError });

        // If no address with is_last_used: true, fetch any address
        if (!addressData || addressError?.code === 'PGRST116') {
          ({ data: addressData, error: addressError } = await supabase
            .from('addresses')
            .select('id, full_address, is_last_used, created_at')
            .eq('user_id', userData.user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single());
          console.log('Fallback address query:', { addressData, addressError });
        }

        if (addressError && addressError.code !== 'PGRST116') {
          console.error('Error fetching address:', addressError);
          setAddressError('Failed to fetch address.');
          setTimeout(() => setAddressError(''), 3000);
        } else if (addressData) {
          setUserAddress({ id: addressData.id, address: addressData.full_address });
        } else {
          console.log('No address found for user:', userData.user.id);
          setUserAddress(null);
        }
      } catch (err) {
        console.error('Unexpected error fetching user or address:', err);
        setAddressError('An error occurred while fetching user data.');
        setTimeout(() => setAddressError(''), 3000);
      } finally {
        setAuthChecked(true);
      }
    };

    fetchUserAndAddress();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        setShowAuthModal(false);
        setAuthChecked(true);
        // Fetch address for newly signed-in user
        const fetchAddress = async () => {
          console.log('Fetching address for signed-in user ID:', session.user.id);
          let { data: addressData, error: addressError } = await supabase
            .from('addresses')
            .select('id, full_address, is_last_used, created_at')
            .eq('user_id', session.user.id)
            .eq('is_last_used', true)
            .single();

          console.log('Address query (is_last_used, signed-in):', { addressData, addressError });

          if (!addressData || addressError?.code === 'PGRST116') {
            ({ data: addressData, error: addressError } = await supabase
              .from('addresses')
              .select('id, full_address, is_last_used, created_at')
              .eq('user_id', session.user.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single());
            console.log('Fallback address query (signed-in):', { addressData, addressError });
          }

          if (addressError && addressError.code !== 'PGRST116') {
            console.error('Error fetching address:', addressError);
            setAddressError('Failed to fetch address.');
            setTimeout(() => setAddressError(''), 3000);
          } else if (addressData) {
            setUserAddress({ id: addressData.id, address: addressData.full_address });
          } else {
            console.log('No address found for user:', session.user.id);
            setUserAddress(null);
          }
        };
        fetchAddress();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setUserAddress(null);
        setShowAuthModal(true);
        setAuthChecked(true);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Migrate guest cart to DB when user logs in
  useEffect(() => {
    const migrateGuestCart = async () => {
      if (!user || !authChecked) return;

      const guestCartKey = 'cart_guest';
      const guestCart = JSON.parse(localStorage.getItem(guestCartKey)) || [];
      if (guestCart.length === 0) return;

      try {
        const { data, error } = await supabase
          .from('carts')
          .select('store_carts')
          .eq('user_id', user.id)
          .single();

        let currentCart = [];
        if (data && data.store_carts) {
          currentCart = data.store_carts;
        }

        const updatedGuestCart = await Promise.all(guestCart.map(async (item) => {
          if (!item.storeName || item.storeName === 'Unknown Store' || !item.address) {
            const { data: supermarket, error } = await supabase
              .from('supermarkets')
              .select('name, address')
              .eq('id', item.supermarket_id)
              .single();
            return {
              ...item,
              storeName: error || !supermarket ? 'N/A' : supermarket.name,
              address: error || !supermarket ? null : supermarket.address
            };
          }
          return item;
        }));

        updatedGuestCart.forEach((guestItem) => {
          const existingItem = currentCart.find((item) => item.itemId === guestItem.itemId);
          if (existingItem) {
            existingItem.quantity += guestItem.quantity;
          } else {
            currentCart.push(guestItem);
          }
        });

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
  }, [user, authChecked]);

  // Fetch cart items
  const fetchCartItems = useCallback(async (options = {}) => {
    const { skipLoading = false } = options;
    if (!authChecked) return;

    try {
      if (!skipLoading) setLoading(true);
      let cart = [];

      if (!user) {
        cart = JSON.parse(localStorage.getItem('cart_guest') || '[]');
        console.log('Guest cart before processing:', cart);
        cart = await Promise.all(cart.map(async (item) => {
          if (!item.storeName || item.storeName === 'Unknown Store' || !item.address) {
            const { data: supermarket, error } = await supabase
              .from('supermarkets')
              .select('name, address')
              .eq('id', item.supermarket_id)
              .single();
            console.log('Supermarket query for item:', item.itemId, 'Result:', supermarket, 'Error:', error);
            return {
              ...item,
              storeName: error || !supermarket ? 'N/A' : supermarket.name,
              address: error || !supermarket ? null : supermarket.address
            };
          }
          return item;
        }));
        console.log('Guest cart after processing:', cart);
      } else {
        const { data, error } = await supabase
          .from('carts')
          .select('store_carts')
          .eq('user_id', user.id)
          .single();

        console.log('Supabase cart data:', data, 'Error:', error);
        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching cart:', error);
          setErrorMessage('Failed to fetch cart.');
          setTimeout(() => setErrorMessage(''), 3000);
          return;
        }
        cart = data?.store_carts || [];
        console.log('Cart before processing:', cart);
        cart = await Promise.all(cart.map(async (item) => {
          if (!item.storeName || item.storeName === 'Unknown Store' || !item.address) {
            const { data: supermarket, error } = await supabase
              .from('supermarkets')
              .select('name, address')
              .eq('id', item.supermarket_id)
              .single();
            console.log('Supermarket query for item:', item.itemId, 'Result:', supermarket, 'Error:', error);
            return {
              ...item,
              storeName: error || !supermarket ? 'N/A' : supermarket.name,
              address: error || !supermarket ? null : supermarket.address
            };
          }
          return item;
        }));
        console.log('Cart after processing:', cart);
      }

      setCartItems(cart);
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
      if (!skipLoading) setLoading(false);
    }
  }, [user, authChecked]);

  // Fetch store options for each product
  const fetchStoreOptions = useCallback(async () => {
    if (!cartItems.length) return;

    const productNames = [...new Set(cartItems
      .filter(item => item.storeName !== 'N/A')
      .map(item => item.name?.trim()))].filter(name => name);
    const options = {};

    try {
      for (const productName of productNames) {
        const cartItemsForName = cartItems.filter(item => item.name?.trim() === productName && item.storeName !== 'N/A');
        const excludedSupermarketIds = cartItemsForName.map(item => item.supermarket_id);

        let { data, error } = await supabase
          .from('products')
          .select(`
            id,
            name,
            price,
            image,
            supermarket_id,
            variations,
            supermarkets!supermarket_id (name, address)
          `)
          .ilike('name', `%${productName}%`);

        if (error) {
          console.error(`Error fetching store options for name "${productName}":`, error);
          setErrorMessage(`Failed to fetch store options for "${productName}".`);
          setTimeout(() => setErrorMessage(''), 3000);
          continue;
        }

        console.log(`Store options for "${productName}":`, data);

        if (data && data.length) {
          options[productName] = data
            .filter(p => !excludedSupermarketIds.includes(p.supermarket_id) && p.supermarkets?.address)
            .sort((a, b) => a.price - b.price)
            .map(p => ({
              itemId: p.id,
              product_id: p.id,
              price: p.price,
              storeName: p.supermarkets?.name || 'N/A',
              image: p.image,
              variations: p.variations,
              supermarket_id: p.supermarket_id,
              address: p.supermarkets?.address || null
            }))
            .filter(p => p.storeName !== 'N/A' && p.address);
          if (options[productName].length === 0) {
            console.warn(`No valid store options with addresses for "${productName}"`);
          }
        } else {
          console.warn(`No store options found for name "${productName}"`);
        }
      }
      console.log('Final store options:', options);
      setStoreOptions(options);
    } catch (err) {
      console.error('Error fetching store options:', err);
      setErrorMessage('An error occurred while fetching store options.');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  }, [cartItems]);

  useEffect(() => {
    if (authChecked) {
      fetchCartItems();
      const handleCartUpdate = () => fetchCartItems({ skipLoading: true });
      window.addEventListener('cartUpdated', handleCartUpdate);
      return () => window.removeEventListener('cartUpdated', handleCartUpdate);
    }
  }, [fetchCartItems, authChecked]);

  useEffect(() => {
    if (cartItems.length > 0) {
      fetchStoreOptions();
    }
  }, [cartItems, fetchStoreOptions]);

  // Fetch delivery durations for store options
  useEffect(() => {
    const fetchDurations = async () => {
      if (!userAddress?.address) {
        console.warn('Missing user address');
        setStoreDurations({});
        setErrorMessage('Please set a delivery address to calculate delivery times.');
        setTimeout(() => setErrorMessage(''), 3000);
        return;
      }

      const allOptions = Object.values(storeOptions).flat();
      const uniqueStores = new Map();
      allOptions.forEach(opt => {
        if (opt.address && !uniqueStores.has(opt.supermarket_id)) {
          uniqueStores.set(opt.supermarket_id, opt.address);
        }
      });

      // Include cart item addresses for duration calculation
      cartItems.forEach(item => {
        if (item.address && !uniqueStores.has(item.supermarket_id)) {
          uniqueStores.set(item.supermarket_id, item.address);
        }
      });

      if (uniqueStores.size === 0) {
        console.log('No valid store addresses found');
        setStoreDurations({});
        setErrorMessage('No valid store addresses available to calculate delivery times.');
        setTimeout(() => setErrorMessage(''), 3000);
        return;
      }

      const destinations = Array.from(uniqueStores.values());
      console.log('Fetching durations for:', { origin: userAddress.address, destinations });
      try {
        setDurationsLoading(true);
        const res = await fetch('/api/distance-matrix', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            origin: userAddress.address,
            destinations
          })
        });

        if (!res.ok) {
          const errorData = await res.json();
          console.error('Distance Matrix API error:', errorData);
          throw new Error(`HTTP error! Status: ${res.status}, Details: ${errorData.error || 'Unknown error'}`);
        }

        const data = await res.json();
        console.log('Distance Matrix API Response:', data);

        if (data.status === 'OK' && data.rows[0]) {
          const newDurations = {};
          data.rows[0].elements.forEach((element, idx) => {
            if (element.status === 'OK') {
              const address = destinations[idx];
              newDurations[address] = {
                text: element.duration.text,
                value: element.duration.value // Duration in seconds for sorting
              };
            } else {
              console.warn(`No duration available for address: ${destinations[idx]}`);
              newDurations[destinations[idx]] = { text: 'N/A', value: Infinity };
            }
          });
          setStoreDurations(newDurations);
        } else {
          console.error('Distance Matrix API error:', data.error, data.details || 'Unknown error');
          setStoreDurations(
            Object.fromEntries(destinations.map(dest => [dest, { text: 'N/A', value: Infinity }]))
          );
          setErrorMessage('Failed to fetch delivery times. Please try again later.');
          setTimeout(() => setErrorMessage(''), 3000);
        }
      } catch (err) {
        console.error('Error fetching durations:', err.message);
        setStoreDurations(
          Object.fromEntries(destinations.map(dest => [dest, { text: 'N/A', value: Infinity }]))
        );
        setErrorMessage('Failed to fetch delivery times. Please try again later.');
        setTimeout(() => setErrorMessage(''), 3000);
      } finally {
        setDurationsLoading(false);
      }
    };

    fetchDurations();
  }, [storeOptions, userAddress, cartItems]);

  // Show auth modal only when auth check is complete and user is not authenticated
  useEffect(() => {
    if (authChecked && !user && !loading) {
      setShowAuthModal(true);
    } else {
      setShowAuthModal(false);
    }
  }, [user, loading, authChecked]);

  const handleAddToCart = async (product) => {
    if (!product || !product.product_id || !product.itemId) {
      console.error('Invalid product data:', product);
      setErrorMessage('Invalid product data.');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    try {
      let storeName = 'N/A';
      let address = null;
      if (product.supermarket_id) {
        const { data: supermarket, error: supermarketError } = await supabase
          .from('supermarkets')
          .select('name, address')
          .eq('id', product.supermarket_id)
          .single();
        if (supermarketError || !supermarket) {
          console.warn('Supermarket not found for product:', product.itemId, 'Error:', supermarketError);
        } else {
          storeName = supermarket.name;
          address = supermarket.address;
        }
      }

      let updatedCart = [...cartItems];
      const existingItem = updatedCart.find((item) => item.itemId === product.itemId);

      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        updatedCart.push({ ...product, quantity: 1, storeName, address });
      }

      setCartItems(updatedCart);
      const newTotal = updatedCart.reduce(
        (acc, item) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 1),
        0
      );
      setTotal(newTotal);

      if (!user) {
        localStorage.setItem('cart_guest', JSON.stringify(updatedCart));
      } else {
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

      setCartItems(updatedCart);
      const newTotal = updatedCart.reduce(
        (acc, item) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 1),
        0
      );
      setTotal(newTotal);

      if (!user) {
        localStorage.setItem('cart_guest', JSON.stringify(updatedCart));
      } else {
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

      setCartItems(updatedCart);
      const newTotal = updatedCart.reduce(
        (acc, item) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 1),
        0
      );
      setTotal(newTotal);

      if (!user) {
        localStorage.setItem('cart_guest', JSON.stringify(updatedCart));
      } else {
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

      setCartItems(updatedCart);
      const newTotal = updatedCart.reduce(
        (acc, item) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 1),
        0
      );
      setTotal(newTotal);

      if (!user) {
        localStorage.setItem('cart_guest', JSON.stringify(updatedCart));
      } else {
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

      window.dispatchEvent(new Event('cartUpdated'));
    } catch (error) {
      console.error('Error in handleDecreaseQuantity:', error);
      setErrorMessage('An error occurred while updating quantity.');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleClearCart = async () => {
    try {
      setCartItems([]);
      setTotal(0);

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
          setErrorMessage('Failed to clear cart.');
          setTimeout(() => setErrorMessage(''), 3000);
          return;
        }
      }

      window.dispatchEvent(new Event('cartUpdated'));
    } catch (error) {
      console.error('Error in handleClearCart:', error);
      setErrorMessage('An error occurred while clearing cart.');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleSwitchStore = async (currentItemId, newProduct) => {
    try {
      const updatedCart = cartItems.map((item) => {
        if (item.itemId === currentItemId) {
          return {
            ...item,
            itemId: newProduct.itemId,
            product_id: newProduct.product_id,
            price: newProduct.price,
            supermarket_id: newProduct.supermarket_id,
            image: newProduct.image,
            storeName: newProduct.storeName,
            variations: newProduct.variations,
            address: newProduct.address
          };
        }
        return item;
      });

      setCartItems(updatedCart);
      const newTotal = updatedCart.reduce(
        (acc, item) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 1),
        0
      );
      setTotal(newTotal);

      if (!user) {
        localStorage.setItem('cart_guest', JSON.stringify(updatedCart));
      } else {
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
          console.error('Error switching store:', error);
          setErrorMessage('Failed to switch store.');
          setTimeout(() => setErrorMessage(''), 3000);
          return;
        }
      }

      window.dispatchEvent(new Event('cartUpdated'));
    } catch (error) {
      console.error('Error in handleSwitchStore:', error);
      setErrorMessage('An error occurred while switching store.');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleProceedToCheckout = (e) => {
    if (!user && authChecked) {
      e.preventDefault();
      setShowAuthModal(true);
    }
  };

  if (!authChecked || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="container mx-auto px-4 py-8 pt-24">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <div className="h-8 bg-gray-200 rounded-lg w-48 mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
            </div>
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
        <CustomAuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="max-w-6xl mx-auto">
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
          {/* Address Section with Enhanced UI */}
          <div className="mb-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-4 mb-4">
                <svg className="w-8 h-8 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">Delivery Address</h2>
                    {!editingAddress && user && (
                      <button
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                        onClick={() => {
                          setEditingAddress(true);
                          setNewAddress(userAddress?.address || "");
                          setAddressError("");
                        }}
                      >
                        {userAddress ? 'Change' : 'Add Address'}
                      </button>
                    )}
                  </div>
                  {!editingAddress ? (
                    <div className="mt-2">
                      {userAddress?.address ? (
                        <p className="text-gray-700 text-base leading-relaxed">{userAddress.address}</p>
                      ) : user ? (
                        <p className="text-gray-500 italic">No address set. Please add a delivery address.</p>
                      ) : (
                        <p className="text-gray-500 italic">Please sign in to set a delivery address.</p>
                      )}
                    </div>
                  ) : (
                    <form
                      className="mt-4 space-y-4"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!newAddress || !user) return;
                        setAddressLoading(true);
                        setAddressError("");
                        try {
                          const res = await fetch(`/api/geocode?address=${encodeURIComponent(newAddress)}`);
                          const data = await res.json();
                          if (data.status === "OK" && data.results.length > 0) {
                            const address = data.results[0].formatted_address;
                            // Update is_last_used to false for all existing addresses
                            await supabase
                              .from('addresses')
                              .update({ is_last_used: false })
                              .eq('user_id', user.id);
                            // Insert or update the new address
                            const { error: upsertError } = await supabase
                              .from('addresses')
                              .upsert({
                                id: userAddress?.id || crypto.randomUUID(),
                                user_id: user.id,
                                full_address: address,
                                is_last_used: true,
                                created_at: new Date().toISOString(),
                              });
                            if (upsertError) {
                              console.error('Error saving address:', upsertError);
                              setAddressError('Failed to save address.');
                              setTimeout(() => setAddressError(''), 3000);
                            } else {
                              setUserAddress({ id: userAddress?.id || crypto.randomUUID(), address });
                              setEditingAddress(false);
                            }
                          } else {
                            setAddressError("Could not find location. Please try a more specific address.");
                          }
                        } catch (err) {
                          console.error('Error updating address:', err);
                          setAddressError("Failed to fetch location.");
                        }
                        setAddressLoading(false);
                      }}
                    >
                      <input
                        type="text"
                        className="w-full py-3 px-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        value={newAddress}
                        onChange={e => setNewAddress(e.target.value)}
                        placeholder="Enter your delivery address..."
                        disabled={addressLoading}
                      />
                      <div className="flex gap-3">
                        <button
                          type="submit"
                          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                          disabled={addressLoading || !newAddress}
                        >
                          {addressLoading ? "Saving..." : "Save Address"}
                        </button>
                        <button
                          type="button"
                          className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
                          onClick={() => { setEditingAddress(false); setAddressError(""); }}
                          disabled={addressLoading}
                        >
                          Cancel
                        </button>
                      </div>
                      {addressError && (
                        <div className="text-red-500 text-sm mt-2">{addressError}</div>
                      )}
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>

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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {cartItems.map((item, index) => {
                    const normalizedImages = normalizeImagePath(item.image);
                    const imageUrl = normalizeImageUrl(normalizedImages[0] || '/placeholder-product.jpg');

                    return (
                      <div key={item.itemId || index} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex flex-col sm:flex-row gap-6">
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
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
                              <div className="flex-1">
                                <Link href={`/products/${item.product_id}`} className="group">
                                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                                    {item.name || 'Unnamed Product'}
                                  </h3>
                                </Link>
                                <div className="mt-1 text-sm text-gray-600">
                                  Store: {item.storeName === 'N/A' ? 'No supermarket assigned' : item.storeName}
                                </div>
                                {item.variation && (
                                  <div className="mt-1 flex items-center gap-2">
                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                      {item.variation.size && item.variation.color
                                        ? `${item.variation.size} / ${item.variation.color}`
                                        : item.variation.size || item.variation.color || 'Variation'}
                                    </span>
                                  </div>
                                )}
                                <div className="mt-1 flex items-center gap-2">
                                  <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                                    {durationsLoading ? (
                                      'Calculating...'
                                    ) : storeDurations[item.address]?.text ? (
                                      `Est. delivery: ${storeDurations[item.address].text}`
                                    ) : (
                                      'Delivery: N/A'
                                    )}
                                  </span>
                                </div>
                                <div className="mt-3 flex items-center justify-between">
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
                                  <button
                                    onClick={() => handleRemoveItem(item.itemId)}
                                    className="text-gray-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors group"
                                    aria-label="Remove item"
                                  >
                                    <FaTrashAlt className="text-sm group-hover:scale-110 transition-transform" />
                                  </button>
                                </div>
                              </div>
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
              {/* Review by Stores Section */}
              {cartItems.some(item => item.storeName !== 'N/A' && storeOptions[item.name?.trim()]?.length > 0) && (
                <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <div className="w-2 h-6 bg-blue-600 rounded-full"></div>
                    Review by Stores
                  </h2>
                  {cartItems
                    .filter(item => item.storeName !== 'N/A')
                    .map((item) => {
                      const options = storeOptions[item.name?.trim()] || [];
                      if (!options.length) return null;

                      const sortedOptions = [...options].sort((a, b) => {
                        const durA = storeDurations[a.address]?.value || Infinity;
                        const durB = storeDurations[b.address]?.value || Infinity;
                        return durA - durB;
                      });

                      const normalizedImages = normalizeImagePath(item.image);
                      const imageUrl = normalizeImageUrl(normalizedImages[0] || '/placeholder-product.jpg');

                      return (
                        <div key={item.itemId} className="mb-8 border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                          <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 bg-white rounded-xl border border-gray-200 overflow-hidden">
                              <Image
                                src={imageUrl}
                                alt={item.name || 'Product image'}
                                width={64}
                                height={64}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                          </div>
                          <div className="space-y-3">
                            {sortedOptions.map((opt) => {
                              const optImages = normalizeImagePath(opt.image);
                              const optImageUrl = normalizeImageUrl(optImages[0] || '/placeholder-product.jpg');

                              return (
                                <div
                                  key={opt.itemId}
                                  className="flex items-center gap-4 p-4 rounded-lg border bg-gray-50 border-gray-200"
                                >
                                  <div className="w-12 h-12 bg-white rounded-lg border border-gray-200 overflow-hidden flex-shrink-0">
                                    <Image
                                      src={optImageUrl}
                                      alt={opt.storeName}
                                      width={48}
                                      height={48}
                                      className="w-full h-full object-contain"
                                    />
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-800">{opt.storeName === 'N/A' ? 'No supermarket assigned' : opt.storeName}</div>
                                    {opt.variations && (
                                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full mt-1 inline-block">
                                        {opt.variations.size && opt.variations.color
                                          ? `${opt.variations.size} / ${opt.variations.color}`
                                          : opt.variations.size || opt.variations.color || 'Variation'}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <span className="text-gray-900">${opt.price.toFixed(2)}</span>
                                    {durationsLoading ? (
                                      <span className="text-gray-600 text-sm bg-gray-100 px-3 py-1 rounded-full">
                                        Calculating...
                                      </span>
                                    ) : storeDurations[opt.address] ? (
                                      <span className="text-gray-600 text-sm bg-gray-100 px-3 py-1 rounded-full">
                                        Est. delivery: {storeDurations[opt.address].text}
                                      </span>
                                    ) : (
                                      <span className="text-gray-600 text-sm bg-gray-100 px-3 py-1 rounded-full">
                                        N/A
                                      </span>
                                    )}
                                    <button
                                      onClick={() => handleSwitchStore(item.itemId, opt)}
                                      className="px-4 py-2 rounded-lg font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700"
                                      disabled={opt.storeName === 'N/A'}
                                    >
                                      Choose
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  {Object.keys(storeOptions).every((name) => storeOptions[name].length === 0) && (
                    <p className="text-gray-600 text-center">No alternative stores available for your items. Please ensure stores have valid addresses.</p>
                  )}
                </div>
              )}
            </div>
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