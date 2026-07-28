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
  scope: "all" | "active" | "ended" | "job";
  jobId?: number;
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
 * Normalizes stage types to canonical bucket keys:
 * - 'APPLICATION' -> 'applied'
 * - 'SCREENING' -> 'screening'
 * - 'TEST' -> 'assessment'
 * - 'INTERVIEW' -> 'interview'
 * - 'HR' -> 'hr'
 */
export function mapStageTypeToBucket(stageType?: string | null): string {
  if (!stageType) return "applied";
  const upper = stageType.toUpperCase();
  if (upper === "SCREENING") return "screening";
  if (upper === "TEST" || upper === "ASSESSMENT") return "assessment";
  if (upper === "INTERVIEW") return "interview";
  if (upper === "HR") return "hr";
  return "applied";
}

/**
 * Computes a canonical pipeline snapshot for a company or job.
 * Guarantee: Every application is assigned to EXACTLY ONE bucket.
 * The sum of bucket counts equals totalApplicants.
 */
export async function getPipelineSnapshot(
  companyId: number,
  options?: { scope?: "all" | "active" | "ended"; jobId?: number }
): Promise<PipelineSnapshot> {
  const scope = options?.jobId ? "job" : options?.scope || "all";
  const targetJobId = options?.jobId;

  // 1. Query applications joined with jobs and current job_stages
  let sql = `
    SELECT 
      a.id as application_id,
      a.job_id,
      a.student_id,
      a.current_stage_id,
      a.status as app_status,
      a.rejection_stage_id,
      a.rejection_feedback,
      a.rejected_at,
      a.applied_at,
      j.title as job_title,
      j.status as job_status,
      j.deadline,
      j.ended_at,
      j.pipeline_ended_at,
      js.stage_name as current_stage_name,
      js.stage_type as current_stage_type,
      js.stage_order as current_stage_order,
      sp.full_name as student_name,
      u.email as student_email
    FROM job_applications a
    JOIN jobs j ON a.job_id = j.id
    LEFT JOIN job_stages js ON a.current_stage_id = js.id
    LEFT JOIN student_profiles sp ON a.student_id = sp.id
    LEFT JOIN users u ON sp.user_id = u.id
    WHERE j.company_id = ?
  `;

  const params: any[] = [companyId];

  if (targetJobId) {
    sql += ` AND j.id = ?`;
    params.push(targetJobId);
  }

  const [rows]: any = await db.query(sql, params);
  const rawApps = rows || [];

  // 2. Filter by lifecycle scope
  const filteredApps = rawApps.filter((a: any) => {
    if (targetJobId) return true;
    const active = isJobActive({
      status: a.job_status,
      deadline: a.deadline,
      ended_at: a.ended_at,
      pipeline_ended_at: a.pipeline_ended_at,
    });
    if (scope === "active") return active;
    if (scope === "ended") return !active;
    return true; // 'all'
  });

  // 3. Initialize canonical buckets
  const buckets = {
    applied: 0,
    screening: 0,
    assessment: 0,
    interview: 0,
    hr: 0,
    selected: 0,
    rejected: 0,
  };

  const bucketApps: Record<string, any[]> = {
    applied: [],
    screening: [],
    assessment: [],
    interview: [],
    hr: [],
    selected: [],
    rejected: [],
  };

  // 4. Assign each application to EXACTLY ONE bucket
  for (const app of filteredApps) {
    let bucketKey = "applied";
    const statusUpper = (app.app_status || "").toUpperCase();

    if (statusUpper === "REJECTED") {
      bucketKey = "rejected";
    } else if (statusUpper === "SELECTED" || statusUpper === "HIRED") {
      bucketKey = "selected";
    } else {
      bucketKey = mapStageTypeToBucket(app.current_stage_type);
    }

    if (buckets[bucketKey as keyof typeof buckets] !== undefined) {
      buckets[bucketKey as keyof typeof buckets]++;
      bucketApps[bucketKey].push(app);
    } else {
      buckets.applied++;
      bucketApps.applied.push(app);
    }
  }

  const totalApplicants = filteredApps.length;

  const bucketLabels: Record<string, string> = {
    applied: "Applied",
    screening: "AI Screening",
    assessment: "Assessment",
    interview: "Technical Interview",
    hr: "HR Interview",
    selected: "Selected",
    rejected: "Rejected",
  };

  const bucketDetails: PipelineSnapshotBucket[] = Object.keys(buckets).map((key) => {
    const count = buckets[key as keyof typeof buckets];
    return {
      bucketKey: key,
      bucketLabel: bucketLabels[key] || key,
      count,
      percentage: totalApplicants > 0 ? Math.round((count / totalApplicants) * 100) : 0,
      applications: bucketApps[key],
    };
  });

  return {
    scope,
    jobId: targetJobId,
    companyId,
    totalApplicants,
    buckets,
    bucketDetails,
  };
}
