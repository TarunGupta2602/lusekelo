import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function VendorSidebar({
  store,
  sidebarSection,
  setSidebarSection,
  orderSearchQuery,
  setOrderSearchQuery,
  setEditSupermarketOpen,
}) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bookingsOpen, setBookingsOpen] = useState(false);

  const handleNavigation = (section, path) => {
    setSidebarSection(section);
    setMobileMenuOpen(false);
    setBookingsOpen(false);
    if (path) {
      router.push(path);
    }
  };

  return (
    <div className="w-full md:w-64 bg-white shadow-xl z-50 fixed md:static top-0 left-0 flex md:flex-col items-center justify-between h-16 md:h-auto px-4 md:px-0 border-b md:border-b-0 md:border-r border-gray-200 overflow-y-auto">

      {/* Mobile Header */}
      <div className="flex items-center justify-between w-full md:hidden">
        <h1 className="text-xl font-extrabold text-blue-700">LOCO</h1>
        <button
          className="p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Sidebar Content */}
      <div
        className={`fixed md:static top-16 left-0 w-64 md:w-full bg-white md:bg-transparent shadow-2xl md:shadow-none transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 flex flex-col h-[calc(100vh-4rem)] md:h-auto overflow-y-auto`}
      >
        <div className="p-4 md:p-6 border-b border-gray-100 bg-gradient-to-br from-blue-50 to-pink-50 md:bg-none">
          {store ? (
            <button
              type="button"
              className="flex items-center space-x-4 w-full text-left focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-2 hover:bg-white/50 transition-colors"
              onClick={() => setEditSupermarketOpen(true)}
              title="Edit Supermarket"
              aria-label="Edit Supermarket"
            >
              {store.main_image ? (
                <Image
                  src={
                    store.main_image.startsWith('http')
                      ? store.main_image
                      : store.main_image.startsWith('/')
                      ? store.main_image
                      : '/' + store.main_image.replace(/^(\.\.\/)+/, '')
                  }
                  alt={store.name}
                  width={40}
                  height={40}
                  className="rounded-full object-cover shadow-md"
                  unoptimized
                />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-300 rounded-full flex items-center justify-center shadow-md">
                  <span className="text-gray-500 text-xl">🏬</span>
                </div>
              )}
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-blue-700 tracking-tight">LOCO</h1>
                <p className="text-sm md:text-base text-pink-700 font-medium">{store.name}</p>
              </div>
            </button>
          ) : (
            <>
              <h1 className="text-2xl md:text-3xl font-extrabold text-blue-700 tracking-tight">LOCO</h1>
              <p className="text-sm md:text-base text-pink-700 font-medium">Loading...</p>
            </>
          )}
        </div>

        {/* Orders Search Bar */}
        <div className="p-4 md:p-6 border-b border-gray-100">
          <div className="relative">
            <input
              type="text"
              placeholder="Search Orders..."
              value={orderSearchQuery}
              onChange={(e) => setOrderSearchQuery(e.target.value)}
              className="border border-gray-300 rounded-full px-4 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm text-sm"
              aria-label="Search Orders"
            />
            <svg
              className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <nav className="flex-1 mt-2 px-4 space-y-2">
          <button
            onClick={() => handleNavigation('Dashboard', '/vendor/dashboard?section=dashboard')}
            className={`flex items-center w-full px-4 py-2 md:py-3 rounded-xl transition-all duration-200 text-sm md:text-base ${
              sidebarSection === 'Dashboard'
                ? 'bg-blue-100 text-blue-800 font-semibold shadow-md'
                : 'text-gray-700 hover:bg-gray-100 hover:shadow-sm'
            }`}
            aria-label="Dashboard"
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Dashboard
          </button>

          <div className="relative">
            <button
              onClick={() => setBookingsOpen((prev) => !prev)}
              className="flex items-center w-full px-4 py-2 md:py-3 rounded-xl transition-all duration-200 text-sm md:text-base text-gray-700 hover:bg-gray-100 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-haspopup="true"
              aria-expanded={bookingsOpen}
              aria-label="Manage Bookings"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h18M3 9h18M3 15h18M3 21h18" />
              </svg>
              <span className="flex-1 text-left">Manage Bookings</span>
              <svg
                className={`w-4 h-4 ml-auto transition-transform duration-200 ${bookingsOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {bookingsOpen && (
              <div className="ml-4 md:ml-6 mt-1 space-y-2 transition-all duration-300 ease-in-out">
                <button
                  onClick={() => handleNavigation('Orders', '/vendor/dashboard?section=orders')}
                  className="flex items-center w-full px-4 py-2 md:py-3 rounded-xl transition-all duration-200 text-sm md:text-base text-gray-700 hover:bg-gray-100 hover:shadow-sm"
                  aria-label="Orders"
                >
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  Orders
                </button>
                <button
                  onClick={() => handleNavigation('Inventory', '/vendor/dashboard?section=inventory')}
                  className="flex items-center w-full px-4 py-2 md:py-3 rounded-xl transition-all duration-200 text-sm md:text-base text-gray-700 hover:bg-gray-100 hover:shadow-sm"
                  aria-label="Inventory"
                >
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Inventory
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>
    </div>
  );
}