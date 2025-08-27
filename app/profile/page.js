"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import { FaUserEdit, FaHistory, FaMapMarkerAlt, FaHeadset, FaHeart, FaSignOutAlt, FaArrowLeft, FaTrashAlt, FaTimes } from "react-icons/fa";

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
  const [deleteType, setDeleteType] = useState(null); // 'order' or 'address'
  const avatarFileRef = useRef(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        setError("User not found. Please log in again.");
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
        setError("User not authenticated");
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
        setError(data.error || "Error fetching order history");
        setOrdersLoading(false);
        return;
      }

      setOrders(data.orders || []);
      setOrdersLoading(false);
    } catch (err) {
      setError("Unexpected error: " + err.message);
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
      setError("Error fetching addresses: " + err.message);
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
        .eq("user_id", user.id)
        .single();

      if (wishlistError) throw wishlistError;

      const productIds = wishlistData?.items || [];

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
      setError("Error fetching wishlist: " + err.message);
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
      setError("Error updating address: " + err.message);
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
      setError("Error deleting address: " + err.message);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        setError("User not authenticated");
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
        setError(data.error || "Error deleting order");
        return;
      }

      setOrders(orders.filter((order) => order.id !== orderId));
      setDeleteConfirmId(null);
      setDeleteType(null);
    } catch (err) {
      setError("Unexpected error: " + err.message);
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteType === 'order') {
      await handleDeleteOrder(deleteConfirmId);
    } else if (deleteType === 'address') {
      await handleDeleteAddress(deleteConfirmId);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onClose();
  };

  const handleEditToggle = () => {
    setEditMode(!editMode);
    setAvatarPreview(null);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (!user) return;

    let avatarUrl = user.user_metadata?.avatar_url;
    const file = avatarFileRef.current?.files?.[0];
    let avatarPath;

    if (file) {
      const fileExt = file.name.split(".").pop();
      avatarPath = `public/${user.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(avatarPath, file);

      if (uploadError) {
        setError("Error uploading avatar: " + uploadError.message);
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
          full_name: fullName,
          avatar_url: avatarUrl,
        },
        { onConflict: ["id"] }
      );

    if (upsertError) {
      setError("Error updating profile: " + upsertError.message);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        full_name: fullName,
        avatar_url: avatarUrl,
      },
    });

    if (updateError) {
      setError("Error updating auth metadata: " + updateError.message);
      return;
    }

    const { data: updatedUserData, error: userFetchError } = await supabase.auth.getUser();
    if (userFetchError || !updatedUserData?.user) {
      setError("Failed to refetch updated user: " + userFetchError?.message);
      return;
    }

    setUser(updatedUserData.user);
    setEditMode(false);
    setAvatarPreview(null);
  };

  const handleOrderHistoryClick = () => {
    setShowOrderHistory(true);
    setShowAddresses(false);
    setShowWishlist(false);
    fetchOrders();
  };

  const handleAddressesClick = () => {
    setShowAddresses(true);
    setShowOrderHistory(false);
    setShowWishlist(false);
    fetchAddresses();
  };

  const handleWishlistClick = () => {
    setShowWishlist(true);
    setShowOrderHistory(false);
    setShowAddresses(false);
    fetchWishlist();
  };

  if (loading || !user) return null;

  return (
    <div className="fixed top-0 right-0 w-full mt-18 sm:w-96 md:w-[420px] lg:w-[450px] bg-gradient-to-b from-gray-900 to-black text-white h-full shadow-2xl z-50 overflow-y-auto transition-all duration-300 font-sans rounded-l-3xl">
      {/* Close button for all views */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-white text-2xl bg-gray-800/80 rounded-full w-12 h-12 flex items-center justify-center hover:bg-red-500/90 transition-all duration-300 shadow-lg hover:shadow-xl backdrop-blur-md z-50"
        aria-label="Close profile sidebar"
        data-testid="close-button"
      >
        <FaTimes className="w-7 h-7" />
      </button>
      {showOrderHistory ? (
        <div className="p-6 flex flex-col min-h-full">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-white tracking-tight">Order History</h2>
            <button
              onClick={() => setShowOrderHistory(false)}
              className="flex items-center gap-2 text-gray-300 hover:text-white font-medium px-5 py-2 rounded-full bg-gray-800/50 hover:bg-gray-700/50 transition-all duration-300 backdrop-blur-sm"
            >
              <FaArrowLeft className="text-lg" />
              Back
            </button>
          </div>
          {error && (
            <p className="text-red-400 bg-red-900/20 p-4 rounded-xl mb-8 text-sm shadow-md">
              {error}
            </p>
          )}
          {ordersLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-12 w-12 border-t-3 border-b-3 border-blue-500"></div>
            </div>
          ) : orders.length === 0 ? (
            <p className="text-gray-400 text-center py-16 text-lg">No orders found.</p>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-gray-800/50 backdrop-blur-md rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 relative border border-gray-700/50"
                >
                  <div className="flex items-start gap-5">
                    {order.products?.image && (
                      <div className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-gray-600/50 shadow-sm">
                        <Image
                          src={normalizeImagePath(order.products.image)[0]}
                          alt={order.products.name || "Product"}
                          width={80}
                          height={80}
                          className="object-cover w-full h-full scale-105 transition-transform duration-300 hover:scale-110"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div className="pr-10">
                          <h3 className="text-xl font-semibold text-white line-clamp-1">
                            {order.products?.name || "Unknown Product"}
                          </h3>
                          <p className="text-sm text-gray-300 mt-1 line-clamp-2">
                            {order.products?.description || "No description available"}
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            Order ID: {order.id.slice(0, 8)}
                          </p>
                        </div>
                        <span
                          className={`px-4 py-1.5 rounded-full text-sm font-medium tracking-wide ${
                            order.status === "completed"
                              ? "bg-green-600/20 text-green-400 border border-green-500/30"
                              : order.status === "pending"
                              ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                              : "bg-red-600/20 text-red-400 border border-red-500/30"
                          }`}
                        >
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </div>
                      <div className="mt-5 grid grid-cols-2 gap-5 text-sm text-gray-200">
                        <div className="bg-gray-700/30 p-3 rounded-lg">
                          <span className="text-gray-400 font-medium block mb-1">Quantity</span>
                          {order.quantity}
                        </div>
                        <div className="bg-gray-700/30 p-3 rounded-lg">
                          <span className="text-gray-400 font-medium block mb-1">Total</span>
                          ₹{order.total_amount.toFixed(2)}
                        </div>
                        <div className="bg-gray-700/30 p-3 rounded-lg">
                          <span className="text-gray-400 font-medium block mb-1">Date</span>
                          {new Date(order.created_at).toLocaleDateString()}
                        </div>
                        <div className="bg-gray-700/30 p-3 rounded-lg">
                          <span className="text-gray-400 font-medium block mb-1">Payment ID</span>
                          {order.payment_id?.slice(0, 8) || "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setDeleteConfirmId(order.id);
                      setDeleteType('order');
                    }}
                    className="absolute top-4 right-4 text-red-400 hover:text-red-600 transition-all duration-200"
                    aria-label="Delete order"
                  >
                    <FaTrashAlt className="w-5 h-5" />
                  </button>
                  {deleteConfirmId === order.id && deleteType === 'order' && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-2xl backdrop-blur-sm">
                      <div className="bg-gray-800 p-6 rounded-xl text-center max-w-[90%] shadow-2xl border border-gray-700">
                        <p className="text-base text-gray-200 mb-6">Are you sure you want to delete this order?</p>
                        <div className="flex justify-center space-x-6">
                          <button
                            onClick={handleDeleteConfirm}
                            className="bg-red-600 px-6 py-3 rounded-lg hover:bg-red-700 text-sm font-medium transition-all duration-200 shadow-md"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => {
                              setDeleteConfirmId(null);
                              setDeleteType(null);
                            }}
                            className="bg-gray-700 px-6 py-3 rounded-lg hover:bg-gray-600 text-sm font-medium transition-all duration-200 shadow-md"
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
      ) : showAddresses ? (
        <div className="p-6 flex flex-col min-h-full">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-white tracking-tight">Saved Addresses</h2>
            <button
              onClick={() => setShowAddresses(false)}
              className="flex items-center gap-2 text-gray-300 hover:text-white font-medium px-5 py-2 rounded-full bg-gray-800/50 hover:bg-gray-700/50 transition-all duration-300 backdrop-blur-sm"
            >
              <FaArrowLeft className="text-lg" />
              Back
            </button>
          </div>
          {error && (
            <p className="text-red-400 bg-red-900/20 p-4 rounded-xl mb-8 text-sm shadow-md">
              {error}
            </p>
          )}
          {addressesLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-12 w-12 border-t-3 border-b-3 border-blue-500"></div>
            </div>
          ) : addresses.length === 0 ? (
            <p className="text-gray-400 text-center py-16 text-lg">No addresses saved.</p>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              {addresses.map((address) => (
                <div
                  key={address.id}
                  className="bg-gray-800/50 backdrop-blur-md rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 relative border border-gray-700/50"
                >
                  <div className="flex justify-between items-start">
                    <div className="pr-10">
                      <p className="text-xl font-semibold text-white line-clamp-2">
                        {address.full_address}
                      </p>
                      <p className="text-sm text-gray-300 mt-2">
                        Added: {new Date(address.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {address.is_last_used && (
                      <span className="px-4 py-1.5 rounded-full text-sm font-medium bg-green-600/20 text-green-400 border border-green-500/30">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="mt-5 flex justify-between items-center">
                    {!address.is_last_used && (
                      <button
                        onClick={() => handleSetLastUsed(address.id)}
                        className="text-blue-400 hover:text-blue-300 text-sm font-medium underline transition-all duration-200"
                      >
                        Set as Default
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setDeleteConfirmId(address.id);
                        setDeleteType('address');
                      }}
                      className="text-red-400 hover:text-red-600 text-sm font-medium transition-all duration-200 flex items-center gap-2"
                      aria-label="Delete address"
                    >
                      <FaTrashAlt className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                  {deleteConfirmId === address.id && deleteType === 'address' && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-2xl backdrop-blur-sm">
                      <div className="bg-gray-800 p-6 rounded-xl text-center max-w-[90%] shadow-2xl border border-gray-700">
                        <p className="text-base text-gray-200 mb-6">Are you sure you want to delete this address?</p>
                        <div className="flex justify-center space-x-6">
                          <button
                            onClick={handleDeleteConfirm}
                            className="bg-red-600 px-6 py-3 rounded-lg hover:bg-red-700 text-sm font-medium transition-all duration-200 shadow-md"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => {
                              setDeleteConfirmId(null);
                              setDeleteType(null);
                            }}
                            className="bg-gray-700 px-6 py-3 rounded-lg hover:bg-gray-600 text-sm font-medium transition-all duration-200 shadow-md"
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
      ) : showWishlist ? (
        <div className="p-6 flex flex-col min-h-full">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-white tracking-tight">Wishlist</h2>
            <button
              onClick={() => setShowWishlist(false)}
              className="flex items-center gap-2 text-gray-300 hover:text-white font-medium px-5 py-2 rounded-full bg-gray-800/50 hover:bg-gray-700/50 transition-all duration-300 backdrop-blur-sm"
            >
              <FaArrowLeft className="text-lg" />
              Back
            </button>
          </div>
          {error && (
            <p className="text-red-400 bg-red-900/20 p-4 rounded-xl mb-8 text-sm shadow-md">
              {error}
            </p>
          )}
          {wishlistLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-12 w-12 border-t-3 border-b-3 border-blue-500"></div>
            </div>
          ) : wishlist.length === 0 ? (
            <p className="text-gray-400 text-center py-16 text-lg">No items in your wishlist.</p>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              {wishlist.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-800/50 backdrop-blur-md rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 relative border border-gray-700/50"
                >
                  <div className="flex items-start gap-5">
                    {item.image && item.image.length > 0 && (
                      <div className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-gray-600/50 shadow-sm">
                        <Image
                          src={normalizeImagePath(item.image)[0]}
                          alt={item.name || "Product"}
                          width={80}
                          height={80}
                          className="object-cover w-full h-full scale-105 transition-transform duration-300 hover:scale-110"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white line-clamp-1">
                        {item.name || "Unknown Product"}
                      </h3>
                      <p className="text-sm text-gray-300 mt-1 line-clamp-2">
                        {item.description || "No description available"}
                      </p>
                      {item.price && (
                        <p className="text-sm text-gray-200 mt-2">
                          Price: ₹{item.price.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-col items-center py-8 px-6 bg-gradient-to-b from-gray-900 to-black relative">
            <div className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-blue-500 shadow-xl">
              {avatarPreview ? (
                <Image
                  src={avatarPreview}
                  alt="Preview"
                  fill
                  className="object-cover scale-105"
                />
              ) : user.user_metadata?.avatar_url ? (
                <Image
                  src={user.user_metadata.avatar_url}
                  alt="Profile"
                  fill
                  className="object-cover scale-105"
                />
              ) : (
                <div className="w-full h-full bg-blue-600 flex items-center justify-center text-4xl text-white font-bold">
                  {user.user_metadata?.full_name?.[0].toUpperCase() || "?"}
                </div>
              )}
            </div>

            {editMode ? (
              <div className="w-full max-w-sm mt-6">
                <input
                  type="file"
                  accept="image/*"
                  ref={avatarFileRef}
                  onChange={handleAvatarChange}
                  className="mt-2 text-sm text-gray-200 w-full bg-gray-800 rounded-xl p-3 border border-gray-700 focus:border-blue-500 transition-all duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-4 w-full px-4 py-3 rounded-xl bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:outline-none transition-all duration-200"
                  placeholder="Enter full name"
                />
                <div className="flex justify-center space-x-6 mt-6">
                  <button
                    onClick={handleSave}
                    className="bg-blue-600 px-6 py-3 rounded-xl hover:bg-blue-700 text-sm font-medium transition-all duration-200 shadow-md"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditMode(false);
                      setAvatarPreview(null);
                    }}
                    className="bg-gray-700 px-6 py-3 rounded-xl hover:bg-gray-600 text-sm font-medium transition-all duration-200 shadow-md"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center mt-6">
                <p className="font-bold text-xl text-white">
                  {user.user_metadata?.full_name || "No Name"}
                </p>
                <p className="text-sm text-gray-400 mt-2">{user.email}</p>
                <button
                  onClick={handleEditToggle}
                  className="mt-4 text-sm text-blue-400 hover:text-blue-300 underline transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <FaUserEdit className="text-lg" />
                  Edit Profile
                </button>
              </div>
            )}
          </div>

          <div className="space-y-1 px-6 pb-8">
            {[
              {
                label: "Order History",
                icon: <FaHistory />,
                onClick: handleOrderHistoryClick,
              },
              {
                label: "Saved Addresses",
                icon: <FaMapMarkerAlt />,
                onClick: handleAddressesClick,
              },
              {
                label: "Wishlist",
                icon: <FaHeart />,
                onClick: handleWishlistClick,
              },
              { label: "Customer Support", icon: <FaHeadset /> },
            ].map((item) => (
              <div
                key={item.label}
                onClick={item.onClick}
                className="flex items-center space-x-4 py-4 cursor-pointer text-gray-200 hover:text-white hover:bg-gray-800/50 rounded-xl transition-all duration-300 px-4 backdrop-blur-sm"
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-base font-medium">{item.label}</span>
              </div>
            ))}

            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-4 mt-8 py-4 text-red-400 hover:text-red-500 hover:bg-gray-800/50 rounded-xl transition-all duration-300 px-4 backdrop-blur-sm"
            >
              <FaSignOutAlt className="text-xl" />
              <span className="text-base font-medium">Logout</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}