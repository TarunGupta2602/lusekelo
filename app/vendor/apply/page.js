"use client";
import { useState } from "react";

export default function VendorApplyPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!form.name || !form.email || !form.phone) {
      setError("Name, email, and phone are required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/vendor-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (result.success) {
        setSuccess("Application submitted! We will contact you soon.");
        setForm({ name: "", email: "", phone: "", message: "" });
      } else {
        setError(result.error || "Unknown error");
      }
    } catch (e) {
      setError("Network or server error: " + e.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-blue-800 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center relative">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Apply to Become a Vendor</h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-left text-gray-700 font-semibold mb-1">Full Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            />
          </div>
          <div>
            <label className="block text-left text-gray-700 font-semibold mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            />
          </div>
          <div>
            <label className="block text-left text-gray-700 font-semibold mb-1">Phone</label>
            <input
              type="text"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            />
          </div>
          <div>
            <label className="block text-left text-gray-700 font-semibold mb-1">Message (optional)</label>
            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              rows={3}
            />
          </div>
          {error && <div className="text-red-500 text-sm text-left">{error}</div>}
          {success && <div className="text-green-600 text-sm text-left mb-2">{success}</div>}
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded shadow"
              disabled={loading}
            >
              {loading ? "Submitting..." : "Submit Application"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 