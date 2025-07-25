"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddVendorPage() {
  const [form, setForm] = useState({ name: "", email: "", avatar_url: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [password, setPassword] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const router = useRouter();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setPassword("");
    if (!form.name || !form.email) {
      setError("Name and email are required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/add-vendor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (result.success) {
        setPassword(result.password || "");
        setSuccess("Vendor added successfully!");
        setForm({ name: "", email: "", avatar_url: "" });
        setShowPasswordModal(true); // Show modal instead of redirect
      } else if (result.error && result.error.includes("duplicate key value")) {
        setError("A vendor with this email already exists or the user already exists in the system.");
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
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Add Vendor</h2>
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
            <label className="block text-left text-gray-700 font-semibold mb-1">Avatar URL (optional)</label>
            <input
              type="text"
              name="avatar_url"
              value={form.avatar_url}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          {error && <div className="text-red-500 text-sm text-left">{error}</div>}
          {success && !showPasswordModal && (
            <div className="text-green-600 text-sm text-left mb-2">{success}</div>
          )}
          <div className="flex justify-between gap-2 mt-6">
            <button
              type="button"
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold px-4 py-2 rounded shadow"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded shadow"
              disabled={loading}
            >
              {loading ? "Adding..." : "Add Vendor"}
            </button>
          </div>
        </form>
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full text-center relative">
              <h2 className="text-xl font-bold mb-4 text-gray-800">
                Vendor Created
              </h2>
              <p className="mb-2 text-gray-700">
                Copy and share this password securely with the vendor:
              </p>
              <div className="bg-gray-100 rounded p-3 font-mono text-lg mb-4 select-all break-all border border-gray-200">
                Password: {password}
              </div>
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded shadow"
                onClick={() => {
                  setShowPasswordModal(false);
                  router.push("/admin/dashboard");
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}