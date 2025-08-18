"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Normalize image URL (reuse the same function from Navbar)
const normalizeImageUrl = (input) => {
  const fallbackImage = '/placeholder-product.jpg';
  if (!input) return fallbackImage;
  if (Array.isArray(input)) {
    const normalized = input
      .map((p) => {
        if (!p) return null;
        const trimmed = String(p).trim();
        if (!trimmed) return null;
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
          try {
            new URL(trimmed);
            return trimmed;
          } catch {
            return null;
          }
        }
        const normalizedPath = trimmed.replace(/^(\.\.\/)+assets\//, '/');
        return normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
      })
      .filter((p) => p);
    return normalized.length > 0 ? normalized[0] : fallbackImage;
  }
  const urlString = String(input).trim();
  if (!urlString) return fallbackImage;
  if (urlString.startsWith('http://') || urlString.startsWith('https://')) {
    try {
      new URL(urlString);
      return urlString;
    } catch {
      return fallbackImage;
    }
  }
  const normalizedPath = urlString.replace(/^(\.\.\/)+assets\//, '/');
  return normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
};

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("query")?.trim().toLowerCase() || "";
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSearchResults = async () => {
      setLoading(true);
      try {
        // Fetch all products from Supabase
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('id, name, price, image, quantity, date_added')
          .order('date_added', { ascending: false });

        if (productsError) {
          throw new Error(productsError.message);
        }

        // Normalize images and filter by query
        const normalizedProducts = productsData.map((product) => ({
          ...product,
          image: normalizeImageUrl(product.image),
        }));

        if (query) {
          const filteredProducts = normalizedProducts.filter((product) =>
            product.name?.toLowerCase().includes(query)
          );
          setProducts(filteredProducts);
        } else {
          setProducts(normalizedProducts);
        }
      } catch (err) {
        console.error("Error fetching search results:", err);
        setError("Failed to load search results. Please try again.");
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSearchResults();
  }, [query]);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Search Results for "{query || 'All Products'}"
        </h1>

        {loading && (
          <div className="flex justify-center">
            <svg
              className="animate-spin h-8 w-8 text-gray-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8z"
              ></path>
            </svg>
          </div>
        )}

        {error && (
          <div className="text-red-600 text-center mb-4">{error}</div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="text-gray-600 text-center">
            No products found for "{query}".
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <Link
                href={`/products/${product.id}`}
                key={product.id}
                className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition duration-200"
              >
                <div className="relative w-full h-48 mb-4">
                  <Image
                    src={product.image}
                    alt={product.name || "Product Image"}
                    layout="fill"
                    objectFit="cover"
                    className="rounded-lg"
                    onError={() => console.error(`Failed to load image for product: ${product.name}`)}
                  />
                </div>
                <h2 className="text-lg font-medium text-gray-800">
                  {product.name || "Unnamed Product"}
                </h2>
                {product.price && (
                  <p className="text-green-600 font-medium">${product.price}</p>
                )}
                {product.quantity === 0 && (
                  <p className="text-red-500 text-sm">Out of stock</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}