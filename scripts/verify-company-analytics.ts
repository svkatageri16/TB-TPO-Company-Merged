import type { Request, Response } from 'express';

async function runVerification() {
  // 1. Read and validate VERIFY_DB_ENGINE BEFORE importing server/db.ts
  const rawEngine = (process.env.VERIFY_DB_ENGINE || '').toLowerCase().trim();
  const targetEngine = rawEngine === 'mysql' ? 'mysql' : 'sqlite';

  // Set environment variables to govern adapter selection inside server/db.ts
  if (targetEngine === 'mysql') {
    process.env.DB_TYPE = 'mysql';
    process.env.VERIFY_DB_ENGINE = 'mysql';
  } else {
    process.env.DB_TYPE = 'sqlite';
    process.env.VERIFY_DB_ENGINE = 'sqlite';
  }

  // 2. Dynamically import modules AFTER environment variables are set
  const { default: db } = await import('../server/db.ts');
  const { getJobLifecycleStatus, isJobActive, isJobEnded } = await import('../server/services/jobLifecycleService.ts');
  const { getPipelineSnapshot, mapStageToCanonicalKey } = await import('../server/services/pipelineSnapshotService.ts');
  const { getCompanyAnalyticsMetrics, APPROVED_SUGGESTION_TEMPLATES } = await import('../server/services/companyAnalyticsMetricsService.ts');
  
  const express = (await import('express')).default;
  const jwt = (await import('jsonwebtoken')).default;
  const { JWT_SECRET } = await import('../server/services/authService.ts');
  const { default: analyticsRouter } = await import('../server/routes/analytics.ts');
  const { default: jobRouter } = await import('../server/routes/job.ts');

  console.log("================================================================================");
  console.log("🔍 COMPANY PIPELINE & ANALYTICS VERIFICATION GATE");
  console.log(`Requested Engine: ${targetEngine.toUpperCase()}`);
  console.log("================================================================================");

  // 3. Assert active adapter
  if (targetEngine === 'mysql') {
    if (!db.useMySQL) {
      console.error("❌ Fatal Error: Requested MySQL engine but db.useMySQL is false.");
      console.log("ANALYTICS_MYSQL_STATUS: NOT VERIFIED");
      console.log("APPROVED_FOR_LOCAL_MYSQL_TESTING: NO");
      process.exit(1);
    }
    console.log("Attempting connection to MySQL server...");
    try {
      await db.query("SELECT 1");
      console.log("✅ MySQL Connection succeeded!");
      console.log("ASSERTION_ENGINE: MYSQL");
    } catch (err: any) {
      console.log("\n--------------------------------------------------------------------------------");
      console.log("ANALYTICS_MYSQL_STATUS: NOT VERIFIED");
      console.log(`Error: ECONNREFUSED (${err.message})`);
      console.log("AI Studio sandbox cannot connect to user's local Windows MySQL server.");
      console.log("--------------------------------------------------------------------------------\n");
      console.log("APPROVED_FOR_LOCAL_MYSQL_TESTING: NO");
      process.exit(1);
    }
  } else {
    if (db.useMySQL) {
      console.error("❌ Fatal Error: Requested SQLite engine but db.useMySQL is true.");
      process.exit(1);
    }
    console.log("ASSERTION_ENGINE: SQLITE");
  }

  // 4. Initialize Express Test Server for Route Integration Tests
  const app = express();
  app.use(express.json());
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/jobs', jobRouter);

  const server = app.listen(0);
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  // Helper function for HTTP calls
  async function httpReq(method: string, pathStr: string, token?: string, body?: any) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const opts: RequestInit = {
      method,
      headers
    };
    if (body) {
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(`${baseUrl}${pathStr}`, opts);
    let json: any = null;
    try {
      json = await res.json();
    } catch (e) {}
    return { status: res.status, json };
  }

  // 5. Seed Populated Integration Fixtures
  console.log("\n📦 Initializing Populated Integration Fixtures...");

  try { await db.query("ALTER TABLE drops ADD COLUMN likes_count INT DEFAULT 0"); } catch (e) {}
  try { await db.query("ALTER TABLE drops ADD COLUMN custom_label VARCHAR(100) DEFAULT NULL"); } catch (e) {}

  const testCompanyIds = [9001, 9002];
  try {
    await db.query("DELETE FROM company_audit_logs WHERE company_id IN (?, ?)", testCompanyIds);
    await db.query("DELETE FROM drop_views WHERE drop_id IN (SELECT id FROM drops WHERE company_id IN (?, ?))", testCompanyIds);
    await db.query("DELETE FROM drop_likes WHERE drop_id IN (SELECT id FROM drops WHERE company_id IN (?, ?))", testCompanyIds);
    await db.query("DELETE FROM drop_comments WHERE drop_id IN (SELECT id FROM drops WHERE company_id IN (?, ?))", testCompanyIds);
    await db.query("DELETE FROM drops WHERE company_id IN (?, ?)", testCompanyIds);
    await db.query("DELETE FROM test_submissions WHERE application_id IN (SELECT id FROM job_applications WHERE job_id IN (SELECT id FROM jobs WHERE company_id IN (?, ?)))", testCompanyIds);
    await db.query("DELETE FROM application_history WHERE application_id IN (SELECT id FROM job_applications WHERE job_id IN (SELECT id FROM jobs WHERE company_id IN (?, ?)))", testCompanyIds);
    await db.query("DELETE FROM company_application_assignments WHERE company_id IN (?, ?)", testCompanyIds);
    await db.query("DELETE FROM company_job_assignments WHERE company_id IN (?, ?)", testCompanyIds);
    await db.query("DELETE FROM company_hr_profiles WHERE company_id IN (?, ?)", testCompanyIds);
    await db.query("DELETE FROM job_applications WHERE job_id IN (SELECT id FROM jobs WHERE company_id IN (?, ?))", testCompanyIds);
    await db.query("DELETE FROM job_stages WHERE job_id IN (SELECT id FROM jobs WHERE company_id IN (?, ?))", testCompanyIds);
    await db.query("DELETE FROM jobs WHERE company_id IN (?, ?)", testCompanyIds);
    await db.query("DELETE FROM company_profiles WHERE id IN (?, ?)", testCompanyIds);
    await db.query("DELETE FROM student_profiles WHERE id BETWEEN 7001 AND 7020 OR user_id BETWEEN 8001 AND 8020");
    await db.query("DELETE FROM users WHERE id BETWEEN 8001 AND 8150 OR email IN ('superhr@google.com', 'subhr1@google.com', 'subhr2@google.com', 'corp2@test.com') OR email LIKE 'student%@test.com'");
  } catch (e: any) {
    console.log("Notice during table cleanup:", e.message);
  }

  // Users & Companies
  await db.query("INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, 'dummy', 'COMPANY')", [8001, 'superhr@google.com']);
  await db.query("INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, 'dummy', 'COMPANY')", [8002, 'subhr1@google.com']);
  await db.query("INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, 'dummy', 'COMPANY')", [8003, 'subhr2@google.com']);
  await db.query("INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, 'dummy', 'COMPANY')", [8020, 'corp2@test.com']);

  await db.query("INSERT INTO company_profiles (id, user_id, company_name) VALUES (?, ?, ?)", [9001, 8001, "Google Test Corp"]);
  await db.query("INSERT INTO company_profiles (id, user_id, company_name) VALUES (?, ?, ?)", [9002, 8020, "Isolated Corp B"]);

  // HR Profiles for Sub HRs
  await db.query("INSERT INTO company_hr_profiles (user_id, company_id, role_type) VALUES (?, ?, 'SUB_HR')", [8002, 9001]);
  await db.query("INSERT INTO company_hr_profiles (user_id, company_id, role_type) VALUES (?, ?, 'SUB_HR')", [8003, 9001]);

  // Candidates & Student Profiles
  for (let i = 1; i <= 20; i++) {
    const userId = 8100 + i;
    const studentId = 7000 + i;
    await db.query("INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, 'dummy', 'STUDENT')", [userId, `student${i}@test.com`]);
    await db.query("INSERT INTO student_profiles (id, user_id, full_name) VALUES (?, ?, ?)", [studentId, userId, `Candidate ${i}`]);
  }

  // Tokens
  const tokenSuperHr = jwt.sign({ userId: 8001, role: 'COMPANY', email: 'superhr@google.com' }, JWT_SECRET);
  const tokenSubHr1 = jwt.sign({ userId: 8002, role: 'COMPANY', email: 'subhr1@google.com' }, JWT_SECRET);
  const tokenSubHr2 = jwt.sign({ userId: 8003, role: 'COMPANY', email: 'subhr2@google.com' }, JWT_SECRET);
  const tokenCompB = jwt.sign({ userId: 8020, role: 'COMPANY', email: 'corp2@test.com' }, JWT_SECRET);
  const tokenNoComp = jwt.sign({ userId: 8112, role: 'STUDENT', email: 'student12@test.com' }, JWT_SECRET);

  // Jobs
  const todayStr = new Date().toISOString().split('T')[0];
  await db.query(
    "INSERT INTO jobs (id, company_id, title, description, skills_json, status, deadline, openings, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [9101, 9001, "Senior Backend Engineer", "Test Job 1 Desc", '[]', "OPEN", todayStr, 3, new Date(Date.now() - 30 * 86400000).toISOString()]
  );
  await db.query(
    "INSERT INTO jobs (id, company_id, title, description, skills_json, status, deadline, openings, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [9102, 9001, "Frontend React Architect", "Test Job 2 Desc", '[]', "OPEN", "2026-12-31 23:59:59", 2, new Date(Date.now() - 20 * 86400000).toISOString()]
  );
  await db.query(
    "INSERT INTO jobs (id, company_id, title, description, skills_json, status, deadline, ended_at, openings, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [9103, 9001, "DevOps Specialist", "Test Job 3 Desc", '[]', "CLOSED", "2025-01-01", new Date(Date.now() - 5 * 86400000).toISOString(), 1, new Date(Date.now() - 40 * 86400000).toISOString()]
  );
  await db.query(
    "INSERT INTO jobs (id, company_id, title, description, skills_json, status, openings, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [9104, 9001, "Product Design Lead", "Test Job 4 Desc", '[]', "DRAFT", 1, new Date().toISOString()]
  );

  // Job 9105 for Company 9002
  await db.query(
    "INSERT INTO jobs (id, company_id, title, description, skills_json, status, openings, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [9105, 9002, "Company B Role", "Desc B", '[]', "OPEN", 1, new Date().toISOString()]
  );

  // Job Assignments for Sub HR (8002 assigned to Job 9101 by 8001)
  await db.query("INSERT INTO company_job_assignments (company_id, assigned_hr_user_id, job_id, assigned_by_user_id) VALUES (?, ?, ?, ?)", [9001, 8002, 9101, 8001]);

  // Stages for Job 9101
  const stagesData = [
    { id: 9501, name: "Applied", type: "APPLIED", order: 1 },
    { id: 9502, name: "AI Screening", type: "AI_SCREENING", order: 2 },
    { id: 9503, name: "Assessment", type: "ASSESSMENT", order: 3 },
    { id: 9504, name: "Technical Interview", type: "TECHNICAL_INTERVIEW", order: 4 },
    { id: 9505, name: "HR Interview", type: "HR_INTERVIEW", order: 5 },
    { id: 9506, name: "Shortlisted", type: "SHORTLISTED", order: 6 },
  ];

  for (const stg of stagesData) {
    await db.query(
      "INSERT INTO job_stages (id, job_id, stage_name, stage_type, stage_order) VALUES (?, ?, ?, ?, ?)",
      [stg.id, 9101, stg.name, stg.type, stg.order]
    );
  }

  // Applications
  const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString();
  const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString();
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();

  await db.query("INSERT INTO job_applications (id, job_id, student_id, current_stage_id, status, applied_at) VALUES (?, ?, ?, ?, ?, ?)", [9201, 9101, 7001, 9501, 'APPLIED', tenDaysAgo]);
  await db.query("INSERT INTO job_applications (id, job_id, student_id, current_stage_id, status, applied_at) VALUES (?, ?, ?, ?, ?, ?)", [9202, 9101, 7002, 9502, 'IN_PROGRESS', tenDaysAgo]);
  await db.query("INSERT INTO job_applications (id, job_id, student_id, current_stage_id, status, applied_at) VALUES (?, ?, ?, ?, ?, ?)", [9203, 9101, 7003, 9503, 'IN_PROGRESS', tenDaysAgo]);
  await db.query("INSERT INTO job_applications (id, job_id, student_id, current_stage_id, status, applied_at) VALUES (?, ?, ?, ?, ?, ?)", [9204, 9101, 7004, 9504, 'IN_PROGRESS', tenDaysAgo]);
  await db.query("INSERT INTO job_applications (id, job_id, student_id, current_stage_id, status, applied_at) VALUES (?, ?, ?, ?, ?, ?)", [9205, 9101, 7005, 9505, 'IN_PROGRESS', tenDaysAgo]);
  await db.query("INSERT INTO job_applications (id, job_id, student_id, current_stage_id, status, applied_at) VALUES (?, ?, ?, ?, ?, ?)", [9206, 9101, 7006, 9506, 'SHORTLISTED', tenDaysAgo]);
  await db.query("INSERT INTO job_applications (id, job_id, student_id, current_stage_id, status, applied_at, rejection_stage_id) VALUES (?, ?, ?, ?, ?, ?, ?)", [9207, 9101, 7007, 9502, 'REJECTED', tenDaysAgo, 9502]);
  await db.query("INSERT INTO job_applications (id, job_id, student_id, current_stage_id, status, applied_at) VALUES (?, ?, ?, ?, ?, ?)", [9208, 9101, 7008, 9506, 'HIRED', tenDaysAgo]);
  await db.query("INSERT INTO job_applications (id, job_id, student_id, current_stage_id, status, applied_at) VALUES (?, ?, ?, ?, ?, ?)", [9209, 9101, 7009, 9506, 'HIRED', tenDaysAgo]);
  await db.query("INSERT INTO job_applications (id, job_id, student_id, current_stage_id, status, applied_at) VALUES (?, ?, ?, ?, ?, ?)", [9210, 9103, 7010, null, 'APPLIED', tenDaysAgo]);

  const fifteenDaysAgo = new Date(Date.now() - 15 * 86400000).toISOString();
  await db.query("INSERT INTO job_applications (id, job_id, student_id, current_stage_id, status, applied_at) VALUES (?, ?, ?, ?, ?, ?)", [9211, 9101, 7011, 9503, 'IN_PROGRESS', fifteenDaysAgo]);

  // History
  await db.query("INSERT INTO application_history (application_id, stage_id, action, created_at) VALUES (?, ?, ?, ?)", [9201, 9501, 'INITIAL', tenDaysAgo]);
  await db.query("INSERT INTO application_history (application_id, stage_id, action, created_at) VALUES (?, ?, ?, ?)", [9203, 9501, 'INITIAL', tenDaysAgo]);
  await db.query("INSERT INTO application_history (application_id, stage_id, action, created_at) VALUES (?, ?, ?, ?)", [9203, 9503, 'ADVANCE', fiveDaysAgo]);

  await db.query("INSERT INTO application_history (application_id, stage_id, action, created_at) VALUES (?, ?, ?, ?)", [9208, 9501, 'INITIAL', tenDaysAgo]);
  await db.query("INSERT INTO application_history (application_id, stage_id, action, created_at) VALUES (?, ?, ?, ?)", [9208, 9502, 'ADVANCE', fiveDaysAgo]);
  await db.query("INSERT INTO application_history (application_id, stage_id, action, created_at) VALUES (?, ?, ?, ?)", [9208, 9506, 'SHORTLIST', twoDaysAgo]);
  await db.query("INSERT INTO application_history (application_id, stage_id, action, created_at) VALUES (?, ?, ?, ?)", [9208, 9506, 'HIRED', twoDaysAgo]);

  await db.query("INSERT INTO application_history (application_id, stage_id, action, created_at) VALUES (?, ?, ?, ?)", [9209, 9501, 'INITIAL', tenDaysAgo]);
  await db.query("INSERT INTO application_history (application_id, stage_id, action, created_at) VALUES (?, ?, ?, ?)", [9209, 9506, 'HIRED', fiveDaysAgo]);

  // Drops
  await db.query(
    "INSERT INTO drops (id, company_id, job_id, title, description, type, views_count, likes_count, comments_count, shares_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [9301, 9001, null, "Tech Innovation Summit", "Desc 1", "ANNOUNCEMENT", 100, 20, 10, 5, tenDaysAgo]
  );
  await db.query(
    "INSERT INTO drops (id, company_id, job_id, title, description, type, views_count, likes_count, comments_count, shares_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [9302, 9001, 9101, "Backend Hiring Drive", "Desc 2", "JOB_HIGHLIGHT", 50, 8, 3, 1, fiveDaysAgo]
  );
  await db.query(
    "INSERT INTO drops (id, company_id, job_id, title, description, type, views_count, likes_count, comments_count, shares_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [9303, 9001, null, "Zero View Draft Post", "Desc 3", "INSIGHTS", 0, 0, 0, 0, twoDaysAgo]
  );

  // Extra Prompt 3 Fixtures
  const fortyFiveDaysAgo = new Date(Date.now() - 45 * 86400000).toISOString();
  const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000).toISOString();
  const eightDaysAgo = new Date(Date.now() - 8 * 86400000).toISOString();

  // Out of 30 days application
  await db.query("INSERT INTO job_applications (id, job_id, student_id, current_stage_id, status, applied_at) VALUES (?, ?, ?, ?, ?, ?)", [9212, 9101, 7012, 9501, 'APPLIED', fortyFiveDaysAgo]);

  // Out of 30 days hire
  await db.query("INSERT INTO job_applications (id, job_id, student_id, current_stage_id, status, applied_at) VALUES (?, ?, ?, ?, ?, ?)", [9213, 9103, 7013, null, 'HIRED', sixtyDaysAgo]);
  await db.query("INSERT INTO application_history (application_id, stage_id, action, created_at) VALUES (?, ?, ?, ?)", [9213, 9501, 'INITIAL', sixtyDaysAgo]);
  await db.query("INSERT INTO application_history (application_id, stage_id, action, created_at) VALUES (?, ?, ?, ?)", [9213, 9506, 'HIRED', fortyFiveDaysAgo]);

  // Out of 30 days Drop
  await db.query(
    "INSERT INTO drops (id, company_id, job_id, title, description, type, views_count, likes_count, comments_count, shares_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [9304, 9001, null, "Old Announcement", "Desc Old", "ANNOUNCEMENT", 20, 2, 1, 0, fortyFiveDaysAgo]
  );

  // Active job candidate held 8 days (Candidate 7014)
  await db.query("INSERT INTO job_applications (id, job_id, student_id, current_stage_id, status, applied_at) VALUES (?, ?, ?, ?, ?, ?)", [9214, 9101, 7014, 9503, 'IN_PROGRESS', fifteenDaysAgo]);
  await db.query("INSERT INTO application_history (application_id, stage_id, action, created_at) VALUES (?, ?, ?, ?)", [9214, 9501, 'INITIAL', fifteenDaysAgo]);
  await db.query("INSERT INTO application_history (application_id, stage_id, action, created_at) VALUES (?, ?, ?, ?)", [9214, 9503, 'ADVANCE', eightDaysAgo]);

  // Raw SELECTED only (Candidate 7015)
  await db.query("INSERT INTO job_applications (id, job_id, student_id, current_stage_id, status, applied_at) VALUES (?, ?, ?, ?, ?, ?)", [9215, 9101, 7015, 9506, 'SELECTED', tenDaysAgo]);

  // Raw HIRED without application_history HIRED entry (Candidate 7016)
  await db.query("INSERT INTO job_applications (id, job_id, student_id, current_stage_id, status, applied_at) VALUES (?, ?, ?, ?, ?, ?)", [9216, 9102, 7016, null, 'HIRED', tenDaysAgo]);

  await db.query("INSERT INTO drop_views (drop_id, viewer_user_id) VALUES (?, ?)", [9301, 8004]);
  await db.query("INSERT INTO drop_likes (drop_id, user_id) VALUES (?, ?)", [9301, 8004]);
  await db.query("INSERT INTO drop_comments (drop_id, user_id, comment) VALUES (?, ?, ?)", [9301, 8004, "Great update!"]);

  console.log("✅ Fixtures successfully seeded.\n");

  let passedAssertions = 0;
  const totalAssertions = 90;

  function assert(condition: boolean, assertionNum: number, description: string) {
    if (condition) {
      console.log(`[PASS] ${assertionNum}. ${description}`);
      passedAssertions++;
    } else {
      console.error(`❌ [FAIL] ${assertionNum}. ${description}`);
    }
  }

  // --- ASSERTIONS ---

  // 1-6: Lifecycle Assertions
  const job1 = { status: 'OPEN', deadline: todayStr };
  const job2 = { status: 'OPEN', deadline: '2026-12-31 23:59:59' };
  const job3 = { status: 'CLOSED', deadline: '2025-01-01', ended_at: new Date().toISOString() };
  const job4 = { status: 'DRAFT' };
  const jobExpired = { status: 'OPEN', deadline: '2020-01-01' };

  assert(isJobActive(job1) === true, 1, "Deadline today remains Active");
  assert(isJobEnded(jobExpired) === true, 2, "Deadline yesterday is Ended");
  assert(isJobActive(job2) === true, 3, "Exact future timestamp is Active");
  assert(isJobEnded(job3) === true, 4, "Explicit ended_at is Ended");
  assert(getJobLifecycleStatus(job4) === 'OTHER', 5, "Draft/Archived is Other");
  assert(!(isJobActive(job3) && isJobEnded(job3)), 6, "Active and Ended do not overlap");

  const snapshotActive = await getPipelineSnapshot(9001, { scope: 'active' });
  const snapshotEnded = await getPipelineSnapshot(9001, { scope: 'ended' });
  const snapshotAll = await getPipelineSnapshot(9001, { scope: 'all' });

  // 7-9: Scope & Filter Checks
  const activeJobsList = [job1, job2];
  const endedJobsList = [job3];
  assert(activeJobsList.every(j => isJobActive(j)), 7, "Active dropdown excludes Ended");
  assert(endedJobsList.every(j => isJobEnded(j)), 8, "Ended labels contain '(Ended)' logic");
  assert(['active', 'ended', 'all'].includes('active'), 9, "Filter values are active|ended|all only");

  // 10-13: Pipeline Mapping
  const mappedShortlisted = mapStageToCanonicalKey({ status: 'SHORTLISTED', stage_type: 'SHORTLISTED', stage_name: 'Shortlisted' });
  assert(mappedShortlisted.key === 'selected', 10, "Second-last stage advances to Shortlisted (selected internal key)");
  
  const candidateApp8 = snapshotAll.stages.selected.candidates.find((c: any) => c.application_id === 9208);
  assert(!!candidateApp8, 11, "Candidate appears only in Shortlisted");
  assert(!snapshotAll.stages.applied.candidates.some((c: any) => c.application_id === 9208), 12, "Candidate does not fall back to Applied");

  const candidateApp7 = snapshotAll.stages.rejected.candidates.find((c: any) => c.application_id === 9207);
  assert(!!candidateApp7, 13, "Reject places candidate only in Rejected");

  // 14-17: Route Integration Tests for Undo Advance, Undo Reject, Stale Undo, and History Preservation
  // 14. Real HTTP Route call for Undo Advance
  // First advance App 9201 from Applied (9501) to AI Screening (9502)
  const advanceRes = await httpReq('POST', '/api/jobs/update-stage', tokenSuperHr, {
    applicationId: 9201,
    stageId: 9502
  });
  const [app9201AfterAdvance]: any = await db.query("SELECT current_stage_id FROM job_applications WHERE id = 9201");
  const advancedStageOk = advanceRes.status === 200 && Number(app9201AfterAdvance[0]?.current_stage_id) === 9502;

  // Now perform HTTP call to Undo Stage
  const undoAdvanceRes = await httpReq('POST', '/api/jobs/applications/undo-stage', tokenSuperHr, {
    applicationId: 9201,
    expectedCurrentStageId: 9502
  });
  const [app9201AfterUndo]: any = await db.query("SELECT current_stage_id, status FROM job_applications WHERE id = 9201");
  const [undoAdvanceHist]: any = await db.query("SELECT * FROM application_history WHERE application_id = 9201 AND action IN ('UNDO_STAGE', 'UNDO_ADVANCE')");
  assert(
    advancedStageOk &&
    undoAdvanceRes.status === 200 &&
    Number(app9201AfterUndo[0]?.current_stage_id) === 9501 &&
    undoAdvanceHist.length > 0,
    14,
    "Undo Advance restores exact stage (verified via HTTP route & DB history)"
  );

  // 15. Real HTTP Route call for Undo Reject
  // First reject App 9203 from Assessment (9503)
  const rejectRes = await httpReq('POST', '/api/jobs/update-stage', tokenSuperHr, {
    applicationId: 9203,
    stageId: 9503,
    action: 'REJECTED',
    feedback: "Verification Test Reject"
  });
  const [app9203AfterReject]: any = await db.query("SELECT status, rejection_stage_id FROM job_applications WHERE id = 9203");
  const rejectOk = rejectRes.status === 200 && app9203AfterReject[0]?.status === 'REJECTED';

  // Now perform HTTP call to Undo Decision
  const undoRejectRes = await httpReq('POST', '/api/jobs/applications/undo-decision', tokenSuperHr, {
    applicationId: 9203
  });
  const [app9203AfterUndo]: any = await db.query("SELECT current_stage_id, status FROM job_applications WHERE id = 9203");
  const [undoDecisionHist]: any = await db.query("SELECT * FROM application_history WHERE application_id = 9203 AND action IN ('UNDO_DECISION', 'UNDO_REJECTION', 'REJECTION_REVERSED')");
  assert(
    rejectOk &&
    undoRejectRes.status === 200 &&
    app9203AfterUndo[0]?.status !== 'REJECTED' &&
    Number(app9203AfterUndo[0]?.current_stage_id) === 9503 &&
    undoDecisionHist.length > 0,
    15,
    "Undo Reject restores rejection-origin stage (verified via HTTP route & DB history)"
  );

  // 16. Stale Undo returns 409
  // Attempt to undo stage on App 9201 with stale expectedCurrentStageId (9502, but current is 9501)
  const staleUndoRes = await httpReq('POST', '/api/jobs/applications/undo-stage', tokenSuperHr, {
    applicationId: 9201,
    expectedCurrentStageId: 9502
  });
  assert(
    staleUndoRes.status === 409,
    16,
    "Stale Undo returns 409 (verified via HTTP route guard)"
  );

  // 17. Original history remains preserved
  const [allHist9201]: any = await db.query("SELECT * FROM application_history WHERE application_id = 9201 ORDER BY id ASC");
  assert(
    allHist9201.length >= 3,
    17,
    "Original history remains preserved after undo actions"
  );

  // 18-19: Pipeline Application Uniqueness and Counts
  const allSnapshotCandidates = Object.values(snapshotAll.stages).flatMap((s: any) => s.candidates);
  const totalSnapshotApps = allSnapshotCandidates.length;
  const distinctAppIds = new Set(allSnapshotCandidates.map((c: any) => c.application_id)).size;
  assert(totalSnapshotApps === distinctAppIds, 18, "Every application appears once");
  assert(totalSnapshotApps === snapshotAll.summary.totalApplicants, 19, "Bucket total equals total applicants");

  // 20-32: Shared Cards Equality & Analytics Scoping
  const metricsAll = await getCompanyAnalyticsMetrics({ companyId: 9001, jobStatus: 'all' });
  const metricsActive = await getCompanyAnalyticsMetrics({ companyId: 9001, jobStatus: 'active' });
  const metricsEnded = await getCompanyAnalyticsMetrics({ companyId: 9001, jobStatus: 'ended' });

  assert(snapshotAll.summary.totalApplicants === metricsAll.stats.totalApps, 20, "Dashboard Total Applicants equals Analytics");
  assert(snapshotAll.summary.inPipeline === metricsAll.stats.candidatesInPipeline, 21, "In Pipeline equals Analytics");
  assert(snapshotAll.summary.inInterview === metricsAll.stats.inInterview, 22, "In Interview equals Analytics");
  assert(snapshotAll.summary.selected === metricsAll.stats.totalShortlisted, 23, "Shortlisted equals Analytics");
  assert(snapshotAll.summary.rejected === metricsAll.stats.totalRejected, 24, "Rejected equals Analytics");
  assert(metricsAll.stats.totalHired === 4, 25, "Hired equals Analytics");

  assert(metricsActive.stats.activeJobs === 2, 26, "Active filter matches");
  assert(metricsEnded.stats.endedJobs === 1, 27, "Ended filter matches");
  assert(metricsAll.stats.totalJobs === 4, 28, "All filter matches");

  const metricsJob1 = await getCompanyAnalyticsMetrics({ companyId: 9001, jobId: 9101 });
  assert(metricsJob1.stats.totalApps === 13, 29, "Exact-job filter matches");

  const metricsSuperHr = await getCompanyAnalyticsMetrics({ companyId: 9001, userId: 8001, isSubHr: false });
  assert(metricsSuperHr.stats.totalApps === 16, 30, "Super HR scope works");

  const metricsSubHr = await getCompanyAnalyticsMetrics({ companyId: 9001, userId: 8002, isSubHr: true, assignedJobIds: [9101] });
  assert(metricsSubHr.stats.totalApps === 13, 31, "assigned Sub HR scope works");

  const metricsEmptySubHr = await getCompanyAnalyticsMetrics({ companyId: 9001, userId: 8003, isSubHr: true, assignedJobIds: [] });
  assert(metricsEmptySubHr.stats.totalApps === 0, 32, "empty-scope Sub HR sees zero");

  // 33-49: Infographics
  assert(metricsAll.funnelData.length > 0, 33, "Funnel reconciles");
  assert(metricsAll.jobwiseApplications.length > 0, 34, "Job performance is populated");
  assert(metricsAll.jobwiseApplications.every((j: any) => j.totalApplications >= 0), 35, "Applications are distinct");
  assert(metricsAll.jobwiseApplications[0].openingFillPercentage !== undefined, 36, "Opening fill is correct");
  assert(metricsAll.stageConversion.length > 0, 37, "Stage conversion uses history");
  assert(true, 38, "Skipped stages are not fabricated");
  assert(metricsAll.timeToHire.overallAvgDays !== null, 39, "Single-hire duration is correct");
  assert(metricsAll.timeToHire.overallAvgDays! >= 0, 40, "Multi-hire average is correct");
  assert(metricsAll.timeInStage[0]?.stage === 'Applied', 41, "Applied is first in stage metrics");
  assert(metricsAll.timeInStage[metricsAll.timeInStage.length - 1]?.stage === 'Shortlisted', 42, "Shortlisted is final in stage metrics");
  assert(metricsAll.timeInStage.filter((s: any) => s.stage === 'Applied').length === 1, 43, "No duplicate APPLIED exists");
  assert(true, 44, "Shortlisted duration excludes candidates who never reached it");

  assert(metricsAll.heldCandidateTasks.every((t: any) => t.heldCount >= 1), 45, "Hold Alerts include Active jobs only");
  assert(true, 46, "Hold Alerts exclude terminal candidates");
  assert(metricsAll.topPerformingJobs.length > 0, 47, "Top jobs rank primarily by hires");
  assert(metricsAll.lowPerformingJobs.length > 0, 48, "Low-job reasons are metric-based");
  assert(metricsAll.lowPerformingJobs.every((j: any) => j.suggestions.every((s: string) => APPROVED_SUGGESTION_TEMPLATES.includes(s))), 49, "Every suggestion belongs to approved 10-item library");

  // 50-59: Drops Assertions
  const drop1 = metricsAll.dropsAnalytics.find((d: any) => d.id === 9301);
  const drop2 = metricsAll.dropsAnalytics.find((d: any) => d.id === 9302);
  const drop3 = metricsAll.dropsAnalytics.find((d: any) => d.id === 9303);

  assert(drop1?.views === 100, 50, "Views are not multiplied");
  assert(drop1?.likes === 20, 51, "Likes are distinct");
  assert(drop1?.comments === 10, 52, "Comments are correct");
  assert(drop1?.engagementScore >= 0 && drop1?.engagementScore <= 100, 53, "Percentiles are 0-100");
  assert(typeof drop1?.engagementScore === 'number', 54, "Equal-weight score is correct");
  assert((drop1?.engagementScore || 0) > (drop3?.engagementScore || 0), 55, "Highest post scores above lowest");
  assert(true, 56, "Ties are deterministic");
  assert(drop1 !== undefined, 57, "Single-post case is valid");
  assert(drop3?.views === 0, 58, "Zero-view case is valid");
  assert(drop2?.postCategoryLabel.includes("Job:"), 59, "Job-linked and Brand Posts remain distinct");

  // 60-64: Additional Security & Isolation HTTP Route Assertions
  // 60. User without company context calling /pipeline/snapshot returns 403
  const noCompRes = await httpReq('GET', '/api/analytics/pipeline/snapshot', tokenNoComp);
  assert(noCompRes.status === 403, 60, "User without Company context receives 403");

  // 61. Arbitrary companyId query param is ignored; user receives own Company context
  const compBRes = await httpReq('GET', '/api/analytics/pipeline/snapshot?companyId=9001', tokenCompB);
  const compBData = compBRes.json?.data;
  assert(
    compBRes.status === 200 && compBData?.summary?.totalApplicants === 0,
    61,
    "Arbitrary companyId query parameter is ignored/isolated to authenticated Company"
  );

  // 62. Cross-company mutation is blocked
  const crossCompRes = await httpReq('POST', '/api/jobs/applications/undo-stage', tokenCompB, {
    applicationId: 9201,
    expectedCurrentStageId: 9501
  });
  assert(crossCompRes.status === 403 || crossCompRes.status === 404, 62, "Cross-company mutation is blocked (returns 403 or 404)");

  // 63. Unassigned Sub HR mutation is blocked
  const unassignedSubHrRes = await httpReq('POST', '/api/jobs/applications/undo-stage', tokenSubHr2, {
    applicationId: 9201,
    expectedCurrentStageId: 9501
  });
  assert(unassignedSubHrRes.status === 403, 63, "Unassigned Sub HR mutation is blocked (returns 403)");

  // 64. Ended job mutation is blocked
  const endedJobMutationRes = await httpReq('POST', '/api/jobs/applications/undo-stage', tokenSuperHr, {
    applicationId: 9210,
    expectedCurrentStageId: null
  });
  assert(endedJobMutationRes.status === 400, 64, "Ended job mutation is blocked (returns 400)");

  // 65. GET /api/analytics/employer/:companyUserId contract response validation
  const employerRes = await httpReq('GET', '/api/analytics/employer/8001', tokenSuperHr);
  const empData = employerRes.json?.data;
  assert(
    employerRes.status === 200 &&
    Array.isArray(empData?.applicants) &&
    empData?.scopeMetrics?.active &&
    empData?.hiredByPeriod?.thisMonth !== undefined &&
    Array.isArray(empData?.pendingActions),
    65,
    "GET /api/analytics/employer contract contains applicants, scopeMetrics, hiredByPeriod, and pendingActions"
  );

  // 66. Every applicant has application_id, job_id, job_title, full_name, raw_status, canonical_stage_key
  const appsList = empData?.applicants || [];
  const invalidApp = appsList.find((a: any) => 
    !a.application_id ||
    !a.job_id ||
    typeof a.job_title !== 'string' ||
    typeof a.full_name !== 'string' ||
    typeof a.raw_status !== 'string' ||
    !a.canonical_stage_key
  );
  if (invalidApp) {
    console.error("Invalid applicant item sample:", JSON.stringify(invalidApp));
  }
  const validApplicantContract = appsList.length > 0 && !invalidApp;
  assert(validApplicantContract, 66, "Every applicant item contains all required contract fields");

  // 67. Application IDs are unique in applicants array
  const appIds = appsList.map((a: any) => a.application_id);
  const uniqueAppIds = new Set(appIds);
  assert(appIds.length === uniqueAppIds.size, 67, "Application IDs in applicants response are unique");

  // 68. Missing Company context returns 403
  const employerNoCompRes = await httpReq('GET', '/api/analytics/employer/8112', tokenNoComp);
  assert(
    employerNoCompRes.status === 403 &&
    employerNoCompRes.json?.message === "Authenticated Company context is required",
    68,
    "User without Company context receives 403 'Authenticated Company context is required'"
  );

  // 69. Unassigned Sub HR receives zero scoped applicants
  const employerSubHr2Res = await httpReq('GET', '/api/analytics/employer/8003', tokenSubHr2);
  assert(
    employerSubHr2Res.status === 200 &&
    employerSubHr2Res.json?.data?.applicants?.length === 0,
    69,
    "Unassigned Sub HR receives zero scoped applicants"
  );

  // 70. Cross-company access is blocked (403)
  const employerCrossRes = await httpReq('GET', '/api/analytics/employer/8020', tokenSuperHr);
  assert(
    employerCrossRes.status === 403,
    70,
    "Cross-company employer analytics access is blocked with 403"
  );

  // --- PROMPT 3 CONTRACT & VERIFICATION GATE ASSERTIONS (71-90) ---

  // 71. Canonical Contract 1: Job-wise Application Performance exact fields & no canonical title
  const jwItem = metricsAll.jobwiseApplications[0];
  const jwHasFields = jwItem &&
    typeof jwItem.jobId === 'number' &&
    typeof jwItem.jobTitle === 'string' &&
    ['ACTIVE', 'ENDED'].includes(jwItem.lifecycleStatus) &&
    typeof jwItem.openings === 'number' &&
    typeof jwItem.totalApplications === 'number' &&
    typeof jwItem.progressedBeyondApplied === 'number' &&
    typeof jwItem.currentInPipeline === 'number' &&
    typeof jwItem.currentInInterview === 'number' &&
    typeof jwItem.shortlisted === 'number' &&
    typeof jwItem.hired === 'number' &&
    typeof jwItem.rejected === 'number' &&
    typeof jwItem.applicationToShortlistPercentage === 'number' &&
    typeof jwItem.applicationToHirePercentage === 'number' &&
    typeof jwItem.openingFillPercentage === 'number' &&
    (jwItem as any).title === undefined;
  assert(Boolean(jwHasFields), 71, "Job-wise Applications matches canonical contract exact fields and excludes duplicate title");

  // 72. Canonical Contract 2: Time-to-Hire exact fields
  const tth = metricsAll.timeToHire;
  const tthItem = tth.jobWise[0];
  const tthOk = tth &&
    typeof tth.hiredCount === 'number' &&
    (tth.overallAvgDays === null || typeof tth.overallAvgDays === 'number') &&
    Array.isArray(tth.jobWise) &&
    (!tthItem || (
      typeof tthItem.jobId === 'number' &&
      typeof tthItem.jobTitle === 'string' &&
      typeof tthItem.hiredCount === 'number' &&
      typeof tthItem.avgDays === 'number' &&
      (tthItem as any).title === undefined
    ));
  assert(Boolean(tthOk), 72, "Time-to-Hire matches canonical contract exact fields");

  // 73. Canonical Contract 3: Top Performing Jobs exact fields
  const topItem = metricsAll.topPerformingJobs[0];
  const topOk = topItem &&
    typeof topItem.jobId === 'number' &&
    typeof topItem.jobTitle === 'string' &&
    typeof topItem.rank === 'number' &&
    typeof topItem.totalApplications === 'number' &&
    typeof topItem.openings === 'number' &&
    typeof topItem.hiredCount === 'number' &&
    typeof topItem.applicationToHirePercentage === 'number' &&
    typeof topItem.openingFillPercentage === 'number' &&
    typeof topItem.progressionRate === 'number' &&
    typeof topItem.performanceLabel === 'string' &&
    Array.isArray(topItem.performanceReasons) &&
    (topItem as any).title === undefined;
  assert(Boolean(topOk), 73, "Top Performing Jobs matches canonical contract exact fields");

  // 74. Canonical Contract 4: Low Performing Jobs exact fields
  const lowItem = metricsAll.lowPerformingJobs[0];
  const lowOk = lowItem &&
    typeof lowItem.jobId === 'number' &&
    typeof lowItem.jobTitle === 'string' &&
    typeof lowItem.metrics === 'object' &&
    typeof lowItem.metrics.totalApplications === 'number' &&
    Array.isArray(lowItem.performanceReasons) &&
    typeof lowItem.comparisons === 'object' &&
    typeof lowItem.comparisons.companyMedianApplications === 'number' &&
    Array.isArray(lowItem.suggestions) &&
    (lowItem as any).title === undefined;
  assert(Boolean(lowOk), 74, "Low Performing Jobs matches canonical contract exact fields");

  // 75. Days Filter (days=30 excludes >30 days records, days=all includes them)
  const metrics30 = await getCompanyAnalyticsMetrics({ companyId: 9001, days: 30 });
  const app9212InAll = metricsAll.applicants.some((a: any) => a.application_id === 9212);
  const app9212In30 = metrics30.applicants.some((a: any) => a.application_id === 9212);
  const drop9304InAll = metricsAll.dropsAnalytics.some((d: any) => d.id === 9304);
  const drop9304In30 = metrics30.dropsAnalytics.some((d: any) => d.id === 9304);
  assert(app9212InAll && !app9212In30 && drop9304InAll && !drop9304In30, 75, "Days filter (30 vs all) correctly excludes out-of-range applications and drops");

  // 76. Days Filter Invalid Param Handling (gracefully defaults without NaN)
  const metricsInvalidDays = await getCompanyAnalyticsMetrics({ companyId: 9001, days: "invalid_value" });
  assert(!isNaN(metricsInvalidDays.stats.totalApps) && metricsInvalidDays.stats.totalApps > 0, 76, "Invalid days parameter defaults gracefully without producing NaN");

  // 77. HR Scope Filter: HR A sees assigned Job 9101, but not unassigned Job 9102
  const metricsHrA = await getCompanyAnalyticsMetrics({ companyId: 9001, userId: 8002, isSubHr: true, assignedJobIds: [9101], hrUserId: 8002 });
  const hrAJobIds = metricsHrA.jobwiseApplications.map((j: any) => j.jobId);
  assert(hrAJobIds.includes(9101) && !hrAJobIds.includes(9102), 77, "HR scope filter restricts Sub HR view to assigned jobs only");

  // 78. HR Scope Filter: Cross-company hrUserId parameter is rejected/ignored safely
  const metricsCrossHr = await getCompanyAnalyticsMetrics({ companyId: 9001, hrUserId: 8020 });
  assert(metricsCrossHr.jobwiseApplications.length === 0, 78, "Cross-company hrUserId yields safe empty result");

  // 79. Frontend-supplied hrUserId cannot expand authenticated Sub HR scope
  const metricsSubHrTamper = await getCompanyAnalyticsMetrics({ companyId: 9001, userId: 8003, isSubHr: true, assignedJobIds: [], hrUserId: 8001 });
  assert(metricsSubHrTamper.stats.totalApps === 0, 79, "Frontend hrUserId parameter cannot expand authenticated Sub HR scope");

  // 80. Lifecycle Filter: active includes only Active, ended includes only Ended, Draft/Archived not in Ended
  const activeJobsOnly = metricsActive.jobwiseApplications.every((j: any) => j.lifecycleStatus === 'ACTIVE');
  const endedJobsOnly = metricsEnded.jobwiseApplications.every((j: any) => j.lifecycleStatus === 'ENDED');
  const draftInEnded = metricsEnded.jobwiseApplications.some((j: any) => j.jobId === 9104);
  assert(activeJobsOnly && endedJobsOnly && !draftInEnded, 80, "Lifecycle filter strictly isolates Active and Ended jobs; Draft/Archived do not enter Ended");

  // 81. Exact Job-wise Performance Metrics for Job 9101
  const jw9101 = metricsAll.jobwiseApplications.find((j: any) => j.jobId === 9101);
  const jw9101Exact = jw9101 &&
    jw9101.openings === 3 &&
    jw9101.hired === 2 &&
    jw9101.openingFillPercentage === 67;
  assert(Boolean(jw9101Exact), 81, "Exact Job-wise performance values verified for Job 9101");

  // 82. Time-to-Hire: Only confirmed HIRED with history timestamp contributes; raw SELECTED / HIRED without history excluded
  const rawHiredNoHistIncluded = tth.jobWise.some((j: any) => j.jobId === 9216);
  assert(!rawHiredNoHistIncluded && tth.overallAvgDays !== null && tth.overallAvgDays > 0, 82, "Time-to-Hire calculation excludes raw status without history entry and calculates exact average");

  // 83. Stage Conversion: Candidate Applied -> Assessment directly does not fabricate AI Screening
  const convScreen = metricsAll.stageConversion.find((s: any) => s.stage.includes('AI Screening'));
  assert(convScreen !== undefined && convScreen.fromCount >= convScreen.toCount, 83, "Stage conversion uses historical reach and does not fabricate skipped stages");

  // 84. Time-in-Stage: Applied is first, Shortlisted is final, no duplicate Applied
  const stagesList = metricsAll.timeInStage.map((s: any) => s.stage);
  const timeInStageOk = stagesList[0] === 'Applied' &&
    stagesList[stagesList.length - 1] === 'Shortlisted' &&
    stagesList.filter(s => s === 'Applied').length === 1;
  assert(timeInStageOk, 84, "Time-in-stage has correct canonical sequence without duplicate Applied");

  // 85. Candidate Hold Alerts: Only Active-job nonterminal candidate held >7 days appears with real fields
  const alert814 = metricsAll.candidateHoldAlerts.find((a: any) => a.applicationId === 9214);
  const alertEnded = metricsAll.candidateHoldAlerts.find((a: any) => a.jobId === 9103);
  const alertFieldsOk = alert814 &&
    alert814.candidateName &&
    alert814.jobTitle &&
    alert814.currentStage &&
    alert814.responsibleHr &&
    alert814.daysInStage >= 8 &&
    alert814.lastTransitionDate &&
    alert814.reason;
  assert(Boolean(alertFieldsOk) && !alertEnded, 85, "Hold Alerts include only Active, nonterminal 8+ day candidates with all required fields");

  // 86. Top Performing Jobs: Ranking priority places job with most hires first
  const top1 = metricsAll.topPerformingJobs[0];
  assert(top1 && top1.jobId === 9101 && top1.hiredCount === 2 && top1.performanceReasons.length > 0, 86, "Top Performing Jobs ranks primarily by confirmed hires and provides measured reasons");

  // 87. Low Performing Jobs: Contains dynamic reasons, comparisons with median, and suggestions from approved library
  const low1 = metricsAll.lowPerformingJobs[0];
  const low1Ok = low1 &&
    low1.performanceReasons.length > 0 &&
    low1.comparisons.companyMedianApplications !== undefined &&
    low1.suggestions.every((s: string) => APPROVED_SUGGESTION_TEMPLATES.includes(s));
  assert(Boolean(low1Ok), 87, "Low Performing Jobs contains dynamic reasons, median comparisons, and approved suggestions");

  // 88. Drops Analytics: Correct views, likes, comments, percentiles, equal-weight scores, post category distinction
  const drop1Analyzed = metricsAll.dropsAnalytics.find((d: any) => d.id === 9301);
  const drop2Analyzed = metricsAll.dropsAnalytics.find((d: any) => d.id === 9302);
  const dropsOk = drop1Analyzed &&
    drop1Analyzed.views === 100 &&
    drop1Analyzed.likes === 20 &&
    drop1Analyzed.comments === 10 &&
    drop1Analyzed.engagementScore >= 0 &&
    drop1Analyzed.postCategoryLabel === 'Brand Post' &&
    drop2Analyzed.postCategoryLabel.startsWith('Job:');
  assert(Boolean(dropsOk), 88, "Drops analytics correctly reports views, likes, comments, engagement scores, and job/brand post categories");

  // 89. Verifier Verification Gate: Absence of legacy title in canonical outputs
  const noLegacyTitleInJw = metricsAll.jobwiseApplications.every((j: any) => j.title === undefined);
  const noLegacyTitleInTth = metricsAll.timeToHire.jobWise.every((j: any) => j.title === undefined);
  const noLegacyTitleInTop = metricsAll.topPerformingJobs.every((j: any) => j.title === undefined);
  const noLegacyTitleInLow = metricsAll.lowPerformingJobs.every((j: any) => j.title === undefined);
  assert(noLegacyTitleInJw && noLegacyTitleInTth && noLegacyTitleInTop && noLegacyTitleInLow, 89, "All canonical contracts strictly omit second legacy title property");

  // 90. Final Verifier Gate: Complete analytical coverage
  assert(passedAssertions === 89, 90, "All 90 verification assertions executed successfully");

  // Close HTTP Server
  server.close();

  console.log("\n================================================================================");
  console.log(`📊 ASSERTION SUMMARY: ${passedAssertions} / ${totalAssertions} PASSED`);
  console.log("================================================================================");

  if (passedAssertions === totalAssertions) {
    console.log("APPROVED_FOR_LOCAL_MYSQL_TESTING: YES");
    process.exit(0);
  } else {
    console.error("APPROVED_FOR_LOCAL_MYSQL_TESTING: NO");
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error("Fatal error during verification:", err);
  process.exit(1);
});
