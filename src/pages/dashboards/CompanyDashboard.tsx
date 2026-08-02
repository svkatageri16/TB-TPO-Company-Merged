import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../../context/AuthContext.tsx";
import api from "../../services/api.ts";
import { isJobActive as checkJobActive, isJobEnded as checkJobEnded } from "../../utils/jobLifecycle.ts";
import { 
  Plus, 
  Users, 
  Briefcase, 
  Trophy, 
  Clock, 
  BarChart3, 
  Sparkles, 
  Calendar, 
  ChevronLeft,
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight,
  GitBranch,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Trash2,
  Check,
  ListTodo,
  ExternalLink,
  Zap,
  Target
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

// Components
import { CandidateDetailModal } from "../../components/company/CandidateDetailModal.tsx";

export function CompanyDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Canonical Checkers & Helper Mapping Functions
  const isJobActive = useCallback((job: any) => {
    return checkJobActive(job);
  }, []);

  const isJobEnded = useCallback((job: any) => {
    return checkJobEnded(job);
  }, []);

  const getCanonicalStageBucket = useCallback((app: any) => {
    const status = String(app.status || '').toUpperCase();
    const stageType = String(app.current_stage_type || app.stage_type || '').toUpperCase();
    const stageName = String(app.current_stage_name || app.stage_name || '').toUpperCase();

    // Exclude terminal negative statuses
    if (status === 'REJECTED' || status === 'CANCELLED' || status === 'WITHDRAWN') {
      return 'REJECTED';
    }

    // Check Hired / Selected
    if (
      status === 'SELECTED' ||
      status === 'HIRED' ||
      status === 'VERIFIED_SELECTION' ||
      status === 'OFFER_ACCEPTED' ||
      status === 'SHORTLISTED' ||
      stageType === 'HIRED' ||
      stageType === 'SELECTED' ||
      stageName === 'HIRED' ||
      stageName === 'SELECTED'
    ) {
      return 'HIRED';
    }

    // Check Offer
    if (
      status === 'OFFER_EXTENDED' ||
      stageType.includes('OFFER') ||
      stageName.includes('OFFER')
    ) {
      return 'OFFER';
    }

    // Check Interview
    if (
      stageType.includes('INTERVIEW') ||
      stageType.includes('HR') ||
      stageName.includes('INTERVIEW') ||
      stageName.includes('HR')
    ) {
      return 'INTERVIEW';
    }

    // Check Assessment
    if (
      stageType.includes('TEST') ||
      stageType.includes('ASSESSMENT') ||
      stageName.includes('TEST') ||
      stageName.includes('ASSESSMENT') ||
      stageName.includes('APTITUDE')
    ) {
      return 'ASSESSMENT';
    }

    // Check Screening
    if (
      stageType.includes('SCREEN') ||
      stageName.includes('SCREEN') ||
      status === 'IN_PROGRESS'
    ) {
      return 'SCREENING';
    }

    return 'APPLIED';
  }, []);

  const normalizeStageBucket = useCallback((app: any) => {
    return getCanonicalStageBucket(app);
  }, [getCanonicalStageBucket]);

  const isAppInPipeline = useCallback((a: any) => {
    const bucket = getCanonicalStageBucket(a);
    if (bucket === 'REJECTED' || bucket === 'HIRED') return false;
    return true;
  }, [getCanonicalStageBucket]);

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Stats driven dynamically by actual database fetches
  const [activeJobsCount, setActiveJobsCount] = useState(0);
  const [totalApplicantsCount, setTotalApplicantsCount] = useState(0);
  const [inPipelineCount, setInPipelineCount] = useState(0);
  const [interviewsTodayCount, setInterviewsTodayCount] = useState(0);
  const [hiredThisMonthCount, setHiredThisMonthCount] = useState(0);
  
  const [jobsCardFilter, setJobsCardFilter] = useState<'active' | 'ended' | 'all'>('active');
  const [applicantsCardFilter, setApplicantsCardFilter] = useState<'active' | 'ended' | 'all'>('all');
  const [pipelineCardFilter, setPipelineCardFilter] = useState<'active' | 'ended' | 'all'>('active');
  const [interviewCardFilter, setInterviewCardFilter] = useState<'active' | 'ended' | 'all'>('active');
  const [hiredFilter, setHiredFilter] = useState<'this_month' | 'last_3_months' | 'last_6_months' | 'one_year'>('this_month');

  const [scopeMetrics, setScopeMetrics] = useState<any>(null);
  const [hiredByPeriod, setHiredByPeriod] = useState<any>(null);
  const [pendingActionsList, setPendingActionsList] = useState<any[]>([]);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const [realJobs, setRealJobs] = useState<any[]>([]);
  const [realApplicants, setRealApplicants] = useState<any[]>([]);
  const [heldCandidateTasks, setHeldCandidateTasks] = useState<any[]>([]);
  const [realInterviews, setRealInterviews] = useState<any[]>([]);
  const [historicalTrend, setHistoricalTrend] = useState<any[]>([]);
  const [pipelineStepCounts, setPipelineStepCounts] = useState<any[]>([]);

  const hiredCountFiltered = useMemo(() => {
    if (hiredByPeriod) {
      if (hiredFilter === 'this_month') return hiredByPeriod.thisMonth;
      if (hiredFilter === 'last_3_months') return hiredByPeriod.last3Months;
      if (hiredFilter === 'last_6_months') return hiredByPeriod.last6Months;
      if (hiredFilter === 'one_year') return hiredByPeriod.oneYear;
    }
    return realApplicants.filter((a: any) => String(a.raw_status || a.status).toUpperCase() === 'HIRED').length;
  }, [hiredByPeriod, hiredFilter, realApplicants]);

  const displayedJobsCount = useMemo(() => {
    if (scopeMetrics && scopeMetrics[jobsCardFilter]) {
      return scopeMetrics[jobsCardFilter].totalJobs;
    }
    if (jobsCardFilter === 'active') return realJobs.filter(isJobActive).length;
    if (jobsCardFilter === 'ended') return realJobs.filter(isJobEnded).length;
    return realJobs.filter(j => isJobActive(j) || isJobEnded(j)).length;
  }, [scopeMetrics, jobsCardFilter, realJobs, isJobActive, isJobEnded]);

  const displayedApplicantsCount = useMemo(() => {
    if (scopeMetrics && scopeMetrics[applicantsCardFilter]) {
      return scopeMetrics[applicantsCardFilter].totalApplicants;
    }
    return realApplicants.length;
  }, [scopeMetrics, applicantsCardFilter, realApplicants]);

  const displayedPipelineCount = useMemo(() => {
    if (scopeMetrics && scopeMetrics[pipelineCardFilter]) {
      return scopeMetrics[pipelineCardFilter].inPipeline;
    }
    return 0;
  }, [scopeMetrics, pipelineCardFilter]);

  const displayedInInterviewCount = useMemo(() => {
    if (scopeMetrics && scopeMetrics[interviewCardFilter]) {
      return scopeMetrics[interviewCardFilter].inInterview;
    }
    return 0;
  }, [scopeMetrics, interviewCardFilter]);

  const applicantsThisWeekCount = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);
    return realApplicants.filter((a: any) => {
      const job = realJobs.find((j: any) => j.id === a.job_id);
      if (!job) return false;
      const active = isJobActive(job);
      const ended = isJobEnded(job);
      if (applicantsCardFilter === 'active' && !active) return false;
      if (applicantsCardFilter === 'ended' && !ended) return false;
      if (applicantsCardFilter === 'all' && !active && !ended) return false;
      
      const appDate = new Date(a.applied_at);
      return appDate >= oneWeekAgo;
    }).length;
  }, [realApplicants, realJobs, applicantsCardFilter, isJobActive, isJobEnded]);

  const pendingInterviewsCount = useMemo(() => {
    return realInterviews.filter((i: any) => {
      const statusUpper = (i.status || '').toUpperCase();
      return statusUpper === 'PENDING' || statusUpper === 'AWAITING_CONFIRMATION' || statusUpper === 'PENDING_CONFIRMATION';
    }).length;
  }, [realInterviews]);

  const displayedInterviewsTodayCount = useMemo(() => {
    const todayStr = currentTime.toDateString();
    return realInterviews.filter((i: any) => {
      if (!i.time) return false;
      const scheduledTime = new Date(i.time);
      if (scheduledTime.toDateString() !== todayStr) return false;

      // Check status: scheduled, confirmed, or live
      const statusUpper = (i.status || '').toUpperCase();
      const isCancelledOrCompleted = statusUpper === 'CANCELLED' || statusUpper === 'COMPLETED' || statusUpper === 'REJECTED' || statusUpper === 'ENDED';
      if (isCancelledOrCompleted) return false;

      // Check if finished based on duration
      const durationMin = Number(i.duration || i.duration_minutes || 30); // Default to 30 mins
      const endTime = new Date(scheduledTime.getTime() + durationMin * 60 * 1000);
      if (currentTime > endTime) return false;

      return true;
    }).length;
  }, [realInterviews, currentTime]);

  const [jobsPage, setJobsPage] = useState(1);
  const [pipelineJobFilter, setPipelineJobFilter] = useState<'ACTIVE' | 'ENDED' | 'ALL'>('ACTIVE');

  // Exclude ended jobs or filter based on pipelineJobFilter status
  const filteredPipelineApplicants = useMemo(() => {
    return realApplicants.filter((a: any) => {
      const job = realJobs.find((j: any) => j.id === a.job_id);
      if (pipelineJobFilter === 'ACTIVE') {
        return job ? isJobActive(job) : false;
      } else if (pipelineJobFilter === 'ENDED') {
        return job ? isJobEnded(job) : false;
      } else {
        return job ? (isJobActive(job) || isJobEnded(job)) : false;
      }
    });
  }, [realApplicants, realJobs, pipelineJobFilter, isJobActive, isJobEnded]);

  const [hiringTimeJobFilter, setHiringTimeJobFilter] = useState<'ALL' | 'ACTIVE' | 'ENDED'>('ALL');
  const [hiringTimeJobs, setHiringTimeJobs] = useState<any[]>([]);
  const [overallAvgDays, setOverallAvgDays] = useState<number | null>(null);
  const [hiringTimeLoading, setHiringTimeLoading] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    const fetchHiringTimeData = async () => {
      if (!user?.id) return;
      try {
        setHiringTimeLoading(true);
        const res = await api.get(`/analytics/employer/${user.id}/hiring-time`, {
          params: { jobStatus: hiringTimeJobFilter }
        });
        if (!active) return;
        if (res.data?.success) {
          setHiringTimeJobs(res.data.jobWise || []);
          setOverallAvgDays(res.data.overallAvgDays);
        }
      } catch (err) {
        console.error("Error fetching hiring time:", err);
      } finally {
        if (active) {
          setHiringTimeLoading(false);
        }
      }
    };

    fetchHiringTimeData();

    const handleRefresh = () => {
      fetchHiringTimeData();
    };

    window.addEventListener('vega:pipeline-updated', handleRefresh);
    window.addEventListener('vega:job-created', handleRefresh);
    window.addEventListener('vega:job-updated', handleRefresh);
    window.addEventListener('focus', handleRefresh);

    return () => {
      active = false;
      window.removeEventListener('vega:pipeline-updated', handleRefresh);
      window.removeEventListener('vega:job-created', handleRefresh);
      window.removeEventListener('vega:job-updated', handleRefresh);
      window.removeEventListener('focus', handleRefresh);
    };
  }, [user?.id, hiringTimeJobFilter]);

  const hiringTimeJobsData = useMemo(() => {
    return hiringTimeJobs.map((item: any) => ({
      id: item.jobId,
      title: item.jobTitle,
      avgDays: item.days ?? item.avgDays ?? 0,
      hiresCount: item.hiredCount ?? 0,
      openings: item.openings || 1,
      resultState: item.resultState || 'Active',
      formattedDeadline: item.formattedDeadline || (item.deadline ? new Date(item.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A')
    }));
  }, [hiringTimeJobs]);
  const jobsPerPage = 8;

  // Personal HR To-Do states and handlers (using company_todos)
  const [todos, setTodos] = useState<any[]>([]);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(new Date());
  const [currentCalendarMonthYear, setCurrentCalendarMonthYear] = useState<Date>(new Date());
  const [pendingTab, setPendingTab] = useState<'pending' | 'todo'>('pending');

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskType, setNewTaskType] = useState("Manual");

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days: Date[] = [];
    
    const firstDay = new Date(year, month, 1);
    const dayOfWeek = firstDay.getDay();
    
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = dayOfWeek - 1; i >= 0; i--) {
      days.push(new Date(year, month - 1, prevMonthLastDay - i));
    }
    
    const totalDays = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i));
    }
    
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i));
    }
    
    return days;
  };

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    // Format date as local YYYY-MM-DD
    const y = selectedCalendarDate.getFullYear();
    const m = String(selectedCalendarDate.getMonth() + 1).padStart(2, '0');
    const d = String(selectedCalendarDate.getDate()).padStart(2, '0');
    const formattedDate = `${y}-${m}-${d}`;

    try {
      const response = await api.post("/company/todos", {
        title: newTaskTitle.trim(),
        description: "",
        dueDate: formattedDate,
        dueTime: "09:00"
      });
      if (response.data?.success) {
        const newTodoItem = response.data.data;
        setTodos(prev => [newTodoItem, ...prev]);
        setNewTaskTitle("");
        toast.success("To Do scheduled successfully!");
      } else {
        toast.error(response.data?.message || "Failed to add To Do");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to add To Do");
    }
  };

  const handleToggleTodo = async (id: number) => {
    try {
      const response = await api.patch(`/company/todos/${id}/toggle`);
      if (response.data?.success) {
        setTodos(prev => prev.map(t => t.id === id ? { ...t, status: t.status === "COMPLETED" ? "PENDING" : "COMPLETED" } : t));
        toast.success("To Do status updated!");
      } else {
        toast.error("Failed to update status");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    }
  };

  const handleDeleteTodo = async (id: number) => {
    try {
      const response = await api.delete(`/company/todos/${id}`);
      if (response.data?.success) {
        setTodos(prev => prev.filter(t => t.id !== id));
        toast.success("To Do deleted.");
      } else {
        toast.error("Failed to delete To Do");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete To Do");
    }
  };

  useEffect(() => {
    let active = true;
    const fetchDashboardData = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        let analyticsRes: any = null;
        let jobsRes: any = null;
        let interviewsRes: any = null;
        let todosRes: any = null;

        await Promise.all([
          api.get(`/analytics/employer/${user.id}`).then(res => { analyticsRes = res; }).catch(e => {
            console.error("Error fetching analytics:", e);
            setAnalyticsError("Failed to load analytics");
          }),
          api.get(`/jobs/company-managed/all`).then(res => { jobsRes = res; }).catch(e => console.error("Error fetching jobs:", e)),
          api.get(`/analytics/employer/${user.id}/interviews`).then(res => { interviewsRes = res; }).catch(e => console.error("Error fetching interviews:", e)),
          api.get(`/company/todos`).then(res => { todosRes = res; }).catch(e => console.error("Error fetching todos:", e))
        ]);

        if (!active) return;

        let filteredJobs: any[] = [];
        if (jobsRes && jobsRes.data?.success) {
          filteredJobs = jobsRes.data.data || [];
          setRealJobs(filteredJobs);
          setActiveJobsCount(filteredJobs.length);
        }

        if (todosRes && todosRes.data?.success) {
          setTodos(todosRes.data.data || []);
        }

        if (analyticsRes && analyticsRes.data?.success) {
          setAnalyticsError(null);
          const data = analyticsRes.data.data;
          const apps = data.applicants || [];
          const trend = data.trendData || [];
          const heldTasks = data.heldCandidateTasks || [];
          
          if (data.scopeMetrics) setScopeMetrics(data.scopeMetrics);
          if (data.hiredByPeriod) setHiredByPeriod(data.hiredByPeriod);
          if (data.interviewsToday !== undefined) setInterviewsTodayCount(data.interviewsToday);
          if (data.pendingActions) setPendingActionsList(data.pendingActions);

          setRealApplicants(apps);
          setHeldCandidateTasks(heldTasks);
          setTotalApplicantsCount(apps.length);
          
          const inPipeline = data.scopeMetrics?.active?.inPipeline ?? apps.filter((a: any) => {
            const bucket = normalizeStageBucket(a);
            const job = filteredJobs.find((j: any) => j.id === a.job_id);
            const isJobOpen = job ? job.status === 'OPEN' : true;
            return bucket !== 'REJECTED' && bucket !== 'HIRED' && isJobOpen;
          }).length;
          setInPipelineCount(inPipeline);
          
          if (trend.length > 0) {
            setHistoricalTrend(trend);
          }
          
          setHiredThisMonthCount(data.hiredByPeriod?.thisMonth ?? 0);
        } else if (analyticsRes && !analyticsRes.data?.success) {
          setAnalyticsError(analyticsRes.data?.message || "Failed to load analytics");
        }

        if (interviewsRes && interviewsRes.data?.success) {
          const fetchedInterviews = interviewsRes.data.data || [];
          setRealInterviews(fetchedInterviews);
          
          const todayStr = new Date().toDateString();
          const interviewsToday = fetchedInterviews.filter((i: any) => {
            if (!i.time) return false;
            return new Date(i.time).toDateString() === todayStr;
          }).length;
          setInterviewsTodayCount(interviewsToday);
        }

      } catch (err) {
        console.error("Failed to load dashboard metrics:", err);
        toast.error("Failed to load dashboard metrics.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchDashboardData();

    const handleRefresh = () => {
      fetchDashboardData();
    };

    window.addEventListener('vega:pipeline-updated', handleRefresh);
    window.addEventListener('vega:job-created', handleRefresh);
    window.addEventListener('vega:job-updated', handleRefresh);
    window.addEventListener('focus', handleRefresh);

    return () => {
      active = false;
      window.removeEventListener('vega:pipeline-updated', handleRefresh);
      window.removeEventListener('vega:job-created', handleRefresh);
      window.removeEventListener('vega:job-updated', handleRefresh);
      window.removeEventListener('focus', handleRefresh);
    };
  }, [user?.id, profile?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8fafd]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-bold text-sm">Loading dashboard metrics...</p>
        </div>
      </div>
    );
  }

  // Dynamic calculation helpers
  const getPast7Days = () => {
    const days = [];
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({
        day: daysOfWeek[d.getDay()],
        count: 0
      });
    }
    return days;
  };

  const getCurrentWeekString = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 is Sun, 1 is Mon...
    const startOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // start from Monday
    const start = new Date(today);
    start.setDate(today.getDate() + startOffset);
    
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
  };

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return "Good Morning";
    if (hours < 17) return "Good Afternoon";
    return "Good Evening";
  };

  // Derived datasets
  const activeJobsListToRender = realJobs.filter(isJobActive).map((j: any) => {
    const matchingApps = realApplicants.filter((a: any) => a.job_title === j.title || a.job_id === j.id);
    const hiredCount = matchingApps.filter((a: any) => normalizeStageBucket(a) === 'HIRED').length;
    const pipelineCount = matchingApps.filter((a: any) => {
      const b = normalizeStageBucket(a);
      return b !== 'REJECTED' && b !== 'HIRED';
    }).length;

    const positions = j.openings || 1;
    const stageCount = j.stage_count ?? j.pipeline_stages_count ?? (j.stages ? j.stages.length : null);

    return {
      id: j.id,
      title: j.title,
      type: j.job_type || "Full-time",
      applicants: matchingApps.length,
      pipeline: pipelineCount,
      hired: hiredCount,
      positionsAvailable: positions !== null ? String(positions) : "—",
      stageCount: stageCount !== null ? `${stageCount} stages` : "—",
      status: "Active"
    };
  });

  const totalJobsPages = Math.max(1, Math.ceil(activeJobsListToRender.length / jobsPerPage));
  const safeJobsPage = jobsPage > totalJobsPages ? totalJobsPages : jobsPage;
  const paginatedActiveJobs = activeJobsListToRender.slice(
    (safeJobsPage - 1) * jobsPerPage,
    safeJobsPage * jobsPerPage
  );

  const upcomingInterviews = realInterviews.slice(0, 4).map((i: any) => ({
    id: i.id,
    name: i.candidate,
    role: i.role,
    time: new Date(i.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    status: i.status === 'UPCOMING' ? 'Scheduled' : 'Live Meet',
    avatar: i.photo || `https://images.unsplash.com/photo-${1534528741775 + i.id % 100}?auto=format&fit=crop&q=80&w=120`
  }));



  // Pipeline Step Chevrons mapped from live stats
  const nonRejectedApps = filteredPipelineApplicants.filter(a => getCanonicalStageBucket(a) !== 'REJECTED');
  const denominator = nonRejectedApps.length;

  const appliedVal = nonRejectedApps.filter(a => getCanonicalStageBucket(a) === 'APPLIED').length;
  const screeningVal = nonRejectedApps.filter(a => getCanonicalStageBucket(a) === 'SCREENING').length;
  const assessmentVal = nonRejectedApps.filter(a => getCanonicalStageBucket(a) === 'ASSESSMENT').length;
  const interviewVal = nonRejectedApps.filter(a => getCanonicalStageBucket(a) === 'INTERVIEW').length;
  const offerVal = nonRejectedApps.filter(a => getCanonicalStageBucket(a) === 'OFFER').length;
  const hiredVal = nonRejectedApps.filter(a => getCanonicalStageBucket(a) === 'HIRED').length;

  const getPctString = (val: number) => {
    return denominator > 0 ? Math.round((val / denominator) * 100) + "%" : "0%";
  };

  const pipelineSteps = [
    { label: "Applied", value: appliedVal, pct: getPctString(appliedVal), trend: null, color: "bg-blue-600" },
    { label: "Screening", value: screeningVal, pct: getPctString(screeningVal), trend: null, color: "bg-cyan-500" },
    { label: "Assessment", value: assessmentVal, pct: getPctString(assessmentVal), trend: null, color: "bg-indigo-500" },
    { label: "Interview", value: interviewVal, pct: getPctString(interviewVal), trend: null, color: "bg-amber-500" },
    { label: "Offer", value: offerVal, pct: getPctString(offerVal), trend: null, color: "bg-orange-500" },
    { label: "Hired", value: hiredVal, pct: getPctString(hiredVal), trend: null, color: "bg-emerald-500" }
  ];





  // Candidate quality distribution data dynamically calculated
  const totalWithScores = realApplicants.filter(a => a.talent_score !== null && a.talent_score !== undefined).length;
  const excellentCount = realApplicants.filter(a => Number(a.talent_score) >= 80).length;
  const goodCount = realApplicants.filter(a => Number(a.talent_score) >= 60 && Number(a.talent_score) < 80).length;
  const averageCount = realApplicants.filter(a => Number(a.talent_score) >= 40 && Number(a.talent_score) < 60).length;
  const needsImprovementCount = realApplicants.filter(a => a.talent_score !== null && a.talent_score !== undefined && Number(a.talent_score) < 40).length;

  const excellentPct = totalWithScores > 0 ? Math.round((excellentCount / totalWithScores) * 100) : 0;
  const goodPct = totalWithScores > 0 ? Math.round((goodCount / totalWithScores) * 100) : 0;
  const averagePct = totalWithScores > 0 ? Math.round((averageCount / totalWithScores) * 100) : 0;
  const needsImprovementPct = totalWithScores > 0 ? Math.round((needsImprovementCount / totalWithScores) * 100) : 0;

  const totalScoresSum = realApplicants.reduce((sum, a) => sum + (a.talent_score ? Number(a.talent_score) : 0), 0);
  const avgOverallScore = totalWithScores > 0 ? Math.round(totalScoresSum / totalWithScores) : 0;

  const qualityLabel = avgOverallScore >= 80 ? "Excellent" : avgOverallScore >= 60 ? "Good" : avgOverallScore >= 40 ? "Average" : totalWithScores > 0 ? "Under Review" : "N/A";

  return (
    <div className="space-y-6" id="company-dashboard-container">
      
      {/* Greetings Block & Top Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            {getGreeting()}, {(user as any)?.name || profile?.company_name || "Saiprasad"}! <span className="animate-bounce">👋</span>
          </h1>
          <p className="text-slate-400 font-medium text-xs mt-1">
            Here's what's happening with your hiring today.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Calendar Picker Wrapper */}
          <div className="bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-2xl flex items-center gap-2 text-slate-600 font-extrabold text-xs">
            <Calendar size={14} className="text-slate-400" />
            <span>{getCurrentWeekString()}</span>
          </div>

          <Link 
            to="/company/jobs"
            className="px-5 py-2.5 bg-[#1e40af] hover:bg-blue-800 text-white rounded-2xl font-extrabold text-xs uppercase tracking-wider shadow-md shadow-blue-900/10 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus size={15} strokeWidth={3} />
            Post New Job
          </Link>
        </div>
      </div>

      {/* Five Gorgeous KPI Metric Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Total Jobs */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-start justify-between w-full">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
              <Briefcase size={20} />
            </div>
            <div className="flex items-center gap-1 bg-slate-50 p-0.5 rounded-lg border border-slate-100">
              {(['active', 'ended', 'all'] as const).map((f) => (
                <button
                  key={f}
                  onClick={(e) => { e.stopPropagation(); setJobsCardFilter(f); }}
                  className={`px-1.5 py-0.5 rounded-md text-[8px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                    jobsCardFilter === f
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <span className="text-[11px] font-bold text-slate-400 block tracking-tight">Total Jobs</span>
            <span className="text-2xl font-black text-slate-900 block mt-1">
              {String(displayedJobsCount).padStart(2, '0')}
            </span>
            <span className="text-[9px] font-extrabold text-blue-600 mt-1.5 flex items-center gap-0.5 uppercase tracking-wide">
              <TrendingUp size={10} /> {
                jobsCardFilter === 'active'
                  ? `${displayedJobsCount} currently open`
                  : jobsCardFilter === 'ended'
                  ? `${displayedJobsCount} completed postings`
                  : `${displayedJobsCount} total job postings`
              }
            </span>
          </div>
        </div>

        {/* Total Applicants */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-start justify-between w-full">
            <div className="w-10 h-10 bg-teal-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
              <Users size={20} />
            </div>
            <div className="flex items-center gap-1 bg-slate-50 p-0.5 rounded-lg border border-slate-100">
              {(['active', 'ended', 'all'] as const).map((f) => (
                <button
                  key={f}
                  onClick={(e) => { e.stopPropagation(); setApplicantsCardFilter(f); }}
                  className={`px-1.5 py-0.5 rounded-md text-[8px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                    applicantsCardFilter === f
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                  }`}
                >
                  {f === 'all' ? 'all' : f}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <span className="text-[11px] font-bold text-slate-400 block tracking-tight">Total Applicants</span>
            <span className="text-2xl font-black text-slate-900 block mt-1">
              {String(displayedApplicantsCount).padStart(2, '0')}
            </span>
            <span className="text-[9px] font-extrabold text-emerald-600 mt-1.5 flex items-center gap-0.5 uppercase tracking-wide">
              <TrendingUp size={10} /> {
                applicantsThisWeekCount > 0 
                  ? `+${applicantsThisWeekCount} new this week` 
                  : "No new applicants this week"
              }
            </span>
          </div>
        </div>

        {/* In Pipeline */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-start justify-between w-full">
            <div className="w-10 h-10 bg-purple-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
              <GitBranch size={20} />
            </div>
            <div className="flex items-center gap-1 bg-slate-50 p-0.5 rounded-lg border border-slate-100">
              {(['active', 'ended', 'all'] as const).map((f) => (
                <button
                  key={f}
                  onClick={(e) => { e.stopPropagation(); setPipelineCardFilter(f); }}
                  className={`px-1.5 py-0.5 rounded-md text-[8px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                    pipelineCardFilter === f
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <span className="text-[11px] font-bold text-slate-400 block tracking-tight">In Pipeline</span>
            <span className="text-2xl font-black text-slate-900 block mt-1">
              {String(displayedPipelineCount).padStart(2, '0')}
            </span>
            <span className="text-[9px] font-extrabold text-indigo-600 mt-1.5 flex items-center gap-0.5 uppercase tracking-wide">
              <TrendingUp size={10} /> {
                displayedPipelineCount > 0 
                  ? `${displayedPipelineCount} active in evaluation` 
                  : "No candidates in evaluation"
              }
            </span>
          </div>
        </div>

        {/* In Interview */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-start justify-between w-full">
            <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center shrink-0">
              <Calendar size={20} />
            </div>
            <div className="flex items-center gap-1 bg-slate-50 p-0.5 rounded-lg border border-slate-100">
              {(['active', 'ended', 'all'] as const).map((f) => (
                <button
                  key={f}
                  onClick={(e) => { e.stopPropagation(); setInterviewCardFilter(f); }}
                  className={`px-1.5 py-0.5 rounded-md text-[8px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                    interviewCardFilter === f
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <span className="text-[11px] font-bold text-slate-400 block tracking-tight">In Interview</span>
            <span className="text-2xl font-black text-slate-900 block mt-1">
              {String(displayedInInterviewCount).padStart(2, '0')}
            </span>
            <span className="text-[9px] font-extrabold text-orange-600 mt-1.5 flex items-center gap-0.5 uppercase tracking-wide">
              <TrendingUp size={10} /> {
                interviewsTodayCount > 0
                  ? `${interviewsTodayCount} scheduled today`
                  : "No interviews scheduled today"
              }
            </span>
          </div>
        </div>

        {/* Hired Period Card */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-all col-span-2 md:col-span-1">
          <div className="flex items-start justify-between w-full">
            <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center shrink-0">
              <Trophy size={20} />
            </div>
            <select
              id="hired-filter-select"
              value={hiredFilter}
              onChange={(e) => { e.stopPropagation(); setHiredFilter(e.target.value as any); }}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-[9px] font-extrabold px-1.5 py-0.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="this_month">This Month</option>
              <option value="last_3_months">3 Months</option>
              <option value="last_6_months">6 Months</option>
              <option value="one_year">1 Year</option>
            </select>
          </div>
          <div className="mt-4">
            <span className="text-[11px] font-bold text-slate-400 block tracking-tight truncate">
              {
                hiredFilter === 'this_month' 
                  ? 'Hired (This Month)' 
                  : hiredFilter === 'last_3_months' 
                  ? 'Hired (3 Months)' 
                  : hiredFilter === 'last_6_months' 
                  ? 'Hired (6 Months)' 
                  : 'Hired (1 Year)'
              }
            </span>
            <span className="text-2xl font-black text-slate-900 block mt-1">
              {String(hiredCountFiltered).padStart(2, '0')}
            </span>
            <span className="text-[9px] font-extrabold text-rose-600 mt-1.5 flex items-center gap-0.5 uppercase tracking-wide">
              <TrendingUp size={10} /> Verified Selections
            </span>
          </div>
        </div>
      </div>

      {/* Main Dashboard High-Fidelity Split Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Columns (8/12) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Applications in progress Map */}
          <div className="bg-gradient-to-br from-[#090b21] via-[#0e1131] to-[#161a3e] p-6 rounded-[24px] border border-indigo-500/20 shadow-[0_0_30px_rgba(79,70,229,0.15)] space-y-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex justify-between items-center relative z-10">
              <h2 className="text-sm font-black text-white uppercase tracking-wider">
                Applications in progress
              </h2>
              <select
                value={pipelineJobFilter}
                onChange={(e) => setPipelineJobFilter(e.target.value as any)}
                className="bg-[#121636] border border-indigo-500/30 text-indigo-200 text-[10px] font-black px-3 py-1.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="ACTIVE" className="bg-[#090b21] text-white">Active Jobs</option>
                <option value="ENDED" className="bg-[#090b21] text-white">Ended Jobs</option>
                <option value="ALL" className="bg-[#090b21] text-white">All Jobs</option>
              </select>
            </div>

            {/* Pipeline Step Chevron Connectors design */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 pt-2 relative z-10">
              {pipelineSteps.map((step, idx) => (
                <div key={idx} className="relative bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 text-center hover:bg-white/[0.05] hover:border-indigo-500/30 transition-all">
                  <span className="text-[10px] font-black tracking-widest text-indigo-200 uppercase block">
                    {step.label}
                  </span>
                  
                  <span className="text-2xl font-black text-white block mt-2">
                    {step.value}
                  </span>

                  <div className="mt-3 flex justify-center items-center gap-1">
                    <span className="text-[9px] font-extrabold px-2 py-0.5 bg-white/[0.04] border border-white/[0.08] rounded-md text-slate-300">
                      {step.pct}
                    </span>
                    {(step as any).trend && (
                      <span className={`text-[9px] font-extrabold flex items-center ${(step as any).trendUp ? "text-emerald-400" : "text-rose-400"}`}>
                        {(step as any).trendUp ? <TrendingUp size={8} /> : <TrendingDown size={8} />}
                        {(step as any).trend.replace(/[-+]/g, '')}
                      </span>
                    )}
                  </div>
                  
                  {/* Glowing step connector dot indicator line */}
                  <div className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-3 bg-[#0e1131] border-2 border-indigo-500/30 rounded-full hidden md:block z-10" style={{ display: idx === 5 ? 'none' : 'block' }}>
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full mx-auto" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Active Jobs Table block */}
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden flex flex-col justify-between h-[620px]">
            <div className="px-6 py-5 border-b border-slate-50 flex justify-between items-center bg-white shrink-0">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Top Active Jobs
              </h2>
              <Link to="/company/jobs" className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-0.5">
                View All Jobs <ArrowUpRight size={13} />
              </Link>
            </div>
            
            {activeJobsListToRender.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                  <Briefcase size={20} />
                </div>
                <h3 className="text-sm font-black text-slate-800">No active jobs available yet.</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Create a job posting to start tracking active hiring performance.
                </p>
                <Link 
                  to="/company/jobs" 
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
                >
                  Post First Job
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto overflow-y-auto flex-1 scrollbar-hide">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/50">
                      <th className="py-4 px-6">Job Title</th>
                      <th className="py-4 px-6 text-center">Applicants</th>
                      <th className="py-4 px-6 text-center">In Pipeline</th>
                      <th className="py-4 px-6 text-center">Positions Available</th>
                      <th className="py-4 px-6 text-center">Pipeline Stages</th>
                      <th className="py-4 px-6 text-center">Hired</th>
                      <th className="py-4 px-6 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-slate-700 text-xs font-semibold">
                    {paginatedActiveJobs.map((job, index) => (
                      <tr key={index} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-6">
                           <span className="font-extrabold text-slate-900 block">{job.title}</span>
                           <span className="text-[10px] text-slate-400 font-bold block mt-1">{job.type}</span>
                        </td>
                        <td className="py-3.5 px-6 font-extrabold text-center text-slate-900">{job.applicants}</td>
                        <td className="py-3.5 px-6 font-extrabold text-center text-indigo-600">{job.pipeline}</td>
                        <td className="py-3.5 px-6 font-extrabold text-center text-slate-700">{job.positionsAvailable}</td>
                        <td className="py-3.5 px-6 font-extrabold text-center text-indigo-500">{job.stageCount}</td>
                        <td className="py-3.5 px-6 font-extrabold text-center text-[#10b981]">{job.hired}</td>
                        <td className="py-3.5 px-6 text-right">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 font-black uppercase text-[9px] rounded-lg tracking-wide">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            Active
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {activeJobsListToRender.length > 0 && totalJobsPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-50 flex items-center justify-between bg-white flex-wrap gap-2">
                <span className="text-slate-400 font-bold text-[11px]">
                  Showing {((safeJobsPage - 1) * jobsPerPage) + 1} to {Math.min(activeJobsListToRender.length, safeJobsPage * jobsPerPage)} of {activeJobsListToRender.length} active jobs
                </span>
                <div className="flex gap-1.5">
                  <button
                    id="prev-jobs-btn"
                    onClick={() => setJobsPage(p => Math.max(1, p - 1))}
                    disabled={safeJobsPage === 1}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors border ${
                      safeJobsPage === 1
                        ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
                        : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer shadow-sm"
                    }`}
                  >
                    Prev
                  </button>
                  {Array.from({ length: totalJobsPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setJobsPage(p)}
                      className={`w-7 h-7 flex items-center justify-center rounded-xl text-[10px] font-black transition-colors ${
                        p === safeJobsPage
                          ? "bg-blue-600 text-white shadow-md shadow-blue-600/10"
                          : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    id="next-jobs-btn"
                    onClick={() => setJobsPage(p => Math.min(totalJobsPages, p + 1))}
                    disabled={safeJobsPage === totalJobsPages}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors border ${
                      safeJobsPage === totalJobsPages
                        ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
                        : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer shadow-sm"
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Right Columns (4/12) */}
        <div className="lg:col-span-4 space-y-6">
              {/* Recruitment Schedule Panel */}
          <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex flex-col min-h-[460px] h-auto pb-6">
            {/* Header with Title and Overall Count */}
            <div className="flex justify-between items-center border-b border-slate-50 pb-4 shrink-0">
              <div className="flex items-center gap-2">
                <ListTodo className="text-blue-600" size={18} />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Recruitment Schedule
                </h3>
              </div>
              <span className="text-[9px] bg-blue-50 text-blue-700 font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-wider">
                {(() => {
                  const activeApplicants = realApplicants.filter((a: any) => {
                    const job = realJobs.find((j: any) => j.id === a.job_id);
                    return job ? job.status === 'OPEN' : true;
                  });
                  const activeInterviews = realInterviews.filter((i: any) => {
                    const applicant = realApplicants.find((a: any) => a.full_name === i.candidate);
                    if (!applicant) return true;
                    const job = realJobs.find((j: any) => j.id === applicant.job_id);
                    return job ? job.status === 'OPEN' : true;
                  });

                  const waitingReviewCount = activeApplicants.filter(a => normalizeStageBucket(a) === 'APPLIED').length;
                  const pendingAssessments = activeApplicants.filter(a => normalizeStageBucket(a) === 'ASSESSMENT').length;
                  const todayStr = new Date().toDateString();
                  const interviewsToday = activeInterviews.filter(i => i.time && new Date(i.time).toDateString() === todayStr).length;
                  const pipelineCount = activeApplicants.filter(a => {
                    const bucket = normalizeStageBucket(a);
                    return bucket !== 'REJECTED' && bucket !== 'HIRED';
                  }).length;
                  const expiringSoonCount = realJobs.filter(j => {
                    if (j.status !== 'OPEN' || !j.expires_at) return false;
                    const expiryDate = new Date(j.expires_at);
                    const diffTime = expiryDate.getTime() - new Date().getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return diffDays > 0 && diffDays <= 7;
                  }).length;
                  const offerFollowUpCount = activeApplicants.filter(a => {
                    const status = String(a.status || '').toUpperCase();
                    return status === 'SELECTED' || String(a.current_stage_type || '').toUpperCase() === 'OFFER';
                  }).length;

                  const endedJobs = realJobs.filter((j: any) => j.status !== 'OPEN');
                  const endedJobIds = endedJobs.map((j: any) => j.id);
                  const endedJobCandidatesNeedingDecisions = realApplicants.filter((a: any) => {
                    if (!endedJobIds.includes(a.job_id)) return false;
                    const bucket = normalizeStageBucket(a);
                    return bucket !== 'REJECTED' && bucket !== 'HIRED';
                  });

                  const autoCount = pendingActionsList.length > 0 ? pendingActionsList.length : (
                    (waitingReviewCount > 0 ? 1 : 0) + 
                    (pendingAssessments > 0 ? 1 : 0) + 
                    (interviewsToday > 0 ? 1 : 0) + 
                    (pipelineCount > 0 ? 1 : 0) + 
                    (expiringSoonCount > 0 ? 1 : 0) + 
                    (offerFollowUpCount > 0 ? 1 : 0) + 
                    (endedJobCandidatesNeedingDecisions.length > 0 ? 1 : 0) +
                    heldCandidateTasks.length
                  );
                  
                  const manualCount = todos.filter(t => t.status !== 'COMPLETED').length;
                  return pendingTab === 'pending' ? autoCount : manualCount;
                })()} {pendingTab === 'pending' ? 'Pending' : 'To Do'}
              </span>
            </div>

            {/* Tab Selectors */}
            <div className="flex border-b border-slate-100 shrink-0 my-3">
              <button
                type="button"
                onClick={() => setPendingTab('pending')}
                className={`flex-1 py-2 text-center text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                  pendingTab === 'pending'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Pending Tasks
              </button>
              <button
                type="button"
                onClick={() => setPendingTab('todo')}
                className={`flex-1 py-2 text-center text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                  pendingTab === 'todo'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                To Do’s
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 space-y-4">
              {pendingTab === 'pending' ? (
                (() => {
                  const activeApplicants = realApplicants.filter((a: any) => {
                    const job = realJobs.find((j: any) => j.id === a.job_id);
                    return job ? job.status === 'OPEN' : true;
                  });
                  const activeInterviews = realInterviews.filter((i: any) => {
                    const applicant = realApplicants.find((a: any) => a.full_name === i.candidate);
                    if (!applicant) return true;
                    const job = realJobs.find((j: any) => j.id === applicant.job_id);
                    return job ? job.status === 'OPEN' : true;
                  });

                  const waitingReviewCount = activeApplicants.filter(a => normalizeStageBucket(a) === 'APPLIED').length;
                  const pendingAssessments = activeApplicants.filter(a => normalizeStageBucket(a) === 'ASSESSMENT').length;
                  const todayStr = new Date().toDateString();
                  const interviewsToday = activeInterviews.filter(i => i.time && new Date(i.time).toDateString() === todayStr).length;
                  const pipelineCount = activeApplicants.filter(a => {
                    const bucket = normalizeStageBucket(a);
                    return bucket !== 'REJECTED' && bucket !== 'HIRED';
                  }).length;
                  const expiringSoonCount = realJobs.filter(j => {
                    if (j.status !== 'OPEN' || !j.expires_at) return false;
                    const expiryDate = new Date(j.expires_at);
                    const diffTime = expiryDate.getTime() - new Date().getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return diffDays > 0 && diffDays <= 7;
                  }).length;
                  const offerFollowUpCount = activeApplicants.filter(a => {
                    const status = String(a.status || '').toUpperCase();
                    return status === 'SELECTED' || String(a.current_stage_type || '').toUpperCase() === 'OFFER';
                  }).length;

                  const endedJobs = realJobs.filter((j: any) => j.status !== 'OPEN');
                  const endedJobIds = endedJobs.map((j: any) => j.id);
                  const endedJobCandidatesNeedingDecisions = realApplicants.filter((a: any) => {
                    if (!endedJobIds.includes(a.job_id)) return false;
                    const bucket = normalizeStageBucket(a);
                    return bucket !== 'REJECTED' && bucket !== 'HIRED';
                  });

                  const systemActionsList: any[] = pendingActionsList.length > 0 ? [...pendingActionsList] : [];

                  if (pendingActionsList.length === 0) {
                    if (waitingReviewCount > 0) {
                      systemActionsList.push({
                        id: 'sys-waiting-review',
                        title: `${waitingReviewCount} application${waitingReviewCount > 1 ? 's' : ''} waiting for review`,
                        sub: 'Needs Screening',
                        type: 'Review',
                        actionPath: '/company/applicants'
                      });
                    }

                    if (pendingAssessments > 0) {
                      systemActionsList.push({
                        id: 'sys-pending-assessments',
                        title: `${pendingAssessments} assessment${pendingAssessments > 1 ? 's' : ''} pending verification`,
                        sub: 'Awaiting evaluation',
                        type: 'Assessment',
                        actionPath: '/company/assessments'
                      });
                    }

                    if (interviewsToday > 0) {
                      systemActionsList.push({
                        id: 'sys-interviews-today',
                        title: `${interviewsToday} interview${interviewsToday > 1 ? 's' : ''} scheduled today`,
                        sub: 'Requires preparation',
                        type: 'Interview',
                        actionPath: '/company/interviews'
                      });
                    }

                    if (pipelineCount > 0) {
                      systemActionsList.push({
                        id: 'sys-pipeline-active',
                        title: `${pipelineCount} candidate${pipelineCount > 1 ? 's' : ''} active in hiring pipeline`,
                        sub: 'Keep moving forward',
                        type: 'Pipeline',
                        actionPath: '/company/pipeline'
                      });
                    }

                    if (expiringSoonCount > 0) {
                      systemActionsList.push({
                        id: 'sys-jobs-expiring',
                        title: `${expiringSoonCount} job posting${expiringSoonCount > 1 ? 's' : ''} expiring soon`,
                        sub: 'Renew or review applicants',
                        type: 'Job',
                        actionPath: '/company/jobs'
                      });
                    }

                    if (offerFollowUpCount > 0) {
                      systemActionsList.push({
                        id: 'sys-offer-followup',
                        title: `${offerFollowUpCount} candidate selection${offerFollowUpCount > 1 ? 's' : ''} pending offer details`,
                        sub: 'Offer Stage',
                        type: 'Offer',
                        actionPath: '/company/pipeline'
                      });
                    }

                    if (endedJobCandidatesNeedingDecisions.length > 0) {
                      systemActionsList.push({
                        id: 'sys-ended-job-decisions',
                        title: `${endedJobCandidatesNeedingDecisions.length} candidate${endedJobCandidatesNeedingDecisions.length > 1 ? 's' : ''} from an ended job still require shortlist or rejection decisions.`,
                        sub: 'Ended Job decisions',
                        type: 'Decision',
                        actionPath: '/company/applicants'
                      });
                    }

                    heldCandidateTasks.forEach((task, idx) => {
                      systemActionsList.push({
                        id: `sys-held-${idx}`,
                        title: task.title,
                        sub: task.sub || 'Action Required',
                        type: 'Held',
                        actionPath: task.actionPath || '/company/applicants'
                      });
                    });
                  }

                  if (analyticsError) {
                    return (
                      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                        <p className="text-xs text-rose-600 font-extrabold uppercase tracking-widest">
                          {analyticsError}
                        </p>
                      </div>
                    );
                  }

                  if (systemActionsList.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                        <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mb-3">
                          <Check size={20} className="text-emerald-500" />
                        </div>
                        <p className="text-xs text-slate-800 font-extrabold uppercase tracking-widest">
                          No pending actions right now
                        </p>
                        <p className="text-[11px] text-slate-400 font-medium mt-1 leading-relaxed">
                          Everything looks clear! Check back later for candidate updates.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                      {systemActionsList.map((action) => (
                        <div 
                          key={action.id} 
                          className="flex items-start justify-between gap-3 p-3 bg-[#f8fafd] hover:bg-slate-50/80 rounded-2xl border border-slate-100/50 transition-all"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                action.type === "Interview" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                                action.type === "Assessment" ? "bg-purple-50 text-purple-700 border border-purple-100" :
                                action.type === "Held" ? "bg-rose-50 text-rose-700 border border-rose-200" :
                                action.type === "Offer" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                                action.type === "Decision" ? "bg-indigo-50 text-indigo-700 border border-indigo-100" :
                                "bg-blue-50 text-blue-700 border border-blue-100"
                              }`}>
                                {action.type}
                              </span>
                              <span className="text-[10px] text-slate-400 font-bold truncate">
                                {action.sub}
                              </span>
                            </div>
                            <p className="text-xs font-extrabold text-slate-900 mt-1 leading-snug">
                              {action.title}
                            </p>
                          </div>

                          <button
                            onClick={() => navigate(action.actionPath)}
                            className="p-1.5 bg-white hover:bg-blue-50 hover:text-blue-600 text-slate-400 rounded-xl border border-slate-100 transition-colors shrink-0 flex items-center justify-center gap-1 cursor-pointer"
                            title="Go to section"
                          >
                            <ExternalLink size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })()
              ) : (
                <div className="space-y-4">
                  {/* Calendar Month View */}
                  <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentCalendarMonthYear(new Date(currentCalendarMonthYear.getFullYear(), currentCalendarMonthYear.getMonth() - 1, 1));
                        }}
                        className="p-1 hover:bg-slate-150 rounded-lg text-slate-500 hover:text-slate-700 cursor-pointer"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">
                        {currentCalendarMonthYear.toLocaleDateString('default', { month: 'long', year: 'numeric' })}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentCalendarMonthYear(new Date(currentCalendarMonthYear.getFullYear(), currentCalendarMonthYear.getMonth() + 1, 1));
                        }}
                        className="p-1 hover:bg-slate-150 rounded-lg text-slate-500 hover:text-slate-700 cursor-pointer"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                        <div key={d} className="py-0.5">{d}</div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {getDaysInMonth(currentCalendarMonthYear).map((day, idx) => {
                        const y = day.getFullYear();
                        const m = String(day.getMonth() + 1).padStart(2, '0');
                        const d = String(day.getDate()).padStart(2, '0');
                        const formattedDate = `${y}-${m}-${d}`;
                        const isCurrentMonth = day.getMonth() === currentCalendarMonthYear.getMonth();
                        const isSelected = day.toDateString() === selectedCalendarDate.toDateString();
                        
                        const dayTodos = todos.filter(t => t.due_date === formattedDate);
                        const hasTodos = dayTodos.length > 0;
                        const completedAll = hasTodos && dayTodos.every(t => t.status === 'COMPLETED');
                        
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSelectedCalendarDate(day)}
                            className={`relative aspect-square flex flex-col items-center justify-center text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20 font-black'
                                : isCurrentMonth
                                  ? 'text-slate-700 hover:bg-slate-200 font-bold'
                                  : 'text-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <span>{day.getDate()}</span>
                            {hasTodos && (
                              <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${
                                isSelected
                                  ? 'bg-white'
                                  : completedAll
                                    ? 'bg-emerald-500'
                                    : 'bg-blue-500'
                              }`} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Task Addition Form (links task to selected calendar date) */}
                  <form onSubmit={handleAddTodo} className="flex flex-col sm:flex-row gap-2 w-full shrink-0">
                    <input
                      type="text"
                      placeholder={`Task for ${selectedCalendarDate.toLocaleDateString('default', { month: 'short', day: 'numeric' })}...`}
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-blue-500 placeholder:text-slate-400 text-left text-slate-900"
                    />
                    <button
                      type="submit"
                      className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                    >
                      <Plus size={16} strokeWidth={2.5} />
                    </button>
                  </form>

                  {/* Filtered To Do List for the selected calendar date */}
                  {(() => {
                    const y = selectedCalendarDate.getFullYear();
                    const m = String(selectedCalendarDate.getMonth() + 1).padStart(2, '0');
                    const d = String(selectedCalendarDate.getDate()).padStart(2, '0');
                    const formattedSelDate = `${y}-${m}-${d}`;
                    const selectedDateTodos = todos.filter(t => t.due_date === formattedSelDate);

                    return selectedDateTodos.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-6 text-center text-slate-450 border border-dashed border-slate-100 rounded-2xl">
                        <p className="text-xs font-bold text-slate-500">No tasks for this day.</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Use the field above to schedule a task.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                        {selectedDateTodos.map((task) => (
                          <div 
                            key={task.id} 
                            className={`flex items-center justify-between gap-3 p-2.5 rounded-2xl border transition-all ${
                              task.status === "COMPLETED" 
                                ? "bg-slate-50/50 border-slate-100 opacity-60" 
                                : "bg-white border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <button
                                type="button"
                                onClick={() => handleToggleTodo(task.id)}
                                className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                                  task.status === "COMPLETED"
                                    ? "bg-emerald-500 border-emerald-500 text-white"
                                    : "border-slate-300 hover:border-blue-500 bg-white"
                                }`}
                              >
                                {task.status === "COMPLETED" && <Check size={12} strokeWidth={3} />}
                              </button>
                              <div className="min-w-0">
                                <p className={`text-xs font-bold text-slate-900 truncate ${task.status === "COMPLETED" ? "line-through text-slate-400" : ""}`}>
                                  {task.title}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteTodo(task.id)}
                              className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-lg transition-colors shrink-0 cursor-pointer"
                              title="Delete task"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* AI Insights box matched exactly */}
          <div className="bg-[#0b0f2a] text-white p-6 rounded-[24px] border border-[#1e234c] shadow-xl relative overflow-hidden flex flex-col justify-between h-[370px]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="space-y-5 relative z-10">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black tracking-widest text-[#a5b4fc] uppercase flex items-center gap-1.5">
                  <Sparkles size={14} className="text-indigo-400" />
                  AI Insights
                </span>
                <Link to="/company/recommendations" className="text-[10px] font-black text-indigo-300 hover:text-white uppercase tracking-wider">
                  View All
                </Link>
              </div>

              {/* Insight Rows styling */}
              <div className="space-y-4 pt-1">
                {/* Bullet 1 */}
                <div className="flex items-start gap-3 bg-white/[0.04] p-3 rounded-xl border border-white/[0.03] hover:bg-white/[0.07] transition-all cursor-pointer">
                  <div className="w-8 h-8 rounded-lg bg-indigo-950 flex items-center justify-center shrink-0 border border-indigo-500/10">
                    <Sparkles size={14} className="text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-slate-100 font-extrabold leading-relaxed">
                      {(() => {
                        const highlyRatedCount = realApplicants.filter((a: any) => Number(a.talent_score) >= 85).length;
                        return highlyRatedCount > 0 
                          ? `${highlyRatedCount} profile${highlyRatedCount > 1 ? "s are" : " is"} highly recommended based on outstanding AI screening scores`
                          : "No candidate applications are currently rated above 85/100";
                      })()}
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-slate-400 shrink-0 self-center" />
                </div>

                {/* Bullet 2 */}
                <div className="flex items-start gap-3 bg-white/[0.04] p-3 rounded-xl border border-white/[0.03] hover:bg-white/[0.07] transition-all cursor-pointer">
                  <div className="w-8 h-8 rounded-lg bg-indigo-950 flex items-center justify-center shrink-0 border border-indigo-500/10">
                    <BarChart3 size={14} className="text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-slate-100 font-extrabold leading-relaxed">
                      {activeJobsCount > 0 
                        ? `Hiring Copilot is currently guarding pipelines across ${activeJobsCount} active job vacancies`
                        : "Awaiting active job postings to spin up automated recruiter matching algorithms"}
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-slate-400 shrink-0 self-center" />
                </div>

                {/* Bullet 3 */}
                <div className="flex items-start gap-3 bg-white/[0.04] p-3 rounded-xl border border-white/[0.03] hover:bg-white/[0.07] transition-all cursor-pointer">
                  <div className="w-8 h-8 rounded-lg bg-indigo-950 flex items-center justify-center shrink-0 border border-indigo-500/10">
                    <Users size={14} className="text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-slate-100 font-extrabold leading-relaxed">
                      {screeningVal > 0 
                        ? `${screeningVal} candidate${screeningVal > 1 ? "s are" : " is"} currently undergoing active evaluation & vetting screening`
                        : "No candidate registration backlog; applicant streams are quiet and up to date"}
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-slate-400 shrink-0 self-center" />
                </div>
              </div>
            </div>

            <Link 
              to="/company/recommendations"
              className="mt-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white rounded-xl text-center text-[10px] font-black uppercase tracking-widest relative z-10 block transition-all"
            >
              Go to Hiring Copilot <span className="font-sans">→</span>
            </Link>
          </div>

        </div>
      </div>

      {/* Bottom Dashboard Section - Clean Alignment Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mt-8">
        {/* Bottom Left Column (8/12) */}
        <div className="lg:col-span-8 flex flex-col h-full">
          {/* Hiring Time per Job Graphic Card */}
          <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm h-[320px] min-h-[320px] flex flex-col justify-between">
            <div className="flex justify-between items-center flex-wrap gap-2 shrink-0">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Clock size={16} className="text-indigo-600" />
                  Hiring Time per Job
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Average days from application to candidate selection
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={hiringTimeJobFilter}
                  onChange={(e) => setHiringTimeJobFilter(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-black px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer max-w-[120px] sm:max-w-[160px] truncate"
                >
                  <option value="ALL">All Jobs</option>
                  <option value="ACTIVE">Active Jobs</option>
                  <option value="ENDED">Ended Jobs</option>
                </select>
              </div>
            </div>

            {/* Infographic Container */}
            <div className="flex-1 flex flex-col justify-center min-h-0 pt-2">
              {hiringTimeJobsData.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                  <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mb-2 border border-slate-100">
                    <Clock size={18} />
                  </div>
                  <h4 className="text-xs font-bold text-slate-700">No hiring-time data available yet.</h4>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-xs">
                    Selection time metrics will appear here once candidates are moved to hired or selected stages.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 overflow-y-auto scrollbar-hide max-h-[210px] pr-1">
                  {hiringTimeJobsData.map((job) => {
                    const percentage = Math.min(100, Math.max(0, Math.round((job.hiresCount / job.openings) * 100)));
                    return (
                      <div key={job.id} className="bg-slate-50/40 hover:bg-slate-50 border border-slate-100/60 rounded-xl p-2.5 transition-all flex flex-col justify-between">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <span className="text-[11px] font-extrabold text-slate-900 block truncate" title={job.title}>
                              {job.title}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 block mt-0.5 truncate">
                              Hired {job.hiresCount} of {job.openings} • Deadline {job.formattedDeadline} • {job.resultState}
                            </span>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <span className="text-[11px] font-black text-indigo-600">
                              {job.avgDays} {job.avgDays === 1 ? "day" : "days"}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500" 
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Right Column (4/12) */}
        <div className="lg:col-span-4 flex flex-col h-full">
          {/* Candidate Quality Score Donut chart */}
          <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm h-[320px] min-h-[320px] flex flex-col justify-between">
            <div className="flex justify-between items-center shrink-0">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Candidate Quality Score
              </h3>
              <span className="text-[10px] text-indigo-500 font-black uppercase tracking-wider cursor-pointer hover:underline">
                Details
              </span>
            </div>

            <div className="flex-1 flex items-center justify-between gap-6 py-2 overflow-hidden">
              {/* Circular Dial using SVG */}
              <div className="relative w-32 h-32 shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  {/* Inner decorative subtle solid ring */}
                  <circle
                    cx="18"
                    cy="18"
                    r="10.5"
                    className="text-slate-100"
                    strokeWidth="0.5"
                    fill="none"
                    stroke="currentColor"
                  />
                  {/* Middle decorative dashed concentric ring */}
                  <circle
                    cx="18"
                    cy="18"
                    r="13"
                    className="text-indigo-100/40"
                    strokeWidth="0.5"
                    strokeDasharray="1.5 1.5"
                    fill="none"
                    stroke="currentColor"
                  />
                  {/* Main Background track */}
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    className="text-slate-100"
                    strokeWidth="2.5"
                    fill="none"
                    stroke="currentColor"
                  />
                  {/* Main Dynamic Progress indicator */}
                  <path 
                    className="text-indigo-600 transition-all duration-1000 ease-out" 
                    strokeDasharray={`${avgOverallScore || 0} 97.389`} 
                    strokeWidth="3" 
                    strokeLinecap="round"
                    stroke="currentColor" 
                    fill="none" 
                    d="M18 2.5 a 15.5 15.5 0 0 1 0 31 a 15.5 15.5 0 0 1 0 -31" 
                  />
                </svg>
                {/* Score central display */}
                <div className="absolute inset-0 flex flex-col justify-center items-center">
                  {avgOverallScore > 0 ? (
                    <>
                      <span className="text-3xl font-black text-slate-950 leading-none tracking-tight">{avgOverallScore}</span>
                      <span className="text-[7px] text-slate-400 font-black uppercase mt-0.5 tracking-wider leading-none">OUT OF 100</span>
                      <span className="text-[9px] text-indigo-600 font-black uppercase mt-1 leading-none tracking-wide">{qualityLabel}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-3xl font-black text-slate-400 leading-none">--</span>
                      <span className="text-[9px] text-slate-400 font-black uppercase mt-1 leading-none tracking-wide">N/A</span>
                    </>
                  )}
                </div>
              </div>

              {/* Dynamic Legend matches design exact colors */}
              <div className="flex-1 space-y-2.5">
                {/* Row 1: Excellent */}
                <div className="space-y-0.5">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0 shadow-sm shadow-blue-500/10" />
                      <span className="font-extrabold text-slate-800">Excellent</span>
                    </div>
                    <span className="font-black text-slate-950">{excellentPct}%</span>
                  </div>
                  <div className="pl-4.5 text-[9px] text-slate-400 font-extrabold leading-none uppercase tracking-wide">80-100</div>
                </div>

                {/* Row 2: Good */}
                <div className="space-y-0.5">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 shadow-sm shadow-emerald-500/10" />
                      <span className="font-extrabold text-slate-800">Good</span>
                    </div>
                    <span className="font-black text-slate-950">{goodPct}%</span>
                  </div>
                  <div className="pl-4.5 text-[9px] text-slate-400 font-extrabold leading-none uppercase tracking-wide">60-79</div>
                </div>

                {/* Row 3: Average */}
                <div className="space-y-0.5">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0 shadow-sm shadow-amber-400/10" />
                      <span className="font-extrabold text-slate-800">Average</span>
                    </div>
                    <span className="font-black text-slate-950">{averagePct}%</span>
                  </div>
                  <div className="pl-4.5 text-[9px] text-slate-400 font-extrabold leading-none uppercase tracking-wide">40-59</div>
                </div>

                {/* Row 4: Needs Improvement */}
                <div className="space-y-0.5">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shrink-0 shadow-sm shadow-rose-400/10" />
                      <span className="font-extrabold text-slate-800 tracking-tight">Needs Improvement</span>
                    </div>
                    <span className="font-black text-slate-950">{needsImprovementPct}%</span>
                  </div>
                  <div className="pl-4.5 text-[9px] text-slate-400 font-extrabold leading-none uppercase tracking-wide">0-39</div>
                </div>
              </div>
            </div>

            {/* Subtle bottom insight strip */}
            <div className="mt-1 px-3 py-2.5 bg-indigo-50/50 border border-indigo-100/40 rounded-xl flex items-center gap-2 text-[10px] text-indigo-700 font-extrabold shrink-0">
              <Sparkles size={11} className="text-indigo-500 shrink-0" />
              <span className="truncate">
                {totalWithScores === 0 ? "Candidate quality insights will appear once candidates are evaluated." : (
                  avgOverallScore >= 80 ? "Your candidate quality is in the Excellent range." :
                  avgOverallScore >= 60 ? "Your candidate quality is in the Good range." :
                  avgOverallScore >= 40 ? "Your candidate quality is in the Average range." :
                  "Candidate quality needs improvement. Consider refining job criteria and screening stages."
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Dashboard Section - Copilot and Upcoming Interviews Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mt-8">
        {/* Footer Left Column (8/12) */}
        <div className="lg:col-span-8 flex flex-col h-full">
          {/* AI Hiring Copilot Promotional Card */}
          <div className="bg-gradient-to-br from-[#070a24] via-[#0e1236] to-[#1c1842] text-white p-5 md:p-6 rounded-[24px] border border-indigo-500/30 shadow-[0_0_30px_rgba(79,70,229,0.18)] relative overflow-hidden flex flex-col justify-between flex-1 min-h-[340px] group hover:border-indigo-500/40 transition-all">
            <div className="absolute top-0 right-0 w-44 h-44 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="space-y-3.5 relative z-10 flex-1 flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5 shrink-0">
                <div className="flex items-center gap-2.5">
                  <span className="px-2 py-0.5 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-indigo-300 text-[9px] font-black rounded border border-indigo-500/30 tracking-wider">
                    BETA
                  </span>
                  <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Sparkles size={18} className="text-indigo-400 animate-pulse" />
                    AI Hiring Copilot
                  </h3>
                </div>
              </div>
              
              <div className="shrink-0">
                <p className="text-sm md:text-[15px] text-slate-100 font-semibold leading-relaxed">
                  Assess, rank, and shortlist the best candidates using VEGA AI-powered recommendations built from skills, profile strength, assessment signals, and hiring intent.
                </p>
              </div>

              {/* Grid of 3 Premium Numeric Benefit Blocks */}
              <div className="grid grid-cols-3 gap-2.5 my-2.5 flex-1 items-stretch">
                <div className="bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-indigo-500/20 transition-all rounded-xl p-3 flex flex-col justify-between">
                  <div>
                    <div className="text-white font-black tracking-wider flex items-center gap-1">
                      <Zap size={14} className="text-amber-400 shrink-0" />
                      <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent font-sans text-base md:text-[18px] font-black">2x Faster</span>
                    </div>
                    <div className="text-[9px] md:text-[11px] font-black uppercase text-indigo-300 tracking-wider mt-0.5">
                      Shortlisting
                    </div>
                  </div>
                  <p className="text-[10px] md:text-[11.5px] text-slate-400 font-medium leading-tight mt-1.5">
                    Reduce manual screening time with AI-ranked candidates.
                  </p>
                </div>

                <div className="bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-indigo-500/20 transition-all rounded-xl p-3 flex flex-col justify-between">
                  <div>
                    <div className="text-white font-black tracking-wider flex items-center gap-1">
                      <Target size={14} className="text-sky-400 shrink-0" />
                      <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent font-sans text-base md:text-[18px] font-black">80%+ Match</span>
                    </div>
                    <div className="text-[9px] md:text-[11px] font-black uppercase text-indigo-300 tracking-wider mt-0.5">
                      Skill-Fit Scoring
                    </div>
                  </div>
                  <p className="text-[10px] md:text-[11.5px] text-slate-400 font-medium leading-tight mt-1.5">
                    Compare candidate skills against job requirements.
                  </p>
                </div>

                <div className="bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-indigo-500/20 transition-all rounded-xl p-3 flex flex-col justify-between">
                  <div>
                    <div className="text-white font-black tracking-wider flex items-center gap-1">
                      <TrendingUp size={14} className="text-emerald-400 shrink-0" />
                      <span className="bg-gradient-to-r from-emerald-400 to-indigo-400 bg-clip-text text-transparent font-sans text-base md:text-[18px] font-black">3x Better</span>
                    </div>
                    <div className="text-[9px] md:text-[11px] font-black uppercase text-indigo-300 tracking-wider mt-0.5">
                      Candidate Discovery
                    </div>
                  </div>
                  <p className="text-[10px] md:text-[11.5px] text-slate-400 font-medium leading-tight mt-1.5">
                    Surface hidden-fit candidates from your talent pool.
                  </p>
                </div>
              </div>
            </div>

            <Link 
              to="/company/recommendations"
              className="py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-center text-[10px] font-black uppercase tracking-widest relative z-10 block transition-all hover:shadow-lg hover:shadow-indigo-500/10 active:scale-[0.98] cursor-pointer whitespace-nowrap w-full shrink-0 mt-2"
            >
              Go to Hiring Copilot <span className="font-sans">→</span>
            </Link>
          </div>
        </div>

        {/* Footer Right Column (4/12) */}
        <div className="lg:col-span-4 flex flex-col h-full">
          {/* Upcoming Interviews listing section */}
          <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex flex-col justify-between h-[360px] shrink-0 overflow-hidden">
            <div className="flex justify-between items-center shrink-0 border-b border-slate-50 pb-4">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Upcoming Interviews
              </h3>
              <span onClick={() => { navigate('/company/interviews'); }} className="text-[10px] text-blue-600 font-black uppercase tracking-wider cursor-pointer hover:underline">
                View Calendar
              </span>
            </div>

            {upcomingInterviews.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-4 text-center text-slate-500">
                <Calendar size={24} className="text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-800">No interviews scheduled</p>
                <p className="text-[10px] text-slate-400 mt-1 max-w-xs px-2">
                  When you shortlist candidates and send outlook calendar invites, upcoming interview rounds appear here.
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto py-3 pr-1 space-y-4 scrollbar-hide">
                {upcomingInterviews.map((interview, index) => (
                  <div key={index} className="flex items-center justify-between gap-4 p-3 bg-slate-50/50 hover:bg-slate-50 rounded-2xl border border-slate-100 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200">
                        <img src={interview.avatar} alt="Candidate" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div>
                        <span className="text-xs font-black text-slate-950 block">{interview.name}</span>
                        <span className="text-[10px] text-slate-400 font-bold block mt-0.5">{interview.role}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-right">
                      <div className="text-right">
                        <span className="text-[10px] font-black text-slate-950 block">{interview.time}</span>
                        <span className="text-[8px] text-indigo-500 font-extrabold uppercase mt-0.5 block">Live Meet</span>
                      </div>
                      
                      <button 
                        onClick={() => {
                          toast.success(`Opening live audio/video setup for ${interview.name}...`);
                          navigate(`/company/interviews`);
                        }}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-black uppercase tracking-wider text-[9px] rounded-lg cursor-pointer"
                      >
                        {interview.status}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button 
              onClick={() => { navigate('/company/interviews'); }}
              className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-xl text-center border border-slate-100 block transition-colors cursor-pointer shrink-0 mt-2"
            >
              Manage Calendar & Invites
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedCandidate && (
          <CandidateDetailModal 
            candidate={selectedCandidate} 
            onClose={() => setSelectedCandidate(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
