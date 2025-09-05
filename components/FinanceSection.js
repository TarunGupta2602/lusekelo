'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { FaDownload, FaEye } from 'react-icons/fa';

export default function FinanceSection({ store, products, orders, setError }) {
  const [commissions, setCommissions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState({ commissions: true, invoices: true, payouts: true });
  const [sectionErrors, setSectionErrors] = useState({ commissions: '', invoices: '', payouts: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [sortConfig, setSortConfig] = useState({ key: 'invoice_date', direction: 'desc' });
  const [showModal, setShowModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    const fetchFinancialData = async () => {
      if (!store?.id || products.length === 0) {
        setSectionErrors({
          commissions: 'No store or products found.',
          invoices: 'No store or products found.',
          payouts: 'No store or products found.',
        });
        setLoading({ commissions: false, invoices: false, payouts: false });
        return;
      }

      try {
        // Log input data
        console.log('Store ID:', store.id);
        console.log('Products:', products.map(p => ({ id: p.id, name: p.name })));
        console.log('Orders:', orders.map(o => ({ id: o.id, product_id: o.product_id })));

        // Fetch commissions
        setLoading(prev => ({ ...prev, commissions: true }));
        setSectionErrors(prev => ({ ...prev, commissions: '' }));
        const productIds = products.map(p => p.id);
        const { data: commissionData, error: commissionError } = await supabase
          .from('seller_commissions')
          .select('id, product_id, commission_rate, products(name)')
          .in('product_id', productIds);

        console.log('Commission Data:', commissionData);
        console.log('Commission Error:', commissionError);

        if (commissionError) {
          setSectionErrors(prev => ({ ...prev, commissions: 'Failed to fetch commissions: ' + commissionError.message }));
          setCommissions([]);
        } else {
          setCommissions(commissionData || []);
          if (!commissionData || commissionData.length === 0) {
            setSectionErrors(prev => ({ ...prev, commissions: 'No commissions set for your products.' }));
          }
        }
        setLoading(prev => ({ ...prev, commissions: false }));

        // Fetch invoices
        setLoading(prev => ({ ...prev, invoices: true }));
        setSectionErrors(prev => ({ ...prev, invoices: '' }));
        const orderIds = orders.filter(o => productIds.includes(o.product_id)).map(o => o.id);
        console.log('Order IDs for Invoices:', orderIds);

        let filteredInvoices = [];
        if (orderIds.length === 0) {
          setInvoices([]);
          setSectionErrors(prev => ({ ...prev, invoices: 'No orders found for your products.' }));
        } else {
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

          if (searchTerm) query = query.ilike('payment_id', `%${searchTerm}%`);
          if (dateRange.start) query = query.gte('invoice_date', dateRange.start);
          if (dateRange.end) query = query.lte('invoice_date', dateRange.end);

          const { data: invoiceData, error: invoiceError } = await query;

          console.log('Invoice Data:', invoiceData);
          console.log('Invoice Error:', invoiceError);

          if (invoiceError) {
            setSectionErrors(prev => ({ ...prev, invoices: 'Failed to fetch invoices: ' + invoiceError.message }));
            setInvoices([]);
          } else {
            filteredInvoices = invoiceData
              .filter(invoice => invoice.invoice_orders.some(link => orderIds.includes(link.order_id)))
              .map(invoice => ({
                ...invoice,
                order_ids: invoice.invoice_orders.map(link => link.order_id),
              }));
            setInvoices(filteredInvoices);
            if (filteredInvoices.length === 0) {
              setSectionErrors(prev => ({ ...prev, invoices: 'No invoices linked to your orders.' }));
            }
          }
        }
        setLoading(prev => ({ ...prev, invoices: false }));

        // Derive payout schedules
        setLoading(prev => ({ ...prev, payouts: true }));
        setSectionErrors(prev => ({ ...prev, payouts: '' }));
        const invoicesByWeek = {};
        filteredInvoices.forEach(invoice => {
          const date = new Date(invoice.invoice_date);
          if (isNaN(date)) {
            console.warn(`Invalid invoice_date for invoice ${invoice.id}: ${invoice.invoice_date}`);
            return;
          }
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          const weekKey = weekStart.toISOString().split('T')[0];

          if (!invoicesByWeek[weekKey]) {
            invoicesByWeek[weekKey] = {
              week_start: weekKey,
              total_amount: 0,
              commission_amount: 0,
              status: (new Date() - date) / (1000 * 60 * 60 * 24) <= 30 ? 'Pending' : 'Paid',
            };
          }
          invoicesByWeek[weekKey].total_amount += Number(invoice.total_amount) || 0;
          invoicesByWeek[weekKey].commission_amount += Number(invoice.commission_amount) || 0;
        });

        const payoutData = Object.values(invoicesByWeek);
        console.log('Payout Data:', payoutData);
        setPayouts(payoutData);
        if (payoutData.length === 0) {
          setSectionErrors(prev => ({ ...prev, payouts: 'No payouts scheduled.' }));
        }
        setLoading(prev => ({ ...prev, payouts: false }));
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred in Finance Section.');
        setSectionErrors({
          commissions: 'Error loading commissions.',
          invoices: 'Error loading invoices.',
          payouts: 'Error loading payouts.',
        });
        setLoading({ commissions: false, invoices: false, payouts: false });
      }
    };

    fetchFinancialData();
  }, [store, products, orders, searchTerm, dateRange, sortConfig, setError]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleDownloadCSV = () => {
    if (invoices.length === 0) return;
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
      invoice.user_id || 'N/A',
      Number(invoice.total_amount).toFixed(2),
      Number(invoice.tax_amount).toFixed(2),
      Number(invoice.commission_amount).toFixed(2),
      Number(invoice.promotion_amount).toFixed(2),
      new Date(invoice.invoice_date).toLocaleDateString('en-GB'),
      invoice.status,
      invoice.order_ids.join(', '),
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `invoices_${store?.name || 'vendor'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewOrders = (invoice) => {
    setSelectedInvoice(invoice);
    setShowModal(true);
  };

  const totalCommission = invoices.reduce((sum, inv) => sum + Number(inv.commission_amount), 0);
  const totalAmount = invoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <h3 className="text-xs font-medium text-gray-600">Total Invoices</h3>
          <p className="text-xl font-semibold text-blue-600">{invoices.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <h3 className="text-xs font-medium text-gray-600">Total Sales (₹)</h3>
          <p className="text-xl font-semibold text-blue-600">₹{totalAmount.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <h3 className="text-xs font-medium text-gray-600">Total Commissions Paid (₹)</h3>
          <p className="text-xl font-semibold text-blue-600">₹{totalCommission.toFixed(2)}</p>
        </div>
      </div>

      {/* Commission Breakdown */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Commission Breakdown</h3>
        {loading.commissions ? (
          <div className="space-y-3">
            <div className="h-5 bg-gray-200 rounded w-1/4 animate-pulse"></div>
            <div className="h-8 bg-gray-200 rounded w-full animate-pulse"></div>
          </div>
        ) : sectionErrors.commissions ? (
          <p className="text-red-600 text-sm">{sectionErrors.commissions}</p>
        ) : commissions.length === 0 ? (
          <p className="text-gray-600 text-sm">No commission data available. Ensure commissions are set for your products.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-600">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                <tr>
                  <th scope="col" className="px-3 py-2">Product</th>
                  <th scope="col" className="px-3 py-2">Commission Rate (%)</th>
                  <th scope="col" className="px-3 py-2">Total Paid (₹)</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((commission) => {
                  const totalPaid = invoices
                    .filter(inv => inv.order_ids.some(orderId => {
                      const order = orders.find(o => o.id === orderId);
                      return order && order.product_id === commission.product_id;
                    }))
                    .reduce((sum, inv) => sum + Number(inv.commission_amount), 0);
                  return (
                    <tr key={commission.id} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2 truncate max-w-[120px] sm:max-w-[200px]">{commission.products?.name || 'Unknown'}</td>
                      <td className="px-3 py-2">{(commission.commission_rate * 100).toFixed(2)}</td>
                      <td className="px-3 py-2">₹{totalPaid.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payout Schedules */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payout Schedules</h3>
        {loading.payouts ? (
          <div className="space-y-3">
            <div className="h-5 bg-gray-200 rounded w-1/4 animate-pulse"></div>
            <div className="h-8 bg-gray-200 rounded w-full animate-pulse"></div>
          </div>
        ) : sectionErrors.payouts ? (
          <p className="text-red-600 text-sm">{sectionErrors.payouts}</p>
        ) : payouts.length === 0 ? (
          <p className="text-gray-600 text-sm">No payouts scheduled. Check if invoices exist for your orders.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-600">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                <tr>
                  <th scope="col" className="px-3 py-2">Week Starting</th>
                  <th scope="col" className="px-3 py-2">Total Sales (₹)</th>
                  <th scope="col" className="px-3 py-2">Commission Paid (₹)</th>
                  <th scope="col" className="px-3 py-2">Net Payout (₹)</th>
                  <th scope="col" className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((payout, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2">{new Date(payout.week_start).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                    <td className="px-3 py-2">₹{payout.total_amount.toFixed(2)}</td>
                    <td className="px-3 py-2">₹{payout.commission_amount.toFixed(2)}</td>
                    <td className="px-3 py-2">₹{(payout.total_amount - payout.commission_amount).toFixed(2)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${payout.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {payout.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoices */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <div className="w-1.5 h-5 bg-blue-600 rounded-full"></div>
            Invoices
          </h3>
          <button
            onClick={handleDownloadCSV}
            className="mt-2 sm:mt-0 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-all duration-200 flex items-center gap-2"
            disabled={invoices.length === 0}
          >
            <FaDownload className="text-sm" />
            Export CSV
          </button>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search by Payment ID
            </label>
            <input
              id="search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Enter payment ID..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              id="startDate"
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              id="endDate"
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        {loading.invoices ? (
          <div className="space-y-3">
            <div className="h-5 bg-gray-200 rounded w-1/4 animate-pulse"></div>
            <div className="h-8 bg-gray-200 rounded w-full animate-pulse"></div>
          </div>
        ) : sectionErrors.invoices ? (
          <p className="text-red-600 text-sm">{sectionErrors.invoices}</p>
        ) : invoices.length === 0 ? (
          <p className="text-gray-600 text-sm text-center">No invoices available. Ensure orders are linked to invoices for your products.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-600">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                <tr>
                  <th scope="col" className="px-3 py-2 cursor-pointer" onClick={() => handleSort('id')}>
                    ID {sortConfig.key === 'id' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th scope="col" className="px-3 py-2 cursor-pointer" onClick={() => handleSort('payment_id')}>
                    Payment ID {sortConfig.key === 'payment_id' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th scope="col" className="px-3 py-2">User ID</th>
                  <th scope="col" className="px-3 py-2 cursor-pointer" onClick={() => handleSort('total_amount')}>
                    Total (₹) {sortConfig.key === 'total_amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th scope="col" className="px-3 py-2 cursor-pointer" onClick={() => handleSort('commission_amount')}>
                    Comm. Paid (₹) {sortConfig.key === 'commission_amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th scope="col" className="px-3 py-2 cursor-pointer" onClick={() => handleSort('invoice_date')}>
                    Date {sortConfig.key === 'invoice_date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th scope="col" className="px-3 py-2">Status</th>
                  <th scope="col" className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 truncate max-w-[100px] sm:max-w-[150px]" title={invoice.id}>{invoice.id}</td>
                    <td className="px-3 py-2 truncate max-w-[100px] sm:max-w-[150px]" title={invoice.payment_id}>{invoice.payment_id}</td>
                    <td className="px-3 py-2 truncate max-w-[100px] sm:max-w-[150px]" title={invoice.user_id || 'N/A'}>{invoice.user_id || 'N/A'}</td>
                    <td className="px-3 py-2">₹{Number(invoice.total_amount).toFixed(2)}</td>
                    <td className="px-3 py-2">₹{Number(invoice.commission_amount).toFixed(2)}</td>
                    <td className="px-3 py-2">{new Date(invoice.invoice_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${invoice.status === 'generated' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => handleViewOrders(invoice)}
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
                        title="View associated orders"
                      >
                        <FaEye className="text-sm" />
                        <span className="hidden sm:inline">View</span>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Details for Invoice {selectedInvoice.id}</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>Payment ID:</strong> {selectedInvoice.payment_id}</p>
              <p><strong>Total Amount:</strong> ₹{Number(selectedInvoice.total_amount).toFixed(2)}</p>
              <p><strong>Tax Amount:</strong> ₹{Number(selectedInvoice.tax_amount).toFixed(2)}</p>
              <p><strong>Commission Paid:</strong> ₹{Number(selectedInvoice.commission_amount).toFixed(2)}</p>
              <p><strong>Promotion Amount:</strong> ₹{Number(selectedInvoice.promotion_amount).toFixed(2)}</p>
              <p><strong>Order IDs:</strong>{' '}
                {selectedInvoice.order_ids.length > 0 ? selectedInvoice.order_ids.join(', ') : 'None'}
              </p>
            </div>
            <div className="mt-4 text-right">
              <button
                onClick={() => setShowModal(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}