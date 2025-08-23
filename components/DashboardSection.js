import React, { useState, useEffect } from 'react';

export default function DashboardSection({ userName, orders }) {
  const [notifications, setNotifications] = useState([]);
  const [dismissedNotifications, setDismissedNotifications] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dismissedNotifications');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  useEffect(() => {
    if (orders && orders.length > 0) {
      const newNotifications = orders
        .filter(order => !dismissedNotifications.includes(order.id))
        .map(order => ({
          id: order.id,
          message: order.status === 'cancelled'
            ? `Order #${order.id.slice(0, 8)}... (${order.products?.name || 'Unknown Product'}, $${order.products?.price?.toFixed(2) || '0.00'}) has been Canceled`
            : `New order #${order.id.slice(0, 8)}... (${order.products?.name || 'Unknown Product'}, $${order.products?.price?.toFixed(2) || '0.00'})`,
          date: order.created_at,
        }));
      setNotifications(newNotifications);
    } else {
      setNotifications([]);
    }
  }, [orders, dismissedNotifications]);

  const handleDismissNotification = (orderId) => {
    setDismissedNotifications(prev => {
      const updated = [...prev, orderId];
      if (typeof window !== 'undefined') {
        localStorage.setItem('dismissedNotifications', JSON.stringify(updated));
      }
      return updated;
    });
  };

  return (
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
        {notifications.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
            <div className="text-gray-500">No recent notifications</div>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`border rounded-lg px-4 py-3 flex items-center justify-between ${
                notification.message.includes('Canceled')
                  ? 'bg-red-50 border-red-200'
                  : 'bg-green-50 border-green-200'
              }`}
            >
              <div>
                <div>
                  {notification.message.includes('Canceled') ? (
                    <>
                      Order{' '}
                      <span className="text-red-600 font-semibold">
                        #{notification.id.slice(0, 8)}...
                      </span>{' '}
                      ({notification.message.split('(')[1].split(')')[0]}) has been Canceled
                    </>
                  ) : (
                    <>
                      New order{' '}
                      <span className="text-green-600 font-semibold">
                        #{notification.id.slice(0, 8)}...
                      </span>{' '}
                      ({notification.message.split('(')[1].split(')')[0]})
                    </>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(notification.date).toLocaleString()}
                </div>
              </div>
              <button
                className="text-gray-400 hover:text-gray-600"
                onClick={() => handleDismissNotification(notification.id)}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}