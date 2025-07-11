// app/api/razorpay-order/route.js
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

export async function POST(req) {
  try {
    const body = await req.json();
    const { amount } = body;

    const order = await razorpay.orders.create({
      amount: amount * 100, // amount in paise
      currency: "INR",
      receipt: `receipt_order_${Date.now()}`,
    });

    return Response.json(order);
  } catch (error) {
    console.error("Razorpay order error:", error);
    return new Response(JSON.stringify({ error: "Order creation failed" }), {
      status: 500,
    });
  }
}
