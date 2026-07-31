import db from "../db.ts";

export const isJobActive = (job: any): boolean => {
  if (!job) return false;
  if (job.status === 'CLOSED') return false;
  if (job.ended_at || job.pipeline_ended_at) return false;

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

  return job.status === 'OPEN' || job.status === 'ACTIVE' || job.status === 'PUBLISHED';
};

export const isJobEnded = (job: any): boolean => {
  return !isJobActive(job);
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
