import React from "react";
import api from "../../services/api.ts";
import { 
  Sparkles, 
  Briefcase, 
  MapPin, 
  GraduationCap, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  SlidersHorizontal, 
  User, 
  Mail, 
  FileText, 
  Check, 
  Send, 
  Search, 
  Info,
  X,
  Clock,
  ShieldCheck,
  Users
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Job {
  id: number;
  title: string;
  location: string;
  job_type: string;
  skills_json: string | string[];
  status: string;
  total_applicants: number;
}

interface Candidate {
  studentId: number;
  userId: number;
  fullName: string;
  email: string;
  profilePhotoUrl: string;
  college: string;
  location: string;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  resumeAvailable: boolean;
  profileCompleteness: number;
  talentScore: number;
  alreadyApplied: boolean;
  appliedStatus: string;
  alreadyNotified: boolean;
  recommendationReason: string;
}

interface NotifiedCandidate {
  notificationId: number;
  jobId: number;
  jobTitle: string;
  jobLocation: string;
  studentId: number;
  studentUserId: number;
  studentName: string;
  studentEmail: string;
  studentLocation: string;
  collegeName: string;
  matchScore: number | string;
  matchedSkills: string[];
  recommendationReason: string;
  notifiedAt: string;
  notificationStatus: string;
  notifiedBy: string;
  notifierRole: string;
}

export function RecommendationsTab() {
  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = React.useState<number | "">("");
  const [minMatch, setMinMatch] = React.useState<number>(70);
  const [candidates, setCandidates] = React.useState<Candidate[]>([]);
  
  // Tab state
  const [activeTab, setActiveTab] = React.useState<"matches" | "notified">("matches");

  // Notified students state
  const [notifiedCandidates, setNotifiedCandidates] = React.useState<NotifiedCandidate[]>([]);
  const [loadingNotified, setLoadingNotified] = React.useState(false);
  const [notifiedJobFilter, setNotifiedJobFilter] = React.useState<string>("");
  const [notifiedSearchTerm, setNotifiedSearchTerm] = React.useState<string>("");

  // Loading & State variables
  const [loadingJobs, setLoadingJobs] = React.useState(true);
  const [loadingCandidates, setLoadingCandidates] = React.useState(false);
  const [notifyingCandidates, setNotifyingCandidates] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Info modal state
  const [showInfoModal, setShowInfoModal] = React.useState(false);

  // Filters state
  const [showFilters, setShowFilters] = React.useState(false);
  const [filterSkills, setFilterSkills] = React.useState<string>("");
  const [filterLocation, setFilterLocation] = React.useState<string>("");
  const [filterCollege, setFilterCollege] = React.useState<string>("");
  const [filterResumeAvailable, setFilterResumeAvailable] = React.useState<boolean>(false);
  const [filterNotAppliedOnly, setFilterNotAppliedOnly] = React.useState<boolean>(false);

  // Bulk select state
  const [selectedCandidateUserIds, setSelectedCandidateUserIds] = React.useState<number[]>([]);
  const [showNotifyModal, setShowNotifyModal] = React.useState(false);
  const [customNotifyMessage, setCustomNotifyMessage] = React.useState("");

  // Detailed view state
  const [selectedCandidate, setSelectedCandidate] = React.useState<Candidate | null>(null);

  React.useEffect(() => {
    fetchJobs();
  }, []);

  React.useEffect(() => {
    if (activeTab === "notified") {
      fetchNotifiedStudents();
    }
  }, [activeTab, notifiedJobFilter, notifiedSearchTerm]);

  // Handle escape key to close modal
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowInfoModal(false);
        setSelectedCandidate(null);
        setShowNotifyModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const fetchJobs = async () => {
    setLoadingJobs(true);
    setErrorMsg(null);
    try {
      const res = await api.get("/companies/recommendations/jobs");
      if (res.data.success) {
        const activeJobs = res.data.data || [];
        setJobs(activeJobs);
        if (activeJobs.length > 0 && !selectedJobId) {
          setSelectedJobId(activeJobs[0].id);
        }
      } else {
        setErrorMsg("Failed to load company jobs.");
      }
    } catch (err: any) {
      console.error("Error fetching jobs for recommendations:", err);
      setErrorMsg(err.response?.data?.message || "Error communicating with the recruitment server.");
    } finally {
      setLoadingJobs(false);
      fetchNotifiedStudents();
    }
  };

  const fetchNotifiedStudents = async () => {
    setLoadingNotified(true);
    try {
      const res = await api.get("/companies/recommendations/notified", {
        params: {
          jobId: notifiedJobFilter,
          search: notifiedSearchTerm
        }
      });
      if (res.data.success) {
        setNotifiedCandidates(res.data.data || []);
      } else {
        setErrorMsg("Failed to fetch notified candidates history.");
      }
    } catch (err: any) {
      console.error("Error fetching notified candidates:", err);
      setErrorMsg(err.response?.data?.message || "Error fetching notified candidates history.");
    } finally {
      setLoadingNotified(false);
    }
  };

  const getRecommendations = async () => {
    if (!selectedJobId) {
      setErrorMsg("Please select a job position to calculate recommendations.");
      return;
    }
    setLoadingCandidates(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setSelectedCandidateUserIds([]);

    const parsedSkills = filterSkills
      ? filterSkills.split(",").map(s => s.trim()).filter(Boolean)
      : [];

    try {
      const res = await api.post(`/companies/recommendations/${selectedJobId}/match`, {
        minMatch: minMatch,
        maxMatch: 100,
        limit: 40,
        filters: {
          skills: parsedSkills,
          location: filterLocation,
          college: filterCollege,
          resumeAvailable: filterResumeAvailable,
          notAppliedOnly: filterNotAppliedOnly
        }
      });

      if (res.data.success) {
        setCandidates(res.data.data.candidates || []);
      } else {
        setErrorMsg("Failed to fetch recommendation matching data.");
      }
    } catch (err: any) {
      console.error("Error matching candidates:", err);
      setErrorMsg(err.response?.data?.message || "An error occurred while matching candidate profiles.");
    } finally {
      setLoadingCandidates(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const eligible = candidates
        .filter(c => !c.alreadyApplied && !c.alreadyNotified)
        .map(c => c.userId);
      setSelectedCandidateUserIds(eligible);
    } else {
      setSelectedCandidateUserIds([]);
    }
  };

  const handleSelectCandidate = (userId: number, checked: boolean) => {
    if (checked) {
      setSelectedCandidateUserIds(prev => [...prev, userId]);
    } else {
      setSelectedCandidateUserIds(prev => prev.filter(id => id !== userId));
    }
  };

  const handleSendNotification = async () => {
    if (selectedCandidateUserIds.length === 0 || !selectedJobId) return;
    setNotifyingCandidates(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Build candidate details for snapshot preservation
    const candidateDetails: Record<number, any> = {};
    for (const uid of selectedCandidateUserIds) {
      const cand = candidates.find(c => c.userId === uid);
      if (cand) {
        candidateDetails[uid] = {
          matchScore: cand.matchScore,
          matchedSkills: cand.matchedSkills,
          recommendationReason: cand.recommendationReason
        };
      }
    }

    try {
      const res = await api.post(`/companies/recommendations/${selectedJobId}/notify`, {
        candidateUserIds: selectedCandidateUserIds,
        message: customMessageText(),
        candidateDetails
      });

      if (res.data.success) {
        const confirmedIds: number[] = [
          ...(res.data.insertedCandidateUserIds || []),
          ...(res.data.alreadyNotifiedCandidateUserIds || [])
        ];
        const insertedCount = res.data.insertedCount !== undefined ? res.data.insertedCount : selectedCandidateUserIds.length;

        setSuccessMsg(`Successfully sent interest notice to ${insertedCount} candidate(s).`);
        setShowNotifyModal(false);
        
        // Update local state for server-confirmed candidates only
        if (confirmedIds.length > 0) {
          setCandidates(prev => prev.map(c => {
            if (confirmedIds.includes(c.userId)) {
              return { ...c, alreadyNotified: true };
            }
            return c;
          }));
        }

        setSelectedCandidateUserIds([]);
        
        // Refetch notified history so Tab 2 updates immediately
        await fetchNotifiedStudents();
      } else {
        setErrorMsg("Failed to send recruitment invitations.");
      }
    } catch (err: any) {
      console.error("Error sending bulk interest notifications:", err);
      setErrorMsg(err.response?.data?.message || "An error occurred while dispatching invitations.");
    } finally {
      setNotifyingCandidates(false);
    }
  };

  const customMessageText = () => {
    if (customNotifyMessage.trim()) return customNotifyMessage;
    const currentJob = jobs.find(j => j.id === selectedJobId);
    return `We found your profile highly suitable for the role "${currentJob?.title || "Position"}". Kindly review the job posting and apply through VEGA!`;
  };

  const activeJobDetails = jobs.find(j => j.id === selectedJobId);

  // Dynamic color for slider score
  const getScoreColorClass = (score: number) => {
    if (score >= 80) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (score >= 60) return "bg-blue-50 text-blue-700 border-blue-200";
    if (score >= 40) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-rose-50 text-rose-700 border-rose-200";
  };

  return (
    <div className="space-y-4">
      {/* Header & Helper Section */}
      <div className="border-b border-slate-100 pb-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 text-[11px] font-black rounded-full uppercase tracking-wider flex items-center gap-1.5 border border-blue-100/50">
                <Sparkles size={12} className="text-blue-600 animate-pulse" />
                Powered by VEGA AI
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Hiring Copilot
              </h1>
              
              {/* Accessible Info Icon */}
              <button
                onClick={() => setShowInfoModal(true)}
                aria-label="Hiring Copilot explanation"
                title="Learn how Hiring Copilot works"
                className="p-1 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Info size={18} />
              </button>
            </div>

            {/* Always Visible Helper Line */}
            <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
              Select an open position, set the required match strength, and let VEGA identify suitable candidates using skills, profile, and pipeline-ready data.
            </p>
          </div>

          <button 
            onClick={fetchJobs} 
            disabled={loadingJobs}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 shrink-0"
          >
            <RefreshCw size={13} className={loadingJobs ? "animate-spin" : ""} />
            Refresh Positions
          </button>
        </div>
      </div>

      {/* Main Control & Configuration Bar */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 lg:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          
          {/* 1. Select Position (lg:col-span-4) */}
          <div className="lg:col-span-4 space-y-1">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
              Select Position / Requirement
            </label>
            <div className="relative">
              <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <select
                value={selectedJobId}
                onChange={(e) => {
                  setSelectedJobId(e.target.value ? Number(e.target.value) : "");
                  setCandidates([]);
                }}
                disabled={loadingJobs}
                className="w-full h-11 bg-[#F8FAFC] border border-slate-200 rounded-xl pl-10 pr-8 text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 disabled:opacity-50 appearance-none"
              >
                {jobs.length === 0 ? (
                  <option value="">No open positions available</option>
                ) : (
                  jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title} ({job.location || "Remote"})
                    </option>
                  ))
                )}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                <SlidersHorizontal size={13} className="text-slate-400" />
              </div>
            </div>
          </div>

          {/* 2. Minimum Match Strength Slider (lg:col-span-4) */}
          <div className="lg:col-span-4 space-y-1">
            <div className="flex justify-between items-center">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                Minimum Match Strength
              </label>
              <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full border ${getScoreColorClass(minMatch)}`}>
                {minMatch}%
              </span>
            </div>
            
            <div className="flex items-center gap-3 h-11 bg-[#F8FAFC] border border-slate-200 rounded-xl px-4">
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={minMatch}
                onChange={(e) => setMinMatch(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-12 shrink-0 text-right">
                10-100%
              </span>
            </div>
          </div>

          {/* 3. Filters & Action Buttons (lg:col-span-4) */}
          <div className="lg:col-span-4 flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`h-11 flex items-center justify-center gap-1.5 px-3.5 border rounded-xl font-bold text-xs transition-all shrink-0 ${
                showFilters 
                  ? "bg-slate-900 border-slate-900 text-white" 
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <SlidersHorizontal size={14} />
              Filters
              {(filterSkills || filterLocation || filterCollege || filterResumeAvailable || filterNotAppliedOnly) && (
                <span className="w-2 h-2 rounded-full bg-blue-600" />
              )}
            </button>

            <button
              onClick={getRecommendations}
              disabled={loadingCandidates || !selectedJobId}
              className="flex-1 h-11 flex items-center justify-center gap-2 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              <Sparkles size={15} className={loadingCandidates ? "animate-spin" : ""} />
              {loadingCandidates ? "Calculating Matches..." : "Match Candidates with VEGA AI"}
            </button>
          </div>
        </div>

        {/* Expandable Advanced Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-slate-100 pt-4 space-y-3"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Filter Skills */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    Must Have Skills (Comma separated)
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                    <input
                      type="text"
                      placeholder="e.g. React, Python, SQL"
                      value={filterSkills}
                      onChange={(e) => setFilterSkills(e.target.value)}
                      className="w-full h-9 bg-[#F8FAFC] border border-slate-200 rounded-lg pl-9 pr-3 text-xs font-semibold outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Filter Location */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    Candidate Location
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                    <input
                      type="text"
                      placeholder="e.g. Bangalore, Remote"
                      value={filterLocation}
                      onChange={(e) => setFilterLocation(e.target.value)}
                      className="w-full h-9 bg-[#F8FAFC] border border-slate-200 rounded-lg pl-9 pr-3 text-xs font-semibold outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Filter College */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    College / University
                  </label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                    <input
                      type="text"
                      placeholder="e.g. IIT, NIT"
                      value={filterCollege}
                      onChange={(e) => setFilterCollege(e.target.value)}
                      className="w-full h-9 bg-[#F8FAFC] border border-slate-200 rounded-lg pl-9 pr-3 text-xs font-semibold outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Checkbox filters */}
              <div className="flex flex-wrap items-center gap-5 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filterResumeAvailable}
                    onChange={(e) => setFilterResumeAvailable(e.target.checked)}
                    className="w-3.5 h-3.5 text-blue-600 bg-slate-50 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-slate-600">Only candidates with Resume available</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filterNotAppliedOnly}
                    onChange={(e) => setFilterNotAppliedOnly(e.target.checked)}
                    className="w-3.5 h-3.5 text-blue-600 bg-slate-50 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-slate-600">Exclude candidates who already applied</span>
                </label>

                {/* Reset Filters */}
                <button
                  onClick={() => {
                    setFilterSkills("");
                    setFilterLocation("");
                    setFilterCollege("");
                    setFilterResumeAvailable(false);
                    setFilterNotAppliedOnly(false);
                  }}
                  className="text-xs font-black text-blue-600 hover:text-blue-700 ml-auto"
                >
                  Clear All Filters
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Dynamic Feedback Alerts */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl flex items-center gap-3 text-xs font-semibold">
          <AlertCircle size={15} className="text-rose-600 shrink-0" />
          <span className="flex-1">{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="font-bold hover:text-rose-900">&times;</button>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl flex items-center gap-3 text-xs font-semibold">
          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
          <span className="flex-1">{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="font-bold hover:text-emerald-900">&times;</button>
        </div>
      )}

      {/* Navigation Tabs Bar */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-extrabold text-slate-500">
        <button
          onClick={() => setActiveTab("matches")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "matches"
              ? "border-blue-600 text-blue-600 font-black"
              : "border-transparent hover:text-slate-800"
          }`}
        >
          <Sparkles size={14} />
          Candidate Matches
          {candidates.length > 0 && (
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[10px]">
              {candidates.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("notified")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "notified"
              ? "border-blue-600 text-blue-600 font-black"
              : "border-transparent hover:text-slate-800"
          }`}
        >
          <Users size={14} />
          Notified Students
          {notifiedCandidates.length > 0 && (
            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-[10px]">
              {notifiedCandidates.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: CANDIDATE MATCHES */}
      {activeTab === "matches" && (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
          {/* Bulk action toolbar */}
          {selectedCandidateUserIds.length > 0 && (
            <div className="bg-blue-50/80 border-b border-blue-100 px-6 py-3 flex items-center justify-between">
              <span className="text-xs font-bold text-blue-800 flex items-center gap-2">
                <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-black">
                  {selectedCandidateUserIds.length}
                </span>
                candidate(s) selected for invitation notice.
              </span>
              <button
                onClick={() => setShowNotifyModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-lg transition-all shadow-sm active:scale-95"
              >
                <Send size={12} />
                Notify Selected ({selectedCandidateUserIds.length})
              </button>
            </div>
          )}

          {/* Results Area */}
          {loadingCandidates ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full border-3 border-blue-100 border-t-blue-600 animate-spin" />
                <Sparkles className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600" size={13} />
              </div>
              <p className="text-xs font-bold text-slate-800 animate-pulse">
                Analyzing skills, keywords, experience, and talent metrics...
              </p>
              <p className="text-[10px] text-slate-400">Powered by VEGA AI Match Engine</p>
            </div>
          ) : candidates.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-14 h-14 bg-[#F8FAFC] rounded-full flex items-center justify-center mx-auto border border-slate-100">
                <User className="text-slate-400" size={22} />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-xs font-extrabold text-slate-800">No candidate recommendations loaded</h3>
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed px-4">
                  Select an open position above and click &quot;Match Candidates with VEGA AI&quot; to calculate matches based on current student profiles.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC]/80 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="py-3.5 px-5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          selectedCandidateUserIds.length > 0 &&
                          selectedCandidateUserIds.length === candidates.filter(c => !c.alreadyApplied && !c.alreadyNotified).length
                        }
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-3.5 h-3.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                      />
                    </th>
                    <th className="py-3.5 px-5">Candidate Details</th>
                    <th className="py-3.5 px-5 text-center">Match Strength</th>
                    <th className="py-3.5 px-5">Skills Overlap</th>
                    <th className="py-3.5 px-5">VEGA AI Recommendation Insights</th>
                    <th className="py-3.5 px-5 text-center">Status</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {candidates.map((cand) => {
                    const isCandidateNotifiable = !cand.alreadyApplied && !cand.alreadyNotified;
                    return (
                      <tr 
                        key={cand.studentId} 
                        className={`hover:bg-[#F8FAFC]/60 transition-colors ${
                          cand.alreadyNotified ? "bg-[#F8FAFC]/30" : ""
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-4 px-5 text-center">
                          <input
                            type="checkbox"
                            disabled={!isCandidateNotifiable}
                            checked={selectedCandidateUserIds.includes(cand.userId)}
                            onChange={(e) => handleSelectCandidate(cand.userId, e.target.checked)}
                            className="w-3.5 h-3.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          />
                        </td>

                        {/* Candidate Info */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                              {cand.profilePhotoUrl ? (
                                <img src={cand.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full text-xs font-black bg-blue-50 text-blue-600 flex items-center justify-center uppercase">
                                  {cand.fullName?.[0]}
                                </div>
                              )}
                            </div>
                            <div>
                              <span className="font-extrabold text-slate-900 block leading-tight">{cand.fullName}</span>
                              <span className="text-[10px] text-slate-400 font-medium block mt-0.5 flex items-center gap-1">
                                <Mail size={10} /> {cand.email}
                              </span>
                              <div className="flex items-center gap-2.5 mt-1 text-[10px] font-bold text-slate-500">
                                <span className="flex items-center gap-1 shrink-0"><GraduationCap size={11} className="text-slate-400" /> {cand.college}</span>
                                <span className="flex items-center gap-1 shrink-0"><MapPin size={11} className="text-slate-400" /> {cand.location}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Match Rating */}
                        <td className="py-4 px-5 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className={`text-sm font-black px-2.5 py-0.5 rounded-full border ${getScoreColorClass(cand.matchScore)}`}>
                              {cand.matchScore}%
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                              Rating
                            </span>
                          </div>
                        </td>

                        {/* Skills */}
                        <td className="py-4 px-5 max-w-[200px]">
                          <div className="space-y-1.5">
                            {cand.matchedSkills.length > 0 && (
                              <div>
                                <div className="text-[9px] font-black uppercase text-emerald-600 tracking-wider mb-0.5">
                                  Matched ({cand.matchedSkills.length})
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {cand.matchedSkills.slice(0, 3).map((skill) => (
                                    <span key={skill} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-bold rounded border border-emerald-100/50">
                                      {skill}
                                    </span>
                                  ))}
                                  {cand.matchedSkills.length > 3 && (
                                    <span className="px-1.5 py-0.5 bg-slate-50 text-slate-500 text-[9px] font-bold rounded">
                                      +{cand.matchedSkills.length - 3}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {cand.missingSkills.length > 0 && (
                              <div>
                                <div className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-0.5">
                                  Missing ({cand.missingSkills.length})
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {cand.missingSkills.slice(0, 2).map((skill) => (
                                    <span key={skill} className="px-1.5 py-0.5 bg-slate-50 text-slate-500 text-[9px] font-bold rounded">
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* AI Summary */}
                        <td className="py-4 px-5 max-w-[260px]">
                          <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-[11px] text-slate-600 font-medium leading-relaxed italic relative">
                            <Sparkles size={11} className="text-indigo-400 absolute right-2 top-2" />
                            &ldquo;{cand.recommendationReason || "Calculating recommendation..."}&rdquo;
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-5 text-center">
                          <div className="flex flex-col items-center">
                            {cand.alreadyApplied ? (
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                cand.appliedStatus === "Already in Pipeline"
                                  ? "bg-amber-50 text-amber-700 border border-amber-100"
                                  : "bg-blue-50 text-blue-700 border border-blue-100"
                              }`}>
                                {cand.appliedStatus}
                              </span>
                            ) : cand.alreadyNotified ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                                Already Notified
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
                                Eligible
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedCandidate(cand)}
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
                              title="View Candidate Full Profile"
                            >
                              <FileText size={15} />
                            </button>

                            <button
                              disabled={!isCandidateNotifiable}
                              onClick={() => {
                                setSelectedCandidateUserIds([cand.userId]);
                                setShowNotifyModal(true);
                              }}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isCandidateNotifiable
                                  ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                                  : "bg-slate-100 text-slate-300 cursor-not-allowed"
                              }`}
                              title={
                                cand.alreadyApplied 
                                  ? "Already Applied" 
                                  : cand.alreadyNotified 
                                  ? "Already Invited" 
                                  : "Send Invitation Notice"
                              }
                            >
                              {cand.alreadyNotified ? <Check size={15} /> : <Send size={15} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: NOTIFIED STUDENTS */}
      {activeTab === "notified" && (
        <div className="bg-white border border-slate-100 rounded-2xl p-4 lg:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-4">
          {/* Filters for Notified Students */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2 border-b border-slate-100">
            {/* Filter by Job Position */}
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                Filter by Position
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <select
                  value={notifiedJobFilter}
                  onChange={(e) => setNotifiedJobFilter(e.target.value)}
                  className="w-full h-10 bg-[#F8FAFC] border border-slate-200 rounded-xl pl-10 pr-4 text-xs font-semibold outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 appearance-none"
                >
                  <option value="">All Company Positions</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title} ({j.location || "Remote"})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Search Input */}
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                Search Student or Position
              </label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="text"
                  placeholder="Search by student name, email, or role..."
                  value={notifiedSearchTerm}
                  onChange={(e) => setNotifiedSearchTerm(e.target.value)}
                  className="w-full h-10 bg-[#F8FAFC] border border-slate-200 rounded-xl pl-10 pr-3 text-xs font-semibold outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Notified History Table */}
          {loadingNotified ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-blue-100 border-t-blue-600 animate-spin" />
              <p className="text-xs font-bold text-slate-600">Loading notified candidates history...</p>
            </div>
          ) : notifiedCandidates.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 bg-[#F8FAFC] rounded-full flex items-center justify-center mx-auto border border-slate-100">
                <Users className="text-slate-400" size={20} />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-xs font-extrabold text-slate-800">No notified candidates found</h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  {notifiedJobFilter || notifiedSearchTerm
                    ? "No notifications match the active filter criteria."
                    : "No recruitment interest notices have been sent yet using Hiring Copilot."}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC]/80 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="py-3.5 px-5">Student Candidate</th>
                    <th className="py-3.5 px-5">Job Requirement</th>
                    <th className="py-3.5 px-5 text-center">Match Strength</th>
                    <th className="py-3.5 px-5">Matched Skills</th>
                    <th className="py-3.5 px-5">Notification Sent</th>
                    <th className="py-3.5 px-5">Notified By</th>
                    <th className="py-3.5 px-5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {notifiedCandidates.map((item) => (
                    <tr key={item.notificationId} className="hover:bg-[#F8FAFC]/60 transition-colors">
                      {/* Candidate */}
                      <td className="py-4 px-5">
                        <div>
                          <span className="font-extrabold text-slate-900 block">{item.studentName}</span>
                          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                            <Mail size={10} /> {item.studentEmail}
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1 mt-0.5">
                            <GraduationCap size={10} /> {item.collegeName}
                          </span>
                        </div>
                      </td>

                      {/* Job */}
                      <td className="py-4 px-5">
                        <div>
                          <span className="font-bold text-slate-800 block">{item.jobTitle}</span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin size={10} /> {item.jobLocation}
                          </span>
                        </div>
                      </td>

                      {/* Match Score */}
                      <td className="py-4 px-5 text-center">
                        {typeof item.matchScore === "number" && item.matchScore > 0 ? (
                          <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${getScoreColorClass(item.matchScore)}`}>
                            {item.matchScore}%
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400">
                            {item.matchScore || "Not recorded"}
                          </span>
                        )}
                      </td>

                      {/* Matched Skills */}
                      <td className="py-4 px-5 max-w-[180px]">
                        {item.matchedSkills && item.matchedSkills.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {item.matchedSkills.slice(0, 3).map(skill => (
                              <span key={skill} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-bold rounded">
                                {skill}
                              </span>
                            ))}
                            {item.matchedSkills.length > 3 && (
                              <span className="text-[9px] font-bold text-slate-400">+{item.matchedSkills.length - 3}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400">Not recorded</span>
                        )}
                      </td>

                      {/* Notified At */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-1 text-[11px] text-slate-600 font-semibold">
                          <Clock size={12} className="text-slate-400 shrink-0" />
                          {item.notifiedAt ? new Date(item.notifiedAt).toLocaleString() : "N/A"}
                        </div>
                      </td>

                      {/* Notified By */}
                      <td className="py-4 px-5">
                        <span className="text-xs font-semibold text-slate-700 block">
                          {item.notifiedBy}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-5 text-center">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-[9px] font-black uppercase tracking-wider">
                          {item.notificationStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ACCESSIBLE INFO MODAL */}
      <AnimatePresence>
        {showInfoModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl border border-slate-100/50 p-6 lg:p-7 space-y-5"
            >
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <Info size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 leading-tight">
                      How Hiring Copilot Works
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Intelligent talent recommendations powered by VEGA AI
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowInfoModal(false)}
                  aria-label="Close explanation"
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors font-bold text-lg"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 max-h-[420px] overflow-y-auto text-xs text-slate-600 leading-relaxed pr-1">
                <div className="space-y-1.5">
                  <h3 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                    <Briefcase size={14} className="text-blue-600" />
                    1. Job Position & Minimum Match Strength
                  </h3>
                  <p>
                    Select any active job posting created by your company. Adjust the Minimum Match Strength slider (10% to 100%) to specify the baseline qualification threshold required for candidates.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h3 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                    <Sparkles size={14} className="text-indigo-600" />
                    2. AI Profile Matching Engine
                  </h3>
                  <p>
                    VEGA compares job requirements with candidate profiles across five core dimensions:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-500 pl-2">
                    <li><strong className="text-slate-700">Required Skills Overlap (40%):</strong> Compares candidate skill sets against mandatory job skills.</li>
                    <li><strong className="text-slate-700">Resume & Profile Keywords (25%):</strong> Evaluates keyword relevance in bio, headlines, and experience.</li>
                    <li><strong className="text-slate-700">Role & Career Intent (15%):</strong> Alignment between desired role and job title.</li>
                    <li><strong className="text-slate-700">Projects & Experience (10%):</strong> Practical experience and portfolio quality.</li>
                    <li><strong className="text-slate-700">Talent Assessment Score (10%):</strong> Verified PQ, IQ, EQ, and SQ assessment scores.</li>
                  </ul>
                </div>

                <div className="space-y-1.5">
                  <h3 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                    <Send size={14} className="text-blue-600" />
                    3. Candidate Notifications
                  </h3>
                  <p>
                    When you notify candidates, VEGA sends a platform alert to their student dashboard and an automated interest email. Candidate notifications are recorded in real time and can be tracked under the <strong>Notified Students</strong> tab.
                  </p>
                </div>

                {/* Score Disclaimer */}
                <div className="p-3.5 bg-amber-50/80 border border-amber-100 rounded-xl space-y-1">
                  <h4 className="font-extrabold text-amber-800 text-[11px] flex items-center gap-1.5">
                    <AlertCircle size={13} className="text-amber-600 shrink-0" />
                    Recruitment Metric Disclaimer
                  </h4>
                  <p className="text-[11px] text-amber-900/80 font-medium leading-relaxed">
                    Match scores serve as an automated recruitment-assistance metric based on profile analysis. They do not constitute a binding guarantee of hiring outcomes. Full profile review and standard company interview evaluations remain required.
                  </p>
                </div>

                {/* Data Privacy & Scope */}
                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                  <h4 className="font-extrabold text-slate-800 text-[11px] flex items-center gap-1.5">
                    <ShieldCheck size={13} className="text-slate-600 shrink-0" />
                    Company Isolation & Data Security
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    All recommendation data and notification history are strictly isolated to your company organization and authorized HR staff accounts.
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 flex justify-end">
                <button
                  onClick={() => setShowInfoModal(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl"
                >
                  Got It, Thanks
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DETAILED CANDIDATE PROFILE MODAL */}
      <AnimatePresence>
        {selectedCandidate && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border border-slate-100/50"
            >
              {/* Header */}
              <div className="p-5 bg-[#090b21] text-white flex justify-between items-start">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-full bg-indigo-600 overflow-hidden shrink-0 border-2 border-indigo-500/50">
                    {selectedCandidate.profilePhotoUrl ? (
                      <img src={selectedCandidate.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full text-sm font-black flex items-center justify-center uppercase">
                        {selectedCandidate.fullName?.[0]}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-black leading-tight">{selectedCandidate.fullName}</h3>
                    <p className="text-xs text-indigo-300 font-medium mt-0.5">{selectedCandidate.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 text-xs font-black rounded-full uppercase tracking-wider">
                    {selectedCandidate.matchScore}% Match
                  </span>
                  <button
                    onClick={() => setSelectedCandidate(null)}
                    aria-label="Close modal"
                    className="p-1 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 lg:p-6 space-y-5 max-h-[460px] overflow-y-auto">
                {/* AI Insights */}
                <div className="bg-indigo-50/50 border border-indigo-100/40 rounded-xl p-4 space-y-1.5">
                  <h4 className="text-xs font-black uppercase text-indigo-700 tracking-wider flex items-center gap-1.5">
                    <Sparkles size={12} className="text-indigo-600" />
                    VEGA AI Matching Insights
                  </h4>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed italic">
                    &ldquo;{selectedCandidate.recommendationReason || "Analyzing matching metrics..."}&rdquo;
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Talent Score</span>
                    <p className="text-lg font-extrabold text-slate-800 mt-0.5">{selectedCandidate.talentScore || "N/A"}/100</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Profile Completeness</span>
                    <p className="text-lg font-extrabold text-slate-800 mt-0.5">{selectedCandidate.profileCompleteness || 0}%</p>
                  </div>
                </div>

                {/* College & Location */}
                <div className="space-y-3">
                  <div className="flex items-start gap-2.5">
                    <GraduationCap className="text-slate-400 shrink-0 mt-0.5" size={15} />
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">College Master Match</span>
                      <p className="text-xs font-bold text-slate-800 mt-0.5">{selectedCandidate.college}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <MapPin className="text-slate-400 shrink-0 mt-0.5" size={15} />
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Candidate Location</span>
                      <p className="text-xs font-bold text-slate-800 mt-0.5">{selectedCandidate.location}</p>
                    </div>
                  </div>
                </div>

                {/* Skills */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Skills Breakdown</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCandidate.matchedSkills.map(skill => (
                      <span key={skill} className="px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] font-bold rounded-md border border-emerald-100/50">
                        Matched: {skill}
                      </span>
                    ))}
                    {selectedCandidate.missingSkills.map(skill => (
                      <span key={skill} className="px-2 py-0.5 bg-slate-50 text-slate-500 text-[10px] font-bold rounded-md border border-slate-200/50">
                        Missing: {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                {selectedCandidate.resumeAvailable ? (
                  <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                    <FileText size={13} className="text-slate-400" />
                    Verified Resume Available
                  </span>
                ) : (
                  <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                    <FileText size={13} className="text-slate-300" />
                    No Resume PDF uploaded
                  </span>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedCandidate(null)}
                    className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl"
                  >
                    Close
                  </button>

                  <button
                    disabled={selectedCandidate.alreadyApplied || selectedCandidate.alreadyNotified}
                    onClick={() => {
                      setSelectedCandidateUserIds([selectedCandidate.userId]);
                      setShowNotifyModal(true);
                      setSelectedCandidate(null);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5"
                  >
                    <Send size={12} />
                    Invite Candidate
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* NOTIFY INVITATION MODAL */}
      <AnimatePresence>
        {showNotifyModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border border-slate-100/50 p-5 lg:p-6 space-y-5"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-1.5">
                    <Send className="text-blue-600" size={18} />
                    Notify Selected Talent
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    Send an automated platform alert and interest email to candidates.
                  </p>
                </div>
                <button
                  onClick={() => setShowNotifyModal(false)}
                  aria-label="Close modal"
                  className="p-1 text-slate-400 hover:text-slate-600 font-bold text-base"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Message Details */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    Recipient Group
                  </label>
                  <div className="p-2.5 bg-blue-50/70 border border-blue-100 text-blue-800 rounded-xl text-xs font-extrabold">
                    {selectedCandidateUserIds.length} candidate(s) to notify
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      Custom Email/Notification Message
                    </label>
                    <span className="text-[10px] font-bold text-slate-400">Optional</span>
                  </div>
                  <textarea
                    rows={3}
                    placeholder={`e.g. We found your profile highly suitable for the role "${activeJobDetails?.title || "Position"}"...`}
                    value={customNotifyMessage}
                    onChange={(e) => setCustomNotifyMessage(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400 text-slate-700"
                  />
                  <span className="text-[10px] font-medium text-slate-400 block leading-tight">
                    This message will supplement the automatic recruitment interest notice sent directly to the student dashboard and email address.
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowNotifyModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendNotification}
                  disabled={notifyingCandidates}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95"
                >
                  <Send size={12} className={notifyingCandidates ? "animate-pulse" : ""} />
                  {notifyingCandidates ? "Dispatching..." : "Send Recruitment Notice"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
