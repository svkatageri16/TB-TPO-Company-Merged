import express from "express";
import db from "../db.ts";
import { sendEmail, sendInterviewInvitationToAttendee } from "../services/emailService.ts";
import { authenticate } from "../middleware/auth.ts";
import { checkAndProcessJobExpirations } from "../services/jobExpiryService.ts";

const router = express.Router();

// List jobs with filtering and search
router.get("/", async (req, res) => {
  const { search, skills, location, type, experience, studentId, companyId, status } = req.query;
  try {
    await checkAndProcessJobExpirations();
    let query = `
      SELECT J.*, C.company_name, C.logo_url,
             (SELECT COUNT(*) FROM job_stages JS WHERE JS.job_id = J.id) as stage_count
      FROM jobs J 
      JOIN company_profiles C ON J.company_id = C.id 
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status && status !== 'ALL') {
      query += ` AND J.status = ?`;
      params.push(status);
    } else if (!status) {
      query += ` AND J.status = 'OPEN'`;
    }

    if (companyId) {
      query += ` AND J.company_id = ?`;
      params.push(companyId);
    }

    if (search) {
      query += ` AND (J.title LIKE ? OR C.company_name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (location) {
      query += ` AND J.location LIKE ?`;
      params.push(`%${location}%`);
    }

    if (type) {
      query += ` AND J.job_type = ?`;
      params.push(type);
    }

    if (experience) {
      query += ` AND J.experience_level = ?`;
      params.push(experience);
    }

    const [jobs]: any = await db.query(query, params);

    // If studentId is provided, calculate match scores
    let enrichedJobs = jobs;
    if (studentId) {
       const [profiles]: any = await db.query("SELECT skills_json FROM student_profiles WHERE id = ?", [studentId]);
       if (profiles.length > 0) {
          const studentSkills = profiles[0].skills_json ? (typeof profiles[0].skills_json === 'string' ? JSON.parse(profiles[0].skills_json) : profiles[0].skills_json) : [];
          enrichedJobs = jobs.map((job: any) => {
             const jobSkills = job.skills_json ? (typeof job.skills_json === 'string' ? JSON.parse(job.skills_json) : job.skills_json) : [];
             if (!Array.isArray(jobSkills) || jobSkills.length === 0) return { ...job, match_score: 100 };
             
             const matches = jobSkills.filter((s: string) => 
                studentSkills.some((ss: any) => {
                   const sName = typeof ss === 'string' ? ss : (ss.name || "");
                   return sName.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(sName.toLowerCase());
                })
             );
             const score = Math.round((matches.length / jobSkills.length) * 100);
             return { ...job, match_score: score };
          });
       }
    }

    res.json({ success: true, data: enrichedJobs });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({ success: false, message: "Error fetching jobs" });
  }
});

// Get all jobs managed by the authenticated company (including SUPER HR and SUB HR)
router.get("/company-managed/all", authenticate, async (req: any, res) => {
  try {
    const userId = req.user.userId;

    // First, find the company profile associated with this user
    let companyId: number | null = null;
    const [companyProfiles]: any = await db.query("SELECT id FROM company_profiles WHERE user_id = ?", [userId]);
    if (companyProfiles.length > 0) {
      companyId = companyProfiles[0].id;
    } else {
      // Check if user is a SUB HR
      const [hrProfiles]: any = await db.query("SELECT company_id FROM company_hr_profiles WHERE user_id = ?", [userId]);
      if (hrProfiles.length > 0) {
        companyId = hrProfiles[0].company_id;
      } else {
        return res.status(403).json({ success: false, message: "Company profile not found for authenticated user" });
      }
    }

    await checkAndProcessJobExpirations();

    const jobsQuery = `
      SELECT J.*, C.company_name, C.logo_url,
             (SELECT COUNT(*) FROM job_stages JS WHERE JS.job_id = J.id) as stage_count
      FROM jobs J 
      JOIN company_profiles C ON J.company_id = C.id 
      WHERE J.company_id = ?
    `;
    const [jobs]: any = await db.query(jobsQuery, [companyId]);

    res.json({ success: true, data: jobs });
  } catch (error) {
    console.error("Error fetching company-managed jobs:", error);
    res.status(500).json({ success: false, message: "Error fetching jobs" });
  }
});

// Create job with stages
router.post("/", authenticate, async (req: any, res) => {
  const { 
    title, description, skills, location, jobType, 
    experienceLevel, educationRequirement, responsibilities, 
    qualifications, additionalNotes, startDate, deadline, stages,
    salaryRange, publishDestination
  } = req.body;

  try {
    // Auth safety: Resolve company ID directly from authenticated user
    const userId = req.user.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User is not authenticated." });
    }

    const [profiles]: any = await db.query("SELECT * FROM company_profiles WHERE user_id = ?", [userId]);
    if (!profiles[0]) {
      return res.status(404).json({ success: false, message: "Company profile not found for authenticated user." });
    }

    const companyId = profiles[0].id;
    const companyStatus = profiles[0].status;

    if (companyStatus !== 'APPROVED') {
      return res.status(403).json({ success: false, message: "Only approved companies can post job opportunities." });
    }

    // Input Validation
    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ success: false, message: "Job title is required." });
    }
    if (!description || typeof description !== "string" || !description.trim()) {
      return res.status(400).json({ success: false, message: "Job description is required." });
    }
    if (!location || typeof location !== "string" || !location.trim()) {
      return res.status(400).json({ success: false, message: "Job location is required." });
    }
    if (!deadline) {
      return res.status(400).json({ success: false, message: "Application end deadline is required." });
    }

    // Date validations
    const start = new Date(startDate || new Date().toISOString().split('T')[0]);
    const end = new Date(deadline);

    if (isNaN(start.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid application start date format." });
    }
    if (isNaN(end.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid application end deadline format." });
    }
    if (end < start) {
      return res.status(400).json({ success: false, message: "Application end deadline cannot be before start date." });
    }

    const publishDestinationValue = publishDestination === "JOB_AND_DROPS" ? "JOB_AND_DROPS" : "JOB_ONLY";

    const [result]: any = await db.query(`
      INSERT INTO jobs (
        company_id, title, description, skills_json, location, job_type,
        experience_level, salary_range, education_requirement, responsibilities,
        qualifications, additional_notes, application_start_date, deadline, publish_destination
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      companyId, title, description, JSON.stringify(skills || []), location, jobType || "Full-time",
      experienceLevel || "Entry Level", salaryRange || "", educationRequirement || "", responsibilities || "",
      qualifications || "", additionalNotes || "", startDate || new Date().toISOString().split('T')[0], deadline,
      publishDestinationValue
    ]);

    const jobId = result.insertId;

    // Transaction safety & Manual cleanup of partial jobs if any stage insert fails
    try {
      if (stages && Array.isArray(stages)) {
        for (let i = 0; i < stages.length; i++) {
          const [stageResult]: any = await db.query(`
            INSERT INTO job_stages (job_id, stage_name, stage_type, stage_order, description, config_json)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [
            jobId, 
            stages[i].name, 
            stages[i].type || 'APPLICATION',
            i + 1, 
            stages[i].description || "",
            JSON.stringify(stages[i].config || {})
          ]);

          const stageId = stageResult.insertId;

          // If stage is a test and has questions, insert them
          if (stages[i].type === 'TEST' && stages[i].questions) {
             for (const q of stages[i].questions) {
                await db.query(`
                  INSERT INTO test_questions (stage_id, question_text, options_json, correct_answer)
                  VALUES (?, ?, ?, ?)
                `, [stageId, q.text, JSON.stringify(q.options), q.correctAnswer]);
             }
          }
        }
      }

      // Automatically create a Drop if publishDestination is JOB_AND_DROPS
      if (publishDestinationValue === "JOB_AND_DROPS") {
        await db.query(`
          INSERT INTO drops (
            company_id, job_id, title, type, description, location, status
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          companyId,
          jobId,
          `New Role: ${title}`,
          'Job Promotion',
          description,
          location || null,
          'ACTIVE'
        ]);
      }
    } catch (stageError) {
      console.error("[JOB REQUISITION TRANSACTION FAILED] Reverting job id:", jobId, stageError);
      await db.query("DELETE FROM jobs WHERE id = ?", [jobId]);
      throw stageError;
    }

    res.json({ success: true, message: "Job opportunity published successfully", jobId });
  } catch (error: any) {
    console.error("Error posting job:", error);
    res.status(500).json({ success: false, message: error.message || "Internal server error occurred while posting job." });
  }
});

// Get current stage details for student
router.get("/application-status/:appId", async (req, res) => {
  try {
     const [apps]: any = await db.query(`
       SELECT JA.*, JS.stage_name, JS.stage_type, JS.config_json, JS.stage_order, JS.job_id
       FROM job_applications JA
       JOIN job_stages JS ON JA.current_stage_id = JS.id
       WHERE JA.id = ?
     `, [req.params.appId]);

     if (apps.length === 0) return res.status(404).json({ success: false, message: "Application not found" });
     const app = apps[0];

     let content: any = {};

     if (app.stage_type === 'TEST') {
        const [questions] = await db.query("SELECT id, question_text, options_json FROM test_questions WHERE stage_id = ?", [app.current_stage_id]);
        content.questions = questions;

        const testScheduleQuery = db.useMySQL ? `
          SELECT id, job_id, stage_id, DATE_FORMAT(scheduled_at, '%Y-%m-%d %H:%i:%s') as scheduled_at, duration_minutes, cutoff_score, status
          FROM test_schedules 
          WHERE job_id = ? AND stage_id = ?
        ` : `
          SELECT id, job_id, stage_id, scheduled_at, duration_minutes, cutoff_score, status
          FROM test_schedules 
          WHERE job_id = ? AND stage_id = ?
        `;
        const [schedules]: any = await db.query(testScheduleQuery, [app.job_id, app.current_stage_id]);
        content.schedule = schedules[0] || null;
     } else if (app.stage_type.startsWith('INTERVIEW')) {
        const interviewScheduleQuery = db.useMySQL ? `
          SELECT id, application_id, stage_id, interview_type, location_or_link, DATE_FORMAT(scheduled_at, '%Y-%m-%d %H:%i:%s') as scheduled_at, notes
          FROM interview_schedules 
          WHERE application_id = ? AND stage_id = ?
        ` : `
          SELECT id, application_id, stage_id, interview_type, location_or_link, scheduled_at, notes
          FROM interview_schedules 
          WHERE application_id = ? AND stage_id = ?
        `;
        const [schedules]: any = await db.query(interviewScheduleQuery, [app.id, app.current_stage_id]);
        content.schedule = schedules[0] || null;
     }

     res.json({ success: true, data: { ...app, content } });
  } catch (error) {
     res.status(500).json({ success: false, message: "Error fetching status" });
  }
});

// Bulk Actions for Applicants
router.post("/bulk-action", async (req, res) => {
  const { applicationIds, action, stageId, notes } = req.body;
  try {
    if (!applicationIds || !Array.isArray(applicationIds)) {
      return res.status(400).json({ success: false, message: "applicationIds must be an array" });
    }

    if (applicationIds.length > 0) {
      const [apps]: any = await db.query(`
        SELECT JA.id, J.title, J.status as job_status, J.deadline as job_deadline
        FROM job_applications JA
        JOIN jobs J ON JA.job_id = J.id
        WHERE JA.id IN (?)
      `, [applicationIds]);

      for (const app of apps) {
        const isJobClosed = app.job_status === 'CLOSED';
        let isDeadlinePassed = false;
        if (app.job_deadline) {
          const dl = new Date(app.job_deadline);
          dl.setHours(23, 59, 59, 999);
          if (dl < new Date()) {
            isDeadlinePassed = true;
          }
        }
        if (isJobClosed || isDeadlinePassed) {
          return res.status(400).json({ success: false, message: `The recruitment pipeline for "${app.title}" has ended. You cannot perform bulk updates on ended positions.` });
        }
      }
    }

    for (const appId of applicationIds) {
      let status = 'IN_PROGRESS';
      if (action === 'REJECTED') status = 'REJECTED';
      else if (action === 'SELECTED') status = 'SELECTED';

      await db.query(`
        UPDATE job_applications 
        SET current_stage_id = COALESCE(?, current_stage_id), status = ?
        WHERE id = ?
      `, [stageId || null, status, appId]);

      await db.query("INSERT INTO application_history (application_id, stage_id, action, notes) VALUES (?, ?, ?, ?)", [
        appId, stageId || null, action, notes || `Bulk action: ${action}`
      ]);

      // Notify student
      const [jobInfo]: any = await db.query(`
        SELECT J.title, JS.stage_name, SP.user_id
        FROM job_applications JA
        JOIN jobs J ON JA.job_id = J.id
        LEFT JOIN job_stages JS ON JA.current_stage_id = JS.id
        JOIN student_profiles SP ON JA.student_id = SP.id
        WHERE JA.id = ?
      `, [appId]);

      if (jobInfo.length > 0) {
        const info = jobInfo[0];
        let title = "Application Update";
        let message = `Your application for ${info.title} has an update.`;
        
        if (action === 'REJECTED') {
          title = "Application Status";
          message = `Your application for ${info.title} has been rejected.`;
        } else if (stageId) {
          message = `Your application for ${info.title} has been moved to ${info.stage_name || 'next stage'}.`;
        }

        await db.query("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)", [
          info.user_id, title, message, action === 'REJECTED' ? 'REJECT' : 'INFO'
        ]);
      }
    }

    res.json({ success: true, message: `Bulk action ${action} completed for ${applicationIds.length} applicants` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Bulk action failed" });
  }
});

// Schedule Bulk Test for Selected Candidates
router.post("/schedule-test-bulk", async (req, res) => {
  const { applicationIds, scheduledAt, durationMinutes, cutoffScore } = req.body;
  try {
    if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid application list" });
    }

    // Since we need a stageId to attach the test to, we find the first application's current stage and job
    const [appsInfo]: any = await db.query(`
       SELECT job_id, current_stage_id FROM job_applications WHERE id = ?
    `, [applicationIds[0]]);
    
    if (appsInfo.length === 0) {
       return res.status(404).json({ success: false, message: "Application not found" });
    }

    const { job_id: jobId, current_stage_id: stageId } = appsInfo[0];

    // Clear existing schedule for this stage to override
    await db.query("DELETE FROM test_schedules WHERE job_id = ? AND stage_id = ?", [jobId, stageId]);
    
    // Create new global test schedule for this stage
    const [result]: any = await db.query(`
      INSERT INTO test_schedules (job_id, stage_id, scheduled_at, duration_minutes, cutoff_score)
      VALUES (?, ?, ?, ?, ?)
    `, [jobId, stageId, scheduledAt, durationMinutes, cutoffScore]);
    
    const placeholders = applicationIds.map(() => '?').join(',');

    // Notify only selected users
    const [applicants]: any = await db.query(`
      SELECT SP.user_id, J.title 
      FROM job_applications JA
      JOIN student_profiles SP ON JA.student_id = SP.id
      JOIN jobs J ON JA.job_id = J.id
      WHERE JA.id IN (${placeholders})
    `, [...applicationIds]);

    for (const applicant of applicants) {
      await db.query("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)", [
        applicant.user_id, 
        "Test Scheduled", 
        `Action Required: Official technical assessment for ${applicant.title} scheduled on ${scheduledAt.replace('T', ' ')}.`, 
        "WARNING"
      ]);
    }
    
    // Auto-Move selected applicants to TESTING stage if they aren't there yet
    for (const appId of applicationIds) {
      await db.query("INSERT INTO application_history (application_id, stage_id, action, notes) VALUES (?, ?, ?, ?)", [
        appId, stageId, 'INFO', `Bulk Test Scheduled: ${durationMinutes} mins at ${scheduledAt.replace('T', ' ')}`
      ]);
    }

    res.json({ success: true, message: "Tests scheduled successfully for all selected applicants." });
  } catch (error) {
    console.error("Bulk schedule error:", error);
    res.status(500).json({ success: false, message: "Failed to schedule test" });
  }
});

// Schedule Automated Test
router.post("/schedule-test", async (req, res) => {
  const { jobId, stageId, scheduledAt, durationMinutes, cutoffScore } = req.body;
  try {
    // Delete existing schedule for this stage if any
    await db.query("DELETE FROM test_schedules WHERE job_id = ? AND stage_id = ?", [jobId, stageId]);
    
    const [result]: any = await db.query(`
      INSERT INTO test_schedules (job_id, stage_id, scheduled_at, duration_minutes, cutoff_score)
      VALUES (?, ?, ?, ?, ?)
    `, [jobId, stageId, scheduledAt, durationMinutes, cutoffScore]);

    // Notify ALL applicants in this stage
    const [applicants]: any = await db.query(`
      SELECT SP.user_id, J.title 
      FROM job_applications JA
      JOIN student_profiles SP ON JA.student_id = SP.id
      JOIN jobs J ON JA.job_id = J.id
      WHERE JA.job_id = ? AND JA.current_stage_id = ?
    `, [jobId, stageId]);

    for (const applicant of applicants) {
      await db.query("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)", [
        applicant.user_id, 
        "Test Scheduled", 
        `An automated test for ${applicant.title} has been scheduled for ${scheduledAt.replace('T', ' ')}.`, 
        "WARNING"
      ]);
    }

    res.json({ success: true, message: "Test scheduled successfully", scheduleId: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to schedule test" });
  }
});

// Get test schedule for job
router.get("/test-schedules/:jobId", async (req, res) => {
  try {
    const testSchedulesQuery = db.useMySQL ? `
      SELECT id, job_id, stage_id, DATE_FORMAT(scheduled_at, '%Y-%m-%d %H:%i:%s') as scheduled_at, duration_minutes, cutoff_score, status, created_at
      FROM test_schedules 
      WHERE job_id = ?
    ` : `
      SELECT id, job_id, stage_id, scheduled_at, duration_minutes, cutoff_score, status, created_at
      FROM test_schedules 
      WHERE job_id = ?
    `;
    const [schedules] = await db.query(testSchedulesQuery, [req.params.jobId]);
    res.json({ success: true, data: schedules });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching schedules" });
  }
});

// Get active/upcoming tests for student
router.get("/student/active-tests/:studentId", async (req, res) => {
  try {
    const activeTestsQuery = db.useMySQL ? `
      SELECT TS.id, TS.job_id, TS.stage_id, DATE_FORMAT(TS.scheduled_at, '%Y-%m-%d %H:%i:%s') as scheduled_at, 
             TS.duration_minutes, TS.cutoff_score, TS.status, J.title as job_title, JS.stage_name
      FROM test_schedules TS
      JOIN jobs J ON TS.job_id = J.id
      JOIN job_stages JS ON TS.stage_id = JS.id
      JOIN job_applications JA ON JA.job_id = J.id AND JA.current_stage_id = TS.stage_id
      WHERE JA.student_id = ? AND TS.status != 'COMPLETED'
    ` : `
      SELECT TS.id, TS.job_id, TS.stage_id, TS.scheduled_at, 
             TS.duration_minutes, TS.cutoff_score, TS.status, J.title as job_title, JS.stage_name
      FROM test_schedules TS
      JOIN jobs J ON TS.job_id = J.id
      JOIN job_stages JS ON TS.stage_id = JS.id
      JOIN job_applications JA ON JA.job_id = J.id AND JA.current_stage_id = TS.stage_id
      WHERE JA.student_id = ? AND TS.status != 'COMPLETED'
    `;
    const [tests] = await db.query(activeTestsQuery, [req.params.studentId]);
    res.json({ success: true, data: tests });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching active tests" });
  }
});

// Submit Test with Anti-cheating
router.post("/applications/submit-test", async (req, res) => {
  const { applicationId, stageId, answers, tabSwitches, violationCount, isAutoSubmitted } = req.body;
  try {
     const [questions]: any = await db.query("SELECT * FROM test_questions WHERE stage_id = ?", [stageId]);
     let correctCount = 0;
     
     questions.forEach((q: any) => {
        if (answers[q.id] === q.correct_answer) correctCount++;
     });

     const score = questions.length > 0 ? (correctCount / questions.length) * 100 : 0;
     
     // Get applicant info
     const [apps]: any = await db.query("SELECT * FROM job_applications WHERE id = ?", [applicationId]);
     if (apps.length === 0) throw new Error("Application not found");
     const app = apps[0];

     // Record submission
     await db.query(`
       INSERT INTO test_submissions (application_id, student_id, stage_id, answers_json, score, tab_switches, violation_count, is_auto_submitted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     `, [applicationId, app.student_id, stageId, JSON.stringify(answers), score, tabSwitches || 0, violationCount || 0, isAutoSubmitted ? 1 : 0]);

     // Auto progress logic
     const [schedules]: any = await db.query("SELECT cutoff_score FROM test_schedules WHERE job_id = ? AND stage_id = ?", [app.job_id, stageId]);
     const [jobStages]: any = await db.query("SELECT config_json FROM job_stages WHERE id = ?", [stageId]);
     const config = jobStages[0].config_json ? (typeof jobStages[0].config_json === 'string' ? JSON.parse(jobStages[0].config_json) : jobStages[0].config_json) : {};
     
     const passScore = schedules.length > 0 ? schedules[0].cutoff_score : (config.passScore || 60);

     if (score >= passScore && (violationCount || 0) < 5) {
        // Move to next stage
        const [nextStages]: any = await db.query(`
          SELECT id, stage_name FROM job_stages 
          WHERE job_id = (SELECT job_id FROM job_stages WHERE id = ?) 
          AND stage_order > (SELECT stage_order FROM job_stages WHERE id = ?)
          ORDER BY stage_order ASC LIMIT 1
        `, [stageId, stageId]);

        if (nextStages.length > 0) {
           await db.query("UPDATE job_applications SET current_stage_id = ? WHERE id = ?", [nextStages[0].id, applicationId]);
           await db.query("INSERT INTO application_history (application_id, stage_id, action, notes) VALUES (?, ?, ?, ?)", [
              applicationId, nextStages[0].id, 'MOVED', `Auto-passed test with score ${Math.round(score)}%`
           ]);
        } else {
           await db.query("UPDATE job_applications SET status = 'SELECTED' WHERE id = ?", [applicationId]);
        }
     } else {
        await db.query("UPDATE job_applications SET status = 'REJECTED' WHERE id = ?", [applicationId]);
        const reason = (violationCount || 0) >= 5 ? 'Cheating detected' : `Failed test with score ${Math.round(score)}%`;
        await db.query("INSERT INTO application_history (application_id, stage_id, action, notes) VALUES (?, ?, ?, ?)", [
           applicationId, stageId, 'REJECTED', reason
        ]);
     }

     res.json({ success: true, score, passed: score >= passScore && (violationCount || 0) < 5 });
  } catch (error) {
     console.error(error);
     res.status(500).json({ success: false, message: "Error submitting test" });
  }
});

// Schedule Interview
router.post("/applications/schedule-interview", authenticate, async (req: any, res) => {
  let { applicationId, stageId, interviewType, locationOrLink, scheduledAt, notes, attendees, schedulerHrName } = req.body;
  const appId = Number(applicationId);
  let stgId = Number(stageId);
  try {
     // Verify the application exists and get its job_id
     const [apps]: any = await db.query(`
       SELECT ja.job_id, ja.current_stage_id, j.title as job_title, j.company_id, cp.company_name, cp.contact_person, sp.full_name as candidate_name, sp.email as candidate_email, sp.user_id as user_id
       FROM job_applications ja
       JOIN jobs j ON ja.job_id = j.id
       JOIN company_profiles cp ON j.company_id = cp.id
       JOIN student_profiles sp ON ja.student_id = sp.id
       WHERE ja.id = ?
     `, [appId]);

     if (apps.length === 0) {
        return res.status(404).json({ success: false, message: "Application not found" });
     }
     const appData = apps[0];
     const jobId = appData.job_id;

     // In-person location validation
     if (interviewType === 'In-Person' || req.body.mode === 'Offline Interview' || locationOrLink === 'Offline Interview' || req.body.mode === 'In-Person Interview') {
        if (!req.body.location || req.body.location.trim() === '') {
           return res.status(400).json({ success: false, message: "Location is required for In-Person interviews." });
        }
        locationOrLink = req.body.location.trim();
     }

     // Ensure stageId is valid
     const [stages]: any = await db.query("SELECT id FROM job_stages WHERE id = ?", [stgId]);
     if (stages.length === 0) {
        // Find any existing stage for this job
        const [jobStages]: any = await db.query("SELECT id FROM job_stages WHERE job_id = ? ORDER BY stage_order ASC LIMIT 1", [jobId]);
        if (jobStages.length > 0) {
           stgId = Number(jobStages[0].id);
        } else {
           // Create a default stage
           const [newStage]: any = await db.query(
             "INSERT INTO job_stages (job_id, stage_name, stage_type, stage_order) VALUES (?, 'Interview', 'INTERVIEW', 1)",
             [jobId]
           );
           stgId = Number((newStage.insertId !== undefined) ? newStage.insertId : newStage[0]?.insertId);
           // Update application to this stage
           await db.query("UPDATE job_applications SET current_stage_id = ? WHERE id = ?", [stgId, appId]);
        }
     }

     let formattedScheduledAt = null;
     if (scheduledAt) {
        try {
           formattedScheduledAt = new Date(scheduledAt).toISOString().slice(0, 19).replace('T', ' ');
        } catch (e) {
           return res.status(400).json({ success: false, message: "Invalid scheduled date format" });
        }
     }

     const durationVal = req.body.duration ? Number(req.body.duration) : 30;
     const interviewerNameVal = req.body.interviewerName || "Staff Recruiter";
     const instructionsVal = req.body.instructions || notes || "Please join the room on time.";

     // Default scheduler HR name
     const finalSchedulerHrName = schedulerHrName || appData.contact_person || appData.company_name || "HR Team";

     const [existing]: any = await db.query("SELECT id FROM interview_schedules WHERE application_id = ? AND stage_id = ?", [appId, stgId]);
     
     let interviewId: number;
     if (existing.length > 0) {
        interviewId = existing[0].id;
        await db.query(`
          UPDATE interview_schedules 
          SET interview_type = ?, location_or_link = ?, scheduled_at = ?, notes = ?, duration = ?, interviewer_name = ?, instructions = ?, scheduler_hr_name = ?
          WHERE application_id = ? AND stage_id = ?
        `, [interviewType, locationOrLink, formattedScheduledAt, notes, durationVal, interviewerNameVal, instructionsVal, finalSchedulerHrName, appId, stgId]);
     } else {
        const [insertRes]: any = await db.query(`
          INSERT INTO interview_schedules (application_id, stage_id, interview_type, location_or_link, scheduled_at, notes, duration, interviewer_name, instructions, scheduler_hr_name)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [appId, stgId, interviewType, locationOrLink, formattedScheduledAt, notes, durationVal, interviewerNameVal, instructionsVal, finalSchedulerHrName]);
        interviewId = insertRes.insertId !== undefined ? insertRes.insertId : insertRes[0]?.insertId;
     }

     // Handle attendees
     if (attendees && Array.isArray(attendees)) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const seenEmails = new Set<string>();
        
        for (const att of attendees) {
           if (!att.email || !emailRegex.test(att.email.trim())) {
              return res.status(400).json({ success: false, message: `Invalid attendee email format: ${att.email}` });
           }
           const cleanEmail = att.email.trim().toLowerCase();
           if (seenEmails.has(cleanEmail)) {
              return res.status(400).json({ success: false, message: `Duplicate attendee email is not allowed: ${att.email}` });
           }
           seenEmails.add(cleanEmail);
        }

        // Clean up existing attendees for this interview first
        await db.query("DELETE FROM interview_attendees WHERE interview_id = ?", [interviewId]);

        // Insert new attendees
        for (const att of attendees) {
           await db.query(`
             INSERT INTO interview_attendees (interview_id, name, email, role)
             VALUES (?, ?, ?, ?)
           `, [interviewId, att.name || null, att.email.trim(), att.role || 'Panelist']);

           try {
              await sendInterviewInvitationToAttendee(
                 att.email.trim(),
                 att.name || 'Interviewer',
                 appData.candidate_name,
                 appData.job_title,
                 scheduledAt,
                 interviewType,
                 locationOrLink,
                 finalSchedulerHrName,
                 instructionsVal,
                 att.role || 'Panelist'
              );
           } catch (err) {
              console.error(`Error sending email to attendee ${att.email}:`, err);
           }
        }
     }

     // Automatically notify candidate
     try {
        const studentUserId = appData.user_id;
        const notificationMsg = `An interview of type: ${interviewType} has been scheduled for ${scheduledAt} with duration ${durationVal} mins. Interviewer: ${interviewerNameVal}. Instructions: ${instructionsVal}. Location/Link: ${locationOrLink}`;
        
        if (studentUserId) {
           await db.query("INSERT INTO notifications (user_id, title, message, is_read) VALUES (?, 'Interview Scheduled', ?, 0)", [studentUserId, notificationMsg]);
        }

        if (appData.candidate_email) {
          const candidateHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
              <h2 style="color: #4f46e5; text-align: center;">Your Interview is Scheduled!</h2>
              <p>Hello <strong>${appData.candidate_name}</strong>,</p>
              <p>We are pleased to inform you that your interview for <strong>${appData.job_title}</strong> has been scheduled.</p>
              
              <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
                <p style="margin: 5px 0;"><strong>Company:</strong> ${appData.company_name}</p>
                <p style="margin: 5px 0;"><strong>Round:</strong> ${interviewType}</p>
                <p style="margin: 5px 0;"><strong>Date & Time:</strong> ${scheduledAt}</p>
                <p style="margin: 5px 0;"><strong>Duration:</strong> ${durationVal} minutes</p>
                <p style="margin: 5px 0;"><strong>Location / link:</strong> ${locationOrLink}</p>
                <p style="margin: 5px 0;"><strong>Interviewer:</strong> ${interviewerNameVal}</p>
              </div>

              <p><strong>Instructions:</strong> ${instructionsVal}</p>

              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="font-size: 12px; color: #6b7280; text-align: center;">VEGA - Bridging Talent with Opportunity</p>
            </div>
          `;
          await sendEmail(appData.candidate_email, `Interview Scheduled: ${appData.job_title} - ${appData.company_name}`, candidateHtml);
        }
     } catch (e) {
        console.warn("Failed to notify student of scheduled interview:", e);
     }

     res.json({ success: true, message: "Interview scheduled" });
  } catch (error) {
     console.error("Schedule error:", error);
     res.status(500).json({ success: false, message: "Failed to schedule interview", error: (error as Error).message });
  }
});

// Apply to job
router.post("/apply", async (req, res) => {
  const { studentId, jobId } = req.body;
  console.log(`Apply request: studentId=${studentId}, jobId=${jobId}`);
  
  try {
    if (!studentId || !jobId) {
       return res.status(400).json({ success: false, message: "Missing required fields: Student ID and Job ID." });
    }

    // Check job exists and its status
    const [jobs]: any = await db.query("SELECT deadline, status, title FROM jobs WHERE id = ?", [jobId]);
    if (jobs.length === 0) return res.status(404).json({ success: false, message: "Job position not found." });
    
    if (jobs[0].status !== 'OPEN') {
      return res.status(400).json({ success: false, message: "This hiring process is currently closed." });
    }

    // Check job deadline
    if (jobs[0].deadline) {
      const deadline = new Date(jobs[0].deadline);
      deadline.setHours(23, 59, 59, 999);
      if (deadline < new Date()) {
        return res.status(400).json({ success: false, message: "The application deadline for this position has passed." });
      }
    }

    // Check student profile completeness and resume
    const [profiles]: any = await db.query("SELECT completeness_score, resume_url, user_id FROM student_profiles WHERE id = ?", [studentId]);
    if (profiles.length === 0) {
       return res.status(404).json({ success: false, message: "Student profile record not found." });
    }
    
    const profile = profiles[0];

    // Mandatory Psychometric Check
    const [psychResults]: any = await db.query("SELECT id FROM psychometric_results WHERE user_id = ?", [profile.user_id]);
    if (psychResults.length === 0) {
      return res.status(403).json({ 
        success: false, 
        message: "Mandatory Assessment Required: Please complete the Psychometric Assessment on your dashboard before applying to jobs." 
      });
    }

    if ((profile.completeness_score || 0) < 70) {
      return res.status(403).json({ 
        success: false, 
        message: `Profile incomplete (${profile.completeness_score || 0}%). You need at least 70% completeness to enable "Apply Now".` 
      });
    }

    if (!profile.resume_url) {
      return res.status(403).json({ 
        success: false, 
        message: "No resume found. Please upload a PDF resume in your profile before applying." 
      });
    }

    // Get initial stage
    const [stages]: any = await db.query("SELECT id FROM job_stages WHERE job_id = ? ORDER BY stage_order ASC LIMIT 1", [jobId]);
    const firstStageId = stages.length > 0 ? stages[0].id : null;

    // Create application
    const [appResult]: any = await db.query(
      "INSERT INTO job_applications (student_id, job_id, current_stage_id, status) VALUES (?, ?, ?, ?)", 
      [studentId, jobId, firstStageId, 'APPLIED']
    );
    
    const applicationId = appResult.insertId;

    // Record in history
    await db.query(
      "INSERT INTO application_history (application_id, stage_id, action, notes) VALUES (?, ?, ?, ?)", 
      [applicationId, firstStageId, 'APPLIED', 'Application submitted via VEGA portal']
    );

    // Notify student
    await db.query(
      "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)", 
      [profile.user_id, "Application Successful", `Your application for ${jobs[0].title} has been received.`, "INFO"]
    );

    res.json({ success: true, message: "Application submitted successfully", applicationId });
  } catch (error: any) {
    console.error("Apply error:", error);
    
    // Check for duplicate application
    const errorMsg = error.message || String(error);
    if (error.code === 'ER_DUP_ENTRY' || errorMsg.includes('UNIQUE') || error.code === 'SQLITE_CONSTRAINT') {
       return res.status(400).json({ success: false, message: "You have already applied for this position." });
    }
    
    res.status(500).json({ success: false, message: "A server error occurred while processing your application." });
  }
});

// Get full application timeline
router.get("/application/:appId/timeline", async (req, res) => {
  try {
    const [apps]: any = await db.query(`
      SELECT JA.*, J.id as job_id
      FROM job_applications JA
      JOIN jobs J ON JA.job_id = J.id
      WHERE JA.id = ?
    `, [req.params.appId]);

    if (apps.length === 0) return res.status(404).json({ success: false, message: "Application not found" });
    const app = apps[0];

    const [stages]: any = await db.query(`
      SELECT id, stage_name, stage_order, stage_type
      FROM job_stages
      WHERE job_id = ?
      ORDER BY stage_order ASC
    `, [app.job_id]);

    const [history]: any = await db.query(`
      SELECT stage_id, action, created_at, notes
      FROM application_history
      WHERE application_id = ?
      ORDER BY created_at ASC
    `, [req.params.appId]);

    res.json({ success: true, data: { application: app, stages, history } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching timeline" });
  }
});

// Get application history
router.get("/applications/history/:appId", async (req, res) => {
  try {
    const [history] = await db.query(`
      SELECT AH.*, JS.stage_name
      FROM application_history AH
      LEFT JOIN job_stages JS ON AH.stage_id = JS.id
      WHERE AH.application_id = ?
      ORDER BY AH.created_at DESC
    `, [req.params.appId]);
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching history" });
  }
});

// Update applicant stage
router.post("/update-stage", async (req, res) => {
  const { applicationId, stageId, action, notes, feedback, notifyCandidate } = req.body;
  try {
    // Verify application
    const [apps]: any = await db.query(`
      SELECT JA.*, J.status as job_status, J.deadline as job_deadline
      FROM job_applications JA
      JOIN jobs J ON JA.job_id = J.id
      WHERE JA.id = ?
    `, [applicationId]);
    if (apps.length === 0) return res.status(404).json({ success: false, message: "Application not found" });

    // Check if the pipeline/job has ended
    const isJobClosed = apps[0].job_status === 'CLOSED';
    let isDeadlinePassed = false;
    if (apps[0].job_deadline) {
      const dl = new Date(apps[0].job_deadline);
      dl.setHours(23, 59, 59, 999);
      if (dl < new Date()) {
        isDeadlinePassed = true;
      }
    }

    if (isJobClosed || isDeadlinePassed) {
      return res.status(400).json({ success: false, message: "This recruitment pipeline has ended. You cannot move candidates or perform stage updates on ended positions." });
    }
    
    let status = apps[0].status;
    if (action === 'REJECTED') {
      status = 'REJECTED';
    } else if (action === 'SELECTED') {
      status = 'SELECTED';
    } else {
      status = 'IN_PROGRESS';
    }

    await db.query(`
      UPDATE job_applications 
      SET current_stage_id = ?, status = ?
      WHERE id = ?
    `, [stageId, status, applicationId]);

    const historyNotes = feedback !== undefined && feedback !== null ? feedback : notes;

    await db.query("INSERT INTO application_history (application_id, stage_id, action, notes) VALUES (?, ?, ?, ?)", [
      applicationId, stageId, action, historyNotes
    ]);

    // Notify student
    const [jobInfo]: any = await db.query(`
      SELECT J.title, JS.stage_name, SP.user_id, SP.full_name, U.email, C.company_name, JA.job_id
      FROM job_applications JA
      JOIN jobs J ON JA.job_id = J.id
      LEFT JOIN company_profiles C ON J.company_id = C.id
      LEFT JOIN job_stages JS ON JA.current_stage_id = JS.id
      JOIN student_profiles SP ON JA.student_id = SP.id
      JOIN users U ON SP.user_id = U.id
      WHERE JA.id = ?
    `, [applicationId]);

    if (jobInfo.length > 0) {
      const info = jobInfo[0];
      const stageName = info.stage_name || "Assessment/Next Phase";
      let title = "Application Update";
      let message = `Your application for ${info.title} has been moved to ${stageName}.`;
      
      const hasFeedback = feedback && typeof feedback === 'string' && feedback.trim().length > 0;

      if (action === 'REJECTED') {
        title = "Application update: Not selected";
        if (hasFeedback) {
          message = `HR feedback for your ${info.title} application: "${feedback}"`;
        } else {
          message = `Your application for ${info.title} has been rejected.`;
        }
      } else if (status === 'SELECTED') {
        title = "You have been shortlisted";
        if (hasFeedback) {
          message = `HR feedback for your ${info.title} application: "${feedback}"`;
        } else {
          message = `Your application for ${info.title} has been moved to Selected.`;
        }
      }

      let notificationType = action === 'REJECTED' ? 'REJECT' : status === 'SELECTED' ? 'SUCCESS' : 'INFO';

      // Check if there is a scheduled test for this stage
      const [testScheds]: any = await db.query("SELECT id FROM test_schedules WHERE job_id = ? AND stage_id = ?", [info.job_id || 0, stageId]);
      if (testScheds.length > 0) {
        title = "Action Required: Test Scheduled";
        message = `Your application for "${info.title}" is now at stage "${stageName}". A test assessment is scheduled. Please go to Applied Jobs to complete it.`;
        notificationType = 'WARNING';
      }

      await db.query("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)", [
        info.user_id, title, message, notificationType
      ]);

      // Send email to student asynchronously
      if (info.email) {
        let emailSubject = `Application Update: Moved to ${stageName}`;
        let emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #2b6cb0; margin-bottom: 20px;">VEGA Application Update</h2>
            <p>Hello ${info.full_name || 'Student'},</p>
            <p>Your application for the position of <strong>${info.title}</strong> has been updated.</p>
            <p>Current Stage: <strong>${stageName}</strong></p>
            <p>Please log in to the VEGA student portal to check your updated status and see if there are any pending assessments or interview schedules.</p>
            <div style="margin: 30px 0; text-align: center;">
              <a href="${process.env.APP_URL || 'http://localhost:3000'}/login" style="background-color: #3182ce; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Go to Student Portal</a>
            </div>
            <p style="color: #718096; font-size: 12px; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
              This is an automated message from VEGA. Please do not reply to this email.
            </p>
          </div>
        `;

        const companyLabel = info.company_name || 'VEGA Partner';

        if (action === 'REJECTED') {
          emailSubject = `Application Status Update: ${info.title} at ${companyLabel}`;
          emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #e53e3e; margin-bottom: 20px;">VEGA Application Status Update</h2>
              <p>Hello ${info.full_name || 'Student'},</p>
              <p>We regret to inform you that your application for the position of <strong>${info.title}</strong> at <strong>${companyLabel}</strong> has been updated to <strong>REJECTED</strong>.</p>
              ${hasFeedback ? `
              <div style="background-color: #fffaf0; border-left: 4px solid #dd6b20; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <h4 style="margin: 0 0 10px 0; color: #dd6b20; font-size: 14px;">HR Feedback / Note:</h4>
                <p style="margin: 0; color: #4a5568; font-size: 14px; font-style: italic; white-space: pre-wrap;">"${feedback}"</p>
              </div>
              ` : ''}
              <p>Thank you for your interest in ${companyLabel} and for taking the time to apply and participate in our process. We wish you the best of luck in your job search.</p>
              <div style="margin: 30px 0; text-align: center;">
                <a href="${process.env.APP_URL || 'http://localhost:3000'}/login" style="background-color: #3182ce; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Go to Student Portal</a>
              </div>
              <p style="color: #718096; font-size: 12px; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
                This is an automated message from VEGA. Please do not reply to this email.
              </p>
            </div>
          `;
        } else if (status === 'SELECTED') {
          emailSubject = `Congratulations! Selected for ${info.title} at ${companyLabel}`;
          emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #38a169; margin-bottom: 20px;">Congratulations!</h2>
              <p>Hello ${info.full_name || 'Student'},</p>
              <p>We are thrilled to inform you that you have been <strong>SELECTED / SHORTLISTED</strong> for the position of <strong>${info.title}</strong> at <strong>${companyLabel}</strong>!</p>
              ${hasFeedback ? `
              <div style="background-color: #f0fff4; border-left: 4px solid #38a169; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <h4 style="margin: 0 0 10px 0; color: #276749; font-size: 14px;">HR Feedback / Note:</h4>
                <p style="margin: 0; color: #2f855a; font-size: 14px; font-style: italic; white-space: pre-wrap;">"${feedback}"</p>
              </div>
              ` : ''}
              <p>Our team will reach out to you shortly with details regarding onboarding, documentation, and the final steps. In the meantime, you can review your application history in the portal.</p>
              <div style="margin: 30px 0; text-align: center;">
                <a href="${process.env.APP_URL || 'http://localhost:3000'}/login" style="background-color: #38a169; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Go to Student Portal</a>
              </div>
              <p style="color: #718096; font-size: 12px; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
                This is an automated message from VEGA. Please do not reply to this email.
              </p>
            </div>
          `;
        }

        sendEmail(info.email, emailSubject, emailHtml).catch(err => {
          console.error("Async email sending failed:", err.message);
        });
      }
    }

    res.json({ success: true, message: "Stage updated" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to update stage" });
  }
});

