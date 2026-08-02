import db from "../db.ts";
import { isJobActive, isJobEnded } from "./jobLifecycleService.ts";

export type PipelineStageKey =
  | 'applied'
  | 'aiScreening'
  | 'assessment'
  | 'technicalInterview'
  | 'hrInterview'
  | 'selected'
  | 'rejected';

export interface PipelineCandidate {
  application_id: number;
  job_id: number;
  student_id: number;
  current_stage_id: number | null;
  status: string;
  latest_test_attempt_id?: number | null;
  latest_test_assignment_id?: number | null;
  latest_test_score?: number | null;
  latest_test_total_marks?: number | null;
  latest_test_percentage?: number | null;
  latest_test_passed?: boolean | number | null;
  latest_test_cutoff?: number | null;
  latest_test_status?: string | null;
  latest_test_violations_count?: number | null;
  latest_test_integrity_flag?: boolean | number | null;
  [key: string]: unknown;
}

export interface StageBucket {
  count: number;
  candidates: PipelineCandidate[];
}

export type PipelineStages = Record<PipelineStageKey, StageBucket>;

export interface PipelineSnapshot {
  scope: {
    jobStatus: "all" | "active" | "ended";
    jobId: number | null;
  };
  summary: {
    totalApplicants: number;
    inPipeline: number;
    inInterview: number;
    selected: number;
    rejected: number;
  };
  stages: PipelineStages;
  reconciliation: {
    bucketTotal: number;
    missingApplicationIds: number[];
    duplicateApplicationIds: number[];
  };
}

/**
 * Precedence-based Canonical Stage Bucket Resolver:
 * 1. Terminal Application Status (REJECTED, CANCELLED, WITHDRAWN -> 'rejected', SELECTED, HIRED, OFFER_ACCEPTED, SHORTLISTED -> 'selected')
 * 2. Joined Current Stage Type / Name (APPLICATION/APPLIED -> 'applied', SCREENING -> 'aiScreening', TEST/ASSESSMENT -> 'assessment', INTERVIEW -> 'technicalInterview', HR -> 'hrInterview')
 * 3. Fallback -> 'applied'
 */
function createStageBucket(): StageBucket {
  return {
    count: 0,
    candidates: []
  };
}

