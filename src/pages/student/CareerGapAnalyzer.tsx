import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.tsx";
import api from "../../services/api.ts";
import { motion, AnimatePresence } from "motion/react";
import { 
  Briefcase, Award, TrendingUp, Search, History, ShieldAlert, BadgeCheck, CheckCircle2, AlertTriangle, 
  ArrowRight, Sparkles, BookOpen, UserCheck, Flame, Zap, Compass, RefreshCw, BarChart3, Users, Lock, Eye, Globe 
} from "lucide-react";
import toast from "react-hot-toast";

// Recharts components for beautiful visual comparisons
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend
} from "recharts";

// Robust, exception-safe utility to parse any skill format: array, stringified array, or comma-separated lists
export const parseSkillsHelper = (val: any): string[] => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.map(s => String(s).trim());
      } catch (e) {
        // Fallback to comma split if JSON parsing fails
      }
    }
    return trimmed.split(",").map(s => s.trim()).filter(Boolean);
  }
  return [];
};

export default function CareerGapAnalyzer() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<"compare" | "gallery" | "search" | "insights" | "history">("compare");
  
  // Real dynamic profiles
  const [myProfile, setMyProfile] = useState<any>(null);
  const [targetProfile, setTargetProfile] = useState<any>(null);
  
  // Loading & Action states
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [gallery, setGallery] = useState<any[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);

  // Real-time recommendation system when search query is typed (especially matching unique IDs)
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  // AI Outputs
  const [gapAnalysis, setGapAnalysis] = useState<any>(null);
  const [roadmap, setRoadmap] = useState<any>(null);
  const [generatingGap, setGeneratingGap] = useState(false);
  const [generatingRoadmap, setGeneratingRoadmap] = useState(false);
  
  // History & Insights
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [insights, setInsights] = useState<any>(null);
  
  // Privacy
  const [visibility, setVisibility] = useState<string>("PUBLIC");

  // Fetch my profile base details on mount
  useEffect(() => {
    if (user?.id) {
      loadMyProfile();
      loadHistory();
      loadInsights();
      loadSuccessGallery();
    }
  }, [user]);

  // Handle auto-recommendations whenever searchQuery changes
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setRecommendations([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        setLoadingRecommendations(true);
        const res = await api.get(`/career-gap/search?query=${encodeURIComponent(searchQuery)}`);
        if (res.data?.success) {
          setRecommendations(res.data.students || []);
        }
      } catch (err) {
        console.error("Failed fetching search recommendations", err);
      } finally {
        setLoadingRecommendations(false);
      }
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const loadMyProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/students/profile/${user?.id}`);
      if (res.data?.success && res.data?.data) {
        const d = res.data.data;
        const flattened = {
          ...d,
          projects: d.projects,
          experience: d.experience,
          certifications: d.certifications,
          extracurriculars: d.extracurriculars,
          metrics: d.metrics
        };
        setMyProfile(flattened);
        setVisibility(flattened.profile_visibility || "PUBLIC");
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not load your student profile metrics");
    } finally {
      setLoading(false);
    }
  };

  const loadSuccessGallery = async () => {
    try {
      setGalleryLoading(true);
      const res = await api.get("/career-gap/success-gallery");
      if (res.data?.success) {
        setGallery(res.data.gallery || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGalleryLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await api.get("/career-gap/history");
      if (res.data?.success) {
        setHistoryLogs(res.data.history || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadInsights = async () => {
    try {
      const res = await api.get("/career-gap/insights");
      if (res.data?.success) {
        setInsights(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Switch/change profile visibility instantly with feed-forward banner
  const handleVisibilityChange = async (newVal: string) => {
    try {
      setVisibility(newVal);
      const res = await api.put("/career-gap/visibility", { visibility: newVal });
      if (res.data?.success) {
        toast.success(`Visibility updated to ${newVal}`);
        if (myProfile) {
          setMyProfile({ ...myProfile, profile_visibility: newVal });
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update visibility preferences");
    }
  };

  // Perform Student search
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      toast.error("Please enter a name, VEGA ID, college, or skill");
      return;
    }
    try {
      setSearchLoading(true);
      const res = await api.get(`/career-gap/search?query=${encodeURIComponent(searchQuery)}`);
      if (res.data?.success) {
        setSearchResults(res.data.students || []);
        if (res.data.students?.length === 0) {
          toast("No public profiles match your query", { icon: "⚠️" });
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Search failed");
    } finally {
      setSearchLoading(false);
    }
  };

  // Set Profile B (Target Student or placed student)
  const selectTargetStudent = async (targetId: number, tbId: string) => {
    try {
      setLoading(true);
      const res = await api.get(`/career-gap/profile/${tbId}`);
      if (res.data?.success) {
        setTargetProfile(res.data.profile);
        toast.success(`Selected ${res.data.profile.full_name} for comparison stage!`);
        
        // Reset current outputs
        setGapAnalysis(null);
        setRoadmap(null);
        
        // Auto navigate back to Compare tab
        setActiveTab("compare");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to load target profile details");
    } finally {
      setLoading(false);
    }
  };

  // Start side-by-side comparing with active target
  const handleCompareStage = async (comparisonType: "BASIC" | "AI_GAP" | "PREMIUM") => {
    if (!myProfile || !targetProfile) {
      toast.error("Please select a target profile to compare with");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/career-gap/compare", {
        studentAId: myProfile.id,
        studentBId: targetProfile.id,
        type: comparisonType
      });

      if (res.data?.success) {
        const data = res.data.data;
        if (data.isFirstFree) {
          toast.success("✨ First profile comparison is FREE! Enjoy VEGA Insights!");
        } else {
          toast.success(`Success! Spent ${data.xpSpent} XP for comparison`);
        }

        // Seamlessly merge and bind real database metrics & profiles returned by the server to state
        if (data.studentA) {
          setMyProfile((prev: any) => ({
            ...prev,
            ...data.studentA,
            full_name: data.studentA.name,
            profile_photo_url: data.studentA.photo,
            college_name: data.studentA.college,
            is_placed: data.studentA.placed,
            placed_company: data.studentA.placed_company,
            metrics: data.studentA.metrics,
            skills_json: JSON.stringify(data.studentA.skills)
          }));
        }
        if (data.studentB) {
          setTargetProfile((prev: any) => ({
            ...prev,
            ...data.studentB,
            full_name: data.studentB.name,
            profile_photo_url: data.studentB.photo,
            college_name: data.studentB.college,
            is_placed: data.studentB.placed,
            placed_company: data.studentB.placed_company,
            metrics: data.studentB.metrics,
            skills_json: JSON.stringify(data.studentB.skills)
          }));
        }

        // Trigger AI gap generation automatically if requested
        if (comparisonType === "AI_GAP" || comparisonType === "PREMIUM") {
          await triggerAiGap();
        }
        if (comparisonType === "PREMIUM") {
          await triggerAiRoadmap();
        }
      } else if (res.data?.code === "INSUFFICIENT_XP") {
        toast.error(res.data.message || "Insufficient XP Package Balance");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error setting up comparison ledger");
    } finally {
      setLoading(false);
    }
  };

  // Generate AI Gap analysis using server-side Gemini
  const triggerAiGap = async () => {
    if (!myProfile || !targetProfile) return;
    try {
      setGeneratingGap(true);
      const res = await api.post("/career-gap/generate-gap-analysis", {
        studentAId: myProfile.id,
        studentBId: targetProfile.id
      });
      if (res.data?.success) {
        setGapAnalysis(res.data.analysis);
        toast.success("🧠 Generative AI Gap Analysis complete!");
        loadHistory();
        loadInsights();
      }
    } catch (err) {
      console.error(err);
      toast.error("Gemini failed parsing profiles");
    } finally {
      setGeneratingGap(false);
    }
  };

  // Generate Career Roadmap
  const triggerAiRoadmap = async () => {
    if (!myProfile || !targetProfile) return;
    try {
      setGeneratingRoadmap(true);
      const res = await api.post("/career-gap/generate-roadmap", {
        studentAId: myProfile.id,
        studentBId: targetProfile.id
      });
      if (res.data?.success) {
        setRoadmap(res.data.roadmap);
        toast.success("🎯 Week-by-Week Success Roadmap Created!");
        loadHistory();
      }
    } catch (err) {
      console.error(err);
      toast.error("Gemini failed crafting roadmap timeline");
    } finally {
      setGeneratingRoadmap(false);
    }
  };

  // Quick load from historic reports
  const handleLoadPriorReport = (item: any) => {
    if (item.gapAnalysis) setGapAnalysis(item.gapAnalysis);
    if (item.roadmap) setRoadmap(item.roadmap);
    
    // Quick backfill a temporary target metadata
    setTargetProfile({
      id: item.id,
      full_name: item.target.name,
      tb_id: item.target.tb_id,
      profile_photo_url: item.target.photo,
      placed_company: item.target.company,
      is_placed: item.target.company ? 1 : 0,
      skills: item.gapAnalysis?.missingSkills || []
    });

    toast.success(`Restored historic gaps & roadmap for ${item.target.name}!`);
    setActiveTab("compare");
  };

  // Prepare radar metrics
  const defaultRadarData = [
    { subject: "Talent Score", A: 60, B: 85, fullMark: 100 },
    { subject: "Coding Score", A: 50, B: 80, fullMark: 100 },
    { subject: "Interview Skill", A: 55, B: 75, fullMark: 100 },
    { subject: "Aptitude Quiz", A: 45, B: 85, fullMark: 100 },
    { subject: "Skill Set Score", A: 50, B: 80, fullMark: 100 }
  ];

  const getRadarData = () => {
    if (!myProfile || !targetProfile) return defaultRadarData;
    
    const parseScore = (v: any) => {
      const num = Number(v);
      return isNaN(num) || num === 0 ? 55 : num;
    };

    const getSkillsCountScore = (profile: any, fallback: number) => {
      const skillsArray = parseSkillsHelper(profile?.skills_json || profile?.skills);
      if (skillsArray.length === 0) return fallback;
      return Math.min(100, Math.max(45, skillsArray.length * 12));
    };

    const metricsA = myProfile.metrics || {};
    const metricsB = targetProfile.metrics || {};

    return [
      { subject: "Talent Score", A: parseScore(metricsA.talentScore || myProfile.completeness_score || 55), B: parseScore(metricsB.talentScore || 85), fullMark: 100 },
      { subject: "Coding Score", A: parseScore(metricsA.codingScore || 50), B: parseScore(metricsB.codingScore || 80), fullMark: 100 },
      { subject: "Interview Skill", A: parseScore(metricsA.interviewScore || 45), B: parseScore(metricsB.interviewScore || 75), fullMark: 100 },
      { subject: "Aptitude Quiz", A: parseScore(metricsA.quizScore || 60), B: parseScore(metricsB.quizScore || 85), fullMark: 100 },
      { subject: "Skill Set Score", A: getSkillsCountScore(myProfile, 50), B: getSkillsCountScore(targetProfile, 80), fullMark: 100 }
    ];
  };

  const getMySkills = () => {
    return parseSkillsHelper(myProfile?.skills_json || myProfile?.skills);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 md:p-8">
      {/* 1. Header Frame */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md gap-6 shadow-xl">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-lg shadow-indigo-500/23">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-indigo-300">
                AI Career Gap Analyzer™
              </h1>
            </div>
            <p className="text-slate-400 text-sm max-w-xl">
              Construct high-precision developmental comparison stages to match against placed professionals and top-rank elite candidates. Complete with actionable Gemini timelines.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 bg-slate-950/80 p-4 border border-slate-800/80 rounded-xl">
            {/* My VEGA ID Display */}
            <div className="border-r border-slate-800 pr-4">
              <span className="block text-slate-500 text-xs font-semibold tracking-wider uppercase mb-1">Your Unique TB ID</span>
              <span className="font-mono text-indigo-400 font-bold bg-indigo-950/40 px-2.5 py-1 rounded text-sm tracking-wide border border-indigo-900/40">
                {myProfile?.tb_id || "TB-2026-PENDING"}
              </span>
            </div>

            {/* Privacy Controls Panel */}
            <div>
              <span className="block text-slate-500 text-xs font-semibold tracking-wider uppercase mb-1">Profile Visibility</span>
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-850 px-2 py-1 rounded">
                <select
                  value={visibility}
                  onChange={(e) => handleVisibilityChange(e.target.value)}
                  className="bg-transparent text-sm text-slate-200 focus:outline-none cursor-pointer pr-1"
                >
                  <option value="PUBLIC" className="bg-slate-900">🌐 Public</option>
                  <option value="COLLEGE_ONLY" className="bg-slate-900">🏢 College Only</option>
                  <option value="PRIVATE" className="bg-slate-900">🔒 Private</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="max-w-7xl mx-auto mb-8 border-b border-slate-800/60 pb-px">
        <div className="flex flex-wrap gap-2 md:gap-4">
          <button
            onClick={() => setActiveTab("compare")}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "compare"
                ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Comparison Stage
          </button>

          <button
            onClick={() => setActiveTab("gallery")}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "gallery"
                ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Award className="w-4 h-4" />
            Placed Success Gallery
          </button>

          <button
            onClick={() => setActiveTab("search")}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "search"
                ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Search className="w-4 h-4" />
            Profile Explorer
          </button>

          <button
            onClick={() => setActiveTab("insights")}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "insights"
                ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Skill Trends
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "history"
                ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <History className="w-4 h-4" />
            Saved Reports
          </button>
        </div>
      </div>

      {/* Main Container Wrapper */}
      <div className="max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {/* Tab 1: Comparison Platform */}
          {activeTab === "compare" && (
            <motion.div
              key="compare"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Left Column: Side-by-Side profile stubs */}
              <div className="lg:col-span-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Student A (Me) */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl" />
                    <div className="flex items-center gap-4 mb-4">
                      {myProfile?.profile_photo_url ? (
                        <img 
                          src={myProfile.profile_photo_url} 
                          alt="Me" 
                          className="w-14 h-14 rounded-full border-2 border-indigo-500/50 object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-indigo-950 flex items-center justify-center border-2 border-indigo-500 text-indigo-400 font-extrabold text-lg">
                          ME
                        </div>
                      )}
                      <div>
                        <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-xs font-semibold tracking-wider uppercase">
                          Current Profile
                        </span>
                        <h3 className="font-bold text-white text-lg mt-1">{myProfile?.full_name || "Myself"}</h3>
                        <p className="text-slate-400 text-xs">
                          {(myProfile?.education && myProfile.education.length > 0) ? myProfile.education[0].institution : (myProfile?.college_name || "Institution not specified")}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-slate-800/60">
                      <div>
                        <span className="text-slate-500 text-[11px] font-bold block mb-1">Acquired Skills</span>
                        <div className="flex flex-wrap gap-1.5">
                          {getMySkills().slice(0, 5).map((s: string, idx: number) => (
                            <span key={idx} className="bg-slate-800 text-slate-300 text-xs px-2.5 py-1 rounded-md">
                              {s}
                            </span>
                          ))}
                          {getMySkills().length > 5 && (
                            <span className="bg-indigo-950/20 text-indigo-400 text-xs px-2.5 py-1 rounded-md border border-indigo-900/30">
                              +{getMySkills().length - 5} More
                            </span>
                          )}
                          {getMySkills().length === 0 && <span className="text-slate-500 text-xs">No skills listed yet</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Student B (Target Placed Candidate) */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-md relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl" />
                    {targetProfile ? (
                      <div>
                        <div className="flex items-center gap-4 mb-4">
                          {targetProfile.profile_photo_url || targetProfile.photo ? (
                            <img 
                              src={targetProfile.profile_photo_url || targetProfile.photo || ""} 
                              alt="Target Candidate" 
                              className="w-14 h-14 rounded-full border-2 border-emerald-500/50 object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-emerald-950 flex items-center justify-center border-2 border-emerald-500 text-emerald-400 font-extrabold text-lg">
                              TG
                            </div>
                          )}
                          <div>
                            <div className="flex flex-wrap gap-1">
                              {targetProfile.is_placed === 1 && (
                                <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-bold tracking-wider uppercase flex items-center gap-1">
                                  <BadgeCheck className="w-3 h-3" />
                                  Placed @ {targetProfile.placed_company || "Amazon"}
                                </span>
                              )}
                              {targetProfile.is_top_performer === 1 && (
                                <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded text-[10px] font-bold uppercase">
                                  ⭐ Top Performer
                                </span>
                              )}
                            </div>
                            <h3 className="font-bold text-white text-lg mt-1">{targetProfile.full_name || targetProfile.name}</h3>
                            <p className="text-slate-400 text-xs">Target Benchmark Profile</p>
                          </div>
                        </div>

                        <div className="space-y-3 pt-3 border-t border-slate-800/60">
                           <div>
                             <span className="text-slate-500 text-[11px] font-bold block mb-1">Target Skills</span>
                             <div className="flex flex-wrap gap-1.5">
                               {parseSkillsHelper(targetProfile.skills || targetProfile.skills_json).slice(0, 5).map((s: string, idx: number) => (
                                 <span key={idx} className="bg-slate-800 text-slate-300 text-xs px-2.5 py-1 rounded-md">
                                   {s}
                                 </span>
                               ))}
                               {parseSkillsHelper(targetProfile.skills || targetProfile.skills_json).length > 5 && (
                                 <span className="bg-emerald-950/20 text-emerald-400 text-xs px-2.5 py-1 rounded-md border border-emerald-900/30">
                                   +{parseSkillsHelper(targetProfile.skills || targetProfile.skills_json).length - 5} More
                                 </span>
                               )}
                             </div>
                           </div>
                         </div>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4">
                        <Compass className="w-12 h-12 text-slate-600 mb-2 animate-bounce" />
                        <h4 className="text-sm font-bold text-slate-300">No Target Benchmark Selected</h4>
                        <p className="text-xs text-slate-500 max-w-sm mt-1">
                          Browse our Placed Success Gallery or search the Explorer list to select a candidate to construct comparative maps.
                        </p>
                        <div className="flex gap-2 mt-4">
                          <button 
                            onClick={() => setActiveTab("gallery")}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded px-3 py-1.5 text-xs font-semibold cursor-pointer"
                          >
                            Browse Gallery
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Score Comparison Radar Chart or Metric List */}
                {targetProfile && (
                  <div className="bg-slate-900/65 border border-slate-800 rounded-2xl p-6 shadow-md">
                    <h3 className="font-bold text-white text-lg mb-2 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-indigo-400" />
                      Comparative Readiness Metrics
                    </h3>
                    <p className="text-slate-400 text-xs mb-6">
                      Real-time analysis spanning key developmental indexes. See where your metrics stand compared to the target benchmark.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                      {/* Radar Graph */}
                      <div className="h-72 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={getRadarData()}>
                            <PolarGrid stroke="#334155" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#64748b" }} />
                            <Radar name={myProfile?.full_name || "Myself"} dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                            <Radar name={targetProfile?.full_name} dataKey="B" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Side lists of metrics */}
                      <div className="space-y-4">
                        {getRadarData().map((metric: any, idx: number) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-300 font-semibold">{metric.subject}</span>
                              <span className="font-semibold text-slate-400">
                                <span className="text-indigo-400">{metric.A}</span> / <span className="text-emerald-400">{metric.B}</span>
                              </span>
                            </div>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden flex">
                              <div style={{ width: `${metric.A}%` }} className="bg-indigo-500 h-full" />
                              <div style={{ width: `${Math.max(0, metric.B - metric.A)}%` }} className="bg-emerald-500/40 h-full" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Generative Output Panels */}
                {targetProfile && (
                  <div className="space-y-6">
                    {/* Generative triggers */}
                    <div className="bg-slate-900 border border-indigo-950/60 p-5 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <h4 className="text-white font-bold text-sm flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-indigo-400" />
                          Generate Custom AI Career Gap analysis
                        </h4>
                        <p className="text-slate-400 text-xs mt-1">
                          Let server-side Gemini AI construct custom missing projects list and prepare detailed improvement timeline.
                        </p>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => handleCompareStage("AI_GAP")}
                          disabled={generatingGap || loading}
                          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 font-semibold text-white px-4 py-2 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-all border border-indigo-500/20"
                        >
                          {generatingGap ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              Generating Gaps...
                            </>
                          ) : (
                            <>
                              <Zap className="w-3.5 h-3.5" />
                              Analyze career Gap
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleCompareStage("PREMIUM")}
                          disabled={generatingRoadmap || loading}
                          className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-800 font-semibold text-white px-4 py-2 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-all border border-purple-500/20"
                        >
                          {generatingRoadmap ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              Building Roadmap...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" />
                              Generate Roadmap
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Gap analysis result */}
                    {gapAnalysis && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-lg"
                      >
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                          <h4 className="font-extrabold text-white text-md flex items-center gap-2">
                            <ShieldAlert className="w-5 h-5 text-amber-400" />
                            Core Gap Identification Report
                          </h4>
                          <span className="text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                            Gemini Analysis Verified
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/40">
                            <span className="text-slate-400 font-bold text-xs flex items-center gap-1.5 uppercase mb-3 text-amber-300">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Missing Technical Skills
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {gapAnalysis.missingSkills?.map((skill: string, index: number) => (
                                <span key={index} className="bg-amber-950/30 border border-amber-900/40 text-amber-300 rounded-md px-2.5 py-1 text-xs font-semibold">
                                  {skill}
                                </span>
                              ))}
                              {gapAnalysis.missingSkills?.length === 0 && (
                                <span className="text-slate-500 text-xs">Ready alignment! No missing vital skills.</span>
                              )}
                            </div>
                          </div>

                          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/40">
                            <span className="text-slate-400 font-bold text-xs flex items-center gap-1.5 uppercase mb-3 text-indigo-300">
                              <BookOpen className="w-3.5 h-3.5" /> Suggested Key Projects
                            </span>
                            <ul className="space-y-2">
                              {gapAnalysis.missingProjects?.map((proj: string, idx: number) => (
                                <li key={idx} className="text-xs text-slate-300 flex items-start gap-1.5">
                                  <span className="text-indigo-400 mt-0.5">•</span>
                                  {proj}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-800 text-center gap-4">
                          <div className="flex-1 py-1">
                            <span className="block text-slate-500 text-xs font-bold uppercase mb-1">Your General Readiness</span>
                            <span className="text-xl font-extrabold text-white">{gapAnalysis.overallReadinessA}%</span>
                          </div>
                          <div className="flex-1 py-1">
                            <span className="block text-slate-500 text-xs font-bold uppercase mb-1">Target Candidate Readiness</span>
                            <span className="text-xl font-extrabold text-emerald-400">{gapAnalysis.overallReadinessB}%</span>
                          </div>
                          <div className="flex-1 py-1">
                            <span className="block text-slate-500 text-xs font-bold uppercase mb-1">Estimated Gain Score</span>
                            <span className="text-xl font-extrabold text-indigo-400">+{gapAnalysis.estimatedScoreImprovement} Overall</span>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Success Roadmap sequence */}
                    {roadmap && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md"
                      >
                        <h4 className="font-extrabold text-white text-md flex items-center gap-2 border-b border-slate-800 pb-3 mb-6">
                          <Award className="w-5 h-5 text-purple-400" />
                          90-Day Developmental Roadmap
                        </h4>

                        <div className="space-y-8 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-slate-800">
                          {/* Month 1 */}
                          <div className="relative pl-8">
                            <div className="absolute left-1.5 top-1.5 w-3 h-3 bg-indigo-500 rounded-full border-4 border-slate-900" />
                            <h5 className="text-sm font-bold text-white mb-2 uppercase tracking-wide flex items-center gap-1.5">
                              <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-xs rounded">Days 1 - 30</span>
                              Core Setup & Base Foundations
                            </h5>
                            <ul className="space-y-2">
                              {roadmap.thirtyDayPlan?.map((item: string, idx: number) => (
                                <li key={idx} className="text-xs text-slate-300 flex items-start gap-1.5">
                                  <ArrowRight className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Month 2 */}
                          <div className="relative pl-8">
                            <div className="absolute left-1.5 top-1.5 w-3 h-3 bg-purple-500 rounded-full border-4 border-slate-900" />
                            <h5 className="text-sm font-bold text-white mb-2 uppercase tracking-wide flex items-center gap-1.5">
                              <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-xs rounded">Days 31 - 60</span>
                              Deep-Dive production projects
                            </h5>
                            <ul className="space-y-2">
                              {roadmap.sixtyDayPlan?.map((item: string, idx: number) => (
                                <li key={idx} className="text-xs text-slate-300 flex items-start gap-1.5">
                                  <ArrowRight className="w-3.5 h-3.5 text-purple-400 mt-0.5 shrink-0" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Month 3 */}
                          <div className="relative pl-8">
                            <div className="absolute left-1.5 top-1.5 w-3 h-3 bg-emerald-500 rounded-full border-4 border-slate-900" />
                            <h5 className="text-sm font-bold text-white mb-2 uppercase tracking-wide flex items-center gap-1.5">
                              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs rounded">Days 61 - 90</span>
                              Mock Exams & Placement Ready Status
                            </h5>
                            <ul className="space-y-2">
                              {roadmap.ninetyDayPlan?.map((item: string, idx: number) => (
                                <li key={idx} className="text-xs text-slate-300 flex items-start gap-1.5">
                                  <ArrowRight className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Mini Instructions / Guidance with visual telemetry lines */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
                  <span className="text-[10px] text-indigo-400 font-mono font-bold tracking-wider uppercase block mb-1">
                    VEGA Economics
                  </span>
                  <h4 className="font-bold text-white text-sm mb-3">XP Ledger Costs</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between p-2.5 bg-slate-950/40 border border-slate-800 rounded-lg">
                      <span className="text-slate-400">Basic Compare</span>
                      <span className="font-bold text-indigo-300">20 XP</span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-slate-950/40 border border-slate-800 rounded-lg">
                      <span className="text-slate-400">AI Gap Report</span>
                      <span className="font-bold text-amber-300">50 XP</span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-slate-950/40 border border-slate-800 rounded-lg">
                      <span className="text-slate-400">Success Roadmap Plan</span>
                      <span className="font-bold text-purple-300">75 XP</span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-gradient-to-r from-purple-900/10 to-indigo-900/10 border border-indigo-900/30 rounded-lg">
                      <span className="text-indigo-300 font-medium">Detailed Combo Bundle</span>
                      <span className="font-bold text-emerald-400">100 XP</span>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] rounded-lg leading-relaxed flex items-start gap-2">
                    <Sparkles className="w-4 h-4 shrink-0 text-indigo-400 mt-0.5" />
                    <span>
                      Adoption incentive: every newly registered candidate receives exactly <strong>1 Free Comparison stage exchange</strong> to discover metrics.
                    </span>
                  </div>
                </div>

                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
                  <h4 className="font-bold text-slate-300 text-sm mb-4">Quick Comparison Instructions</h4>
                  <ol className="space-y-3.5 text-xs text-slate-400">
                    <li className="flex gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold shrink-0">1</span>
                      Choose a placed leader from our PlacedSuccess grid, or search any specific student in Profile Explorer.
                    </li>
                    <li className="flex gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold shrink-0">2</span>
                      View side-by-side radars to compare comprehensive completeness and technical scores.
                    </li>
                    <li className="flex gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold shrink-0">3</span>
                      Deduct XP package balance (or use free credit) to trigger deep generative Gemini analysis for a specific missing template.
                    </li>
                  </ol>
                </div>
              </div>
            </motion.div>
          )}

          {/* Tab 2: Success Gallery */}
          {activeTab === "gallery" && (
            <motion.div
              key="gallery"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-emerald-400" />
                    Placed Student Success Gallery
                  </h2>
                  <p className="text-slate-400 text-xs mt-1">
                    Explore and compare with students who successfully secured active placement packages at marquee global companies.
                  </p>
                </div>
                <div className="text-xs bg-slate-800/40 border border-slate-700 rounded-lg px-4 py-2 text-slate-300">
                  Total Placed Leaders: <strong className="text-emerald-400">{gallery.length}</strong>
                </div>
              </div>

              {galleryLoading ? (
                <div className="h-64 flex flex-col items-center justify-center">
                  <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mb-2" />
                  <span className="text-slate-400 text-xs">Loading successful placed leaders...</span>
                </div>
              ) : gallery.length === 0 ? (
                <div className="bg-slate-900/60 rounded-3xl p-12 border border-slate-800 text-center max-w-2xl mx-auto space-y-4">
                  <div className="w-16 h-16 bg-indigo-950 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto border border-indigo-900/50 shadow-lg animate-pulse-slow">
                    <Award size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-white uppercase tracking-tight font-sans">No Placed Profiles Registered Yet</h3>
                  <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
                    Be the first to feature on the ledger! If you or any of your friends have secured a package, update your Talent Profile with your Placement Achievement.
                  </p>
                  <div className="pt-2">
                    <button 
                      onClick={() => window.location.href = "/profile"}
                      className="bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.02] transition-all text-white font-semibold text-xs px-5 py-2.5 rounded-xl cursor-pointer shadow-md inline-flex items-center gap-2"
                    >
                      Update My Profile
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {gallery.map((cand) => (
                    <div 
                      key={cand.id} 
                      className="bg-slate-900 border border-slate-800 hover:border-slate-750 transition-all rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/[0.03] rounded-full blur-xl" />
                      
                      <div>
                        {/* Heading stubs & company badges */}
                        <div className="flex items-start justify-between gap-2 mb-4">
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase flex items-center gap-1">
                            <BadgeCheck className="w-3.5 h-3.5" />
                            Placed @ {cand.company}
                          </span>
                          {cand.is_top_performer === 1 && (
                            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                              ⭐ Elite Rank
                            </span>
                          )}
                        </div>

                        {/* Name & Photo */}
                        <div className="flex items-center gap-3 mb-4">
                          {cand.photo ? (
                            <img src={cand.photo} alt={cand.name} className="w-11 h-11 rounded-full border border-slate-700 object-cover" />
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-sm">
                              {cand.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <h3 className="font-bold text-white text-sm">{cand.name}</h3>
                            <span className="font-mono text-[10px] text-indigo-400 tracking-wide bg-indigo-950/20 px-1.5 py-0.5 rounded mt-0.5 block w-max">
                              {cand.tb_id}
                            </span>
                          </div>
                        </div>

                        {/* Skills */}
                        <div className="mb-6">
                          <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1.5">Acquired Skill Set</span>
                          <div className="flex flex-wrap gap-1">
                            {cand.skills?.slice(0, 4).map((skill: string, index: number) => (
                              <span key={index} className="bg-slate-950 text-slate-400 text-[10px] border border-slate-800 rounded px-2 py-0.5">
                                {skill}
                              </span>
                            ))}
                            {cand.skills?.length > 4 && (
                              <span className="text-[10px] text-slate-500 px-1.5 py-0.5">
                                +{cand.skills.length - 4} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => selectTargetStudent(cand.id, cand.tb_id)}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2 rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1 border border-indigo-500/20"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Stage for Comparison
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Tab 3: Search Students */}
          {activeTab === "search" && (
            <motion.div
              key="search"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
                <h2 className="text-lg font-bold text-white mb-2">Student Profile Explorer</h2>
                <p className="text-slate-400 text-xs mb-6">
                  Locate any registered student profile. Searching respects strict candidate visual privacy bounds (Private profiles cannot be discovered).
                </p>

                <form onSubmit={handleSearch} className="flex gap-3 max-w-2xl relative">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setIsFocused(true);
                      }}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setTimeout(() => setIsFocused(false), 250)}
                      placeholder="Search by full name, VEGA unique ID (e.g. TB-2026-10482), college or core skill..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-500 text-white"
                    />

                    {/* Auto-Recommend Suggestions Popup */}
                    {isFocused && (recommendations.length > 0 || loadingRecommendations) && (
                      <div className="absolute left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto divide-y divide-slate-800/60 text-left">
                        {loadingRecommendations && (
                          <div className="p-3 text-xs text-slate-400 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />
                            Filtering matched connection recommendations...
                          </div>
                        )}
                        {!loadingRecommendations && recommendations.map((rec) => (
                          <div
                            key={rec.id}
                            onClick={() => {
                              setSearchQuery(rec.tb_id);
                              setSearchResults([rec]);
                              setIsFocused(false);
                            }}
                            className="p-3 hover:bg-slate-800/70 transition-colors cursor-pointer flex items-center justify-between gap-3 text-slate-300"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {rec.profile_photo_url ? (
                                <img
                                  src={rec.profile_photo_url}
                                  alt={rec.full_name}
                                  className="w-8 h-8 rounded-full border border-slate-700 object-cover shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                  {rec.full_name.charAt(0)}
                                </div>
                              )}
                              <div className="truncate">
                                <div className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
                                  <span className="truncate">{rec.full_name}</span>
                                  <span className="text-[10px] bg-slate-950 text-indigo-400 px-1.5 py-0.5 rounded font-mono font-bold border border-indigo-950 shrink-0">
                                    {rec.tb_id}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-500 truncate mt-0.5">
                                  {rec.college_name || "Institution not specified"}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {rec.is_placed === 1 && (
                                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5">
                                  Placed @ {rec.placed_company || "TCS"}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  selectTargetStudent(rec.id, rec.tb_id);
                                  setIsFocused(false);
                                }}
                                className="bg-indigo-600/25 hover:bg-indigo-600 text-indigo-300 hover:text-white px-2 py-1 rounded text-[10px] font-bold transition-all shadow-sm"
                              >
                                Select
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={searchLoading}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-all flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    {searchLoading ? "Exploring..." : "Search"}
                  </button>
                </form>
              </div>

              {/* Search Result display */}
              {searchResults.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {searchResults.map((student) => {
                    const skArr = parseSkillsHelper(student.skills_json || student.skills);
                    return (
                      <div 
                        key={student.id} 
                        className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:border-slate-700 transition-all"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <span className="font-mono text-[10px] text-indigo-400 font-bold bg-indigo-950/30 px-2 py-0.5 rounded tracking-wide border border-indigo-900/20">
                              {student.tb_id}
                            </span>
                            {student.is_placed === 1 && (
                              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[9px] uppercase font-bold">
                                Placed
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 mb-4">
                            {student.profile_photo_url ? (
                              <img src={student.profile_photo_url} alt={student.full_name} className="w-10 h-10 rounded-full border border-slate-800 object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-sm">
                                {student.full_name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <h3 className="font-bold text-white text-sm">{student.full_name}</h3>
                              <p className="text-slate-400 text-xs">{student.college_name || "Institution not specified"}</p>
                            </div>
                          </div>

                          <div className="mb-4">
                            <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">Key skills</span>
                            <div className="flex flex-wrap gap-1">
                              {skArr.slice(0, 3).map((s: string, index: number) => (
                                <span key={index} className="bg-slate-950 text-slate-400 text-[10px] border border-slate-850 px-2 py-0.5 rounded">
                                  {s}
                                </span>
                              ))}
                              {skArr.length > 3 && (
                                <span className="text-[10px] text-slate-500 px-1 py-0.5">
                                  +{skArr.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => selectTargetStudent(student.id, student.tb_id)}
                          className="w-full bg-slate-850 hover:bg-indigo-600 hover:text-white transition-all text-slate-300 font-semibold text-xs py-2 rounded-lg cursor-pointer flex items-center justify-center gap-1"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          Compare with Me
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* Tab 4: Insights & Trends */}
          {activeTab === "insights" && (
            <motion.div
              key="insights"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {/* Box 1: Most Missing Skills */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-800/60 pb-3">
                  <ShieldAlert className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-white text-sm">Skills Gaps (Your Target)</h3>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Aggregated key developer skills absent in your profile compared to target benchmarks.
                </p>
                <div className="space-y-3.5">
                  {(insights?.mostMissingSkills || []).map((item: any, idx: number) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-300">{item.skill}</span>
                        <span className="text-slate-500">Found in {item.count} Targets</span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div style={{ width: `${Math.min(100, item.count * 30)}%` }} className="bg-gradient-to-r from-red-500 to-amber-500 h-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Box 2: Trending Skills */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-800/60 pb-3">
                  <Flame className="w-5 h-5 text-amber-500 animate-pulse" />
                  <h3 className="font-bold text-white text-sm">Trending Placement Skills</h3>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  High-priority technologies currently trending in active corporate job descriptions this semester.
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {(insights?.trendingSkills || []).map((skill: string, index: number) => (
                    <span key={index} className="bg-slate-950 hover:border-slate-700 transition-all border border-slate-850 text-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Box 3: Top Recommended Learning Sections */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-800/60 pb-3">
                  <BookOpen className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-white text-sm">Next Learning Areas</h3>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Targeted, focused actions based on current placement patterns.
                </p>
                <ul className="space-y-3">
                  {(insights?.learningAreas || []).map((area: string, idx: number) => (
                    <li key={idx} className="text-xs text-slate-300 flex items-start gap-2 bg-slate-950/40 p-2.5 rounded-lg border border-slate-850">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-1.5 shrink-0" />
                      {area}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}

          {/* Tab 5: Historic Logs */}
          {activeTab === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-indigo-400" />
                    AI Comparison & Roadmap History Logs
                  </h2>
                  <p className="text-slate-400 text-xs mt-1">
                    Re-explore past generated gap analyses and schedules without paying further XP credits.
                  </p>
                </div>
              </div>

              {historyLogs.length === 0 ? (
                <div className="bg-slate-900/60 rounded-xl p-8 border border-slate-800 text-center text-slate-500">
                  <ShieldAlert className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm">No recorded comparison logs yet</p>
                  <p className="text-xs mt-1">Comparisons you construct will appear here under history ledger.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {historyLogs.map((item) => (
                    <div 
                      key={item.id} 
                      className="bg-slate-900 border border-slate-800 hover:border-slate-750 transition-all rounded-2xl p-5 space-y-4"
                    >
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">
                          {new Date(item.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                        </span>
                        <span className="text-indigo-400 font-mono tracking-wide">
                          {item.id % 2 === 0 ? "AI Analysis" : "Success Roadmap"}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 bg-slate-950/40 p-2.5 rounded-lg border border-slate-850">
                        {item.target.photo ? (
                          <img src={item.target.photo} alt={item.target.name} className="w-9 h-9 rounded-full object-cover border border-slate-800" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-sm">
                            {item.target.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-white text-sm">{item.target.name}</h4>
                          <span className="text-[10px] text-slate-400">
                            {item.target.company ? `Placed @ ${item.target.company}` : "Mock Target Candidate"}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleLoadPriorReport(item)}
                        className="w-full bg-slate-800 hover:bg-indigo-600 hover:text-white transition-all text-xs font-semibold py-2 rounded-lg cursor-pointer flex items-center justify-center gap-1 border border-slate-750"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Restore Analysis
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
