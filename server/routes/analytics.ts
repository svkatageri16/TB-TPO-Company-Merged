import express from "express";
import db from "../db.ts";
import { logProfileView, updateDailyTask, calculateTalentScore, updateLoginStreak } from "../services/analyticsService.ts";
import { authenticate } from "../middleware/auth.ts";
import { getPipelineSnapshot, mapStageToCanonicalKey } from "../services/pipelineSnapshotService.ts";
import { isJobActive, isJobEnded } from "../services/jobLifecycleService.ts";
import { getCompanyAnalyticsMetrics } from "../services/companyAnalyticsMetricsService.ts";

const router = express.Router();

// Daily Check-in
router.post("/check-in", async (req, res) => {
  const { userId } = req.body;
  try {
    const { XPService } = await import("../services/xpService.ts");
    
    // 1. Mark as completed in daily tasks for analytics
    await updateDailyTask(userId, 'CHECK_IN');
    
    // 2. Use XPService to handle the transaction, streak and xp balance
    const xpResult = await XPService.claimDailyReward(userId);
    
    res.json({ 
      success: true, 
      message: `Check-in successful! +${xpResult.rewardAmount} XP`,
      ...xpResult
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || "Check-in failed" });
  }
});

// GET Student Analytics
router.get("/student/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    await updateLoginStreak(Number(userId));
    
    // Recalculate score on fetch to ensure dynamic updates for the user
    await calculateTalentScore(Number(userId));

    const [stats]: any = await db.query(`
      SELECT sps.*, u.xp_balance, u.total_earned_xp, u.login_streak 
      FROM users u
      LEFT JOIN student_performance_stats sps ON sps.user_id = u.id
      WHERE u.id = ?
    `, [userId]);
    const [talent]: any = await db.query("SELECT * FROM talent_scores WHERE user_id = ?", [userId]);
    const [tasks]: any = await db.query("SELECT * FROM daily_tasks WHERE user_id = ? AND task_date = CURRENT_DATE", [userId]);
    const [badges]: any = await db.query("SELECT * FROM user_badges WHERE user_id = ?", [userId]);
    const [views]: any = await db.query(`
      SELECT COUNT(*) as view_count 
      FROM profile_views pv 
      JOIN student_profiles sp ON pv.student_id = sp.id 
      WHERE sp.user_id = ?
    `, [userId]);

    const [interviewHistory]: any = await db.query(`
      SELECT score, created_at 
      FROM interview_history ih
      JOIN student_profiles sp ON ih.student_id = sp.id
      WHERE sp.user_id = ?
      ORDER BY created_at ASC
      LIMIT 10
    `, [userId]);

    const { XPService } = await import("../services/xpService.ts");
    const systemConfigs = await XPService.getConfigs();

    res.json({
      success: true,
      data: {
        performance: stats[0] || {},
        talentScore: talent[0] || { overall_score: 0, breakdown_json: {} },
        dailyTasks: tasks[0] || { is_check_in_completed: 0, is_interview_completed: 0, is_profile_updated: 0 },
        badges: badges || [],
        totalViews: views[0]?.view_count || 0,
        interviewTrend: interviewHistory || [],
        dailyRewardBase: systemConfigs.DAILY_REWARD_BASE || 50,
        streakBonusStep: systemConfigs.STREAK_BONUS_STEP || 10
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching student analytics", error: String(error) });
  }
});

// GET Student Applications
router.get("/student/:userId/applications", async (req, res) => {
  const { userId } = req.params;
  try {
    const [apps]: any = await db.query(`
      SELECT 
        ja.id, ja.status, ja.applied_at,
        j.title as job_title, j.id as job_id, j.deadline, j.job_type,
        cp.company_name,
        js.stage_name as current_stage_name,
        js.stage_type
      FROM job_applications ja
      JOIN jobs j ON ja.job_id = j.id
      JOIN company_profiles cp ON j.company_id = cp.id
      JOIN student_profiles sp ON ja.student_id = sp.id
      LEFT JOIN job_stages js ON ja.current_stage_id = js.id
      WHERE sp.user_id = ?
      ORDER BY ja.applied_at DESC
    `, [userId]);

    res.json({ success: true, data: apps });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching applications" });
  }
});

// GET Student Check-ins
router.get("/student/:userId/check-ins", async (req, res) => {
  const { userId } = req.params;
  try {
    const [checkins]: any = await db.query(`
      SELECT task_date 
      FROM daily_tasks 
      WHERE user_id = ? AND is_check_in_completed = 1
    `, [userId]);
    res.json({ success: true, data: checkins });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching check-ins" });
  }
});

// Uses imported isJobActive and isJobEnded from jobLifecycleService.ts

const getHiringTimeData = async (companyId: any, isSubHr: boolean, assignedJobIds: number[], jobStatusQuery: string) => {
  let jobQuery = `
    SELECT id, title, status, deadline, openings, application_start_date, created_at, ended_at, pipeline_ended_at
    FROM jobs 
    WHERE company_id = ?
  `;
  let jobParams: any[] = [companyId];
  if (isSubHr) {
    if (assignedJobIds.length > 0) {
      jobQuery += " AND id IN (" + assignedJobIds.join(",") + ")";
    } else {
      jobQuery += " AND id IN (-1)";
    }
  }

  const [companyJobs]: any = await db.query(jobQuery, jobParams);
  let filteredJobs = companyJobs || [];

  const jobStatus = String(jobStatusQuery || 'all').toLowerCase();
  
  if (jobStatus === 'active') {
    filteredJobs = filteredJobs.filter(isJobActive);
  } else if (jobStatus === 'ended') {
    filteredJobs = filteredJobs.filter(isJobEnded);
  } else {
    filteredJobs = filteredJobs.filter((j: any) => isJobActive(j) || isJobEnded(j));
  }

  if (filteredJobs.length === 0) {
    return { overallAvgDays: null, jobWise: [] };
  }

  const targetJobIds = filteredJobs.map((j: any) => j.id);

  const hiredAtSubquery = `
    (SELECT MIN(created_at) FROM application_history 
     WHERE application_id = a.id 
     AND action IN ('SELECTED', 'HIRED', 'OFFER', 'OFFER_ACCEPTED', 'VERIFIED_SELECTION', 'SHORTLISTED_FOR_HIRE', 'MOVED_TO_SELECTED', 'MOVED_TO_HIRED', 'SHORTLISTED'))
  `;

  const queryStr = `
    SELECT 
      a.id as application_id,
      a.job_id,
      a.status,
      a.applied_at,
      ${hiredAtSubquery} as hired_at,
      js.stage_type as current_stage_type,
      js.stage_name as current_stage_name
    FROM job_applications a
    LEFT JOIN job_stages js ON a.current_stage_id = js.id
    WHERE a.job_id IN (${targetJobIds.join(",")})
  `;

  const [appsRows]: any = await db.query(queryStr);

  const normalizeStageBucketLocal = (app: any) => {
    const status = String(app.status || '').toUpperCase();
    const stageType = String(app.current_stage_type || app.stage_type || '').toUpperCase();
    const stageName = String(app.current_stage_name || app.stage_name || '').toUpperCase();

    if (status === 'REJECTED' || status === 'CANCELLED' || status === 'WITHDRAWN') {
      return 'REJECTED';
    }

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

    if (
      status === 'OFFER_EXTENDED' ||
      stageType.includes('OFFER') ||
      stageName.includes('OFFER')
    ) {
      return 'OFFER';
    }

    if (
      stageType.includes('INTERVIEW') ||
      stageType.includes('HR') ||
      stageName.includes('INTERVIEW') ||
      stageName.includes('HR')
    ) {
      return 'INTERVIEW';
    }

    if (
      stageType.includes('TEST') ||
      stageType.includes('ASSESSMENT') ||
      stageName.includes('TEST') ||
      stageName.includes('ASSESSMENT') ||
      stageName.includes('APTITUDE')
    ) {
      return 'ASSESSMENT';
    }

    if (
      stageType.includes('SCREEN') ||
      stageName.includes('SCREEN') ||
      status === 'IN_PROGRESS'
    ) {
      return 'SCREENING';
    }

    return 'APPLIED';
  };

  const hiresByJob: Record<number, Array<{ applied_at: Date; hired_at: Date }>> = {};
  for (const app of (appsRows || [])) {
    if (normalizeStageBucketLocal(app) === 'HIRED') {
      const jobId = Number(app.job_id);
      if (!hiresByJob[jobId]) hiresByJob[jobId] = [];
      
      const appliedDate = app.applied_at ? new Date(app.applied_at) : null;
      const hiredDate = app.hired_at ? new Date(app.hired_at) : (appliedDate || new Date());
      hiresByJob[jobId].push({
        applied_at: appliedDate || hiredDate,
        hired_at: hiredDate
      });
    }
  }

  const now = new Date();
  let totalDaysAllJobs = 0;
  let countJobsWithDays = 0;

  const jobWise = filteredJobs.map((j: any) => {
    const jobId = Number(j.id);
    const jobHires = hiresByJob[jobId] || [];
    jobHires.sort((a, b) => a.hired_at.getTime() - b.hired_at.getTime());

    const hiredCount = jobHires.length;
    const openings = Number(j.openings || 1);

    const startDateRaw = j.application_start_date || j.created_at;
    const startDate = startDateRaw ? new Date(startDateRaw) : now;

    let resultState: 'Active' | 'Fully Filled' | 'Ended' | 'Expired' = 'Active';
    let endCompareDate: Date = now;

    const isValidDeadline = j.deadline && 
      j.deadline !== 'null' && 
      j.deadline !== 'undefined' && 
      j.deadline.toString().trim() !== '' && 
      j.deadline !== '0000-00-00' && 
      !isNaN(new Date(j.deadline).getTime());
    
    const deadlineEndOfDay = isValidDeadline ? new Date(new Date(j.deadline).setHours(23, 59, 59, 999)) : null;
    const isExpired = deadlineEndOfDay ? (deadlineEndOfDay.getTime() < now.getTime()) : false;

    if (hiredCount >= openings) {
      resultState = 'Fully Filled';
      const finalHireObj = jobHires[Math.min(openings - 1, hiredCount - 1)];
      endCompareDate = finalHireObj ? finalHireObj.hired_at : now;
    } else if (j.status === 'CLOSED' || j.ended_at) {
      resultState = 'Ended';
      const endTimestamp = j.ended_at || j.pipeline_ended_at;
      endCompareDate = endTimestamp ? new Date(endTimestamp) : now;
    } else if (isExpired) {
      resultState = 'Expired';
      endCompareDate = deadlineEndOfDay || now;
    } else {
      resultState = 'Active';
      endCompareDate = now;
    }

    const diffMs = endCompareDate.getTime() - startDate.getTime();
    const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    totalDaysAllJobs += days;
    countJobsWithDays++;

    let formattedDeadline = 'N/A';
    if (isValidDeadline) {
      const d = new Date(j.deadline);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      formattedDeadline = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }

    return {
      jobId,
      jobTitle: j.title,
      jobStatus: j.status,
      openings,
      hiredCount,
      days,
      avgDays: days,
      resultState,
      deadline: j.deadline,
      formattedDeadline
    };
  });

  const overallAvgDays = countJobsWithDays > 0 ? Math.round((totalDaysAllJobs / countJobsWithDays) * 10) / 10 : null;

  return {
    overallAvgDays,
    overallAverageDaysToHire: overallAvgDays,
    jobWise
  };
};

// Canonical Pipeline Snapshot Endpoint
router.get("/pipeline/snapshot", authenticate, async (req: any, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    let companyId: number | null = null;

    const [company]: any = await db.query("SELECT id FROM company_profiles WHERE user_id = ?", [userId]);
    if (company && company.length > 0) {
      companyId = Number(company[0].id);
    } else {
      const [hrProfiles]: any = await db.query("SELECT company_id FROM company_hr_profiles WHERE user_id = ?", [userId]);
      if (hrProfiles && hrProfiles.length > 0) {
        companyId = Number(hrProfiles[0].company_id);
      } else if (req.user?.companyId || req.user?.company_id) {
        companyId = Number(req.user?.companyId || req.user?.company_id);
      }
    }

    if (!companyId) {
      return res.status(403).json({ success: false, message: "Authenticated Company context is required" });
    }

    const rawScope = String(req.query.scope || "").toLowerCase();
    const scope: "all" | "active" | "ended" =
      rawScope === "inactive" || rawScope === "ended" ? "ended" : rawScope === "all" ? "all" : "active";
    const jobId = req.query.jobId && req.query.jobId !== "ALL" && req.query.jobId !== "all" ? Number(req.query.jobId) : undefined;
    const searchQuery = req.query.searchQuery ? String(req.query.searchQuery) : undefined;
    const minScore = req.query.minScore ? Number(req.query.minScore) : undefined;

    const snapshot = await getPipelineSnapshot(companyId, {
      scope,
      jobId,
      userId,
      searchQuery,
      minScore,
    });

    res.json({
      success: true,
      data: snapshot,
    });
  } catch (error: any) {
    console.error("Error generating pipeline snapshot:", error);
    res.status(500).json({ success: false, message: "Error generating pipeline snapshot", error: String(error) });
  }
});

