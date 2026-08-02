import db from "../db.ts";
import { isJobActive, isJobEnded, getJobLifecycleStatus } from "./jobLifecycleService.ts";
import { getPipelineSnapshot, mapStageToCanonicalKey } from "./pipelineSnapshotService.ts";

export const APPROVED_SUGGESTION_TEMPLATES = [
  "Rewrite the job title and opening summary so the role and expected outcomes are immediately clear.",
  "Separate must-have skills from preferred skills to avoid discouraging qualified applicants.",
  "Review compensation, benefits and work-mode information and present them more clearly.",
  "Reduce unnecessary screening stages and simplify the candidate journey.",
  "Shorten recruiter feedback time and establish clear stage-level response expectations.",
  "Expand sourcing channels and promote the opening to more relevant candidate groups.",
  "Improve employer-brand and job-related posts with clearer value propositions and calls to action.",
  "Review Assessment difficulty, cutoff score and question relevance for the role.",
  "Schedule interview blocks earlier and avoid long gaps between candidate stages.",
  "Repost or promote the opening during periods when the Company’s content receives higher engagement."
];

export async function getCompanyAnalyticsMetrics(params: {
  companyId: number;
  userId?: number;
  isSubHr?: boolean;
  assignedJobIds?: number[];
  jobStatus?: string;
  jobId?: string | number;
  days?: string | number;
  hrUserId?: string | number;
}) {
  const companyId = Number(params.companyId);
  const userId = params.userId ? Number(params.userId) : undefined;
  const isSubHr = Boolean(params.isSubHr);
  const assignedJobIds = params.assignedJobIds || [];
  const rawJobStatus = String(params.jobStatus || 'all').toLowerCase();
  const jobStatus = rawJobStatus === 'ended' || rawJobStatus === 'inactive' ? 'ended' : rawJobStatus === 'active' ? 'active' : 'all';
  const targetJobId = params.jobId && params.jobId !== 'all' ? Number(params.jobId) : null;
  const daysParam = params.days && params.days !== 'all' ? Number(params.days) : null;
  const cutoffDate = daysParam && !isNaN(daysParam) && daysParam > 0 ? new Date(Date.now() - daysParam * 86400000) : null;

  // 0. Recruiter / HR Filter handling
  let hrAssignedJobIds: Set<number> | null = null;
  let hrAssignedAppIds: Set<number> | null = null;
  const targetHrUserId = params.hrUserId && params.hrUserId !== 'all' ? Number(params.hrUserId) : null;

  if (targetHrUserId) {
    const [hrCheck]: any = await db.query(
      "SELECT user_id FROM company_hr_profiles WHERE company_id = ? AND user_id = ?",
      [companyId, targetHrUserId]
    );
    const [compCheck]: any = await db.query(
      "SELECT user_id FROM company_profiles WHERE id = ? AND user_id = ?",
      [companyId, targetHrUserId]
    );

    if ((!hrCheck || hrCheck.length === 0) && (!compCheck || compCheck.length === 0)) {
      hrAssignedJobIds = new Set<number>();
      hrAssignedAppIds = new Set<number>();
    } else {
      const [jobAssignments]: any = await db.query(
        "SELECT job_id FROM company_job_assignments WHERE company_id = ? AND assigned_hr_user_id = ?",
        [companyId, targetHrUserId]
      );
      const [appAssignments]: any = await db.query(
        "SELECT application_id, job_id FROM company_application_assignments WHERE company_id = ? AND assigned_hr_user_id = ?",
        [companyId, targetHrUserId]
      );

      hrAssignedJobIds = new Set<number>();
      hrAssignedAppIds = new Set<number>();
      (jobAssignments || []).forEach((a: any) => hrAssignedJobIds!.add(Number(a.job_id)));
      (appAssignments || []).forEach((a: any) => {
        hrAssignedJobIds!.add(Number(a.job_id));
        hrAssignedAppIds!.add(Number(a.application_id));
      });
    }
  }

  // 1. Query all company jobs
  const [allJobsRows]: any = await db.query(
    "SELECT id, title, description, status, deadline, ended_at, pipeline_ended_at, openings, created_at, application_start_date FROM jobs WHERE company_id = ?",
    [companyId]
  );

  let companyJobs: any[] = allJobsRows || [];

  if (isSubHr) {
    if (assignedJobIds.length > 0) {
      companyJobs = companyJobs.filter((j: any) => assignedJobIds.includes(Number(j.id)));
    } else {
      companyJobs = [];
    }
  }

  if (hrAssignedJobIds !== null) {
    if (hrAssignedJobIds.size > 0 || (hrAssignedAppIds && hrAssignedAppIds.size > 0)) {
      companyJobs = companyJobs.filter((j: any) => hrAssignedJobIds!.has(Number(j.id)));
    } else {
      companyJobs = [];
    }
  }

  let filteredJobs = companyJobs;
  if (targetJobId) {
    filteredJobs = filteredJobs.filter((j: any) => Number(j.id) === targetJobId);
  }

  if (jobStatus === 'active') {
    filteredJobs = filteredJobs.filter(isJobActive);
  } else if (jobStatus === 'ended') {
    filteredJobs = filteredJobs.filter(isJobEnded);
  }

  // 2. Filter options for UI select dropdowns
  const jobsOptions = companyJobs.map((j: any) => {
    const ended = isJobEnded(j);
    const hasSuffix = String(j.title).toLowerCase().endsWith('(ended)');
    return {
      id: j.id,
      title: ended && !hasSuffix ? `${j.title} (Ended)` : j.title,
      status: ended ? 'CLOSED' : 'OPEN',
      isEnded: ended,
      isActive: isJobActive(j)
    };
  });

  const [hrRows]: any = await db.query(
    `SELECT ch.id, ch.user_id, u.email, u.email as full_name
     FROM company_hr_profiles ch
     JOIN users u ON ch.user_id = u.id
     WHERE ch.company_id = ?`,
    [companyId]
  );
  const hrTeam = (hrRows || []).map((h: any) => ({
    id: h.user_id || h.id,
    name: h.full_name || h.email,
    email: h.email
  }));

  // 3. Get canonical Pipeline Snapshot
  const snapshot = await getPipelineSnapshot(companyId, {
    scope: jobStatus as 'all' | 'active' | 'ended',
    jobId: targetJobId || undefined,
    userId: userId
  });

  // 4. Query Applications with Stage and Student Details
  const appQuery = `
    SELECT 
      ja.id as application_id,
      ja.job_id,
      ja.student_id,
      ja.status,
      ja.current_stage_id,
      ja.rejection_stage_id,
      ja.rejection_feedback,
      ja.rejection_feedback as rejection_reason,
      ja.rejected_at,
      ja.rejected_by_user_id,
      ja.applied_at,
      j.title as job_title,
      j.openings,
      j.status as job_status,
      j.deadline,
      j.ended_at,
      j.pipeline_ended_at,
      js.stage_name as current_stage_name,
      js.stage_type as current_stage_type,
      js.stage_order as current_stage_order,
      sp.full_name,
      sp.skills_json,
      sp.resume_url,
      u.email,
      ts.overall_score as talent_score,
      sps.avg_interview_score
    FROM job_applications ja
    JOIN jobs j ON ja.job_id = j.id
    LEFT JOIN job_stages js ON ja.current_stage_id = js.id
    LEFT JOIN student_profiles sp ON ja.student_id = sp.id
    LEFT JOIN users u ON sp.user_id = u.id
    LEFT JOIN talent_scores ts ON u.id = ts.user_id
    LEFT JOIN student_performance_stats sps ON u.id = sps.user_id
    WHERE j.company_id = ?
  `;
  const [allAppsRows]: any = await db.query(appQuery, [companyId]);

  // Fallback for missing stage details
  for (const app of (allAppsRows || [])) {
    if (!app.current_stage_id || !app.current_stage_name) {
      try {
        const [hist]: any = await db.query(
          `SELECT ah.stage_id, js.stage_name, js.stage_type, js.stage_order
           FROM application_history ah
           JOIN job_stages js ON ah.stage_id = js.id
           WHERE ah.application_id = ? AND js.job_id = ?
           ORDER BY ah.created_at DESC, ah.id DESC
           LIMIT 1`,
          [app.application_id, app.job_id]
        );
        if (hist && hist.length > 0) {
          app.current_stage_id = hist[0].stage_id;
          app.current_stage_name = hist[0].stage_name;
          app.current_stage_type = hist[0].stage_type;
          app.current_stage_order = hist[0].stage_order;
        }
      } catch (e) {}
    }
  }

  const scopedApps = (allAppsRows || []).filter((a: any) => {
    if (targetJobId && Number(a.job_id) !== targetJobId) return false;

    const active = isJobActive({ status: a.job_status, deadline: a.deadline, ended_at: a.ended_at, pipeline_ended_at: a.pipeline_ended_at });
    const ended = isJobEnded({ status: a.job_status, deadline: a.deadline, ended_at: a.ended_at, pipeline_ended_at: a.pipeline_ended_at });
    if (jobStatus === 'active' && !active) return false;
    if (jobStatus === 'ended' && !ended) return false;

    if (isSubHr && !assignedJobIds.includes(Number(a.job_id))) return false;

    if (hrAssignedJobIds !== null && hrAssignedAppIds !== null) {
      const jobAllowed = hrAssignedJobIds.has(Number(a.job_id));
      const appAllowed = hrAssignedAppIds.has(Number(a.application_id));
      if (!jobAllowed && !appAllowed) return false;
    }

    if (cutoffDate && a.applied_at) {
      const appDate = new Date(a.applied_at);
      if (isNaN(appDate.getTime()) || appDate < cutoffDate) return false;
    }

    return true;
  });

  // Query application history for scoped apps
  const appIds = scopedApps.map((a: any) => Number(a.application_id));
  let historyRows: any[] = [];
  if (appIds.length > 0) {
    const [hRows]: any = await db.query(
      `SELECT ah.id, ah.application_id, ah.stage_id, ah.action, ah.created_at, js.stage_name, js.stage_type, js.stage_order
       FROM application_history ah
       LEFT JOIN job_stages js ON ah.stage_id = js.id
       WHERE ah.application_id IN (${appIds.join(',')})
       ORDER BY ah.created_at ASC, ah.id ASC`
    );
    historyRows = hRows || [];
  }

  // Calculate Core Stats
  const totalJobsCount = filteredJobs.length;
  const activeJobsCount = filteredJobs.filter(isJobActive).length;
  const endedJobsCount = filteredJobs.filter(isJobEnded).length;

  const [viewsCountRow]: any = await db.query("SELECT COUNT(*) as totalViews FROM profile_views WHERE company_id = ?", [companyId]);
  const totalViews = viewsCountRow[0]?.totalViews || 0;

  const totalHires = scopedApps.filter((a: any) => String(a.status).toUpperCase() === 'HIRED').length;
  const totalApplicants = snapshot.summary.totalApplicants;
  const inPipeline = snapshot.summary.inPipeline;
  const inInterview = snapshot.summary.inInterview;
  const shortlisted = snapshot.summary.selected;
  const rejected = snapshot.summary.rejected;

  const stats = {
    totalJobs: totalJobsCount,
    activeJobs: activeJobsCount,
    endedJobs: endedJobsCount,
    totalApplicants,
    totalApps: totalApplicants,
    inPipeline,
    candidatesInPipeline: inPipeline,
    inInterview,
    shortlisted,
    totalShortlisted: shortlisted,
    totalSelected: shortlisted,
    rejected,
    totalRejected: rejected,
    hired: totalHires,
    totalHires,
    totalHired: totalHires,
    totalViews,
    applicationRate: totalViews > 0 ? Math.round((totalApplicants / totalViews) * 100) : 0
  };

  // 5. Funnel Overview
  const funnelData = [
    { stage: 'Applied', name: 'Applied', value: snapshot.stages.applied.count, count: snapshot.stages.applied.count },
    { stage: 'AI Screening', name: 'AI Screening', value: snapshot.stages.aiScreening.count, count: snapshot.stages.aiScreening.count },
    { stage: 'Assessment', name: 'Assessment', value: snapshot.stages.assessment.count, count: snapshot.stages.assessment.count },
    { stage: 'Technical Interview', name: 'Technical Interview', value: snapshot.stages.technicalInterview.count, count: snapshot.stages.technicalInterview.count },
    { stage: 'HR Interview', name: 'HR Interview', value: snapshot.stages.hrInterview.count, count: snapshot.stages.hrInterview.count },
    { stage: 'Shortlisted', name: 'Shortlisted', value: snapshot.stages.selected.count, count: snapshot.stages.selected.count },
    { stage: 'Rejected', name: 'Rejected', value: snapshot.stages.rejected.count, count: snapshot.stages.rejected.count }
  ];

  // 6. Job-wise Application Performance
  const jobwiseApplications = filteredJobs.map((j: any) => {
    const jApps = scopedApps.filter((a: any) => Number(a.job_id) === Number(j.id));
    const totalApplications = jApps.length;

    const progressedApps = jApps.filter((a: any) => {
      const aHist = historyRows.filter((h: any) => Number(h.application_id) === Number(a.application_id));
      const movedPastApplied = aHist.some((h: any) => h.action !== 'APPLIED' && h.action !== 'INITIAL' && h.action !== 'APPLICATION');
      return movedPastApplied || (a.current_stage_order && Number(a.current_stage_order) > 1);
    });

    let currentInPipeline = 0;
    let currentInInterview = 0;
    let shortlistedCount = 0;
    let rejectedCount = 0;

    jApps.forEach((a: any) => {
      const mappedKey = mapStageToCanonicalKey(a).key;
      if (mappedKey === 'selected') shortlistedCount++;
      else if (mappedKey === 'rejected') rejectedCount++;
      else {
        currentInPipeline++;
        if (mappedKey === 'technicalInterview' || mappedKey === 'hrInterview') {
          currentInInterview++;
        }
      }
    });

    const hiredCount = jApps.filter((a: any) => String(a.status).toUpperCase() === 'HIRED').length;
    const openings = Number(j.openings || 1);
    const openingFillPercentage = openings > 0 ? Math.round((hiredCount / openings) * 100) : 0;

    let sumFirstProgressDays = 0;
    let countFirstProgress = 0;
    let sumShortlistDays = 0;
    let countShortlist = 0;
    let sumHireDays = 0;
    let countHire = 0;

    jApps.forEach((a: any) => {
      const appliedTime = new Date(a.applied_at).getTime();
      if (isNaN(appliedTime)) return;

      const aHist = historyRows.filter((h: any) => Number(h.application_id) === Number(a.application_id));

      const firstProg = aHist.find((h: any) => h.action !== 'APPLIED' && h.action !== 'INITIAL' && h.action !== 'APPLICATION');
      if (firstProg) {
        const progTime = new Date(firstProg.created_at).getTime();
        if (progTime >= appliedTime) {
          sumFirstProgressDays += (progTime - appliedTime) / (1000 * 60 * 60 * 24);
          countFirstProgress++;
        }
      }

      const shortlistProg = aHist.find((h: any) => ['SELECTED', 'SHORTLISTED', 'SHORTLISTED_FOR_HIRE', 'MOVED_TO_SELECTED'].includes(String(h.action).toUpperCase()));
      if (shortlistProg) {
        const sTime = new Date(shortlistProg.created_at).getTime();
        if (sTime >= appliedTime) {
          sumShortlistDays += (sTime - appliedTime) / (1000 * 60 * 60 * 24);
          countShortlist++;
        }
      }

      if (String(a.status).toUpperCase() === 'HIRED') {
        const hireProg = aHist.find((h: any) => ['HIRED', 'MOVED_TO_HIRED'].includes(String(h.action).toUpperCase()));
        if (hireProg) {
          const hTime = new Date(hireProg.created_at).getTime();
          if (hTime >= appliedTime) {
            sumHireDays += (hTime - appliedTime) / (1000 * 60 * 60 * 24);
            countHire++;
          }
        }
      }
    });

    const averageDaysToFirstProgress = countFirstProgress > 0 ? Math.round((sumFirstProgressDays / countFirstProgress) * 10) / 10 : null;
    const averageDaysToShortlist = countShortlist > 0 ? Math.round((sumShortlistDays / countShortlist) * 10) / 10 : null;
    const averageDaysToHire = countHire > 0 ? Math.round((sumHireDays / countHire) * 10) / 10 : null;

    return {
      jobId: Number(j.id),
      jobTitle: j.title,
      lifecycleStatus: isJobActive(j) ? 'ACTIVE' : 'ENDED',
      openings,
      totalApplications,
      progressedBeyondApplied: progressedApps.length,
      currentInPipeline,
      currentInInterview,
      shortlisted: shortlistedCount,
      hired: hiredCount,
      rejected: rejectedCount,
      applicationToShortlistPercentage: totalApplications > 0 ? Math.round((shortlistedCount / totalApplications) * 100) : 0,
      applicationToHirePercentage: totalApplications > 0 ? Math.round((hiredCount / totalApplications) * 100) : 0,
      openingFillPercentage,
      averageDaysToFirstProgress,
      averageDaysToShortlist,
      averageDaysToHire
    };
  });

  // 7. Stage Conversion Rate (Actual historical stage reach)
  const reachedApplied = scopedApps.length;

  const reachedScreening = scopedApps.filter((a: any) => {
    const aHist = historyRows.filter((h: any) => Number(h.application_id) === Number(a.application_id));
    const isCurrentScreening = ['SCREENING', 'AI_SCREENING', 'RESUME_SCREENING'].includes(String(a.current_stage_type).toUpperCase()) ||
      String(a.current_stage_name || '').toUpperCase().includes('SCREEN') || String(a.current_stage_name || '').toUpperCase().includes('AI');
    const isHistScreening = aHist.some((h: any) => {
      const t = String(h.stage_type || '').toUpperCase();
      const n = String(h.stage_name || '').toUpperCase();
      const act = String(h.action || '').toUpperCase();
      return t === 'SCREENING' || t === 'AI_SCREENING' || act === 'SCREENING' || act === 'AI_SCREENING' || n.includes('SCREEN') || n.includes('AI');
    });
    return isCurrentScreening || isHistScreening;
  }).length;

  const reachedAssessment = scopedApps.filter((a: any) => {
    const aHist = historyRows.filter((h: any) => Number(h.application_id) === Number(a.application_id));
    const isCurrentAssess = ['TEST', 'ASSESSMENT', 'SKILL_ASSESSMENT'].includes(String(a.current_stage_type).toUpperCase()) ||
      String(a.current_stage_name || '').toUpperCase().includes('TEST') || String(a.current_stage_name || '').toUpperCase().includes('ASSESS');
    const isHistAssess = aHist.some((h: any) => {
      const t = String(h.stage_type || '').toUpperCase();
      const n = String(h.stage_name || '').toUpperCase();
      const act = String(h.action || '').toUpperCase();
      return t === 'TEST' || t === 'ASSESSMENT' || act === 'TEST' || act === 'ASSESSMENT' || n.includes('TEST') || n.includes('ASSESS');
    });
    return isCurrentAssess || isHistAssess;
  }).length;

  const reachedTechInterview = scopedApps.filter((a: any) => {
    const aHist = historyRows.filter((h: any) => Number(h.application_id) === Number(a.application_id));
    const isCurrentTech = String(a.current_stage_type).toUpperCase().includes('INTERVIEW') ||
      (String(a.current_stage_name || '').toUpperCase().includes('INTERVIEW') && !String(a.current_stage_name || '').toUpperCase().includes('HR'));
    const isHistTech = aHist.some((h: any) => {
      const t = String(h.stage_type || '').toUpperCase();
      const n = String(h.stage_name || '').toUpperCase();
      const act = String(h.action || '').toUpperCase();
      return t.includes('INTERVIEW') || act.includes('INTERVIEW') || (n.includes('INTERVIEW') && !n.includes('HR'));
    });
    return isCurrentTech || isHistTech;
  }).length;

  const reachedHrInterview = scopedApps.filter((a: any) => {
    const aHist = historyRows.filter((h: any) => Number(h.application_id) === Number(a.application_id));
    const isCurrentHr = String(a.current_stage_type).toUpperCase().includes('HR') || String(a.current_stage_name || '').toUpperCase().includes('HR');
    const isHistHr = aHist.some((h: any) => {
      const t = String(h.stage_type || '').toUpperCase();
      const n = String(h.stage_name || '').toUpperCase();
      const act = String(h.action || '').toUpperCase();
      return t.includes('HR') || act.includes('HR') || n.includes('HR');
    });
    return isCurrentHr || isHistHr;
  }).length;

  const reachedShortlisted = scopedApps.filter((a: any) => {
    const aHist = historyRows.filter((h: any) => Number(h.application_id) === Number(a.application_id));
    const isCurrentShort = mapStageToCanonicalKey(a).key === 'selected' || String(a.status).toUpperCase() === 'HIRED';
    const isHistShort = aHist.some((h: any) => {
      const act = String(h.action || '').toUpperCase();
      return ['SELECTED', 'SHORTLISTED', 'HIRED', 'OFFER', 'MOVED_TO_SELECTED', 'MOVED_TO_HIRED'].includes(act);
    });
    return isCurrentShort || isHistShort;
  }).length;

  const stageConversion = [
    { stage: 'Applied to AI Screening', fromCount: reachedApplied, toCount: reachedScreening, rate: reachedApplied > 0 ? Math.round((reachedScreening / reachedApplied) * 100) : 0 },
    { stage: 'AI Screening to Assessment', fromCount: reachedScreening, toCount: reachedAssessment, rate: reachedScreening > 0 ? Math.round((reachedAssessment / reachedScreening) * 100) : 0 },
    { stage: 'Assessment to Tech Interview', fromCount: reachedAssessment, toCount: reachedTechInterview, rate: reachedAssessment > 0 ? Math.round((reachedTechInterview / reachedAssessment) * 100) : 0 },
    { stage: 'Tech Interview to HR Interview', fromCount: reachedTechInterview, toCount: reachedHrInterview, rate: reachedTechInterview > 0 ? Math.round((reachedHrInterview / reachedTechInterview) * 100) : 0 },
    { stage: 'HR Interview to Shortlisted', fromCount: reachedHrInterview, toCount: reachedShortlisted, rate: reachedHrInterview > 0 ? Math.round((reachedShortlisted / reachedHrInterview) * 100) : 0 }
  ];

  // 8. Time-to-Hire Analytics
  const hiredApps = scopedApps.filter((a: any) => String(a.status).toUpperCase() === 'HIRED');
  const hireDurations: number[] = [];

  hiredApps.forEach((a: any) => {
    const appliedMs = new Date(a.applied_at).getTime();
    if (isNaN(appliedMs)) return;

    const aHist = historyRows.filter((h: any) => Number(h.application_id) === Number(a.application_id));
    const hiredProg = aHist.find((h: any) => ['HIRED', 'MOVED_TO_HIRED'].includes(String(h.action).toUpperCase()));

    if (hiredProg) {
      const hiredMs = new Date(hiredProg.created_at).getTime();
      if (!isNaN(hiredMs) && hiredMs >= appliedMs) {
        hireDurations.push(Math.round((hiredMs - appliedMs) / (1000 * 60 * 60 * 24)));
      }
    } else {
      console.warn(`[Data Quality Issue] Hired application ${a.application_id} missing confirmed hire timestamp in application_history.`);
    }
  });

  const timeToHireJobWise = jobwiseApplications
    .filter((j: any) => j.hired > 0 && j.averageDaysToHire !== null)
    .map((j: any) => ({
      jobId: j.jobId,
      jobTitle: j.jobTitle,
      hiredCount: j.hired,
      avgDays: j.averageDaysToHire
    }));

  const timeToHire = {
    hiredCount: hiredApps.length,
    overallAvgDays: hireDurations.length > 0 ? Math.round((hireDurations.reduce((sum, d) => sum + d, 0) / hireDurations.length) * 10) / 10 : null,
    shortestDays: hireDurations.length > 0 ? Math.min(...hireDurations) : null,
    longestDays: hireDurations.length > 0 ? Math.max(...hireDurations) : null,
    jobWise: timeToHireJobWise
  };

  // 9. Time-in-Stage Metrics
  const canonicalStageDefs = [
    { key: 'applied', label: 'Applied' },
    { key: 'aiScreening', label: 'AI Screening' },
    { key: 'assessment', label: 'Assessment' },
    { key: 'technicalInterview', label: 'Technical Interview' },
    { key: 'hrInterview', label: 'HR Interview' },
    { key: 'selected', label: 'Shortlisted' }
  ];

  const nowMs = Date.now();

  const timeInStage = canonicalStageDefs.map((sObj) => {
    let candidateDwells: number[] = [];

    scopedApps.forEach((a: any) => {
      const aHist = historyRows.filter((h: any) => Number(h.application_id) === Number(a.application_id));

      if (sObj.key === 'applied') {
        const appliedMs = new Date(a.applied_at).getTime();
        if (isNaN(appliedMs)) return;
        const firstTrans = aHist.find((h: any) => h.action !== 'APPLIED' && h.action !== 'INITIAL' && h.action !== 'APPLICATION');
        const exitMs = firstTrans ? new Date(firstTrans.created_at).getTime() : nowMs;
        if (exitMs >= appliedMs) {
          candidateDwells.push((exitMs - appliedMs) / (1000 * 60 * 60 * 24));
        }
      } else {
        const entryHistIdx = aHist.findIndex((h: any) => {
          const t = String(h.stage_type || '').toUpperCase();
          const n = String(h.stage_name || '').toUpperCase();
          const act = String(h.action || '').toUpperCase();
          if (sObj.key === 'aiScreening') return t === 'AI_SCREENING' || act === 'AI_SCREENING' || n.includes('SCREEN') || n.includes('AI');
          if (sObj.key === 'assessment') return t === 'TEST' || t === 'ASSESSMENT' || act === 'TEST' || act === 'ASSESSMENT' || n.includes('TEST') || n.includes('ASSESS');
          if (sObj.key === 'technicalInterview') return t.includes('INTERVIEW') || act.includes('INTERVIEW') || (n.includes('INTERVIEW') && !n.includes('HR'));
          if (sObj.key === 'hrInterview') return t.includes('HR') || act.includes('HR') || n.includes('HR');
          if (sObj.key === 'selected') return ['SELECTED', 'SHORTLISTED', 'HIRED', 'OFFER', 'MOVED_TO_SELECTED', 'MOVED_TO_HIRED'].includes(act);
          return false;
        });

        if (entryHistIdx !== -1) {
          const entryMs = new Date(aHist[entryHistIdx].created_at).getTime();
          const nextHist = aHist[entryHistIdx + 1];
          const exitMs = nextHist ? new Date(nextHist.created_at).getTime() : nowMs;
          if (!isNaN(entryMs) && exitMs >= entryMs) {
            candidateDwells.push((exitMs - entryMs) / (1000 * 60 * 60 * 24));
          }
        } else if (mapStageToCanonicalKey(a).key === sObj.key) {
          const appliedMs = new Date(a.applied_at).getTime();
          if (!isNaN(appliedMs) && nowMs >= appliedMs) {
            candidateDwells.push((nowMs - appliedMs) / (1000 * 60 * 60 * 24));
          }
        }
      }
    });

    const intervalCount = candidateDwells.length;
    const totalDwell = candidateDwells.reduce((sum, d) => sum + d, 0);
    const avgDays = intervalCount > 0 ? Math.round((totalDwell / intervalCount) * 10) / 10 : 0;
    const longestWait = intervalCount > 0 ? Math.round(Math.max(...candidateDwells) * 10) / 10 : 0;
    const delayedCount = candidateDwells.filter(d => d > 7).length;

    return {
      stage: sObj.label,
      avgDays,
      longestWait,
      delayedCount,
      statusMessage: delayedCount === 0 ? "Moving Smoothly" : `${delayedCount} candidates delayed`,
      intervalCount
    };
  });

  // 10. Candidate Hold Alerts
  const activeJobsMap = new Map<number, any>();
  companyJobs.filter(isJobActive).forEach((j: any) => activeJobsMap.set(Number(j.id), j));

  // Query assigned HR for candidate hold alerts
  const [appAssignmentsRows]: any = await db.query(
    `SELECT caa.application_id, u.email as hr_email, u.email as hr_name
     FROM company_application_assignments caa
     JOIN users u ON caa.assigned_hr_user_id = u.id
     WHERE caa.company_id = ?`,
    [companyId]
  );
  const appHrMap = new Map<number, string>();
  (appAssignmentsRows || []).forEach((row: any) => {
    appHrMap.set(Number(row.application_id), row.hr_name || row.hr_email || 'Assigned HR');
  });

  const candidateHoldAlerts: any[] = [];

  scopedApps.forEach((a: any) => {
    const job = activeJobsMap.get(Number(a.job_id));
    if (!job) return;

    const mappedKey = mapStageToCanonicalKey(a).key;
    if (mappedKey === 'selected' || mappedKey === 'rejected') return;
    const statusUpper = String(a.status).toUpperCase();
    if (['HIRED', 'REJECTED', 'WITHDRAWN', 'CANCELLED', 'OFFER_ACCEPTED'].includes(statusUpper)) return;

    const appliedMs = new Date(a.applied_at).getTime();
    const aHist = historyRows.filter((h: any) => Number(h.application_id) === Number(a.application_id));
    const lastHist = aHist[aHist.length - 1];
    const lastTransitionMs = lastHist ? new Date(lastHist.created_at).getTime() : appliedMs;

    const daysInStage = Math.floor((nowMs - lastTransitionMs) / (1000 * 60 * 60 * 24));
    if (daysInStage > 7) {
      const candidateName = a.full_name || 'Candidate';
      const stageName = a.current_stage_name || 'Applied';
      const responsibleHr = appHrMap.get(Number(a.application_id)) || 'Unassigned';

      candidateHoldAlerts.push({
        candidateId: a.student_id,
        applicationId: a.application_id,
        candidateName,
        jobId: a.job_id,
        jobTitle: job.title,
        currentStage: stageName,
        daysInStage,
        lastTransitionDate: new Date(lastTransitionMs).toISOString().split('T')[0],
        responsibleHr,
        reason: `${candidateName} has been in ${stageName} for ${daysInStage} days without progress.`
      });
    }
  });

  candidateHoldAlerts.sort((a, b) => b.daysInStage - a.daysInStage);

  // 11. Top Performing Jobs
  const topPerformingJobs = [...jobwiseApplications]
    .sort((a, b) => {
      if (b.hired !== a.hired) return b.hired - a.hired;
      if (b.openingFillPercentage !== a.openingFillPercentage) return b.openingFillPercentage - a.openingFillPercentage;
      if (b.applicationToHirePercentage !== a.applicationToHirePercentage) return b.applicationToHirePercentage - a.applicationToHirePercentage;
      const aTime = a.averageDaysToHire ?? 999;
      const bTime = b.averageDaysToHire ?? 999;
      if (aTime !== bTime) return aTime - bTime;
      if (b.progressedBeyondApplied !== a.progressedBeyondApplied) return b.progressedBeyondApplied - a.progressedBeyondApplied;
      return b.totalApplications - a.totalApplications;
    })
    .slice(0, 5)
    .map((j: any, idx: number) => {
      const isZeroHires = j.hired === 0;
      const performanceLabel = isZeroHires
        ? 'Needs Improvement'
        : j.openingFillPercentage >= 80 || j.hired >= j.openings
        ? 'Excellent'
        : 'Good';

      const performanceReasons: string[] = [];
      if (j.hired > 0) {
        performanceReasons.push(`Filled ${j.hired} of ${j.openings} opening(s).`);
        performanceReasons.push(`Converted ${j.applicationToHirePercentage}% of applicants into confirmed hires.`);
        if (j.averageDaysToHire !== null) {
          performanceReasons.push(`Average hiring time was ${j.averageDaysToHire} days.`);
        }
      } else {
        performanceReasons.push(`Zero hires made against ${j.openings} opening(s).`);
        if (j.totalApplications > 0) {
          performanceReasons.push(`Received ${j.totalApplications} application(s).`);
        }
      }

      const progressionRate = j.totalApplications > 0 ? Math.round((j.progressedBeyondApplied / j.totalApplications) * 100) : 0;

      return {
        jobId: j.jobId,
        jobTitle: j.jobTitle,
        rank: idx + 1,
        totalApplications: j.totalApplications,
        openings: j.openings,
        hiredCount: j.hired,
        applicationToHirePercentage: j.applicationToHirePercentage,
        openingFillPercentage: j.openingFillPercentage,
        averageDaysToHire: j.averageDaysToHire,
        progressionRate,
        performanceLabel,
        performanceReasons
      };
    });

  // 12. Low Performing Jobs
  const allAppCounts = jobwiseApplications.map(j => j.totalApplications);
  const medianApps = allAppCounts.length > 0
    ? [...allAppCounts].sort((a, b) => a - b)[Math.floor(allAppCounts.length / 2)]
    : 0;

  const lowPerformingJobs = jobwiseApplications
    .filter((j: any) => j.totalApplications < medianApps || j.hired === 0 || j.openingFillPercentage < 50)
    .sort((a, b) => {
      if (a.hired !== b.hired) return a.hired - b.hired;
      if (a.openingFillPercentage !== b.openingFillPercentage) return a.openingFillPercentage - b.openingFillPercentage;
      if (a.totalApplications !== b.totalApplications) return a.totalApplications - b.totalApplications;
      return a.progressedBeyondApplied - b.progressedBeyondApplied;
    })
    .slice(0, 5)
    .map((j: any) => {
      let problemReason = "Low candidate progression and fill rate.";
      let suggestionIdx = 0;

      if (j.totalApplications < Math.max(3, medianApps)) {
        problemReason = `Applicant volume (${j.totalApplications}) is below company median (${medianApps}).`;
        suggestionIdx = 0;
      } else if (j.progressedBeyondApplied === 0) {
        problemReason = "No candidate has progressed beyond initial Applied stage.";
        suggestionIdx = 4;
      } else if (j.shortlisted === 0) {
        problemReason = "No candidate has reached Shortlisted.";
        suggestionIdx = 3;
      } else if (j.hired === 0 && j.openings > 0) {
        problemReason = `Zero hires made against ${j.openings} opening(s).`;
        suggestionIdx = 1;
      } else {
        problemReason = "High drop-off rate after interviews.";
        suggestionIdx = 8;
      }

      const performanceReasons = [
        problemReason,
        j.hired === 0 ? `Zero hires made against ${j.openings} opening(s).` : `Low opening fill rate (${j.openingFillPercentage}%).`
      ];

      return {
        jobId: j.jobId,
        jobTitle: j.jobTitle,
        metrics: {
          totalApplications: j.totalApplications,
          hiredCount: j.hired,
          openings: j.openings,
          openingFillPercentage: j.openingFillPercentage,
          progressedBeyondApplied: j.progressedBeyondApplied,
          shortlisted: j.shortlisted
        },
        performanceReasons,
        comparisons: {
          jobTotalApplications: j.totalApplications,
          companyMedianApplications: medianApps,
          applicantVolumeVsMedian: j.totalApplications < medianApps ? 'BELOW_MEDIAN' : 'AT_OR_ABOVE_MEDIAN'
        },
        suggestions: [APPROVED_SUGGESTION_TEMPLATES[suggestionIdx]]
      };
    });

  // 13. Drops Analytics
  let dropsSql = `
    SELECT 
      d.id,
      d.company_id,
      d.job_id,
      d.title,
      d.type,
      d.created_at,
      COALESCE(d.shares_count, 0) as shares,
      CASE WHEN COALESCE(d.views_count, 0) > COALESCE(v.view_cnt, 0) THEN COALESCE(d.views_count, 0) ELSE COALESCE(v.view_cnt, 0) END as views,
      CASE WHEN COALESCE(d.likes_count, 0) > COALESCE(l.like_cnt, 0) THEN COALESCE(d.likes_count, 0) ELSE COALESCE(l.like_cnt, 0) END as likes,
      CASE WHEN COALESCE(d.comments_count, 0) > COALESCE(c.comment_cnt, 0) THEN COALESCE(d.comments_count, 0) ELSE COALESCE(c.comment_cnt, 0) END as comments
    FROM drops d
    LEFT JOIN (
      SELECT drop_id, COUNT(DISTINCT viewer_user_id) as view_cnt 
      FROM drop_views 
      GROUP BY drop_id
    ) v ON v.drop_id = d.id
    LEFT JOIN (
      SELECT drop_id, COUNT(DISTINCT user_id) as like_cnt 
      FROM drop_likes 
      GROUP BY drop_id
    ) l ON l.drop_id = d.id
    LEFT JOIN (
      SELECT drop_id, COUNT(*) as comment_cnt 
      FROM drop_comments 
      GROUP BY drop_id
    ) c ON c.drop_id = d.id
    WHERE d.company_id = ?
  `;
  const dropsParams: any[] = [companyId];
  if (cutoffDate) {
    dropsSql += ` AND d.created_at >= ?`;
    dropsParams.push(cutoffDate.toISOString());
  }
  dropsSql += ` ORDER BY d.created_at DESC`;

  const [dropsRows]: any = await db.query(dropsSql, dropsParams);
  const rawDrops = dropsRows || [];

  const sortedByViews = [...rawDrops].sort((a, b) => a.views - b.views);
  const sortedByLikes = [...rawDrops].sort((a, b) => a.likes - b.likes);
  const sortedByComments = [...rawDrops].sort((a, b) => a.comments - b.comments);

  const getPercentileRank = (item: any, sortedList: any[]) => {
    if (sortedList.length <= 1) return 50;
    const idx = sortedList.findIndex(x => x.id === item.id);
    return Math.round(((idx + 1) / sortedList.length) * 100);
  };

  const dropsAnalytics = rawDrops.map((d: any) => {
    const viewPercentile = getPercentileRank(d, sortedByViews);
    const likePercentile = getPercentileRank(d, sortedByLikes);
    const commentPercentile = getPercentileRank(d, sortedByComments);

    const views = Number(d.views || 0);
    const likes = Number(d.likes || 0);
    const comments = Number(d.comments || 0);
    const shares = Number(d.shares || 0);

    const engagementScore = Math.round((viewPercentile + likePercentile + commentPercentile) / 3);
    let engagementLabel = 'Average';
    if (engagementScore >= 70) engagementLabel = 'High';
    else if (engagementScore < 40) engagementLabel = 'Low';

    const engagementRate = views > 0 ? Math.round(((likes + comments + shares) / views) * 1000) / 10 : 0;
    const associatedJob = companyJobs.find((j: any) => Number(j.id) === Number(d.job_id));

    return {
      id: d.id,
      title: d.title,
      type: d.type,
      views,
      likes,
      comments,
      shares,
      viewPercentile,
      likePercentile,
      commentPercentile,
      engagementRate,
      engagementScore,
      engagementPercentile: engagementScore,
      engagementLabel,
      associatedJobId: d.job_id || null,
      associatedJobTitle: associatedJob ? associatedJob.title : null,
      postCategoryLabel: associatedJob ? `Job: ${associatedJob.title}` : 'Brand Post',
      publishDate: d.created_at ? new Date(d.created_at).toISOString().split('T')[0] : 'Recently'
    };
  });

  // Flatten applicants across snapshot buckets
  const snapshotAll = await getPipelineSnapshot(companyId, {
    scope: 'all',
    jobId: targetJobId || undefined,
    userId: userId
  });

  const stageKeys: (keyof typeof snapshotAll.stages)[] = [
    'applied',
    'aiScreening',
    'assessment',
    'technicalInterview',
    'hrInterview',
    'selected',
    'rejected'
  ];

  const applicants: any[] = [];
  for (const bKey of stageKeys) {
    const bucketCandidates = snapshotAll.stages[bKey]?.candidates || [];
    for (const cand of bucketCandidates) {
      applicants.push({
        ...cand,
        application_id: Number(cand.application_id || cand.applicationId),
        job_id: Number(cand.job_id || cand.jobId),
        student_id: Number(cand.student_id || cand.studentId),
        full_name: cand.full_name || cand.student_name || cand.fullName || "",
        email: cand.email || cand.student_email || "",
        job_title: cand.job_title || "",
        applied_at: cand.applied_at || null,
        raw_status: cand.raw_status || cand.status || cand.app_status || "",
        canonical_stage_key: bKey,
        current_stage_id: cand.current_stage_id ?? null,
        current_stage_name: cand.current_stage_name ?? null,
        current_stage_type: cand.current_stage_type ?? null,
        talent_score: cand.talent_score ?? null,
        skills_json: cand.skills_json ?? null,
        latest_test_attempt_id: cand.latest_test_attempt_id ?? null,
        latest_test_assignment_id: cand.latest_test_assignment_id ?? null,
        latest_test_score: cand.latest_test_score ?? null,
        latest_test_total_marks: cand.latest_test_total_marks ?? null,
        latest_test_percentage: cand.latest_test_percentage ?? null,
        latest_test_passed: cand.latest_test_passed !== undefined && cand.latest_test_passed !== null ? (cand.latest_test_passed ? 1 : 0) : null,
        latest_test_cutoff: cand.latest_test_cutoff ?? null,
        latest_test_status: cand.latest_test_status ?? null,
        latest_test_violations_count: cand.latest_test_violations_count ?? null,
        latest_test_integrity_flag: cand.latest_test_integrity_flag ?? null,
        avg_interview_score: cand.avg_interview_score ?? null,
        rejected_at: cand.rejected_at ?? null,
        rejection_reason: cand.rejection_reason || cand.rejection_feedback || null,
        rejection_feedback: cand.rejection_feedback || cand.rejection_reason || null,
        rejection_stage_id: cand.rejection_stage_id ?? null,
        rejection_stage_name: cand.rejection_stage_name ?? null,
        rejected_by_user_id: cand.rejected_by_user_id ?? null
      });
    }
  }

  // Scope Metrics calculation
  const scopedAppIdSet = new Set(scopedApps.map((a: any) => Number(a.application_id)));
  const filteredApplicants = applicants.filter((a: any) => scopedAppIdSet.has(Number(a.application_id)));

  const activeJobsList = companyJobs.filter(isJobActive);
  const endedJobsList = companyJobs.filter(isJobEnded);

  const activeJobIdSet = new Set(activeJobsList.map((j: any) => Number(j.id)));
  const endedJobIdSet = new Set(endedJobsList.map((j: any) => Number(j.id)));

  const activeAppsList = filteredApplicants.filter(a => activeJobIdSet.has(Number(a.job_id)));
  const endedAppsList = filteredApplicants.filter(a => endedJobIdSet.has(Number(a.job_id)));

  const buildScopeMetricsForApps = (jobCount: number, appsList: any[]) => {
    const totalApplicants = appsList.length;
    const inPipeline = appsList.filter(a => ['applied', 'aiScreening', 'assessment', 'technicalInterview', 'hrInterview'].includes(a.canonical_stage_key)).length;
    const inInterview = appsList.filter(a => ['technicalInterview', 'hrInterview'].includes(a.canonical_stage_key)).length;
    const shortlisted = appsList.filter(a => a.canonical_stage_key === 'selected').length;
    const rejected = appsList.filter(a => a.canonical_stage_key === 'rejected').length;
    const hired = appsList.filter(a => String(a.raw_status).toUpperCase() === 'HIRED').length;

    return {
      totalJobs: jobCount,
      totalApplicants,
      inPipeline,
      inInterview,
      shortlisted,
      rejected,
      hired
    };
  };

  const scopeMetrics = {
    active: buildScopeMetricsForApps(activeJobsList.length, activeAppsList),
    ended: buildScopeMetricsForApps(endedJobsList.length, endedAppsList),
    all: buildScopeMetricsForApps(companyJobs.length, applicants)
  };

  // Hired By Period
  const confirmedHiredApps = applicants.filter(a => String(a.raw_status).toUpperCase() === 'HIRED');
  const nowDate = new Date();
  let confirmedHiredDates: Date[] = [];

  if (confirmedHiredApps.length > 0) {
    const hiredAppIds = confirmedHiredApps.map(a => Number(a.application_id));
    const [hHist]: any = await db.query(
      `SELECT application_id, MIN(created_at) as hired_time 
       FROM application_history 
       WHERE application_id IN (${hiredAppIds.join(',')}) 
         AND UPPER(action) IN ('HIRED', 'MOVED_TO_HIRED') 
       GROUP BY application_id`
    );
    const histMap = new Map<number, Date>();
    if (hHist) {
      hHist.forEach((h: any) => {
        if (h.hired_time) histMap.set(Number(h.application_id), new Date(h.hired_time));
      });
    }

    confirmedHiredDates = confirmedHiredApps.map(a => {
      const histDate = histMap.get(Number(a.application_id));
      if (histDate && !isNaN(histDate.getTime())) return histDate;
      if (a.applied_at) {
        const appDate = new Date(a.applied_at);
        if (!isNaN(appDate.getTime())) return appDate;
      }
      return nowDate;
    });
  }

  const thisMonthCount = confirmedHiredDates.filter(d => d.getMonth() === nowDate.getMonth() && d.getFullYear() === nowDate.getFullYear()).length;
  const last3MonthsCount = confirmedHiredDates.filter(d => (nowDate.getTime() - d.getTime()) <= (90 * 24 * 60 * 60 * 1000)).length;
  const last6MonthsCount = confirmedHiredDates.filter(d => (nowDate.getTime() - d.getTime()) <= (180 * 24 * 60 * 60 * 1000)).length;
  const oneYearCount = confirmedHiredDates.filter(d => (nowDate.getTime() - d.getTime()) <= (365 * 24 * 60 * 60 * 1000)).length;

  const hiredByPeriod = {
    thisMonth: thisMonthCount,
    last3Months: last3MonthsCount,
    last6Months: last6MonthsCount,
    oneYear: oneYearCount
  };

  // Interviews & Actions
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  let interviewRows: any[] = [];
  try {
    const [iRows]: any = await db.query(
      `SELECT i.id, i.scheduled_at, i.status 
       FROM interviews i 
       JOIN job_applications ja ON i.application_id = ja.id 
       JOIN jobs j ON ja.job_id = j.id 
       WHERE j.company_id = ?`,
      [companyId]
    );
    interviewRows = iRows || [];
  } catch (err) {
    interviewRows = [];
  }

  const interviewsToday = interviewRows.filter((i: any) => {
    if (!i.scheduled_at) return false;
    const d = new Date(i.scheduled_at);
    return d >= todayStart && d <= todayEnd;
  }).length;

  const pendingInterviewConfirmations = interviewRows.filter((i: any) => {
    const st = String(i.status || '').toUpperCase();
    return st === 'PENDING' || st === 'AWAITING_CONFIRMATION';
  }).length;

  const pendingActions: any[] = [];

  const waitingReviewApps = activeAppsList.filter(a => a.canonical_stage_key === 'applied').length;
  if (waitingReviewApps > 0) {
    pendingActions.push({
      id: 'sys-waiting-review',
      title: `${waitingReviewApps} application${waitingReviewApps > 1 ? 's' : ''} awaiting initial review`,
      sub: 'Needs Screening',
      type: 'Review',
      count: waitingReviewApps,
      actionPath: '/company/applicants'
    });
  }

  const pendingAssessmentsCount = activeAppsList.filter(a => a.canonical_stage_key === 'assessment').length;
  if (pendingAssessmentsCount > 0) {
    pendingActions.push({
      id: 'sys-pending-assessments',
      title: `${pendingAssessmentsCount} assessment submission${pendingAssessmentsCount > 1 ? 's' : ''} ready for verification`,
      sub: 'Awaiting evaluation',
      type: 'Assessment',
      count: pendingAssessmentsCount,
      actionPath: '/company/assessments'
    });
  }

  if (interviewsToday > 0) {
    pendingActions.push({
      id: 'sys-interviews-today',
      title: `${interviewsToday} interview${interviewsToday > 1 ? 's' : ''} scheduled today`,
      sub: 'Requires preparation',
      type: 'Interview',
      count: interviewsToday,
      actionPath: '/company/interviews'
    });
  }

  const activePipelineCount = scopeMetrics.active.inPipeline;
  if (activePipelineCount > 0) {
    pendingActions.push({
      id: 'sys-pipeline-active',
      title: `${activePipelineCount} candidate${activePipelineCount > 1 ? 's' : ''} active in hiring pipeline`,
      sub: 'Keep moving forward',
      type: 'Pipeline',
      count: activePipelineCount,
      actionPath: '/company/pipeline'
    });
  }

  const closingSoonJobsCount = activeJobsList.filter(j => {
    if (!j.deadline) return false;
    const dl = new Date(j.deadline).getTime();
    if (isNaN(dl)) return false;
    const diffDays = Math.ceil((dl - Date.now()) / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 7;
  }).length;

  if (closingSoonJobsCount > 0) {
    pendingActions.push({
      id: 'sys-jobs-ending',
      title: `${closingSoonJobsCount} job opening${closingSoonJobsCount > 1 ? 's' : ''} closing within 7 days`,
      sub: 'Review applicants',
      type: 'Job',
      count: closingSoonJobsCount,
      actionPath: '/company/jobs'
    });
  }

  const offerPendingCount = activeAppsList.filter(a => a.canonical_stage_key === 'selected').length;
  if (offerPendingCount > 0) {
    pendingActions.push({
      id: 'sys-offer-pending',
      title: `${offerPendingCount} shortlisted candidate${offerPendingCount > 1 ? 's' : ''} awaiting final offer or hire decision`,
      sub: 'Offer Stage',
      type: 'Offer',
      count: offerPendingCount,
      actionPath: '/company/pipeline'
    });
  }

  if (candidateHoldAlerts.length > 0) {
    pendingActions.push({
      id: 'sys-candidate-holds',
      title: `${candidateHoldAlerts.length} candidate${candidateHoldAlerts.length > 1 ? 's' : ''} held in stage for over 7 days`,
      sub: 'Action Required',
      type: 'Hold',
      count: candidateHoldAlerts.length,
      actionPath: '/company/applicants'
    });
  }

  const endedJobUnresolvedApps = endedAppsList.filter(a => a.canonical_stage_key !== 'selected' && a.canonical_stage_key !== 'rejected');
  if (endedJobUnresolvedApps.length > 0) {
    pendingActions.push({
      id: 'sys-ended-job-unresolved',
      title: `${endedJobUnresolvedApps.length} in-progress candidate${endedJobUnresolvedApps.length > 1 ? 's' : ''} on ended job postings`,
      sub: 'Ended Job Decisions',
      type: 'Decision',
      count: endedJobUnresolvedApps.length,
      actionPath: '/company/applicants'
    });
  }

  try {
    const [dbPendingRows]: any = await db.query(
      `SELECT * FROM company_pending_actions WHERE company_id = ? AND status = 'PENDING' ORDER BY created_at DESC`,
      [companyId]
    );
    if (dbPendingRows && dbPendingRows.length > 0) {
      dbPendingRows.forEach((row: any) => {
        pendingActions.push({
          id: `db-${row.id}`,
          title: row.title || row.action_text || 'Pending Task',
          sub: row.type || 'Custom Task',
          type: row.type || 'Task',
          count: 1,
          actionPath: row.link || '/company/applicants'
        });
      });
    }
  } catch (err) {}

  return {
    filterOptions: {
      jobs: jobsOptions,
      hrTeam
    },
    applicants: filteredApplicants,
    scopeMetrics,
    interviewsToday,
    pendingInterviewConfirmations,
    hiredByPeriod,
    pendingActions,
    stats,
    funnelData,
    jobwiseApplications,
    stageConversion,
    timeToHire,
    timeInStage,
    heldCandidateTasks: candidateHoldAlerts.map(alert => ({
      jobTitle: alert.jobTitle,
      stageName: alert.currentStage,
      heldCount: 1,
      oldestWaitingDays: alert.daysInStage,
      actionPath: `/company/pipeline?jobId=${alert.jobId}`
    })),
    candidateHoldAlerts,
    topPerformingJobs,
    lowPerformingJobs,
    dropsAnalytics
  };
}
