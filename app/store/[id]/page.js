'use client';

import { createClient } from '@supabase/supabase-js';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { useState, useEffect, use } from 'react';
import Link from 'next/link';


// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function StoreDetailPage({ params }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [store, setStore] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const id = use(params).id;

  useEffect(() => {
    const fetchStore = async () => {
      try {
        const { data, error } = await supabase
          .from('supermarkets')
          .select(`
            id,
            name,
            address,
            price,
            delivery_time,
            delivery_fee,
            main_image,
            gallery_images
          `)
          .eq('id', id)
          .single();

        if (error) {
          setError(error);
          return;
        }
        setStore(data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStore();
  }, [id]);

  // Fetch products and categories for this supermarket
  useEffect(() => {
    if (!id) return;
    const fetchProductsAndCategories = async () => {
      const [{ data: productsData }, { data: categoriesData }] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .eq('supermarketid', id),
        supabase
          .from('categories')
          .select('*'),
      ]);
      setProducts(productsData || []);
      setCategories(categoriesData || []);
    };
    fetchProductsAndCategories();
  }, [id]);

  // Helper to get product image
  const getProductImage = (product) => {
    const img = product.image || product.image_url;
    if (!img) return '/placeholder-product.jpg';
    if (img.startsWith('http://') || img.startsWith('https://')) return img;
    if (img.startsWith('/')) return img;
    // If it's just a filename or relative path, prepend '/'
    return `/${img}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error || !store) return notFound();

  const allImages = [store.main_image, ...(store.gallery_images || [])];

  return (
    <div className="min-h-screen bg-gradient-to-br mt-17 from-green-50 via-white to-blue-50 py-10 px-2 md:px-6">
      <div>
        <div className="flex flex-col md:flex-row gap-10">
          {/* Left: Image Gallery Section */}
          <div className="md:w-2/3">
            {/* Main Image */}
            <div className="relative w-full h-[400px] rounded-3xl overflow-hidden mb-4 shadow-2xl border border-green-100 bg-white">
              <Image
                src={allImages[currentImageIndex]?.startsWith('/') || allImages[currentImageIndex]?.startsWith('http') 
                  ? allImages[currentImageIndex] 
                  : `/${allImages[currentImageIndex]}` || '/placeholder-store.jpg'}
                alt={store.name}
                fill
                className="object-cover transition-transform duration-300 hover:scale-105"
                priority
              />
            </div>

            {/* Image Navigation Dots */}
            <div className="flex justify-center gap-2 mb-4">
              {allImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 border ${currentImageIndex === idx ? 'bg-green-600 w-4 border-green-600' : 'bg-gray-300 border-gray-300'}`}
                  aria-label={`Show image ${idx + 1}`}
                />
              ))}
            </div>

            {/* Thumbnails */}
            <div className="flex gap-4 overflow-x-auto pb-4">
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`flex-none relative w-24 h-16 rounded-lg overflow-hidden border transition-all duration-200 ${currentImageIndex === idx ? 'ring-2 ring-green-500 border-green-300' : 'border-gray-200'}`}
                  aria-label={`Thumbnail ${idx + 1}`}
                >
                  <Image
                    src={img?.startsWith('/') || img?.startsWith('http') ? img : `/${img}` || '/placeholder-thumbnail.jpg'}
                    alt={`${store.name} thumbnail ${idx + 1}`}
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-200"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Right: Store Information (Simple) */}
          <div className="md:w-1/3 p-8 bg-white/90 rounded-3xl shadow-2xl border border-green-100 flex flex-col justify-center min-h-[400px]">
            <div>
              <h1 className="text-3xl font-extrabold text-green-700 mb-4 tracking-tight drop-shadow-sm">{store.name}</h1>
              <div className="flex items-start mb-4">
                <span className="text-gray-600 text-base">{store.address}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-12">
          {/* Products grouped by category */}
          {categories.length > 0 && products.length > 0 ? (
            categories.map(category => {
              const categoryProducts = products.filter(p => p.categoryid === category.id);
              if (categoryProducts.length === 0) return null;
              return (
                <div key={category.id} className="mb-10">
                  <h2 className="text-2xl font-bold text-green-800 mb-4">{category.name}</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {categoryProducts.map(product => (
                      <Link key={product.id} href={`/products/${product.id}`} className="block hover:shadow-lg transition-shadow duration-200">
                        <div className="bg-white rounded-xl shadow p-4 flex flex-col items-center border border-green-100 h-full">
                          <div className="w-full h-40 relative mb-3">
                            <Image
                              src={getProductImage(product)}
                              alt={product.name}
                              fill
                              className="object-contain rounded-lg"
                            />
                          </div>
                          <div className="w-full flex-1 flex flex-col justify-between">
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">{product.name}</h3>
                            <p className="text-gray-500 text-sm mb-2">{product.description}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-green-700 font-bold text-lg">${product.price}</span>
                              {/* Add to cart or other actions can go here */}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-gray-400 text-center py-12 text-lg">No products found for this supermarket.</div>
          )}
        </div>
      </div>
    </div>
  );
}