// GET Employer Analytics & Candidates
router.get("/employer/:companyUserId", authenticate, async (req: any, res) => {
  const { companyUserId } = req.params;

  if (req.user.userId !== Number(companyUserId)) {
    return res.status(403).json({ success: false, message: "Unauthorized access to employer metrics." });
  }
  const rawJobStatus = String(req.query.jobStatus || 'all');
  const jobId = String(req.query.jobId || 'all');

  try {
    let companyId = null;
    const [hrProfiles]: any = await db.query("SELECT company_id FROM company_hr_profiles WHERE user_id = ?", [companyUserId]);
    const isSubHr = hrProfiles && hrProfiles.length > 0;
    if (isSubHr) {
      companyId = hrProfiles[0].company_id;
    } else {
      const [company]: any = await db.query("SELECT id FROM company_profiles WHERE user_id = ?", [companyUserId]);
      if (company && company.length > 0) {
        companyId = company[0].id;
      }
    }

    if (!companyId) {
      return res.json({
        success: true,
        data: {
          scope: { jobStatus: rawJobStatus, jobId, companyUserId },
          jobs: { total: 0, active: 0, ended: 0 },
          applications: { total: 0, inPipeline: 0, inInterview: 0, selected: 0, rejected: 0, hired: 0 },
          stats: { totalJobs: 0, activeJobs: 0, endedJobs: 0, totalApps: 0, totalApplicants: 0, totalHires: 0, totalViews: 0, applicationRate: 0 },
          funnelData: [],
          jobwiseApplications: [],
          stageConversion: [],
          timeToHire: { hiredCount: 0, overallAvgDays: null, jobWise: [] },
          timeInStage: [],
          topPerformingJobs: [],
          lowPerformingJobs: [],
          dropsAnalytics: [],
          heldCandidateTasks: [],
          candidateHoldAlerts: [],
          filterOptions: { jobs: [], hrTeam: [] }
        }
      });
    }

    let assignedJobIds: number[] = [];
    if (isSubHr) {
      const [assignments]: any = await db.query(
        "SELECT job_id FROM company_application_assignments WHERE company_id = ? AND assigned_hr_user_id = ?",
        [companyId, companyUserId]
      );
      const [jobAssignments]: any = await db.query(
        "SELECT job_id FROM company_job_assignments WHERE company_id = ? AND assigned_hr_user_id = ?",
        [companyId, companyUserId]
      );
      const allJobIds = new Set<number>();
      if (assignments) assignments.forEach((a: any) => allJobIds.add(Number(a.job_id)));
      if (jobAssignments) jobAssignments.forEach((a: any) => allJobIds.add(Number(a.job_id)));
      assignedJobIds = Array.from(allJobIds);
    }

    const metrics = await getCompanyAnalyticsMetrics({
      companyId: Number(companyId),
      userId: Number(companyUserId),
      isSubHr,
      assignedJobIds,
      jobStatus: rawJobStatus,
      jobId,
      days: String(req.query.days || 'all')
    });

    return res.json({
      success: true,
      data: {
        scope: {
          jobStatus: rawJobStatus,
          jobId,
          companyUserId
        },
        jobs: {
          total: metrics.stats.totalJobs,
          active: metrics.stats.activeJobs,
          ended: metrics.stats.endedJobs
        },
        applications: {
          total: metrics.stats.totalApplicants,
          inPipeline: metrics.stats.inPipeline,
          inInterview: metrics.stats.inInterview,
          selected: metrics.stats.shortlisted,
          rejected: metrics.stats.rejected,
          hired: metrics.stats.hired
        },
        stats: metrics.stats,
        funnelData: metrics.funnelData,
        jobwiseApplications: metrics.jobwiseApplications,
        stageConversion: metrics.stageConversion,
        timeToHire: metrics.timeToHire,
        timeInStage: metrics.timeInStage,
        heldCandidateTasks: metrics.heldCandidateTasks,
        candidateHoldAlerts: metrics.candidateHoldAlerts,
        topPerformingJobs: metrics.topPerformingJobs,
        lowPerformingJobs: metrics.lowPerformingJobs,
        dropsAnalytics: metrics.dropsAnalytics,
        filterOptions: metrics.filterOptions
      }
    });
  } catch (error) {
    console.error("Employer Analytics Error:", error);
    return res.status(500).json({ success: false, message: "Error fetching employer analytics", error: String(error) });
  }
});

