
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Papa from 'papaparse';
import DashboardSection from '../../../components/DashboardSection';
import OrdersSection from '../../../components/OrdersSection';
import VendorSidebar from '../../../components/VendorSidebar';
import VendorProfile from '@/components/vendorProfile';

export default function VendorDashboard() {
  const [store, setStore] = useState(null);
  const [profile, setProfile] = useState(null); // Separate state for KYC profile
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [sidebarSection, setSidebarSection] = useState('Dashboard');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderCurrentPage, setOrderCurrentPage] = useState(1);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showManageImages, setShowManageImages] = useState(false);
  const productsPerPage = 10;
  const ordersPerPage = 10;

  const [uploadedImageMap, setUploadedImageMap] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('uploadedImageMap');
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  const normalizeImagePath = (path) => {
    if (!path) return '/default-vendor.png';
    return path.replace(/^(\.\.\/)+assets\//, '/');
  };

  const handleMultipleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      setError('');

      const uploadPromises = Array.from(files).map(async (file) => {
        const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
        const extension = file.name.split('.').pop().toLowerCase();
        if (!validExtensions.includes(extension)) {
          throw new Error(`Invalid file type for ${file.name}. Only ${validExtensions.join(', ')} are allowed.`);
        }

        const fileName = `public/${Date.now()}_${file.name}`;
        const { data, error } = await supabase.storage
          .from('images')
          .upload(fileName, file);

        if (error) {
          throw new Error(`Error uploading ${file.name}: ${error.message}`);
        }

        const { data: publicUrlData } = supabase.storage
          .from('images')
          .getPublicUrl(fileName);

        return {
          fileName: file.name,
          publicUrl: publicUrlData.publicUrl,
        };
      });

      const results = await Promise.allSettled(uploadPromises);

      const successfulUploads = results
        .filter((result) => result.status === 'fulfilled')
        .map((result) => result.value);

      const failedUploads = results
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason.message);

      const imageMap = {};
      successfulUploads.forEach(({ fileName, publicUrl }) => {
        imageMap[fileName] = publicUrl;
      });
      setUploadedImageMap((prev) => {
        const newMap = { ...prev, ...imageMap };
        if (typeof window !== 'undefined') {
          localStorage.setItem('uploadedImageMap', JSON.stringify(newMap));
        }
        return newMap;
      });

      if (failedUploads.length > 0) {
        setError(`Some uploads failed: ${failedUploads.join(', ')}`);
      }

      if (successfulUploads.length > 0) {
        alert(`Successfully uploaded ${successfulUploads.length} image(s)`);
      }
    } catch (err) {
      setError(`Upload error: ${err.message}`);
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          setError('User not found. Please log in again.');
          router.push('/vendor');
          return;
        }

        setUserName(user.user_metadata?.name || user.email.split('@')[0]);
        setUserEmail(user.email);

        const { data: stores, error: storeError } = await supabase
          .from('supermarkets')
          .select('id, name, main_image, vendor_id, created_at, location, gallery_images')
          .eq('vendor_id', user.id)
          .single();

        if (storeError) {
          setError('Error fetching store: ' + storeError.message);
          router.push('/vendor/create-store');
          return;
        }

        if (!stores) {
          setError('No store found. Please create a store.');
          router.push('/vendor/create-store');
          return;
        }

        setStore(stores);

        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('id, name, price, image, quantity, date_added, supermarket_id, description, categoryid, expiry_date')
          .eq('supermarket_id', stores.id)
          .order('date_added', { ascending: sortOrder === 'asc' });

        if (productsError) {
          setError('Error fetching products: ' + productsError.message);
          return;
        }

        const normalizedProducts = (productsData || []).map((product) => {
          let imageUrl = '';
          if (Array.isArray(product.image)) {
            imageUrl = product.image.length > 0 ? product.image[0] : '';
          } else if (typeof product.image === 'string') {
            imageUrl = product.image;
          }
          return {
            ...product,
            image: normalizeImagePath(imageUrl),
          };
        });

        setProducts(normalizedProducts);
        setFilteredProducts(normalizedProducts);
      } catch (err) {
        setError('Unexpected error: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, sortOrder]);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!store?.id) return;
      try {
        setOrdersLoading(true);
        setError('');

        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .eq('supermarket_id', store.id);
        if (productsError) {
          setError('Error fetching products: ' + productsError.message);
          setOrdersLoading(false);
          return;
        }

        const productIds = (productsData || []).map(p => p.id);
        if (productIds.length === 0) {
          setOrders([]);
          setFilteredOrders([]);
          setOrdersLoading(false);
          return;
        }

        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .in('product_id', productIds)
          .order('created_at', { ascending: false });
        if (ordersError) {
          setError('Error fetching orders: ' + ordersError.message);
          setOrdersLoading(false);
          return;
        }

        const mergedOrders = (ordersData || []).map(order => {
          const product = productsData.find(p => p.id === order.product_id);
          let imageUrl = '';
          if (product && Array.isArray(product.image)) {
            imageUrl = product.image.length > 0 ? product.image[0] : '';
          } else if (product && typeof product.image === 'string') {
            imageUrl = product.image;
          }
          return {
            ...order,
            products: product ? { ...product, image: normalizeImagePath(imageUrl) } : {},
          };
        });

        setOrders(mergedOrders);
        setFilteredOrders(mergedOrders);
        setNotifications(
          mergedOrders.map(order => ({
            id: order.id,
            message: `New order #${order.id.slice(0, 8)}... for ${order.products?.name || 'Product'}`,
            date: order.created_at,
            read: false,
          }))
        );
      } catch (err) {
        setError('Unexpected error fetching orders: ' + (err.message || err.toString()));
      } finally {
        setOrdersLoading(false);
      }
    };
    fetchOrders();
  }, [store]);

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
    setCurrentPage(1);
  }, [searchQuery, filter, products]);

  useEffect(() => {
    if (!orderSearchQuery) {
      setFilteredOrders(orders);
      return;
    }
    const query = orderSearchQuery.toLowerCase();
    setFilteredOrders(
      orders.filter(order =>
        order.id.toLowerCase().includes(query) ||
        order.user_id.toLowerCase().includes(query) ||
        (order.products?.name?.toLowerCase().includes(query))
      )
    );
    setOrderCurrentPage(1);
  }, [orders, orderSearchQuery]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/vendor');
  };

  const handleEditInventory = () => {
    router.push('/vendor/add-inventory');
  };

  const handleSortByNewest = () => {
    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
  };

  const getStockStatus = (quantity) => {
    if (quantity === 0) return { text: 'Out of Stock', color: 'bg-red-100 text-red-600' };
    if (quantity <= 5) return { text: 'Low Stock', color: 'bg-yellow-100 text-yellow-600' };
    return { text: 'In Stock', color: 'bg-green-100 text-green-600' };
  };

  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + productsPerPage);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  const totalOrderPages = Math.ceil(filteredOrders.length / ordersPerPage);
  const orderStartIndex = (orderCurrentPage - 1) * ordersPerPage;
  const paginatedOrders = filteredOrders.slice(orderStartIndex, orderStartIndex + ordersPerPage);

  const handleOrderPageChange = (page) => {
    if (page >= 1 && page <= totalOrderPages) {
      setOrderCurrentPage(page);
    }
  };

  const orderPageNumbers = [];
  for (let i = 1; i <= totalOrderPages; i++) {
    orderPageNumbers.push(i);
  }

  const handleDeleteOrder = async (orderId) => {
    if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) {
        setError('Error deleting order: ' + error.message);
        return;
      }

      setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
      setFilteredOrders(prevFilteredOrders => prevFilteredOrders.filter(order => order.id !== orderId));
    } catch (err) {
      setError('Unexpected error deleting order: ' + err.message);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/vendor');
      }
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const section = params.get('section');
    if (section === 'inventory') {
      setSidebarSection('Inventory');
    }
  }, []);

  const getCategoryNameById = (id) => {
    const categories = [
      { id: 1, name: 'Electronics' },
      { id: 2, name: 'Breakfast' },
      { id: 101, name: 'Vegetables' },
      { id: 102, name: 'Tea, Coffee & more' },
      { id: 103, name: 'Fruits' },
      { id: 104, name: 'Munchies' },
      { id: 105, name: 'Cold Drinks & Juices' },
      { id: 106, name: 'Bakery & Biscuits' },
      { id: 107, name: 'Chicken & Fish' },
      { id: 108, name: 'Dry Fruits' },
      { id: 201, name: 'Makeup & Beauty' },
      { id: 202, name: 'Skin Care' },
      { id: 203, name: 'Baby Care' },
      { id: 204, name: 'Hair Care' },
      { id: 205, name: 'Pharma & Wellness' },
      { id: 206, name: 'Protein Powders' },
      { id: 301, name: 'Home Needs' },
      { id: 302, name: 'Kitchen & Dining' },
      { id: 303, name: 'Cleaning Essentials' },
      { id: 304, name: 'Pet Care' },
      { id: 305, name: 'Atta, Rice & Dal' },
      { id: 306, name: 'Bed & Mattresses' },
      { id: 401, name: 'Protein Supplements' },
      { id: 402, name: 'Workout Equipment' },
      { id: 403, name: 'Fitness Accessories' },
      { id: 404, name: 'Sports Nutrition' },
      { id: 501, name: "Men's Clothing" },
      { id: 502, name: "Women's Clothing" },
      { id: 503, name: "Kids' Clothing" },
      { id: 504, name: 'Sportswear' },
      { id: 601, name: 'Living Room' },
      { id: 602, name: 'Bedroom' },
      { id: 603, name: 'Office' },
      { id: 604, name: 'Outdoor' },
      { id: 701, name: 'Mobile Phones' },
      { id: 702, name: 'Laptops' },
      { id: 704, name: 'Audio' },
      { id: 801, name: 'Fiction' },
      { id: 802, name: 'Non-Fiction' },
      { id: 803, name: 'Movies' },
      { id: 804, name: 'Music' },
    ];
    const found = categories.find((c) => c.id === Number(id));
    return found ? found.name : '';
  };

  const getCategoryIdByName = (name) => {
    const categories = [
      { id: 1, name: 'Electronics' },
      { id: 2, name: 'Breakfast' },
      { id: 101, name: 'Vegetables' },
      { id: 102, name: 'Tea, Coffee & more' },
      { id: 103, name: 'Fruits' },
      { id: 104, name: 'Munchies' },
      { id: 105, name: 'Cold Drinks & Juices' },
      { id: 106, name: 'Bakery & Biscuits' },
      { id: 107, name: 'Chicken & Fish' },
      { id: 108, name: 'Dry Fruits' },
      { id: 201, name: 'Makeup & Beauty' },
      { id: 202, name: 'Skin Care' },
      { id: 203, name: 'Baby Care' },
      { id: 204, name: 'Hair Care' },
      { id: 205, name: 'Pharma & Wellness' },
      { id: 206, name: 'Protein Powders' },
      { id: 301, name: 'Home Needs' },
      { id: 302, name: 'Kitchen & Dining' },
      { id: 303, name: 'Cleaning Essentials' },
      { id: 304, name: 'Pet Care' },
      { id: 305, name: 'Atta, Rice & Dal' },
      { id: 306, name: 'Bed & Mattresses' },
      { id: 401, name: 'Protein Supplements' },
      { id: 402, name: 'Workout Equipment' },
      { id: 403, name: 'Fitness Accessories' },
      { id: 404, name: 'Sports Nutrition' },
      { id: 501, name: "Men's Clothing" },
      { id: 502, name: "Women's Clothing" },
      { id: 503, name: "Kids' Clothing" },
      { id: 504, name: 'Sportswear' },
      { id: 601, name: 'Living Room' },
      { id: 602, name: 'Bedroom' },
      { id: 603, name: 'Office' },
      { id: 604, name: 'Outdoor' },
      { id: 701, name: 'Mobile Phones' },
      { id: 702, name: 'Laptops' },
      { id: 704, name: 'Audio' },
      { id: 801, name: 'Fiction' },
      { id: 802, name: 'Non-Fiction' },
      { id: 803, name: 'Movies' },
      { id: 804, name: 'Music' },
    ];
    const found = categories.find((c) => c.name === name);
    return found ? found.id : 1;
  };

  const handleExportCSV = () => {
    if (!products || products.length === 0) return;
    const exportData = products.map((product) => ({
      name: product.name,
      price: product.price,
      description: product.description,
      quantity: product.quantity,
      category: getCategoryNameById(product.categoryid),
      supermarket_id: product.supermarket_id,
      date_added: product.date_added,
      image: Array.isArray(product.image) ? (product.image[0] || '') : (product.image || ''),
    }));
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file || !store) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const productsToInsert = results.data.map((row) => {
            let imageUrl = row.image || null;
            if (imageUrl && uploadedImageMap[imageUrl]) {
              imageUrl = uploadedImageMap[imageUrl];
            }
            return {
              name: row.name,
              price: parseFloat(row.price),
              description: row.description,
              quantity: parseInt(row.quantity),
              categoryid: getCategoryIdByName(row.category),
              supermarket_id: store.id,
              date_added: row.date_added || new Date().toISOString(),
              image: imageUrl ? [imageUrl] : [],
            };
          });
          const { error } = await supabase.from('products').insert(productsToInsert);
          if (error) {
            alert('Error importing products: ' + error.message);
          } else {
            alert('Products imported successfully!');
            window.location.reload();
          }
        } catch (err) {
          alert('Error: ' + err.message);
        }
      },
      error: (err) => {
        alert('CSV Parse Error: ' + err.message);
      },
    });
  };

  const [editSupermarketOpen, setEditSupermarketOpen] = useState(false);
  const [supermarketForm, setSupermarketForm] = useState({
    name: '',
    main_image: '',
    gallery_images: [],
  });
  const [editMainImageFile, setEditMainImageFile] = useState(null);
  const [editMainImagePreview, setEditMainImagePreview] = useState(null);
  const [editGalleryImages, setEditGalleryImages] = useState([]);
  const [supermarketLoading, setSupermarketLoading] = useState(false);

  useEffect(() => {
    if (store) {
      setSupermarketForm({
        name: store.name || '',
        main_image: store.main_image || '',
        gallery_images: Array.isArray(store.gallery_images) ? store.gallery_images : [],
      });
      setEditMainImagePreview(store.main_image || null);
      setEditMainImageFile(null);
      setEditGalleryImages(
        Array.isArray(store.gallery_images)
          ? store.gallery_images.map((url) => ({ url, isNew: false }))
          : []
      );
    }
  }, [store]);

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

  const generateFilePath = (folder, originalName) => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop().toLowerCase();
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${folder}/${timestamp}_${randomString}_${sanitizedName}`;
  };

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

  const handleEditMainImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const validationError = validateImage(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (editMainImagePreview) URL.revokeObjectURL(editMainImagePreview);
    setEditMainImageFile(file);
    setEditMainImagePreview(URL.createObjectURL(file));
    setError('');
  };

  const handleEditGalleryImagesUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + editGalleryImages.length > 3) {
      setError('Maximum 3 gallery images allowed.');
      return;
    }
    const newImages = [];
    for (const file of files) {
      const validationError = validateImage(file);
      if (validationError) {
        setError(`Gallery image "${file.name}": ${validationError}`);
        return;
      }
      const previewUrl = URL.createObjectURL(file);
      newImages.push({ url: previewUrl, file, isNew: true });
    }
    setEditGalleryImages([...editGalleryImages, ...newImages]);
    setError('');
  };

  const removeEditGalleryImage = (index) => {
    const img = editGalleryImages[index];
    if (img.isNew && img.url) URL.revokeObjectURL(img.url);
    setEditGalleryImages(editGalleryImages.filter((_, i) => i !== index));
  };

  const removeEditMainImage = () => {
    if (editMainImagePreview) URL.revokeObjectURL(editMainImagePreview);
    setEditMainImageFile(null);
    setEditMainImagePreview(store?.main_image || null);
  };

  const handleUpdateSupermarket = async () => {
    if (!store?.id) {
      setError('No store found. Please create a store first.');
      return;
    }
    setSupermarketLoading(true);
    setError('');
    try {
      let mainImageUrl = supermarketForm.main_image;
      if (editMainImageFile) {
        mainImageUrl = await uploadImage(editMainImageFile, 'main');
      }
      const galleryImageUrls = [];
      for (const img of editGalleryImages) {
        if (img.isNew && img.file) {
          const url = await uploadImage(img.file, 'gallery');
          galleryImageUrls.push(url);
        } else {
          galleryImageUrls.push(img.url);
        }
      }
      const { error: updateError } = await supabase
        .from('supermarkets')
        .update({
          name: supermarketForm.name,
          main_image: mainImageUrl,
          gallery_images: galleryImageUrls,
        })
        .eq('id', store.id);
      if (updateError) {
        setError('Error updating supermarket: ' + updateError.message);
        return;
      }
      setStore((prev) => ({
        ...prev,
        name: supermarketForm.name,
        main_image: mainImageUrl,
        gallery_images: galleryImageUrls,
      }));
      setEditSupermarketOpen(false);
      alert('Supermarket updated successfully!');
    } catch (err) {
      setError('Unexpected error: ' + err.message);
    } finally {
      setSupermarketLoading(false);
    }
  };

  const handleSupermarketFormChange = (e) => {
    const { name, value } = e.target;
    setSupermarketForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const ORDER_STATUS_OPTIONS = [
    'pending',
    'processing',
    'shipped',
    'completed',
    'returned',
    'cancelled',
  ];

  const handleOrderStatusChange = async (orderId, newStatus) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);
    if (!error) {
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: newStatus } : o));
      setFilteredOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: newStatus } : o));
    }
  };

  const handleReturnOrder = async (orderId) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'returned' })
      .eq('id', orderId);
    if (!error) {
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: 'returned' } : o));
      setFilteredOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: 'returned' } : o));
    }
  };

  const getNearExpiryProducts = (days = 7) => {
    const today = new Date();
    return products.filter(product => {
      if (!product.expiry_date) return false;
      const expiry = new Date(product.expiry_date);
      const diffTime = expiry - today;
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= days;
    });
  };

  const [dismissedNearExpiry, setDismissedNearExpiry] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dismissedNearExpiry');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [dismissedExpired, setDismissedExpired] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dismissedExpired');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const getExpiredProducts = () => {
    const today = new Date();
    return products.filter(product => {
      if (!product.expiry_date) return false;
      const expiry = new Date(product.expiry_date);
      return expiry < today;
    });
  };

  const handleDismissNearExpiry = (ids) => {
    setDismissedNearExpiry(prev => {
      const updated = [...prev, ...ids];
      if (typeof window !== 'undefined') {
        localStorage.setItem('dismissedNearExpiry', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const handleDismissExpired = (ids) => {
    setDismissedExpired(prev => {
      const updated = [...prev, ...ids];
      if (typeof window !== 'undefined') {
        localStorage.setItem('dismissedExpired', JSON.stringify(updated));
      }
      return updated;
    });
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      <VendorSidebar
        store={store}
        sidebarSection={sidebarSection}
        setSidebarSection={setSidebarSection}
        dropdownOpen={dropdownOpen}
        setDropdownOpen={setDropdownOpen}
        orderSearchQuery={orderSearchQuery}
        setOrderSearchQuery={setOrderSearchQuery}
        setEditSupermarketOpen={setEditSupermarketOpen}
      />
      <div className="flex-1 p-2 sm:p-4 md:p-8 overflow-x-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800">{sidebarSection}</h2>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <button
                className="relative"
                onClick={() => setShowNotifications((prev) => !prev)}
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white border rounded shadow-lg z-50 max-h-96 overflow-y-auto">
                  <div className="p-4 font-bold border-b">Notifications</div>
                  {notifications.length === 0 ? (
                    <div className="p-4 text-gray-500">No notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className={`p-4 border-b last:border-b-0 flex items-start justify-between rounded-lg transition-colors duration-200 ${!n.read ? 'bg-blue-50 font-semibold' : ''}`}>
                        <div>
                          <div className="font-medium">{n.message}</div>
                          <div className="text-xs text-gray-400">{new Date(n.date).toLocaleString()}</div>
                        </div>
                        <button
                          className={`ml-2 px-2 py-1 rounded text-xs ${n.read ? 'bg-gray-200 text-gray-600' : 'bg-blue-500 text-white'}`}
                          onClick={() => {
                            setNotifications(prev => prev.map(notif => notif.id === n.id ? { ...notif, read: !notif.read } : notif));
                          }}
                        >
                          {n.read ? 'Mark Unread' : 'Mark Read'}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <VendorProfile
              userName={userName}
              userEmail={userEmail}
              setUserName={setUserName}
              setProfile={setProfile}
              setError={setError}
            />
            <button onClick={handleSignOut} className="bg-green-500 text-white px-4 py-2 rounded-lg transition-colors duration-200 hover:bg-green-600">
              Sign Out
            </button>
          </div>
        </div>

        {editSupermarketOpen && (
          <div className="fixed top-0 right-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out translate-x-0">
            <div className="p-6 sm:p-8 h-full flex flex-col bg-gray-50">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-800">Edit Supermarket</h3>
                <button
                  onClick={() => setEditSupermarketOpen(false)}
                  className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {supermarketLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-gray-600">Loading...</p>
                </div>
              ) : error ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-red-500 text-sm">{error}</p>
                </div>
              ) : (
                <div className="flex-1 space-y-4 overflow-y-auto">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      name="name"
                      value={supermarketForm.name}
                      onChange={handleSupermarketFormChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="Enter supermarket name"
                      disabled={supermarketLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Main Image</label>
                    {editMainImagePreview ? (
                      <div className="relative mb-2">
                        <Image src={editMainImagePreview} alt="Main Image" width={80} height={80} className="rounded object-cover" unoptimized />
                        <button
                          type="button"
                          onClick={removeEditMainImage}
                          className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 text-xs"
                          disabled={supermarketLoading}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm mb-2">No main image uploaded</p>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleEditMainImageUpload}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      disabled={supermarketLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Gallery Images (up to 3)</label>
                    {editGalleryImages.length > 0 ? (
                      <div className="flex gap-2 mb-2 flex-wrap">
                        {editGalleryImages.map((img, idx) => (
                          <div key={idx} className="relative">
                            <Image src={img.url} alt={`Gallery ${idx + 1}`} width={60} height={60} className="rounded object-cover" unoptimized />
                            <button
                              type="button"
                              onClick={() => removeEditGalleryImage(idx)}
                              className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 text-xs"
                              disabled={supermarketLoading}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm mb-2">No gallery images uploaded</p>
                    )}
                    {editGalleryImages.length < 3 && (
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        multiple
                        onChange={handleEditGalleryImagesUpload}
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        disabled={supermarketLoading}
                      />
                    )}
                  </div>
                  <div className="flex space-x-4">
                    <button
                      onClick={handleUpdateSupermarket}
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 disabled:bg-blue-300 disabled:cursor-not-allowed"
                      disabled={supermarketLoading || !supermarketForm.name}
                    >
                      {supermarketLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={() => setEditSupermarketOpen(false)}
                      className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-all duration-200"
                      disabled={supermarketLoading}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {sidebarSection === 'Dashboard' && (
          <DashboardSection userName={userName} />
        )}

        {sidebarSection === 'Inventory' && (
          <>
            <div className="flex flex-wrap gap-2 mb-6 items-center bg-white p-4 rounded-lg shadow border border-blue-100">
              {['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'All'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg transition-colors duration-200 ${filter === f ? 'bg-blue-200 text-blue-800' : 'bg-white text-gray-700 hover:bg-gray-100'} border`}
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
              <button onClick={handleEditInventory} className="bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors duration-200 hover:bg-blue-600">
                Add Inventory
              </button>
              <button
                onClick={() => router.push('/vendor/edit-inventory')}
                className="bg-yellow-500 text-white px-4 py-2 rounded-lg transition-colors duration-200 hover:bg-yellow-600"
              >
                Edit Inventory
              </button>
              <button onClick={handleSortByNewest} className="bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors duration-200 hover:bg-blue-600">
                Sort by {sortOrder === 'desc' ? 'Oldest' : 'Newest'}
              </button>
              <button
                onClick={handleExportCSV}
                className="bg-green-500 text-white px-4 py-2 rounded-lg transition-colors duration-200 hover:bg-green-600"
                disabled={products.length === 0}
              >
                Export CSV
              </button>
              <label className="bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors duration-200 cursor-pointer hover:bg-blue-600">
                Import CSV
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImportCSV}
                  className="hidden"
                />
              </label>
              <label className={`bg-purple-500 text-white px-4 py-2 rounded-lg transition-colors duration-200 cursor-pointer hover:bg-purple-600 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {uploading ? 'Uploading...' : 'Upload Images'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,image/bmp,image/svg+xml"
                  onChange={handleMultipleImageUpload}
                  className="hidden"
                  multiple
                  disabled={uploading}
                />
              </label>
              <button
                onClick={() => setShowManageImages((prev) => !prev)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 hover:bg-purple-700"
              >
                {showManageImages ? 'Hide' : 'Manage'} Images
              </button>
            </div>

            {showManageImages && (
              <div className="mb-6 p-6 bg-white rounded-lg shadow border border-purple-200">
                <h3 className="text-xl font-bold mb-4 text-purple-700">Manage Uploaded Images</h3>
                {Object.keys(uploadedImageMap).length === 0 ? (
                  <div className="text-gray-500">No images uploaded yet.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(uploadedImageMap).map(([originalName, url]) => {
                      const usedInProducts = products.filter(p => (p.image === url || p.image?.endsWith(originalName)));
                      return (
                        <div key={originalName} className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col items-center shadow hover:shadow-lg transition-all">
                          <Image src={url} alt={originalName} width={100} height={100} className="rounded mb-2 object-contain border bg-white" unoptimized />
                          <div className="text-sm font-semibold text-gray-700 mb-1 break-all text-center">{originalName}</div>
                          <div className="text-xs text-gray-500 mb-2 break-all text-center">{url}</div>
                          <div className="mb-2 w-full">
                            <span className="font-medium text-blue-700">Used in:</span>
                            {usedInProducts.length === 0 ? (
                              <span className="ml-2 text-gray-400">No products</span>
                            ) : (
                              <ul className="list-disc ml-5 text-xs text-gray-700">
                                {usedInProducts.map(prod => (
                                  <li key={prod.id}>{prod.name} (ID: {prod.id})</li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <button
                            className="mt-2 bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600 w-full"
                            onClick={async () => {
                              if (!window.confirm('Delete this image from storage? Products using it will be set to default image.')) return;
                              const filePath = url.split('/').slice(-2).join('/');
                              const { error } = await supabase.storage.from('images').remove([filePath]);
                              if (error) {
                                alert('Failed to delete image: ' + error.message);
                                return;
                              }
                              for (const prod of usedInProducts) {
                                await supabase.from('products').update({ image: null }).eq('id', prod.id);
                              }
                              setUploadedImageMap(prev => {
                                const newMap = { ...prev };
                                delete newMap[originalName];
                                if (typeof window !== 'undefined') {
                                  localStorage.setItem('uploadedImageMap', JSON.stringify(newMap));
                                }
                                return newMap;
                              });
                              alert('Image deleted and products updated.');
                              window.location.reload();
                            }}
                          >
                            Delete Image
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {loading ? (
              <p>Loading...</p>
            ) : error ? (
              <p className="text-red-600">{error}</p>
            ) : filteredProducts.length === 0 ? (
              <p>No products found for the selected filter or search.</p>
            ) : (
              <div className="bg-white shadow-md rounded">
                <table className="w-full text-left min-w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="p-4">Product</th>
                      <th className="p-4">Date Added</th>
                      <th className="p-4">Expiry Date</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProducts.map((product) => {
                      const stockStatus = getStockStatus(product.quantity || 0);
                      return (
                        <tr key={product.id} className="border-b">
                          <td className="p-4 flex items-center space-x-2">
                            {product.image ? (
                              <Image
                                src={
                                  product.image.startsWith('http')
                                    ? product.image
                                    : product.image.startsWith('/')
                                      ? product.image
                                      : '/' + product.image.replace(/^(\.\.\/)+/, '')
                                }
                                alt={product.name}
                                width={40}
                                height={40}
                                className="w-10 h-10 rounded object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                                <span className="text-gray-400 text-xl">🛒</span>
                              </div>
                            )}
                            <span>{product.name}</span>
                          </td>
                          <td className="p-4">{new Date(product.date_added).toLocaleDateString()}</td>
                          <td className="p-4">{product.expiry_date ? new Date(product.expiry_date).toLocaleDateString() : 'N/A'}</td>
                          <td className="p-4">${product.price?.toFixed(2) || '0.00'}</td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-sm ${stockStatus.color}`}>
                              {stockStatus.text}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-center mt-4 space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-lg transition-colors duration-200 ${currentPage === 1 ? 'bg-gray-300 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300'}`}
              >
                Previous
              </button>
              {pageNumbers.map((number) => (
                <button
                  key={number}
                  onClick={() => handlePageChange(number)}
                  className={`px-4 py-2 rounded-lg transition-colors duration-200 ${currentPage === number ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                >
                  {number}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 rounded-lg transition-colors duration-200 ${currentPage === totalPages ? 'bg-gray-300 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300'}`}
              >
                Next
              </button>
            </div>
            {sidebarSection === 'Inventory' && (() => {
              const nearExpiry = getNearExpiryProducts().filter(p => !dismissedNearExpiry.includes(p.id));
              const expired = getExpiredProducts().filter(p => !dismissedExpired.includes(p.id));
              return (
                <>
                  {expired.length > 0 && (
                    <div className="mb-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-800 rounded flex items-start justify-between">
                      <div>
                        <strong>Alert:</strong> The following products have expired:
                        <ul className="list-disc ml-6">
                          {expired.map(product => (
                            <li key={product.id}>
                              <span className="font-semibold">{product.name}</span> (expired on {new Date(product.expiry_date).toLocaleDateString()})
                            </li>
                          ))}
                        </ul>
                      </div>
                      <button
                        className="ml-4 bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                        onClick={() => handleDismissExpired(expired.map(p => p.id))}
                      >
                        Close
                      </button>
                    </div>
                  )}
                  {nearExpiry.length > 0 && (
                    <div className="mb-4 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 rounded flex items-start justify-between">
                      <div>
                        <strong>Alert:</strong> The following products are expiring soon:
                        <ul className="list-disc ml-6">
                          {nearExpiry.map(product => (
                            <li key={product.id}>
                              <span className="font-semibold">{product.name}</span> (expires on {new Date(product.expiry_date).toLocaleDateString()})
                            </li>
                          ))}
                        </ul>
                      </div>
                      <button
                        className="ml-4 bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                        onClick={() => handleDismissNearExpiry(nearExpiry.map(p => p.id))}
                      >
                        Close
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </>
        )}

        {sidebarSection === 'Orders' && (
          <OrdersSection
            filteredOrders={filteredOrders}
            ordersLoading={ordersLoading}
            error={error}
            orderPageNumbers={orderPageNumbers}
            orderCurrentPage={orderCurrentPage}
            handleOrderPageChange={handleOrderPageChange}
            paginatedOrders={paginatedOrders}
            handleOrderStatusChange={handleOrderStatusChange}
            ORDER_STATUS_OPTIONS={ORDER_STATUS_OPTIONS}
            handleDeleteOrder={handleDeleteOrder}
            handleReturnOrder={handleReturnOrder}
          />
        )}
      </div>
    </div>
  );
}
