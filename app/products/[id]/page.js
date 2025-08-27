"use client";

import { createClient } from '@supabase/supabase-js';
import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Star, ShoppingCart, Plus, Minus, Heart } from 'lucide-react';
import Image from 'next/image';

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

export default function ProductDetailPage({ params }) {
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvedParams, setResolvedParams] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariation, setSelectedVariation] = useState(null);
  const [cartMessage, setCartMessage] = useState('');
  const [wishlistMessage, setWishlistMessage] = useState('');
  const [user, setUser] = useState(null);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    const resolveParams = async () => {
      const resolved = await params;
      setResolvedParams(resolved);
    };
    resolveParams();
  }, [params]);

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchProductAndWishlist = async () => {
      if (!resolvedParams) return;

      const { id } = resolvedParams;
      if (!id) return;

      try {
        // Fetch product data
        const response = await fetch(`/api/products/${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch product');
        }
        const data = await response.json();
        setProduct(data.product);
        setRelatedProducts(data.relatedProducts || []);
        if (data.product.variations && data.product.variations.length > 0) {
          setSelectedVariation(data.product.variations[0]);
        }

        // Check if product is in user's wishlist
        if (user) {
          const { data: wishlistData, error: wishlistError } = await supabase
            .from('wishlists')
            .select('items')
            .eq('user_id', user.id)
            .single();

          if (wishlistError && wishlistError.code !== 'PGRST116') {
            console.error('Error fetching wishlist:', wishlistError);
          } else if (wishlistData && wishlistData.items) {
            setIsInWishlist(wishlistData.items.includes(data.product.id));
          }
        }
      } catch (err) {
        console.error('Error fetching product:', err);
        setProduct(null);
        setRelatedProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProductAndWishlist();
  }, [resolvedParams, user]);

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
        } else {
          localStorage.removeItem(guestCartKey);
          window.dispatchEvent(new Event('cartUpdated'));
        }
      } catch (err) {
        console.error('Error during cart migration:', err);
      }
    };

    migrateGuestCart();
  }, [user]);

  const handleAddToCart = async (productToAdd = product, qty = quantity, variation = selectedVariation) => {
    if (!productToAdd) return;

    const itemId = variation ? `${productToAdd.id}_${JSON.stringify(variation)}` : productToAdd.id;
    const newItem = {
      itemId,
      product_id: productToAdd.id,
      quantity: qty,
      name: productToAdd.name,
      price: variation ? variation.price : productToAdd.price,
      image: Array.isArray(productToAdd.image) ? productToAdd.image[0] : productToAdd.image,
      variation: variation || null,
      supermarket_id: productToAdd.supermarket_id,
    };

    try {
      if (!user) {
        // Handle guest cart in localStorage
        const cartKey = 'cart_guest';
        let cart = JSON.parse(localStorage.getItem(cartKey)) || [];
        const existingItem = cart.find((item) => item.itemId === itemId);

        if (existingItem) {
          existingItem.quantity += qty;
        } else {
          cart.push(newItem);
        }

        localStorage.setItem(cartKey, JSON.stringify(cart));
      } else {
        // Handle authenticated user cart in DB
        const { data, error } = await supabase
          .from('carts')
          .select('store_carts')
          .eq('user_id', user.id)
          .single();

        let cart = [];
        if (data && data.store_carts) {
          cart = data.store_carts;
        }

        const existingItem = cart.find((item) => item.itemId === itemId);

        if (existingItem) {
          existingItem.quantity += qty;
        } else {
          cart.push(newItem);
        }

        const { error: upsertError } = await supabase
          .from('carts')
          .upsert(
            {
              user_id: user.id,
              store_carts: cart,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );

        if (upsertError) {
          console.error('Error updating cart:', upsertError);
          setCartMessage('Failed to add product to cart.');
          setTimeout(() => setCartMessage(''), 3000);
          return;
        }
      }

      window.dispatchEvent(new Event('cartUpdated'));
      setCartMessage('Product added to cart!');
      setTimeout(() => setCartMessage(''), 3000);
    } catch (err) {
      console.error('Error in handleAddToCart:', err);
      setCartMessage('An error occurred while adding to cart.');
      setTimeout(() => setCartMessage(''), 3000);
    }
  };

  const handleToggleWishlist = async () => {
    if (!user) {
      setWishlistMessage('Please sign in to add to wishlist.');
      setTimeout(() => setWishlistMessage(''), 3000);
      return;
    }

    if (!product) return;

    try {
      const { data: wishlistData, error: fetchError } = await supabase
        .from('wishlists')
        .select('items')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching wishlist:', fetchError);
        setWishlistMessage('Error accessing wishlist.');
        setTimeout(() => setWishlistMessage(''), 3000);
        return;
      }

      let items = wishlistData?.items || [];
      const isCurrentlyInWishlist = items.includes(product.id);

      if (isCurrentlyInWishlist) {
        // Remove from wishlist
        items = items.filter((id) => id !== product.id);
        setIsInWishlist(false);
        setWishlistMessage('Removed from wishlist!');
      } else {
        // Add to wishlist
        items.push(product.id);
        setIsInWishlist(true);
        setWishlistMessage('Added to wishlist!');
      }

      const { error: upsertError } = await supabase
        .from('wishlists')
        .upsert(
          {
            user_id: user.id,
            items,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (upsertError) {
        console.error('Error updating wishlist:', upsertError);
        setWishlistMessage('Error updating wishlist.');
      } else {
        window.dispatchEvent(new Event('wishlistUpdated'));
      }

      setTimeout(() => setWishlistMessage(''), 3000);
    } catch (err) {
      console.error('Error in handleToggleWishlist:', err);
      setWishlistMessage('An error occurred while updating wishlist.');
      setTimeout(() => setWishlistMessage(''), 3000);
    }
  };

  const incrementQuantity = () => setQuantity((prev) => prev + 1);
  const decrementQuantity = () => setQuantity((prev) => (prev > 1 ? prev - 1 : 1));

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -280, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 280, behavior: 'smooth' });
    }
  };

  const nextImage = () => {
    const imagePaths = normalizeImagePath(product?.image);
    setCurrentImageIndex((prev) => (prev + 1) % imagePaths.length);
  };

  const prevImage = () => {
    const imagePaths = normalizeImagePath(product?.image);
    setCurrentImageIndex((prev) => (prev - 1 + imagePaths.length) % imagePaths.length);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-500">Product not found.</p>
      </div>
    );
  }

  const imagePaths = normalizeImagePath(product.image);
  const currentImage = imagePaths[currentImageIndex];

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center text-sm text-gray-500">
            <ChevronLeft className="w-4 h-4 mr-2" />
            <span>Popular Items</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-12">
          {/* Product Image */}
          <div className="relative">
            <div className="aspect-square bg-white rounded-2xl shadow-sm overflow-hidden">
              {imagePaths.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/80 backdrop-blur-sm rounded-full p-2 shadow-md hover:bg-white transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-700" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/80 backdrop-blur-sm rounded-full p-2 shadow-md hover:bg-white transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-700" />
                  </button>
                </>
              )}

              {currentImage ? (
                <Image
                  src={currentImage}
                  alt={product.name}
                  fill
                  className="object-contain p-6 sm:p-8"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No Image Available
                </div>
              )}

              {imagePaths.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                  {imagePaths.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentImageIndex ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div className="inline-block bg-gray-100 px-3 py-1 rounded-full text-sm text-gray-600">
              500g
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
              {product.name}
            </h1>

            <div className="text-2xl sm:text-3xl font-bold text-green-500">
              ${selectedVariation ? selectedVariation.price : product.price}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Quantity</label>
              <div className="flex items-center space-x-4">
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button
                    onClick={decrementQuantity}
                    disabled={quantity <= 1}
                    className="p-2 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 py-2 font-medium">{quantity}</span>
                  <button
                    onClick={incrementQuantity}
                    className="p-2 hover:bg-gray-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center text-orange-500 text-sm">
                  <span className="mr-1">⚠️</span>
                  <span>Limited Quantity Available</span>
                </div>
              </div>
            </div>

            {product.variations && product.variations.length > 0 && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">Select Variation</label>
                <div className="flex flex-wrap gap-2">
                  {product.variations.map((variation, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedVariation(variation)}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        selectedVariation === variation
                          ? 'bg-green-500 text-white border-green-500'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-green-300'
                      }`}
                    >
                      {variation.size && variation.color
                        ? `${variation.size} / ${variation.color}`
                        : variation.size || variation.color || `Variation ${idx + 1}`}
                      <span className="ml-2">(${variation.price})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <div className="flex items-center">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="ml-1 text-sm font-medium">4.4/5</span>
              </div>
            </div>

            <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
              {product.description || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.'}
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => handleAddToCart()}
                className="flex-1 bg-teal-900 hover:bg-teal-800 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <ShoppingCart className="w-5 h-5" />
                <span>Add to cart</span>
              </button>
              <button
                onClick={handleToggleWishlist}
                className={`flex items-center justify-center px-6 py-3 rounded-lg font-medium transition-colors space-x-2 ${
                  isInWishlist
                    ? 'bg-red-100 hover:bg-red-200 text-red-700'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <Heart className={`w-5 h-5 ${isInWishlist ? 'fill-red-700' : ''}`} />
                <span>{isInWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}</span>
              </button>
            </div>

            {(cartMessage || wishlistMessage) && (
              <div className="bg-green-100 border border-green-300 text-green-700 px-4 py-3 rounded-lg text-sm">
                {cartMessage || wishlistMessage}
              </div>
            )}
          </div>
        </div>

        {/* Related Items */}
        <div className="mt-12 sm:mt-16">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Related Items</h2>

          <div className="relative">
            {relatedProducts.length > 0 && (
              <>
                <button
                  onClick={scrollLeft}
                  className="hidden sm:block absolute -left-4 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-shadow"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-700" />
                </button>
                <button
                  onClick={scrollRight}
                  className="hidden sm:block absolute -right-4 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-shadow"
                >
                  <ChevronRight className="w-5 h-5 text-gray-700" />
                </button>
              </>
            )}

            <div
              ref={scrollContainerRef}
              className="grid grid-cols-2 gap-4 sm:flex sm:overflow-x-auto sm:gap-6 sm:pb-4 scroll-smooth scrollbar-hide"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {relatedProducts.length > 0 ? (
                relatedProducts.map((relatedProduct) => {
                  const relatedImagePaths = normalizeImagePath(relatedProduct.image);
                  const firstImagePath = relatedImagePaths[0];
                  return (
                    <div
                      key={relatedProduct.id}
                      className="flex-shrink-0 w-full sm:w-60 bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group"
                    >
                      <a href={`/products/${relatedProduct.id}`} className="block">
                        <div className="relative aspect-square bg-gray-50 p-3 sm:p-4">
                          {firstImagePath ? (
                            <Image
                              src={firstImagePath}
                              alt={relatedProduct.name}
                              fill
                              className="object-contain p-2"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                              No Image
                            </div>
                          )}

                          <div className="absolute inset-0 border-2 border-blue-400 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>

                        <div className="p-3 sm:p-4 space-y-2">
                          <h3 className="font-medium text-gray-900 text-sm sm:text-base truncate">
                            {relatedProduct.name}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-500">100g Standard Portion</p>

                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="text-base sm:text-lg font-bold text-gray-900">
                                ${relatedProduct.price}
                              </div>
                              <div className="flex items-center">
                                <Star className="w-3 sm:w-4 h-3 sm:h-4 fill-yellow-400 text-yellow-400" />
                                <span className="ml-1 text-xs sm:text-sm text-gray-600">4.25</span>
                              </div>
                            </div>

                            <button
                              className="bg-gray-100 hover:bg-gray-200 rounded-lg p-2 transition-colors"
                              onClick={(e) => {
                                e.preventDefault();
                                handleAddToCart(relatedProduct, 1);
                              }}
                            >
                              <Plus className="w-4 sm:w-5 h-4 sm:h-5 text-gray-700" />
                            </button>
                          </div>
                        </div>
                      </a>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full text-center py-12">
                  <p className="text-gray-500 text-sm sm:text-base">No related products available.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @media (max-width: 640px) {
          .grid-cols-2 {
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          }
        }
      `}</style>
    </div>
  );
}