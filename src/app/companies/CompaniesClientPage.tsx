"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/Sidebar";
import UserManagement from "@/components/UserManagement";
import {
  Building2,
  Users,
  MapPin,
  Phone,
  Mail,
  Plus,
  Edit2,
  Trash2,
  Layers,
  Package,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
} from "lucide-react";

interface CompanyData {
  id: string;
  name: string;
  email: string;
  location: string;
  phone: string | null;
  ownerId: string | null;
  owner?: {
    id: string;
    name: string;
    email: string;
  } | null;
  _count?: {
    users: number;
    sections: number;
    companyProducts: number;
  };
}

export default function CompaniesClientPage({ user }: { user: any }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"companies" | "owners">("companies");
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyData | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    location: "",
    phone: "",
    ownerId: "",
  });

  // Fetch Companies
  const {
    data: companies = [],
    refetch: refetchCompanies,
    isLoading: loadingCompanies,
  } = useQuery<CompanyData[]>({
    queryKey: ["companies"],
    queryFn: async () => {
      const res = await fetch("/api/companies");
      if (!res.ok) throw new Error("Failed to fetch companies");
      return res.json();
    },
    enabled: !!user,
  });

  // Fetch Owners
  const {
    data: owners = [],
    refetch: refetchOwners,
    isLoading: loadingOwners,
  } = useQuery<any[]>({
    queryKey: ["owners"],
    queryFn: async () => {
      const res = await fetch("/api/users?role=OWNER");
      if (!res.ok) throw new Error("Failed to fetch owners");
      return res.json();
    },
    enabled: !!user,
  });

  const openCreateModal = () => {
    setEditingCompany(null);
    setFormData({
      name: "",
      email: "",
      location: "",
      phone: "",
      ownerId: "",
    });
    setError("");
    setShowModal(true);
  };

  const openEditModal = (company: CompanyData) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      email: company.email,
      location: company.location,
      phone: company.phone || "",
      ownerId: company.ownerId || "",
    });
    setError("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      if (editingCompany) {
        // Update
        const res = await fetch(`/api/companies/${editingCompany.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to update company");
          return;
        }
        setSuccess("Company updated successfully!");
      } else {
        // Create
        const res = await fetch("/api/companies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to create company");
          return;
        }
        setSuccess("Company created successfully!");
      }

      setShowModal(false);
      refetchCompanies();
      refetchOwners(); // In case active company assigned changed
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("An error occurred");
    }
  };

  const handleDelete = async (companyId: string) => {
    try {
      const res = await fetch(`/api/companies/${companyId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSuccess("Company deleted successfully!");
        setDeleteConfirm(null);
        refetchCompanies();
        refetchOwners();
        setTimeout(() => setSuccess(""), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete company");
      }
    } catch (err) {
      setError("An error occurred");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar user={user} />

      <main className="ml-0 md:ml-64 p-4 md:p-8 pb-24 text-white">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Companies & Owners</h1>
            <p className="text-slate-400">Manage all registered companies and platform owners</p>
          </div>
          {activeTab === "companies" && (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-sm"
            >
              <Plus size={16} />
              Add Company
            </button>
          )}
        </div>

        {/* Alerts */}
        {success && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3">
            <CheckCircle size={18} className="text-emerald-400" />
            <p className="text-sm text-emerald-300">{success}</p>
          </div>
        )}
        {error && !showModal && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
            <AlertCircle size={18} className="text-red-400" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Tab switcher */}
        <div className="flex border-b border-slate-800 mb-8 gap-6">
          <button
            onClick={() => setActiveTab("companies")}
            className={`pb-4 text-sm font-medium transition-all relative ${
              activeTab === "companies"
                ? "text-violet-400 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Companies
            {activeTab === "companies" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("owners")}
            className={`pb-4 text-sm font-medium transition-all relative ${
              activeTab === "owners"
                ? "text-violet-400 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Owners
            {activeTab === "owners" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 rounded-full" />
            )}
          </button>
        </div>

        {/* Content */}
        {activeTab === "companies" ? (
          loadingCompanies ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-violet-400" size={32} />
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/30 border border-slate-800 rounded-2xl">
              <Building2 size={48} className="mx-auto text-slate-600 mb-4" />
              <p className="text-slate-400 text-lg mb-2">No companies found</p>
              <p className="text-slate-500 text-sm">Click the button above to add your first company</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {companies.map((company) => (
                <div
                  key={company.id}
                  className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 hover:border-slate-700/60 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20 shadow-inner">
                          <Building2 className="text-violet-400" size={24} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white tracking-tight">{company.name}</h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                                company.owner
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              }`}
                            >
                              {company.owner ? `Owner: ${company.owner.name}` : "Unassigned"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(company)}
                          className="p-2 rounded-xl text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 transition-all duration-200"
                          title="Edit Company"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(company.id)}
                          className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                          title="Delete Company"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2.5 my-4 p-3 bg-slate-950/40 rounded-xl border border-slate-800/80">
                      <div className="text-center">
                        <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-0.5">Sections</p>
                        <div className="flex items-center justify-center gap-1 text-white font-semibold text-sm">
                          <Layers size={12} className="text-slate-400" />
                          {company._count?.sections ?? 0}
                        </div>
                      </div>
                      <div className="text-center border-x border-slate-800/80">
                        <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-0.5">Users</p>
                        <div className="flex items-center justify-center gap-1 text-white font-semibold text-sm">
                          <Users size={12} className="text-slate-400" />
                          {company._count?.users ?? 0}
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-0.5">Products</p>
                        <div className="flex items-center justify-center gap-1 text-white font-semibold text-sm">
                          <Package size={12} className="text-slate-400" />
                          {company._count?.companyProducts ?? 0}
                        </div>
                      </div>
                    </div>

                    {/* Contact details */}
                    <div className="space-y-2 mt-4 text-sm text-slate-400 border-t border-slate-800/50 pt-4">
                      <div className="flex items-center gap-2.5">
                        <Mail size={14} className="text-slate-500 shrink-0" />
                        <span className="truncate">{company.email}</span>
                      </div>
                      {company.phone && (
                        <div className="flex items-center gap-2.5">
                          <Phone size={14} className="text-slate-500 shrink-0" />
                          <span>{company.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2.5">
                        <MapPin size={14} className="text-slate-500 shrink-0" />
                        <span className="truncate">{company.location}</span>
                      </div>
                    </div>
                  </div>

                  {/* Delete Confirmation Overlay */}
                  {deleteConfirm === company.id && (
                    <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                      <p className="text-sm text-red-300 font-semibold mb-2">Delete this company?</p>
                      <p className="text-xs text-red-400/80 mb-3">Warning: This action is permanent and will cascade delete all associated users, sections, products, and logs.</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDelete(company.id)}
                          className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg transition-all"
                        >
                          Confirm Delete
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-3.5 py-1.5 bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-700 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          <UserManagement
            targetRole="OWNER"
            title="Company Owners"
            description="Manage platform owner accounts. You can assign owners to companies in the Companies tab."
            accentColor="violet"
            users={owners}
            loading={loadingOwners}
            onRefresh={refetchOwners}
          />
        )}
      </main>

      {/* Add / Edit Company Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl text-white">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h3 className="text-lg font-bold">
                {editingCompany ? "Edit" : "Add"} Company
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
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
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Company Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500/50 outline-none transition"
                  placeholder="e.g. Acme Plywood Corp"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Company Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500/50 outline-none transition"
                  placeholder="contact@company.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500/50 outline-none transition"
                  placeholder="e.g. Kochi, Kerala"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Phone (optional)</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500/50 outline-none transition"
                  placeholder="+91 9876543210"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Assign Owner (optional)</label>
                <select
                  value={formData.ownerId}
                  onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-violet-500/50 outline-none transition"
                >
                  <option value="">Unassigned</option>
                  {owners.map((owner) => (
                    <option key={owner.id} value={owner.id}>
                      {owner.name} ({owner.email})
                    </option>
                  ))}
                </select>
                {owners.length === 0 && (
                  <p className="text-amber-400 text-xs mt-1">No owners found. Add owners in the Owners tab first.</p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {editingCompany ? "Update" : "Create"} Company
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition"
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