// GET Canonical Company Overview
router.get("/company/overview", authenticate, async (req: any, res) => {
  try {
    let companyId = null;
    const [compProfiles]: any = await db.query("SELECT id FROM company_profiles WHERE user_id = ?", [req.user.userId]);
    if (compProfiles && compProfiles.length > 0) {
      companyId = compProfiles[0].id;
    } else {
      const [hrProfiles]: any = await db.query("SELECT company_id FROM company_hr_profiles WHERE user_id = ?", [req.user.userId]);
      if (hrProfiles && hrProfiles.length > 0) {
        companyId = hrProfiles[0].company_id;
      }
    }

    if (!companyId) {
      return res.status(403).json({ success: false, message: "Company profile not found" });
    }

    const jobStatus = String(req.query.jobStatus || 'all');
    const jobId = String(req.query.jobId || 'all');

    const snapshot = await getPipelineSnapshot(companyId, {
      scope: (jobStatus === 'active' || jobStatus === 'ended' || jobStatus === 'all') ? (jobStatus as any) : 'all',
      jobId: jobId !== 'all' ? Number(jobId) : undefined,
      userId: Number(req.user.userId)
    });

    const [companyJobs]: any = await db.query(
      "SELECT id, title, status, deadline, ended_at, pipeline_ended_at FROM jobs WHERE company_id = ?",
      [companyId]
    );

    const activeJobsCount = (companyJobs || []).filter(isJobActive).length;
    const endedJobsCount = (companyJobs || []).filter(isJobEnded).length;

    const pipeline = {
      applied: snapshot.stages.applied.count,
      aiScreening: snapshot.stages.aiScreening.count,
      assessment: snapshot.stages.assessment.count,
      technicalInterview: snapshot.stages.technicalInterview.count,
      hrInterview: snapshot.stages.hrInterview.count,
      selected: snapshot.stages.selected.count,
      rejected: snapshot.stages.rejected.count
    };

    const pipelineTotal =
      pipeline.applied +
      pipeline.aiScreening +
      pipeline.assessment +
      pipeline.technicalInterview +
      pipeline.hrInterview +
      pipeline.selected +
      pipeline.rejected;

    const reconciliation = {
      pipelineTotal,
      totalApplicants: snapshot.summary.totalApplicants,
      difference: Math.abs(pipelineTotal - snapshot.summary.totalApplicants),
      duplicateApplicationIds: snapshot.reconciliation.duplicateApplicationIds || [],
      missingApplicationIds: snapshot.reconciliation.missingApplicationIds || []
    };

    res.json({
      success: true,
      data: {
        companyId,
        jobs: {
          total: (companyJobs || []).length,
          active: activeJobsCount,
          ended: endedJobsCount
        },
        applications: {
          total: snapshot.summary.totalApplicants,
          inPipeline: snapshot.summary.inPipeline,
          inInterview: snapshot.summary.inInterview,
          selected: snapshot.summary.selected,
          rejected: snapshot.summary.rejected
        },
        pipeline,
        reconciliation
      }
    });
  } catch (error: any) {
    console.error("Company Overview Analytics Error:", error);
    res.status(500).json({ success: false, message: "Error fetching company overview", error: String(error) });
  }
});

