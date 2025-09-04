'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Image from 'next/image';
import React from 'react';
import { FaSearch, FaUser, FaChevronDown, FaClipboardList, FaEdit, FaBan, FaCheck } from 'react-icons/fa';
import { Tooltip } from 'react-tooltip';
import Papa from 'papaparse';
import Sidebar from './Sidebar';
import ProductsManagement from './ProductsManagement';
import FinancialManagement from './FinancialManagement';
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const TABS = [
  { key: 'orders', label: 'Orders' },
  { key: 'vendors', label: 'Vendors' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'agents', label: 'Delivery Agents' },
  { key: 'products', label: 'Products & Categories' },
];
// Utility function to normalize image path
const normalizeImagePath = (image) => {
  if (Array.isArray(image) && image.length > 0) {
    return image[0] || '/file.svg';
  }
  return typeof image === 'string' && image ? image : '/file.svg';
};
export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('orders');
  const [vendors, setVendors] = useState([]);
  const [agents, setAgents] = useState([]);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newVendorPassword, setNewVendorPassword] = useState('');
  const [pendingVendorRedirect, setPendingVendorRedirect] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editProfile, setEditProfile] = useState({ full_name: '', email: '' });
  const [showDisableVendorModal, setShowDisableVendorModal] = useState(false);
  const [vendorToDisable, setVendorToDisable] = useState(null);
  const [showAddAgentModal, setShowAddAgentModal] = useState(false);
  const [showEditAgentModal, setShowEditAgentModal] = useState(false);
  const [agentForm, setAgentForm] = useState({
    id: null,
    name: '',
    tracking_id: '',
    phone: '',
    address: '',
    email: '',
    bike_rc: '',
    gps_installed: false,
    gov_id: '',
    license: '',
  });
  const [searchAgent, setSearchAgent] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const agentsPerPage = 10;
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);
  const ordersPerPage = 10;
  const [searchOrders, setSearchOrders] = useState('');
  const router = useRouter();
  const [showEditVendorModal, setShowEditVendorModal] = useState(false);
  const [editVendorForm, setEditVendorForm] = useState({ id: '', full_name: '', email: '' });
  const [expandedRows, setExpandedRows] = useState({});
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/admin');
        return;
      }
      setUser(user);
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, email, full_name')
        .eq('id', user.id)
        .single();
      if (profileError || !profile || profile.role !== 'admin') {
        setError('You are not authorized to view this page.');
        setTimeout(() => router.push('/admin'), 2000);
        return;
      }
      setProfile(profile);
      setEditProfile({ full_name: profile.full_name, email: profile.email });
      setLoading(false);
    };
    getUser();
  }, [router]);
  useEffect(() => {
    if (activeTab === 'vendors') {
      fetch('/api/vendors')
        .then(res => res.json())
        .then(data => setVendors(data || []));
    } else if (activeTab === 'agents') {
      fetchAgents();
    } else if (activeTab === 'orders') {
      fetchOrders();
      fetchAgents();
    }
  }, [activeTab]);
  useEffect(() => {
    setOrdersPage(1);
  }, [searchOrders]);
  const fetchAgents = async () => {
    const { data } = await supabase
      .from('agents')
      .select('*')
      .order('created_at', { ascending: false });
    setAgents(data || []);
  };
  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(
          `id, quantity, total_amount, status, admin_status, dispute_reason, created_at, vendor_decision, agent_id, products:product_id (id, name, image, supermarket:supermarket_id (id, name))`
        )
        .order('created_at', { ascending: false });
      if (error) throw new Error(`Error fetching orders: ${error.message}`);
      setOrders(data || []);
    } catch (err) {
      setError(`Unexpected error fetching orders: ${err.message}`);
    } finally {
      setOrdersLoading(false);
    }
  };
  const handleProfileUpdate = async () => {
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: editProfile.full_name, email: editProfile.email })
      .eq('id', user.id);
    if (!error) {
      setProfile({ ...profile, ...editProfile });
      setShowAdminModal(false);
      alert('Profile updated successfully!');
    } else {
      alert('Error updating profile: ' + error.message);
    }
  };
  const handleDisableVendor = async () => {
    if (!vendorToDisable) return;
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'disabled_vendor' })
      .eq('id', vendorToDisable.id);
    if (!error) {
      setVendors((prev) => prev.filter((v) => v.id !== vendorToDisable.id));
      setShowDisableVendorModal(false);
      setVendorToDisable(null);
      alert('Vendor disabled successfully!');
    } else {
      alert('Error disabling vendor: ' + error.message);
    }
  };
  const handleAgentFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    const processedValue = name === 'gov_id' ? value.replace(/[^0-9]/g, '') : value;
    const maskedBikeRc = name === 'bike_rc' ? value.replace(/\d(?=\d{3})/g, '*') : value;
    setAgentForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : name === 'bike_rc' ? maskedBikeRc : processedValue,
    }));
  };
  const handleAddAgent = async () => {
    const { id, ...newAgent } = agentForm;
    const { error } = await supabase.from('agents').insert([newAgent]);
    if (!error) {
      setShowAddAgentModal(false);
      setAgentForm({
        id: null,
        name: '',
        tracking_id: '',
        phone: '',
        address: '',
        email: '',
        bike_rc: '',
        gps_installed: false,
        gov_id: '',
        license: '',
      });
      fetchAgents();
      alert('Agent added successfully!');
    } else {
      alert('Error adding agent: ' + error.message);
    }
  };
  const handleEditAgent = (agent) => {
    setAgentForm({
      ...agent,
      bike_rc: agent.bike_rc.replace(/\d(?=\d{3})/g, '*'),
      gov_id: agent.gov_id.replace(/[^0-9]/g, ''),
    });
    setShowEditAgentModal(true);
  };
  const handleUpdateAgent = async () => {
    const { id, ...updateData } = agentForm;
    const { error } = await supabase.from('agents').update(updateData).eq('id', id);
    if (!error) {
      setShowEditAgentModal(false);
      setAgentForm({
        id: null,
        name: '',
        tracking_id: '',
        phone: '',
        address: '',
        email: '',
        bike_rc: '',
        gps_installed: false,
        gov_id: '',
        license: '',
      });
      fetchAgents();
      alert('Agent updated successfully!');
    } else {
      alert('Error updating agent: ' + error.message);
    }
  };
  const handleDeleteAgent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this agent?')) return;
    const { error } = await supabase.from('agents').delete().eq('id', id);
    if (!error) {
      fetchAgents();
      alert('Agent deleted successfully!');
    } else {
      alert('Error deleting agent: ' + error.message);
    }
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
      gps_installed: agent.gps_installed ? 'Yes' : 'No',
      gov_id: agent.gov_id,
      license: agent.license,
    }));
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `agents_export_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    alert('Agents exported successfully!');
  };
  const handleImportAgents = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      alert('Please select a CSV file to import.');
      return;
    }
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (result) => {
        const parsedAgents = result.data;
        const requiredFields = [
          'name',
          'tracking_id',
          'phone',
          'address',
          'email',
          'bike_rc',
          'gps_installed',
          'gov_id',
          'license',
        ];
        const validAgents = parsedAgents
          .map((agent) => ({
            name: agent.name?.trim() || '',
            tracking_id: agent.tracking_id?.trim() || '',
            phone: agent.phone?.trim() || '',
            address: agent.address?.trim() || '',
            email: agent.email?.trim() || '',
            bike_rc: agent.bike_rc?.trim() || '',
            gps_installed: agent.gps_installed?.toLowerCase() === 'yes' || agent.gps_installed === true,
            gov_id: agent.gov_id?.trim() || '',
            license: agent.license?.trim() || '',
          }))
          .filter((agent) =>
            requiredFields.every((field) => agent[field] !== '' && agent[field] !== undefined)
          );
        if (validAgents.length === 0) {
          alert('No valid agents found in the CSV file.');
          return;
        }
        try {
          const { error } = await supabase.from('agents').insert(validAgents);
          if (error) {
            alert('Error importing agents: ' + error.message);
          } else {
            alert(`Successfully imported ${validAgents.length} agents!`);
            fetchAgents();
          }
        } catch (e) {
          alert('Network or server error: ' + e.message);
        }
      },
      error: (error) => {
        alert('Error parsing CSV file: ' + error.message);
      },
    });
  };
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-blue-800">
        <div className="text-white text-lg sm:text-xl font-semibold animate-pulse">
          Loading admin dashboard...
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-blue-800">
        <div className="text-red-400 text-lg sm:text-xl font-semibold">{error}</div>
      </div>
    );
  }
  const indexOfLastAgent = currentPage * agentsPerPage;
  const indexOfFirstAgent = indexOfLastAgent - agentsPerPage;
  const currentAgents = agents
    .filter((a) =>
      Object.values(a)
        .join(' ')
        .toLowerCase()
        .includes(searchAgent.toLowerCase())
    )
    .slice(indexOfFirstAgent, indexOfLastAgent);
  const totalPages = Math.ceil(agents.length / agentsPerPage);
  const filteredOrders = orders.filter((order) => {
    const search = searchOrders.toLowerCase();
    return (
      order.id?.toLowerCase().includes(search) ||
      order.products?.name?.toLowerCase().includes(search) ||
      order.products?.supermarket?.name?.toLowerCase().includes(search) ||
      order.status?.toLowerCase().includes(search) ||
      order.admin_status?.toLowerCase().includes(search) ||
      String(order.quantity).includes(search) ||
      String(order.total_amount).includes(search)
    );
  });
  const indexOfLastOrder = ordersPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
  const filteredTotalPages = Math.max(1, Math.ceil(filteredOrders.length / ordersPerPage));
  const getStatusClass = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'refund':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-red-100 text-red-700';
    }
  };
  const getAdminStatusClass = (adminStatus) => {
    switch (adminStatus) {
      case 'disputed':
        return 'bg-orange-100 text-orange-700';
      case 'refunded':
        return 'bg-purple-100 text-purple-700';
      case 'none':
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Modals */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 transition-opacity duration-300">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md transform transition-all duration-300 scale-100">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Vendor Created</h2>
            <p className="mb-4 text-gray-600 text-sm">
              Share this password securely with the vendor:
            </p>
            <div className="bg-gray-100 rounded-lg p-3 font-mono text-sm text-gray-800 select-all break-all border border-gray-200 shadow-inner">
              {newVendorPassword}
            </div>
            <button
              className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg shadow transition-all duration-200 w-full"
              onClick={() => {
                setShowPasswordModal(false);
                if (pendingVendorRedirect) {
                  setPendingVendorRedirect(false);
                  router.push('/admin/dashboard');
                }
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 transition-opacity duration-300">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md transform transition-all duration-300 scale-100">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Admin Profile</h2>
            <div className="mb-4">
              <label className="block text-left text-gray-700 font-semibold mb-1 text-sm">Full Name</label>
              <input
                type="text"
                value={editProfile.full_name}
                onChange={(e) =>
                  setEditProfile({ ...editProfile, full_name: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm transition-all"
                aria-label="Full Name"
              />
            </div>
            <div className="mb-6">
              <label className="block text-left text-gray-700 font-semibold mb-1 text-sm">Email</label>
              <input
                type="email"
                value={editProfile.email}
                onChange={(e) =>
                  setEditProfile({ ...editProfile, email: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm transition-all"
                aria-label="Email"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-4 py-2 rounded-lg shadow transition-all duration-200 text-sm"
                onClick={() => setShowAdminModal(false)}
              >
                Cancel
              </button>
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg shadow transition-all duration-200 text-sm"
                onClick={handleProfileUpdate}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      {showDisableVendorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 transition-opacity duration-300">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md text-center transform transition-all duration-300 scale-100">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Confirm Disable Vendor</h2>
            <p className="mb-6 text-gray-600 text-sm">
              Are you sure you want to disable {vendorToDisable?.full_name}?
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-4 py-2 rounded-lg shadow transition-all duration-200 text-sm"
                onClick={() => {
                  setShowDisableVendorModal(false);
                  setVendorToDisable(null);
                }}
              >
                Cancel
              </button>
              <button
                className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg shadow transition-all duration-200 text-sm"
                onClick={handleDisableVendor}
              >
                Disable
              </button>
            </div>
          </div>
        </div>
      )}
      {showAddAgentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 transition-opacity duration-300">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl h-auto max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100">
            <h2 className="text-xl font-bold mb-6 text-gray-900 text-center">Add Delivery Agent</h2>
            <form className="grid grid-cols-1 sm:grid-cols-2 gap-4" onSubmit={(e) => { e.preventDefault(); handleAddAgent(); }}>
              <div>
                <label className="block text-gray-700 font-semibold mb-1 text-sm">Name</label>
                <input
                  type="text"
                  name="name"
                  value={agentForm.name}
                  onChange={handleAgentFormChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm transition-all"
                  aria-label="Name"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1 text-sm">Tracking ID</label>
                <input
                  type="text"
                  name="tracking_id"
                  value={agentForm.tracking_id}
                  onChange={handleAgentFormChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm transition-all"
                  aria-label="Tracking ID"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1 text-sm">Phone</label>
                <input
                  type="text"
                  name="phone"
                  value={agentForm.phone}
                  onChange={handleAgentFormChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm transition-all"
                  aria-label="Phone"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1 text-sm">Address</label>
                <input
                  type="text"
                  name="address"
                  value={agentForm.address}
                  onChange={handleAgentFormChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm transition-all"
                  aria-label="Address"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1 text-sm">Email</label>
                <input
                  type="email"
                  name="email"
                  value={agentForm.email}
                  onChange={handleAgentFormChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm transition-all"
                  aria-label="Email"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1 text-sm">Bike Registration Code</label>
                <input
                  type="text"
                  name="bike_rc"
                  value={agentForm.bike_rc}
                  onChange={handleAgentFormChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm transition-all"
                  aria-label="Bike Registration Code"
                />
              </div>
              <div className="flex items-center col-span-1 sm:col-span-2">
                <input
                  type="checkbox"
                  name="gps_installed"
                  checked={agentForm.gps_installed}
                  onChange={handleAgentFormChange}
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  aria-label="GPS Installed"
                />
                <label className="ml-3 block text-gray-700 font-semibold text-sm">GPS Installed</label>
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1 text-sm">Government ID</label>
                <input
                  type="text"
                  name="gov_id"
                  value={agentForm.gov_id}
                  onChange={handleAgentFormChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm transition-all"
                  aria-label="Government ID"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1 text-sm">License</label>
                <input
                  type="text"
                  name="license"
                  value={agentForm.license}
                  onChange={handleAgentFormChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm transition-all"
                  aria-label="License"
                />
              </div>
            </form>
            <div className="flex justify-end gap-3 mt-6">
              <button
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-4 py-2 rounded-lg shadow transition-all duration-200 text-sm"
                onClick={() => setShowAddAgentModal(false)}
              >
                Cancel
              </button>
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg shadow transition-all duration-200 text-sm"
                onClick={handleAddAgent}
              >
                Add Agent
              </button>
            </div>
          </div>
        </div>
      )}
      {showEditAgentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 transition-opacity duration-300">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md transform transition-all duration-300 scale-100">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Edit Delivery Agent</h2>
            <div className="mb-4">
              <label className="block text-left text-gray-700 font-semibold mb-1 text-sm">Name</label>
              <input
                type="text"
                name="name"
                value={agentForm.name}
                onChange={handleAgentFormChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm transition-all"
                aria-label="Name"
              />
            </div>
            <div className="mb-4">
              <label className="block text-left text-gray-700 font-semibold mb-1 text-sm">Tracking ID</label>
              <input
                type="text"
                name="tracking_id"
                value={agentForm.tracking_id}
                onChange={handleAgentFormChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm transition-all"
                aria-label="Tracking ID"
              />
            </div>
            <div className="mb-4">
              <label className="block text-left text-gray-700 font-semibold mb-1 text-sm">Phone</label>
              <input
                type="text"
                name="phone"
                value={agentForm.phone}
                onChange={handleAgentFormChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm transition-all"
                aria-label="Phone"
              />
            </div>
            <div className="mb-4">
              <label className="block text-left text-gray-700 font-semibold mb-1 text-sm">Address</label>
              <input
                type="text"
                name="address"
                value={agentForm.address}
                onChange={handleAgentFormChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm transition-all"
                aria-label="Address"
              />
            </div>
            <div className="mb-4">
              <label className="block text-left text-gray-700 font-semibold mb-1 text-sm">Email</label>
              <input
                type="email"
                name="email"
                value={agentForm.email}
                onChange={handleAgentFormChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm transition-all"
                aria-label="Email"
              />
            </div>
            <div className="mb-4">
              <label className="block text-left text-gray-700 font-semibold mb-1 text-sm">Bike Registration Code</label>
              <input
                type="text"
                name="bike_rc"
                value={agentForm.bike_rc}
                onChange={handleAgentFormChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm transition-all"
                aria-label="Bike Registration Code"
              />
            </div>
            <div className="mb-4 flex items-center">
              <input
                type="checkbox"
                name="gps_installed"
                checked={agentForm.gps_installed}
                onChange={handleAgentFormChange}
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                aria-label="GPS Installed"
              />
              <label className="ml-3 block text-gray-700 font-semibold text-sm">GPS Installed</label>
            </div>
            <div className="mb-4">
              <label className="block text-left text-gray-700 font-semibold mb-1 text-sm">Government ID</label>
              <input
                type="text"
                name="gov_id"
                value={agentForm.gov_id}
                onChange={handleAgentFormChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm transition-all"
                aria-label="Government ID"
              />
            </div>
            <div className="mb-6">
              <label className="block text-left text-gray-700 font-semibold mb-1 text-sm">License</label>
              <input
                type="text"
                name="license"
                value={agentForm.license}
                onChange={handleAgentFormChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm transition-all"
                aria-label="License"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-4 py-2 rounded-lg shadow transition-all duration-200 text-sm"
                onClick={() => setShowEditAgentModal(false)}
              >
                Cancel
              </button>
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg shadow transition-all duration-200 text-sm"
                onClick={handleUpdateAgent}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
      {showEditVendorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 transition-opacity duration-300">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md transform transition-all duration-300 scale-100">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Edit Vendor</h2>
            <div className="mb-4">
              <label className="block text-left text-gray-700 font-semibold mb-1 text-sm">Full Name</label>
              <input
                type="text"
                value={editVendorForm.full_name}
                onChange={(e) => setEditVendorForm((f) => ({ ...f, full_name: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm transition-all"
                aria-label="Full Name"
              />
            </div>
            <div className="mb-6">
              <label className="block text-left text-gray-700 font-semibold mb-1 text-sm">Email</label>
              <input
                type="email"
                value={editVendorForm.email}
                onChange={(e) => setEditVendorForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm transition-all"
                aria-label="Email"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-4 py-2 rounded-lg shadow transition-all duration-200 text-sm"
                onClick={() => setShowEditVendorModal(false)}
              >
                Cancel
              </button>
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg shadow transition-all duration-200 text-sm"
                onClick={async () => {
                  const { error } = await supabase
                    .from('profiles')
                    .update({ full_name: editVendorForm.full_name, email: editVendorForm.email })
                    .eq('id', editVendorForm.id);
                  if (error) {
                    alert('Error updating vendor: ' + error.message);
                    return;
                  }
                  setShowEditVendorModal(false);
                  alert('Vendor updated successfully!');
                  fetch('/api/vendors')
                    .then(res => res.json())
                    .then(data => setVendors(data || []));
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <header className="w-full flex flex-col sm:flex-row items-center justify-between px-4 sm:px-6 py-4 bg-white border-b border-gray-200 shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <Image src="/logo.svg" alt="Logo" width={80} height={32} className="w-20 h-8 sm:w-24 sm:h-10" />
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
          <button
            className="flex items-center gap-2 hover:bg-gray-100 rounded-lg p-2 transition-all duration-200"
            onClick={() => setShowAdminModal(true)}
            aria-label="Admin Profile"
          >
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path
                  fill="#2563eb"
                  d="M12 2a7 7 0 0 1 7 7c0 3.87-3.13 7-7 7s-7-3.13-7-7a7 7 0 0 1 7-7Zm0 16c4.42 0 8 1.79 8 4v2H4v-2c0-2.21 3.58-4 8-4Z"
                />
              </svg>
            </div>
            <div className="text-gray-800 font-semibold truncate max-w-[120px] text-sm sm:text-base">{profile?.full_name || 'Admin'}</div>
          </button>
          <button
            className="bg-lime-400 hover:bg-lime-500 text-gray-900 font-semibold px-4 py-2 rounded-lg shadow transition-all duration-200 text-sm sm:text-base"
            onClick={async () => {
              await supabase.auth.signOut();
              router.push('/admin');
            }}
            aria-label="Sign Out"
          >
            Sign Out
          </button>
        </div>
      </header>
      {/* Main Content */}
      <div className="flex flex-1 flex-col md:flex-row">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          searchOrders={searchOrders}
          setSearchOrders={setSearchOrders}
        />
        <main className="flex-1 p-4 sm:p-6 md:p-8 w-full overflow-x-auto bg-gray-50">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">
            {TABS.find((t) => t.key === activeTab)?.label}
          </h1>
          {activeTab === 'orders' && (
            <div className="bg-white rounded-2xl shadow-lg p-6 overflow-x-auto">
              <h2 className="text-xl font-bold mb-4 text-gray-900">Orders</h2>
              {ordersLoading ? (
                <div className="text-center text-gray-500 text-sm py-8">Loading orders...</div>
              ) : currentOrders.length === 0 ? (
                <div className="text-center text-gray-400 py-8 text-sm">No orders found.</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-[600px] w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-100 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase hidden md:table-cell">Product</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase hidden md:table-cell">Supermarket</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase">Quantity</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase">Total Amount</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase">Vendor Status</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase hidden md:table-cell">Admin Status</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase hidden md:table-cell">Dispute Reason</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase hidden md:table-cell">Created At</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase hidden md:table-cell">Vendor Decision</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase">Agent</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {currentOrders.map((order) => (
                          <React.Fragment key={order.id}>
                            <tr className="hover:bg-blue-50 transition-all duration-150">
                              <td className="px-4 py-3 hidden md:table-cell">
                                <div className="flex items-center gap-3">
                                  {order.products?.image ? (
                                    <Image
                                      src={normalizeImagePath(order.products.image)}
                                      alt={order.products.name || 'Product'}
                                      width={40}
                                      height={40}
                                      className="rounded object-cover border w-10 h-10"
                                      unoptimized
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded bg-gray-200 flex items-center justify-center text-gray-400">🛒</div>
                                  )}
                                  <span className="font-semibold text-gray-800 truncate max-w-[120px]">{order.products?.name || 'N/A'}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 truncate max-w-[120px] hidden md:table-cell">{order.products?.supermarket?.name || 'N/A'}</td>
                              <td className="px-4 py-3">{order.quantity}</td>
                              <td className="px-4 py-3">${order.total_amount.toFixed(2)}</td>
                              <td className="px-4 py-3">
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusClass(order.status)}`}
                                >
                                  {order.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 hidden md:table-cell">
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-medium ${getAdminStatusClass(order.admin_status)}`}
                                >
                                  {order.admin_status || 'None'}
                                </span>
                              </td>
                              <td className="px-4 py-3 truncate max-w-[120px] hidden md:table-cell">
                                {order.dispute_reason || 'N/A'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap hidden md:table-cell">{new Date(order.created_at).toLocaleString()}</td>
                              <td className="px-4 py-3 hidden md:table-cell">
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-medium ${order.vendor_decision === 'accepted'
                                      ? 'bg-green-100 text-green-700'
                                      : order.vendor_decision === 'rejected'
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-yellow-100 text-yellow-700'
                                    }`}
                                >
                                  {order.vendor_decision?.charAt(0).toUpperCase() + order.vendor_decision?.slice(1) || 'Pending'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {order.agent_id ? (
                                  agents.find(a => a.id === order.agent_id)?.name || 'Assigned'
                                ) : order.vendor_decision === 'accepted' ? (
                                  <select
                                    className="border border-gray-300 px-3 py-1 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    defaultValue=""
                                    onChange={async (e) => {
                                      const agentId = e.target.value;
                                      if (!agentId) return;
                                      const { error } = await supabase
                                        .from('orders')
                                        .update({ agent_id: agentId })
                                        .eq('id', order.id);
                                      if (!error) {
                                        setOrders((prev) =>
                                          prev.map((o) => (o.id === order.id ? { ...o, agent_id: agentId } : o))
                                        );
                                        alert('Agent assigned successfully!');
                                      } else {
                                        alert('Error assigning agent: ' + error.message);
                                      }
                                    }}
                                  >
                                    <option value="" disabled>
                                      Assign agent
                                    </option>
                                    {agents.map((agent) => (
                                      <option key={agent.id} value={agent.id}>
                                        {agent.name} ({agent.phone})
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  'N/A'
                                )}
                              </td>
                              <td className="px-4 py-3 flex gap-2 flex-wrap">
                                {order.admin_status !== 'disputed' && (
                                  <button
                                    className="bg-orange-100 hover:bg-orange-200 text-orange-700 px-3 py-1 rounded text-xs transition-all duration-200"
                                    onClick={async () => {
                                      const reason = window.prompt('Enter reason for dispute:');
                                      if (!reason) return;
                                      const { error } = await supabase
                                        .from('orders')
                                        .update({ admin_status: 'disputed', dispute_reason: reason })
                                        .eq('id', order.id);
                                      if (!error) {
                                        setOrders((prev) =>
                                          prev.map((o) => (o.id === order.id ? { ...o, admin_status: 'disputed', dispute_reason: reason } : o))
                                        );
                                        alert('Order marked as disputed!');
                                      } else {
                                        alert('Error: ' + error.message);
                                      }
                                    }}
                                  >
                                    Dispute
                                  </button>
                                )}
                                {order.admin_status !== 'refunded' && order.status !== 'refund' && (
                                  <button
                                    className="bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1 rounded text-xs transition-all duration-200"
                                    onClick={async () => {
                                      if (!window.confirm('Issue refund for this order?')) return;
                                      const { error } = await supabase
                                        .from('orders')
                                        .update({ admin_status: 'refunded' })
                                        .eq('id', order.id);
                                      if (!error) {
                                        setOrders((prev) =>
                                          prev.map((o) => (o.id === order.id ? { ...o, admin_status: 'refunded' } : o))
                                        );
                                        alert('Refund issued!');
                                      } else {
                                        alert('Error: ' + error.message);
                                      }
                                    }}
                                  >
                                    Refund
                                  </button>
                                )}
                              </td>
                            </tr>
                            <tr className="md:hidden bg-gray-100">
                              <td colSpan={6} className="px-4 py-3">
                                <div className="flex flex-col gap-2 text-sm">
                                  <div><strong>Product:</strong> {order.products?.name || 'N/A'}</div>
                                  <div><strong>Supermarket:</strong> {order.products?.supermarket?.name || 'N/A'}</div>
                                  <div><strong>Admin Status:</strong> {order.admin_status || 'None'}</div>
                                  <div><strong>Dispute Reason:</strong> {order.dispute_reason || 'N/A'}</div>
                                  <div><strong>Created At:</strong> {new Date(order.created_at).toLocaleString()}</div>
                                  <div><strong>Vendor Decision:</strong> {order.vendor_decision?.charAt(0).toUpperCase() + order.vendor_decision?.slice(1) || 'Pending'}</div>
                                </div>
                              </td>
                            </tr>
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-6 flex flex-col sm:flex-row justify-center items-center gap-3">
                    <button
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-4 py-2 rounded-lg shadow transition-all duration-200 disabled:opacity-50 w-full sm:w-auto text-sm"
                      onClick={() => setOrdersPage((prev) => Math.max(prev - 1, 1))}
                      disabled={ordersPage === 1}
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 text-sm">
                      Page {ordersPage} of {filteredTotalPages}
                    </span>
                    <button
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-4 py-2 rounded-lg shadow transition-all duration-200 disabled:opacity-50 w-full sm:w-auto text-sm"
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
          {activeTab === 'invoices' && (
            <FinancialManagement />
          )}
          {activeTab === 'vendors' && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
                <span className="text-xl font-bold text-gray-900">Vendors</span>
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                  <input
                    type="text"
                    placeholder="Search vendors..."
                    className="border border-gray-300 px-4 py-2 rounded-lg w-full sm:w-64 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
                    onChange={(e) => {
                      const search = e.target.value.toLowerCase();
                      setVendors((prev) =>
                        prev.map((v) => ({
                          ...v,
                          _visible: Object.values(v)
                            .join(' ')
                            .toLowerCase()
                            .includes(search),
                        }))
                      );
                    }}
                    aria-label="Search vendors"
                  />
                  <button
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg shadow transition-all duration-200 w-full sm:w-auto text-sm"
                    onClick={() => router.push('/admin/add-vendor')}
                  >
                    + Add Vendor
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-100 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase hidden md:table-cell"></th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase">Avatar</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase">Full Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase">Email</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase hidden md:table-cell">Business Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase hidden md:table-cell">Business Logo</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase hidden lg:table-cell">TIN</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase hidden lg:table-cell">Bank Account</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase hidden lg:table-cell">Mobile Money</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase hidden md:table-cell">KYC Docs</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase">KYC Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {vendors.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="text-center text-gray-400 py-8 text-sm">No vendors found.</td>
                      </tr>
                    ) : (
                      vendors
                        .filter((v) => v._visible !== false)
                        .map((vendor, index) => (
                          <React.Fragment key={vendor.id}>
                            <tr className={`transition-all duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                              <td className="px-4 py-3 hidden md:table-cell">
                                <button
                                  className="text-gray-600 hover:text-gray-800"
                                  onClick={() => setExpandedRows((prev) => ({
                                    ...prev,
                                    [vendor.id]: !prev[vendor.id]
                                  }))}
                                  aria-label="Toggle vendor details"
                                >
                                  <FaChevronDown className={`transform ${expandedRows[vendor.id] ? 'rotate-180' : ''}`} />
                                </button>
                              </td>
                              <td className="px-4 py-3">
                                {vendor.avatar_url ? (
                                  <Image
                                    src={vendor.avatar_url}
                                    alt="Avatar"
                                    width={40}
                                    height={40}
                                    className="rounded-full object-cover border w-10 h-10"
                                    unoptimized
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                                    {vendor.full_name ? vendor.full_name[0] : 'V'}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 font-semibold text-gray-800 truncate max-w-[120px] sm:max-w-[150px]">{vendor.full_name}</td>
                              <td className="px-4 py-3 text-gray-700 truncate max-w-[120px] sm:max-w-[150px]">{vendor.email}</td>
                              <td className="px-4 py-3 text-gray-700 hidden md:table-cell truncate max-w-[120px] sm:max-w-[150px]">{vendor.business_name}</td>
                              <td className="px-4 py-3 hidden md:table-cell">
                                {vendor.business_logo ? (
                                  <Image
                                    src={vendor.business_logo}
                                    alt="Business Logo"
                                    width={40}
                                    height={40}
                                    className="rounded object-cover border w-10 h-10"
                                    unoptimized
                                  />
                                ) : 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-gray-700 hidden lg:table-cell">{vendor.tin}</td>
                              <td className="px-4 py-3 text-gray-700 hidden lg:table-cell">{vendor.bank_account}</td>
                              <td className="px-4 py-3 text-gray-700 hidden lg:table-cell">{vendor.mobile_money}</td>
                              <td className="px-4 py-3 hidden md:table-cell">
                                {Array.isArray(vendor.kyc_documents) && vendor.kyc_documents.length > 0 ? (
                                  <ul className="space-y-1">
                                    {vendor.kyc_documents.map((doc, idx) => (
                                      <li key={idx}>
                                        <a
                                          href={doc}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:underline flex items-center gap-1 text-xs"
                                          aria-label={`View document ${idx + 1}`}
                                        >
                                          <FaClipboardList /> Doc {idx + 1}
                                        </a>
                                      </li>
                                    ))}
                                  </ul>
                                ) : 'N/A'}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-medium ${vendor.kyc_status === 'approved'
                                      ? 'bg-green-100 text-green-700'
                                      : vendor.kyc_status === 'submitted'
                                        ? 'bg-yellow-100 text-yellow-700'
                                        : vendor.kyc_status === 'rejected'
                                          ? 'bg-red-100 text-red-700'
                                          : 'bg-gray-100 text-gray-700'
                                    }`}
                                >
                                  {vendor.kyc_status || 'Pending'}
                                </span>
                              </td>
                              <td className="px-4 py-3 flex gap-2">
                                {vendor.kyc_status !== 'approved' && (
                                  <button
                                    className="text-green-600 hover:text-green-800 text-sm"
                                    data-tooltip-id={`approve-${vendor.id}`}
                                    data-tooltip-content="Approve KYC"
                                    onClick={async () => {
                                      try {
                                        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                                        if (sessionError || !session) {
                                          console.error('Failed to get session:', sessionError?.message);
                                          alert('Error: Please log in again');
                                          router.push('/admin');
                                          return;
                                        }
                                        const res = await fetch('/api/vendors/approve', {
                                          method: 'POST',
                                          headers: {
                                            'Content-Type': 'application/json',
                                            'Authorization': `Bearer ${session.access_token}`,
                                          },
                                          body: JSON.stringify({ id: vendor.id }),
                                        });
                                        const result = await res.json();
                                        if (res.ok) {
                                          setVendors((prev) =>
                                            prev.map((v) =>
                                              v.id === vendor.id ? { ...v, kyc_status: 'approved' } : v
                                            )
                                          );
                                          alert('KYC approved successfully!');
                                        } else {
                                          alert(`Failed to approve KYC: ${result.error || 'Unknown error'}`);
                                        }
                                      } catch (err) {
                                        console.error('Error approving KYC:', err);
                                        alert('Error approving KYC: Network error');
                                      }
                                    }}
                                    aria-label="Approve KYC"
                                  >
                                    <FaCheck />
                                    <Tooltip id={`approve-${vendor.id}`} />
                                  </button>
                                )}
                                <button
                                  className="text-blue-600 hover:text-blue-800 text-sm"
                                  data-tooltip-id={`edit-${vendor.id}`}
                                  data-tooltip-content="Edit Vendor"
                                  onClick={() => {
                                    setEditVendorForm({
                                      id: vendor.id,
                                      full_name: vendor.full_name,
                                      email: vendor.email,
                                    });
                                    setShowEditVendorModal(true);
                                  }}
                                  aria-label="Edit Vendor"
                                >
                                  <FaEdit />
                                  <Tooltip id={`edit-${vendor.id}`} />
                                </button>
                                <button
                                  className="text-red-600 hover:text-red-800 text-sm"
                                  data-tooltip-id={`disable-${vendor.id}`}
                                  data-tooltip-content="Disable Vendor"
                                  onClick={() => {
                                    setVendorToDisable(vendor);
                                    setShowDisableVendorModal(true);
                                  }}
                                  aria-label="Disable Vendor"
                                >
                                  <FaBan />
                                  <Tooltip id={`disable-${vendor.id}`} />
                                </button>
                              </td>
                            </tr>
                            {expandedRows[vendor.id] && (
                              <tr className="md:hidden bg-gray-100">
                                <td colSpan={12} className="px-4 py-3">
                                  <div className="flex flex-col gap-2 text-sm">
                                    <div><strong>Business Name:</strong> {vendor.business_name}</div>
                                    <div><strong>Business Logo:</strong> {vendor.business_logo ? (
                                      <Image
                                        src={vendor.business_logo}
                                        alt="Business Logo"
                                        width={40}
                                        height={40}
                                        className="rounded object-cover border w-10 h-10 inline-block ml-2"
                                        unoptimized
                                      />
                                    ) : 'N/A'}</div>
                                    <div><strong>TIN:</strong> {vendor.tin}</div>
                                    <div><strong>Bank Account:</strong> {vendor.bank_account}</div>
                                    <div><strong>Mobile Money:</strong> {vendor.mobile_money}</div>
                                    <div><strong>KYC Docs:</strong> {Array.isArray(vendor.kyc_documents) && vendor.kyc_documents.length > 0 ? (
                                      <ul className="space-y-1">
                                        {vendor.kyc_documents.map((doc, idx) => (
                                          <li key={idx}>
                                            <a
                                              href={doc}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-blue-600 hover:underline flex items-center gap-1 text-xs"
                                              aria-label={`View document ${idx + 1}`}
                                            >
                                              <FaClipboardList /> Doc {idx + 1}
                                            </a>
                                          </li>
                                        ))}
                                      </ul>
                                    ) : 'N/A'}</div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {activeTab === 'agents' && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-4 py-2 rounded-lg shadow transition-all duration-200 text-sm"
                    onClick={handleExportAgents}
                    aria-label="Export Agents"
                  >
                    Export
                  </button>
                  <label className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-4 py-2 rounded-lg shadow transition-all duration-200 text-sm cursor-pointer">
                    Import
                    <input type="file" accept=".csv" className="hidden" onChange={handleImportAgents} aria-label="Import Agents CSV" />
                  </label>
                  <button
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg shadow transition-all duration-200 text-sm"
                    onClick={() => setShowAddAgentModal(true)}
                    aria-label="Add Agent"
                  >
                    + Add Agent
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Search agents..."
                  className="border border-gray-300 px-4 py-2 rounded-lg w-full sm:w-64 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
                  value={searchAgent}
                  onChange={(e) => setSearchAgent(e.target.value)}
                  aria-label="Search agents"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-100 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase">Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase hidden md:table-cell">Tracking ID</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase">Phone</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase hidden md:table-cell">Address</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase hidden md:table-cell">Email</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase hidden lg:table-cell">Bike/RC</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase hidden lg:table-cell">GPS Installed</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase hidden lg:table-cell">GOV ID</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase hidden lg:table-cell">License</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {currentAgents.map((agent, index) => (
                      <React.Fragment key={agent.id}>
                        <tr className={`transition-all duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                          <td className="px-4 py-3">{agent.name}</td>
                          <td className="px-4 py-3 hidden md:table-cell">{agent.tracking_id}</td>
                          <td className="px-4 py-3">{agent.phone}</td>
                          <td className="px-4 py-3 hidden md:table-cell">{agent.address}</td>
                          <td className="px-4 py-3 hidden md:table-cell">{agent.email}</td>
                          <td className="px-4 py-3 hidden lg:table-cell">{agent.bike_rc.replace(/\d(?=\d{3})/g, '*') || '123*****678'}</td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            {agent.gps_installed ? (
                              <span className="text-green-700 bg-green-100 px-3 py-1 rounded-full text-xs">
                                Yes
                              </span>
                            ) : (
                              <span className="text-red-700 bg-red-100 px-3 py-1 rounded-full text-xs">
                                No
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">{agent.gov_id}</td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            {agent.license ? (
                              <span className="text-green-700 bg-green-100 px-3 py-1 rounded-full text-xs">
                                Available
                              </span>
                            ) : (
                              <span className="text-red-700 bg-red-100 px-3 py-1 rounded-full text-xs">
                                Not Available
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 flex gap-2">
                            <button
                              className="text-blue-600 hover:text-blue-800"
                              onClick={() => handleEditAgent(agent)}
                              data-tooltip-id={`edit-agent-${agent.id}`}
                              data-tooltip-content="Edit Agent"
                              aria-label="Edit Agent"
                            >
                              <FaEdit />
                              <Tooltip id={`edit-agent-${agent.id}`} />
                            </button>
                            <button
                              className="text-red-600 hover:text-red-800"
                              onClick={() => handleDeleteAgent(agent.id)}
                              data-tooltip-id={`delete-agent-${agent.id}`}
                              data-tooltip-content="Delete Agent"
                              aria-label="Delete Agent"
                            >
                              <FaBan />
                              <Tooltip id={`delete-agent-${agent.id}`} />
                            </button>
                          </td>
                        </tr>
                        <tr className="md:hidden bg-gray-100">
                          <td colSpan={10} className="px-4 py-3">
                            <div className="flex flex-col gap-2 text-sm">
                              <div><strong>Tracking ID:</strong> {agent.tracking_id}</div>
                              <div><strong>Address:</strong> {agent.address}</div>
                              <div><strong>Email:</strong> {agent.email}</div>
                              <div><strong>Bike/RC:</strong> {agent.bike_rc.replace(/\d(?=\d{3})/g, '*') || '123*****678'}</div>
                              <div><strong>GPS Installed:</strong> {agent.gps_installed ? 'Yes' : 'No'}</div>
                              <div><strong>GOV ID:</strong> {agent.gov_id}</div>
                              <div><strong>License:</strong> {agent.license ? 'Available' : 'Not Available'}</div>
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-4 py-2 rounded-lg shadow transition-all duration-200 disabled:opacity-50 text-sm"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  aria-label="Previous Page"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-4 py-2 rounded-lg shadow transition-all duration-200 disabled:opacity-50 text-sm"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  aria-label="Next Page"
                >
                  Next
                </button>
              </div>
            </div>
          )}
          {activeTab === 'products' && (
            <ProductsManagement />
          )}
        </main>
      </div>
    </div>
  );
}