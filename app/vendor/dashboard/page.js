'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function VendorDashboard() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' for newest, 'asc' for oldest
  const [userName, setUserName] = useState('');
  const [sidebarSection, setSidebarSection] = useState('Dashboard');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const productsPerPage = 10;

  // Function to normalize image paths
  const normalizeImagePath = (path) => {
    if (!path) return '';
    return path.replace(/^(\.\.\/)+assets\//, '/');
  };

  // Fetch products and user data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        // Fetch current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          setError('User not found. Please log in again.');
          router.push('/vendor');
          return;
        }

        // Set user name (using email or user_metadata.name if available)
        setUserName(user.user_metadata?.name || user.email.split('@')[0]);

        // Fetch products from products table
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('id, name, price, image, quantity, date_added')
          .order('date_added', { ascending: sortOrder === 'asc' });

        if (productsError) {
          setError('Error fetching products: ' + productsError.message);
          setLoading(false);
          return;
        }

        if (!productsData || productsData.length === 0) {
          setError('Products not found. No products available in the inventory.');
          setLoading(false);
          return;
        }

        // Normalize image paths
        const normalizedProducts = productsData.map(product => ({
          ...product,
          image: normalizeImagePath(product.image)
        }));

        setProducts(normalizedProducts);
        setFilteredProducts(normalizedProducts);
        setLoading(false);
      } catch (err) {
        setError('Unexpected error: ' + err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, [router, sortOrder]);

  // Handle search
  useEffect(() => {
    const filtered = products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      const today = new Date();
      const productDate = new Date(product.date_added);

      if (filter === 'Today') {
        return matchesSearch && productDate.toDateString() === today.toDateString();
      } else if (filter === 'Yesterday') {
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        return matchesSearch && productDate.toDateString() === yesterday.toDateString();
      } else if (filter === 'Last 7 Days') {
        const last7Days = new Date(today);
        last7Days.setDate(today.getDate() - 7);
        return matchesSearch && productDate >= last7Days;
      } else if (filter === 'Last 30 Days') {
        const last30Days = new Date(today);
        last30Days.setDate(today.getDate() - 30);
        return matchesSearch && productDate >= last30Days;
      }
      return matchesSearch;
    });

    setFilteredProducts(filtered);
    setCurrentPage(1); // Reset to first page on search or filter change
  }, [searchQuery, filter, products]);

  // Handle sign out
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/vendor');
  };

  // Handle edit inventory
  const handleEditInventory = () => {
    router.push('/vendor/add-inventory');
  };

  // Toggle sort order
  const handleSortByNewest = () => {
    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
  };

  // Determine stock status
  const getStockStatus = (quantity) => {
    if (quantity === 0) return { text: 'Out of Stock', color: 'bg-red-100 text-red-600' };
    if (quantity <= 5) return { text: 'Low Stock', color: 'bg-yellow-100 text-yellow-600' };
    return { text: 'In Stock', color: 'bg-green-100 text-green-600' };
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + productsPerPage);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Generate page numbers
  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  // Redirect to /vendor if not logged in
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/vendor');
      }
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const section = params.get('section');
    if (section === 'inventory') {
      setSidebarSection('Inventory');
    }
  }, []);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md">
        <div className="p-4">
          <h1 className="text-2xl font-bold text-blue-600">LOCO</h1>
          <p className="text-sm text-pink-600 font-semibold">VISHAL MEGA MART</p>
        </div>
        <nav className="mt-4">
          <a href="#" className="flex items-center px-4 py-2 text-gray-600 hover:bg-gray-200">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
            Search Orders
          </a>
          <a
            href="#"
            className={`flex items-center px-4 py-2 ${sidebarSection === 'Dashboard' ? 'bg-gray-200 text-gray-800 font-semibold' : 'text-gray-600 hover:bg-gray-200'}`}
            onClick={() => setSidebarSection('Dashboard')}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
            </svg>
            Dashboard
          </a>
          {/* Manage Bookings Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex items-center w-full px-4 py-2 text-gray-600 hover:bg-gray-200 focus:outline-none"
              aria-haspopup="true"
              aria-expanded={dropdownOpen}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h18M3 9h18M3 15h18M3 21h18"></path>
              </svg>
              <span className="flex-1 text-left">Manage Bookings</span>
              <svg className={`w-4 h-4 ml-auto transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {dropdownOpen && (
              <div className="ml-8 mt-1 bg-white border rounded shadow absolute z-10 w-40">
                <a
                  href="/vendor/orders"
                  className="flex items-center px-4 py-2 hover:bg-gray-100 text-gray-700"
                  onClick={() => setSidebarSection('Orders')}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
                  </svg>
                  Orders
                </a>
                <a
                  href="#"
                  className="flex items-center px-4 py-2 hover:bg-gray-100 text-gray-700"
                  onClick={(e) => {
                    e.preventDefault();
                    setSidebarSection('Inventory');
                    setDropdownOpen(false);
                    router.push('/vendor/dashboard?section=inventory'); // <-- Add this line
                  }}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  Inventory
                </a>
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">{sidebarSection === 'Inventory' ? 'Inventory' : sidebarSection === 'Orders' ? 'Orders' : 'Dashboard'}</h2>
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">Welcome, {userName}</span>
            <button onClick={handleSignOut} className="bg-green-500 text-white px-4 py-2 rounded">
              Sign Out
            </button>
          </div>
        </div>

        {/* Dummy Dashboard UI */}
        {sidebarSection === 'Dashboard' && (
          <>
            <div className="mb-8">
              <input type="text" placeholder="Search..." className="border rounded px-3 py-1 mb-4 w-56" />
              <div className="text-xl font-semibold mb-1">Welcome back, {userName}</div>
              <div className="text-gray-500 mb-6">Track, manage and forecast your customers and orders.</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-white rounded-xl shadow p-6 flex flex-col justify-between">
                  <div className="text-gray-500">Total Revenue</div>
                  <div className="text-3xl font-bold">2,420</div>
                  <div className="text-green-500 text-sm mt-2">↑ 40% vs last month</div>
                </div>
                <div className="bg-white rounded-xl shadow p-6 flex flex-col justify-between">
                  <div className="text-gray-500">Total Product Sales</div>
                  <div className="text-3xl font-bold">316</div>
                  <div className="text-green-500 text-sm mt-2">↑ 20% vs last month</div>
                </div>
                <div className="bg-white rounded-xl shadow p-6 flex flex-col justify-between">
                  <div className="text-gray-500">Out for Delivery</div>
                  <div className="text-3xl font-bold">23</div>
                  <div className="text-green-500 text-sm mt-2">↑ 20%</div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow p-6 border-2 border-blue-400">
                  <div className="text-gray-500">Pending</div>
                  <div className="text-3xl font-bold">54</div>
                  <div className="text-red-500 text-sm mt-2">↓ 20%</div>
                </div>
                <div className="bg-white rounded-xl shadow p-6">
                  <div className="text-gray-500">Returned</div>
                  <div className="text-3xl font-bold">4</div>
                  <div className="text-red-500 text-sm mt-2">↓ 10%</div>
                </div>
                <div className="bg-white rounded-xl shadow p-6">
                  <div className="text-gray-500">Failed Delivery</div>
                  <div className="text-3xl font-bold">3</div>
                  <div className="text-red-500 text-sm mt-2">↓ 10%</div>
                </div>
                <div className="bg-white rounded-xl shadow p-6">
                  <div className="text-gray-500">Cancelled Orders</div>
                  <div className="text-3xl font-bold">16</div>
                  <div className="text-red-500 text-sm mt-2">↓ 30% vs last month</div>
                </div>
              </div>
              <div className="mb-2 font-semibold">Recent Notifications</div>
              <div className="space-y-2">
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center justify-between">
                  <div>
                    You just got a new order <span className="text-green-600 font-semibold">#123456</span>
                    <div className="text-xs text-gray-500">A new order has been placed.</div>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">×</button>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center justify-between">
                  <div>
                    Order <span className="text-red-600 font-semibold">#124235</span> has been Canceled
                    <div className="text-xs text-gray-500">An order has been canceled.</div>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">×</button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Inventory Table UI */}
        {sidebarSection === 'Inventory' && (
          <>
            {/* Filters */}
            <div className="flex space-x-2 mb-4">
              {['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'All'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded ${filter === f ? 'bg-gray-200' : 'bg-white'} border`}
                >
                  {f}
                </button>
              ))}
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 border rounded"
              />
              <button onClick={handleEditInventory} className="bg-blue-500 text-white px-4 py-2 rounded">
                Add Inventory
              </button>
              <button
                onClick={() => router.push('/vendor/edit-inventory')}
                className="bg-yellow-500 text-white px-4 py-2 rounded"
              >
                Edit Inventory
              </button>
              <button onClick={handleSortByNewest} className="bg-blue-500 text-white px-4 py-2 rounded">
                Sort by {sortOrder === 'desc' ? 'Oldest' : 'Newest'}
              </button>
            </div>
            {loading ? (
              <p>Loading...</p>
            ) : error ? (
              <p className="text-red-600">{error}</p>
            ) : filteredProducts.length === 0 ? (
              <p>No products found for the selected filter or search.</p>
            ) : (
              <div className="bg-white shadow-md rounded">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b">
                      <th className="p-4">Product</th>
                      <th className="p-4">Date Added</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProducts.map((product) => {
                      const stockStatus = getStockStatus(product.quantity || 0);
                      return (
                        <tr key={product.id} className="border-b">
                          <td className="p-4 flex items-center space-x-2">
                            {product.image ? (
                              <Image
                                src={product.image}
                                alt={product.name}
                                width={40}
                                height={40}
                                className="w-10 h-10 rounded object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gray-200 rounded"></div>
                            )}
                            <span>{product.name}</span>
                          </td>
                          <td className="p-4">{new Date(product.date_added).toLocaleDateString()}</td>
                          <td className="p-4">${product.price?.toFixed(2) || '0.00'}</td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-sm ${stockStatus.color}`}>
                              {stockStatus.text}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {/* Pagination */}
            <div className="flex justify-center mt-4  space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-4 py-2 mb-8 rounded ${currentPage === 1 ? 'bg-gray-300 cursor-not-allowed' : 'bg-gray-200'}`}
              >
                Previous
              </button>
              {pageNumbers.map((number) => (
                <button
                  key={number}
                  onClick={() => handlePageChange(number)}
                  className={`px-4 py-2 mb-8 rounded ${currentPage === number ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                >
                  {number}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 mb-8 rounded ${currentPage === totalPages ? 'bg-gray-300 cursor-not-allowed' : 'bg-gray-200'}`}
              >
                Next
              </button>
            </div>
          </>
        )}
        {/* You can add more content for other sidebar sections here if needed */}
      </div>
    </div>
  );
}