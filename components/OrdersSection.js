
import React from 'react';
import Image from 'next/image';

export default function OrdersSection({ filteredOrders, ordersLoading, error, orderPageNumbers, orderCurrentPage, handleOrderPageChange, paginatedOrders, handleOrderStatusChange, ORDER_STATUS_OPTIONS, handleDeleteOrder, handleReturnOrder }) {
  return (
    <>
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Orders ({filteredOrders.length})</h3>
      </div>
      {ordersLoading ? (
        <p>Loading orders...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-xl shadow flex flex-col items-center justify-center min-h-[350px]">
          <h2 className="text-2xl font-bold text-blue-700 mb-2">No Orders Found</h2>
          <p className="text-gray-500 text-center max-w-xs mb-4">
            There are currently no orders for your store.<br />
            Once customers place orders, they will appear here.
          </p>
          <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <rect x="8" y="16" width="32" height="20" rx="2" strokeWidth="2" stroke="currentColor" fill="none" />
            <path d="M16 16V12a8 8 0 0116 0v4" strokeWidth="2" stroke="currentColor" fill="none" />
          </svg>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow divide-y divide-gray-100">
          {paginatedOrders.map((order) => (
            <div key={order.id} className="flex items-center px-6 py-4 gap-4 hover:bg-blue-50 transition-all">
              {/* Product Image */}
              {order.products.image ? (
                <Image
                  src={order.products.image}
                  alt={order.products.name}
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded object-cover border"
                  style={{ objectFit: 'cover' }}
                  unoptimized
                />
              ) : (
                <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-2xl">🛒</div>
              )}
              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 truncate">{order.products.name}</div>
                <div className="text-gray-500 text-xs">Qty: <span className="font-semibold">{order.quantity}</span> &bull; Total: <span className="font-semibold">${order.total_amount?.toFixed(2) || '0.00'}</span></div>
              </div>
              {/* Statuses */}
              <div className="flex flex-col items-start gap-1 min-w-[120px]">
                {/* Status Dropdown */}
                <select
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${order.status === 'completed' ? 'bg-green-100 text-green-600' : order.status === 'pending' ? 'bg-yellow-100 text-yellow-600' : order.status === 'returned' ? 'bg-blue-100 text-blue-600' : order.status === 'cancelled' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}
                  value={order.status}
                  onChange={e => handleOrderStatusChange(order.id, e.target.value)}
                >
                  {ORDER_STATUS_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                  ))}
                </select>
                <span className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString()}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${order.vendor_decision === 'accepted' ? 'bg-green-100 text-green-600' : order.vendor_decision === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>{order.vendor_decision?.charAt(0).toUpperCase() + order.vendor_decision?.slice(1) || 'Pending'}</span>
              </div>
              {/* Actions */}
              <div className="flex gap-2 ml-4">
                {order.vendor_decision === 'pending' && (
                  <>
                    <button className="bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600" onClick={() => handleOrderStatusChange(order.id, 'accepted')}>Accept</button>
                    <button className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600" onClick={() => handleOrderStatusChange(order.id, 'rejected')}>Reject</button>
                  </>
                )}
                <button onClick={() => handleDeleteOrder(order.id)} className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600">Delete</button>
                {['completed', 'shipped'].includes(order.status) && order.status !== 'returned' && (
                  <button className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600" onClick={() => handleReturnOrder(order.id)}>Mark as Returned</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {filteredOrders.length > 0 && (
        <div className="flex justify-center mt-8 space-x-2">
          <button
            onClick={() => handleOrderPageChange(orderCurrentPage - 1)}
            disabled={orderCurrentPage === 1}
            className={`px-4 py-2 rounded-lg transition-colors duration-200 ${orderCurrentPage === 1 ? 'bg-gray-300 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            Previous
          </button>
          {orderPageNumbers.map((number) => (
            <button
              key={number}
              onClick={() => handleOrderPageChange(number)}
              className={`px-4 py-2 rounded-lg transition-colors duration-200 ${orderCurrentPage === number ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
            >
              {number}
            </button>
          ))}
          <button
            onClick={() => handleOrderPageChange(orderCurrentPage + 1)}
            disabled={orderCurrentPage === orderPageNumbers.length}
            className={`px-4 py-2 rounded-lg transition-colors duration-200 ${orderCurrentPage === orderPageNumbers.length ? 'bg-gray-300 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}
