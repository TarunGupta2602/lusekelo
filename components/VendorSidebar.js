
import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function VendorSidebar({
  store,
  sidebarSection,
  setSidebarSection,
  dropdownOpen,
  setDropdownOpen,
  orderSearchQuery,
  setOrderSearchQuery,
  setEditSupermarketOpen,
}) {
  const router = useRouter();
  return (
    <div className="w-full md:w-64 bg-white shadow-lg z-20 md:relative fixed md:static top-0 left-0 h-16 md:h-auto flex md:block items-center justify-between px-4 md:px-0 border-b md:border-b-0">
      {/* Hamburger for mobile */}
      <button className="md:hidden p-2" onClick={() => setDropdownOpen((prev) => !prev)}>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>
      {/* Sidebar content: show/hide on mobile */}
      <div className={`absolute md:static top-16 left-0 w-full md:w-auto bg-white md:bg-transparent shadow-lg md:shadow-none transition-all duration-200 ${dropdownOpen ? 'block' : 'hidden'} md:block`}>
        <div className="p-4 border-b md:border-b-0">
          {store ? (
            <button
              type="button"
              className="flex items-center space-x-3 w-full text-left focus:outline-none"
              onClick={() => setEditSupermarketOpen(true)}
              title="Edit Supermarket"
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
                  className="rounded-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-gray-400 text-xl">🏬</span>
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-blue-600">LOCO</h1>
                <p className="text-sm text-pink-600 font-semibold">{store.name}</p>
              </div>
            </button>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-blue-600">LOCO</h1>
              <p className="text-sm text-pink-600 font-semibold">Loading...</p>
            </>
          )}
        </div>
        {/* Orders Search Bar */}
        <div className="p-4 border-b md:border-b-0">
          <input
            type="text"
            placeholder="Search Orders..."
            value={orderSearchQuery}
            onChange={e => setOrderSearchQuery(e.target.value)}
            className="border rounded px-3 py-2 w-full focus:ring-2 focus:ring-blue-400 focus:outline-none"
          />
        </div>
        <nav className="mt-4">
          <a
            href="#"
            className={`flex items-center px-4 py-2 rounded-lg transition-colors duration-200 ${
              sidebarSection === 'Dashboard' ? 'bg-blue-100 text-blue-800 font-semibold' : 'text-gray-600 hover:bg-gray-100'
            }`}
            onClick={() => setSidebarSection('Dashboard')}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7 a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
            </svg>
            Dashboard
          </a>
          <div className="relative">
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex items-center w-full px-4 py-2 rounded-lg transition-colors duration-200 text-gray-600 hover:bg-gray-100 focus:outline-none"
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
                  href="#"
                  className="flex items-center px-4 py-2 rounded-lg transition-colors duration-200 hover:bg-gray-100 text-gray-700"
                  onClick={() => setSidebarSection('Orders')}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
                  </svg>
                  Orders
                </a>
                <a
                  href="#"
                  className="flex items-center px-4 py-2 rounded-lg transition-colors duration-200 hover:bg-gray-100 text-gray-700"
                  onClick={(e) => {
                    e.preventDefault();
                    setSidebarSection('Inventory');
                    setDropdownOpen(false);
                    router.push('/vendor/dashboard?section=inventory');
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
    </div>
  );
}
