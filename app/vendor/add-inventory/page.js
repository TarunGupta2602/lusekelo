"use client";
import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import Image from "next/image";
import { useRouter } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Function to generate a unique SKU
const generateSKU = (name, categoryId) => {
  const timestamp = Date.now().toString().slice(-6);
  const namePart = (name || "PROD").slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const categoryPart = categoryId.toString().padStart(3, '0');
  return `SKU-${namePart}-${categoryPart}-${timestamp}`;
};

const ProductForm = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    description: "",
    quantity: "",
    categoryid: "",
    sku: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [supermarket_Id, setSupermarket_Id] = useState(null);
  const [variations, setVariations] = useState([]); // [{ size: '', color: '', price: '', stock: '' }]
  
  // Categories state
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");

  // Main categories mapping
  const mainCategories = [
    { id: 100, name: "Food & Drinks" },
    { id: 200, name: "Beauty & Personal Care" },
    { id: 300, name: "Household Essentials" },
    { id: 400, name: "Gym & Fitness" },
    { id: 500, name: "Clothing" },
    { id: 600, name: "Furniture" },
    { id: 700, name: "Electronics" },
    { id: 800, name: "Books & Media" }
  ];

  // Fetch the current user's supermarket id
  useEffect(() => {
    const fetchSupermarket = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
          setMessage({
            type: "error",
            text: "User not found. Please log in again.",
          });
          return;
        }
        const { data: stores, error: storeError } = await supabase
          .from("supermarkets")
          .select("id")
          .eq("vendor_id", user.id)
          .limit(1);
        if (storeError || !stores || stores.length === 0) {
          setMessage({ type: "error", text: "No store found for this vendor." });
          return;
        }
        setSupermarket_Id(stores[0].id);
      } catch (err) {
        setMessage({ type: "error", text: "Error fetching supermarket data." });
      }
    };
    fetchSupermarket();
  }, []);

  // Fetch categories and subcategories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('id');

        if (error) {
          console.error('Error fetching categories:', error);
          return;
        }

        setCategories(data);
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };

    fetchCategories();
  }, []);

  // Fetch subcategories when main category is selected
  useEffect(() => {
    const fetchSubcategories = async () => {
      if (!selectedCategory) {
        setSubcategories([]);
        setSelectedSubcategory("");
        return;
      }

      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('parent_id', selectedCategory)
          .order('name');

        if (error) {
          console.error('Error fetching subcategories:', error);
          return;
        }

        setSubcategories(data);
        setSelectedSubcategory(""); // Reset subcategory selection
      } catch (err) {
        console.error('Error fetching subcategories:', err);
      }
    };

    fetchSubcategories();
  }, [selectedCategory]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'name' || name === 'categoryid' ? { sku: generateSKU(name === 'name' ? value : prev.name, name === 'categoryid' ? value : prev.categoryid) } : {})
    }));
  };

  const handleCategoryChange = (e) => {
    const categoryId = e.target.value;
    setSelectedCategory(categoryId);
    setFormData(prev => ({
      ...prev,
      categoryid: categoryId,
      sku: generateSKU(prev.name, categoryId)
    }));
  };

  const handleSubcategoryChange = (e) => {
    const subcategoryId = e.target.value;
    setSelectedSubcategory(subcategoryId);
    setFormData(prev => ({
      ...prev,
      categoryid: subcategoryId,
      sku: generateSKU(prev.name, subcategoryId)
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (file) => {
    try {
      const ext = file.name.split(".").pop().toLowerCase();
      const fileName = `${Date.now()}.${ext}`;
      const filePath = `public/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(filePath, file);

      if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);

      const { data: urlData } = supabase.storage
        .from("images")
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) throw new Error("Failed to get image URL");

      return urlData.publicUrl;
    } catch (err) {
      throw new Error(`Image upload error: ${err.message}`);
    }
  };

  // Quantity input improvement
  const handleQuantityChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setFormData((prev) => ({ ...prev, quantity: value }));
  };
  const incrementQuantity = (amount) => {
    setFormData((prev) => ({
      ...prev,
      quantity: String(Number(prev.quantity || 0) + amount),
    }));
  };
  const setQuantity = (amount) => {
    setFormData((prev) => ({ ...prev, quantity: String(amount) }));
  };

  // Variation handlers
  const addVariation = () => {
    setVariations([...variations, { size: '', color: '', price: '', stock: '' }]);
  };
  const removeVariation = (idx) => {
    setVariations(variations.filter((_, i) => i !== idx));
  };
  const handleVariationChange = (idx, field, value) => {
    setVariations(variations.map((v, i) => i === idx ? { ...v, [field]: value } : v));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // Validate required fields
      if (!formData.name || !formData.price || !formData.quantity || !formData.categoryid) {
        setMessage({ type: "error", text: "Please fill in all required fields (Name, Price, Quantity, Category)." });
        setLoading(false);
        return;
      }

      if (!supermarket_Id) {
        setMessage({ type: "error", text: "Supermarket not found. Please refresh the page." });
        setLoading(false);
        return;
      }

      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      // Format variations for JSONB column
      const formattedVariations = variations
        .filter(v => v.size || v.color || v.price || v.stock) // Only include non-empty variations
        .map(v => ({
          size: v.size || null,
          color: v.color || null,
          price: v.price ? parseFloat(v.price) : null,
          stock: v.stock ? parseInt(v.stock) : null,
        }));

      // Generate SKU if not already set
      const sku = formData.sku || generateSKU(formData.name, formData.categoryid);

      const productData = {
        name: formData.name,
        price: parseFloat(formData.price),
        description: formData.description || null,
        quantity: parseInt(formData.quantity),
        image: imageUrl || null,
        categoryid: parseInt(formData.categoryid),
        supermarket_id: supermarket_Id,
        date_added: new Date().toISOString(),
        variations: formattedVariations.length > 0 ? formattedVariations : null,
        sku: sku,
      };

      const { error } = await supabase.from("products").insert([productData]);

      if (error) throw new Error(`Database error: ${error.message}`);

      setMessage({ type: "success", text: "Product added successfully!" });
      setFormData({
        name: "",
        price: "",
        description: "",
        quantity: "",
        categoryid: "",
        sku: "",
      });
      setImageFile(null);
      setPreviewUrl(null);
      setVariations([]);
      setSelectedCategory("");
      setSelectedSubcategory("");
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
              step="0.01"
              min="0"
              className="w-full p-3 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50 placeholder-gray-400"
            />
          </div>
          {/* SKU Display */}
          <div>
            <label className="block text-sm font-semibold text-blue-700 mb-1">
              SKU
            </label>
            <input
              type="text"
              name="sku"
              placeholder="SKU (auto-generated)"
              value={formData.sku}
              readOnly
              className="w-full p-3 border border-blue-200 rounded-xl bg-blue-50 text-gray-500"
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
          {/* Quantity Input with Quick Buttons */}
          <div className="flex items-center gap-2 mb-2">
            <input
              type="text"
              name="quantity"
              placeholder="Quantity"
              value={formData.quantity}
              onChange={handleQuantityChange}
              required
              className="w-32 p-3 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50 placeholder-gray-400"
            />
            <button type="button" className="px-2 py-1 bg-blue-200 rounded" onClick={() => incrementQuantity(1)}>+1</button>
            <button type="button" className="px-2 py-1 bg-blue-200 rounded" onClick={() => incrementQuantity(10)}>+10</button>
            <button type="button" className="px-2 py-1 bg-blue-200 rounded" onClick={() => incrementQuantity(50)}>+50</button>
            <button type="button" className="px-2 py-1 bg-blue-200 rounded" onClick={() => setQuantity(100)}>Set 100</button>
          </div>
          {/* Variations Section */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-blue-700 mb-1">Product Variations</label>
            {variations.length === 0 && (
              <div className="text-xs text-gray-400 mb-2">No variations added. Add size/color/price/stock options below.</div>
            )}
            {variations.map((variation, idx) => (
              <div key={idx} className="flex gap-2 mb-2 items-center">
                <input
                  type="text"
                  placeholder="Size (e.g. M, L, XL)"
                  value={variation.size}
                  onChange={e => handleVariationChange(idx, 'size', e.target.value)}
                  className="w-20 p-2 border border-blue-200 rounded"
                />
                <input
                  type="text"
                  placeholder="Color"
                  value={variation.color}
                  onChange={e => handleVariationChange(idx, 'color', e.target.value)}
                  className="w-20 p-2 border border-blue-200 rounded"
                />
                <input
                  type="number"
                  placeholder="Price"
                  value={variation.price}
                  onChange={e => handleVariationChange(idx, 'price', e.target.value)}
                  step="0.01"
                  min="0"
                  className="w-24 p-2 border border-blue-200 rounded"
                />
                <input
                  type="number"
                  placeholder="Stock"
                  value={variation.stock}
                  onChange={e => handleVariationChange(idx, 'stock', e.target.value)}
                  min="0"
                  className="w-20 p-2 border border-blue-200 rounded"
                />
                <button type="button" className="text-red-500 px-2" onClick={() => removeVariation(idx)}>✕</button>
              </div>
            ))}
            <button type="button" className="bg-blue-500 text-white px-3 py-1 rounded mt-2" onClick={addVariation}>Add Variation</button>
          </div>
          
          {/* Category Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-blue-700 mb-1">
                Main Category
              </label>
              <select
                value={selectedCategory}
                onChange={handleCategoryChange}
                required
                className="w-full p-3 border border-blue-200 rounded-xl bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700"
              >
                <option value="">Select Main Category</option>
                {mainCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-blue-700 mb-1">
                Subcategory
              </label>
              <select
                value={selectedSubcategory}
                onChange={handleSubcategoryChange}
                required
                disabled={!selectedCategory || subcategories.length === 0}
                className="w-full p-3 border border-blue-200 rounded-xl bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700 disabled:bg-gray-100 disabled:text-gray-400"
              >
                <option value="">
                  {!selectedCategory 
                    ? "Select Main Category First" 
                    : subcategories.length === 0 
                      ? "No subcategories available" 
                      : "Select Subcategory"}
                </option>
                {subcategories.map((subcategory) => (
                  <option key={subcategory.id} value={subcategory.id}>
                    {subcategory.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-semibold text-blue-700 mb-1">
              Upload Image
            </label>
            <div className="relative border-2 border-dashed rounded-xl p-4 bg-blue-50 flex flex-col items-center justify-center transition-all duration-200 hover:border-blue-400">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                style={{ height: '100%' }}
              />
              {previewUrl ? (
                <Image
                  src={previewUrl}
                  alt="Preview"
                  width={180}
                  height={180}
                  className="rounded-xl shadow-lg max-h-48 object-contain border border-blue-100 mx-auto"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-40">
                  <svg className="w-12 h-12 text-blue-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4a1 1 0 011-1h8a1 1 0 011 1v12m-4 4h-4a1 1 0 01-1-1v-1h10v1a1 1 0 01-1 1h-4z" />
                  </svg>
                  <span className="text-blue-400 font-medium">No image selected</span>
                  <span className="text-xs text-gray-400">Product will use a default image</span>
                </div>
              )}
            </div>
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