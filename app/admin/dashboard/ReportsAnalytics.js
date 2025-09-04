'use client';
import { useEffect, useState } from 'react';
import Papa from 'papaparse';
import { FaChartLine, FaDownload } from 'react-icons/fa';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';
import { createClient } from '@supabase/supabase-js';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function ReportsAnalytics() {
  const [salesData, setSalesData] = useState([]);
  const [fulfillmentData, setFulfillmentData] = useState([]);
  const [dateRange, setDateRange] = useState('30');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Calculate the start date for the range
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(dateRange));
        const startDateISO = startDate.toISOString();

        // Fetch sales data with nested relationships
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select(
            'id, quantity, total_amount, status, created_at, products:product_id (name, supermarkets:supermarket_id (name))'
          )
          .gte('created_at', startDateISO)
          .order('created_at', { ascending: false });

        if (ordersError) throw new Error(`Error fetching orders: ${ordersError.message}`);
        setSalesData(orders || []);

        // Fetch fulfillment data (removed shipped_at and delivered_at)
        const { data: fulfillment, error: fulfillmentError } = await supabase
          .from('orders')
          .select('id, status, created_at')
          .gte('created_at', startDateISO)
          .order('created_at', { ascending: false });

        if (fulfillmentError) throw new Error(`Error fetching fulfillment data: ${fulfillmentError.message}`);
        setFulfillmentData(fulfillment || []);
      } catch (err) {
        setError(`Unexpected error: ${err.message}`);
        console.error(err); // Log error for debugging
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dateRange]);

  // Calculate key metrics
  const totalSales = salesData.reduce((sum, order) => sum + order.total_amount, 0);
  const totalOrders = salesData.length;
  const averageOrderValue = totalOrders ? (totalSales / totalOrders).toFixed(2) : 0;
  const fulfilledOrders = fulfillmentData.filter((order) => order.status === 'completed').length;

  // Prepare data for charts
  const salesByDate = salesData.reduce((acc, order) => {
    const date = new Date(order.created_at).toLocaleDateString();
    acc[date] = (acc[date] || 0) + order.total_amount;
    return acc;
  }, {});
  const salesChartData = {
    labels: Object.keys(salesByDate),
    datasets: [
      {
        label: 'Total Sales ($)',
        data: Object.values(salesByDate),
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: '#3b82f6',
        borderWidth: 1,
      },
    ],
  };

  const fulfillmentByStatus = fulfillmentData.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {});
  const fulfillmentChartData = {
    labels: Object.keys(fulfillmentByStatus),
    datasets: [
      {
        label: 'Orders by Status',
        data: Object.values(fulfillmentByStatus),
        backgroundColor: ['#34d399', '#facc15', '#ef4444', '#8b5cf6'],
      },
    ],
  };

  const handleExport = () => {
    const exportData = salesData.map((order) => ({
      OrderID: order.id,
      Product: order.products?.name || 'N/A',
      Supermarket: order.products?.supermarkets?.name || 'N/A',
      Quantity: order.quantity,
      TotalAmount: order.total_amount.toFixed(2),
      Status: order.status,
      CreatedAt: new Date(order.created_at).toLocaleString(),
    }));
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `sales_report_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    alert('Sales report exported successfully!');
  };

  if (loading) {
    return <div className="text-center text-gray-500 py-8 text-sm">Loading reports...</div>;
  }

  if (error) {
    return <div className="text-center text-red-400 py-8 text-sm">{error}</div>;
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
        <h2 className="text-xl font-bold text-gray-900">Reports & Analytics</h2>
        <div className="flex gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border border-gray-300 px-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            aria-label="Select date range"
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="365">Last Year</option>
          </select>
          <button
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-4 py-2 rounded-lg shadow flex items-center gap-2 text-sm"
            onClick={handleExport}
            aria-label="Export Sales Report"
          >
            <FaDownload /> Export
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700">Total Sales</h3>
          <p className="text-2xl font-bold text-blue-600">${totalSales.toFixed(2)}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700">Total Orders</h3>
          <p className="text-2xl font-bold text-green-600">{totalOrders}</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700">Average Order Value</h3>
          <p className="text-2xl font-bold text-yellow-600">${averageOrderValue}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Sales Over Time</h3>
          <Line
            data={salesChartData}
            options={{
              responsive: true,
              plugins: { legend: { position: 'top' }, title: { display: true, text: 'Sales Trend' } },
            }}
          />
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Fulfillment Status</h3>
          <Bar
            data={fulfillmentChartData}
            options={{
              responsive: true,
              plugins: { legend: { position: 'top' }, title: { display: true, text: 'Order Status Distribution' } },
            }}
          />
        </div>
      </div>

      {/* Sales Table */}
      <div className="overflow-x-auto">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Sales Details</h3>
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase">Order ID</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase">Product</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase">Supermarket</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase">Quantity</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase">Total Amount</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase">Created At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {salesData.map((order) => (
              <tr key={order.id} className="hover:bg-blue-50">
                <td className="px-4 py-3">{order.id}</td>
                <td className="px-4 py-3">{order.products?.name || 'N/A'}</td>
                <td className="px-4 py-3">{order.products?.supermarkets?.name || 'N/A'}</td>
                <td className="px-4 py-3">{order.quantity}</td>
                <td className="px-4 py-3">${order.total_amount.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      order.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : order.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {order.status}
                  </span>
                </td>
                <td className="px-4 py-3">{new Date(order.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}