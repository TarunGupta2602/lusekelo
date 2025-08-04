"use client";
import { createClient } from '@supabase/supabase-js';
import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Star, ShoppingCart, Plus, Minus } from 'lucide-react';
import Image from 'next/image';
import CustomAuthModal from '../../../components/CustomAuthModal';

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
  const [cartMessage, setCartMessage] = useState("");
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
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
      if (!error && data && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!resolvedParams) return;

      const { id } = resolvedParams;
      if (!id) return;

      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, price, image, description, quantity, categoryid, sku, variations')
          .eq('id', id)
          .single();

        if (error) {
          console.error("Supabase error:", error);
          setProduct(null);
        } else {
          setProduct(data);
          if (data.variations && data.variations.length > 0) {
            setSelectedVariation(data.variations[0]);
          }

          try {
            const { data: relatedData, error: relatedError } = await supabase
              .from('products')
              .select('id, name, price, image, description')
              .eq('categoryid', data.categoryid)
              .neq('id', id)
              .limit(10);

            if (!relatedError && relatedData) {
              setRelatedProducts(relatedData);
            } else {
              console.error("Error fetching related products:", relatedError);
              setRelatedProducts([]);
            }
          } catch (relatedErr) {
            console.error("Exception fetching related products:", relatedErr);
            setRelatedProducts([]);
          }
        }
      } catch (err) {
        console.error("Error fetching product:", err);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [resolvedParams]);

  const getCartKey = () => {
    if (user && user.id) {
      return `cart_${user.id}`;
    }
    return 'cart_guest';
  };

  const handleAddToCart = (productToAdd = product, qty = quantity, variation = selectedVariation) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!productToAdd) return;

    const cartKey = getCartKey();
    const cart = JSON.parse(localStorage.getItem(cartKey)) || [];
    const itemId = variation ? `${productToAdd.id}_${JSON.stringify(variation)}` : productToAdd.id;
    const existingItem = cart.find((item) => item.itemId === itemId);

    if (existingItem) {
      existingItem.quantity += qty;
    } else {
      cart.push({
        itemId,
        product_id: productToAdd.id,
        quantity: qty,
        name: productToAdd.name,
        price: variation ? variation.price : productToAdd.price,
        image: Array.isArray(productToAdd.image) ? productToAdd.image[0] : productToAdd.image,
        variation: variation || null,
      });
    }

    localStorage.setItem(cartKey, JSON.stringify(cart));
    window.dispatchEvent(new Event("cartUpdated"));

    setCartMessage("Product added to cart!");
    setTimeout(() => setCartMessage(""), 3000);
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
    const imagePaths = normalizeImagePath(product.image);
    setCurrentImageIndex((prev) => (prev + 1) % imagePaths.length);
  };

  const prevImage = () => {
    const imagePaths = normalizeImagePath(product.image);
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
    <div className="min-h-screen mt-20 bg-gray-50">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
          {/* Product Image */}
          <div className="relative">
            <div className="aspect-square bg-white rounded-2xl shadow-sm overflow-hidden relative">
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
                  className="object-contain p-8"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No Image Available
                </div>
              )}
              
              {/* Image indicators */}
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
            {/* Weight/Size indicator */}
            <div className="inline-block bg-gray-100 px-3 py-1 rounded-full text-sm text-gray-600">
              500g
            </div>

            {/* Product Name */}
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">
              {product.name}
            </h1>

            {/* Price */}
            <div className="text-3xl font-bold text-green-500">
              ${selectedVariation ? selectedVariation.price : product.price}
            </div>

            {/* Quantity Selector */}
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
                
                {/* Stock Warning */}
                <div className="flex items-center text-orange-500 text-sm">
                  <span className="mr-1">⚠️</span>
                  <span>Limited Quantity Available</span>
                </div>
              </div>
            </div>

            {/* Variations */}
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

            {/* Rating */}
            <div className="flex items-center space-x-2">
              <div className="flex items-center">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="ml-1 text-sm font-medium">4.4/5</span>
              </div>
            </div>

            {/* Description */}
            <p className="text-gray-600 leading-relaxed">
              {product.description || "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt."}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => handleAddToCart()}
                className="flex-1 bg-teal-900 hover:bg-teal-800 text-white px-8 py-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <ShoppingCart className="w-5 h-5" />
                <span>Add to cart</span>
              </button>
              <button className="flex-1 bg-lime-400 hover:bg-lime-500 text-black px-8 py-4 rounded-lg font-medium transition-colors">
                Shop Now
              </button>
            </div>

            {/* Success Message */}
            {cartMessage && (
              <div className="bg-green-100 border border-green-300 text-green-700 px-4 py-3 rounded-lg">
                {cartMessage}
              </div>
            )}
          </div>
        </div>

        {/* Related Items */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Related Items</h2>
          
          <div className="relative">
            {relatedProducts.length > 4 && (
              <>
                <button
                  onClick={scrollLeft}
                  className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-shadow"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-700" />
                </button>
                <button
                  onClick={scrollRight}
                  className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-shadow"
                >
                  <ChevronRight className="w-5 h-5 text-gray-700" />
                </button>
              </>
            )}

            <div
              ref={scrollContainerRef}
              className="flex overflow-x-auto gap-6 pb-4 scroll-smooth scrollbar-hide"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {relatedProducts.length > 0 ? (
                relatedProducts.map((relatedProduct) => {
                  const relatedImagePaths = normalizeImagePath(relatedProduct.image);
                  const firstImagePath = relatedImagePaths[0];
                  return (
                    <div
                      key={relatedProduct.id}
                      className="flex-shrink-0 w-64 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden group"
                    >
                      <a href={`/products/${relatedProduct.id}`} className="block">
                        <div className="relative aspect-square bg-gray-50 p-4">
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
                          
                          {/* Highlighted border for one product */}
                          <div className="absolute inset-0 border-2 border-blue-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        
                        <div className="p-4 space-y-2">
                          <h3 className="font-medium text-gray-900 truncate">
                            {relatedProduct.name}
                          </h3>
                          <p className="text-sm text-gray-500">100g Standard Portion</p>
                          
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="text-lg font-bold text-gray-900">
                                $ {relatedProduct.price}
                              </div>
                              <div className="flex items-center">
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                <span className="ml-1 text-sm text-gray-600">4.25</span>
                              </div>
                            </div>
                            
                            <button
                              className="bg-gray-100 hover:bg-gray-200 rounded-lg p-2 transition-colors"
                              onClick={(e) => {
                                e.preventDefault();
                                handleAddToCart(relatedProduct, 1);
                              }}
                            >
                              <Plus className="w-5 h-5 text-gray-700" />
                            </button>
                          </div>
                        </div>
                      </a>
                    </div>
                  );
                })
              ) : (
                <div className="w-full text-center py-12">
                  <p className="text-gray-500">No related products available.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <CustomAuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}