// Get full student details for an application
router.get("/student-full-details/:studentId", async (req, res) => {
  const { studentId } = req.params;
  try {
    // Try to find by student_profile ID first, then by user_id
    const [profile]: any = await db.query(`
      SELECT sp.*, u.email, ts.overall_score as talent_score, ts.breakdown_json
      FROM student_profiles sp
      JOIN users u ON sp.user_id = u.id
      LEFT JOIN talent_scores ts ON u.id = ts.user_id
      WHERE sp.id = ? OR sp.user_id = ?
    `, [studentId, studentId]);

    if (profile.length === 0) return res.status(404).json({ success: false, message: "Student profile not found" });

    const actualStudentId = profile[0].id;

    const [mockInterviews]: any = await db.query(`
      SELECT * 
      FROM interview_history 
      WHERE student_id = ? 
      ORDER BY created_at DESC
    `, [actualStudentId]);

    const [education]: any = await db.query("SELECT * FROM student_education WHERE student_id = ? ORDER BY start_date DESC", [actualStudentId]);
    const [experience]: any = await db.query("SELECT * FROM student_experience WHERE student_id = ? ORDER BY start_date DESC", [actualStudentId]);
    const [projects]: any = await db.query("SELECT * FROM student_projects WHERE student_id = ? ORDER BY created_at DESC", [actualStudentId]);
    const [extracurriculars]: any = await db.query("SELECT * FROM extracurricular_activities WHERE user_id = ? ORDER BY activity_date DESC", [profile[0].user_id]);

    res.json({
      success: true,
      data: {
        profile: profile[0],
        mockInterviews,
        education,
        experience,
        projects,
        extracurriculars
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching student full details" });
  }
});

// Get applicants for a job (Kanban View Data)
router.get("/applicants/:jobId", async (req, res) => {
  try {
    await checkAndProcessJobExpirations();
    const [applicants]: any = await db.query(`
      SELECT 
        JA.id as application_id,
        JA.status,
        JA.applied_at,
        JA.current_stage_id,
        JA.job_id as job_id,
        SP.id as student_id,
        U.id as user_id,
        SP.full_name,
        U.email,
        SP.resume_url,
        SP.skills_json,
        SP.profile_photo_url,
        TS.overall_score as talent_score,
        PR.overall_score as psychometric_score,
        PR.traits_json as psychometric_traits,
        PR.personality_type as psychometric_personality,
        (SELECT score FROM test_submissions WHERE application_id = JA.id ORDER BY submitted_at DESC LIMIT 1) as latest_test_score,
        (SELECT violation_count FROM test_submissions WHERE application_id = JA.id ORDER BY submitted_at DESC LIMIT 1) as latest_test_violations,
        (SELECT is_auto_submitted FROM test_submissions WHERE application_id = JA.id ORDER BY submitted_at DESC LIMIT 1) as latest_test_auto_submitted,
        (SELECT answers_json FROM test_submissions WHERE application_id = JA.id ORDER BY submitted_at DESC LIMIT 1) as latest_test_answers,
        SPS.avg_interview_score
      FROM job_applications JA
      JOIN student_profiles SP ON JA.student_id = SP.id
      JOIN users U ON SP.user_id = U.id
      LEFT JOIN talent_scores TS ON U.id = TS.user_id
      LEFT JOIN psychometric_results PR ON U.id = PR.user_id
      LEFT JOIN student_performance_stats SPS ON U.id = SPS.user_id
      WHERE JA.job_id = ?
    `, [req.params.jobId]);

    const [stages] = await db.query("SELECT * FROM job_stages WHERE job_id = ? ORDER BY stage_order ASC", [req.params.jobId]);

    res.json({ success: true, data: { applicants, stages } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching applicants" });
  }
});

// Get student's applications
router.get("/student/:studentId", async (req, res) => {
  try {
    const [applications] = await db.query(`
      SELECT 
        JA.*, 
        J.title, J.deadline, J.job_type,
        CP.company_name, CP.logo_url,
        JS.stage_name as current_stage_name
      FROM job_applications JA
      JOIN jobs J ON JA.job_id = J.id
      JOIN company_profiles CP ON J.company_id = CP.id
      LEFT JOIN job_stages JS ON JA.current_stage_id = JS.id
      WHERE JA.student_id = ?
      ORDER BY JA.applied_at DESC
    `, [req.params.studentId]);
    res.json({ success: true, data: applications });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching applications" });
  }
});

// Get single job details including stages, applicant count, and assigned HRs
router.get("/:id", async (req, res) => {
  try {
    const [jobs]: any = await db.query(`
      SELECT J.*, C.company_name, C.logo_url,
             (SELECT COUNT(*) FROM job_applications JA WHERE JA.job_id = J.id) as total_applicants,
             (SELECT COUNT(*) FROM job_applications JA WHERE JA.job_id = J.id AND JA.status = 'SELECTED') as selected_count,
             (SELECT COUNT(*) FROM job_applications JA WHERE JA.job_id = J.id AND JA.status = 'REJECTED') as rejected_count
      FROM jobs J 
      JOIN company_profiles C ON J.company_id = C.id 
      WHERE J.id = ?
    `, [req.params.id]);
    
    if (jobs.length === 0) return res.status(404).json({ success: false, message: "Job not found" });

    const job = jobs[0];

    // Fetch stages
    const [stages] = await db.query("SELECT * FROM job_stages WHERE job_id = ? ORDER BY stage_order ASC", [req.params.id]);
    
    // Fetch assigned HRs
    const [assignedHrs]: any = await db.query(`
      SELECT cja.assigned_hr_user_id, u.email, chp.designation
      FROM company_job_assignments cja
      JOIN users u ON cja.assigned_hr_user_id = u.id
      JOIN company_hr_profiles chp ON u.id = chp.user_id
      WHERE cja.job_id = ?
    `, [req.params.id]);

    // Format skills_json if present
    let skills = [];
    if (job.skills_json) {
      try {
        skills = typeof job.skills_json === 'string' ? JSON.parse(job.skills_json) : job.skills_json;
      } catch (e) {
        skills = [];
      }
    }

    res.json({ 
      success: true, 
      data: { 
        ...job, 
        skills,
        stages: stages || [], 
        assigned_hrs: assignedHrs || [] 
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching job details" });
  }
});

// Update authenticated company's own job details (description, key responsibilities, and job expiry date)
router.patch("/:id", authenticate, async (req: any, res) => {
  const jobId = req.params.id;
  const { description, responsibilities, deadline } = req.body;

  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User is not authenticated." });
    }

    let companyId = null;
    let roleType = "SUPER_HR";
    let actorName = req.user.email || "Company User";

    // Support both Super HR and Sub HR
    const [hrProfiles]: any = await db.query("SELECT * FROM company_hr_profiles WHERE user_id = ?", [userId]);
    if (hrProfiles && hrProfiles.length > 0) {
      const hr = hrProfiles[0];
      roleType = "SUB_HR";
      companyId = hr.company_id;
      actorName = `${hr.designation || "Sub HR"} (${req.user.email})`;

      const permissions = JSON.parse(hr.permissions || "[]");
      if (!permissions.includes("Edit Jobs") && !permissions.includes("Create Jobs")) {
        return res.status(403).json({ success: false, message: "Forbidden: You do not have permission to edit jobs." });
      }

      // Verify job assignment if Sub HR has assignment scope
      const [assignments]: any = await db.query(
        "SELECT job_id FROM company_job_assignments WHERE company_id = ? AND assigned_hr_user_id = ?",
        [companyId, userId]
      );
      if (assignments.length > 0) {
        const assignedIds = assignments.map((a: any) => Number(a.job_id));
        if (!assignedIds.includes(Number(jobId))) {
          return res.status(403).json({ success: false, message: "Forbidden: You are not assigned to manage this job." });
        }
      }
    } else {
      const [profiles]: any = await db.query("SELECT * FROM company_profiles WHERE user_id = ?", [userId]);
      if (profiles && profiles.length > 0) {
        companyId = profiles[0].id;
        actorName = `Super HR (${req.user.email})`;
      }
    }

    if (!companyId) {
      return res.status(404).json({ success: false, message: "Company profile not found for authenticated user." });
    }

    // Check if job exists and belongs to this company
    const [jobs]: any = await db.query("SELECT * FROM jobs WHERE id = ? AND company_id = ?", [jobId, companyId]);
    if (!jobs[0]) {
      return res.status(404).json({ success: false, message: "Job post not found or you are not authorized to edit it." });
    }

    const job = jobs[0];

    // Helper to extract YYYY-MM-DD without timezone shifts
    const toDateString = (d: any): string | null => {
      if (!d) return null;
      if (typeof d === 'string') {
        const match = d.match(/^(\d{4}-\d{2}-\d{2})/);
        if (match) return match[1];
      }
      if (d instanceof Date && !isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
      const match = String(d).match(/^(\d{4}-\d{2}-\d{2})/);
      return match ? match[1] : null;
    };

    // Calculate today's date in local YYYY-MM-DD format
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const deadlineStr = toDateString(job.deadline);
    const isExpired = deadlineStr !== null && deadlineStr < todayStr;
    const isClosedOrEnded = job.status === "CLOSED" || job.ended_at !== null || isExpired;

    if (isClosedOrEnded) {
      return res.status(400).json({
        success: false,
        message: "Cannot edit job details: This job is closed, manually ended, or has already expired."
      });
    }

    // Input Validation
    if (!description || typeof description !== "string" || !description.trim()) {
      return res.status(400).json({ success: false, message: "Job description is required." });
    }
    if (!responsibilities || typeof responsibilities !== "string" || !responsibilities.trim()) {
      return res.status(400).json({ success: false, message: "Key responsibilities are required." });
    }

    if (description.trim().length < 10) {
      return res.status(400).json({ success: false, message: "Job description must be at least 10 characters long." });
    }
    if (responsibilities.trim().length < 10) {
      return res.status(400).json({ success: false, message: "Key responsibilities must be at least 10 characters long." });
    }

    // Expiry Date Validation
    let targetDeadline = deadlineStr || todayStr;
    if (deadline) {
      const parsedStr = toDateString(deadline);
      if (!parsedStr) {
        return res.status(400).json({ success: false, message: "Invalid job expiry date format." });
      }

      if (parsedStr < todayStr) {
        return res.status(400).json({ success: false, message: "Job expiry date cannot be in the past. Earliest allowed date is today." });
      }

      targetDeadline = parsedStr;
    }

    // Update ONLY description, responsibilities, and deadline. NEVER modify status, ended_at, or pipeline_ended_at.
    await db.query(
      "UPDATE jobs SET description = ?, responsibilities = ?, deadline = ? WHERE id = ? AND company_id = ?",
      [description.trim(), responsibilities.trim(), targetDeadline, jobId, companyId]
    );

    // If there is any linked Drop in the drops table, update the drop's description too!
    try {
      await db.query(
        "UPDATE drops SET description = ? WHERE job_id = ? AND company_id = ?",
        [description.trim(), jobId, companyId]
      );
    } catch (dropUpdateErr) {
      console.warn("Could not auto-update linked drop description:", dropUpdateErr);
    }

    // Record audit log entry in company_audit_logs
    try {
      await db.query(`
        INSERT INTO company_audit_logs (
          company_id, actor_user_id, actor_name, actor_role, action_type, module, description, target_type, target_id, metadata_json
        ) VALUES (?, ?, ?, ?, 'UPDATE_JOB', 'Jobs', ?, 'jobs', ?, ?)
      `, [
        companyId,
        userId,
        actorName,
        roleType,
        `Updated job details and expiry date for "${job.title}" (Expiry: ${targetDeadline}).`,
        Number(jobId),
        JSON.stringify({ description: description.trim(), responsibilities: responsibilities.trim(), deadline: targetDeadline })
      ]);
    } catch (auditErr) {
      console.error("Error inserting company audit log:", auditErr);
    }

    // Fetch and return the updated job
    const [updatedJobs]: any = await db.query("SELECT * FROM jobs WHERE id = ?", [jobId]);

    return res.json({ 
      success: true, 
      message: "Job details updated successfully.",
      data: updatedJobs[0] || null
    });
  } catch (error: any) {
    console.error("Error updating job details:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal server error." });
  }
});

// Get all drops for the authenticated company
router.get("/drops/all", authenticate, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User is not authenticated." });
    }

    const [profiles]: any = await db.query("SELECT * FROM company_profiles WHERE user_id = ?", [userId]);
    if (!profiles[0]) {
      return res.status(404).json({ success: false, message: "Company profile not found for authenticated user." });
    }

    const companyId = profiles[0].id;

    // Fetch drops created by this company
    const [drops]: any = await db.query(`
      SELECT D.*, J.title as job_title
      FROM drops D
      LEFT JOIN jobs J ON D.job_id = J.id
      WHERE D.company_id = ?
      ORDER BY D.created_at DESC
    `, [companyId]);

    return res.json({ success: true, data: drops });
  } catch (error) {
    console.error("Error fetching company drops:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// Create a new drop manually
router.post("/drops", authenticate, async (req: any, res) => {
  const { title, type, description, jobId, location, scheduledAt } = req.body;

  try {
    const userId = req.user.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User is not authenticated." });
    }

    const [profiles]: any = await db.query("SELECT * FROM company_profiles WHERE user_id = ?", [userId]);
    if (!profiles[0]) {
      return res.status(404).json({ success: false, message: "Company profile not found for authenticated user." });
    }

    const companyId = profiles[0].id;

    // Input Validation
    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ success: false, message: "Drop title is required." });
    }
    if (!type || typeof type !== "string" || !type.trim()) {
      return res.status(400).json({ success: false, message: "Drop type is required." });
    }
    if (!description || typeof description !== "string" || !description.trim()) {
      return res.status(400).json({ success: false, message: "Description is required." });
    }

    // Verify linked job is owned by this company
    let verifiedJobId = null;
    if (jobId && jobId !== "") {
      const [jobs]: any = await db.query("SELECT id FROM jobs WHERE id = ? AND company_id = ?", [jobId, companyId]);
      if (jobs.length > 0) {
        verifiedJobId = jobs[0].id;
      } else {
        return res.status(403).json({ success: false, message: "You can only link your own job posts." });
      }
    }

    const [result]: any = await db.query(`
      INSERT INTO drops (
        company_id, job_id, title, type, description, location, scheduled_at, status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
    `, [
      companyId,
      verifiedJobId,
      title.trim(),
      type.trim(),
      description.trim(),
      location ? location.trim() : null,
      scheduledAt || null
    ]);

    return res.json({ success: true, message: "Drop created successfully.", dropId: result.insertId });
  } catch (error) {
    console.error("Error creating drop:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
});

router.get("/company/applicants/:studentId/history", authenticate, async (req: any, res) => {
  try {
    const { studentId } = req.params;
    const userId = req.user?.userId;

    if (!studentId || isNaN(Number(studentId))) {
      return res.status(400).json({ success: false, message: "Invalid student ID." });
    }

    // 1. Get company profile of the logged-in user
    const [profiles]: any = await db.query("SELECT id FROM company_profiles WHERE user_id = ?", [userId]);
    if (profiles.length === 0) {
      return res.status(403).json({ success: false, message: "Access denied. Company profile not found." });
    }
    const companyId = profiles[0].id;

    // 2. Fetch all applications of this student to this specific company's jobs
    const [applications]: any = await db.query(`
      SELECT 
        ja.id as application_id,
        ja.status as application_status,
        ja.applied_at,
        j.title as job_title,
        j.location as job_location,
        js.stage_name as current_stage_name,
        js.stage_type as current_stage_type
      FROM job_applications ja
      JOIN jobs j ON ja.job_id = j.id
      LEFT JOIN job_stages js ON ja.current_stage_id = js.id
      WHERE ja.student_id = ? AND j.company_id = ?
      ORDER BY ja.applied_at DESC
    `, [studentId, companyId]);

    const sanitizeText = (text: string | null | undefined): string => {
      if (!text) return "";
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    // For each application, fetch its history and logs
    const historyPromises = applications.map(async (app: any) => {
      const [history]: any = await db.query(`
        SELECT 
          ah.id,
          ah.action,
          ah.notes,
          ah.created_at,
          js.stage_name,
          js.stage_type
        FROM application_history ah
        LEFT JOIN job_stages js ON ah.stage_id = js.id
        WHERE ah.application_id = ?
        ORDER BY ah.created_at DESC
      `, [app.application_id]);

      // Determine selected or rejected and which phase
      const rejectionEvent = history.find((h: any) => h.action === 'REJECTED');
      const selectionEvent = history.find((h: any) => h.action === 'SELECTED');

      // Feedback/notes - find the latest notes or aggregate them
      const rawNotes = history.find((h: any) => h.notes && h.notes.trim())?.notes || null;
      const latestNotes = rawNotes ? sanitizeText(rawNotes) : null;

      // Interview schedules summary if any
      const [interviews]: any = await db.query(`
        SELECT id, interview_type, scheduled_at, status, notes
        FROM interview_schedules
        WHERE application_id = ?
        ORDER BY scheduled_at DESC
      `, [app.application_id]);

      const sanitizedInterviews = await Promise.all((interviews || []).map(async (i: any) => {
        const [evalRows]: any = await db.query(`
          SELECT technical_knowledge, communication, confidence, leadership, problem_solving, cultural_fit, comments as feedback
          FROM interview_evaluations
          WHERE interview_id = ?
        `, [i.id]);

        let rating: number | null = null;
        let feedback: string | null = null;

        if (evalRows.length > 0) {
          const ev = evalRows[0];
          const scores = [ev.technical_knowledge, ev.communication, ev.confidence, ev.leadership, ev.problem_solving, ev.cultural_fit]
            .filter((s: any) => s !== null && s !== undefined && s > 0);
          if (scores.length > 0) {
            rating = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length);
          }
          feedback = ev.feedback || null;
        }

        return {
          id: i.id,
          interview_type: i.interview_type,
          scheduled_at: i.scheduled_at,
          status: i.status,
          notes: i.notes ? sanitizeText(i.notes) : null,
          rating,
          feedback: feedback ? sanitizeText(feedback) : null
        };
      }));

      // Assessment / Test submissions summary if any
      const [testSubmissions]: any = await db.query(`
        SELECT score, violation_count, is_auto_submitted, submitted_at
        FROM test_submissions
        WHERE application_id = ?
        ORDER BY submitted_at DESC
      `, [app.application_id]);

      const sanitizedHistory = (history || []).map((h: any) => ({
        ...h,
        notes: h.notes ? sanitizeText(h.notes) : null
      }));

      return {
        ...app,
        history: sanitizedHistory,
        rejectionEvent: rejectionEvent ? {
          phase: rejectionEvent.stage_name || rejectionEvent.stage_type || '—',
          notes: rejectionEvent.notes ? sanitizeText(rejectionEvent.notes) : '—',
          date: rejectionEvent.created_at
        } : null,
        selectionEvent: selectionEvent ? {
          phase: selectionEvent.stage_name || selectionEvent.stage_type || '—',
          notes: selectionEvent.notes ? sanitizeText(selectionEvent.notes) : '—',
          date: selectionEvent.created_at
        } : null,
        latestNotes,
        interviews: sanitizedInterviews,
        testSubmissions: testSubmissions || [],
        lastUpdated: history[0]?.created_at || app.applied_at
      };
    });

    const detailedHistory = await Promise.all(historyPromises);

    return res.json({
      success: true,
      data: detailedHistory
    });

  } catch (error) {
    console.error("Error fetching applicant history:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
});

export default router;

