"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";

export function ProfileSidebar({ onClose }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [fullName, setFullName] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [error, setError] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
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
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          quantity,
          total_amount,
          payment_id,
          status,
          created_at,
          products!inner(
            name,
            description
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        setError("Error fetching order history: " + error.message);
        setOrdersLoading(false);
        return;
      }
      setOrders(data || []);
      setOrdersLoading(false);
    } catch (err) {
      setError("Unexpected error: " + err.message);
      setOrdersLoading(false);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    try {
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderId)
        .eq("user_id", user.id);

      if (error) {
        setError("Error deleting order: " + error.message);
        return;
      }

      setOrders(orders.filter((order) => order.id !== orderId));
      setDeleteConfirmId(null);
    } catch (err) {
      setError("Unexpected error: " + err.message);
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
    fetchOrders();
  };

  if (loading || !user) return null;

  return (
    <div className="fixed top-0 right-0 w-full mt-15 sm:w-80 md:w-96 lg:w-[400px] bg-gray-900 text-white h-full shadow-2xl z-50 overflow-y-auto transition-all duration-300 font-sans">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white text-xl bg-gray-700 rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 transition-all duration-200"
        aria-label="Close profile sidebar"
      >
        ×
      </button>

      {showOrderHistory ? (
        <div className="p-4 sm:p-6 flex flex-col min-h-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-white">Order History</h2>
            <button
              onClick={() => setShowOrderHistory(false)}
              className="text-gray-300 hover:text-white font-medium px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 transition-all duration-200"
            >
              Back
            </button>
          </div>
          {error && (
            <p className="text-red-400 bg-red-900/20 p-3 rounded-lg mb-6 text-sm">
              {error}
            </p>
          )}
          {ordersLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : orders.length === 0 ? (
            <p className="text-gray-400 text-center py-8 text-sm sm:text-base">No orders found.</p>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-gray-800 rounded-lg p-4 shadow-md hover:shadow-lg transition-all duration-200 relative"
                >
                  <div className="flex justify-between items-start">
                    <div className="pr-8">
                      <h3 className="text-base sm:text-lg font-semibold text-white">
                        {order.products?.name || "Unknown Product"}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-400 mt-1 line-clamp-2">
                        {order.products?.description || "No description available"}
                      </p>
                      <p className="text-xs text-gray-300 mt-1">
                        Order ID: {order.id.slice(0, 8)}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.status === "completed"
                          ? "bg-green-600 text-white"
                          : order.status === "pending"
                          ? "bg-yellow-500 text-gray-900"
                          : "bg-red-600 text-white"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:text-sm">
                    <div>
                      <span className="text-gray-400">Quantity:</span> {order.quantity}
                    </div>
                    <div>
                      <span className="text-gray-400">Total:</span> ₹{order.total_amount.toFixed(2)}
                    </div>
                    <div>
                      <span className="text-gray-400">Date:</span>{" "}
                      {new Date(order.created_at).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="text-gray-400">Payment ID:</span>{" "}
                      {order.payment_id?.slice(0, 8) || "N/A"}
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteConfirmId(order.id)}
                    className="absolute top-2 right-2 text-red-400 hover:text-red-600 transition-all duration-200"
                    aria-label="Delete order"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                  {deleteConfirmId === order.id && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-lg">
                      <div className="bg-gray-900 p-4 rounded-lg text-center max-w-[90%]">
                        <p className="text-sm mb-4">Are you sure you want to delete this order?</p>
                        <div className="flex justify-center space-x-4">
                          <button
                            onClick={() => handleDeleteOrder(order.id)}
                            className="bg-red-600 px-4 py-2 rounded hover:bg-red-700 text-sm transition-all duration-200"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="bg-gray-600 px-4 py-2 rounded hover:bg-gray-700 text-sm transition-all duration-200"
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
      ) : (
        <>
          <div className="flex flex-col items-center py-6 px-4 sm:px-6 bg-gradient-to-b from-gray-800 to-gray-900">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4 border-blue-500 shadow-lg">
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
                <div className="w-full h-full bg-blue-600 flex items-center justify-center text-2xl sm:text-3xl text-white font-bold">
                  {user.user_metadata?.full_name?.[0].toUpperCase() || "?"}
                </div>
              )}
            </div>

            {editMode ? (
              <div className="w-full max-w-[250px] mt-4">
                <input
                  type="file"
                  accept="image/*"
                  ref={avatarFileRef}
                  onChange={handleAvatarChange}
                  className="mt-2 text-sm text-gray-200 w-full bg-gray-800 rounded-lg p-2 border border-gray-700 focus:border-blue-500 transition-all duration-200"
                />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-2 w-full px-3 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:outline-none transition-all duration-200"
                  placeholder="Enter full name"
                />
                <div className="flex justify-center space-x-4 mt-4">
                  <button
                    onClick={handleSave}
                    className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition-all duration-200"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditMode(false);
                      setAvatarPreview(null);
                    }}
                    className="bg-gray-600 px-4 py-2 rounded-lg hover:bg-gray-700 text-sm font-medium transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center mt-4">
                <p className="font-semibold text-base sm:text-lg text-white">
                  {user.user_metadata?.full_name || "No Name"}
                </p>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">{user.email}</p>
                <button
                  onClick={handleEditToggle}
                  className="mt-3 text-xs sm:text-sm text-blue-400 hover:text-blue-300 underline transition-all duration-200"
                >
                  Edit Profile
                </button>
              </div>
            )}
          </div>

          <div className="space-y-2 px-4 sm:px-6 pb-6">
            {[
              {
                label: "Order History",
                icon: "🔄",
                onClick: handleOrderHistoryClick,
              },
              { label: "Customer Support", icon: "💬" },
              { label: "Saved Addresses", icon: "📍" },
              { label: "Wishlist", icon: "❤️" },
            ].map((item) => (
              <div
                key={item.label}
                onClick={item.onClick}
                className="flex items-center space-x-3 border-b border-gray-800 py-3 cursor-pointer text-gray-200 hover:text-blue-400 hover:bg-gray-800 rounded-lg transition-all duration-200 px-2"
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm sm:text-base font-medium">{item.label}</span>
              </div>
            ))}

            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 text-left mt-6 py-3 text-red-400 hover:text-red-500 hover:bg-gray-800 rounded-lg px-2 transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span className="text-sm sm:text-base font-medium">Logout</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}