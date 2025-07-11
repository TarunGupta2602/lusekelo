"use client";
import { createClient } from '@supabase/supabase-js';
import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Normalize image path
const normalizeImagePath = (path) => {
  if (!path) return '';
  return path.replace(/^(\.\.\/)+assets\//, '/');
};

export default function ProductDetailPage({ params }) {
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvedParams, setResolvedParams] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [cartMessage, setCartMessage] = useState("");
  const [user, setUser] = useState(null);
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
        // Fetch main product with categoryid
        const { data, error } = await supabase
          .from('products')
          .select('id, name, price, image, description, quantity, categoryid')
          .eq('id', id)
          .single();

        if (error) {
          console.error("Supabase error:", error);
          setProduct(null);
        } else {
          setProduct(data);

          // Fetch related products from same category
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

  const handleAddToCart = (productToAdd = product, qty = quantity) => {
    if (!productToAdd) return;

    const cartKey = getCartKey();
    const cart = JSON.parse(localStorage.getItem(cartKey)) || [];
    const existingItem = cart.find((item) => item.product_id === productToAdd.id);

    if (existingItem) {
      existingItem.quantity += qty;
    } else {
      cart.push({
        product_id: productToAdd.id,
        quantity: qty,
        name: productToAdd.name,
        price: productToAdd.price,
        image: productToAdd.image,
      });
    }

    localStorage.setItem(cartKey, JSON.stringify(cart));
    window.dispatchEvent(new Event("cartUpdated"));

    if (productToAdd === product) {
      setCartMessage("Product added to cart!");
      setTimeout(() => setCartMessage(""), 3000);
    }
  };

  const incrementQuantity = () => setQuantity((prev) => prev + 1);
  const decrementQuantity = () => setQuantity((prev) => (prev > 1 ? prev - 1 : 1));

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -220, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 220, behavior: 'smooth' });
    }
  };

  if (loading) return <p>Loading...</p>;
  if (!product) return <p>Product not found.</p>;

  const imagePath = normalizeImagePath(product.image);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">{product.name}</h1>
      <div className="flex flex-col md:flex-row gap-8">
        <div className="md:w-1/2">
          {imagePath ? (
            <Image
              src={imagePath}
              alt={product.name}
              width={400}
              height={400}
              className="object-contain w-full h-64 md:h-96 rounded-lg p-4 bg-white"
              priority
            />
          ) : (
            <div className="h-64 md:h-96 bg-gray-200 rounded-lg flex items-center justify-center text-gray-600">
              No Image Available
            </div>
          )}
        </div>

        <div className="md:w-1/2">
          <p className="text-sm text-gray-500 mb-1">500g</p>
          <h2 className="text-2xl font-semibold mb-2">{product.name}</h2>
          <p className="text-green-600 font-semibold text-lg mb-4">${product.price}</p>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">Quantity</span>
            <div className="flex items-center gap-2">
              <button
                onClick={decrementQuantity}
                className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center text-gray-600 hover:bg-gray-300 text-sm"
                disabled={quantity <= 1}
              >
                -
              </button>
              <span>{quantity}</span>
              <button
                onClick={incrementQuantity}
                className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center text-gray-600 hover:bg-gray-300 text-sm"
              >
                +
              </button>
            </div>
            <span className="text-sm text-red-500 ml-2">
              ⚠️ Limited Quantity Available
            </span>
          </div>

          <div className="flex items-center gap-1 mb-4">
            <span className="text-yellow-500">★</span>
            <span className="text-sm text-gray-600">4.4/5</span>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            {product.description || "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt."}
          </p>

          <div className="flex gap-4">
            <button
              onClick={() => handleAddToCart()}
              className="bg-teal-900 text-white px-6 py-2 rounded hover:bg-teal-800"
            >
              Add to cart
            </button>
            <button className="bg-lime-400 text-black px-6 py-2 rounded hover:bg-lime-500">
              Shop Now
            </button>
          </div>

          {cartMessage && <p className="text-green-500 mt-2">{cartMessage}</p>}
        </div>
      </div>

      {/* Related Products Section */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold mb-6">Related Items</h2>

        <div className="relative">
          <button 
            onClick={scrollLeft}
            className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-1 shadow-md hover:bg-gray-100"
          >
            <ChevronLeft size={24} className="text-gray-700" />
          </button>

          <div 
            ref={scrollContainerRef}
            className="flex overflow-x-auto gap-4 py-2 scroll-smooth no-scrollbar"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {relatedProducts.length > 0 ? (
              relatedProducts.map((relatedProduct) => {
                const relatedImagePath = normalizeImagePath(relatedProduct.image);
                return (
                  <div 
                    key={relatedProduct.id} 
                    className="flex-shrink-0 w-44 bg-white rounded-lg overflow-hidden shadow-sm"
                  >
                    <a href={`/products/${relatedProduct.id}`} className="block">
                      <div className="relative h-36 bg-gray-50">
                        {relatedImagePath ? (
                          <Image
                            src={relatedImagePath}
                            alt={relatedProduct.name}
                            width={160}
                            height={160}
                            className="w-full h-full object-contain p-2"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                            No Image
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="text-sm font-medium truncate">{relatedProduct.name}</h3>
                        <p className="text-xs text-gray-500 mb-2">100g Standard Portion</p>
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">${relatedProduct.price}</span>
                          <button 
                            className="bg-gray-200 rounded-md p-1 hover:bg-gray-300"
                            onClick={(e) => {
                              e.preventDefault();
                              handleAddToCart(relatedProduct, 1);
                            }}
                          >
                            <span className="text-lg">+</span>
                          </button>
                        </div>
                      </div>
                    </a>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500">No related products available.</p>
            )}
          </div>

          <button 
            onClick={scrollRight}
            className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-1 shadow-md hover:bg-gray-100"
          >
            <ChevronRight size={24} className="text-gray-700" />
          </button>
        </div>

        <style jsx>{`
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
        `}</style>
      </div>
    </div>
  );
}
