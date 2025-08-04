import React, { useState, useCallback } from "react";
import { FaSearch, FaClipboardList, FaChevronDown, FaUserFriends, FaBars, FaTimes } from "react-icons/fa";

export default function Sidebar({ activeTab, setActiveTab, searchOrders, setSearchOrders }) {
  const [collapsed, setCollapsed] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState({
    bookings: true,
    agents: true,
  });
  const [sidebarWidth, setSidebarWidth] = useState(256); // px
  const [dragging, setDragging] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDropdown = (key) => {
    setOpenDropdowns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleMouseDown = (e) => {
    setDragging(true);
  };

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return;
    let newWidth = e.clientX - document.body.getBoundingClientRect().left;
    if (newWidth < 180) newWidth = 180;
    if (newWidth > 400) newWidth = 400;
    setSidebarWidth(newWidth);
  }, [dragging]);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  React.useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, handleMouseMove, handleMouseUp]);

  // Hamburger for mobile
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setCollapsed(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Sidebar content
  const sidebarContent = (
    <aside
      className={`bg-gray-50 border-r min-h-screen flex flex-col transition-all duration-200 fixed md:static top-0 left-0 z-50 md:z-auto ${mobileOpen ? "w-64" : "w-0 md:w-auto"}`}
      style={{ width: collapsed ? 64 : sidebarWidth }}
      aria-label="Sidebar"
    >
      <div className="flex items-center justify-between px-2 py-3 border-b">
        {!collapsed && <span className="font-bold text-lg text-blue-700">Admin</span>}
        <div className="flex items-center gap-2">
          <button
            className="p-1 text-gray-500 hover:text-blue-600 focus:outline-none md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar"
          >
            <FaTimes />
          </button>
          <button
            className="p-1 text-gray-500 hover:text-blue-600 focus:outline-none hidden md:block"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
              <path d="M7 5l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
      <nav className="flex-1 px-2 py-4 overflow-y-auto">
        {/* Search Orders */}
        {!collapsed && (
          <div className="mb-4">
            <div className="flex items-center gap-2 text-gray-700 font-semibold mb-2">
              <FaSearch className="text-lg" />
              <span>Search Orders</span>
            </div>
            <input
              type="text"
              placeholder="Search Orders"
              className="w-full mt-2 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
              value={searchOrders}
              onChange={e => setSearchOrders(e.target.value)}
            />
          </div>
        )}
        {/* Bookings Dropdown */}
        <div>
          <button
            className={`flex items-center gap-2 w-full text-left px-2 py-2 rounded-lg font-semibold transition ${openDropdowns.bookings ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-100"}`}
            onClick={() => handleDropdown("bookings")}
          >
            <FaClipboardList className="text-lg" />
            {!collapsed && <span>Manage Bookings</span>}
            <FaChevronDown className={`ml-auto text-xs transition-transform ${openDropdowns.bookings ? "rotate-180" : ""}`} />
          </button>
          {openDropdowns.bookings && !collapsed && (
            <ul className="ml-6 mt-2 space-y-1">
              <li>
                <button
                  className={`w-full text-left px-3 py-2 rounded-lg font-medium transition ${activeTab === "orders" ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"}`}
                  onClick={() => { setActiveTab("orders"); setMobileOpen(false); }}
                >
                  Orders
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-left px-3 py-2 rounded-lg font-medium transition ${activeTab === "vendors" ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"}`}
                  onClick={() => { setActiveTab("vendors"); setMobileOpen(false); }}
                >
                  Vendors
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-left px-3 py-2 rounded-lg font-medium transition ${activeTab === "invoices" ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"}`}
                  onClick={() => { setActiveTab("invoices"); setMobileOpen(false); }}
                >
                  Invoices
                </button>
              </li>
            </ul>
          )}
        </div>
        {/* Agents Dropdown */}
        <div className="mt-4">
          <button
            className={`flex items-center gap-2 w-full text-left px-2 py-2 rounded-lg font-semibold transition ${openDropdowns.agents ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-100"}`}
            onClick={() => handleDropdown("agents")}
          >
            <FaUserFriends className="text-lg" />
            {!collapsed && <span>Delivery Agents</span>}
            <FaChevronDown className={`ml-auto text-xs transition-transform ${openDropdowns.agents ? "rotate-180" : ""}`} />
          </button>
          {openDropdowns.agents && !collapsed && (
            <ul className="ml-6 mt-2 space-y-1">
              <li>
                <button
                  className={`w-full text-left px-3 py-2 rounded-lg font-medium transition ${activeTab === "agents" ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"}`}
                  onClick={() => { setActiveTab("agents"); setMobileOpen(false); }}
                >
                  Agents
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-left px-3 py-2 rounded-lg font-medium transition ${activeTab === "assignOrder" ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"}`}
                  onClick={() => { setActiveTab("assignOrder"); setMobileOpen(false); }}
                >
                  Assign Order
                </button>
              </li>
            </ul>
          )}
        </div>
      </nav>
      {/* Sidebar resizer only on desktop */}
      {!collapsed && (
        <div
          className="absolute top-0 right-0 h-full w-2 cursor-col-resize z-20 hidden md:block"
          onMouseDown={handleMouseDown}
          style={{ userSelect: dragging ? "none" : "auto" }}
        />
      )}
    </aside>
  );

  // Hamburger button for mobile
  return (
    <>
      <button
        className="md:hidden fixed top-4 left-4 z-50 bg-white border rounded-full p-2 shadow-lg"
        onClick={() => setMobileOpen(true)}
        aria-label="Open sidebar"
      >
        <FaBars />
      </button>
      {/* Sidebar overlay for mobile */}
      <div className={`fixed inset-0 bg-black bg-opacity-40 z-40 transition-opacity ${mobileOpen ? "block" : "hidden"}`} onClick={() => setMobileOpen(false)} />
      {/* Sidebar content */}
      <div className={`${mobileOpen ? "block" : "hidden"} md:block`}>{sidebarContent}</div>
    </>
  );
}