'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Image from 'next/image';
import { FaPlus, FaEdit, FaBan, FaCheck, FaChevronDown, FaSpinner } from 'react-icons/fa';
import { Tooltip } from 'react-tooltip';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

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

export default function ProductsManagement() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', parent_id: null });
  const [searchProducts, setSearchProducts] = useState('');
  const [productsPage, setProductsPage] = useState(1);
  const [productsLoading, setProductsLoading] = useState(false);
  const [error, setError] = useState('');
  const [productsTotalPages, setProductsTotalPages] = useState(1);
  const productsPerPage = 10;
  const [expandedRows, setExpandedRows] = useState({});

  useEffect(() => {
    fetchProducts(productsPage);
    fetchCategories();
  }, [productsPage, searchProducts]);

  const fetchProducts = async (page = 1) => {
    setProductsLoading(true);
    setError('');
    try {
      const from = (page - 1) * productsPerPage;
      const to = from + productsPerPage - 1;
      const { data, error, count } = await supabase
        .from('products')
        .select(
          `
          id, name, price, image, quantity, description, date_added, 
          approval_status, is_featured,
          categories:categoryid (id, name),
          supermarkets:supermarket_id (id, name)
        `,
          { count: 'exact' }
        )
        .ilike('name', `%${searchProducts}%`)
        .order('date_added', { ascending: false })
        .range(from, to);
      if (error) throw new Error(`Error fetching products: ${error.message}`);
      setProducts(data || []);
      setProductsTotalPages(Math.ceil((count || 0) / productsPerPage));
    } catch (err) {
      setError(`Failed to load products: ${err.message}`);
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchCategories = async () => {
    setError('');
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, description, image, parent_id')
        .order('name', { ascending: true });
      if (error) throw new Error(`Error fetching categories: ${error.message}`);
      setCategories(data || []);
    } catch (err) {
      setError(`Failed to load categories: ${err.message}`);
    }
  };

  const handleAddCategory = async () => {
    if (!categoryForm.name.trim()) {
      alert('Category name is required.');
      return;
    }
    try {
      const { error } = await supabase.from('categories').insert([
        {
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim(),
          parent_id: categoryForm.parent_id || null,
        },
      ]);
      if (!error) {
        setShowAddCategoryModal(false);
        setCategoryForm({ name: '', description: '', parent_id: null });
        fetchCategories();
        alert('Category added successfully!');
      } else {
        alert('Error adding category: ' + error.message);
      }
    } catch (err) {
      alert('Unexpected error adding category: ' + err.message);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (!error) {
        fetchCategories();
        alert('Category deleted successfully!');
      } else {
        alert('Error deleting category: ' + error.message);
      }
    } catch (err) {
      alert('Unexpected error deleting category: ' + err.message);
    }
  };

  const handleUpdateProductStatus = async (productId, status) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ approval_status: status })
        .eq('id', productId);
      if (!error) {
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, approval_status: status } : p))
        );
        alert(`Product ${status} successfully!`);
      } else {
        alert(`Error updating product status: ${error.message}`);
      }
    } catch (err) {
      alert('Unexpected error updating product status: ' + err.message);
    }
  };

  const handleToggleFeatured = async (productId, isFeatured) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_featured: !isFeatured })
        .eq('id', productId);
      if (!error) {
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, is_featured: !isFeatured } : p))
        );
        alert(`Product ${!isFeatured ? 'set as' : 'removed from'} featured!`);
      } else {
        alert(`Error updating featured status: ${error.message}`);
      }
    } catch (err) {
      alert('Unexpected error updating featured status: ' + err.message);
    }
  };

  const getProductStatusClass = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-600';
      case 'pending':
        return 'bg-yellow-100 text-yellow-600';
      case 'rejected':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 md:p-8">
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm sm:text-base">
          {error}
        </div>
      )}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-bold mb-4 text-gray-800">Add Category</h2>
            <div className="mb-4">
              <label className="block text-left text-gray-700 font-semibold mb-1 text-sm sm:text-base" htmlFor="category-name">
                Name
              </label>
              <input
                id="category-name"
                type="text"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm sm:text-base"
                placeholder="Enter category name"
                aria-required="true"
              />
            </div>
            <div className="mb-4">
              <label className="block text-left text-gray-700 font-semibold mb-1 text-sm sm:text-base" htmlFor="category-description">
                Description
              </label>
              <textarea
                id="category-description"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm sm:text-base"
                placeholder="Enter category description"
                rows="4"
              />
            </div>
            <div className="mb-4">
              <label className="block text-left text-gray-700 font-semibold mb-1 text-sm sm:text-base" htmlFor="parent-category">
                Parent Category
              </label>
              <select
                id="parent-category"
                value={categoryForm.parent_id || ''}
                onChange={(e) => setCategoryForm((prev) => ({ ...prev, parent_id: e.target.value || null }))}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm sm:text-base"
              >
                <option value="">None</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-4 py-2 rounded-lg shadow transition text-sm sm:text-base"
                onClick={() => setShowAddCategoryModal(false)}
                aria-label="Cancel adding category"
              >
                Cancel
              </button>
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg shadow transition text-sm sm:text-base"
                onClick={handleAddCategory}
                aria-label="Add category"
              >
                Add Category
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Products Section */}
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">Products</h2>
            <input
              type="text"
              placeholder="Search products..."
              className="border px-3 py-2 rounded-lg w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm sm:text-base"
              value={searchProducts}
              onChange={(e) => setSearchProducts(e.target.value)}
              aria-label="Search products"
            />
          </div>
          {productsLoading ? (
            <div className="text-center py-8 text-gray-500 text-sm sm:text-base">
              <FaSpinner className="animate-spin inline-block mr-2" />
              Loading products...
            </div>
          ) : products.length === 0 ? (
            <div className="text-center text-gray-400 py-8 text-sm sm:text-base">No products found.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell"></th>
                      <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider">Image</th>
                      <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                      <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider">Price</th>
                      <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">Category</th>
                      <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">Supermarket</th>
                      <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                      <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider">Featured</th>
                      <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {products.map((product, index) => (
                      <React.Fragment key={product.id}>
                        <tr className={`transition-all ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                          <td className="px-3 sm:px-4 py-3 hidden md:table-cell">
                            <button
                              className="text-gray-600 hover:text-gray-800 focus:outline-none"
                              onClick={() =>
                                setExpandedRows((prev) => ({
                                  ...prev,
                                  [product.id]: !prev[product.id],
                                }))
                              }
                              aria-label={expandedRows[product.id] ? 'Collapse product details' : 'Expand product details'}
                            >
                              <FaChevronDown
                                className={`transform transition-transform ${expandedRows[product.id] ? 'rotate-180' : ''}`}
                              />
                            </button>
                          </td>
                          <td className="px-3 sm:px-4 py-3">
                            <Image
                              src={normalizeImagePath(product.image)[0]}
                              alt={product.name || 'Product image'}
                              width={40}
                              height={40}
                              className="rounded object-cover border w-10 h-10 sm:w-12 sm:h-12"
                              unoptimized
                            />
                          </td>
                          <td className="px-3 sm:px-4 py-3 font-semibold text-gray-800 truncate max-w-[120px] sm:max-w-[200px]">
                            {product.name}
                          </td>
                          <td className="px-3 sm:px-4 py-3">${product.price.toFixed(2)}</td>
                          <td className="px-3 sm:px-4 py-3 hidden md:table-cell">{product.categories?.name || 'N/A'}</td>
                          <td className="px-3 sm:px-4 py-3 hidden md:table-cell">{product.supermarkets?.name || 'N/A'}</td>
                          <td className="px-3 sm:px-4 py-3">
                            <span
                              className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${getProductStatusClass(
                                product.approval_status
                              )}`}
                            >
                              {product.approval_status}
                            </span>
                          </td>
                          <td className="px-3 sm:px-4 py-3">
                            <span
                              className={`text-xs font-medium ${
                                product.is_featured ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {product.is_featured ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="px-3 sm:px-4 py-3 flex gap-2 items-center">
                            {product.approval_status === 'pending' && (
                              <>
                                <button
                                  className="text-green-600 hover:text-green-800 focus:outline-none"
                                  onClick={() => handleUpdateProductStatus(product.id, 'approved')}
                                  data-tooltip-id={`approve-product-${product.id}`}
                                  data-tooltip-content="Approve Product"
                                  aria-label="Approve product"
                                >
                                  <FaCheck />
                                  <Tooltip id={`approve-product-${product.id}`} />
                                </button>
                                <button
                                  className="text-red-600 hover:text-red-800 focus:outline-none"
                                  onClick={() => handleUpdateProductStatus(product.id, 'rejected')}
                                  data-tooltip-id={`reject-product-${product.id}`}
                                  data-tooltip-content="Reject Product"
                                  aria-label="Reject product"
                                >
                                  <FaBan />
                                  <Tooltip id={`reject-product-${product.id}`} />
                                </button>
                              </>
                            )}
                            <button
                              className="text-blue-600 hover:text-blue-800 focus:outline-none"
                              onClick={() => handleToggleFeatured(product.id, product.is_featured)}
                              data-tooltip-id={`featured-product-${product.id}`}
                              data-tooltip-content={product.is_featured ? 'Remove Featured' : 'Set Featured'}
                              aria-label={product.is_featured ? 'Remove featured status' : 'Set as featured'}
                            >
                              <FaEdit />
                              <Tooltip id={`featured-product-${product.id}`} />
                            </button>
                          </td>
                        </tr>
                        {expandedRows[product.id] && (
                          <tr className="bg-gray-50">
                            <td colSpan={9} className="px-3 sm:px-4 py-3">
                              <div className="flex flex-col gap-2 text-xs sm:text-sm">
                                <div>
                                  <strong>Description:</strong> {product.description || 'N/A'}
                                </div>
                                <div>
                                  <strong>Quantity:</strong> {product.quantity || 'N/A'}
                                </div>
                                <div>
                                  <strong>Date Added:</strong>{' '}
                                  {new Date(product.date_added).toLocaleDateString() || 'N/A'}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-col sm:flex-row justify-center items-center gap-2">
                <button
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50 text-sm sm:text-base"
                  onClick={() => setProductsPage((prev) => Math.max(prev - 1, 1))}
                  disabled={productsPage === 1}
                  aria-label="Previous products page"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm sm:text-base">
                  Page {productsPage} of {productsTotalPages}
                </span>
                <button
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50 text-sm sm:text-base"
                  onClick={() => setProductsPage((prev) => Math.min(prev + 1, productsTotalPages))}
                  disabled={productsPage === productsTotalPages}
                  aria-label="Next products page"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>

        {/* Categories Section */}
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">Categories</h2>
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg flex items-center gap-2 text-sm sm:text-base"
              onClick={() => setShowAddCategoryModal(true)}
              aria-label="Add new category"
            >
              <FaPlus /> Add Category
            </button>
          </div>
          {categories.length === 0 ? (
            <div className="text-center text-gray-400 py-8 text-sm sm:text-base">No categories found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                    <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                      Description
                    </th>
                    <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider">Parent</th>
                    <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {categories.map((category, index) => (
                    <tr
                      key={category.id}
                      className={`transition-all ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}
                    >
                      <td className="px-3 sm:px-4 py-3 font-semibold text-gray-800 truncate max-w-[120px] sm:max-w-[200px]">
                        {category.name}
                      </td>
                      <td className="px-3 sm:px-4 py-3 hidden md:table-cell truncate max-w-[200px]">
                        {category.description || 'N/A'}
                      </td>
                      <td className="px-3 sm:px-4 py-3">
                        {category.parent_id ? categories.find((c) => c.id === category.parent_id)?.name || 'N/A' : 'None'}
                      </td>
                      <td className="px-3 sm:px-4 py-3 flex gap-2 items-center">
                        <button
                          className="text-blue-600 hover:text-blue-800 focus:outline-none"
                          data-tooltip-id={`edit-category-${category.id}`}
                          data-tooltip-content="Edit Category"
                          aria-label="Edit category"
                          // Add edit functionality if needed
                        >
                          <FaEdit />
                          <Tooltip id={`edit-category-${category.id}`} />
                        </button>
                        <button
                          className="text-red-600 hover:text-red-800 focus:outline-none"
                          onClick={() => handleDeleteCategory(category.id)}
                          data-tooltip-id={`delete-category-${category.id}`}
                          data-tooltip-content="Delete Category"
                          aria-label="Delete category"
                        >
                          <FaBan />
                          <Tooltip id={`delete-category-${category.id}`} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}