
'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import { FaArrowLeft, FaDownload, FaEye, FaCheckCircle } from 'react-icons/fa';

// Initialize Supabase client
const supabase = createClientComponentClient();

export default function FinancialManagement() {
  const [invoices, setInvoices] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [sortConfig, setSortConfig] = useState({ key: 'invoice_date', direction: 'desc' });
  const [showModal, setShowModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [commissionForm, setCommissionForm] = useState({ product_id: '', commission_rate: '' });
  const [taxForm, setTaxForm] = useState({ region: '', product_category: '', tax_rate: '' });
  const [promotionForm, setPromotionForm] = useState({
    name: '',
    discount_percentage: '',
    product_id: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch invoices
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
          .order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });

        if (searchTerm) {
          query = query.ilike('payment_id', `%${searchTerm}%`);
        }
        if (dateRange.start) {
          query = query.gte('invoice_date', dateRange.start);
        }
        if (dateRange.end) {
          query = query.lte('invoice_date', dateRange.end);
        }

        const { data: invoiceData, error: invoiceError } = await query;

        if (invoiceError) {
          console.error('Error fetching invoices:', invoiceError);
          setErrorMessage('Failed to fetch invoices. Please try again.');
          setInvoices([]);
        } else if (!invoiceData || invoiceData.length === 0) {
          setErrorMessage('No invoices found.');
          setInvoices([]);
        } else {
          const formattedInvoices = invoiceData.map((invoice) => ({
            ...invoice,
            order_ids: invoice.invoice_orders.map((link) => link.order_id),
          }));
          setInvoices(formattedInvoices);
        }

        // Fetch products for dropdown
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('id, name');

        if (productError) {
          console.error('Error fetching products:', productError);
          setErrorMessage('Failed to fetch products. Please try again.');
          setProducts([]);
        } else {
          setProducts(productData);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setErrorMessage('An unexpected error occurred.');
        setInvoices([]);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [searchTerm, dateRange, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

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

  const handleCommissionSubmit = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('seller_commissions').insert({
        product_id: commissionForm.product_id,
        commission_rate: parseFloat(commissionForm.commission_rate) / 100,
      });

      if (error) {
        console.error('Error setting commission:', error);
        setErrorMessage('Failed to set commission. Please try again.');
      } else {
        setSuccessMessage('Commission set successfully!');
        setCommissionForm({ product_id: '', commission_rate: '' });
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setErrorMessage('An unexpected error occurred.');
    }
    setTimeout(() => {
      setErrorMessage('');
      setSuccessMessage('');
    }, 3000);
  };

  const handleTaxSubmit = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('tax_rules').insert({
        region: taxForm.region,
        product_category: taxForm.product_category,
        tax_rate: parseFloat(taxForm.tax_rate) / 100,
      });

      if (error) {
        console.error('Error setting tax rule:', error);
        setErrorMessage('Failed to set tax rule. Please try again.');
      } else {
        setSuccessMessage('Tax rule set successfully!');
        setTaxForm({ region: '', product_category: '', tax_rate: '' });
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setErrorMessage('An unexpected error occurred.');
    }
    setTimeout(() => {
      setErrorMessage('');
      setSuccessMessage('');
    }, 3000);
  };

  const handlePromotionSubmit = async (e) => {
    e.preventDefault();
    try {
      // Insert into promotions table
      const { data: promoData, error: promoError } = await supabase
        .from('promotions')
        .insert({
          name: promotionForm.name,
          discount_percentage: parseFloat(promotionForm.discount_percentage) / 100,
          start_date: promotionForm.start_date,
          end_date: promotionForm.end_date,
        })
        .select('id')
        .single();

      if (promoError) {
        console.error('Error setting promotion:', promoError);
        setErrorMessage('Failed to set promotion. Please try again.');
        return;
      }

      const promotionId = promoData.id;

      // Insert into promotion_products table (single product_id)
      if (promotionForm.product_id) {
        const { error: linkError } = await supabase
          .from('promotion_products')
          .insert({
            promotion_id: promotionId,
            product_id: promotionForm.product_id,
          });

        if (linkError) {
          console.error('Error linking product to promotion:', linkError);
          setErrorMessage('Failed to link product to promotion.');
          return;
        }
      }

      setSuccessMessage('Promotion set successfully!');
      setPromotionForm({ name: '', discount_percentage: '', product_id: '', start_date: '', end_date: '' });
    } catch (err) {
      console.error('Unexpected error:', err);
      setErrorMessage('An unexpected error occurred.');
    }
    setTimeout(() => {
      setErrorMessage('');
      setSuccessMessage('');
    }, 3000);
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

          {/* Messages */}
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
          {successMessage && (
            <div className="mb-6">
              <div className="bg-green-50 border-l-4 border-green-500 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                <FaCheckCircle className="text-green-600" />
                {successMessage}
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

          {/* Management Forms */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Set Commission */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Set Commission</h3>
              <form onSubmit={handleCommissionSubmit} className="space-y-4">
                <div>
                  <label htmlFor="product_id" className="block text-sm font-medium text-gray-700 mb-1">
                    Product
                  </label>
                  <select
                    id="product_id"
                    value={commissionForm.product_id}
                    onChange={(e) => setCommissionForm({ ...commissionForm, product_id: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="" disabled>Select a product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="commission_rate" className="block text-sm font-medium text-gray-700 mb-1">
                    Commission Rate (%)
                  </label>
                  <input
                    id="commission_rate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={commissionForm.commission_rate}
                    onChange={(e) => setCommissionForm({ ...commissionForm, commission_rate: e.target.value })}
                    placeholder="e.g., 5 for 5%"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg font-semibold shadow-md transition-all duration-300"
                >
                  Set Commission
                </button>
              </form>
            </div>

            {/* Set Tax Rule */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Set Tax Rule</h3>
              <form onSubmit={handleTaxSubmit} className="space-y-4">
                <div>
                  <label htmlFor="region" className="block text-sm font-medium text-gray-700 mb-1">
                    Region
                  </label>
                  <input
                    id="region"
                    type="text"
                    value={taxForm.region}
                    onChange={(e) => setTaxForm({ ...taxForm, region: e.target.value })}
                    placeholder="e.g., default"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="product_category" className="block text-sm font-medium text-gray-700 mb-1">
                    Product Category
                  </label>
                  <input
                    id="product_category"
                    type="text"
                    value={taxForm.product_category}
                    onChange={(e) => setTaxForm({ ...taxForm, product_category: e.target.value })}
                    placeholder="e.g., general"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="tax_rate" className="block text-sm font-medium text-gray-700 mb-1">
                    Tax Rate (%)
                  </label>
                  <input
                    id="tax_rate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={taxForm.tax_rate}
                    onChange={(e) => setTaxForm({ ...taxForm, tax_rate: e.target.value })}
                    placeholder="e.g., 10 for 10%"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg font-semibold shadow-md transition-all duration-300"
                >
                  Set Tax Rule
                </button>
              </form>
            </div>

            {/* Set Promotion */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Set Promotion</h3>
              <form onSubmit={handlePromotionSubmit} className="space-y-4">
                <div>
                  <label htmlFor="promo_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Promotion Name
                  </label>
                  <input
                    id="promo_name"
                    type="text"
                    value={promotionForm.name}
                    onChange={(e) => setPromotionForm({ ...promotionForm, name: e.target.value })}
                    placeholder="e.g., Summer Sale"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="discount_percentage" className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Percentage (%)
                  </label>
                  <input
                    id="discount_percentage"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={promotionForm.discount_percentage}
                    onChange={(e) => setPromotionForm({ ...promotionForm, discount_percentage: e.target.value })}
                    placeholder="e.g., 20 for 20%"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="product_id" className="block text-sm font-medium text-gray-700 mb-1">
                    Product
                  </label>
                  <select
                    id="product_id"
                    value={promotionForm.product_id}
                    onChange={(e) => setPromotionForm({ ...promotionForm, product_id: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="" disabled>Select a product (optional)</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    id="start_date"
                    type="date"
                    value={promotionForm.start_date}
                    onChange={(e) => setPromotionForm({ ...promotionForm, start_date: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    id="end_date"
                    type="date"
                    value={promotionForm.end_date}
                    onChange={(e) => setPromotionForm({ ...promotionForm, end_date: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg font-semibold shadow-md transition-all duration-300"
                >
                  Set Promotion
                </button>
              </form>
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
                      <th scope="col" className="px-4 py-3 cursor-pointer" onClick={() => handleSort('id')}>
                        Invoice ID {sortConfig.key === 'id' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th scope="col" className="px-4 py-3 cursor-pointer" onClick={() => handleSort('payment_id')}>
                        Payment ID {sortConfig.key === 'payment_id' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th scope="col" className="px-4 py-3">User ID</th>
                      <th scope="col" className="px-4 py-3 cursor-pointer" onClick={() => handleSort('total_amount')}>
                        Total (₹) {sortConfig.key === 'total_amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th scope="col" className="px-4 py-3 cursor-pointer" onClick={() => handleSort('tax_amount')}>
                        Tax (₹) {sortConfig.key === 'tax_amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th scope="col" className="px-4 py-3 cursor-pointer" onClick={() => handleSort('commission_amount')}>
                        Commission (₹) {sortConfig.key === 'commission_amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th scope="col" className="px-4 py-3 cursor-pointer" onClick={() => handleSort('promotion_amount')}>
                        Promotion (₹) {sortConfig.key === 'promotion_amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th scope="col" className="px-4 py-3 cursor-pointer" onClick={() => handleSort('invoice_date')}>
                        Date {sortConfig.key === 'invoice_date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
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
                    <strong>Tax Amount:</strong> ₹{selectedInvoice.tax_amount.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Commission Amount:</strong> ₹{selectedInvoice.commission_amount.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Promotion Amount:</strong> ₹{selectedInvoice.promotion_amount.toFixed(2)}
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
