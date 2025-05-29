'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

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
  const productsPerPage = 10;

  // Normalize image path if you use images
  const normalizeImagePath = (path) => {
    if (!path) return '';
    return path.replace(/^(\.\.\/)+assets\//, '/');
  };

  // Fetch products from Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        // Fetch products from products table
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('id, name, price, image, quantity, date_added')
          .order('date_added', { ascending: sortOrder === 'asc' });

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
  }, [sortOrder]);

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
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditId(null);
    setEditForm({ name: '', price: '', quantity: '' });
  };

  // Save edit
  const handleSaveEdit = async (id) => {
    const { name, price, quantity } = editForm;
    const { error } = await supabase
      .from('products')
      .update({ name, price, quantity })
      .eq('id', id);
    if (error) {
      alert('Failed to update product: ' + error.message);
      return;
    }
    // Update UI
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, name, price, quantity } : p
      )
    );
    setEditId(null);
    setEditForm({ name: '', price: '', quantity: '' });
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

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Edit Inventory</h2>
      <div className="flex space-x-2 mb-4">
        {['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'All'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded ${filter === f ? 'bg-gray-200' : 'bg-white'} border`}
          >
            {f}
          </button>
        ))}
        <input
          type="text"
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-4 py-2 border rounded"
        />
        <button onClick={handleSortByNewest} className="bg-blue-500 text-white px-4 py-2 rounded">
          Sort by {sortOrder === 'desc' ? 'Oldest' : 'Newest'}
        </button>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : filteredProducts.length === 0 ? (
        <p>No products found.</p>
      ) : (
        <div className="bg-white shadow-md rounded">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b">
                <th className="p-4">Product</th>
                <th className="p-4">Date Added</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map((product) => {
                const stock = getStockStatus(product.quantity);
                const isEditing = editId === product.id;
                return (
                  <tr key={product.id} className="border-b">
                    <td className="p-4">
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
                    <td className="p-4">{product.date_added}</td>
                    <td className="p-4">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editForm.price}
                          onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                          className="border px-2 py-1 rounded w-full"
                        />
                      ) : (
                        product.price
                      )}
                    </td>
                    <td className={`p-4 font-semibold ${stock.color}`}>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editForm.quantity}
                          onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                          className="border px-2 py-1 rounded w-full"
                        />
                      ) : (
                        stock.text
                      )}
                    </td>
                    <td className="p-4 space-x-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleSaveEdit(product.id)}
                            className="bg-green-500 text-white px-3 py-1 rounded"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="bg-gray-400 text-white px-3 py-1 rounded"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(product)}
                            className="bg-yellow-500 text-white px-3 py-1 rounded"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="bg-red-500 text-white px-3 py-1 rounded"
                          >
                            Delete
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
      <div className="flex justify-center mt-4 space-x-2">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`px-4 py-2 rounded ${currentPage === 1 ? 'bg-gray-300 cursor-not-allowed' : 'bg-gray-200'}`}
        >
          Previous
        </button>
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i + 1}
            onClick={() => handlePageChange(i + 1)}
            className={`px-4 py-2 rounded ${currentPage === i + 1 ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            {i + 1}
          </button>
        ))}
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`px-4 py-2 rounded ${currentPage === totalPages ? 'bg-gray-300 cursor-not-allowed' : 'bg-gray-200'}`}
        >
          Next
        </button>
      </div>
    </div>
  );
}
