'use client'

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@supabase/supabase-js';
import React from 'react';

// Normalize the image path to ensure the image URL is correct
const normalizeImagePath = (path) => {
  if (!path) return '/placeholder-product.jpg';
  const imagePath = Array.isArray(path) ? (path[0] || '/placeholder-product.jpg') : path;
  return imagePath.replace(/^(\.\.\/)+assets\//, '/');
};

// Normalize product name for comparison (trim, lowercase, remove extra spaces)
const normalizeProductName = (name) => {
  return name
    ?.trim()
    .toLowerCase()
    .replace(/\s+/g, ' ') // Replace multiple spaces with a single space
    || '';
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ProductCard component for consistent rendering
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
      <div className="product-card bg-white rounded-2xl p-3 sm:p-4 lg:p-5 shadow-lg hover:shadow-xl transition-shadow duration-300 w-full h-[340px] sm:h-[360px] lg:h-[380px] flex flex-col">
        <div className="bg-gray-50 rounded-xl p-2 sm:p-3 lg:p-4 mb-2 sm:mb-3 flex items-center justify-center h-[120px] sm:h-[140px] lg:h-[160px] flex-shrink-0">
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
              <span className="text-gray-400 text-xs sm:text-sm">No image</span>
            </div>
          )}
        </div>
        <div className="flex flex-col flex-grow">
          <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 line-clamp-2 h-[2.2rem] sm:h-[2.4rem] lg:h-[2.8rem] mb-1 sm:mb-2">
            {product.name}
          </h3>
          <p className="text-gray-400 text-xs sm:text-sm line-clamp-2 sm:line-clamp-3 h-[2.4rem] sm:h-[3.5rem] mb-2 sm:mb-3">
            {product.description || 'No description available'}
          </p>
          <div className="flex items-center justify-between mt-auto">
            <div className="flex-1 min-w-0">
              <div className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 truncate">
                ${product.price.toFixed(2)}
              </div>
              {product.quantity && (
                <p className="text-gray-400 text-xs mt-0.5 truncate">Qty: {product.quantity}</p>
              )}
            </div>
            <div className="flex-shrink-0 ml-2 h-8 sm:h-9 w-20 sm:w-24 lg:w-28 relative">
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
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="sm:w-[18px] sm:h-[18px] text-gray-600 group-hover:text-gray-700"
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
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md w-6 sm:w-8 lg:w-9 h-full flex items-center justify-center transition-colors"
                  title="Decrease quantity"
                  tabIndex={quantityInCart > 0 ? 0 : -1}
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="sm:w-3 sm:h-3"
                  >
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
                <span className="text-xs sm:text-sm lg:text-base font-medium text-gray-800 w-5 sm:w-7 lg:w-8 h-full flex items-center justify-center select-none">
                  {quantityInCart}
                </span>
                <button
                  onClick={handleIncrement}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md w-6 sm:w-8 lg:w-9 h-full flex items-center justify-center transition-colors"
                  title="Increase quantity"
                  tabIndex={quantityInCart > 0 ? 0 : -1}
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="sm:w-3 sm:h-3"
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
ProductCard.displayName = 'ProductCard';

