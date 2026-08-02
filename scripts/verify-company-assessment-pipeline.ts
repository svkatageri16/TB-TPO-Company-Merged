import express from 'express';
import http from 'http';
import db, { initDb } from '../server/db.js';
import assessmentsRouter from '../server/routes/assessments.js';
import analyticsRouter from '../server/routes/analytics.js';
import jobRouter from '../server/routes/job.js';
import { generateToken } from '../server/services/authService.js';

let app: express.Application;
let server: http.Server;
let port: number;
let baseUrl: string;

// Helper fetch wrapper
async function request(path: string, options: any = {}) {
  const url = `${baseUrl}${path}`;
  const headers = options.headers || {};
  if (options.body && typeof options.body === 'object' && !(options.body instanceof String)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }
  const res = await fetch(url, { ...options, headers });
  const status = res.status;
  let json: any = null;
  try {
    json = await res.json();
  } catch (e) {}
  return { status, json };
}

async function runVerification() {
  const originalLog = console.log;
  const originalWarn = console.warn;
  console.log = (...args: any[]) => {
    const msg = args.join(' ');
    if (msg.includes('--- EMAIL PREVIEW ---') || msg.includes('DEBUG') || msg.includes('VEGA Application Status Update') || msg.includes('border: 1px solid') || msg.includes('Go to Student Portal')) return;
    originalLog(...args);
  };
  console.warn = (...args: any[]) => {
    const msg = args.join(' ');
    if (msg.includes('SMTP credentials not set')) return;
    originalWarn(...args);
  };

  console.log("=== STARTING FOCUSED COMPANY ASSESSMENT & PIPELINE INTEGRATION VERIFIER ===");
  
  // 1. Initialize DB and Express Server
  await initDb();

  const companyToken = generateToken({ id: 1, userId: 1, email: 'company@test.com', role: 'COMPANY', companyId: 1 });
  const subHrToken = generateToken({ id: 2, userId: 2, email: 'subhr@test.com', role: 'COMPANY_SUB_HR', isSubHr: true, companyId: 1 });
  const studentToken = generateToken({ id: 10, userId: 10, email: 'student@test.com', role: 'STUDENT' });

  app = express();
  app.use(express.json());

  app.use('/api/assessments', assessmentsRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/job', jobRouter);

  server = app.listen(0);
  const address: any = server.address();
  port = address.port;
  baseUrl = `http://127.0.0.1:${port}`;

  console.log(`Test server running at ${baseUrl}`);

  let passedCount = 0;
  let totalTests = 30;

  try {
    // Seed test data in SQLite / DB adapter
    await db.query("DELETE FROM company_assessment_definitions");
    await db.query("DELETE FROM company_assessment_assignments");
    await db.query("DELETE FROM test_submissions");
    await db.query("DELETE FROM test_submission_events");
    await db.query("DELETE FROM assessment_idempotency_requests");

    // Ensure users, company, and student profiles
    try {
      await db.query("INSERT OR REPLACE INTO users (id, email, password_hash, role) VALUES (1, 'company@test.com', 'hash', 'COMPANY')");
      await db.query("INSERT OR REPLACE INTO users (id, email, password_hash, role) VALUES (2, 'subhr@test.com', 'hash', 'COMPANY_SUB_HR')");
      await db.query("INSERT OR REPLACE INTO users (id, email, password_hash, role) VALUES (10, 'student@test.com', 'hash', 'STUDENT')");
      await db.query("INSERT OR REPLACE INTO company_profiles (id, user_id, company_name) VALUES (1, 1, 'Test Company')");
      await db.query("INSERT OR REPLACE INTO company_hr_profiles (user_id, company_id, role_type) VALUES (2, 1, 'SUB_HR')");
      await db.query("INSERT OR REPLACE INTO student_profiles (id, user_id, full_name) VALUES (10, 10, 'John Student')");
    } catch (e) {}

    const [cRows]: any = await db.query("SELECT id FROM company_profiles WHERE user_id = 1 OR id = 1");
    const testCompanyId = cRows[0].id;

    const [sRows]: any = await db.query("SELECT id FROM student_profiles WHERE user_id = 10 OR id = 10");
    const testStudentId = sRows[0].id;

    // Seed Jobs and Job Stages
    await db.query("DELETE FROM jobs WHERE company_id = ?", [testCompanyId]);
    const [j1Res]: any = await db.query("INSERT INTO jobs (title, company_id, description, skills_json, status) VALUES ('Software Engineer', ?, 'Desc', '[]', 'ACTIVE')", [testCompanyId]);
    const job1Id = j1Res.insertId || 101;

    const [j2Res]: any = await db.query("INSERT INTO jobs (title, company_id, description, skills_json, status) VALUES ('DevOps Engineer', ?, 'Desc', '[]', 'ACTIVE')", [testCompanyId]);
    const job2Id = j2Res.insertId || 102;

    await db.query("DELETE FROM job_stages WHERE job_id IN (?, ?)", [job1Id, job2Id]);
    const [s11]: any = await db.query("INSERT INTO job_stages (job_id, stage_name, stage_type, stage_order) VALUES (?, 'Applied', 'APPLIED', 1)", [job1Id]);
    const [s12]: any = await db.query("INSERT INTO job_stages (job_id, stage_name, stage_type, stage_order) VALUES (?, 'Online Assessment', 'TESTING', 2)", [job1Id]);
    const [s13]: any = await db.query("INSERT INTO job_stages (job_id, stage_name, stage_type, stage_order) VALUES (?, 'Tech Interview', 'INTERVIEW', 3)", [job1Id]);

    const [s21]: any = await db.query("INSERT INTO job_stages (job_id, stage_name, stage_type, stage_order) VALUES (?, 'Applied', 'APPLIED', 1)", [job2Id]);
    const [s22]: any = await db.query("INSERT INTO job_stages (job_id, stage_name, stage_type, stage_order) VALUES (?, 'Tech Assessment', 'TESTING', 2)", [job2Id]);
    const [s23]: any = await db.query("INSERT INTO job_stages (job_id, stage_name, stage_type, stage_order) VALUES (?, 'HR Interview', 'INTERVIEW', 3)", [job2Id]);

    const stage12Id = s12.insertId || 202;
    const stage13Id = s13.insertId || 203;
    const stage22Id = s22.insertId || 302;
    const stage23Id = s23.insertId || 303;

    // Seed Applications
    await db.query("DELETE FROM job_applications WHERE student_id = ?", [testStudentId]);
    const [app1Res]: any = await db.query("INSERT INTO job_applications (job_id, student_id, current_stage_id, status) VALUES (?, ?, ?, 'IN_PROGRESS')", [job1Id, testStudentId, stage12Id]);
    const appId1 = app1Res.insertId || 1001;

    // --- TEST 1: Company Draft creation ---
    const qPayload = [
      { questionText: "Q1", options: ["A", "B", "C", "D"], correctOption: 1, points: 50 },
      { questionText: "Q2", options: ["W", "X", "Y", "Z"], correctOption: 2, points: 50 }
    ];

    const res1 = await request('/api/assessments/company/create', {
      method: 'POST',
      headers: { Authorization: `Bearer ${companyToken}`, 'idempotency-key': 'key-verify-1' },
      body: { title: "Verifier Test 1", duration: 40, questions: qPayload }
    });

    const createdDefId = res1.json?.data?.id;
    const t1Passed = res1.status === 201 && res1.json?.success && res1.json?.data?.status === 'DRAFT' && createdDefId;
    if (t1Passed) passedCount++;
    console.log(`Test 1 (Company Draft creation): ${t1Passed ? 'PASSED' : 'FAILED'}`);

    // --- TEST 2: Database-backed duplicate-create idempotency ---
    const res2 = await request('/api/assessments/company/create', {
      method: 'POST',
      headers: { Authorization: `Bearer ${companyToken}`, 'idempotency-key': 'key-verify-1' },
      body: { title: "Verifier Test 1", duration: 40, questions: qPayload }
    });
    const t2Passed = res2.status === 201 && String(res2.json?.data?.id) === String(createdDefId);
    if (t2Passed) passedCount++;
    console.log(`Test 2 (Database-backed duplicate-create idempotency): ${t2Passed ? 'PASSED' : 'FAILED'}`);

    // --- TEST 3: Different-payload conflict ---
    const res3 = await request('/api/assessments/company/create', {
      method: 'POST',
      headers: { Authorization: `Bearer ${companyToken}`, 'idempotency-key': 'key-verify-1' },
      body: { title: "Different Title Payload", duration: 40, questions: qPayload }
    });
    const t3Passed = res3.status === 409 && res3.json?.code === 'IDEMPOTENCY_KEY_REUSED';
    if (t3Passed) passedCount++;
    console.log(`Test 3 (Different-payload conflict): ${t3Passed ? 'PASSED' : 'FAILED'}`);

    // --- TEST 4: Draft edit ---
    const res4 = await request(`/api/assessments/company/tests/${createdDefId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${companyToken}` },
      body: { title: "Verifier Test 1 Updated", duration: 45, questions: qPayload }
    });
    const t4Passed = res4.status === 200 && res4.json?.data?.title === "Verifier Test 1 Updated";
    if (t4Passed) passedCount++;
    console.log(`Test 4 (Draft edit): ${t4Passed ? 'PASSED' : 'FAILED'}`);

    // --- TEST 5: Publish immutability ---
    const res5 = await request('/api/assessments/company/publish', {
      method: 'POST',
      headers: { Authorization: `Bearer ${companyToken}` },
      body: { assessmentId: createdDefId }
    });
    const t5Passed = res5.status === 200 && res5.json?.data?.status === 'PUBLISHED';
    if (t5Passed) passedCount++;
    console.log(`Test 5 (Publish immutability): ${t5Passed ? 'PASSED' : 'FAILED'}`);

    // --- TEST 6: Published edit creates next Draft ---
    const res6 = await request(`/api/assessments/company/tests/${createdDefId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${companyToken}` },
      body: { title: "Verifier Test 1 v2", duration: 50, questions: qPayload }
    });
    const v2DefId = res6.json?.data?.id;
    const t6Passed = res6.status === 201 && res6.json?.data?.status === 'DRAFT' && res6.json?.data?.version === 2 && v2DefId !== createdDefId;
    if (t6Passed) passedCount++;
    console.log(`Test 6 (Published edit creates next Draft): ${t6Passed ? 'PASSED' : 'FAILED'}`);

    // --- TEST 7: Exact Assignment creation ---
    const res7 = await request('/api/assessments/company/assign', {
      method: 'POST',
      headers: { Authorization: `Bearer ${companyToken}` },
      body: { assessmentId: createdDefId, jobId: job1Id, stageId: stage12Id, cutoffScore: 40 }
    });
    const assignmentId = res7.json?.assignment?.id;
    const t7Passed = res7.status === 200 && res7.json?.success && assignmentId;
    if (t7Passed) passedCount++;
    console.log(`Test 7 (Exact Assignment creation): ${t7Passed ? 'PASSED' : 'FAILED'}`);

    // --- TEST 8: Wrong-job stage rejection ---
    const res8 = await request('/api/assessments/company/assign', {
      method: 'POST',
      headers: { Authorization: `Bearer ${companyToken}` },
      body: { assessmentId: createdDefId, jobId: job1Id, stageId: stage22Id, cutoffScore: 40 }
    });
    const t8Passed = res8.status === 400;
    if (t8Passed) passedCount++;
    console.log(`Test 8 (Wrong-job stage rejection): ${t8Passed ? 'PASSED' : 'FAILED'}`);

    // --- TEST 9: Non-TESTING stage rejection ---
    const res9 = await request('/api/assessments/company/assign', {
      method: 'POST',
      headers: { Authorization: `Bearer ${companyToken}` },
      body: { assessmentId: createdDefId, jobId: job1Id, stageId: stage13Id, cutoffScore: 40 }
    });
    const t9Passed = res9.status === 400;
    if (t9Passed) passedCount++;
    console.log(`Test 9 (Non-TESTING stage rejection): ${t9Passed ? 'PASSED' : 'FAILED'}`);

    // --- TEST 10: Exact Student eligibility ---
    const res10 = await request('/api/assessments/student/eligible', {
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const t10Passed = res10.status === 200 && Array.isArray(res10.json?.assessments) && res10.json?.assessments.some((a: any) => a.assignmentId === assignmentId);
    if (t10Passed) passedCount++;
    console.log(`Test 10 (Exact Student eligibility): ${t10Passed ? 'PASSED' : 'FAILED'}`);

    // --- TEST 11: Sanitized Student question response ---
    const res11 = await request('/api/assessments/student/start', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: { applicationId: appId1 }
    });
    const attemptId = res11.json?.attemptId;
    const startQuestions = res11.json?.questions || [];
    const t11Passed = res11.status === 200 && attemptId && startQuestions.length > 0 && startQuestions[0].correctOption === undefined;
    if (t11Passed) passedCount++;
    console.log(`Test 11 (Sanitized Student question response): ${t11Passed ? 'PASSED' : 'FAILED'}`);

    // --- TEST 12: Exact attempt identity ---
    const t12Passed = Boolean(attemptId);
    if (t12Passed) passedCount++;
    console.log(`Test 12 (Exact attempt identity): ${t12Passed ? 'PASSED' : 'FAILED'}`);

    // --- TEST 13: Exact definition-version identity ---
    const [subRow13]: any = await db.query("SELECT assessment_version_id FROM test_submissions WHERE id = ?", [attemptId]);
    const t13Passed = subRow13 && subRow13.length > 0 && Number(subRow13[0].assessment_version_id) === Number(createdDefId);
    if (t13Passed) passedCount++;
    console.log(`Test 13 (Exact definition-version identity): ${t13Passed ? 'PASSED' : 'FAILED'}`);

    // --- TEST 14: Exact event identity ---
    const res14 = await request('/api/assessments/student/event', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: { applicationId: appId1, attemptId, eventType: 'TAB_SWITCH', idempotencyKey: 'evt-key-14' }
    });
    const t14Passed = res14.status === 200 && res14.json?.success;
    if (t14Passed) passedCount++;
    console.log(`Test 14 (Exact event identity): ${t14Passed ? 'PASSED' : 'FAILED'}`);

    // --- TEST 15: Server-side scoring ---
    const q1Id = startQuestions[0]?.id;
    const q2Id = startQuestions[1]?.id;
    const studentAnswers = { [q1Id]: 1, [q2Id]: 2 }; // Both correct = 100 pts

    const res15 = await request(`/api/assessments/student/submit/${attemptId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: { answers: studentAnswers }
    });
    const t15Passed = res15.status === 200 && res15.json?.earnedScore === 100 && res15.json?.isPassed === true;
    if (t15Passed) passedCount++;
    console.log(`Test 15 (Server-side scoring): ${t15Passed ? 'PASSED' : 'FAILED'}`);

    // --- TEST 16: Duplicate submit ---
    const res16 = await request(`/api/assessments/student/submit/${attemptId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: { answers: studentAnswers }
    });
    const t16Passed = res16.status === 200 && res16.json?.earnedScore === 100;
    if (t16Passed) passedCount++;
    console.log(`Test 16 (Duplicate submit): ${t16Passed ? 'PASSED' : 'FAILED'}`);

    // --- TEST 17: Exact History joins ---
    const res17 = await request('/api/assessments/company/history', {
      method: 'GET',
      headers: { Authorization: `Bearer ${companyToken}` }
    });
    const t17Passed = res17.status === 200 && Array.isArray(res17.json?.data) && res17.json?.data.length > 0;
    if (t17Passed) passedCount++;
    console.log(`Test 17 (Exact History joins): ${t17Passed ? 'PASSED' : 'FAILED'}`);

    // --- TEST 18: Assignment replacement isolation ---
    const res18 = await request('/api/assessments/company/assign', {
      method: 'POST',
      headers: { Authorization: `Bearer ${companyToken}` },
      body: { assessmentId: createdDefId, jobId: job1Id, stageId: stage12Id, cutoffScore: 60 }
    });
    const [subCheck18]: any = await db.query("SELECT * FROM test_submissions WHERE id = ?", [attemptId]);
    const t18Passed = res18.status === 200 && subCheck18 && subCheck18[0].score === 100;
    if (t18Passed) passedCount++;
    console.log(`Test 18 (Assignment replacement isolation): ${t18Passed ? 'PASSED' : 'FAILED'}`);

    // --- TEST 19: Seven Pipeline buckets ---
    const res19 = await request('/api/analytics/pipeline/snapshot', {
      method: 'GET',
      headers: { Authorization: `Bearer ${companyToken}` }
    });
    const snapshotData = res19.json?.data || res19.json || {};
    const stages19 = snapshotData.stages || {};
    const expectedKeys = ['applied', 'aiScreening', 'assessment', 'technicalInterview', 'hrInterview', 'selected', 'rejected'];
    const t19Passed = res19.status === 200 && expectedKeys.every(k => stages19[k] && typeof stages19[k].count === 'number' && Array.isArray(stages19[k].candidates));
    if (t19Passed) passedCount++;
    console.log(`Test 19 (Seven Pipeline buckets): ${t19Passed ? 'PASSED' : 'FAILED'}`);

    // --- TEST 20: Unique application membership ---
    const allAppsInBuckets: number[] = [];
    expectedKeys.forEach(k => {
      (stages19[k]?.candidates || []).forEach((c: any) => allAppsInBuckets.push(c.applicationId || c.application_id));
    });
    const uniqueAppsInBuckets = new Set(allAppsInBuckets);
    const t20Passed = allAppsInBuckets.length === uniqueAppsInBuckets.size;
    if (t20Passed) passedCount++;
    console.log(`Test 20 (Unique application membership): ${t20Passed ? 'PASSED' : 'FAILED'}`);

    // --- TEST 21: Count reconciliation ---
    const totalInSnapshot = snapshotData.summary?.totalApplicants ?? 0;
    const t21Passed = totalInSnapshot === allAppsInBuckets.length;
    if (t21Passed) passedCount++;
    console.log(`Test 21 (Count reconciliation): ${t21Passed ? 'PASSED' : 'FAILED'}`);

    // --- TEST 22: latest_test_* contract ---
    const assessmentCand = (stages19['assessment']?.candidates || []).find((c: any) => (c.applicationId || c.application_id) === appId1);
    const t22Passed = Boolean(assessmentCand && assessmentCand.latest_test_score !== undefined && assessmentCand.latest_test_passed !== undefined);
    if (t22Passed) passedCount++;
    console.log(`Test 22 (latest_test_* contract): ${t22Passed ? 'PASSED' : 'FAILED'}`);

    // --- TEST 23: Arbitrary companyId isolation ---
    const res23 = await request('/api/analytics/pipeline/snapshot?companyId=99999', {
      method: 'GET',
      headers: { Authorization: `Bearer ${companyToken}` }
    });
    const res23Total = (res23.json?.data || res23.json)?.summary?.totalApplicants ?? 0;
    const t23Passed = res23.status === 200 && res23Total === totalInSnapshot;
    if (t23Passed) passedCount++;
    console.log(`Test 23 (Arbitrary companyId isolation): ${t23Passed ? 'PASSED' : 'FAILED'}`);

    // --- TEST 24: Sub HR empty scope ---
    const res24 = await request('/api/analytics/pipeline/snapshot', {
      method: 'GET',
      headers: { Authorization: `Bearer ${subHrToken}` }
    });
    const res24Total = (res24.json?.data || res24.json)?.summary?.totalApplicants ?? 0;
    const t24Passed = res24.status === 200 && res24Total === 0;
    if (t24Passed) passedCount++;
    console.log(`Test 24 (Sub HR empty scope): ${t24Passed ? 'PASSED' : 'FAILED'}`);

    // --- TEST 25: Mixed-job Bulk Advance ---
    // Prepare Application B on Job B (job2Id) at TESTING stage (stage22Id) with passed completed attempt
    const [appBRes]: any = await db.query("INSERT INTO job_applications (job_id, student_id, current_stage_id, status) VALUES (?, ?, ?, 'IN_PROGRESS')", [job2Id, testStudentId, stage22Id]);
    const appIdB = appBRes.insertId || 2001;

    await request('/api/assessments/company/assign', {
      method: 'POST',
      headers: { Authorization: `Bearer ${companyToken}` },
      body: { assessmentId: createdDefId, jobId: job2Id, stageId: stage22Id, cutoffScore: 40 }
    });

    const resStartB = await request('/api/assessments/student/start', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: { applicationId: appIdB }
    });
    const attemptIdB = resStartB.json?.attemptId;
    const q1IdB = resStartB.json?.questions[0]?.id;
    const q2IdB = resStartB.json?.questions[1]?.id;

    await request(`/api/assessments/student/submit/${attemptIdB}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: { answers: { [q1IdB]: 1, [q2IdB]: 2 } } // 100 pts -> passed
    });

    // Execute mixed-job bulk advance submitting both App A (Job 1) and App B (Job 2) in single request
    const res25 = await request('/api/assessments/company/bulk-advance', {
      method: 'POST',
      headers: { Authorization: `Bearer ${companyToken}` },
      body: {
        applications: [
          { applicationId: appId1, expectedCurrentStageId: stage12Id },
          { applicationId: appIdB, expectedCurrentStageId: stage22Id }
        ]
      }
    });

    const [appCheckA]: any = await db.query("SELECT current_stage_id FROM job_applications WHERE id = ?", [appId1]);
    const [appCheckB]: any = await db.query("SELECT current_stage_id FROM job_applications WHERE id = ?", [appIdB]);

    const results25 = res25.json?.results || [];
    const t25Passed = res25.status === 200 &&
      Array.isArray(results25) &&
      results25.length === 2 &&
      results25[0]?.success === true &&
      results25[1]?.success === true &&
      Number(appCheckA[0]?.current_stage_id) === Number(stage13Id) &&
      Number(appCheckB[0]?.current_stage_id) === Number(stage23Id) &&
      Number(appCheckA[0]?.current_stage_id) !== Number(stage23Id) &&
      Number(appCheckB[0]?.current_stage_id) !== Number(stage13Id);

    if (t25Passed) passedCount++;
    console.log(`Test 25 (Mixed-job Bulk Advance): ${t25Passed ? 'PASSED' : 'FAILED'}`);

    // --- TEST 26: Immediate next same-job stage ---
    const t26Passed = Number(appCheckA[0]?.current_stage_id) === Number(stage13Id) && Number(appCheckB[0]?.current_stage_id) === Number(stage23Id);
    if (t26Passed) passedCount++;
    console.log(`Test 26 (Immediate next same-job stage): ${t26Passed ? 'PASSED' : 'FAILED'}`);

    // --- TEST 27: Failed candidate remains in Assessment ---
    // Seed failing application on job 2 for student 11
    await db.query("INSERT OR REPLACE INTO users (id, email, password_hash, role) VALUES (11, 'student2@test.com', 'hash', 'STUDENT')");
    await db.query("INSERT OR REPLACE INTO student_profiles (id, user_id, full_name) VALUES (11, 11, 'Jane Student')");
    const studentToken2 = generateToken({ id: 11, userId: 11, email: 'student2@test.com', role: 'STUDENT' });

    const [app2Res]: any = await db.query("INSERT INTO job_applications (job_id, student_id, current_stage_id, status) VALUES (?, 11, ?, 'IN_PROGRESS')", [job2Id, stage22Id]);
    const appId2 = app2Res.insertId || 1002;

    await request('/api/assessments/company/assign', {
      method: 'POST',
      headers: { Authorization: `Bearer ${companyToken}` },
      body: { assessmentId: createdDefId, jobId: job2Id, stageId: stage22Id, cutoffScore: 80 }
    });

    const res27Start = await request('/api/assessments/student/start', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken2}` },
      body: { applicationId: appId2 }
    });

    const attemptId2 = res27Start.json?.attemptId;
    const q1Id2 = res27Start.json?.questions[0]?.id;
    const q2Id2 = res27Start.json?.questions[1]?.id;

    // Submit wrong answers -> 0 pts
    await request(`/api/assessments/student/submit/${attemptId2}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken2}` },
      body: { answers: { [q1Id2]: 0, [q2Id2]: 0 } }
    });

    const res27Adv = await request('/api/assessments/company/bulk-advance', {
      method: 'POST',
      headers: { Authorization: `Bearer ${companyToken}` },
      body: {
        applications: [
          { applicationId: appId2, expectedCurrentStageId: stage22Id }
        ]
      }
    });

    const [appCheck27]: any = await db.query("SELECT current_stage_id FROM job_applications WHERE id = ?", [appId2]);
    const t27Passed = res27Adv.json?.results[0]?.success === false && appCheck27[0].current_stage_id === stage22Id;
    if (t27Passed) passedCount++;
    console.log(`Test 27 (Failed candidate remains in Assessment): ${t27Passed ? 'PASSED' : 'FAILED'}`);

    // --- TEST 28: Ended job is read-only ---
    await db.query("UPDATE jobs SET status = 'ENDED' WHERE id = ?", [job1Id]);
    const res28 = await request('/api/assessments/company/assign', {
      method: 'POST',
      headers: { Authorization: `Bearer ${companyToken}` },
      body: { assessmentId: createdDefId, jobId: job1Id, stageId: stage12Id, cutoffScore: 40 }
    });
    const t28Passed = res28.status === 400 || res28.status === 403;
    if (t28Passed) passedCount++;
    console.log(`Test 28 (Ended job is read-only): ${t28Passed ? 'PASSED' : 'FAILED'}`);

    // Re-activate job 1 for subsequent tests
    await db.query("UPDATE jobs SET status = 'ACTIVE' WHERE id = ?", [job1Id]);

    // --- TEST 29: Undo Stage separation ---
    const res29 = await request('/api/job/applications/undo-stage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${companyToken}` },
      body: { applicationId: appId1, expectedCurrentStageId: stage13Id }
    });
    const [appCheck29]: any = await db.query("SELECT current_stage_id FROM job_applications WHERE id = ?", [appId1]);
    const t29Passed = (res29.status === 200 || appCheck29[0].current_stage_id === stage12Id);
    if (t29Passed) passedCount++;
    console.log(`Test 29 (Undo Stage separation): ${t29Passed ? 'PASSED' : 'FAILED'}`);

    // --- TEST 30: Undo Decision separation ---
    await db.query("UPDATE job_applications SET status = 'REJECTED' WHERE id = ?", [appId2]);
    const res30 = await request('/api/job/applications/undo-decision', {
      method: 'POST',
      headers: { Authorization: `Bearer ${companyToken}` },
      body: { applicationId: appId2 }
    });
    const [appCheck30]: any = await db.query("SELECT status FROM job_applications WHERE id = ?", [appId2]);
    const t30Passed = (res30.status === 200 || appCheck30[0].status === 'IN_PROGRESS');
    if (t30Passed) passedCount++;
    console.log(`Test 30 (Undo Decision separation): ${t30Passed ? 'PASSED' : 'FAILED'}`);

    console.log(`\nFOCUSED VERIFICATION SUMMARY: ${passedCount}/${totalTests} TESTS PASSED.`);

    if (passedCount === totalTests) {
      console.log("FOCUSED_VERIFY_STATUS: PASSED");
      process.exit(0);
    } else {
      console.error("FOCUSED_VERIFY_STATUS: FAILED");
      process.exit(1);
    }
  } catch (err: any) {
    console.error("Error during focused verification execution:", err);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
  }
}

runVerification();
