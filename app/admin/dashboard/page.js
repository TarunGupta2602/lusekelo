"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Image from "next/image";
import React from "react";
import { FaSearch, FaUser, FaChevronDown, FaClipboardList, FaUserFriends, FaBell } from "react-icons/fa";
import Papa from "papaparse";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const TABS = [
  { key: "orders", label: "Orders" },
  { key: "vendors", label: "Vendors" },
  { key: "invoices", label: "Invoices" },
  { key: "agents", label: "Delivery Agents" },
];

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("orders");
  const [vendors, setVendors] = useState([]);
  const [agents, setAgents] = useState([]);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newVendorPassword, setNewVendorPassword] = useState("");
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editProfile, setEditProfile] = useState({ full_name: "", email: "" });
  const [showDisableVendorModal, setShowDisableVendorModal] = useState(false);
  const [vendorToDisable, setVendorToDisable] = useState(null);
  const [showAddAgentModal, setShowAddAgentModal] = useState(false);
  const [showEditAgentModal, setShowEditAgentModal] = useState(false);
  const [agentForm, setAgentForm] = useState({
    id: null,
    name: "",
    tracking_id: "",
    phone: "",
    address: "",
    email: "",
    bike_rc: "",
    gps_installed: false,
    gov_id: "",
    license: "",
  });
  const [searchAgent, setSearchAgent] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const agentsPerPage = 10;
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);
  const ordersPerPage = 10;
  const [ordersTotalPages, setOrdersTotalPages] = useState(1);
  const [searchOrders, setSearchOrders] = useState("");
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
      setEditProfile({ full_name: profile.full_name, email: profile.email });
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
    } else if (activeTab === "agents") {
      fetchAgents();
    } else if (activeTab === "orders") {
      fetchOrders(ordersPage);
    }
  }, [activeTab, ordersPage]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setOrdersPage(1);
  }, [searchOrders]);

  const fetchAgents = async () => {
    const { data } = await supabase
      .from("agents")
      .select("*")
      .order("created_at", { ascending: false });
    setAgents(data || []);
  };

  const fetchOrders = async (page = 1) => {
    setOrdersLoading(true);
    const from = (page - 1) * ordersPerPage;
    const to = from + ordersPerPage - 1;
    const { data, error, count } = await supabase
      .from("orders")
      .select(`
        id,
        quantity,
        total_amount,
        status,
        created_at,
        vendor_decision,
        agent_id,
        products:product_id (
          id,
          name,
          supermarket:supermarketid (
            id,
            name
          )
        )
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (!error) {
      setOrders(data || []);
      setOrdersTotalPages(Math.ceil((count || 0) / ordersPerPage));
    }
    setOrdersLoading(false);
  };

  const handleProfileUpdate = async () => {
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: editProfile.full_name, email: editProfile.email })
      .eq("id", user.id);
    if (!error) {
      setProfile({ ...profile, ...editProfile });
      setShowAdminModal(false);
      alert("Profile updated successfully!");
    } else {
      alert("Error updating profile: " + error.message);
    }
  };

  const handleDisableVendor = async () => {
    if (!vendorToDisable) return;
    const { error } = await supabase
      .from("profiles")
      .update({ role: "disabled_vendor" })
      .eq("id", vendorToDisable.id);
    if (!error) {
      setVendors((prev) => prev.filter((v) => v.id !== vendorToDisable.id));
      setShowDisableVendorModal(false);
      setVendorToDisable(null);
    } else {
      alert("Error disabling vendor: " + error.message);
    }
  };

  const handleAgentFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    const processedValue = name === "gov_id" ? value.replace(/[^0-9]/g, "") : value;
    const maskedBikeRc = name === "bike_rc" ? value.replace(/\d(?=\d{3})/g, "*") : value;
    setAgentForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : (name === "bike_rc" ? maskedBikeRc : processedValue),
    }));
  };

  const handleAddAgent = async () => {
    const { id, ...newAgent } = agentForm;
    const { error } = await supabase.from("agents").insert([newAgent]);
    if (!error) {
      setShowAddAgentModal(false);
      setAgentForm({
        id: null,
        name: "",
        tracking_id: "",
        phone: "",
        address: "",
        email: "",
        bike_rc: "",
        gps_installed: false,
        gov_id: "",
        license: "",
      });
      fetchAgents();
    } else {
      alert("Error adding agent: " + error.message);
    }
  };

  const handleEditAgent = (agent) => {
    setAgentForm({
      ...agent,
      bike_rc: agent.bike_rc.replace(/\d(?=\d{3})/g, "*"),
      gov_id: agent.gov_id.replace(/[^0-9]/g, ""),
    });
    setShowEditAgentModal(true);
  };

  const handleUpdateAgent = async () => {
    const { id, ...updateData } = agentForm;
    const { error } = await supabase.from("agents").update(updateData).eq("id", id);
    if (!error) {
      setShowEditAgentModal(false);
      setAgentForm({
        id: null,
        name: "",
        tracking_id: "",
        phone: "",
        address: "",
        email: "",
        bike_rc: "",
        gps_installed: false,
        gov_id: "",
        license: "",
      });
      fetchAgents();
    } else {
      alert("Error updating agent: " + error.message);
    }
  };

  const handleDeleteAgent = async (id) => {
    if (!window.confirm("Are you sure you want to delete this agent?")) return;
    const { error } = await supabase.from("agents").delete().eq("id", id);
    if (!error) fetchAgents();
    else alert("Error deleting agent: " + error.message);
  };

  const handleExportAgents = () => {
    const exportData = agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      tracking_id: agent.tracking_id,
      phone: agent.phone,
      address: agent.address,
      email: agent.email,
      bike_rc: agent.bike_rc,
      gps_installed: agent.gps_installed ? "Yes" : "No",
      gov_id: agent.gov_id,
      license: agent.license,
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `agents_export_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    alert("Agents exported successfully!");
  };

  const handleImportAgents = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      alert("Please select a CSV file to import.");
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (result) => {
        const parsedAgents = result.data;

        const requiredFields = [
          "name",
          "tracking_id",
          "phone",
          "address",
          "email",
          "bike_rc",
          "gps_installed",
          "gov_id",
          "license",
        ];

        const validAgents = parsedAgents
          .map((agent) => ({
            name: agent.name?.trim() || "",
            tracking_id: agent.tracking_id?.trim() || "",
            phone: agent.phone?.trim() || "",
            address: agent.address?.trim() || "",
            email: agent.email?.trim() || "",
            bike_rc: agent.bike_rc?.trim() || "",
            gps_installed: agent.gps_installed?.toLowerCase() === "yes" || agent.gps_installed === true,
            gov_id: agent.gov_id?.trim() || "",
            license: agent.license?.trim() || "",
          }))
          .filter((agent) =>
            requiredFields.every((field) => agent[field] !== "" && agent[field] !== undefined)
          );

        if (validAgents.length === 0) {
          alert("No valid agents found in the CSV file.");
          return;
        }

        try {
          const { error } = await supabase.from("agents").insert(validAgents);
          if (error) {
            alert("Error importing agents: " + error.message);
          } else {
            alert(`Successfully imported ${validAgents.length} agents!`);
            fetchAgents();
          }
        } catch (e) {
          alert("Network or server error: " + e.message);
        }
      },
      error: (error) => {
        alert("Error parsing CSV file: " + error.message);
      },
    });
  };

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

  const indexOfLastAgent = currentPage * agentsPerPage;
  const indexOfFirstAgent = indexOfLastAgent - agentsPerPage;
  const currentAgents = agents
    .filter((a) =>
      Object.values(a)
        .join(" ")
        .toLowerCase()
        .includes(searchAgent.toLowerCase())
    )
    .slice(indexOfFirstAgent, indexOfLastAgent);
  const totalPages = Math.ceil(agents.length / agentsPerPage);

  // Filtered orders for search
  const filteredOrders = orders.filter((order) => {
    const search = searchOrders.toLowerCase();
    return (
      order.id?.toLowerCase().includes(search) ||
      order.products?.name?.toLowerCase().includes(search) ||
      order.products?.supermarket?.name?.toLowerCase().includes(search) ||
      order.status?.toLowerCase().includes(search) ||
      String(order.quantity).includes(search) ||
      String(order.total_amount).includes(search)
    );
  });
  const indexOfLastOrder = ordersPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
  const filteredTotalPages = Math.max(1, Math.ceil(filteredOrders.length / ordersPerPage));

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
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
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center relative">
            <h2 className="text-xl font-bold mb-4 text-gray-800">
              Admin Profile
            </h2>
            <div className="mb-4">
              <label className="block text-left text-gray-700 font-semibold mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={editProfile.full_name}
                onChange={(e) =>
                  setEditProfile({ ...editProfile, full_name: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="mb-4">
              <label className="block text-left text-gray-700 font-semibold mb-1">
                Email
              </label>
              <input
                type="email"
                value={editProfile.email}
                onChange={(e) =>
                  setEditProfile({ ...editProfile, email: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold px-4 py-2 rounded shadow"
                onClick={() => setShowAdminModal(false)}
              >
                Cancel
              </button>
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded shadow"
                onClick={handleProfileUpdate}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      {showDisableVendorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full text-center relative">
            <h2 className="text-xl font-bold mb-4 text-gray-800">
              Confirm Disable Vendor
            </h2>
            <p className="mb-4 text-gray-700">
              Are you sure you want to disable {vendorToDisable?.full_name}?
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold px-4 py-2 rounded shadow"
                onClick={() => {
                  setShowDisableVendorModal(false);
                  setVendorToDisable(null);
                }}
              >
                Cancel
              </button>
              <button
                className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded shadow"
                onClick={handleDisableVendor}
              >
                Disable
              </button>
            </div>
          </div>
        </div>
      )}
      {showAddAgentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl md:max-w-2xl lg:max-w-3xl h-[80vh] flex flex-col justify-center overflow-y-auto transition-all duration-300">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">Add Delivery Agent</h2>
            <form className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-y-auto px-2" onSubmit={e => { e.preventDefault(); handleAddAgent(); }}>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Name</label>
                <input type="text" name="name" value={agentForm.name} onChange={handleAgentFormChange} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600" />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Tracking ID</label>
                <input type="text" name="tracking_id" value={agentForm.tracking_id} onChange={handleAgentFormChange} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600" />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Phone</label>
                <input type="text" name="phone" value={agentForm.phone} onChange={handleAgentFormChange} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600" />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Address</label>
                <input type="text" name="address" value={agentForm.address} onChange={handleAgentFormChange} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600" />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Email</label>
                <input type="email" name="email" value={agentForm.email} onChange={handleAgentFormChange} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600" />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Bike Registration Code</label>
                <input type="text" name="bike_rc" value={agentForm.bike_rc} onChange={handleAgentFormChange} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600" />
              </div>
              <div className="flex items-center col-span-1 md:col-span-2">
                <input type="checkbox" name="gps_installed" checked={agentForm.gps_installed} onChange={handleAgentFormChange} className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                <label className="ml-3 block text-gray-700 font-semibold">GPS Installed</label>
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Government ID</label>
                <input type="text" name="gov_id" value={agentForm.gov_id} onChange={handleAgentFormChange} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600" />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">License</label>
                <input type="text" name="license" value={agentForm.license} onChange={handleAgentFormChange} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600" />
              </div>
            </form>
            <div className="flex justify-end gap-3 mt-6">
              <button className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold px-6 py-2 rounded shadow" onClick={() => setShowAddAgentModal(false)}>
                Cancel
              </button>
              <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded shadow" onClick={handleAddAgent}>
                Add Agent
              </button>
            </div>
          </div>
        </div>
      )}
      {showEditAgentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center relative">
            <h2 className="text-xl font-bold mb-4 text-gray-800">
              Edit Delivery Agent
            </h2>
            <div className="mb-4">
              <label className="block text-left text-gray-700 font-semibold mb-1">
                Name
              </label>
              <input
                type="text"
                name="name"
                value={agentForm.name}
                onChange={handleAgentFormChange}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="mb-4">
              <label className="block text-left text-gray-700 font-semibold mb-1">
                Tracking ID
              </label>
              <input
                type="text"
                name="tracking_id"
                value={agentForm.tracking_id}
                onChange={handleAgentFormChange}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="mb-4">
              <label className="block text-left text-gray-700 font-semibold mb-1">
                Phone
              </label>
              <input
                type="text"
                name="phone"
                value={agentForm.phone}
                onChange={handleAgentFormChange}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="mb-4">
              <label className="block text-left text-gray-700 font-semibold mb-1">
                Address
              </label>
              <input
                type="text"
                name="address"
                value={agentForm.address}
                onChange={handleAgentFormChange}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="mb-4">
              <label className="block text-left text-gray-700 font-semibold mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={agentForm.email}
                onChange={handleAgentFormChange}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="mb-4">
              <label className="block text-left text-gray-700 font-semibold mb-1">
                Bike Registration Code
              </label>
              <input
                type="text"
                name="bike_rc"
                value={agentForm.bike_rc}
                onChange={handleAgentFormChange}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="mb-4 flex items-center">
              <input
                type="checkbox"
                name="gps_installed"
                checked={agentForm.gps_installed}
                onChange={handleAgentFormChange}
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-3 block text-gray-700 font-semibold">
                GPS Installed
              </label>
            </div>
            <div className="mb-4">
              <label className="block text-left text-gray-700 font-semibold mb-1">
                Government ID
              </label>
              <input
                type="text"
                name="gov_id"
                value={agentForm.gov_id}
                onChange={handleAgentFormChange}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="mb-4">
              <label className="block text-left text-gray-700 font-semibold mb-1">
                License
              </label>
              <input
                type="text"
                name="license"
                value={agentForm.license}
                onChange={handleAgentFormChange}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold px-4 py-2 rounded shadow"
                onClick={() => setShowEditAgentModal(false)}
              >
                Cancel
              </button>
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded shadow"
                onClick={handleUpdateAgent}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
      <header className="w-full flex items-center justify-between px-10 py-4 bg-white border-b shadow-sm">
        <div className="flex items-center gap-2">
          <Image src="/logo.svg" alt="Logo" width={90} height={40} />
        </div>
        <div className="flex items-center gap-4">
          <button
            className="flex items-center gap-2"
            onClick={() => setShowAdminModal(true)}
          >
            <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center">
              <svg width="24" height="24" fill="none" viewBox="0 0 24">
                <path
                  fill="#2563eb"
                  d="M12 2a7 7 0 0 1 7 7c0 3.87-3.13 7-7 7s-7-3.13-7-7a7 7 0 0 1 7-7Zm0 16c4.42 0 8 1.79 8 4v2H4v-2c0-2.21 3.58-4 8-4Z"
                />
              </svg>
            </div>
            <div className="text-gray-800 font-semibold">
              {profile?.full_name || "Admin"}
            </div>
          </button>
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
        <aside className="w-64 bg-gray-50 border-r min-h-screen flex flex-col">
          <nav className="flex-1 px-4 py-6">
            <ul className="space-y-4">
              <li>
                <div className="flex items-center gap-2 text-gray-700 font-semibold mb-2">
                  <FaSearch className="text-lg" />
                  <span>Search Orders</span>
                </div>
                <input
                  type="text"
                  placeholder="Search Orders"
                  className="w-full mt-2 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                  value={searchOrders}
                  onChange={e => setSearchOrders(e.target.value)}
                />
              </li>
              <li>
                <div className="flex items-center gap-2 text-gray-700 font-semibold mb-2">
                  <FaClipboardList className="text-lg" />
                  <span>Manage Bookings</span>
                  <FaChevronDown className="ml-auto text-xs" />
                </div>
                <ul className="ml-6 mt-2 space-y-1">
                  <li>
                    <button
                      className={`w-full text-left px-3 py-2 rounded-lg font-medium transition ${
                        activeTab === "orders"
                          ? "bg-blue-100 text-blue-700"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                      onClick={() => setActiveTab("orders")}
                    >
                      Orders
                    </button>
                  </li>
                  <li>
                    <button
                      className={`w-full text-left px-3 py-2 rounded-lg font-medium transition ${
                        activeTab === "vendors"
                          ? "bg-blue-100 text-blue-700"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                      onClick={() => setActiveTab("vendors")}
                    >
                      Vendors
                    </button>
                  </li>
                  <li>
                    <button
                      className={`w-full text-left px-3 py-2 rounded-lg font-medium transition ${
                        activeTab === "invoices"
                          ? "bg-blue-100 text-blue-700"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                      onClick={() => setActiveTab("invoices")}
                    >
                      Invoices
                    </button>
                  </li>
                </ul>
              </li>
              <li>
                <div className="flex items-center gap-2 text-gray-700 font-semibold mb-2 mt-4">
                  <FaUserFriends className="text-lg" />
                  <span>Delivery Agents</span>
                  <FaChevronDown className="ml-auto text-xs" />
                </div>
                <ul className="ml-6 mt-2 space-y-1">
                  <li>
                    <button
                      className={`w-full text-left px-3 py-2 rounded-lg font-medium transition ${
                        activeTab === "agents"
                          ? "bg-blue-100 text-blue-700"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                      onClick={() => setActiveTab("agents")}
                    >
                      Agents
                    </button>
                  </li>
                  <li>
                    <button
                      className={`w-full text-left px-3 py-2 rounded-lg font-medium transition ${
                        activeTab === "assignOrder"
                          ? "bg-blue-100 text-blue-700"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                      onClick={() => setActiveTab("assignOrder")}
                    >
                      Assign Order
                    </button>
                  </li>
                </ul>
              </li>
            </ul>
          </nav>
        </aside>
        <main className="flex-1 p-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            {TABS.find((t) => t.key === activeTab)?.label}
          </h1>
          {activeTab === "orders" && (
            <div className="bg-white rounded-xl shadow p-8">
              <h2 className="text-xl font-bold mb-4">Orders</h2>
              {ordersLoading ? (
                <div className="text-center text-gray-500">Loading orders...</div>
              ) : currentOrders.length === 0 ? (
                <div className="text-center text-gray-400 py-8">No orders found.</div>
              ) : (
                <>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Order ID</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Product</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Supermarket</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Quantity</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Total Amount</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Created At</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Vendor Decision</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {currentOrders.map((order) => (
                        <tr key={order.id}>
                          <td className="px-4 py-2">{order.id}</td>
                          <td className="px-4 py-2">{order.products?.name || "N/A"}</td>
                          <td className="px-4 py-2">{order.products?.supermarket?.name || "N/A"}</td>
                          <td className="px-4 py-2">{order.quantity}</td>
                          <td className="px-4 py-2">{order.total_amount}</td>
                          <td className="px-4 py-2">{order.status}</td>
                          <td className="px-4 py-2">{new Date(order.created_at).toLocaleString()}</td>
                          <td className="px-4 py-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              order.vendor_decision === 'accepted'
                                ? 'bg-green-100 text-green-600'
                                : order.vendor_decision === 'rejected'
                                ? 'bg-red-100 text-red-600'
                                : 'bg-yellow-100 text-yellow-600'
                            }`}>
                              {order.vendor_decision?.charAt(0).toUpperCase() + order.vendor_decision?.slice(1) || 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-4 flex justify-center gap-2">
                    <button
                      className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 disabled:opacity-50"
                      onClick={() => setOrdersPage((prev) => Math.max(prev - 1, 1))}
                      disabled={ordersPage === 1}
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2">
                      Page {ordersPage} of {filteredTotalPages}
                    </span>
                    <button
                      className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 disabled:opacity-50"
                      onClick={() => setOrdersPage((prev) => Math.min(prev + 1, filteredTotalPages))}
                      disabled={ordersPage === filteredTotalPages}
                    >
                      Next
                    </button>
                  </div>
                </>
              )}
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
                            onClick={() => {
                              setVendorToDisable(vendor);
                              setShowDisableVendorModal(true);
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
          {activeTab === "agents" && (
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-2">
                <div className="flex gap-2">
                  <button
                    className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
                    onClick={handleExportAgents}
                  >
                    Export
                  </button>
                  <label className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 cursor-pointer">
                    Import
                    <input type="file" accept=".csv" className="hidden" onChange={handleImportAgents} />
                  </label>
                  <button
                    className="bg-blue-600 text-white px-4 py-2 rounded"
                    onClick={() => setShowAddAgentModal(true)}
                  >
                    + Add Agent
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Search..."
                  className="border px-3 py-2 rounded w-full md:w-64"
                  value={searchAgent}
                  onChange={(e) => setSearchAgent(e.target.value)}
                />
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Tracking ID</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Phone</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Address</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Email</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Bike/RC</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">GPS Installed</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">GOV ID</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">License</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {currentAgents.map((agent) => (
                      <tr key={agent.id}>
                        <td className="px-4 py-2">{agent.name}</td>
                        <td className="px-4 py-2">{agent.tracking_id}</td>
                        <td className="px-4 py-2">{agent.phone}</td>
                        <td className="px-4 py-2">{agent.address}</td>
                        <td className="px-4 py-2">{agent.email}</td>
                        <td className="px-4 py-2">{agent.bike_rc.replace(/\d(?=\d{3})/g, "*") || "123*****678"}</td>
                        <td className="px-4 py-2">
                          {agent.gps_installed ? (
                            <span className="text-green-700 bg-green-100 px-2 py-1 rounded text-xs">
                              Yes
                            </span>
                          ) : (
                            <span className="text-red-700 bg-red-100 px-2 py-1 rounded text-xs">
                              No
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2">{agent.gov_id}</td>
                        <td className="px-4 py-2">
                          {agent.license ? (
                            <span className="text-green-700 bg-green-100 px-2 py-1 rounded text-xs">
                              Available
                            </span>
                          ) : (
                            <span className="text-red-700 bg-red-100 px-2 py-1 rounded text-xs">
                              Not Available
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 flex gap-2">
                          <button
                            className="text-blue-600 hover:text-blue-900"
                            onClick={() => handleEditAgent(agent)}
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            className="text-red-600 hover:text-red-900"
                            onClick={() => handleDeleteAgent(agent.id)}
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex justify-center gap-2">
                <button
                  className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 disabled:opacity-50"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <span className="px-4 py-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 disabled:opacity-50"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          )}
          {activeTab === "assignOrder" && (
            <div className="bg-white rounded-xl shadow p-6 mt-6">
              <h2 className="text-xl font-bold mb-4">Assign Order</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Order ID</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Product</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Supermarket</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Assign Agent</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {orders.filter(o => o.vendor_decision === 'accepted' && !o.agent_id).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center text-gray-400 py-8">No accepted orders to assign.</td>
                      </tr>
                    ) : (
                      orders.filter(o => o.vendor_decision === 'accepted' && !o.agent_id).map(order => (
                        <tr key={order.id}>
                          <td className="px-4 py-2">{order.id}</td>
                          <td className="px-4 py-2">{order.products?.name || 'N/A'}</td>
                          <td className="px-4 py-2">{order.products?.supermarket?.name || 'N/A'}</td>
                          <td className="px-4 py-2">
                            <select
                              className="border px-2 py-1 rounded"
                              defaultValue=""
                              onChange={async (e) => {
                                const agentId = e.target.value;
                                if (!agentId) return;
                                const { error } = await supabase
                                  .from('orders')
                                  .update({ agent_id: agentId })
                                  .eq('id', order.id);
                                if (!error) {
                                  // Update UI
                                  setOrders(prev => prev.map(o => o.id === order.id ? { ...o, agent_id: agentId } : o));
                                }
                              }}
                            >
                              <option value="" disabled>Select agent</option>
                              {agents.map(agent => (
                                <option key={agent.id} value={agent.id}>{agent.name} ({agent.email})</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}