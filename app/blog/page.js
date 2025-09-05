'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

const SkeletonLoader = () => (
  <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-pulse">
    <div className="h-8 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map((_, i) => (
        <div key={i} className="bg-white p-4 rounded-lg shadow">
          <div className="h-48 bg-gray-200 rounded mb-4"></div>
          <div className="h-6 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      ))}
    </div>
  </div>
);

export default function BlogList() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        setLoading(true);
        setError('');
        const { data, error } = await supabase
          .from('blogs')
          .select('*')
          .eq('status', 'published')
          .order('published_at', { ascending: false });

        if (error) throw error;
        setBlogs(data || []);
      } catch (err) {
        console.error('Failed to fetch blogs:', err.message);
        setError('Failed to load blogs. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchBlogs();
  }, []);

  return (
    <div className="w-full px-4 sm:px-6 mt-20 lg:px-8 py-12 bg-gray-50 min-h-screen">
      <h1 className="text-4xl font-bold text-gray-900 mb-10 text-center">Our Blog</h1>

      {loading ? (
        <SkeletonLoader />
      ) : error ? (
        <p className="text-red-600 text-center text-lg">{error}</p>
      ) : blogs.length === 0 ? (
        <p className="text-gray-600 text-center text-lg">No blogs published yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blogs.map((blog) => (
            <Link href={`/blog/${blog.slug}`} key={blog.id} className="block group">
              <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300 transform group-hover:scale-[1.02]">
                <div className="relative h-56 w-full">
                  <Image
                    src={blog.image_url || '/placeholder-blog.jpg'}
                    alt={blog.title}
                    fill
                    className="object-cover rounded-t-xl group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3 line-clamp-2">{blog.title}</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Published on{' '}
                    {new Date(blog.published_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="text-gray-700 text-base mb-4 line-clamp-3">{blog.content}</p>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition duration-200">
                    Read More
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}