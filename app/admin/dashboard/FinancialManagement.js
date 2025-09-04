'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import { FaArrowLeft, FaDownload, FaEye, FaCheckCircle, FaEdit, FaTrash } from 'react-icons/fa';

// Initialize Supabase client
const supabase = createClientComponentClient();

export default function FinancialManagement() {
  const [invoices, setInvoices] = useState([]);
  const [products, setProducts] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [taxRules, setTaxRules] = useState([]);
  const [promotions, setPromotions] = useState([]);
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
  const [editCommission, setEditCommission] = useState(null);
  const [editTaxRule, setEditTaxRule] = useState(null);
  const [editPromotion, setEditPromotion] = useState(null);

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

        // Fetch products
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

        // Fetch commissions
        const { data: commissionData, error: commissionError } = await supabase
          .from('seller_commissions')
          .select('id, product_id, commission_rate, products(name)');

        if (commissionError) {
          console.error('Error fetching commissions:', commissionError);
          setErrorMessage('Failed to fetch commissions. Please try again.');
          setCommissions([]);
        } else {
          setCommissions(commissionData);
        }

        // Fetch tax rules
        const { data: taxData, error: taxError } = await supabase
          .from('tax_rules')
          .select('id, region, product_category, tax_rate');

        if (taxError) {
          console.error('Error fetching tax rules:', taxError);
          setErrorMessage('Failed to fetch tax rules. Please try again.');
          setTaxRules([]);
        } else {
          setTaxRules(taxData);
        }

        // Fetch promotions
        const { data: promotionData, error: promotionError } = await supabase
          .from('promotions')
          .select(`
            id,
            name,
            discount_percentage,
            start_date,
            end_date,
            promotion_products(product_id, products(name))
          `);

        if (promotionError) {
          console.error('Error fetching promotions:', promotionError);
          setErrorMessage('Failed to fetch promotions. Please try again.');
          setPromotions([]);
        } else {
          const formattedPromotions = promotionData.map((promo) => ({
            ...promo,
            product_name: promo.promotion_products.length > 0 ? promo.promotion_products[0].products.name : 'None',
          }));
          setPromotions(formattedPromotions);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setErrorMessage('An unexpected error occurred.');
        setInvoices([]);
        setProducts([]);
        setCommissions([]);
        setTaxRules([]);
        setPromotions([]);
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

  // Commission Handlers
  const handleCommissionSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editCommission) {
        const { error } = await supabase
          .from('seller_commissions')
          .update({
            product_id: commissionForm.product_id,
            commission_rate: parseFloat(commissionForm.commission_rate) / 100,
          })
          .eq('id', editCommission.id);

        if (error) {
          console.error('Error updating commission:', error);
          setErrorMessage('Failed to update commission. Please try again.');
        } else {
          setSuccessMessage('Commission updated successfully!');
          setCommissions((prev) =>
            prev.map((c) =>
              c.id === editCommission.id
                ? {
                    ...c,
                    product_id: commissionForm.product_id,
                    commission_rate: parseFloat(commissionForm.commission_rate) / 100,
                  }
                : c
            )
          );
          setEditCommission(null);
          setCommissionForm({ product_id: '', commission_rate: '' });
        }
      } else {
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
          const { data } = await supabase.from('seller_commissions').select('id, product_id, commission_rate, products(name)');
          setCommissions(data);
        }
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

  const handleEditCommission = (commission) => {
    setEditCommission(commission);
    setCommissionForm({
      product_id: commission.product_id,
      commission_rate: (commission.commission_rate * 100).toString(),
    });
  };

  const handleDeleteCommission = async (id) => {
    if (confirm('Are you sure you want to delete this commission?')) {
      try {
        const { error } = await supabase.from('seller_commissions').delete().eq('id', id);
        if (error) {
          console.error('Error deleting commission:', error);
          setErrorMessage('Failed to delete commission. Please try again.');
        } else {
          setSuccessMessage('Commission deleted successfully!');
          setCommissions((prev) => prev.filter((c) => c.id !== id));
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setErrorMessage('An unexpected error occurred.');
      }
      setTimeout(() => {
        setErrorMessage('');
        setSuccessMessage('');
      }, 3000);
    }
  };

  // Tax Rule Handlers
  const handleTaxSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editTaxRule) {
        const { error } = await supabase
          .from('tax_rules')
          .update({
            region: taxForm.region,
            product_category: taxForm.product_category,
            tax_rate: parseFloat(taxForm.tax_rate) / 100,
          })
          .eq('id', editTaxRule.id);

        if (error) {
          console.error('Error updating tax rule:', error);
          setErrorMessage('Failed to update tax rule. Please try again.');
        } else {
          setSuccessMessage('Tax rule updated successfully!');
          setTaxRules((prev) =>
            prev.map((t) =>
              t.id === editTaxRule.id
                ? {
                    ...t,
                    region: taxForm.region,
                    product_category: taxForm.product_category,
                    tax_rate: parseFloat(taxForm.tax_rate) / 100,
                  }
                : t
            )
          );
          setEditTaxRule(null);
          setTaxForm({ region: '', product_category: '', tax_rate: '' });
        }
      } else {
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
          const { data } = await supabase.from('tax_rules').select('id, region, product_category, tax_rate');
          setTaxRules(data);
        }
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

  const handleEditTaxRule = (taxRule) => {
    setEditTaxRule(taxRule);
    setTaxForm({
      region: taxRule.region,
      product_category: taxRule.product_category,
      tax_rate: (taxRule.tax_rate * 100).toString(),
    });
  };

  const handleDeleteTaxRule = async (id) => {
    if (confirm('Are you sure you want to delete this tax rule?')) {
      try {
        const { error } = await supabase.from('tax_rules').delete().eq('id', id);
        if (error) {
          console.error('Error deleting tax rule:', error);
          setErrorMessage('Failed to delete tax rule. Please try again.');
        } else {
          setSuccessMessage('Tax rule deleted successfully!');
          setTaxRules((prev) => prev.filter((t) => t.id !== id));
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setErrorMessage('An unexpected error occurred.');
      }
      setTimeout(() => {
        setErrorMessage('');
        setSuccessMessage('');
      }, 3000);
    }
  };

  // Promotion Handlers
  const handlePromotionSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editPromotion) {
        const { error: promoError } = await supabase
          .from('promotions')
          .update({
            name: promotionForm.name,
            discount_percentage: parseFloat(promotionForm.discount_percentage) / 100,
            start_date: promotionForm.start_date,
            end_date: promotionForm.end_date,
          })
          .eq('id', editPromotion.id);

        if (promoError) {
          console.error('Error updating promotion:', promoError);
          setErrorMessage('Failed to update promotion. Please try again.');
          return;
        }

        if (promotionForm.product_id) {
          await supabase.from('promotion_products').delete().eq('promotion_id', editPromotion.id);
          const { error: linkError } = await supabase.from('promotion_products').insert({
            promotion_id: editPromotion.id,
            product_id: promotionForm.product_id,
          });

          if (linkError) {
            console.error('Error linking product to promotion:', linkError);
            setErrorMessage('Failed to link product to promotion.');
            return;
          }
        }

        setSuccessMessage('Promotion updated successfully!');
        setEditPromotion(null);
        setPromotionForm({ name: '', discount_percentage: '', product_id: '', start_date: '', end_date: '' });
        const { data } = await supabase
          .from('promotions')
          .select(`
            id,
            name,
            discount_percentage,
            start_date,
            end_date,
            promotion_products(product_id, products(name))
          `);
        const formattedPromotions = data.map((promo) => ({
          ...promo,
          product_name: promo.promotion_products.length > 0 ? promo.promotion_products[0].products.name : 'None',
        }));
        setPromotions(formattedPromotions);
      } else {
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
        const { data } = await supabase
          .from('promotions')
          .select(`
            id,
            name,
            discount_percentage,
            start_date,
            end_date,
            promotion_products(product_id, products(name))
          `);
        const formattedPromotions = data.map((promo) => ({
          ...promo,
          product_name: promo.promotion_products.length > 0 ? promo.promotion_products[0].products.name : 'None',
        }));
        setPromotions(formattedPromotions);
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

  const handleEditPromotion = (promotion) => {
    setEditPromotion(promotion);
    setPromotionForm({
      name: promotion.name,
      discount_percentage: (promotion.discount_percentage * 100).toString(),
      product_id: promotion.promotion_products.length > 0 ? promotion.promotion_products[0].product_id : '',
      start_date: promotion.start_date,
      end_date: promotion.end_date,
    });
  };

  const handleDeletePromotion = async (id) => {
    if (confirm('Are you sure you want to delete this promotion?')) {
      try {
        await supabase.from('promotion_products').delete().eq('promotion_id', id);
        const { error } = await supabase.from('promotions').delete().eq('id', id);
        if (error) {
          console.error('Error deleting promotion:', error);
          setErrorMessage('Failed to delete promotion. Please try again.');
        } else {
          setSuccessMessage('Promotion deleted successfully!');
          setPromotions((prev) => prev.filter((p) => p.id !== id));
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setErrorMessage('An unexpected error occurred.');
      }
      setTimeout(() => {
        setErrorMessage('');
        setSuccessMessage('');
      }, 3000);
    }
  };

  const totalAmount = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
  const totalTax = invoices.reduce((sum, inv) => sum + inv.tax_amount, 0);
  const totalCommission = invoices.reduce((sum, inv) => sum + inv.commission_amount, 0);
  const totalPromotion = invoices.reduce((sum, inv) => sum + inv.promotion_amount, 0);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-full mx-auto">
          {/* Header */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Financial Dashboard
            </h1>
            <Link href="/">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm shadow-sm transition-all duration-200 flex items-center gap-2">
                <FaArrowLeft className="text-sm" />
                Back to Home
              </button>
            </Link>
          </div>

          {/* Messages */}
          {errorMessage && (
            <div className="mb-4">
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-2 rounded-md text-sm flex items-center gap-2 shadow-sm animate-in fade-in">
                <div className="w-4 h-4 bg-red-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold">!</span>
                </div>
                {errorMessage}
              </div>
            </div>
          )}
          {successMessage && (
            <div className="mb-4">
              <div className="bg-green-50 border-l-4 border-green-500 text-green-700 px-4 py-2 rounded-md text-sm flex items-center gap-2 shadow-sm animate-in fade-in">
                <FaCheckCircle className="text-green-600" />
                {successMessage}
              </div>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <h3 className="text-xs font-medium text-gray-600">Total Invoices</h3>
              <p className="text-xl font-semibold text-blue-600">{invoices.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <h3 className="text-xs font-medium text-gray-600">Total Amount</h3>
              <p className="text-xl font-semibold text-blue-600">₹{totalAmount.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <h3 className="text-xs font-medium text-gray-600">Total Commissions</h3>
              <p className="text-xl font-semibold text-blue-600">₹{totalCommission.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <h3 className="text-xs font-medium text-gray-600">Total Taxes</h3>
              <p className="text-xl font-semibold text-blue-600">₹{totalTax.toFixed(2)}</p>
            </div>
          </div>

          {/* Management Forms and Tables */}
          <div className="space-y-6">
            {/* Commission Section */}
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editCommission ? 'Edit Commission' : 'Set Commission'}
              </h3>
              <form onSubmit={handleCommissionSubmit} className="space-y-3">
                <div>
                  <label htmlFor="product_id" className="block text-sm font-medium text-gray-700 mb-1">
                    Product
                  </label>
                  <select
                    id="product_id"
                    value={commissionForm.product_id}
                    onChange={(e) => setCommissionForm({ ...commissionForm, product_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    placeholder="e.g., 5"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="submit"
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-all duration-200"
                  >
                    {editCommission ? 'Update' : 'Set'} Commission
                  </button>
                  {editCommission && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditCommission(null);
                        setCommissionForm({ product_id: '', commission_rate: '' });
                      }}
                      className="w-full sm:w-auto bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Existing Commissions</h4>
                {commissions.length === 0 ? (
                  <p className="text-gray-600 text-sm">No commissions available.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-600">
                      <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                        <tr>
                          <th scope="col" className="px-3 py-2">Product</th>
                          <th scope="col" className="px-3 py-2">Rate (%)</th>
                          <th scope="col" className="px-3 py-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {commissions.map((commission) => (
                          <tr key={commission.id} className="border-b hover:bg-gray-50">
                            <td className="px-3 py-2 truncate max-w-[120px] sm:max-w-[200px]">{commission.products.name}</td>
                            <td className="px-3 py-2">{(commission.commission_rate * 100).toFixed(2)}</td>
                            <td className="px-3 py-2 flex gap-2">
                              <button
                                onClick={() => handleEditCommission(commission)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Edit commission"
                              >
                                <FaEdit className="text-sm" />
                              </button>
                              <button
                                onClick={() => handleDeleteCommission(commission.id)}
                                className="text-red-600 hover:text-red-800"
                                title="Delete commission"
                              >
                                <FaTrash className="text-sm" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Tax Rule Section */}
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editTaxRule ? 'Edit Tax Rule' : 'Set Tax Rule'}
              </h3>
              <form onSubmit={handleTaxSubmit} className="space-y-3">
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
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="product_category" className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <input
                    id="product_category"
                    type="text"
                    value={taxForm.product_category}
                    onChange={(e) => setTaxForm({ ...taxForm, product_category: e.target.value })}
                    placeholder="e.g., general"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    placeholder="e.g., 10"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="submit"
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-all duration-200"
                  >
                    {editTaxRule ? 'Update' : 'Set'} Tax Rule
                  </button>
                  {editTaxRule && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditTaxRule(null);
                        setTaxForm({ region: '', product_category: '', tax_rate: '' });
                      }}
                      className="w-full sm:w-auto bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Existing Tax Rules</h4>
                {taxRules.length === 0 ? (
                  <p className="text-gray-600 text-sm">No tax rules available.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-600">
                      <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                        <tr>
                          <th scope="col" className="px-3 py-2">Region</th>
                          <th scope="col" className="px-3 py-2">Category</th>
                          <th scope="col" className="px-3 py-2">Rate (%)</th>
                          <th scope="col" className="px-3 py-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {taxRules.map((taxRule) => (
                          <tr key={taxRule.id} className="border-b hover:bg-gray-50">
                            <td className="px-3 py-2 truncate max-w-[120px] sm:max-w-[200px]">{taxRule.region}</td>
                            <td className="px-3 py-2 truncate max-w-[120px] sm:max-w-[200px]">{taxRule.product_category}</td>
                            <td className="px-3 py-2">{(taxRule.tax_rate * 100).toFixed(2)}</td>
                            <td className="px-3 py-2 flex gap-2">
                              <button
                                onClick={() => handleEditTaxRule(taxRule)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Edit tax rule"
                              >
                                <FaEdit className="text-sm" />
                              </button>
                              <button
                                onClick={() => handleDeleteTaxRule(taxRule.id)}
                                className="text-red-600 hover:text-red-800"
                                title="Delete tax rule"
                              >
                                <FaTrash className="text-sm" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Promotion Section */}
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editPromotion ? 'Edit Promotion' : 'Set Promotion'}
              </h3>
              <form onSubmit={handlePromotionSubmit} className="space-y-3">
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
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="discount_percentage" className="block text-sm font-medium text-gray-700 mb-1">
                    Discount (%)
                  </label>
                  <input
                    id="discount_percentage"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={promotionForm.discount_percentage}
                    onChange={(e) => setPromotionForm({ ...promotionForm, discount_percentage: e.target.value })}
                    placeholder="e.g., 20"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="submit"
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-all duration-200"
                  >
                    {editPromotion ? 'Update' : 'Set'} Promotion
                  </button>
                  {editPromotion && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditPromotion(null);
                        setPromotionForm({ name: '', discount_percentage: '', product_id: '', start_date: '', end_date: '' });
                      }}
                      className="w-full sm:w-auto bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Existing Promotions</h4>
                {promotions.length === 0 ? (
                  <p className="text-gray-600 text-sm">No promotions available.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-600">
                      <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                        <tr>
                          <th scope="col" className="px-3 py-2">Name</th>
                          <th scope="col" className="px-3 py-2">Discount (%)</th>
                          <th scope="col" className="px-3 py-2">Product</th>
                          <th scope="col" className="px-3 py-2">Start</th>
                          <th scope="col" className="px-3 py-2">End</th>
                          <th scope="col" className="px-3 py-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {promotions.map((promotion) => (
                          <tr key={promotion.id} className="border-b hover:bg-gray-50">
                            <td className="px-3 py-2 truncate max-w-[120px] sm:max-w-[200px]">{promotion.name}</td>
                            <td className="px-3 py-2">{(promotion.discount_percentage * 100).toFixed(2)}</td>
                            <td className="px-3 py-2 truncate max-w-[120px] sm:max-w-[200px]">{promotion.product_name}</td>
                            <td className="px-3 py-2">{new Date(promotion.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}</td>
                            <td className="px-3 py-2">{new Date(promotion.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}</td>
                            <td className="px-3 py-2 flex gap-2">
                              <button
                                onClick={() => handleEditPromotion(promotion)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Edit promotion"
                              >
                                <FaEdit className="text-sm" />
                              </button>
                              <button
                                onClick={() => handleDeletePromotion(promotion.id)}
                                className="text-red-600 hover:text-red-800"
                                title="Delete promotion"
                              >
                                <FaTrash className="text-sm" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6 border border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4">
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
          </div>

          {/* Invoices Table */}
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <div className="w-1.5 h-5 bg-blue-600 rounded-full"></div>
                Invoices
              </h2>
              <button
                onClick={handleDownloadCSV}
                className="mt-2 sm:mt-0 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-all duration-200 flex items-center gap-2"
              >
                <FaDownload className="text-sm" />
                Export CSV
              </button>
            </div>
            {loading ? (
              <div className="space-y-3">
                <div className="h-5 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                <div className="h-8 bg-gray-200 rounded w-full animate-pulse"></div>
              </div>
            ) : invoices.length === 0 ? (
              <p className="text-gray-600 text-sm text-center">No invoices available.</p>
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
                      <th scope="col" className="px-3 py-2 cursor-pointer" onClick={() => handleSort('tax_amount')}>
                        Tax (₹) {sortConfig.key === 'tax_amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th scope="col" className="px-3 py-2 cursor-pointer" onClick={() => handleSort('commission_amount')}>
                        Comm. (₹) {sortConfig.key === 'commission_amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th scope="col" className="px-3 py-2 cursor-pointer" onClick={() => handleSort('promotion_amount')}>
                        Promo. (₹) {sortConfig.key === 'promotion_amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
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
                        <td className="px-3 py-2 truncate max-w-[100px] sm:max-w-[150px]" title={invoice.user_id}>{invoice.user_id}</td>
                        <td className="px-3 py-2">{invoice.total_amount.toFixed(2)}</td>
                        <td className="px-3 py-2">{invoice.tax_amount.toFixed(2)}</td>
                        <td className="px-3 py-2">{invoice.commission_amount.toFixed(2)}</td>
                        <td className="px-3 py-2">{invoice.promotion_amount.toFixed(2)}</td>
                        <td className="px-3 py-2">{new Date(invoice.invoice_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            invoice.status === 'generated' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
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
                  <p><strong>Total Amount:</strong> ₹{selectedInvoice.total_amount.toFixed(2)}</p>
                  <p><strong>Tax Amount:</strong> ₹{selectedInvoice.tax_amount.toFixed(2)}</p>
                  <p><strong>Commission Amount:</strong> ₹{selectedInvoice.commission_amount.toFixed(2)}</p>
                  <p><strong>Promotion Amount:</strong> ₹{selectedInvoice.promotion_amount.toFixed(2)}</p>
                  <p><strong>Order IDs:</strong>{' '}
                    {selectedInvoice.order_ids.length > 0
                      ? selectedInvoice.order_ids.join(', ')
                      : 'None'}
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
      </div>
    </div>
  );
}