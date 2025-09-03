
'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import { FaArrowLeft, FaDownload, FaEye } from 'react-icons/fa';

// Initialize Supabase client
const supabase = createClientComponentClient();

export default function FinancialManagement() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showModal, setShowModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        let query = supabase
          .from('invoices')
          .select(`
            id,
            payment_id,
            user_id,
            total_amount,
            tax_amount,
            commission_amount,
            promotion_amount,
            invoice_date,
            status,
            invoice_orders(order_id)
          `)
          .order('invoice_date', { ascending: false });

        // Apply search filter
        if (searchTerm) {
          query = query.ilike('payment_id', `%${searchTerm}%`);
        }

        // Apply date range filter
        if (dateRange.start) {
          query = query.gte('invoice_date', dateRange.start);
        }
        if (dateRange.end) {
          query = query.lte('invoice_date', dateRange.end);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching invoices:', error);
          setErrorMessage('Failed to fetch invoices. Please try again.');
          setInvoices([]);
        } else if (!data || data.length === 0) {
          setErrorMessage('No invoices found.');
          setInvoices([]);
        } else {
          const formattedInvoices = data.map((invoice) => ({
            ...invoice,
            order_ids: invoice.invoice_orders.map((link) => link.order_id),
          }));
          setInvoices(formattedInvoices);
        }
      } catch (err) {
        console.error('Unexpected error fetching invoices:', err);
        setErrorMessage('An unexpected error occurred. Please try again.');
        setInvoices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [searchTerm, dateRange]);

  const handleDownloadCSV = () => {
    const headers = [
      'Invoice ID',
      'Payment ID',
      'User ID',
      'Total Amount (₹)',
      'Tax Amount (₹)',
      'Commission Amount (₹)',
      'Promotion Amount (₹)',
      'Invoice Date',
      'Status',
      'Order IDs',
    ];
    const rows = invoices.map((invoice) => [
      invoice.id,
      invoice.payment_id,
      invoice.user_id,
      invoice.total_amount.toFixed(2),
      invoice.tax_amount.toFixed(2),
      invoice.commission_amount.toFixed(2),
      invoice.promotion_amount.toFixed(2),
      new Date(invoice.invoice_date).toLocaleDateString(),
      invoice.status,
      invoice.order_ids.join(', '),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'invoices.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewOrders = (invoice) => {
    setSelectedInvoice(invoice);
    setShowModal(true);
  };

  const totalAmount = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
  const totalTax = invoices.reduce((sum, inv) => sum + inv.tax_amount, 0);
  const totalCommission = invoices.reduce((sum, inv) => sum + inv.commission_amount, 0);
  const totalPromotion = invoices.reduce((sum, inv) => sum + inv.promotion_amount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Financial Dashboard
            </h1>
            <Link href="/">
              <button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-semibold shadow-md transition-all duration-300 hover:scale-105 flex items-center gap-2">
                <FaArrowLeft className="text-lg" />
                Return to Home
              </button>
            </Link>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-6">
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="w-4 h-4 bg-red-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold">!</span>
                </div>
                {errorMessage}
              </div>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h3 className="text-sm font-medium text-gray-600">Total Invoices</h3>
              <p className="text-2xl font-bold text-blue-600">{invoices.length}</p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h3 className="text-sm font-medium text-gray-600">Total Amount</h3>
              <p className="text-2xl font-bold text-blue-600">₹{totalAmount.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h3 className="text-sm font-medium text-gray-600">Total Commissions</h3>
              <p className="text-2xl font-bold text-blue-600">₹{totalCommission.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h3 className="text-sm font-medium text-gray-600">Total Taxes</h3>
              <p className="text-2xl font-bold text-blue-600">₹{totalTax.toFixed(2)}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-100">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                  Search by Payment ID
                </label>
                <input
                  id="search"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Enter payment ID..."
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  id="startDate"
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  id="endDate"
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                />
              </div>
            </div>
          </div>

          {/* Invoices Table */}
          <div className="bg-white rounded-xl shadow-md p-6 sm:p-8 border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <div className="w-2 h-6 bg-blue-600 rounded-full"></div>
                Invoices
              </h2>
              <button
                onClick={handleDownloadCSV}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg font-semibold shadow-md transition-all duration-300 hover:scale-105 flex items-center gap-2"
              >
                <FaDownload />
                Export CSV
              </button>
            </div>
            {loading ? (
              <div className="space-y-4">
                <div className="h-6 bg-gray-200 rounded w-40 mb-4 animate-pulse"></div>
                <div className="h-10 bg-gray-200 rounded w-full animate-pulse"></div>
              </div>
            ) : invoices.length === 0 ? (
              <p className="text-gray-600 text-center">No invoices available.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-600">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-3">Invoice ID</th>
                      <th scope="col" className="px-4 py-3">Payment ID</th>
                      <th scope="col" className="px-4 py-3">User ID</th>
                      <th scope="col" className="px-4 py-3">Total (₹)</th>
                      <th scope="col" className="px-4 py-3">Tax (₹)</th>
                      <th scope="col" className="px-4 py-3">Commission (₹)</th>
                      <th scope="col" className="px-4 py-3">Promotion (₹)</th>
                      <th scope="col" className="px-4 py-3">Date</th>
                      <th scope="col" className="px-4 py-3">Status</th>
                      <th scope="col" className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4 truncate max-w-[150px]" title={invoice.id}>{invoice.id}</td>
                        <td className="px-4 py-4 truncate max-w-[150px]" title={invoice.payment_id}>{invoice.payment_id}</td>
                        <td className="px-4 py-4 truncate max-w-[150px]" title={invoice.user_id}>{invoice.user_id}</td>
                        <td className="px-4 py-4">{invoice.total_amount.toFixed(2)}</td>
                        <td className="px-4 py-4">{invoice.tax_amount.toFixed(2)}</td>
                        <td className="px-4 py-4">{invoice.commission_amount.toFixed(2)}</td>
                        <td className="px-4 py-4">{invoice.promotion_amount.toFixed(2)}</td>
                        <td className="px-4 py-4">{new Date(invoice.invoice_date).toLocaleDateString()}</td>
                        <td className="px-4 py-4">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                            invoice.status === 'generated' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {invoice.status}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <button
                            onClick={() => handleViewOrders(invoice)}
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
                            title="View associated orders"
                            aria-label={`View orders for invoice ${invoice.id}`}
                          >
                            <FaEye />
                            View Orders
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Modal for Order Details */}
          {showModal && selectedInvoice && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Order Details for Invoice {selectedInvoice.id}</h3>
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    <strong>Payment ID:</strong> {selectedInvoice.payment_id}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Total Amount:</strong> ₹{selectedInvoice.total_amount.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Order IDs:</strong>{' '}
                    {selectedInvoice.order_ids.length > 0
                      ? selectedInvoice.order_ids.join(', ')
                      : 'None'}
                  </p>
                </div>
                <div className="text-right">
                  <button
                    onClick={() => setShowModal(false)}
                    className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
