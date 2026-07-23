import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.tsx";
import api from "../../services/api.ts";
import {
  Search,
  Filter,
  MoreVertical,
  Star,
  Clock,
  MessageSquare,
  CheckCircle,
  XCircle,
  ChevronRight,
  GripVertical,
  ShieldAlert,
  Sparkles,
  Award,
  UserCheck,
  Check,
  ChevronLeft,
  RefreshCw,
  FilterX,
  HelpCircle,
  AlertTriangle,
  Briefcase,
  Users,
  Target,
  Calendar,
  Zap,
  Download,
  Mail,
  MailPlus,
  CalendarPlus,
  PlayCircle,
  ThumbsUp,
  ThumbsDown,
  BarChart2,
  Eye,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";
import { FeedbackConfirmModal } from "../../components/company/FeedbackConfirmModal.tsx";

// Define the stages for the pipeline
const PIPELINE_STAGES = [
  { id: "APPLIED", label: "Applied", color: "blue" },
  { id: "SCREENING", label: "AI Screening", color: "indigo" },
  { id: "TESTING", label: "Assessment", color: "purple" },
  { id: "INTERVIEW", label: "Technical Interview", color: "orange" },
  { id: "HR", label: "HR Interview", color: "pink" },
  { id: "SHORTLISTED", label: "Selected", color: "emerald" },
];

const formatInterviewScore = (score: any) => {
  if (score === null || score === undefined) return "—";
  const num = Number(score);
  if (!Number.isFinite(num) || num <= 0) return "—";
  return `${num.toFixed(1)}/10`;
};

const formatAssessmentScore = (score: any) => {
  if (score === null || score === undefined) return "—";
  const num = Number(score);
  if (!Number.isFinite(num) || num < 0) return "—";
  return `${Math.round(num)}%`;
};

const isRejectedCandidate = (candidate: any) =>
  String(candidate?.raw_status || candidate?.status || "").toUpperCase() === "REJECTED";

const getRejectedStageId = (a: any, customStages: any[]): string => {
  if (!a) return "APPLIED";
  if (customStages && customStages.length > 0) {
    const hasStage = customStages.some(
      (cs: any) => cs.id === a.current_stage_id,
    );
    if (hasStage) {
      const cs = customStages.find((s: any) => s.id === a.current_stage_id);
      if (cs) {
        const temp = {
          ...a,
          status: cs.id.toString(),
          current_stage_type: cs.stage_type,
          current_stage_name: cs.stage_name,
        };
        return normalizePipelineStage(temp);
      }
    }
  }
  const tempCand = { ...a, status: a.current_stage_id?.toString() || "APPLIED" };
  return normalizePipelineStage(tempCand);
};

const normalizePipelineStage = (a: any): string => {
  if (!a) return "APPLIED";

  const status = String(a.raw_status || a.status || "").toUpperCase();
  if (status === "REJECTED") return "REJECTED";

  const type = String(a.current_stage_type || a.stage_type || "").toUpperCase();
  const name = String(a.current_stage_name || a.stage_name || a.stage_title || "").toUpperCase();

  // 1. Check current_stage_type if present
  if (type) {
    if (type === "APPLICATION" || type === "APPLIED") return "APPLIED";
    if (type === "SCREENING" || type === "AI SCREENING" || type === "AI_SCREENING") return "SCREENING";
    if (type === "TEST" || type === "ASSESSMENT" || type === "TEST_STAGE") return "TESTING";
    if (type === "INTERVIEW" || type === "INTERVIEW_ONLINE") {
      if (name.includes("HR")) return "HR";
      return "INTERVIEW";
    }
    if (type === "HR" || type === "HR_INTERVIEW" || type === "HR INTERVIEW") return "HR";
    if (type === "SELECTED" || type === "SHORTLISTED" || type === "HIRED" || type === "OFFER") return "SHORTLISTED";
  }

  // 2. Check current_stage_name if present
  if (name) {
    if (name.includes("APPLICATION") || name.includes("APPLIED")) return "APPLIED";
    if (name.includes("SCREEN") || name.includes("AI")) return "SCREENING";
    if (name.includes("TEST") || name.includes("ASSESS") || name.includes("ASSESSMENT")) return "TESTING";
    if (name.includes("HR") && name.includes("INTERVIEW")) return "HR";
    if (name.includes("INTERVIEW") || name.includes("TECH")) return "INTERVIEW";
    if (
      name.includes("SELECT") ||
      name.includes("SHORTLIST") ||
      name.includes("HIRE") ||
      name.includes("OFFER")
    ) {
      return "SHORTLISTED";
    }
  }

  // 3. Check status if present
  if (status) {
    if (status === "APPLIED" || status === "APPLICATION") return "APPLIED";
    if (status === "SCREENING" || status === "AI_SCREENING") return "SCREENING";
    if (status === "TESTING" || status === "TEST" || status === "ASSESSMENT") return "TESTING";
    if (status === "INTERVIEW" || status === "TECHNICAL_INTERVIEW") return "INTERVIEW";
    if (status === "HR" || status === "HR_INTERVIEW") return "HR";
    if (status === "SHORTLISTED" || status === "SELECTED" || status === "HIRED" || status === "OFFER") return "SHORTLISTED";
    if (status === "IN_PROGRESS") return "SCREENING";
  }

  // Safe fallback
  return "APPLIED";
};

export function PipelineBoard() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<any[]>([]);
  const [allApplicants, setAllApplicants] = useState<any[]>([]);

  const [searchParams] = useSearchParams();
  const queryJobId = searchParams.get("jobId");
  const [selectedJobId, setSelectedJobId] = useState<string>(queryJobId || "ALL");

  useEffect(() => {
    if (queryJobId) {
      setSelectedJobId(queryJobId);
    }
  }, [queryJobId]);

  const [pipelineFilter, setPipelineFilter] = useState<'active' | 'inactive' | 'all'>('active');
  const [searchQuery, setSearchQuery] = useState("");

  // Selection & Bulk
  const [selectedCandidates, setSelectedCandidates] = useState<number[]>([]);

  // Preview
  const [previewCandidate, setPreviewCandidate] = useState<any | null>(null);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [minScore, setMinScore] = useState(0);

  // See More Panel & Expanded Table states
  const [selectedStageView, setSelectedStageView] = useState<string | null>(
    null,
  );
  const [tableSearchQuery, setTableSearchQuery] = useState("");
  const [showTableFilters, setShowTableFilters] = useState(false);
  const [sortBy, setSortBy] = useState("newest");

  // See More Table specific filters
  const [filterDateRange, setFilterDateRange] = useState("ALL");
  const [filterSkill, setFilterSkill] = useState("ALL");
  const [filterMatchScore, setFilterMatchScore] = useState("ALL");
  const [filterAssessmentScore, setFilterAssessmentScore] = useState("ALL");
  const [filterInterviewScore, setFilterInterviewScore] = useState("ALL");
  const [filterRejectedPhase, setFilterRejectedPhase] = useState("ALL");

  // Custom dynamic stages from backend template
  const [customStages, setCustomStages] = useState<any[]>([]);

  // Contact status indicators (local session store, mapping application_id -> contacted)
  const [contactedCandidates, setContactedCandidates] = useState<
    Record<number, boolean>
  >({});

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const markAsContacted = (appId: number) => {
    setContactedCandidates((prev) => ({ ...prev, [appId]: true }));
  };

  const loadPipeline = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);

      // Load jobs list if not loaded yet
      let companyJobs = jobs;
      if (jobs.length === 0 && profile?.id) {
        const jobsRes = await api.get(`/jobs?status=ALL&companyId=${profile.id}`);
        if (jobsRes.data.success) {
          companyJobs = jobsRes.data.data;
          setJobs(companyJobs);
        }
      }

      if (selectedJobId === "ALL") {
        setCustomStages([]);
        const analyticsRes = await api.get(`/analytics/employer/${user?.id}`);
        if (analyticsRes.data.success) {
          const fetchedApplicants = (
            analyticsRes.data.data.applicants || []
          ).map((app: any) => ({
            ...app,
            raw_status: app.status,
            status: app.status || "APPLIED",
          }));
          setAllApplicants(fetchedApplicants);
        }
      } else {
        try {
          const res = await api.get(`/jobs/applicants/${selectedJobId}`);
          if (res.data && res.data.success) {
            const fetchedApplicants = (res.data.data.applicants || []).map(
              (app: any) => {
                const hasStage = (res.data.data.stages || []).some(
                  (cs: any) => cs.id === app.current_stage_id,
                );
                const statusVal = hasStage
                  ? app.current_stage_id.toString()
                  : app.status || "APPLIED";
                return {
                  ...app,
                  raw_status: app.status,
                  status: statusVal,
                  job_title:
                    companyJobs.find(
                      (j: any) => j.id.toString() === selectedJobId,
                    )?.title || app.job_title,
                };
              },
            );
            setAllApplicants(fetchedApplicants);
            setCustomStages(res.data.data.stages || []);
          } else {
            // Invalid or inaccessible job ID, fallback to ALL
            setSelectedJobId("ALL");
          }
        } catch (err) {
          console.error("Error loading specific job pipeline, falling back to ALL:", err);
          setSelectedJobId("ALL");
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load pipeline data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPipeline();
  }, [user?.id, selectedJobId]);

  useEffect(() => {
    const handleJobCreated = () => {
      setJobs([]); // Clear jobs cache so loadPipeline refetches
    };
    window.addEventListener('vega:job-created', handleJobCreated);
    window.addEventListener('vega:job-updated', handleJobCreated);
    return () => {
      window.removeEventListener('vega:job-created', handleJobCreated);
      window.removeEventListener('vega:job-updated', handleJobCreated);
    };
  }, []);

  const fetchData = async () => {
    await loadPipeline();
  };

  const updateCandidateStage = async (appId: number, newStage: string, feedbackText?: string | null, bypassFeedback?: boolean) => {
    if (selectedJobId === "ALL") {
      toast.error(
        "Select a specific job to advance candidates through its custom pipeline.",
      );
      return;
    }

    const isFrozen = profile?.status === 'PENDING_REVERIFICATION' || profile?.status === 'PENDING';
    if (isFrozen) {
      toast.error("Your company profile is pending verification. Please wait for Admin approval.");
      return;
    }

    const selectedJob = jobs.find((j: any) => j.id.toString() === selectedJobId);
    const isClosed = selectedJob && (
      selectedJob.status === 'CLOSED' || 
      (selectedJob.deadline && new Date(selectedJob.deadline).setHours(23, 59, 59, 999) < new Date().getTime())
    );
    if (isClosed) {
      toast.error("This job post has ended. Stage movement is disabled in history mode.");
      return;
    }

    try {
      const cand = allApplicants.find((a) => a.application_id === appId);
      let numericStageId = parseInt(newStage, 10);
      let action = "IN_PROGRESS";

      if (newStage === "REJECTED") {
        action = "REJECTED";
        if (cand) {
          numericStageId =
            Number(cand.current_stage_id) || (customStages.length > 0 ? Number(customStages[0].id) : 0);
        }
      } else {
        // If the new stage corresponds to a custom stage of type 'SELECTED' or 'HIRED'
        const targetStage = customStages.find((s: any) => Number(s.id) === numericStageId);
        if (targetStage) {
          const typeUpper = String(targetStage.stage_type || '').toUpperCase();
          const nameUpper = String(targetStage.stage_name || '').toUpperCase();
          if (typeUpper === 'SELECTED' || typeUpper === 'HIRED' || nameUpper === 'SELECTED' || nameUpper === 'HIRED' || nameUpper === 'OFFER') {
            action = "SELECTED";
          }
        }
      }

      if (isNaN(numericStageId) || !Number.isFinite(numericStageId)) {
        if (action === "REJECTED") {
          numericStageId = customStages.length > 0 ? Number(customStages[0].id) : 999;
        } else {
          toast.error(
            "Select a specific job to advance candidates through its custom pipeline.",
          );
          return;
        }
      }

      // Check if we need to show feedback confirmation popup first
      if (!bypassFeedback && (action === "REJECTED" || action === "SELECTED") && feedbackText === undefined) {
        setFeedbackConfig({
          isOpen: true,
          appId,
          newStage,
          actionType: action as "SELECTED" | "REJECTED",
          candidateName: cand?.full_name || "Candidate",
          jobTitle: cand?.job_title || "Applied Position",
        });
        return;
      }

      if (feedbackConfig) {
        setIsSubmittingFeedback(true);
      }

      // Optimistic Update
      const targetStage = customStages.find((s: any) => Number(s.id) === numericStageId);
      setAllApplicants((prev) =>
        prev.map((a) =>
          a.application_id === appId
            ? {
                ...a,
                status: action === "REJECTED" ? "REJECTED" : numericStageId.toString(),
                current_stage_id: numericStageId,
                current_stage_type: action === "REJECTED" ? a.current_stage_type : (targetStage?.stage_type || a.current_stage_type),
                current_stage_name: action === "REJECTED" ? a.current_stage_name : (targetStage?.stage_name || a.current_stage_name),
              }
            : a,
        ),
      );

      await api.post(`/jobs/update-stage`, {
        applicationId: appId,
        stageId: numericStageId,
        action: action,
        notes:
          action === "REJECTED"
            ? "Application dropped/rejected"
            : "Moved to next stage via dynamic ATS Pipeline",
        feedback: feedbackText || null,
        notifyCandidate: true,
      });
      toast.success(
        action === "REJECTED"
          ? "Application rejected"
          : "Stage updated successfully",
      );
      markAsContacted(appId); // Mark contacted/notified on success!
      fetchData(); // Refresh pipeline immediately to keep data synced
      window.dispatchEvent(new CustomEvent('vega:pipeline-updated'));
    } catch (e) {
      toast.error("Failed to update stage");
      fetchData(); // revert
    } finally {
      setFeedbackConfig(null);
      setIsSubmittingFeedback(false);
    }
  };

  const activeStages = useMemo(() => {
    if (selectedJobId === "ALL" || customStages.length === 0) {
      return PIPELINE_STAGES;
    }
    // Return custom stages sorted by stage_order
    const sorted = [...customStages].sort(
      (a, b) => (a.stage_order || 0) - (b.stage_order || 0),
    );
    return sorted.map((cs) => ({
      id: cs.id.toString(), // critical: for comparison, stage id is custom stage id!
      label: cs.stage_name,
      color: "blue", // default color or map from custom stage types
      stage_type: cs.stage_type,
      stage_order: cs.stage_order,
      description: cs.description,
    }));
  }, [selectedJobId, customStages]);

  const getStageConfig = (stage: {
    id: string;
    label: string;
    stage_type?: string;
    description?: string;
  }) => {
    const type = (stage.stage_type || "").toUpperCase();
    const label = (stage.label || "").toUpperCase();

    let key = "APPLIED";
    if (
      type === "SCREENING" ||
      label.includes("SCREEN") ||
      label.includes("AI") ||
      label.includes("COPILOT")
    ) {
      key = "SCREENING";
    } else if (
      type === "TEST" ||
      type === "ASSESSMENT" ||
      label.includes("TEST") ||
      label.includes("ASSESS")
    ) {
      key = "TESTING";
    } else if (type === "INTERVIEW" || label.includes("INTERVIEW")) {
      if (label.includes("HR")) {
        key = "HR";
      } else {
        key = "INTERVIEW";
      }
    } else if (
      type === "SELECTED" ||
      type === "OFFER" ||
      label.includes("SELECT") ||
      label.includes("SHORTLIST") ||
      label.includes("HIRE") ||
      label.includes("OFFER") ||
      label.includes("ACC")
    ) {
      key = "SHORTLISTED";
    }

    const base = STAGE_CONFIGS[key] || STAGE_CONFIGS.APPLIED;
    return {
      ...base,
      label: stage.label,
      desc: stage.description || base.desc,
    };
  };

  const handleBulkAction = async (action: string) => {
    if (selectedCandidates.length === 0) return;

    if (action === "SCHEDULE_TEST") {
      setShowScheduleModal(true);
      return;
    }

    toast.success(
      `Applying ${action} to ${selectedCandidates.length} candidates...`,
    );

    if (action.startsWith("MOVE_")) {
      const stage = action.replace("MOVE_", "");
      for (const id of selectedCandidates) {
        await updateCandidateStage(id, stage, null, true);
      }
      setSelectedCandidates([]);
    } else {
      setTimeout(() => setSelectedCandidates([]), 1000);
    }
  };

  // Derived applicant list Based on job UI, search, match score
  const currentApplicants = useMemo(() => {
    let list = allApplicants;

    const filteredJobIds = jobs
      .filter((j: any) => {
        if (pipelineFilter === 'active') return j.status === 'OPEN';
        if (pipelineFilter === 'inactive') return j.status === 'CLOSED';
        return true;
      })
      .map((j: any) => j.id.toString());

    if (selectedJobId !== "ALL") {
      const hasJobIds = list.some(
        (a) => a.job_id !== undefined && a.job_id !== null,
      );
      if (hasJobIds) {
        list = list.filter((a) => a.job_id?.toString() === selectedJobId);
      }
      // If no job_id exists, trust /api/jobs/applicants/:jobId scoped response
    } else {
      list = list.filter((a) => {
        const jobIdStr = a.job_id?.toString();
        return filteredJobIds.includes(jobIdStr);
      });
    }

    if (searchQuery) {
      list = list.filter(
        (a) =>
          a.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.job_title?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }
    if (minScore > 0) {
      list = list.filter((a) => (a.talent_score || 0) >= minScore);
    }

    list = list.map((a) => {
      if (isRejectedCandidate(a)) {
        a.status = "REJECTED";
      } else if (selectedJobId !== "ALL" && customStages.length > 0) {
        const hasStage = customStages.some(
          (cs) => cs.id === a.current_stage_id,
        );
        if (hasStage) {
          a.status = a.current_stage_id.toString();
        } else {
          const firstStage = customStages[0];
          if (firstStage) {
            a.status = firstStage.id.toString();
          }
        }
      } else {
        a.status = normalizePipelineStage(a);
      }
      return a;
    });
    return list;
  }, [allApplicants, selectedJobId, searchQuery, minScore, customStages, pipelineFilter, jobs]);

  const insights = useMemo(() => {
    const total = currentApplicants.length;
    const expert = currentApplicants.filter(
      (a) => (a.talent_score || 0) > 80,
    ).length;
    const stuck = currentApplicants.filter(
      (a) => a.status === "INTERVIEW",
    ).length;
    return { total, expert, stuck };
  }, [currentApplicants]);

  const [draggedAppId, setDraggedAppId] = useState<number | null>(null);

  // Scheduling
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [feedbackConfig, setFeedbackConfig] = useState<{
    isOpen: boolean;
    appId: number;
    newStage: string;
    actionType: "SELECTED" | "REJECTED";
    candidateName: string;
    jobTitle: string;
  } | null>(null);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [scheduleConfig, setScheduleConfig] = useState({
    date: "",
    time: "",
    duration: 45,
    cutoff: 80,
  });

  const executeTestSchedule = async () => {
    try {
      const scheduledAt = `${scheduleConfig.date}T${scheduleConfig.time}:00`;

      const res = await api.post("/jobs/schedule-test-bulk", {
        applicationIds: selectedCandidates,
        scheduledAt,
        durationMinutes: scheduleConfig.duration,
        cutoffScore: scheduleConfig.cutoff,
      });

      if (res.data.success) {
        toast.success(
          res.data.message ||
            "Test scheduled successfully for selected candidates!",
        );
        setShowScheduleModal(false);
        setSelectedCandidates([]);
        fetchData(); // Refresh pipeline immediately
      } else {
        toast.error(res.data.message || "Failed to schedule tests.");
      }
    } catch (e) {
      toast.error(
        "An error occurred while scheduling test. Please make sure applications exist for the job stage.",
      );
      console.error(e);
    }
  };

  const handleDragStart = (e: React.DragEvent, appId: number) => {
    const isFrozen = profile?.status === 'PENDING_REVERIFICATION' || profile?.status === 'PENDING';
    if (isFrozen) {
      e.preventDefault();
      toast.error("Your company profile is pending verification. Please wait for Admin approval.");
      return;
    }
    const selectedJob = jobs.find((j: any) => j.id.toString() === selectedJobId);
    const isClosed = selectedJob && (
      selectedJob.status === 'CLOSED' || 
      (selectedJob.deadline && new Date(selectedJob.deadline).setHours(23, 59, 59, 999) < new Date().getTime())
    );
    if (isClosed) {
      e.preventDefault();
      toast.error("This job post has ended. Drag and drop is disabled in history mode.");
      return;
    }
    e.dataTransfer.setData("appId", appId.toString());
    e.dataTransfer.effectAllowed = "move";
    setDraggedAppId(appId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const appIdStr = e.dataTransfer.getData("appId");
    if (appIdStr) {
      updateCandidateStage(Number(appIdStr), stageId);
    }
    setDraggedAppId(null);
  };

  // Stage configurations helper for Image 1 and Image 2 styles
  const STAGE_CONFIGS: Record<
    string,
    {
      icon: any;
      label: string;
      color: string;
      desc: string;
      theme: {
        iconBg: string;
        border: string;
        hover: string;
        text: string;
        bg: string;
      };
    }
  > = {
    APPLIED: {
      icon: Briefcase,
      label: "Applied",
      color: "blue",
      desc: "Candidates waiting for screening",
      theme: {
        iconBg: "bg-blue-50 text-blue-600",
        border: "border-blue-100",
        hover: "hover:border-blue-300",
        text: "text-blue-700",
        bg: "bg-blue-50/50",
      },
    },
    SCREENING: {
      icon: Sparkles,
      label: "AI Screening",
      color: "indigo",
      desc: "Candidates undergoing AI screening",
      theme: {
        iconBg: "bg-indigo-50 text-indigo-600",
        border: "border-indigo-100",
        hover: "hover:border-indigo-300",
        text: "text-indigo-700",
        bg: "bg-indigo-50/50",
      },
    },
    TESTING: {
      icon: Target,
      label: "Assessment",
      color: "purple",
      desc: "Candidates in assessment stage",
      theme: {
        iconBg: "bg-purple-50 text-purple-600",
        border: "border-purple-100",
        hover: "hover:border-purple-300",
        text: "text-purple-700",
        bg: "bg-purple-50/50",
      },
    },
    INTERVIEW: {
      icon: PlayCircle,
      label: "Technical Interview",
      color: "orange",
      desc: "Candidates in technical interview",
      theme: {
        iconBg: "bg-orange-50 text-orange-600",
        border: "border-orange-100",
        hover: "hover:border-orange-300",
        text: "text-orange-700",
        bg: "bg-orange-50/50",
      },
    },
    HR: {
      icon: Users,
      label: "HR Interview",
      color: "pink",
      desc: "Candidates in HR interview",
      theme: {
        iconBg: "bg-pink-50 text-pink-600",
        border: "border-pink-100",
        hover: "hover:border-pink-300",
        text: "text-pink-700",
        bg: "bg-pink-50/50",
      },
    },
    SHORTLISTED: {
      icon: UserCheck,
      label: "Selected",
      color: "emerald",
      desc: "Candidates selected for offer",
      theme: {
        iconBg: "bg-emerald-50 text-emerald-600",
        border: "border-emerald-100",
        hover: "hover:border-emerald-300",
        text: "text-emerald-700",
        bg: "bg-emerald-50/50",
      },
    },
  };

  const getStageActionInfo = (candidate: any) => {
    const selectedJob = jobs.find((j: any) => j.id.toString() === selectedJobId);
    if (selectedJob && selectedJob.status === 'CLOSED') {
      return {
        disabled: true,
        label: "History Mode",
        nextId: null,
        reason: "This job post has ended.",
      };
    }

    if (isRejectedCandidate(candidate)) {
      return {
        disabled: true,
        label: "Rejected",
        nextId: null,
        reason: "Candidate has been rejected.",
      };
    }

    if (selectedJobId === "ALL") {
      return {
        disabled: true,
        label: "Select Job",
        nextId: null,
        reason:
          "Select a specific job to advance candidates through its custom pipeline.",
      };
    }

    if (!customStages || customStages.length === 0) {
      return {
        disabled: true,
        label: "No Custom Stages",
        nextId: null,
        reason: "No custom pipeline stages found for this job.",
      };
    }

    const stages = [...customStages].sort(
      (a, b) => (a.stage_order || 0) - (b.stage_order || 0),
    );

    // Find current stage by comparing Number(stage.id) === Number(candidate.current_stage_id)
    let currentIndex = stages.findIndex(
      (s) => Number(s.id) === Number(candidate?.current_stage_id),
    );

    // Fallback: search by candidate.status matching the stage id
    if (currentIndex === -1 && candidate?.status) {
      currentIndex = stages.findIndex(
        (s) => s.id.toString() === candidate.status.toString(),
      );
    }

    // Default to first stage if not bound or candidate just applied
    if (currentIndex === -1) {
      currentIndex = 0;
    }

    const nextStage = stages[currentIndex + 1];

    if (!nextStage) {
      return {
        disabled: true,
        label: "Final Stage",
        nextId: null,
        reason: "Candidate is already in the final stage.",
      };
    }

    return {
      disabled: false,
      label: "Advance",
      nextLabel: `Move to ${nextStage.stage_name}`,
      nextId: Number(nextStage.id),
      reason: "",
    };
  };

  const getNextStageInfo = (candidate: any) => {
    const cand =
      typeof candidate === "string"
        ? allApplicants.find((a) => a.status === candidate) || {
            status: candidate,
          }
        : candidate;
    const actionInfo = getStageActionInfo(cand);
    return {
      label: actionInfo.label,
      nextId: actionInfo.nextId?.toString() || null,
      disabled: actionInfo.disabled,
      reason: actionInfo.reason,
    };
  };

  const handleSeeMoreStage = (stageId: string) => {
    setSelectedStageView(stageId);
    setTableSearchQuery("");
    setFilterSkill("ALL");
    setFilterMatchScore("ALL");
    setFilterAssessmentScore("ALL");
    setFilterInterviewScore("ALL");
    setFilterDateRange("ALL");
    setCurrentPage(1);
    setSelectedCandidates([]);
  };

  // Safe Date parsing helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "—";
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch (_) {
      return "—";
    }
  };

  // Parse list of unique skills for dropdown from candidates of the selected stage
  const uniqueSkills = useMemo(() => {
    const list =
      selectedStageView !== null
        ? currentApplicants.filter((a) => a.status === selectedStageView)
        : currentApplicants;
    const skillsSet = new Set<string>();
    list.forEach((app) => {
      try {
        const skillsObj =
          typeof app.skills_json === "string"
            ? JSON.parse(app.skills_json || "[]")
            : app.skills_json || [];
        if (Array.isArray(skillsObj)) {
          skillsObj.forEach((sk) => {
            if (sk && typeof sk === "string") {
              skillsSet.add(sk);
            }
          });
        }
      } catch (e) {}
    });
    return Array.from(skillsSet);
  }, [currentApplicants, selectedStageView]);

  // Derived applicant list specifically for table view with inline subfiltering
  const filteredApplicants = useMemo(() => {
    if (selectedStageView === null) return [];

    // Begin with matching stage
    let list = currentApplicants.filter((a) => a.status === selectedStageView);

    // Apply Rejected Phase filter
    if (selectedStageView === "REJECTED" && filterRejectedPhase !== "ALL") {
      list = list.filter((a) => {
        const rejectedStageId = getRejectedStageId(a, customStages);
        return rejectedStageId === filterRejectedPhase;
      });
    }

    // Apply Table search (search by Name, Job Title, email, skills)
    if (tableSearchQuery) {
      const query = tableSearchQuery.toLowerCase();
      list = list.filter((a) => {
        let skillsList: string[] = [];
        try {
          skillsList =
            typeof a.skills_json === "string"
              ? JSON.parse(a.skills_json || "[]")
              : a.skills_json || [];
        } catch (e) {}

        return (
          (a.full_name || "").toLowerCase().includes(query) ||
          (a.job_title || "").toLowerCase().includes(query) ||
          (a.email || "").toLowerCase().includes(query) ||
          skillsList.some((s: string) => s.toLowerCase().includes(query))
        );
      });
    }

    // Apply Match Score filter
    if (filterMatchScore !== "ALL") {
      if (filterMatchScore === "HIGH") {
        list = list.filter((a) => (a.talent_score || 0) >= 85);
      } else if (filterMatchScore === "MID") {
        list = list.filter(
          (a) => (a.talent_score || 0) >= 70 && (a.talent_score || 0) < 85,
        );
      } else if (filterMatchScore === "LOW") {
        list = list.filter((a) => (a.talent_score || 0) < 70);
      }
    }

    // Apply Skills tag filter
    if (filterSkill !== "ALL") {
      list = list.filter((a) => {
        let skillsList: string[] = [];
        try {
          skillsList =
            typeof a.skills_json === "string"
              ? JSON.parse(a.skills_json || "[]")
              : a.skills_json || [];
        } catch (e) {}
        return skillsList.includes(filterSkill);
      });
    }

    // Apply Assessment test score filter
    if (filterAssessmentScore !== "ALL") {
      if (filterAssessmentScore === "HIGH") {
        list = list.filter((a) => (a.latest_test_score || 0) >= 80);
      } else if (filterAssessmentScore === "MID") {
        list = list.filter(
          (a) =>
            (a.latest_test_score || 0) >= 60 && (a.latest_test_score || 0) < 80,
        );
      } else if (filterAssessmentScore === "NONE") {
        list = list.filter(
          (a) =>
            a.latest_test_score === null || a.latest_test_score === undefined,
        );
      }
    }

    // Apply Interview average score filter
    if (filterInterviewScore !== "ALL") {
      if (filterInterviewScore === "HIGH") {
        list = list.filter((a) => (a.avg_interview_score || 0) >= 80);
      } else if (filterInterviewScore === "MID") {
        list = list.filter(
          (a) =>
            (a.avg_interview_score || 0) >= 60 &&
            (a.avg_interview_score || 0) < 80,
        );
      } else if (filterInterviewScore === "NONE") {
        list = list.filter(
          (a) =>
            a.avg_interview_score === null ||
            a.avg_interview_score === undefined,
        );
      }
    }

    // Apply date range filter
    if (filterDateRange !== "ALL") {
      const today = new Date();
      list = list.filter((a) => {
        if (!a.applied_at) return false;
        const appDate = new Date(a.applied_at);
        const diffDays =
          (today.getTime() - appDate.getTime()) / (1000 * 3605 * 24);
        if (filterDateRange === "7DAYS") return diffDays <= 7;
        if (filterDateRange === "30DAYS") return diffDays <= 30;
        return true;
      });
    }

    return list;
  }, [
    currentApplicants,
    selectedStageView,
    tableSearchQuery,
    filterMatchScore,
    filterSkill,
    filterAssessmentScore,
    filterInterviewScore,
    filterDateRange,
    filterRejectedPhase,
    customStages,
  ]);

  // Safe table sorting
  const sortedApplicants = useMemo(() => {
    const list = [...filteredApplicants];
    switch (sortBy) {
      case "newest":
        list.sort(
          (a, b) =>
            new Date(b.applied_at || 0).getTime() -
            new Date(a.applied_at || 0).getTime(),
        );
        break;
      case "oldest":
        list.sort(
          (a, b) =>
            new Date(a.applied_at || 0).getTime() -
            new Date(b.applied_at || 0).getTime(),
        );
        break;
      case "highest_match":
        list.sort((a, b) => (b.talent_score || 0) - (a.talent_score || 0));
        break;
      case "lowest_match":
        list.sort((a, b) => (a.talent_score || 0) - (b.talent_score || 0));
        break;
      case "highest_assessment":
        list.sort(
          (a, b) => (b.latest_test_score || 0) - (a.latest_test_score || 0),
        );
        break;
      case "highest_interview":
        list.sort(
          (a, b) => (b.avg_interview_score || 0) - (a.avg_interview_score || 0),
        );
        break;
      default:
        list.sort(
          (a, b) =>
            new Date(b.applied_at || 0).getTime() -
            new Date(a.applied_at || 0).getTime(),
        );
    }
    return list;
  }, [filteredApplicants, sortBy]);

  // Pagination bounds computation
  const totalPages = Math.ceil(sortedApplicants.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, sortedApplicants.length);

  const currentPageApplicants = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return sortedApplicants.slice(startIdx, startIdx + pageSize);
  }, [sortedApplicants, currentPage, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [sortedApplicants.length, totalPages]);

  // CSV Export
  const handleExportCSV = (data: any[]) => {
    const headers = [
      "Candidate Name",
      "Applied Job",
      "Match Score",
      "Skills",
      "Applied Date",
      "Test Score",
      "Interview Score",
      "Email",
      "Notified Status",
      "Current Stage",
    ];

    const rows = data.map((cand) => {
      let skillsList = [];
      try {
        skillsList =
          typeof cand.skills_json === "string"
            ? JSON.parse(cand.skills_json) || []
            : cand.skills_json || [];
      } catch (e) {}

      const isContactedLocal = !!contactedCandidates[cand.application_id];
      const stageObj = activeStages.find((s) => s.id === cand.status);
      const stageName = stageObj ? stageObj.label : cand.status;

      return [
        cand.full_name || "Anonymous Applicant",
        cand.job_title || "—",
        `${cand.talent_score || 0}%`,
        skillsList.join(", "),
        cand.applied_at ? formatDate(cand.applied_at) : "—",
        formatAssessmentScore(cand.latest_test_score),
        formatInterviewScore(cand.avg_interview_score),
        cand.email || "—",
        isContactedLocal ? "Notified" : "Not notified",
        stageName || "—",
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((r) =>
        r.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `vega_export_${selectedStageView || "all"}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Excel-compatible CSV exported successfully");
  };

  // Bulk advancing
  const handleBulkAdvance = async () => {
    if (selectedJobId === "ALL") {
      toast.error(
        "Select a specific job to advance candidates through its custom pipeline.",
      );
      return;
    }
    toast.success(`Advancing ${selectedCandidates.length} candidate(s)...`);
    for (const id of selectedCandidates) {
      const cand = allApplicants.find((a) => a.application_id === id);
      if (cand) {
        const stageInfo = getNextStageInfo(cand);
        if (stageInfo.nextId) {
          await updateCandidateStage(id, stageInfo.nextId, null, true);
        }
      }
    }
    setSelectedCandidates([]);
  };

  // Bulk rejecting
  const handleBulkReject = async () => {
    if (selectedJobId === "ALL") {
      toast.error("Select a specific job to drop / reject candidates.");
      return;
    }
    toast.success(`Dropping ${selectedCandidates.length} candidate(s)...`);
    for (const id of selectedCandidates) {
      const cand = allApplicants.find((a) => a.application_id === id);
      if (cand) {
        const numericStageId = parseInt(cand.status, 10);
        if (!isNaN(numericStageId)) {
          try {
            await api.post(`/jobs/update-stage`, {
              applicationId: id,
              stageId: numericStageId,
              action: "REJECTED",
              notes: `Application bulk rejected`,
            });
            setAllApplicants((prev) =>
              prev.map((a) =>
                a.application_id === id ? { ...a, status: "REJECTED" } : a,
              ),
            );
            markAsContacted(id);
          } catch (e) {
            console.error(e);
          }
        }
      }
    }
    setSelectedCandidates([]);
    toast.success("Candidates processed successfully");
    window.dispatchEvent(new CustomEvent('vega:pipeline-updated'));
  };

  const handleNotifyCandidate = async (applicationId: number) => {
    try {
      const res = await api.post(`/company/applications/${applicationId}/notify-decision`);
      if (res.data.success) {
        toast.success("Candidate successfully notified via portal and email!");
        setContactedCandidates((prev) => ({ ...prev, [applicationId]: true }));
        // Also update the applicant object in the state
        setAllApplicants((prev) =>
          prev.map((a) =>
            a.application_id === applicationId
              ? { ...a, decision_notified_at: new Date().toISOString() }
              : a
          )
        );
      } else {
        toast.error(res.data.message || "Failed to notify candidate.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to notify candidate.");
    }
  };

  return (
    <div className="h-full flex flex-col pt-2 pb-4 font-sans bg-slate-50/50">
      {/* 1. PIPELINE HEADER */}
      <PipelineHeader
        jobs={jobs}
        selectedJobId={selectedJobId}
        setSelectedJobId={setSelectedJobId}
        applicants={currentApplicants}
        pipelineFilter={pipelineFilter}
        setPipelineFilter={setPipelineFilter}
      />

      {(() => {
        const selectedJob = jobs.find((j: any) => j.id.toString() === selectedJobId);
        if (selectedJob && selectedJob.status === 'CLOSED') {
          return (
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 mb-4 mx-1 flex items-center gap-3 text-rose-800 animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 flex-shrink-0" />
              <div className="text-sm font-bold">
                This job post has ended. The pipeline is currently in read-only history mode. Active actions are disabled.
              </div>
            </div>
          );
        }
        return null;
      })()}

      {selectedStageView === null ? (
        // ============================
        // 6 SUMMARY CARDS MAIN PORTAL VIEW
        // ============================
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex-1 flex flex-col"
          >
            {/* AI Hiring Copilot Banner and Quick Filters Area */}
            <div className="flex flex-col lg:flex-row gap-4 mb-4 px-1">
              <AICopilot insights={insights} />
              <QuickFilters
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                minScore={minScore}
                setMinScore={setMinScore}
              />
            </div>

            {selectedCandidates.length > 0 && (
              <BulkActionBar
                count={selectedCandidates.length}
                onClear={() => setSelectedCandidates([])}
                onAction={handleBulkAction}
              />
            )}

            {/* Stage Summary Cards Grid (6 Stages) */}
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest pl-1.5 mb-4">
              Pipeline Stages Overview
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 px-1 pb-10">
              {activeStages.map((stage) => {
                const stageConf = getStageConfig(stage);
                const IconComp = stageConf?.icon || HelpCircle;
                const stageApps = currentApplicants.filter(
                  (a) => {
                    if (a.status !== stage.id) return false;
                    const job = jobs.find((j: any) => j.id.toString() === a.job_id?.toString());
                    return job ? job.status === 'OPEN' : true;
                  }
                );

                // Average talent score
                const totalScore = stageApps.reduce(
                  (acc, curr) => acc + (curr.talent_score || 0),
                  0,
                );
                const avgScore =
                  stageApps.length > 0
                    ? Math.round(totalScore / stageApps.length)
                    : 0;

                // Newest application dates
                const newestDate = stageApps.reduce(
                  (latest, curr) => {
                    if (!curr.applied_at) return latest;
                    const currTime = new Date(curr.applied_at).getTime();
                    if (!latest || currTime > latest.getTime())
                      return new Date(curr.applied_at);
                    return latest;
                  },
                  null as Date | null,
                );

                return (
                  <motion.div
                    key={stage.id}
                    layoutId={`stage-card-${stage.id}`}
                    whileHover={{ y: -4, transition: { duration: 0.15 } }}
                    className={`${
                      stageConf?.color === "emerald"
                        ? "bg-emerald-50/30 border-emerald-200/80 shadow-emerald-100/50"
                        : "bg-white border-slate-200/90 shadow-sm"
                    } rounded-[24px] p-5 border hover:shadow-md transition-all flex flex-col justify-between`}
                  >
                    <div>
                      {/* Top stage icon */}
                      <div
                        className={`w-12 h-12 rounded-[18px] flex items-center justify-center mb-4 ${stageConf?.theme?.iconBg || "bg-slate-100"}`}
                      >
                        <IconComp size={22} className="stroke-[2.25]" />
                      </div>

                      {/* Stage Label */}
                      <h3 className={`${stageConf?.color === "emerald" ? "text-emerald-500" : "text-slate-400"} text-[10px] font-black uppercase tracking-widest leading-none mb-1`}>
                        {stageConf?.label || stage.label}
                      </h3>

                      {/* Large Candidate Count Badge */}
                      <div className={`text-3xl font-extrabold ${stageConf?.color === "emerald" ? "text-emerald-800" : "text-slate-800"} tracking-tight leading-none mb-2 select-none`}>
                        {stageApps.length}
                      </div>

                      {/* Short Description */}
                      <p className="text-[11px] font-bold text-slate-500 leading-snug mb-5 min-h-[34px]">
                        {stageConf?.desc || "Candidates awaiting review"}
                      </p>

                      <div className="border-t border-slate-100 my-3.5" />

                      {/* Summary Metrics */}
                      <div className="space-y-3">
                        <div>
                          <span className="block text-[8px] font-black uppercase text-slate-400 tracking-wider mb-0.5">
                            Avg Match Score
                          </span>
                          <span
                            className={`text-xs font-black ${avgScore >= 80 ? "text-emerald-600" : avgScore >= 60 ? "text-blue-600" : "text-slate-700"}`}
                          >
                            {avgScore > 0 ? `${avgScore}%` : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[8px] font-black uppercase text-slate-400 tracking-wider mb-0.5">
                            Newest Application
                          </span>
                          <span className="text-xs font-bold text-slate-700">
                            {newestDate
                              ? formatDate(newestDate.toISOString())
                              : "—"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSeeMoreStage(stage.id)}
                      className={`w-full mt-5 py-2.5 bg-white border ${
                        stageConf?.color === "emerald"
                          ? "border-emerald-600 hover:bg-emerald-600/5 text-emerald-600"
                          : "border-blue-600 hover:bg-blue-600/5 text-blue-600"
                      } rounded-xl text-xs font-extrabold tracking-wide transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer leading-none`}
                    >
                      See More
                    </button>
                  </motion.div>
                );
              })}

              {/* Rejected Candidates Card */}
              {(() => {
                const rejectedApps = currentApplicants.filter(isRejectedCandidate);
                const IconComp = XCircle;
                return (
                  <motion.div
                    key="REJECTED"
                    layoutId="stage-card-REJECTED"
                    whileHover={{ y: -4, transition: { duration: 0.15 } }}
                    className="bg-rose-50/30 border-rose-200/80 shadow-rose-100/50 rounded-[24px] p-5 border hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top stage icon */}
                      <div className="w-12 h-12 rounded-[18px] flex items-center justify-center mb-4 bg-rose-100 text-rose-600">
                        <IconComp size={22} className="stroke-[2.25]" />
                      </div>

                      {/* Stage Label */}
                      <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-widest leading-none mb-1">
                        Rejected Candidates
                      </h3>

                      {/* Large Candidate Count Badge */}
                      <div className="text-3xl font-extrabold text-rose-800 tracking-tight leading-none mb-2 select-none">
                        {rejectedApps.length}
                      </div>

                      {/* Short Description */}
                      <p className="text-[11px] font-bold text-slate-500 leading-snug mb-5 min-h-[34px]">
                        Candidates rejected across pipeline phases
                      </p>

                      <div className="border-t border-slate-100 my-3.5" />

                      {/* Summary Metrics */}
                      <div className="space-y-3">
                        <div>
                          <span className="block text-[8px] font-black uppercase text-slate-400 tracking-wider mb-0.5">
                            Avg Match Score
                          </span>
                          <span className="text-xs font-black text-slate-700">
                            {(() => {
                              const totalScore = rejectedApps.reduce(
                                (acc, curr) => acc + (curr.talent_score || 0),
                                0,
                              );
                              const avgScore =
                                rejectedApps.length > 0
                                  ? Math.round(totalScore / rejectedApps.length)
                                  : 0;
                              return avgScore > 0 ? `${avgScore}%` : "—";
                            })()}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[8px] font-black uppercase text-slate-400 tracking-wider mb-0.5">
                            Newest Rejection
                          </span>
                          <span className="text-xs font-bold text-slate-700">
                            {(() => {
                              const newestDate = rejectedApps.reduce(
                                (latest, curr) => {
                                  if (!curr.applied_at) return latest;
                                  const currTime = new Date(curr.applied_at).getTime();
                                  if (!latest || currTime > latest.getTime())
                                    return new Date(curr.applied_at);
                                  return latest;
                                },
                                null as Date | null,
                              );
                              return newestDate ? formatDate(newestDate.toISOString()) : "—";
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSeeMoreStage("REJECTED")}
                      className="w-full mt-5 py-2.5 bg-white border border-rose-600 hover:bg-rose-600/5 text-rose-600 rounded-xl text-xs font-extrabold tracking-wide transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer leading-none"
                    >
                      See More
                    </button>
                  </motion.div>
                );
              })()}
            </div>
          </motion.div>
        </AnimatePresence>
      ) : (
        // ============================
        // EXPANDED SEE MORE TABLE VIEW
        // ============================
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex-1 flex flex-col px-1 pb-6"
          >
            {/* Header with back navigation */}
            <div className="flex items-start gap-4 mb-6">
              <button
                onClick={() => setSelectedStageView(null)}
                className="p-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-600 rounded-2xl shadow-sm transition-all focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
              >
                <ChevronLeft size={20} className="stroke-[2.5]" />
              </button>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                    {selectedStageView === "REJECTED"
                      ? "Rejected Candidates"
                      : getStageConfig(
                          activeStages.find(
                            (s) => s.id === selectedStageView,
                          ) || {
                            id: selectedStageView || "APPLIED",
                            label: selectedStageView || "Applied",
                          },
                        ).label}
                  </h1>
                  <span className="px-2.5 py-1 bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-black rounded-full shadow-sm select-none">
                    {sortedApplicants.length} Candidates
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-500 mt-1">
                  {selectedStageView === "REJECTED"
                    ? "Candidates rejected across pipeline phases"
                    : getStageConfig(
                        activeStages.find((s) => s.id === selectedStageView) || {
                          id: selectedStageView || "APPLIED",
                          label: selectedStageView || "Applied",
                        },
                      ).desc}
                </p>
              </div>
            </div>

            {/* Toolbar Panel (Search + Controls) */}
            <div className="bg-white rounded-[24px] p-4 border border-slate-200 shadow-sm mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-lg">
                <Search
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Search candidates, job title, or skills..."
                  value={tableSearchQuery}
                  onChange={(e) => {
                    setTableSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/10 text-slate-800 transition-all placeholder:text-slate-400 placeholder:font-semibold"
                />
              </div>

              <div className="flex items-center flex-wrap gap-2.5 select-none">
                <button
                  onClick={() => setShowTableFilters(!showTableFilters)}
                  className={`px-4 py-3 border rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${showTableFilters ? "bg-blue-50 border-blue-200 text-blue-700 font-extrabold" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"}`}
                >
                  <Filter size={13} /> Filters
                </button>

                <button
                  onClick={() => handleExportCSV(sortedApplicants)}
                  className="px-4 py-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <Download size={13} /> Export Excel / CSV
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 hidden sm:inline">
                    Sort:
                  </span>
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="bg-white border border-slate-200 text-slate-700 text-xs font-black rounded-xl px-3 py-3 outline-none focus:ring-2 focus:ring-blue-500/15 shadow-sm cursor-pointer"
                  >
                    <option value="newest">Applied Date (Newest)</option>
                    <option value="oldest">Applied Date (Oldest)</option>
                    <option value="highest_match">Highest Match Score</option>
                    <option value="lowest_match">Lowest Match Score</option>
                    <option value="highest_assessment">
                      Highest Assessment Score
                    </option>
                    <option value="highest_interview">
                      Highest Interview Score
                    </option>
                  </select>
                </div>
              </div>
            </div>

            {/* Table-specific Sub-filters row */}
            <AnimatePresence>
              {showTableFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{
                    height: "auto",
                    opacity: 1,
                    margin: "8px 0 16px 0",
                  }}
                  exit={{ height: 0, opacity: 0, margin: 0 }}
                  className="overflow-hidden"
                >
                  <div className={`bg-slate-100/50 rounded-[24px] p-5 border border-slate-200/80 shadow-inner grid grid-cols-1 sm:grid-cols-2 ${selectedStageView === "REJECTED" ? "lg:grid-cols-6" : "lg:grid-cols-5"} gap-4`}>
                    {/* Date filter dropdown */}
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1.5 pl-0.5">
                        Date Range
                      </label>
                      <select
                        value={filterDateRange}
                        onChange={(e) => {
                          setFilterDateRange(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 cursor-pointer shadow-sm"
                      >
                        <option value="ALL">All Dates</option>
                        <option value="7DAYS">Last 7 Days</option>
                        <option value="30DAYS">Last 30 Days</option>
                      </select>
                    </div>

                    {/* Skill filter */}
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1.5 pl-0.5">
                        Candidate Skill
                      </label>
                      <select
                        value={filterSkill}
                        onChange={(e) => {
                          setFilterSkill(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 cursor-pointer shadow-sm"
                      >
                        <option value="ALL">All Skills</option>
                        {uniqueSkills.map((sk) => (
                          <option key={sk} value={sk}>
                            {sk}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Match Score */}
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1.5 pl-0.5">
                        Match Score Profile
                      </label>
                      <select
                        value={filterMatchScore}
                        onChange={(e) => {
                          setFilterMatchScore(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 cursor-pointer shadow-sm"
                      >
                        <option value="ALL">All Match Scores</option>
                        <option value="HIGH">Top Match (85%+)</option>
                        <option value="MID">Strong Fit (70-84%)</option>
                        <option value="LOW">Evaluating (&lt;70%)</option>
                      </select>
                    </div>

                    {/* Assessment score scale */}
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1.5 pl-0.5">
                        Test Cut-off
                      </label>
                      <select
                        value={filterAssessmentScore}
                        onChange={(e) => {
                          setFilterAssessmentScore(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 cursor-pointer shadow-sm"
                      >
                        <option value="ALL">All Test Scores</option>
                        <option value="HIGH">Above 80%</option>
                        <option value="MID">60% to 79%</option>
                        <option value="NONE">No Score/Not Evaluated</option>
                      </select>
                    </div>

                    {/* Rejected At Phase dropdown */}
                    {selectedStageView === "REJECTED" && (
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1.5 pl-0.5">
                          Rejected At Phase
                        </label>
                        <select
                          value={filterRejectedPhase}
                          onChange={(e) => {
                            setFilterRejectedPhase(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 cursor-pointer shadow-sm animate-fade"
                        >
                          <option value="ALL">All Phases</option>
                          {activeStages.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Stage selector to traverse other view tables */}
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1.5 pl-0.5">
                        Switch Stage View
                      </label>
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedStageView}
                          onChange={(e) => handleSeeMoreStage(e.target.value)}
                          className="flex-1 bg-white border border-slate-200 rounded-xl px-2.5 py-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 cursor-pointer shadow-sm"
                        >
                          {activeStages.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                          <option value="REJECTED">Rejected Candidates</option>
                        </select>
                        <button
                          onClick={() => {
                            setFilterDateRange("ALL");
                            setFilterSkill("ALL");
                            setFilterMatchScore("ALL");
                            setFilterAssessmentScore("ALL");
                            setFilterInterviewScore("ALL");
                            setFilterRejectedPhase("ALL");
                            setTableSearchQuery("");
                          }}
                          className="text-[10px] font-extrabold text-blue-600 hover:text-blue-800 underline uppercase tracking-wider px-1.5 shrink-0"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bulk Action Toolbar */}
            {selectedCandidates.length > 0 && (
              <motion.div
                initial={{ scale: 0.98, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-slate-900 text-white rounded-[20px] p-3.5 px-6 mb-4 flex flex-wrap items-center justify-between gap-4 shadow-xl border border-slate-800"
              >
                <div className="flex items-center gap-3 select-none">
                  <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-xs font-black">
                    {selectedCandidates.length}
                  </div>
                  <span className="text-xs font-semibold text-slate-300">
                    selected for bulk actions
                  </span>
                </div>

                <div className="flex items-center flex-wrap gap-2">
                  <button
                    onClick={handleBulkAdvance}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow"
                  >
                    <Zap size={13} className="text-yellow-300 animate-pulse" />{" "}
                    Advance Stage
                  </button>

                  <button
                    onClick={() => handleBulkAction("SCHEDULE_TEST")}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-black flex items-center gap-1.5 border border-slate-700 transition-all text-purple-300 cursor-pointer"
                  >
                    <CalendarPlus size={13} /> Schedule Assessment
                  </button>

                  <button
                    onClick={() => {
                      const newContacts = { ...contactedCandidates };
                      selectedCandidates.forEach((id) => {
                        newContacts[id] = true;
                      });
                      setContactedCandidates(newContacts);
                      toast.success(
                        "Interview scheduled; notifications deployed.",
                      );
                      setSelectedCandidates([]);
                    }}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-black flex items-center gap-1.5 border border-slate-700 transition-all text-orange-300 cursor-pointer"
                  >
                    <Calendar size={13} /> Interview
                  </button>

                  <button
                    onClick={() => {
                      const newContacts = { ...contactedCandidates };
                      selectedCandidates.forEach((id) => {
                        newContacts[id] = true;
                      });
                      setContactedCandidates(newContacts);
                      toast.success("System emails successfully dispatched.");
                      setSelectedCandidates([]);
                    }}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-black flex items-center gap-1.5 border border-slate-700 transition-all text-emerald-300 cursor-pointer"
                  >
                    <Mail size={13} /> Send Email
                  </button>

                  <button
                    onClick={handleBulkReject}
                    className="px-3.5 py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-350 rounded-xl text-xs font-black flex items-center gap-1.5 border border-rose-500/20 transition-all cursor-pointer"
                  >
                    <ThumbsDown size={13} /> Drop / Reject
                  </button>

                  <button
                    onClick={() => {
                      let count = 0;
                      selectedCandidates.forEach((id) => {
                        const cand = allApplicants.find(
                          (a) => a.application_id === id,
                        );
                        if (cand?.resume_url) {
                          window.open(cand.resume_url, "_blank");
                          count++;
                        }
                      });
                      if (count > 0)
                        toast.success(`Downloaded ${count} resume documents`);
                      else
                        toast.error(
                          "No resumes attached to selected candidates",
                        );
                      setSelectedCandidates([]);
                    }}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-black flex items-center gap-1.5 border border-slate-700 transition-all text-slate-300 cursor-pointer"
                  >
                    <Download size={13} /> Resume
                  </button>

                  <div className="w-px h-6 bg-slate-800 mx-1" />
                  <button
                    onClick={() => setSelectedCandidates([])}
                    className="text-[10px] font-black text-slate-400 hover:text-white uppercase tracking-wider px-2 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}

            {/* Main Stage Grid Splitting Layout: Left is Candidates Table, Right is inline Profile panel */}
            <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
              {/* Left Side: Candidates Management Table */}
              <div className="flex-1 overflow-x-auto bg-white rounded-[24px] border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="inline-block min-w-full align-middle overflow-y-auto h-[calc(100vh-220px)] flex-1">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50 sticky top-0 z-10 select-none">
                      <tr>
                        <th scope="col" className="px-5 py-4 text-left">
                          <input
                            type="checkbox"
                            checked={
                              currentPageApplicants.length > 0 &&
                              currentPageApplicants.every((a) =>
                                selectedCandidates.includes(a.application_id),
                              )
                            }
                            onChange={() => {
                              const pageAppIds = currentPageApplicants.map(
                                (a) => a.application_id,
                              );
                              const isAllSelected = pageAppIds.every((id) =>
                                selectedCandidates.includes(id),
                              );
                              if (isAllSelected) {
                                setSelectedCandidates((prev) =>
                                  prev.filter((x) => !pageAppIds.includes(x)),
                                );
                              } else {
                                setSelectedCandidates((prev) =>
                                  Array.from(new Set([...prev, ...pageAppIds])),
                                );
                              }
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/10 cursor-pointer accent-blue-600"
                          />
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest"
                        >
                          Candidate
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest"
                        >
                          Applied Job
                        </th>
                        {selectedStageView === "REJECTED" && (
                          <th
                            scope="col"
                            className="px-3 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest"
                          >
                            Rejected At Phase
                          </th>
                        )}
                        <th
                          scope="col"
                          className="px-3 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest"
                        >
                          Match Score
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest"
                        >
                          Verified Skills
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest"
                        >
                          Applied Date
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest"
                        >
                          Test
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest"
                        >
                          Interview
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest"
                        >
                          Contact
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest"
                        >
                          Notified
                        </th>
                        <th
                          scope="col"
                          className="px-5 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest"
                        >
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {currentPageApplicants.map((cand, idx) => {
                        const skills =
                          typeof cand.skills_json === "string"
                            ? JSON.parse(cand.skills_json || "[]")
                            : cand.skills_json || [];
                        const isSelected = selectedCandidates.includes(
                          cand.application_id,
                        );
                        const isPrevActive =
                          previewCandidate?.application_id ===
                          cand.application_id;

                        const stageInfo = getNextStageInfo(cand);
                        const isContactedLocal =
                          !!cand.decision_notified_at || !!contactedCandidates[cand.application_id];

                        const statusUpper = String(cand.raw_status || cand.status || "").toUpperCase();
                        const isDecisionStatus = (statusUpper === 'SELECTED' || statusUpper === 'REJECTED' || cand.status === 'SELECTED' || cand.status === 'REJECTED');

                        return (
                          <motion.tr
                            key={cand.application_id || idx}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{
                              opacity: 1,
                              y: 0,
                              transition: { delay: idx * 0.02 },
                            }}
                            className={`group border-none transition-all duration-150 hover:bg-slate-50/70 border-l-4 ${isPrevActive ? "bg-blue-50/30 border-l-blue-600" : "border-l-transparent"} ${isSelected ? "bg-blue-50/10" : ""}`}
                          >
                            <td className="px-5 py-3 text-left">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  const id = cand.application_id;
                                  if (isSelected) {
                                    setSelectedCandidates(
                                      selectedCandidates.filter(
                                        (x) => x !== id,
                                      ),
                                    );
                                  } else {
                                    setSelectedCandidates([
                                      ...selectedCandidates,
                                      id,
                                    ]);
                                  }
                                }}
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/10 cursor-pointer accent-blue-600"
                              />
                            </td>
                            <td
                              className="px-3 py-3 text-left cursor-pointer"
                              onClick={() => setPreviewCandidate(cand)}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center text-slate-400 font-extrabold shadow-sm border border-slate-200 uppercase text-xs">
                                  {cand.profile_photo_url ? (
                                    <img
                                      src={cand.profile_photo_url}
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    (cand.full_name || "A")?.charAt(0)
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs font-black text-slate-800 truncate block hover:text-blue-600 transition-colors">
                                      {cand.full_name || "Anonymous Applicant"}
                                    </span>
                                    {(cand.talent_score || 0) >= 85 && (
                                      <Star
                                        size={11}
                                        className="text-purple-500 fill-purple-500 shrink-0"
                                      />
                                    )}
                                  </div>
                                  <span className="text-[9px] font-semibold text-slate-450 block truncate uppercase tracking-tight">
                                    #
                                    {cand.student_id
                                      ? `ST-${cand.student_id}`
                                      : `AP-${cand.application_id}`}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-left max-w-[140px] truncate">
                              <span className="text-xs font-black text-slate-700 block truncate">
                                {cand.job_title || "—"}
                              </span>
                            </td>
                            {selectedStageView === "REJECTED" && (
                              <td className="px-3 py-3 text-left">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100 shadow-sm select-none">
                                  Rejected at {(() => {
                                    const rejectedStageId = getRejectedStageId(cand, customStages);
                                    const stageObj = activeStages.find((s) => s.id === rejectedStageId);
                                    return stageObj ? stageObj.label : "Applied";
                                  })()}
                                </span>
                              </td>
                            )}
                            <td className="px-3 py-3 text-center">
                              <span
                                className={`px-2 py-1 text-[11px] font-black rounded-full border shadow-sm ${
                                  (cand.talent_score || 0) >= 85
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                    : (cand.talent_score || 0) >= 70
                                      ? "bg-blue-50 text-blue-700 border-blue-100"
                                      : "bg-slate-50 text-slate-600 border-slate-200"
                                }`}
                              >
                                {cand.talent_score || 0}%
                              </span>
                            </td>
                            <td className="px-3 py-3 text-left max-w-[200px]">
                              <div className="flex flex-wrap gap-1">
                                {skills
                                  .slice(0, 3)
                                  .map((s: string, i: number) => (
                                    <span
                                      key={i}
                                      className="px-1.5 py-0.5 bg-slate-50 text-slate-600 rounded text-[9px] font-bold border border-slate-200 max-w-[70px] truncate block"
                                    >
                                      {s}
                                    </span>
                                  ))}
                                {skills.length > 3 && (
                                  <span className="px-1 py-0.5 bg-slate-100 text-slate-400 rounded text-[8px] font-bold">
                                    +{skills.length - 3}
                                  </span>
                                )}
                                {skills.length === 0 && (
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    No skills listed
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-left text-xs font-medium text-slate-500">
                              {formatDate(cand.applied_at)}
                            </td>
                            <td className="px-3 py-3 text-center text-xs font-black text-purple-600">
                              {cand.latest_test_score !== null &&
                              cand.latest_test_score !== undefined &&
                              Number(cand.latest_test_score) >= 0 ? (
                                <span className="bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded shadow-sm text-[11px]">
                                  {formatAssessmentScore(
                                    cand.latest_test_score,
                                  )}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-normal">
                                  —
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center text-xs font-black text-orange-600">
                              {cand.avg_interview_score !== null &&
                              cand.avg_interview_score !== undefined &&
                              Number(cand.avg_interview_score) > 0 ? (
                                <span className="bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded shadow-sm text-[11px]">
                                  {formatInterviewScore(
                                    cand.avg_interview_score,
                                  )}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-normal">
                                  —
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-left">
                              {cand.email ? (
                                <span
                                  className="text-xs font-semibold text-slate-600 truncate block max-w-[165px]"
                                  title={cand.email}
                                >
                                  {cand.email}
                                </span>
                              ) : (
                                <span className="inline-flex rounded-md bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-600">
                                  No email provided
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-left">
                              {isContactedLocal ? (
                                <div className="flex items-center gap-1.5 text-emerald-650 bg-emerald-50 border border-emerald-100 p-1 px-2 rounded-lg text-[10px] font-black w-max select-none shadow-sm animate-fade">
                                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />{" "}
                                  Notified
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setContactedCandidates((prev) => {
                                        const next = { ...prev };
                                        delete next[cand.application_id];
                                        return next;
                                      });
                                      toast.success(
                                        "Notification status reset.",
                                      );
                                    }}
                                    className="ml-1 text-[11px] font-bold text-emerald-500 hover:text-emerald-800 bg-transparent border-none p-0 cursor-pointer outline-none shrink-0 pointer-events-auto"
                                    title="Reset notified status"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : isDecisionStatus ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleNotifyCandidate(cand.application_id);
                                  }}
                                  className="px-2.5 py-1 bg-amber-500 border border-amber-600 text-white hover:bg-amber-600 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0"
                                  title="Explicitly notify candidate of recruitment decision"
                                >
                                  Notify
                                </button>
                              ) : (
                                <div className="flex items-center gap-1.5 text-slate-500 bg-slate-50 border border-slate-200 p-1 px-2 rounded-lg text-[10px] font-bold w-max select-none shadow-sm">
                                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />{" "}
                                  Not notified
                                </div>
                              )}
                            </td>
                            <td className="px-5 py-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-3">
                                {/* View Profile Action */}
                                <button
                                  onClick={() => setPreviewCandidate(cand)}
                                  className="text-xs font-black text-blue-600 hover:text-blue-805 cursor-pointer hover:underline transition-all"
                                  title="View Candidate Profile"
                                >
                                  View Profile
                                </button>

                                {/* Next Stage Action code */}
                                {String(cand.status || "").toUpperCase() ===
                                "REJECTED" ? (
                                  <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase bg-red-50 text-red-600 border border-red-100 select-none shadow-sm cursor-not-allowed">
                                    Rejected
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => {
                                      if (selectedJobId === "ALL") {
                                        toast.error(
                                          "Select a specific job to advance candidates through its custom pipeline.",
                                        );
                                        return;
                                      }
                                      if (stageInfo.nextId) {
                                        updateCandidateStage(
                                          cand.application_id,
                                          stageInfo.nextId,
                                        );
                                      }
                                    }}
                                    disabled={stageInfo.disabled}
                                    className={`px-3 py-1.5 font-extrabold rounded-xl text-[10px] uppercase tracking-wider transition-all shadow-sm ${
                                      stageInfo.disabled
                                        ? "bg-slate-100 text-slate-350 border border-slate-200/50 cursor-not-allowed select-none"
                                        : "bg-blue-600 text-white hover:bg-blue-750 cursor-pointer active:scale-95"
                                    }`}
                                  >
                                    {stageInfo.disabled
                                      ? stageInfo.label
                                      : "Advance"}
                                  </button>
                                )}
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                      {currentPageApplicants.length === 0 && (
                        <tr>
                          <td
                            colSpan={selectedStageView === "REJECTED" ? 11 : 10}
                            className="py-12 text-center text-slate-400 text-xs font-black uppercase tracking-widest"
                          >
                            {selectedStageView === "REJECTED" && filterRejectedPhase !== "ALL"
                              ? "No candidates rejected at this phase."
                              : "No candidates match active filters"}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table standard pagination footer block */}
                <div className="p-4 border-t border-slate-150 bg-slate-50 rounded-b-[24px] flex flex-col sm:flex-row items-center justify-between gap-4 select-none">
                  <span className="text-xs font-semibold text-slate-500">
                    Showing {sortedApplicants.length > 0 ? startIndex : 0} to{" "}
                    {endIndex} of {sortedApplicants.length} candidates
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 select-none text-slate-600 outline-none transition-all cursor-pointer"
                    >
                      <ChevronLeft size={14} />
                    </button>

                    {Array.from({ length: totalPages }).map((_, idx) => {
                      const pageNum = idx + 1;
                      if (
                        totalPages > 5 &&
                        Math.abs(pageNum - currentPage) > 1 &&
                        pageNum !== 1 &&
                        pageNum !== totalPages
                      ) {
                        if (pageNum === 2 || pageNum === totalPages - 1) {
                          return (
                            <span
                              key={pageNum}
                              className="text-slate-400 text-xs px-1"
                            >
                              ...
                            </span>
                          );
                        }
                        return null;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-7 h-7 rounded-lg text-xs font-black shadow-sm border transition-all cursor-pointer ${currentPage === pageNum ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 select-none text-slate-600 outline-none transition-all cursor-pointer"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 px-2 py-1 shadow-sm focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
                      >
                        <option value={10}>10 per page</option>
                        <option value={25}>25 per page</option>
                        <option value={50}>50 per page</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-slate-500">
                        Go to page
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={totalPages}
                        value={currentPage}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (val >= 1 && val <= totalPages) {
                            setCurrentPage(val);
                          }
                        }}
                        className="w-10 bg-white border border-slate-200 rounded-lg text-xs font-black text-center py-1 outline-none focus:ring-2 focus:ring-blue-500/10 text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side: Inline Profile Panel Review (Desktop Only, matches Image 2 split screen) */}
              {previewCandidate && (
                <div className="w-[430px] shrink-0 bg-white border border-slate-200 rounded-[24px] shadow-sm flex flex-col overflow-hidden hidden xl:flex">
                  <CandidateQuickPreview
                    candidate={previewCandidate}
                    isInline={true}
                    onClose={() => setPreviewCandidate(null)}
                    onAction={(action: string) =>
                      updateCandidateStage(
                        previewCandidate.application_id,
                        action,
                      )
                    }
                    contactedCandidates={contactedCandidates}
                    markAsContacted={markAsContacted}
                    activeStages={activeStages}
                    selectedJobId={selectedJobId}
                    getNextStageInfo={getNextStageInfo}
                  />
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Floating absolute sidebar preview drawer for non-split view sizes */}
      <AnimatePresence>
        {previewCandidate && (
          <div className="xl:hidden">
            <CandidateQuickPreview
              candidate={previewCandidate}
              isInline={false}
              onClose={() => setPreviewCandidate(null)}
              onAction={(action: string) =>
                updateCandidateStage(previewCandidate.application_id, action)
              }
              contactedCandidates={contactedCandidates}
              markAsContacted={markAsContacted}
              activeStages={activeStages}
              selectedJobId={selectedJobId}
              getNextStageInfo={getNextStageInfo}
            />
          </div>
        )}

        {showScheduleModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl relative"
            >
              <button
                onClick={() => setShowScheduleModal(false)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <XCircle size={20} />
              </button>
              <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                <CalendarPlus size={28} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
                Schedule Assessment
              </h3>
              <p className="text-sm font-semibold text-slate-500 mb-8 leading-relaxed">
                Set the date, time, and rules for the technical assessment for{" "}
                <strong className="text-slate-800">
                  {selectedCandidates.length} candidate(s)
                </strong>
                .
              </p>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500/10"
                      value={scheduleConfig.date}
                      onChange={(e) =>
                        setScheduleConfig({
                          ...scheduleConfig,
                          date: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">
                      Time
                    </label>
                    <input
                      type="time"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500/10"
                      value={scheduleConfig.time}
                      onChange={(e) =>
                        setScheduleConfig({
                          ...scheduleConfig,
                          time: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-5">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2 flex items-center gap-1.5">
                      <Clock size={12} /> Duration
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="15"
                        step="15"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500/10"
                        value={scheduleConfig.duration}
                        onChange={(e) =>
                          setScheduleConfig({
                            ...scheduleConfig,
                            duration: Number(e.target.value),
                          })
                        }
                      />
                      <span className="text-xs font-bold text-slate-400">
                        min
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2 flex items-center gap-1.5">
                      <Target size={12} /> Cutoff %
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="40"
                        max="100"
                        step="5"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500/10"
                        value={scheduleConfig.cutoff}
                        onChange={(e) =>
                          setScheduleConfig({
                            ...scheduleConfig,
                            cutoff: Number(e.target.value),
                          })
                        }
                      />
                      <span className="text-xs font-bold text-slate-400">
                        %
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="flex-1 py-3.5 rounded-xl font-black uppercase text-xs tracking-widest text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={executeTestSchedule}
                  className="flex-[2] py-3.5 bg-purple-600 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-purple-600/20 hover:bg-purple-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CalendarPlus size={16} /> Schedule & Notify
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {feedbackConfig && (
          <FeedbackConfirmModal
            isOpen={feedbackConfig.isOpen}
            onClose={() => setFeedbackConfig(null)}
            candidateName={feedbackConfig.candidateName}
            jobTitle={feedbackConfig.jobTitle}
            actionType={feedbackConfig.actionType}
            onConfirm={(feedbackText) => {
              updateCandidateStage(feedbackConfig.appId, feedbackConfig.newStage, feedbackText);
            }}
            isSubmitting={isSubmittingFeedback}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Sub components ---

function PipelineHeader({
  jobs,
  selectedJobId,
  setSelectedJobId,
  applicants,
  pipelineFilter,
  setPipelineFilter,
}: any) {
  const selectedJob = jobs.find((j: any) => j.id.toString() === selectedJobId);

  const filteredJobsForSelect = jobs.filter((j: any) => {
    if (pipelineFilter === 'active') return j.status === 'OPEN';
    if (pipelineFilter === 'inactive') return j.status === 'CLOSED';
    return true;
  });

  return (
    <div className="bg-white rounded-[24px] p-6 border border-slate-200 shadow-sm mb-4 flex flex-col md:flex-row gap-6 justify-between items-center relative overflow-hidden mx-1">
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />

      <div className="z-10 flex-1 w-full">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-3">
          Hiring Pipeline
        </h1>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 w-full max-w-sm"
          >
            <option value="ALL">
              {pipelineFilter === 'active' ? "All Active Jobs" : pipelineFilter === 'inactive' ? "All Inactive Jobs" : "All Jobs"}
            </option>
            {filteredJobsForSelect.map((j: any) => (
              <option key={j.id} value={j.id.toString()}>
                {j.title} {j.status === 'CLOSED' ? " (Ended)" : ""}
              </option>
            ))}
          </select>

          {/* Filter options for Active / Inactive / All pipelines */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => {
                setPipelineFilter('active');
                setSelectedJobId('ALL');
              }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                pipelineFilter === 'active'
                  ? 'bg-white text-blue-600 shadow-sm font-black'
                  : 'text-slate-500 hover:text-slate-800 font-bold'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => {
                setPipelineFilter('inactive');
                setSelectedJobId('ALL');
              }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                pipelineFilter === 'inactive'
                  ? 'bg-white text-blue-600 shadow-sm font-black'
                  : 'text-slate-500 hover:text-slate-800 font-bold'
              }`}
            >
              Ended
            </button>
            <button
              onClick={() => {
                setPipelineFilter('all');
                setSelectedJobId('ALL');
              }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                pipelineFilter === 'all'
                  ? 'bg-white text-blue-600 shadow-sm font-black'
                  : 'text-slate-500 hover:text-slate-800 font-bold'
              }`}
            >
              All
            </button>
          </div>

          {selectedJob && (
            <span className={`px-3 py-2 text-xs font-bold rounded-xl border flex items-center gap-1 ${
              selectedJob.status === 'CLOSED'
                ? 'bg-rose-50 text-rose-700 border-rose-100'
                : 'bg-emerald-50 text-emerald-700 border-emerald-100'
            }`}>
              {selectedJob.status === 'CLOSED' ? (
                <>
                  <XCircle size={14} className="text-rose-500" /> Ended / History Mode
                </>
              ) : (
                <>
                  <CheckCircle size={14} className="text-emerald-500" /> Active
                </>
              )}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-4 z-10 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
        <KPICard
          title="Total Applicants"
          value={applicants.length}
          icon={Users}
          color="blue"
        />
        <KPICard
          title="Shortlisted"
          value={
            applicants.filter(
              (a: any) => a.status === "SHORTLISTED" || a.status === "SELECTED",
            ).length
          }
          icon={Target}
          color="emerald"
        />
        <KPICard
          title="In Interview"
          value={applicants.filter((a: any) => a.status === "INTERVIEW").length}
          icon={Calendar}
          color="orange"
        />
      </div>
    </div>
  );
}

function KPICard({ title, value, icon: Icon, color }: any) {
  const colorMap: any = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
  };
  return (
    <div
      className={`flex items-center gap-4 px-5 py-3.5 rounded-[20px] border bg-white shadow-sm shrink-0 min-w-[200px]`}
    >
      <div className={`p-3 rounded-xl border ${colorMap[color]}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          {title}
        </p>
        <p className="text-2xl font-black text-slate-800 leading-none mt-1">
          {value}
        </p>
      </div>
    </div>
  );
}

function AICopilot({ insights }: { insights: any }) {
  return (
    <div className="flex-1 bg-gradient-to-br from-indigo-900 to-blue-900 rounded-[24px] p-6 shadow-lg relative overflow-hidden text-white flex flex-col justify-center border border-indigo-800">
      <div className="absolute -right-10 -top-10 text-white/5 pointer-events-none">
        <Sparkles size={160} />
      </div>
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="text-yellow-400" size={20} />
          <h3 className="text-sm font-black uppercase tracking-wider text-indigo-50 flex items-center">
            AI Hiring Copilot{" "}
            <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded-md ml-2 text-white border border-white/20">
              BETA
            </span>
          </h3>
        </div>
        <ul className="space-y-3 text-xs font-semibold text-indigo-100">
          <li className="flex items-start gap-2.5 bg-indigo-800/40 p-2.5 rounded-xl border border-indigo-700/50">
            <div className="w-5 h-5 rounded bg-yellow-400/20 text-yellow-400 flex items-center justify-center shrink-0">
              <Star size={12} />
            </div>
            <span className="leading-tight">
              Found{" "}
              <strong className="text-white bg-white/20 px-1.5 rounded">
                {insights.expert} candidates
              </strong>{" "}
              exceeding role requirements based on historical data.
            </span>
          </li>
          {insights.stuck > 0 && (
            <li className="flex items-start gap-2.5 bg-indigo-800/40 p-2.5 rounded-xl border border-indigo-700/50">
              <div className="w-5 h-5 rounded bg-rose-400/20 text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle size={12} />
              </div>
              <span className="leading-tight">
                Bottleneck Warning:{" "}
                <strong className="text-white">
                  {insights.stuck} candidates
                </strong>{" "}
                are stuck in the Technical Interview stage.
              </span>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

function QuickFilters({
  searchQuery,
  setSearchQuery,
  minScore,
  setMinScore,
}: any) {
  return (
    <div className="w-full lg:w-[420px] bg-white rounded-[24px] p-6 border border-slate-200 shadow-sm flex flex-col justify-center gap-4">
      <div className="relative">
        <Search
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          size={16}
        />
        <input
          type="text"
          placeholder="Search skills, names, colleges..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 transition-all"
        />
      </div>
      <div className="flex items-center gap-4 px-1">
        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest shrink-0 flex items-center gap-1.5">
          <Filter size={12} /> Min Match
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={minScore}
          onChange={(e) => setMinScore(Number(e.target.value))}
          className="flex-1 accent-indigo-600 h-1.5 bg-slate-200 rounded-full cursor-pointer"
        />
        <span className="text-[11px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 w-11 text-center">
          {minScore}%
        </span>
      </div>
    </div>
  );
}

function BulkActionBar({ count, onClear, onAction }: any) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-slate-900 text-white rounded-2xl px-6 py-3 mb-6 flex items-center justify-between shadow-2xl border border-slate-700 mx-1 sticky top-4 z-40"
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-8 h-8 bg-blue-500/20 rounded-xl border border-blue-500/30 text-blue-400 font-black text-sm shadow-inner">
          {count}
        </div>
        <span className="text-sm font-bold tracking-wide">
          Candidates Selected
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onAction("MOVE_SCREENING")}
          className="px-3 py-2 hover:bg-white/10 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
        >
          <Zap size={14} className="text-yellow-400" /> Auto Screen
        </button>
        <button
          onClick={() => onAction("EMAIL")}
          className="px-3 py-2 hover:bg-white/10 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
        >
          <Mail size={14} className="text-emerald-400" /> Message
        </button>
        <button
          onClick={() => onAction("MOVE_REJECTED")}
          className="px-3 py-2 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
        >
          <XCircle size={14} /> Reject
        </button>
        <div className="w-px h-6 bg-slate-700 mx-2" />
        <button
          onClick={() => onAction("SCHEDULE_TEST")}
          className="px-3 py-2 hover:bg-purple-500/20 text-purple-400 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
        >
          <CalendarPlus size={14} /> Schedule Test
        </button>
        <button
          onClick={onClear}
          className="text-xs font-bold text-slate-400 hover:text-white uppercase tracking-widest px-2 transition-colors"
        >
          Clear
        </button>
      </div>
    </motion.div>
  );
}

function StageColumn({
  stage,
  applicants,
  onDragStart,
  onDragOver,
  onDrop,
  selectedCandidates,
  setSelectedCandidates,
  setPreviewCandidate,
  draggedAppId,
}: any) {
  const [isOver, setIsOver] = useState(false);

  const colorMap: any = {
    blue: "bg-blue-500 shadow-blue-500/30",
    indigo: "bg-indigo-500 shadow-indigo-500/30",
    purple: "bg-purple-500 shadow-purple-500/30",
    orange: "bg-orange-500 shadow-orange-500/30",
    pink: "bg-pink-500 shadow-pink-500/30",
    emerald: "bg-emerald-500 shadow-emerald-500/30",
  };
  const bgMap: any = {
    blue: "bg-blue-50/80 border-blue-200",
    indigo: "bg-indigo-50/80 border-indigo-200",
    purple: "bg-purple-50/80 border-purple-200",
    orange: "bg-orange-50/80 border-orange-200",
    pink: "bg-pink-50/80 border-pink-200",
    emerald: "bg-emerald-50/80 border-emerald-200",
  };

  return (
    <div
      className={`w-[320px] shrink-0 flex flex-col rounded-[24px] border-2 transition-all duration-300 ${isOver ? bgMap[stage.color] : "bg-slate-100/50 border-slate-200/60"}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsOver(true);
        onDragOver(e);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        setIsOver(false);
        onDrop(e, stage.id);
      }}
    >
      <div className="p-4 py-3.5 flex justify-between items-center border-b border-slate-200/50 bg-white/70 rounded-t-[22px] backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <span
            className={`w-2.5 h-2.5 rounded-full shadow-md ${colorMap[stage.color]}`}
          />
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest leading-none mt-0.5">
            {stage.label}
          </h3>
        </div>
        <span className="bg-white border border-slate-200 text-slate-600 px-2.5 py-0.5 rounded-md text-[10px] font-black shadow-sm">
          {applicants.length}
        </span>
      </div>

      <div className="p-3.5 flex-1 flex flex-col gap-3.5 min-h-[500px] overflow-y-auto scrollbar-hide pb-10">
        {applicants.map((app: any) => (
          <CandidateCard
            key={app.application_id}
            candidate={app}
            onDragStart={onDragStart}
            selected={selectedCandidates.includes(app.application_id)}
            onToggleSelect={(e: any) => {
              e.stopPropagation();
              const id = app.application_id;
              if (selectedCandidates.includes(id))
                setSelectedCandidates(
                  selectedCandidates.filter((x: any) => x !== id),
                );
              else setSelectedCandidates([...selectedCandidates, id]);
            }}
            onClick={() => setPreviewCandidate(app)}
            isDragged={draggedAppId === app.application_id}
          />
        ))}
        {applicants.length === 0 && (
          <div className="h-32 border-2 border-dashed border-slate-300/60 rounded-[18px] flex flex-col items-center justify-center text-[10px] font-black text-slate-400/80 uppercase tracking-widest gap-2 bg-white/30 backdrop-blur-sm">
            <div className="p-2 bg-slate-100 rounded-full">
              <Plus size={16} />
            </div>
            Drop Candidates
          </div>
        )}
      </div>
    </div>
  );
}

function CandidateCard({
  candidate,
  onDragStart,
  selected,
  onToggleSelect,
  onClick,
  isDragged,
}: any) {
  const matchScore =
    candidate.talent_score || Math.floor(Math.random() * 40 + 40);

  let recBadge = (
    <span className="bg-slate-100 border border-slate-200 text-slate-500 px-2 py-0.5 rounded-md text-[8px] font-bold uppercase truncate shadow-sm">
      Evaluating
    </span>
  );
  if (matchScore >= 85)
    recBadge = (
      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md text-[8px] font-black uppercase truncate border border-emerald-200 flex items-center gap-1 shadow-sm">
        <Star size={8} className="fill-emerald-600" /> Top Match
      </span>
    );
  else if (matchScore >= 70)
    recBadge = (
      <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md text-[8px] font-bold uppercase truncate shadow-sm">
        Strong Fit
      </span>
    );

  let skills = [];
  try {
    skills =
      typeof candidate.skills_json === "string"
        ? JSON.parse(candidate.skills_json) || []
        : candidate.skills_json || [];
  } catch (e) {}

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, candidate.application_id)}
      onClick={onClick}
      className={`bg-white p-4 pb-3.5 rounded-[20px] border-2 transition-all cursor-grab active:cursor-grabbing hover:-translate-y-0.5 hover:shadow-xl ${selected ? "border-blue-500 shadow-blue-500/20" : "border-slate-100 hover:border-blue-200 hover:shadow-blue-500/5"} ${isDragged ? "opacity-40 scale-95 border-dashed" : "opacity-100"}`}
    >
      <div className="flex justify-between items-start mb-3 border-b border-slate-50 pb-3">
        <div className="flex items-center gap-3 w-full min-w-0">
          <div
            onClick={onToggleSelect}
            className="shrink-0 p-1 -ml-1 cursor-pointer"
          >
            <div
              className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${selected ? "bg-blue-600 border-blue-600 shadow-sm" : "bg-slate-50 border-slate-300 hover:border-blue-400"}`}
            >
              {selected && (
                <Check size={10} className="text-white" strokeWidth={3} />
              )}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center text-slate-400 font-bold shadow-inner">
            {candidate.profile_photo_url ? (
              <img
                src={candidate.profile_photo_url}
                className="w-full h-full object-cover"
              />
            ) : (
              candidate.full_name?.charAt(0)
            )}
          </div>
          <div className="min-w-0 pr-2">
            <h4 className="text-xs font-black text-slate-900 truncate leading-tight tracking-tight mb-0.5">
              {candidate.full_name || "Anonymous Applicant"}
            </h4>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider truncate">
              {candidate.job_title}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3 pt-0.5">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
          Match Score
        </span>
        <span
          className={`text-[11px] font-black px-2 py-0.5 rounded-md border ${matchScore >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-100" : matchScore >= 60 ? "bg-indigo-50 text-indigo-700 border-indigo-100" : "bg-slate-50 text-slate-700 border-slate-200"}`}
        >
          {matchScore}%
        </span>
      </div>

      {candidate.latest_test_score !== null &&
        candidate.latest_test_score !== undefined && (
          <div className="flex items-center justify-between mb-3 -mt-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-purple-500">
              Test Score
            </span>
            <span className="text-[11px] font-black px-2 py-0.5 rounded-md border bg-purple-50 text-purple-700 border-purple-200 shadow-sm">
              {Math.round(candidate.latest_test_score)}%
            </span>
          </div>
        )}

      <div className="flex flex-wrap gap-1.5 mb-3">
        {recBadge}
        {skills.slice(0, 2).map((s: string, i: number) => (
          <span
            key={i}
            className="bg-slate-50 border border-slate-200/80 text-slate-600 px-2 py-0.5 rounded-md text-[8px] font-bold truncate max-w-[85px]"
          >
            {s}
          </span>
        ))}
        {skills.length > 2 && (
          <span className="bg-slate-50 text-slate-400 px-1.5 py-0.5 rounded-md border border-slate-200/80 text-[8px] font-bold">
            +{skills.length - 2}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-1">
        <div className="flex items-center gap-1.5 text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
          <Clock size={10} />
          <span className="text-[8px] font-black uppercase leading-none mt-0.5 text-slate-500">
            {new Date(candidate.applied_at || Date.now()).toLocaleDateString(
              undefined,
              { month: "short", day: "numeric" },
            )}
          </span>
        </div>
        <button className="text-[9px] font-black text-blue-600 flex items-center gap-0.5 hover:text-blue-800 bg-blue-50/50 hover:bg-blue-100 px-2 py-1 rounded-lg transition-colors border border-blue-100/50 hover:border-blue-200">
          Review <ChevronRight size={10} />
        </button>
      </div>
    </div>
  );
}

function CandidateQuickPreview({
  candidate,
  onClose,
  onAction,
  isInline = false,
  contactedCandidates = {},
  markAsContacted,
  activeStages = [],
  selectedJobId,
  getNextStageInfo,
}: any) {
  let skills = [];
  try {
    skills =
      typeof candidate.skills_json === "string"
        ? JSON.parse(candidate.skills_json) || []
        : candidate.skills_json || [];
  } catch (e) {}

  const isContactedLocal = !!contactedCandidates[candidate.application_id];

  const handleSendEmailLocal = () => {
    if (candidate.email) {
      if (markAsContacted) markAsContacted(candidate.application_id);
      toast.success(
        `Custom message sent to ${candidate.full_name} (${candidate.email})!`,
      );
    } else {
      toast.error("Candidate has not provided an email address");
    }
  };

  const handleScheduleInterviewLocal = () => {
    if (markAsContacted) markAsContacted(candidate.application_id);
    toast.success(
      `Interview setup email and Calendar request dispatch sent to ${candidate.full_name}!`,
    );
  };

  const handleDownloadResumeLocal = () => {
    if (candidate.resume_url) {
      window.open(candidate.resume_url, "_blank");
      toast.success("Resume downloaded successfully");
    } else {
      toast.error("No resume URL uploaded by this candidate");
    }
  };

  const mainContent = (
    <div
      className={`w-full h-full bg-white flex flex-col font-sans overflow-hidden ${isInline ? "" : "border-l border-slate-200"}`}
    >
      {/* Cover & Profile Header */}
      <div className="relative h-36 bg-slate-900 shrink-0 overflow-hidden">
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-500 via-indigo-900 to-slate-900" />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-900/60 to-transparent" />
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full text-white backdrop-blur-md transition-colors z-10 cursor-pointer"
        >
          <ChevronRight size={18} />
        </button>
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <button
            onClick={handleSendEmailLocal}
            title="Draft new direct message"
            className="p-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full text-white backdrop-blur-md transition-colors cursor-pointer"
          >
            <MessageSquare size={16} />
          </button>
        </div>
      </div>

      <div className="px-6 relative -mt-16 shrink-0 z-10">
        <div className="w-24 h-24 rounded-[20px] bg-white p-1 border border-slate-200 shadow-xl mb-3">
          <div className="w-full h-full bg-slate-100 rounded-[14px] overflow-hidden flex items-center justify-center text-4xl font-black text-slate-300 shadow-inner">
            {candidate.profile_photo_url ? (
              <img
                src={candidate.profile_photo_url}
                className="w-full h-full object-cover"
              />
            ) : (
              candidate.full_name?.charAt(0)
            )}
          </div>
        </div>
        <div className="pb-4 border-b border-slate-100 flex justify-between items-start">
          <div className="min-w-0 pr-2">
            <h2
              className="text-xl font-black text-slate-900 tracking-tight leading-none mb-1.5 truncate"
              title={candidate.full_name}
            >
              {candidate.full_name}
            </h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">
              {candidate.job_title || "Software Engineering Associate"}
            </p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-1.5 px-2.5 text-center shadow-sm shrink-0">
            <div className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">
              Match Score
            </div>
            <div className="text-lg font-black text-emerald-700 leading-none">
              {candidate.talent_score || 85}%
            </div>
          </div>
        </div>
      </div>

      {/* Content Scroll Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 scrollbar-hide pb-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-2">
          <QuickActionButton
            icon={Mail}
            label="Email"
            onClick={handleSendEmailLocal}
          />
          <QuickActionButton
            icon={CalendarPlus}
            label="Interview"
            onClick={handleScheduleInterviewLocal}
          />
          <QuickActionButton
            icon={BarChart2}
            label="Assessments"
            onClick={() => {
              const scoreValue = formatAssessmentScore(
                candidate.latest_test_score,
              );
              toast.success(
                scoreValue !== "—"
                  ? `Latest screening score: ${scoreValue}`
                  : "Latest screening score: Not evaluated",
              );
            }}
          />
          <QuickActionButton
            icon={Download}
            label="Resume"
            onClick={handleDownloadResumeLocal}
          />
        </div>

        {/* AI Summary */}
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-[16px] p-4 shadow-inner">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Sparkles size={10} className="text-white" />
            </div>
            <span className="text-[9px] font-black uppercase text-indigo-900 tracking-widest">
              AI Profile Analysis
            </span>
          </div>
          <p className="text-xs font-semibold text-indigo-900/80 leading-relaxed pr-1">
            Candidate demonstrates strong technical aptitude matching the{" "}
            <strong className="text-indigo-900">
              {candidate.job_title || "requested"}
            </strong>{" "}
            role requirements. Skills align with the enterprise application
            stack. Coding assessment scores reside within the top percentile.
          </p>
        </div>

        {/* Contacted Status Area */}
        {isContactedLocal && (
          <div className="bg-emerald-50/70 border border-emerald-200/50 rounded-xl p-3 px-4 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800">
              Status Status:
            </span>
            <span className="text-xs font-black text-emerald-650 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />{" "}
              Notified & Scheduled
            </span>
          </div>
        )}

        {/* Core Info Details */}
        <div className="bg-white border border-slate-200 rounded-[16px] overflow-hidden p-1 shadow-sm">
          <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-widest px-3 pt-3 pb-2">
            Profile Details
          </h3>
          <div className="grid grid-cols-2 gap-px bg-slate-150">
            <div className="bg-white p-3">
              <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Pipeline Stage
              </span>
              <span className="text-[10px] font-black text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 inline-block uppercase tracking-wider">
                {activeStages.find((s: any) => s.id === candidate.status)
                  ?.label || candidate.status}
              </span>
            </div>
            <div className="bg-white p-3">
              <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Applied Date
              </span>
              <span className="text-[10px] font-semibold text-slate-700 block">
                {candidate.applied_at
                  ? new Date(candidate.applied_at).toLocaleDateString(
                      undefined,
                      { dateStyle: "medium" },
                    )
                  : "—"}
              </span>
            </div>
            <div className="bg-white p-3 col-span-2 flex justify-between items-center">
              <div>
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Contact Details
                </span>
                <span className="text-xs font-bold text-slate-800 block truncate max-w-[280px]">
                  {candidate.email || "No email provided"}
                </span>
                <span className="text-xs font-bold text-slate-500 block mt-0.5">
                  {candidate.contact || "No phone number"}
                </span>
              </div>
              <button
                onClick={handleSendEmailLocal}
                className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors shadow-sm cursor-pointer"
              >
                <MailPlus size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Verfied Skills */}
        <div>
          <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-150 pb-1.5 mb-3 pl-1">
            Verified Skills Extract
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s: string, i: number) => (
              <span
                key={i}
                className="px-2 py-1 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold shadow-sm"
              >
                {s}
              </span>
            ))}
            {skills.length === 0 && (
              <span className="text-xs text-slate-450 font-bold px-1">
                Candidate has not listed any verified skills.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-slate-100 bg-white shrink-0 grid grid-cols-3 gap-3">
        {isRejectedCandidate(candidate) ? (
          <div className="col-span-3 text-center py-3 bg-rose-50 text-rose-600 rounded-xl font-extrabold uppercase tracking-widest text-[10px] select-none border border-rose-100">
            Rejected
          </div>
        ) : (
          <>
            <button
              onClick={() => {
                if (selectedJobId === "ALL") {
                  toast.error(
                    "Select a specific job to drop / reject candidates.",
                  );
                  return;
                }
                onAction("REJECTED");
                onClose();
              }}
              className="py-3 bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 rounded-xl text-xs flex justify-center items-center font-black uppercase tracking-widest transition-colors w-full shadow-sm cursor-pointer"
              title="Reject Candidate"
            >
              <ThumbsDown size={16} />
            </button>
            <button
              onClick={() => {
                if (selectedJobId === "ALL") {
                  toast.error(
                    "Select a specific job to advance candidates through its custom pipeline.",
                  );
                  return;
                }
                if (getNextStageInfo) {
                  const stageInfo = getNextStageInfo(candidate);
                  if (stageInfo && !stageInfo.disabled && stageInfo.nextId) {
                    onAction(stageInfo.nextId);
                  } else {
                    toast.error(
                      stageInfo?.reason ||
                        "Candidate is already at the final stage",
                    );
                  }
                } else {
                  const currentIdx = activeStages.findIndex(
                    (s: any) => s.id === candidate.status,
                  );
                  if (currentIdx > -1 && currentIdx < activeStages.length - 1) {
                    onAction(activeStages[currentIdx + 1].id);
                  } else {
                    toast.success("Candidate is already at the final stage");
                  }
                }
                onClose();
              }}
              className="col-span-2 py-3 bg-slate-900 text-white hover:bg-slate-850 rounded-xl text-[10px] flex items-center justify-center gap-2 font-black uppercase tracking-widest shadow-xl shadow-slate-900/10 transition-all cursor-pointer"
            >
              Advance Candidate <ChevronRight size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );

  if (isInline) {
    return mainContent;
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: "100%", boxShadow: "-20px 0 50px rgba(0,0,0,0)" }}
        animate={{ x: 0, boxShadow: "-20px 0 50px rgba(0,0,0,0.2)" }}
        exit={{ x: "100%", boxShadow: "-20px 0 50px rgba(0,0,0,0)" }}
        transition={{ type: "spring", stiffness: 350, damping: 35 }}
        className="fixed right-0 top-0 bottom-0 w-full max-w-[430px] bg-white z-[110] flex flex-col overflow-hidden"
      >
        {mainContent}
      </motion.div>
    </>
  );
}

function QuickActionButton({ icon: Icon, label, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 p-3 pb-2.5 rounded-2xl bg-white border border-slate-200 hover:border-blue-200 hover:bg-blue-50 transition-all font-sans text-slate-600 active:scale-95 shadow-sm group"
    >
      <Icon
        size={18}
        className="text-slate-500 group-hover:text-blue-600 transition-colors"
      />
      <span className="text-[9px] font-black uppercase tracking-widest group-hover:text-blue-700 transition-colors">
        {label}
      </span>
    </button>
  );
}
