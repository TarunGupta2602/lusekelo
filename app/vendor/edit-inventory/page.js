'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { FaRegEdit, FaRegTrashAlt } from "react-icons/fa"; // Add this at the top with your imports
import Papa from "papaparse";

export default function EditInventoryPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', price: '', quantity: '' });
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);
  const productsPerPage = 10;
  const [sortField, setSortField] = useState('date_added');

  // Normalize image path if you use images
  const normalizeImagePath = (path) => {
    if (!path || typeof path !== 'string' || path.trim() === '') return null;
    // If already an absolute URL
    if (/^https?:\/\//.test(path)) return path;
    // If starts with /, return as is
    if (path.startsWith('/')) return path;
    // Remove leading ../assets/ or similar, ensure leading slash
    return '/' + path.replace(/^([.]{2}\/+)*(assets\/)?/, '');
  };

  // Fetch products from Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        // 1. Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          setError('User not found. Please log in again.');
          setLoading(false);
          return;
        }

        // 2. Get supermarket for this vendor
        const { data: stores, error: storeError } = await supabase
          .from('supermarkets')
          .select('id, vendor_id, created_at, location, price')
          .eq('vendor_id', user.id)
          .limit(1);

        if (storeError) {
          setError('Error fetching store: ' + storeError.message);
          setLoading(false);
          return;
        }
        if (!stores || stores.length === 0) {
          setError('No store found for this vendor.');
          setLoading(false);
          return;
        }
        const supermarket_Id = stores[0].id;

        // 3. Fetch products for this supermarket only
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('id, name, price, image, quantity, date_added, supermarket_id')
          .eq('supermarket_id', supermarket_Id)
          .order(sortField, { ascending: sortOrder === 'asc' });

        if (productsError) {
          setError('Error fetching products: ' + productsError.message);
          setLoading(false);
          return;
        }

        if (!productsData || productsData.length === 0) {
          setError('No products available in the inventory.');
          setProducts([]);
          setFilteredProducts([]);
          setLoading(false);
          return;
        }

        // Normalize image paths
        const normalizedProducts = productsData.map((product) => ({
          ...product,
          image: normalizeImagePath(product.image),
        }));

        setProducts(normalizedProducts);
        setFilteredProducts(normalizedProducts);
        setLoading(false);
      } catch (err) {
        setError('Unexpected error: ' + err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, [sortOrder, sortField]);

  // Filtering and searching
  useEffect(() => {
    const filtered = products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      const today = new Date();
      const productDate = new Date(product.date_added);

      if (filter === 'Today') {
        return matchesSearch && productDate.toDateString() === today.toDateString();
      } else if (filter === 'Yesterday') {
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        return matchesSearch && productDate.toDateString() === yesterday.toDateString();
      } else if (filter === 'Last 7 Days') {
        const last7Days = new Date(today);
        last7Days.setDate(today.getDate() - 7);
        return matchesSearch && productDate >= last7Days;
      } else if (filter === 'Last 30 Days') {
        const last30Days = new Date(today);
        last30Days.setDate(today.getDate() - 30);
        return matchesSearch && productDate >= last30Days;
      }
      return matchesSearch;
    });

    setFilteredProducts(filtered);
    setCurrentPage(1); // Reset to first page on search or filter change
  }, [searchQuery, filter, products]);

  // Pagination logic
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + productsPerPage);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  // Sort order toggle
  const handleSortByNewest = () => {
    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
  };

  // Edit handler: open inline edit form
  const handleEdit = (product) => {
    setEditId(product.id);
    setEditForm({
      name: product.name,
      price: product.price,
      quantity: product.quantity,
    });
    setEditImageFile(null);
    setEditImagePreview(product.image || null); // Show current image as preview
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditId(null);
    setEditForm({ name: '', price: '', quantity: '' });
    setEditImageFile(null);
    setEditImagePreview(null);
  };

  // Upload image to Supabase Storage
  const uploadImage = async (file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    const fileName = `${Date.now()}.${ext}`;
    const filePath = `public/${fileName}`;
    const { error: uploadError } = await supabase.storage.from('images').upload(filePath, file);
    if (uploadError) throw uploadError;
    const { data: urlData } = supabase.storage.from('images').getPublicUrl(filePath);
    return urlData.publicUrl;
  };

  // Handle image file change
  const handleEditImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEditImageFile(file);
      setEditImagePreview(URL.createObjectURL(file));
    }
  };

  // Save edit (with image upload if needed)
  const handleSaveEdit = async (id) => {
    const { name, price, quantity } = editForm;
    let imageUrl = null;
    try {
      if (editImageFile) {
        imageUrl = await uploadImage(editImageFile);
      }
      const updateData = { name, price, quantity };
      if (imageUrl) updateData.image = imageUrl;
      const { error } = await supabase.from('products').update(updateData).eq('id', id);
      if (error) {
        alert('Failed to update product: ' + error.message);
        return;
      }
      setProducts((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, name, price, quantity, image: imageUrl || p.image } : p
        )
      );
      setEditId(null);
      setEditForm({ name: '', price: '', quantity: '' });
      setEditImageFile(null);
      setEditImagePreview(null);
    } catch (err) {
      alert('Failed to upload image: ' + err.message);
    }
  };

  // Delete handler
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      // Delete from DB
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) {
        alert('Failed to delete product: ' + error.message);
        return;
      }
      // Remove from UI
      setProducts((prev) => prev.filter((p) => p.id !== id));
    }
  };

  // Stock status
  const getStockStatus = (quantity) => {
    if (quantity === 0) return { text: 'Out of Stock', color: 'bg-red-100 text-red-600' };
    if (quantity <= 5) return { text: 'Low Stock', color: 'bg-yellow-100 text-yellow-600' };
    return { text: 'In Stock', color: 'bg-green-100 text-green-600' };
  };

  // Add state for image file and preview
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Handle image file change
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Save new product
  const handleSaveNewProduct = async () => {
    const { name, price, quantity } = editForm;
    try {
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }
      const { error } = await supabase
        .from('products')
        .insert([{ name, price, quantity, image: imageUrl }]);
      if (error) {
        alert('Failed to add product: ' + error.message);
        return;
      }
      // Refresh product list
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, price, image, quantity, date_added, supermarket_id')
        .eq('supermarket_id', supermarket_Id)
        .order('date_added', { ascending: sortOrder === 'asc' });
      if (productsError) throw productsError;
      setProducts(productsData);
      setFilteredProducts(productsData);
      setEditForm({ name: '', price: '', quantity: '' });
      setImageFile(null);
      setImagePreview(null);
    } catch (err) {
      setError('Error: ' + err.message);
    }
  };

  return (
    <div className="p-2 sm:p-4 md:p-8 bg-gradient-to-br from-blue-50 via-white to-pink-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center text-blue-800 drop-shadow">Edit Inventory</h2>
        <div className="flex flex-wrap gap-2 mb-8 items-center bg-white p-4 rounded-lg shadow border border-blue-100 justify-center">
          <div className="flex gap-2 flex-wrap items-center">
            {['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'All'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded ${filter === f ? 'bg-blue-100 font-semibold text-blue-700' : 'bg-white'} border`}
              >
                {f}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 border rounded ml-2"
          />
          <div className="flex items-center gap-2 ml-2">
            <label className="font-semibold text-gray-700">Sort By:</label>
            <select
              value={sortField}
              onChange={e => setSortField(e.target.value)}
              className="border rounded px-2 py-1 bg-gray-50"
            >
              <option value="id">Product ID</option>
              <option value="name">Name</option>
              <option value="price">Price</option>
              <option value="date_added">Date Added</option>
              <option value="quantity">Quantity</option>
            </select>
            <button onClick={handleSortByNewest} className="bg-blue-500 text-white px-4 py-2 rounded">
              {sortOrder === 'desc' ? '↓' : '↑'}
            </button>
          </div>
        </div>
        {loading ? (
          <p className="text-center text-lg text-blue-600">Loading...</p>
        ) : error ? (
          <p className="text-center text-red-600 text-lg">{error}</p>
        ) : filteredProducts.length === 0 ? (
          <p className="text-center text-gray-500 text-lg">No products found.</p>
        ) : (
          <div className="bg-white shadow-lg rounded-xl overflow-x-auto border-2 border-blue-300 mt-4">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b-2 border-blue-300 bg-blue-50">
                  <th className="p-4 font-bold border-r border-blue-200">Product Image</th>
                  <th className="p-4 font-bold border-r border-blue-200">Product Name</th>
                  <th className="p-4 font-bold border-r border-blue-200">Date Added</th>
                  <th className="p-4 font-bold border-r border-blue-200">Amount</th>
                  <th className="p-4 font-bold border-r border-blue-200">Units in Stock</th>
                  <th className="p-4 font-bold">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map((product, idx) => {
                  const isEditing = editId === product.id;
                  return (
                    <tr key={product.id} className={`border-b border-blue-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-blue-50'} hover:bg-blue-100 transition-all`}>
                      <td className="p-3 border-r border-blue-100 text-center">
                        {isEditing ? (
                          <div className="flex flex-col items-center gap-2">
                            {editImagePreview ? (
                              <Image
                                src={normalizeImagePath(editImagePreview) || '/file.svg'}
                                alt={editForm.name}
                                width={40}
                                height={40}
                                className="rounded object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gray-200 flex items-center justify-center rounded text-gray-400">
                                <span className="text-xs">No Image</span>
                              </div>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleEditImageChange}
                              className="text-xs"
                            />
                          </div>
                        ) : product.image && normalizeImagePath(product.image) ? (
                          <Image
                            src={normalizeImagePath(product.image)}
                            alt={product.name}
                            width={40}
                            height={40}
                            className="rounded object-cover mx-auto"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-200 flex items-center justify-center rounded text-gray-400 mx-auto">
                            <span className="text-xs">No Image</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3 border-r border-blue-100 font-semibold text-blue-900">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="border px-2 py-1 rounded w-full"
                          />
                        ) : (
                          product.name
                        )}
                      </td>
                      <td className="p-3 border-r border-blue-100 text-gray-600">
                        {product.date_added}
                      </td>
                      <td className="p-3 border-r border-blue-100">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editForm.price}
                            onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                            className="border px-2 py-1 rounded w-full"
                          />
                        ) : (
                          `$${parseFloat(product.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                        )}
                      </td>
                      <td className="p-3 border-r border-blue-100">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editForm.quantity}
                            onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                            className="border px-2 py-1 rounded w-full"
                          />
                        ) : (
                          product.quantity
                        )}
                      </td>
                      <td className="p-3 flex gap-2 justify-center">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(product.id)}
                              className="bg-green-500 text-white px-2 py-1 rounded shadow hover:bg-green-600"
                              title="Save"
                            >
                              ✓
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="bg-gray-400 text-white px-2 py-1 rounded shadow hover:bg-gray-500"
                              title="Cancel"
                            >
                              ×
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEdit(product)}
                              className="bg-transparent text-blue-600 hover:bg-blue-100 px-2 py-1 rounded shadow"
                              title="Edit"
                            >
                              <FaRegEdit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="bg-transparent text-red-600 hover:bg-red-100 px-2 py-1 rounded shadow"
                              title="Delete"
                            >
                              <FaRegTrashAlt className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {/* Pagination */}
        <div className="flex justify-center mt-8 space-x-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`px-4 py-2 rounded shadow ${currentPage === 1 ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-200 hover:bg-blue-300 text-blue-800'}`}
          >
            Previous
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => handlePageChange(i + 1)}
              className={`px-4 py-2 rounded shadow ${currentPage === i + 1 ? 'bg-blue-600 text-white' : 'bg-blue-100 hover:bg-blue-200 text-blue-800'}`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`px-4 py-2 rounded shadow ${currentPage === totalPages ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-200 hover:bg-blue-300 text-blue-800'}`}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}