function createEmptyStages(): PipelineStages {
  return {
    applied: createStageBucket(),
    aiScreening: createStageBucket(),
    assessment: createStageBucket(),
    technicalInterview: createStageBucket(),
    hrInterview: createStageBucket(),
    selected: createStageBucket(),
    rejected: createStageBucket(),
  };
}

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
    if (stageTypeUpper === "TEST" || stageTypeUpper === "TESTING" || stageTypeUpper === "ASSESSMENT" || stageTypeUpper === "SKILL_ASSESSMENT" || stageTypeUpper === "TEST_STAGE") {
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
    if (stageTypeUpper === "SELECTED" || stageTypeUpper === "SHORTLISTED" || stageTypeUpper === "HIRED" || stageTypeUpper === "OFFER") {
      return { key: "selected", legacyKey: "selected" };
    }
    if (stageTypeUpper === "REJECTED" || stageTypeUpper === "REJECT" || stageTypeUpper === "WITHDRAWN" || stageTypeUpper === "CANCELLED") {
      return { key: "rejected", legacyKey: "rejected" };
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

  // Fallback to applied (Do NOT map generic IN_PROGRESS automatically to AI Screening)
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
    const [compProfiles]: any = await db.query("SELECT id FROM company_profiles WHERE user_id = ?", [userId]);
    const isSuperHr = compProfiles && compProfiles.length > 0;

    if (!isSuperHr) {
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

      assignedJobIds = Array.from(allJobIds);
      assignedAppIds = assignments ? assignments.map((a: any) => Number(a.application_id)) : [];

      if (assignedJobIds.length === 0 && assignedAppIds.length === 0) {
        return {
          scope: { jobStatus: scopeVal, jobId: targetJobId },
          summary: { totalApplicants: 0, inPipeline: 0, inInterview: 0, selected: 0, rejected: 0 },
          stages: createEmptyStages(),
          reconciliation: { bucketTotal: 0, missingApplicationIds: [], duplicateApplicationIds: [] },
        };
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
      a.rejection_feedback as rejection_reason,
      a.rejected_at,
      a.rejected_by_user_id,
      rej_js.stage_name as rejection_stage_name,
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
      test_res.attempt_id as latest_test_attempt_id,
      test_res.assignment_id as latest_test_assignment_id,
      test_res.score as latest_test_score,
      test_res.total_marks as latest_test_total_marks,
      test_res.percentage as latest_test_percentage,
      test_res.passed as latest_test_passed,
      test_res.cutoff_score as latest_test_cutoff,
      test_res.submission_status as latest_test_status,
      test_res.violations_count as latest_test_violations_count,
      CASE WHEN test_res.violations_count > 0 THEN 1 ELSE 0 END as latest_test_integrity_flag,
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
    LEFT JOIN job_stages rej_js ON a.rejection_stage_id = rej_js.id
    LEFT JOIN student_profiles sp ON a.student_id = sp.id
    LEFT JOIN users u ON sp.user_id = u.id
    LEFT JOIN talent_scores ts ON u.id = ts.user_id
    LEFT JOIN student_performance_stats sps ON u.id = sps.user_id
    LEFT JOIN (
      SELECT 
        sub.id as attempt_id,
        sub.assignment_id,
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
        SELECT application_id, MAX(id) as max_id 
        FROM test_submissions 
        WHERE application_id IS NOT NULL
        GROUP BY application_id
      ) latest ON sub.id = latest.max_id
    ) test_res ON test_res.application_id = a.id
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
      const ended = isJobEnded({
        status: a.job_status,
        deadline: a.deadline,
        ended_at: a.ended_at,
        pipeline_ended_at: a.pipeline_ended_at,
      });
      if (scopeVal === "active" && !active) return false;
      if (scopeVal === "ended" && !ended) return false;
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
  const stages = createEmptyStages();

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

    const cand = {
      ...app,
      applicationId: Number(app.application_id),
      application_id: Number(app.application_id),
      jobId: Number(app.job_id),
      job_id: Number(app.job_id),
      studentId: Number(app.student_id),
      student_id: Number(app.student_id),
      fullName: app.full_name || app.student_name || "",
      studentName: app.full_name || app.student_name || "",
      email: app.email || app.student_email || "",
      studentEmail: app.email || app.student_email || "",
      latest_test_attempt_id: app.latest_test_attempt_id !== undefined && app.latest_test_attempt_id !== null ? Number(app.latest_test_attempt_id) : null,
      latest_test_assignment_id: app.latest_test_assignment_id !== undefined && app.latest_test_assignment_id !== null ? Number(app.latest_test_assignment_id) : null,
      latest_test_score: app.latest_test_score !== undefined && app.latest_test_score !== null ? Number(app.latest_test_score) : null,
      latest_test_total_marks: app.latest_test_total_marks !== undefined && app.latest_test_total_marks !== null ? Number(app.latest_test_total_marks) : null,
      latest_test_percentage: app.latest_test_percentage !== undefined && app.latest_test_percentage !== null ? Number(app.latest_test_percentage) : null,
      latest_test_passed: app.latest_test_passed !== undefined && app.latest_test_passed !== null ? (Boolean(app.latest_test_passed) ? 1 : 0) : null,
      latest_test_cutoff: app.latest_test_cutoff !== undefined && app.latest_test_cutoff !== null ? Number(app.latest_test_cutoff) : null,
      latest_test_status: app.latest_test_status ?? null,
      latest_test_violations_count: app.latest_test_violations_count !== undefined && app.latest_test_violations_count !== null ? Number(app.latest_test_violations_count) : 0,
      latest_test_integrity_flag: (app.latest_test_violations_count || 0) > 0 ? 1 : 0,
      raw_status: app.status || app.app_status || "",
      rejected_at: app.rejected_at || null,
      rejection_reason: app.rejection_reason || app.rejection_feedback || null,
      rejection_feedback: app.rejection_feedback || app.rejection_reason || null,
      rejection_stage_id: app.rejection_stage_id !== undefined && app.rejection_stage_id !== null ? Number(app.rejection_stage_id) : null,
      rejection_stage_name: app.rejection_stage_name || null,
      rejected_by_user_id: app.rejected_by_user_id !== undefined && app.rejected_by_user_id !== null ? Number(app.rejected_by_user_id) : null,
    };

    const { key } = mapStageToCanonicalKey(cand);

    stages[key].candidates.push(cand as PipelineCandidate);
    stages[key].count = stages[key].candidates.length;
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
    inPipeline:
      stages.applied.count +
      stages.aiScreening.count +
      stages.assessment.count +
      stages.technicalInterview.count +
      stages.hrInterview.count,
    inInterview: stages.technicalInterview.count + stages.hrInterview.count,
    selected: stages.selected.count,
    rejected: stages.rejected.count,
  };

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
  };
}
