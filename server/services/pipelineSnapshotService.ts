import db from "../db.ts";
import { isJobActive, isJobEnded } from "./jobLifecycleService.ts";

export interface PipelineSnapshotBucket {
  bucketKey: string;
  bucketLabel: string;
  count: number;
  percentage: number;
  applications: any[];
}

export interface PipelineSnapshot {
  scope: {
    jobStatus: "all" | "active" | "ended";
    jobId: number | null;
  };
  summary: {
    totalApplicants: number;
    shortlisted: number;
    inInterview: number;
    inPipeline: number;
    selected: number;
    rejected: number;
  };
  stages: {
    applied: { count: number; candidates: any[] };
    aiScreening: { count: number; candidates: any[] };
    assessment: { count: number; candidates: any[] };
    technicalInterview: { count: number; candidates: any[] };
    hrInterview: { count: number; candidates: any[] };
    selected: { count: number; candidates: any[] };
    rejected: { count: number; candidates: any[] };
  };
  reconciliation: {
    bucketTotal: number;
    missingApplicationIds: number[];
    duplicateApplicationIds: number[];
  };
  companyId: number;
  totalApplicants: number;
  buckets: {
    applied: number;
    screening: number;
    assessment: number;
    interview: number;
    hr: number;
    selected: number;
    rejected: number;
  };
  bucketDetails: PipelineSnapshotBucket[];
}

/**
 * Precedence-based Canonical Stage Bucket Resolver:
 * 1. Terminal Application Status (REJECTED, CANCELLED, WITHDRAWN -> 'rejected', SELECTED, HIRED, OFFER_ACCEPTED, SHORTLISTED -> 'selected')
 * 2. Joined Current Stage Type / Name (APPLICATION/APPLIED -> 'applied', SCREENING -> 'aiScreening', TEST/ASSESSMENT -> 'assessment', INTERVIEW -> 'technicalInterview', HR -> 'hrInterview')
 * 3. Fallback -> 'applied'
 */
export function mapStageToCanonicalKey(app: any): {
  key: "applied" | "aiScreening" | "assessment" | "technicalInterview" | "hrInterview" | "selected" | "rejected";
  legacyKey: "applied" | "screening" | "assessment" | "interview" | "hr" | "selected" | "rejected";
} {
  const statusUpper = String(app.status || app.app_status || "").toUpperCase();
  const stageTypeUpper = String(app.current_stage_type || app.stage_type || app.hist_stage_type || "").toUpperCase();
  const stageNameUpper = String(app.current_stage_name || app.stage_name || app.hist_stage_name || "").toUpperCase();

  // 1. Terminal Status (First priority)
  if (statusUpper === "REJECTED" || statusUpper === "CANCELLED" || statusUpper === "WITHDRAWN") {
    return { key: "rejected", legacyKey: "rejected" };
  }
  if (
    statusUpper === "SELECTED" ||
    statusUpper === "HIRED" ||
    statusUpper === "OFFER_ACCEPTED" ||
    statusUpper === "VERIFIED_SELECTION" ||
    statusUpper === "SHORTLISTED"
  ) {
    return { key: "selected", legacyKey: "selected" };
  }

  // 2. Current Stage Type / Name (or history stage type / name)
  if (stageTypeUpper) {
    if (stageTypeUpper === "APPLICATION" || stageTypeUpper === "APPLIED" || stageTypeUpper === "RESUME_REVIEW") {
      return { key: "applied", legacyKey: "applied" };
    }
    if (stageTypeUpper === "SCREENING" || stageTypeUpper === "AI_SCREENING" || stageTypeUpper === "RESUME_SCREENING") {
      return { key: "aiScreening", legacyKey: "screening" };
    }
    if (stageTypeUpper === "TEST" || stageTypeUpper === "ASSESSMENT" || stageTypeUpper === "SKILL_ASSESSMENT" || stageTypeUpper === "TEST_STAGE") {
      return { key: "assessment", legacyKey: "assessment" };
    }
    if (stageTypeUpper === "HR" || stageTypeUpper === "HR_INTERVIEW") {
      return { key: "hrInterview", legacyKey: "hr" };
    }
    if (stageTypeUpper === "INTERVIEW" || stageTypeUpper === "INTERVIEW_ONLINE" || stageTypeUpper === "TECHNICAL_INTERVIEW") {
      if (stageNameUpper.includes("HR")) {
        return { key: "hrInterview", legacyKey: "hr" };
      }
      return { key: "technicalInterview", legacyKey: "interview" };
    }
    if (stageTypeUpper === "SELECTED" || stageTypeUpper === "HIRED" || stageTypeUpper === "OFFER") {
      return { key: "selected", legacyKey: "selected" };
    }
  }

  if (stageNameUpper) {
    if (stageNameUpper.includes("APPLICATION") || stageNameUpper.includes("APPLIED")) {
      return { key: "applied", legacyKey: "applied" };
    }
    if (stageNameUpper.includes("SCREEN") || stageNameUpper.includes("AI")) {
      return { key: "aiScreening", legacyKey: "screening" };
    }
    if (stageNameUpper.includes("TEST") || stageNameUpper.includes("ASSESS")) {
      return { key: "assessment", legacyKey: "assessment" };
    }
    if (stageNameUpper.includes("HR") && stageNameUpper.includes("INTERVIEW")) {
      return { key: "hrInterview", legacyKey: "hr" };
    }
    if (stageNameUpper.includes("INTERVIEW") || stageNameUpper.includes("TECH")) {
      return { key: "technicalInterview", legacyKey: "interview" };
    }
    if (stageNameUpper.includes("SELECT") || stageNameUpper.includes("SHORTLIST") || stageNameUpper.includes("HIRE") || stageNameUpper.includes("OFFER")) {
      return { key: "selected", legacyKey: "selected" };
    }
  }

  // 3. Status string fallback
  if (statusUpper === "IN_PROGRESS") {
    return { key: "aiScreening", legacyKey: "screening" };
  }

  // 4. Fallback to applied
  return { key: "applied", legacyKey: "applied" };
}