// GET Employer Hiring-Time Analytics
router.get("/employer/:companyUserId/hiring-time", authenticate, async (req: any, res) => {
  const { companyUserId } = req.params;
  if (req.user.userId !== Number(companyUserId)) {
    return res.status(403).json({ success: false, message: "Unauthorized access to employer metrics." });
  }

  const jobStatus = String(req.query.jobStatus || 'all').toLowerCase();

  try {
    let companyId = null;
    const [hrProfiles]: any = await db.query("SELECT company_id FROM company_hr_profiles WHERE user_id = ?", [companyUserId]);
    if (hrProfiles && hrProfiles.length > 0) {
      companyId = hrProfiles[0].company_id;
    } else {
      const [company]: any = await db.query("SELECT id FROM company_profiles WHERE user_id = ?", [companyUserId]);
      if (company && company.length > 0) {
        companyId = company[0].id;
      }
    }

    if (!companyId) {
      return res.json({ success: true, overallAvgDays: null, jobWise: [] });
    }

    const isSubHr = hrProfiles && hrProfiles.length > 0;
    let assignedJobIds: number[] = [];

    if (isSubHr) {
      const [assignments]: any = await db.query(
        "SELECT job_id FROM company_application_assignments WHERE company_id = ? AND assigned_hr_user_id = ?",
        [companyId, companyUserId]
      );
      const [jobAssignments]: any = await db.query(
        "SELECT job_id FROM company_job_assignments WHERE company_id = ? AND assigned_hr_user_id = ?",
        [companyId, companyUserId]
      );
      
      const allJobIds = new Set<number>();
      if (assignments) {
        assignments.forEach((a: any) => allJobIds.add(Number(a.job_id)));
      }
      if (jobAssignments) {
        jobAssignments.forEach((a: any) => allJobIds.add(Number(a.job_id)));
      }
      assignedJobIds = Array.from(allJobIds);
    }

    const result = await getHiringTimeData(companyId, isSubHr, assignedJobIds, jobStatus);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error("Hiring Time Error:", error);
    res.status(500).json({ success: false, message: "Error fetching hiring time metrics", error: String(error) });
  }
});

