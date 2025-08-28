
import React from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';

export default function OrdersSection({
  filteredOrders,
  ordersLoading,
  error,
  orderPageNumbers,
  orderCurrentPage,
  handleOrderPageChange,
  paginatedOrders,
  handleOrderStatusChange,
  ORDER_STATUS_OPTIONS,
  handleDeleteOrder,
  handleReturnOrder,
  setOrders,
  setFilteredOrders,
}) {
  // Function to handle vendor decision updates
  const handleVendorDecisionChange = async (orderId, decision) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ vendor_decision: decision })
        .eq('id', orderId);

      if (error) {
        console.error('Error updating vendor decision:', error.message);
        alert('Failed to update vendor decision: ' + error.message);
        return;
      }

      // Update local state to reflect the change
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, vendor_decision: decision } : o))
      );
      setFilteredOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, vendor_decision: decision } : o))
      );
    } catch (err) {
      console.error('Unexpected error updating vendor decision:', err.message);
      alert('Unexpected error: ' + err.message);
    }
  };

  return (
    <div className="mb-8 bg-white rounded-2xl shadow-lg border border-gray-200">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-200">
        <h3 className="text-2xl font-semibold text-gray-900">Orders ({filteredOrders.length})</h3>
      </div>

      {/* Scrollable Content */}
      <div className="max-h-[70vh] overflow-y-auto">
        {ordersLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
            <p className="ml-4 text-gray-600 text-lg font-medium">Loading orders...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <p className="text-red-600 text-base font-medium bg-red-50 border border-red-200 rounded-lg py-4">{error}</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">No Orders Found</h2>
            <p className="text-gray-500 text-base max-w-md mb-6">
              There are currently no orders for your store. Once customers place orders, they will appear here.
            </p>
            <svg
              className="w-20 h-20 text-gray-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 48 48"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="8" y="16" width="32" height="20" rx="2" strokeWidth="2" stroke="currentColor" fill="none" />
              <path d="M16 16V12a8 8 0 0116 0v4" strokeWidth="2" stroke="currentColor" fill="none" />
            </svg>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {paginatedOrders.map((order) => (
              <div
                key={order.id}
                className="flex flex-col sm:flex-row items-start sm:items-center px-6 py-5 gap-4 hover:bg-blue-50 transition-all duration-200 ease-in-out"
              >
                {/* Product Image */}
                <div className="flex-shrink-0">
                  {order.products.image ? (
                    <Image
                      src={order.products.image}
                      alt={order.products.name}
                      width={56}
                      height={56}
                      className="w-14 h-14 rounded-lg object-cover border border-gray-200 shadow-sm"
                      style={{ objectFit: 'cover' }}
                      unoptimized
                    />
                  ) : (
                    <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center text-3xl shadow-sm">
                      🛒
                    </div>
                  )}
                </div>
                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 text-base truncate">{order.products.name}</div>
                  <div className="text-gray-600 text-sm">
                    Qty: <span className="font-medium">{order.quantity}</span> &bull; Total:{' '}
                    <span className="font-medium">${order.total_amount?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
                {/* Statuses */}
                <div className="flex flex-col items-start gap-2 w-full sm:w-auto min-w-[120px] sm:min-w-[160px]">
                  <select
                    className={`w-full px-4 py-2 rounded-full text-sm font-medium border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200 ${
                      order.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : order.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : order.status === 'returned'
                        ? 'bg-blue-100 text-blue-800'
                        : order.status === 'cancelled'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                    value={order.status}
                    onChange={(e) => handleOrderStatusChange(order.id, e.target.value)}
                  >
                    {ORDER_STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt.charAt(0).toUpperCase() + opt.slice(1)}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-gray-500">
                    {new Date(order.created_at).toLocaleDateString()}
                  </span>
                  <span
                    className={`px-4 py-1 rounded-full text-xs font-medium ${
                      order.vendor_decision === 'accepted'
                        ? 'bg-green-100 text-green-800'
                        : order.vendor_decision === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {order.vendor_decision?.charAt(0).toUpperCase() + order.vendor_decision?.slice(1) || 'Pending'}
                  </span>
                </div>
                {/* Actions */}
                <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:ml-4">
                  {order.vendor_decision === 'pending' && (
                    <>
                      <button
                        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors duration-200 shadow-sm flex-1 sm:flex-none"
                        onClick={() => handleVendorDecisionChange(order.id, 'accepted')}
                      >
                        Accept
                      </button>
                      <button
                        className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors duration-200 shadow-sm flex-1 sm:flex-none"
                        onClick={() => handleVendorDecisionChange(order.id, 'rejected')}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleDeleteOrder(order.id)}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors duration-200 shadow-sm flex-1 sm:flex-none"
                  >
                    Delete
                  </button>
                  {['completed', 'shipped'].includes(order.status) && order.status !== 'returned' && (
                    <button
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-200 shadow-sm flex-1 sm:flex-none"
                      onClick={() => handleReturnOrder(order.id)}
                    >
                      Mark as Returned
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {filteredOrders.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-white">
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => handleOrderPageChange(orderCurrentPage - 1)}
              disabled={orderCurrentPage === 1}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 shadow-sm ${
                orderCurrentPage === 1
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              Previous
            </button>
            {orderPageNumbers.map((number) => (
              <button
                key={number}
                onClick={() => handleOrderPageChange(number)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 shadow-sm ${
                  orderCurrentPage === number
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {number}
              </button>
            ))}
            <button
              onClick={() => handleOrderPageChange(orderCurrentPage + 1)}
              disabled={orderCurrentPage === orderPageNumbers.length}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 shadow-sm ${
                orderCurrentPage === orderPageNumbers.length
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
