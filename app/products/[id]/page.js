"use client";

import { createClient } from '@supabase/supabase-js';
import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Star, ShoppingCart, Plus, Minus, Heart } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

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
  const [visibleReviews, setVisibleReviews] = useState(5);
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

  useEffect(() => {
    const migrateGuestCart = async () => {
      if (!user) return;

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

        guestCart.forEach((guestItem) => {
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

    if (productToAdd.quantity < qty) {
      setCartMessage('Insufficient stock.');
      setTimeout(() => setCartMessage(''), 3000);
      return;
    }

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
        items = items.filter((id) => id !== product.id);
        setIsInWishlist(false);
        setWishlistMessage('Removed from wishlist!');
      } else {
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

  const incrementQuantity = () => {
    if (quantity < product.quantity) {
      setQuantity((prev) => prev + 1);
    }
  };

  const decrementQuantity = () => {
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1));
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 320, behavior: 'smooth' });
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

  const showMoreReviews = () => {
    setVisibleReviews((prev) => prev + 5);
  };

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const stars = [];

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" style={{ clipPath: 'inset(0 50% 0 0)' }} />);
      } else {
        stars.push(<Star key={i} className="w-4 h-4 text-gray-300" />);
      }
    }
    return stars;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-xl text-gray-700 font-semibold">Product not found.</p>
      </div>
    );
  }

  const imagePaths = normalizeImagePath(product.image);
  const currentImage = imagePaths[currentImageIndex];
  const reviews = product?.reviews || [];
  const shownReviews = reviews.slice(0, visibleReviews);
  const hasMoreReviews = visibleReviews < reviews.length;

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      {/* Breadcrumb */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          
          <nav className="flex items-center text-sm text-gray-600" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-blue-600 transition-colors font-medium">Home</Link>
            <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
            <Link href="/products" className="hover:text-blue-600 transition-colors font-medium">Products</Link>
            <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
            <span className="text-gray-900 font-medium truncate">{product.name}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Product Image Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-square bg-white rounded-2xl shadow-lg overflow-hidden">
              {imagePaths.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 rounded-full p-2.5 shadow-md hover:bg-white hover:shadow-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-6 h-6 text-gray-700" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 rounded-full p-2.5 shadow-md hover:bg-white hover:shadow-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-6 h-6 text-gray-700" />
                  </button>
                </>
              )}
              {currentImage ? (
                <Image
                  src={currentImage}
                  alt={product.name}
                  fill
                  className="object-contain p-8 transition-transform duration-300 hover:scale-105"
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500 text-lg">
                  No Image Available
                </div>
              )}
            </div>
            {imagePaths.length > 1 && (
              <div className="flex justify-center gap-3 overflow-x-auto py-2 scrollbar-hide">
                {imagePaths.map((path, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 transition-all duration-300 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      index === currentImageIndex ? 'border-green-500 shadow-lg' : 'border-gray-200 hover:border-green-400'
                    }`}
                    aria-label={`View image ${index + 1}`}
                  >
                    <Image
                      src={path}
                      alt={`Thumbnail ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-4">
            <p className="text-sm text-gray-500">{product.quantity} in stock</p>

            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
              {product.name}
            </h1>

            <div className="text-3xl font-bold text-green-600">
              ${selectedVariation ? selectedVariation.price.toFixed(2) : product.price.toFixed(2)}
            </div>
            <hr />

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Quantity</label>
              
              <div className="flex items-center mt-3 space-x-4">
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                  <button
                    onClick={decrementQuantity}
                    disabled={quantity <= 1}
                    className="p-3 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-5 h-5 text-gray-700" />
                  </button>
                  <span className="px-5 py-2.5 font-medium text-gray-900 text-base">{quantity}</span>
                  <button
                    onClick={incrementQuantity}
                    disabled={quantity >= product.quantity}
                    className="p-3 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-5 h-5 text-gray-700" />
                  </button>
                </div>
                {product.quantity <= 10 && (
                  <div className="flex items-center text-red-500 text-sm font-medium">
                    <span className="mr-1">⚠️</span>
                    <span>Limited Quantity Available</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                {renderStars(product?.averageRating || 0)}
              </div>
              <Link
                href="#reviews"
                className="text-sm font-medium text-gray-600 hover:text-green-600 transition-colors"
                aria-label={`View ${product?.reviewCount || 0} reviews`}
              >
                {product?.averageRating || 0}/5 ({product?.reviewCount || 0} reviews)
              </Link>
            </div>

            <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
              {product.description || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.'}
            </p>

            {product.variations && product.variations.length > 0 && (
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700">Select Variation</label>
                <div className="flex flex-wrap gap-2">
                  {product.variations.map((variation, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedVariation(variation)}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                        selectedVariation === variation
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-green-50 hover:border-green-400 hover:shadow-md'
                      }`}
                      aria-label={`Select variation ${variation.size || variation.color || `Variation ${idx + 1}`}`}
                    >
                      {variation.size && variation.color
                        ? `${variation.size} / ${variation.color}`
                        : variation.size || variation.color || `Variation ${idx + 1}`}
                      <span className="ml-2">(${variation.price.toFixed(2)})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col mt-2 sm:flex-row gap-3">
              <button
                onClick={() => handleAddToCart()}
                className="flex-1 bg-green-800 hover:bg-green-900 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <ShoppingCart className="w-5 h-5" />
                <span>Add to Cart</span>
              </button>
              <button
                onClick={handleToggleWishlist}
                className={`flex items-center justify-center px-6 py-3 rounded-lg font-semibold transition-all duration-300 gap-2 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  isInWishlist
                    ? 'bg-red-400 hover:bg-red-500 text-white'
                    : 'bg-lime-400 hover:bg-lime-500 text-gray-900'
                }`}
                aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Heart className={`w-5 h-5 ${isInWishlist ? 'fill-white' : ''}`} />
                <span>{isInWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}</span>
              </button>
            </div>

            {(cartMessage || wishlistMessage) && (
              <div className="bg-green-50 border-l-4 border-green-500 text-green-700 px-4 py-3 rounded-lg text-sm animate-fade-in">
                {cartMessage || wishlistMessage}
              </div>
            )}
          </div>
        </div>

        
        {/* Related Products */}
        <div className="mt-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Related Items</h2>
          <div className="relative">
            {relatedProducts.length > 0 && (
              <>
                <button
                  onClick={scrollLeft}
                  className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 rounded-full p-2 shadow-md hover:bg-white hover:shadow-xl transition-all duration-300 sm:flex hidden focus:outline-none focus:ring-2 focus:ring-green-500"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-700" />
                </button>
                <button
                  onClick={scrollRight}
                  className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 rounded-full p-2 shadow-md hover:bg-white hover:shadow-xl transition-all duration-300 sm:flex hidden focus:outline-none focus:ring-2 focus:ring-green-500"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="w-5 h-5 text-gray-700" />
                </button>
              </>
            )}
            <div
              ref={scrollContainerRef}
              className="flex overflow-x-auto gap-4 scrollbar-hide scroll-smooth snap-x snap-mandatory"
            >
              {relatedProducts.length > 0 ? (
                relatedProducts.map((relatedProduct) => {
                  const relatedImagePaths = normalizeImagePath(relatedProduct.image);
                  const firstImagePath = relatedImagePaths[0];
                  return (
                    <div
                      key={relatedProduct.id}
                      className="snap-start flex-shrink-0 w-40 sm:w-48 bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100"
                    >
                      <Link href={`/products/${relatedProduct.id}`} className="block">
                        <div className="relative aspect-[3/4] bg-gray-50 p-2">
                          {firstImagePath ? (
                            <Image
                              src={firstImagePath}
                              alt={relatedProduct.name}
                              fill
                              className="object-contain transition-transform duration-300 hover:scale-105"
                              loading="lazy"
                              sizes="(max-width: 768px) 160px, 192px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
                              No Image
                            </div>
                          )}
                        </div>
                        <div className="p-3 space-y-1">
                          <h3 className="font-medium text-gray-900 text-sm line-clamp-1">
                            {relatedProduct.name}
                          </h3>
                          <p className="text-xs text-gray-500 line-clamp-1">
                            {relatedProduct.description || 'No description available.'}
                          </p>
                          <p className="text-xs text-gray-600">{relatedProduct.quantity} in stock</p>
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-bold text-gray-900">
                              ${relatedProduct.price.toFixed(2)}
                            </div>
                            <button
                              className="bg-gray-200 hover:bg-gray-300 rounded-md p-1.5 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                              onClick={(e) => {
                                e.preventDefault();
                                handleAddToCart(relatedProduct, 1);
                              }}
                              aria-label={`Add ${relatedProduct.name} to cart`}
                            >
                              <Plus className="w-4 h-4 text-gray-800" />
                            </button>
                          </div>
                        </div>
                      </Link>
                    </div>
                  );
                })
              ) : (
                <div className="w-full text-center py-12">
                  <p className="text-gray-700 text-base sm:text-lg">No related products available.</p>
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
        .animate-fade-in {
          animation: fadeIn 0.3s ease-in;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @media (max-width: 640px) {
          .scrollbar-hide {
            -webkit-overflow-scrolling: touch;
          }
        }
      `}</style>
    </div>
  );
}
