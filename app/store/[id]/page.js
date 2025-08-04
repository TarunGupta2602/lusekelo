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

  // Normalize image URL for subcategories
  const normalizeImageUrl = (url) => {
    if (!url) return '/placeholder-store.jpg';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/')) return url;
    // Fix paths like '../../assets/vegetables.png' to '/vegetables.png'
    return url.replace(/^(\.\.\/)+assets\//, '/');
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

  // Main categories mapping
  const mainCategories = [
    { id: 100, name: 'Food & Drinks' },
    { id: 200, name: 'Beauty & Personal Care' },
    { id: 300, name: 'Household Essentials' },
    { id: 400, name: 'Gym & Fitness' },
    { id: 500, name: 'Clothing' },
    { id: 600, name: 'Furniture' },
    { id: 700, name: 'Electronics' },
    { id: 800, name: 'Books & Media' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fafbfa] via-white to-blue-50 py-14 px-2 md:px-6">
      <div>
        {/* HERO SECTION */}
        <div className="flex flex-col lg:flex-row mt-16 gap-15 mb-12 max-w-7xl mx-auto">
          {/* Left: Main Image and Gallery */}
          <div className="flex flex-col w-full lg:w-auto">
            {/* Main Image */}
            <div className="w-full lg:w-[800px] h-[400px] lg:h-[450px] rounded-2xl overflow-hidden shadow-lg bg-white mb-4 relative">
              <Image
                src={allImages[currentImageIndex]}
                alt={store.name}
                fill
                className="object-cover"
                priority
              />
            </div>
            
            {/* Gallery Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-2 justify-start overflow-x-auto pb-2">
                {allImages.slice(0, 4).map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`flex-shrink-0 w-16 h-12 lg:w-20 lg:h-16 rounded-lg overflow-hidden shadow border-2 transition-all duration-200 ${
                      currentImageIndex === idx
                        ? 'border-lime-400 ring-2 ring-lime-300'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    aria-label={`Thumbnail ${idx + 1}`}
                  >
                    <Image
                      src={img}
                      alt={`Gallery ${idx + 1}`}
                      width={80}
                      height={64}
                      className="object-cover w-full h-full"
                    />
                  </button>
                ))}
                {allImages.length > 4 && (
                  <div className="flex-shrink-0 w-16 h-12 lg:w-20 lg:h-16 rounded-lg bg-gray-100 border-2 border-gray-200 flex items-center justify-center text-gray-500 text-xs font-medium">
                    +{allImages.length - 4}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Store Info */}
          <div className="flex flex-col justify-start mt-4 w-full lg:w-auto lg:max-w-md lg:ml-8 lg:mt-0">
            <div className="text-gray-600 text-2xl mt-25 mb-8 font-medium">
              Your Order is Brought to you by
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-lime-500 mb-8 leading-tight">
              {store.name}
            </h1>
            <div className="flex items-start gap-2 mb-8">
              <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-700 text-base leading-relaxed">
                {store.address}
              </span>
            </div>
            <button className="bg-lime-400 hover:bg-lime-500 text-white font-semibold px-2 py-1 rounded-lg shadow-md transition-all duration-200 text-lg w-fit hover:shadow-lg transform hover:-translate-y-0.5">
              Shop Now
            </button>
          </div>
        </div>
        {/* END HERO SECTION */}

        {/* Main & Subcategories Section (filtered by products) */}
        <div className="mt-12">
          {mainCategories.map(mainCat => {
            // Find subcategories of this main category
            const subcats = categories.filter(cat => cat.parent_id === mainCat.id);
            // Only show subcategories that have products in this supermarket
            const subcatsWithProducts = subcats.filter(subcat => products.some(p => p.categoryid === subcat.id));
            if (subcatsWithProducts.length === 0) return null;
            return (
              <div key={mainCat.id} className="mb-12">
                <h3 className="text-2xl font-bold text-gray-800 mb-6">{mainCat.name}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {subcatsWithProducts.map((subcat) => (
                    <Link
                      key={subcat.id}
                      href={`/new/${subcat.id}?store=${id}`}
                      className="group"
                    >
                      <div className="bg-white rounded-2xl shadow-md hover:shadow-lg p-5 flex items-center justify-between border border-gray-100 transition-transform duration-200 group-hover:-translate-y-1 h-36">
                        {/* Text Section */}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 text-base mb-1 truncate">
                            {subcat.name}
                          </div>
                          <div className="text-sm text-gray-500 truncate">
                            {subcat.description}
                          </div>
                        </div>
                        {/* Image Section */}
                        {subcat.image && (
                          <div className="ml-4 flex-shrink-0">
                            <Image
                              src={normalizeImageUrl(subcat.image)}
                              alt={subcat.name}
                              width={96}
                              height={96}
                              className="object-contain"
                            />
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}