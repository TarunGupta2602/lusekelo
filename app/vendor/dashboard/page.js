'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Papa from 'papaparse';

export default function VendorDashboard() {
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
  const [store, setStore] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editUserName, setEditUserName] = useState('');
  const [editStoreName, setEditStoreName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [uploading, setUploading] = useState(false);
  
  // Orders state variables
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderCurrentPage, setOrderCurrentPage] = useState(1);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [filteredOrders, setFilteredOrders] = useState([]);
  // Notification state
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  
  const productsPerPage = 10;
  const ordersPerPage = 10;

  // Store mapping of uploaded image names to their generated URLs
  const [uploadedImageMap, setUploadedImageMap] = useState(() => {
    // Load from localStorage on component mount
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('uploadedImageMap');
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  const [showManageImages, setShowManageImages] = useState(false);

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
        // Validate file type
        const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
        const extension = file.name.split('.').pop().toLowerCase();
        if (!validExtensions.includes(extension)) {
          throw new Error(`Invalid file type for ${file.name}. Only ${validExtensions.join(', ')} are allowed.`);
        }

        // Generate unique file name
        const fileName = `public/${Date.now()}_${file.name}`;

        // Upload to Supabase storage
        const { data, error } = await supabase.storage
          .from('images')
          .upload(fileName, file);

        if (error) {
          throw new Error(`Error uploading ${file.name}: ${error.message}`);
        }

        // Get public URL
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

      // Build mapping of image name to URL
      const imageMap = {};
      successfulUploads.forEach(({ fileName, publicUrl }) => {
        imageMap[fileName] = publicUrl;
      });
      setUploadedImageMap((prev) => {
        const newMap = { ...prev, ...imageMap };
        // Save to localStorage
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
      e.target.value = null; // Reset input field
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
        setEditUserName(user.user_metadata?.name || user.email.split('@')[0]);

        const { data: stores, error: storeError } = await supabase
          .from('supermarkets')
          .select('id, name, main_image, vendor_id, created_at, location, gallery_images, address, price')
          .eq('vendor_id', user.id)
          .limit(1);

        if (storeError) {
          setError('Error fetching store: ' + storeError.message);
          setLoading(false);
          return;
        }
        if (!stores || stores.length === 0) {
          router.push('/vendor/create-store');
          setLoading(false);
          return;
        }
        const supermarket = stores[0];
        setStore(supermarket);
        setEditStoreName(supermarket.name);

        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('id, name, price, image, quantity, date_added, supermarket_id, description, categoryid')
          .eq('supermarket_id', supermarket.id)
          .order('date_added', { ascending: sortOrder === 'asc' });

        if (productsError) {
          setError('Error fetching products: ' + productsError.message);
          setLoading(false);
          return;
        }

        const normalizedProducts = (productsData || []).map((product) => ({
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
  }, [router, sortOrder]);

  // Fetch orders for the vendor's supermarket
  useEffect(() => {
    const fetchOrders = async () => {
      if (!store) return;
      
      try {
        setOrdersLoading(true);
        setError('');

        // First get all product IDs for this supermarket
        const { data: productIds, error: productError } = await supabase
          .from('products')
          .select('id')
          .eq('supermarket_id', store.id);

        if (productError) {
          setError('Error fetching products: ' + productError.message);
          setOrdersLoading(false);
          return;
        }

        if (!productIds || productIds.length === 0) {
          setOrders([]);
          setFilteredOrders([]); // Initialize filteredOrders
          setOrdersLoading(false);
          return;
        }

        const productIdList = productIds.map(p => p.id);

        // Fetch orders for these products with product details
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select(`
            id,
            user_id,
            product_id,
            quantity,
            total_amount,
            payment_id,
            status,
            created_at,
            vendor_decision,
            products!inner(
              id,
              name,
              price,
              image,
              description,
              supermarket_id
            )
          `)
          .in('product_id', productIdList)
          .order('created_at', { ascending: false });

        if (ordersError) {
          setError('Error fetching orders: ' + ordersError.message);
          setOrdersLoading(false);
          return;
        }

        const normalizedOrders = (ordersData || []).map((order) => ({
          ...order,
          products: {
            ...order.products,
            image: normalizeImagePath(order.products.image),
          },
        }));

        setOrders(normalizedOrders);
        setFilteredOrders(normalizedOrders); // Initialize filteredOrders
        // Generate notifications from orders
        setNotifications(
          normalizedOrders.map(order => ({
            id: order.id,
            message: `New order #${order.id.slice(0, 8)}... for ${order.products?.name || 'Product'}`,
            date: order.created_at,
            read: false,
          }))
        );
        setOrdersLoading(false);
      } catch (err) {
        setError('Unexpected error fetching orders: ' + err.message);
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

  // Filter orders based on search query
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
    setOrderCurrentPage(1); // Reset to first page on search
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

  // Orders pagination
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

  // Delete order functionality
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

      // Remove the order from local state
      setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
      setFilteredOrders(prevFilteredOrders => prevFilteredOrders.filter(order => order.id !== orderId)); // Update filteredOrders
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

  useEffect(() => {
    const checkStore = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        router.push('/vendor');
        return;
      }
      const { data: stores, error: storeError } = await supabase
        .from('supermarkets')
        .select('id, name, main_image')
        .eq('vendor_id', user.id)
        .limit(1);

      if (storeError) {
        setError('Error fetching store: ' + storeError.message);
        return;
      }
      if (!stores || stores.length === 0) {
        router.push('/vendor/create-store');
        return;
      }
      setStore(stores[0]);
    };
    checkStore();
  }, [router]);

  const handleProfileClick = () => {
    setIsProfileModalOpen(true);
    setIsEditing(false);
    setEditUserName(userName);
    setEditStoreName(store?.name || '');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleCloseModal = () => {
    setIsProfileModalOpen(false);
    setIsEditing(false);
    setError('');
  };

  const handleSaveProfile = async () => {
    try {
      setError('');

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setError('User not found.');
        return;
      }

      const updates = { name: editUserName };

      const { error: userUpdateError } = await supabase.auth.updateUser({
        data: updates,
        ...(newPassword && newPassword === confirmPassword ? { password: newPassword } : {}),
      });

      if (userUpdateError) {
        setError('Error updating profile: ' + userUpdateError.message);
        return;
      }

      if (newPassword && newPassword !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }

      const { error: storeUpdateError } = await supabase
        .from('supermarkets')
        .update({ name: editStoreName })
        .eq('id', store.id);

      if (storeUpdateError) {
        setError('Error updating store name: ' + storeUpdateError.message);
        return;
      }

      setUserName(editUserName);
      setStore({ ...store, name: editStoreName });
      setIsEditing(false);
      setIsProfileModalOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError('Unexpected error: ' + err.message);
    }
  };

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
      image: product.image,
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
          console.log('Uploaded Image Map:', uploadedImageMap); // Debug log
          
          const productsToInsert = results.data.map((row) => {
            // If image name matches uploaded image, use the generated URL
            let imageUrl = row.image || null;
            if (imageUrl && uploadedImageMap[imageUrl]) {
              imageUrl = uploadedImageMap[imageUrl];
              console.log(`Found mapping for ${row.image}: ${imageUrl}`); // Debug log
            } else if (imageUrl) {
              console.log(`No mapping found for ${row.image}`); // Debug log
            }
            return {
              name: row.name,
              price: parseFloat(row.price),
              description: row.description,
              quantity: parseInt(row.quantity),
              categoryid: getCategoryIdByName(row.category),
              supermarket_id: store.id,
              date_added: row.date_added || new Date().toISOString(),
              image: imageUrl,
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

  // Supermarket edit state
  const [editSupermarketOpen, setEditSupermarketOpen] = useState(false);
  const [supermarketForm, setSupermarketForm] = useState({
    name: '',
    address: '',
    price: '',
    main_image: '',
    gallery_images: [],
  });

  // Sync form state when store loads
  useEffect(() => {
    if (store) {
      setSupermarketForm({
        name: store.name || '',
        address: store.address || '',
        price: store.price || '',
        main_image: store.main_image || '',
        gallery_images: Array.isArray(store.gallery_images) ? store.gallery_images : [],
      });
    }
  }, [store]);

  const handleSupermarketFormChange = (e) => {
    const { name, value } = e.target;
    setSupermarketForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleGalleryImagesChange = (e) => {
    setSupermarketForm((prev) => ({
      ...prev,
      gallery_images: e.target.value.split(',').map((url) => url.trim()).filter(Boolean),
    }));
  };

  const handleUpdateSupermarket = async () => {
    setError('');
    try {
      const { error: updateError } = await supabase
        .from('supermarkets')
        .update({
          name: supermarketForm.name,
          address: supermarketForm.address,
          price: supermarketForm.price,
          main_image: supermarketForm.main_image,
          gallery_images: supermarketForm.gallery_images,
        })
        .eq('id', store.id);

      if (updateError) {
        setError('Error updating supermarket: ' + updateError.message);
        return;
      }
      setStore((prev) => ({
        ...prev,
        ...supermarketForm,
      }));
      setEditSupermarketOpen(false);
      alert('Supermarket updated successfully!');
    } catch (err) {
      setError('Unexpected error: ' + err.message);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      {/* Sidebar: collapses to a top bar or drawer on mobile */}
      <div className="w-full md:w-64 bg-white shadow-lg z-20 md:relative fixed md:static top-0 left-0 h-16 md:h-auto flex md:block items-center justify-between px-4 md:px-0 border-b md:border-b-0">
        {/* Hamburger for mobile */}
        <button className="md:hidden p-2" onClick={() => setDropdownOpen((prev) => !prev)}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        {/* Sidebar content: show/hide on mobile */}
        <div className={`absolute md:static top-16 left-0 w-full md:w-auto bg-white md:bg-transparent shadow-lg md:shadow-none transition-all duration-200 ${dropdownOpen ? 'block' : 'hidden'} md:block`}>
          <div className="p-4 border-b md:border-b-0">
            {store ? (
              // Make the supermarket info clickable to open the edit modal
              <button
                type="button"
                className="flex items-center space-x-3 w-full text-left focus:outline-none"
                onClick={() => setEditSupermarketOpen(true)}
                title="Edit Supermarket"
              >
                {store.main_image ? (
                  <Image
                    src={
                      store.main_image.startsWith('http')
                        ? store.main_image
                        : store.main_image.startsWith('/')
                          ? store.main_image
                          : '/' + store.main_image.replace(/^(\.\.\/)+/, '')
                    }
                    alt={store.name}
                    width={40}
                    height={40}
                    className="rounded-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-gray-400 text-xl">🏬</span>
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-blue-600">LOCO</h1>
                  <p className="text-sm text-pink-600 font-semibold">{store.name}</p>
                </div>
              </button>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-blue-600">LOCO</h1>
                <p className="text-sm text-pink-600 font-semibold">Loading...</p>
              </>
            )}
          </div>
          {/* Orders Search Bar */}
          <div className="p-4 border-b md:border-b-0">
            <input
              type="text"
              placeholder="Search Orders..."
              value={orderSearchQuery}
              onChange={e => setOrderSearchQuery(e.target.value)}
              className="border rounded px-3 py-2 w-full focus:ring-2 focus:ring-blue-400 focus:outline-none"
            />
          </div>
          <nav className="mt-4">
            <a
              href="#"
              className={`flex items-center px-4 py-2 rounded-lg transition-colors duration-200 ${
                sidebarSection === 'Dashboard' ? 'bg-blue-100 text-blue-800 font-semibold' : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => setSidebarSection('Dashboard')}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7 a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
              Dashboard
            </a>
            <div className="relative">
              <button
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex items-center w-full px-4 py-2 rounded-lg transition-colors duration-200 text-gray-600 hover:bg-gray-100 focus:outline-none"
                aria-haspopup="true"
                aria-expanded={dropdownOpen}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h18M3 9h18M3 15h18M3 21h18"></path>
                </svg>
                <span className="flex-1 text-left">Manage Bookings</span>
                <svg className={`w-4 h-4 ml-auto transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {dropdownOpen && (
                <div className="ml-8 mt-1 bg-white border rounded shadow absolute z-10 w-40">
                  <a
                    href="#"
                    className="flex items-center px-4 py-2 rounded-lg transition-colors duration-200 hover:bg-gray-100 text-gray-700"
                    onClick={() => setSidebarSection('Orders')}
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
                    </svg>
                    Orders
                  </a>
                  <a
                    href="#"
                    className="flex items-center px-4 py-2 rounded-lg transition-colors duration-200 hover:bg-gray-100 text-gray-700"
                    onClick={(e) => {
                      e.preventDefault();
                      setSidebarSection('Inventory');
                      setDropdownOpen(false);
                      router.push('/vendor/dashboard?section=inventory');
                    }}
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Inventory
                  </a>
                </div>
              )}
            </div>
          </nav>
        </div>
      </div>
      {/* Main content: responsive padding and scroll */}
      <div className="flex-1 p-2 sm:p-4 md:p-8 overflow-x-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800">{sidebarSection === 'Inventory' ? 'Inventory' : sidebarSection === 'Orders' ? 'Orders' : 'Dashboard'}</h2>
          <div className="flex items-center space-x-4">
            {/* Notification Bell Icon */}
            <div className="relative">
              <button
                className="relative"
                onClick={() => setShowNotifications((prev) => !prev)}
              >
                {/* Bell Icon */}
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {/* Badge for unread notifications (show count) */}
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>
              {/* Notification Dropdown */}
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
            <div className="flex items-center space-x-2 cursor-pointer hover:text-blue-600" onClick={handleProfileClick}>
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-gray-400 text-lg">👤</span>
              </div>
              <span className="text-gray-600">Welcome, {userName}</span>
            </div>
            <button onClick={handleSignOut} className="bg-green-500 text-white px-4 py-2 rounded rounded-lg transition-colors duration-200 hover:bg-green-600">
              Sign Out
            </button>
          </div>
        </div>

        {isProfileModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Vendor Profile</h3>
                <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {error && <p className="text-red-600 mb-4">{error}</p>}
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-700">Vendor Name</label>
                    <input
                      type="text"
                      value={editUserName}
                      onChange={(e) => setEditUserName(e.target.value)}
                      className="w-full px-4 py-2 border rounded"
                      placeholder="Enter your name"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700">Store Name</label>
                    <input
                      type="text"
                      value={editStoreName}
                      onChange={(e) => setEditStoreName(e.target.value)}
                      className="w-full px-4 py-2 border rounded"
                      placeholder="Enter store name"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-2 border rounded"
                      placeholder="Enter new password"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700">Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2 border rounded"
                      placeholder="Confirm new password"
                    />
                  </div>
                  <div className="flex space-x-4">
                    <button
                      onClick={handleSaveProfile}
                      className="w-full bg-blue-500 text-white px-4 py-2 rounded rounded-lg transition-colors duration-200 hover:bg-blue-600"
                      disabled={!editUserName || !editStoreName}
                    >
                      Save
                    </button>
                    <button onClick={() => setIsEditing(false)} className="w-full bg-gray-300 text-gray-700 px-4 py-2 rounded rounded-lg transition-colors duration-200 hover:bg-gray-400">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-gray-400 text-2xl">👤</span>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold">{userName}</h4>
                      <p className="text-gray-600">Email: {userEmail}</p>
                      <p className="text-gray-600">Store: {store?.name || 'N/A'}</p>
                    </div>
                  </div>
                  <button onClick={() => setIsEditing(true)} className="w-full bg-blue-500 text-white px-4 py-2 rounded rounded-lg transition-colors duration-200 hover:bg-blue-600">
                    Edit Profile
                  </button>
                  <button onClick={handleCloseModal} className="w-full bg-gray-300 text-gray-700 px-4 py-2 rounded rounded-lg transition-colors duration-200 hover:bg-gray-400">
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Supermarket Edit Modal */}
        {editSupermarketOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Edit Supermarket</h3>
                <button onClick={() => setEditSupermarketOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {error && <p className="text-red-600 mb-2">{error}</p>}
              <div className="mb-3">
                <label className="block text-gray-700">Name</label>
                <input
                  type="text"
                  name="name"
                  value={supermarketForm.name}
                  onChange={handleSupermarketFormChange}
                  className="w-full px-4 py-2 border rounded"
                />
              </div>
              <div className="mb-3">
                <label className="block text-gray-700">Address</label>
                <input
                  type="text"
                  name="address"
                  value={supermarketForm.address}
                  onChange={handleSupermarketFormChange}
                  className="w-full px-4 py-2 border rounded"
                />
              </div>
              <div className="mb-3">
                <label className="block text-gray-700">Price</label>
                <input
                  type="number"
                  name="price"
                  value={supermarketForm.price}
                  onChange={handleSupermarketFormChange}
                  className="w-full px-4 py-2 border rounded"
                />
              </div>
              <div className="mb-3">
                <label className="block text-gray-700">Main Image URL</label>
                <input
                  type="text"
                  name="main_image"
                  value={supermarketForm.main_image}
                  onChange={handleSupermarketFormChange}
                  className="w-full px-4 py-2 border rounded"
                />
              </div>
              <div className="mb-3">
                <label className="block text-gray-700">Gallery Images (comma separated URLs)</label>
                <input
                  type="text"
                  name="gallery_images"
                  value={supermarketForm.gallery_images.join(', ')}
                  onChange={handleGalleryImagesChange}
                  className="w-full px-4 py-2 border rounded"
                />
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  className="bg-green-500 text-white px-4 py-2 rounded-lg"
                  onClick={handleUpdateSupermarket}
                >
                  Save Changes
                </button>
                <button
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg"
                  onClick={() => setEditSupermarketOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {sidebarSection === 'Dashboard' && (
          <>
            <div className="mb-8">
              <input type="text" placeholder="Search..." className="border rounded px-3 py-1 mb-4 w-56" />
              <div className="text-xl font-semibold mb-1">Welcome back, {userName}</div>
              <div className="text-gray-500 mb-6">Track, manage and forecast your customers and orders.</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-white rounded-xl shadow p-6 flex flex-col justify-between">
                  <div className="text-gray-500">Total Revenue</div>
                  <div className="text-3xl font-bold">2,420</div>
                  <div className="text-green-500 text-sm mt-2">↑ 40% vs last month</div>
                </div>
                <div className="bg-white rounded-xl shadow p-6 flex flex-col justify-between">
                  <div className="text-gray-500">Total Product Sales</div>
                  <div className="text-3xl font-bold">316</div>
                  <div className="text-green-500 text-sm mt-2">↑ 20% vs last month</div>
                </div>
                <div className="bg-white rounded-xl shadow p-6 flex flex-col justify-between">
                  <div className="text-gray-500">Out for Delivery</div>
                  <div className="text-3xl font-bold">23</div>
                  <div className="text-green-500 text-sm mt-2">↑ 20%</div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow p-6 border-2 border-blue-400">
                  <div className="text-gray-500">Pending</div>
                  <div className="text-3xl font-bold">54</div>
                  <div className="text-red-500 text-sm mt-2">↓ 20%</div>
                </div>
                <div className="bg-white rounded-xl shadow p-6">
                  <div className="text-gray-500">Returned</div>
                  <div className="text-3xl font-bold">4</div>
                  <div className="text-red-500 text-sm mt-2">↓ 10%</div>
                </div>
                <div className="bg-white rounded-xl shadow p-6">
                  <div className="text-gray-500">Failed Delivery</div>
                  <div className="text-3xl font-bold">3</div>
                  <div className="text-red-500 text-sm mt-2">↓ 10%</div>
                </div>
                <div className="bg-white rounded-xl shadow p-6">
                  <div className="text-gray-500">Cancelled Orders</div>
                  <div className="text-3xl font-bold">16</div>
                  <div className="text-red-500 text-sm mt-2">↓ 30% vs last month</div>
                </div>
              </div>
              <div className="mb-2 font-semibold">Recent Notifications</div>
              <div className="space-y-2">
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center justify-between">
                  <div>
                    You just got a new order <span className="text-green-600 font-semibold">#123456</span>
                    <div className="text-xs text-gray-500">A new order has been placed.</div>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">×</button>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center justify-between">
                  <div>
                    Order <span className="text-red-600 font-semibold">#124235</span> has been Canceled
                    <div className="text-xs text-gray-500">An order has been canceled.</div>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">×</button>
                </div>
              </div>
            </div>
          </>
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
              <button onClick={handleEditInventory} className="bg-blue-500 text-white px-4 py-2 rounded rounded-lg transition-colors duration-200 hover:bg-blue-600">
                Add Inventory
              </button>
              <button
                onClick={() => router.push('/vendor/edit-inventory')}
                className="bg-yellow-500 text-white px-4 py-2 rounded rounded-lg transition-colors duration-200 hover:bg-yellow-600"
              >
                Edit Inventory
              </button>
              <button onClick={handleSortByNewest} className="bg-blue-500 text-white px-4 py-2 rounded rounded-lg transition-colors duration-200 hover:bg-blue-600">
                Sort by {sortOrder === 'desc' ? 'Oldest' : 'Newest'}
              </button>
              <button
                onClick={handleExportCSV}
                className="bg-green-500 text-white px-4 py-2 rounded rounded-lg transition-colors duration-200 hover:bg-green-600"
                disabled={products.length === 0}
              >
                Export CSV
              </button>
              <label className="bg-blue-500 text-white px-4 py-2 rounded rounded-lg transition-colors duration-200 cursor-pointer hover:bg-blue-600">
                Import CSV
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImportCSV}
                  className="hidden"
                />
              </label>
              <label className={`bg-purple-500 text-white px-4 py-2 rounded rounded-lg transition-colors duration-200 cursor-pointer hover:bg-purple-600 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
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
                className="bg-purple-600 text-white px-4 py-2 rounded rounded-lg transition-colors duration-200 hover:bg-purple-700"
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
                      // Find products using this image
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
                              // Delete from Supabase Storage
                              const filePath = url.split('/').slice(-2).join('/'); // e.g. public/12345_filename.jpg
                              const { error } = await supabase.storage.from('images').remove([filePath]);
                              if (error) {
                                alert('Failed to delete image: ' + error.message);
                                return;
                              }
                              // Update products using this image
                              for (const prod of usedInProducts) {
                                await supabase.from('products').update({ image: null }).eq('id', prod.id);
                              }
                              // Remove from uploadedImageMap
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
                className={`px-4 py-2 mb-8 rounded-lg transition-colors duration-200 ${currentPage === 1 ? 'bg-gray-300 cursor-not-allowed' : 'bg-gray-200'}`}
              >
                Previous
              </button>
              {pageNumbers.map((number) => (
                <button
                  key={number}
                  onClick={() => handlePageChange(number)}
                  className={`px-4 py-2 mb-8 rounded-lg transition-colors duration-200 ${currentPage === number ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                >
                  {number}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 mb-8 rounded-lg transition-colors duration-200 ${currentPage === totalPages ? 'bg-gray-300 cursor-not-allowed' : 'bg-gray-200'}`}
              >
                Next
              </button>
            </div>
          </>
        )}

        {sidebarSection === 'Orders' && (
          <>
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Orders ({filteredOrders.length})</h3>
            </div>
            {ordersLoading ? (
              <p>Loading orders...</p>
            ) : error ? (
              <p className="text-red-600">{error}</p>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-white rounded-xl shadow flex flex-col items-center justify-center min-h-[350px]">
                <h2 className="text-2xl font-bold text-blue-700 mb-2">No Orders Found</h2>
                <p className="text-gray-500 text-center max-w-xs mb-4">
                  There are currently no orders for your store.<br />
                  Once customers place orders, they will appear here.
                </p>
                <svg
                  className="w-16 h-16 text-gray-300 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 48 48"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect x="8" y="16" width="32" height="20" rx="2" strokeWidth="2" stroke="currentColor" fill="none" />
                  <path d="M16 16V12a8 8 0 0116 0v4" strokeWidth="2" stroke="currentColor" fill="none" />
                </svg>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow divide-y divide-gray-100">
                {paginatedOrders.map((order) => (
                  <div key={order.id} className="flex items-center px-6 py-4 gap-4 hover:bg-blue-50 transition-all">
                    {/* Product Image */}
                    {order.products.image ? (
                      <Image
                        src={order.products.image.startsWith('http') ? order.products.image : order.products.image.startsWith('/') ? order.products.image : '/' + order.products.image.replace(/^(\.\.+\/)+/, '')}
                        alt={order.products.name}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded object-cover border"
                        unoptimized
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-2xl">🛒</div>
                    )}
                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{order.products.name}</div>
                      <div className="text-gray-500 text-xs">Qty: <span className="font-semibold">{order.quantity}</span> &bull; Total: <span className="font-semibold">${order.total_amount?.toFixed(2) || '0.00'}</span></div>
                    </div>
                    {/* Statuses */}
                    <div className="flex flex-col items-start gap-1 min-w-[120px]">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${order.status === 'completed' ? 'bg-green-100 text-green-600' : order.status === 'pending' ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'}`}>{order.status}</span>
                      <span className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString()}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${order.vendor_decision === 'accepted' ? 'bg-green-100 text-green-600' : order.vendor_decision === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>{order.vendor_decision?.charAt(0).toUpperCase() + order.vendor_decision?.slice(1) || 'Pending'}</span>
                    </div>
                    {/* Actions */}
                    <div className="flex gap-2 ml-4">
                      {order.vendor_decision === 'pending' && (
                        <>
                          <button
                            className="bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600"
                            onClick={async () => {
                              const { error } = await supabase
                                .from('orders')
                                .update({ vendor_decision: 'accepted' })
                                .eq('id', order.id);
                              if (!error) {
                                setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, vendor_decision: 'accepted' } : o));
                                setFilteredOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, vendor_decision: 'accepted' } : o));
                              }
                            }}
                          >
                            Accept
                          </button>
                          <button
                            className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600"
                            onClick={async () => {
                              const { error } = await supabase
                                .from('orders')
                                .update({ vendor_decision: 'rejected' })
                                .eq('id', order.id);
                              if (!error) {
                                setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, vendor_decision: 'rejected' } : o));
                                setFilteredOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, vendor_decision: 'rejected' } : o));
                              }
                            }}
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {filteredOrders.length > 0 && (
              <div className="flex justify-center mt-8 space-x-2">
                <button
                  onClick={() => handleOrderPageChange(orderCurrentPage - 1)}
                  disabled={orderCurrentPage === 1}
                  className={`px-4 py-2 rounded-lg transition-colors duration-200 ${orderCurrentPage === 1 ? 'bg-gray-300 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300'}`}
                >
                  Previous
                </button>
                {orderPageNumbers.map((number) => (
                  <button
                    key={number}
                    onClick={() => handleOrderPageChange(number)}
                    className={`px-4 py-2 rounded-lg transition-colors duration-200 ${orderCurrentPage === number ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                  >
                    {number}
                  </button>
                ))}
                <button
                  onClick={() => handleOrderPageChange(orderCurrentPage + 1)}
                  disabled={orderCurrentPage === totalOrderPages}
                  className={`px-4 py-2 rounded-lg transition-colors duration-200 ${orderCurrentPage === totalOrderPages ? 'bg-gray-300 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300'}`}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}