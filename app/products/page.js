'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// Helper to normalize image path if needed
function normalizeImagePath(path) {
  if (!path) return '';
  return path.replace(/^(\.\.\/)+assets\//, '/');
}

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sortOrder] = useState('desc') // or 'asc' if you want oldest first
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)

  useEffect(() => {
    // Fetch categories
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/categories')
        const data = await res.json()
        if (Array.isArray(data)) {
          setCategories(data)
        }
      } catch (err) {
        // ignore for now
      }
    }
    fetchCategories()
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError('')

        // Fetch products from products table
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('id, name, price, image, quantity, description, date_added, supermarket_id, categoryid')
          .order('date_added', { ascending: sortOrder === 'asc' })

        if (productsError) {
          setError('Error fetching products: ' + productsError.message)
          setLoading(false)
          return
        }

        if (!productsData || productsData.length === 0) {
          setError('Products not found. No products available in the inventory.')
          setLoading(false)
          return
        }

        // Normalize image paths
        const normalizedProducts = productsData.map(product => ({
          ...product,
          image: normalizeImagePath(product.image)
        }))

        setProducts(normalizedProducts)
        setLoading(false)
      } catch (err) {
        setError('Unexpected error: ' + err.message)
        setLoading(false)
      }
    }

    fetchData()
  }, [sortOrder])

  // Filter products by selected category
  const filteredProducts = selectedCategory
    ? products.filter(p => p.categoryid === selectedCategory)
    : products

  // Find selected category name
  const selectedCategoryName = selectedCategory
    ? (categories.find(c => c.id === selectedCategory)?.name || 'Category')
    : 'All Products'

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-2 text-teal-900">Browse Products</h1>
      <div className="mb-6 flex flex-wrap gap-2 items-center">
        <button
          className={`px-4 py-2 rounded-full border ${selectedCategory === null ? 'bg-teal-600 text-white' : 'bg-white text-teal-700 border-teal-200'} font-semibold shadow-sm transition`}
          onClick={() => setSelectedCategory(null)}
        >
          All
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`px-4 py-2 rounded-full border ${selectedCategory === cat.id ? 'bg-teal-600 text-white' : 'bg-white text-teal-700 border-teal-200'} font-semibold shadow-sm transition`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </div>
      <h2 className="text-xl font-semibold mb-6 text-gray-700">{selectedCategoryName}</h2>
      {error && (
        <div className="mb-6 text-red-600 text-center">{error}</div>
      )}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <span className="text-gray-400 text-lg">Loading products...</span>
        </div>
      ) : filteredProducts.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          {filteredProducts.map(product => (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="bg-white rounded-xl shadow-lg p-6 flex flex-col hover:shadow-2xl transition"
            >
              <div className="mb-4 flex justify-center">
                {product.image ? (
                  <Image
                    src={product.image}
                    alt={product.name}
                    width={260}
                    height={180}
                    className="object-contain rounded-lg w-full h-44"
                  />
                ) : (
                  <div className="w-full h-44 flex items-center justify-center bg-gray-100 rounded-lg">
                    <span className="text-gray-400">No image</span>
                  </div>
                )}
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">{product.name}</h2>
              <p className="text-gray-600 mb-2">{product.description}</p>
              <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                <span>Quantity: {product.quantity}</span>
                <span>Supermarket: {product.supermarket_id}</span>
              </div>
              <div className="flex items-center justify-between mt-auto">
                <span className="text-green-700 font-bold text-lg">${product.price}</span>
                <span className="text-xs text-gray-400">{product.date_added?.slice(0,10)}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex justify-center items-center h-64">
          <span className="text-gray-400 text-lg">No products found.</span>
        </div>
      )}
    </div>
  )
}