"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import Link from "next/link";
import { 
  FaUserEdit, 
  FaHistory, 
  FaMapMarkerAlt, 
  FaHeadset, 
  FaHeart, 
  FaSignOutAlt, 
  FaArrowLeft, 
  FaTrashAlt, 
  FaTimes,
  FaCheck,
  FaUser,
  FaCamera,
  FaShoppingBag,
  FaCreditCard,
  FaShieldAlt
} from "react-icons/fa";

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

export function ProfileSidebar({ onClose }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [fullName, setFullName] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [wishlist, setWishlist] = useState([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [showAddresses, setShowAddresses] = useState(false);
  const [showWishlist, setShowWishlist] = useState(false);
  const [error, setError] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteType, setDeleteType] = useState(null);
  const [cancelConfirmId, setCancelConfirmId] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const avatarFileRef = useRef(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        setError("Authentication required. Please sign in to continue.");
        setLoading(false);
        return;
      }
      setUser(user);
      setFullName(user.user_metadata?.full_name || "");
      setLoading(false);
    };

    fetchUser();
  }, []);

  const fetchOrders = async () => {
    if (!user) return;
    setOrdersLoading(true);
    setError("");

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        setError("Session expired. Please sign in again.");
        setOrdersLoading(false);
        return;
      }

      const response = await fetch("/api/orders", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to load order history");
        setOrdersLoading(false);
        return;
      }

      setOrders(data.orders || []);
      setOrdersLoading(false);
    } catch (err) {
      setError("Network error. Please check your connection.");
      setOrdersLoading(false);
    }
  };

  const fetchAddresses = async () => {
    if (!user) return;
    setAddressesLoading(true);
    setError("");

    try {
      const { data, error } = await supabase
        .from("addresses")
        .select("id, full_address, is_last_used, created_at")
        .eq("user_id", user.id)
        .order("is_last_used", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      setAddresses(data || []);
      setAddressesLoading(false);
    } catch (err) {
      setError("Unable to load addresses. Please try again.");
      setAddressesLoading(false);
    }
  };

  const fetchWishlist = async () => {
    if (!user) return;
    setWishlistLoading(true);
    setError("");

    try {
      const { data: wishlistData, error: wishlistError } = await supabase
        .from("wishlists")
        .select("items")
        .eq("user_id", user.id);

      if (wishlistError) throw wishlistError;

      const productIds = wishlistData?.[0]?.items || [];

      if (productIds.length === 0) {
        setWishlist([]);
        setWishlistLoading(false);
        return;
      }

      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("id, name, price, image, description")
        .in("id", productIds);

      if (productsError) throw productsError;

      setWishlist(productsData || []);
      setWishlistLoading(false);
    } catch (err) {
      setError("Unable to load wishlist. Please try again.");
      setWishlistLoading(false);
    }
  };

  const handleSetLastUsed = async (addressId) => {
    try {
      const { error: updateError } = await supabase
        .from("addresses")
        .update({ is_last_used: false })
        .eq("user_id", user.id);
      if (updateError) throw updateError;

      const { error: setError } = await supabase
        .from("addresses")
        .update({ is_last_used: true })
        .eq("id", addressId);
      if (setError) throw setError;

      fetchAddresses();
    } catch (err) {
      setError("Unable to update address. Please try again.");
    }
  };

  const handleDeleteAddress = async (addressId) => {
    try {
      const { error } = await supabase
        .from("addresses")
        .delete()
        .eq("id", addressId)
        .eq("user_id", user.id);
      if (error) throw error;

      setAddresses(addresses.filter((addr) => addr.id !== addressId));
      setDeleteConfirmId(null);
      setDeleteType(null);
    } catch (err) {
      setError("Unable to delete address. Please try again.");
    }
  };

  const handleDeleteOrder = async (orderId) => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        setError("Session expired. Please sign in again.");
        return;
      }

      const response = await fetch("/api/orders", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ orderId }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to delete order");
        return;
      }

      setOrders(orders.filter((order) => order.id !== orderId));
      setDeleteConfirmId(null);
      setDeleteType(null);
    } catch (err) {
      setError("Network error. Please try again.");
    }
  };

  const handleCancelOrder = async (orderId) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId)
        .eq('user_id', user.id);
      if (error) throw error;

      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, status: 'cancelled' } : order
        )
      );
      setCancelConfirmId(null);
    } catch (err) {
      setError("Unable to cancel order. Please try again.");
    }
  };

  const canCancelOrder = (status) => {
    return status === 'pending' || status === 'processing';
  };

  const handleDeleteConfirm = async () => {
    if (deleteType === 'order') {
      await handleDeleteOrder(deleteConfirmId);
    } else if (deleteType === 'address') {
      await handleDeleteAddress(deleteConfirmId);
    }
  };

  const handleCancelConfirm = async () => {
    await handleCancelOrder(cancelConfirmId);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onClose();
  };

  const handleEditToggle = () => {
    setEditMode(!editMode);
    setAvatarPreview(null);
    setError("");
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size must be less than 5MB");
        return;
      }
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!fullName.trim()) {
      setError("Please enter your full name");
      return;
    }

    setIsUpdating(true);
    setError("");

    let avatarUrl = user.user_metadata?.avatar_url;
    const file = avatarFileRef.current?.files?.[0];
    let avatarPath;

    try {
      if (file) {
        const fileExt = file.name.split(".").pop();
        avatarPath = `public/${user.id}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(avatarPath, file);

        if (uploadError) {
          setError("Failed to upload image. Please try again.");
          setIsUpdating(false);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(avatarPath);
        avatarUrl = publicUrlData.publicUrl;
      }

      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            full_name: fullName.trim(),
            avatar_url: avatarUrl,
          },
          { onConflict: ["id"] }
        );

      if (upsertError) {
        setError("Failed to update profile. Please try again.");
        setIsUpdating(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
          avatar_url: avatarUrl,
        },
      });

      if (updateError) {
        setError("Failed to update user data. Please try again.");
        setIsUpdating(false);
        return;
      }

      const { data: updatedUserData, error: userFetchError } = await supabase.auth.getUser();
      if (userFetchError || !updatedUserData?.user) {
        setError("Failed to refresh user data. Please reload the page.");
        setIsUpdating(false);
        return;
      }

      setUser(updatedUserData.user);
      setEditMode(false);
      setAvatarPreview(null);
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOrderHistoryClick = () => {
    setShowOrderHistory(true);
    setShowAddresses(false);
    setShowWishlist(false);
    setError("");
    fetchOrders();
  };

  const handleAddressesClick = () => {
    setShowAddresses(true);
    setShowOrderHistory(false);
    setShowWishlist(false);
    setError("");
    fetchAddresses();
  };

  const handleWishlistClick = () => {
    setShowWishlist(true);
    setShowOrderHistory(false);
    setShowAddresses(false);
    setError("");
    fetchWishlist();
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "pending":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "cancelled":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  if (loading || !user) {
    return (
      <div className="fixed top-0 right-0 mt-16 w-full sm:w-96 md:w-[420px] lg:w-[480px] bg-white text-gray-900 h-full shadow-2xl z-50 flex items-center justify-center border-l border-gray-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-0 right-0 mt-16 w-full sm:w-96 md:w-[420px] lg:w-[480px] bg-white text-gray-900 h-full shadow-2xl z-50 overflow-hidden border-l border-gray-200">
      {/* Close button - Always visible */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-60 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-all duration-200 shadow-sm hover:shadow-md"
        aria-label="Close profile"
      >
        <FaTimes className="w-5 h-5" />
      </button>

      <div className="h-full overflow-y-auto">
        {showOrderHistory ? (
          <div className="min-h-full bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-5 sticky top-0 z-10">
              <div className="flex items-center justify-between pr-12">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Order History</h1>
                  <p className="text-sm text-gray-600 mt-1">Track and manage your orders</p>
                </div>
                <button
                  onClick={() => setShowOrderHistory(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm"
                >
                  <FaArrowLeft className="w-4 h-4" />
                  Back
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <FaShieldAlt className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {ordersLoading ? (
                <div className="flex justify-center items-center h-48">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent mx-auto mb-3"></div>
                    <p className="text-gray-600">Loading orders...</p>
                  </div>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-16">
                  <FaShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
                  <p className="text-gray-600">When you place your first order, it will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4 mb-14">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
                    >
                      <div className="p-6">
                        {/* Header with order info and status */}
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              Order #{order.id.slice(0, 8).toUpperCase()}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {new Date(order.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                              {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
                            </span>
                          </div>
                        </div>

                        {/* Product info */}
                        <div className="flex items-start gap-4 mb-4">
                          {order.products?.image && (
                            <div className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                              <Image
                                src={normalizeImagePath(order.products.image)[0]}
                                alt={order.products.name || "Product"}
                                width={80}
                                height={80}
                                className="object-cover w-full h-full"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 mb-1">
                              {order.products?.name || "Unknown Product"}
                            </h3>
                            <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                              {order.products?.description || "No description available"}
                            </p>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-gray-600">
                                Qty: <span className="font-medium text-gray-900">{order.quantity}</span>
                              </span>
                              <span className="text-gray-600">
                                Total: <span className="font-semibold text-gray-900">₹{order.total_amount?.toFixed(2)}</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Additional order details */}
                        <div className="bg-gray-50 rounded-lg p-3 mb-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Payment ID:</span>
                            <span className="font-mono text-gray-900">
                              {order.payment_id?.slice(0, 12).toUpperCase() || "N/A"}
                            </span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          
                          <div className="flex items-center gap-2">
                            {canCancelOrder(order.status) && (
                              <button
                                onClick={() => {
                                  setCancelConfirmId(order.id);
                                }}
                                className="text-red-600 hover:text-red-700 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-all duration-200 flex items-center gap-1.5"
                                aria-label="Cancel order"
                              >
                                <FaTimes className="w-3.5 h-3.5" />
                                Cancel Order
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setDeleteConfirmId(order.id);
                                setDeleteType('order');
                              }}
                              className="text-gray-500 hover:text-red-600 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-all duration-200 flex items-center gap-1.5"
                              aria-label="Delete order"
                            >
                              <FaTrashAlt className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>

                      {deleteConfirmId === order.id && deleteType === 'order' && (
                        <div className="absolute inset-0 bg-white/95 flex items-center justify-center backdrop-blur-sm">
                          <div className="bg-white p-6 rounded-xl shadow-xl border border-gray-200 max-w-sm mx-4">
                            <h4 className="font-semibold text-gray-900 mb-2">Delete Order</h4>
                            <p className="text-sm text-gray-600 mb-6">
                              Are you sure you want to delete this order? This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                              <button
                                onClick={handleDeleteConfirm}
                                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium text-sm transition-colors duration-200"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => {
                                  setDeleteConfirmId(null);
                                  setDeleteType(null);
                                }}
                                className="flex-1 bg-gray-100 text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-200 font-medium text-sm transition-colors duration-200"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {cancelConfirmId === order.id && (
                        <div className="absolute inset-0 bg-white/95 flex items-center justify-center backdrop-blur-sm">
                          <div className="bg-white p-6 rounded-xl shadow-xl border border-gray-200 max-w-sm mx-4">
                            <h4 className="font-semibold text-gray-900 mb-2">Cancel Order</h4>
                            <p className="text-sm text-gray-600 mb-6">
                              Are you sure you want to cancel this order? This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                              <button
                                onClick={handleCancelConfirm}
                                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium text-sm transition-colors duration-200"
                              >
                                Cancel Order
                              </button>
                              <button
                                onClick={() => {
                                  setCancelConfirmId(null);
                                }}
                                className="flex-1 bg-gray-100 text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-200 font-medium text-sm transition-colors duration-200"
                              >
                                No, Keep Order
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : showAddresses ? (
          <div className="min-h-full bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-5 sticky top-0 z-10">
              <div className="flex items-center justify-between pr-12">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Saved Addresses</h1>
                  <p className="text-sm text-gray-600 mt-1">Manage your delivery addresses</p>
                </div>
                <button
                  onClick={() => setShowAddresses(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm"
                >
                  <FaArrowLeft className="w-4 h-4" />
                  Back
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 mb-14">
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <FaShieldAlt className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {addressesLoading ? (
                <div className="flex justify-center items-center h-48">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent mx-auto mb-3"></div>
                    <p className="text-gray-600">Loading addresses...</p>
                  </div>
                </div>
              ) : addresses.length === 0 ? (
                <div className="text-center py-16">
                  <FaMapMarkerAlt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No addresses saved</h3>
                  <p className="text-gray-600">Add addresses during checkout for faster ordering.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {addresses.map((address) => (
                    <div
                      key={address.id}
                      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden"
                    >
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1 pr-8">
                            <p className="font-semibold text-gray-900 mb-2 leading-relaxed">
                              {address.full_address}
                            </p>
                            <p className="text-sm text-gray-600">
                              Added on {new Date(address.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                          {address.is_last_used && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <FaCheck className="w-3 h-3 mr-1" />
                              Default
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                          {!address.is_last_used && (
                            <button
                              onClick={() => handleSetLastUsed(address.id)}
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium hover:underline transition-colors duration-200"
                            >
                              Set as Default
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setDeleteConfirmId(address.id);
                              setDeleteType('address');
                            }}
                            className="flex items-center gap-2 text-red-600 hover:text-red-700 text-sm font-medium hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all duration-200"
                            aria-label="Delete address"
                          >
                            <FaTrashAlt className="w-3 h-3" />
                            Delete
                          </button>
                        </div>
                      </div>

                      {deleteConfirmId === address.id && deleteType === 'address' && (
                        <div className="absolute inset-0 bg-white/95 flex items-center justify-center backdrop-blur-sm">
                          <div className="bg-white p-6 rounded-xl shadow-xl border border-gray-200 max-w-sm mx-4">
                            <h4 className="font-semibold text-gray-900 mb-2">Delete Address</h4>
                            <p className="text-sm text-gray-600 mb-6">
                              Are you sure you want to delete this address? This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                              <button
                                onClick={handleDeleteConfirm}
                                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium text-sm transition-colors duration-200"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => {
                                  setDeleteConfirmId(null);
                                  setDeleteType(null);
                                }}
                                className="flex-1 bg-gray-100 text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-200 font-medium text-sm transition-colors duration-200"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : showWishlist ? (
          <div className="min-h-full bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-5 sticky top-0 z-10">
              <div className="flex items-center justify-between pr-12">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Wishlist</h1>
                  <p className="text-sm text-gray-600 mt-1">Items you want to buy later</p>
                </div>
                <button
                  onClick={() => setShowWishlist(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm"
                >
                  <FaArrowLeft className="w-4 h-4" />
                  Back
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <FaShieldAlt className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {wishlistLoading ? (
                <div className="flex justify-center items-center h-48">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent mx-auto mb-3"></div>
                    <p className="text-gray-600">Loading wishlist...</p>
                  </div>
                </div>
              ) : wishlist.length === 0 ? (
                <div className="text-center py-16">
                  <FaHeart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Your wishlist is empty</h3>
                  <p className="text-gray-600">Save items you love to buy them later.</p>
                </div>
              ) : (
                <div className="space-y-4 mb-14">
                  {wishlist.map((item) => (
                    <Link
                      href={`/products/${item.id}`}
                      key={item.id}
                      className="block bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 overflow-hidden group"
                    >
                      <div className="p-6">
                        <div className="flex items-start gap-4">
                          {item.image && item.image.length > 0 && (
                            <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                              <Image
                                src={normalizeImagePath(item.image)[0]}
                                alt={item.name || "Product"}
                                width={64}
                                height={64}
                                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors duration-200">
                              {item.name || "Unknown Product"}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {item.description || "No description available"}
                            </p>
                            {item.price && (
                              <div className="mt-3 flex items-center">
                                <span className="text-lg font-bold text-gray-900">₹{item.price.toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Profile Header */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-6 py-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-blue-600 opacity-90"></div>
              <div className="relative z-10">
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/20 shadow-xl bg-white/10 backdrop-blur-sm">
                      {avatarPreview ? (
                        <Image
                          src={avatarPreview}
                          alt="Preview"
                          fill
                          className="object-cover"
                        />
                      ) : user.user_metadata?.avatar_url ? (
                        <Image
                          src={user.user_metadata.avatar_url}
                          alt="Profile"
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-blue-500 flex items-center justify-center text-2xl text-white font-bold">
                          <FaUser className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                    {editMode && (
                      <button
                        onClick={() => avatarFileRef.current?.click()}
                        className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center text-blue-600 shadow-lg hover:bg-gray-50 transition-colors duration-200"
                        aria-label="Change avatar"
                      >
                        <FaCamera className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {editMode ? (
                    <div className="mt-6 w-full max-w-sm space-y-4">
                      <input
                        type="file"
                        accept="image/*"
                        ref={avatarFileRef}
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                      <div>
                        <label className="block text-sm font-medium text-white/90 mb-2">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full px-4 py-3 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-white/70 border border-white/20 focus:border-white/50 focus:outline-none transition-all duration-200"
                          placeholder="Enter your full name"
                        />
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={handleSave}
                          disabled={isUpdating || !fullName.trim()}
                          className="flex-1 bg-white text-blue-600 px-4 py-3 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm flex items-center justify-center gap-2"
                        >
                          {isUpdating ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                              Saving...
                            </>
                          ) : (
                            <>
                              <FaCheck className="w-4 h-4" />
                              Save Changes
                            </>
                          )}
                        </button>
                        <button
                          onClick={handleEditToggle}
                          disabled={isUpdating}
                          className="px-4 py-3 rounded-lg bg-white/10 backdrop-blur-sm text-white border border-white/20 hover:bg-white/20 disabled:opacity-50 transition-all duration-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center mt-6">
                      <h2 className="text-xl font-bold text-white">
                        {user.user_metadata?.full_name || "Welcome"}
                      </h2>
                      <p className="text-blue-100 text-sm mt-1">{user.email}</p>
                      <button
                        onClick={handleEditToggle}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm text-white text-sm font-medium rounded-lg border border-white/20 hover:bg-white/20 transition-all duration-200"
                      >
                        <FaUserEdit className="w-4 h-4" />
                        Edit Profile
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"></div>
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-10 -translate-x-10"></div>
            </div>

            {/* Error Display */}
            {error && !editMode && (
              <div className="mx-6 mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <FaShieldAlt className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Menu */}
            <div className="px-6 py-6">
              <div className="space-y-2">
                {[
                  {
                    label: "Order History",
                    icon: <FaHistory className="w-5 h-5" />,
                    onClick: handleOrderHistoryClick,
                    description: "View and track your orders"
                  },
                  {
                    label: "Saved Addresses",
                    icon: <FaMapMarkerAlt className="w-5 h-5" />,
                    onClick: handleAddressesClick,
                    description: "Manage delivery addresses"
                  },
                  {
                    label: "Wishlist",
                    icon: <FaHeart className="w-5 h-5" />,
                    onClick: handleWishlistClick,
                    description: "Items you want to buy later"
                  },
                  {
                    label: "Customer Support",
                    icon: <FaHeadset className="w-5 h-5" />,
                    onClick: () => {},
                    description: "Get help with your orders"
                  },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={item.onClick}
                    className="w-full flex items-center gap-4 p-4 text-left bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm transition-all duration-200 group"
                  >
                    <div className="text-gray-600 group-hover:text-blue-600 transition-colors duration-200">
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                        {item.label}
                      </h3>
                      <p className="text-sm text-gray-600">{item.description}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Account Actions */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-4 p-4 text-left text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 hover:border-red-300 transition-all duration-200 group"
                >
                  <FaSignOutAlt className="w-5 h-5" />
                  <div className="flex-1">
                    <h3 className="font-semibold">Sign Out</h3>
                    <p className="text-sm text-red-500">Sign out of your account</p>
                  </div>
                </button>
              </div>

              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                  <span>© 2024 Your Company</span>
                  <span>•</span>
                  <button className="hover:text-gray-700 transition-colors duration-200">
                    Privacy Policy
                  </button>
                  <span>•</span>
                  <button className="hover:text-gray-700 transition-colors duration-200">
                    Terms of Service
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}