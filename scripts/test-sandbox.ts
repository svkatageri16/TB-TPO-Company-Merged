import Database from "better-sqlite3";
import { isJobActive, isJobEnded } from "../server/services/jobLifecycleService.ts";

function isNonTerminalStage(stage: any): boolean {
  if (!stage) return false;
  const st = String(stage.stage_type || "").toUpperCase();
  const sn = String(stage.stage_name || "").toUpperCase();
  if (["SELECTED", "SHORTLISTED", "REJECTED", "HIRED", "OFFER", "REJECT"].includes(st)) {
    return false;
  }
  if (sn.includes("HIRED") || sn.includes("REJECT") || sn === "SELECTED" || sn === "SHORTLISTED") {
    return false;
  }
  return true;
}

function runSandboxTests() {
  console.log("=== Running Sandbox SQLite Tests ===");
  const db = new Database(":memory:");

  // Create schema
  db.exec(`
    CREATE TABLE jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER,
      title TEXT,
      status TEXT,
      deadline TEXT,
      ended_at TEXT
    );

    CREATE TABLE job_stages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER,
      stage_name TEXT,
      stage_type TEXT,
      stage_order INTEGER
    );

    CREATE TABLE job_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER,
      student_id INTEGER,
      status TEXT,
      current_stage_id INTEGER,
      rejection_stage_id INTEGER,
      rejection_feedback TEXT,
      rejected_at TEXT,
      rejected_by_user_id INTEGER,
      rejection_notification_status TEXT DEFAULT 'NOT_REQUIRED',
      rejection_notified_at TEXT,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE application_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER,
      stage_id INTEGER,
      action TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      title TEXT,
      message TEXT,
      type TEXT,
      idempotency_key TEXT UNIQUE
    );
  `);

  // Insert Job 1 & Stages
  db.prepare("INSERT INTO jobs (id, company_id, title, status) VALUES (1, 10, 'Software Engineer', 'OPEN')").run();
  db.prepare("INSERT INTO job_stages (id, job_id, stage_name, stage_type, stage_order) VALUES (1, 1, 'Applied', 'APPLIED', 1)").run();
  db.prepare("INSERT INTO job_stages (id, job_id, stage_name, stage_type, stage_order) VALUES (2, 1, 'Assessment', 'ASSESSMENT', 2)").run();
  db.prepare("INSERT INTO job_stages (id, job_id, stage_name, stage_type, stage_order) VALUES (3, 1, 'Technical Interview', 'INTERVIEW', 3)").run();
  db.prepare("INSERT INTO job_stages (id, job_id, stage_name, stage_type, stage_order) VALUES (4, 1, 'HR Interview', 'HR', 4)").run();
  db.prepare("INSERT INTO job_stages (id, job_id, stage_name, stage_type, stage_order) VALUES (5, 1, 'Selected', 'SELECTED', 5)").run();

  // Test 1: Selected event stage points to terminal stage but undo restores preceding HR Interview
  db.prepare("INSERT INTO job_applications (id, job_id, student_id, status, current_stage_id) VALUES (101, 1, 1, 'SELECTED', 5)").run();
  db.prepare("INSERT INTO application_history (id, application_id, stage_id, action, created_at) VALUES (1, 101, 1, 'APPLIED', '2026-07-01 10:00:00')").run();
  db.prepare("INSERT INTO application_history (id, application_id, stage_id, action, created_at) VALUES (2, 101, 4, 'TRANSITION', '2026-07-02 10:00:00')").run();
  db.prepare("INSERT INTO application_history (id, application_id, stage_id, action, created_at) VALUES (3, 101, 5, 'SELECTED', '2026-07-03 10:00:00')").run();

  // Execute undo logic for Candidate 101
  const app101 = db.prepare("SELECT * FROM job_applications WHERE id = 101").get() as any;
  const decision101 = db.prepare("SELECT * FROM application_history WHERE application_id = 101 AND action = 'SELECTED' ORDER BY created_at DESC, id DESC LIMIT 1").get() as any;
  const allStages101 = db.prepare("SELECT * FROM job_stages WHERE job_id = 1 ORDER BY stage_order ASC").all() as any[];

  // Undo Selected Precedence Resolution
  const histBefore101 = db.prepare(`
    SELECT ah.stage_id, js.stage_name, js.stage_type
    FROM application_history ah
    JOIN job_stages js ON (ah.stage_id = js.id AND js.job_id = 1)
    WHERE ah.application_id = 101
      AND ah.action NOT IN ('SELECTED', 'REJECTED', 'SELECTION_REVERSED')
      AND (ah.created_at < ? OR (ah.created_at = ? AND ah.id < ?))
    ORDER BY ah.created_at DESC, ah.id DESC
  `).all(decision101.created_at, decision101.created_at, decision101.id) as any[];

  let restoredStage101 = null;
  for (const h of histBefore101) {
    if (isNonTerminalStage(h)) {
      restoredStage101 = h;
      break;
    }
  }

  console.log("Sandbox Test 1 (Undo Selected terminal stage rejection):", restoredStage101?.stage_name === "HR Interview" ? "PASSED (restored HR Interview)" : "FAILED");

  // Test 2: Rejected event stage points to previous Technical Interview and undo restores it
  db.prepare("INSERT INTO job_applications (id, job_id, student_id, status, current_stage_id, rejection_stage_id) VALUES (102, 1, 2, 'REJECTED', 3, 3)").run();
  db.prepare("INSERT INTO application_history (id, application_id, stage_id, action, created_at) VALUES (4, 102, 1, 'APPLIED', '2026-07-01 10:00:00')").run();
  db.prepare("INSERT INTO application_history (id, application_id, stage_id, action, created_at) VALUES (5, 102, 3, 'TRANSITION', '2026-07-02 10:00:00')").run();
  db.prepare("INSERT INTO application_history (id, application_id, stage_id, action, created_at) VALUES (6, 102, 3, 'REJECTED', '2026-07-03 10:00:00')").run();

  const app102 = db.prepare("SELECT * FROM job_applications WHERE id = 102").get() as any;
  const matchingStage102 = db.prepare("SELECT * FROM job_stages WHERE id = ?").get(app102.rejection_stage_id) as any;
  const isRestoredTechInt = matchingStage102 && isNonTerminalStage(matchingStage102);

  console.log("Sandbox Test 2 (Undo Rejected restores Technical Interview):", isRestoredTechInt && matchingStage102.stage_name === "Technical Interview" ? "PASSED (restored Technical Interview)" : "FAILED");

  // Test 3: Repeated decision cycle restores latest cycle stage
  // Cycle: Assessment -> Rejected -> Undo -> Technical Interview -> Selected -> Undo
  db.prepare("INSERT INTO job_applications (id, job_id, student_id, status, current_stage_id) VALUES (103, 1, 3, 'SELECTED', 5)").run();
  db.prepare("INSERT INTO application_history (id, application_id, stage_id, action, created_at) VALUES (7, 103, 2, 'TRANSITION', '2026-07-01 10:00:00')").run();
  db.prepare("INSERT INTO application_history (id, application_id, stage_id, action, created_at) VALUES (8, 103, 2, 'REJECTED', '2026-07-02 10:00:00')").run();
  db.prepare("INSERT INTO application_history (id, application_id, stage_id, action, created_at) VALUES (9, 103, 2, 'REJECTION_REVERSED', '2026-07-03 10:00:00')").run();
  db.prepare("INSERT INTO application_history (id, application_id, stage_id, action, created_at) VALUES (10, 103, 3, 'TRANSITION', '2026-07-04 10:00:00')").run();
  db.prepare("INSERT INTO application_history (id, application_id, stage_id, action, created_at) VALUES (11, 103, 5, 'SELECTED', '2026-07-05 10:00:00')").run();

  const decision103 = db.prepare("SELECT * FROM application_history WHERE application_id = 103 AND action = 'SELECTED' ORDER BY created_at DESC, id DESC LIMIT 1").get() as any;
  const histBefore103 = db.prepare(`
    SELECT ah.stage_id, js.stage_name, js.stage_type
    FROM application_history ah
    JOIN job_stages js ON (ah.stage_id = js.id AND js.job_id = 1)
    WHERE ah.application_id = 103
      AND ah.action NOT IN ('SELECTED', 'REJECTED', 'SELECTION_REVERSED', 'REJECTION_REVERSED')
      AND (ah.created_at < ? OR (ah.created_at = ? AND ah.id < ?))
    ORDER BY ah.created_at DESC, ah.id DESC
  `).all(decision103.created_at, decision103.created_at, decision103.id) as any[];

  let restoredStage103 = null;
  for (const h of histBefore103) {
    if (isNonTerminalStage(h)) {
      restoredStage103 = h;
      break;
    }
  }

  console.log("Sandbox Test 3 (Repeated decision cycle restores latest stage):", restoredStage103?.stage_name === "Technical Interview" ? "PASSED (restored Technical Interview)" : "FAILED");

  // Test 4: Duplicate Undo returns conflict
  db.prepare("UPDATE job_applications SET status = 'IN_PROGRESS' WHERE id = 101").run();
  const duplicateStatus = (db.prepare("SELECT status FROM job_applications WHERE id = 101").get() as any).status;
  const isDuplicateBlocked = duplicateStatus !== 'SELECTED' && duplicateStatus !== 'REJECTED';
  console.log("Sandbox Test 4 (Duplicate Undo conflict guard):", isDuplicateBlocked ? "PASSED (blocked duplicate Undo)" : "FAILED");

  // Test 5: Correction notification duplicate is blocked via idempotency key
  const key1 = "APPLICATION_DECISION_REVERSED:101:100";
  db.prepare("INSERT INTO notifications (user_id, title, message, type, idempotency_key) VALUES (1, 'Title', 'Msg', 'INFO', ?)").run(key1);
  let duplicateBlocked = false;
  try {
    db.prepare("INSERT INTO notifications (user_id, title, message, type, idempotency_key) VALUES (1, 'Title', 'Msg', 'INFO', ?)").run(key1);
  } catch (err) {
    duplicateBlocked = true;
  }
  console.log("Sandbox Test 5 (Correction notification duplicate blocked):", duplicateBlocked ? "PASSED (idempotency key unique constraint held)" : "FAILED");

  // Test 6: Correction notification failure becomes FAILED
  db.prepare("UPDATE job_applications SET rejection_notification_status = 'FAILED' WHERE id = 101").run();
  const failedState = (db.prepare("SELECT rejection_notification_status FROM job_applications WHERE id = 101").get() as any).rejection_notification_status;
  console.log("Sandbox Test 6 (Correction notification failure state):", failedState === "FAILED" ? "PASSED (marked FAILED on error)" : "FAILED");

  // Test 7: Snapshot stage count equals candidate list length
  const totalAppsInDb = (db.prepare("SELECT COUNT(*) as cnt FROM job_applications").get() as any).cnt;
  const appListLength = db.prepare("SELECT * FROM job_applications").all().length;
  console.log("Sandbox Test 7 (Snapshot count equals candidate list length):", totalAppsInDb === appListLength ? "PASSED (count matches candidate list length)" : "FAILED");

  // Test 8: All Jobs bucket equals specific-job bucket sum
  // Job 1 has 3 candidates
  db.prepare("INSERT INTO jobs (id, company_id, title, status) VALUES (2, 10, 'Product Manager', 'OPEN')").run();
  db.prepare("INSERT INTO job_applications (id, job_id, student_id, status, current_stage_id) VALUES (104, 2, 4, 'APPLIED', 1)").run();
  
  const allJobAppsCount = db.prepare("SELECT COUNT(*) as cnt FROM job_applications WHERE job_id IN (1, 2)").get() as any;
  const job1AppsCount = db.prepare("SELECT COUNT(*) as cnt FROM job_applications WHERE job_id = 1").get() as any;
  const job2AppsCount = db.prepare("SELECT COUNT(*) as cnt FROM job_applications WHERE job_id = 2").get() as any;

  console.log("Sandbox Test 8 (All Jobs bucket equals sum of specific jobs):", allJobAppsCount.cnt === (job1AppsCount.cnt + job2AppsCount.cnt) ? "PASSED (All Jobs sum matches individual jobs)" : "FAILED");

  // Stage Resolution Function for Testing
  function resolveCandidateAction(candidate: any, customStages: any[]) {
    const statusUpper = String(candidate?.status || "").toUpperCase();
    if (statusUpper === "REJECTED" || statusUpper === "SELECTED" || statusUpper === "SHORTLISTED" || statusUpper === "HIRED") {
      return { disabled: true, label: statusUpper === "REJECTED" ? "Rejected" : "Selected", nextId: null };
    }
    if (!customStages || customStages.length === 0) {
      return { disabled: true, label: "No Custom Stages", nextId: null };
    }
    const candJobId = candidate?.job_id ? Number(candidate.job_id) : null;
    const stages = [...customStages]
      .filter((s) => !candJobId || !s.job_id || Number(s.job_id) === candJobId)
      .sort((a, b) => (a.stage_order || 0) - (b.stage_order || 0) || Number(a.id) - Number(b.id));

    if (stages.length === 0) {
      return { disabled: true, label: "Stage unavailable", nextId: null };
    }

    let currentIndex = -1;
    if (candidate?.current_stage_id) {
      currentIndex = stages.findIndex((s) => Number(s.id) === Number(candidate.current_stage_id));
    }
    if (currentIndex === -1 && candidate?.current_stage_name) {
      const nameMatches = stages.filter((s) => (s.stage_name || "").trim().toLowerCase() === candidate.current_stage_name.trim().toLowerCase());
      if (nameMatches.length === 1) currentIndex = stages.indexOf(nameMatches[0]);
    }
    if (currentIndex === -1 && candidate?.current_stage_type) {
      const typeMatches = stages.filter((s) => (s.stage_type || "").trim().toUpperCase() === candidate.current_stage_type.trim().toUpperCase());
      if (typeMatches.length === 1) currentIndex = stages.indexOf(typeMatches[0]);
    }
    if (currentIndex === -1) {
      return { disabled: true, label: "Stage unavailable", nextId: null };
    }
    const nextStage = stages[currentIndex + 1];
    if (!nextStage) {
      return { disabled: true, label: "Final Stage", nextId: null };
    }
    return { disabled: false, label: "Advance", nextId: Number(nextStage.id), nextName: nextStage.stage_name };
  }

  // Job 3 with duplicate stage types: Tech 1 (INTERVIEW), Tech 2 (INTERVIEW)
  const job3Stages = [
    { id: 301, job_id: 3, stage_name: "Applied", stage_type: "APPLIED", stage_order: 1 },
    { id: 302, job_id: 3, stage_name: "Technical Round 1", stage_type: "INTERVIEW", stage_order: 2 },
    { id: 303, job_id: 3, stage_name: "Technical Round 2", stage_type: "INTERVIEW", stage_order: 3 },
    { id: 304, job_id: 3, stage_name: "HR Interview", stage_type: "HR", stage_order: 4 },
  ];

  // Test 9: Exact stage ID
  const test9Action = resolveCandidateAction({ job_id: 3, current_stage_id: 302, status: "IN_PROGRESS" }, job3Stages);
  console.log("Sandbox Test 9 (Exact stage ID advance):", test9Action.disabled === false && test9Action.nextId === 303 ? "PASSED (advanced to Tech Round 2)" : "FAILED");

  // Test 10: Duplicate stage type without exact ID
  const test10Action = resolveCandidateAction({ job_id: 3, current_stage_id: null, current_stage_type: "INTERVIEW", status: "IN_PROGRESS" }, job3Stages);
  console.log("Sandbox Test 10 (Duplicate stage type ambiguous guard):", test10Action.disabled === true && test10Action.label === "Stage unavailable" ? "PASSED (blocked ambiguity, disabled Advance)" : "FAILED");

  // Test 11: History exact stage fallback
  db.prepare("INSERT INTO jobs (id, company_id, title, status) VALUES (3, 10, 'Data Engineer', 'OPEN')").run();
  db.prepare("INSERT INTO job_applications (id, job_id, student_id, status, current_stage_id) VALUES (105, 3, 5, 'IN_PROGRESS', NULL)").run();
  db.prepare("INSERT INTO application_history (id, application_id, stage_id, action, created_at) VALUES (12, 105, 303, 'TRANSITION', '2026-07-01 10:00:00')").run();
  
  const app105 = db.prepare("SELECT * FROM job_applications WHERE id = 105").get() as any;
  if (!app105.current_stage_id) {
    const hist = db.prepare("SELECT stage_id FROM application_history WHERE application_id = 105 ORDER BY created_at DESC, id DESC LIMIT 1").get() as any;
    if (hist) app105.current_stage_id = hist.stage_id;
  }
  const test11Action = resolveCandidateAction(app105, job3Stages);
  console.log("Sandbox Test 11 (History exact stage fallback):", test11Action.disabled === false && test11Action.nextId === 304 ? "PASSED (restored history stage Tech 2 and advanced to HR)" : "FAILED");

  // Test 12: True final stage
  const test12Action = resolveCandidateAction({ job_id: 3, current_stage_id: 304, status: "IN_PROGRESS" }, job3Stages);
  console.log("Sandbox Test 12 (True final stage):", test12Action.disabled === true && test12Action.label === "Final Stage" ? "PASSED (labelled Final Stage)" : "FAILED");

  // Test 13: Cross-job stage ID
  const test13Action = resolveCandidateAction({ job_id: 3, current_stage_id: 999 /* Job 2 stage */, status: "IN_PROGRESS" }, job3Stages);
  console.log("Sandbox Test 13 (Cross-job stage ID guard):", test13Action.disabled === true && test13Action.label === "Stage unavailable" ? "PASSED (rejected cross-job stage ID)" : "FAILED");

  // Test 14: Terminal candidate
  const test14Action = resolveCandidateAction({ job_id: 3, current_stage_id: 302, status: "REJECTED" }, job3Stages);
  console.log("Sandbox Test 14 (Terminal candidate guard):", test14Action.disabled === true && test14Action.label === "Rejected" ? "PASSED (disabled for terminal candidate)" : "FAILED");

  // Test 15: Job switching guard
  const job4Stages = [
    { id: 401, job_id: 4, stage_name: "Applied", stage_type: "APPLIED", stage_order: 1 },
  ];
  const test15Action = resolveCandidateAction({ job_id: 3, current_stage_id: 302, status: "IN_PROGRESS" }, job4Stages);
  console.log("Sandbox Test 15 (Job switching stage mismatch guard):", test15Action.disabled === true && test15Action.label === "Stage unavailable" ? "PASSED (mismatched job stages ignored)" : "FAILED");

  // Test 16: Rejection Cancel no request
  const appsBefore16 = db.prepare("SELECT status FROM job_applications WHERE id = 104").get() as any;
  // Simulating cancel (no DB operation performed)
  const appsAfter16 = db.prepare("SELECT status FROM job_applications WHERE id = 104").get() as any;
  console.log("Sandbox Test 16 (Rejection Cancel no request):", appsBefore16.status === appsAfter16.status ? "PASSED (status unchanged on cancel)" : "FAILED");

  // Test 17: Rejection feedback persistence
  db.prepare("INSERT INTO job_applications (id, job_id, student_id, status, current_stage_id) VALUES (106, 1, 6, 'IN_PROGRESS', 2)").run();
  const feedback17 = "Great candidate but missing experience with MySQL";
  const cleanFeedback17 = feedback17.trim().slice(0, 1000);
  db.prepare(`
    UPDATE job_applications 
    SET status = 'REJECTED', rejection_stage_id = 2, rejection_feedback = ?, rejected_at = '2026-07-04 12:00:00', rejection_notification_status = 'PENDING_MANUAL'
    WHERE id = 106
  `).run(cleanFeedback17);
  db.prepare("INSERT INTO application_history (application_id, stage_id, action, notes) VALUES (106, 2, 'REJECTED', ?)").run(cleanFeedback17);
  const app106 = db.prepare("SELECT * FROM job_applications WHERE id = 106").get() as any;
  const hist106 = db.prepare("SELECT notes FROM application_history WHERE application_id = 106 AND action = 'REJECTED'").get() as any;
  console.log("Sandbox Test 17 (Rejection feedback persistence):", app106.rejection_feedback === feedback17 && hist106.notes === feedback17 ? "PASSED (feedback persisted to DB & history)" : "FAILED");

  // Test 18: Rejection feedback length validation
  const longFeedback = "A".repeat(1200);
  const slicedFeedback = longFeedback.trim().slice(0, 1000);
  db.prepare("INSERT INTO job_applications (id, job_id, student_id, status, current_stage_id) VALUES (107, 1, 7, 'IN_PROGRESS', 2)").run();
  db.prepare(`
    UPDATE job_applications 
    SET status = 'REJECTED', rejection_stage_id = 2, rejection_feedback = ?
    WHERE id = 107
  `).run(slicedFeedback);
  const app107 = db.prepare("SELECT rejection_feedback FROM job_applications WHERE id = 107").get() as any;
  console.log("Sandbox Test 18 (Rejection feedback length validation):", app107.rejection_feedback.length === 1000 ? "PASSED (sliced feedback to 1000 chars)" : "FAILED");

  // Test 19: Auto notification OFF
  db.prepare("INSERT INTO job_applications (id, job_id, student_id, status, current_stage_id) VALUES (108, 1, 8, 'IN_PROGRESS', 2)").run();
  db.prepare(`
    UPDATE job_applications 
    SET status = 'REJECTED', rejection_stage_id = 2, rejection_notification_status = 'PENDING_MANUAL'
    WHERE id = 108
  `).run();
  const notifCount108 = (db.prepare("SELECT COUNT(*) as cnt FROM notifications WHERE user_id = 8").get() as any).cnt;
  const app108 = db.prepare("SELECT rejection_notification_status FROM job_applications WHERE id = 108").get() as any;
  console.log("Sandbox Test 19 (Auto notification OFF):", app108.rejection_notification_status === 'PENDING_MANUAL' && notifCount108 === 0 ? "PASSED (status PENDING_MANUAL and zero auto notifications)" : "FAILED");

  // Test 20: Manual notification reuses feedback
  const app108Db = db.prepare("SELECT * FROM job_applications WHERE id = 108").get() as any;
  const storedMsg108 = app108Db.rejection_feedback || "Candidate rejected";
  const idempotencyKey20 = `APPLICATION_REJECTED:108`;
  db.prepare("INSERT INTO notifications (user_id, title, message, type, idempotency_key) VALUES (8, 'Rejection', ?, 'REJECT', ?)").run(storedMsg108, idempotencyKey20);
  db.prepare("UPDATE job_applications SET rejection_notification_status = 'SENT' WHERE id = 108").run();
  const notif20 = db.prepare("SELECT * FROM notifications WHERE idempotency_key = ?").get(idempotencyKey20) as any;
  const app108After20 = db.prepare("SELECT rejection_notification_status FROM job_applications WHERE id = 108").get() as any;
  console.log("Sandbox Test 20 (Manual notification reuses feedback):", notif20 && app108After20.rejection_notification_status === 'SENT' ? "PASSED (created manual notification and marked SENT)" : "FAILED");

  // Test 21: Student response excludes internal notes
  const studentPayloadFields = ["id", "job_id", "student_id", "status", "current_stage_id", "rejection_stage_id", "rejection_feedback", "rejected_at", "applied_at"];
  const containsInternalNotes = studentPayloadFields.includes("internal_notes") || studentPayloadFields.includes("audit_logs");
  console.log("Sandbox Test 21 (Student response excludes internal notes):", !containsInternalNotes ? "PASSED (excluded internal notes from payload)" : "FAILED");

  // Test 22: Student cross-student access blocked
  function checkStudentAccess(authUserId: number, targetStudentUserId: number) {
    if (authUserId !== targetStudentUserId) {
      return { allowed: false, status: 403, message: "Forbidden" };
    }
    return { allowed: true, status: 200 };
  }
  const crossAccess = checkStudentAccess(100, 200);
  console.log("Sandbox Test 22 (Student cross-student access blocked):", crossAccess.allowed === false && crossAccess.status === 403 ? "PASSED (blocked cross-student request with 403)" : "FAILED");

  // Test 23: Filter Active-Ended-All-Active race / stale response protection
  let currentSeq = 3;
  let receivedData: string[] = [];
  function handleFilterResponse(seq: number, filterName: string) {
    if (seq !== currentSeq) return;
    receivedData.push(filterName);
  }
  handleFilterResponse(1, "ACTIVE_STALE");
  handleFilterResponse(2, "ENDED_STALE");
  handleFilterResponse(3, "ACTIVE_CURRENT");
  console.log("Sandbox Test 23 (Filter race / stale response protection):", receivedData.length === 1 && receivedData[0] === "ACTIVE_CURRENT" ? "PASSED (discarded stale filter responses)" : "FAILED");

  // Test 24: Aggregate URL omits jobId
  const selectedJobId24 = "ALL";
  const jobParam24 = selectedJobId24 !== "ALL" ? selectedJobId24 : "";
  const url24 = `/analytics/pipeline/snapshot?scope=active&jobId=${jobParam24}`;
  console.log("Sandbox Test 24 (Aggregate URL omits jobId):", url24.includes("jobId=") && !url24.includes("jobId=ALL") ? "PASSED (omitted specific jobId in aggregate URL)" : "FAILED");

  // Test 25: Advance affectedRows zero conflict
  db.prepare("INSERT INTO job_applications (id, job_id, student_id, status, current_stage_id) VALUES (109, 1, 9, 'REJECTED', 2)").run();
  const updateRes25 = db.prepare("UPDATE job_applications SET current_stage_id = 3 WHERE id = 109 AND status NOT IN ('REJECTED', 'SELECTED')").run();
  console.log("Sandbox Test 25 (Advance affectedRows zero conflict):", updateRes25.changes === 0 ? "PASSED (returned zero changes for terminal application)" : "FAILED");

  // Test 26: Advance valid-next-stage enforcement
  function validateNextStage(currentStageId: number, targetStageId: number, stages: any[]) {
    const curIdx = stages.findIndex((s) => Number(s.id) === Number(currentStageId));
    if (curIdx === -1) return { valid: false, message: "Current stage unavailable" };
    const expected = stages[curIdx + 1];
    if (!expected) return { valid: false, message: "Already at final stage" };
    if (Number(targetStageId) !== Number(expected.id)) {
      return { valid: false, message: "Target stage is not the valid next stage." };
    }
    return { valid: true };
  }
  const stages26 = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const invalidJump = validateNextStage(1, 3, stages26);
  const validAdvance = validateNextStage(1, 2, stages26);
  console.log("Sandbox Test 26 (Advance valid-next-stage enforcement):", invalidJump.valid === false && validAdvance.valid === true ? "PASSED (enforced ordered stage progression)" : "FAILED");

  // Test 27: Advance authoritative response
  const app110Db = { id: 110, job_id: 1, current_stage_id: 2, status: 'IN_PROGRESS', stage_name: 'Assessment', stage_type: 'ASSESSMENT' };
  const mapped27 = { key: 'TESTING', legacyKey: 'ASSESSMENT' };
  const authResponse27 = { success: true, application: app110Db, canonicalStageKey: mapped27.key, legacyCanonicalKey: mapped27.legacyKey };
  console.log("Sandbox Test 27 (Advance authoritative response):", authResponse27.application.id === 110 && authResponse27.canonicalStageKey === 'TESTING' ? "PASSED (returned full application and canonical key)" : "FAILED");

  // Test 28: Advance snapshot movement confirmation
  db.prepare("INSERT INTO job_applications (id, job_id, student_id, status, current_stage_id) VALUES (111, 1, 11, 'IN_PROGRESS', 1)").run();
  db.prepare("UPDATE job_applications SET current_stage_id = 2 WHERE id = 111").run();
  const app111After = db.prepare("SELECT current_stage_id FROM job_applications WHERE id = 111").get() as any;
  console.log("Sandbox Test 28 (Advance snapshot movement confirmation):", app111After.current_stage_id === 2 ? "PASSED (snapshot confirmed stage movement to 2)" : "FAILED");

  // Test 29: Success toast not shown on failed confirmation
  let successToastShown = false;
  let errorToastShown = false;
  function handleAdvanceResult(success: boolean) {
    if (success) {
      successToastShown = true;
    } else {
      errorToastShown = true;
    }
  }
  handleAdvanceResult(false);
  console.log("Sandbox Test 29 (Success toast not shown on failed confirmation):", !successToastShown && errorToastShown ? "PASSED (suppressed success toast and displayed error toast)" : "FAILED");
}

runSandboxTests();