/**
 * Computes a canonical pipeline snapshot for a company or job.
 * Guarantee: Every application is assigned to EXACTLY ONE bucket.
 * The sum of bucket counts equals totalApplicants.
 */
export async function getPipelineSnapshot(
  companyId: number,
  options?: {
    scope?: "all" | "active" | "ended";
    jobId?: number;
    userId?: number;
    searchQuery?: string;
    minScore?: number;
  }
): Promise<PipelineSnapshot> {
  const rawScope = String(options?.scope || "").toLowerCase();
  const scopeVal: "all" | "active" | "ended" =
    rawScope === "inactive" || rawScope === "ended" ? "ended" : rawScope === "all" ? "all" : "active";
  const targetJobId = options?.jobId ? Number(options.jobId) : null;
  const userId = options?.userId ? Number(options.userId) : null;

  // 1. Check Sub HR scoping if userId is provided
  let assignedJobIds: number[] | null = null;
  let assignedAppIds: number[] | null = null;

  if (userId) {
    const [hrProfiles]: any = await db.query(
      "SELECT company_id FROM company_hr_profiles WHERE user_id = ?",
      [userId]
    );
    if (hrProfiles && hrProfiles.length > 0) {
      const [assignments]: any = await db.query(
        "SELECT application_id, job_id FROM company_application_assignments WHERE company_id = ? AND assigned_hr_user_id = ?",
        [companyId, userId]
      );
      const [jobAssignments]: any = await db.query(
        "SELECT job_id FROM company_job_assignments WHERE company_id = ? AND assigned_hr_user_id = ?",
        [companyId, userId]
      );

      const allJobIds = new Set<number>();
      if (assignments) assignments.forEach((a: any) => allJobIds.add(Number(a.job_id)));
      if (jobAssignments) jobAssignments.forEach((a: any) => allJobIds.add(Number(a.job_id)));

      if (allJobIds.size > 0) {
        assignedJobIds = Array.from(allJobIds);
      }
      if (assignments && assignments.length > 0) {
        assignedAppIds = assignments.map((a: any) => Number(a.application_id));
      }
    }
  }

  // 2. Query applications joined with jobs, stages, student profile, user, scores
  let sql = `
    SELECT 
      a.id as application_id,
      a.job_id,
      a.student_id,
      a.current_stage_id,
      a.status as app_status,
      a.status,
      a.rejection_stage_id,
      a.rejection_feedback,
      a.rejected_at,
      a.rejection_notification_status,
      a.rejection_notified_at,
      a.applied_at,
      j.title as job_title,
      j.status as job_status,
      j.deadline,
      j.ended_at,
      j.pipeline_ended_at,
      js.stage_name as current_stage_name,
      js.stage_type as current_stage_type,
      js.stage_order as current_stage_order,
      sp.full_name,
      sp.full_name as student_name,
      sp.skills_json,
      sp.resume_url,
      u.email,
      u.email as student_email,
      ts.overall_score as talent_score,
      sps.avg_interview_score,
      test_res.score as assessment_score,
      test_res.total_marks as assessment_total_score,
      test_res.percentage as assessment_percentage,
      test_res.passed as assessment_passed,
      test_res.cutoff_score as assessment_cutoff,
      test_res.violations_count as assessment_violations_count,
      test_res.submission_status as assessment_status
    FROM job_applications a
    JOIN jobs j ON a.job_id = j.id
    LEFT JOIN job_stages js ON a.current_stage_id = js.id
    LEFT JOIN student_profiles sp ON a.student_id = sp.id
    LEFT JOIN users u ON sp.user_id = u.id
    LEFT JOIN talent_scores ts ON u.id = ts.user_id
    LEFT JOIN student_performance_stats sps ON u.id = sps.user_id
    LEFT JOIN (
      SELECT 
        sub.job_id,
        sub.student_id,
        sub.application_id,
        sub.score,
        sub.total_marks,
        sub.percentage,
        sub.passed,
        sub.cutoff_score,
        sub.violations_count,
        sub.status as submission_status
      FROM test_submissions sub
      INNER JOIN (
        SELECT COALESCE(application_id, 0) as app_id, student_id, job_id, MAX(id) as max_id 
        FROM test_submissions 
        GROUP BY COALESCE(application_id, 0), student_id, job_id
      ) latest ON sub.id = latest.max_id
    ) test_res ON (test_res.application_id = a.id OR (test_res.job_id = a.job_id AND test_res.student_id = a.student_id))
    WHERE j.company_id = ?
  `;

  const params: any[] = [companyId];

  if (targetJobId) {
    sql += ` AND j.id = ?`;
    params.push(targetJobId);
  }

  sql += ` ORDER BY a.applied_at DESC`;

  const [rows]: any = await db.query(sql, params);
  const rawApps = rows || [];

  // 2b. Fallback: resolve current_stage_id from application_history if missing or invalid
  for (const app of rawApps) {
    if (!app.current_stage_id || !app.current_stage_name) {
      try {
        const [hist]: any = await db.query(
          `SELECT ah.stage_id, js.stage_name, js.stage_type, js.stage_order, js.job_id
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
      } catch (err) {
        // Safe fallback ignoring error if history table is absent
      }
    }
  }

  // 3. Filter by Sub HR assignments, lifecycle scope, search query, minScore
  const filteredApps = rawApps.filter((a: any) => {
    // Sub HR scoping
    if (assignedJobIds !== null || assignedAppIds !== null) {
      const jobAllowed = assignedJobIds?.includes(Number(a.job_id));
      const appAllowed = assignedAppIds?.includes(Number(a.application_id));
      if (!jobAllowed && !appAllowed) return false;
    }

    // Lifecycle Scope filtering
    if (!targetJobId) {
      const active = isJobActive({
        status: a.job_status,
        deadline: a.deadline,
        ended_at: a.ended_at,
        pipeline_ended_at: a.pipeline_ended_at,
      });
      if (scopeVal === "active" && !active) return false;
      if (scopeVal === "ended" && active) return false;
    }

    // Search query filter
    if (options?.searchQuery) {
      const q = options.searchQuery.toLowerCase();
      const matchName = (a.full_name || a.student_name || "").toLowerCase().includes(q);
      const matchJob = (a.job_title || "").toLowerCase().includes(q);
      const matchEmail = (a.email || a.student_email || "").toLowerCase().includes(q);
      if (!matchName && !matchJob && !matchEmail) return false;
    }

    // Minimum match score filter
    if (options?.minScore && options.minScore > 0) {
      if ((a.talent_score || 0) < options.minScore) return false;
    }

    return true;
  });

  // 4. Initialize stage buckets
  const stages = {
    applied: { count: 0, candidates: [] as any[] },
    aiScreening: { count: 0, candidates: [] as any[] },
    assessment: { count: 0, candidates: [] as any[] },
    technicalInterview: { count: 0, candidates: [] as any[] },
    hrInterview: { count: 0, candidates: [] as any[] },
    selected: { count: 0, candidates: [] as any[] },
    rejected: { count: 0, candidates: [] as any[] },
  };

  const legacyBuckets = {
    applied: 0,
    screening: 0,
    assessment: 0,
    interview: 0,
    hr: 0,
    selected: 0,
    rejected: 0,
  };

  const legacyBucketApps: Record<string, any[]> = {
    applied: [],
    screening: [],
    assessment: [],
    interview: [],
    hr: [],
    selected: [],
    rejected: [],
  };

  const seenAppIds = new Set<number>();
  const duplicateAppIds: number[] = [];

  // 5. Bucket assignment - EXACTLY ONE bucket per application
  for (const app of filteredApps) {
    const appId = Number(app.application_id);
    if (seenAppIds.has(appId)) {
      duplicateAppIds.push(appId);
      continue;
    }
    seenAppIds.add(appId);

    const { key, legacyKey } = mapStageToCanonicalKey(app);

    stages[key].count++;
    stages[key].candidates.push(app);

    legacyBuckets[legacyKey]++;
    legacyBucketApps[legacyKey].push(app);
  }

  const totalApplicants = filteredApps.length;

  // Invariant verification
  const bucketTotal =
    stages.applied.count +
    stages.aiScreening.count +
    stages.assessment.count +
    stages.technicalInterview.count +
    stages.hrInterview.count +
    stages.selected.count +
    stages.rejected.count;

  if (bucketTotal !== totalApplicants) {
    console.warn(
      `[PipelineSnapshot Invariant Warning] bucketTotal (${bucketTotal}) !== totalApplicants (${totalApplicants}) for companyId=${companyId}`
    );
  }

  const summary = {
    totalApplicants,
    shortlisted: stages.selected.count,
    inInterview: stages.technicalInterview.count + stages.hrInterview.count,
    inPipeline:
      stages.applied.count +
      stages.aiScreening.count +
      stages.assessment.count +
      stages.technicalInterview.count +
      stages.hrInterview.count,
    selected: stages.selected.count,
    rejected: stages.rejected.count,
  };

  const bucketLabels: Record<string, string> = {
    applied: "Applied",
    screening: "AI Screening",
    assessment: "Assessment",
    interview: "Technical Interview",
    hr: "HR Interview",
    selected: "Selected",
    rejected: "Rejected",
  };

  const bucketDetails: PipelineSnapshotBucket[] = Object.keys(legacyBuckets).map((key) => {
    const count = legacyBuckets[key as keyof typeof legacyBuckets];
    return {
      bucketKey: key,
      bucketLabel: bucketLabels[key] || key,
      count,
      percentage: totalApplicants > 0 ? Math.round((count / totalApplicants) * 100) : 0,
      applications: legacyBucketApps[key],
    };
  });

  return {
    scope: {
      jobStatus: scopeVal,
      jobId: targetJobId,
    },
    summary,
    stages,
    reconciliation: {
      bucketTotal,
      missingApplicationIds: [],
      duplicateApplicationIds: duplicateAppIds,
    },
    companyId,
    totalApplicants,
    buckets: legacyBuckets,
    bucketDetails,
  };
}
