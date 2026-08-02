import db from "../db.ts";

export function getJobLifecycleStatus(job: any): 'ACTIVE' | 'ENDED' | 'OTHER' {
  if (!job) return 'OTHER';
  const statusUpper = String(job.status || '').toUpperCase();

  if (statusUpper === 'CLOSED' || statusUpper === 'ENDED') return 'ENDED';
  if (statusUpper === 'CANCELLED' || statusUpper === 'ARCHIVED' || statusUpper === 'DRAFT') return 'OTHER';

  if (job.ended_at) {
    const endedAtMs = new Date(job.ended_at).getTime();
    if (!isNaN(endedAtMs) && endedAtMs <= Date.now()) return 'ENDED';
  }
  if (job.pipeline_ended_at) {
    const pEndedAtMs = new Date(job.pipeline_ended_at).getTime();
    if (!isNaN(pEndedAtMs) && pEndedAtMs <= Date.now()) return 'ENDED';
  }

  const validActiveStatus = statusUpper === 'OPEN' || statusUpper === 'ACTIVE' || statusUpper === 'PUBLISHED';
  if (!validActiveStatus) return 'OTHER';

  const rawDeadline = job.deadline;
  if (!rawDeadline || rawDeadline === 'null' || rawDeadline === 'undefined' || rawDeadline === '0000-00-00') {
    return 'ACTIVE';
  }

  const strDl = String(rawDeadline).trim();
  if (!strDl) return 'ACTIVE';

  let deadlineMs: number | null = null;

  // Check if date-only format YYYY-MM-DD or ISO with midnight T00:00:00...
  const dateOnlyMatch = strDl.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s]00:00:00(?:\.000)?Z?)?$/);
  if (dateOnlyMatch) {
    const year = parseInt(dateOnlyMatch[1], 10);
    const month = parseInt(dateOnlyMatch[2], 10);
    const day = parseInt(dateOnlyMatch[3], 10);

    // Asia/Kolkata default (+5:30 = +330 minutes)
    const tz = job.timezone || job.company_timezone || 'Asia/Kolkata';
    let tzOffsetMinutes = 330;
    if (tz === 'UTC') tzOffsetMinutes = 0;

    deadlineMs = Date.UTC(year, month - 1, day, 23, 59, 59, 999) - (tzOffsetMinutes * 60 * 1000);
  } else {
    const parsed = new Date(strDl).getTime();
    if (!isNaN(parsed)) {
      deadlineMs = parsed;
    }
  }

  if (deadlineMs !== null && Date.now() > deadlineMs) {
    return 'ENDED';
  }

  return 'ACTIVE';
}

export const isJobActive = (job: any): boolean => {
  return getJobLifecycleStatus(job) === 'ACTIVE';
};

export const isJobEnded = (job: any): boolean => {
  return getJobLifecycleStatus(job) === 'ENDED';
};

export async function processJobEnding(jobId: number, companyId?: number) {
  const now = new Date();

  // 1. Fetch job details
  let query = "SELECT * FROM jobs WHERE id = ?";
  const params: any[] = [jobId];
  if (companyId) {
    query += " AND company_id = ?";
    params.push(companyId);
  }

  const [jobs]: any = await db.query(query, params);
  if (!jobs || jobs.length === 0) {
    throw new Error("Job post not found.");
  }

  const job = jobs[0];

  // 2. Transition job state if not already ended
  await db.query(
    "UPDATE jobs SET status = 'CLOSED', ended_at = ?, pipeline_ended_at = ? WHERE id = ?",
    [now, now, jobId]
  );

  // 3. Find unresolved applications
  // Unresolved = NOT in terminal statuses ('SELECTED', 'HIRED', 'REJECTED', 'CANCELLED', 'WITHDRAWN')
  const [unresolvedApps]: any = await db.query(
    `SELECT ja.id as application_id, ja.student_id, sp.user_id 
     FROM job_applications ja
     JOIN student_profiles sp ON ja.student_id = sp.id
     WHERE ja.job_id = ? 
       AND (ja.status IS NULL OR ja.status NOT IN ('SELECTED', 'HIRED', 'REJECTED', 'CANCELLED', 'WITHDRAWN'))`,
    [jobId]
  );

  // 4. Send idempotent notifications to unresolved candidates
  for (const app of (unresolvedApps || [])) {
    const userId = app.user_id;
    if (!userId) continue;

    const notifTitle = "Job Opening Ended";
    const notifMessage = `The application window for "${job.title}" has ended. Your application history remains available in My Applications.`;
    const notifType = "JOB_ENDED_UNRESOLVED";
    const idempotencyKey = `job_ended_unresolved_${jobId}_${app.application_id}`;

    // Idempotency check: don't insert duplicate notification for the same user & job
    const [existing]: any = await db.query(
      `SELECT id FROM notifications WHERE idempotency_key = ? OR (user_id = ? AND type = ? AND message LIKE ?)`,
      [idempotencyKey, userId, notifType, `%${job.title}%`]
    );

    if (!existing || existing.length === 0) {
      await db.query(
        "INSERT INTO notifications (user_id, title, message, type, idempotency_key) VALUES (?, ?, ?, ?, ?)",
        [userId, notifTitle, notifMessage, notifType, idempotencyKey]
      );
    }
  }

  return { success: true, jobId, title: job.title, unresolvedCount: unresolvedApps?.length || 0 };
}
