
import React, { useState, useCallback } from 'react';
import { FaSearch, FaClipboardList, FaUserFriends, FaBars, FaTimes, FaChevronDown } from 'react-icons/fa';

const TABS = [
  { key: 'orders', label: 'Orders' },
  { key: 'vendors', label: 'Vendors' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'products', label: 'Products & Categories' },
  { key: 'agents', label: 'Agents' },
  { key: 'reports', label: 'Reports & Analytics' }, // Added new tab
];

const SidebarHeader = ({ collapsed, setCollapsed, setMobileOpen }) => (
  <div className="flex items-center justify-between px-4 py-3 border-b bg-white shadow-sm">
    {!collapsed && <span className="font-bold text-xl text-blue-700 tracking-tight">Admin Dashboard</span>}
    <div className="flex items-center gap-3">
      <button
        className="p-2 text-gray-600 hover:text-blue-600 focus:outline-none md:hidden transition-colors"
        onClick={() => setMobileOpen(false)}
        aria-label="Close sidebar"
      >
        <FaTimes className="text-lg" />
      </button>
      <button
        className="p-2 text-gray-600 hover:text-blue-600 focus:outline-none hidden md:block transition-colors"
        onClick={() => setCollapsed((c) => !c)}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
          <path
            d={collapsed ? 'M13 15l-5-5 5-5' : 'M7 5l5 5-5 5'}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  </div>
);

const SearchOrders = ({ collapsed, searchOrders, setSearchOrders }) => (
  <>
    {!collapsed && (
      <div className="mb-6 px-4">
        <div className="flex items-center gap-3 text-gray-700 font-semibold mb-3">
          <FaSearch className="text-lg text-blue-500" />
          <span>Search Orders</span>
        </div>
        <input
          type="text"
          placeholder="Search Orders"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm transition-all"
          value={searchOrders}
          onChange={(e) => setSearchOrders(e.target.value)}
          aria-label="Search orders"
        />
      </div>
    )}
  </>
);

const DropdownSection = ({ title, icon, items, activeTab, setActiveTab, collapsed, open, onToggle, setMobileOpen }) => (
  <div className="mt-2">
    <button
      className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg font-semibold transition-colors ${
        open ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
      }`}
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={`${title.toLowerCase()}-dropdown`}
    >
      {icon}
      {!collapsed && <span className="text-sm">{title}</span>}
      {!collapsed && (
        <FaChevronDown className={`ml-auto text-xs transition-transform ${open ? 'rotate-180' : ''}`} />
      )}
    </button>
    {open && !collapsed && (
      <ul id={`${title.toLowerCase()}-dropdown`} className="ml-8 mt-2 space-y-1">
        {items.map((item) => (
          <li key={item.key}>
            <button
              className={`w-full text-left px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                activeTab === item.key ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => {
                setActiveTab(item.key);
                setMobileOpen(false);
              }}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    )}
  </div>
);

export default function Sidebar({ activeTab, setActiveTab, searchOrders, setSearchOrders }) {
  const [collapsed, setCollapsed] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState({
    bookings: true,
    agents: true,
  });
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [dragging, setDragging] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDropdown = (key) => {
    setOpenDropdowns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleMouseDown = () => {
    setDragging(true);
  };

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return;
    let newWidth = e.clientX - document.body.getBoundingClientRect().left;
    newWidth = Math.max(200, Math.min(400, newWidth));
    setSidebarWidth(newWidth);
  }, [dragging]);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  React.useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, handleMouseMove, handleMouseUp]);

  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCollapsed(false);
        setMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const bookingItems = TABS.filter((tab) =>
    ['orders', 'vendors', 'invoices', 'products', 'reports'].includes(tab.key)
  );
  const agentItems = TABS.filter((tab) => ['agents'].includes(tab.key));

  return (
    <>
      <button
        className="md:hidden fixed top-4 left-4 z-50 bg-white border border-gray-200 rounded-full p-3 shadow-lg hover:bg-gray-100 transition-colors"
        onClick={() => setMobileOpen(true)}
        aria-label="Open sidebar"
      >
        <FaBars className="text-gray-600 text-lg" />
      </button>
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 ${
          mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`bg-white border-r min-h-screen flex flex-col transition-all duration-300 fixed top-0 left-0 z-50 shadow-lg md:shadow-none md:static ${
          mobileOpen ? 'translate-x-0 w-72' : '-translate-x-full w-0 md:w-auto md:translate-x-0'
        }`}
        style={{ width: collapsed ? 64 : sidebarWidth }}
        aria-label="Sidebar"
      >
        <SidebarHeader collapsed={collapsed} setCollapsed={setCollapsed} setMobileOpen={setMobileOpen} />
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <SearchOrders collapsed={collapsed} searchOrders={searchOrders} setSearchOrders={setSearchOrders} />
          <DropdownSection
            title="Manage Bookings"
            icon={<FaClipboardList className="text-lg text-blue-500" />}
            items={bookingItems}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            collapsed={collapsed}
            open={openDropdowns.bookings}
            onToggle={() => handleDropdown('bookings')}
            setMobileOpen={setMobileOpen}
          />
          <DropdownSection
            title="Delivery Agents"
            icon={<FaUserFriends className="text-lg text-blue-500" />}
            items={agentItems}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            collapsed={collapsed}
            open={openDropdowns.agents}
            onToggle={() => handleDropdown('agents')}
            setMobileOpen={setMobileOpen}
          />
        </nav>
        {!collapsed && (
          <div
            className="absolute top-0 right-0 h-full w-2 cursor-col-resize z-20 hidden md:block bg-gray-200 hover:bg-blue-400 transition-colors"
            onMouseDown={handleMouseDown}
            style={{ userSelect: dragging ? 'none' : 'auto' }}
            aria-label="Resize sidebar"
          />
        )}
      </aside>
    </>
  );
}