export default function CategoryProducts({ params, searchParams }) {
  const resolvedParams = React.use(params); // Unwrap params with React.use()
  const resolvedSearchParams = React.use(searchParams); // Unwrap searchParams with React.use()
  const categoryId = resolvedParams.id; // Access id after unwrapping
  const storeId = resolvedSearchParams.store || null; // Access store after unwrapping

  const [products, setProducts] = useState([]);
  const [categoryName, setCategoryName] = useState('Products');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cart, setCart] = useState([]);
  const [cartMessage, setCartMessage] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch products
        let query = supabase
          .from('products')
          .select('id, name, price, image, description, quantity, supermarket_id')
          .eq('categoryid', categoryId);

        if (storeId) {
          query = query.eq('supermarket_id', storeId);
        }

        const { data: allProducts, error: productsError } = await query;

        if (productsError) {
          throw new Error(productsError.message);
        }

        // Deduplicate products by normalized name
        const deduplicatedProducts = Object.values(
          allProducts.reduce((acc, product) => {
            const normalizedName = normalizeProductName(product.name);
            const existing = acc[normalizedName];
            if (!existing || product.price < existing.price) {
              acc[normalizedName] = product;
            } else if (product.price === existing.price && product.id < existing.id) {
              acc[normalizedName] = product;
            }
            return acc;
          }, {})
        );

        setProducts(deduplicatedProducts);

        // Fetch category name
        const { data: category, error: categoryError } = await supabase
          .from('categories')
          .select('name')
          .eq('id', categoryId)
          .single();

        if (categoryError) {
          throw new Error(categoryError.message);
        }

        setCategoryName(category?.name || 'Products');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

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
    };

    fetchData();
    fetchUserAndCart();
  }, [categoryId, storeId]);

  const updateCartInSupabase = useCallback(async (newCart, userId) => {
    if (!userId) return;
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
      setCartMessage('Failed to update cart.');
      setTimeout(() => setCartMessage(''), 2000);
    }
  }, []);

  const handleAddToCart = useCallback(
    async (productToAdd, quantityDelta = 1) => {
      if (!productToAdd || !productToAdd.id) {
        setCartMessage('Invalid product data.');
        setTimeout(() => setCartMessage(''), 2000);
        return;
      }

      try {
        let newCart = [...cart];
        const itemId = `${productToAdd.id}`;
        const existingItemIndex = newCart.findIndex((item) => item.itemId === itemId);

        if (existingItemIndex > -1) {
          newCart[existingItemIndex].quantity += quantityDelta;
          if (newCart[existingItemIndex].quantity <= 0) {
            newCart.splice(existingItemIndex, 1);
            setCartMessage('Product removed from cart!');
          } else {
            setCartMessage(quantityDelta > 0 ? 'Product quantity increased!' : 'Product quantity decreased!');
          }
        } else if (quantityDelta > 0) {
          newCart.push({
            itemId: itemId,
            product_id: productToAdd.id,
            quantity: quantityDelta,
            name: productToAdd.name,
            price: productToAdd.price,
            image: productToAdd.image,
            supermarket_id: productToAdd.supermarket_id,
          });
          setCartMessage('Product added to cart!');
        }

        setCart(newCart);

        if (!user) {
          localStorage.setItem('cart_guest', JSON.stringify(newCart));
          window.dispatchEvent(new Event('cartUpdated'));
        } else {
          await updateCartInSupabase(newCart, user.id);
          window.dispatchEvent(new Event('cartUpdated'));
        }

        setTimeout(() => setCartMessage(''), 2000);
      } catch (error) {
        console.error('Error in handleAddToCart:', error);
        setCartMessage('An error occurred while updating cart.');
        setTimeout(() => setCartMessage(''), 2000);
      }
    },
    [cart, user, updateCartInSupabase]
  );

  // CSS styles - responsive version
  const style = `
    .product-card {
      flex: 0 0 auto;
      scroll-snap-align: start;
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
  `;

  return (
    <div className="p-3 sm:p-4 lg:p-6 mt-16 sm:mt-18 lg:mt-20 mb-16 sm:mb-18 lg:mb-20 bg-gray-50 min-h-screen">
      <style dangerouslySetInnerHTML={{ __html: style }} />
      
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
          {categoryName}
          {storeId && (
            <span className="text-gray-500 text-sm sm:text-base lg:text-lg ml-2 block sm:inline">
              (Filtered by store)
            </span>
          )}
        </h1>
      </div>

      {loading ? (
        /* Loading Skeleton - Responsive Grid */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
            <div key={i} className="bg-white rounded-2xl shadow-lg p-3 sm:p-4 border border-gray-100">
              <div className="mb-3 sm:mb-4 h-32 sm:h-40 lg:h-48 bg-gray-200 rounded-xl animate-pulse"></div>
              <div className="h-4 sm:h-5 lg:h-6 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
              <div className="h-4 sm:h-5 lg:h-6 bg-gray-200 rounded w-1/4 animate-pulse"></div>
            </div>
          ))}
        </div>
      ) : error ? (
        /* Error State */
        <div className="flex items-center justify-center min-h-[200px] sm:min-h-[300px]">
          <div className="text-center p-6 bg-white rounded-lg shadow-md max-w-md mx-auto">
            <div className="text-red-500 text-4xl sm:text-5xl mb-4">⚠️</div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Error Loading Products</h3>
            <p className="text-gray-600 text-sm sm:text-base break-words">{error}</p>
          </div>
        </div>
      ) : products?.length > 0 ? (
        /* Products Grid - Responsive */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              cart={cart}
              handleAddToCart={handleAddToCart}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="flex items-center justify-center min-h-[200px] sm:min-h-[300px]">
          <div className="text-center p-6 bg-white rounded-lg shadow-md max-w-md mx-auto">
            <div className="text-gray-400 text-4xl sm:text-5xl mb-4">📦</div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No Products Found</h3>
            <p className="text-gray-600 text-sm sm:text-base">
              No products found in this {storeId ? "store's " : ""}category.
            </p>
          </div>
        </div>
      )}

      {/* Cart Message Toast - Responsive */}
      {cartMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg shadow-lg z-50 text-sm sm:text-base max-w-[90vw] text-center">
          {cartMessage}
        </div>
      )}
    </div>
  );
}