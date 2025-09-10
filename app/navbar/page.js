
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import debounce from "lodash.debounce";
import { createClient } from "@supabase/supabase-js";
import { ProfileSidebar } from "@/app/profile/page";
import AuthModal from "./AuthModal";
import NavbarTranslateWidget from "@/components/NavbarTranslateWidget";
import { useRouter } from "next/navigation";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Supported currencies and symbols
const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR'];
const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
};

// Normalize image URL or path to handle both absolute URLs and relative paths
const normalizeImageUrl = (input) => {
  const fallbackImage = '/placeholder-product.jpg';

  if (!input) return fallbackImage;

  if (Array.isArray(input)) {
    const normalized = input
      .map((p) => {
        if (!p) return null;
        const trimmed = String(p).trim();
        if (!trimmed) return null;

        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
          try {
            new URL(trimmed);
            return trimmed;
          } catch {
            return null;
          }
        }

        const normalizedPath = trimmed.replace(/^(\.\.\/)+assets\//, '/');
        return normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
      })
      .filter((p) => p);

    return normalized.length > 0 ? normalized[0] : fallbackImage;
  }

  const urlString = String(input).trim();
  if (!urlString) return fallbackImage;

  if (urlString.startsWith('http://') || urlString.startsWith('https://')) {
    try {
      new URL(urlString);
      return urlString;
    } catch {
      return fallbackImage;
    }
  }

  const normalizedPath = urlString.replace(/^(\.\.\/)+assets\//, '/');
  return normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
};

async function fetchData(endpoint) {
  const res = await fetch(`/api/${endpoint}`);
  if (!res.ok) throw new Error(`Failed to fetch ${endpoint}`);
  return res.json();
}

export default function Navbar() {
  const [cartCount, setCartCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stores, setStores] = useState([]);
  const [categories, setCategories] = useState([]);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [userDropdownVisible, setUserDropdownVisible] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [profileSidebarOpen, setProfileSidebarOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [selectedCurrency, setSelectedCurrency] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedCurrency = localStorage.getItem('selectedCurrency');
      return SUPPORTED_CURRENCIES.includes(savedCurrency) ? savedCurrency : 'USD';
    }
    return 'USD';
  });
  const searchInputRef = useRef();
  const searchResultsRef = useRef();
  const router = useRouter();

  // Save selected currency to localStorage and dispatch event
  useEffect(() => {
    localStorage.setItem('selectedCurrency', selectedCurrency);
    window.dispatchEvent(new Event('currencyUpdated'));
  }, [selectedCurrency]);

  // Initialize Google Translate
  useEffect(() => {
    const addScript = document.createElement("script");
    addScript.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    document.body.appendChild(addScript);

    window.googleTranslateElementInit = () => {
      if (document.getElementById("google_translate_element")) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            includedLanguages: "en,sw,hi,fr,es,de,ar,zh,ja,ko,pt,ru,it,nl",
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          },
          "google_translate_element"
        );
      }
      
      if (document.getElementById("google_translate_element_mobile")) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            includedLanguages: "en,hi,fr,es,de,ar,zh,ja,ko,pt,ru,it,nl",
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          },
          "google_translate_element_mobile"
        );
      }
    };

    return () => {
      const existingScript = document.querySelector('script[src*="translate.google.com"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  // Fetch user from Supabase auth
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };

    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          setUser(session.user);
        } else {
          setUser(null);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Fetch stores for dropdown
  useEffect(() => {
    const loadStores = async () => {
      try {
        const storesData = await fetchData("stores");
        setStores(storesData);
      } catch (error) {
        console.error("Failed to load stores:", error);
      }
    };
    loadStores();
  }, []);

  // Fetch categories for search
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoriesData = await fetchData("categories");
        setCategories(categoriesData);
      } catch (error) {
        // Optionally handle error
      }
    };
    loadCategories();
  }, []);

  // Fetch products for search directly from Supabase
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('id, name, price, image, quantity, date_added')
          .order('date_added', { ascending: false });
        if (productsError) {
          console.error('Error fetching products:', productsError.message);
          setProducts([]);
        } else {
          const normalizedProducts = productsData.map(product => ({
            ...product,
            image: normalizeImageUrl(product.image)
          }));
          setProducts(normalizedProducts || []);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        setProducts([]);
      }
    };
    fetchProducts();
  }, []);

  // Log loaded products and categories
  useEffect(() => {
    console.log('Loaded products:', products);
    console.log('Loaded categories:', categories);
  }, [products, categories]);

  // Load cart count
  const loadCartCount = useCallback(async () => {
    try {
      let cart = [];
      if (!user) {
        cart = JSON.parse(localStorage.getItem('cart_guest') || '[]');
      } else {
        const { data, error } = await supabase
          .from('carts')
          .select('store_carts')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching cart:', error);
          return;
        }
        cart = data?.store_carts || [];
      }

      const count = cart.reduce((total, item) => total + (Number(item.quantity) || 1), 0);
      setCartCount(count);
    } catch (error) {
      console.error('Error loading cart count:', error);
      setCartCount(0);
    }
  }, [user]);

  useEffect(() => {
    loadCartCount();
    const handleCartUpdate = () => {
      loadCartCount();
    };
    window.addEventListener("cartUpdated", handleCartUpdate);
    return () => {
      window.removeEventListener("cartUpdated", handleCartUpdate);
    };
  }, [loadCartCount]);

  const handleSearchBlur = (event) => {
    if (searchResultsRef.current && event.relatedTarget && searchResultsRef.current.contains(event.relatedTarget)) {
      return;
    }
    setTimeout(() => setSearchResults([]), 200);
  };

  // Debounced search function with currency conversion
  const debouncedSearch = useMemo(
    () =>
      debounce(async (query) => {
        const trimmedQuery = query.trim().toLowerCase();
        if (!trimmedQuery) {
          setSearchResults([]);
          setLoading(false);
          return;
        }
        setLoading(true);
        try {
          // Fetch exchange rate for selected currency
          const response = await fetch(`/api/products/convert?currency=${selectedCurrency}`);
          const { rate, symbol } = await response.json();

          const filteredProducts = products.filter((product) =>
            product.name?.toLowerCase().includes(trimmedQuery)
          );
          const convertedProducts = filteredProducts.map((p) => ({
            ...p,
            _type: "product",
            price: (parseFloat(p.price) * rate).toFixed(2),
            currencySymbol: symbol
          }));
          setSearchResults(convertedProducts);
        } catch (error) {
          console.error('Search error:', error);
          setSearchResults([]);
        } finally {
          setLoading(false);
        }
      }, 400),
    [products, selectedCurrency]
  );

  const handleSearchChange = useCallback((e) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  }, [debouncedSearch]);

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) {
      router.push(`/search?query=${encodeURIComponent(trimmedQuery)}`);
      setSearchQuery("");
      setSearchResults([]);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownVisible && !event.target.closest('.store-dropdown')) {
        setDropdownVisible(false);
      }
      if (userDropdownVisible && !event.target.closest('.user-dropdown')) {
        setUserDropdownVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownVisible, userDropdownVisible]);

  const getUserDisplayName = () => {
    if (!user) return "Sign In";
    return user.user_metadata?.full_name || user.email?.split('@')[0] || "Profile";
  };

  const getUserAvatar = () => {
    if (!user) return null;
    if (user.app_metadata?.provider === 'google') {
      return user.user_metadata?.avatar_url || user.user_metadata?.picture;
    }
    if (user.user_metadata?.avatar_url) {
      return user.user_metadata.avatar_url;
    }
    return null;
  };

  const getUserInitials = () => {
    if (!user) return "?";
    if (user.user_metadata?.full_name) {
      const nameParts = user.user_metadata.full_name.split(' ');
      if (nameParts.length >= 2) {
        return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
      }
      return nameParts[0][0].toUpperCase();
    }
    return user.email?.[0].toUpperCase() || "?";
  };

  return (
    <>
      <NavbarTranslateWidget />
      {profileSidebarOpen && (
        <ProfileSidebar onClose={() => setProfileSidebarOpen(false)} />
      )}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <header className="fixed top-0 left-0 w-full z-50 flex flex-wrap justify-between items-center py-3 px-4 sm:px-6 bg-white text-gray-700 shadow">
        <button 
          className="lg:hidden flex items-center" 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-6 w-6" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} 
            />
          </svg>
        </button>
        
        <Link href="/" className="flex items-center mx-auto lg:mx-0">
          <Image src="/mylogo.jpg" alt="Logo" width={40} height={40} className="rounded-lg" />
        </Link>

        <button 
          className="lg:hidden flex items-center" 
          onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-6 w-6" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
            />
          </svg>
        </button>

        <Link href="/cart" className="lg:hidden flex items-center relative ml-4 group">
          <div className="relative transform transition-transform duration-200 group-hover:scale-105">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-gray-600 group-hover:text-gray-800 transition-colors duration-200"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-md transform transition-transform duration-200 group-hover:scale-110">
                {cartCount}
              </span>
            )}
          </div>
        </Link>

        {mobileSearchOpen && (
          <div className="w-full mt-3 order-last">
            <form className="relative" onSubmit={handleSearchSubmit}>
              <input
                type="text"
                placeholder="Search for grocery, meat and more..."
                className="w-full px-4 py-2.5 pl-11 rounded-xl bg-gray-100 border border-transparent focus:border-gray-300 focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 focus:outline-none transition-all duration-200"
                value={searchQuery}
                onChange={handleSearchChange}
                ref={searchInputRef}
                onBlur={handleSearchBlur}
                aria-label="Search products"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-400 transition-colors duration-150 group-hover:text-gray-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              {loading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                  </svg>
                </div>
              )}
            </form>
            {searchQuery && searchResults.length > 0 && (
              <div ref={searchResultsRef} className="absolute left-0 right-0 mt-2 mx-4 bg-white border rounded shadow-lg z-20 max-h-80 overflow-y-auto">
                {searchResults.map((item) =>
                  item._type === "product" ? (
                    <Link
                      href={`/products/${item.id}`}
                      key={`product-${item.id}`}
                      className="flex items-center px-4 py-2 hover:bg-gray-100"
                      onClick={() => setSearchQuery("")}
                    >
                      {item.image && (
                        <Image
                          src={item.image}
                          alt={item.name || 'Product Image'}
                          width={36}
                          height={36}
                          className="rounded mr-3 object-cover"
                          onError={() => console.error(`Failed to load image for product: ${item.name}`)}
                        />
                      )}
                      <div>
                        <p className="text-sm font-medium">{item.name || 'Unnamed Product'}</p>
                        {item.price && (
                          <p className="text-xs text-green-600">{item.currencySymbol}{item.price}</p>
                        )}
                      </div>
                    </Link>
                  ) : (
                    <Link
                      href={`/categories/${item.id}`}
                      key={`category-${item.id}`}
                      className="flex items-center px-4 py-2 hover:bg-gray-100"
                      onClick={() => setSearchQuery("")}
                    >
                      <div>
                        <p className="text-sm font-medium text-blue-700">Category: {item.name}</p>
                      </div>
                    </Link>
                  )
                )}
              </div>
            )}
            {searchQuery && !loading && searchResults.length === 0 && (
              <div className="absolute left-0 right-0 mt-2 mx-4 bg-white border rounded shadow-lg z-20 max-h-80 overflow-y-auto px-4 py-2 text-gray-500">
                No results found
              </div>
            )}
          </div>
        )}

        {mobileMenuOpen && (
          <div className="w-full order-last mt-3">
            <div className="bg-white border rounded-lg shadow-lg p-4 space-y-4">
              {user ? (
                <button
                  type="button"
                  className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition duration-150 w-full"
                  onClick={() => { setProfileSidebarOpen(true); setMobileMenuOpen(false); }}
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-blue-500 text-white flex items-center justify-center mr-3 font-medium text-sm">
                    {getUserAvatar() ? (
                      <Image
                        src={getUserAvatar()}
                        alt={getUserDisplayName()}
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      getUserInitials()
                    )}
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-gray-800">{getUserDisplayName()}</span>
                    <p className="text-xs text-gray-500 truncate max-w-[200px]">{user.email}</p>
                  </div>
                </button>
              ) : (
                <button
                  type="button"
                  className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition duration-150 w-full"
                  onClick={() => { setIsAuthModalOpen(true); setMobileMenuOpen(false); }}
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-blue-500 text-white flex items-center justify-center mr-3 font-medium text-sm">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-gray-800">Sign In</span>
                  </div>
                </button>
              )}

              <div className="store-dropdown">
                <button
                  onClick={() => setDropdownVisible(!dropdownVisible)}
                  className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition duration-150"
                >
                  <div className="flex items-center">
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-5 w-5 mr-3 text-gray-600" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" 
                      />
                    </svg>
                    <span className="font-medium text-gray-800">Select Store</span>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-4 w-4 transition-transform ${dropdownVisible ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {dropdownVisible && (
                  <ul className="mt-2 w-full bg-white border rounded-xl shadow-xl">
                    {stores.length > 0 ? (
                      stores.map((store) => (
                        <li
                          key={store.id}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition cursor-pointer border-b last:border-b-0"
                        >
                          <Link 
                            href={`/store/${store.id}`} 
                            onClick={() => {
                              setDropdownVisible(false);
                              setMobileMenuOpen(false);
                            }}
                            className="flex items-center gap-3 w-full text-gray-700"
                          >
                            <Image
                              src={store.main_image || '/store.png'}
                              alt={store.name}
                              width={32}
                              height={32}
                              className="rounded-lg object-cover border border-gray-200 bg-white"
                            />
                            <span className="font-medium text-base">{store.name}</span>
                          </Link>
                        </li>
                      ))
                    ) : (
                      <li className="px-4 py-2 text-gray-500">No stores available</li>
                    )}
                  </ul>
                )}
              </div>
              
              {/* Currency Selector - Mobile */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <div className="flex items-center mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121A3 3 0 1019 9m-7 7a7 7 0 117-7 7 7 0 01-7 7zm0 0H12m2.5-4.5v-.5a1.5 1.5 0 00-3 0M9 12.75l.75 1.5M15 12.75l-.75 1.5" />
                  </svg>
                  <div>
                    <span className="font-semibold text-gray-800">Currency</span>
                    <p className="text-xs text-gray-600">Choose your preferred currency</p>
                  </div>
                </div>
                <select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  {SUPPORTED_CURRENCIES.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency} ({CURRENCY_SYMBOLS[currency]})
                    </option>
                  ))}
                </select>
              </div>

              {/* Google Translate Widget - Mobile */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-800">Language Translate</span>
                    <p className="text-xs text-gray-600">Choose your preferred language</p>
                  </div>
                </div>
                <div id="google_translate_element_mobile" className="translate-widget-mobile"></div>
              </div>

              <Link 
                href="/cart" 
                className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition duration-150"
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className="relative mr-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-gray-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.4 5.6a1 1 0 001 1.4h12a1 1 0 001-1.4L17 13M7 13l-4-8"
                    />
                  </svg>
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-semibold rounded-full h-4 w-4 flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <span className="font-medium text-gray-800">Your Cart</span>
                  <p className="text-xs text-gray-500">
                    {cartCount === 0 ? "No items" : `${cartCount} item${cartCount !== 1 ? 's' : ''}`}
                  </p>
                </div>
              </Link>
            </div>
          </div>
        )}

        <div className="hidden lg:block relative store-dropdown">
          <button
            onClick={() => setDropdownVisible(!dropdownVisible)}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition duration-150"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 text-gray-600" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" 
              />
            </svg>
            <span>Select Store</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 transition-transform ${dropdownVisible ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {dropdownVisible && (
            <ul className="absolute mt-2 w-64 bg-white border rounded-xl shadow-xl z-10 py-1">
              {stores.length > 0 ? (
                stores.map((store) => (
                  <li
                    key={store.id}
                    className="hover:bg-gray-50 transition flex items-center gap-3 px-4 py-3 cursor-pointer border-b last:border-b-0"
                  >
                    <Link 
                      href={`/store/${store.id}`} 
                      onClick={() => setDropdownVisible(false)}
                      className="flex items-center gap-3 w-full text-gray-700"
                    >
                      <Image
                        src={store.main_image || '/store.png'}
                        alt={store.name}
                        width={36}
                        height={36}
                        className="rounded-lg object-cover border border-gray-200 bg-white"
                      />
                      <span className="font-medium text-base">{store.name}</span>
                    </Link>
                  </li>
                ))
              ) : (
                <li className="px-4 py-2 text-gray-500">No stores available</li>
              )}
            </ul>
          )}
        </div>

        <div className="hidden lg:block w-[500px] relative">
          <form className="relative" onSubmit={handleSearchSubmit}>
            <input
              type="text"
              placeholder="Search for grocery, meat and more..."
              className="w-full px-4 py-2.5 pl-11 rounded-xl bg-gray-100 border border-transparent focus:border-gray-300 focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 focus:outline-none transition-all duration-200"
              value={searchQuery}
              onChange={handleSearchChange}
              ref={searchInputRef}
              onBlur={handleSearchBlur}
              aria-label="Search products"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-gray-400 transition-colors duration-150 group-hover:text-gray-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            {loading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                </svg>
              </div>
            )}
          </form>
          {searchQuery && searchResults.length > 0 && (
            <div ref={searchResultsRef} className="absolute mt-2 w-full bg-white border rounded-lg shadow-lg z-10 max-h-80 overflow-y-auto">
              {searchResults.map((item) =>
                item._type === "product" ? (
                  <Link
                    href={`/products/${item.id}`}
                    key={`product-${item.id}`}
                    className="flex items-center px-4 py-2 hover:bg-gray-50"
                    onClick={() => setSearchQuery("")}
                  >
                    {item.image && (
                      <Image
                        src={item.image}
                        alt={item.name || 'Product Image'}
                        width={36}
                        height={36}
                        className="rounded mr-3 object-cover"
                        onError={() => console.error(`Failed to load image for product: ${item.name}`)}
                      />
                    )}
                    <div>
                      <p className="text-sm font-medium">{item.name || 'Unnamed Product'}</p>
                      {item.price && (
                        <p className="text-xs text-green-600">{item.currencySymbol}{item.price}</p>
                      )}
                    </div>
                  </Link>
                ) : (
                  <Link
                    href={`/categories/${item.id}`}
                    key={`category-${item.id}`}
                    className="flex items-center px-4 py-2 hover:bg-gray-50"
                    onClick={() => setSearchQuery("")}
                  >
                    <div>
                      <p className="text-sm font-medium text-blue-700">Category: {item.name}</p>
                    </div>
                  </Link>
                )
              )}
            </div>
          )}
          {searchQuery && !loading && searchResults.length === 0 && (
            <div className="absolute mt-2 w-full bg-white border rounded-lg shadow-lg z-10 max-h-80 overflow-y-auto px-4 py-2 text-gray-500">
              No results found
            </div>
          )}
        </div>

        {/* Currency Selector - Desktop */}
        <div className="hidden lg:block">
          <div className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition duration-150">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121A3 3 0 1019 9m-7 7a7 7 0 117-7 7 7 0 01-7 7zm0 0H12m2.5-4.5v-.5a1.5 1.5 0 00-3 0M9 12.75l.75 1.5M15 12.75l-.75 1.5" />
            </svg>
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {SUPPORTED_CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency} ({CURRENCY_SYMBOLS[currency]})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="hidden lg:block">
          <div className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition duration-150">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            <div id="google_translate_element" className="translate-widget"></div>
          </div>
        </div>

        <div className="hidden lg:flex items-center space-x-4">
          <button
            type="button"
            onClick={() => user ? setProfileSidebarOpen(true) : setIsAuthModalOpen(true)}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition duration-150"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden bg-blue-500 text-white flex items-center justify-center font-medium text-sm">
              {getUserAvatar() ? (
                <Image
                  src={getUserAvatar()}
                  alt={getUserDisplayName()}
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              ) : (
                getUserInitials()
              )}
            </div>
            <span className="text-sm font-medium">{getUserDisplayName()}</span>
          </button>
          <Link 
            href="/cart" 
            className="flex items-center space-x-3 px-4 py-2 rounded-lg hover:bg-gray-50 transition-all duration-200 group"
          >
            <div className="relative transform transition-transform duration-200 group-hover:scale-105">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-gray-600 group-hover:text-gray-800 transition-colors duration-200"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-md transform transition-transform duration-200 group-hover:scale-110">
                  {cartCount}
                </span>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors duration-200">Cart</span>
              {cartCount > 0 && (
                <span className="text-xs font-medium text-green-600 group-hover:text-green-700 transition-colors duration-200">
                  {cartCount} item{cartCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </Link>
        </div>
      </header>
    </>
  );
}
