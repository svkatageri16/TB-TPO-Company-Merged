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
  HelpCircle,
  AlertTriangle,
  ExternalLink
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

export function RecommendationsTab() {
  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = React.useState<number | "">("");
  const [minMatch, setMinMatch] = React.useState<number>(70);
  const [candidates, setCandidates] = React.useState<Candidate[]>([]);
  
  // Loading & State variables
  const [loadingJobs, setLoadingJobs] = React.useState(true);
  const [loadingCandidates, setLoadingCandidates] = React.useState(false);
  const [notifyingCandidates, setNotifyingCandidates] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

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

  const fetchJobs = async () => {
    setLoadingJobs(true);
    setErrorMsg(null);
    try {
      const res = await api.get("/companies/recommendations/jobs");
      if (res.data.success) {
        const activeJobs = res.data.data || [];
        setJobs(activeJobs);
        if (activeJobs.length > 0) {
          setSelectedJobId(activeJobs[0].id);
        }
      } else {
        setErrorMsg("Failed to load company jobs.");
      }
    } catch (err: any) {
      console.error("Error fetching jobs for recommendations:", err);
      setErrorMsg("Error communicating with the recruitment server.");
    } finally {
      setLoadingJobs(false);
    }
  };

  const getRecommendations = async () => {
    if (!selectedJobId) {
      setErrorMsg("Please select a job post to get recommendations.");
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
      setErrorMsg("An error occurred while matching candidate profiles with job requirements.");
    } finally {
      setLoadingCandidates(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select only candidates that are eligible (not already applied & not already notified)
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
    if (selectedCandidateUserIds.length === 0) return;
    setNotifyingCandidates(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.post(`/companies/recommendations/${selectedJobId}/notify`, {
        candidateUserIds: selectedCandidateUserIds,
        message: customMessageText()
      });

      if (res.data.success) {
        setSuccessMsg(`Successfully sent interest invitation to ${selectedCandidateUserIds.length} candidate(s).`);
        setShowNotifyModal(false);
        setSelectedCandidateUserIds([]);
        // Refresh matching list to reflect notified status
        getRecommendations();
      } else {
        setErrorMsg("Failed to send recruitment invitations.");
      }
    } catch (err: any) {
      console.error("Error sending bulk interest notifications:", err);
      setErrorMsg("An error occurred while dispatching invitations.");
    } finally {
      setNotifyingCandidates(false);
    }
  };

  const customMessageText = () => {
    if (customNotifyMessage.trim()) return customNotifyMessage;
    const currentJob = jobs.find(j => j.id === selectedJobId);
    const companyName = "Our Company";
    return `${companyName} is highly interested in your profile for the position of ${currentJob?.title || "Role"}. Kindly review the opportunity on VEGA and apply!`;
  };

  const activeJobDetails = jobs.find(j => j.id === selectedJobId);

  return (
    <div className="space-y-6">
      {/* Premium Header Accent */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 text-xs font-black rounded-full uppercase tracking-wider flex items-center gap-1.5 border border-blue-100/50">
              <Sparkles size={12} className="text-blue-600 animate-pulse" />
              Powered by Vega AI
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Hiring Copilot
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Discover highly qualified candidates matched deterministically and refined via Talent AI models.
          </p>
        </div>

        <button 
          onClick={fetchJobs} 
          disabled={loadingJobs}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loadingJobs ? "animate-spin" : ""} />
          Refresh Positions
        </button>
      </div>

      {/* Main Configuration Card */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 lg:p-8 shadow-[0_10px_40px_rgba(0,0,0,0.01)] space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-end">
          {/* Job Post Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
              Select Position / Requirement
            </label>
            <div className="relative">
              <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select
                value={selectedJobId}
                onChange={(e) => {
                  setSelectedJobId(e.target.value ? Number(e.target.value) : "");
                  setCandidates([]);
                }}
                disabled={loadingJobs}
                className="w-full bg-[#F8FAFC] border border-slate-200/80 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 disabled:opacity-50 appearance-none"
              >
                {jobs.length === 0 ? (
                  <option value="">No positions posted yet</option>
                ) : (
                  jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title} ({job.location || "Remote"})
                    </option>
                  ))
                )}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none border-l border-slate-200 pl-2">
                <SlidersHorizontal size={14} className="text-slate-400" />
              </div>
            </div>
          </div>

          {/* Slider for Minimum Match Score */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Minimum Match Strength
              </label>
              <span className="text-sm font-extrabold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                {minMatch}%
              </span>
            </div>
            <div className="flex items-center gap-4 bg-[#F8FAFC] border border-slate-200/80 rounded-2xl px-5 py-4">
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={minMatch}
                onChange={(e) => setMinMatch(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-10 shrink-0 text-right">
                10-100%
              </span>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center gap-2 px-5 py-3.5 border rounded-2xl font-bold text-xs transition-all ${
                showFilters 
                  ? "bg-slate-900 border-slate-900 text-white" 
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <SlidersHorizontal size={16} />
              Filters
              {(filterSkills || filterLocation || filterCollege || filterResumeAvailable || filterNotAppliedOnly) && (
                <span className="w-2 h-2 rounded-full bg-blue-600" />
              )}
            </button>

            <button
              onClick={getRecommendations}
              disabled={loadingCandidates || !selectedJobId}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-2xl transition-all shadow-md shadow-blue-500/10 active:scale-95 disabled:opacity-50"
            >
              <Sparkles size={16} className={loadingCandidates ? "animate-spin" : ""} />
              {loadingCandidates ? "Calculating Matches..." : "Match Candidates with Vega AI"}
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
              transition={{ duration: 0.25 }}
              className="overflow-hidden border-t border-slate-100 pt-6 space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Filter Skills */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    Must Have Skills (Comma separated)
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="text"
                      placeholder="e.g. React, Python, Node.js"
                      value={filterSkills}
                      onChange={(e) => setFilterSkills(e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Filter Location */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    Candidate Location
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="text"
                      placeholder="e.g. Bangalore, Remote"
                      value={filterLocation}
                      onChange={(e) => setFilterLocation(e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Filter College */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    College / University
                  </label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="text"
                      placeholder="e.g. IIT, Stanford"
                      value={filterCollege}
                      onChange={(e) => setFilterCollege(e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Checkbox filters */}
              <div className="flex flex-wrap items-center gap-6 pt-2">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filterResumeAvailable}
                    onChange={(e) => setFilterResumeAvailable(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-slate-50 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-slate-600">Only show candidates with Resume available</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filterNotAppliedOnly}
                    onChange={(e) => setFilterNotAppliedOnly(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-slate-50 border-slate-300 rounded focus:ring-blue-500"
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
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl flex items-center gap-3 text-xs font-semibold">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <span className="flex-1">{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="font-bold hover:text-rose-900">&times;</button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl flex items-center gap-3 text-xs font-semibold">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span className="flex-1">{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="font-bold hover:text-emerald-900">&times;</button>
        </div>
      )}

      {/* Table Results Section */}
      <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.01)]">
        {/* Bulk action toolbar */}
        {selectedCandidateUserIds.length > 0 && (
          <div className="bg-blue-50 border-b border-blue-100/50 px-8 py-4 flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800 flex items-center gap-2">
              <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-black">
                {selectedCandidateUserIds.length}
              </span>
              candidate(s) selected for invitation.
            </span>
            <button
              onClick={() => setShowNotifyModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm active:scale-95"
            >
              <Send size={12} />
              Notify Selected
            </button>
          </div>
        )}

        {/* Results Area */}
        {loadingCandidates ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
              <Sparkles className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600" size={14} />
            </div>
            <p className="text-sm font-bold text-slate-800 animate-pulse">
              Analyzing profiles, keywords, experience, and certifications...
            </p>
            <p className="text-xs text-slate-400">Powered by Vega AI Match Models</p>
          </div>
        ) : candidates.length === 0 ? (
          <div className="py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-[#F8FAFC] rounded-full flex items-center justify-center mx-auto border border-slate-100">
              <User className="text-slate-400" size={24} />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-sm font-extrabold text-slate-800">No matching candidate recommendations</h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed px-4">
                Select a position and adjust the minimum match strength slider to start querying. Ensure candidate profiles are complete in the database.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC]/50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-4 px-6 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={
                        selectedCandidateUserIds.length > 0 &&
                        selectedCandidateUserIds.length === candidates.filter(c => !c.alreadyApplied && !c.alreadyNotified).length
                      }
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-4 px-6">Candidate Details</th>
                  <th className="py-4 px-6 text-center">Match Rating</th>
                  <th className="py-4 px-6">Skills & Overlap</th>
                  <th className="py-4 px-6">Vega AI Recommendation Summary</th>
                  <th className="py-4 px-6 text-center">Eligibility / Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {candidates.map((cand) => {
                  const isCandidateNotifiable = !cand.alreadyApplied && !cand.alreadyNotified;
                  return (
                    <tr 
                      key={cand.studentId} 
                      className={`hover:bg-[#F8FAFC]/50 transition-colors ${
                        cand.alreadyNotified ? "bg-[#F8FAFC]/20" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-5 px-6 text-center">
                        <input
                          type="checkbox"
                          disabled={!isCandidateNotifiable}
                          checked={selectedCandidateUserIds.includes(cand.userId)}
                          onChange={(e) => handleSelectCandidate(cand.userId, e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        />
                      </td>

                      {/* Info / Profile */}
                      <td className="py-5 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
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
                            <span className="text-[11px] text-slate-400 font-medium block mt-0.5 flex items-center gap-1">
                              <Mail size={10} /> {cand.email}
                            </span>
                            <div className="flex items-center gap-3 mt-1.5 text-[10px] font-bold text-slate-500">
                              <span className="flex items-center gap-1 shrink-0"><GraduationCap size={12} className="text-slate-400" /> {cand.college}</span>
                              <span className="flex items-center gap-1 shrink-0"><MapPin size={12} className="text-slate-400" /> {cand.location}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Match Score Gauge */}
                      <td className="py-5 px-6 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className={`text-base font-black px-2.5 py-0.5 rounded-full ${
                            cand.matchScore >= 80 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : cand.matchScore >= 60
                              ? "bg-blue-50 text-blue-700 border border-blue-100"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}>
                            {cand.matchScore}%
                          </span>
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider mt-1.5">
                            Match Strength
                          </span>
                        </div>
                      </td>

                      {/* Skills Overlap */}
                      <td className="py-5 px-6 max-w-[220px]">
                        <div className="space-y-2">
                          {cand.matchedSkills.length > 0 && (
                            <div>
                              <div className="text-[9px] font-black uppercase text-emerald-600 tracking-wider mb-1">
                                Matched ({cand.matchedSkills.length})
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {cand.matchedSkills.slice(0, 4).map((skill) => (
                                  <span key={skill} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded border border-emerald-100/50">
                                    {skill}
                                  </span>
                                ))}
                                {cand.matchedSkills.length > 4 && (
                                  <span className="px-2 py-0.5 bg-slate-50 text-slate-500 text-[10px] font-bold rounded">
                                    +{cand.matchedSkills.length - 4} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {cand.missingSkills.length > 0 && (
                            <div>
                              <div className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">
                                Missing ({cand.missingSkills.length})
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {cand.missingSkills.slice(0, 3).map((skill) => (
                                  <span key={skill} className="px-2 py-0.5 bg-slate-50 text-slate-500 text-[10px] font-bold rounded">
                                    {skill}
                                  </span>
                                ))}
                                {cand.missingSkills.length > 3 && (
                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-400 text-[10px] font-bold rounded">
                                    +{cand.missingSkills.length - 3} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* AI Reasoning Text */}
                      <td className="py-5 px-6 max-w-[300px]">
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-slate-600 font-medium leading-relaxed italic relative">
                          <Sparkles size={12} className="text-indigo-400 absolute right-3 top-3" />
                          &ldquo;{cand.recommendationReason || "Calculating reasoning with Vega AI models..."}&rdquo;
                        </div>
                      </td>

                      {/* Eligibility Status */}
                      <td className="py-5 px-6 text-center">
                        <div className="flex flex-col items-center">
                          {cand.alreadyApplied ? (
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              cand.appliedStatus === "Already in Pipeline"
                                ? "bg-amber-50 text-amber-700 border border-amber-100"
                                : "bg-blue-50 text-blue-700 border border-blue-100"
                            }`}>
                              {cand.appliedStatus}
                            </span>
                          ) : cand.alreadyNotified ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                              Already Notified
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
                              Eligible
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-5 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedCandidate(cand)}
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
                            title="View candidate full match profile"
                          >
                            <FileText size={16} />
                          </button>

                          <button
                            disabled={!isCandidateNotifiable}
                            onClick={() => {
                              setSelectedCandidateUserIds([cand.userId]);
                              setShowNotifyModal(true);
                            }}
                            className={`p-2 rounded-lg transition-colors ${
                              isCandidateNotifiable
                                ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                                : "bg-slate-100 text-slate-300 cursor-not-allowed"
                            }`}
                            title={
                              cand.alreadyApplied 
                                ? "Already Applied" 
                                : cand.alreadyNotified 
                                ? "Already Invited" 
                                : "Send Invitation Note"
                            }
                          >
                            {cand.alreadyNotified ? <Check size={16} /> : <Send size={16} />}
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

      {/* DETAILED CANDIDATE PROFILE MODAL */}
      <AnimatePresence>
        {selectedCandidate && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-slate-100/50"
            >
              {/* Header */}
              <div className="p-6 bg-[#090b21] text-white flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-indigo-600 overflow-hidden shrink-0 border-2 border-indigo-500/50">
                    {selectedCandidate.profilePhotoUrl ? (
                      <img src={selectedCandidate.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full text-base font-black flex items-center justify-center uppercase">
                        {selectedCandidate.fullName?.[0]}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-black leading-tight">{selectedCandidate.fullName}</h3>
                    <p className="text-xs text-indigo-300 font-medium mt-0.5">{selectedCandidate.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-black rounded-full uppercase tracking-wider">
                    {selectedCandidate.matchScore}% Match
                  </span>
                  <button
                    onClick={() => setSelectedCandidate(null)}
                    className="p-1 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors"
                  >
                    &times;
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 lg:p-8 space-y-6 max-h-[500px] overflow-y-auto">
                {/* Vega AI match reason */}
                <div className="bg-indigo-50/50 border border-indigo-100/30 rounded-2xl p-5 space-y-2">
                  <h4 className="text-xs font-black uppercase text-indigo-700 tracking-wider flex items-center gap-1.5">
                    <Sparkles size={12} className="text-indigo-600" />
                    Vega AI Matching Insights
                  </h4>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed italic">
                    &ldquo;{selectedCandidate.recommendationReason || "Analyzing matching metrics..."}&rdquo;
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Talent Score</span>
                    <p className="text-xl font-extrabold text-slate-850 text-slate-800 mt-1">{selectedCandidate.talentScore || "N/A"}/100</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Profile Completeness</span>
                    <p className="text-xl font-extrabold text-slate-850 text-slate-800 mt-1">{selectedCandidate.profileCompleteness || 0}%</p>
                  </div>
                </div>

                {/* College & Location */}
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <GraduationCap className="text-slate-400 shrink-0 mt-0.5" size={16} />
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">College Master Match</span>
                      <p className="text-xs font-bold text-slate-800 mt-0.5">{selectedCandidate.college}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="text-slate-400 shrink-0 mt-0.5" size={16} />
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Candidate Location</span>
                      <p className="text-xs font-bold text-slate-800 mt-0.5">{selectedCandidate.location}</p>
                    </div>
                  </div>
                </div>

                {/* Skills section */}
                <div className="space-y-3">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Skills Breakdown</span>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCandidate.matchedSkills.map(skill => (
                        <span key={skill} className="px-2.5 py-1 bg-emerald-50 text-emerald-800 text-[10px] font-bold rounded-lg border border-emerald-100/50">
                          Matched: {skill}
                        </span>
                      ))}
                      {selectedCandidate.missingSkills.map(skill => (
                        <span key={skill} className="px-2.5 py-1 bg-slate-50 text-slate-500 text-[10px] font-bold rounded-lg border border-slate-200/50">
                          Missing: {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                {selectedCandidate.resumeAvailable ? (
                  <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                    <FileText size={14} className="text-slate-400" />
                    Verified Resume Available
                  </span>
                ) : (
                  <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                    <FileText size={14} className="text-slate-300" />
                    No Resume PDF uploaded
                  </span>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedCandidate(null)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl"
                  >
                    Close Profile
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
              className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-slate-100/50 p-6 lg:p-8 space-y-6"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-1.5">
                    <Send className="text-blue-600" size={20} />
                    Notify Selected Talent
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mt-1">
                    Send an automated platform notice and recruitment interest email.
                  </p>
                </div>
                <button
                  onClick={() => setShowNotifyModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 font-bold text-base"
                >
                  &times;
                </button>
              </div>

              {/* Message Details */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Recipient Group
                  </label>
                  <div className="p-3 bg-blue-50/50 border border-blue-100 text-blue-800 rounded-xl text-xs font-extrabold">
                    {selectedCandidateUserIds.length} candidate(s) to notify
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Custom Email/Notification Message
                    </label>
                    <span className="text-[10px] font-bold text-slate-400">Optional</span>
                  </div>
                  <textarea
                    rows={4}
                    placeholder={`e.g. We found your profile highly suitable for the role "${activeJobDetails?.title || "Role"}"...`}
                    value={customNotifyMessage}
                    onChange={(e) => setCustomNotifyMessage(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-3.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400 text-slate-700"
                  />
                  <span className="text-[10px] font-medium text-slate-400 block leading-tight">
                    This message will supplement the automatic recruitment interest notice sent directly to the student dashboard and email address.
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  onClick={() => setShowNotifyModal(false)}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-750 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendNotification}
                  disabled={notifyingCandidates}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-sm shadow-blue-500/10 active:scale-95"
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
