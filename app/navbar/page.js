"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import debounce from "lodash.debounce";
import { createClient } from "@supabase/supabase-js";
import { ProfileSidebar } from "@/app/profile/page";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  const [products, setProducts] = useState([]);
  const searchInputRef = useRef();

  // Fetch user from Supabase auth
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };

    fetchUser();

    // Set up auth state change subscription
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

  // Fetch products for search directly from Supabase (not from /api/products)
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
          setProducts(productsData || []);
        }
      } catch (error) {
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

  // Load cart count from localStorage
  const getCartKey = useCallback(() => {
    if (user && user.id) {
      return `cart_${user.id}`;
    }
    return 'cart_guest';
  }, [user]);

  const loadCartCount = useCallback(() => {
    const cart = JSON.parse(localStorage.getItem(getCartKey()) || "[]");
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    setCartCount(count);
  }, [getCartKey]);

  useEffect(() => {
    loadCartCount();
    // Listen for cart updates via storage events
    const handleCartUpdate = () => {
      loadCartCount();
    };
    window.addEventListener("cartUpdated", handleCartUpdate);
    return () => {
      window.removeEventListener("cartUpdated", handleCartUpdate);
    };
  }, [loadCartCount]);

  const handleSearchBlur = () => {
    setTimeout(() => setSearchResults([]), 200);
  };

  // Debounced search function
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
          const productsData = await fetchData("products");
          const filteredProducts = productsData.filter((product) =>
            product.name.toLowerCase().includes(trimmedQuery)
          );
          setSearchResults(filteredProducts);
        } catch (error) {
          setSearchResults([]);
        } finally {
          setLoading(false);
        }
      }, 400),
    []
  );

  // Only search/filter products by name (case-insensitive, trimmed)
  useEffect(() => {
    const filtered = products.filter((product) =>
      product.name &&
      product.name.toLowerCase().trim().includes(searchQuery.toLowerCase().trim())
    );
    setSearchResults(filtered.map((p) => ({ ...p, _type: "product" })));
    setLoading(false);
  }, [searchQuery, products]);

  // Close dropdowns when clicking outside
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

  // Helper function to get username display text
  const getUserDisplayName = () => {
    if (!user) return "Sign In";
    return user.user_metadata?.full_name || user.email?.split('@')[0] || "Profile";
  };

  // Helper function to get user avatar URL
  const getUserAvatar = () => {
    if (!user) return null;
    
    // Check for Google avatar
    if (user.app_metadata?.provider === 'google') {
      return user.user_metadata?.avatar_url || user.user_metadata?.picture;
    }
    
    // Check for custom avatar in Supabase user metadata
    if (user.user_metadata?.avatar_url) {
      return user.user_metadata.avatar_url;
    }
    
    return null;
  };

  // Get user initials for avatar fallback
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
      {/* Profile Sidebar Overlay */}
      {profileSidebarOpen && (
        <ProfileSidebar onClose={() => setProfileSidebarOpen(false)} />
      )}
      <header className="fixed top-0 left-0 w-full z-50 flex flex-wrap justify-between items-center py-3 px-4 sm:px-6 bg-white text-gray-700 shadow">
        {/* Mobile Menu Button */}
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
        
        {/* Logo */}
        <Link href="/" className="flex items-center mx-auto lg:mx-0">
          <Image src="/logo.svg" alt="Logo" width={40} height={40} />
        </Link>

        {/* Mobile Search Button */}
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

        {/* Mobile Cart Icon */}
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

        {/* Mobile Search Bar (Conditional Render) */}
        {mobileSearchOpen && (
          <div className="w-full mt-3 order-last">
            <form className="relative" onSubmit={(e) => e.preventDefault()}>
              <input
                type="text"
                placeholder="Search for grocery, meat and more..."
                className="w-full px-4 py-2.5 pl-11 rounded-xl bg-gray-100 border border-transparent focus:border-gray-300 focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 focus:outline-none transition-all duration-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
              <div className="absolute left-0 right-0 mt-2 mx-4 bg-white border rounded shadow-lg z-20 max-h-80 overflow-y-auto">
                {searchResults.map((item) =>
                  item._type === "product" ? (
                    <Link
                      href={`/products/${item.id}`}
                      key={`product-${item.id}`}
                      className="flex items-center px-4 py-2 hover:bg-gray-100"
                      onClick={() => setSearchQuery("")}
                    >
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        {item.price && (
                          <p className="text-xs text-green-600">${item.price}</p>
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

        {/* Mobile Menu (Conditional Render) */}
        {mobileMenuOpen && (
          <div className="w-full order-last mt-3">
            <div className="bg-white border rounded-lg shadow-lg p-4 space-y-4">
              {/* User Profile or Sign In in Mobile Menu */}
              {user ? (
                <Link
                  href="/profile"
                  className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition duration-150"
                  onClick={() => setMobileMenuOpen(false)}
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
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition duration-150"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-blue-500 text-white flex items-center justify-center mr-3 font-medium text-sm">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-gray-800">Sign In</span>
                  </div>
                </Link>
              )}

              {/* Store Dropdown in Mobile Menu */}
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
                  <ul className="mt-2 w-full bg-white border rounded-lg shadow-inner">
                    {stores.length > 0 ? (
                      stores.map((store) => (
                        <li
                          key={store.id}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                        >
                          <Link 
                            href={`/store/${store.id}`} 
                            onClick={() => {
                              setDropdownVisible(false);
                              setMobileMenuOpen(false);
                            }}
                            className="block w-full text-gray-700"
                          >
                            {store.name}
                          </Link>
                        </li>
                      ))
                    ) : (
                      <li className="px-4 py-2 text-gray-500">No stores available</li>
                    )}
                  </ul>
                )}
              </div>
              
              {/* Cart Link in Mobile Menu */}
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
        )}        {/* Desktop Store Dropdown */}
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
          <ul className="absolute mt-2 w-64 bg-white border rounded-lg shadow-lg z-10 py-1">
            {stores.length > 0 ? (
              stores.map((store) => (
                <li
                  key={store.id}
                  className="hover:bg-gray-50"
                >
                  <Link 
                    href={`/store/${store.id}`} 
                    onClick={() => setDropdownVisible(false)}
                    className="block px-4 py-2 text-gray-700"
                  >
                    {store.name}
                  </Link>
                </li>
              ))
            ) : (
              <li className="px-4 py-2 text-gray-500">No stores available</li>
            )}          </ul>
        )}
      </div>
      {/* Desktop Search Bar */}
      <div className="hidden lg:block w-[500px] relative">
          <form className="relative" onSubmit={(e) => e.preventDefault()}>
            <input
              type="text"
              placeholder="Search for grocery, meat and more..."
              className="w-full px-4 py-2.5 pl-11 rounded-xl bg-gray-100 border border-transparent focus:border-gray-300 focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 focus:outline-none transition-all duration-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
            <div className="absolute mt-2 w-full bg-white border rounded-lg shadow-lg z-10 max-h-80 overflow-y-auto">
              {searchResults.map((item) =>
                item._type === "product" ? (
                  <Link
                    href={`/products/${item.id}`}
                    key={`product-${item.id}`}
                    className="flex items-center px-4 py-2 hover:bg-gray-50"
                    onClick={() => setSearchQuery("")}
                  >
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      {item.price && (
                        <p className="text-xs text-green-600 font-medium">${item.price}</p>
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

        {/* Desktop User and Cart Icons */}
        <div className="hidden lg:flex items-center space-x-4">
          {/* User Profile Dropdown */}
          <div className="relative user-dropdown">
            <button 
              onClick={() => setUserDropdownVisible(!userDropdownVisible)}
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-4 w-4 transition-transform ${userDropdownVisible ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {userDropdownVisible && user && (
              <div className="absolute right-0 mt-2 w-64 bg-white border rounded-lg shadow-lg z-10 overflow-hidden">
                <div className="px-4 py-3 border-b bg-gray-50">
                  <p className="text-sm font-semibold text-gray-800">{getUserDisplayName()}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
                <div className="py-1">
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => {
                      setProfileSidebarOpen(true);
                      setUserDropdownVisible(false);
                    }}
                  >
                    Your Profile
                  </button>
                  <Link 
                    href="/orders" 
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setUserDropdownVisible(false)}
                  >
                    Your Orders
                  </Link>
                  <button 
                    onClick={async () => {
                      await supabase.auth.signOut();
                      setUserDropdownVisible(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}
            
            {userDropdownVisible && !user && (
              <div className="absolute right-0 mt-2 w-64 bg-white border rounded-lg shadow-lg z-10 overflow-hidden">
                <div className="py-1">
                  <Link 
                    href="/login" 
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setUserDropdownVisible(false)}
                  >
                    Sign In
                  </Link>
                  <Link 
                    href="/signup" 
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setUserDropdownVisible(false)}
                  >
                    Create Account
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Cart Link */}
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