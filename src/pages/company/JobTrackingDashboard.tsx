import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api.ts";
import {
  ChevronLeft,
  Users,
  Filter,
  Search,
  MoreVertical,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  BarChart3,
  Mail,
  ArrowRight,
  Calendar,
  CheckSquare,
  Square,
  Trash2,
  Send,
  AlertCircle,
  Zap,
  Plus,
  Check,
  Star,
  Award,
  MapPin,
  GraduationCap,
  Briefcase,
  Globe,
  Github,
  Linkedin,
  ExternalLink,
  MessageSquare,
  Info,
  ShieldAlert,
  ListChecks,
  History,
  Video,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { HiringTimeline } from "../../components/HiringTimeline.tsx";
import { toast } from "react-hot-toast";
import { FeedbackConfirmModal } from "../../components/company/FeedbackConfirmModal.tsx";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  AreaChart,
  Area,
} from "recharts";

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

const formatToLocalDatetimeString = (dateInput: string | Date | null | undefined): string => {
  if (!dateInput) return '';
  const d = parseLocalDatetime(dateInput);
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export function JobTrackingDashboard() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<any>(null);
  const [stages, setStages] = useState<any[]>([]);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<number | null>(null);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [selectedApps, setSelectedApps] = useState<number[]>([]);
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [showTestScheduler, setShowTestScheduler] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [testConfig, setTestConfig] = useState({
    scheduledAt: "",
    durationMinutes: 30,
    cutoffScore: 60,
    stageId: null as number | null,
  });

  const [feedbackConfig, setFeedbackConfig] = useState<{
    isOpen: boolean;
    appId: number;
    nextStageId: number;
    actionType: "SELECTED" | "REJECTED";
    candidateName: string;
    jobTitle: string;
  } | null>(null);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  useEffect(() => {
    if (jobId) {
      fetchJobData();
    }
  }, [jobId]);

  const fetchJobData = async () => {
    if (!jobId) return;
    try {
      const { data } = await api.get(`/jobs/${jobId}`);
      if (data.success) {
        setJob(data.data);
      }

      const res = await api.get(`/jobs/applicants/${jobId}`);
      if (res.data.success) {
        setApplicants(res.data.data.applicants || []);
        setStages(res.data.data.stages || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredApplicants = useMemo(() => {
    return applicants.filter(
      (app) =>
        app.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.email?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [applicants, searchQuery]);

  const moveCandidate = async (
    appId: number,
    nextStageId: number,
    action: string,
    feedbackText?: string | null,
    bypassFeedback?: boolean,
  ) => {
    if (job?.status === 'CLOSED') {
      toast.error("This job post has ended. The dashboard is in read-only history mode.");
      return;
    }

    let isSelectedStage = false;
    if (action === "SELECTED") {
      isSelectedStage = true;
    } else {
      const targetStage = stages.find((s) => s.id === nextStageId);
      if (targetStage) {
        const typeUpper = String(targetStage.stage_type || '').toUpperCase();
        const nameUpper = String(targetStage.stage_name || '').toUpperCase();
        if (typeUpper === 'SELECTED' || typeUpper === 'HIRED' || nameUpper === 'SELECTED' || nameUpper === 'HIRED' || nameUpper === 'OFFER') {
          isSelectedStage = true;
        }
      }
    }

    const finalActionType = action === "REJECTED" ? "REJECTED" : "SELECTED";

    if (!bypassFeedback && (action === "REJECTED" || isSelectedStage) && feedbackText === undefined) {
      const app = applicants.find((a) => a.application_id === appId);
      setFeedbackConfig({
        isOpen: true,
        appId,
        nextStageId,
        actionType: finalActionType,
        candidateName: app?.full_name || "Candidate",
        jobTitle: job?.title || "Applied Position",
      });
      return;
    }

    if (feedbackConfig) {
      setIsSubmittingFeedback(true);
    }

    try {
      await api.post("/jobs/update-stage", {
        applicationId: appId,
        stageId: nextStageId,
        action: isSelectedStage ? "SELECTED" : action,
        notes: `Moved to ${stages.find((s) => s.id === nextStageId)?.stage_name || "next stage"}`,
        feedback: feedbackText || null,
        notifyCandidate: true,
      });
      fetchJobData();
      toast.success(
        `Candidate ${action === "REJECTED" ? "rejected" : "moved to next stage"}`,
      );
    } catch (e) {
      toast.error("Failed to update candidate status");
    } finally {
      setFeedbackConfig(null);
      setIsSubmittingFeedback(false);
    }
  };

  const toggleSelect = (appId: number) => {
    setSelectedApps((prev) =>
      prev.includes(appId)
        ? prev.filter((id) => id !== appId)
        : [...prev, appId],
    );
  };

  const toggleSelectStage = (stageId: number) => {
    const stageApps = applicants
      .filter((a) => a.current_stage_id === stageId && a.status !== "REJECTED")
      .map((a) => a.application_id);

    if (stageApps.length === 0) return;

    const allInStageSelected = stageApps.every((id) =>
      selectedApps.includes(id),
    );

    if (allInStageSelected) {
      setSelectedApps((prev) => prev.filter((id) => !stageApps.includes(id)));
    } else {
      setSelectedApps((prev) => Array.from(new Set([...prev, ...stageApps])));
    }
  };

  const handleBulkAction = async (action: string, nextStageId?: number) => {
    if (job?.status === 'CLOSED') {
      toast.error("This job post has ended. The dashboard is in read-only history mode.");
      return;
    }
    if (selectedApps.length === 0) return;

    try {
      const { data } = await api.post("/jobs/bulk-action", {
        applicationIds: selectedApps,
        action,
        stageId: nextStageId,
        notes: `Bulk action: ${action} ${nextStageId ? `to ${stages.find((s) => s.id === nextStageId)?.stage_name}` : ""}`,
      });

      if (data.success) {
        toast.success(data.message);
        setSelectedApps([]);
        fetchJobData();
      }
    } catch (e) {
      toast.error("Bulk action failed");
    }
  };

  const scheduleTest = async () => {
    if (job?.status === 'CLOSED') {
      toast.error("This job post has ended. The dashboard is in read-only history mode.");
      return;
    }
    if (!testConfig.scheduledAt || !testConfig.stageId) {
      toast.error("Please provide all test details");
      return;
    }

    try {
      const { data } = await api.post("/jobs/schedule-test", {
        jobId,
        ...testConfig,
        scheduledAt: new Date(testConfig.scheduledAt).toISOString(),
      });
      if (data.success) {
        toast.success("Test scheduled for selected stage");
        setShowTestScheduler(false);
        fetchJobData();
      }
    } catch (e) {
      toast.error("Failed to schedule test");
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white/80 border-b border-slate-100/50 sticky top-0 z-40 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-12 py-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-10">
            <div className="flex items-center gap-8">
              <button
                onClick={() => navigate(-1)}
                className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl hover:bg-white hover:text-blue-600 transition-all border border-slate-100 hover:shadow-xl hover:shadow-blue-500/10 group flex items-center justify-center"
              >
                <ChevronLeft
                  size={24}
                  className="group-hover:-translate-x-1 transition-transform"
                />
              </button>
              <div>
                <div className="flex items-center gap-4 mb-3">
                  {job?.status === 'CLOSED' ? (
                    <span className="px-4 py-1.5 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-rose-100 shadow-sm flex items-center gap-1.5 animate-pulse">
                      <XCircle size={14} className="text-rose-500" /> Job Ended / History Mode
                    </span>
                  ) : (
                    <span className="px-4 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-blue-100 shadow-sm">
                      Live Campaign
                    </span>
                  )}
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                    <Calendar size={14} className="text-slate-300" />
                    Posted{" "}
                    {new Date(
                      job?.created_at || Date.now(),
                    ).toLocaleDateString()}
                  </div>
                </div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase leading-none">
                  {job?.title}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-6 w-full lg:w-auto">
              <div className="hidden xl:flex items-center gap-10 mr-10 pr-10 border-r border-slate-100">
                <div className="text-center group">
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-2 group-hover:text-slate-900 transition-colors">
                    Total Pool
                  </p>
                  <p className="text-3xl font-black text-slate-900 tracking-tighter">
                    {applicants.length}
                  </p>
                </div>
                <div className="text-center group">
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-2 group-hover:text-blue-600 transition-colors">
                    Active
                  </p>
                  <p className="text-3xl font-black text-blue-600 tracking-tighter">
                    {applicants.filter((a) => a.status === "APPLIED").length}
                  </p>
                </div>
                <div className="text-center group">
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-2 group-hover:text-emerald-600 transition-colors">
                    Selected
                  </p>
                  <p className="text-3xl font-black text-emerald-600 tracking-tighter">
                    {
                      applicants.filter((a) => a.status === "SHORTLISTED")
                        .length
                    }
                  </p>
                </div>
              </div>

              <div className="flex gap-4 flex-1 lg:flex-none">
                <button
                  onClick={() => setShowBulkPanel(!showBulkPanel)}
                  className={`flex-1 lg:flex-none px-8 py-4 rounded-[22px] font-black uppercase text-[11px] tracking-[0.2em] transition-all flex items-center justify-center gap-3 border shadow-sm ${
                    showBulkPanel
                      ? "bg-slate-900 text-white shadow-2xl shadow-slate-900/30 border-slate-900"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  <CheckSquare size={18} />{" "}
                  {showBulkPanel ? "Exit Bulk" : "Bulk Actions"}
                </button>
                {job?.status !== 'CLOSED' && (
                  <button className="flex-1 lg:flex-none bg-blue-600 text-white px-10 py-4 rounded-[22px] font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl shadow-blue-500/30 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-3 border-b-4 border-blue-800">
                    <Plus size={20} strokeWidth={3} /> Add Candidate
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-t border-slate-50 pt-8">
            <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide w-full md:w-auto pb-2 md:pb-0">
              {stages.map((stage: any, idx: number) => (
                <button
                  key={stage.id}
                  onClick={() =>
                    setActiveStage(activeStage === stage.id ? null : stage.id)
                  }
                  className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border transition-all whitespace-nowrap flex items-center gap-3 group/stage ${
                    activeStage === stage.id
                      ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-500/25"
                      : "bg-white border-slate-100 text-slate-400 hover:border-blue-200 hover:text-blue-600"
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full transition-all ${activeStage === stage.id ? "bg-white" : "bg-slate-200 group-hover/stage:bg-blue-400"}`}
                  />
                  {stage.stage_name}
                  <div
                    className={`ml-2 px-2 py-0.5 rounded-lg text-[9px] font-black transition-all ${activeStage === stage.id ? "bg-white/20 text-white" : "bg-slate-50 text-slate-400 group-hover/stage:bg-blue-50 group-hover/stage:text-blue-600"}`}
                  >
                    {
                      applicants.filter(
                        (a) =>
                          a.current_stage_id === stage.id &&
                          a.status !== "REJECTED",
                      ).length
                    }
                  </div>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative group flex-1 md:flex-none">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Search pipeline..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 py-3.5 text-[11px] font-black uppercase tracking-widest focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none w-full md:w-64"
                />
              </div>
              <button className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all hover:shadow-lg">
                <Filter size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showBulkPanel && selectedApps.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-slate-900 text-white py-6 sticky top-[184px] z-30 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-b border-white/5"
          >
            <div className="max-w-[1600px] mx-auto px-12 flex items-center justify-between">
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/40">
                    <Users size={16} />
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-400">
                    {selectedApps.length} Candidates Selected
                  </p>
                </div>
                <button
                  onClick={() => setSelectedApps([])}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all"
                >
                  Deselect All
                </button>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    const activeStageId = applicants.find((a) =>
                      selectedApps.includes(a.application_id),
                    )?.current_stage_id;
                    const nextIdx =
                      stages.findIndex((s) => s.id === activeStageId) + 1;
                    if (nextIdx < stages.length)
                      handleBulkAction("MOVED", stages[nextIdx].id);
                  }}
                  className="flex items-center gap-3 px-6 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 hover:shadow-xl hover:shadow-emerald-500/20 transition-all border-b-2 border-emerald-800 active:translate-y-0.5"
                >
                  <CheckCircle size={16} /> Advance Next
                </button>
                <button
                  onClick={() => handleBulkAction("REJECTED")}
                  className="flex items-center gap-3 px-6 py-3 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 hover:shadow-xl hover:shadow-red-500/20 transition-all border-b-2 border-red-800 active:translate-y-0.5"
                >
                  <XCircle size={16} /> Reject Selection
                </button>
                <button
                  onClick={() => {
                    const stageId = applicants.find((a) =>
                      selectedApps.includes(a.application_id),
                    )?.current_stage_id;
                    setTestConfig({ ...testConfig, stageId });
                    setShowTestScheduler(true);
                  }}
                  className="flex items-center gap-3 px-6 py-3 bg-white text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 transition-all border-b-2 border-slate-200 active:translate-y-0.5"
                >
                  <Zap size={16} /> Schedule Assessment
                </button>
                <button className="flex items-center gap-3 px-6 py-3 bg-slate-800 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:text-white hover:bg-slate-700 transition-all">
                  <Mail size={16} /> Bulk Message
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contextual Job Analytics */}
      <div className="max-w-[1600px] mx-auto px-12 pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-9 bg-white rounded-[40px] border border-slate-100 p-10 flex flex-col md:flex-row items-center gap-12 shadow-sm hover:shadow-xl hover:shadow-slate-200/20 transition-all duration-500 group">
            <div className="w-full md:w-80 h-56 bg-slate-50/50 rounded-3xl p-6 border border-slate-100 group-hover:bg-white transition-colors duration-500 relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      "radial-gradient(#2563eb 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                  }}
                />
              </div>
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={0}
                minHeight={0}
              >
                <BarChart
                  data={[
                    {
                      name: "Applied",
                      count: applicants.filter(
                        (a) => a.status === "APPLIED" || !a.status,
                      ).length,
                    },
                    {
                      name: "Tests",
                      count: applicants.filter((a) => a.status === "TESTING")
                        .length,
                    },
                    {
                      name: "Interviews",
                      count: applicants.filter((a) => a.status === "INTERVIEW")
                        .length,
                    },
                    {
                      name: "Shortlisted",
                      count: applicants.filter(
                        (a) => a.status === "SHORTLISTED",
                      ).length,
                    },
                  ]}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fontWeight: 900, fill: "#94a3b8" }}
                    dy={10}
                  />
                  <Tooltip
                    cursor={{ fill: "#f8fafc" }}
                    contentStyle={{
                      borderRadius: "16px",
                      border: "none",
                      boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.25)",
                      padding: "12px",
                    }}
                    itemStyle={{
                      fontSize: "11px",
                      fontWeight: "900",
                      textTransform: "uppercase",
                      color: "#2563eb",
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="#2563eb"
                    radius={[6, 6, 0, 0]}
                    barSize={35}
                    animationDuration={1500}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-8">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-2 h-2 rounded-full bg-blue-600" />
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">
                    Campaign Performance Engine
                  </h3>
                </div>
                <div className="grid grid-cols-3 gap-6">
                  <div className="p-5 bg-slate-50 rounded-[24px] border border-slate-100 hover:bg-white hover:shadow-lg transition-all duration-300 group/metric">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 group-hover/metric:text-blue-600">
                      Conversion
                    </p>
                    <p className="text-2xl font-black text-slate-900">12.4%</p>
                  </div>
                  <div className="p-5 bg-slate-50 rounded-[24px] border border-slate-100 hover:bg-white hover:shadow-lg transition-all duration-300 group/metric">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 group-hover/metric:text-blue-600">
                      Avg. Talent
                    </p>
                    <p className="text-2xl font-black text-blue-600">
                      {Math.round(
                        applicants.reduce(
                          (acc, a) => acc + (a.talent_score || 0),
                          0,
                        ) / (applicants.length || 1),
                      )}
                      %
                    </p>
                  </div>
                  <div className="p-5 bg-slate-50 rounded-[24px] border border-slate-100 hover:bg-white hover:shadow-lg transition-all duration-300 group/metric">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 group-hover/metric:text-blue-600">
                      Time to Hire
                    </p>
                    <p className="text-2xl font-black text-slate-900">12d</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100/50 rounded-[24px] shadow-inner relative overflow-hidden group/insight">
                <div className="absolute right-0 top-0 w-32 h-full bg-white/40 skew-x-12 translate-x-16 group-hover/insight:-translate-x-full transition-transform duration-1000" />
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm relative z-10">
                  <Sparkles size={18} />
                </div>
                <p className="text-[11px] font-black text-blue-900 uppercase tracking-wide relative z-10 leading-relaxed">
                  AI Discovery:{" "}
                  <span className="text-blue-600">
                    {
                      applicants.filter(
                        (a) => a.talent_score >= 80 && a.status === "APPLIED",
                      ).length
                    }{" "}
                    elite candidates
                  </span>{" "}
                  matched your requirements in the last 24 hours.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 bg-slate-900 rounded-[40px] p-10 text-white flex flex-col justify-between relative overflow-hidden group shadow-2xl">
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/30 rounded-full blur-[80px] -mr-24 -mt-24 group-hover:scale-125 transition-transform duration-1000" />
            <div className="relative z-10">
              <h3 className="text-[11px] font-black text-blue-400 uppercase tracking-[0.3em] mb-8">
                Hiring Velocity
              </h3>
              <div className="flex items-end gap-3 mb-4">
                <span className="text-6xl font-black text-white tracking-tighter leading-none uppercase">
                  Fast
                </span>
                <div className="bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 mb-1">
                  <span className="text-emerald-400 text-xs font-black uppercase">
                    +18%
                  </span>
                </div>
              </div>
              <p className="text-xs font-medium text-slate-400 leading-relaxed italic border-l-2 border-blue-600 pl-4 py-1">
                Your average time-to-hire for this role is 4 days faster than
                the industry benchmark.
              </p>
            </div>
            <button className="relative z-10 w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:shadow-xl mt-8">
              View Market Benchmark
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Board Container with Fade Effects */}
      <main className="max-w-full overflow-hidden">
        <div className="relative group/kanban">
          {/* Left Fade */}
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#F8FAFC] to-transparent z-10 pointer-events-none opacity-0 group-hover/kanban:opacity-100 transition-opacity" />
          {/* Right Fade */}
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#F8FAFC] to-transparent z-10 pointer-events-none opacity-0 group-hover/kanban:opacity-100 transition-opacity" />

          <div className="overflow-x-auto px-12 py-16 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            <div className="flex gap-10 pb-12 min-h-[75vh] min-w-max">
              {stages.map((stage: any, sIdx: any) => (
                <div
                  key={stage.id}
                  className="w-[340px] shrink-0 flex flex-col group/column"
                >
                  <div className="flex items-center justify-between mb-6 px-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-[14px] bg-white border border-slate-200 flex items-center justify-center text-xs font-black text-blue-600 shadow-sm group-hover/column:border-blue-300 group-hover/column:shadow-lg transition-all duration-300">
                        {sIdx + 1}
                      </div>
                      <div>
                        <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">
                          {stage.stage_name}
                        </h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                          {
                            applicants.filter(
                              (a) =>
                                a.current_stage_id === stage.id &&
                                a.status !== "REJECTED",
                            ).length
                          }{" "}
                          Profiles
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {showBulkPanel && (
                        <button
                          onClick={() => toggleSelectStage(stage.id)}
                          className={`px-3 py-1.5 rounded-xl border text-[8px] font-black uppercase transition-all ${
                            applicants.filter(
                              (a) =>
                                a.current_stage_id === stage.id &&
                                a.status !== "REJECTED",
                            ).length > 0 &&
                            applicants
                              .filter(
                                (a) =>
                                  a.current_stage_id === stage.id &&
                                  a.status !== "REJECTED",
                              )
                              .every((a) =>
                                selectedApps.includes(a.application_id),
                              )
                              ? "bg-blue-600 border-blue-600 text-white shadow-lg"
                              : "bg-white border-slate-200 text-slate-400 hover:border-blue-400 hover:text-blue-600"
                          }`}
                        >
                          Select Stage
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 flex-1 bg-slate-100/40 p-4 rounded-[40px] border border-slate-200/40 min-h-[500px] overflow-y-auto max-h-[calc(100vh-450px)] scrollbar-hide hover:bg-slate-100/60 transition-colors duration-500">
                    {filteredApplicants
                      .filter(
                        (a) =>
                          a.current_stage_id === stage.id &&
                          a.status !== "REJECTED",
                      )
                      .map((app: any) => (
                        <div
                          key={app.application_id}
                          className="relative group/card"
                        >
                          <motion.div
                            layoutId={app.application_id.toString()}
                            onClick={() => setSelectedApp(app)}
                            className={`group bg-white p-6 rounded-[28px] border transition-all duration-500 cursor-pointer relative overflow-hidden ${
                              selectedApps.includes(app.application_id)
                                ? "border-blue-600 ring-4 ring-blue-500/10 shadow-2xl translate-y-[-4px]"
                                : "border-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-2xl hover:shadow-slate-200/50 hover:border-blue-100 hover:translate-y-[-4px]"
                            }`}
                          >
                            {showBulkPanel && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSelect(app.application_id);
                                }}
                                className={`absolute top-4 left-4 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                                  selectedApps.includes(app.application_id)
                                    ? "bg-blue-600 border-blue-600 text-white shadow-lg scale-110"
                                    : "bg-white/90 border-slate-200 text-transparent hover:border-blue-400 hover:scale-110"
                                }`}
                              >
                                <Check size={12} strokeWidth={4} />
                              </button>
                            )}

                            <div className="flex items-center gap-4">
                              <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-lg font-black text-blue-600 overflow-hidden shadow-inner shrink-0 group-hover:scale-105 transition-transform duration-500">
                                {app.profile_photo_url ? (
                                  <img
                                    src={app.profile_photo_url}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  app.full_name[0]
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                  <h4 className="text-[13px] font-black text-slate-900 tracking-tight leading-none uppercase truncate mr-2">
                                    {app.full_name}
                                  </h4>
                                  <div
                                    className={`px-2 py-1 rounded-lg shrink-0 flex items-center gap-1 shadow-sm ${app.talent_score >= 80 ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-blue-50 text-blue-600 border border-blue-100"}`}
                                  >
                                    <span className="text-[10px] font-black tracking-tighter">
                                      {Math.round(app.talent_score || 0)}
                                    </span>
                                    <span className="text-[7px] font-black uppercase opacity-60">
                                      Pts
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest truncate">
                                    {app.email}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="mt-6 flex items-center justify-between border-t border-slate-50 pt-5">
                              <div className="flex gap-4">
                                <div className="flex flex-col">
                                  <span className="text-[8px] font-black text-slate-300 uppercase leading-none mb-1.5">
                                    Tech Score
                                  </span>
                                  <span
                                    className={`text-xs font-black ${app.latest_test_score >= 60 ? "text-emerald-600" : "text-slate-600"}`}
                                  >
                                    {app.latest_test_score !== null
                                      ? `${app.latest_test_score}%`
                                      : "—"}
                                  </span>
                                </div>
                                <div className="w-px h-6 bg-slate-100" />
                                <div className="flex flex-col">
                                  <span className="text-[8px] font-black text-slate-300 uppercase leading-none mb-1.5">
                                    Cognitive
                                  </span>
                                  <span className="text-xs font-black text-indigo-600">
                                    {app.psychometric_score !== null
                                      ? `${Math.round(app.psychometric_score)}%`
                                      : "—"}
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {sIdx < stages.length - 1 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      moveCandidate(
                                        app.application_id,
                                        stages[sIdx + 1].id,
                                        "MOVED",
                                      );
                                    }}
                                    className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm hover:shadow-blue-500/20 active:scale-95"
                                    title="Advance to next stage"
                                  >
                                    <ArrowRight size={14} strokeWidth={3} />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveCandidate(
                                      app.application_id,
                                      stage.id,
                                      "REJECTED",
                                    );
                                  }}
                                  className="w-9 h-9 bg-red-50 text-red-400 rounded-xl flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shadow-sm hover:shadow-red-500/20 active:scale-95"
                                  title="Reject candidate"
                                >
                                  <XCircle size={14} strokeWidth={2.5} />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        </div>
                      ))}

                    {applicants.filter(
                      (a) =>
                        a.current_stage_id === stage.id &&
                        a.status !== "REJECTED",
                    ).length === 0 && (
                      <div className="py-20 text-center border-2 border-dashed border-slate-200/50 rounded-[40px] group-hover/column:bg-white transition-colors">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-200 mx-auto mb-4 shadow-sm group-hover/column:text-slate-300">
                          <Users size={24} />
                        </div>
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] group-hover/column:text-slate-400">
                          Empty Stage
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Rejected Column - Professional Redesign */}
              <div className="w-[340px] shrink-0 flex flex-col opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500 group/column-rejected">
                <div className="flex items-center justify-between mb-6 px-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-[14px] bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shadow-sm group-hover/column-rejected:bg-red-600 group-hover/column-rejected:text-white transition-all duration-500">
                      <XCircle size={18} />
                    </div>
                    <div>
                      <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em]">
                        Archived Profiles
                      </h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        {
                          applicants.filter((a) => a.status === "REJECTED")
                            .length
                        }{" "}
                        Rejected
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 flex-1 bg-red-50/20 p-4 rounded-[40px] border border-red-100/30 max-h-[calc(100vh-450px)] overflow-y-auto scrollbar-hide">
                  {filteredApplicants
                    .filter((a) => a.status === "REJECTED")
                    .map((app) => (
                      <div
                        key={app.application_id}
                        className="bg-white p-4 rounded-[22px] border border-slate-100 shadow-sm hover:shadow-xl hover:border-red-100 transition-all duration-300 cursor-pointer group/rejected-card"
                        onClick={() => setSelectedApp(app)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center font-black text-[11px] text-slate-400 group-hover/rejected-card:bg-red-50 group-hover/rejected-card:text-red-400 transition-colors">
                            {app.profile_photo_url ? (
                              <img
                                src={app.profile_photo_url}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              app.full_name[0]
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-[11px] font-black text-slate-900 uppercase truncate group-hover/rejected-card:text-red-600 transition-colors">
                              {app.full_name}
                            </h4>
                            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest truncate">
                              {app.email}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  {applicants.filter((a) => a.status === "REJECTED").length ===
                    0 && (
                    <div className="py-20 text-center border-2 border-dashed border-red-100/50 rounded-[40px]">
                      <p className="text-[10px] font-black text-red-200 uppercase tracking-[0.2em]">
                        Clean Archive
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {selectedApp && (
          <ApplicationDetailModal
            application={selectedApp}
            stages={stages}
            onMove={moveCandidate}
            onClose={() => setSelectedApp(null)}
            isClosed={job?.status === 'CLOSED'}
          />
        )}

        {showTestScheduler && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTestScheduler(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl p-8"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                    Schedule Assessment
                  </h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                    Setup automated test for selected stage
                  </p>
                </div>
                <button
                  onClick={() => setShowTestScheduler(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-all"
                >
                  <XCircle size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Scheduled Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={testConfig.scheduledAt}
                    onChange={(e) =>
                      setTestConfig({
                        ...testConfig,
                        scheduledAt: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Duration (Mins)
                    </label>
                    <input
                      type="number"
                      value={testConfig.durationMinutes}
                      onChange={(e) =>
                        setTestConfig({
                          ...testConfig,
                          durationMinutes: Number(e.target.value),
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Cutoff Score (%)
                    </label>
                    <input
                      type="number"
                      value={testConfig.cutoffScore}
                      onChange={(e) =>
                        setTestConfig({
                          ...testConfig,
                          cutoffScore: Number(e.target.value),
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                    />
                  </div>
                </div>

                <button
                  onClick={scheduleTest}
                  className="w-full py-5 bg-blue-600 text-white rounded-[20px] font-black uppercase text-xs tracking-widest shadow-2xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2 mt-4"
                >
                  <Zap size={18} /> Deploy Assessment
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {feedbackConfig && (
          <FeedbackConfirmModal
            isOpen={feedbackConfig.isOpen}
            onClose={() => setFeedbackConfig(null)}
            candidateName={feedbackConfig.candidateName}
            jobTitle={feedbackConfig.jobTitle}
            actionType={feedbackConfig.actionType}
            onConfirm={(feedbackText) => {
              moveCandidate(feedbackConfig.appId, feedbackConfig.nextStageId, feedbackConfig.actionType, feedbackText);
            }}
            isSubmitting={isSubmittingFeedback}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ApplicationDetailModal({
  application,
  stages,
  onClose,
  onMove,
  isClosed,
}: {
  application: any;
  stages: any[];
  onClose: () => void;
  onMove?: (appId: number, nextStageId: number, action: string) => void;
  isClosed?: boolean;
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [fullDetails, setFullDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const [interviewSchedule, setInterviewSchedule] = useState<any>(null);
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);

  const [formScheduledAt, setFormScheduledAt] = useState("");
  const [formType, setFormType] = useState("INTERVIEW_ONLINE");
  const [formNotes, setFormNotes] = useState("");

  const studentId = application.student_id || application.id;

  useEffect(() => {
    if (studentId) {
      fetchFullDetails();
    }
  }, [studentId]);

  useEffect(() => {
    if (application?.application_id) {
      fetchInterviewSchedule();
    }
  }, [application?.application_id]);

  const fetchInterviewSchedule = async () => {
    try {
      const res = await api.get(
        `/interviews/application/${application.application_id}`,
      );
      if (res.data.success && res.data.data.length > 0) {
        setInterviewSchedule(res.data.data[0]);
        setFormScheduledAt(
          formatToLocalDatetimeString(res.data.data[0].scheduled_at)
        );
        setFormType(res.data.data[0].type || "INTERVIEW_ONLINE");
        setFormNotes(res.data.data[0].notes || "");
        setEditingSchedule(false);
      } else {
        setInterviewSchedule(null);
        setFormScheduledAt("");
        setFormType("INTERVIEW_ONLINE");
        setFormNotes("");
        setEditingSchedule(false);
      }
    } catch (e) {
      console.error("Error fetching interview schedule:", e);
    }
  };

  const handleSaveInterviewSchedule = async () => {
    if (isClosed) {
      toast.error("This job post has ended. The dashboard is in read-only history mode.");
      return;
    }
    if (!formScheduledAt) {
      toast.error("Please select a date and time for the interview");
      return;
    }
    try {
      setSavingSchedule(true);
      const res = await api.post("/jobs/applications/schedule-interview", {
        applicationId: application.application_id,
        stageId: application.current_stage_id,
        interviewType: formType,
        locationOrLink:
          formType === "INTERVIEW_ONLINE"
            ? "WebRTC Live Call Room"
            : "In-Person Office Visit",
        scheduledAt: new Date(formScheduledAt).toISOString(),
        notes: formNotes,
      });
      if (res.data.success) {
        toast.success(
          editingSchedule
            ? "Interview rescheduled successfully!"
            : "Interview scheduled successfully!",
        );
        fetchInterviewSchedule();
      }
    } catch (e) {
      console.error("Error setting interview schedule:", e);
      toast.error("Failed to commit interview schedule");
    } finally {
      setSavingSchedule(false);
    }
  };

  const fetchFullDetails = async () => {
    if (!studentId) return;
    try {
      setLoading(true);
      const { data } = await api.get(`/jobs/student-full-details/${studentId}`);
      if (data.success) {
        setFullDetails(data.data);
      }
    } catch (e) {
      console.error("Failed to load candidate profile details:", e);
      toast.error("Failed to load candidate profile details");
    } finally {
      setLoading(false);
    }
  };

  const currentStageIdx = stages.findIndex(
    (s) => s.id === application.current_stage_id,
  );
  const radarData = useMemo(() => {
    try {
      const traits =
        typeof application.psychometric_traits === "string"
          ? JSON.parse(application.psychometric_traits)
          : application.psychometric_traits || {};
      return Object.entries(traits).map(([trait, value]) => ({
        trait: trait.replace(/_/g, " "),
        value: value as number,
        fullMark: 100,
      }));
    } catch (e) {
      return [];
    }
  }, [application]);

  const tabs = [
    { id: "overview", label: "Overview", icon: Info },
    { id: "performance", label: "Performance", icon: ListChecks },
    { id: "mock-interviews", label: "Mocks & Feedback", icon: MessageSquare },
    { id: "profile", label: "Full Profile", icon: GraduationCap },
    { id: "psychometric", label: "Psychometric", icon: ShieldAlert },
    { id: "history", label: "Hiring History", icon: History },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/70 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-6xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col h-[90vh]"
      >
        {/* Modal Header */}
        <div className="bg-slate-50/50 border-b border-slate-100 p-8 shrink-0">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-3xl bg-white border border-slate-200 p-1 shadow-xl relative overflow-hidden group">
                {application.profile_photo_url ? (
                  <img
                    src={application.profile_photo_url}
                    className="w-full h-full object-cover rounded-2xl group-hover:scale-110 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-black text-blue-600 bg-blue-50 rounded-2xl">
                    {application.full_name[0]}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">
                    {application.full_name}
                  </h2>
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                      application.status === "REJECTED"
                        ? "bg-red-50 text-red-600 border-red-100"
                        : application.status === "SELECTED"
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                          : "bg-blue-50 text-blue-600 border-blue-100"
                    }`}
                  >
                    {application.status}
                  </span>
                </div>
                <div className="flex items-center gap-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  <span className="flex items-center gap-2">
                    <Mail size={14} className="text-slate-300" />{" "}
                    {application.email}
                  </span>
                  <span className="flex items-center gap-2">
                    <Clock size={14} className="text-slate-300" /> Applied{" "}
                    {new Date(application.applied_at).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-2 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                    {stages[currentStageIdx]?.stage_name || "Processing"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right mr-6 pr-6 border-r border-slate-200">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Talent Score
                </p>
                <div className="flex items-baseline gap-1">
                  <span
                    className={`text-4xl font-black ${application.talent_score >= 80 ? "text-emerald-600" : "text-blue-600"}`}
                  >
                    {Math.round(application.talent_score || 0)}
                  </span>
                  <span className="text-xs font-black text-slate-300">
                    /100
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-3 bg-white border border-slate-100 text-slate-400 hover:text-slate-600 rounded-2xl shadow-sm transition-all hover:scale-110 active:scale-95"
              >
                <XCircle size={24} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 mt-10 overflow-x-auto scrollbar-hide pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                  activeTab === tab.id
                    ? "bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-900/20"
                    : "bg-white border-slate-100 text-slate-400 hover:border-slate-300"
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-10 bg-white">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">
                Assembling full candidate intelligence...
              </p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {activeTab === "overview" && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2 space-y-10">
                      <section>
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                            Profile Insight
                          </h3>
                        </div>
                        <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100">
                          <p className="text-sm text-slate-600 leading-relaxed font-medium italic">
                            "
                            {fullDetails?.profile?.bio ||
                              "Candidate has not provided a bio summary."}
                            "
                          </p>
                        </div>
                      </section>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-xl hover:border-blue-100 transition-all">
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                              <Star size={20} />
                            </div>
                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">
                              Top 5%
                            </span>
                          </div>
                          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            Skill Proficiency
                          </h4>
                          <p className="text-2xl font-black text-slate-900">
                            Expert
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                            Based on test & mock data
                          </p>
                        </div>
                        <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-xl hover:border-purple-100 transition-all">
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                              <Briefcase size={20} />
                            </div>
                            <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded-lg">
                              Ready
                            </span>
                          </div>
                          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            Employment Status
                          </h4>
                          <p className="text-2xl font-black text-slate-900">
                            {fullDetails?.profile?.experience_type || "FRESHER"}
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                            Immediate Joiner
                          </p>
                        </div>
                      </div>

                      <section>
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                              Key Competencies
                            </h3>
                          </div>
                          <button className="text-[9px] font-black text-blue-600 uppercase tracking-widest">
                            View Skill Cloud
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            let skills = [];
                            try {
                              const skillsData =
                                fullDetails?.profile?.skills_json;
                              if (Array.isArray(skillsData)) {
                                skills = skillsData;
                              } else if (typeof skillsData === "string") {
                                if (
                                  skillsData.startsWith("[") &&
                                  skillsData.endsWith("]")
                                ) {
                                  skills = JSON.parse(skillsData);
                                } else {
                                  skills = skillsData
                                    .split(",")
                                    .filter(Boolean);
                                }
                              }
                            } catch (e) {
                              console.error("Error parsing skills:", e);
                            }

                            return skills.length > 0 ? (
                              skills.map((skill: any, idx: number) => {
                                const skillName =
                                  typeof skill === "string"
                                    ? skill
                                    : skill.name || "";
                                if (!skillName) return null;
                                return (
                                  <span
                                    key={idx}
                                    className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-100 hover:border-blue-200 transition-colors"
                                  >
                                    {skillName.trim()}
                                  </span>
                                );
                              })
                            ) : (
                              <p className="text-[10px] font-bold text-slate-400 italic">
                                No specific skills listed
                              </p>
                            );
                          })()}
                        </div>
                      </section>
                    </div>

                    <div className="space-y-8">
                      <div className="bg-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
                        <div className="relative z-10">
                          <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-6">
                            AI Evaluation
                          </h4>
                          <div className="space-y-6">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-slate-400 uppercase">
                                Coding Quality
                              </span>
                              <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500"
                                  style={{ width: "85%" }}
                                ></div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-slate-400 uppercase">
                                Communication
                              </span>
                              <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500"
                                  style={{ width: "92%" }}
                                ></div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-slate-400 uppercase">
                                Problem Solving
                              </span>
                              <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-purple-500"
                                  style={{ width: "78%" }}
                                ></div>
                              </div>
                            </div>
                          </div>
                          <div className="mt-8 pt-8 border-t border-white/5">
                            <p className="text-[10px] font-medium text-slate-400 italic leading-relaxed">
                              "Elite matching score. This candidate aligns with
                              94% of your role requirements."
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-8 bg-white border border-slate-100 rounded-[32px] shadow-sm">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">
                          Contact Channels
                        </h4>
                        <div className="space-y-4">
                          <a
                            href={`mailto:${application.email}`}
                            className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl hover:bg-blue-50 transition-colors group"
                          >
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors shadow-sm">
                              <Globe size={18} />
                            </div>
                            <div>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                Official Email
                              </p>
                              <p className="text-xs font-black text-slate-900 lowercase">
                                {application.email}
                              </p>
                            </div>
                          </a>
                          {fullDetails?.profile?.social_links_json && (
                            <div className="flex gap-2">
                              <button className="flex-1 flex items-center justify-center gap-2 py-4 bg-slate-50 text-slate-600 rounded-2xl hover:bg-slate-100 transition-all">
                                <Linkedin size={16} />
                              </button>
                              <button className="flex-1 flex items-center justify-center gap-2 py-4 bg-slate-50 text-slate-600 rounded-2xl hover:bg-slate-100 transition-all">
                                <Github size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Live Interview Scheduling Component */}
                      {interviewSchedule && !editingSchedule ? (
                        <div className="p-8 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-[32px] border border-slate-800 shadow-xl shadow-indigo-950/10 space-y-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                              <Video size={16} />
                            </div>
                            <h4 className="text-[10px] font-black tracking-[0.2em] uppercase text-indigo-400">
                              Security Video Interview
                            </h4>
                          </div>
                          <div className="space-y-4">
                            <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                              <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">
                                Scheduled Date/Time
                              </p>
                              <p className="text-xs font-black mt-1 text-slate-150">
                                {parseLocalDatetime(interviewSchedule.scheduled_at).toLocaleString([], {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })}
                              </p>
                            </div>
                            <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                              <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">
                                Evaluation Link
                              </p>
                              <p className="text-xs font-black mt-1 text-slate-150 uppercase tracking-wide">
                                {interviewSchedule.type === "INTERVIEW_ONLINE"
                                  ? "Secured WebRTC Workspace"
                                  : "Offline / In-Person"}
                              </p>
                            </div>
                            {interviewSchedule.notes && (
                              <p className="text-[11px] leading-relaxed italic text-indigo-205 border-l border-indigo-400/40 pl-3">
                                "{interviewSchedule.notes}"
                              </p>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                toast.success("Spinning up secure candidate call channels...");
                                navigate(`/interview/live/${interviewSchedule.id}`);
                              }}
                              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition-all text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-900/40 flex items-center justify-center gap-2 border border-indigo-500"
                            >
                              Start Live Session <Video size={14} className="animate-pulse" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingSchedule(true)}
                              className="w-full text-center text-[9px] font-black uppercase text-slate-400 hover:text-slate-200 tracking-wider pt-2"
                            >
                              Modify / Reschedule
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 bg-white border border-slate-150 rounded-[32px] shadow-sm space-y-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                              <Calendar size={16} />
                            </div>
                            <h4 className="text-[10px] font-black tracking-[0.2em] uppercase text-slate-800">
                              {editingSchedule ? "Edit Schedule Slot" : "Schedule Live Call"}
                            </h4>
                          </div>
                          <div className="space-y-4 font-sans">
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">
                                Proposed Match Time
                              </label>
                              <input
                                type="datetime-local"
                                value={formScheduledAt}
                                onChange={(e) => setFormScheduledAt(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-xs font-bold outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all text-slate-800"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">
                                Interview Format
                              </label>
                              <select
                                value={formType}
                                onChange={(e) => setFormType(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-xs font-bold outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all text-slate-800"
                              >
                                <option value="INTERVIEW_ONLINE">Online Video Assessment</option>
                                <option value="INTERVIEW_OFFLINE">In-Person Offline Visit</option>
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">
                                Notes to Candidate
                              </label>
                              <textarea
                                rows={2}
                                placeholder="e.g. Bring copy of resume & wear formal attire"
                                value={formNotes}
                                onChange={(e) => setFormNotes(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all text-slate-800"
                              />
                            </div>
                            <div className="flex gap-2">
                              {editingSchedule && (
                                <button
                                  type="button"
                                  onClick={() => setEditingSchedule(false)}
                                  className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all"
                                >
                                  Cancel
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={handleSaveInterviewSchedule}
                                disabled={savingSchedule}
                                className="flex-[2] py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase text-[9px] tracking-widest transition-all shadow-lg shadow-indigo-600/15"
                              >
                                {savingSchedule ? "Processing..." : "Confirm Slot"}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "performance" && (
                  <div className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="p-8 bg-blue-600 rounded-[32px] text-white">
                        <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-2">
                          Latest Test Score
                        </p>
                        <div className="flex items-baseline gap-2">
                          <h4 className="text-4xl font-black">
                            {application.latest_test_score || 0}%
                          </h4>
                          <span className="text-[10px] font-black text-blue-200 uppercase">
                            Final Grade
                          </span>
                        </div>
                      </div>
                      <div className="p-8 bg-white border border-slate-100 rounded-[32px] shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                          Integrity Status
                        </p>
                        {(() => {
                          const violations = Number(application.latest_test_violations_count ?? application.latest_test_violations ?? 0);
                          return (
                            <>
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-3 h-3 rounded-full ${violations > 0 ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`}
                                />
                                <h4 className="text-xl font-black text-slate-900 uppercase">
                                  {violations > 0 ? "Flagged" : "Clean"}
                                </h4>
                              </div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                {violations} Total Violations
                              </p>
                            </>
                          );
                        })()}
                      </div>
                      <div className="p-8 bg-white border border-slate-100 rounded-[32px] shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                          Test Format
                        </p>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center">
                            <CheckCircle size={20} />
                          </div>
                          <h4 className="text-xl font-black text-slate-900 uppercase">
                            Technical
                          </h4>
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                          Adaptive Logic Enabled
                        </p>
                      </div>
                    </div>

                    <div className="p-10 bg-slate-50 rounded-[40px] border border-slate-100">
                      <div className="flex justify-between items-center mb-10">
                        <div>
                          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                            Question Breakdown
                          </h3>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                            Analysis of student responses
                          </p>
                        </div>
                        <div className="flex gap-4">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-emerald-500" />
                            <span className="text-[9px] font-black text-slate-500 uppercase">
                              Correct
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <span className="text-[9px] font-black text-slate-500 uppercase">
                              Incorrect
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {(() => {
                          try {
                            const answers =
                              typeof application.latest_test_answers ===
                              "string"
                                ? JSON.parse(application.latest_test_answers)
                                : application.latest_test_answers || {};
                            return Object.entries(answers).map(
                              ([qId, ans]: any, i) => (
                                <div
                                  key={qId}
                                  className="flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-100 hover:shadow-md transition-all"
                                >
                                  <div className="flex items-center gap-6">
                                    <span className="text-[10px] font-black text-slate-300 w-8">
                                      Q{i + 1}
                                    </span>
                                    <div>
                                      <p className="text-xs font-bold text-slate-900 mb-1">
                                        Question Reference ID: {qId}
                                      </p>
                                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        Candidate Answer: {ans.selected}
                                      </p>
                                    </div>
                                  </div>
                                  <div
                                    className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${ans.isCorrect ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}
                                  >
                                    {ans.isCorrect ? "Accurate" : "Failed"}
                                  </div>
                                </div>
                              ),
                            );
                          } catch (e) {
                            return (
                              <div className="py-20 text-center">
                                <AlertCircle
                                  size={40}
                                  className="mx-auto text-slate-200 mb-4"
                                />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                  Detailed response data unavailable for this
                                  attempt.
                                </p>
                              </div>
                            );
                          }
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "mock-interviews" && (
                  <div className="space-y-10">
                    <div className="flex justify-between items-end">
                      <div>
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                          Mock Interview History
                        </h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                          Previous AI-led technical assessments and feedback
                        </p>
                      </div>
                      <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                        <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1">
                          Average Mock Score
                        </p>
                        <p className="text-xl font-black text-emerald-700">
                          {(
                            fullDetails?.mockInterviews?.reduce(
                              (acc: number, m: any) => acc + m.score,
                              0,
                            ) / (fullDetails?.mockInterviews?.length || 1)
                          ).toFixed(1)}
                          /10
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                      {fullDetails?.mockInterviews?.length > 0 ? (
                        fullDetails.mockInterviews.map(
                          (mock: any, i: number) => (
                            <div
                              key={i}
                              className="p-8 bg-slate-50 rounded-[32px] border border-slate-100 hover:shadow-xl transition-all group"
                            >
                              <div className="flex justify-between items-start mb-8">
                                <div className="flex items-center gap-6">
                                  <div className="w-14 h-14 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition-transform">
                                    <Video size={24} />
                                  </div>
                                  <div>
                                    <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                                      Technical Session #
                                      {fullDetails.mockInterviews.length - i}
                                    </h4>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                      {new Date(
                                        mock.created_at,
                                      ).toLocaleDateString()}{" "}
                                      •{" "}
                                      {new Date(
                                        mock.created_at,
                                      ).toLocaleTimeString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-3xl font-black text-blue-600">
                                    {mock.score}
                                    <span className="text-xs text-slate-300">
                                      /10
                                    </span>
                                  </div>
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                    Overall Performance
                                  </p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                                {[
                                  {
                                    label: "Comm.",
                                    val: mock.communication_score,
                                    color: "blue",
                                  },
                                  {
                                    label: "Conf.",
                                    val: mock.confidence_score,
                                    color: "purple",
                                  },
                                  {
                                    label: "Expl.",
                                    val: mock.explanation_score,
                                    color: "emerald",
                                  },
                                  {
                                    label: "Pres.",
                                    val: mock.presentation_score,
                                    color: "orange",
                                  },
                                  {
                                    label: "Know.",
                                    val: mock.knowledge_score,
                                    color: "indigo",
                                  },
                                ].map((mstat, j) => (
                                  <div
                                    key={j}
                                    className="bg-white p-3 rounded-2xl border border-slate-100 text-center"
                                  >
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                      {mstat.label}
                                    </p>
                                    <p
                                      className={`text-sm font-black text-${mstat.color}-600`}
                                    >
                                      {mstat.val}/10
                                    </p>
                                  </div>
                                ))}
                              </div>

                              <div className="space-y-6">
                                <div>
                                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Sparkles
                                      size={14}
                                      className="text-blue-500"
                                    />{" "}
                                    AI Feedback
                                  </h5>
                                  <div className="p-5 bg-white border border-slate-100 rounded-2xl text-xs text-slate-600 leading-relaxed font-medium">
                                    {mock.feedback ||
                                      "No qualitative feedback available for this session."}
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div>
                                    <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3">
                                      Core Strengths
                                    </h5>
                                    <div className="flex flex-wrap gap-1.5">
                                      {(() => {
                                        try {
                                          const s =
                                            typeof mock.strengths_json ===
                                            "string"
                                              ? JSON.parse(mock.strengths_json)
                                              : mock.strengths_json || [];
                                          return s.map(
                                            (str: string, k: number) => (
                                              <span
                                                key={k}
                                                className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-emerald-100"
                                              >
                                                {str}
                                              </span>
                                            ),
                                          );
                                        } catch (e) {
                                          return (
                                            <span className="text-[9px] text-slate-400 uppercase font-bold italic">
                                              N/A
                                            </span>
                                          );
                                        }
                                      })()}
                                    </div>
                                  </div>
                                  <div>
                                    <h5 className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-3">
                                      Growth Areas
                                    </h5>
                                    <div className="flex flex-wrap gap-1.5">
                                      {(() => {
                                        try {
                                          const w =
                                            typeof mock.weaknesses_json ===
                                            "string"
                                              ? JSON.parse(mock.weaknesses_json)
                                              : mock.weaknesses_json || [];
                                          return w.map(
                                            (weak: string, k: number) => (
                                              <span
                                                key={k}
                                                className="px-2.5 py-1 bg-red-50 text-red-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-red-100"
                                              >
                                                {weak}
                                              </span>
                                            ),
                                          );
                                        } catch (e) {
                                          return (
                                            <span className="text-[9px] text-slate-400 uppercase font-bold italic">
                                              N/A
                                            </span>
                                          );
                                        }
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ),
                        )
                      ) : (
                        <div className="py-20 text-center bg-slate-50 rounded-[40px] border border-slate-100 border-dashed">
                          <Video
                            size={48}
                            className="mx-auto text-slate-200 mb-6"
                          />
                          <h4 className="text-xl font-black text-slate-400 uppercase tracking-tight">
                            No mock interview history
                          </h4>
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-2">
                            Candidate hasn't completed any AI mock sessions yet.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "profile" && (
                  <div className="space-y-12">
                    {/* Education */}
                    <section>
                      <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                          <GraduationCap size={20} />
                        </div>
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                          Academic Background
                        </h3>
                      </div>
                      <div className="space-y-4">
                        {fullDetails?.education?.length > 0 ? (
                          fullDetails.education.map((edu: any, i: number) => (
                            <div
                              key={i}
                              className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex justify-between items-start"
                            >
                              <div>
                                <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                                  {edu.institution}
                                </h4>
                                <p className="text-[11px] font-bold text-slate-600 mt-1 uppercase tracking-widest">
                                  {edu.degree} in {edu.field_of_study}
                                </p>
                                <p className="text-[10px] font-medium text-slate-400 mt-2">
                                  {new Date(edu.start_date).getFullYear()} —{" "}
                                  {edu.end_date
                                    ? new Date(edu.end_date).getFullYear()
                                    : "Present"}
                                </p>
                              </div>
                              <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 text-center">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                                  Grade/GPA
                                </p>
                                <p className="text-xs font-black text-blue-600">
                                  {edu.grade || "N/A"}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-1">
                            No education records found.
                          </p>
                        )}
                      </div>
                    </section>

                    {/* Experience */}
                    <section>
                      <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shadow-sm">
                          <Briefcase size={20} />
                        </div>
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                          Professional Experience
                        </h3>
                      </div>
                      <div className="space-y-4">
                        {fullDetails?.experience?.length > 0 ? (
                          fullDetails.experience.map((exp: any, i: number) => (
                            <div
                              key={i}
                              className="p-6 bg-slate-50 rounded-3xl border border-slate-100"
                            >
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                                    {exp.role}
                                  </h4>
                                  <p className="text-[11px] font-bold text-blue-600 mt-1 uppercase tracking-widest">
                                    {exp.company}
                                  </p>
                                </div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                  {new Date(
                                    exp.start_date,
                                  ).toLocaleDateString()}{" "}
                                  —{" "}
                                  {exp.end_date
                                    ? new Date(
                                        exp.end_date,
                                      ).toLocaleDateString()
                                    : "Present"}
                                </p>
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                {exp.description}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-1">
                            No professional experience records.
                          </p>
                        )}
                      </div>
                    </section>

                    {/* Projects */}
                    <section>
                      <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
                          <FileText size={20} />
                        </div>
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                          Technical Projects
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {fullDetails?.projects?.length > 0 ? (
                          fullDetails.projects.map((proj: any, i: number) => (
                            <div
                              key={i}
                              className="p-8 bg-white border border-slate-100 rounded-[32px] shadow-sm hover:shadow-xl hover:border-emerald-100 transition-all group"
                            >
                              <div className="flex justify-between items-start mb-4">
                                <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight group-hover:text-emerald-600 transition-colors">
                                  {proj.title}
                                </h4>
                                {proj.link && (
                                  <a
                                    href={proj.link}
                                    target="_blank"
                                    className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:text-blue-600 transition-colors"
                                  >
                                    <ExternalLink size={14} />
                                  </a>
                                )}
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed font-medium mb-6 line-clamp-3">
                                {proj.description}
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {proj.tech_stack
                                  ?.split(",")
                                  .map((tech: string, k: number) => (
                                    <span
                                      key={k}
                                      className="px-2 py-0.5 bg-slate-50 text-slate-400 rounded-md text-[8px] font-black uppercase tracking-widest border border-slate-100"
                                    >
                                      {tech.trim()}
                                    </span>
                                  ))}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-1">
                            No technical projects showcased.
                          </p>
                        )}
                      </div>
                    </section>
                  </div>
                )}

                {activeTab === "psychometric" && (
                  <div className="space-y-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                      <div className="bg-slate-50 p-10 rounded-[40px] border border-slate-100 min-h-[500px] flex flex-col">
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-10">
                          Trait Analysis
                        </h3>
                        <div className="flex-1 w-full min-h-[320px]">
                          <ResponsiveContainer
                            width="100%"
                            height="100%"
                            minWidth={0}
                            minHeight={0}
                          >
                            <RadarChart
                              cx="50%"
                              cy="50%"
                              outerRadius="80%"
                              data={radarData}
                            >
                              <PolarGrid stroke="#cbd5e1" />
                              <PolarAngleAxis
                                dataKey="trait"
                                tick={{
                                  fill: "#64748b",
                                  fontSize: 8,
                                  fontWeight: 900,
                                }}
                              />
                              <Radar
                                name="Candidate"
                                dataKey="value"
                                stroke="#2563eb"
                                strokeWidth={3}
                                fill="#2563eb"
                                fillOpacity={0.2}
                              />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="mt-8 text-center">
                          <div className="inline-block px-6 py-2 bg-white border border-slate-200 rounded-2xl">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                              Personality Archetype
                            </p>
                            <p className="text-xl font-black text-blue-600 uppercase tracking-tight">
                              {application.psychometric_personality ||
                                "Analyzers"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                          Detailed Traits
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                          {radarData.map((trait: any, i: number) => (
                            <div
                              key={i}
                              className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm"
                            >
                              <div className="flex justify-between items-center mb-3">
                                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                                  {trait.trait}
                                </h4>
                                <span className="text-xs font-black text-blue-600">
                                  {trait.value}%
                                </span>
                              </div>
                              <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${trait.value}%` }}
                                  className={`h-full ${trait.value >= 70 ? "bg-emerald-500" : trait.value >= 40 ? "bg-blue-500" : "bg-orange-500"}`}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="p-6 bg-blue-50 border border-blue-100 rounded-3xl">
                          <h4 className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Info size={14} /> Cultural Alignment
                          </h4>
                          <p className="text-xs text-blue-600 leading-relaxed font-medium italic">
                            "This profile suggests high adaptability and strong
                            teamwork skills, making them a great fit for
                            collaborative engineering environments."
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "history" && (
                  <div className="space-y-10">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                        Application Journey
                      </h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                        Timeline of all actions and stage transitions
                      </p>
                    </div>
                    <div className="bg-slate-50 p-10 rounded-[40px] border border-slate-100">
                      <HiringTimeline
                        applicationId={application.application_id}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
          <div className="flex gap-4">
            {application.resume_url && (
              <a
                href={application.resume_url}
                target="_blank"
                className="flex items-center gap-2 px-6 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm"
              >
                <FileText size={18} /> View Original Resume
              </a>
            )}
            <button className="flex items-center gap-2 px-6 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm">
              <ShieldAlert size={18} /> Audit Report
            </button>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() =>
                onMove?.(
                  application.application_id,
                  application.current_stage_id,
                  "REJECTED",
                )
              }
              className="px-10 py-4 bg-white border border-red-100 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all active:scale-95 shadow-sm"
            >
              Reject Candidate
            </button>
            {currentStageIdx < stages.length - 1 && (
              <button
                onClick={() =>
                  onMove?.(
                    application.application_id,
                    stages[currentStageIdx + 1].id,
                    "MOVED",
                  )
                }
                className="px-12 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2"
              >
                Advance to {stages[currentStageIdx + 1].stage_name}{" "}
                <ArrowRight size={18} strokeWidth={3} />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
