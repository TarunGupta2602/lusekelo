'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image' // Add this import

// Move this constant outside the component
const defaultCategoryNames = ["Food & Drinks", "Household Essentials", "Beauty & Personal Care"]

// Skeleton loader for category
const CategorySkeleton = () => (
  <div className="mb-12 bg-white rounded-xl shadow-sm p-6">
    <div className="flex justify-between items-center mb-6">
      <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
      <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-4 animate-pulse"></div>
          <div className="h-32 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
      ))}
    </div>
  </div>
)

export default function NewPage() {
  const [electronics, setElectronics] = useState([])
  const [breakfast, setBreakfast] = useState([])
  const [loading, setLoading] = useState(true)
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [productsLoading, setProductsLoading] = useState(true)
  const [categories, setCategories] = useState([])
  const [expandedSections, setExpandedSections] = useState({})
  const [showAllCategories, setShowAllCategories] = useState(false)

  // Normalize image paths
  const normalizeImagePath = (path) => {
    if (!path) return ''
    return path.replace(/^(\.\.\/)+assets\//, '/')
  }

  // Fetch categories with optimized loading
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true)
        const res = await fetch('/api/categories')
        const data = await res.json()
        if (data.error) {
          throw new Error(data.error)
        }
        
        // Sort to prioritize our default categories
        const sortedCategories = [...data].sort((a, b) => {
          const aIndex = defaultCategoryNames.indexOf(a.name)
          const bIndex = defaultCategoryNames.indexOf(b.name)
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
          if (aIndex !== -1) return -1
          if (bIndex !== -1) return 1
          return 0
        })
        
        setCategories(sortedCategories)
      } catch (err) {
        console.error('Failed to fetch categories:', err)
      } finally {
        setCategoriesLoading(false)
        setLoading(false)
      }
    }
    
    fetchCategories()
  }, [defaultCategoryNames]) // Add as dependency

  // Fetch products with optimized loading
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setProductsLoading(true)
        const res = await fetch('/api/products')
        const productsData = await res.json()
        const electronicsProducts = productsData.filter(product => product.categoryid === 1)
        const breakfastProducts = productsData.filter(product => product.categoryid === 2)
        setElectronics(electronicsProducts)
        setBreakfast(breakfastProducts)
      } catch (err) {
        console.error('Failed to fetch products:', err)
      } finally {
        setProductsLoading(false)
        setLoading(false)
      }
    }
    fetchProducts()
  }, [])

  // Toggle section expansion
  const toggleSection = (categoryId) => {
    setExpandedSections(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }))
  }

  // Define CSS styles
  const style = `
    .no-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .no-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    .category-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 1rem;
    }
    .category-transition {
      transition: all 0.3s ease-in-out;
    }
    .category-card {
      height: 100%;
      transition: transform 0.2s ease-in-out;
    }
    .category-card:hover {
      transform: translateY(-4px);
    }
    .product-scroll {
      scroll-behavior: smooth;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      -ms-overflow-style: none;
      padding: 0.5rem;
    }
    .product-scroll::-webkit-scrollbar {
      display: none;
    }
    .product-card {
      flex: 0 0 auto;
      width: 240px;
      scroll-snap-align: start;
    }
    .scroll-container {
      scroll-snap-type: x mandatory;
      scroll-padding: 1rem;
    }
    .skeleton-pulse {
      animation: pulse 1.5s ease-in-out 0.5s infinite;
    }
    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }
  `

  // Skeleton loader for product section
  const ProductSectionSkeleton = () => (
    <div className="mb-12">
      <div className="flex justify-between items-center mb-6">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
      </div>
      <div className="flex space-x-4 overflow-x-auto pb-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-none w-64 bg-white rounded-xl shadow-sm p-4">
            <div className="mb-4 h-48 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse"></div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="ml-5 mr-5 ">
      <style dangerouslySetInnerHTML={{ __html: style }} />
      
      {/* Categories Section */}
      <div className="mb-12">
        {categoriesLoading ? (
          <>
            <CategorySkeleton />
            <CategorySkeleton />
            <CategorySkeleton />
          </>
        ) : categories.length ? (
          <>
            {/* Display only the three default categories when not showing all */}
            {(showAllCategories ? categories : categories.filter(cat => defaultCategoryNames.includes(cat.name)))
              .filter(cat => cat.children && cat.children.length > 0)
              .map((parentCategory) => (
                <div key={parentCategory.id} className="mb-12 bg-white rounded-xl shadow-lg p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">{parentCategory.name}</h2>
                    <button
                      onClick={() => toggleSection(parentCategory.id)}
                      className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-green-100 via-green-200 to-green-300 text-green-800 rounded-xl font-semibold shadow hover:from-green-200 hover:to-green-400 hover:text-green-900 transition-all border border-green-200 focus:outline-none focus:ring-2 focus:ring-green-200"
                    >
                      {expandedSections[parentCategory.id] ? 'Show Less' : 'See All'}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-5 w-5 transition-transform ${expandedSections[parentCategory.id] ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  <div className="category-grid">
                    {parentCategory.children
                      .slice(0, expandedSections[parentCategory.id] ? undefined : 4)
                      .map((childCategory) => (
                        <Link
                          key={childCategory.id}
                          href={`/new/${childCategory.id}`}
                          className="category-card bg-white rounded-xl border border-gray-100 p-4 hover:shadow-lg flex flex-col"
                          style={{ minHeight: 320 }}
                        >
                          <div className="flex flex-col h-full">
                            <div className="flex-grow flex items-center justify-center mb-4">
                              {childCategory.image ? (
                                <Image
                                  src={normalizeImagePath(childCategory.image)}
                                  alt={childCategory.name}
                                  width={220}
                                  height={180}
                                  className="object-contain w-full h-40 rounded-lg"
                                  style={{ maxHeight: 180, maxWidth: "100%" }}
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-40 flex items-center justify-center bg-gray-100 rounded-lg">
                                  <span className="text-gray-400">No image</span>
                                </div>
                              )}
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-2 text-center">{childCategory.name}</h3>
                            <p className="text-sm text-gray-600 mb-2 text-center">{childCategory.description}</p>
                          </div>
                        </Link>
                      ))}
                  </div>
                </div>
              ))}
            {/* Single "Explore All Categories" button */}
            <div className="flex items-center justify-center w-full">
              <button 
                className="w-full max-w-xs py-4 mt-8 text-lg text-center bg-gradient-to-r from-green-400 via-green-500 to-green-600 text-white rounded-2xl font-bold shadow-xl hover:from-green-500 hover:to-green-700 hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2 border-2 border-green-400 focus:outline-none focus:ring-4 focus:ring-green-200"
                onClick={() => setShowAllCategories(!showAllCategories)}
              >
                {showAllCategories ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                    Show Fewer Categories
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Explore All Categories
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="h-64 flex items-center justify-center">
            <p className="text-gray-500">No categories found.</p>
          </div>
        )}
      </div>

      {/* Banner */}
      <div className="flex flex-col md:flex-row justify-between mx-auto w-full bg-[#013033] rounded-lg py-10 px-6 mb-12">
        <div className="flex flex-col my-auto space-y-6 md:w-1/2">
          <h3 className="text-white text-4xl font-bold">
            Smoke Corner
          </h3>
          <p className="text-gray-300 font-thin text-md">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.
          </p>
          <div className="px-8 py-3 w-fit rounded-lg bg-[#BBEB6D] shadow-lg text-black text-center hover:bg-[#a5d55f] transition-colors cursor-pointer">
            <h3 className="text-md font-medium">
              Shop Now
            </h3>
          </div>
        </div>

        <div className="mt-6 md:mt-0 flex justify-center md:justify-end md:w-1/2">
          <Image
            src="/Marlboro.svg"
            alt="smoke corner"
            width={450}
            height={300}
            className="w-full max-w-[450px]"
            priority
          />
        </div>
      </div>

      {/* Products Sections */}
      <div>
        {/* Electronics Products */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Electronics Essentials</h2>
            <Link href="/electronics" className="text-green-600 hover:text-green-700 font-medium flex items-center">
              View All
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
          <div className="relative">
            {productsLoading ? (
              <div className="flex space-x-4 overflow-x-auto pb-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex-none w-64 bg-white rounded-2xl shadow-lg p-4 border border-gray-100">
                    <div className="mb-4 h-48 bg-gray-200 rounded-xl skeleton-pulse"></div>
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-2 skeleton-pulse"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/4 skeleton-pulse"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto scroll-container product-scroll">
                <div className="flex space-x-6 pb-4">
                  {electronics.length ? (
                    electronics.map((product) => (
                      <Link href={`/products/${product.id}`} key={product.id}>
                        <div className="product-card bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-2xl transition-shadow duration-200 p-4 flex flex-col group relative min-h-[340px]">
                          {product.image ? (
                            <div className="mb-4 aspect-[4/3] w-full bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center">
                              <Image
                                src={normalizeImagePath(product.image)}
                                alt={product.name}
                                width={320}
                                height={160}
                                className="object-contain w-full h-40 group-hover:scale-105 transition-transform duration-200"
                                loading="lazy"
                              />
                            </div>
                          ) : (
                            <div className="mb-4 h-40 bg-gray-100 rounded-xl flex items-center justify-center">
                              <span className="text-gray-400">No image</span>
                            </div>
                          )}
                          <h3 className="text-base font-semibold text-gray-800 line-clamp-2 mb-1">{product.name}</h3>
                          <div className="flex items-center justify-between mt-auto">
                            <span className="inline-block bg-green-100 text-green-700 font-bold px-3 py-1 rounded-full text-sm shadow-sm">${product.price}</span>
                            <button className="flex items-center justify-center w-9 h-9 bg-green-500 text-white rounded-full hover:bg-green-600 shadow-md transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="text-gray-500 p-4">No Electronics products found.</p>
                  )}
                </div>
              </div>
            )}
            <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -ml-4 hidden md:block">
              <button className="bg-white rounded-full p-2 shadow-md hover:bg-gray-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>
            <div className="absolute top-1/2 right-0 transform -translate-y-1/2 -mr-4 hidden md:block">
              <button className="bg-white rounded-full p-2 shadow-md hover:bg-gray-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </section>

        {/* Breakfast Products */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Breakfast Essentials</h2>
            <Link href="/breakfast" className="text-green-600 hover:text-green-700 font-medium flex items-center">
              View All
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
          <div className="relative">
            {productsLoading ? (
              <div className="flex space-x-4 overflow-x-auto pb-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex-none w-64 bg-white rounded-2xl shadow-lg p-4 border border-gray-100">
                    <div className="mb-4 h-48 bg-gray-200 rounded-xl skeleton-pulse"></div>
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-2 skeleton-pulse"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/4 skeleton-pulse"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto scroll-container product-scroll">
                <div className="flex space-x-6 pb-4">
                  {breakfast.length ? (
                    breakfast.map((product) => (
                      <Link href={`/products/${product.id}`} key={product.id}>
                        <div className="product-card bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-2xl transition-shadow duration-200 p-4 flex flex-col group relative min-h-[340px]">
                          {product.image ? (
                            <div className="mb-4 aspect-[4/3] w-full bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center">
                              <Image
                                src={normalizeImagePath(product.image)}
                                alt={product.name}
                                width={320}
                                height={160}
                                className="object-contain w-full h-40 group-hover:scale-105 transition-transform duration-200"
                                loading="lazy"
                              />
                            </div>
                          ) : (
                            <div className="mb-4 h-40 bg-gray-100 rounded-xl flex items-center justify-center">
                              <span className="text-gray-400">No image</span>
                            </div>
                          )}
                          <h3 className="text-base font-semibold text-gray-800 line-clamp-2 mb-1">{product.name}</h3>
                          <div className="flex items-center justify-between mt-auto">
                            <span className="inline-block bg-green-100 text-green-700 font-bold px-3 py-1 rounded-full text-sm shadow-sm">${product.price}</span>
                            <button className="flex items-center justify-center w-9 h-9 bg-green-500 text-white rounded-full hover:bg-green-600 shadow-md transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="text-gray-500 p-4">No Breakfast products found.</p>
                  )}
                </div>
              </div>
            )}
            <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -ml-4 hidden md:block">
              <button className="bg-white rounded-full p-2 shadow-md hover:bg-gray-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>
            <div className="absolute top-1/2 right-0 transform -translate-y-1/2 -mr-4 hidden md:block">
              <button className="bg-white rounded-full p-2 shadow-md hover:bg-gray-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}