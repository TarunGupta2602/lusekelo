
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Star } from 'lucide-react';

// Initialize Supabase client
const supabase = createClientComponentClient();

export default function DashboardSection({ userName, orders }) {
  const [notifications, setNotifications] = useState([]);
  const [dismissedNotifications, setDismissedNotifications] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dismissedNotifications');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch notifications
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

  // Fetch reviews for products in orders
  useEffect(() => {
    const fetchReviews = async () => {
      if (!orders || orders.length === 0) {
        setErrorMessage('No orders available to fetch reviews.');
        setLoadingReviews(false);
        return;
      }
      try {
        setLoadingReviews(true);
        const productIds = [...new Set(orders.map(order => order.product_id).filter(id => id))];
        if (productIds.length === 0) {
          setErrorMessage('No valid product IDs found in orders.');
          setLoadingReviews(false);
          return;
        }
        const { data, error } = await supabase
          .from('product_reviews')
          .select(`
            id,
            product_id,
            rating,
            feedback,
            created_at,
            products(name)
          `)
          .in('product_id', productIds)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) {
          console.error('Error fetching reviews:', error);
          setErrorMessage(`Failed to fetch reviews: ${error.message}`);
          setReviews([]);
        } else {
          setReviews(data || []);
          setErrorMessage(data.length === 0 ? 'No reviews found for your products.' : '');
        }
      } catch (err) {
        console.error('Unexpected error fetching reviews:', err);
        setErrorMessage('An unexpected error occurred while fetching reviews.');
        setReviews([]);
      } finally {
        setLoadingReviews(false);
      }
    };

    fetchReviews();
  }, [orders]);

  const handleDismissNotification = (orderId) => {
    setDismissedNotifications(prev => {
      const updated = [...prev, orderId];
      if (typeof window !== 'undefined') {
        localStorage.setItem('dismissedNotifications', JSON.stringify(updated));
      }
      return updated;
    });
  };

  // Calculate stats and best sellers
  const stats = useMemo(() => {
    if (!orders || orders.length === 0) {
      return {
        totalRevenue: 0,
        totalProductSales: 0,
        outForDelivery: 0,
        pending: 0,
        returned: 0,
        failedDelivery: 0,
        cancelled: 0,
        bestSellers: [],
        averageRatings: {},
      };
    }

    const revenueAndSalesOrders = orders.filter(order => ['completed', 'shipped'].includes(order.status));

    const totalRevenue = revenueAndSalesOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
    const totalProductSales = revenueAndSalesOrders.reduce((sum, order) => sum + (order.quantity || 0), 0);
    const outForDelivery = orders.filter(order => order.status === 'shipped').length;
    const pending = orders.filter(order => order.status === 'pending').length;
    const returned = orders.filter(order => order.status === 'returned').length;
    const failedDelivery = orders.filter(order => order.status === 'failed_delivery').length;
    const cancelled = orders.filter(order => order.status === 'cancelled').length;

    // Calculate best sellers (top 3 products by quantity sold)
    const productSales = {};
    revenueAndSalesOrders.forEach(order => {
      const productId = order.product_id;
      const quantity = order.quantity || 0;
      if (!productSales[productId]) {
        productSales[productId] = {
          name: order.products?.name || 'Unknown Product',
          quantity: 0,
          revenue: 0,
        };
      }
      productSales[productId].quantity += quantity;
      productSales[productId].revenue += order.total_amount || 0;
    });

    const bestSellers = Object.entries(productSales)
      .map(([productId, data]) => ({
        productId,
        name: data.name,
        quantity: data.quantity,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 3);

    // Calculate average ratings per product
    const averageRatings = {};
    reviews.forEach(review => {
      const productId = review.product_id;
      if (!averageRatings[productId]) {
        averageRatings[productId] = { total: 0, count: 0, name: review.products?.name || 'Unknown Product' };
      }
      averageRatings[productId].total += review.rating;
      averageRatings[productId].count += 1;
    });

    Object.keys(averageRatings).forEach(productId => {
      averageRatings[productId].average = averageRatings[productId].count > 0
        ? (averageRatings[productId].total / averageRatings[productId].count).toFixed(1)
        : 0;
    });

    return {
      totalRevenue,
      totalProductSales,
      outForDelivery,
      pending,
      returned,
      failedDelivery,
      cancelled,
      bestSellers,
      averageRatings,
    };
  }, [orders, reviews]);

  return (
    <div className="mb-8">
      <input type="text" placeholder="Search..." className="border rounded px-3 py-1 mb-4 w-full max-w-xs" />
      <div className="text-xl font-semibold mb-1">Welcome back, {userName}</div>
      <div className="text-gray-500 mb-6">Track, manage and forecast your customers and orders.</div>

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-6">
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2 shadow-sm">
            <div className="w-4 h-4 bg-red-200 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold">!</span>
            </div>
            {errorMessage}
          </div>
        </div>
      )}

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-xl shadow p-6 flex flex-col justify-between">
          <div className="text-gray-500">Total Revenue</div>
          <div className="text-3xl font-bold">{stats.totalRevenue.toLocaleString()}</div>
          <div className="text-green-500 text-sm mt-2">↑ 40% vs last month</div>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col justify-between">
          <div className="text-gray-500">Total Product Sales</div>
          <div className="text-3xl font-bold">{stats.totalProductSales.toLocaleString()}</div>
          <div className="text-green-500 text-sm mt-2">↑ 20% vs last month</div>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col justify-between">
          <div className="text-gray-500">Out for Delivery</div>
          <div className="text-3xl font-bold">{stats.outForDelivery.toLocaleString()}</div>
          <div className="text-green-500 text-sm mt-2">↑ 20%</div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-6 border-2 border-blue-400">
          <div className="text-gray-500">Pending</div>
          <div className="text-3xl font-bold">{stats.pending.toLocaleString()}</div>
          <div className="text-red-500 text-sm mt-2">↓ 20%</div>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <div className="text-gray-500">Returned</div>
          <div className="text-3xl font-bold">{stats.returned.toLocaleString()}</div>
          <div className="text-red-500 text-sm mt-2">↓ 10%</div>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <div className="text-gray-500">Failed Delivery</div>
          <div className="text-3xl font-bold">{stats.failedDelivery.toLocaleString()}</div>
          <div className="text-red-500 text-sm mt-2">↓ 10%</div>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <div className="text-gray-500">Cancelled Orders</div>
          <div className="text-3xl font-bold">{stats.cancelled.toLocaleString()}</div>
          <div className="text-red-500 text-sm mt-2">↓ 30% vs last month</div>
        </div>
      </div>

      {/* Best Sellers Section */}
      <div className="mb-6">
        <div className="mb-2 font-semibold">Best Selling Products</div>
        {stats.bestSellers.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
            <div className="text-gray-500">No sales data available</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {stats.bestSellers.map((product) => (
              <div key={product.productId} className="bg-white rounded-xl shadow p-6">
                <div className="text-gray-500 text-sm">{product.name}</div>
                <div className="text-lg font-bold">{product.quantity} units sold</div>
                <div className="text-gray-600 text-sm">Revenue: ${product.revenue.toFixed(2)}</div>
                {stats.averageRatings[product.productId] && (
                  <div className="flex items-center gap-1 mt-2">
                    <Star size={16} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-sm font-medium">
                      {stats.averageRatings[product.productId].average} ({stats.averageRatings[product.productId].count} reviews)
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Reviews Section */}
      <div className="mb-6">
        <div className="mb-2 font-semibold">Recent Product Reviews</div>
        {loadingReviews ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
            <div className="text-gray-500">Loading reviews...</div>
          </div>
        ) : reviews.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
            <div className="text-gray-500">No recent reviews</div>
          </div>
        ) : (
          <div className="space-y-2">
            {reviews.map((review) => (
              <div key={review.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-gray-500 text-sm">{review.products?.name || 'Unknown Product'}</div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, index) => (
                      <Star
                        key={index}
                        size={16}
                        className={`${
                          index < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="text-gray-700 text-sm">{review.feedback || 'No feedback provided'}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(review.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Notifications Section */}
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
