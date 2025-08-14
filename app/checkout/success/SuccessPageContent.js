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

// Generate PDF invoice
const generateInvoicePDF = (orders, paymentId) => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
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
    doc.text('Qty', margin + 100, yPosition);
    doc.text('Amount', margin + 140, yPosition, { align: 'right' });
    yPosition += 5;
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    // Table Content
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    orders.forEach((order) => {
      const productName = order.product_name || 'Unknown Product';
      const quantity = order.quantity || 1;
      const amount = Number(order.total_amount || 0).toFixed(2);

      // Split long product names
      const splitText = doc.splitTextToSize(productName, 90);
      splitText.forEach((line, index) => {
        doc.text(line, margin, yPosition + index * lineHeight);
      });
      doc.text(quantity.toString(), margin + 100, yPosition);
      doc.text(`₹${amount}`, margin + 140, yPosition, { align: 'right' });
      yPosition += Math.max(splitText.length * lineHeight, lineHeight);
    });

    // Total
    yPosition += 5;
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    const totalAmount = orders.reduce((acc, order) => acc + Number(order.total_amount || 0), 0);
    doc.text(`Total: ₹${totalAmount.toFixed(2)}`, margin + 140, yPosition, { align: 'right' });

    // Footer
    yPosition += 20;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Thank you for shopping with FreshMart!', pageWidth / 2, yPosition, { align: 'center' });

    // Save PDF
    doc.save(`invoice_${paymentId || 'order'}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate invoice. Please try again.');
  }
};

export default function SuccessPageContent() {
  const searchParams = useSearchParams();
  const paymentId = searchParams.get('payment_id');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [hoveredRating, setHoveredRating] = useState(0);

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
            payment_id,
            products(name, image)
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
              product_name: order.products?.name || 'Unknown Product',
              product_image: order.products?.image || '/placeholder-product.jpg',
              total_amount: order.total_amount,
              payment_id: order.payment_id,
            }))
          );
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

    try {
      const { error } = await supabase.from('product_reviews').insert(
        orders.map((order) => ({
          product_id: order.product_id,
          user_id: order.user_id,
          rating,
          feedback,
        }))
      );

      if (error) {
        console.error('Error submitting feedback:', error);
        setErrorMessage('Failed to submit feedback. Please try again.');
        setTimeout(() => setErrorMessage(''), 3000);
      } else {
        setFeedback('');
        setFeedbackSuccess(true);
        setTimeout(() => setFeedbackSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Unexpected error submitting feedback:', err);
      setErrorMessage('An unexpected error occurred while submitting feedback.');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleDownloadInvoice = () => {
    if (!orders.length) {
      setErrorMessage('No orders available to generate an invoice.');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }
    try {
      generateInvoicePDF(orders, paymentId);
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

  const totalAmount = orders.reduce((acc, order) => acc + Number(order.total_amount || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20">
        <div className="max-w-7xl mx-auto">
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
            <p className="text-gray-600 text-sm">
              Your order has been successfully placed and will be delivered soon.
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-6 mx-auto max-w-4xl">
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2 shadow-sm">
                <div className="w-4 h-4 bg-red-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold">!</span>
                </div>
                {errorMessage}
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
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-xs text-gray-500 mb-1">Amount</div>
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
              <div className="flex justify-between items-center">
                <span className="text-base sm:text-lg font-bold text-gray-900">Total Paid</span>
                <span className="text-xl sm:text-2xl font-bold text-blue-600">₹{totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mt-2">
                <span>Payment ID</span>
                <span className="text-xs">{orders[0].payment_id}</span>
              </div>
            </div>
            <div className="mt-4 text-center">
              <button
                onClick={handleDownloadInvoice}
                className="text-blue-600 text-sm font-semibold hover:underline focus:outline-none"
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
            <form onSubmit={handleFeedbackSubmit} className="space-y-4">
              <div className="flex justify-center gap-1 sm:gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleRatingClick(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="p-1 sm:p-2 transition-colors"
                  >
                    <Star
                      size={28}
                      className={`${
                        star <= (hoveredRating || rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'fill-gray-200 text-gray-200'
                      } transition-colors duration-200`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-center text-gray-500 text-sm mb-4">
                Share your feedback to help us improve!
              </p>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Write your review..."
                rows={4}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
              />
              <div className="text-center">
                <button
                  type="submit"
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-semibold shadow-md transition-all duration-300 hover:scale-105"
                >
                  Submit Feedback
                </button>
              </div>
            </form>
            {feedbackSuccess && (
              <p className="mt-4 text-green-600 font-medium text-center flex items-center justify-center gap-2">
                <FaCheckCircle className="text-green-600" />
                Thank you for your feedback!
              </p>
            )}
          </div>

          {/* Return Home */}
          <div className="text-center">
            <Link href="/">
              <button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold shadow-md transition-all duration-300 hover:scale-105 flex items-center gap-2 mx-auto">
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