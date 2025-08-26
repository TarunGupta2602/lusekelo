import React from 'react';
import Image from 'next/image';

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
}) {
  return (
    <div className="mb-8">
      <div className="mb-4">
        <h3 className="text-xl md:text-2xl font-bold text-gray-900">Orders ({filteredOrders.length})</h3>
      </div>
      {ordersLoading ? (
        <div className="flex justify-center items-center py-12 bg-white rounded-2xl shadow-md">
          <p className="text-gray-700 text-lg font-medium">Loading orders...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-300 rounded-2xl p-6 text-center shadow-md">
          <p className="text-red-700 text-base font-medium">{error}</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-md flex flex-col items-center justify-center min-h-[300px] p-8">
          <h2 className="text-3xl font-extrabold text-blue-700 mb-4">No Orders Found</h2>
          <p className="text-gray-600 text-base text-center max-w-md mb-6">
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
        <div className="bg-white rounded-2xl shadow-md divide-y divide-gray-200 overflow-hidden">
          {paginatedOrders.map((order) => (
            <div
              key={order.id}
              className="flex flex-col sm:flex-row items-start sm:items-center px-4 py-5 gap-4 hover:bg-blue-50 transition-all duration-200"
            >
              {/* Product Image */}
              <div className="flex-shrink-0">
                {order.products.image ? (
                  <Image
                    src={order.products.image}
                    alt={order.products.name}
                    width={56}
                    height={56}
                    className="w-14 h-14 rounded-xl object-cover border border-gray-200 shadow-sm"
                    style={{ objectFit: 'cover' }}
                    unoptimized
                  />
                ) : (
                  <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center text-3xl shadow-sm">🛒</div>
                )}
              </div>
              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-gray-900 text-base truncate">{order.products.name}</div>
                <div className="text-gray-600 text-sm">
                  Qty: <span className="font-semibold">{order.quantity}</span> &bull; Total:{' '}
                  <span className="font-semibold">${order.total_amount?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
              {/* Statuses */}
              <div className="flex flex-col items-start gap-2 w-full sm:w-auto min-w-[120px] sm:min-w-[160px]">
                <select
                  className={`w-full px-4 py-2 rounded-full text-sm font-medium border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all ${
                    order.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : order.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-700'
                      : order.status === 'returned'
                      ? 'bg-blue-100 text-blue-700'
                      : order.status === 'cancelled'
                      ? 'bg-red-100 text-red-700'
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
                      ? 'bg-green-100 text-green-700'
                      : order.vendor_decision === 'rejected'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
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
                      className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shadow-sm flex-1 sm:flex-none"
                      onClick={() => handleOrderStatusChange(order.id, 'accepted')}
                    >
                      Accept
                    </button>
                    <button
                      className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors shadow-sm flex-1 sm:flex-none"
                      onClick={() => handleOrderStatusChange(order.id, 'rejected')}
                    >
                      Reject
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleDeleteOrder(order.id)}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors shadow-sm flex-1 sm:flex-none"
                >
                  Delete
                </button>
                {['completed', 'shipped'].includes(order.status) && order.status !== 'returned' && (
                  <button
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm flex-1 sm:flex-none"
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
      {filteredOrders.length > 0 && (
        <div className="flex flex-wrap justify-center mt-6 gap-2">
          <button
            onClick={() => handleOrderPageChange(orderCurrentPage - 1)}
            disabled={orderCurrentPage === 1}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 shadow-sm ${
              orderCurrentPage === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            Previous
          </button>
          {orderPageNumbers.map((number) => (
            <button
              key={number}
              onClick={() => handleOrderPageChange(number)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 shadow-sm ${
                orderCurrentPage === number ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {number}
            </button>
          ))}
          <button
            onClick={() => handleOrderPageChange(orderCurrentPage + 1)}
            disabled={orderCurrentPage === orderPageNumbers.length}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 shadow-sm ${
              orderCurrentPage === orderPageNumbers.length ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}