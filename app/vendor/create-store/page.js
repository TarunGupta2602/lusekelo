
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function CreateStore() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    main_image: '',
    gallery_images: [],
  });
  const [mainImageFile, setMainImageFile] = useState(null);
  const [mainImagePreview, setMainImagePreview] = useState(null);
  const [galleryImages, setGalleryImages] = useState([]); // [{ url, file, isNew }]
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        toast.error('User not found. Please log in again.');
        router.push('/vendor');
        return;
      }
      setUser(user);
    };
    checkAuth();
  }, [router]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (mainImagePreview) URL.revokeObjectURL(mainImagePreview);
      galleryImages.forEach((img) => {
        if (img.isNew && img.url) URL.revokeObjectURL(img.url);
      });
    };
  }, [mainImagePreview, galleryImages]);

  // Image validation
  const validateImage = (file) => {
    const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    const extension = file.name.split('.').pop().toLowerCase();
    if (!validExtensions.includes(extension)) {
      return `Image must be a JPG, JPEG, PNG, WEBP, or GIF file.`;
    }
    if (file.size > 5 * 1024 * 1024) {
      return 'Image must be less than 5MB.';
    }
    return null;
  };

  // Generate unique file path
  const generateFilePath = (folder, originalName) => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop().toLowerCase();
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${folder}/${timestamp}_${randomString}_${sanitizedName}`;
  };

  // Upload image to Supabase
  const uploadImage = async (file, folder) => {
    const filePath = generateFilePath(folder, file.name);
    const { data, error } = await supabase.storage
      .from('supermarket-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });
    if (error) throw new Error(`${folder} image upload failed: ${error.message}`);
    const { data: { publicUrl } } = supabase.storage
      .from('supermarket-images')
      .getPublicUrl(filePath);
    return publicUrl;
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle main image upload
  const handleMainImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const validationError = validateImage(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    if (mainImagePreview) URL.revokeObjectURL(mainImagePreview);
    setMainImageFile(file);
    setMainImagePreview(URL.createObjectURL(file));
    setError('');
  };

  // Handle gallery images upload
  const handleGalleryImagesUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + galleryImages.length > 3) {
      toast.error('Maximum 3 gallery images allowed.');
      return;
    }
    const newImages = [];
    for (const file of files) {
      const validationError = validateImage(file);
      if (validationError) {
        toast.error(`Gallery image "${file.name}": ${validationError}`);
        return;
      }
      const previewUrl = URL.createObjectURL(file);
      newImages.push({ url: previewUrl, file, isNew: true });
    }
    setGalleryImages([...galleryImages, ...newImages]);
    setError('');
  };

  // Remove main image
  const removeMainImage = () => {
    if (mainImagePreview) URL.revokeObjectURL(mainImagePreview);
    setMainImageFile(null);
    setMainImagePreview(null);
    setFormData((prev) => ({ ...prev, main_image: '' }));
  };

  // Remove gallery image
  const removeGalleryImage = (index) => {
    const img = galleryImages[index];
    if (img.isNew && img.url) URL.revokeObjectURL(img.url);
    setGalleryImages(galleryImages.filter((_, i) => i !== index));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);

      // Validate required fields
      if (!formData.name || !formData.location) {
        toast.error('Please fill in all required fields.');
        setLoading(false);
        return;
      }

      // Upload main image if provided
      let mainImageUrl = formData.main_image;
      if (mainImageFile) {
        mainImageUrl = await uploadImage(mainImageFile, 'main');
      }

      // Upload gallery images if provided
      const galleryImageUrls = [];
      for (const img of galleryImages) {
        if (img.isNew && img.file) {
          const url = await uploadImage(img.file, 'gallery');
          galleryImageUrls.push(url);
        } else {
          galleryImageUrls.push(img.url);
        }
      }

      // Insert store into Supabase
      const { error: insertError } = await supabase
        .from('supermarkets')
        .insert({
          name: formData.name,
          location: formData.location,
          main_image: mainImageUrl || null,
          gallery_images: galleryImageUrls,
          vendor_id: user.id,
          created_at: new Date().toISOString(),
        });

      if (insertError) {
        toast.error('Error creating store: ' + insertError.message);
        setLoading(false);
        return;
      }

      toast.success('Store created successfully!');
      router.push('/vendor/dashboard');
    } catch (err) {
      toast.error('Unexpected error: ' + err.message);
      setLoading(false);
    }
  };

  if (!user) return <div className="flex items-center justify-center min-h-screen"><p>Loading...</p></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 md:p-8 transform transition-all duration-300 hover:shadow-2xl">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">Create Your Store</h2>
        {error && <p className="text-red-500 text-center mb-4 animate-pulse">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Store Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 text-gray-800 placeholder-gray-400"
              placeholder="Enter your store name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 text-gray-800 placeholder-gray-400"
              placeholder="Enter store location (e.g., city)"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Main Image</label>
            {mainImagePreview && (
              <div className="relative mb-3 w-24 h-24">
                <Image
                  src={mainImagePreview}
                  alt="Main Image Preview"
                  fill
                  className="rounded-lg object-cover shadow-md"
                  unoptimized
                />
                <button
                  type="button"
                  onClick={removeMainImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 text-xs shadow-md hover:bg-red-600 transition-colors duration-200"
                >
                  ✕
                </button>
              </div>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleMainImageUpload}
              className="w-full text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:font-semibold hover:file:bg-blue-100 transition-colors duration-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gallery Images (up to 3)</label>
            <div className="flex gap-3 mb-3 flex-wrap">
              {galleryImages.map((img, idx) => (
                <div key={idx} className="relative w-20 h-20">
                  <Image
                    src={img.url}
                    alt={`Gallery ${idx + 1}`}
                    fill
                    className="rounded-lg object-cover shadow-md"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() => removeGalleryImage(idx)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 text-xs shadow-md hover:bg-red-600 transition-colors duration-200"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            {galleryImages.length < 3 && (
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                onChange={handleGalleryImagesUpload}
                className="w-full text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:font-semibold hover:file:bg-blue-100 transition-colors duration-200"
              />
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 py-3 px-4 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Creating...' : 'Create Store'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/vendor')}
              className="flex-1 py-3 px-4 rounded-lg bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition-all duration-200 transform hover:scale-105"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} closeOnClick draggable pauseOnHover theme="colored" />
    </div>
  );
}