
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import Image from 'next/image';
import { FaArrowLeft, FaShieldAlt, FaCheckCircle } from 'react-icons/fa';
import { MdOutlineShoppingCart } from 'react-icons/md';
import { HiOutlineLockClosed } from 'react-icons/hi';

// Supported currencies and symbols
const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR'];
const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
};

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
  const [userAddress, setUserAddress] = useState(null);
  const initialCart = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('cart_guest') || '[]') : [];
  const [cartItems, setCartItems] = useState(initialCart);
  const [total, setTotal] = useState(0);
  const [taxTotal, setTaxTotal] = useState(0);
  const [couponCode, setCouponCode] = useState('');
  const [couponInfo, setCouponInfo] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [promotionTotalDiscount, setPromotionTotalDiscount] = useState(0);
  const [couponTotalDiscount, setCouponTotalDiscount] = useState(0);
  const [discountedTotal, setDiscountedTotal] = useState(null);
  const [selectedCurrency, setSelectedCurrency] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedCurrency = localStorage.getItem('selectedCurrency');
      return SUPPORTED_CURRENCIES.includes(savedCurrency) ? savedCurrency : 'USD';
    }
    return 'USD';
  });
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCartConfirmedEmpty, setIsCartConfirmedEmpty] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();

  // Listen for currency changes from navbar
  useEffect(() => {
    const handleCurrencyUpdate = () => {
      const savedCurrency = localStorage.getItem('selectedCurrency');
      if (SUPPORTED_CURRENCIES.includes(savedCurrency)) {
        setSelectedCurrency(savedCurrency);
      }
    };
    window.addEventListener('currencyUpdated', handleCurrencyUpdate);
    return () => {
      window.removeEventListener('currencyUpdated', handleCurrencyUpdate);
    };
  }, []);

  // Fetch user, address, cart, tax, and promotions data
  const fetchUserAddressAndCart = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      let cart = [];

      if (userError || !userData?.user) {
        console.warn('No authenticated user found:', userError?.message);
        setUser(null);
        cart = JSON.parse(localStorage.getItem('cart_guest') || '[]');
      } else {
        setUser(userData.user);
        // Fetch address
        const { data: addresses, error: addressError } = await supabase
          .from('addresses')
          .select('full_address, is_last_used')
          .eq('user_id', userData.user.id);
        if (addressError) throw new Error(`Address fetch error: ${addressError.message}`);
        const lastUsedAddress = addresses.find((addr) => addr.is_last_used) || addresses[0];
        setUserAddress(lastUsedAddress ? lastUsedAddress.full_address : null);

        // Fetch cart
        const { data: cartData, error: cartError } = await supabase
          .from('carts')
          .select('store_carts')
          .eq('user_id', userData.user.id)
          .single();

        if (cartError && cartError.code !== 'PGRST116') {
          console.error('Error fetching cart:', cartError);
          throw new Error(`Cart fetch error: ${cartError.message}`);
        }
        cart = cartData?.store_carts || [];
      }

      // Fetch exchange rate
      const response = await fetch(`/api/products/convert?currency=${selectedCurrency}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch exchange rate for ${selectedCurrency}: ${response.statusText}`);
      }
      const { rate, symbol } = await response.json();
      if (!Number.isFinite(rate) || !symbol) {
        throw new Error(`Invalid exchange rate data for ${selectedCurrency}: rate=${rate}, symbol=${symbol}`);
      }

      // Validate and filter cart items
      cart = cart.filter((item, index) => {
        const isValid = (item.product_id || item.itemId) && Number.isFinite(Number(item.price)) && Number.isFinite(Number(item.quantity));
        if (!isValid) {
          console.warn(`Invalid cart item at index ${index}:`, item);
        }
        return isValid;
      });

      // Update cart items with currency conversion (store original USD price)
      cart = cart.map((item) => ({
        ...item,
        original_price: Number(item.original_price) || Number(item.price) || 0, // USD price
        price: (Number(item.original_price) || Number(item.price) || 0) * rate, // Converted price
        currency: selectedCurrency,
        symbol,
        quantity: Number(item.quantity) || 1,
      }));

      // Fetch product categories
      const productIds = cart.map(item => item.product_id || item.itemId).filter(id => id);
      let productsData = [];
      if (productIds.length > 0) {
        const { data, error: productsError } = await supabase
          .from('products')
          .select('id, category')
          .in('id', productIds);
        if (productsError) {
          console.warn('Error fetching product categories:', productsError);
        } else {
          productsData = data || [];
        }
      }

      // Merge category into cart items
      cart = cart.map(item => {
        const product = productsData.find(p => p.id === (item.product_id || item.itemId));
        return { ...item, category: product?.category || 'general' };
      });

      // Fetch promotion products
      let promoProducts = [];
      if (productIds.length > 0) {
        const { data: promoData, error: promoError } = await supabase
          .from('promotion_products')
          .select('product_id, promotions!promotion_products_promotion_id_fkey(discount_percentage, start_date, end_date)')
          .in('product_id', productIds);
        if (promoError) {
          console.warn('Error fetching promotion products:', promoError);
        } else {
          promoProducts = promoData || [];
        }
      }

      setCartItems(cart);
      setIsCartConfirmedEmpty(cart.length === 0);

      // Calculate totals (in USD)
      let totalPrice = 0;
      let totalTax = 0;
      let totalPromotionDiscount = 0;
      const today = new Date();
      for (const item of cart) {
        const subtotal = (Number(item.original_price) || 0) * (Number(item.quantity) || 1); // Use USD price
        totalPrice += subtotal;

        // Fetch tax rate
        const { data: taxData, error: taxError } = await supabase
          .from('tax_rules')
          .select('tax_rate')
          .eq('region', 'default')
          .eq('product_category', item.category || 'general')
          .single();

        let taxRate = 0.1;
        if (taxError) {
          console.warn('No tax rule found for category:', item.category, taxError);
        } else {
          taxRate = taxData?.tax_rate || 0.1;
        }
        const itemTax = subtotal * taxRate;
        item.tax_amount = Number.isFinite(itemTax) ? itemTax * rate : 0; // Store tax in selected currency for display
        totalTax += itemTax; // Accumulate in USD

        // Calculate promotion discount
        const itemPromos = promoProducts.filter(pp => pp.product_id === (item.product_id || item.itemId));
        let maxDiscount = 0;
        for (const pp of itemPromos) {
          const promo = pp.promotions;
          const start = promo.start_date ? new Date(promo.start_date) : null;
          const end = promo.end_date ? new Date(promo.end_date) : null;
          const active = (start === null || start <= today) && (end === null || end >= today);
          if (active) {
            maxDiscount = Math.max(maxDiscount, promo.discount_percentage);
          }
        }
        const itemPromotionDiscount = subtotal * maxDiscount;
        totalPromotionDiscount += itemPromotionDiscount;
        item.promotion_discount = maxDiscount;
      }

      setTotal(Number.isFinite(totalPrice) ? totalPrice * rate : 0); // Display in selected currency
      setTaxTotal(Number.isFinite(totalTax) ? totalTax * rate : 0); // Display in selected currency
      setPromotionTotalDiscount(Number.isFinite(totalPromotionDiscount) ? totalPromotionDiscount * rate : 0); // Display in selected currency
    } catch (error) {
      console.error('Error in fetchUserAddressAndCart:', error);
      setErrorMessage('An error occurred while loading the checkout.');
      setTimeout(() => setErrorMessage(''), 3000);
      setIsCartConfirmedEmpty(true);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCurrency]);

  useEffect(() => {
    fetchUserAddressAndCart();
    const handleCartUpdate = () => fetchUserAddressAndCart();
    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, [fetchUserAddressAndCart]);

  // Update discounted total
  useEffect(() => {
    const updateDiscountedTotal = async () => {
      try {
        let couponDiscountAmount = 0;
        if (couponInfo) {
          const matchedItem = cartItems.find(item => (item.product_id || item.itemId) === couponInfo.product_id);
          if (matchedItem) {
            const subtotal = (Number(matchedItem.original_price) || 0) * (Number(matchedItem.quantity) || 1); // Use USD price
            const afterPromo = subtotal * (1 - (matchedItem.promotion_discount || 0));
            couponDiscountAmount = afterPromo * (couponInfo.discount / 100);
          }
        }
        const response = await fetch(`/api/products/convert?currency=${selectedCurrency}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch exchange rate: ${response.statusText}`);
        }
        const { rate } = await response.json();
        if (!Number.isFinite(rate)) {
          throw new Error(`Invalid exchange rate: ${rate}`);
        }
        setCouponTotalDiscount(Number.isFinite(couponDiscountAmount) ? couponDiscountAmount * rate : 0); // Display in selected currency
        const totalDiscount = promotionTotalDiscount + (couponDiscountAmount * rate);
        setDiscountedTotal(Number.isFinite(total - totalDiscount + taxTotal) ? total - totalDiscount + taxTotal : 0);
      } catch (error) {
        console.error('Error updating discounted total:', error);
        setCouponTotalDiscount(0);
        setDiscountedTotal(total + taxTotal);
      }
    };
    updateDiscountedTotal();
  }, [couponInfo, total, taxTotal, promotionTotalDiscount, cartItems, selectedCurrency]);

  // Protect checkout page
  useEffect(() => {
    if (!isLoading && !user && cartItems.length > 0) {
      setShowAuthModal(true);
    } else {
      setShowAuthModal(false);
    }
  }, [user, isLoading, cartItems]);

  // Coupon validation and application
  const handleApplyCoupon = async () => {
    setCouponError('');
    setCouponInfo(null);
    setCouponTotalDiscount(0);
    if (!couponCode) {
      setCouponError('Please enter a coupon code.');
      return;
    }
    try {
      const productIds = cartItems.map(item => item.product_id || item.itemId).filter(id => id);
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.trim())
        .in('product_id', productIds)
        .single();
      if (error || !data) {
        setCouponError('Invalid or expired coupon code for your cart.');
        return;
      }
      const today = new Date();
      const expiry = new Date(data.expiry_date);
      if (expiry < today) {
        setCouponError('This coupon has expired.');
        return;
      }
      if (data.usage_limit && data.used_count >= data.usage_limit) {
        setCouponError('This coupon has reached its usage limit.');
        return;
      }
      const matchedItem = cartItems.find(item => (item.product_id || item.itemId) === data.product_id);
      if (!matchedItem) {
        setCouponError('Coupon does not apply to any product in your cart.');
        return;
      }
      setCouponInfo(data);
    } catch (err) {
      console.error('Error applying coupon:', err);
      setCouponError('Error applying coupon.');
    }
  };

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
      setErrorMessage('Please sign in to proceed with payment.');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    if (!userAddress) {
      setErrorMessage('Please set a delivery address before proceeding.');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    const res = await loadRazorpayScript();
    if (!res) {
      setErrorMessage('Razorpay SDK failed to load.');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    // Log cart items for debugging
    console.log('Cart items before order insertion:', JSON.stringify(cartItems, null, 2));

    // Validate cart items
    const invalidItems = cartItems.filter(item => !item.product_id && !item.itemId);
    if (invalidItems.length > 0) {
      console.error('Invalid cart items (missing product_id or itemId):', invalidItems);
      setErrorMessage('Some items in your cart are invalid. Please check your cart and try again.');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    // Fetch exchange rate for converting amounts to USD
    const { rate } = await (await fetch(`/api/products/convert?currency=${selectedCurrency}`)).json();

    // Create order records (in USD)
    const orderPromises = cartItems.map(async (item, index) => {
      const productId = item.product_id || item.itemId;
      if (!productId) {
        console.error(`Missing product_id for cart item at index ${index}:`, item);
        throw new Error(`Missing product_id for cart item at index ${index}`);
      }
      let itemTotal = (Number(item.original_price) || 0) * (Number(item.quantity) || 1); // Use USD price
      let appliedCouponId = null;
      itemTotal *= (1 - (item.promotion_discount || 0));
      if (couponInfo && couponInfo.product_id === productId) {
        itemTotal *= (1 - (couponInfo.discount / 100));
        appliedCouponId = couponInfo.id;
      }
      const grandTotal = Number.isFinite(itemTotal + (item.tax_amount / rate)) 
        ? itemTotal + (item.tax_amount / rate) 
        : 0;
      const orderData = {
        user_id: user.id,
        product_id: productId,
        quantity: Number(item.quantity) || 1,
        total_amount: grandTotal,
        tax_amount: Number.isFinite(item.tax_amount / rate) ? item.tax_amount / rate : 0,
        status: 'pending',
        address: userAddress,
        coupon_id: appliedCouponId,
      };

      console.log(`Inserting order for product ${productId}:`, orderData);

      try {
        const { data, error } = await supabase
          .from('orders')
          .insert(orderData)
          .select('id')
          .single();
        if (error) {
          console.error(`Order insert error for product ${productId}:`, error, { orderData });
          throw new Error(`Failed to create order for product ${productId}: ${error.message}`);
        }
        return data.id;
      } catch (error) {
        console.error(`Error inserting order for product ${productId}:`, error, { orderData });
        throw error;
      }
    });

    let orderIds;
    try {
      orderIds = await Promise.all(orderPromises);
    } catch (error) {
      console.error('Failed to create orders:', error);
      setErrorMessage('Failed to create orders. Please try again or contact support.');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    // Create Razorpay order
    const finalAmount = Number.isFinite(discountedTotal) ? discountedTotal : total + taxTotal;
    console.log(`Creating Razorpay order: amount=${finalAmount}, currency=${selectedCurrency}`);
    const orderRes = await fetch('/api/razorpay-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        amount: finalAmount,
        currency: selectedCurrency,
      }),
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
          const updatePromises = orderIds.map((orderId) =>
            supabase
              .from('orders')
              .update({
                payment_id: response.razorpay_payment_id,
                razorpay_order_id: order.id,
                status: 'pending',
                address: userAddress,
              })
              .eq('id', orderId)
          );
          await Promise.all(updatePromises);
          if (couponInfo) {
            await supabase
              .from('coupons')
              .update({ used_count: (couponInfo.used_count || 0) + 1 })
              .eq('id', couponInfo.id);
          }
          if (!user) {
            localStorage.removeItem('cart_guest');
            setCartItems([]);
            setIsCartConfirmedEmpty(true);
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
              console.error('Failed to clear cart:', error);
              setErrorMessage('Failed to clear cart after payment.');
              setTimeout(() => setErrorMessage(''), 3000);
            } else {
              setCartItems([]);
              setIsCartConfirmedEmpty(true);
            }
          }
          window.dispatchEvent(new Event('cartUpdated'));
          setTimeout(() => {
            router.push('/checkout/success?payment_id=' + response.razorpay_payment_id + '&order_id=' + orderIds.join(','));
          }, 300);
        } catch (error) {
          console.error('Error updating orders after payment:', error);
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

  // Show loading skeleton during initial fetch
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <div className="h-10 bg-gray-200 rounded-lg w-64 mb-3 animate-pulse"></div>
              <div className="h-5 bg-gray-200 rounded w-48 animate-pulse"></div>
            </div>
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

  // Show empty cart UI
  if (isCartConfirmedEmpty) {
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
          <div className="mb-8">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div>
                <div className="font-semibold text-green-900">Delivery Address</div>
                <div className="text-green-700 text-base">
                  {userAddress
                    ? userAddress
                    : <span className="text-gray-400">No address set. Please add an address.</span>}
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {cartItems.map((item, index) => {
                    const normalizedImages = normalizeImagePath(item.image);
                    const imageUrl = normalizeImageUrl(normalizedImages[0] || '/placeholder-product.jpg');
                    return (
                      <div key={item.itemId || index} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors duration-200">
                        <div className="flex flex-col sm:flex-row gap-4">
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
                                {item.tax_amount > 0 && (
                                  <div className="mt-1 text-sm text-gray-600">
                                    Tax: {item.symbol}{item.tax_amount.toFixed(2)}
                                  </div>
                                )}
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="text-xs text-gray-500 mb-1">Unit Price</div>
                                <div className="text-sm font-medium text-gray-700 mb-2">{item.symbol}{Number(item.price || 0).toFixed(2)}</div>
                                <div className="text-xs text-gray-500 mb-1">Subtotal</div>
                                <div className="text-lg sm:text-xl font-bold text-gray-900">
                                  {item.symbol}{(Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2)}
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
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-20">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <div className="w-2 h-6 bg-blue-600 rounded-full"></div>
                  Order Summary
                </h2>
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal ({cartItems.length} items)</span>
                    <span className="font-medium">{cartItems[0]?.symbol || '$'}{total.toFixed(2)}</span>
                  </div>
                  {promotionTotalDiscount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Promotion Discount</span>
                      <span className="font-medium">-{cartItems[0]?.symbol || '$'}{promotionTotalDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {couponInfo && couponTotalDiscount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Coupon Discount ({couponInfo.code})</span>
                      <span className="font-medium">-{cartItems[0]?.symbol || '$'}{couponTotalDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Shipping</span>
                    <span className="font-medium text-green-600">Free</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax</span>
                    <span className="font-medium">{cartItems[0]?.symbol || '$'}{taxTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col gap-2 pt-2">
                    <label className="text-sm font-medium text-gray-700">Coupon Code</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={e => setCouponCode(e.target.value)}
                        placeholder="Enter coupon code"
                        className="border px-3 py-2 rounded w-full"
                        disabled={!!couponInfo}
                      />
                      <button
                        type="button"
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        onClick={handleApplyCoupon}
                        disabled={!!couponInfo}
                      >
                        Apply
                      </button>
                    </div>
                    {couponError && <div className="text-red-600 text-xs">{couponError}</div>}
                    {couponInfo && (
                      <div className="text-green-700 text-xs">Coupon applied: {couponInfo.code} ({couponInfo.discount}% off on {couponInfo.usage_limit ? `up to ${couponInfo.usage_limit} uses` : 'unlimited uses'})</div>
                    )}
                  </div>
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-base sm:text-lg font-bold text-gray-900">Total</span>
                      <span className="text-xl sm:text-2xl font-bold text-blue-600">{cartItems[0]?.symbol || '$'}{(discountedTotal !== null ? discountedTotal : total + taxTotal).toFixed(2)}</span>
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
      </div>
    </div>
  );
}