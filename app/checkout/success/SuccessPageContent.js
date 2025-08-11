"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Star } from "lucide-react";

export default function SuccessPageContent() {
  const supabase = createClientComponentClient();
  const searchParams = useSearchParams();
  const paymentId = searchParams.get("payment_id");

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState("");
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [hoveredRating, setHoveredRating] = useState(0);

  useEffect(() => {
    if (!paymentId) return;

    const fetchOrder = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          product_id,
          user_id,
          total_amount,
          payment_id,
          products(name)
        `)
        .eq("payment_id", paymentId)
        .single();

      if (error) {
        console.error("Error fetching order:", error);
      } else {
        setOrder({
          id: data.id,
          product_id: data.product_id,
          user_id: data.user_id,
          product_name: data.products?.name || "Unknown Product",
          total_amount: data.total_amount,
          payment_id: data.payment_id,
        });
      }
      setLoading(false);
    };

    fetchOrder();
  }, [paymentId, supabase]);

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!order?.user_id) {
      alert("Order does not have an associated user ID.");
      return;
    }

    const { error } = await supabase.from("product_reviews").insert({
      product_id: order.product_id,
      user_id: order.user_id,
      rating,
      feedback,
    });

    if (error) {
      console.error("Error submitting feedback:", error);
    } else {
      setFeedback("");
      setFeedbackSuccess(true);
    }
  };

  const handleRatingClick = (ratingValue) => {
    setRating(ratingValue);
  };

  if (loading) return <div className="text-center py-20">Loading your order...</div>;
  if (!order) return <div className="text-center py-20 text-red-500">Order not found.</div>;

  return (
    <div className="min-h-screen mt-17 bg-gray-50">
      {/* Header */}
      <div className="bg-teal-800 text-white px-6 py-12 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="flex justify-center items-center gap-8 mb-4">
            <div className="hidden md:block">
              <div className="w-24 h-24 bg-orange-200 rounded-full flex items-center justify-center">
                <span className="text-4xl">🥬</span>
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">
                Thank you for <br />
                <span className="text-lime-400">choosing us!</span>
              </h1>
              <p className="text-teal-100">
                Your product will be at your doorstep within some time
              </p>
            </div>
            <div className="hidden md:block">
              <div className="w-24 h-24 bg-white rounded-lg flex items-center justify-center">
                <span className="text-4xl">🛍️</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Order Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold mb-6 text-center">Order summary</h2>
          <div className="flex items-start gap-4 mb-6">
            <div className="w-16 h-16 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <div className="w-12 h-12 bg-red-500 rounded flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {order.product_name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">{order.product_name}</h3>
              <p className="text-gray-600 text-sm">Product ID: {order.product_id}</p>
              <p className="text-gray-500 text-sm">Order ID: {order.id}</p>
            </div>
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Amount</span>
              <span>₹{order.total_amount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Payment ID</span>
              <span className="text-xs text-gray-500">{order.payment_id}</span>
            </div>
            <div className="border-t pt-2 mt-3">
              <div className="flex justify-between font-semibold">
                <span>Total Paid</span>
                <span>₹{order.total_amount}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 text-center">
            <button className="text-gray-500 text-sm underline">
              Download invoice ↓
            </button>
          </div>
        </div>

        {/* Rating Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-medium text-center mb-4">
            Rate your experience with us!
          </h3>
          <form onSubmit={handleFeedbackSubmit} className="space-y-4">
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleRatingClick(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 transition-colors"
                >
                  <Star
                    size={32}
                    className={`${
                      star <= (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "fill-gray-200 text-gray-200"
                    } transition-colors`}
                  />
                </button>
              ))}
            </div>
            <p className="text-center text-gray-500 text-sm mb-4">
              Give us your valuable feedback!
            </p>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Write your review..."
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 resize-none"
            />
            <div className="text-center">
              <button
                type="submit"
                className="bg-lime-500 text-white px-8 py-2 rounded-lg hover:bg-lime-600 transition-colors font-medium"
              >
                Submit Feedback!
              </button>
            </div>
          </form>
          {feedbackSuccess && (
            <p className="mt-4 text-green-600 font-medium text-center">
              ✅ Thank you for your feedback!
            </p>
          )}
        </div>

        {/* Return Home */}
        <div className="text-center">
          <button
            onClick={() => (window.location.href = "/")}
            className="bg-lime-500 text-white px-12 py-3 rounded-lg hover:bg-lime-600 transition-colors font-medium text-lg"
          >
            Return to home
          </button>
        </div>
      </div>
    </div>
  );
}
