import db from "../db.ts";
import { isJobActive, isJobEnded } from "./jobLifecycleService.ts";
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
}) {
  const companyId = Number(params.companyId);
  const userId = params.userId ? Number(params.userId) : undefined;
  const isSubHr = Boolean(params.isSubHr);
  const assignedJobIds = params.assignedJobIds || [];
  const rawJobStatus = String(params.jobStatus || 'all').toLowerCase();
  const jobStatus = rawJobStatus === 'ended' || rawJobStatus === 'inactive' ? 'ended' : rawJobStatus === 'active' ? 'active' : 'all';
  const targetJobId = params.jobId && params.jobId !== 'all' ? Number(params.jobId) : null;

  // 1. Query all company jobs
  const [allJobsRows]: any = await db.query(
    "SELECT id, title, description, status, deadline, ended_at, pipeline_ended_at, openings, created_at, application_start_date FROM jobs WHERE company_id = ?",
    [companyId]
  );

  let companyJobs = allJobsRows || [];
  if (isSubHr) {
    if (assignedJobIds.length > 0) {
      companyJobs = companyJobs.filter((j: any) => assignedJobIds.includes(Number(j.id)));
    } else {
      companyJobs = [];
    }
  }

  // Filter jobs by lifecycle status and targetJobId
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

  // Query HR team for filters
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

  // 4. Calculate Core Stats for Cards
  const totalJobsCount = filteredJobs.length;
  const activeJobsCount = filteredJobs.filter(isJobActive).length;
  const endedJobsCount = filteredJobs.filter(isJobEnded).length;

  const [viewsCountRow]: any = await db.query("SELECT COUNT(*) as totalViews FROM profile_views WHERE company_id = ?", [companyId]);
  const totalViews = viewsCountRow[0]?.totalViews || 0;

  // Hired count (Raw status HIRED applications only)
  let hiredSql = `
    SELECT COUNT(DISTINCT ja.id) as hiredCount
    FROM job_applications ja
    JOIN jobs j ON ja.job_id = j.id
    WHERE j.company_id = ? AND ja.status = 'HIRED'
  `;
  const hiredParams: any[] = [companyId];
  if (targetJobId) {
    hiredSql += ` AND ja.job_id = ?`;
    hiredParams.push(targetJobId);
  }
  if (jobStatus === 'active') {
    const activeIds = companyJobs.filter(isJobActive).map((j: any) => j.id);
    if (activeIds.length > 0) {
      hiredSql += ` AND ja.job_id IN (${activeIds.join(',')})`;
    } else {
      hiredSql += ` AND 1=0`;
    }
  } else if (jobStatus === 'ended') {
    const endedIds = companyJobs.filter(isJobEnded).map((j: any) => j.id);
    if (endedIds.length > 0) {
      hiredSql += ` AND ja.job_id IN (${endedIds.join(',')})`;
    } else {
      hiredSql += ` AND 1=0`;
    }
  }

  const [hiredRows]: any = await db.query(hiredSql, hiredParams);
  const totalHires = hiredRows[0]?.hiredCount || 0;

  const totalApplicants = snapshot.summary.totalApplicants;
  const inPipeline = snapshot.summary.inPipeline;
  const inInterview = snapshot.summary.inInterview;
  const shortlisted = snapshot.summary.selected; // Shortlisted bucket
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

  // 5. Hiring Funnel Overview
  const funnelData = [
    { stage: 'Applied', name: 'Applied', value: snapshot.stages.applied.count, count: snapshot.stages.applied.count },
    { stage: 'AI Screening', name: 'AI Screening', value: snapshot.stages.aiScreening.count, count: snapshot.stages.aiScreening.count },
    { stage: 'Assessment', name: 'Assessment', value: snapshot.stages.assessment.count, count: snapshot.stages.assessment.count },
    { stage: 'Technical Interview', name: 'Technical Interview', value: snapshot.stages.technicalInterview.count, count: snapshot.stages.technicalInterview.count },
    { stage: 'HR Interview', name: 'HR Interview', value: snapshot.stages.hrInterview.count, count: snapshot.stages.hrInterview.count },
    { stage: 'Shortlisted', name: 'Shortlisted', value: snapshot.stages.selected.count, count: snapshot.stages.selected.count },
    { stage: 'Rejected', name: 'Rejected', value: snapshot.stages.rejected.count, count: snapshot.stages.rejected.count }
  ];

  // 6. Job-wise Application Performance (PART 6)
  let appQuery = `
    SELECT 
      ja.id as application_id,
      ja.job_id,
      ja.student_id,
      ja.status,
      ja.current_stage_id,
      ja.applied_at,
      j.title as job_title,
      j.openings,
      j.status as job_status,
      j.deadline,
      j.ended_at,
      j.pipeline_ended_at
    FROM job_applications ja
    JOIN jobs j ON ja.job_id = j.id
    WHERE j.company_id = ?
  `;
  const appParams: any[] = [companyId];
  if (targetJobId) {
    appQuery += ` AND j.id = ?`;
    appParams.push(targetJobId);
  }
  const [allAppsRows]: any = await db.query(appQuery, appParams);
  const scopedApps = (allAppsRows || []).filter((a: any) => {
    const active = isJobActive({ status: a.job_status, deadline: a.deadline, ended_at: a.ended_at, pipeline_ended_at: a.pipeline_ended_at });
    if (jobStatus === 'active' && !active) return false;
    if (jobStatus === 'ended' && active) return false;
    if (isSubHr && !assignedJobIds.includes(Number(a.job_id))) return false;
    return true;
  });

  // Query history for transition timings
  const appIds = scopedApps.map((a: any) => a.application_id);
  let historyRows: any[] = [];
  if (appIds.length > 0) {
    const [hRows]: any = await db.query(
      `SELECT application_id, stage_id, action, created_at FROM application_history WHERE application_id IN (${appIds.join(',')}) ORDER BY created_at ASC`
    );
    historyRows = hRows || [];
  }

  const jobwiseApplications = filteredJobs.map((j: any) => {
    const jApps = scopedApps.filter((a: any) => Number(a.job_id) === Number(j.id));
    const totalApplications = jApps.length;

    // Progressed beyond applied
    const progressedApps = jApps.filter((a: any) => {
      const h = historyRows.filter((hist: any) => Number(hist.application_id) === Number(a.application_id));
      const movedPastApplied = h.some((hist: any) => hist.action !== 'APPLIED' && hist.action !== 'APPLICATION');
      return movedPastApplied || (a.current_stage_id && Number(a.current_stage_id) > 1);
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

    // Calculate average days
    let sumFirstProgressDays = 0;
    let countFirstProgress = 0;
    let sumShortlistDays = 0;
    let countShortlist = 0;
    let sumHireDays = 0;
    let countHire = 0;

    jApps.forEach((a: any) => {
      const appliedTime = new Date(a.applied_at).getTime();
      const aHist = historyRows.filter((h: any) => Number(h.application_id) === Number(a.application_id));

      const firstProg = aHist.find((h: any) => h.action !== 'APPLIED' && h.action !== 'APPLICATION');
      if (firstProg && !isNaN(appliedTime)) {
        const progTime = new Date(firstProg.created_at).getTime();
        if (progTime >= appliedTime) {
          sumFirstProgressDays += (progTime - appliedTime) / (1000 * 60 * 60 * 24);
          countFirstProgress++;
        }
      }

      const shortlistProg = aHist.find((h: any) => ['SELECTED', 'SHORTLISTED', 'SHORTLISTED_FOR_HIRE', 'MOVED_TO_SELECTED'].includes(String(h.action).toUpperCase()));
      if (shortlistProg && !isNaN(appliedTime)) {
        const sTime = new Date(shortlistProg.created_at).getTime();
        if (sTime >= appliedTime) {
          sumShortlistDays += (sTime - appliedTime) / (1000 * 60 * 60 * 24);
          countShortlist++;
        }
      }

      const hireProg = aHist.find((h: any) => ['HIRED', 'MOVED_TO_HIRED'].includes(String(h.action).toUpperCase())) || (String(a.status).toUpperCase() === 'HIRED' ? { created_at: a.applied_at } : null);
      if (hireProg && String(a.status).toUpperCase() === 'HIRED' && !isNaN(appliedTime)) {
        const hTime = new Date(hireProg.created_at).getTime();
        if (hTime >= appliedTime) {
          sumHireDays += (hTime - appliedTime) / (1000 * 60 * 60 * 24);
          countHire++;
        }
      }
    });

    const averageDaysToFirstProgress = countFirstProgress > 0 ? Math.round((sumFirstProgressDays / countFirstProgress) * 10) / 10 : null;
    const averageDaysToShortlist = countShortlist > 0 ? Math.round((sumShortlistDays / countShortlist) * 10) / 10 : null;
    const averageDaysToHire = countHire > 0 ? Math.round((sumHireDays / countHire) * 10) / 10 : null;

    return {
      jobId: j.id,
      jobTitle: j.title,
      lifecycleStatus: isJobActive(j) ? 'ACTIVE' : 'ENDED',
      openings,
      totalApplications,
      candidatesProgressedBeyondApplied: progressedApps.length,
      currentInPipeline,
      currentInInterview,
      shortlisted: shortlistedCount,
      hired: hiredCount,
      rejected: rejectedCount,
      averageDaysToFirstProgress,
      averageDaysToShortlist,
      averageDaysToHire,
      applicationToShortlistPercentage: totalApplications > 0 ? Math.round((shortlistedCount / totalApplications) * 100) : 0,
      applicationToHirePercentage: totalApplications > 0 ? Math.round((hiredCount / totalApplications) * 100) : 0,
      openingFillPercentage
    };
  });

  // 7. Stage Conversion Rate (PART 7)
  const reachedApplied = scopedApps.length;
  const reachedScreening = scopedApps.filter((a: any) => {
    const h = historyRows.filter((hist: any) => Number(hist.application_id) === Number(a.application_id));
    const k = mapStageToCanonicalKey(a).key;
    return k !== 'applied' || h.some((hist: any) => hist.action !== 'APPLIED');
  }).length;

  const reachedAssessment = scopedApps.filter((a: any) => {
    const h = historyRows.filter((hist: any) => Number(hist.application_id) === Number(a.application_id));
    const k = mapStageToCanonicalKey(a).key;
    return ['assessment', 'technicalInterview', 'hrInterview', 'selected'].includes(k) || h.some((hist: any) => ['TEST', 'ASSESSMENT'].includes(String(hist.action).toUpperCase()));
  }).length;

  const reachedTechInterview = scopedApps.filter((a: any) => {
    const h = historyRows.filter((hist: any) => Number(hist.application_id) === Number(a.application_id));
    const k = mapStageToCanonicalKey(a).key;
    return ['technicalInterview', 'hrInterview', 'selected'].includes(k) || h.some((hist: any) => ['INTERVIEW', 'TECHNICAL_INTERVIEW'].includes(String(hist.action).toUpperCase()));
  }).length;

  const reachedHrInterview = scopedApps.filter((a: any) => {
    const h = historyRows.filter((hist: any) => Number(hist.application_id) === Number(a.application_id));
    const k = mapStageToCanonicalKey(a).key;
    return ['hrInterview', 'selected'].includes(k) || h.some((hist: any) => String(hist.action).toUpperCase().includes('HR'));
  }).length;

  const reachedShortlisted = scopedApps.filter((a: any) => {
    const k = mapStageToCanonicalKey(a).key;
    return k === 'selected';
  }).length;

  const stageConversion = [
    { stage: 'Applied to AI Screening', fromCount: reachedApplied, toCount: reachedScreening, rate: reachedApplied > 0 ? Math.round((reachedScreening / reachedApplied) * 100) : 0 },
    { stage: 'AI Screening to Assessment', fromCount: reachedScreening, toCount: reachedAssessment, rate: reachedScreening > 0 ? Math.round((reachedAssessment / reachedScreening) * 100) : 0 },
    { stage: 'Assessment to Tech Interview', fromCount: reachedAssessment, toCount: reachedTechInterview, rate: reachedAssessment > 0 ? Math.round((reachedTechInterview / reachedAssessment) * 100) : 0 },
    { stage: 'Tech Interview to HR Interview', fromCount: reachedTechInterview, toCount: reachedHrInterview, rate: reachedTechInterview > 0 ? Math.round((reachedHrInterview / reachedTechInterview) * 100) : 0 },
    { stage: 'HR Interview to Shortlisted', fromCount: reachedHrInterview, toCount: reachedShortlisted, rate: reachedHrInterview > 0 ? Math.round((reachedShortlisted / reachedHrInterview) * 100) : 0 }
  ];

  // 8. Time-to-Hire Analytics (PART 8)
  const hiredApps = scopedApps.filter((a: any) => String(a.status).toUpperCase() === 'HIRED');
  const hireDurations: number[] = [];

  hiredApps.forEach((a: any) => {
    const appliedMs = new Date(a.applied_at).getTime();
    const aHist = historyRows.filter((h: any) => Number(h.application_id) === Number(a.application_id));
    const hiredProg = aHist.find((h: any) => ['HIRED', 'MOVED_TO_HIRED'].includes(String(h.action).toUpperCase()));
    const hiredMs = hiredProg ? new Date(hiredProg.created_at).getTime() : new Date().getTime();
    if (!isNaN(appliedMs) && hiredMs >= appliedMs) {
      hireDurations.push(Math.round((hiredMs - appliedMs) / (1000 * 60 * 60 * 24)));
    }
  });

  const timeToHire = {
    hiredCount: hiredApps.length,
    overallAvgDays: hireDurations.length > 0 ? Math.round((hireDurations.reduce((sum, d) => sum + d, 0) / hireDurations.length) * 10) / 10 : null,
    shortestDays: hireDurations.length > 0 ? Math.min(...hireDurations) : null,
    longestDays: hireDurations.length > 0 ? Math.max(...hireDurations) : null,
    firstHiredDays: hireDurations.length > 0 ? hireDurations[0] : null,
    latestHiredDays: hireDurations.length > 0 ? hireDurations[hireDurations.length - 1] : null,
    jobWise: jobwiseApplications.map((j: any) => ({
      jobId: j.jobId,
      title: j.jobTitle,
      hiredCount: j.hired,
      avgDaysToHire: j.averageDaysToHire
    }))
  };

  // 9. Time-in-Stage Metrics (PART 9)
  const canonicalStageNames = [
    { key: 'applied', label: 'Applied' },
    { key: 'aiScreening', label: 'AI Screening' },
    { key: 'assessment', label: 'Assessment' },
    { key: 'technicalInterview', label: 'Technical Interview' },
    { key: 'hrInterview', label: 'HR Interview' },
    { key: 'selected', label: 'Shortlisted' }
  ];

  const timeInStage = canonicalStageNames.map((sObj) => {
    let candidateDwells: number[] = [];

    if (sObj.key === 'selected') {
      // Shortlisted duration from applied_at to shortlisted
      scopedApps.forEach((a: any) => {
        const k = mapStageToCanonicalKey(a).key;
        if (k === 'selected') {
          const appliedMs = new Date(a.applied_at).getTime();
          const aHist = historyRows.filter((h: any) => Number(h.application_id) === Number(a.application_id));
          const sProg = aHist.find((h: any) => ['SELECTED', 'SHORTLISTED', 'SHORTLISTED_FOR_HIRE'].includes(String(h.action).toUpperCase()));
          const sMs = sProg ? new Date(sProg.created_at).getTime() : new Date().getTime();
          if (!isNaN(appliedMs) && sMs >= appliedMs) {
            candidateDwells.push((sMs - appliedMs) / (1000 * 60 * 60 * 24));
          }
        }
      });
    } else {
      scopedApps.forEach((a: any) => {
        const k = mapStageToCanonicalKey(a).key;
        if (k === sObj.key) {
          const appliedMs = new Date(a.applied_at).getTime();
          const dwell = (Date.now() - appliedMs) / (1000 * 60 * 60 * 24);
          if (dwell >= 0) candidateDwells.push(dwell);
        }
      });
    }

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

  // 10. Candidate Hold Alerts (PART 10)
  // ACTIVE jobs ONLY! Excludes terminal, shortlisted, hired, rejected.
  const activeJobsMap = new Map<number, any>();
  companyJobs.filter(isJobActive).forEach((j: any) => activeJobsMap.set(Number(j.id), j));

  const candidateHoldAlerts: any[] = [];
  const nowMs = Date.now();

  scopedApps.forEach((a: any) => {
    const job = activeJobsMap.get(Number(a.job_id));
    if (!job) return; // Must be active job

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
      candidateHoldAlerts.push({
        candidateId: a.student_id,
        applicationId: a.application_id,
        candidateName: a.full_name || 'Candidate',
        jobId: a.job_id,
        jobTitle: job.title,
        currentStage: a.current_stage_name || 'Applied',
        daysInStage,
        lastTransitionDate: new Date(lastTransitionMs).toISOString().split('T')[0],
        responsibleHr: 'Assigned HR',
        reason: `Candidate stuck in stage for ${daysInStage} days without progress.`
      });
    }
  });

  candidateHoldAlerts.sort((a, b) => b.daysInStage - a.daysInStage);

  // 11. Top Performing Jobs (PART 11)
  const topPerformingJobs = [...jobwiseApplications]
    .sort((a, b) => {
      if (b.hired !== a.hired) return b.hired - a.hired;
      if (b.openingFillPercentage !== a.openingFillPercentage) return b.openingFillPercentage - a.openingFillPercentage;
      if (b.applicationToHirePercentage !== a.applicationToHirePercentage) return b.applicationToHirePercentage - a.applicationToHirePercentage;
      const aTime = a.averageDaysToHire ?? 999;
      const bTime = b.averageDaysToHire ?? 999;
      if (aTime !== bTime) return aTime - bTime;
      return b.totalApplications - a.totalApplications;
    })
    .slice(0, 5)
    .map((j: any) => ({
      jobId: j.jobId,
      title: j.jobTitle,
      hiredCount: j.hired,
      openings: j.openings,
      openingFillPercentage: j.openingFillPercentage,
      totalApplications: j.totalApplications,
      candidatesProgressed: j.candidatesProgressedBeyondApplied,
      applicationToShortlistPercentage: j.applicationToShortlistPercentage,
      averageDaysToHire: j.averageDaysToHire,
      performanceBadge: j.openingFillPercentage >= 80 ? 'Excellent' : 'Good',
      lifecycleStatus: j.lifecycleStatus
    }));

  // 12. Low Performing Jobs (PART 12)
  const lowPerformingJobs = jobwiseApplications
    .filter((j: any) => j.totalApplications === 0 || j.hired === 0 || j.openingFillPercentage < 50)
    .slice(0, 5)
    .map((j: any) => {
      let problemReason = "Low candidate progression and fill rate";
      let suggestionIdx = 0;

      if (j.totalApplications < 3) {
        problemReason = "Low applicant volume compared with other active postings.";
        suggestionIdx = 0; // Suggestion 1: Rewrite job title and opening summary
      } else if (j.candidatesProgressedBeyondApplied === 0) {
        problemReason = "No candidate has progressed beyond initial Applied stage.";
        suggestionIdx = 4; // Suggestion 5: Shorten recruiter feedback time
      } else if (j.shortlisted === 0) {
        problemReason = "No candidate has reached Shortlisted.";
        suggestionIdx = 3; // Suggestion 4: Reduce unnecessary screening stages
      } else if (j.hired === 0 && j.openings > 0) {
        problemReason = `No hires made against ${j.openings} opening(s).`;
        suggestionIdx = 8; // Suggestion 9: Schedule interview blocks earlier
      } else {
        problemReason = "High drop-off rate after interviews.";
        suggestionIdx = 7; // Suggestion 8: Review Assessment difficulty
      }

      return {
        jobId: j.jobId,
        title: j.jobTitle,
        totalApplications: j.totalApplications,
        hiredCount: j.hired,
        openings: j.openings,
        problemReason,
        suggestedAction: APPROVED_SUGGESTION_TEMPLATES[suggestionIdx],
        suggestions: [APPROVED_SUGGESTION_TEMPLATES[suggestionIdx]]
      };
    });

  // 13. Drops & Brand Post Engagement (PART 13)
  const [dropsRows]: any = await db.query(`
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
    ORDER BY d.created_at DESC
  `, [companyId]);

  const rawDrops = dropsRows || [];
  const dropsCount = rawDrops.length;

  // Calculate percentile rank scores across drops
  const sortedByViews = [...rawDrops].sort((a, b) => a.views - b.views);
  const sortedByLikes = [...rawDrops].sort((a, b) => a.likes - b.likes);
  const sortedByComments = [...rawDrops].sort((a, b) => a.comments - b.comments);

  const getPercentileRank = (item: any, sortedList: any[], key: string) => {
    if (sortedList.length <= 1) return 50;
    const idx = sortedList.findIndex(x => x.id === item.id);
    return Math.round(((idx + 1) / sortedList.length) * 100);
  };

  const dropsAnalytics = rawDrops.map((d: any) => {
    const viewPercentile = getPercentileRank(d, sortedByViews, 'views');
    const likePercentile = getPercentileRank(d, sortedByLikes, 'likes');
    const commentPercentile = getPercentileRank(d, sortedByComments, 'comments');

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

  return {
    filterOptions: {
      jobs: jobsOptions,
      hrTeam
    },
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
