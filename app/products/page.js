'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// Main categories for UI
const mainCategories = [
  { id: 100, name: 'Food & Drinks' },
  { id: 200, name: 'Beauty & Personal Care' },
  { id: 300, name: 'Household Essentials' },
  { id: 400, name: 'Gym & Fitness' },
  { id: 500, name: 'Clothing' },
  { id: 600, name: 'Furniture' },
  { id: 700, name: 'Electronics' },
  { id: 800, name: 'Books & Media' },
]

// Mapping of main category IDs to their subcategory IDs
const categoryMapping = {
  100: [2, 101, 102, 103, 104, 105, 106, 107, 108], // Food & Drinks
  200: [201, 202, 203, 204, 205, 206], // Beauty & Personal Care
  300: [301, 302, 303, 304, 305, 306], // Household Essentials
  400: [401, 402, 403, 404], // Gym & Fitness
  500: [501, 502, 503, 504], // Clothing
  600: [601, 602, 603, 604], // Furniture
  700: [1, 701, 702, 704], // Electronics
  800: [801, 802, 803, 804], // Books & Media
}

// Helper to normalize image path and return the first valid image
function normalizeImagePath(path) {
  const defaultImage = '/placeholder-product.jpg'
  
  if (!path) {
    console.warn('normalizeImagePath: Received null or undefined path')
    return defaultImage
  }

  const validImageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']

  if (Array.isArray(path)) {
    const validImage = path
      .map(p => p?.trim())
      .find(p => p && validImageExtensions.some(ext => p.toLowerCase().endsWith(ext)))

    if (validImage) {
      return validImage.replace(/^(\.\.\/)+assets\//, '/')
    }
    console.warn('normalizeImagePath: No valid image found in array:', path)
    return defaultImage
  }

  if (typeof path !== 'string') {
    console.warn('normalizeImagePath: Invalid path type:', path)
    return defaultImage
  }

  const trimmedPath = path.trim()
  if (!trimmedPath || !validImageExtensions.some(ext => trimmedPath.toLowerCase().endsWith(ext))) {
    console.warn('normalizeImagePath: Invalid or empty image path:', trimmedPath)
    return defaultImage
  }

  return trimmedPath.replace(/^(\.\.\/)+assets\//, '/')
}

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sortOrder] = useState('desc')
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [supermarkets, setSupermarkets] = useState({})

  // Set categories to mainCategories
  useEffect(() => {
    setCategories(mainCategories)
  }, [])

  // Fetch supermarkets
  useEffect(() => {
    const fetchSupermarkets = async () => {
      try {
        const { data, error } = await supabase
          .from('supermarkets')
          .select('id, name')
        if (error) {
          console.warn('Error fetching supermarkets:', error.message)
          return
        }
        const supermarketMap = data.reduce((acc, { id, name }) => {
          acc[id] = name
          return acc
        }, {})
        setSupermarkets(supermarketMap)
      } catch (err) {
        console.warn('Unexpected error fetching supermarkets:', err.message)
      }
    }
    fetchSupermarkets()
  }, [])

  // Fetch products
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError('')

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

  // Filter products by selected main category
  const filteredProducts = selectedCategory
    ? products.filter(p => categoryMapping[selectedCategory]?.includes(p.categoryid))
    : products

  // Find selected category name
  const selectedCategoryName = selectedCategory
    ? (mainCategories.find(c => c.id === c.id === selectedCategory)?.name || 'Category')
    : 'All Products'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 bg-gray-100 min-h-screen">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-6 sm:mb-8">Browse Products</h1>
      
      {/* Category Filters */}
      <div className="mb-6 sm:mb-8 overflow-x-auto no-scrollbar">
        <div className="flex flex-nowrap gap-3 pb-2">
          <button
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-all duration-200 ${selectedCategory === null ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-200'}`}
            onClick={() => setSelectedCategory(null)}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-all duration-200 ${selectedCategory === cat.id ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-200'}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4 sm:mb-6">{selectedCategoryName}</h2>

      {/* Error Message */}
      {error && (
        <div className="mb-6 text-red-500 bg-red-100 p-4 rounded-lg text-center text-sm sm:text-base">{error}</div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredProducts.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {filteredProducts.map(product => (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
            >
              {/* Product Image */}
              <div className="relative w-full h-48 sm:h-56 bg-gray-100">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-contain p-4"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
              </div>

              {/* Product Details */}
              <div className="p-4 sm:p-5 flex flex-col flex-grow">
                <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-2 line-clamp-2">{product.name}</h2>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
                <div className="flex flex-col gap-1 text-sm text-gray-500 mb-3">
                  <span>Quantity: {product.quantity}</span>
                  {supermarkets[product.supermarket_id] && (
                    <span>Supermarket: {supermarkets[product.supermarket_id]}</span>
                  )}
                </div>
                <div className="mt-auto">
                  <span className="text-blue-600 font-bold text-base sm:text-lg">${product.price.toFixed(2)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex justify-center items-center h-64">
          <span className="text-gray-500 text-base sm:text-lg">No products found.</span>
        </div>
      )}

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  )
}