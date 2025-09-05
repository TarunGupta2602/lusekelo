'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation'; // App Router
import { supabase } from '@/lib/supabaseClient';

export default function BlogDetail() {
  const params = useParams(); // Replaces useRouter().query
  const slug = params?.slug; // Extract slug from dynamic route
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) {
      console.log('No slug provided in URL');
      setError('Invalid blog URL.');
      setLoading(false);
      return;
    }

    const fetchBlog = async () => {
      try {
        setLoading(true);
        setError('');
        console.log('Fetching blog with slug:', slug);
        const { data, error } = await supabase
          .from('blogs')
          .select('*')
          .eq('slug', slug)
          .eq('status', 'published')
          .single();

        if (error) {
          console.error('Supabase error:', error.message);
          throw error;
        }
        if (!data) {
          console.log('No blog found for slug:', slug);
          setError('Blog not found.');
        } else {
          console.log('Blog fetched:', data);
          setBlog(data);
        }
      } catch (err) {
        console.error('Failed to fetch blog:', err.message);
        setError('Failed to load blog. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchBlog();
  }, [slug]);

  if (loading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="animate-pulse h-8 w-48 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12 bg-gray-50 min-h-screen flex items-center justify-center">
        <p className="text-red-600 text-lg text-center">{error}</p>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12 bg-gray-50 min-h-screen flex items-center justify-center">
        <p className="text-gray-600 text-lg text-center">Blog not found.</p>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 mt-20 lg:px-8 py-12 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {blog.image_url && (
          <div className="relative h-96 w-full mb-8 rounded-xl overflow-hidden">
            <Image
              src={blog.image_url}
              alt={blog.title}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
          </div>
        )}
        <div className="bg-white rounded-xl shadow-sm p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{blog.title}</h1>
          <p className="text-sm text-gray-500 mb-6">
            Published on{' '}
            {new Date(blog.published_at).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
          <div className="prose prose-lg max-w-none text-gray-700 mb-8">
            {blog.content.split('\n').map((paragraph, index) => (
              <p key={index} className="mb-4">{paragraph}</p>
            ))}
          </div>
          <Link
            href="/blog"
            className="inline-block bg-gray-100 text-gray-900 px-6 py-3 rounded-md text-sm font-medium hover:bg-gray-200 transition duration-200"
          >
            ← Back to Blog
          </Link>
        </div>
      </div>
    </div>
  );
}