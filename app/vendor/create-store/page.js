'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function CreateStore() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    address: '',
    delivery_time: '',
    main_image: '',
    gallery_images: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setError('User not found. Please log in again.');
        setLoading(false);
        return;
      }

      // Insert into supermarkets
      const { error: insertError } = await supabase
        .from('supermarkets')
        .insert([{
          name: form.name,
          address: form.address,
          delivery_time: form.delivery_time,
          main_image: form.main_image,
          gallery_images: form.gallery_images,
          vendor_id: user.id,
        }]);

      if (insertError) {
        setError('Error creating store: ' + insertError.message);
        setLoading(false);
        return;
      }

      setSuccess('Store created successfully!');
      setTimeout(() => {
        router.push('/vendor/dashboard');
      }, 1200);
    } catch (err) {
      setError('Unexpected error: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 via-white to-pink-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-xl border border-blue-100"
        style={{ boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)' }}
      >
        <h2 className="text-3xl font-extrabold mb-2 text-center text-blue-700 tracking-tight">Create Your Store</h2>
        <p className="mb-6 text-center text-gray-500">Fill in the details below to get started</p>
        {error && <div className="mb-4 text-red-600 text-center font-semibold">{error}</div>}
        {success && <div className="mb-4 text-green-600 text-center font-semibold">{success}</div>}
        <div className="mb-5">
          <label className="block mb-2 font-semibold text-blue-700">Store Name</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            className="w-full border-2 border-blue-200 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            placeholder="e.g. Vishal Mega Mart"
          />
        </div>
        <div className="mb-5">
          <label className="block mb-2 font-semibold text-blue-700">Address</label>
          <input
            type="text"
            name="address"
            value={form.address}
            onChange={handleChange}
            required
            className="w-full border-2 border-blue-200 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            placeholder="e.g. 123 Main Street, City"
          />
        </div>
        <div className="mb-5">
          <label className="block mb-2 font-semibold text-blue-700">Delivery Time (in minutes)</label>
          <input
            type="number"
            name="delivery_time"
            value={form.delivery_time}
            onChange={handleChange}
            required
            className="w-full border-2 border-blue-200 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            placeholder="e.g. 30"
            min={1}
          />
        </div>
        <div className="mb-5">
          <label className="block mb-2 font-semibold text-blue-700">Main Image URL</label>
          <input
            type="text"
            name="main_image"
            value={form.main_image}
            onChange={handleChange}
            placeholder="https://example.com/image.jpg"
            required
            className="w-full border-2 border-blue-200 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          />
        </div>
        <div className="mb-8">
          <label className="block mb-2 font-semibold text-blue-700">Gallery Images <span className="text-xs text-gray-400">(comma separated URLs)</span></label>
          <input
            type="text"
            name="gallery_images"
            value={form.gallery_images}
            onChange={handleChange}
            placeholder="https://img1.jpg,https://img2.jpg"
            className="w-full border-2 border-blue-200 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-500 to-pink-500 text-white py-3 rounded-lg font-bold text-lg shadow hover:from-blue-600 hover:to-pink-600 transition"
        >
          {loading ? 'Creating...' : 'Create Store'}
        </button>
      </form>
    </div>
  );
}