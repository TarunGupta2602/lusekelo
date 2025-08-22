import React from 'react';

export default function DashboardSection({ userName }) {
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
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <div>
            You just got a new order <span className="text-green-600 font-semibold">#123456</span>
            <div className="text-xs text-gray-500">A new order has been placed.</div>
          </div>
          <button className="text-gray-400 hover:text-gray-600">×</button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <div>
            Order <span className="text-red-600 font-semibold">#124235</span> has been Canceled
            <div className="text-xs text-gray-500">An order has been canceled.</div>
          </div>
          <button className="text-gray-400 hover:text-gray-600">×</button>
        </div>
      </div>
    </div>
  );
}
