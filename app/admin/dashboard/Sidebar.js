import React, { useState } from "react";
import { FaSearch, FaClipboardList, FaChevronDown, FaUserFriends } from "react-icons/fa";

export default function Sidebar({ activeTab, setActiveTab, searchOrders, setSearchOrders }) {
  const [collapsed, setCollapsed] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState({
    bookings: true,
    agents: true,
  });
  const [sidebarWidth, setSidebarWidth] = useState(256); // px
  const [dragging, setDragging] = useState(false);

  const handleDropdown = (key) => {
    setOpenDropdowns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleMouseDown = (e) => {
    setDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;
    let newWidth = e.clientX - document.body.getBoundingClientRect().left;
    if (newWidth < 180) newWidth = 180;
    if (newWidth > 400) newWidth = 400;
    setSidebarWidth(newWidth);
  };

  const handleMouseUp = () => {
    setDragging(false);
  };

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
  }, [dragging]);

  return (
    <aside
      className={`bg-gray-50 border-r min-h-screen flex flex-col transition-all duration-200 ${collapsed ? "w-16" : ""}`}
      style={{ width: collapsed ? 64 : sidebarWidth }}
    >
      <div className="flex items-center justify-between px-2 py-3 border-b">
        {!collapsed && <span className="font-bold text-lg text-blue-700">Admin</span>}
        <button
          className="p-1 text-gray-500 hover:text-blue-600 focus:outline-none"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
            <path d="M7 5l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
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
                  onClick={() => setActiveTab("orders")}
                >
                  Orders
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-left px-3 py-2 rounded-lg font-medium transition ${activeTab === "vendors" ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"}`}
                  onClick={() => setActiveTab("vendors")}
                >
                  Vendors
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-left px-3 py-2 rounded-lg font-medium transition ${activeTab === "invoices" ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"}`}
                  onClick={() => setActiveTab("invoices")}
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
                  onClick={() => setActiveTab("agents")}
                >
                  Agents
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-left px-3 py-2 rounded-lg font-medium transition ${activeTab === "assignOrder" ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"}`}
                  onClick={() => setActiveTab("assignOrder")}
                >
                  Assign Order
                </button>
              </li>
            </ul>
          )}
        </div>
      </nav>
      {/* Sidebar resizer */}
      {!collapsed && (
        <div
          className="absolute top-0 right-0 h-full w-2 cursor-col-resize z-20"
          onMouseDown={handleMouseDown}
          style={{ userSelect: dragging ? "none" : "auto" }}
        />
      )}
    </aside>
  );
} 