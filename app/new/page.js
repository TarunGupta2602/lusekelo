'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@supabase/supabase-js';
import { debounce } from 'lodash';
import React from 'react';

// Move this constant outside the component
const defaultCategoryNames = ["Food & Drinks", "Household Essentials", "Beauty & Personal Care"]

// Normalize image paths
const normalizeImagePath = (path) => {
  if (!path) return '/default-image.jpg';
  const imagePath = Array.isArray(path) ? (path[0] || '/default-image.jpg') : path;
  return imagePath.replace(/^(\.\.\/)+assets\//, '/');
};

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
);
CategorySkeleton.displayName = 'CategorySkeleton';
const MemoizedCategorySkeleton = React.memo(CategorySkeleton);

// Skeleton loader for subcategory modal
const SubcategorySkeleton = () => (
  <div className="bg-white rounded-xl border border-gray-100 p-4">
    <div className="h-6 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
    <div className="h-4 bg-gray-200 rounded w-full mb-2 animate-pulse"></div>
    <div className="h-4 bg-gray-200 rounded w-2/3 mb-4 animate-pulse"></div>
    <div className="h-32 bg-gray-200 rounded-lg animate-pulse"></div>
  </div>
);
SubcategorySkeleton.displayName = 'SubcategorySkeleton';
const MemoizedSubcategorySkeleton = React.memo(SubcategorySkeleton);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const ProductCard = React.memo(({ product, cart, handleAddToCart }) => {
  const quantityInCart = cart.find((item) => item.itemId === `${product.id}`)?.quantity || 0;

  const handleIncrement = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleAddToCart(product, 1);
  };

  const handleDecrement = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleAddToCart(product, -1);
  };

  return (
    <Link href={`/products/${product.id}`} key={product.id}>
      <div className="product-card bg-white rounded-2xl p-5 shadow-lg hover:shadow-xl transition-shadow duration-300 w-full h-[380px] flex flex-col">
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
        <div className="flex flex-col flex-grow">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 h-[2.8rem] mb-2">
            {product.name}
          </h3>
          <p className="text-gray-400 text-sm line-clamp-3 h-[3.5rem] mb-3">
            {product.description || 'No description available'}
          </p>
          <div className="flex items-center justify-between mt-auto">
            <div className="flex-1">
              <div className="text-xl font-bold text-gray-900">${product.price}</div>
              {product.quantity && (
                <p className="text-gray-400 text-xs mt-0.5">Qty: {product.quantity}</p>
              )}
            </div>
            <div className="flex-shrink-0 ml-2 sm:ml-3 h-9 w-24 sm:w-28 relative">
              <button
                className={`absolute inset-0 bg-gray-300 hover:bg-gray-400 transition-all duration-300 ease-in-out rounded-lg flex items-center justify-center group ${
                  quantityInCart === 0
                    ? 'opacity-100 transform scale-100 pointer-events-auto'
                    : 'opacity-0 transform scale-90 pointer-events-none'
                }`}
                onClick={handleIncrement}
                title="Add to cart"
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
              <div
                className={`absolute inset-0 flex items-center justify-around rounded-lg transition-all duration-300 ease-in-out ${
                  quantityInCart > 0
                    ? 'opacity-100 transform scale-100 pointer-events-auto'
                    : 'opacity-0 transform scale-90 pointer-events-none'
                }`}
                aria-hidden={quantityInCart === 0}
              >
                <button
                  onClick={handleDecrement}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md w-8 sm:w-9 h-full flex items-center justify-center transition-colors"
                  title="Decrease quantity"
                  tabIndex={quantityInCart > 0 ? 0 : -1}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
                <span className="text-sm sm:text-base font-medium text-gray-800 w-7 sm:w-8 h-full flex items-center justify-center select-none">
                  {quantityInCart}
                </span>
                <button
                  onClick={handleIncrement}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md w-8 sm:w-9 h-full flex items-center justify-center transition-colors"
                  title="Increase quantity"
                  tabIndex={quantityInCart > 0 ? 0 : -1}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
});
ProductCard.displayName = 'ProductCard'; // Added displayName

const CategoryCard = React.memo(({ childCategory }) => (
  <Link
    key={childCategory.id}
    href={`/new/${childCategory.id}`}
    className="category-card bg-white border border-white rounded-2xl hover:scale-[1.02] transition-all duration-200 flex items-center group p-4 sm:p-6 min-h-[160px] sm:min-h-[180px] relative overflow-hidden"
  >
    <div className="flex items-center w-full h-full">
      <div className="flex-1 pr-4 sm:pr-6">
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2 group-hover:text-green-700 transition-colors line-clamp-2">
          {childCategory.name}
        </h3>
        <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 sm:line-clamp-3">
          {childCategory.description}
        </p>
      </div>
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
));
CategoryCard.displayName = 'CategoryCard'; // Added displayName

