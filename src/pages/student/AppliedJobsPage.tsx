import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Briefcase, Calendar, ChevronRight, Clock, MapPin, Search, Check, Star, ArrowRight, Zap, 
  Target, BookOpen, AlertTriangle, Maximize2, CheckCircle, AlertCircle, CheckCircle2, X,
  ChevronLeft, Sparkles, TrendingUp, Award, Compass, UserCheck, Coins, ShieldAlert, ListIcon, Video
} from 'lucide-react';
import api from '../../services/api.ts';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.tsx';
import { HiringTimeline } from '../../components/HiringTimeline.tsx';
import { toast } from 'react-hot-toast';

const parseLocalDatetime = (dateStr: string | Date | null | undefined): Date => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  
  try {
    if (String(dateStr).includes('Z')) {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    const normalized = String(dateStr).replace(' ', 'T');
    const parsed = new Date(normalized);
    if (!isNaN(parsed.getTime())) return parsed;
    return new Date(dateStr);
  } catch (err) {
    console.warn("Failed to parse datetime:", err);
    return new Date(dateStr);
  }
};

export function AppliedJobsPage() {
  const { user, profile: authProfile } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<any[]>([]);
  const [activeTests, setActiveTests] = useState<any[]>([]);
  const [studentInterviews, setStudentInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showTestEngine, setShowTestEngine] = useState<any>(null);
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  const [studentId, setStudentId] = useState<number | null>(authProfile?.id || null);

  useEffect(() => {
     if (authProfile?.id) {
        setStudentId(authProfile.id);
     } else if (user?.id) {
        const getProfile = async () => {
           try {
              const { data } = await api.get(`/students/profile/${user.id}`);
              if (data.success && data.data?.id) {
                 setStudentId(data.data.id);
              } else {
                 setLoading(false);
              }
           } catch (e) {
              console.error(e);
              setLoading(false);
           }
        };
        getProfile();
     } else {
        setLoading(false);
     }
  }, [user?.id, authProfile?.id]);

  useEffect(() => {
     if (studentId) {
        fetchApplications(studentId);
        fetchActiveTests(studentId);
        fetchStudentInterviews();
     }
  }, [studentId]);

  const fetchStudentInterviews = async () => {
     try {
        const res = await api.get('/interviews/student');
        if (res.data.success) {
           setStudentInterviews(res.data.data || []);
        }
     } catch (e) {
        console.error("Error loading student interviews:", e);
     }
  };

  const fetchApplications = async (studentId: number) => {
     try {
        const { data } = await api.get(`/jobs/student/${studentId}`);
        if (data.success) {
           const appsWithTests = await Promise.all(data.data.map(async (app: any) => {
              try {
                 const { data: testData } = await api.get(`/jobs/test-schedules/${app.job_id}`);
                 const myTest = testData.data.find((t: any) => t.stage_id === app.current_stage_id);
                 return { ...app, activeTest: myTest };
              } catch { return app; }
           }));
           setApplications(appsWithTests);
           if (appsWithTests.length > 0 && selectedAppId === null) {
              setSelectedAppId(appsWithTests[0].id);
           }
        }
     } catch (e) {
        console.error(e);
     } finally {
        setLoading(false);
     }
  };

  const fetchActiveTests = async (studentId: number) => {
     try {
        const { data } = await api.get(`/jobs/student/active-tests/${studentId}`);
        if (data.success) setActiveTests(data.data);
     } catch (e) {
        console.error(e);
     }
  };

  const getStatusColor = (status: string) => {
     switch (status) {
        case 'SELECTED': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
        case 'REJECTED': return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
        case 'APPLIED': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
        case 'IN_PROGRESS': return 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20';
        default: return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
     }
  };

  const getStatusBadgeIcon = (status: string) => {
     switch (status) {
        case 'SELECTED': return <CheckCircle className="text-emerald-500" size={14} />;
        case 'REJECTED': return <X className="text-rose-505" size={14} />;
        case 'IN_PROGRESS': return <Zap className="text-indigo-500" size={14} />;
        default: return <Clock className="text-blue-500" size={14} />;
     }
  };

  const getPreparationTipsByStage = (stageName: string = "") => {
    const name = stageName.toLowerCase();
    if (name.includes("aptitude") || name.includes("test") || name.includes("quiz") || name.includes("assessment")) {
      return {
        title: "Assessment Strategy Focus",
        subtitle: "Logical, Math & Verbal Diagnostic Metrics",
        icon: <Zap className="text-amber-500 animate-pulse" size={18} />,
        tips: [
           "Complete your daily Cognitive Pattern Matrix diagnostic in the Intelligence Test center to boost score readiness.",
           "Practice high-frequency multiple choice questions in the dynamic AI Quiz sub-menu to increase conceptual speed.",
           "Maintain fullscreen mode during the actual assessment. Any tab shift triggers an immediate automated anomaly alert to recruiters."
        ],
        actions: [
           { label: "Launch Intelligence Matrix", path: "/student/intelligence", primary: true },
           { label: "Configure AI Prep Quiz", path: "/ai-quiz", primary: false }
        ]
      };
    }
    if (name.includes("interview") || name.includes("round") || name.includes("hr") || name.includes("manager") || name.includes("technical")) {
      return {
        title: "Interview Co-Pilot Advisory",
        subtitle: "Acoustics & Confidence Optimization",
        icon: <Target className="text-rose-500" size={18} />,
        tips: [
           "Practice common behavioral and coding queries using the absolute real-time AI Mock simulation flow.",
           "Revise your resume structure thoroughly in our interactive Resume Builder to match high-value keyword selectors.",
           "Check historical interview logs and questions contributed by seniors in the local Placement Hub."
        ],
        actions: [
           { label: "Start AI Mock Interview", path: "/interview", primary: true },
           { label: "Upgrade Resume Layout", path: "/resume-builder", primary: false }
        ]
      };
    }
    return {
      title: "Application Preparation Playbook",
      subtitle: "General Career Onboarding Guidelines",
      icon: <Sparkles className="text-blue-500" size={18} />,
      tips: [
         "Thoroughly match the core job specifications on your resume before recruiter screening.",
         "Ensure your integrated coding profiles (GitHub/LeetCode) are up-to-date inside the Coding Connect sub-view.",
         "Prepare standard narrative formulas highlighting your highest impact problem-solving wins first."
      ],
      actions: [
         { label: "Scan Coding Analytics", path: "/coding-connect", primary: true },
         { label: "Browse Placement Hub", path: "/community", primary: false }
      ]
    };
  };

  const filteredApps = applications.filter(app => 
     app.title.toLowerCase().includes(search.toLowerCase()) || 
     app.company_name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedApp = filteredApps.find(a => a.id === selectedAppId) || filteredApps[0];

  return (
    <div className="max-w-7xl mx-auto py-2 font-sans text-slate-800">
      <div className="w-full px-2">
        
        {/* Header - Only show if not in mobile detailed mode */}
        {(!showMobileDetail || !selectedApp) && (
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
             <div>
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 shrink-0">
                      <Briefcase size={22} className="text-white" />
                   </div>
                   <div>
                      <h1 className="text-2.5xl sm:text-4xl font-black text-slate-900 uppercase tracking-tight leading-none">Applied Jobs</h1>
                      <p className="text-slate-500 font-bold text-[9px] sm:text-[10px] uppercase tracking-[0.3em] mt-2">TRACK DEPLOYED RECRUITMENT PIPELINES</p>
                   </div>
                </div>
             </div>
             <div className="relative w-full md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                   type="text" 
                   placeholder="SEARCH APPLICATIONS..."
                   className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-indigo-100 outline-none transition-all shadow-sm"
                   value={search}
                   onChange={(e) => setSearch(e.target.value)}
                />
             </div>
          </div>
        )}

        {loading ? (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                 <div key={i} className="h-64 bg-slate-200/60 animate-pulse rounded-2xl border border-slate-200" />
              ))}
           </div>
        ) : filteredApps.length > 0 ? (
           <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
             
             {/* Left Column: Applications List (Feed) - Hidden on Mobile if mobile detail is active */}
             <div className={`lg:col-span-4 space-y-4 ${showMobileDetail ? 'hidden lg:block' : 'block'}`}>
                <div className="flex items-center justify-between px-1 mb-2">
                   <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <ListIcon size={13} /> Feed List ({filteredApps.length})
                   </h2>
                   {search && (
                      <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold">
                         Filtered list
                      </span>
                   )}
                </div>

                <div className="space-y-3.5 max-h-[75vh] overflow-y-auto pr-1">
                   {filteredApps.map((app, idx) => {
                      const isSelected = selectedApp?.id === app.id;
                      return (
                         <motion.div 
                            key={app.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.04 }}
                            onClick={() => {
                               setSelectedAppId(app.id);
                               setShowMobileDetail(true);
                            }}
                            className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                               isSelected 
                               ? 'bg-blue-600 text-white border-blue-600 shadow-xl shadow-blue-500/20 translate-x-1' 
                               : 'bg-white border-slate-200/90 hover:border-slate-350 hover:shadow-md'
                            }`}
                         >
                            {/* Accent Glow for Selected */}
                            {isSelected && (
                               <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-2xl -mr-6 -mt-6 pointer-events-none" />
                            )}

                            <div className="flex items-start gap-4">
                               {/* Logo wrapper */}
                               <div className={`w-12 h-12 rounded-xl flex items-center justify-center p-2.5 shrink-0 border shadow-sm ${
                                  isSelected ? 'bg-white/10 border-white/20' : 'bg-slate-50 border-slate-100'
                               }`}>
                                  {app.logo_url ? (
                                     <img src={app.logo_url} alt={app.company_name} className="w-full h-full object-contain" />
                                  ) : (
                                     <Briefcase className={isSelected ? 'text-white' : 'text-slate-400'} size={24} />
                                  )}
                               </div>

                               {/* Info block */}
                               <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                     <p className={`text-[10px] font-black uppercase tracking-wider truncate max-w-[120px] ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                                        {app.company_name}
                                     </p>
                                     <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border shrink-0 ${
                                        isSelected 
                                           ? 'bg-white/15 border-white/20 text-white' 
                                           : app.status === 'SELECTED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                             app.status === 'REJECTED' ? 'bg-red-50 text-red-600 border-red-100' :
                                             'bg-blue-50 text-blue-600 border-blue-100'
                                     }`}>
                                        {app.status}
                                     </span>
                                  </div>
                                  <h3 className={`text-base font-extrabold tracking-tight truncate mt-1 ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                                     {app.title}
                                  </h3>
                                  
                                  {/* Small dynamic label for active assessments */}
                                  {app.activeTest && app.status !== 'REJECTED' && app.status !== 'SELECTED' && (
                                     <div className={`inline-flex items-center gap-1 text-[10px] font-black mt-2 px-2 py-0.5 rounded-md ${
                                        isSelected ? 'bg-white/15 text-yellow-300' : 'bg-orange-50 text-orange-600'
                                     }`}>
                                        <Zap size={11} className="animate-bounce" /> Test Scheduled
                                     </div>
                                  )}

                                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-dashed w-full pointer-events-none">
                                     <span className={`text-[10px] font-semibold flex items-center gap-1 ${isSelected ? 'text-blue-200' : 'text-slate-500'}`}>
                                        <Calendar size={11} /> 07 May 2026
                                     </span>
                                     <span className={`text-[10px] font-bold flex items-center gap-0.5 ${isSelected ? 'text-white' : 'text-blue-600'}`}>
                                        Details <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                                     </span>
                                  </div>
                               </div>
                            </div>
                         </motion.div>
                      );
                   })}
                </div>
             </div>

             {/* Right Column: Large Dynamic Application Details & Preparation Hub */}
             <div className={`lg:col-span-8 ${!showMobileDetail ? 'hidden lg:block' : 'block'}`}>
                {selectedApp ? (
                   <motion.div 
                      key={selectedApp.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden"
                   >
                      {/* Mobile back navigation bar */}
                      <div className="lg:hidden p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                         <button 
                            onClick={() => setShowMobileDetail(false)}
                            className="flex items-center gap-1.5 text-xs uppercase font-black tracking-wider text-slate-300 hover:text-white cursor-pointer"
                         >
                            <ChevronLeft size={16} /> Applications List
                         </button>
                         <span className="text-[10px] uppercase font-bold text-slate-400">Preparation Hub</span>
                      </div>

                      {/* Cover Banner Header styling */}
                      <div className="relative p-6 sm:p-8 bg-gradient-to-r from-slate-900 to-slate-950 text-white border-b border-slate-850 overflow-hidden">
                         
                         {/* Abstract grid element for aesthetics */}
                         <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:14px_24px] opacity-15" />
                         <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-blue-500/10 blur-3xl pointer-events-none" />

                         <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                            <div className="flex items-start gap-5">
                               {/* Big Company Emblem */}
                               <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center p-3 border border-white/15 shadow-inner shrink-0">
                                  {selectedApp.logo_url ? (
                                     <img src={selectedApp.logo_url} alt={selectedApp.company_name} className="w-full h-full object-contain" />
                                  ) : (
                                     <Briefcase className="text-white/60" size={32} />
                                  )}
                               </div>
                               <div>
                                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                     <span className="text-base font-extrabold tracking-wide text-blue-400">{selectedApp.company_name}</span>
                                     <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded text-amber-300 text-xs font-black">
                                        <Star size={12} fill="currentColor" />
                                        <span>4.2</span>
                                     </div>
                                     <span className="text-slate-400 text-xs hidden sm:inline">| 1,200 Reviews</span>
                                  </div>
                                  <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight">
                                     {selectedApp.title}
                                  </h2>
                                  <p className="text-slate-400 text-xs font-medium flex items-center gap-2 mt-2">
                                     <span className="flex items-center gap-1"><MapPin size={12} className="text-blue-500" /> Bengaluru, IN</span>
                                     <span>•</span>
                                     <span className="flex items-center gap-1"><Calendar size={12} className="text-blue-500" /> Applied: 07 May 2026</span>
                                  </p>
                               </div>
                            </div>

                            {/* Actions bar */}
                            <div className="flex sm:flex-col items-start sm:items-end gap-3 self-end sm:self-center">
                               <div className={`px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider border flex items-center gap-1.5 ${
                                  selectedApp.status === 'SELECTED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                  selectedApp.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/25' :
                                  'bg-blue-500/10 text-blue-400 border-blue-500/25'
                               }`}>
                                  {getStatusBadgeIcon(selectedApp.status)}
                                  <span>{selectedApp.status}</span>
                               </div>
                               <Link 
                                  to="/student/jobs" 
                                  className="text-slate-350 hover:text-white transition-colors text-xs font-bold hover:underline py-1"
                                >
                                  View similar jobs &rarr;
                               </Link>
                            </div>
                         </div>
                      </div>

                      {/* Stats bento layout row */}
                      <div className="grid grid-cols-2 md:grid-cols-4 border-b border-slate-200 bg-slate-50/50">
                         <div className="p-4 border-r border-slate-200/80 text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Process Duration</p>
                            <p className="text-sm font-extrabold text-slate-850">2 - 3 Weeks</p>
                         </div>
                         <div className="p-4 border-r border-slate-200/80 text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Match Index Rating</p>
                            <p className="text-sm font-extrabold text-blue-600 flex items-center justify-center gap-1">
                               <Award size={14} /> 88% Match
                            </p>
                         </div>
                         <div className="p-4 border-r border-slate-200/80 text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Completed Steps</p>
                            <p className="text-sm font-extrabold text-slate-850">2 / 3 Passed</p>
                         </div>
                         <div className="p-4 text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Potential Wallet XP</p>
                            <p className="text-sm font-extrabold text-amber-600 flex items-center justify-center gap-1">
                               <Coins size={14} fill="currentColor" /> +250 XP
                            </p>
                         </div>
                      </div>

                      {/* Main Scroll Content Area */}
                      <div className="p-6 sm:p-8 space-y-8">
                         
                         {/* Hiring timeline tracking block */}
                         <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl relative overflow-hidden">
                            <div className="flex items-center justify-between mb-2">
                               <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                                  <TrendingUp size={14} className="text-blue-600" /> Active Hiring Pipeline Tracker
                               </h4>
                               <span className="text-[10px] font-bold text-slate-500">Live Stage Updates</span>
                            </div>

                            <HiringTimeline applicationId={selectedApp.id} />

                            <div className="mt-4 pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                               <p className="text-xs text-slate-500 font-medium">Keep your workspace items prepared. The average review takes roughly 48 hours.</p>
                               <Link 
                                  to={`/student/application/${selectedApp.id}`}
                                  className="w-full sm:w-auto shrink-0 bg-slate-900 hover:bg-black text-white font-extrabold py-2.5 px-6 rounded-xl uppercase text-[10px] tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                               >
                                  Stage Actions Hub <ChevronRight size={14} />
                               </Link>
                            </div>
                         </div>

                         {/* Active Scheduled Assessment Section (if scheduled) */}
                         {/* Active Scheduled Live Interview Section (if scheduled) */}
                         {(() => {
                            const interview = studentInterviews.find(i => Number(i.application_id) === Number(selectedApp.id));
                            if (!interview || interview.status === 'COMPLETED') return null;

                            const isOnline = interview.type === 'INTERVIEW_ONLINE' || 
                               interview.location_or_link === 'WebRTC Live Call Room' ||
                               interview.location_or_link === 'Online Interview' ||
                               (interview.location_or_link && interview.location_or_link.toLowerCase().includes('online')) ||
                               (interview.location_or_link && interview.location_or_link.toLowerCase().includes('webrtc'));

                            return (
                               <motion.div 
                                  initial={{ scale: 0.98, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  className="p-6 bg-gradient-to-br from-indigo-700 to-blue-900 border border-indigo-650 rounded-[24px] text-white relative overflow-hidden shadow-xl mb-6"
                               >
                                  {/* Pulsing subtle ambient halo */}
                                  <div className="absolute top-0 right-0 w-36 h-36 bg-blue-400/20 blur-3xl -mr-10 -mt-10 pointer-events-none animate-pulse" />

                                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                                     <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0 border border-white/10">
                                           <Video size={22} className="text-blue-300 animate-pulse" />
                                        </div>
                                        <div>
                                           <div className="flex items-center gap-2">
                                              <span className="text-[9px] font-black tracking-widest text-[#93c5fd] uppercase bg-blue-950/80 border border-blue-900/60 px-2.5 py-0.5 rounded">
                                                 Interview Scheduled
                                              </span>
                                              {interview.status === 'LIVE' && (
                                                 <span className="text-[9px] font-black tracking-widest text-emerald-400 uppercase bg-emerald-950/80 border border-emerald-900/60 px-2.5 py-0.5 rounded animate-pulse">
                                                    ● Live Session Active
                                                 </span>
                                              )}
                                           </div>
                                           <h4 className="text-lg font-extrabold text-white tracking-tight mt-1.5 uppercase">
                                              Live {isOnline ? 'Video' : 'In-Person'} Recruiter Discussion
                                           </h4>
                                           <p className="text-xs font-semibold text-indigo-200 tracking-tight mt-1 flex items-center gap-1.5">
                                              <Calendar size={13} className="text-blue-305" />
                                              {parseLocalDatetime(interview.time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                           </p>
                                        </div>
                                     </div>

                                     {isOnline ? (
                                        <button 
                                           onClick={() => navigate(`/interview/live/${interview.id}`)}
                                           className="w-full md:w-auto px-7 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-emerald-500/25 active:scale-95"
                                        >
                                           Join Live Workspace
                                        </button>
                                     ) : (
                                        <span className="w-full md:w-auto px-5 py-3 bg-white/10 border border-white/11 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-205 text-center">
                                           In-Person Meeting
                                        </span>
                                     )}
                                  </div>

                                  {interview.notes && (
                                     <p className="text-xs font-medium text-blue-105 mt-4 flex flex-col gap-1 border-t border-white/10 pt-3">
                                        <span className="text-[9px] uppercase font-black tracking-widest text-[#93c5fd] block">Interviewer Instructions & Notes:</span>
                                        <span className="italic block bg-black/10 p-2.5 rounded-lg border border-white/5">{interview.notes}</span>
                                     </p>
                                  )}
                               </motion.div>
                            );
                         })()}

                         {selectedApp.activeTest && selectedApp.status !== 'REJECTED' && selectedApp.status !== 'SELECTED' && (() => {
                            const scheduledTime = new Date(selectedApp.activeTest.scheduled_at).getTime();
                            const currentTime = new Date().getTime();
                            const tenMinutesInMs = 10 * 60 * 1000;
                            const isTooEarly = currentTime < scheduledTime;
                            const isTooLate = currentTime > (scheduledTime + tenMinutesInMs);
                            const canJoin = !isTooEarly && !isTooLate;

                            return (
                               <motion.div 
                                  initial={{ scale: 0.98, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  className="p-6 bg-slate-900 border border-slate-850 rounded-[24px] text-white relative overflow-hidden shadow-xl"
                               >
                                  {/* Ambient glowing radial light */}
                                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-3xl -mr-8 -mt-8 pointer-events-none animate-pulse" />

                                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                                     <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg justify-center shrink-0">
                                           <Zap size={22} className="animate-pulse text-amber-300" />
                                        </div>
                                        <div>
                                           <div className="flex items-center gap-2">
                                              <span className="text-[9px] font-black tracking-widest text-indigo-400 uppercase bg-indigo-950/80 border border-indigo-900/60 px-2 py-0.5 rounded">Action required</span>
                                              <span className="text-[9px] font-black tracking-widest text-emerald-400 uppercase">Assessment Ready</span>
                                           </div>
                                           <h4 className="text-lg font-black text-white tracking-tight mt-1.5 uppercase">
                                              {selectedApp.activeTest.stage_name || "Aptitude Assessment Test"}
                                           </h4>
                                           <p className="text-xs font-semibold text-slate-400 tracking-tight mt-1 flex items-center gap-1.5">
                                              <Calendar size={13} className="text-indigo-400" />
                                              {new Date(selectedApp.activeTest.scheduled_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                           </p>
                                        </div>
                                     </div>

                                     <button 
                                        onClick={() => setShowTestEngine(selectedApp.activeTest)}
                                        disabled={!canJoin}
                                        className={`w-full md:w-auto px-7 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
                                           canJoin 
                                           ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 active:scale-95'
                                           : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-750'
                                        }`}
                                     >
                                        {isTooEarly ? 'Assessment Locked' : isTooLate ? 'Expired' : 'Join Assessment'}
                                     </button>
                                  </div>

                                  {isTooLate && (
                                     <p className="text-xs font-extrabold text-red-400 uppercase tracking-wide mt-4 flex items-center gap-2 border-t border-slate-800 pt-3">
                                        <AlertTriangle size={15} /> You missed the automated 10-minute entry window. Contact recruiter support if there was a technical discrepancy.
                                     </p>
                                  )}

                                  {isTooEarly && (
                                     <p className="text-xs font-semibold text-slate-450 mt-4 flex items-center gap-2 border-t border-slate-800 pt-3">
                                        <Clock size={15} className="text-indigo-400" /> Entry door opens precisely at the scheduled time. Get your workspace set up and review integrity guidelines below.
                                     </p>
                                  )}
                               </motion.div>
                            );
                         })()}

                         {/* Intelligent Co-pilot Interview prep advisor */}
                         {(() => {
                            const stageName = selectedApp.activeTest?.stage_name || selectedApp.current_stage_name || "Preparation Phase";
                            const prepObj = getPreparationTipsByStage(stageName);
                            
                            return (
                               <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl">
                                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200">
                                     <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                                        {prepObj.icon}
                                     </div>
                                     <div>
                                        <h4 className="text-sm font-black text-slate-900">{prepObj.title}</h4>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{prepObj.subtitle}</p>
                                     </div>
                                  </div>

                                  <div className="space-y-3.5 my-5">
                                     {prepObj.tips.map((tip, i) => (
                                        <div key={i} className="flex gap-2.5 items-start">
                                           <div className="w-5 h-5 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-650 shrink-0 text-xs font-extrabold mt-0.5">
                                              {i+1}
                                           </div>
                                           <p className="text-xs sm:text-sm text-slate-655 font-medium leading-relaxed">{tip}</p>
                                        </div>
                                     ))}
                                  </div>

                                  <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-dashed border-slate-200">
                                     {prepObj.actions.map((act, i) => (
                                        <Link
                                           key={i}
                                           to={act.path}
                                           className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-widest text-center transition-all cursor-pointer ${
                                              act.primary 
                                              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                                              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                                           }`}
                                        >
                                           {act.label}
                                        </Link>
                                     ))}
                                  </div>
                               </div>
                            );
                         })()}

                         {/* Recruiter & Job Reference block */}
                         <div className="p-5 border border-slate-200 rounded-xl flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                               <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200 font-extrabold text-sm shrink-0 uppercase">
                                  H
                               </div>
                               <div>
                                  <p className="text-xs font-black text-slate-800">Recruiter Support</p>
                                  <p className="text-[10px] font-semibold text-slate-400">Response average: 2 workdays</p>
                               </div>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-wider bg-slate-200 text-slate-705 px-2.5 py-1 rounded">
                               SECURE APP ID #{selectedApp.id}
                            </span>
                         </div>
                      </div>
                   </motion.div>
                ) : (
                   <div className="bg-white p-12 sm:p-20 rounded-3xl border border-slate-200 text-center shadow-lg">
                      <Briefcase className="mx-auto text-slate-200 mb-6" size={72} />
                      <h3 className="font-extrabold text-2xl text-slate-900 uppercase tracking-tight">No Active Applications</h3>
                      <p className="text-slate-550 max-w-sm mx-auto mt-2 text-sm leading-relaxed font-semibold">
                         You do not have any job application records in your dashboard right now. Find premium job placements!
                      </p>
                      <Link to="/jobs" className="mt-8 inline-block bg-blue-600 text-white font-black px-8 py-3.5 rounded-xl uppercase text-xs tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-all">
                         Find Premium Jobs
                      </Link>
                   </div>
                )}
             </div>

           </div>
        ) : (
           <div className="bg-white p-12 sm:p-20 rounded-3xl border border-slate-200 text-center shadow-lg">
              <Compass className="mx-auto text-blue-600/25 mb-6" size={80} />
              <h3 className="font-extrabold text-2xl text-slate-900 uppercase tracking-tight">No submissions recorded</h3>
              <p className="text-slate-500 max-w-sm mx-auto mt-2 text-sm leading-relaxed font-medium">
                 Your timeline is currently fresh. Apply to active corporate openings to generate diagnostic timelines, prepare checklists, and launch tests.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
                 <Link to="/jobs" className="bg-blue-600 text-white font-extrabold px-8 py-3.5 rounded-xl uppercase text-xs tracking-wider hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-all">
                    Browse active jobs list
                 </Link>
                 <Link to="/student" className="bg-white border border-slate-250 text-slate-700 hover:bg-slate-50 font-extrabold px-8 py-3.5 rounded-xl uppercase text-xs tracking-wider transition-all">
                    Go to student portal
                 </Link>
              </div>
           </div>
        )}
       <AnimatePresence>
         {showTestEngine && (
            <TestEngineModal 
               test={showTestEngine} 
               studentId={authProfile?.id}
               applicationId={applications.find(a => a.job_id === showTestEngine.job_id)?.id}
               onClose={() => {
                  setShowTestEngine(null);
                  fetchActiveTests(authProfile?.id);
                  fetchApplications(authProfile?.id);
               }} 
            />
         )}
       </AnimatePresence>
      </div>
    </div>
  );
}

function TestEngineModal({ test, studentId, applicationId, onClose }: { test: any, studentId: any, applicationId: any, onClose: () => void }) {
   const [questions, setQuestions] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const [currentIdx, setCurrentIdx] = useState(0);
   const [answers, setAnswers] = useState<any>({});
   const [timeLeft, setTimeLeft] = useState(test.duration_minutes * 60);
   const [tabSwitches, setTabSwitches] = useState(0);
   const [violationCount, setViolationCount] = useState(0);
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [testSuccess, setTestSuccess] = useState(false);
   const [hasStarted, setHasStarted] = useState(false);

   useEffect(() => {
      fetchQuestions();
   }, [test.stage_id]);

   useEffect(() => {
      if (!hasStarted) return;

      const timer = setInterval(() => {
         setTimeLeft(prev => {
            if (prev <= 1) {
               clearInterval(timer);
               submitTest(true); // Auto submit
               return 0;
            }
            return prev - 1;
         });
      }, 1000);

      // Anti-cheating: Tab visibility
      const handleVisibilityChange = () => {
         if (document.hidden) {
            setTabSwitches(prev => {
               const newCount = prev + 1;
               if (newCount === 1) {
                  toast.error("Warning: Tab switching detected! One more violation will auto-submit your test.", { duration: 5000 });
               } else if (newCount >= 2) {
                  toast.error("Multiple violations detected. Auto-submitting test...", { duration: 5000 });
                  submitTest(true);
               }
               return newCount;
            });
            setViolationCount(prev => prev + 1);
         }
      };

      // Anti-cheating: Fullscreen exit
      const handleFullscreenChange = () => {
         if (!document.fullscreenElement && hasStarted && !isSubmitting && !testSuccess) {
            setViolationCount(prev => {
               const newCount = prev + 1;
               if (newCount === 1) {
                  toast.error("Warning: Fullscreen exited! One more violation will auto-submit your test.", { duration: 5000 });
               } else if (newCount >= 2) {
                  toast.error("Multiple violations detected. Auto-submitting test...", { duration: 5000 });
                  submitTest(true);
               }
               return newCount;
            });
         }
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);
      document.addEventListener("fullscreenchange", handleFullscreenChange);

      return () => {
         clearInterval(timer);
         document.removeEventListener("visibilitychange", handleVisibilityChange);
         document.removeEventListener("fullscreenchange", handleFullscreenChange);
      };
   }, [hasStarted]);

   const fetchQuestions = async () => {
      try {
         console.log("Test Engine: Fetching questions for test", test);
         const { data } = await api.get(`/companies/tests/${test.job_id}`);
         console.log("Test Engine: API Response", data);

         if (data.success && Array.isArray(data.data)) {
            const currentStageId = Number(test.stage_id);
            let stageQs = data.data.filter((q: any) => {
               const qStageId = Number(q.stage_id);
               return qStageId === currentStageId || qStageId === -1;
            });
            
            // Fallback: If no questions for this specific stage, use all available questions for the job
            if (stageQs.length === 0 && data.data.length > 0) {
               console.warn("No questions for this specific stage, falling back to all job questions");
               stageQs = data.data;
            }

            console.log("Test Engine: Final Filtered Qs", stageQs);
            
            // Randomization: Shuffle questions and prep options
            const shuffledQuestions = [...stageQs]
               .sort(() => Math.random() - 0.5)
               .map(q => {
                  let opts: any = {};
                  try {
                     const optsSource = q.options_json || q.options;
                     opts = typeof optsSource === 'string' ? JSON.parse(optsSource) : (optsSource || {});
                  } catch (e) { opts = {}; }
                  
                  // Pre-shuffle options
                  const shuffledOptions = Object.entries(opts).sort(() => Math.random() - 0.5);
                  return { ...q, _shuffledOptions: shuffledOptions };
               });
            
            setQuestions(shuffledQuestions);
            
            if (shuffledQuestions.length === 0) {
               toast.error(`No questions found for ${test.stage_name || 'this stage'}.`);
            }
         }
      } catch (e) {
         console.error("Test Engine Error:", e);
         toast.error("Failed to load test questions");
      } finally {
         setLoading(false);
      }
   };

   const startTest = async () => {
      // Final check for entry window
      const scheduledTime = new Date(test.scheduled_at).getTime();
      const currentTime = new Date().getTime();
      const tenMinutesInMs = 10 * 60 * 1000;
      
      if (currentTime > scheduledTime + tenMinutesInMs) {
         toast.error("Test entry window has expired (10-minute limit).");
         onClose();
         return;
      }

      try {
         await document.documentElement.requestFullscreen();
         setHasStarted(true);
      } catch (e) {
         toast.error("Please allow fullscreen to start the test");
      }
   };

   const submitTest = async (isAuto = false) => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      
      try {
         if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
         }

         const { data } = await api.post("/jobs/applications/submit-test", {
            applicationId,
            stageId: test.stage_id,
            answers,
            tabSwitches,
            violationCount,
            isAutoSubmitted: isAuto
         });

         if (data.success) {
            setTestSuccess(true);
            toast.success(data.passed ? "Congratulations! You passed and moved to the next stage." : "Test submitted.");
         }
      } catch (e) {
         toast.error("Failed to submit test");
         setIsSubmitting(false);
      }
   };

   if (testSuccess) {
      return (
         <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950 p-6 overflow-y-auto font-sans">
            <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               className="w-full max-w-xl bg-slate-900 rounded-[40px] p-12 border border-slate-800 text-center shadow-2xl"
            >
               <div className="w-20 h-20 bg-green-500 rounded-3xl flex items-center justify-center text-white mx-auto mb-8 shadow-2xl shadow-green-500/20">
                  <CheckCircle2 size={32} />
               </div>
               <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-4">Assessment Completed</h2>
               <p className="text-slate-400 font-medium mb-10 leading-relaxed text-lg">
                  Your responses for <span className="text-indigo-400 font-black">{test.stage_name}</span> have been securely submitted. 
                  The hiring team will review your results and get back to you shortly.
               </p>
               
               <button 
                  onClick={onClose}
                  className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 transition-all"
               >
                  Return to Dashboard
               </button>
            </motion.div>
         </div>
      );
   }

   if (loading) return null;

   if (!hasStarted) {
      return (
         <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950 p-6 overflow-y-auto">
            <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               className="w-full max-w-2xl bg-slate-900 rounded-[40px] p-12 border border-slate-800 text-center shadow-2xl"
            >
               <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white mx-auto mb-8 shadow-2xl shadow-indigo-500/20">
                  <BookOpen size={32} />
               </div>
               <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-4">Assessment Briefing</h2>
               <p className="text-slate-400 font-medium mb-10 leading-relaxed">
                  You are about to start the <span className="text-indigo-400">{test.stage_name}</span> for <span className="text-white">{test.job_title}</span>. 
                  Please read the rules carefully:
               </p>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                  <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-800 text-left">
                     <AlertTriangle className="text-orange-400 mb-3" size={20} />
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Strict Monitoring</p>
                     <p className="text-xs font-bold text-slate-300">Tab switching and exiting fullscreen are tracked as violations.</p>
                  </div>
                  <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-800 text-left">
                     <Clock className="text-indigo-400 mb-3" size={20} />
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Time Limit</p>
                     <p className="text-xs font-bold text-slate-300">You have exactly {test.duration_minutes} minutes. Auto-submit on expiry.</p>
                  </div>
               </div>
               
               <div className="flex gap-4">
                  <button onClick={onClose} className="flex-1 py-5 bg-slate-800 text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-700 transition-all">Cancel</button>
                  <button 
                     onClick={startTest}
                     className="flex-[2] py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
                  >
                     Start Assessment <Maximize2 size={16} />
                  </button>
               </div>
            </motion.div>
         </div>
      );
   }

   const currentQ = questions[currentIdx];

   return (
      <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col">
         {/* Header */}
         <div className="h-24 bg-slate-900 border-b border-slate-800 px-10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-6">
               <div className="w-12 h-12 bg-indigo-600/10 border border-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
                  <Target size={24} />
               </div>
               <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">{test.job_title}</h3>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Automated Assessment Platform</p>
               </div>
            </div>
            
            <div className="flex items-center gap-10">
               <div className="text-center">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Time Remaining</p>
                  <p className={`text-xl font-black font-mono ${timeLeft < 120 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                     {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </p>
               </div>
               <div className="text-center border-l border-slate-800 pl-10">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Progress</p>
                  <p className="text-xl font-black text-white font-mono">{currentIdx + 1} / {questions.length}</p>
               </div>
            </div>
         </div>

         {/* Question Area */}
         <div className="flex-1 overflow-y-auto p-10 bg-slate-950">
            <div className="max-w-4xl mx-auto py-10">
               {questions.length > 0 ? (
                  <motion.div 
                     key={currentIdx}
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     className="bg-slate-900 rounded-[40px] p-12 border border-slate-800 shadow-2xl"
                  >
                     <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-6">Question {currentIdx + 1}</p>
                     <h2 className="text-2xl font-bold text-white mb-10 leading-relaxed">{currentQ?.question_text}</h2>
                     
                     <div className="grid grid-cols-1 gap-4">
                        {(currentQ?._shuffledOptions || []).map(([key, val]: [any, any]) => (
                           <button 
                              key={key}
                              onClick={() => setAnswers({...answers, [currentQ.id]: val})}
                              className={`group flex items-center justify-between p-6 rounded-2xl border transition-all text-left ${
                                 answers[currentQ.id] === val 
                                 ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-500/10' 
                                 : 'bg-slate-800/50 border-slate-800 text-slate-400 hover:border-slate-600'
                              }`}
                           >
                              <div className="flex items-center gap-4">
                                 <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black transition-all ${
                                    answers[currentQ.id] === val ? 'bg-white/20' : 'bg-slate-700 text-slate-400'
                                 }`}>
                                    {key.toUpperCase() === '0' ? 'A' : (key.toUpperCase() === '1' ? 'B' : (key.toUpperCase() === '2' ? 'C' : (key.toUpperCase() === '3' ? 'D' : key.toUpperCase())))}
                                 </div>
                                 <span className="font-bold text-sm tracking-tight">{val}</span>
                              </div>
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                 answers[currentQ.id] === val ? 'border-white border-8' : 'border-slate-700'
                              }`} />
                           </button>
                        ))}
                     </div>
                  </motion.div>
               ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                     <AlertTriangle size={64} className="text-orange-500 mb-6 opacity-20" />
                     <h3 className="text-xl font-bold text-slate-500">No questions found for this stage.</h3>
                  </div>
               )}
            </div>
         </div>

         {/* Footer */}
         <div className="h-24 bg-slate-900 border-t border-slate-800 px-10 flex items-center justify-between shrink-0">
            <div className="flex gap-4">
               <button 
                  disabled={currentIdx === 0}
                  onClick={() => setCurrentIdx(prev => prev - 1)}
                  className="px-8 py-3 bg-slate-800 text-slate-400 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-700 disabled:opacity-30 transition-all flex items-center gap-2"
               >
                  <ChevronRight className="rotate-180" size={14} /> Previous
               </button>
               <button 
                  disabled={currentIdx === questions.length - 1}
                  onClick={() => setCurrentIdx(prev => prev + 1)}
                  className="px-8 py-3 bg-slate-800 text-slate-400 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-700 disabled:opacity-30 transition-all flex items-center gap-2"
               >
                  Next <ChevronRight size={14} />
               </button>
            </div>
            
            <button 
               onClick={() => submitTest(false)}
               disabled={isSubmitting}
               className="px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center gap-3"
            >
               {isSubmitting ? 'Submitting...' : 'Finish & Submit'} <CheckCircle size={18} />
            </button>
         </div>
         
         <div className="absolute bottom-32 left-10 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-[8px] font-black text-red-500 uppercase tracking-widest mb-1 flex items-center gap-2 animate-pulse">
               <AlertCircle size={12} /> Live Integrity Shield
            </p>
            <p className="text-[10px] font-bold text-red-400/80">Violations: {violationCount} | Switches: {tabSwitches}</p>
         </div>
      </div>
   );
}
