'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import Image from 'next/image';
import { Star } from 'lucide-react';
import { FaArrowLeft, FaCheckCircle } from 'react-icons/fa';
import jsPDF from 'jspdf';

// Initialize Supabase client
const supabase = createClientComponentClient();

// Normalize image path to handle both single strings and arrays
const normalizeImagePath = (path) => {
  if (!path) return ['/placeholder-product.jpg'];
  if (Array.isArray(path)) {
    const normalized = path
      .map((p) => (p ? p.replace(/^(\.\.\/)+assets\//, '/') : null))
      .filter((p) => p);
    return normalized.length > 0 ? normalized : ['/placeholder-product.jpg'];
  }
  return [path.replace(/^(\.\.\/)+assets\//, '/')];
};

// Normalize image URL to ensure proper format
const normalizeImageUrl = (url) => {
  if (!url) return '/placeholder-product.jpg';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return url;
  return url;
};

// Generate PDF invoice and store in Supabase
const generateInvoicePDF = async (orders, paymentId) => {
  try {
    console.log('Generating PDF with orders:', orders); // Debug log
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const lineHeight = 10;
    let yPosition = margin;

    // Header
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('FreshMart', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Invoice', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Company Details
    doc.setFontSize(10);
    doc.text('FreshMart Inc.', margin, yPosition);
    yPosition += 5;
    doc.text('123 Market Street, City, Country', margin, yPosition);
    yPosition += 5;
    doc.text('Email: support@freshmart.com', margin, yPosition);
    yPosition += 10;

    // Invoice Details
    doc.text(`Payment ID: ${paymentId || 'N/A'}`, margin, yPosition);
    yPosition += 5;
    doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, yPosition);
    yPosition += 15;

    // Table Header
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Item', margin, yPosition);
    doc.text('Qty', margin + 80, yPosition);
    doc.text('Unit Price', margin + 100, yPosition);
    doc.text('Discount', margin + 140, yPosition);
    doc.text('Total', margin + 180, yPosition, { align: 'right' });
    yPosition += 5;
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    // Table Content
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    orders.forEach((order) => {
      if (yPosition > pageHeight - margin - 20) {
        doc.addPage();
        yPosition = margin;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Item', margin, yPosition);
        doc.text('Qty', margin + 80, yPosition);
        doc.text('Unit Price', margin + 100, yPosition);
        doc.text('Discount', margin + 140, yPosition);
        doc.text('Total', margin + 180, yPosition, { align: 'right' });
        yPosition += 5;
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 10;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
      }

      const productName = order.products.name || 'Unknown Product';
      const quantity = order.quantity || 1;
      const unitPrice = Number(order.products.price || 0).toFixed(2);
      const originalSubtotal = Number(order.products.price || 0) * quantity;
      const discountAmount = (originalSubtotal - Number(order.total_amount || 0)).toFixed(2);
      const total = Number(order.total_amount || 0).toFixed(2);

      if (!productName || !quantity || !unitPrice || !total) {
        console.warn('Invalid order data:', order);
      }

      const splitText = doc.splitTextToSize(productName, 70);
      splitText.forEach((line, index) => {
        doc.text(line, margin, yPosition + index * lineHeight);
      });
      doc.text(quantity.toString(), margin + 80, yPosition);
      doc.text(`₹${unitPrice}`, margin + 100, yPosition);
      doc.text(discountAmount > 0 ? `-₹${discountAmount}` : '₹0.00', margin + 140, yPosition);
      doc.text(`₹${total}`, margin + 180, yPosition, { align: 'right' });
      yPosition += Math.max(splitText.length * lineHeight, lineHeight);
    });

    // Breakdown
    yPosition += 5;
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    const originalSubtotal = orders.reduce((acc, order) => acc + (Number(order.products.price || 0) * order.quantity), 0);
    const afterDiscount = orders.reduce((acc, order) => acc + Number(order.total_amount || 0), 0);
    const discountTotal = originalSubtotal - afterDiscount;
    const taxTotal = orders.reduce((acc, order) => acc + Number(order.tax_amount || 0), 0);
    const grandTotal = afterDiscount + taxTotal;

    // Items Total
    doc.text('Items Total:', margin + 100, yPosition);
    doc.text(`₹${originalSubtotal.toFixed(2)}`, margin + 180, yPosition, { align: 'right' });
    yPosition += lineHeight;

    // Discounts (Promotions and Coupons)
    if (discountTotal > 0) {
      doc.text('Discounts:', margin + 100, yPosition);
      doc.text(`-₹${discountTotal.toFixed(2)}`, margin + 180, yPosition, { align: 'right' });
      yPosition += lineHeight;
    }

    // Subtotal After Discounts
    doc.text('Subtotal After Discounts:', margin + 100, yPosition);
    doc.text(`₹${afterDiscount.toFixed(2)}`, margin + 180, yPosition, { align: 'right' });
    yPosition += lineHeight;

    // Tax
    doc.text('Tax:', margin + 100, yPosition);
    doc.text(`₹${taxTotal.toFixed(2)}`, margin + 180, yPosition, { align: 'right' });
    yPosition += lineHeight;

    // Grand Total
    yPosition += 5;
    doc.line(margin + 100, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;
    doc.text('Grand Total:', margin + 100, yPosition);
    doc.text(`₹${grandTotal.toFixed(2)}`, margin + 180, yPosition, { align: 'right' });

    // Footer
    yPosition += 20;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Thank you for shopping with FreshMart!', pageWidth / 2, yPosition, { align: 'center' });

    // Save PDF
    doc.save(`invoice_${paymentId || 'order'}.pdf`);

    // Calculate commission for DB only (not shown in PDF, as it's a vendor cost)
    const commissionRate = 0.05; // 5% commission
    const commissionAmount = afterDiscount * commissionRate;
    const userId = orders[0]?.user_id;

    console.log('Inserting invoice with data:', {
      payment_id: paymentId || 'N/A',
      user_id: userId,
      total_amount: grandTotal,
      tax_amount: taxTotal,
      commission_amount: commissionAmount,
      promotion_amount: discountTotal,
    }); // Debug log

    // Insert into invoices table
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        payment_id: paymentId || 'N/A',
        user_id: userId,
        total_amount: grandTotal,
        tax_amount: taxTotal,
        commission_amount: commissionAmount,
        promotion_amount: discountTotal,
        invoice_date: new Date().toISOString(),
        status: 'generated',
      })
      .select('id')
      .single();

    if (invoiceError) {
      console.error('Error inserting invoice:', invoiceError);
      throw new Error('Failed to store invoice data.');
    }

    const invoiceId = invoiceData.id;

    // Insert links into invoice_orders table
    const invoiceOrderInserts = orders.map((order) => ({
      invoice_id: invoiceId,
      order_id: order.id,
    }));

    const { error: linkError } = await supabase
      .from('invoice_orders')
      .insert(invoiceOrderInserts);

    if (linkError) {
      console.error('Error linking orders to invoice:', linkError);
      throw new Error('Failed to link orders to invoice.');
    }

    console.log('Invoice and order links stored successfully.');
  } catch (error) {
    console.error('Error generating PDF or storing invoice:', error);
    throw new Error('Failed to generate invoice or store data. Please try again.');
  }
};

export default function SuccessPageContent() {
  const searchParams = useSearchParams();
  const paymentId = searchParams.get('payment_id');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [reviewedProductIds, setReviewedProductIds] = useState([]);

  useEffect(() => {
    if (!paymentId) {
      setErrorMessage('No payment ID provided.');
      setLoading(false);
      return;
    }

    const fetchOrders = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('orders')
          .select(`
            id,
            product_id,
            user_id,
            quantity,
            total_amount,
            tax_amount,
            coupon_id,
            payment_id,
            products(name, image, price),
            coupons(code, discount)
          `)
          .eq('payment_id', paymentId)
          .eq('status', 'completed');

        if (error) {
          console.error('Error fetching orders:', error);
          setErrorMessage('Failed to fetch order details. Please try again.');
          setOrders([]);
        } else if (!data || data.length === 0) {
          setErrorMessage('No orders found for this payment.');
          setOrders([]);
        } else {
          setOrders(
            data.map((order) => ({
              id: order.id,
              product_id: order.product_id,
              user_id: order.user_id,
              quantity: order.quantity,
              total_amount: order.total_amount,
              tax_amount: order.tax_amount,
              coupon_id: order.coupon_id,
              coupon_code: order.coupons?.code || null,
              coupon_discount: order.coupons?.discount || null,
              payment_id: order.payment_id,
              product_name: order.products?.name || 'Unknown Product',
              product_image: order.products?.image || '/placeholder-product.jpg',
              products: {
                price: order.products?.price || 0,
              },
            }))
          );
          if (data.length === 1) {
            setSelectedProductId(data[0].product_id);
          }
        }
      } catch (err) {
        console.error('Unexpected error fetching orders:', err);
        setErrorMessage('An unexpected error occurred. Please try again.');
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [paymentId]);

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!orders.length || !orders[0].user_id) {
      setErrorMessage('Cannot submit feedback: No valid order or user ID.');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    if (!selectedProductId) {
      setErrorMessage('Please select a product to review.');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    if (rating === 0) {
      setErrorMessage('Please select a rating.');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    if (rating < 4 && !feedback.trim()) {
      setErrorMessage('Please provide feedback for ratings below 4 stars.');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    if (feedback.length > 500) {
      setErrorMessage('Feedback cannot exceed 500 characters.');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    try {
      const selectedOrder = orders.find((order) => order.product_id === selectedProductId);
      if (!selectedOrder) {
        setErrorMessage('Selected product not found in order.');
        setTimeout(() => setErrorMessage(''), 3000);
        return;
      }

      const { error } = await supabase.from('product_reviews').insert({
        product_id: selectedOrder.product_id,
        user_id: selectedOrder.user_id,
        rating,
        feedback: feedback.trim() || null,
      });

      if (error) {
        console.error('Error submitting feedback:', error);
        setErrorMessage('Failed to submit feedback. Please try again.');
        setTimeout(() => setErrorMessage(''), 3000);
      } else {
        setFeedbackSuccess(true);
        setReviewedProductIds((prev) => [...prev, selectedProductId]);
        setFeedback('');
        setRating(0);
        setSelectedProductId(orders.length === 1 ? orders[0].product_id : null);
        setTimeout(() => setFeedbackSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Unexpected error submitting feedback:', err);
      setErrorMessage('An unexpected error occurred while submitting feedback.');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!orders.length) {
      setErrorMessage('No orders available to generate an invoice.');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }
    console.log('Orders before generating PDF:', orders); // Debug log
    try {
      await generateInvoicePDF(orders, paymentId);
      setFeedbackSuccess(true);
      setTimeout(() => setFeedbackSuccess(false), 3000);
    } catch (error) {
      setErrorMessage(error.message);
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleRatingClick = (ratingValue) => {
    setRating(ratingValue);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <div className="h-10 bg-gray-200 rounded-lg w-64 mb-3 animate-pulse"></div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="h-6 bg-gray-200 rounded w-40 mb-4 animate-pulse"></div>
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 border-b border-gray-100 last:border-b-0">
                  <div className="w-20 h-20 bg-gray-200 rounded-lg animate-pulse"></div>
                  <div className="flex-1">
                    <div className="h-5 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                  </div>
                  <div className="h-5 bg-gray-200 rounded w-20 animate-pulse"></div>
                </div>
              ))}
              <div className="h-10 bg-gray-200 rounded w-full mt-4 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20">
          <div className="max-w-md mx-auto text-center">
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-10">
              <div className="w-28 h-28 mx-auto mb-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full flex items-center justify-center">
                <FaCheckCircle className="text-5xl text-blue-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Order Not Found</h1>
              <p className="text-gray-600 mb-6 text-sm">
                We could not find any orders associated with this payment. Please check your payment ID or contact support.
              </p>
              <Link href="/cart">
                <button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-semibold shadow-md transition-all duration-300 hover:scale-105 flex items-center gap-2 mx-auto">
                  <FaArrowLeft className="text-lg" />
                  Go to Cart
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate totals for display (consistent with PDF)
  const originalSubtotal = orders.reduce((acc, order) => acc + (Number(order.products.price || 0) * order.quantity), 0);
  const afterDiscount = orders.reduce((acc, order) => acc + Number(order.total_amount || 0), 0);
  const discountTotal = originalSubtotal - afterDiscount;
  const taxTotal = orders.reduce((acc, order) => acc + Number(order.tax_amount || 0), 0);
  const grandTotal = afterDiscount + taxTotal;

  // Define selectedProduct safely
  const selectedProduct = selectedProductId ? orders.find((order) => order.product_id === selectedProductId) : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20">
        <div className="max-w-4xl mx-auto">
          {/* Progress Indicator */}
          <div className="mb-8 flex items-center justify-center gap-4 text-sm font-medium text-gray-600">
            <div className="flex items-center gap-2">
              <FaCheckCircle className="text-blue-600" />
              <span>Cart</span>
            </div>
            <span className="text-gray-400">→</span>
            <div className="flex items-center gap-2">
              <FaCheckCircle className="text-blue-600" />
              <span>Checkout</span>
            </div>
            <span className="text-gray-400">→</span>
            <div className="flex items-center gap-2 font-semibold text-blue-600">
              <FaCheckCircle className="text-blue-600" />
              <span>Confirmation</span>
            </div>
          </div>

          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
              Thank You for Your Order!
            </h1>
            <p className="text-gray-600 text-sm max-w-md mx-auto">
              Your order has been successfully placed and will be delivered soon.
            </p>
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

          {/* Success Message */}
          {feedbackSuccess && (
            <div className="mb-6">
              <div className="bg-green-50 border-l-4 border-green-500 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                <FaCheckCircle className="text-green-600" />
                Thank you for your feedback!{' '}
                {orders.length > 1 && reviewedProductIds.length < orders.length && (
                  <span>
                    Review another product by selecting below.
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Order Summary */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8 mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <div className="w-2 h-6 bg-blue-600 rounded-full"></div>
              Order Summary
            </h2>
            <div className="divide-y divide-gray-100">
              {orders.map((order, index) => {
                const normalizedImages = normalizeImagePath(order.product_image);
                const imageUrl = normalizeImageUrl(normalizedImages[0] || '/placeholder-product.jpg');
                const originalSubtotal = Number(order.products.price || 0) * order.quantity;
                const discountAmount = originalSubtotal - Number(order.total_amount || 0);

                return (
                  <div key={order.id || index} className="py-4 sm:py-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* Product Image */}
                      <div className="flex-shrink-0">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                          <Image
                            src={imageUrl}
                            alt={order.product_name || 'Product image'}
                            width={96}
                            height={96}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                          <div className="flex-1">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 line-clamp-2">
                              {order.product_name}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                              Product ID: {order.product_id}
                            </p>
                            <p className="text-sm text-gray-600">
                              Quantity: {order.quantity || 1}
                            </p>
                            <p className="text-sm text-gray-600">
                              Order ID: {order.id}
                            </p>
                            {order.coupon_code && (
                              <p className="text-sm text-green-600">
                                Coupon Applied: {order.coupon_code} ({order.coupon_discount}% off)
                              </p>
                            )}
                            {discountAmount > 0 && (
                              <p className="text-sm text-green-600">
                                Discount: ₹{discountAmount.toFixed(2)}
                              </p>
                            )}
                            {order.tax_amount > 0 && (
                              <p className="text-sm text-gray-600">
                                Tax: ₹{order.tax_amount.toFixed(2)}
                              </p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-xs text-gray-500 mb-1">Total</div>
                            <div className="text-lg font-bold text-gray-900">
                              ₹{Number(order.total_amount || 0).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Items Total</span>
                <span>₹{originalSubtotal.toFixed(2)}</span>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between text-sm text-green-600 mt-2">
                  <span>Discounts (Promotions/Coupons)</span>
                  <span>-₹{discountTotal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-gray-600 mt-2">
                <span>Subtotal After Discounts</span>
                <span>₹{afterDiscount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mt-2">
                <span>Tax</span>
                <span>₹{taxTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-base sm:text-lg font-bold text-gray-900">Grand Total</span>
                <span className="text-xl sm:text-2xl font-bold text-blue-600">₹{grandTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mt-2">
                <span>Payment ID</span>
                <span className="text-xs">{orders[0].payment_id}</span>
              </div>
            </div>
            <div className="mt-4 text-center">
              <button
                onClick={handleDownloadInvoice}
                className="text-blue-600 text-sm font-semibold hover:underline focus:outline-none transition-colors duration-200"
              >
                Download Invoice ↓
              </button>
            </div>
          </div>

          {/* Feedback Section */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8 mb-6">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 text-center">
              Rate Your Experience
            </h3>
            {orders.length === 1 && selectedProduct && (
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden flex-shrink-0">
                  <Image
                    src={normalizeImageUrl(normalizeImagePath(selectedProduct.product_image)[0])}
                    alt={selectedProduct.product_name || 'Product image'}
                    width={64}
                    height={64}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-gray-900">{selectedProduct.product_name}</h4>
                  <p className="text-sm text-gray-600">Product ID: {selectedProduct.product_id}</p>
                </div>
              </div>
            )}
            {orders.length > 1 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Product to Review
                </label>
                <select
                  value={selectedProductId || ''}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                  disabled={reviewedProductIds.length === orders.length}
                >
                  <option value="" disabled>
                    Select a product
                  </option>
                  {orders.map((order) => (
                    <option
                      key={order.product_id}
                      value={order.product_id}
                      disabled={reviewedProductIds.includes(order.product_id)}
                    >
                      {order.product_name} {reviewedProductIds.includes(order.product_id) ? '(Reviewed)' : ''}
                    </option>
                  ))}
                </select>
                {selectedProduct && (
                  <div className="mt-4 flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden flex-shrink-0">
                      <Image
                        src={normalizeImageUrl(normalizeImagePath(selectedProduct.product_image)[0])}
                        alt={selectedProduct.product_name || 'Product image'}
                        width={48}
                        height={48}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="text-sm text-gray-600">{selectedProduct.product_name}</div>
                  </div>
                )}
              </div>
            )}
            <form onSubmit={handleFeedbackSubmit} className="space-y-6">
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleRatingClick(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="p-2 transition-colors duration-200"
                    disabled={reviewedProductIds.includes(selectedProductId)}
                  >
                    <Star
                      size={32}
                      className={`${
                        star <= (hoveredRating || rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'fill-gray-200 text-gray-200'
                      } transition-colors duration-200`}
                    />
                  </button>
                ))}
              </div>
              <div className="text-center text-gray-500 text-sm mb-4">
                {rating > 0 ? (
                  <>
                    {rating === 1 && 'Very Dissatisfied'}
                    {rating === 2 && 'Dissatisfied'}
                    {rating === 3 && 'Neutral'}
                    {rating === 4 && 'Satisfied'}
                    {rating === 5 && 'Very Satisfied'}
                  </>
                ) : (
                  'Select a rating'
                )}
              </div>
              <div>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder={rating < 4 ? 'Please tell us what went wrong...' : 'Share your feedback (optional)...'}
                  rows={5}
                  maxLength={500}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow resize-none"
                  disabled={reviewedProductIds.includes(selectedProductId)}
                />
                <div className="text-right text-xs text-gray-500 mt-1">
                  {feedback.length}/500 characters
                </div>
              </div>
              <div className="text-center">
                <button
                  type="submit"
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 rounded-lg font-semibold shadow-md transition-all duration-300 hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  disabled={reviewedProductIds.includes(selectedProductId) || !selectedProductId || rating === 0}
                >
                  Submit Review
                </button>
              </div>
            </form>
            {orders.length > 1 && reviewedProductIds.length > 0 && reviewedProductIds.length < orders.length && (
              <p className="mt-4 text-center text-sm text-gray-600">
                Review another product by selecting it above.
              </p>
            )}
            {reviewedProductIds.length === orders.length && (
              <p className="mt-4 text-center text-sm text-gray-600">
                You’ve reviewed all products in this order. Thank you!
              </p>
            )}
          </div>

          {/* Return Home */}
          <div className="text-center">
            <Link href="/">
              <button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-4 rounded-lg font-semibold shadow-md transition-all duration-300 hover:scale-105 flex items-center gap-2 mx-auto">
                <FaArrowLeft className="text-lg" />
                Return to Home
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}