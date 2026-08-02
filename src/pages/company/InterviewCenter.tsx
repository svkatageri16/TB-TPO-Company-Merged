import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import api from '../../services/api.ts';
import { isJobActive } from '../../utils/jobLifecycle.ts';
import { 
  Calendar, Clock, Video, Users, 
  ChevronRight, ChevronLeft, MoreVertical, Plus, 
  Filter, CheckCircle, XCircle, AlertCircle,
  ExternalLink, MessageSquare, Briefcase, X,
  Search, Trash2, MapPin, Mail, Eye, Grid, List
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

interface Attendee {
  name: string;
  email: string;
  role: string;
}

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

export function InterviewCenter() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View style: list or calendar
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Sub-tabs for list view
  const [currentTab, setCurrentTab] = useState<'upcoming' | 'history'>('upcoming');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'ONLINE' | 'IN_PERSON'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Calendar states
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedCalendarInterview, setSelectedCalendarInterview] = useState<any | null>(null);

  // Scheduling states
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [candidateSearchQuery, setCandidateSearchQuery] = useState('');
  const [candidateError, setCandidateError] = useState<string | null>(null);
  const reqSeqRef = useRef(0);
  
  // Schedule Form fields
  const [jobsOptions, setJobsOptions] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [selectedAppId, setSelectedAppId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [notes, setNotes] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [scheduledType, setScheduledType] = useState('Technical Interview');
  const [mode, setMode] = useState('Online Interview'); // 'Online Interview' or 'Offline Interview'
  const [physicalLocation, setPhysicalLocation] = useState(''); // Location for in-person
  const [duration, setDuration] = useState('30');
  const [interviewerName, setInterviewerName] = useState('Staff Recruiter');
  const [instructions, setInstructions] = useState('Please have a working mic and camera, and join 5 minutes early.');
  const [schedulerHrName, setSchedulerHrName] = useState('');

  // Attendees list
  const [attendees, setAttendees] = useState<Attendee[]>([{ name: '', email: '', role: 'Panelist' }]);

  useEffect(() => {
    if (user?.id) {
      fetchInterviews();
      fetchApplicants();
    }
  }, [user?.id]);

  useEffect(() => {
    if (user || profile) {
      setSchedulerHrName(profile?.contact_person || profile?.company_name || (user as any)?.full_name || (user as any)?.name || '');
    }
  }, [user, profile]);

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/analytics/employer/${user?.id}/interviews`);
      if (res.data.success) {
        setInterviews(res.data.data.map((i: any) => ({
          ...i,
          time: parseLocalDatetime(i.time)
        })));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const isJobActiveClient = (job: any) => isJobActive(job);

  const fetchApplicants = async () => {
    if (!user?.id) return;
    const currentSeq = ++reqSeqRef.current;
    try {
      setLoadingApplicants(true);
      setCandidateError(null);
      const res = await api.get(`/analytics/employer/${user?.id}`);
      if (currentSeq !== reqSeqRef.current) return;
      if (res.data.success) {
        const fetchedApps = res.data.data.applicants || [];
        setApplicants(fetchedApps);

        const fetchedJobs = res.data.data.filterOptions?.jobs || [];
        const activeJobs = fetchedJobs.filter(isJobActiveClient);
        if (activeJobs.length > 0) {
          setJobsOptions(activeJobs);
        } else if (fetchedJobs.length > 0) {
          setJobsOptions(activeJobs);
        } else {
          const map = new Map<string, any>();
          fetchedApps.forEach((a: any) => {
            if (a.job_id && !map.has(String(a.job_id))) {
              const jObj = {
                id: a.job_id,
                title: a.job_title || `Job #${a.job_id}`,
                status: a.job_status || 'OPEN',
                deadline: a.deadline,
                ended_at: a.ended_at,
                pipeline_ended_at: a.pipeline_ended_at
              };
              if (isJobActiveClient(jObj)) {
                map.set(String(a.job_id), jObj);
              }
            }
          });
          setJobsOptions(Array.from(map.values()));
        }
      } else {
        setCandidateError("Unable to load eligible candidates. Please retry.");
      }
    } catch (e) {
      console.error("Error loading company applicants:", e);
      if (currentSeq === reqSeqRef.current) {
        setCandidateError("Unable to load eligible candidates. Please retry.");
      }
    } finally {
      if (currentSeq === reqSeqRef.current) {
        setLoadingApplicants(false);
      }
    }
  };

  const getCandidateStageName = (app: any) => {
    if (app.current_stage_name && app.current_stage_name.trim()) {
      return app.current_stage_name.trim();
    }
    const keyUpper = String(app.canonical_stage_key || '').toUpperCase();
    if (keyUpper.includes('HR')) {
      return 'HR Interview';
    }
    return 'Technical Interview';
  };

  const getCandidateLabel = (app: any) => {
    return `${app.full_name} — ${getCandidateStageName(app)}`;
  };

  const isInterviewPhase = (app: any) => {
    if (!app) return false;
    
    const statusUpper = String(app.status || '').toUpperCase();
    if (['REJECTED', 'CANCELLED', 'WITHDRAWN', 'SELECTED', 'HIRED', 'OFFER', 'OFFER_ACCEPTED', 'SHORTLISTED'].includes(statusUpper)) {
      return false;
    }

    const keyUpper = String(app.canonical_stage_key || '').toUpperCase();
    if (['TECHNICALINTERVIEW', 'HRINTERVIEW', 'INTERVIEW', 'HR'].includes(keyUpper)) {
      return true;
    }

    const stageTypeUpper = String(app.current_stage_type || app.stage_type || '').toUpperCase();
    if (['INTERVIEW', 'TECHNICAL_INTERVIEW', 'HR', 'HR_INTERVIEW', 'INTERVIEW_ONLINE'].includes(stageTypeUpper)) {
      return true;
    }

    const stageNameUpper = String(app.current_stage_name || app.stage_name || '').toUpperCase();
    if (stageNameUpper.includes('INTERVIEW') || stageNameUpper.includes('HR')) {
      if (!['APPLICATION', 'APPLIED', 'SCREENING', 'AI_SCREENING', 'TEST', 'ASSESSMENT'].includes(stageTypeUpper)) {
        return true;
      }
    }

    return false;
  };

  const handleJobChange = (newJobId: string) => {
    setSelectedJobId(newJobId);
    setSelectedAppId('');
    setCandidateSearchQuery('');
    setCandidateError(null);
  };

  const eligibleCandidatesForJob = applicants.filter((app) => {
    if (!selectedJobId) return false;
    const isSameJob = String(app.job_id) === String(selectedJobId);
    return isSameJob && isInterviewPhase(app);
  });

  const searchedCandidatesForJob = eligibleCandidatesForJob.filter((app) => {
    if (!candidateSearchQuery.trim()) return true;
    const q = candidateSearchQuery.toLowerCase().trim();
    const nameMatch = app.full_name && app.full_name.toLowerCase().includes(q);
    const emailMatch = app.email && app.email.toLowerCase().includes(q);
    const stageMatch = getCandidateStageName(app).toLowerCase().includes(q);
    return nameMatch || emailMatch || stageMatch;
  });

  const handleAddAttendeeField = () => {
    setAttendees([...attendees, { name: '', email: '', role: 'Panelist' }]);
  };

  const handleRemoveAttendeeField = (idx: number) => {
    setAttendees(attendees.filter((_, i) => i !== idx));
  };

  const handleUpdateAttendeeField = (idx: number, field: keyof Attendee, value: string) => {
    const updated = [...attendees];
    updated[idx] = { ...updated[idx], [field]: value };
    setAttendees(updated);
  };

  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobId) {
      toast.error('Please select a job requirement first');
      return;
    }
    if (!selectedAppId) {
      toast.error('Please select a candidate');
      return;
    }
    if (!scheduledAt) {
      toast.error('Please select a date and time');
      return;
    }

    const selectedApp = eligibleCandidatesForJob.find(app => String(app.application_id) === String(selectedAppId));
    if (!selectedApp) {
      toast.error('Selected candidate application could not be verified for this job');
      return;
    }

    // In-person location validation
    if (mode === 'Offline Interview' && !physicalLocation.trim()) {
      toast.error('Please provide a physical location for In-Person interview');
      return;
    }

    // Filter and validate attendees
    const validAttendees = attendees.filter(a => a.email.trim() !== '');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const att of validAttendees) {
      if (!emailRegex.test(att.email.trim())) {
        toast.error(`Invalid attendee email format: ${att.email}`);
        return;
      }
    }

    // Check duplicate attendee emails
    const emails = validAttendees.map(a => a.email.trim().toLowerCase());
    if (new Set(emails).size !== emails.length) {
      toast.error('Duplicate attendee emails are not allowed');
      return;
    }

    try {
      setScheduling(true);
      const res = await api.post('/jobs/applications/schedule-interview', {
        jobId: Number(selectedJobId),
        applicationId: Number(selectedAppId),
        stageId: selectedApp.current_stage_id || 1, 
        interviewType: scheduledType,
        locationOrLink: mode === 'Offline Interview' ? physicalLocation : 'Online Video Conference',
        location: mode === 'Offline Interview' ? physicalLocation : 'Online Video Conference',
        scheduledAt: new Date(scheduledAt).toISOString(),
        notes,
        duration: Number(duration),
        interviewerName,
        instructions,
        schedulerHrName,
        attendees: validAttendees
      });

      if (res.data.success) {
        toast.success('Interview scheduled successfully!');
        window.dispatchEvent(new CustomEvent('vega:pipeline-updated'));
        setShowScheduleModal(false);
        
        // Reset form
        setSelectedJobId('');
        setSelectedAppId('');
        setScheduledAt('');
        setNotes('');
        setPhysicalLocation('');
        setAttendees([{ name: '', email: '', role: 'Panelist' }]);
        
        // Refresh
        fetchInterviews();
      } else {
        toast.error(res.data.message || 'Failed to schedule');
      }
    } catch (err: any) {
      console.error("Error scheduling:", err);
      toast.error(err.response?.data?.message || 'Failed to schedule interview');
    } finally {
      setScheduling(false);
    }
  };

  // Filter function for interviews
  const filteredInterviews = interviews.filter((item) => {
    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const candMatch = item.candidate?.toLowerCase().includes(q);
      const roleMatch = item.role?.toLowerCase().includes(q);
      const emailMatch = item.candidate_email?.toLowerCase().includes(q);
      const locMatch = item.location_or_link?.toLowerCase().includes(q);
      const hrMatch = item.scheduler_hr_name?.toLowerCase().includes(q);
      
      if (!candMatch && !roleMatch && !emailMatch && !locMatch && !hrMatch) {
        return false;
      }
    }

    // Type filter
    if (typeFilter !== 'ALL') {
      const isOffline = item.location_or_link !== 'Online Video Conference' && item.type === 'In-Person';
      if (typeFilter === 'ONLINE' && isOffline) return false;
      if (typeFilter === 'IN_PERSON' && !isOffline) return false;
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      if (item.status !== statusFilter) return false;
    }

    // Date range filter
    if (dateFrom) {
      const fDate = new Date(dateFrom);
      if (item.time < fDate) return false;
    }
    if (dateTo) {
      const tDate = new Date(dateTo);
      tDate.setHours(23, 59, 59, 999);
      if (item.time > tDate) return false;
    }

    // List view sub-tab separation
    if (viewMode === 'list') {
      const isPastOrDone = item.status === 'COMPLETED' || item.status === 'CANCELLED' || item.status === 'MISSED' || item.time < new Date();
      if (currentTab === 'upcoming' && isPastOrDone) return false;
      if (currentTab === 'history' && !isPastOrDone) return false;
    }

    return true;
  });

  // Calendar rendering calculations
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const prevMonthDays = [];
    const prevMonthTotal = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      prevMonthDays.push({
        date: new Date(year, month - 1, prevMonthTotal - i),
        isCurrentMonth: false
      });
    }

    const currentMonthDays = [];
    for (let i = 1; i <= totalDays; i++) {
      currentMonthDays.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }

    const nextMonthDays = [];
    const totalAllocated = prevMonthDays.length + currentMonthDays.length;
    const remaining = totalAllocated % 7 === 0 ? 0 : 7 - (totalAllocated % 7);
    for (let i = 1; i <= remaining; i++) {
      nextMonthDays.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }

    return [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];
  };

  const calendarDays = getDaysInMonth(calendarDate);

  const prevMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  };

  const setToday = () => {
    setCalendarDate(new Date());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Interview Center</h1>
          <p className="text-slate-500 font-medium text-sm italic mt-1">Manage, filter, and schedule your recruitment pipelines in list and calendar view.</p>
        </div>
        
        <div className="flex items-center gap-4 self-stretch md:self-auto justify-between md:justify-start">
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button 
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-505 hover:text-slate-800'}`}
            >
              <List size={14} /> List
            </button>
            <button 
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${viewMode === 'calendar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-505 hover:text-slate-800'}`}
            >
              <Calendar size={14} /> Calendar
            </button>
          </div>

          <button 
            onClick={() => setShowScheduleModal(true)}
            className="flex items-center gap-2.5 bg-blue-600 text-white px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={16} strokeWidth={3} /> Schedule Interview
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search box */}
          <div className="flex-1 min-w-[260px] relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search candidate, role, location, HR scheduler..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-11 pr-5 py-3 text-xs font-bold text-slate-700 placeholder-slate-400 outline-none focus:ring-4 focus:ring-blue-100 transition-all"
            />
          </div>

          {/* Type Selector */}
          <div className="w-full sm:w-auto">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full sm:w-auto bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-100 transition-all"
            >
              <option value="ALL">ALL INTERVIEW TYPES</option>
              <option value="ONLINE">ONLINE / VIDEO</option>
              <option value="IN_PERSON">IN-PERSON / OFFLINE</option>
            </select>
          </div>

          {/* Status Selector */}
          <div className="w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-100 transition-all"
            >
              <option value="ALL">ALL STATUSES</option>
              <option value="UPCOMING">UPCOMING</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="MISSED">MISSED</option>
              <option value="RESCHEDULED">RESCHEDULED</option>
            </select>
          </div>
        </div>

        {/* Date Range Selectors */}
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-50">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">From:</span>
            <input 
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-600 outline-none focus:ring-4 focus:ring-blue-100 cursor-pointer"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">To:</span>
            <input 
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-600 outline-none focus:ring-4 focus:ring-blue-100 cursor-pointer"
            />
          </div>

          {/* Reset Filters button */}
          {(searchQuery || typeFilter !== 'ALL' || statusFilter !== 'ALL' || dateFrom || dateTo) && (
            <button 
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('ALL');
                setStatusFilter('ALL');
                setDateFrom('');
                setDateTo('');
              }}
              className="ml-auto text-xs font-bold text-blue-600 hover:underline cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {viewMode === 'list' ? (
        /* LIST VIEW MODE */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main List */}
          <div className="lg:col-span-2 space-y-6">
            {/* List Mode Sub-tabs */}
            <div className="flex border-b border-slate-100 pb-px gap-6 px-2">
              <button 
                onClick={() => setCurrentTab('upcoming')}
                className={`pb-4 text-xs font-black uppercase tracking-widest relative transition-all ${currentTab === 'upcoming' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Upcoming / Active ({interviews.filter(i => !(i.status === 'COMPLETED' || i.status === 'CANCELLED' || i.status === 'MISSED' || i.time < new Date())).length})
                {currentTab === 'upcoming' && <motion.div layoutId="tabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
              </button>
              <button 
                onClick={() => setCurrentTab('history')}
                className={`pb-4 text-xs font-black uppercase tracking-widest relative transition-all ${currentTab === 'history' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Interview History ({interviews.filter(i => (i.status === 'COMPLETED' || i.status === 'CANCELLED' || i.status === 'MISSED' || i.time < new Date())).length})
                {currentTab === 'history' && <motion.div layoutId="tabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
              </button>
            </div>

            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 shadow-sm text-slate-400 font-medium text-sm">
                  Loading schedules...
                </div>
              ) : filteredInterviews.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-[32px] border border-slate-100 shadow-sm text-slate-400">
                  <Calendar className="mx-auto text-slate-300 mb-3" size={44} />
                  <p className="font-bold text-sm text-slate-600">No matching interviews found</p>
                  <p className="text-xs text-slate-450 mt-1">Adjust your filters or schedule a new interview coordinate.</p>
                </div>
              ) : (
                filteredInterviews.map((interview) => (
                  <InterviewCard 
                    key={interview.id} 
                    interview={interview} 
                    onJoin={() => navigate(`/interview/live/${interview.id}`)}
                    onViewDetails={() => setSelectedCalendarInterview(interview)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Sidebar Stats */}
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[36px] border border-slate-100 shadow-sm space-y-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Attendance Performance</h3>
              <div className="space-y-4">
                {[
                  { label: 'Upcoming Today', val: interviews.filter(i => i.status === 'UPCOMING' && i.time.toDateString() === new Date().toDateString()).length, color: 'blue', icon: Clock },
                  { label: 'Completed Rounds', val: interviews.filter(i => i.status === 'COMPLETED').length, color: 'emerald', icon: CheckCircle },
                  { label: 'Cancelled / Dismissed', val: interviews.filter(i => i.status === 'CANCELLED').length, color: 'red', icon: XCircle },
                ].map((stat, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 bg-white text-slate-700 shadow-sm rounded-lg flex items-center justify-center border border-slate-100`}>
                        <stat.icon size={16} className={`text-${stat.color}-600`} />
                      </div>
                      <p className="text-[11px] font-bold text-slate-550 uppercase">{stat.label}</p>
                    </div>
                    <p className={`text-base font-black text-${stat.color}-600`}>{stat.val}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 p-8 rounded-[36px] text-white shadow-xl shadow-slate-900/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-white/10 rounded-2xl">
                  <Video size={22} />
                </div>
                <h3 className="text-base font-black uppercase tracking-tight">Recruiter Lobby</h3>
              </div>
              <p className="text-xs font-medium text-slate-350 mb-6 leading-relaxed">
                Connect and moderate high fidelity live evaluations. Candidates are notified 15 minutes before slot times.
              </p>
              <button className="w-full py-3.5 bg-white text-slate-900 rounded-[18px] font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                Enter Interview Lobby <ChevronRight size={14} strokeWidth={3} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* CALENDAR VIEW MODE */
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden p-6 space-y-6">
          {/* Calendar Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                {calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-100">
                <button onClick={prevMonth} className="p-1.5 hover:bg-white rounded-lg text-slate-650 transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={setToday} className="px-3 py-1 text-[10px] font-black uppercase tracking-wider hover:bg-white rounded-lg text-slate-700 transition-colors">
                  Today
                </button>
                <button onClick={nextMonth} className="p-1.5 hover:bg-white rounded-lg text-slate-650 transition-colors">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Upcoming
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Completed
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Cancelled/Missed
              </div>
            </div>
          </div>

          {/* Month Grid */}
          <div>
            <div className="grid grid-cols-7 gap-px bg-slate-100 rounded-2xl overflow-hidden border border-slate-100">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="bg-slate-50 py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {day}
                </div>
              ))}

              {calendarDays.map(({ date, isCurrentMonth }, idx) => {
                const dateStr = date.toDateString();
                const dayInterviews = filteredInterviews.filter(item => item.time.toDateString() === dateStr);
                const isToday = date.toDateString() === new Date().toDateString();

                return (
                  <div 
                    key={idx} 
                    className={`min-h-[120px] bg-white p-2 border-t border-r border-slate-50 flex flex-col justify-between ${!isCurrentMonth ? 'opacity-30' : ''}`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-[11px] font-black rounded-full w-5 h-5 flex items-center justify-center ${isToday ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-500'}`}>
                        {date.getDate()}
                      </span>
                      {dayInterviews.length > 0 && (
                        <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-md">
                          {dayInterviews.length} Slot{dayInterviews.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[85px] scrollbar-thin">
                      {dayInterviews.map((item) => {
                        let badgeColor = 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100';
                        if (item.status === 'COMPLETED') {
                          badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100';
                        } else if (item.status === 'CANCELLED' || item.status === 'MISSED') {
                          badgeColor = 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100';
                        }

                        return (
                          <div 
                            key={item.id}
                            onClick={() => setSelectedCalendarInterview(item)}
                            className={`p-1.5 rounded-lg border text-[9px] font-bold uppercase tracking-tight cursor-pointer transition-all ${badgeColor}`}
                          >
                            <div className="font-extrabold truncate">{item.candidate}</div>
                            <div className="opacity-80 truncate">{item.role}</div>
                            <div className="flex items-center gap-1 mt-0.5 font-semibold text-[8px] opacity-75">
                              <Clock size={8} /> {item.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SCHEDULE INTERVIEW MODAL */}
      <AnimatePresence>
        {showScheduleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowScheduleModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-[40px] border border-slate-100 shadow-2xl p-8 max-w-2xl w-full relative z-10 max-h-[90vh] overflow-y-auto mx-4"
            >
              <div className="flex justify-between items-center mb-6 border-b border-slate-50 pb-4">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Schedule Interview</h3>
                  <p className="text-xs text-slate-400 font-medium">Configure recruitment coordinators, attendees, location, and candidate specifics.</p>
                </div>
                <button 
                  onClick={() => setShowScheduleModal(false)}
                  className="p-3 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>

              <form onSubmit={handleScheduleInterview} className="space-y-5 text-left">
                {/* 1. Select Job Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-bold">1. Select Job Requirement</label>
                  <select 
                    value={selectedJobId}
                    onChange={(e) => handleJobChange(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-150 transition-all uppercase cursor-pointer"
                  >
                    <option value="">-- SELECT JOB REQUIREMENT --</option>
                    {jobsOptions.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.title} {job.status ? `(${job.status})` : ''}
                      </option>
                    ))}
                  </select>
                  {jobsOptions.length === 0 && !loadingApplicants && (
                    <p className="text-[10px] text-amber-600 font-medium">⚠️ No job postings available. Post jobs first!</p>
                  )}
                </div>

                {/* 2. Select Eligible Candidate Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-bold">2. Select Eligible Candidate</label>
                  
                  {!selectedJobId ? (
                    <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-slate-400 uppercase cursor-not-allowed">
                      Select a job first
                    </div>
                  ) : candidateError ? (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl space-y-2">
                      <p className="text-xs font-bold text-red-600">Unable to load eligible candidates. Please retry.</p>
                      <button 
                        type="button" 
                        onClick={fetchApplicants}
                        className="px-3 py-1 bg-red-600 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider"
                      >
                        Retry
                      </button>
                    </div>
                  ) : loadingApplicants ? (
                    <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-slate-400 uppercase">
                      Loading eligible candidates...
                    </div>
                  ) : eligibleCandidatesForJob.length === 0 ? (
                    <div className="w-full bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 text-xs font-bold text-amber-700 uppercase">
                      No candidates are currently in an interview stage for this job.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input 
                        type="text"
                        placeholder="Search candidate by name, email, stage..."
                        value={candidateSearchQuery}
                        onChange={(e) => setCandidateSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-xs font-medium text-slate-800 outline-none focus:ring-4 focus:ring-blue-150 transition-all placeholder:text-slate-400"
                      />

                      {searchedCandidatesForJob.length === 0 ? (
                        <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-slate-500 uppercase">
                          No matching interview-stage candidates found.
                        </div>
                      ) : (
                        <select 
                          value={selectedAppId}
                          onChange={(e) => setSelectedAppId(e.target.value)}
                          required
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-150 transition-all uppercase cursor-pointer"
                        >
                          <option value="">-- SELECT CANDIDATE --</option>
                          {searchedCandidatesForJob.map((app) => (
                            <option key={app.application_id} value={app.application_id}>
                              {getCandidateLabel(app)}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Interview Mode Selection */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-bold">Interview Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setMode('Online Interview')}
                        className={`py-3.5 rounded-2xl text-[11px] font-extrabold uppercase tracking-wider border transition-all ${
                          mode === 'Online Interview' 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/10' 
                          : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'
                        }`}
                      >
                        Online CALL
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode('Offline Interview')}
                        className={`py-3.5 rounded-2xl text-[11px] font-extrabold uppercase tracking-wider border transition-all ${
                          mode === 'Offline Interview' 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/10' 
                          : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'
                        }`}
                      >
                        In-Person
                      </button>
                    </div>
                  </div>

                  {/* Interview Type Selection */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Interview Round Type</label>
                    <select
                      value={scheduledType}
                      onChange={(e) => setScheduledType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-150 transition-all uppercase"
                    >
                      <option value="HR Interview">HR Interview</option>
                      <option value="Technical Interview">Technical Interview</option>
                      <option value="Managerial Interview">Managerial Interview</option>
                      <option value="Final Round">Final Round Interview</option>
                      <option value="Campus Placement Interview">Campus Placement Interview</option>
                      <option value="In-Person Interview">In-Person Interview</option>
                    </select>
                  </div>
                </div>

                {/* Conditional physical location input */}
                {mode === 'Offline Interview' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-1.5"
                  >
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-rose-600">Physical Location / Office Address (Required)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 4th floor, Tower B, Silicon Valley Tech Park, Bangalore"
                      value={physicalLocation}
                      onChange={(e) => setPhysicalLocation(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-rose-100 transition-all"
                    />
                  </motion.div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Scheduler HR name */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Scheduler HR / Coordinator Name</label>
                    <input 
                      type="text" 
                      placeholder="Your name"
                      value={schedulerHrName}
                      onChange={(e) => setSchedulerHrName(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-150 transition-all"
                    />
                  </div>

                  {/* Interviewer Name */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Main Interviewer / Panelist</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Dr. John Doe (Tech Architect)"
                      value={interviewerName}
                      onChange={(e) => setInterviewerName(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-150 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Date & Time Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Scheduled Date & Time</label>
                    <input 
                      type="datetime-local" 
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-150 transition-all cursor-pointer"
                    />
                  </div>

                  {/* Duration Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Session Duration</label>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-150 transition-all"
                    >
                      <option value="15">15 Minutes (Brief Check)</option>
                      <option value="30">30 Minutes (Standard)</option>
                      <option value="45">45 Minutes (Technical Deep Dive)</option>
                      <option value="60">60 Minutes (Comprehensive)</option>
                    </select>
                  </div>
                </div>

                {/* Additional Attendees section */}
                <div className="space-y-2 border-t border-slate-50 pt-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Additional Attendees / Panelists</label>
                    <button 
                      type="button"
                      onClick={handleAddAttendeeField}
                      className="text-[9px] font-black text-blue-600 uppercase tracking-wider hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      + Add Attendee
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                    {attendees.map((att, idx) => (
                      <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <input 
                          type="text"
                          placeholder="Attendee Name"
                          value={att.name}
                          onChange={(e) => handleUpdateAttendeeField(idx, 'name', e.target.value)}
                          className="flex-1 bg-white border border-slate-100 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-slate-700"
                        />
                        <input 
                          type="email"
                          placeholder="Email address"
                          value={att.email}
                          onChange={(e) => handleUpdateAttendeeField(idx, 'email', e.target.value)}
                          required={idx === 0 && att.name !== ''}
                          className="flex-1 bg-white border border-slate-100 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-slate-700"
                        />
                        <select
                          value={att.role}
                          onChange={(e) => handleUpdateAttendeeField(idx, 'role', e.target.value)}
                          className="w-24 bg-white border border-slate-100 rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-600"
                        >
                          <option value="Panelist">Panelist</option>
                          <option value="Observer">Observer</option>
                          <option value="HR Lead">HR Lead</option>
                        </select>
                        {attendees.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => handleRemoveAttendeeField(idx)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Specific Stage Instructions */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Stage Specific Instructions</label>
                  <textarea 
                    placeholder="Provide meeting rules, instructions etc."
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    rows={1}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-150 transition-all font-sans"
                  />
                </div>

                {/* General Notes */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">General Notes (Will be sent via email)</label>
                  <textarea 
                    placeholder="Preparation advice, guidelines..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={1}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-150 transition-all font-sans"
                  />
                </div>

                {/* Action buttons */}
                <div className="flex gap-4 pt-3 border-t border-slate-50">
                  <button
                    type="button"
                    onClick={() => setShowScheduleModal(false)}
                    className="flex-1 py-3.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={scheduling}
                    className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    {scheduling ? 'Scheduling...' : 'Save Schedule'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CALENDAR DETAILED POPUP / MODAL */}
      <AnimatePresence>
        {selectedCalendarInterview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCalendarInterview(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-[36px] border border-slate-100 shadow-2xl p-8 max-w-lg w-full relative z-10 mx-4"
            >
              <div className="flex justify-between items-start mb-6 border-b border-slate-50 pb-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 overflow-hidden">
                    {selectedCalendarInterview.photo ? <img src={selectedCalendarInterview.photo} className="w-full h-full object-cover" /> : <Users size={24} />}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{selectedCalendarInterview.candidate}</h3>
                    <p className="text-xs text-blue-600 font-extrabold uppercase tracking-wide">{selectedCalendarInterview.role}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedCalendarInterview(null)}
                  className="p-2.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>

              <div className="space-y-4 text-xs font-bold text-slate-700 text-left">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Date & Time</span>
                    <span className="text-slate-800 uppercase flex items-center gap-1.5">
                      <Clock size={13} className="text-blue-600" />
                      {selectedCalendarInterview.time.toLocaleDateString([], { month: 'short', day: '2-digit' })}, {selectedCalendarInterview.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Duration</span>
                    <span className="text-slate-800 uppercase">{selectedCalendarInterview.duration || 30} minutes</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Interview Type</span>
                    <span className="text-slate-800 uppercase">{selectedCalendarInterview.type}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Scheduled By (HR)</span>
                    <span className="text-slate-800 uppercase">{selectedCalendarInterview.scheduler_hr_name || 'HR Team'}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Location / Meeting URL</span>
                  <span className="text-slate-800 flex items-center gap-1.5 p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                    <MapPin size={14} className="text-indigo-600 flex-shrink-0" />
                    <span className="truncate">{selectedCalendarInterview.location_or_link}</span>
                  </span>
                </div>

                {selectedCalendarInterview.notes && (
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Candidate Notes</span>
                    <p className="font-medium text-slate-600 italic bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                      {selectedCalendarInterview.notes}
                    </p>
                  </div>
                )}

                {/* Attendees list */}
                {selectedCalendarInterview.attendees && selectedCalendarInterview.attendees.length > 0 && (
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Confirmed Panel Attendees</span>
                    <div className="space-y-1.5 max-h-[110px] overflow-y-auto">
                      {selectedCalendarInterview.attendees.map((att: any, index: number) => (
                        <div key={index} className="flex justify-between items-center bg-slate-50/60 border border-slate-100/50 p-2 rounded-xl">
                          <span className="font-extrabold text-slate-850">{att.name || 'Panelist'}</span>
                          <span className="text-slate-400 font-semibold text-[10px]">{att.email}</span>
                          <span className="px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-600 rounded-md border border-indigo-100">
                            {att.role || 'Panelist'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 flex gap-3">
                <button 
                  onClick={() => setSelectedCalendarInterview(null)}
                  className="flex-1 py-3.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                >
                  Close
                </button>
                {selectedCalendarInterview.status !== 'COMPLETED' && (
                  <button 
                    onClick={() => {
                      setSelectedCalendarInterview(null);
                      navigate(`/interview/live/${selectedCalendarInterview.id}`);
                    }}
                    className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/10 transition-all flex items-center justify-center gap-2"
                  >
                    Join Call <Video size={14} strokeWidth={3} />
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InterviewCard({ interview, onJoin, onViewDetails }: { interview: any; onJoin: () => void; onViewDetails: () => void }) {
  const [timeLeft, setTimeLeft] = useState('');
  const isUpcoming = !(interview.status === 'COMPLETED' || interview.status === 'CANCELLED' || interview.status === 'MISSED' || interview.time < new Date());

  useEffect(() => {
    if (!isUpcoming) return;

    const computeTime = () => {
      const diff = interview.time.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Starting Now');
        return;
      }

      const mins = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(mins / 60);
      
      if (hours > 0) {
        setTimeLeft(`${hours}h ${mins % 60}m`);
      } else {
        setTimeLeft(`${mins}m remaining`);
      }
    };

    computeTime();
    const timer = setInterval(computeTime, 1000 * 60);

    return () => clearInterval(timer);
  }, [interview.time, isUpcoming]);

  return (
    <div className="bg-white rounded-[32px] border border-slate-100 p-6 flex flex-col md:flex-row justify-between items-center group hover:border-blue-200 transition-all shadow-sm hover:shadow-xl hover:shadow-blue-500/5">
      <div className="flex gap-6 items-center flex-1 w-full text-left">
        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100 shadow-sm overflow-hidden group-hover:scale-105 transition-transform flex-shrink-0">
          {interview.photo ? <img src={interview.photo} className="w-full h-full object-cover" /> : <Users size={28} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5 mb-2">
            <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight truncate">{interview.candidate}</h4>
            <span className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border ${
              interview.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
              interview.status === 'LIVE' ? 'bg-red-50 text-red-650 border-red-100 animate-pulse' :
              interview.status === 'CANCELLED' ? 'bg-rose-50 text-rose-600 border-rose-100' :
              interview.status === 'MISSED' ? 'bg-amber-50 text-amber-700 border-amber-100' :
              'bg-blue-50 text-blue-601 border-blue-100'
            }`}>
              {interview.status}
            </span>
            {interview.location_or_link !== 'Online Video Conference' && (
              <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-600 rounded-md border border-indigo-100">
                In-Person
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span className="flex items-center gap-1.5"><Briefcase size={14} /> {interview.role}</span>
            <span className="flex items-center gap-1.5 text-blue-600">
              <Clock size={14} /> {interview.time.toLocaleDateString([], { month: 'short', day: '2-digit' })}, {interview.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="flex items-center gap-1.5"><MessageSquare size={14} /> {interview.type}</span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 items-center">
            {interview.scheduler_hr_name && (
              <span className="text-[9px] font-black text-slate-450 uppercase bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                HR: {interview.scheduler_hr_name}
              </span>
            )}
            {interview.attendees && interview.attendees.length > 0 && (
              <span className="text-[9px] font-black text-indigo-650 uppercase bg-indigo-50/50 px-2 py-1 rounded-lg border border-indigo-100 flex items-center gap-1">
                <Users size={10} /> {interview.attendees.length} Attendee{interview.attendees.length > 1 ? 's' : ''}
              </span>
            )}
            {interview.location_or_link && interview.location_or_link !== 'Online Video Conference' && (
              <span className="text-[9px] font-black text-slate-500 uppercase bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 flex items-center gap-1 truncate max-w-xs">
                <MapPin size={10} /> {interview.location_or_link}
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-6 md:mt-0 flex items-center gap-6 w-full md:w-auto self-stretch md:self-auto justify-between md:justify-end">
        {isUpcoming && (
          <div className="text-right hidden md:block">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Time Left</p>
            <p className="text-sm font-black text-blue-600 uppercase">{timeLeft || 'Loading...'}</p>
          </div>
        )}
        
        <div className="flex gap-2 flex-1 md:flex-none justify-end">
           <button 
             onClick={onViewDetails}
             className="p-3 bg-slate-50 text-slate-650 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all flex items-center gap-1 text-[10px] font-black uppercase tracking-wider"
             title="View Details"
           >
             <Eye size={15} /> Details
           </button>

           {interview.status === 'COMPLETED' ? (
             <button className="px-5 py-3 bg-slate-100 text-slate-600 rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-slate-200 transition-all">
                View Feedback
             </button>
           ) : (
             isUpcoming && (
               <button 
                 onClick={onJoin}
                 className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-blue-600 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-slate-900/10 cursor-pointer"
               >
                 Join <Video size={13} strokeWidth={3} />
               </button>
             )
           )}
        </div>
      </div>
    </div>
  );
}
