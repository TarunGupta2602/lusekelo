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
  const [vendor, setVendor] = useState(null);

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
            main_image,
            gallery_images,
            vendor_id,
            created_at,
            location
          `)
          .eq('id', id)
          .single();

        if (error) {
          setError(error);
          return;
        }
        setStore(data);

        // Fetch vendor information if vendor_id exists
        if (data.vendor_id) {
          const { data: vendorData } = await supabase
            .from('vendors')
            .select('name, email, phone')
            .eq('id', data.vendor_id)
            .single();
          setVendor(vendorData);
        }
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
          .eq('supermarket_id', id),
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
    return `/${img}`;
  };

  const normalizeImageUrl = (url) => {
    if (!url) return '/placeholder-store.jpg';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/')) return url;
    return url;
  };

  // Helper to safely get gallery images as array
  function getGalleryImages(gallery_images) {
    if (Array.isArray(gallery_images)) {
      // Handle array where first element might be comma-separated URLs
      const allUrls = [];
      gallery_images.forEach(item => {
        if (typeof item === 'string') {
          // Split by comma in case multiple URLs are in one string
          const urls = item.split(',').map(url => url.trim()).filter(Boolean);
          allUrls.push(...urls);
        } else if (item) {
          allUrls.push(item);
        }
      });
      return allUrls;
    }
    if (typeof gallery_images === 'string') {
      // Handle JSON string
      try {
        const parsed = JSON.parse(gallery_images);
        if (Array.isArray(parsed)) {
          return getGalleryImages(parsed); // Recursively process the parsed array
        }
      } catch (e) {
        // If not JSON, try comma-separated
        const split = gallery_images.split(',').map(url => url.trim()).filter(Boolean);
        return split;
      }
    }
    return [];
  }

  // Format location for display
  const formatLocation = (location) => {
    if (!location) return 'Location not specified';
    if (typeof location === 'object') {
      // Handle PostGIS point or other geographic data
      if (location.coordinates) {
        return `Lat: ${location.coordinates[1]}, Lng: ${location.coordinates[0]}`;
      }
      return JSON.stringify(location);
    }
    return location.toString();
  };

  // Format price
  const formatPrice = (price) => {
    if (!price) return 'Price not specified';
    return `$${parseFloat(price).toFixed(2)}`;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Date not available';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error || !store) return notFound();

  // Use helper to get gallery images
  const galleryImagesArray = getGalleryImages(store.gallery_images);

  const allImages = [];
  
  // Add main image first if it exists
  if (store.main_image) {
    allImages.push(normalizeImageUrl(store.main_image));
  }
  
  // Add gallery images
  galleryImagesArray.forEach(img => {
    if (img) {
      allImages.push(normalizeImageUrl(img));
    }
  });

  // If no images at all, use placeholder
  if (allImages.length === 0) {
    allImages.push('/placeholder-store.jpg');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br mt-17 from-green-50 via-white to-blue-50 py-10 px-2 md:px-6">
      <div>
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Left: Image Gallery Section */}
          <div className="lg:w-2/3">
            {/* Main Image */}
            <div className="relative w-full h-[400px] md:h-[500px] rounded-3xl overflow-hidden mb-4 shadow-2xl border border-green-100 bg-white">
              <Image
                src={allImages[currentImageIndex]}
                alt={store.name}
                fill
                className="object-cover transition-transform duration-300 hover:scale-105"
                priority
              />
              {/* Image counter */}
              <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                {currentImageIndex + 1} / {allImages.length}
              </div>
            </div>

            {/* Image Navigation Dots */}
            {allImages.length > 1 && (
              <div className="flex justify-center gap-2 mb-4">
                {allImages.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 border ${
                      currentImageIndex === idx 
                        ? 'bg-green-600 w-4 border-green-600' 
                        : 'bg-gray-300 border-gray-300 hover:bg-gray-400'
                    }`}
                    aria-label={`Show image ${idx + 1}`}
                  />
                ))}
              </div>
            )}

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-4 overflow-x-auto pb-4">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`flex-none relative w-24 h-16 rounded-lg overflow-hidden border transition-all duration-200 ${
                      currentImageIndex === idx 
                        ? 'ring-2 ring-green-500 border-green-300' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    aria-label={`Thumbnail ${idx + 1}`}
                  >
                    <Image
                      src={img}
                      alt={`${store.name} thumbnail ${idx + 1}`}
                      fill
                      className="object-cover hover:scale-105 transition-transform duration-200"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Store Information */}
          <div className="lg:w-1/3 p-8 bg-white/90 rounded-3xl shadow-2xl border border-green-100">
            <div className="space-y-6">
              {/* Store Name */}
              <div>
                <h1 className="text-3xl font-extrabold text-green-700 mb-2 tracking-tight drop-shadow-sm">
                  {store.name}
                </h1>
              </div>

              {/* Address */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 text-green-600 mt-1">
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Address</p>
                  <p className="text-gray-600">{store.address}</p>
                </div>
              </div>

              {/* Price */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 text-green-600 mt-1">
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Price</p>
                  <p className="text-lg font-bold text-green-700">{formatPrice(store.price)}</p>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 text-green-600 mt-1">
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Location</p>
                  <p className="text-gray-600 text-sm">{formatLocation(store.location)}</p>
                </div>
              </div>

              {/* Vendor Info */}
              {vendor && (
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-5 h-5 text-green-600 mt-1">
                    <svg fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Vendor</p>
                    <p className="text-gray-600">{vendor.name}</p>
                    {vendor.email && <p className="text-xs text-gray-500">{vendor.email}</p>}
                    {vendor.phone && <p className="text-xs text-gray-500">{vendor.phone}</p>}
                  </div>
                </div>
              )}

              {/* Gallery Images Debug Info - Remove in production */}
              <div className="mb-4 p-4 bg-gray-100 rounded-lg text-sm">
                
              </div>
              <div className="flex items-start gap-3">
                
                <div>
                  <p className="text-sm font-medium text-gray-700">Created</p>
                  <p className="text-gray-600 text-sm">{formatDate(store.created_at)}</p>
                </div>
              </div>

              {/* Store ID */}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-400">Store ID: {store.id}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Products Section */}
        <div className="mt-12">
          <h2 className="text-3xl font-bold text-green-800 mb-8 text-center">Available Products</h2>
          {categories.length > 0 && products.length > 0 ? (
            categories.map(category => {
              const categoryProducts = products.filter(p => p.categoryid === category.id);
              if (categoryProducts.length === 0) return null;
              return (
                <div key={category.id} className="mb-12">
                  <h3 className="text-2xl font-bold text-green-700 mb-6 border-b border-green-200 pb-2">
                    {category.name} ({categoryProducts.length} items)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {categoryProducts.map(product => (
                      <Link 
                        key={product.id} 
                        href={`/products/${product.id}`} 
                        className="group block hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                      >
                        <div className="bg-white rounded-xl shadow-md p-4 border border-green-100 h-full flex flex-col group-hover:border-green-300">
                          <div className="w-full h-40 relative mb-4 bg-gray-50 rounded-lg overflow-hidden">
                            <Image
                              src={getProductImage(product)}
                              alt={product.name}
                              fill
                              className="object-contain group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                          <div className="flex-1 flex flex-col justify-between">
                            <div>
                              <h4 className="text-lg font-semibold text-gray-800 mb-2 line-clamp-2 group-hover:text-green-700 transition-colors">
                                {product.name}
                              </h4>
                              <p className="text-gray-500 text-sm mb-3 line-clamp-2">{product.description}</p>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-green-700 font-bold text-xl">${product.price}</span>
                              <div className="text-xs text-gray-400">
                                View Details
                              </div>
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
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 text-gray-300">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2L3 7v11a1 1 0 001 1h12a1 1 0 001-1V7l-7-5zM6 9.5a.5.5 0 01.5-.5h7a.5.5 0 010 1h-7a.5.5 0 01-.5-.5zm.5 2.5a.5.5 0 000 1h7a.5.5 0 000-1h-7z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-gray-400 text-lg">No products found for this supermarket.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}