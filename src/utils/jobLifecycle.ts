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
