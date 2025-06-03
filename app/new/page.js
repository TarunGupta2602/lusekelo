'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image' // Add this import
import { createClient } from '@supabase/supabase-js';

// Move this constant outside the component
const defaultCategoryNames = ["Food & Drinks", "Household Essentials", "Beauty & Personal Care"]

// Skeleton loader for category
const CategorySkeleton = () => (
  <div className="mb-12 bg-white rounded-xl shadow-sm p-6">
    <div className="flex justify-between items-center mb-6">
      <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
      <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-4 animate-pulse"></div>
          <div className="h-32 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
      ))}
    </div>
  </div>
)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function NewPage() {
  const [electronics, setElectronics] = useState([])
  const [breakfast, setBreakfast] = useState([])
  const [loading, setLoading] = useState(true)
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [productsLoading, setProductsLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [expandedSections, setExpandedSections] = useState({});
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [cartMessage, setCartMessage] = useState("");
  const [user, setUser] = useState(null);
  const [scrollTimeouts, setScrollTimeouts] = useState({});

  // Normalize image paths
  const normalizeImagePath = (path) => {
    if (!path) return ''
    return path.replace(/^(\.\.\/)+assets\//, '/')
  }

  // Fetch categories with optimized loading
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true)
        const res = await fetch('/api/categories')
        const data = await res.json()
        if (data.error) {
          throw new Error(data.error)
        }
        
        // Sort to prioritize our default categories
        const sortedCategories = [...data].sort((a, b) => {
          const aIndex = defaultCategoryNames.indexOf(a.name)
          const bIndex = defaultCategoryNames.indexOf(b.name)
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
          if (aIndex !== -1) return -1
          if (bIndex !== -1) return 1
          return 0
        })
        
        setCategories(sortedCategories)
      } catch (err) {
        console.error('Failed to fetch categories:', err)
      } finally {
        setCategoriesLoading(false)
        setLoading(false)
      }
    }
    fetchCategories()
  }, []) // Removed defaultCategoryNames from dependency array

  // Fetch products with optimized loading
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setProductsLoading(true)
        const res = await fetch('/api/products')
        const productsData = await res.json()
        const electronicsProducts = productsData.filter(product => product.categoryid === 1)
        const breakfastProducts = productsData.filter(product => product.categoryid === 2)
        setElectronics(electronicsProducts)
        setBreakfast(breakfastProducts)
      } catch (err) {
        console.error('Failed to fetch products:', err)
      } finally {
        setProductsLoading(false)
        setLoading(false)
      }
    }
    fetchProducts()
  }, [])
  // Fetch user for cart key
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

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(scrollTimeouts).forEach(timeout => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, [scrollTimeouts]);
  // Toggle section expansion with auto-hide functionality
  const toggleSection = (categoryId) => {
    setExpandedSections(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
    
    // Clear existing timeout for this category
    if (scrollTimeouts[categoryId]) {
      clearTimeout(scrollTimeouts[categoryId]);
    }
  };

  // Auto-hide functionality - restore the "See All" button after inactivity
  const handleScrollStart = (categoryId) => {
    // Clear existing timeout
    if (scrollTimeouts[categoryId]) {
      clearTimeout(scrollTimeouts[categoryId]);
    }
  };

  const handleScrollEnd = (categoryId) => {
    // Set timeout to restore the "See All" button after 3 seconds of inactivity
    const timeout = setTimeout(() => {
      setExpandedSections(prev => ({
        ...prev,
        [categoryId]: false
      }));
      setScrollTimeouts(prev => {
        const newTimeouts = { ...prev };
        delete newTimeouts[categoryId];
        return newTimeouts;
      });
    }, 3000);
    
    setScrollTimeouts(prev => ({
      ...prev,
      [categoryId]: timeout
    }));
  };

  // Define CSS styles
  const style = `
    .no-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .no-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    .category-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1rem;
    }
    @media (max-width: 768px) {
      .category-grid {
        grid-template-columns: 1fr;
        gap: 0.75rem;
      }
    }
    @media (min-width: 769px) and (max-width: 1024px) {
      .category-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    .category-grid-with-button {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1rem;
      align-items: stretch;
    }
    @media (max-width: 768px) {
      .category-grid-with-button {
        grid-template-columns: 1fr;
        gap: 0.75rem;
      }
    }
    @media (min-width: 769px) and (max-width: 1024px) {
      .category-grid-with-button {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    @media (min-width: 1025px) {
      .category-grid-with-button {
        grid-template-columns: repeat(4, 1fr) auto;
      }
    }
    .category-expanded {
      display: flex;
      overflow-x: auto;
      gap: 1rem;
      scroll-behavior: smooth;
      padding: 0.5rem 0 1rem 0;
      scrollbar-width: thin;
      scrollbar-color: #cbd5e0 transparent;
    }
    @media (max-width: 768px) {
      .category-expanded {
        gap: 0.75rem;
        padding: 0.25rem 0 0.75rem 0;
      }
    }
    .category-expanded::-webkit-scrollbar {
      height: 8px;
    }
    .category-expanded::-webkit-scrollbar-track {
      background: #f1f5f9;
      border-radius: 4px;
    }
    .category-expanded::-webkit-scrollbar-thumb {
      background: #cbd5e0;
      border-radius: 4px;
    }
    .category-expanded::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
    }
    .see-all-button {
      flex: 0 0 auto;
      width: 240px;
      min-width: 240px;
      max-width: 240px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      min-height: 180px;
      border: none;
      cursor: pointer;
      border-radius: 1.5rem;
      padding: 1rem;
      transition: all 0.2s ease-in-out;
    }
    @media (max-width: 768px) {
      .see-all-button {
        width: 200px;
        min-width: 200px;
        max-width: 200px;
        min-height: 160px;
        gap: 0.75rem;
        padding: 0.75rem;
        border-radius: 1rem;
      }
    }
    .see-all-button.green-bg {
      background-color: #BBEB6D;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    }
    .see-all-button.green-bg:hover {
      transform: scale(1.05);
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    }
    .see-all-button.transparent-bg {
      background: none;
    }
    .see-all-button.transparent-bg:hover {
      transform: scale(1.05);
    }
    .category-transition {
      transition: all 0.3s ease-in-out;
    }
    .category-card {
      height: 100%;
      transition: transform 0.2s ease-in-out;
    }
    .category-card:hover {
      transform: translateY(-4px);
    }
    @media (max-width: 768px) {
      .category-card:hover {
        transform: translateY(-2px);
      }
    }
    .product-scroll {
      scroll-behavior: smooth;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      -ms-overflow-style: none;
      padding: 0.5rem;
    }
    .product-scroll::-webkit-scrollbar {
      display: none;
    }
    .product-card {
      flex: 0 0 auto;
      width: 240px;
      scroll-snap-align: start;
    }
    @media (max-width: 768px) {
      .product-card {
        width: 200px;
      }
    }
    .scroll-container {
      scroll-snap-type: x mandatory;
      scroll-padding: 1rem;
    }
    .skeleton-pulse {
      animation: pulse 1.5s ease-in-out 0.5s infinite;
    }
    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }
  `

  // Skeleton loader for product section
  const ProductSectionSkeleton = () => (
    <div className="mb-12">
      <div className="flex justify-between items-center mb-6">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
      </div>
      <div className="flex space-x-4 overflow-x-auto pb-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-none w-64 bg-white rounded-xl shadow-sm p-4">
            <div className="mb-4 h-48 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse"></div>
          </div>
        ))}
      </div>
    </div>
  )

  const getCartKey = () => {
    if (user && user.id) {
      return `cart_${user.id}`;
    }
    return 'cart_guest';
  };

  const handleAddToCart = (productToAdd, quantityDelta = 1) => {
    if (!productToAdd) return;

    const cartKey = getCartKey();
    let cart = JSON.parse(localStorage.getItem(cartKey)) || [];
    const existingItemIndex = cart.findIndex((item) => item.product_id === productToAdd.id);

    if (existingItemIndex > -1) {
      cart[existingItemIndex].quantity += quantityDelta;
      if (cart[existingItemIndex].quantity <= 0) {
        cart.splice(existingItemIndex, 1); // Remove item if quantity is 0 or less
      }
    } else if (quantityDelta > 0) { // Only add if not existing and quantityDelta is positive
      cart.push({
        product_id: productToAdd.id,
        quantity: quantityDelta,
        name: productToAdd.name,
        price: productToAdd.price,
        image: productToAdd.image,
      });
    }

    localStorage.setItem(cartKey, JSON.stringify(cart));
    window.dispatchEvent(new Event("cartUpdated"));

    if (cart.length === 0 && existingItemIndex > -1 && quantityDelta < 0) {
        setCartMessage("Product removed from cart!");
    } else if (quantityDelta < 0 && existingItemIndex > -1 && cart.find(item => item.product_id === productToAdd.id)) {
        setCartMessage("Product quantity decreased!");
    } else if (quantityDelta < 0 && existingItemIndex > -1) {
        setCartMessage("Product removed from cart!");
    }
     else if (quantityDelta > 0 && existingItemIndex > -1) {
        setCartMessage("Product quantity increased!");
    } else if (quantityDelta > 0) {
        setCartMessage("Product added to cart!");
    }
    setTimeout(() => setCartMessage(""), 2000);
  };  // Enhanced Category Card with title and desc on left, image on right
  const CategoryCard = ({ childCategory }) => (
    <Link
      key={childCategory.id}
      href={`/new/${childCategory.id}`}
      className="category-card bg-white border border-white rounded-2xl hover:scale-[1.02] transition-all duration-200 flex items-center group p-4 sm:p-6 min-h-[160px] sm:min-h-[180px] relative overflow-hidden"
    >
      <div className="flex items-center w-full h-full">
        {/* Text content on the left */}
        <div className="flex-1 pr-4 sm:pr-6">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2 group-hover:text-green-700 transition-colors line-clamp-2">{childCategory.name}</h3>
          <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 sm:line-clamp-3">{childCategory.description}</p>
        </div>
        
        {/* Image on the right */}
        <div className="flex-shrink-0 w-24 h-24 sm:w-32 sm:h-32">
          {childCategory.image ? (
            <Image
              src={normalizeImagePath(childCategory.image)}
              alt={childCategory.name}
              width={128}
              height={128}
              className="object-contain w-full h-full rounded-xl bg-gray-50 group-hover:scale-105 transition-transform duration-200"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-xl">
              <span className="text-gray-400 text-xs">No image</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );

  // Enhanced Product Card for product sections
  const ProductCard = ({ product }) => {
    const getInitialQuantity = () => {
      if (typeof window === 'undefined') return 0; // Guard for SSR or pre-hydration
      const cartKey = getCartKey(); // Uses getCartKey from NewPage's scope
      const cart = JSON.parse(localStorage.getItem(cartKey)) || [];
      const itemInCart = cart.find(item => item.product_id === product.id);
      return itemInCart ? itemInCart.quantity : 0;
    };

    const [quantityInCart, setQuantityInCart] = useState(getInitialQuantity());

    useEffect(() => {
      const updateQuantityDisplay = () => {
        if (typeof window === 'undefined') return;
        const cartKey = getCartKey();
        const cart = JSON.parse(localStorage.getItem(cartKey)) || [];
        const itemInCart = cart.find(item => item.product_id === product.id);
        setQuantityInCart(itemInCart ? itemInCart.quantity : 0);
      };

      updateQuantityDisplay();

      window.addEventListener('cartUpdated', updateQuantityDisplay);
      return () => {
        window.removeEventListener('cartUpdated', updateQuantityDisplay);
      };
    }, [product.id]); // removed 'user'

    const handleIncrement = (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleAddToCart(product, 1); // Uses handleAddToCart from NewPage's scope
    };

    const handleDecrement = (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleAddToCart(product, -1); // Uses handleAddToCart from NewPage's scope
    };

    return (
      <Link href={`/products/${product.id}`} key={product.id}>
        <div className="product-card bg-white rounded-2xl p-5 shadow-lg hover:shadow-xl transition-shadow duration-300 w-full h-[380px] flex flex-col">
          {/* Product Image - Fixed height */}
          <div className="bg-gray-50 rounded-xl p-4 mb-3 flex items-center justify-center h-[160px] flex-shrink-0">
            {product.image ? (
              <Image
                src={normalizeImagePath(product.image)}
                alt={product.name}
                width={140}
                height={140}
                className="object-contain w-full h-full group-hover:scale-105 transition-transform duration-200"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-gray-400">No image</span>
              </div>
            )}
          </div>
          
          {/* Product Info - Flexible content area */}
          <div className="flex flex-col flex-grow">
            {/* Title - Fixed height */}
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 h-[2.8rem] mb-2">
              {product.name}
            </h3>
            
            {/* Description - Fixed height */}
            <p className="text-gray-400 text-sm line-clamp-3 h-[3.5rem] mb-3">
              {product.description || "No description available"}
            </p>
            
            {/* Price Section - Fixed at bottom */}
            <div className="flex items-center justify-between mt-auto">
              <div className="flex-1">
                <div className="text-xl font-bold text-gray-900">
                  ${product.price}
                </div>
                {product.quantity && (
                  <p className="text-gray-400 text-xs mt-0.5">
                    Qty: {product.quantity}
                  </p>
                )}
              </div>
              
              {/* Add Button / Quantity Selector Wrapper */}
              <div className="flex-shrink-0 ml-2 sm:ml-3 h-9 w-24 sm:w-28 relative"> {/* Responsive width wrapper */}
                {/* Initial Add Button */}
                <button 
                  className={`absolute inset-0 bg-gray-300 hover:bg-gray-400 transition-all duration-300 ease-in-out rounded-lg flex items-center justify-center group ${
                    quantityInCart === 0 ? 'opacity-100 transform scale-100 pointer-events-auto' : 'opacity-0 transform scale-90 pointer-events-none'
                  }`}
                  onClick={handleIncrement}
                  title="Add to cart"
                  // Ensure button is not focusable when hidden for accessibility
                  tabIndex={quantityInCart === 0 ? 0 : -1}
                >
                  <svg 
                    width="18" 
                    height="18" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    className="text-gray-600 group-hover:text-gray-700"
                  >
                    <path 
                      d="M12 5V19M5 12H19" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {/* Quantity Selector */}
                <div
                  className={`absolute inset-0 flex items-center justify-around rounded-lg transition-all duration-300 ease-in-out ${
                    quantityInCart > 0 ? 'opacity-100 transform scale-100 pointer-events-auto' : 'opacity-0 transform scale-90 pointer-events-none'
                  }`}
                  // Prevent tabbing to hidden controls
                  aria-hidden={quantityInCart === 0}
                >
                  <button 
                    onClick={handleDecrement}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md w-8 sm:w-9 h-full flex items-center justify-center transition-colors" // Responsive width
                    title="Decrease quantity"
                    tabIndex={quantityInCart > 0 ? 0 : -1}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  </button>
                  <span className="text-sm sm:text-base font-medium text-gray-800 w-7 sm:w-8 h-full flex items-center justify-center select-none"> {/* Responsive width and text size */}
                    {quantityInCart}
                  </span>
                  <button 
                    onClick={handleIncrement}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md w-8 sm:w-9 h-full flex items-center justify-center transition-colors" // Responsive width
                    title="Increase quantity"
                    tabIndex={quantityInCart > 0 ? 0 : -1}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="ml-5 mr-5 ">
      <style dangerouslySetInnerHTML={{ __html: style }} />
      
      {/* Categories Section */}
      <div className="mb-12">
        {categoriesLoading ? (
          <>
            <CategorySkeleton />
            <CategorySkeleton />
            <CategorySkeleton />
          </>
        ) : categories.length ? (
          <>            {/* Display only the three default categories when not showing all */}
            {(showAllCategories ? categories : categories.filter(cat => defaultCategoryNames.includes(cat.name)))
              .filter(cat => cat.children && cat.children.length > 0)
              .map((parentCategory) => (
                <div key={parentCategory.id} className="mb-8 sm:mb-12">
                  <div className="flex justify-between items-center mb-4 sm:mb-6 px-2 sm:px-0">
                    <h2 className="text-lg sm:text-xl md:text-2xl font-extrabold text-[#373737] tracking-tight">{parentCategory.name}</h2>
                  </div>
                  
                  {expandedSections[parentCategory.id] ? (
                    // Expanded view - horizontal scroll with all items and proper container
                    <div className="relative px-2 sm:px-0">
                      <div 
                        className="category-expanded"
                        onScroll={(e) => {
                          handleScrollStart(parentCategory.id);
                          
                          // Clear timeout and set new one on scroll end
                          clearTimeout(e.target.scrollTimeout);
                          e.target.scrollTimeout = setTimeout(() => {
                            handleScrollEnd(parentCategory.id);
                          }, 150);
                        }}
                        onMouseEnter={() => handleScrollStart(parentCategory.id)}
                        onMouseLeave={() => handleScrollEnd(parentCategory.id)}
                        onFocus={() => handleScrollStart(parentCategory.id)}
                        onBlur={() => handleScrollEnd(parentCategory.id)}
                      >
                        {parentCategory.children.map((childCategory) => (
                          <div key={childCategory.id} className="flex-shrink-0" style={{ minWidth: window.innerWidth < 768 ? '200px' : '240px' }}>
                            <CategoryCard childCategory={childCategory} />
                          </div>
                        ))}
                        {/* Arrow button for navigation back */}
                        <button 
                          onClick={() => toggleSection(parentCategory.id)}
                          className="see-all-button transparent-bg"
                        >
                          {/* White circle with back arrow */}
                          <div className="bg-white rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shadow-md">
                            <svg 
                              width="16" 
                              height="16" 
                              viewBox="0 0 24 24" 
                              fill="none" 
                              className="text-black sm:w-5 sm:h-5"
                            >
                              <path 
                                d="M19 5L5 19M5 19H16M5 19V8" 
                                stroke="currentColor" 
                                strokeWidth="2.5" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>
                          
                          {/* Back text */}
                          <span className="text-black text-xs sm:text-sm font-medium">
                            Back
                          </span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Grid view - responsive grid + see all button
                    <div className="px-2 sm:px-0">
                      <div className={parentCategory.children.length > 4 ? "category-grid-with-button" : "category-grid"}>
                        {parentCategory.children
                          .slice(0, window.innerWidth < 768 ? 3 : 4)
                          .map((childCategory) => (
                            <CategoryCard key={childCategory.id} childCategory={childCategory} />
                          ))}
                        
                        {/* See All Button - responsive positioning */}
                        {parentCategory.children.length > (window.innerWidth < 768 ? 3 : 4) && (
                          <div className="lg:contents">
                            <button 
                              onClick={() => toggleSection(parentCategory.id)}
                              className="see-all-button green-bg w-full lg:w-auto mt-4 lg:mt-0 mx-auto lg:mx-0"
                            >
                              {/* White circle with arrow */}
                              <div className="bg-white rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shadow-md">
                                <svg 
                                  width="16" 
                                  height="16" 
                                  viewBox="0 0 24 24" 
                                  fill="none" 
                                  className="text-black sm:w-5 sm:h-5"
                                >
                                  <path 
                                    d="M5 19L19 5M19 5H8M19 5V16" 
                                    stroke="currentColor" 
                                    strokeWidth="2.5" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </div>
                              
                              {/* See all text */}
                              <span className="text-black text-xs sm:text-sm font-medium">
                                See all
                              </span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            
            {/* Single "Explore All Categories" button - responsive */}
            <div className="flex items-center justify-center w-full px-4 sm:px-0">
              <button 
                className="w-full max-w-xs sm:max-w-sm py-3 sm:py-4 mt-6 sm:mt-8 text-base sm:text-lg text-center bg-[#BBEB6D] text-black rounded-xl sm:rounded-2xl font-bold hover:from-green-500 hover:to-green-700 hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-green-200"
                onClick={() => setShowAllCategories(!showAllCategories)}
              >
                {showAllCategories ? (
                  <>
                    Show Fewer Categories
                  </>
                ) : (
                  <>
                    Explore All Categories
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="h-64 flex items-center justify-center">
            <p className="text-gray-500">No categories found.</p>
          </div>
        )}
      </div>

      {/* Banner */}
      <div className="flex flex-col md:flex-row justify-between mx-auto w-full bg-[#013033] rounded-xl py-10 px-6 mb-12">
        <div className="flex flex-col my-auto space-y-6 md:w-1/2">
          <h3 className="text-white text-4xl font-bold">
            Smoke Corner
          </h3>
          <p className="text-gray-300 font-thin text-md">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.
          </p>
          <div className="px-8 py-3 w-fit rounded-lg bg-[#BBEB6D] shadow-lg text-black text-center hover:bg-[#a5d55f] transition-colors cursor-pointer">
            <h3 className="text-md font-medium">
              Shop Now
            </h3>
          </div>
        </div>

        <div className="mt-6 md:mt-0 flex justify-center md:justify-end md:w-1/2">
          <Image
            src="/Marlboro.svg"
            alt="smoke corner"
            width={450}
            height={300}
            className="w-full max-w-[450px]"
            priority
          />
        </div>
      </div>

      {/* Products Sections */}
      <div>
        {/* Electronics Products */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Electronics Essentials</h2>
            <Link href="/electronics" className="text-[#013033] hover:text-green-700 font-medium flex items-center">
              View All
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
          <div className="relative">
            {productsLoading ? (
              <div className="flex space-x-4 overflow-x-auto pb-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex-none w-64 bg-white rounded-2xl shadow-lg p-4 border border-gray-100">
                    <div className="mb-4 h-48 bg-gray-200 rounded-xl skeleton-pulse"></div>
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-2 skeleton-pulse"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/4 skeleton-pulse"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto scroll-container product-scroll">
                <div className="flex space-x-6 pb-4">
                  {electronics.length ? (
                    electronics.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))
                  ) : (
                    <p className="text-gray-500 p-4">No Electronics products found.</p>
                  )}
                </div>
              </div>
            )}
     
          </div>
        </section>

        {/* Breakfast Products */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Breakfast Essentials</h2>
            <Link href="/breakfast" className="text-[#013033] hover:text-green-700 font-medium flex items-center">
              View All
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
          <div className="relative">
            {productsLoading ? (
              <div className="flex space-x-4 overflow-x-auto pb-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex-none w-64 bg-white rounded-2xl shadow-lg p-4 border border-gray-100">
                    <div className="mb-4 h-48 bg-gray-200 rounded-xl skeleton-pulse"></div>
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-2 skeleton-pulse"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/4 skeleton-pulse"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto scroll-container product-scroll">
                <div className="flex space-x-6 pb-4">
                  {breakfast.length ? (
                    breakfast.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))
                  ) : (
                    <p className="text-gray-500 p-4">No Breakfast products found.</p>
                  )}
                </div>
              </div>
            )}

          </div>
        </section>
      </div>

      {/* Show cart message */}
      {cartMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-2 rounded-lg shadow-lg z-50">
          {cartMessage}
        </div>
      )}
    </div>
  )
}