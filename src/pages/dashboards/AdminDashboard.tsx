import { useState, useEffect } from "react";
import { 
  Shield, CheckCircle, XCircle, ExternalLink, Users, 
  Briefcase, Activity, BarChart3, Trash2, Search,
  UserCheck, Building2, GraduationCap, FileText,
  AlertCircle, ChevronRight, Eye, ShieldAlert,
  Calendar, MapPin, Globe, Mail, Phone, Clock, Flame, Star, Server, 
  Database,
  ArrowUpRight, Coins, Plus, Pencil, Settings, CreditCard
} from "lucide-react";
import api from "../../services/api.ts";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../../context/AuthContext.tsx";

export function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"stats" | "verifications" | "students" | "companies" | "jobs" | "pricing">("stats");
  const [stats, setStats] = useState<any>(null);
  const [pending, setPending] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // --- XP & Dynamic Pricing Setup States ---
  const [configs, setConfigs] = useState<any[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(false);
  const [packages, setPackages] = useState<any[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<number | null>(null);
  const [pkgForm, setPkgForm] = useState({
    name: '',
    xp_amount: 100,
    price_inr: 49,
    is_popular: false,
    is_best_value: false
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === "stats") {
        const { data } = await api.get("/analytics/admin/metrics");
        setStats(data.data);
      } else if (activeTab === "verifications") {
        const { data } = await api.get("/admin/companies/pending");
        setPending(data.data);
      } else if (activeTab === "students" || activeTab === "companies") {
        const { data } = await api.get("/admin/users");
        setUsers(data.data);
      } else if (activeTab === "jobs") {
        const { data } = await api.get("/admin/jobs");
        setJobs(data.data);
      } else if (activeTab === "pricing") {
        fetchConfigs();
        fetchPackages();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchConfigs = async () => {
    setLoadingConfigs(true);
    try {
      const { data } = await api.get('/admin/config');
      if (data.success) {
        setConfigs(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingConfigs(false);
    }
  };

  const fetchPackages = async () => {
    setLoadingPackages(true);
    try {
      const { data } = await api.get('/admin/packages');
      if (data.success) {
        setPackages(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPackages(false);
    }
  };

  const handleSaveConfig = async (key: string, value: any) => {
    try {
      const { data } = await api.put(`/admin/config/${key}`, { value });
      if (data.success) {
        alert(`Config '${key}' updated successfully!`);
        fetchConfigs();
      }
    } catch (e) {
      console.error(e);
      alert("Failed to update config parameter");
    }
  };

  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPackage) {
        const { data } = await api.put(`/admin/packages/${editingPackage}`, pkgForm);
        if (data.success) {
          alert("Package updated successfully!");
          setShowPackageModal(false);
          fetchPackages();
        }
      } else {
        const { data } = await api.post('/admin/packages', pkgForm);
        if (data.success) {
          alert("Package added successfully!");
          setShowPackageModal(false);
          fetchPackages();
        }
      }
    } catch (e) {
      console.error(e);
      alert("Failed to save package");
    }
  };

  const handleDeletePackage = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this package?")) return;
    try {
      const { data } = await api.delete(`/admin/packages/${id}`);
      if (data.success) {
        alert("Package deleted successfully");
        fetchPackages();
      }
    } catch (e) {
      console.error(e);
      alert("Failed to delete package");
    }
  };

  const handleVerify = async (companyId: number, status: string) => {
    if (status === 'REJECTED' && !rejectionReason) {
      alert("Please provide a rejection reason");
      return;
    }
    try {
      await api.post("/admin/companies/verify", { 
        companyId, 
        status, 
        reason: rejectionReason,
        adminId: user?.id
      });
      setSelectedCompany(null);
      setRejectionReason("");
      fetchData();
    } catch (err) {
      alert("Action failed");
    }
  };

  const handleDeleteJob = async (jobId: number) => {
    if (!confirm("Are you sure you want to delete this job posting?")) return;
    try {
      await api.delete(`/admin/jobs/${jobId}`);
      fetchData();
    } catch (err) {
      alert("Delete failed");
    }
  };
  
  const handleUserStatus = async (userId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'BANNED' : 'ACTIVE';
    if (!confirm(`Are you sure you want to ${newStatus === 'BANNED' ? 'ban' : 'unban'} this user?`)) return;
    try {
      await api.patch(`/admin/users/${userId}/status`, { status: newStatus });
      fetchData();
    } catch (err) {
      alert("Status update failed");
    }
  };

  const openCompanyDetails = async (company: any) => {
    setLoading(true);
    try {
       const { data } = await api.get(`/admin/companies/${company.id}/details`);
       if (data.success) {
          setSelectedCompany(data.data);
       }
    } catch (e) {
       alert("Failed to load details");
    } finally {
       setLoading(false);
    }
  };

  const openCompanyAudit = async (profileId: number) => {
    setLoading(true);
    try {
       const { data } = await api.get(`/admin/companies/${profileId}/details`);
       if (data.success) {
          setSelectedCompany(data.data);
       }
    } catch (e) {
       alert("Failed to load details");
    } finally {
       setLoading(false);
    }
  };

  const openStudentAudit = async (profileId: number) => {
    setLoading(true);
    try {
       const { data } = await api.get(`/admin/students/${profileId}/details`);
       if (data.success) {
          setSelectedStudent(data.data);
       }
    } catch (e) {
       alert("Failed to load details");
    } finally {
       setLoading(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const isSearchMatch = u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.company_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (u.student_name?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    
    if (activeTab === "students") return isSearchMatch && u.role === "STUDENT";
    if (activeTab === "companies") return isSearchMatch && u.role === "COMPANY";
    return isSearchMatch;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <div className="p-6 md:p-8 flex-1 max-w-[1600px] mx-auto w-full">
        <header className="bg-white border text-sm border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-6 z-10 shadow-sm rounded-lg mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-900 rounded-[4px] border border-slate-700 flex items-center justify-center text-white">
              <Server size={14} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 tracking-tight leading-tight">Enterprise Console</h2>
              <div className="flex items-center gap-1.5">
                 <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                 <span className="text-[10px] font-mono text-slate-500 tracking-widest uppercase">System.Online</span>
              </div>
            </div>
          </div>

          <nav className="flex gap-1 overflow-x-auto custom-scrollbar pb-1 md:pb-0">
            <TabButton label="Overview" active={activeTab === "stats"} onClick={() => setActiveTab("stats")} icon={<Activity size={14} />} />
            <TabButton label="Verifications" active={activeTab === "verifications"} onClick={() => setActiveTab("verifications")} icon={<ShieldAlert size={14} />} />
            <TabButton label="Students" active={activeTab === "students"} onClick={() => setActiveTab("students")} icon={<GraduationCap size={14} />} />
            <TabButton label="Companies" active={activeTab === "companies"} onClick={() => setActiveTab("companies")} icon={<Building2 size={14} />} />
            <TabButton label="Jobs Admin" active={activeTab === "jobs"} onClick={() => setActiveTab("jobs")} icon={<Briefcase size={14} />} />
            <TabButton label="Pricing & XP Setup" active={activeTab === "pricing"} onClick={() => setActiveTab("pricing")} icon={<Coins size={14} />} />
          </nav>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === "stats" && (
            <motion.div 
              key="stats"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                 <h3 className="text-base font-semibold text-slate-800">Platform Metrics</h3>
                 <span className="text-xs text-slate-500 font-mono">Live updating...</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatItem label="TOTAL ACCOUNTS" value={stats?.totalStudents + stats?.totalCompanies || 0} icon={<Users size={16} className="text-slate-400" />} />
                <StatItem label="TALENT POOL" value={stats?.totalStudents || 0} icon={<GraduationCap size={16} className="text-slate-400" />} />
                <StatItem label="AVG TALENT SCORE" value={stats?.averageTalentScore || 0} icon={<Star size={16} className="text-slate-400" />} />
                <StatItem label="DAILY ACTIVE" value={stats?.activeToday || 0} icon={<Flame size={16} className="text-slate-400" />} />
                <StatItem label="LIVE JOBS" value={stats?.totalJobs || 0} icon={<Briefcase size={16} className="text-slate-400" />} />
                <StatItem label="APPLICATIONS" value={stats?.totalApplications || 0} icon={<FileText size={16} className="text-slate-400" />} />
                <StatItem label="INTERVIEW AVG" value={stats?.averageInterviewScore || 0} icon={<CheckCircle size={16} className="text-slate-400" />} />
                <StatItem label="SYSTEM HEALTH" value="100%" icon={<Activity size={16} className="text-emerald-500" />} />
              </div>
            </motion.div>
          )}

          {activeTab === "verifications" && (
            <motion.div 
              key="verifications"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <h3 className="text-base font-semibold text-slate-800">Pending Corporate Approvals</h3>
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-medium">
                      <tr>
                        <th className="px-6 py-3 uppercase tracking-wider">Company Identity</th>
                        <th className="px-6 py-3 uppercase tracking-wider border-l border-slate-200">Registration Det.</th>
                        <th className="px-6 py-3 uppercase tracking-wider border-l border-slate-200">Profile Complete</th>
                        <th className="px-6 py-3 uppercase tracking-wider text-right border-l border-slate-200">Audit Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pending.length > 0 ? pending.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-4">
                             <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-white border border-slate-200 rounded p-1 flex items-center justify-center overflow-hidden shrink-0">
                                   {c.logo_url ? <img src={c.logo_url} className="w-full h-full object-contain" /> : <Building2 size={16} className="text-slate-400" />}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-slate-900 truncate">{c.company_name}</div>
                                  <div className="text-xs text-slate-500 truncate mt-0.5">{c.email}</div>
                                </div>
                             </div>
                          </td>
                          <td className="px-6 py-4 border-l border-slate-100 text-xs text-slate-600">
                            <div className="space-y-1 font-mono">
                               <div><span className="text-slate-400">GST:</span> {c.gst_no || '---'}</div>
                               <div><span className="text-slate-400">CIN:</span> {c.cin_no || '---'}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 border-l border-slate-100">
                             <div className="flex items-center gap-3">
                                <span className="text-xs font-mono text-slate-700 w-8">{c.completeness_score}%</span>
                                <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                   <div className="h-full bg-slate-800" style={{ width: `${c.completeness_score}%` }} />
                                </div>
                             </div>
                          </td>
                          <td className="px-6 py-4 border-l border-slate-100 text-right">
                             <button 
                               onClick={() => openCompanyDetails(c)}
                               className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 rounded text-xs font-medium hover:bg-indigo-50 transition-colors"
                             >
                               <Eye size={14} /> Review Audit
                             </button>
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500 text-sm">
                           No pending verifications found.
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {(activeTab === "students" || activeTab === "companies") && (
            <motion.div 
               key="users"
               initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
               className="space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <h3 className="text-base font-semibold text-slate-800">User Registry: {activeTab === "students" ? "Candidates" : "Firms"}</h3>
                 <div className="flex items-center gap-3 bg-white px-3 py-2 border border-slate-200 rounded-md w-full sm:w-64 focus-within:ring-2 focus-within:ring-slate-100 focus-within:border-slate-300 transition-all">
                   <Search size={16} className="text-slate-400 shrink-0" />
                   <input 
                     type="text" 
                     placeholder="Search records..." 
                     className="flex-1 bg-transparent outline-none text-sm placeholder:text-slate-400"
                     value={searchTerm}
                     onChange={e => setSearchTerm(e.target.value)}
                   />
                 </div>
              </div>

              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-medium">
                      <tr>
                        <th className="px-6 py-3 uppercase tracking-wider">Account ID / Name</th>
                        <th className="px-6 py-3 uppercase tracking-wider border-l border-slate-200">Email</th>
                        <th className="px-6 py-3 uppercase tracking-wider border-l border-slate-200">Joined Date</th>
                        <th className="px-6 py-3 uppercase tracking-wider border-l border-slate-200">Status</th>
                        <th className="px-6 py-3 uppercase tracking-wider text-right border-l border-slate-200">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-3">
                               <div className="font-mono text-xs text-slate-400 w-8">#{u.id}</div>
                               <div className="font-semibold text-slate-900 truncate max-w-[200px]">
                                  {u.student_name || u.company_name || "---"}
                               </div>
                               {u.role === 'COMPANY' && u.company_profile_id && (
                                   <button onClick={() => openCompanyAudit(u.company_profile_id)} className="text-indigo-600 hover:text-indigo-800 ml-2" title="View Profile"><ArrowUpRight size={14}/></button>
                               )}
                               {u.role === 'STUDENT' && u.student_profile_id && (
                                   <button onClick={() => openStudentAudit(u.student_profile_id)} className="text-indigo-600 hover:text-indigo-800 ml-2" title="View Profile"><ArrowUpRight size={14}/></button>
                               )}
                            </div>
                          </td>
                          <td className="px-6 py-3 border-l border-slate-100 text-slate-600 truncate max-w-[200px]">
                             {u.email}
                          </td>
                          <td className="px-6 py-3 border-l border-slate-100 text-slate-500 font-mono text-xs">
                             {new Date(u.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-3 border-l border-slate-100">
                             <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${u.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                               {u.status}
                             </span>
                          </td>
                          <td className="px-6 py-3 border-l border-slate-100 text-right">
                             <button 
                               onClick={() => handleUserStatus(u.id, u.status)}
                               className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${u.status === 'ACTIVE' ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                             >
                               {u.status === 'ACTIVE' ? 'Ban' : 'Unban'}
                             </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "jobs" && (
            <motion.div 
               key="jobs"
               initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
               className="space-y-4"
            >
              <h3 className="text-base font-semibold text-slate-800">Job Catalog Administration</h3>
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-medium">
                      <tr>
                        <th className="px-6 py-3 uppercase tracking-wider">Job Title</th>
                        <th className="px-6 py-3 uppercase tracking-wider border-l border-slate-200">Company</th>
                        <th className="px-6 py-3 uppercase tracking-wider border-l border-slate-200">Posted At</th>
                        <th className="px-6 py-3 uppercase tracking-wider text-right border-l border-slate-200">Controls</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {jobs.map(j => (
                        <tr key={j.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-4 font-semibold text-slate-900 border-l border-slate-100">
                             {j.title}
                          </td>
                          <td className="px-6 py-4 border-l border-slate-100 text-slate-600 font-medium">
                             {j.company_name}
                          </td>
                          <td className="px-6 py-4 border-l border-slate-100 font-mono text-xs text-slate-500">
                             {new Date(j.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 border-l border-slate-100 text-right">
                            <button 
                              onClick={() => handleDeleteJob(j.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors inline-block"
                              title="Delete Post"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "pricing" && (
            <motion.div
              key="pricing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-800">Dynamic Pricing & XP Setup</h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">Configure global rewards values, feature operation costs, and purchase bundles dynamically</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-mono bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">Security clearance context verified</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* CONFIGURATIONS EDITOR */}
                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-6 flex flex-col">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3 shrink-0">
                    <Settings size={15} className="text-slate-500" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">System Parameters Rates</h4>
                  </div>
                  
                  {loadingConfigs ? (
                    <div className="flex items-center justify-center py-12 flex-1">
                      <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-4 flex-1">
                      {configs.map((config) => (
                        <div key={config.config_key} className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between sm:flex-row sm:items-center gap-4 transition-all hover:bg-slate-100/50">
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-indigo-600 font-mono">{config.config_key.replace(/_/g, ' ')}</span>
                            <p className="text-xs text-slate-500 font-semibold">{config.description || 'System constant value'}</p>
                          </div>
                          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                            <input
                              type="number"
                              className="w-20 px-2 py-1.5 text-xs text-slate-900 font-mono font-bold border border-slate-300 rounded text-center bg-white"
                              value={config.config_value}
                              onChange={(e) => {
                                setConfigs(prev => prev.map(c => c.config_key === config.config_key ? { ...c, config_value: e.target.value } : c));
                              }}
                            />
                            <button
                              onClick={() => handleSaveConfig(config.config_key, config.config_value)}
                              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[10px] uppercase rounded transition-colors"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* PACKAGE MANAGEMENT */}
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <CreditCard size={15} className="text-slate-500" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">VEGA Rewards Purchase Config Cards</h4>
                    </div>
                    <button
                      onClick={() => {
                        setEditingPackage(null);
                        setPkgForm({ name: '', xp_amount: 100, price_inr: 49, is_popular: false, is_best_value: false });
                        setShowPackageModal(true);
                      }}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      <Plus size={14} /> Add package card
                    </button>
                  </div>

                  {loadingPackages ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : packages.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs font-medium">No packages configured. Click "Add package card" to make the first bundle packaging.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {packages.map((pkg) => (
                        <div key={pkg.id} className={`p-5 rounded-lg border relative flex flex-col justify-between transition-all hover:border-slate-400 hover:shadow-sm ${pkg.is_popular ? 'border-amber-400 bg-amber-50/10' : pkg.is_best_value ? 'border-indigo-400 bg-indigo-50/10' : 'border-slate-200 bg-white'}`}>
                          {pkg.is_popular ? (
                            <span className="absolute -top-2 right-4 bg-amber-500 text-white text-[8px] font-black tracking-widest px-2 py-0.5 rounded uppercase">Popular</span>
                          ) : pkg.is_best_value ? (
                            <span className="absolute -top-2 right-4 bg-indigo-600 text-white text-[8px] font-black tracking-widest px-2 py-0.5 rounded uppercase">Best Value</span>
                          ) : null}

                          <div className="space-y-2">
                            <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 font-mono">Dynamic bundle</span>
                            <h5 className="text-sm font-bold text-slate-900 leading-snug">{pkg.name}</h5>
                            <div className="flex items-baseline gap-1 mt-1">
                              <span className="text-2xl font-mono font-medium text-slate-900">{pkg.xp_amount}</span>
                              <span className="text-[10px] uppercase font-bold text-slate-500">XP Points</span>
                            </div>
                            <p className="text-xs text-slate-600 font-semibold">Store Face price: <span className="font-mono font-bold text-slate-950">₹{pkg.price_inr}</span></p>
                          </div>

                          <div className="flex items-center gap-2 mt-5 border-t border-slate-100 pt-3 justify-end">
                            <button
                              onClick={() => {
                                setEditingPackage(pkg.id);
                                setPkgForm({ name: pkg.name, xp_amount: pkg.xp_amount, price_inr: pkg.price_inr, is_popular: !!pkg.is_popular, is_best_value: !!pkg.is_best_value });
                                setShowPackageModal(true);
                              }}
                              className="text-slate-500 hover:text-indigo-600 p-1.5 bg-slate-50 hover:bg-slate-100 rounded transition-colors"
                              title="Edit"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => handleDeletePackage(pkg.id)}
                              className="text-slate-400 hover:text-red-600 p-1.5 bg-slate-50 hover:bg-red-50 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Verification / Review Modals */}
      <AnimatePresence>
         {selectedCompany && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm font-sans pt-16">
               <motion.div 
                 initial={{ opacity: 0, scale: 0.95, y: 20 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.95, y: 20 }}
                 className="bg-white border border-slate-200 rounded-lg shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
               >
                  <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50">
                     <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-white border border-slate-200 rounded p-1 flex items-center justify-center">
                            {selectedCompany.logo_url ? <img src={selectedCompany.logo_url} className="w-full h-full object-contain" /> : <Building2 size={24} className="text-slate-300" />}
                         </div>
                         <div>
                            <h3 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">{selectedCompany.company_name}</h3>
                            <div className="text-xs text-slate-500 font-medium mt-1">
                               {selectedCompany.company_type} • {selectedCompany.industry}
                            </div>
                         </div>
                     </div>
                     <button onClick={() => setSelectedCompany(null)} className="p-2 hover:bg-slate-200 rounded text-slate-500 transition-colors">
                        <XCircle size={20} />
                     </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-white custom-scrollbar text-sm">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                           <ModalSectionTitle label="Identity Verification" />
                           <div className="grid grid-cols-2 gap-y-4 gap-x-2 mt-4">
                              <InfoLabel label="Official Website" value={selectedCompany.website} />
                              <InfoLabel label="Official Email" value={selectedCompany.company_email} />
                              <InfoLabel label="Contact No" value={selectedCompany.contact_number} />
                              <InfoLabel label="PAN Number" value={selectedCompany.pan_no} />
                           </div>
                        </div>

                        <div>
                           <ModalSectionTitle label="Regulatory Compliance" />
                           <div className="grid grid-cols-2 gap-y-4 gap-x-2 mt-4">
                              <InfoLabel label="Registered Name" value={selectedCompany.business_name} />
                              <InfoLabel label="GST Identification" value={selectedCompany.gst_no} />
                              <InfoLabel label="Corp. ID (CIN)" value={selectedCompany.cin_no} />
                              <InfoLabel label="Established" value={selectedCompany.year_established} />
                           </div>
                        </div>

                        <div className="md:col-span-2">
                           <ModalSectionTitle label="Registered Location" />
                           <div className="mt-2 text-slate-700 bg-slate-50 p-4 rounded border border-slate-200 italic font-medium">
                              {selectedCompany.address}
                           </div>
                        </div>

                        <div className="md:col-span-2">
                           <ModalSectionTitle label="Uploaded Evidence" />
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                              {selectedCompany.documents?.length > 0 ? selectedCompany.documents.map((doc: any) => (
                                <a 
                                  key={doc.id} 
                                  href={doc.doc_url} 
                                  target="_blank" 
                                  className="p-3 bg-white border border-slate-200 rounded flex items-center justify-between hover:border-indigo-400 hover:shadow-sm transition-all group"
                                >
                                   <div className="flex items-center gap-2">
                                      <FileText size={16} className="text-indigo-600" />
                                      <span className="text-xs font-semibold text-slate-700 group-hover:text-indigo-700 uppercase">{doc.doc_type}</span>
                                   </div>
                                   <ExternalLink size={14} className="text-slate-400 group-hover:text-indigo-600" />
                                </a>
                              )) : (
                                <span className="text-slate-500 italic text-xs font-mono">No documents attached</span>
                              )}
                           </div>
                        </div>
                     </div>
                  </div>

                  {activeTab === 'verifications' && (
                    <div className="px-6 py-5 border-t border-slate-200 bg-slate-50/80 shrink-0">
                       <div className="flex flex-col md:flex-row gap-4 items-end">
                          <div className="flex-1 w-full">
                             <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Audit Decision Notes / Reason</label>
                             <input 
                                type="text"
                                placeholder="E.g. Document missing or Approved successfully..." 
                                className="w-full bg-white border border-slate-300 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 text-sm"
                                value={rejectionReason}
                                onChange={e => setRejectionReason(e.target.value)}
                             />
                          </div>
                          <div className="flex gap-2 w-full md:w-auto">
                             <button 
                               onClick={() => handleVerify(selectedCompany.id, 'REJECTED')}
                               className="flex-1 md:flex-none px-5 py-2.5 bg-white text-red-600 border border-slate-300 hover:border-red-300 hover:bg-red-50 rounded text-sm font-semibold transition-colors"
                             >
                               Reject
                             </button>
                             <button 
                               onClick={() => handleVerify(selectedCompany.id, 'APPROVED')}
                               className="flex-1 md:flex-none px-5 py-2.5 bg-slate-900 border border-transparent text-white hover:bg-slate-800 rounded text-sm font-semibold transition-colors shadow-sm"
                             >
                               Approve Corp
                             </button>
                          </div>
                       </div>
                    </div>
                  )}
               </motion.div>
            </div>
         )}
         
         {selectedStudent && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm font-sans pt-16">
               <motion.div 
                 initial={{ opacity: 0, scale: 0.95, y: 20 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.95, y: 20 }}
                 className="bg-white border border-slate-200 rounded-lg shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
               >
                  <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50">
                     <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-white border border-slate-200 rounded p-0.5 flex items-center justify-center overflow-hidden">
                            {selectedStudent.profile_photo_url ? <img src={selectedStudent.profile_photo_url} className="w-full h-full object-cover rounded-sm" /> : <GraduationCap size={24} className="text-slate-300" />}
                         </div>
                         <div>
                            <h3 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">{selectedStudent.full_name}</h3>
                            <div className="text-xs text-slate-500 font-medium mt-1">
                               {selectedStudent.degree} • {selectedStudent.college || 'College Unspecified'}
                            </div>
                         </div>
                     </div>
                     <button onClick={() => setSelectedStudent(null)} className="p-2 hover:bg-slate-200 rounded text-slate-500 transition-colors">
                        <XCircle size={20} />
                     </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-white custom-scrollbar text-sm">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="md:col-span-2 space-y-6">
                           <div>
                              <ModalSectionTitle label="Summary Bio" />
                              <div className="mt-2 text-slate-700 bg-slate-50 p-4 rounded border border-slate-200 italic font-medium">
                                 {selectedStudent.bio || 'Candidate has not provided a bio narrative.'}
                              </div>
                           </div>

                           <div>
                              <ModalSectionTitle label="Key Skills" />
                              <div className="mt-3 flex flex-wrap gap-2">
                                 {(() => {
                                   try {
                                     let skills = [];
                                     const skillsData = selectedStudent.skills_json;
                                     if (Array.isArray(skillsData)) {
                                       skills = skillsData;
                                     } else if (typeof skillsData === 'string') {
                                       if (skillsData.startsWith('[') && skillsData.endsWith(']')) {
                                         skills = JSON.parse(skillsData);
                                       } else {
                                         skills = skillsData.split(',').map((s: string) => s.trim()).filter(Boolean);
                                       }
                                     }
                                     return skills.length > 0 ? skills.map((s: any, idx: number) => {
                                       const skillName = typeof s === 'string' ? s : (s.name || "");
                                       if (!skillName) return null;
                                       return (
                                         <span key={idx} className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded text-xs font-mono">
                                            {skillName}
                                         </span>
                                       );
                                     }) : <span className="text-slate-400 italic text-xs font-mono">No skills listed</span>;
                                   } catch (e) {
                                     return <span className="text-red-400 italic text-xs font-mono">Error parsing skills JSON</span>;
                                   }
                                 })()}
                              </div>
                           </div>
                        </div>

                        <div>
                           <ModalSectionTitle label="Contact & Links" />
                           <div className="grid grid-cols-1 gap-y-4 gap-x-2 mt-4">
                              <InfoLabel label="Account Email" value={selectedStudent.email} />
                              <InfoLabel label="Phone" value={selectedStudent.phone} />
                              <div className="flex gap-4">
                                {selectedStudent.github_url && <a href={selectedStudent.github_url} target="_blank" className="text-indigo-600 hover:underline">GitHub</a>}
                                {selectedStudent.linkedin_url && <a href={selectedStudent.linkedin_url} target="_blank" className="text-indigo-600 hover:underline">LinkedIn</a>}
                              </div>
                           </div>
                        </div>

                        <div>
                           <ModalSectionTitle label="Academic Record" />
                           <div className="grid grid-cols-1 gap-y-4 gap-x-2 mt-4">
                              <InfoLabel label="Degree" value={selectedStudent.degree} />
                              <InfoLabel label="Graduation Year" value={selectedStudent.graduation_year} />
                           </div>
                        </div>
                     </div>
                  </div>
               </motion.div>
            </div>
         )}

          {showPackageModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm font-sans pt-16">
               <motion.div 
                 initial={{ opacity: 0, scale: 0.95, y: 20 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.95, y: 20 }}
                 className="bg-white border border-slate-200 rounded-lg shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
               >
                  <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50">
                     <h3 className="text-sm font-bold text-slate-900 tracking-tight leading-tight">{editingPackage ? 'Edit Bundle Card' : 'Create New Bundle Card'}</h3>
                     <button onClick={() => setShowPackageModal(false)} className="p-2 hover:bg-slate-200 rounded text-slate-500 transition-colors">
                        <XCircle size={18} />
                     </button>
                  </div>

                  <form onSubmit={handleSavePackage} className="p-6 space-y-4 text-sm bg-white">
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Package Name</label>
                        <input
                           type="text"
                           required
                           placeholder="Starter Pack / Value Pack / etc"
                           value={pkgForm.name}
                           onChange={(e) => setPkgForm(prev => ({ ...prev, name: e.target.value }))}
                           className="w-full border border-slate-300 rounded px-3 py-2 text-xs font-semibold"
                        />
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">XP Reward amount</label>
                           <input
                              type="number"
                              required
                              value={pkgForm.xp_amount}
                              onChange={(e) => setPkgForm(prev => ({ ...prev, xp_amount: Number(e.target.value) }))}
                              className="w-full border border-slate-300 rounded px-3 py-2 text-xs font-mono font-medium"
                           />
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">INR Price (₹)</label>
                           <input
                              type="number"
                              required
                              value={pkgForm.price_inr}
                              onChange={(e) => setPkgForm(prev => ({ ...prev, price_inr: Number(e.target.value) }))}
                              className="w-full border border-slate-300 rounded px-3 py-2 text-xs font-mono font-medium"
                           />
                        </div>
                     </div>

                     <div className="pt-2 flex flex-col gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                           <input
                              type="checkbox"
                              checked={pkgForm.is_popular}
                              onChange={(e) => setPkgForm(prev => ({ ...prev, is_popular: e.target.checked, is_best_value: e.target.checked ? false : prev.is_best_value }))}
                              className="rounded border-slate-300 pointer-events-auto"
                           />
                           <span className="text-xs text-slate-600 font-semibold select-none">Mark as "Popular" Bundle</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                           <input
                              type="checkbox"
                              checked={pkgForm.is_best_value}
                              onChange={(e) => setPkgForm(prev => ({ ...prev, is_best_value: e.target.checked, is_popular: e.target.checked ? false : prev.is_popular }))}
                              className="rounded border-slate-300 pointer-events-auto"
                           />
                           <span className="text-xs text-slate-600 font-semibold select-none">Mark as "Best Value" Bundle</span>
                        </label>
                     </div>

                     <div className="pt-4 flex justify-end gap-2 shrink-0 border-t border-slate-100">
                        <button
                           type="button"
                           onClick={() => setShowPackageModal(false)}
                           className="px-4 py-2 border border-slate-200 text-slate-600 hover:text-slate-900 rounded text-xs font-semibold transition-colors"
                        >
                           Cancel
                        </button>
                        <button
                           type="submit"
                           className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold shadow transition-colors"
                        >
                           {editingPackage ? 'Update Bundle' : 'Create Bundle'}
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

function StatItem({ label, value, icon }: { label: string, value: any, icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
       <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
          <div>{icon}</div>
       </div>
       <div className="text-3xl font-mono font-medium tracking-tight text-slate-900">{value}</div>
    </div>
  );
}

function TabButton({ label, active, onClick, icon }: { label: string, active: boolean, onClick: () => void, icon: React.ReactNode }) {
  return (
    <button 
      onClick={onClick}
      className={`px-4 py-2 rounded-md text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap ${active ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
    >
      {icon} {label}
    </button>
  );
}

function ModalSectionTitle({ label }: { label: string }) {
  return (
    <div className="border-b border-slate-200 pb-2 mb-2">
       <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</h4>
    </div>
  );
}

function InfoLabel({ label, value }: { label: string, value: any }) {
  return (
    <div className="flex flex-col">
       <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
       <span className="text-xs font-medium text-slate-800 break-words font-mono mt-0.5">{value || '---'}</span>
    </div>
  );
}

export default AdminDashboard;
