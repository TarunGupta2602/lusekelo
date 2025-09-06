'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';

const SkeletonLoader = () => (
  <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-pulse">
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
      <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
      <div className="h-8 bg-gray-200 rounded w-full"></div>
    </div>
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
      <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
      <div className="h-8 bg-gray-200 rounded w-full"></div>
    </div>
  </div>
);

export default function CMSSection() {
  const [homepage, setHomepage] = useState(null);
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState({ homepage: true, blogs: true });
  const [errors, setErrors] = useState({ homepage: '', blogs: '', upload: '' });
  const [showModal, setShowModal] = useState(null); // 'homepage', 'blog', or null
  const [selectedItem, setSelectedItem] = useState(null);
  const [blogFilter, setBlogFilter] = useState('all'); // 'all', 'draft', 'published'
  const [imagePreview, setImagePreview] = useState(null); // For image preview

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Homepage
        setLoading(prev => ({ ...prev, homepage: true }));
        setErrors(prev => ({ ...prev, homepage: '' }));
        const { data: homepageData, error: homepageError } = await supabase
          .from('homepage')
          .select('*')
          .single();
        if (homepageError) {
          setErrors(prev => ({ ...prev, homepage: 'Failed to fetch homepage: ' + homepageError.message }));
          setHomepage(null);
        } else {
          setHomepage(homepageData);
        }
        setLoading(prev => ({ ...prev, homepage: false }));

        // Fetch Blogs
        setLoading(prev => ({ ...prev, blogs: true }));
        setErrors(prev => ({ ...prev, blogs: '' }));
        let blogQuery = supabase
          .from('blogs')
          .select('*')
          .order('updated_at', { ascending: false });
        if (blogFilter !== 'all') {
          blogQuery = blogQuery.eq('status', blogFilter);
        }
        const { data: blogsData, error: blogsError } = await blogQuery;
        if (blogsError) {
          setErrors(prev => ({ ...prev, blogs: 'Failed to fetch blogs: ' + blogsError.message }));
          setBlogs([]);
        } else {
          setBlogs(blogsData || []);
        }
        setLoading(prev => ({ ...prev, blogs: false }));
      } catch (err) {
        console.error('Unexpected error:', err);
        setErrors({
          homepage: 'Error loading homepage.',
          blogs: 'Error loading blogs.',
          upload: '',
        });
        setLoading({ homepage: false, blogs: false });
      }
    };

    fetchData();
  }, [blogFilter]);

  // Handle image upload to Supabase Storage
  const handleImageUpload = async (file) => {
    if (!file) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from('cms-images')
        .upload(fileName, file);

      if (error) {
        throw new Error('Image upload failed: ' + error.message);
      }

      const { data: urlData } = supabase.storage
        .from('cms-images')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (err) {
      setErrors(prev => ({ ...prev, upload: err.message }));
      return null;
    }
  };

  const handleSaveHomepage = async (data, file) => {
    try {
      let imageUrl = data.image_url || selectedItem.image_url;
      if (file) {
        imageUrl = await handleImageUpload(file);
        if (!imageUrl) throw new Error('Image upload failed');
      }

      const { error } = await supabase
        .from('homepage')
        .upsert({ ...data, image_url: imageUrl, updated_at: new Date().toISOString() });
      if (error) throw error;
      setHomepage({ ...data, image_url: imageUrl });
      setShowModal(null);
      setImagePreview(null);
      setErrors(prev => ({ ...prev, upload: '' }));
    } catch (err) {
      alert('Failed to save homepage: ' + err.message);
    }
  };

  const handleSaveBlog = async (data, file) => {
    try {
      let imageUrl = data.image_url || selectedItem.image_url;
      if (file) {
        imageUrl = await handleImageUpload(file);
        if (!imageUrl) throw new Error('Image upload failed');
      }

      const { error } = await supabase
        .from('blogs')
        .upsert({
          ...data,
          image_url: imageUrl,
          updated_at: new Date().toISOString(),
          published_at: data.status === 'published' ? (data.published_at || new Date().toISOString()) : null,
        });
      if (error) throw error;
      const { data: updatedBlogs } = await supabase
        .from('blogs')
        .select('*')
        .order('updated_at', { ascending: false });
      setBlogs(updatedBlogs || []);
      setShowModal(null);
      setImagePreview(null);
      setErrors(prev => ({ ...prev, upload: '' }));
    } catch (err) {
      alert('Failed to save blog: ' + err.message);
    }
  };

  const handleDeleteBlog = async (id) => {
    if (!confirm('Are you sure you want to delete this blog?')) return;
    try {
      const { error } = await supabase.from('blogs').delete().eq('id', id);
      if (error) throw error;
      setBlogs(blogs.filter(blog => blog.id !== id));
    } catch (err) {
      alert('Failed to delete blog: ' + err.message);
    }
  };

  // Handle image file selection for preview
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Homepage Section */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <div className="w-1.5 h-5 bg-blue-600 rounded-full"></div>
          Homepage Content
        </h3>
        {loading.homepage ? (
          <SkeletonLoader />
        ) : errors.homepage ? (
          <p className="text-red-600 text-sm">{errors.homepage}</p>
        ) : !homepage ? (
          <p className="text-gray-600 text-sm">No homepage content found.</p>
        ) : (
          <div>
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-sm font-medium text-gray-700">Title: {homepage.title}</h4>
                <p className="text-sm text-gray-600">Subtitle: {homepage.subtitle}</p>
                <p className="text-sm text-gray-600">Description: {homepage.description}</p>
                <p className="text-sm text-gray-600">Button: {homepage.button_text}</p>
                {homepage.image_url && (
                  <img src={homepage.image_url} alt="Hero" className="h-20 w-auto mt-2 rounded" />
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedItem(homepage);
                  setShowModal('homepage');
                  setImagePreview(homepage.image_url || null);
                }}
                className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
              >
                <FaEdit />
                Edit
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Blogs Section */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <div className="w-1.5 h-5 bg-blue-600 rounded-full"></div>
            Blogs
          </h3>
          <div className="flex gap-4">
            <select
              value={blogFilter}
              onChange={e => setBlogFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
            <button
              onClick={() => {
                setSelectedItem({
                  title: '',
                  slug: '',
                  content: '',
                  image_url: '',
                  status: 'draft',
                });
                setShowModal('blog');
                setImagePreview(null);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm flex items-center gap-2"
            >
              <FaPlus />
              Add Blog
            </button>
          </div>
        </div>
        {loading.blogs ? (
          <SkeletonLoader />
        ) : errors.blogs ? (
          <p className="text-red-600 text-sm">{errors.blogs}</p>
        ) : blogs.length === 0 ? (
          <p className="text-gray-600 text-sm">No blogs found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-600">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Published At</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {blogs.map(blog => (
                  <tr key={blog.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2">{blog.title}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          blog.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {blog.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {blog.published_at ? new Date(blog.published_at).toLocaleDateString('en-GB') : 'N/A'}
                    </td>
                    <td className="px-3 py-2 flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedItem(blog);
                          setShowModal('blog');
                          setImagePreview(blog.image_url || null);
                        }}
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <FaEdit />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteBlog(blog.id)}
                        className="text-red-600 hover:text-red-800 flex items-center gap-1"
                      >
                        <FaTrash />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Homepage Modal */}
      {showModal === 'homepage' && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Homepage</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const file = formData.get('image');
                handleSaveHomepage(
                  {
                    id: selectedItem.id,
                    title: formData.get('title'),
                    subtitle: formData.get('subtitle'),
                    description: formData.get('description'),
                    button_text: formData.get('button_text'),
                    image_url: selectedItem.image_url, // Preserve existing URL if no new file
                  },
                  file
                );
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <input
                    name="title"
                    defaultValue={selectedItem.title}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Subtitle</label>
                  <input
                    name="subtitle"
                    defaultValue={selectedItem.subtitle}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    name="description"
                    defaultValue={selectedItem.description}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    rows="4"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Button Text</label>
                  <input
                    name="button_text"
                    defaultValue={selectedItem.button_text}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Image</label>
                  <input
                    type="file"
                    name="image"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                  {imagePreview && (
                    <img src={imagePreview} alt="Preview" className="h-20 w-auto mt-2 rounded" />
                  )}
                  {errors.upload && (
                    <p className="text-red-600 text-sm mt-1">{errors.upload}</p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(null);
                    setImagePreview(null);
                    setErrors(prev => ({ ...prev, upload: '' }));
                  }}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Blog Modal */}
      {showModal === 'blog' && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {selectedItem.id ? 'Edit Blog' : 'Add Blog'}
            </h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const file = formData.get('image');
                handleSaveBlog(
                  {
                    id: selectedItem.id || undefined,
                    title: formData.get('title'),
                    slug: formData.get('slug'),
                    content: formData.get('content'),
                    image_url: selectedItem.image_url, // Preserve existing URL if no new file
                    status: formData.get('status'),
                  },
                  file
                );
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <input
                    name="title"
                    defaultValue={selectedItem.title}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Slug</label>
                  <input
                    name="slug"
                    defaultValue={selectedItem.slug}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Content</label>
                  <textarea
                    name="content"
                    defaultValue={selectedItem.content}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    rows="6"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Image</label>
                  <input
                    type="file"
                    name="image"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                  {imagePreview && (
                    <img src={imagePreview} alt="Preview" className="h-20 w-auto mt-2 rounded" />
                  )}
                  {errors.upload && (
                    <p className="text-red-600 text-sm mt-1">{errors.upload}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    name="status"
                    defaultValue={selectedItem.status}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    required
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(null);
                    setImagePreview(null);
                    setErrors(prev => ({ ...prev, upload: '' }));
                  }}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}