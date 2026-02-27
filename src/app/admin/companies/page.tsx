"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  X,
  Search,
  Users,
  Factory,
  Mail,
  Phone,
  MapPin,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface CompanyData {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  location: string;
  createdAt: string;
  users: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    isActive: boolean;
    createdAt: string;
  }[];
  _count: {
    users: number;
    productionBatches: number;
  };
}

export default function AdminCompanies() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyData | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    companyName: "",
    companyEmail: "",
    companyPhone: "",
    companyLocation: "",
    ownerName: "",
    ownerEmail: "",
    ownerPassword: "",
    ownerPhone: "",
  });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "ADMIN") router.push("/");
  }, [status, session, router]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/companies");
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") fetchCompanies();
  }, [status]);

  const openCreateModal = () => {
    setEditingCompany(null);
    setFormData({
      companyName: "",
      companyEmail: "",
      companyPhone: "",
      companyLocation: "",
      ownerName: "",
      ownerEmail: "",
      ownerPassword: "",
      ownerPhone: "",
    });
    setError("");
    setShowModal(true);
  };

  const openEditModal = (company: CompanyData) => {
    setEditingCompany(company);
    setFormData({
      companyName: company.name,
      companyEmail: company.email,
      companyPhone: company.phone || "",
      companyLocation: company.location || "",
      ownerName: "",
      ownerEmail: "",
      ownerPassword: "",
      ownerPhone: "",
    });
    setError("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      if (editingCompany) {
        const res = await fetch(`/api/admin/companies/${editingCompany.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.companyName,
            email: formData.companyEmail,
            phone: formData.companyPhone,
            location: formData.companyLocation,
          }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error); return; }
        setSuccess("Company updated successfully!");
      } else {
        const res = await fetch("/api/admin/companies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error); return; }
        setSuccess("Company and owner created successfully!");
      }

      setShowModal(false);
      fetchCompanies();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("An error occurred");
    }
  };

  const handleDelete = async (companyId: string) => {
    try {
      const res = await fetch(`/api/admin/companies/${companyId}`, { method: "DELETE" });
      if (res.ok) {
        setSuccess("Company deleted successfully!");
        setDeleteConfirm(null);
        fetchCompanies();
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err) {
      setError("Failed to delete company");
    }
  };

  const filteredCompanies = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (status === "loading" || !session?.user) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar user={session.user} />

      <main className="ml-64 p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Companies</h1>
            <p className="text-slate-400">Manage all registered companies and their owners</p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Plus size={18} />
            New Company
          </button>
        </div>

        {/* Alerts */}
        {success && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3">
            <CheckCircle size={18} className="text-emerald-400" />
            <p className="text-sm text-emerald-300">{success}</p>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            placeholder="Search companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500/50 outline-none transition"
          />
        </div>

        {/* Companies List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-400"></div>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="text-center py-16">
            <Building2 size={48} className="mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400 text-lg mb-2">No companies found</p>
            <p className="text-slate-500 text-sm">Create your first company to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCompanies.map((company) => (
              <div
                key={company.id}
                className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden hover:border-slate-600/50 transition-all duration-200"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        {company.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{company.name}</h3>
                        <p className="text-slate-400 text-sm">{company.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(company)}
                        className="p-2 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(company.id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button
                        onClick={() =>
                          setExpandedCompany(expandedCompany === company.id ? null : company.id)
                        }
                        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
                      >
                        {expandedCompany === company.id ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Company Stats */}
                  <div className="flex items-center gap-6 mt-4">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Users size={14} className="text-slate-500" />
                      <span>{company._count.users} users</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Factory size={14} className="text-slate-500" />
                      <span>{company._count.productionBatches} batches</span>
                    </div>
                    {company.phone && (
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Phone size={14} className="text-slate-500" />
                        <span>{company.phone}</span>
                      </div>
                    )}
                    {company.location && (
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <MapPin size={14} className="text-slate-500" />
                        <span>{company.location}</span>
                      </div>
                    )}
                  </div>

                  {/* Delete Confirmation */}
                  {deleteConfirm === company.id && (
                    <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                      <p className="text-sm text-red-300 mb-3">
                        ⚠️ This will permanently delete the company and ALL its users, batches, and data. Are you sure?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDelete(company.id)}
                          className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-500 transition"
                        >
                          Yes, Delete Everything
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-4 py-2 bg-slate-700 text-slate-300 text-sm rounded-lg hover:bg-slate-600 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Expanded: Owner Details */}
                {expandedCompany === company.id && (
                  <div className="border-t border-slate-700/50 p-6 bg-slate-800/20">
                    <h4 className="text-sm font-semibold text-slate-300 mb-3">Company Owners</h4>
                    {company.users.length === 0 ? (
                      <p className="text-slate-500 text-sm">No owners assigned</p>
                    ) : (
                      <div className="space-y-3">
                        {company.users.map((owner) => (
                          <div
                            key={owner.id}
                            className="flex items-center justify-between p-3 bg-slate-700/30 rounded-xl"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-semibold text-sm">
                                {owner.name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-white text-sm font-medium">{owner.name}</p>
                                <p className="text-slate-400 text-xs">{owner.email}</p>
                              </div>
                            </div>
                            <span
                              className={`text-xs px-2.5 py-1 rounded-full ${
                                owner.isActive
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : "bg-red-500/20 text-red-300"
                              }`}
                            >
                              {owner.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-slate-700 sticky top-0 bg-slate-800 rounded-t-2xl">
                <h3 className="text-lg font-bold text-white">
                  {editingCompany ? "Edit Company" : "New Company + Owner"}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2">
                    <AlertCircle size={16} className="text-red-400" />
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                )}

                {/* Company Section */}
                <div>
                  <h4 className="text-sm font-semibold text-violet-400 mb-3 flex items-center gap-2">
                    <Building2 size={14} />
                    Company Details
                  </h4>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500/50 outline-none transition"
                      placeholder="Company Name"
                      required
                    />
                    <input
                      type="email"
                      value={formData.companyEmail}
                      onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500/50 outline-none transition"
                      placeholder="Company Email"
                      required
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="tel"
                        value={formData.companyPhone}
                        onChange={(e) => setFormData({ ...formData, companyPhone: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500/50 outline-none transition"
                        placeholder="Phone (optional)"
                      />
                      <input
                        type="text"
                        value={formData.companyLocation}
                        onChange={(e) => setFormData({ ...formData, companyLocation: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500/50 outline-none transition"
                        placeholder="Location (optional)"
                      />
                    </div>
                  </div>
                </div>

                {/* Owner Section (only for create) */}
                {!editingCompany && (
                  <div>
                    <h4 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                      <Users size={14} />
                      Owner Account
                    </h4>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={formData.ownerName}
                        onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 outline-none transition"
                        placeholder="Owner Full Name"
                        required
                      />
                      <input
                        type="email"
                        value={formData.ownerEmail}
                        onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 outline-none transition"
                        placeholder="Owner Email"
                        required
                      />
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={formData.ownerPassword}
                          onChange={(e) => setFormData({ ...formData, ownerPassword: e.target.value })}
                          className="w-full px-4 py-2.5 pr-10 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 outline-none transition"
                          placeholder="Owner Password (min 6 chars)"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <input
                        type="tel"
                        value={formData.ownerPhone}
                        onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 outline-none transition"
                        placeholder="Owner Phone (optional)"
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all"
                  >
                    {editingCompany ? "Update Company" : "Create Company + Owner"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-5 py-2.5 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