export default function NewPage() {
  const [electronics, setElectronics] = useState([])
  const [breakfast, setBreakfast] = useState([])
  const [loading, setLoading] = useState(true)
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [productsLoading, setProductsLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [cartMessage, setCartMessage] = useState("");
  const [user, setUser] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cart, setCart] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setCategoriesLoading(true)
        setProductsLoading(true)

        const [categoriesRes, productsRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/products')
        ])

        const categoriesData = await categoriesRes.json()
        const productsData = await productsRes.json()

        if (categoriesData.error) {
          throw new Error(categoriesData.error)
        }
        
        if (productsData.error) {
          throw new Error(productsData.error)
        }
        
        // Sort to prioritize our default categories
        const sortedCategories = [...categoriesData].sort((a, b) => {
          const aIndex = defaultCategoryNames.indexOf(a.name)
          const bIndex = defaultCategoryNames.indexOf(b.name)
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
          if (aIndex !== -1) return -1
          if (bIndex !== -1) return 1
          return 0
        })
        
        setCategories(sortedCategories)
        setElectronics(productsData.filter(product => product.categoryid === 1))
        setBreakfast(productsData.filter(product => product.categoryid === 2))
      } catch (err) {
        console.error('Failed to fetch data:', err)
      } finally {
        setCategoriesLoading(false)
        setProductsLoading(false)
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    const fetchUserAndCart = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data && data.user) {
        setUser(data.user);
        const { data: cartData, error: cartError } = await supabase
          .from('carts')
          .select('store_carts')
          .eq('user_id', data.user.id)
          .single();
        if (!cartError && cartData?.store_carts) {
          setCart(cartData.store_carts);
        }
      } else {
        setUser(null);
        setCart(JSON.parse(localStorage.getItem('cart_guest') || '[]'));
      }
      setLoading(false);
    };
    fetchUserAndCart();
  }, []);

  const debouncedUpdateCart = useMemo(
    () =>
      debounce(async (newCart, userId) => {
        if (!userId) {
          localStorage.setItem('cart_guest', JSON.stringify(newCart));
          return;
        }
        const { error } = await supabase
          .from('carts')
          .upsert(
            {
              user_id: userId,
              store_carts: newCart,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );
        if (error) {
          console.error('Error updating cart:', error);
          setCartMessage("Failed to update cart.");
          setTimeout(() => setCartMessage(""), 2000);
        }
      }, 300),
    []
  );

  const updateCartInSupabase = useCallback(
    (newCart, userId) => debouncedUpdateCart(newCart, userId),
    [debouncedUpdateCart]
  );

  const handleAddToCart = async (productToAdd, quantityDelta = 1) => {
    if (!productToAdd || !productToAdd.id) {
      setCartMessage("Invalid product data.");
      setTimeout(() => setCartMessage(""), 2000);
      return;
    }

    try {
      setCart((prevCart) => {
        const newCart = [...prevCart];
        const itemId = `${productToAdd.id}`;
        const existingItemIndex = newCart.findIndex((item) => item.itemId === itemId);

        if (existingItemIndex > -1) {
          newCart[existingItemIndex].quantity += quantityDelta;
          if (newCart[existingItemIndex].quantity <= 0) {
            newCart.splice(existingItemIndex, 1);
            setCartMessage("Product removed from cart!");
          } else {
            setCartMessage(quantityDelta > 0 ? "Product quantity increased!" : "Product quantity decreased!");
          }
        } else if (quantityDelta > 0) {
          newCart.push({
            itemId: itemId,
            product_id: productToAdd.id,
            quantity: quantityDelta,
            name: productToAdd.name,
            price: productToAdd.price,
            image: productToAdd.image,
          });
          setCartMessage("Product added to cart!");
        }

        if (!user) {
          localStorage.setItem('cart_guest', JSON.stringify(newCart));
        }

        window.dispatchEvent(new Event("cartUpdated"));

        if (user) {
          updateCartInSupabase(newCart, user.id);
        }

        setTimeout(() => setCartMessage(""), 2000);
        return newCart;
      });
    } catch (error) {
      console.error('Error in handleAddToCart:', error);
      setCartMessage("An error occurred while updating cart.");
      setTimeout(() => setCartMessage(""), 2000);
    }
  };

  // Handle opening/closing subcategory modal
  const openSubcategoryModal = (category) => {
    setSelectedCategory(category);
  };

  const closeSubcategoryModal = () => {
    setSelectedCategory(null);
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
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      overflow-y: auto;
    }
    .modal-content {
      background: white;
      width: 100%;
      max-width: 100%;
      height: 100%;
      padding: 1rem;
      position: relative;
      overflow-y: auto;
    }
    .subcategory-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1rem;
    }
    @media (max-width: 768px) {
      .subcategory-grid {
        grid-template-columns: 1fr;
        gap: 0.75rem;
      }
    }
    @media (min-width: 769px) and (max-width: 1024px) {
      .subcategory-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    .product-card .relative {
      transition: all 0.4s ease-in-out;
    }
    .product-card .absolute {
      transition: opacity 0.4s ease-in-out, transform 0.4s ease-in-out, visibility 0.4s ease-in-out;
    }
    .product-card .absolute.opacity-0 {
      visibility: hidden;
    }
    .product-card .absolute.opacity-100 {
      visibility: visible;
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
  );
  ProductSectionSkeleton.displayName = 'ProductSectionSkeleton';

  return (
    <div className="ml-5 mr-5">
      <style dangerouslySetInnerHTML={{ __html: style }} />
      
      {/* Subcategory Modal */}
      {selectedCategory && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="mb-4 sm:mb-6">
              <button
                onClick={closeSubcategoryModal}
                className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="mr-2"
                >
                  <path
                    d="M15 19L8 12L15 5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-sm sm:text-base font-medium">Back to Categories</span>
              </button>
            </div>

            <div className="flex justify-between items-center mb-4 sm:mb-6 px-2 sm:px-0">
              <h2 className="text-lg sm:text-xl md:text-2xl font-extrabold text-[#373737] tracking-tight">
                {selectedCategory.name}
              </h2>
            </div>

            <div className="relative px-2 sm:px-0">
              {categoriesLoading ? (
                <div className="subcategory-grid">
                  {[1, 2, 3, 4].map((i) => (
                    <MemoizedSubcategorySkeleton key={i} />
                  ))}
                </div>
              ) : selectedCategory.children && selectedCategory.children.length > 0 ? (
                <div className="subcategory-grid">
                  {selectedCategory.children.map((childCategory) => (
                    <CategoryCard key={childCategory.id} childCategory={childCategory} />
                  ))}
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center">
                  <p className="text-gray-500">No subcategories found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Categories Section */}
      <div className="mb-12">
        {categoriesLoading ? (
          <>
            <MemoizedCategorySkeleton />
            <MemoizedCategorySkeleton />
            <MemoizedCategorySkeleton />
          </>
        ) : categories.length ? (
          <>
            {(showAllCategories ? categories : categories.filter(cat => defaultCategoryNames.includes(cat.name)))
              .filter(cat => cat.children && cat.children.length > 0)
              .map((parentCategory) => (
                <div key={parentCategory.id} className="mb-8 sm:mb-12">
                  <div className="flex justify-between items-center mb-4 sm:mb-6 px-2 sm:px-0">
                    <h2 className="text-lg sm:text-xl md:text-2xl font-extrabold text-[#373737] tracking-tight">{parentCategory.name}</h2>
                  </div>
                  
                  <div className="px-2 sm:px-0">
                    <div className={parentCategory.children.length > 4 ? "category-grid-with-button" : "category-grid"}>
                      {parentCategory.children
                        .slice(0, window.innerWidth < 768 ? 3 : 4)
                        .map((childCategory) => (
                          <CategoryCard key={childCategory.id} childCategory={childCategory} />
                        ))}
                        
                      {parentCategory.children.length > (window.innerWidth < 768 ? 3 : 4) && (
                        <div className="lg:contents">
                          <button 
                            onClick={() => openSubcategoryModal(parentCategory)}
                            className="see-all-button green-bg w-full lg:w-auto mt-4 lg:mt-0 mx-auto lg:mx-0"
                          >
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
                            <span className="text-black text-xs sm:text-sm font-medium">
                              See all
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            
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
                      <ProductCard
                        key={product.id}
                        product={product}
                        cart={cart}
                        handleAddToCart={handleAddToCart}
                      />
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
                      <ProductCard
                        key={product.id}
                        product={product}
                        cart={cart}
                        handleAddToCart={handleAddToCart}
                      />
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