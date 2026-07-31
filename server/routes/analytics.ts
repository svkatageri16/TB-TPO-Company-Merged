import express from "express";
import db from "../db.ts";
import { logProfileView, updateDailyTask, calculateTalentScore, updateLoginStreak } from "../services/analyticsService.ts";
import { authenticate } from "../middleware/auth.ts";
import { getPipelineSnapshot, mapStageToCanonicalKey } from "../services/pipelineSnapshotService.ts";

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

const isJobActive = (job: any) => {
  if (!job) return false;
  if (job.status === 'CLOSED') return false;
  if (job.ended_at) return false;
  if (job.pipeline_ended_at) return false;
  
  const isValidDeadline = job.deadline && 
    job.deadline !== 'null' && 
    job.deadline !== 'undefined' && 
    job.deadline.toString().trim() !== '' && 
    job.deadline !== '0000-00-00' && 
    !isNaN(new Date(job.deadline).getTime());
  
  if (isValidDeadline) {
    const isExpired = new Date(job.deadline).setHours(23, 59, 59, 999) < Date.now();
    if (isExpired) return false;
  }
  
  return job.status === 'OPEN';
};

const isJobEnded = (job: any) => {
  if (!job) return false;
  if (job.status === 'CLOSED') return true;
  if (job.ended_at) return true;
  
  const isValidDeadline = job.deadline && 
    job.deadline !== 'null' && 
    job.deadline !== 'undefined' && 
    job.deadline.toString().trim() !== '' && 
    job.deadline !== '0000-00-00' && 
    !isNaN(new Date(job.deadline).getTime());
  
  if (isValidDeadline) {
    const isExpired = new Date(job.deadline).setHours(23, 59, 59, 999) < Date.now();
    if (isExpired) return true;
  }
  
  return false;
};

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
      } else {
        const [allComp]: any = await db.query("SELECT id FROM company_profiles LIMIT 1");
        if (allComp && allComp.length > 0) {
          companyId = Number(allComp[0].id);
        }
      }
    }

    if (!companyId) {
      return res.status(400).json({ success: false, message: "Company profile not found" });
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
  const days = String(req.query.days || 'all');
  const jobId = String(req.query.jobId || 'all');
  const hrUserId = String(req.query.hrUserId || 'all');
  const jobStatus = String(req.query.jobStatus || 'all');

  // Backend helper function delegating to canonical stage resolver mapStageToCanonicalKey
  const normalizeStageBucket = (app: any) => {
    const { key } = mapStageToCanonicalKey(app);
    if (key === 'rejected') return 'REJECTED';
    if (key === 'selected') return 'HIRED';
    if (key === 'technicalInterview' || key === 'hrInterview') return 'INTERVIEW';
    if (key === 'assessment') return 'ASSESSMENT';
    if (key === 'aiScreening') return 'SCREENING';
    return 'APPLIED';
  };

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
      return res.json({
        success: true,
        data: {
          stats: { totalJobs: 0, totalApps: 0, totalHires: 0, totalViews: 0, applicationRate: "0%", avgTimeToHire: "N/A", interviewSuccess: "0%" },
          applicants: [],
          filterOptions: { jobs: [], hrTeam: [] },
          timeToHire: { overallAvgDays: null, jobWise: [] },
          timeInStage: [],
          stageConversion: [],
          topPerformingJobs: [],
          lowPerformingJobs: [],
          dropsAnalytics: [],
          heldCandidateTasks: []
        }
      });
    }

    // Check if Sub HR has specific assignments
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
      
      if (allJobIds.size > 0) {
        hasAssignments = true;
        assignedJobIds = Array.from(allJobIds);
      }
    }

    // Get filter option: Recruiter Owners (Sub HRs)
    const [hrList]: any = await db.query(`
      SELECT u.id, u.id AS user_id, u.email, u.status, u.created_at, h.designation, h.permissions, h.role_type
      FROM users u
      JOIN company_hr_profiles h ON u.id = h.user_id
      WHERE h.company_id = ?
    `, [companyId]);

    const hrTeam = (hrList || []).map((hr: any) => ({
      id: hr.user_id,
      name: hr.email,
      role_type: hr.role_type || hr.designation || 'Recruiter'
    }));

    // Get filter option: Jobs (only active jobs for requirement selection and scheduling)
    const [companyJobs]: any = await db.query(`
      SELECT id, title, status, deadline, ended_at, pipeline_ended_at FROM jobs WHERE company_id = ?
    `, [companyId]);

    let filteredCompanyJobs = companyJobs || [];
    if (isSubHr) {
      filteredCompanyJobs = filteredCompanyJobs.filter((j: any) => assignedJobIds.includes(Number(j.id)));
    }

    const activeCompanyJobs = filteredCompanyJobs.filter(isJobActive);

    const jobsOptions = activeCompanyJobs.map((j: any) => ({
      id: j.id,
      title: j.title,
      status: j.status
    }));

    const filterOptions = {
      jobs: jobsOptions,
      hrTeam
    };

    // Filter jobs for metrics
    let filteredJobs = filteredCompanyJobs;
    if (jobId !== 'all') {
      filteredJobs = filteredJobs.filter((j: any) => String(j.id) === String(jobId));
    }
    if (jobStatus !== 'all') {
      if (jobStatus === 'active') {
        filteredJobs = filteredJobs.filter(isJobActive);
      } else if (jobStatus === 'ended') {
        filteredJobs = filteredJobs.filter(isJobEnded);
      }
    }

    const [viewsCount]: any = await db.query("SELECT COUNT(*) as totalViews FROM profile_views WHERE company_id = ?", [companyId]);
    const totalViews = viewsCount[0]?.totalViews || 0;

    // Get all candidates applied to this company's jobs
    const [allApplicants]: any = await db.query(`
      SELECT 
        sp.*, 
        sp.id as student_id,
        u.email as email,
        ts.overall_score as talent_score, ts.breakdown_json,
        a.status,
        a.id as application_id,
        a.current_stage_id,
        a.rejection_stage_id,
        a.rejection_feedback,
        a.rejected_at,
        a.job_id as job_id,
        a.applied_at,
        (SELECT MIN(created_at) FROM application_history WHERE application_id = a.id AND action IN ('SELECTED', 'HIRED', 'OFFER', 'OFFER_ACCEPTED', 'VERIFIED_SELECTION', 'SHORTLISTED_FOR_HIRE', 'MOVED_TO_SELECTED', 'MOVED_TO_HIRED', 'SHORTLISTED')) as hired_at,
        j.title as job_title,
        j.status as job_status,
        j.deadline as job_deadline,
        j.ended_at as job_ended_at,
        sps.avg_interview_score,
        js.stage_name AS current_stage_name,
        js.stage_type AS current_stage_type,
        js.stage_order AS current_stage_order,
        (SELECT score FROM test_submissions WHERE application_id = a.id ORDER BY submitted_at DESC LIMIT 1) as latest_test_score
      FROM job_applications a
      JOIN student_profiles sp ON a.student_id = sp.id
      JOIN users u ON sp.user_id = u.id
      JOIN jobs j ON a.job_id = j.id
      LEFT JOIN talent_scores ts ON sp.user_id = ts.user_id
      LEFT JOIN student_performance_stats sps ON sp.user_id = sps.user_id
      LEFT JOIN job_stages js ON a.current_stage_id = js.id
      WHERE j.company_id = ?
      ORDER BY a.applied_at DESC
    `, [companyId]);

    (allApplicants || []).forEach((a: any) => {
      a.canonical_stage_key = mapStageToCanonicalKey(a).key;
    });

    // Apply filters in memory for extreme robustness and dialect compatibility
    let filteredAllApplicants = allApplicants || [];
    if (isSubHr) {
      filteredAllApplicants = filteredAllApplicants.filter((a: any) => 
        assignedAppIds.includes(Number(a.application_id)) || 
        assignedJobIds.includes(Number(a.job_id))
      );
    }
    let filteredApplicants = filteredAllApplicants;

    const isAppJobActive = (a: any) => {
      if (!a) return false;
      if (a.job_status === 'CLOSED') return false;
      if (a.job_ended_at) return false;
      const isValidDeadline = a.job_deadline && 
        a.job_deadline !== 'null' && 
        a.job_deadline !== 'undefined' && 
        a.job_deadline.toString().trim() !== '' && 
        a.job_deadline !== '0000-00-00' && 
        !isNaN(new Date(a.job_deadline).getTime());
      if (isValidDeadline) {
        return new Date(a.job_deadline).setHours(23, 59, 59, 999) >= Date.now();
      }
      return a.job_status === 'OPEN' || a.job_status === 'Active';
    };

    if (jobId !== 'all') {
      filteredApplicants = filteredApplicants.filter((a: any) => String(a.job_id) === String(jobId));
    }
    if (jobStatus !== 'all') {
      if (jobStatus === 'active') {
        filteredApplicants = filteredApplicants.filter(isAppJobActive);
      } else if (jobStatus === 'ended') {
        filteredApplicants = filteredApplicants.filter((a: any) => !isAppJobActive(a));
      }
    }
    if (days !== 'all') {
      const daysCount = parseInt(days);
      if (!isNaN(daysCount)) {
        const limitDate = new Date();
        limitDate.setDate(limitDate.getDate() - daysCount);
        filteredApplicants = filteredApplicants.filter((a: any) => new Date(a.applied_at) >= limitDate);
      }
    }

    const totalJobs = filteredJobs.length;
    const totalApps = filteredApplicants.length;
    const totalHires = filteredApplicants.filter((a: any) => normalizeStageBucket(a) === 'HIRED').length;

    // Get Application Trend (last 7 days platform wide or filtered)
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const trendMap: Record<string, number> = {};
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = weekdays[d.getDay()];
      trendMap[dayName] = 0;
    }

    filteredApplicants.forEach((a: any) => {
      const appDate = new Date(a.applied_at);
      const diffTime = Math.abs(Date.now() - appDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 7) {
        const dayName = weekdays[appDate.getDay()];
        if (trendMap[dayName] !== undefined) {
          trendMap[dayName]++;
        }
      }
    });

    const trend = Object.entries(trendMap).map(([name, apps]) => ({
      name,
      apps
    }));

    // Get Funnel Data
    const funnelCounts: Record<string, number> = {
      'Applied': 0,
      'Screening': 0,
      'Assessment': 0,
      'Interview': 0,
      'Hired': 0
    };

    filteredApplicants.forEach((a: any) => {
      const bucket = normalizeStageBucket(a);
      if (bucket === 'HIRED') {
        funnelCounts['Applied']++;
        funnelCounts['Screening']++;
        funnelCounts['Assessment']++;
        funnelCounts['Interview']++;
        funnelCounts['Hired']++;
      } else if (bucket === 'INTERVIEW') {
        funnelCounts['Applied']++;
        funnelCounts['Screening']++;
        funnelCounts['Assessment']++;
        funnelCounts['Interview']++;
      } else if (bucket === 'ASSESSMENT') {
        funnelCounts['Applied']++;
        funnelCounts['Screening']++;
        funnelCounts['Assessment']++;
      } else if (bucket === 'SCREENING') {
        funnelCounts['Applied']++;
        funnelCounts['Screening']++;
      } else if (bucket === 'APPLIED') {
        funnelCounts['Applied']++;
      }
    });

    const mappedFunnel = Object.entries(funnelCounts).map(([name, value]) => ({
      name,
      value
    }));

    // Get Top Skills in Demand
    const skillCounts: any = {};
    filteredJobs.forEach((j: any) => {
      try {
        const skills = typeof j.skills_json === 'string' ? JSON.parse(j.skills_json) : (j.skills_json || []);
        skills.forEach((s: string) => {
          skillCounts[s] = (skillCounts[s] || 0) + 1;
        });
      } catch (e) {}
    });
    const skillData = Object.entries(skillCounts)
      .map(([name, count]) => ({ name, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Get Actual Rejections
    const [rejections]: any = await db.query(`
      SELECT 
        ah.application_id,
        COALESCE(ah.notes, 'Other') as reason
      FROM application_history ah
      JOIN job_applications ja ON ah.application_id = ja.id
      JOIN jobs j ON ja.job_id = j.id
      WHERE j.company_id = ? AND ah.action = 'REJECTED'
    `, [companyId]);

    const rejectedAppIds = new Set(
      filteredApplicants.filter((a: any) => normalizeStageBucket(a) === 'REJECTED').map((a: any) => a.application_id)
    );
    const filteredRejections = rejections.filter((r: any) => rejectedAppIds.has(r.application_id));

    const rejectionMap: Record<string, number> = {};
    filteredRejections.forEach((r: any) => {
      let name = 'Other';
      const lowerRes = r.reason.toLowerCase();
      if (lowerRes.includes('skill') || lowerRes.includes('test')) name = 'Skill Mismatch';
      else if (lowerRes.includes('experience') || lowerRes.includes('exp')) name = 'Exp. Level';
      else if (lowerRes.includes('culture') || lowerRes.includes('fit') || lowerRes.includes('interview')) name = 'Culture Fit';
      
      rejectionMap[name] = (rejectionMap[name] || 0) + 1;
    });

    const rejectionData = Object.keys(rejectionMap).length > 0
      ? Object.entries(rejectionMap).map(([name, value]) => ({ name, value }))
      : [ { name: 'No Rejections Yet', value: 1 } ];

    // Calculate Dynamic Time-to-Hire
    const timeToHire = await getHiringTimeData(companyId, isSubHr, assignedJobIds, jobStatus);
    const overallAvgDays = timeToHire.overallAvgDays;
    const avgTimeToHire = overallAvgDays !== null ? `${overallAvgDays} Days` : "No hires yet";

    // Calculate Dynamic Time-in-Stage using history logs
    const [historyRows]: any = await db.query(`
      SELECT 
        ah.application_id,
        ah.stage_id,
        js.stage_name,
        ah.action,
        ah.created_at,
        ja.applied_at
      FROM application_history ah
      JOIN job_applications ja ON ah.application_id = ja.id
      JOIN jobs j ON ja.job_id = j.id
      LEFT JOIN job_stages js ON ah.stage_id = js.id
      WHERE j.company_id = ?
      ORDER BY ah.application_id, ah.created_at ASC
    `, [companyId]);

    const appHistoryMap: Record<number, any[]> = {};
    for (const h of historyRows) {
      if (!appHistoryMap[h.application_id]) {
        appHistoryMap[h.application_id] = [];
      }
      appHistoryMap[h.application_id].push(h);
    }

    const stageDurations: Record<string, number[]> = {};
    const heldTasksMap: Record<string, { jobId: number; jobTitle: string; stageName: string; heldCount: number; oldestWaitingDays: number }> = {};

    for (const app of filteredApplicants) {
      const history = appHistoryMap[app.application_id] || [];
      const appliedTime = new Date(app.applied_at).getTime();
      let prevTime = appliedTime;
      let prevStage = 'Applied';

      for (const h of history) {
        const currTime = new Date(h.created_at).getTime();
        const diffDays = Math.max(0, (currTime - prevTime) / (1000 * 60 * 60 * 24));
        
        if (!stageDurations[prevStage]) stageDurations[prevStage] = [];
        stageDurations[prevStage].push(diffDays);

        prevStage = h.stage_name || h.action || 'In Progress';
        prevTime = currTime;
      }

      // Time spent in the current active stage
      if (app.status !== 'SELECTED' && app.status !== 'REJECTED') {
        const currTime = Date.now();
        const diffDays = Math.max(0, (currTime - prevTime) / (1000 * 60 * 60 * 24));
        if (!stageDurations[prevStage]) stageDurations[prevStage] = [];
        stageDurations[prevStage].push(diffDays);

        // Check if candidate is stuck (>7 days)
        const ageInDays = Math.round(diffDays);
        if (ageInDays > 7) {
          const currentStageName = app.current_stage_name || prevStage || 'Applied';
          const taskKey = `${app.job_id}_${currentStageName}`;
          if (!heldTasksMap[taskKey]) {
            heldTasksMap[taskKey] = {
              jobId: app.job_id,
              jobTitle: app.job_title || 'Unknown Job',
              stageName: currentStageName,
              heldCount: 0,
              oldestWaitingDays: 0
            };
          }
          heldTasksMap[taskKey].heldCount++;
          if (ageInDays > heldTasksMap[taskKey].oldestWaitingDays) {
            heldTasksMap[taskKey].oldestWaitingDays = ageInDays;
          }
        }
      }
    }

    const timeInStage = Object.entries(stageDurations).map(([stageName, durs]) => {
      const total = durs.reduce((sum, d) => sum + d, 0);
      const avgDays = durs.length > 0 ? Math.round((total / durs.length) * 10) / 10 : 0;
      const longestWait = durs.length > 0 ? Math.round(Math.max(...durs) * 10) / 10 : 0;
      const delayedCount = durs.filter(d => d > 7).length;

      return {
        stage: stageName,
        avgDays,
        longestWait,
        delayedCount
      };
    });

    const heldCandidateTasks = Object.values(heldTasksMap).map(task => ({
      jobTitle: task.jobTitle,
      stageName: task.stageName,
      heldCount: task.heldCount,
      oldestWaitingDays: task.oldestWaitingDays,
      actionPath: `/company/pipeline?jobId=${task.jobId}`
    }));

    // Calculate Stage Conversion Rate
    const screeningCount = filteredApplicants.filter(a => ['SCREENING', 'ASSESSMENT', 'INTERVIEW', 'HIRED'].includes(normalizeStageBucket(a))).length;
    const assessmentCount = filteredApplicants.filter(a => ['ASSESSMENT', 'INTERVIEW', 'HIRED'].includes(normalizeStageBucket(a))).length;
    const interviewCount = filteredApplicants.filter(a => ['INTERVIEW', 'HIRED'].includes(normalizeStageBucket(a))).length;
    const hiredCount = filteredApplicants.filter(a => normalizeStageBucket(a) === 'HIRED').length;

    const stageConversion = [
      {
        stage: 'Applied to Screening',
        fromCount: totalApps,
        toCount: screeningCount,
        rate: totalApps > 0 ? Math.round((screeningCount / totalApps) * 100) : 0
      },
      {
        stage: 'Screening to Assessment',
        fromCount: screeningCount,
        toCount: assessmentCount,
        rate: screeningCount > 0 ? Math.round((assessmentCount / screeningCount) * 100) : 0
      },
      {
        stage: 'Assessment to Interview',
        fromCount: assessmentCount,
        toCount: interviewCount,
        rate: assessmentCount > 0 ? Math.round((interviewCount / assessmentCount) * 100) : 0
      },
      {
        stage: 'Interview to Hired',
        fromCount: interviewCount,
        toCount: hiredCount,
        rate: interviewCount > 0 ? Math.round((hiredCount / interviewCount) * 100) : 0
      }
    ];

    // Compute Top and Low Performing Jobs
    const jobsPerformanceList = filteredJobs.map((j: any) => {
      const jobApplicants = filteredApplicants.filter((a: any) => String(a.job_id) === String(j.id));
      const hires = jobApplicants.filter((a: any) => normalizeStageBucket(a) === 'HIRED').length;
      const apps = jobApplicants.length;
      const conversionRate = apps > 0 ? Math.round((hires / apps) * 100) : 0;

      const hiredAppsWithTime = jobApplicants.filter((a: any) => a.hired_at);
      let avgDaysToHire = null;
      if (hiredAppsWithTime.length > 0) {
        const sumDays = hiredAppsWithTime.reduce((sum: number, a: any) => {
          const start = new Date(a.applied_at);
          const end = new Date(a.hired_at);
          return sum + Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        }, 0);
        avgDaysToHire = Math.round(sumDays / hiredAppsWithTime.length);
      }

      return {
        id: j.id,
        title: j.title,
        totalApplications: apps,
        hiredCount: hires,
        conversionRate,
        avgDaysToHire
      };
    });

    const topPerformingJobs = jobsPerformanceList
      .filter(jp => jp.totalApplications > 0 && (jp.conversionRate >= 10 || jp.hiredCount > 0))
      .map(jp => ({
        title: jp.title,
        performanceBadge: jp.conversionRate >= 25 ? 'Excellent' : 'Good',
        conversionRate: jp.conversionRate,
        totalApplications: jp.totalApplications,
        avgDaysToHire: jp.avgDaysToHire
      }))
      .sort((a, b) => b.conversionRate - a.conversionRate)
      .slice(0, 5);

    const lowPerformingJobs = jobsPerformanceList
      .filter(jp => jp.hiredCount === 0 || jp.conversionRate < 10)
      .map(jp => {
        let problemReason = "Low candidate conversion";
        let suggestedAction = "Optimize screening criteria or increase compensation visibility.";
        if (jp.totalApplications < 3) {
          problemReason = "Low applicant volume";
          suggestedAction = "Refine job titles, add high-demand skills, or promote posting.";
        } else if (jp.totalApplications >= 8 && jp.hiredCount === 0) {
          problemReason = "High drop-off in screening/tests";
          suggestedAction = "Verify test difficulty settings and lower passing score thresholds.";
        }
        return {
          title: jp.title,
          problemReason,
          suggestedAction
        };
      })
      .slice(0, 5);

    // Get Corporate Drops Analytics
    const [dropsRows]: any = await db.query(`
      SELECT 
        title, 
        type, 
        views_count as views, 
        comments_count as comments, 
        shares_count as shares
      FROM drops 
      WHERE company_id = ?
    `, [companyId]);

    const dropsAnalytics = (dropsRows || []).map((d: any) => {
      const engagementRate = d.views > 0 ? Math.round(((d.comments + d.shares) / d.views) * 100) : 0;
      const engagementScore = d.views + d.comments * 5 + d.shares * 10;
      return {
        title: d.title,
        type: d.type,
        views: d.views,
        comments: d.comments,
        shares: d.shares,
        engagementRate,
        engagementScore
      };
    });

    res.json({
      success: true,
      data: {
        stats: {
          totalJobs,
          totalApps,
          totalHires,
          totalViews,
          applicationRate: totalApps > 0 ? ((totalApps / (totalViews || 1)) * 100).toFixed(1) + '%' : '0%',
          avgTimeToHire,
          interviewSuccess: totalApps > 0 ? ((totalHires / totalApps) * 100).toFixed(1) + '%' : '0%'
        },
        trendData: trend,
        funnelData: mappedFunnel,
        skillData: skillData,
        rejectionData,
        applicants: filteredApplicants,
        filterOptions,
        timeToHire,
        timeInStage,
        stageConversion,
        topPerformingJobs,
        lowPerformingJobs,
        dropsAnalytics,
        heldCandidateTasks
      }
    });
  } catch (error) {
    console.error("Employer Analytics Error:", error);
    res.status(500).json({ success: false, message: "Error fetching employer analytics", error: String(error) });
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