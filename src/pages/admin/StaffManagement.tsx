import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Users,
  Key,
  Trash2,
  Edit2,
  Plus,
  Loader2,
  CheckCircle,
  AlertTriangle,
  X,
  Lock,
  Mail,
  CheckSquare,
  Square,
  ShieldCheck
} from "lucide-react";
import api from "../../services/api";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";

interface SidebarOption {
  path: string;
  label: string;
  description: string;
}

const SIDEBAR_OPTIONS: SidebarOption[] = [
  { path: "/admin/staff", label: "Staff & Officers", description: "Manage administrator accounts and page permissions" },
  { path: "/admin/tpo", label: "TPO & Colleges", description: "Provision and oversee College Training & Placement Officers" },
  { path: "/admin/students", label: "Students Portal", description: "Monitor Student details, profiles and performance indices" },
  { path: "/admin/companies", label: "Companies Panel", description: "Audit and verify employer accounts and setups" },
  { path: "/admin/jobs", label: "Jobs Hub", description: "Track active openings and direct assessment structures" },
  { path: "/admin/applications", label: "Applications Tracker", description: "Inspect pipeline candidacies, stages, and hires" },
  { path: "/admin/monitoring", label: "Performance Monitoring", description: "Read platform analytics, activity logs, and feedback loops" },
  { path: "/admin/psychometric", label: "Psychometric Lab", description: "Configure custom psychometric assessment batteries" },
  { path: "/admin/intelligence", label: "Intelligence Bank", description: "Manage test questions, cognitive tracks, and indices" },
  { path: "/admin/pricing", label: "Pricing & XP Setup", description: "Refine exchange rates, pricing tiers, and bonus distributions" },
  { path: "/admin/logs", label: "Audit logs", description: "Check raw administrative actions and platform history" }
];

