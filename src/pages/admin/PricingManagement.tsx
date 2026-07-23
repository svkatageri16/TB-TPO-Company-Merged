import React, { useState, useEffect } from "react";
import { 
  Coins, 
  Plus, 
  Pencil, 
  Settings, 
  CreditCard, 
  Trash2, 
  X, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Award,
  BookOpen,
  Check,
  Search,
  Sliders,
  Send,
  Eye,
  Trash,
  HelpCircle
} from "lucide-react";
import api from "../../services/api";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";

export function PricingManagement() {
  const [currentTab, setCurrentTab] = useState<"rates" | "community">("rates");
  
  // Tab 1: Rates & Packages States
  const [configs, setConfigs] = useState<any[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(true);
  const [packages, setPackages] = useState<any[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);

  const [showPackageModal, setShowPackageModal] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState<number | null>(null);
  const [savingPackage, setSavingPackage] = useState(false);

  const [pkgForm, setPkgForm] = useState({
    name: "",
    xp_amount: 100,
    price_inr: 49,
    mock_interviews_included: 1,
    resume_reviews_included: 2,
    is_popular: false,
    is_best_value: false
  });

  // Tab 2: Community & XP Management States
  const [posts, setPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postSearch, setPostSearch] = useState("");
  
  // Scoring Modal
  const [editingPostScore, setEditingPostScore] = useState<any | null>(null);
  const [scoreForm, setScoreForm] = useState({
    content_score: 80,
    quality_analysis: ""
  });
  const [savingScore, setSavingScore] = useState(false);

  // XP Award Modal
  const [showAwardModal, setShowAwardModal] = useState<{ userId: number; userName: string; postTitle?: string } | null>(null);
  const [awardForm, setAwardForm] = useState({
    amount: 100,
    description: "Incentive bonus for exceptional community contribution"
  });
  const [savingAward, setSavingAward] = useState(false);

  // Initialize
  useEffect(() => {
    fetchConfigs();
    fetchPackages();
  }, []);

  useEffect(() => {
    if (currentTab === "community") {
      fetchCommunityPosts();
    }
  }, [currentTab]);

  // Fetch configs
  const fetchConfigs = async () => {
    setLoadingConfigs(true);
    try {
      const { data } = await api.get("/admin/config");
      if (data.success) {
        setConfigs(data.data || []);
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to load system configs");
    } finally {
      setLoadingConfigs(false);
    }
  };

  // Fetch Packages
  const fetchPackages = async () => {
    setLoadingPackages(true);
    try {
      const { data } = await api.get("/admin/packages");
      if (data.success) {
        setPackages(data.data || []);
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to load XP packages");
    } finally {
      setLoadingPackages(false);
    }
  };

  // Fetch community posts
  const fetchCommunityPosts = async () => {
    setLoadingPosts(true);
    try {
      const { data } = await api.get("/admin/community/posts");
      if (data.success) {
        setPosts(data.posts || []);
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to fetch community posts");
    } finally {
      setLoadingPosts(false);
    }
  };

  // Edit config
  const handleSaveConfig = async (key: string, value: any) => {
    try {
      const { data } = await api.put(`/admin/config/${key}`, { value });
      if (data.success) {
        toast.success(`Parameter '${key}' updated successfully`);
        fetchConfigs();
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to update parameter");
    }
  };

  // Save packages
  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPackage(true);
    try {
      if (editingPackageId) {
        const { data } = await api.put(`/admin/packages/${editingPackageId}`, pkgForm);
        if (data.success) {
          toast.success("Package card updated successfully");
          setShowPackageModal(false);
          fetchPackages();
        }
      } else {
        const { data } = await api.post("/admin/packages", pkgForm);
        if (data.success) {
          toast.success("New package card created successfully");
          setShowPackageModal(false);
          fetchPackages();
        }
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to save package card");
    } finally {
      setSavingPackage(false);
    }
  };

  // Delete Package
  const handleDeletePackage = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this XP package?")) return;
    try {
      const { data } = await api.delete(`/admin/packages/${id}`);
      if (data.success) {
        toast.success("Package deleted successfully");
        fetchPackages();
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to delete package");
    }
  };

  // Toggle Post Verification
  const handleToggleVerification = async (postId: number, currentVerified: boolean) => {
    const nextVerified = !currentVerified;
    const confirmMsg = nextVerified 
      ? "Verify this story? This will double-verify the content and grant a +100 XP verification bonus directly to the student."
      : "Revoke verification status for this experience article?";
    if (!window.confirm(confirmMsg)) return;

    try {
      const { data } = await api.put(`/admin/community/posts/${postId}/verify`, {
        is_verified: nextVerified,
        send_reward: nextVerified
      });
      if (data.success) {
        toast.success(data.message);
        fetchCommunityPosts();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Verification adjustment failed.");
    }
  };

  // Update Score
  const handleSaveScoreForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPostScore) return;
    setSavingScore(true);
    try {
      const { data } = await api.put(`/admin/community/posts/${editingPostScore.id}/update-score`, {
        content_score: Number(scoreForm.content_score),
        quality_analysis: scoreForm.quality_analysis
      });
      if (data.success) {
        toast.success(data.message || "Metrics updated successfully");
        setEditingPostScore(null);
        fetchCommunityPosts();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Score preservation failed");
    } finally {
      setSavingScore(false);
    }
  };

  // Save Award XP
  const handleSaveAwardXP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAwardModal) return;
    setSavingAward(true);
    try {
      const { data } = await api.post(`/admin/community/users/${showAwardModal.userId}/grant-xp`, {
        amount: Number(awardForm.amount),
        description: awardForm.description
      });
      if (data.success) {
        toast.success(data.message || "XP award processed!");
        setShowAwardModal(null);
        setAwardForm({ amount: 100, description: "Incentive bonus for exceptional community contribution" });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Direct XP allocation crashed");
    } finally {
      setSavingAward(false);
    }
  };

  // Delete Post
  const handleDeletePost = async (postId: number) => {
    if (!window.confirm("Are you sure you want to delete this placement story permanent? This cannot be undone.")) return;
    try {
      const { data } = await api.delete(`/admin/community/posts/${postId}`);
      if (data.success) {
        toast.success(data.message || "Post removed successfully");
        fetchCommunityPosts();
      }
    } catch (err: any) {
      toast.error("Failed to delete post");
    }
  };

  // Filter posts list
  const filteredPosts = posts.filter(p => {
    if (!postSearch) return true;
    const term = postSearch.toLowerCase();
    return (
      (p.title || "").toLowerCase().includes(term) ||
      (p.creator_name || "").toLowerCase().includes(term) ||
      (p.company_name || "").toLowerCase().includes(term) ||
      (p.tags || "").toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-8 font-sans max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* Dynamic Title Header Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
            <Sliders className="text-blue-600" />
            Config & XP Dashboard
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-1">
            Configure XP parameters, package pricing, reward structures, and moderate peer placement stories.
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 text-[10px] uppercase font-bold tracking-widest text-slate-500 rounded font-mono">
          <CheckCircle2 size={12} className="text-emerald-600" />
          <span>Security Clearance Level 4</span>
        </div>
      </div>

      {/* Primary Workspace Navigation Tabs Switcher */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setCurrentTab("rates")}
          className={`px-5 py-3 text-sm font-black border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            currentTab === "rates"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-400 hover:text-slate-800"
          }`}
        >
          <Coins size={16} />
          XP Setup & Purchase Packages
        </button>
        <button
          onClick={() => setCurrentTab("community")}
          className={`px-5 py-3 text-sm font-black border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            currentTab === "community"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-400 hover:text-slate-800"
          }`}
        >
          <Award size={16} className="text-amber-500" />
          Student Community XP Desk
          <span className="text-[9px] bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
            Incentives & Moderation
          </span>
        </button>
      </div>

      {currentTab === "rates" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* CONFIGURATIONS EDITOR */}
          <div className="lg:col-span-5 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col h-fit">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-6">
              <Settings size={18} className="text-blue-600" />
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Dynamic Operating Parameters</h4>
            </div>
            
            {loadingConfigs ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : configs.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs font-semibold">
                No configurations found under system_configs.
              </div>
            ) : (
              <div className="space-y-6">
                {/* Divide parameters into core and community */}
                <div className="space-y-3">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider flex items-center gap-1">
                    🎯 Core Operation Rates
                  </span>
                  {configs.filter(c => !c.config_key.startsWith("COMMUNITY_")).map((config) => (
                    <div 
                      key={config.config_key} 
                      className="p-3.5 bg-slate-50 border border-slate-100/80 rounded-2xl flex flex-col justify-between sm:flex-row sm:items-center gap-3 transition-all hover:bg-slate-100/50"
                    >
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-extrabold text-slate-700 font-mono">
                          {config.config_key.replace(/_/g, " ")}
                        </span>
                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                          {config.description || "System rate value"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                        <input
                          type="number"
                          className="w-18 px-2 py-1 text-xs text-slate-900 font-mono font-bold border border-slate-200 rounded-lg text-center bg-white focus:border-blue-500 outline-none"
                          value={config.config_value}
                          onChange={(e) => {
                            const val = e.target.value;
                            setConfigs(prev => prev.map(c => c.config_key === config.config_key ? { ...c, config_value: val } : c));
                          }}
                        />
                        <button
                          onClick={() => handleSaveConfig(config.config_key, config.config_value)}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[9px] uppercase rounded-lg transition-all"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <span className="text-[10px] uppercase font-black text-amber-600 tracking-wider flex items-center gap-1">
                    ✨ Community Creator Incentive Setup
                  </span>
                  {configs.filter(c => c.config_key.startsWith("COMMUNITY_")).map((config) => (
                    <div 
                      key={config.config_key} 
                      className="p-3.5 bg-amber-50/20 border border-amber-100/50 rounded-2xl flex flex-col justify-between sm:flex-row sm:items-center gap-3 transition-all hover:bg-amber-50/40"
                    >
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-extrabold text-slate-800 font-mono flex items-center gap-1">
                          <Award size={10} className="text-amber-500" />
                          {config.config_key.replace(/COMMUNITY_/g, "").replace(/_/g, " ")}
                        </span>
                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                          {config.description || "Incentive reward weight"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                        <input
                          type="number"
                          className="w-18 px-2 py-1 text-xs text-amber-950 font-mono font-bold border border-amber-200 rounded-lg text-center bg-white focus:border-amber-500 outline-none"
                          value={config.config_value}
                          onChange={(e) => {
                            const val = e.target.value;
                            setConfigs(prev => prev.map(c => c.config_key === config.config_key ? { ...c, config_value: val } : c));
                          }}
                        />
                        <button
                          onClick={() => handleSaveConfig(config.config_key, config.config_value)}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-550 text-white font-extrabold text-[9px] uppercase rounded-lg transition-all"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* PACKAGE MANAGEMENT */}
          <div className="lg:col-span-7 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-6">
              <div className="flex items-center gap-2">
                <CreditCard size={18} className="text-blue-600" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">VEGA Rewards Purchase Config Cards</h4>
              </div>
              <button
                onClick={() => {
                  setEditingPackageId(null);
                  setPkgForm({ name: "", xp_amount: 100, price_inr: 49, mock_interviews_included: 1, resume_reviews_included: 2, is_popular: false, is_best_value: false });
                  setShowPackageModal(true);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5 shadow-md shadow-blue-600/10 transition-colors"
              >
                <Plus size={14} /> Add package
              </button>
            </div>

            {loadingPackages ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : packages.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs font-semibold">
                No packages configured. Click "Add package" to make the first bundle packaging.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {packages.map((pkg) => (
                  <div 
                    key={pkg.id} 
                    className={`p-5 rounded-2xl border relative flex flex-col justify-between transition-all hover:border-slate-300 hover:shadow-md ${
                      pkg.is_popular 
                        ? "border-yellow-400 bg-yellow-50/10" 
                        : pkg.is_best_value 
                          ? "border-purple-400 bg-purple-50/10" 
                          : "border-slate-100 bg-white"
                    }`}
                  >
                    {pkg.is_popular ? (
                      <span className="absolute -top-2 right-4 bg-yellow-500 text-slate-900 text-[8px] font-black tracking-widest px-2 py-0.5 rounded-full uppercase">
                        Popular
                      </span>
                    ) : pkg.is_best_value ? (
                      <span className="absolute -top-2 right-4 bg-purple-600 text-white text-[8px] font-black tracking-widest px-2 py-0.5 rounded-full uppercase">
                        Best Value
                      </span>
                    ) : null}

                    <div className="space-y-2">
                      <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 font-mono">Dynamic bundle</span>
                      <h5 className="text-sm font-bold text-slate-900 leading-snug">{pkg.name}</h5>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-3xl font-black text-slate-900">{pkg.xp_amount}</span>
                        <span className="text-[10px] uppercase font-bold text-slate-500">XP Points</span>
                      </div>
                      <p className="text-xs text-slate-600 font-semibold mb-2">
                        Store Price: <span className="font-mono font-bold text-slate-950">₹{pkg.price_inr}</span>
                      </p>
                      
                      <div className="flex flex-col gap-1 text-[11px] font-semibold text-slate-500 pt-1.5 border-t border-slate-100 mt-2">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 size={12} className="text-emerald-500" />
                          <span>Mock Interviews: <strong className="text-slate-800">{pkg.mock_interviews_included !== null && pkg.mock_interviews_included !== undefined ? pkg.mock_interviews_included : Math.floor(pkg.xp_amount / 125)}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 size={12} className="text-emerald-500" />
                          <span>Resume Reviews: <strong className="text-slate-800">{pkg.resume_reviews_included !== null && pkg.resume_reviews_included !== undefined ? pkg.resume_reviews_included : Math.floor(pkg.xp_amount / 50)}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-5 border-t border-slate-100 pt-3 justify-end">
                      <button
                        onClick={() => {
                          setEditingPackageId(pkg.id);
                          setPkgForm({ 
                            name: pkg.name, 
                            xp_amount: pkg.xp_amount, 
                            price_inr: pkg.price_inr, 
                            mock_interviews_included: pkg.mock_interviews_included !== null ? pkg.mock_interviews_included : 0,
                            resume_reviews_included: pkg.resume_reviews_included !== null ? pkg.resume_reviews_included : 0,
                            is_popular: !!pkg.is_popular, 
                            is_best_value: !!pkg.is_best_value 
                          });
                          setShowPackageModal(true);
                        }}
                        className="text-slate-500 hover:text-blue-600 p-2 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDeletePackage(pkg.id)}
                        className="text-slate-400 hover:text-red-600 p-2 bg-slate-50 hover:bg-red-50 rounded-xl transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* TAB 2: STUDENT COMMUNITY & XP ASSIGNMENT DESK */
        <div className="space-y-6">
          {/* Moderation Controls Intro Row */}
          <div className="bg-amber-500/5 border border-amber-500/15 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="max-w-2xl">
              <h3 className="text-sm font-black text-amber-800 uppercase tracking-wide flex items-center gap-1.5">
                <Award className="text-amber-500" />
                Community Quality & Reputation Controller
              </h3>
              <p className="text-xs text-slate-650 leading-relaxed mt-1 font-medium">
                Verify peer placement narratives, modify quality content scores, delete safety violations, or manually award special bonus reputation XP. Double-verification instantly grants <strong>+100 XP</strong> verification incentive.
              </p>
            </div>
            
            {/* Search Input Filter */}
            <div className="relative shrink-0 w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search authors, company..."
                value={postSearch}
                onChange={e => setPostSearch(e.target.value)}
                className="w-full bg-white text-xs pl-9 pr-4 py-2 rounded-xl outline-none border border-slate-200 focus:border-blue-500 font-medium"
              />
            </div>
          </div>

          {loadingPosts ? (
            <div className="flex flex-col items-center justify-center py-28 gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
              <span className="text-xs text-slate-500 font-bold uppercase tracking-widest font-mono">Scanning community repository...</span>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="bg-slate-50 rounded-3xl border border-slate-100 p-12 text-center space-y-4">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-slate-500 font-bold text-sm">No community placement stories synced</p>
              <p className="text-slate-400 text-xs max-w-md mx-auto">
                Once students or mentors write experience stories, they will instantly emerge in this administration moderating board.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-500 font-black uppercase tracking-widest">
                      <th className="py-4 px-6">Story Article Details</th>
                      <th className="py-4 px-6">Content Contributor</th>
                      <th className="py-4 px-6 text-center">Score rating</th>
                      <th className="py-4 px-6 text-center font-mono">Unlock pricing</th>
                      <th className="py-4 px-6 text-center">Interactions</th>
                      <th className="py-4 px-6 text-center">Verify Pro</th>
                      <th className="py-4 px-6 text-right">Moderator Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {filteredPosts.map((post) => (
                      <tr key={post.id} className="hover:bg-slate-50/50 transition-colors">
                        {/* Title & Preview Context */}
                        <td className="py-4 px-6 max-w-sm">
                          <div className="space-y-1">
                            <span className="text-[9px] bg-slate-150 text-slate-600 font-black px-2 py-0.5 rounded-full border border-slate-200">
                              {post.type}
                            </span>
                            {post.company_name && (
                              <span className="text-[9px] bg-blue-50 text-blue-600 font-black px-2 py-0.5 rounded-full border border-blue-100 ml-1.5">
                                {post.company_name}
                              </span>
                            )}
                            <h4 className="font-extrabold text-slate-900 leading-snug line-clamp-1 mt-1 pr-4" title={post.title}>
                              {post.title}
                            </h4>
                            <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                              {post.preview_text || post.content}
                            </p>
                          </div>
                        </td>

                        {/* Author Credentials */}
                        <td className="py-4 px-6 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full border overflow-hidden bg-slate-105 shrink-0">
                              <img src={post.creator_photo} referrerPolicy="no-referrer" alt="Author avatar" className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{post.creator_name}</p>
                              <p className="text-[10px] text-slate-500 font-medium font-mono">{post.creator_email}</p>
                              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                {post.author_role}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Scores evaluation ratings */}
                        <td className="py-4 px-6 text-center whitespace-nowrap">
                          <div>
                            <span className={`text-xs font-black font-mono px-2 py-1 rounded-lg ${
                              post.content_score >= 90
                                ? "bg-emerald-50 text-emerald-600"
                                : post.content_score >= 70
                                  ? "bg-amber-50 text-amber-600"
                                  : "bg-red-50 text-red-600"
                            }`}>
                              {post.content_score}/100
                            </span>
                            <button
                              onClick={() => {
                                setEditingPostScore(post);
                                setScoreForm({
                                  content_score: post.content_score || 80,
                                  quality_analysis: post.quality_analysis || ""
                                });
                              }}
                              className="block text-[9px] text-blue-600 hover:underline font-extrabold mx-auto mt-1"
                            >
                              Edit Evaluation
                            </button>
                          </div>
                        </td>

                        {/* unlock pricing cost */}
                        <td className="py-4 px-6 text-center font-mono font-bold text-slate-800 whitespace-nowrap">
                          {post.xp_unlock_cost} XP
                        </td>

                        {/* stats reaction tags */}
                        <td className="py-4 px-6 text-center whitespace-nowrap text-[10px] text-slate-500 font-bold">
                          <div className="space-y-0.5">
                            <p>{post.likes_count} 👍 Likes</p>
                            <p>{post.comments_count} 💬 Comments</p>
                            <p>{post.unlock_count} 🔓 Unlocks</p>
                          </div>
                        </td>

                        {/* Verification Toggles */}
                        <td className="py-4 px-6 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleToggleVerification(post.id, !!post.is_verified)}
                            className={`px-3 py-1.5 rounded-xl border text-[11px] font-black uppercase flex items-center gap-1.5 mx-auto transition-all ${
                              post.is_verified
                                ? "bg-emerald-50 text-emerald-700 border-emerald-250 hover:bg-emerald-100"
                                : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-800"
                            }`}
                          >
                            {post.is_verified ? (
                              <>
                                <Check size={12} className="text-emerald-600" />
                                Verified Pro
                              </>
                            ) : (
                              <>
                                <HelpCircle size={12} className="text-slate-400" />
                                Unverified
                              </>
                            )}
                          </button>
                        </td>

                        {/* actions desk */}
                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <div className="flex items-center gap-2.5 justify-end">
                            {/* Award Star Medal Bonus button */}
                            <button
                              onClick={() => {
                                setShowAwardModal({
                                  userId: post.user_id,
                                  userName: post.creator_name || "Student",
                                  postTitle: post.title
                                });
                              }}
                              className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-xl transition-all"
                              title="Directly Grant Bonus community XP"
                            >
                              <Award size={14} className="animate-pulse" />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeletePost(post.id)}
                              className="p-2 bg-red-50 hover:bg-red-100 text-red-650 rounded-xl transition-all"
                              title="Delete Story Post and logs"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: VEGA Rewards Purchase CARD FORM */}
      <AnimatePresence>
        {showPackageModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white border border-slate-205 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                  {editingPackageId ? "Edit Bundle Card" : "Create New Bundle Card"}
                </h3>
                <button onClick={() => setShowPackageModal(false)} className="p-1.5 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSavePackage} className="p-6 space-y-4 text-sm bg-white">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Package Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Starter Pack / Value Pack"
                    value={pkgForm.name}
                    onChange={(e) => setPkgForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">XP Reward amount</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={pkgForm.xp_amount}
                      onChange={(e) => setPkgForm(prev => ({ ...prev, xp_amount: Number(e.target.value) }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-medium focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">INR Price (₹)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={pkgForm.price_inr}
                      onChange={(e) => setPkgForm(prev => ({ ...prev, price_inr: Number(e.target.value) }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-medium focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Mock Interviews Included</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={pkgForm.mock_interviews_included}
                      onChange={(e) => setPkgForm(prev => ({ ...prev, mock_interviews_included: Number(e.target.value) }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-medium focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Resume Reviews Included</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={pkgForm.resume_reviews_included}
                      onChange={(e) => setPkgForm(prev => ({ ...prev, resume_reviews_included: Number(e.target.value) }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-medium focus:outline-none focus:border-blue-500"
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

                <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowPackageModal(false)}
                    className="px-4 py-2 border border-slate-205 text-slate-600 hover:text-slate-955 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingPackage}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase shadow-md shadow-blue-600/10 transition-colors flex items-center gap-1.5"
                  >
                    {savingPackage && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {editingPackageId ? "Update Bundle" : "Create Bundle"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: MANUAL RATING EVALUATOR & ADJUST SCORE */}
      <AnimatePresence>
        {editingPostScore && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white border border-slate-150 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                  <Sliders size={16} className="text-blue-600" />
                  Edit Quality Scoring Report
                </h3>
                <button onClick={() => setEditingPostScore(null)} className="p-1.5 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveScoreForm} className="p-6 space-y-4 text-xs font-medium">
                <div className="p-3 bg-blue-500/5 text-blue-800 rounded-2xl border border-blue-500/10 space-y-1">
                  <span className="font-extrabold uppercase tracking-widest text-[9px] block">Currently reviewing:</span>
                  <p className="font-extrabold">{editingPostScore.title}</p>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Contributor: {editingPostScore.creator_name}</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    AI/Manual Quality Score (0 - 100)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={scoreForm.content_score}
                      onChange={e => setScoreForm({ ...scoreForm, content_score: Number(e.target.value) })}
                      className="flex-1 accent-blue-600 h-2 bg-slate-150 rounded-lg cursor-pointer"
                    />
                    <span className="w-16 text-center font-mono font-black text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded-xl border border-blue-100">
                      {scoreForm.content_score}/100
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Moderator Assessment / Analysis Feedback
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Write a peer-insightful professional review of this placement journey..."
                    value={scoreForm.quality_analysis}
                    onChange={e => setScoreForm({ ...scoreForm, quality_analysis: e.target.value })}
                    className="w-full border border-slate-200 rounded-2xl p-3 text-xs focus:outline-none focus:border-blue-500 leading-relaxed font-semibold"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingPostScore(null)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingScore}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase shadow-md shadow-blue-600/10 transition-colors flex items-center gap-1.5"
                  >
                    {savingScore && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Save Quality Report
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: DIRECT INCENTIVE XP MANUALLY ALLOCATOR PANEL */}
      <AnimatePresence>
        {showAwardModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 15 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 15 }}
               className="bg-white border border-slate-150 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                  <Award size={16} className="text-amber-500 animate-bounce" />
                  Community Bonus Selector
                </h3>
                <button onClick={() => setShowAwardModal(null)} className="p-1.5 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveAwardXP} className="p-6 space-y-4 text-xs font-medium">
                <div className="p-3 bg-amber-500/5 text-amber-900 rounded-2xl border border-amber-500/10 space-y-1">
                  <span className="font-extrabold uppercase tracking-widest text-[9px] block">Awarding user:</span>
                  <p className="font-extrabold text-[13px]">{showAwardModal.userName}</p>
                  {showAwardModal.postTitle && (
                    <p className="text-[10px] text-slate-500 mt-0.5 mt-0.5">Reference Post: "{showAwardModal.postTitle}"</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Reputation adjustment (XP)
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[25, 50, 100, 250].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAwardForm({ ...awardForm, amount: val })}
                        className={`py-2 px-3 rounded-lg border text-center font-bold transition-all ${
                          awardForm.amount === val
                            ? "bg-amber-550 border-amber-600 bg-amber-500 text-white"
                            : "bg-slate-50 border-slate-205 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        +{val} XP
                      </button>
                    ))}
                  </div>
                  <div className="pt-2">
                    <input
                      type="number"
                      required
                      placeholder="Or enter custom amount (can be negative to fine)"
                      value={awardForm.amount}
                      onChange={e => setAwardForm({ ...awardForm, amount: Number(e.target.value) })}
                      className="w-full border border-slate-200 p-2.5 rounded-xl font-mono text-center font-bold text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Award Cause / Motivation Description
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Awarding +100 bonus XP for exceptional DSA Tips guide!"
                    value={awardForm.description}
                    onChange={e => setAwardForm({ ...awardForm, description: e.target.value })}
                    className="w-full border border-slate-200 p-2.5 rounded-xl focus:border-amber-500 font-semibold"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAwardModal(null)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingAward}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 font-black text-white uppercase rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    {savingAward && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Proceed Award
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
