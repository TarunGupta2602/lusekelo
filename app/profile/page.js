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
    <div className="fixed top-0 mt-20 right-0 w-full sm:w-[400px] bg-[#022B3A] text-white min-h-screen shadow-2xl z-50 overflow-y-auto">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white text-2xl bg-gray-700 bg-opacity-60 rounded-full w-9 h-9 flex items-center justify-center hover:bg-red-500 transition"
        aria-label="Close profile sidebar"
      >
        ×
      </button>

      {showOrderHistory ? (
        <div className="py-8 px-6 flex flex-col min-h-[calc(100vh-5rem)]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Order History</h2>
            <button
              onClick={() => setShowOrderHistory(false)}
              className="text-gray-300 hover:text-white font-medium px-3 py-1 rounded hover:bg-gray-700 transition"
            >
              Back
            </button>
          </div>
          {error && (
            <p className="text-red-400 bg-red-900 bg-opacity-20 p-3 rounded-lg mb-6">
              {error}
            </p>
          )}
          {ordersLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
            </div>
          ) : orders.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No orders found.</p>
          ) : (
            <div className="flex-1 max-h-[calc(100vh-12rem)] overflow-y-auto space-y-4 pr-2">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-gray-800 bg-opacity-50 rounded-lg p-4 shadow-md hover:shadow-lg transition"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {order.products?.name || "Unknown Product"}
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">
                        {order.products?.description || "No description available"}
                      </p>
                      <p className="text-sm text-gray-300 mt-1">
                        Order ID: {order.id.slice(0, 8)}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        order.status === "completed"
                          ? "bg-green-600 text-white"
                          : order.status === "pending"
                          ? "bg-yellow-600 text-black"
                          : "bg-red-600 text-white"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
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
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-col items-center py-6">
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white">
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
                <div className="w-full h-full bg-gray-300 flex items-center justify-center text-3xl text-white">
                  {user.user_metadata?.full_name?.[0].toUpperCase() || "?"}
                </div>
              )}
            </div>

            {editMode ? (
              <>
                <input
                  type="file"
                  accept="image/*"
                  ref={avatarFileRef}
                  onChange={handleAvatarChange}
                  className="mt-2 text-sm text-gray-200"
                />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-2 px-3 py-1 rounded text-black w-4/5"
                  placeholder="Enter full name"
                />
                <div className="flex space-x-4 mt-3">
                  <button
                    onClick={handleSave}
                    className="bg-green-600 px-3 py-1 rounded hover:bg-green-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditMode(false);
                      setAvatarPreview(null);
                    }}
                    className="bg-gray-500 px-3 py-1 rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-2 font-semibold text-lg">
                  {user.user_metadata?.full_name || "No Name"}
                </p>
                <p className="text-sm">{user.email}</p>
                <button
                  onClick={handleEditToggle}
                  className="mt-2 text-sm underline text-gray-300 hover:text-white"
                >
                  Edit Profile
                </button>
              </>
            )}
          </div>

          <div className="space-y-6 px-6">
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
                className="flex items-center space-x-4 border-b border-gray-700 py-3 cursor-pointer hover:text-green-300"
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}

            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-2 text-left mt-6 py-3 text-red-400 hover:text-red-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}