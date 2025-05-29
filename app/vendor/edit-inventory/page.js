"use client";
import React, { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Image from "next/image"; // Add this at the top

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const ProductForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    description: "",
    quantity: "",
    categoryid: "1",
    supermarketid: "1",
  });
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (file) => {
    const ext = file.name.split(".").pop().toLowerCase();
    const fileName = `${Date.now()}.${ext}`;
    const filePath = `public/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from("images")
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const { error } = await supabase.from("products").insert([
        {
          name: formData.name,
          price: parseFloat(formData.price),
          description: formData.description,
          quantity: parseInt(formData.quantity),
          image: imageUrl,
          categoryid: parseInt(formData.categoryid),
          supermarketid: parseInt(formData.supermarketid),
          date_added: new Date().toISOString(), // Add current date
        },
      ]);

      if (error) throw error;

      setMessage({ type: "success", text: "Product added successfully!" });
      setFormData({
        name: "",
        price: "",
        description: "",
        quantity: "",
        categoryid: "1",
        supermarketid: "1",
      });
      setImageFile(null);
      setPreviewUrl(null);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50 flex items-center justify-center py-10">
      <div className="w-full max-w-2xl bg-white/90 border border-blue-100 rounded-3xl shadow-2xl p-8 md:p-12 relative">
        <h2 className="text-3xl font-extrabold text-center text-blue-700 mb-2 tracking-tight drop-shadow-sm">
          Add New Product
        </h2>
        <p className="text-center text-gray-500 mb-8">
          Fill in the details below to add a new product to your inventory.
        </p>
        <form onSubmit={handleSubmit} className="space-y-7">
          {/* Product Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <input
              type="text"
              name="name"
              placeholder="Product Name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full p-3 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50 placeholder-gray-400"
            />
            <input
              type="number"
              name="price"
              placeholder="Price"
              value={formData.price}
              onChange={handleChange}
              required
              className="w-full p-3 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50 placeholder-gray-400"
            />
          </div>

          <textarea
            name="description"
            placeholder="Description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full p-3 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50 placeholder-gray-400"
          />

          <input
            type="number"
            name="quantity"
            placeholder="Quantity"
            value={formData.quantity}
            onChange={handleChange}
            required
            className="w-full p-3 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50 placeholder-gray-400"
          />

          {/* Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-blue-700 mb-1">
                Category
              </label>
              <select
                name="categoryid"
                value={formData.categoryid}
                onChange={handleChange}
                className="w-full p-3 border border-blue-200 rounded-xl bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700"
              >
                {/* Insert categories as needed */}
                <option value="1">Electronics</option>
                                <option value="2">Breakfast</option>

                
                
                
                <option value="101">Vegetables</option>
                <option value="102">Tea, Coffee & more</option>
                <option value="103">Fruits</option>
                <option value="104">Munchies</option>
                <option value="105">Cold Drinks & Juices</option>
                <option value="106">Bakery & Biscuits</option>
                <option value="107">Chicken & Fish</option>
                <option value="108">Dry Fruits</option>
                <option value="201">Makeup & Beauty</option>
                <option value="202">Skin Care</option>
                <option value="203">Baby Care</option>
                <option value="204">Hair Care</option>
                <option value="205">Pharma & Wellness</option>
                <option value="206">Protein Powders</option>
                <option value="301">Home Needs</option>
                <option value="302">Kitchen & Dining</option>
                <option value="303">Cleaning Essentials</option>
                <option value="304">Pet Care</option>
                <option value="305">Atta, Rice & Dal</option>
                <option value="306">Bed & Mattresses</option>
                <option value="401">Protein Supplements</option>
                <option value="402">Workout Equipment</option>
                <option value="403">Fitness Accessories</option>
                <option value="404">Sports Nutrition</option>
                <option value="501">Men&#39;s Clothing</option>
                <option value="502">Women&#39;s Clothing</option>
                <option value="503">Kids&#39; Clothing</option>
                <option value="504">Sportswear</option>
                <option value="601">Living Room</option>
                <option value="602">Bedroom</option>
                <option value="603">Office</option>
                <option value="604">Outdoor</option>
                
                <option value="701">Mobile Phones</option>
                <option value="702">Laptops</option>
                <option value="704">Audio</option>
                <option value="801">Fiction</option>
                <option value="802">Non-Fiction</option>
                <option value="803">Movies</option>
                <option value="804">Music</option>
                {/* Add all other categories here */}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-blue-700 mb-1">
                Supermarket
              </label>
              <select
                name="supermarketid"
                value={formData.supermarketid}
                onChange={handleChange}
                className="w-full p-3 border border-blue-200 rounded-xl bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700"
              >
                <option value="1">Supermarket 1</option>
                <option value="2">Supermarket 2</option>
                <option value="3">Supermarket 3</option>
              </select>
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-semibold text-blue-700 mb-1">
              Upload Image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:border-0 file:rounded-full file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {previewUrl && (
              <Image
                src={previewUrl}
                alt="Preview"
                width={240}
                height={240}
                className="mt-4 rounded-xl shadow-lg max-h-60 object-contain border border-blue-100 mx-auto"
              />
            )}
          </div>

          {/* Submit Button & Message */}
          <div className="flex flex-col items-center mt-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-pink-500 hover:from-blue-700 hover:to-pink-600 text-white font-bold px-8 py-3 rounded-xl shadow-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    ></path>
                  </svg>
                  Submitting...
                </span>
              ) : (
                "Add Product"
              )}
            </button>
            {message && (
              <p
                className={`mt-4 text-center text-lg ${
                  message.type === "error"
                    ? "text-red-600"
                    : "text-green-600"
                }`}
              >
                {message.text}
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductForm;
