
'use client'
import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

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

// Helper to normalize image path for both strings and arrays, with URL validation
function normalizeImagePath(path) {
  const defaultImage = '/placeholder-product.jpg'
  
  if (!path) {
    console.warn('normalizeImagePath: Received null or undefined path')
    return [defaultImage]
  }

  const validImageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']

  if (Array.isArray(path)) {
    const normalized = path
      .map((p, index) => {
        if (!p || typeof p !== 'string') {
          console.warn(`normalizeImagePath: Invalid path at index ${index}:`, p)
          return null
        }
        const trimmedPath = p.trim()
        if (!validImageExtensions.some(ext => trimmedPath.toLowerCase().endsWith(ext))) {
          console.warn(`normalizeImagePath: Invalid image extension for path at index ${index}:`, trimmedPath)
          return null
        }
        return trimmedPath.replace(/^(\.\.\/)+assets\//, '/')
      })
      .filter(p => p)

    return normalized.length > 0 ? normalized : [defaultImage]
  }

  if (typeof path !== 'string') {
    console.warn('normalizeImagePath: Invalid path type:', path)
    return [defaultImage]
  }

  const trimmedPath = path.trim()
  if (!trimmedPath) {
    console.warn('normalizeImagePath: Empty string path')
    return [defaultImage]
  }

  if (!validImageExtensions.some(ext => trimmedPath.toLowerCase().endsWith(ext))) {
    console.warn('normalizeImagePath: Invalid image extension for path:', trimmedPath)
    return [defaultImage]
  }

  return [trimmedPath.replace(/^(\.\.\/)+assets\//, '/')]
}

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sortOrder] = useState('desc')
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [supermarkets, setSupermarkets] = useState({})
  const scrollRefs = useRef({})
  const [currentImage, setCurrentImage] = useState({})

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
          images: normalizeImagePath(product.image)
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
    ? (mainCategories.find(c => c.id === selectedCategory)?.name || 'Category')
    : 'All Products'

  // Scroll handlers for image galleries
  const scrollLeft = (productId) => {
    if (scrollRefs.current[productId]) {
      scrollRefs.current[productId].scrollBy({ left: -260, behavior: 'smooth' })
    }
  }

  const scrollRight = (productId) => {
    if (scrollRefs.current[productId]) {
      scrollRefs.current[productId].scrollBy({ left: 260, behavior: 'smooth' })
    }
  }

  // Track current image for scroll indicators
  const handleScroll = (productId) => {
    const scrollContainer = scrollRefs.current[productId]
    if (scrollContainer) {
      const scrollLeft = scrollContainer.scrollLeft
      const imageWidth = 220 // Match max-w-[220px]
      const index = Math.round(scrollLeft / imageWidth)
      setCurrentImage(prev => ({ ...prev, [productId]: index }))
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-teal-900 mb-4 sm:mb-6">Browse Products</h1>
      
      {/* Category Filters */}
      <div className="mb-4 sm:mb-6 overflow-x-auto no-scrollbar">
        <div className="flex flex-nowrap gap-2 sm:gap-3 pb-2">
          <button
            className={`flex-shrink-0 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-sm sm:text-base font-semibold transition-all duration-300 ${selectedCategory === null ? 'bg-teal-600 text-white shadow-md' : 'bg-white text-teal-700 border border-teal-300 hover:bg-teal-100'}`}
            onClick={() => setSelectedCategory(null)}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`flex-shrink-0 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-sm sm:text-base font-semibold transition-all duration-300 ${selectedCategory === cat.id ? 'bg-teal-600 text-white shadow-md' : 'bg-white text-teal-700 border border-teal-300 hover:bg-teal-100'}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-700 mb-4 sm:mb-6">{selectedCategoryName}</h2>

      {/* Error Message */}
      {error && (
        <div className="mb-4 sm:mb-6 text-red-600 text-center text-sm sm:text-base">{error}</div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <span className="text-gray-500 text-base sm:text-lg animate-pulse">Loading products...</span>
        </div>
      ) : filteredProducts.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredProducts.map(product => (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="bg-white rounded-xl shadow-md p-4 sm:p-5 flex flex-col hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group"
            >
              {/* Image Gallery */}
              <div className="relative mb-4 sm:mb-5">
                <div
                  ref={(el) => (scrollRefs.current[product.id] = el)}
                  onScroll={() => handleScroll(product.id)}
                  className="flex overflow-x-auto gap-3 scroll-smooth no-scrollbar snap-x snap-mandatory justify-center"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {product.images.length > 0 ? (
                    product.images.map((image, index) => (
                      <div key={index} className="flex-shrink-0 snap-center w-full max-w-[220px] sm:max-w-[260px] flex justify-center">
                        <Image
                          src={image}
                          alt={`${product.name} image ${index + 1}`}
                          width={220}
                          height={160}
                          className="object-contain rounded-lg w-full h-36 sm:h-44 bg-gray-100"
                          loading={index > 0 ? 'lazy' : undefined}
                        />
                      </div>
                    ))
                  ) : (
                    <div className="w-full h-36 sm:h-44 flex items-center justify-center bg-gray-100 rounded-lg snap-center">
                      <span className="text-gray-400 text-sm sm:text-base">No image</span>
                    </div>
                  )}
                </div>
                {product.images.length > 1 && (
                  <>
                    <button
                      onClick={(e) => { e.preventDefault(); scrollLeft(product.id); }}
                      aria-label={`Scroll left for ${product.name} images`}
                      className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-1.5 sm:p-2 shadow-md hover:bg-teal-100 transition-all duration-300 sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <ChevronLeft size={16} className="text-teal-700" />
                    </button>
                    <button
                      onClick={(e) => { e.preventDefault(); scrollRight(product.id); }}
                      aria-label={`Scroll right for ${product.name} images`}
                      className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-1.5 sm:p-2 shadow-md hover:bg-teal-100 transition-all duration-300 sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <ChevronRight size={16} className="text-teal-700" />
                    </button>
                    {/* Mobile Scroll Indicators */}
                    <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 sm:hidden">
                      {product.images.map((_, index) => (
                        <span
                          key={index}
                          className={`w-1.5 h-1.5 rounded-full ${index === (currentImage[product.id] || 0) ? 'bg-teal-600' : 'bg-gray-300'} transition-all duration-300`}
                        ></span>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Product Details */}
              <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-2 line-clamp-2">{product.name}</h2>
              <p className="text-gray-600 text-sm mb-2 line-clamp-2 sm:line-clamp-3">{product.description}</p>
              <div className="flex flex-col gap-1 text-sm text-gray-500 mb-2">
                <span>Quantity: {product.quantity}</span>
                {supermarkets[product.supermarket_id] && (
                  <span>Supermarket: {supermarkets[product.supermarket_id]}</span>
                )}
              </div>
              <div className="flex items-center justify-between mt-auto">
                <span className="text-green-700 font-bold text-base sm:text-lg">${product.price.toFixed(2)}</span>
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
        .snap-x {
          scroll-snap-type: x mandatory;
        }
        .snap-center {
          scroll-snap-align: center;
        }
      `}</style>
    </div>
  )
}