export function StaffManagement() {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<number | null>(null);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStaffList();
  }, []);

  const fetchStaffList = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/staff");
      if (data.success) {
        setStaff(data.data || []);
      }
    } catch (e: any) {
      toast.error("Failed to load staff list");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingStaffId(null);
    setEmail("");
    setPassword("");
    setSelectedPages(["/admin"]); // Dashboard access represents the base
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (member: any) => {
    setEditingStaffId(member.id);
    setEmail(member.email);
    setPassword(""); // Do not preload password
    setSelectedPages(member.allowed_pages || []);
    setIsModalOpen(true);
  };

  const handleTogglePage = (path: string) => {
    if (selectedPages.includes(path)) {
      setSelectedPages(selectedPages.filter(p => p !== path));
    } else {
      setSelectedPages([...selectedPages, path]);
    }
  };

  const handleSelectAll = () => {
    setSelectedPages(SIDEBAR_OPTIONS.map(opt => opt.path));
  };

  const handleClearAll = () => {
    setSelectedPages([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }
    if (!editingStaffId && !password) {
      toast.error("Password is required for new accounts");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        email: email.trim(),
        password: password || undefined,
        allowed_pages: selectedPages
      };

      if (editingStaffId) {
        const { data } = await api.put(`/admin/staff/${editingStaffId}`, payload);
        if (data.success) {
          toast.success("Staff details updated successfully!");
          setIsModalOpen(false);
          fetchStaffList();
        }
      } else {
        const { data } = await api.post("/admin/staff", payload);
        if (data.success) {
          toast.success("New Staff Officer registered successfully!");
          setIsModalOpen(false);
          fetchStaffList();
        }
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || "Operation failed";
      toast.error(msg);
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStaff = async (id: number) => {
    if (!confirm("Are you sure you want to delete this staff officer? This cannot be undone.")) {
      return;
    }

    try {
      const { data } = await api.delete(`/admin/staff/${id}`);
      if (data.success) {
        toast.success("Staff profile deleted successfully");
        fetchStaffList();
      }
    } catch (e: any) {
      const msg = e.response?.data?.message || "Failed to delete staff officer";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Upper header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <ShieldCheck size={24} className="stroke-[2.25]" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Staff & Officer Management
            </h1>
          </div>
          <p className="text-sm text-slate-500 font-medium">
            Provision, manage administrative credentials and dynamic sidebar access controls
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/15 hover:shadow-blue-600/25 transition-all text-sm"
        >
          <Plus size={16} />
          Create Staff Officer
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
          <p className="text-sm font-mono text-slate-500 font-bold uppercase tracking-wider">
            Loading administrative accounts...
          </p>
        </div>
      ) : staff.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm text-center p-6">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border border-slate-100">
            <Users size={32} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-black text-slate-800 tracking-tight">No Staff Officers Found</h3>
          <p className="text-sm text-slate-500 max-w-sm mt-1">
            Register your first administrator or co-officer to distribute placement workflow operations.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-slate-500" />
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                Authorized Officers ({staff.length})
              </h2>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
              Role-Based Access
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/30">
                  <th className="px-6 py-4">Officer Credentials</th>
                  <th className="px-6 py-4">Dashboard Access Pages</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Created Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-600">
                {staff.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-tr from-slate-100 to-slate-200/50 rounded-xl flex items-center justify-center text-slate-600 font-bold border border-slate-100">
                          {member.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{member.email}</p>
                          <span className="inline-flex items-center text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded-md mt-0.5 bg-blue-50 text-blue-600 border border-blue-100/50">
                            {member.id === 1 ? "Super Admin" : "Staff Officer"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 max-w-md">
                      {member.id === 1 ? (
                        <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold px-2.5 py-1 rounded-lg">
                          All Pages (Bypassed)
                        </span>
                      ) : member.allowed_pages && member.allowed_pages.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {SIDEBAR_OPTIONS.filter(opt => member.allowed_pages.includes(opt.path)).map((opt) => (
                            <span
                              key={opt.path}
                              className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200/50"
                            >
                              {opt.label}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-red-500 font-bold flex items-center gap-1">
                          <AlertTriangle size={14} />
                          No Sidebar Access Allowed
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        ACTIVE
                      </span>
                    </td>
                    <td className="px-6 py-5 font-mono text-xs text-slate-400">
                      {new Date(member.created_at).toLocaleDateString("en-US", {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(member)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit staff access configurations"
                        >
                          <Edit2 size={16} />
                        </button>
                        {member.id !== 1 && (
                          <button
                            onClick={() => handleDeleteStaff(member.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Revoke and delete account credentials"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slide-over Modal styled flawlessly */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-2xl overflow-hidden relative"
            >
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">
                    {editingStaffId ? "Edit Staff Permission Stack" : "Register New Staff Officer"}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Configure official portal keys and permitted system access ranges
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="divide-y divide-slate-100">
                {/* Credentials block */}
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <Mail size={13} />
                        Officer Email
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="officer.name@college.edu"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-800 font-semibold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <Lock size={13} />
                        Password {editingStaffId && "(Leave empty to keep current)"}
                      </label>
                      <input
                        type="password"
                        required={!editingStaffId}
                        placeholder={editingStaffId ? "••••••••" : "Temporary passwords details"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-800 font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* Permissions stack */}
                <div className="p-6 bg-slate-50/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1">
                        <Key size={14} className="text-slate-500" />
                        Accessible Sidebar Pages
                      </h4>
                      <p className="text-[11px] text-slate-400 font-medium">
                        Select which navigation blocks this officer is authorized to read & modify
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-100 transition-all"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={handleClearAll}
                        className="text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg border border-slate-250 transition-all"
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                    {SIDEBAR_OPTIONS.map((opt) => {
                      const isChecked = selectedPages.includes(opt.path);
                      return (
                        <div
                          key={opt.path}
                          onClick={() => handleTogglePage(opt.path)}
                          className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer select-none transition-all ${
                            isChecked
                              ? "bg-blue-50/50 border-blue-200 text-slate-900"
                              : "bg-white border-slate-200/60 text-slate-500 hover:border-slate-300"
                          }`}
                        >
                          <div className="mt-0.5 text-blue-600">
                            {isChecked ? <CheckSquare size={16} /> : <Square size={16} className="text-slate-300" />}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 leading-tight">{opt.label}</p>
                            <p className="text-[10px] text-slate-400 leading-normal mt-0.5">{opt.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Actions block */}
                <div className="px-6 py-4 flex items-center justify-end gap-3 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/15 transition-all flex items-center gap-2"
                  >
                    {saving && <Loader2 size={14} className="animate-spin" />}
                    {editingStaffId ? "Save Permissions" : "Register Officer"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
