"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Search,
  UserPlus,
  Users,
  Shield,
  Mail,
  Phone,
  MapPin,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
} from "lucide-react";

interface UserData {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  section?: string | null;
  isActive: boolean;
  createdAt: string;
  company?: { id: string; name: string } | null;
}

interface UserManagementProps {
  targetRole: string;
  title: string;
  description: string;
  showSection?: boolean;
  accentColor?: string;
}

export default function UserManagement({
  targetRole,
  title,
  description,
  showSection = false,
  accentColor = "blue",
}: UserManagementProps) {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [sections, setSections] = useState<{id: string; name: string; slug: string}[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    section: "",
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/users?role=${targetRole}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSections = async () => {
    try {
      const res = await fetch("/api/sections");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setSections(data.filter((s: any) => s.isActive));
      }
    } catch (err) {
      console.error("Error fetching sections:", err);
    }
  };

  useEffect(() => {
    fetchUsers();
    if (showSection) fetchSections();
  }, [targetRole]);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({ name: "", email: "", password: "", phone: "", section: "" });
    setError("");
    setShowModal(true);
  };

  const openEditModal = (user: UserData) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      phone: user.phone || "",
      section: user.section || "",
    });
    setError("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      if (editingUser) {
        // Update
        const body: any = { ...formData };
        if (!body.password) delete body.password;
        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to update user");
          return;
        }
        setSuccess("User updated successfully!");
      } else {
        // Create
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...formData, role: targetRole }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to create user");
          return;
        }
        setSuccess("User created successfully!");
      }

      setShowModal(false);
      fetchUsers();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("An error occurred");
    }
  };

  const handleDelete = async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      if (res.ok) {
        setSuccess("User deleted successfully!");
        setDeleteConfirm(null);
        fetchUsers();
        setTimeout(() => setSuccess(""), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete user");
      }
    } catch (err) {
      setError("An error occurred");
    }
  };

  const handleToggleActive = async (user: UserData) => {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (res.ok) {
        fetchUsers();
        setSuccess(`User ${user.isActive ? "deactivated" : "activated"} successfully!`);
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err) {
      setError("An error occurred");
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.section && u.section.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const colorMap: Record<string, { bg: string; text: string; border: string; gradient: string; badge: string }> = {
    blue: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20", gradient: "from-blue-600 to-cyan-600", badge: "bg-blue-500/20 text-blue-300" },
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", gradient: "from-emerald-600 to-teal-600", badge: "bg-emerald-500/20 text-emerald-300" },
    amber: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", gradient: "from-amber-600 to-orange-600", badge: "bg-amber-500/20 text-amber-300" },
    rose: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20", gradient: "from-rose-600 to-pink-600", badge: "bg-rose-500/20 text-rose-300" },
    violet: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/20", gradient: "from-violet-600 to-indigo-600", badge: "bg-violet-500/20 text-violet-300" },
  };

  const colors = colorMap[accentColor] || colorMap.blue;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <p className="text-slate-400 text-sm mt-1">{description}</p>
        </div>
        <button
          onClick={openCreateModal}
          className={`inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r ${colors.gradient} text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-sm`}
        >
          <UserPlus size={16} />
          Add {targetRole.charAt(0) + targetRole.slice(1).toLowerCase()}
        </button>
      </div>

      {/* Alerts */}
      {success && (
        <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3">
          <CheckCircle size={18} className="text-emerald-400" />
          <p className="text-sm text-emerald-300">{success}</p>
        </div>
      )}
      {error && !showModal && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
          <AlertCircle size={18} className="text-red-400" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <input
          type="text"
          placeholder={`Search ${title.toLowerCase()}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500/50 focus:border-transparent outline-none transition"
        />
      </div>

      {/* Users Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-16">
          <Users size={48} className="mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400 text-lg mb-2">No {title.toLowerCase()} found</p>
          <p className="text-slate-500 text-sm">Click the button above to add one</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className={`bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 hover:border-slate-600/50 transition-all duration-200 ${
                !user.isActive ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors.gradient} flex items-center justify-center text-white font-semibold`}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{user.name}</h3>
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${colors.badge}`}>
                      {user.role}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(user)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition"
                    title="Edit"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(user.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-400">
                  <Mail size={14} className="text-slate-500" />
                  <span className="truncate">{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Phone size={14} className="text-slate-500" />
                    <span>{user.phone}</span>
                  </div>
                )}
                {user.section && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <MapPin size={14} className="text-slate-500" />
                    <span>Section: {user.section}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-700/50">
                <span className="text-xs text-slate-500">
                  Added {new Date(user.createdAt).toLocaleDateString()}
                </span>
                <button
                  onClick={() => handleToggleActive(user)}
                  className={`text-xs px-2.5 py-1 rounded-full transition ${
                    user.isActive
                      ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                      : "bg-red-500/20 text-red-300 hover:bg-red-500/30"
                  }`}
                >
                  {user.isActive ? "Active" : "Inactive"}
                </button>
              </div>

              {/* Delete Confirmation */}
              {deleteConfirm === user.id && (
                <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-300 mb-2">Delete this user?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-500 transition"
                    >
                      Confirm Delete
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-3 py-1.5 bg-slate-700 text-slate-300 text-xs rounded-lg hover:bg-slate-600 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h3 className="text-lg font-bold text-white">
                {editingUser ? "Edit" : "Add"} {targetRole.charAt(0) + targetRole.slice(1).toLowerCase()}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-400" />
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500/50 outline-none transition"
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500/50 outline-none transition"
                  placeholder="user@company.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Password {editingUser && <span className="text-slate-500">(leave empty to keep current)</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2.5 pr-10 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500/50 outline-none transition"
                    placeholder="Min 6 characters"
                    required={!editingUser}
                    minLength={editingUser ? 0 : 6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Phone (optional)</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500/50 outline-none transition"
                  placeholder="+91 9876543210"
                />
              </div>

              {showSection && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Section *</label>
                  <select
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition"
                    required
                  >
                    <option value="">Select section</option>
                    {sections.map((s) => (
                      <option key={s.id} value={s.slug}>{s.name}</option>
                    ))}
                  </select>
                  {sections.length === 0 && (
                    <p className="text-amber-400 text-xs mt-1">No sections found. Add sections in Manager → Sections first.</p>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className={`flex-1 bg-gradient-to-r ${colors.gradient} text-white font-medium py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200`}
                >
                  {editingUser ? "Update" : "Create"} {targetRole.charAt(0) + targetRole.slice(1).toLowerCase()}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
