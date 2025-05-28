'use client';

import { createClient } from '@supabase/supabase-js';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { useState, useEffect, use } from 'react';
import NewPage from '@/app/new/page';

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
      <div >
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

          {/* Right: Store Information */}
          <div className="md:w-1/3 p-8 bg-white/90 rounded-3xl shadow-2xl border border-green-100 flex flex-col justify-between min-h-[400px]">
            <div>
              <p className="text-gray-500 text-sm mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v4a1 1 0 001 1h3m10 0h3a1 1 0 001-1V7m-1 4V7a2 2 0 00-2-2H5a2 2 0 00-2 2v4m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2" /></svg>
                Your Order is Brought to you by
              </p>
              <h1 className="text-3xl font-extrabold text-green-700 mb-4 tracking-tight drop-shadow-sm">{store.name}</h1>
              <div className="flex items-start mb-4">
                <svg className="w-5 h-5 text-red-500 mr-2 mt-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-600 text-base">{store.address}</span>
              </div>
              <div className="flex flex-col gap-2 mb-6">
                <div className="flex items-center gap-2 text-gray-700">
                  <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 10c-4.41 0-8-1.79-8-4V6c0-2.21 3.59-4 8-4s8 1.79 8 4v8c0 2.21-3.59 4-8 4z" /></svg>
                  <span className="font-semibold">Delivery Fee:</span> <span className="text-green-700">${store.delivery_fee || 0}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" /></svg>
                  <span className="font-semibold">Delivery Time:</span> <span className="text-green-700">{store.delivery_time || '30-45 min'}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <svg className="w-5 h-5 text-pink-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 10c-4.41 0-8-1.79-8-4V6c0-2.21 3.59-4 8-4s8 1.79 8 4v8c0 2.21-3.59 4-8 4z" /></svg>
                  <span className="font-semibold">Price Level:</span> <span className="text-green-700">{store.price || '$$'}</span>
                </div>
              </div>
              <button className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold py-3 px-6 rounded-xl hover:from-green-600 hover:to-blue-600 shadow-lg transition-all text-lg mt-2">
                Shop Now
              </button>
            </div>
          </div>
        </div>
        <div className="mt-12">
          <NewPage/>
        </div>
      </div>
    </div>
  );
}