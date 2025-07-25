'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';

export default function CreateStore() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    address: '',
    price: '',
    location: '',
  });
  const [mainImage, setMainImage] = useState(null);
  const [galleryImages, setGalleryImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mainImagePreview, setMainImagePreview] = useState(null);
  const [galleryImagePreviews, setGalleryImagePreviews] = useState([]);

  useEffect(() => {
    const checkStore = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setError('You must be logged in to create a store.');
        console.error('Auth error:', userError?.message);
        return;
      }
      console.log('Authenticated user:', user.id);
      const { data: stores, error: storeError } = await supabase
        .from('supermarkets')
        .select('id')
        .eq('vendor_id', user.id)
        .limit(1);
      if (storeError) {
        setError('Error checking existing stores: ' + storeError.message);
        console.error('Store check error:', storeError.message);
        return;
      }
      if (stores && stores.length > 0) {
        router.push('/vendor/dashboard');
      }
    };
    checkStore();

    // Cleanup image previews to prevent memory leaks
    return () => {
      if (mainImagePreview) URL.revokeObjectURL(mainImagePreview);
      galleryImagePreviews.forEach(preview => URL.revokeObjectURL(preview));
    };
  }, [router, mainImagePreview, galleryImagePreviews]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(''); // Clear error when user types
  };

  const validateImage = (file) => {
    const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    const extension = file.name.split('.').pop().toLowerCase();
    
    if (!validExtensions.includes(extension)) {
      return 'Image must be a JPG, JPEG, PNG, WEBP, or GIF file.';
    }
    if (file.size > 5 * 1024 * 1024) {
      return 'Image must be less than 5MB.';
    }
    return null;
  };

  const handleMainImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validationError = validateImage(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Clean up previous preview
    if (mainImagePreview) {
      URL.revokeObjectURL(mainImagePreview);
    }

    setMainImage(file);
    setMainImagePreview(URL.createObjectURL(file));
    setError('');
  };

  const handleGalleryImagesUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + galleryImages.length > 3) {
      setError('Maximum 3 gallery images allowed.');
      return;
    }

    const validFiles = [];
    for (const file of files) {
      const validationError = validateImage(file);
      if (validationError) {
        setError(`Gallery image "${file.name}": ${validationError}`);
        return;
      }
      validFiles.push(file);
    }

    setGalleryImages([...galleryImages, ...validFiles]);
    setGalleryImagePreviews([...galleryImagePreviews, ...validFiles.map(file => URL.createObjectURL(file))]);
    setError('');
  };

  const removeGalleryImage = (index) => {
    // Clean up preview URL
    URL.revokeObjectURL(galleryImagePreviews[index]);
    
    setGalleryImages(galleryImages.filter((_, i) => i !== index));
    setGalleryImagePreviews(galleryImagePreviews.filter((_, i) => i !== index));
  };

  const removeMainImage = () => {
    if (mainImagePreview) {
      URL.revokeObjectURL(mainImagePreview);
    }
    setMainImage(null);
    setMainImagePreview(null);
  };

  // Generate a unique file path that ensures proper folder structure
  const generateFilePath = (folder, originalName) => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop().toLowerCase();
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    // Ensure the path starts with the folder name (required by RLS policy)
    return `${folder}/${timestamp}_${randomString}_${sanitizedName}`;
  };

  const uploadImage = async (file, folder) => {
    const filePath = generateFilePath(folder, file.name);
    console.log(`Uploading ${folder} image to:`, filePath);

    const { data, error } = await supabase.storage
      .from('supermarket-images')
      .upload(filePath, file, { 
        cacheControl: '3600',
        upsert: false // Don't overwrite existing files
      });

    if (error) {
      console.error(`${folder} image upload error:`, error);
      throw new Error(`${folder} image upload failed: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('supermarket-images')
      .getPublicUrl(filePath);

    console.log(`${folder} image uploaded successfully:`, publicUrl);
    return publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validate required fields
      if (!form.name.trim()) {
        setError('Store name is required.');
        setLoading(false);
        return;
      }

      if (!form.address.trim()) {
        setError('Address is required.');
        setLoading(false);
        return;
      }

      if (!mainImage) {
        setError('Main image is required.');
        setLoading(false);
        return;
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setError('User not authenticated. Please log in again.');
        console.error('Auth error:', userError?.message);
        setLoading(false);
        return;
      }

      console.log('Submitting as user:', user.id);

      // Upload main image
      const mainImageUrl = await uploadImage(mainImage, 'main');

      // Upload gallery images
      const galleryImageUrls = [];
      for (const file of galleryImages) {
        const url = await uploadImage(file, 'gallery');
        galleryImageUrls.push(url);
      }

      // Prepare store data
      const storeData = {
        name: form.name.trim(),
        address: form.address.trim(),
        price: form.price ? parseFloat(form.price) : null,
        main_image: mainImageUrl,
        gallery_images: galleryImageUrls,
        vendor_id: user.id,
        created_at: new Date().toISOString(),
        location: form.location.trim() || null,
      };

      console.log('Inserting store with data:', storeData);

      // Insert into supermarkets table
      const { error: insertError } = await supabase
        .from('supermarkets')
        .insert([storeData]);

      if (insertError) {
        setError(`Error creating store: ${insertError.message}`);
        console.error('Store insert error:', insertError);
        setLoading(false);
        return;
      }

      setSuccess('Store created successfully! Redirecting...');
      
      // Clean up previews
      if (mainImagePreview) URL.revokeObjectURL(mainImagePreview);
      galleryImagePreviews.forEach(preview => URL.revokeObjectURL(preview));
      
      setTimeout(() => {
        router.push('/vendor/dashboard');
      }, 2000);

    } catch (err) {
      setError(`Unexpected error: ${err.message}`);
      console.error('Unexpected error:', err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Create Your Store</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">Set up your supermarket with all the essential details to start selling</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white shadow-2xl rounded-3xl overflow-hidden">
          <div className="px-8 py-10 sm:px-12">
            {/* Status Messages */}
            {error && (
              <div className="mb-8 p-4 bg-red-50 border-l-4 border-red-400 rounded-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-red-700 font-medium">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {success && (
              <div className="mb-8 p-4 bg-green-50 border-l-4 border-green-400 rounded-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-green-700 font-medium">{success}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Basic Info */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Store Information</h3>
                
                {/* Store Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Store Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="e.g., Fresh Mart Supermarket"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    required
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
                    placeholder="Enter complete store address"
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Average Price Range
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-500">₹</span>
                    <input
                      type="number"
                      name="price"
                      value={form.price}
                      onChange={handleChange}
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      placeholder="100"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Optional: Average price range for products</p>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location Coordinates
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="e.g., POINT(77.5946 12.9716)"
                  />
                  <p className="text-sm text-gray-500 mt-1">Optional: GPS coordinates for precise location</p>
                </div>
              </div>

              {/* Right Column - Images */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Store Images</h3>
                
                {/* Main Image */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Main Store Image <span className="text-red-500">*</span>
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-indigo-400 transition-colors">
                    {mainImagePreview ? (
                      <div className="relative">
                        <div className="relative w-full h-48 mb-4">
                          <Image
                            src={mainImagePreview}
                            alt="Main store image preview"
                            fill
                            className="object-cover rounded-lg"
                          />
                        </div>
                        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                          <span className="text-sm text-gray-600 truncate">{mainImage?.name}</span>
                          <button
                            type="button"
                            onClick={removeMainImage}
                            className="ml-2 text-red-500 hover:text-red-700 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div className="mt-4">
                          <label htmlFor="main-image" className="cursor-pointer">
                            <span className="mt-2 block text-sm font-medium text-gray-900">
                              Upload main store image
                            </span>
                            <span className="mt-1 block text-sm text-gray-500">
                              PNG, JPG, WEBP up to 5MB
                            </span>
                          </label>
                          <input
                            id="main-image"
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                            onChange={handleMainImageUpload}
                            className="hidden"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Gallery Images */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gallery Images (up to 3)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 hover:border-indigo-400 transition-colors">
                    {galleryImagePreviews.length > 0 && (
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {galleryImagePreviews.map((preview, index) => (
                          <div key={index} className="relative group">
                            <div className="relative w-full h-20">
                              <Image
                                src={preview}
                                alt={`Gallery image ${index + 1}`}
                                fill
                                className="object-cover rounded-lg"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeGalleryImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {galleryImages.length < 3 && (
                      <div className="text-center">
                        <svg className="mx-auto h-8 w-8 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div className="mt-2">
                          <label htmlFor="gallery-images" className="cursor-pointer">
                            <span className="block text-sm font-medium text-gray-900">
                              Add gallery images
                            </span>
                            <span className="block text-xs text-gray-500">
                              {3 - galleryImages.length} remaining
                            </span>
                          </label>
                          <input
                            id="gallery-images"
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                            multiple
                            onChange={handleGalleryImagesUpload}
                            className="hidden"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="px-8 py-6 bg-gray-50 sm:px-12">
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center items-center px-8 py-4 border border-transparent text-lg font-medium rounded-xl text-white transition-all duration-200 ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl'
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Store...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Store
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}