// LOG Profile View
router.post("/profile-view", async (req, res) => {
  const { studentUserId, companyUserId } = req.body;
  try {
    await logProfileView(studentUserId, companyUserId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// GET Company Interviews
router.get("/employer/:companyUserId/interviews", authenticate, async (req: any, res) => {
  const { companyUserId } = req.params;
  
  if (req.user.userId !== Number(companyUserId)) {
    return res.status(403).json({ success: false, message: "Unauthorized access to interviews." });
  }
  try {
    let companyId = null;
    const [hrProfiles]: any = await db.query("SELECT company_id FROM company_hr_profiles WHERE user_id = ?", [companyUserId]);
    if (hrProfiles && hrProfiles.length > 0) {
      companyId = hrProfiles[0].company_id;
    } else {
      const [company]: any = await db.query("SELECT id FROM company_profiles WHERE user_id = ?", [companyUserId]);
      if (company && company.length > 0) {
        companyId = company[0].id;
      }
    }

    if (!companyId) {
      return res.json({ success: true, data: [] });
    }

    const interviewQuery = db.useMySQL ? `
      SELECT 
        i.id,
        i.application_id,
        i.interview_type as type,
        i.location_or_link,
        DATE_FORMAT(i.scheduled_at, '%Y-%m-%dT%H:%i:%s.000Z') as time,
        j.title as role,
        j.id as job_id,
        sp.full_name as candidate,
        sp.profile_photo_url as photo,
        u.email as candidate_email,
        i.notes,
        i.duration,
        i.interviewer_name,
        i.instructions,
        i.scheduler_hr_name,
        i.status
      FROM interview_schedules i
      JOIN job_applications a ON i.application_id = a.id
      JOIN jobs j ON a.job_id = j.id
      JOIN student_profiles sp ON a.student_id = sp.id
      JOIN users u ON sp.user_id = u.id
      WHERE j.company_id = ?
      ORDER BY i.scheduled_at ASC
    ` : `
      SELECT 
        i.id,
        i.application_id,
        i.interview_type as type,
        i.location_or_link,
        i.scheduled_at as time,
        j.title as role,
        j.id as job_id,
        sp.full_name as candidate,
        sp.profile_photo_url as photo,
        u.email as candidate_email,
        i.notes,
        i.duration,
        i.interviewer_name,
        i.instructions,
        i.scheduler_hr_name,
        i.status
      FROM interview_schedules i
      JOIN job_applications a ON i.application_id = a.id
      JOIN jobs j ON a.job_id = j.id
      JOIN student_profiles sp ON a.student_id = sp.id
      JOIN users u ON sp.user_id = u.id
      WHERE j.company_id = ?
      ORDER BY i.scheduled_at ASC
    `;

    const [interviews]: any = await db.query(interviewQuery, [companyId]);
    
    const isSubHr = hrProfiles && hrProfiles.length > 0;
    let assignedAppIds: number[] = [];
    let assignedJobIds: number[] = [];
    let hasAssignments = false;

    if (isSubHr) {
      const [assignments]: any = await db.query(
        "SELECT application_id, job_id FROM company_application_assignments WHERE company_id = ? AND assigned_hr_user_id = ?",
        [companyId, companyUserId]
      );
      const [jobAssignments]: any = await db.query(
        "SELECT job_id FROM company_job_assignments WHERE company_id = ? AND assigned_hr_user_id = ?",
        [companyId, companyUserId]
      );
      
      const allJobIds = new Set<number>();
      if (assignments) {
        assignments.forEach((a: any) => {
          allJobIds.add(Number(a.job_id));
        });
      }
      if (jobAssignments) {
        jobAssignments.forEach((a: any) => {
          allJobIds.add(Number(a.job_id));
        });
      }
      
      if (assignments && assignments.length > 0) {
        assignedAppIds = assignments.map((a: any) => Number(a.application_id));
      }
      assignedJobIds = Array.from(allJobIds);
    }

    let filteredInterviews = interviews || [];
    if (isSubHr) {
      filteredInterviews = filteredInterviews.filter((i: any) => 
        assignedAppIds.includes(Number(i.application_id)) || 
        assignedJobIds.includes(Number(i.job_id))
      );
    }
    
    let computedInterviews = [];
    if (filteredInterviews.length > 0) {
      const interviewIds = filteredInterviews.map((i: any) => i.id);
      const placeholders = interviewIds.map(() => '?').join(',');
      const [attendees]: any = await db.query(`
        SELECT id, interview_id, name, email, role
        FROM interview_attendees
        WHERE interview_id IN (${placeholders})
      `, interviewIds);

      const attendeesMap: Record<number, any[]> = {};
      for (const att of (attendees || [])) {
         if (!attendeesMap[att.interview_id]) {
            attendeesMap[att.interview_id] = [];
         }
         attendeesMap[att.interview_id].push(att);
      }

      const now = new Date();
      computedInterviews = filteredInterviews.map((i: any) => {
        const time = new Date(i.time);
        let status = i.status || 'UPCOMING';
        if (status === 'UPCOMING' && time < now) {
          status = 'COMPLETED';
        }
        return {
          ...i,
          status,
          attendees: attendeesMap[i.id] || []
        };
      });
    }

    res.json({ success: true, data: computedInterviews });
  } catch (error) {
    console.error("Fetch Interviews Error:", error);
    res.status(500).json({ success: false, message: "Error fetching interviews" });
  }
});

    // GET Admin Analytics
router.get("/admin/metrics", async (req, res) => {
  try {
    const [studentsResult]: any = await db.query("SELECT COUNT(*) as students FROM users WHERE role = 'STUDENT'");
    const [companiesResult]: any = await db.query("SELECT COUNT(*) as companies FROM company_profiles WHERE status = 'APPROVED'");
    const [appsResult]: any = await db.query("SELECT COUNT(*) as applications FROM job_applications");
    const [jobsResult]: any = await db.query("SELECT COUNT(*) as totalJobs FROM jobs");
    const [shortlistedResult]: any = await db.query("SELECT COUNT(*) as count FROM job_applications WHERE status IN ('SHORTLISTED', 'TESTING', 'INTERVIEW', 'SELECTED')");
    
    // Check pending company verifications
    const [pendingResult]: any = await db.query("SELECT COUNT(*) as count FROM company_profiles WHERE status IN ('PENDING', 'PENDING_REVERIFICATION')");
    
    const [talentResult]: any = await db.query("SELECT AVG(overall_score) as avg FROM talent_scores");
    
    const students = studentsResult[0]?.students || 0;
    const companies = companiesResult[0]?.companies || 0;
    const applications = appsResult[0]?.applications || 0;
    const totalJobs = jobsResult[0]?.totalJobs || 0;
    const shortlistedCount = shortlistedResult[0]?.count || 0;
    const pendingVerifications = pendingResult[0]?.count || 0;
    const avgTalentScore = Math.round(Number(talentResult[0]?.avg || 0));

    // Calculate Application Trends (last 7 days platform wide)
    const trendQuery = db.useMySQL ? `
      SELECT 
        DATE(applied_at) as date,
        COUNT(*) as count
      FROM job_applications
      WHERE applied_at >= DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY)
      GROUP BY DATE(applied_at)
      ORDER BY DATE(applied_at) ASC
    ` : `
      SELECT 
        date(applied_at) as date,
        COUNT(*) as count
      FROM job_applications
      WHERE applied_at >= date('now', '-7 days')
      GROUP BY date(applied_at)
      ORDER BY date(applied_at) ASC
    `;
    const [trendResult]: any = await db.query(trendQuery);

    // Calculate Interview to Offer Conversion Rate
    const [conversionResult]: any = await db.query(`
      SELECT 
        SUM(CASE WHEN status = 'SELECTED' THEN 1 ELSE 0 END) as offers,
        SUM(CASE WHEN status IN ('INTERVIEW', 'SELECTED') THEN 1 ELSE 0 END) as interviews
      FROM job_applications
    `);
    let conversionRate = 0;
    if (conversionResult[0]?.interviews > 0) {
      conversionRate = Math.round((conversionResult[0].offers / conversionResult[0].interviews) * 100);
    }

    res.json({
      success: true,
      data: {
        metrics: {
          students,
          companies,
          pendingVerifications,
          totalJobs,
          totalApplications: applications,
          shortlisted: shortlistedCount
        },
        trend: trendResult,
        extraStats: {
          avgTalentScore,
          conversionRate
        }
      }
    });
  } catch (error) {
    console.error("Admin Metrics Error:", error);
    res.status(500).json({ success: false, message: "Error fetching admin metrics" });
  }
});

export default router;