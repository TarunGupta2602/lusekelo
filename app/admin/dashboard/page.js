"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Image from "next/image";
import React from "react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const TABS = [
  { key: "orders", label: "Orders" },
  { key: "vendors", label: "Vendors" },
  { key: "invoices", label: "Invoices" },
];

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("orders");
  const [vendors, setVendors] = useState([]);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newVendorPassword, setNewVendorPassword] = useState("");
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/admin");
        return;
      }
      setUser(user);
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, email, full_name")
        .eq("id", user.id)
        .single();
      if (profileError || !profile || profile.role !== "admin") {
        setError("You are not authorized to view this page.");
        setTimeout(() => router.push("/admin"), 2000);
        return;
      }
      setProfile(profile);
      setLoading(false);
    };
    getUser();
  }, [router]);

  useEffect(() => {
    if (activeTab === "vendors") {
      supabase
        .from("profiles")
        .select("id, full_name, avatar_url, email, role")
        .eq("role", "vendor")
        .then(({ data }) => setVendors(data || []));
    }
  }, [activeTab, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-blue-800">
        <div className="text-white text-xl font-semibold">
          Loading admin dashboard...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-blue-800">
        <div className="text-red-400 text-xl font-semibold">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full text-center relative">
            <h2 className="text-xl font-bold mb-4 text-gray-800">
              Vendor Created
            </h2>
            <p className="mb-2 text-gray-700">
              Share this password securely with the vendor:
            </p>
            <div className="bg-gray-100 rounded p-3 font-mono text-lg mb-4 select-all break-all border border-gray-200">
              {newVendorPassword}
            </div>
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded shadow"
              onClick={() => setShowPasswordModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
      {/* Topbar */}
      <header className="w-full flex items-center justify-between px-10 py-4 bg-white border-b shadow-sm">
        <div></div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center">
              <svg
                width="24"
                height="24"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  fill="#2563eb"
                  d="M12 2a7 7 0 0 1 7 7c0 3.87-3.13 7-7 7s-7-3.13-7-7a7 7 0 0 1 7-7Zm0 16c4.42 0 8 1.79 8 4v2H4v-2c0-2.21 3.58-4 8-4Z"
                />
              </svg>
            </div>
            <div className="text-gray-800 font-semibold">
              {profile?.full_name || "Admin"}
            </div>
          </div>
          <button
            className="bg-lime-400 hover:bg-lime-500 text-gray-900 font-bold px-5 py-2 rounded-lg shadow transition"
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/admin");
            }}
          >
            Sign Out
          </button>
        </div>
      </header>
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r min-h-screen flex flex-col">
          <div className="flex items-center gap-2 px-6 py-6 border-b">
            <Image src="/logo.svg" alt="Logo" width={90} height={40} />
          </div>
          <nav className="flex-1 px-4 py-6">
            <ul className="space-y-2">
              {TABS.map((tab) => (
                <li key={tab.key}>
                  <button
                    className={`w-full text-left px-4 py-2 rounded-lg font-semibold transition ${
                      activeTab === tab.key
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        {/* Main Content */}
        <main className="flex-1 p-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            {TABS.find((t) => t.key === activeTab)?.label}
          </h1>
          {activeTab === "orders" && (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500 text-lg">
              We do not have orders yet.
            </div>
          )}
          {activeTab === "invoices" && (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500 text-lg">
              We do not have invoices yet.
            </div>
          )}
          {activeTab === "vendors" && (
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <span className="text-xl font-bold text-gray-800">Vendors</span>
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded shadow transition"
                  onClick={async () => {
                    const name = prompt("Enter vendor full name:");
                    const email = prompt("Enter vendor email:");
                    const avatar_url = prompt("Enter avatar URL (optional):");
                    if (!name || !email) return;
                    try {
                      const res = await fetch("/api/add-vendor", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name, email, avatar_url }),
                      });
                      const result = await res.json();
                      if (result.success) {
                        setNewVendorPassword(result.password || "");
                        setShowPasswordModal(true);
                        // Refresh vendor list
                        const { data } = await supabase
                          .from("profiles")
                          .select("id, full_name, avatar_url, email, role")
                          .eq("role", "vendor");
                        setVendors(data || []);
                      } else if (result.error && result.error.includes('duplicate key value')) {
                        alert("A vendor with this email already exists or the user already exists in the system.");
                      } else {
                        alert("Error adding vendor: " + result.error);
                      }
                    } catch (e) {
                      alert("Network or server error: " + e.message);
                    }
                  }}
                >
                  + Add Vendor
                </button>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">
                      Avatar
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">
                      Full Name
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">
                      Email
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">
                      ID
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {vendors.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-gray-400 py-8">
                        No vendors found.
                      </td>
                    </tr>
                  ) : (
                    vendors.map((vendor) => (
                      <tr key={vendor.id} className="hover:bg-blue-50">
                        <td className="px-4 py-2">
                          {vendor.avatar_url ? (
                            <Image
                              src={vendor.avatar_url}
                              alt={vendor.full_name || "Vendor"}
                              width={40}
                              height={40}
                              className="rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold">
                              {vendor.full_name
                                ? vendor.full_name[0]
                                : "V"}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2 font-semibold text-gray-800">
                          {vendor.full_name}
                        </td>
                        <td className="px-4 py-2 text-gray-700">
                          {vendor.email}
                        </td>
                        <td className="px-4 py-2 text-gray-500 text-xs">
                          {vendor.id}
                        </td>
                        <td className="px-4 py-2">
                          <button
                            className="bg-red-100 hover:bg-red-200 text-red-700 font-bold px-3 py-1 rounded shadow text-xs"
                            onClick={async () => {
                              if (!window.confirm("Disable this vendor?")) return;
                              const { error } = await supabase
                                .from("profiles")
                                .update({ role: "disabled_vendor" })
                                .eq("id", vendor.id);
                              if (!error) {
                                setVendors((prev) =>
                                  prev.filter((v) => v.id !== vendor.id)
                                );
                              } else {
                                alert("Error disabling vendor: " + error.message);
                              }
                            }}
                          >
                            Disable
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
