import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import api from '../../services/api.ts';
import { Search, Plus, Briefcase, History, SlidersHorizontal, Trash2, MapPin, Calendar, Users, LayoutGrid, List } from 'lucide-react';
import { JobCard } from '../../components/company/JobCard.tsx';
import { EditJobModal } from '../../components/company/EditJobModal.tsx';
import { ViewJobDetailsModal } from '../../components/company/ViewJobDetailsModal.tsx';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

export function ActiveJobsPage() {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [editingJob, setEditingJob] = useState<any | null>(null);
  const [viewingJob, setViewingJob] = useState<any | null>(null);

  // Job Assignment Modal State
  const [assigningJob, setAssigningJob] = useState<any | null>(null);
  const [subHrs, setSubHrs] = useState<any[]>([]);
  const [assignedHrUserIds, setAssignedHrUserIds] = useState<number[]>([]);
  const [savingAssignment, setSavingAssignment] = useState(false);

  // Filters State
  const [showFilters, setShowFilters] = useState(false);
  const [filterDesignation, setFilterDesignation] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterJobType, setFilterJobType] = useState('All');
  const [filterExpLevel, setFilterExpLevel] = useState('All');
  const [filterExpiry, setFilterExpiry] = useState('All'); // 'All', '7days', '30days', 'expired'
  const [filterApplicantRange, setFilterApplicantRange] = useState('All'); // 'All', '0-5', '5-15', '15+'
  const [filterSkill, setFilterSkill] = useState('');

  const isFrozen = profile?.status === 'PENDING_REVERIFICATION' || profile?.status === 'PENDING';

  useEffect(() => {
    if (profile?.id) {
      fetchJobs();
    }
    const handleJobUpdate = () => fetchJobs();
    window.addEventListener('vega:job-updated', handleJobUpdate);
    window.addEventListener('vega:job-created', handleJobUpdate);
    return () => {
      window.removeEventListener('vega:job-updated', handleJobUpdate);
      window.removeEventListener('vega:job-created', handleJobUpdate);
    };
  }, [profile?.id]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/jobs/company-managed/all`);
      if (res.data.success) {
        setJobs(res.data.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubHrsAndAssignments = async (job: any) => {
    try {
      setAssigningJob(job);
      const token = localStorage.getItem('token');
      // Fetch all company sub HR profiles
      const subHrsRes = await fetch('/api/company/sub-hr', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const subHrsData = await subHrsRes.json();
      if (subHrsData.success) {
        setSubHrs(subHrsData.data || []);
      }

      // Fetch currently assigned Sub HRs for this job
      const assignmentsRes = await fetch(`/api/company/jobs/${job.id}/assignments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const assignmentsData = await assignmentsRes.json();
      if (assignmentsData.success) {
        const assignedIds = (assignmentsData.data || []).map((a: any) => a.assigned_hr_user_id);
        setAssignedHrUserIds(assignedIds);
      }
    } catch (err) {
      console.error("Error fetching job assignments:", err);
    }
  };

  const handleToggleAssignment = (hrUserId: number) => {
    if (assignedHrUserIds.includes(hrUserId)) {
      setAssignedHrUserIds(assignedHrUserIds.filter(id => id !== hrUserId));
    } else {
      setAssignedHrUserIds([...assignedHrUserIds, hrUserId]);
    }
  };

  const handleSaveAssignments = async () => {
    if (!assigningJob) return;
    try {
      setSavingAssignment(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/company/jobs/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          jobId: assigningJob.id,
          hrUserIds: assignedHrUserIds
        })
      });
      const resData = await response.json();
      if (resData.success) {
        toast.success("Job HR assignments updated successfully!");
        setAssigningJob(null);
      } else {
        toast.error(resData.message || "Failed to update assignments.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error saving job assignments.");
    } finally {
      setSavingAssignment(false);
    }
  };

  const handleEndJob = async (jobId: number) => {
    if (isFrozen) {
      toast.error("Your company profile is pending verification. Please wait for Admin approval.");
      return;
    }
    const confirmEnd = window.confirm("Are you sure you want to end this job posting?");
    if (!confirmEnd) return;

    try {
      const res = await api.put(`/jobs/${jobId}/end`);
      if (res.data.success) {
        toast.success("Job post ended successfully. This job is now moved to Job History. Inactive jobs are hidden from student Browse Jobs.");
        window.dispatchEvent(new CustomEvent('vega:job-created'));
        window.dispatchEvent(new CustomEvent('vega:pipeline-updated'));
        fetchJobs();
      } else {
        toast.error(res.data.message || "Failed to end job post.");
      }
    } catch (e) {
      console.error(e);
      toast.error("An error occurred while ending the job posting.");
    }
  };

  const handleEditJobClick = (job: any) => {
    if (isFrozen) {
      toast.error("Your company profile is pending verification. Please wait for Admin approval.");
      return;
    }
    setEditingJob(job);
  };

  const resetFilters = () => {
    setFilterDesignation('');
    setFilterLocation('');
    setFilterJobType('All');
    setFilterExpLevel('All');
    setFilterExpiry('All');
    setFilterApplicantRange('All');
    setFilterSkill('');
    setSearchQuery('');
  };

  const filteredByTab = jobs.filter(job => {
    const isValidDeadline = job.deadline && 
      job.deadline !== 'null' && 
      job.deadline !== 'undefined' && 
      job.deadline.toString().trim() !== '' && 
      job.deadline !== '0000-00-00' && 
      !isNaN(new Date(job.deadline).getTime());
    const isExpired = isValidDeadline && new Date(job.deadline).setHours(23, 59, 59, 999) < new Date().getTime();
    if (activeTab === 'active') {
      return job.status === 'OPEN' && !isExpired;
    } else {
      return job.status === 'CLOSED' || isExpired;
    }
  });

  const filteredJobs = filteredByTab.filter(job => {
    // 1. Search Query (Matches title, location, or skills)
    const matchesSearch = searchQuery === '' || 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.skills && job.skills.some((s: string) => s.toLowerCase().includes(searchQuery.toLowerCase())));

    if (!matchesSearch) return false;

    // 2. Designation / Job Title Filter
    if (filterDesignation !== '' && !job.title.toLowerCase().includes(filterDesignation.toLowerCase())) {
      return false;
    }

    // 3. Location Filter
    if (filterLocation !== '' && !job.location?.toLowerCase().includes(filterLocation.toLowerCase())) {
      return false;
    }

    // 4. Job Type Filter
    if (filterJobType !== 'All' && job.jobType !== filterJobType) {
      return false;
    }

    // 5. Experience Level Filter
    if (filterExpLevel !== 'All' && job.experienceLevel !== filterExpLevel) {
      return false;
    }

    // 6. Expiry Filter
    if (filterExpiry !== 'All' && job.deadline) {
      const deadlineDate = new Date(job.deadline);
      const today = new Date();
      const diffTime = deadlineDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (filterExpiry === '7days' && (diffDays < 0 || diffDays > 7)) return false;
      if (filterExpiry === '30days' && (diffDays < 0 || diffDays > 30)) return false;
      if (filterExpiry === 'expired' && diffDays >= 0) return false;
    }

    // 7. Applicant Range Filter
    if (filterApplicantRange !== 'All') {
      const count = job.total_applicants !== undefined ? job.total_applicants : (job.applicant_count || 0);
      if (filterApplicantRange === '0-5' && count > 5) return false;
      if (filterApplicantRange === '5-15' && (count < 5 || count > 15)) return false;
      if (filterApplicantRange === '15+' && count <= 15) return false;
    }

    // 8. Required Skill Filter
    if (filterSkill !== '' && job.skills) {
      const matchesSkill = job.skills.some((s: string) => s.toLowerCase().includes(filterSkill.toLowerCase()));
      if (!matchesSkill) return false;
    }

    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight">
            {activeTab === 'active' ? "Active Postings" : "Job History"}
          </h1>
          <p className="text-slate-500 font-medium text-xs sm:text-sm italic mt-0.5">
            {activeTab === 'active' 
              ? "Manage your open roles and track recruitment progress." 
              : "Review previous, inactive, or ended job postings."}
          </p>
        </div>
         <Link 
          to={isFrozen ? "#" : "/company/jobs/new"}
          onClick={(e) => {
            if (isFrozen) {
              e.preventDefault();
              toast.error("Your company profile is pending verification. Please wait for Admin approval.");
            }
          }}
          className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 shrink-0 ${
            isFrozen ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none" : "bg-blue-600 text-white shadow-xl shadow-blue-500/20 hover:bg-blue-700"
          }`}
        >
          <Plus size={16} strokeWidth={3} /> Post New Role
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-5 py-2.5 font-black uppercase tracking-widest text-[10px] sm:text-[11px] transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'active'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Briefcase size={15} /> Active Roles
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-5 py-2.5 font-black uppercase tracking-widest text-[10px] sm:text-[11px] transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'history'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <History size={15} /> Job History
        </button>
      </div>

      {/* Search, View Mode Toggle, and Filters Toggle Row */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-center">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search roles by title, location, or skills..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-100 rounded-2xl pl-12 pr-4 py-3 text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-600/20 transition-all shadow-sm"
          />
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-slate-100/80 p-1 rounded-2xl border border-slate-200/80 shrink-0 self-stretch sm:self-auto justify-center">
          <button
            type="button"
            onClick={() => setViewMode('card')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              viewMode === 'card'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Card View"
          >
            <LayoutGrid size={14} />
            <span className="hidden sm:inline">Grid</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              viewMode === 'table'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Table View"
          >
            <List size={14} />
            <span className="hidden sm:inline">Table</span>
          </button>
        </div>

        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={`px-5 py-3 rounded-2xl border font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-2 cursor-pointer shrink-0 w-full sm:w-auto justify-center ${
            showFilters || filterDesignation || filterLocation || filterJobType !== 'All' || filterExpLevel !== 'All' || filterExpiry !== 'All' || filterApplicantRange !== 'All' || filterSkill
              ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm'
              : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'
          }`}
        >
          <SlidersHorizontal size={14} /> 
          Filters
          {(filterDesignation || filterLocation || filterJobType !== 'All' || filterExpLevel !== 'All' || filterExpiry !== 'All' || filterApplicantRange !== 'All' || filterSkill) && (
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          )}
        </button>
      </div>

      {/* Advanced Filter Panel */}
      {showFilters && (
        <div className="bg-slate-50 border border-slate-200/60 rounded-[24px] p-6 space-y-5 animate-in fade-in duration-200">
          <div className="flex justify-between items-center border-b border-slate-200/50 pb-3">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              Refine Postings <SlidersHorizontal size={12} />
            </h3>
            <button 
              onClick={resetFilters} 
              className="text-[10px] font-black uppercase tracking-widest text-rose-600 hover:text-rose-700 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Trash2 size={12} /> Clear All
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Designation */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Designation</label>
              <input 
                type="text" 
                placeholder="e.g. Frontend" 
                value={filterDesignation}
                onChange={(e) => setFilterDesignation(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400"
              />
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Location</label>
              <input 
                type="text" 
                placeholder="e.g. Remote" 
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400"
              />
            </div>

            {/* Skill */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Required Skill</label>
              <input 
                type="text" 
                placeholder="e.g. React" 
                value={filterSkill}
                onChange={(e) => setFilterSkill(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400"
              />
            </div>

            {/* Job Type */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Job Type</label>
              <select 
                value={filterJobType}
                onChange={(e) => setFilterJobType(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 cursor-pointer"
              >
                <option value="All">All Types</option>
                <option value="Full-time">Full-time</option>
                <option value="Internship">Internship</option>
                <option value="Contract">Contract</option>
              </select>
            </div>

            {/* Experience Level */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Experience</label>
              <select 
                value={filterExpLevel}
                onChange={(e) => setFilterExpLevel(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 cursor-pointer"
              >
                <option value="All">All Experience</option>
                <option value="Fresher (0 yrs)">Fresher (0 yrs)</option>
                <option value="Entry (1-3 yrs)">Entry (1-3 yrs)</option>
                <option value="Mid (3-5 yrs)">Mid (3-5 yrs)</option>
                <option value="Senior (5+ yrs)">Senior (5+ yrs)</option>
              </select>
            </div>

            {/* Expiry */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Expiry Status</label>
              <select 
                value={filterExpiry}
                onChange={(e) => setFilterExpiry(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 cursor-pointer"
              >
                <option value="All">All Expiry Dates</option>
                <option value="7days">Expiring within 7 days</option>
                <option value="30days">Expiring within 30 days</option>
                <option value="expired">Already Expired</option>
              </select>
            </div>

            {/* Applicant Count */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Applicant Volume</label>
              <select 
                value={filterApplicantRange}
                onChange={(e) => setFilterApplicantRange(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 cursor-pointer"
              >
                <option value="All">All Volumes</option>
                <option value="0-5">0 - 5 Applicants</option>
                <option value="5-15">5 - 15 Applicants</option>
                <option value="15+">15+ Applicants</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Job Postings Grid or Table View */}
      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredJobs.map(job => (
            <JobCard 
              key={job.id} 
              job={job} 
              onEndJob={handleEndJob} 
              onEditJob={handleEditJobClick} 
              onViewDetails={(j) => setViewingJob(j)}
              onAssignHR={profile?.isSubHr ? undefined : fetchSubHrsAndAssignments}
            />
          ))}
          
          {filteredJobs.length === 0 && !loading && (
            <div className="col-span-1 md:col-span-2 xl:col-span-3 py-20 text-center bg-white rounded-[40px] border border-slate-100 border-dashed">
              <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 mx-auto mb-6">
                 <Briefcase size={40} />
              </div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                {activeTab === 'active' ? "No active roles found" : "No historical roles found"}
              </h3>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">
                {activeTab === 'active' ? "Try adjusting your search filters or posting a new position." : "Ended postings will appear here."}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-150 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-5">Job Title</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-3">Location</th>
                  <th className="py-3.5 px-3 text-center">Applicants</th>
                  <th className="py-3.5 px-3 text-center">Openings</th>
                  <th className="py-3.5 px-3">Expiry Date</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filteredJobs.map(job => {
                  const isValidDeadline = job.deadline && 
                    job.deadline !== 'null' && 
                    job.deadline !== 'undefined' && 
                    job.deadline.toString().trim() !== '' && 
                    job.deadline !== '0000-00-00' && 
                    !isNaN(new Date(job.deadline).getTime());
                  const isExpired = isValidDeadline && new Date(job.deadline).setHours(23, 59, 59, 999) < new Date().getTime();
                  const isClosed = job.status === 'CLOSED' || isExpired;
                  const applicantCount = job.total_applicants !== undefined ? job.total_applicants : (job.applicant_count || 0);
                  const formattedDeadline = isValidDeadline
                    ? new Date(job.deadline).toLocaleDateString('en-GB')
                    : 'N/A';

                  return (
                    <tr key={job.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-5">
                        <span className="font-bold text-slate-900 block truncate max-w-[220px]" title={job.title}>
                          {job.title}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        {isClosed ? (
                          <span className="inline-block px-2.5 py-0.5 bg-rose-50 text-rose-600 text-[9px] font-black uppercase rounded-full border border-rose-100 tracking-wider">
                            Ended
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase rounded-full border border-emerald-100 tracking-wider">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <MapPin size={13} className="text-blue-600 shrink-0" />
                          <span className="truncate max-w-[130px]" title={job.location || 'Remote'}>
                            {job.location || 'Remote'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 bg-slate-100 rounded-lg text-slate-800 font-bold text-xs min-w-[32px]">
                          {applicantCount}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 bg-slate-100 rounded-lg text-slate-800 font-bold text-xs min-w-[32px]">
                          {job.openings || 1}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Calendar size={13} className={isClosed ? "text-rose-500 shrink-0" : "text-blue-600 shrink-0"} />
                          <span className={isClosed ? "text-rose-600 font-bold" : ""}>
                            {isClosed && job.ended_at 
                              ? `Ended: ${new Date(job.ended_at).toLocaleDateString('en-GB')}`
                              : formattedDeadline}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/company/pipeline?jobId=${job.id}`}
                            className="px-3 py-1.5 bg-slate-900 text-white hover:bg-blue-600 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                          >
                            Pipeline
                          </Link>
                          <button
                            type="button"
                            onClick={() => setViewingJob(job)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                          >
                            View
                          </button>
                          {!isClosed && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleEditJobClick(job)}
                                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                              >
                                Edit
                              </button>
                              {!profile?.isSubHr && (
                                <button
                                  type="button"
                                  onClick={() => fetchSubHrsAndAssignments(job)}
                                  className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                                >
                                  Assign HR
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleEndJob(job.id)}
                                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                              >
                                End
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredJobs.length === 0 && !loading && (
            <div className="py-16 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mx-auto mb-4">
                <Briefcase size={32} />
              </div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                {activeTab === 'active' ? "No active roles found" : "No historical roles found"}
              </h3>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
                {activeTab === 'active' ? "Try adjusting your search filters or posting a new position." : "Ended postings will appear here."}
              </p>
            </div>
          )}
        </div>
      )}

      <EditJobModal 
        job={editingJob} 
        isOpen={editingJob !== null} 
        onClose={() => setEditingJob(null)} 
        onSaveSuccess={fetchJobs} 
      />

      <ViewJobDetailsModal 
        job={viewingJob}
        isOpen={viewingJob !== null}
        onClose={() => setViewingJob(null)}
        onOpenEditModal={(j) => {
          setViewingJob(null);
          handleEditJobClick(j);
        }}
      />

      {/* JOB TO HR ASSIGNMENT MODAL */}
      {assigningJob && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-150 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Assign HR Recruiter</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Role: {assigningJob.title}</p>
              </div>
              <button 
                onClick={() => setAssigningJob(null)}
                className="text-slate-400 hover:text-slate-600 font-bold hover:bg-slate-200/50 p-2 rounded-xl transition-all"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[350px] overflow-y-auto">
              <p className="text-xs text-slate-500 leading-relaxed">
                Select which recruitment team members are assigned to manage candidates and move pipelines for this role. Unassigned Sub HRs will not see this job posting.
              </p>

              {subHrs.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">No Sub HR accounts found</p>
                  <Link 
                    to="/company/hr-management"
                    className="text-[10px] font-black uppercase text-blue-600 hover:underline tracking-widest mt-2 block"
                  >
                    Go to HR Management →
                  </Link>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Team Members</span>
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => setAssignedHrUserIds(subHrs.map(h => h.user_id))}
                        className="text-[9px] font-black text-blue-600 uppercase hover:underline tracking-widest"
                      >
                        Select All
                      </button>
                      <span className="text-[9px] text-slate-300">|</span>
                      <button 
                        type="button"
                        onClick={() => setAssignedHrUserIds([])}
                        className="text-[9px] font-black text-rose-600 uppercase hover:underline tracking-widest"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100 border border-slate-150 rounded-2xl overflow-hidden bg-white">
                    {subHrs.map((hr) => {
                      const isAssigned = assignedHrUserIds.includes(hr.user_id);
                      return (
                        <label 
                          key={hr.id}
                          className="flex items-center justify-between p-3.5 hover:bg-slate-50/50 cursor-pointer select-none transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <input 
                              type="checkbox"
                              checked={isAssigned}
                              onChange={() => handleToggleAssignment(hr.user_id)}
                              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                            />
                            <div>
                              <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{hr.name}</p>
                              <p className="text-[10px] text-slate-400 font-bold tracking-wide">{hr.email}</p>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${
                            hr.is_active ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                          }`}>
                            {hr.designation || 'Recruiter'}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setAssigningJob(null)}
                className="px-5 py-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAssignments}
                disabled={savingAssignment}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:shadow-xl transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                {savingAssignment ? "Saving..." : "Save Assignments"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
