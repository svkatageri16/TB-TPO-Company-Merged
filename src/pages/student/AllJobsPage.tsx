import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Search, MapPin, Briefcase, Clock, Filter, CheckCircle2, ChevronRight, Zap, AlertTriangle, Users } from 'lucide-react';
import api from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useAccessibility } from '../../context/AccessibilityContext.tsx';
import { toast } from 'react-hot-toast';
import { AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';

export function AllJobsPage() {
  const { user, profile: authProfile } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    location: '',
    type: '',
    experience: ''
  });
  const [profile, setProfile] = useState<any>(authProfile);
  const [applications, setApplications] = useState<any[]>([]);
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [activeSection, setActiveSection] = useState<'recommended' | 'all'>('recommended');

  const recommendedJobs = useMemo(() => {
    return jobs.filter(job => (job.match_score || 0) >= 90);
  }, [jobs]);

  const displayedJobs = useMemo(() => {
    return activeSection === 'recommended' ? recommendedJobs : jobs;
  }, [activeSection, recommendedJobs, jobs]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Reactive filtering
  useEffect(() => {
    if (profile?.id || user) {
      fetchJobs(profile?.id);
    }
  }, [debouncedSearch, filters.location, filters.type, profile?.id]);

  useEffect(() => {
    if (authProfile) {
       setProfile(authProfile);
       fetchJobs(authProfile.id);
       fetchApplications(authProfile.id);
    } else if (user) {
       fetchProfileAndData();
    }
  }, [user, authProfile]);

  const fetchProfileAndData = async () => {
     try {
        const { data: profileRes } = await api.get(`/students/profile/${user?.id}`);
        if (profileRes.success) {
           setProfile(profileRes.data);
           fetchJobs(profileRes.data.id);
           fetchApplications(profileRes.data.id);
        }
     } catch (e) {
        console.error(e);
        fetchJobs();
     }
  };

  const fetchJobs = async (studentId?: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (filters.location) params.append('location', filters.location);
      if (filters.type) params.append('type', filters.type);
      if (filters.experience) params.append('experience', filters.experience);
      if (studentId) params.append('studentId', studentId.toString());

      const { data } = await api.get(`/jobs?${params.toString()}`);
      if (data.success) setJobs(data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async (studentId: number) => {
     try {
        const { data } = await api.get(`/jobs/student/${studentId}`);
        if (data.success) setApplications(data.data);
     } catch (e) { console.error(e); }
  };

  const handleApply = async (jobId: number) => {
     if (!profile?.id) {
        toast.error("Please complete your profile details first.");
        return;
     }

     try {
        const { data } = await api.post("/jobs/apply", { jobId, studentId: profile.id });
        if (data.success) {
           toast.success("Application submitted successfully!");
           window.dispatchEvent(new CustomEvent('vega:pipeline-updated'));
           fetchApplications(profile.id);
        }
     } catch (err: any) {
        toast.error(err.response?.data?.message || "Failed to submit application.");
     }
  };

  const isApplied = (jobId: number) => applications.some(app => app.job_id === jobId);

  // For Accessibility Assistant
  const { setPageContext } = useAccessibility();
  
  useEffect(() => {
    if (setPageContext && !loading) {
      setPageContext({
        jobs: displayedJobs.map(j => ({ title: j.title, company_name: j.company_name, id: j.id })),
        user: profile,
        actions: {
          applyJob: handleApply,
          setSearch: setSearch
        }
      });
    }
    return () => { if (setPageContext) setPageContext(null); };
  }, [displayedJobs, loading, profile]);

  return (
    <div className="max-w-7xl mx-auto py-2 font-sans text-slate-800">
      <AnimatePresence>
        {profile && profile.completeness_score < 70 && (
           <div className="bg-orange-55 border-b border-orange-100 p-3 rounded-xl mb-4 text-center">
              <p className="text-[10px] sm:text-xs font-black text-orange-700 uppercase tracking-wider flex items-center justify-center gap-2">
                 <AlertTriangle size={14} className="animate-pulse" /> Profile only {profile.completeness_score}% complete. Reach 70% to enable application.
                 <Link to="/profile" className="underline hover:text-orange-950 font-black">Complete Profile</Link>
              </p>
           </div>
        )}
      </AnimatePresence>
      <div className="w-full mt-2">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 shrink-0">
                <Briefcase size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-2.5xl sm:text-4xl font-black text-slate-900 uppercase tracking-tight leading-none">Explore Careers</h1>
                <p className="text-slate-500 font-bold text-[9px] sm:text-[10px] uppercase tracking-[0.3em] mt-2">FIND OPPORTUNITIES MATCHING YOUR PROFILE</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
           {/* Sidebar Filters */}
           <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                 <div className="flex items-center gap-2 mb-6">
                    <Filter className="text-blue-600" size={20} />
                    <h2 className="font-bold uppercase tracking-wider text-sm">Filters</h2>
                 </div>

                 <div className="space-y-4">
                    <div>
                       <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Search</label>
                       <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input 
                             type="text" 
                             placeholder="Job title or company..."
                             className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                             value={search}
                             onChange={(e) => setSearch(e.target.value)}
                          />
                       </div>
                    </div>

                    <div>
                       <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Location</label>
                       <select 
                          className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                          value={filters.location}
                          onChange={(e) => setFilters({...filters, location: e.target.value})}
                       >
                          <option value="">All Locations</option>
                          <option value="Remote">Remote</option>
                          <option value="Bangalore">Bangalore</option>
                          <option value="Hyderabad">Hyderabad</option>
                          <option value="Pune">Pune</option>
                          <option value="Mumbai">Mumbai</option>
                       </select>
                    </div>

                    <div>
                       <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Job Type</label>
                       <div className="space-y-2">
                          {['Full-time', 'Part-time', 'Internship', 'Remote', 'Regional Remote', 'On-site', 'Hybrid'].map(type => (
                             <label key={type} className="flex items-center gap-2 cursor-pointer group">
                                <input 
                                   type="radio" 
                                   name="job_type" 
                                   className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-200"
                                   checked={filters.type === type}
                                   onChange={() => setFilters({...filters, type})}
                                />
                                <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900">{type}</span>
                             </label>
                          ))}
                          <button 
                             onClick={() => setFilters({...filters, type: ''})}
                             className="text-[10px] font-bold text-blue-600 uppercase"
                          >
                             Clear Type
                          </button>
                       </div>
                    </div>
                 </div>
              </div>

              {profile && (
                 <div className="bg-blue-600 p-6 rounded-2xl text-white">
                    <p className="text-[10px] font-bold opacity-60 uppercase mb-1">Your Talent Score</p>
                    <div className="flex items-end gap-2">
                       <span className="text-4xl font-black">{(profile as any).completeness_score}%</span>
                       <span className="text-xs font-bold opacity-60 mb-2 uppercase">Complete</span>
                    </div>
                    <div className="mt-4 h-1.5 bg-white/20 rounded-full overflow-hidden">
                       <div className="h-full bg-white" style={{ width: `${(profile as any).completeness_score}%` }} />
                    </div>
                    {(profile as any).completeness_score < 70 && (
                       <p className="text-[10px] font-bold mt-2 text-blue-100"> Reach 70% to enable "Apply Now"</p>
                    )}
                 </div>
              )}
           </div>

           {/* Job List */}
           <div className="lg:col-span-3 space-y-6">
              
              {/* Custom Segmented Navigation Pill Bar matching screenshot layout */}
              <div className="p-1.5 bg-slate-100 rounded-[20px] border border-slate-200 flex w-full shadow-inner">
                 <button
                    onClick={() => setActiveSection('recommended')}
                    className={`flex-1 py-3.5 px-4 sm:px-6 rounded-[14px] font-black uppercase text-[11px] tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${
                       activeSection === 'recommended'
                          ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20'
                          : 'text-slate-400 hover:text-slate-650 hover:bg-white/60'
                    }`}
                 >
                    <span className="text-xs sm:text-sm">🔥</span> Recommended Jobs
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-black ml-1.5 transition-colors ${
                       activeSection === 'recommended' ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                       {recommendedJobs.length}
                    </span>
                 </button>
                 <button
                    onClick={() => setActiveSection('all')}
                    className={`flex-1 py-3.5 px-4 sm:px-6 rounded-[14px] font-black uppercase text-[11px] tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${
                       activeSection === 'all'
                          ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20'
                          : 'text-slate-400 hover:text-slate-650 hover:bg-white/60'
                    }`}
                  >
                    <span className="text-xs sm:text-sm">💼</span> All Jobs
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-black ml-1.5 transition-colors ${
                       activeSection === 'all' ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                       {jobs.length}
                    </span>
                 </button>
              </div>
              {loading ? (
                 <div className="space-y-4">
                    {[1,2,3].map(i => <div key={i} className="h-40 bg-slate-200 animate-pulse rounded-2xl" />)}
                 </div>
              ) : displayedJobs.length > 0 ? (
                 displayedJobs.map((job, idx) => {
                    const isExp = job.deadline ? new Date(job.deadline) < new Date() : false;
                    return (
                       <motion.div 
                          key={job.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className={`bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/5 transition-all group ${isExp ? 'opacity-70 grayscale-[0.5]' : ''}`}
                       >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                             <div className="flex gap-4">
                                <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                                   {job.logo_url ? (
                                      <img src={job.logo_url} className="w-full h-full object-cover rounded-xl" alt={job.company_name} />
                                   ) : (
                                      <Briefcase className="text-slate-400" size={24} />
                                   )}
                                </div>
                                <div>
                                   <div className="flex items-center gap-2 mb-1">
                                      <h3 className="font-black text-xl text-slate-900 group-hover:text-blue-600 transition-colors uppercase leading-tight">{job.title}</h3>
                                      {job.match_score >= 90 ? (
                                         <div className="bg-blue-105 text-blue-700 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1 border border-blue-200">
                                            <Zap size={10} fill="currentColor" className="animate-bounce text-yellow-500 shrink-0" />
                                            90%+ Match
                                         </div>
                                      ) : job.match_score > 80 ? (
                                         <div className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1 border border-emerald-200">
                                            <Zap size={10} fill="currentColor" className="shrink-0" />
                                            Top Match
                                         </div>
                                      ) : null}
                                   </div>
                                   <p className="text-sm font-bold text-slate-500 uppercase flex items-center flex-wrap gap-2">
                                      {job.company_name}
                                      <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                      <span className="flex items-center gap-1"><MapPin size={14} /> {job.location || 'Remote'}</span>
                                      {job.experience_level && (
                                         <>
                                            <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                            <span className="bg-slate-50 text-slate-700 px-2.5 py-0.5 rounded-full text-xs font-semibold normal-case">💼 Exp: {job.experience_level}</span>
                                         </>
                                      )}
                                      {job.salary_range && (
                                         <>
                                            <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                            <span className="bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full text-xs font-semibold normal-case">💰 {job.salary_range}</span>
                                         </>
                                      )}
                                   </p>
                                </div>
                             </div>

                             <div className="flex flex-wrap items-center gap-4">
                                <div className="text-right">
                                   <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Match Score</p>
                                   <div className="flex items-center gap-2">
                                      <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                         <div 
                                            className={`h-full ${job.match_score > 70 ? 'bg-blue-600' : 'bg-slate-400'}`} 
                                            style={{ width: `${job.match_score}%` }} 
                                         />
                                      </div>
                                      <span className="text-xs font-black text-slate-900">{job.match_score}%</span>
                                   </div>
                                </div>
                                
                                {isApplied(job.id) ? (
                                   <button disabled className="bg-slate-100 text-slate-400 font-bold px-8 py-3 rounded-xl uppercase text-xs tracking-widest flex items-center gap-2">
                                      <CheckCircle2 size={16} />
                                      Applied
                                   </button>
                                ) : (
                                   <button 
                                      onClick={() => handleApply(job.id)}
                                      disabled={profile?.completeness_score < 70 || isExp}
                                      className={`font-bold px-8 py-3 rounded-xl uppercase text-xs tracking-widest transition-all transform hover:-translate-y-1 shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${isExp ? 'bg-slate-100 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/25'}`}
                                   >
                                      {isExp ? 'Expired' : 'Apply Now'}
                                   </button>
                                )}
                             </div>
                          </div>

                          <div className="mt-6 flex flex-wrap gap-2">
                             {(job.skills_json ? (typeof job.skills_json === 'string' ? JSON.parse(job.skills_json) : job.skills_json) : []).map((skill: string) => (
                                <span key={skill} className="bg-slate-50 text-slate-600 text-[10px] font-bold px-3 py-1 rounded-full border border-slate-100 uppercase tracking-wider overflow-hidden max-w-[150px] truncate">
                                   {skill}
                                </span>
                             ))}
                          </div>

                          <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
                             <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase">
                                <span className="flex items-center gap-1"><Clock size={12} /> Deadline: {job.deadline ? new Date(job.deadline).toLocaleDateString() : 'No Deadline'}</span>
                                <span className="flex items-center gap-1"><Briefcase size={12} /> {job.job_type}</span>
                                <span className="flex items-center gap-1"><Users size={12} /> {job.openings || 1} Openings</span>
                             </div>
                             <button className="text-[10px] font-bold text-blue-600 uppercase flex items-center gap-1 hover:gap-2 transition-all">
                                View Details <ChevronRight size={14} />
                             </button>
                          </div>
                       </motion.div>
                    );
                 })
              ) : (
                 <div className="bg-white p-12 sm:p-20 rounded-2xl border border-slate-200 text-center w-full">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                       {activeSection === 'recommended' ? <Zap size={28} className="animate-pulse text-blue-600" /> : <Briefcase size={28} className="text-slate-400" />}
                    </div>
                    <h3 className="font-black text-2xl text-slate-900 uppercase tracking-tight">
                       {activeSection === 'recommended' ? 'No Recommended Jobs (90%+ match)' : 'No Jobs Found'}
                    </h3>
                    <p className="text-slate-500 mt-2 text-sm max-w-md mx-auto">
                       {activeSection === 'recommended'
                          ? 'No careers currently match above 90% of your student profile. Complete your resume details or list key skills to boost matching scores!'
                          : 'Try adjusting your filters or search terms.'}
                    </p>
                    {activeSection === 'recommended' && (
                       <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                          <button 
                             onClick={() => setActiveSection('all')}
                             className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-705 font-bold uppercase tracking-wider text-xs rounded-xl transition-all"
                          >
                             Browse All Available Jobs
                          </button>
                          <Link 
                             to="/profile" 
                             className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wider text-xs rounded-xl transition-all shadow-lg shadow-blue-500/20"
                          >
                             Complete Student Profile
                          </Link>
                       </div>
                    )}
                 </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
