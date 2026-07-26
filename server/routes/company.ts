import express from "express";
import db from "../db.ts";
import path from "path";
import fs from "fs";
import { authenticate } from "../middleware/auth.ts";
import { sendEmail } from "../services/emailService.ts";
import { GoogleGenAI } from "@google/genai";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const router = express.Router();

// Helper to calculate completeness
const calculateCompleteness = (profile: any, docs: any[]) => {
  let score = 0;
  
  // 1. Basic Identity (20%)
  if (profile.company_name) score += 5;
  if (profile.logo_url) score += 5;
  if (profile.website) score += 5;
  if (profile.company_email && profile.contact_number) score += 5;

  // 2. Business & Legal Details (30%)
  if (profile.business_name) score += 5;
  if (profile.gst_no) score += 10;
  if (profile.cin_no || profile.pan_no) score += 5;
  if (profile.address && profile.city) score += 10;

  // 3. Verification Documents (30%)
  const hasGst = docs.some(d => d.doc_type === 'GST Certificate');
  const hasReg = docs.some(d => d.doc_type === 'Business Registration Certificate');
  const hasPan = docs.some(d => d.doc_type === 'PAN Card');
  
  if (hasGst) score += 10;
  if (hasReg) score += 10;
  if (hasPan) score += 10;

  // 4. Company Narrative & Social (20%)
  if (profile.about && profile.about.length > 200) score += 10;
  else if (profile.about && profile.about.length > 50) score += 5;
  
  if (profile.linkedin_url || profile.github_url) score += 10;

  return Math.min(100, score);
};

// Company profile
router.get("/profile/:userId", async (req, res) => {
  try {
    const [profiles]: any = await db.query("SELECT * FROM company_profiles WHERE user_id = ?", [req.params.userId]);
    if (!profiles[0]) {
      return res.json({ success: true, data: null });
    }
    const [docs]: any = await db.query("SELECT * FROM company_documents WHERE company_id = ?", [profiles[0].id]);
    res.json({ success: true, data: { ...profiles[0], documents: docs } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching profile" });
  }
});

// Update Company Profile
router.put("/profile/:userId", async (req, res) => {
  const profile = req.body;
  const userId = req.params.userId;

  // Normalize fields first
  const contact_number = profile.contact_number ? String(profile.contact_number).replace(/\D/g, "").slice(0, 10) : "";
  const company_email = profile.company_email ? String(profile.company_email).trim() : "";
  const pan_no = profile.pan_no ? String(profile.pan_no).toUpperCase().trim() : "";
  const gst_no = profile.gst_no ? String(profile.gst_no).toUpperCase().trim() : "";
  const cin_no = profile.cin_no ? String(profile.cin_no).toUpperCase().trim() : "";

  // Company name validation
  if (!profile.company_name || !String(profile.company_name).trim()) {
    return res.status(400).json({ success: false, message: "Please enter a valid business name." });
  } else {
    const company_name = String(profile.company_name).trim();
    const allowedRegex = /^[a-zA-Z0-9\s.&'()-]+$/;
    const hasAlphanumeric = /[a-zA-Z0-9]/.test(company_name);
    if (!allowedRegex.test(company_name) || !hasAlphanumeric) {
      return res.status(400).json({ success: false, message: "Please enter a valid business name." });
    }
  }

  // Business Name validation (if filled)
  if (profile.business_name && String(profile.business_name).trim()) {
    const business_name = String(profile.business_name).trim();
    const allowedRegex = /^[a-zA-Z0-9\s.&'()-]+$/;
    const hasAlphanumeric = /[a-zA-Z0-9]/.test(business_name);
    if (!allowedRegex.test(business_name) || !hasAlphanumeric) {
      return res.status(400).json({ success: false, message: "Please enter a valid business name." });
    }
  }

  // Contact Validation
  if (profile.contact_number) {
    const cleanContact = String(profile.contact_number).replace(/\D/g, "");
    if (cleanContact.length !== 10) {
      return res.status(400).json({ success: false, message: "Mobile number must be exactly 10 digits." });
    }
  }

  // Email validation
  if (company_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(company_email)) {
    return res.status(400).json({ success: false, message: "Please enter a valid official email address." });
  }

  // Website validation
  if (profile.website) {
    const websiteUrl = String(profile.website).trim();
    const urlRegex = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/;
    if (!urlRegex.test(websiteUrl)) {
      return res.status(400).json({ success: false, message: "Please enter a valid website URL." });
    }
  }

  // Country based validations
  if (profile.country === "India") {
    if (pan_no && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan_no)) {
      return res.status(400).json({ success: false, message: "PAN must be in valid format, for example ABCDE1234F." });
    }
    if (gst_no && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gst_no)) {
      return res.status(400).json({ success: false, message: "GST number must be a valid 15-character GSTIN." });
    }
    if (cin_no && !/^[A-Z0-9]{21}$/.test(cin_no)) {
      return res.status(400).json({ success: false, message: "CIN must be a valid 21-character company identification number." });
    }
  }

  // City and State validations
  if (profile.city && String(profile.city).trim()) {
    const cityStr = String(profile.city).trim();
    if (!/^[a-zA-Z\s-]+$/.test(cityStr)) {
      return res.status(400).json({ success: false, message: "Please enter a valid city/state name." });
    }
  }
  if (profile.state && String(profile.state).trim()) {
    const stateStr = String(profile.state).trim();
    if (!/^[a-zA-Z\s-]+$/.test(stateStr)) {
      return res.status(400).json({ success: false, message: "Please enter a valid city/state name." });
    }
  }

  // Registration Date / Year established validation
  let year_established = profile.year_established ? parseInt(profile.year_established) : null;
  let registration_date = profile.registration_date ? String(profile.registration_date).trim() : null;

  if (registration_date) {
    const regDateObj = new Date(registration_date);
    if (isNaN(regDateObj.getTime())) {
      return res.status(400).json({ success: false, message: "Company registration date cannot be in the future." });
    }
    const todayStr = new Date().toISOString().split("T")[0];
    if (registration_date > todayStr) {
      return res.status(400).json({ success: false, message: "Company registration date cannot be in the future." });
    }
    year_established = regDateObj.getFullYear();
  } else if (year_established) {
    const currentYear = new Date().getFullYear();
    if (year_established < 1800 || year_established > currentYear) {
      return res.status(400).json({ success: false, message: "Please enter a valid Year Established." });
    }
    registration_date = `${year_established}-01-01`;
  }

  try {
    // Check if profile exists
    const [existing]: any = await db.query("SELECT id FROM company_profiles WHERE user_id = ?", [userId]);
    
    if (existing[0]) {
      await db.query(`
        UPDATE company_profiles 
        SET 
          company_name = ?, logo_url = ?, website = ?, company_email = ?, contact_number = ?,
          company_type = ?, industry = ?, company_size = ?, year_established = ?, registration_date = ?,
          business_name = ?, gst_no = ?, cin_no = ?, pan_no = ?,
          address = ?, operating_address = ?, country = ?, state = ?, city = ?,
          about = ?, services = ?, linkedin_url = ?, github_url = ?,
          entity_type = ?, registry_number = ?, tax_id = ?, state_of_formation = ?, licensing_authority = ?
        WHERE user_id = ?
      `, [
        profile.company_name, profile.logo_url, profile.website, company_email, contact_number,
        profile.company_type, profile.industry, profile.company_size, year_established, registration_date,
        profile.business_name, gst_no, cin_no, pan_no,
        profile.address, profile.operating_address, profile.country, profile.state, profile.city,
        profile.about, profile.services, profile.linkedin_url, profile.github_url,
        profile.entity_type, profile.registry_number, profile.tax_id, profile.state_of_formation, profile.licensing_authority,
        userId
      ]);
    } else {
      await db.query(`
        INSERT INTO company_profiles (
          user_id, company_name, logo_url, website, company_email, contact_number,
          company_type, industry, company_size, year_established, registration_date,
          business_name, gst_no, cin_no, pan_no,
          address, operating_address, country, state, city,
          about, services, linkedin_url, github_url,
          entity_type, registry_number, tax_id, state_of_formation, licensing_authority
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId, profile.company_name, profile.logo_url, profile.website, company_email, contact_number,
        profile.company_type, profile.industry, profile.company_size, year_established, registration_date,
        profile.business_name, gst_no, cin_no, pan_no,
        profile.address, profile.operating_address, profile.country, profile.state, profile.city,
        profile.about, profile.services, profile.linkedin_url, profile.github_url,
        profile.entity_type, profile.registry_number, profile.tax_id, profile.state_of_formation, profile.licensing_authority
      ]);
    }

    // Refresh score
    const [refProf]: any = await db.query("SELECT * FROM company_profiles WHERE user_id = ?", [userId]);
    const [refDocs]: any = await db.query("SELECT * FROM company_documents WHERE company_id = ?", [refProf[0].id]);
    const score = calculateCompleteness(refProf[0], refDocs);
    await db.query("UPDATE company_profiles SET completeness_score = ? WHERE user_id = ?", [score, userId]);

    res.json({ success: true, message: "Profile updated successfully", score });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Update failed" });
  }
});

// Document Upload
router.post("/profile/:userId/documents", async (req, res) => {
  const { doc_type, doc_url } = req.body;
  const userId = req.params.userId;

  try {
    const [profiles]: any = await db.query("SELECT id FROM company_profiles WHERE user_id = ?", [userId]);
    if (!profiles[0]) return res.status(404).json({ success: false, message: "Profile not found" });

    const companyId = profiles[0].id;

    // Check if document of this type already exists, if so delete/replace
    // For now, we allow multiple if needed, but let's replace for same type for cleaner UI
    await db.query("DELETE FROM company_documents WHERE company_id = ? AND doc_type = ?", [companyId, doc_type]);
    
    await db.query("INSERT INTO company_documents (company_id, doc_type, doc_url) VALUES (?, ?, ?)", [companyId, doc_type, doc_url]);

    // Recalculate score
    const [refProf]: any = await db.query("SELECT * FROM company_profiles WHERE user_id = ?", [userId]);
    const [refDocs]: any = await db.query("SELECT * FROM company_documents WHERE company_id = ?", [refProf[0].id]);
    const score = calculateCompleteness(refProf[0], refDocs);
    await db.query("UPDATE company_profiles SET completeness_score = ? WHERE user_id = ?", [score, userId]);

    res.json({ success: true, message: "Document uploaded successfully", score });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Document upload failed" });
  }
});

// Submit for Verification
router.post("/profile/:userId/submit", async (req, res) => {
  try {
    const [profiles]: any = await db.query("SELECT * FROM company_profiles WHERE user_id = ?", [req.params.userId]);
    if (!profiles[0]) return res.status(404).json({ success: false, message: "Profile not found" });

    const [docs]: any = await db.query("SELECT * FROM company_documents WHERE company_id = ?", [profiles[0].id]);
    const score = calculateCompleteness(profiles[0], docs);

    if (score < 80) {
      return res.status(400).json({ success: false, message: "Profile incompleteness. Must reach 80% with required documents." });
    }

    await db.query("UPDATE company_profiles SET status = 'PENDING', is_submitted = 1, completeness_score = ? WHERE user_id = ?", [score, req.params.userId]);
    res.json({ success: true, message: "Profile submitted for verification" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Submission failed" });
  }
});

// Test management for companies
router.post("/tests", async (req, res) => {
  const { jobId, stageId, questions } = req.body;
  try {
    // If stageId is provided, save in the stage-specific test tables
    if (stageId) {
      // 1. Delete old test questions for this stage
      await db.query("DELETE FROM test_questions WHERE stage_id = ?", [stageId]);
      
      // 2. Insert new questions into test_questions
      if (Array.isArray(questions)) {
        for (const q of questions) {
          const qText = q.questionText || q.text || q.question || "";
          const options = q.options || q.options_json || [];
          const correctAns = q.correctOption !== undefined ? (options[q.correctOption] || q.correct_answer) : (q.correctAnswer || q.correct_answer || "");
          await db.query(`
            INSERT INTO test_questions (stage_id, question_text, options_json, correct_answer)
            VALUES (?, ?, ?, ?)
          `, [stageId, qText, JSON.stringify(options), correctAns]);
        }
      }
      
      // 3. Insert or update the test schedules table so it becomes active for students
      const duration = (questions && questions[0]?.duration) || 30;
      await db.query("DELETE FROM test_schedules WHERE job_id = ? AND stage_id = ?", [jobId, stageId]);
      await db.query(`
        INSERT INTO test_schedules (job_id, stage_id, scheduled_at, duration_minutes, cutoff_score, status)
        VALUES (?, ?, ?, ?, ?, 'ACTIVE')
      `, [jobId, stageId, new Date().toISOString().slice(0, 19).replace('T', ' '), duration, 60]);

      // 4. Notify students currently in this stage!
      const [applicants]: any = await db.query(`
        SELECT SP.user_id, J.title, JS.stage_name
        FROM job_applications JA
        JOIN student_profiles SP ON JA.student_id = SP.id
        JOIN jobs J ON JA.job_id = J.id
        JOIN job_stages JS ON JA.current_stage_id = JS.id
        WHERE JA.job_id = ? AND JA.current_stage_id = ?
      `, [jobId, stageId]);

      for (const applicant of applicants) {
        await db.query("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)", [
          applicant.user_id, 
          "Action Required: Test Scheduled", 
          `An assessment test for "${applicant.title}" stage "${applicant.stage_name}" is now available. Please complete it in Applied Jobs.`, 
          "WARNING"
        ]);
      }
    }

    // Always keep tests legacy table in sync as a fallback
    await db.query(`
      INSERT INTO tests (job_id, questions_json) VALUES (?, ?) 
      ON DUPLICATE KEY UPDATE questions_json = VALUES(questions_json)
    `, [jobId, JSON.stringify(questions)]);

    res.json({ success: true, message: "Test created and assigned successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to create test" });
  }
});

router.get("/tests/:jobId", async (req, res) => {
  try {
    const jobId = req.params.jobId;
    console.log(`📡 Fetching tests for Job ID: ${jobId}`);

    const [questions]: any = await db.query(`
      SELECT TQ.*, JS.stage_name, JS.job_id
      FROM test_questions TQ
      JOIN job_stages JS ON TQ.stage_id = JS.id
      WHERE JS.job_id = ?
    `, [jobId]);
    
    if (questions.length > 0) {
       console.log(`✅ Found ${questions.length} stage-specific questions`);
       return res.json({ success: true, data: questions });
    }

    // Fallback to legacy tests table
    console.log(`🔍 No stage-specific questions, checking legacy tests table for job ${jobId}...`);
    const [legacyTests]: any = await db.query("SELECT * FROM tests WHERE job_id = ?", [jobId]);
    if (legacyTests.length > 0) {
       console.log(`✅ Found legacy test for job ${jobId}`);
       const qs = typeof legacyTests[0].questions_json === 'string' ? JSON.parse(legacyTests[0].questions_json) : legacyTests[0].questions_json;
       const mapped = qs.map((q: any, i: number) => ({
          id: `legacy-${i}`,
          question_text: q.text || q.question,
          options_json: q.options || q.options_json,
          correct_answer: q.correctAnswer || q.answer || q.correct_answer,
          stage_id: -1
       }));
       return res.json({ success: true, data: mapped });
    }

    console.log(`⚠️ No questions found at all for job ${jobId}`);
    res.json({ success: true, data: [] });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching test questions" });
  }
});

// GET /api/company/:userId/tests-history
router.get("/:userId/tests-history", async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get company profile ID
    const [profiles]: any = await db.query("SELECT id, company_name FROM company_profiles WHERE user_id = ?", [userId]);
    if (profiles.length === 0) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }
    const companyId = profiles[0].id;
    const companyName = profiles[0].company_name;

    // Get all jobs for this company
    const [jobs]: any = await db.query("SELECT id, title FROM jobs WHERE company_id = ?", [companyId]);
    if (jobs.length === 0) {
      return res.json({ success: true, data: [] });
    }
    
    const jobIds = jobs.map((j: any) => j.id);
    const jobMap = new Map(jobs.map((j: any) => [j.id, j.title]));
    
    // Now fetch legacy tests
    const placeholders = jobIds.map(() => "?").join(",");
    const [legacyTests]: any = await db.query(`
      SELECT * FROM tests WHERE job_id IN (${placeholders})
    `, [...jobIds]);

    const results: any[] = [];

    // For each legacy test, map to DBTestHistory
    for (const test of legacyTests) {
      const qs = typeof test.questions_json === "string" ? JSON.parse(test.questions_json) : (test.questions_json || []);
      const questionsCount = qs.length;
      
      // Let's get actual submission count and avg score from test_submissions or student_test_submissions
      const [submissions]: any = await db.query(`
        SELECT COUNT(*) as count, AVG(score) as avg_score
        FROM test_submissions
        WHERE job_id = ?
      `, [test.job_id]);

      const submissionsCount = submissions[0]?.count || 0;
      const avgScore = Math.round(submissions[0]?.avg_score || 0);

      // Get count of assigned/eligible candidates (e.g., candidates in test stage)
      const [assigned]: any = await db.query(`
        SELECT COUNT(*) as count FROM job_applications
        WHERE job_id = ? AND status = 'IN_PROGRESS'
      `, [test.job_id]);
      const assignedCount = assigned[0]?.count || 0;

      // Map questions to the frontend schema
      const mappedQuestions = qs.map((q: any, i: number) => ({
        id: q.id || `q-${test.id}-${i}`,
        type: q.type || 'MCQ',
        questionText: q.questionText || q.question || q.text || '',
        options: q.options || q.options_json || ['', '', '', ''],
        correctOption: q.correctOption !== undefined ? q.correctOption : (q.options?.indexOf(q.correctAnswer) !== -1 ? q.options?.indexOf(q.correctAnswer) : 0),
        points: q.points || 10,
        difficulty: q.difficulty || 'MEDIUM'
      }));

      // Find the stage name or stage id if any from test_schedules
      const [scheds]: any = await db.query(`
        SELECT stage_id FROM test_schedules WHERE job_id = ? LIMIT 1
      `, [test.job_id]);
      const stageId = scheds[0]?.stage_id || null;

      results.push({
        id: String(test.id),
        job_id: test.job_id,
        job_title: jobMap.get(test.job_id) || "Unknown Job",
        title: qs[0]?.testTitle || `${jobMap.get(test.job_id) || 'Job'} Assessment`,
        created_by: companyName,
        created_date: new Date().toISOString().split('T')[0],
        questions_count: questionsCount,
        duration: qs[0]?.duration || 30,
        status: 'Active',
        assigned_count: assignedCount,
        submissions_count: submissionsCount,
        average_score: avgScore,
        questions: mappedQuestions,
        instructions: qs[0]?.instructions || "Please answer all questions carefully.",
        stage_id: stageId
      });
    }

    res.json({ success: true, data: results });
  } catch (error) {
    console.error("Error in tests-history:", error);
    res.status(500).json({ success: false, message: "Failed to fetch tests history" });
  }
});

// PUT /api/company/tests/:id
router.put("/tests/:id", async (req, res) => {
  const testId = req.params.id;
  const { questions } = req.body;
  try {
    // Fetch current test to find its job_id
    const [currentTests]: any = await db.query("SELECT job_id FROM tests WHERE id = ?", [testId]);
    if (currentTests.length === 0) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }
    const jobId = currentTests[0].job_id;

    // Update legacy tests table
    await db.query(`
      UPDATE tests SET questions_json = ? WHERE id = ?
    `, [JSON.stringify(questions), testId]);

    // Also update any stage-specific test_questions and test_schedules if they exist
    const [scheds]: any = await db.query("SELECT stage_id FROM test_schedules WHERE job_id = ? LIMIT 1", [jobId]);
    if (scheds.length > 0) {
      const stageId = scheds[0].stage_id;
      // Delete old questions
      await db.query("DELETE FROM test_questions WHERE stage_id = ?", [stageId]);
      // Insert updated questions
      if (Array.isArray(questions)) {
        for (const q of questions) {
          const qText = q.questionText || q.text || q.question || "";
          const options = q.options || q.options_json || [];
          const correctAns = q.correctOption !== undefined ? (options[q.correctOption] || q.correct_answer) : (q.correctAnswer || q.correct_answer || "");
          await db.query(`
            INSERT INTO test_questions (stage_id, question_text, options_json, correct_answer)
            VALUES (?, ?, ?, ?)
          `, [stageId, qText, JSON.stringify(options), correctAns]);
        }
      }
    }

    res.json({ success: true, message: "Test updated successfully" });
  } catch (error) {
    console.error("Error in updating test:", error);
    res.status(500).json({ success: false, message: "Failed to update test" });
  }
});

// --- RECOMMENDATIONS ENDPOINTS (Vega AI / Talent AI) ---

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Generate concise, professional recommendation reason
async function generateRecommendationReason(
  jobTitle: string,
  jobDescription: string,
  candidateName: string,
  candidateSkills: string[],
  matchScore: number
): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    return `${candidateName} has a strong ${matchScore}% skill and profile overlap for the ${jobTitle} position.`;
  }
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are Vega AI, a senior talent acquisition agent.
      Write a highly concise, professional 1-2 sentence recommendation reason why candidate ${candidateName} matches the job ${jobTitle}.
      Match percentage: ${matchScore}%
      Candidate Skills: ${candidateSkills.join(", ")}
      Job Description: ${jobDescription.substring(0, 500)}...
      Output ONLY the concise 1-2 sentence recommendation reason, starting directly with the text. Do not add any greeting or preamble.`,
    });
    return response.text?.trim() || `${candidateName} is highly recommended for this role with a match score of ${matchScore}%.`;
  } catch (err) {
    console.error("Gemini recommendation reason generation failed:", err);
    return `${candidateName} has a strong ${matchScore}% skill and profile overlap for the ${jobTitle} position.`;
  }
}

// 1. GET /api/companies/recommendations/jobs
router.get("/recommendations/jobs", authenticate, async (req: any, res) => {
  try {
    const ctx = await getCompanyContext(req, "Recommendations View");

    let query = `
      SELECT J.*, 
             (SELECT COUNT(*) FROM job_stages JS WHERE JS.job_id = J.id) as stage_count,
             (SELECT COUNT(*) FROM job_applications JA WHERE JA.job_id = J.id) as total_applicants
      FROM jobs J
      WHERE J.company_id = ?
    `;
    const params: any[] = [ctx.companyId];

    if (ctx.isSubHr) {
      const [assignments]: any = await db.query(
        "SELECT job_id FROM company_job_assignments WHERE company_id = ? AND assigned_hr_user_id = ?",
        [ctx.companyId, ctx.userId]
      );
      if (assignments.length > 0) {
        const assignedJobIds = assignments.map((a: any) => a.job_id);
        query += ` AND J.id IN (${assignedJobIds.map(() => '?').join(',')})`;
        params.push(...assignedJobIds);
      }
    }

    query += ` ORDER BY J.created_at DESC`;

    const [jobs]: any = await db.query(query, params);

    res.json({ success: true, data: jobs });
  } catch (error: any) {
    console.error("Error fetching recommendation jobs:", error);
    res.status(500).json({ success: false, message: error.message || "Error fetching company jobs." });
  }
});

// 2. POST /api/companies/recommendations/:jobId/match
router.post("/recommendations/:jobId/match", authenticate, async (req: any, res) => {
  try {
    const { jobId } = req.params;
    const ctx = await getCompanyContext(req, "Recommendations View");
    
    const { minMatch = 10, maxMatch = 100, limit = 50, filters = {} } = req.body;

    // Verify job belongs to company
    const [jobs]: any = await db.query("SELECT * FROM jobs WHERE id = ? AND company_id = ?", [jobId, ctx.companyId]);
    if (!jobs[0]) {
      return res.status(404).json({ success: false, message: "Job not found or access denied." });
    }
    const job = jobs[0];

    if (ctx.isSubHr) {
      const [assignments]: any = await db.query(
        "SELECT id FROM company_job_assignments WHERE company_id = ? AND assigned_hr_user_id = ?",
        [ctx.companyId, ctx.userId]
      );
      if (assignments.length > 0) {
        const [isAssigned]: any = await db.query(
          "SELECT id FROM company_job_assignments WHERE job_id = ? AND assigned_hr_user_id = ?",
          [jobId, ctx.userId]
        );
        if (isAssigned.length === 0) {
          return res.status(403).json({ success: false, message: "Access denied: Job is not assigned to your HR account." });
        }
      }
    }

    // Get job skills
    let jobSkills: string[] = [];
    if (job.skills_json) {
      try {
        jobSkills = typeof job.skills_json === "string" ? JSON.parse(job.skills_json) : job.skills_json;
      } catch (e) {
        if (typeof job.skills_json === "string") {
          jobSkills = job.skills_json.split(",").map((s: string) => s.trim());
        }
      }
    }
    const reqSkills = jobSkills.map((s: string) => s.toLowerCase().trim()).filter(Boolean);

    // Get all students
    const [students]: any = await db.query(`
      SELECT 
        SP.*, 
        U.email, 
        CM.college_name,
        TS.overall_score as talent_score,
        SAR.pq_score, SAR.iq_score, SAR.eq_score, SAR.sq_score,
        JA.id as application_id,
        JA.status as application_status
      FROM student_profiles SP
      JOIN users U ON SP.user_id = U.id
      LEFT JOIN college_master CM ON SP.college_id = CM.id
      LEFT JOIN talent_scores TS ON SP.user_id = TS.user_id
      LEFT JOIN student_assessment_results SAR ON SP.user_id = SAR.user_id
      LEFT JOIN job_applications JA ON SP.id = JA.student_id AND JA.job_id = ?
    `, [jobId]);

    // Track previous notifications to prevent duplicates
    const [notifs]: any = await db.query(
      "SELECT student_user_id, notified_at FROM recommendation_notifications WHERE job_id = ?",
      [jobId]
    );
    const notifiedUserIds = new Set(notifs.map((n: any) => n.student_user_id));

    const candidates: any[] = [];

    for (const student of students) {
      // 1. Required skills match: 40%
      let studentSkills: string[] = [];
      if (student.skills_json) {
        try {
          studentSkills = typeof student.skills_json === "string" ? JSON.parse(student.skills_json) : student.skills_json;
        } catch (e) {
          if (typeof student.skills_json === "string") {
            studentSkills = student.skills_json.split(",").map((s: string) => s.trim());
          }
        }
      }
      const candSkills = studentSkills.map((s: string) => s.toLowerCase().trim()).filter(Boolean);

      let skillsScore = 0;
      const matchedSkills: string[] = [];
      const missingSkills: string[] = [];

      if (reqSkills.length > 0) {
        reqSkills.forEach((skill: string) => {
          const hasSkill = candSkills.some((cs: string) => cs.includes(skill) || skill.includes(cs));
          if (hasSkill) {
            matchedSkills.push(skill);
          } else {
            missingSkills.push(skill);
          }
        });
        skillsScore = (matchedSkills.length / reqSkills.length) * 40;
      } else {
        skillsScore = 40;
      }

      // 2. Resume/profile keyword match: 25%
      let studentText = [
        student.full_name,
        student.headline,
        student.bio,
        student.preferred_job_role,
        student.location,
        student.preferred_location
      ].filter(Boolean).join(" ").toLowerCase();

      if (student.projects_json) {
        try {
          const projects = typeof student.projects_json === 'string' ? JSON.parse(student.projects_json) : student.projects_json;
          if (Array.isArray(projects)) {
            projects.forEach((p: any) => {
              studentText += " " + (p.title || "") + " " + (p.description || "") + " " + (p.technologies_json ? JSON.stringify(p.technologies_json) : "");
            });
          }
        } catch(e) {}
      }
      if (student.experience_json) {
        try {
          const exp = typeof student.experience_json === 'string' ? JSON.parse(student.experience_json) : student.experience_json;
          if (Array.isArray(exp)) {
            exp.forEach((e: any) => {
              studentText += " " + (e.company_name || "") + " " + (e.role || "") + " " + (e.description || "");
            });
          }
        } catch(e) {}
      }

      const jobText = [
        job.title,
        job.description,
        job.responsibilities,
        job.qualifications,
        job.additional_notes
      ].filter(Boolean).join(" ").toLowerCase();

      const jobTokens = Array.from(new Set(jobText.split(/[^a-zA-Z0-9+#]+/).filter(token => token.length >= 3)));
      let keywordMatchCount = 0;
      let keywordScore = 0;

      if (jobTokens.length > 0) {
        jobTokens.forEach((token: string) => {
          if (studentText.includes(token)) {
            keywordMatchCount++;
          }
        });
        const keywordOverlapRatio = keywordMatchCount / Math.min(25, jobTokens.length);
        keywordScore = Math.min(25, keywordOverlapRatio * 25);
      } else {
        keywordScore = 25;
      }

      // 3. Role/title relevance: 15%
      let roleScore = 0;
      const jobTitleLower = (job.title || "").toLowerCase();
      const prefRoleLower = (student.preferred_job_role || "").toLowerCase();
      const headlineLower = (student.headline || "").toLowerCase();

      if (jobTitleLower && (prefRoleLower || headlineLower)) {
        const overlap1 = prefRoleLower ? (jobTitleLower.includes(prefRoleLower) || prefRoleLower.includes(jobTitleLower)) : false;
        const overlap2 = headlineLower ? (jobTitleLower.includes(headlineLower) || headlineLower.includes(jobTitleLower)) : false;

        if (overlap1 && overlap2) {
          roleScore = 15;
        } else if (overlap1 || overlap2) {
          roleScore = 12;
        } else {
          const titleWords = jobTitleLower.split(/\s+/).filter(w => w.length > 2);
          const studentRoleWords = (prefRoleLower + " " + headlineLower).split(/\s+/).filter(w => w.length > 2);
          const matches = titleWords.filter(w => studentRoleWords.includes(w));
          if (matches.length > 0) {
            roleScore = Math.min(15, 5 + matches.length * 3);
          } else {
            roleScore = 0;
          }
        }
      } else {
        roleScore = 5;
      }

      // 4. Experience/projects/certifications: 10%
      let expScore = 0;
      if (student.experience_json) {
        try {
          const exp = typeof student.experience_json === 'string' ? JSON.parse(student.experience_json) : student.experience_json;
          if (Array.isArray(exp) && exp.length > 0) expScore += 4;
        } catch(e) {}
      }
      if (student.projects_json) {
        try {
          const proj = typeof student.projects_json === 'string' ? JSON.parse(student.projects_json) : student.projects_json;
          if (Array.isArray(proj) && proj.length > 0) expScore += 4;
        } catch(e) {}
      }
      if (student.resume_url) {
        expScore += 2;
      }
      expScore = Math.min(10, expScore);

      // 5. Talent/assessment score: 10%
      let tScore = student.talent_score || 0;
      if (!tScore) {
        const scores = [student.pq_score, student.iq_score, student.eq_score, student.sq_score].filter(s => s !== null && s !== undefined);
        if (scores.length > 0) {
          tScore = scores.reduce((sum, val) => sum + val, 0) / scores.length;
        }
      }
      const talentScoreResult = Math.min(10, (tScore / 100) * 10);

      const matchScore = Math.round(skillsScore + keywordScore + roleScore + expScore + talentScoreResult);

      // Check match score ranges
      if (matchScore < minMatch || matchScore > maxMatch) {
        continue;
      }

      // Applied status
      let appliedStatus = "Not Applied";
      if (student.application_id) {
        if (student.application_status === 'IN_PROGRESS' || student.application_status === 'SELECTED') {
          appliedStatus = "Already in Pipeline";
        } else {
          appliedStatus = "Already Applied";
        }
      }

      // Resume check
      const resumeAvailable = !!(student.resume_url || student.resume_builder_json);

      // --- FILTERS ---
      // Skills Filter
      if (filters.skills && Array.isArray(filters.skills) && filters.skills.length > 0) {
        const querySkills = filters.skills.map((s: string) => s.toLowerCase().trim()).filter(Boolean);
        const hasMatchingSkill = querySkills.some((qs: string) => candSkills.some((cs: string) => cs.includes(qs)));
        if (!hasMatchingSkill) continue;
      }

      // Location Filter
      if (filters.location && typeof filters.location === 'string' && filters.location.trim().length > 0) {
        const filterLoc = filters.location.toLowerCase().trim();
        const candLoc = (student.location || "").toLowerCase() + " " + (student.preferred_location || "").toLowerCase();
        if (!candLoc.includes(filterLoc)) continue;
      }

      // College Filter
      if (filters.college && typeof filters.college === 'string' && filters.college.trim().length > 0) {
        const filterCol = filters.college.toLowerCase().trim();
        const candCol = (student.college_name || "").toLowerCase();
        if (!candCol.includes(filterCol)) continue;
      }

      // Resume Available Filter
      if (filters.resumeAvailable === true && !resumeAvailable) {
        continue;
      }

      // Not Applied Only Filter
      if (filters.notAppliedOnly === true && student.application_id) {
        continue;
      }

      candidates.push({
        studentId: student.id,
        userId: student.user_id,
        fullName: student.full_name || "Anonymous Candidate",
        email: student.email,
        profilePhotoUrl: student.profile_photo_url || "",
        college: student.college_name || "N/A",
        location: student.location || "N/A",
        matchScore: matchScore,
        matchedSkills: matchedSkills,
        missingSkills: missingSkills,
        resumeAvailable: resumeAvailable,
        profileCompleteness: student.completeness_score || 0,
        talentScore: student.talent_score || Math.round(tScore) || 0,
        alreadyApplied: !!student.application_id,
        appliedStatus: appliedStatus,
        alreadyNotified: notifiedUserIds.has(student.user_id),
        recommendationReason: "" // Filled next
      });
    }

    // Sort by match score desc
    candidates.sort((a, b) => b.matchScore - a.matchScore);

    // Limit candidates
    const slicedCandidates = candidates.slice(0, limit);

    // Generate recommendation reasons for top candidates
    for (const cand of slicedCandidates) {
      cand.recommendationReason = await generateRecommendationReason(
        job.title,
        job.description,
        cand.fullName,
        cand.matchedSkills,
        cand.matchScore
      );
    }

    res.json({
      success: true,
      data: {
        job: {
          id: job.id,
          title: job.title,
          location: job.location,
          job_type: job.job_type,
          skills_json: job.skills_json,
          status: job.status,
          created_at: job.created_at
        },
        candidates: slicedCandidates
      }
    });

  } catch (error: any) {
    console.error("Error matching candidates:", error);
    res.status(500).json({ success: false, message: error.message || "Error calculating candidate matches." });
  }
});

// 3. POST /api/companies/recommendations/:jobId/notify
router.post("/recommendations/:jobId/notify", authenticate, async (req: any, res) => {
  try {
    const { jobId } = req.params;
    const { candidateUserIds, message: customMessage, candidateDetails = {} } = req.body;
    const ctx = await getCompanyContext(req, "Send Recommendation Notifications");

    if (!Array.isArray(candidateUserIds) || candidateUserIds.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid candidate user IDs list." });
    }

    // Get company details
    const [profiles]: any = await db.query("SELECT * FROM company_profiles WHERE id = ?", [ctx.companyId]);
    if (!profiles[0]) {
      return res.status(404).json({ success: false, message: "Company profile not found." });
    }
    const company = profiles[0];

    // Verify job belongs to company
    const [jobs]: any = await db.query("SELECT * FROM jobs WHERE id = ? AND company_id = ?", [jobId, ctx.companyId]);
    if (!jobs[0]) {
      return res.status(404).json({ success: false, message: "Job not found or access denied." });
    }
    const job = jobs[0];

    for (const candUserId of candidateUserIds) {
      // Check for duplicate
      const [existingNotif]: any = await db.query(
        "SELECT id FROM recommendation_notifications WHERE job_id = ? AND student_user_id = ?",
        [jobId, candUserId]
      );
      if (existingNotif.length > 0) {
        continue;
      }

      // Fetch student details
      const [studentData]: any = await db.query(`
        SELECT SP.full_name, U.email 
        FROM student_profiles SP
        JOIN users U ON SP.user_id = U.id
        WHERE U.id = ?
      `, [candUserId]);

      if (studentData.length === 0) continue;
      const student = studentData[0];

      const details = candidateDetails[candUserId] || {};
      const matchScore = details.matchScore || 0;
      const matchedSkillsJson = details.matchedSkills ? JSON.stringify(details.matchedSkills) : null;
      const recommendationReason = details.recommendationReason || null;

      // Track notification
      await db.query(`
        INSERT INTO recommendation_notifications 
        (company_id, job_id, student_user_id, match_score, matched_skills_json, recommendation_reason, notification_status, notified_at, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'SENT', CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP)
      `, [ctx.companyId, jobId, candUserId, matchScore, matchedSkillsJson, recommendationReason, ctx.userId]);

      // Create platform notification
      const notificationTitle = `Company Interest: ${company.company_name} is interested in your profile`;
      const notificationBody = `${company.company_name} found your profile suitable for the role "${job.title}". You have a strong match for this position. Kindly review the job and apply through VEGA.`;

      await db.query(`
        INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
        VALUES (?, ?, ?, 'INFO', 0, CURRENT_TIMESTAMP)
      `, [candUserId, notificationTitle, notificationBody]);

      // Send Email
      const emailSubject = `Recruitment Interest: ${job.title} at ${company.company_name}`;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #4f46e5; margin-bottom: 20px;">Recruitment Interest Notification</h2>
          <p>Hello <strong>${student.full_name}</strong>,</p>
          <p>We are pleased to inform you that <strong>${company.company_name}</strong> is interested in your profile for the position of <strong>${job.title}</strong>!</p>
          
          <div style="background-color: #f7fafc; border-left: 4px solid #4f46e5; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #4a5568; font-size: 14px;">
              ${customMessage || `"${company.company_name} found your profile suitable for the role ${job.title}. You have a strong match for this position. Kindly review the job and apply through VEGA."`}
            </p>
          </div>

          <p>Please click the button below to view the job posting and submit your application if you are interested.</p>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${process.env.APP_URL || 'http://localhost:3000'}/jobs?search=${encodeURIComponent(job.title)}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Job Post & Apply</a>
          </div>

          <p style="color: #718096; font-size: 12px; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
            This is an automated message from VEGA. Please do not reply directly to this email.
          </p>
        </div>
      `;

      try {
        await sendEmail(student.email, emailSubject, emailHtml);
      } catch (err) {
        console.error("Error sending interest email:", err);
      }
    }

    await logCompanyAudit(
      ctx.companyId,
      ctx.userId,
      ctx.actorName,
      ctx.roleType,
      "NOTIFY_RECOMMENDED_CANDIDATES",
      "Hiring Copilot",
      `Notified ${candidateUserIds.length} candidate(s) for job "${job.title}".`,
      "jobs",
      Number(jobId),
      { candidateUserIds }
    );

    res.json({ success: true, message: `Interest notifications sent to ${candidateUserIds.length} candidate(s).` });
  } catch (error: any) {
    console.error("Error sending interest notifications:", error);
    res.status(500).json({ success: false, message: error.message || "Error sending interest notifications." });
  }
});

// 4. GET /api/companies/recommendations/notified
router.get("/recommendations/notified", authenticate, async (req: any, res) => {
  try {
    const ctx = await getCompanyContext(req, "Recommendations View");
    const { jobId, search } = req.query;

    let query = `
      SELECT 
        RN.id as notification_id,
        RN.company_id,
        RN.job_id,
        RN.student_user_id,
        RN.match_score,
        RN.matched_skills_json,
        RN.recommendation_reason,
        RN.notification_status,
        RN.notified_at,
        RN.created_by,
        J.title as job_title,
        J.location as job_location,
        SP.id as student_id,
        SP.full_name as student_name,
        SP.location as student_location,
        SP.skills_json as student_skills_json,
        CM.college_name,
        U_cand.email as student_email,
        U_notifier.email as notifier_email,
        CHP.designation as notifier_designation,
        CHP.role_type as notifier_role_type
      FROM recommendation_notifications RN
      JOIN jobs J ON RN.job_id = J.id
      JOIN users U_cand ON RN.student_user_id = U_cand.id
      LEFT JOIN student_profiles SP ON U_cand.id = SP.user_id
      LEFT JOIN college_master CM ON SP.college_id = CM.id
      LEFT JOIN users U_notifier ON RN.created_by = U_notifier.id
      LEFT JOIN company_hr_profiles CHP ON RN.created_by = CHP.user_id AND CHP.company_id = RN.company_id
      WHERE RN.company_id = ?
    `;
    const params: any[] = [ctx.companyId];

    if (jobId) {
      query += ` AND RN.job_id = ?`;
      params.push(jobId);
    }

    if (ctx.isSubHr) {
      const [assignments]: any = await db.query(
        "SELECT job_id FROM company_job_assignments WHERE company_id = ? AND assigned_hr_user_id = ?",
        [ctx.companyId, ctx.userId]
      );
      if (assignments.length > 0) {
        const assignedJobIds = assignments.map((a: any) => a.job_id);
        query += ` AND RN.job_id IN (${assignedJobIds.map(() => '?').join(',')})`;
        params.push(...assignedJobIds);
      }
    }

    if (search && String(search).trim()) {
      const searchTerm = `%${String(search).trim()}%`;
      query += ` AND (SP.full_name LIKE ? OR U_cand.email LIKE ? OR J.title LIKE ?)`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ` ORDER BY RN.notified_at DESC`;

    const [notifiedRows]: any = await db.query(query, params);

    const data = notifiedRows.map((row: any) => {
      let matchedSkills: string[] = [];
      if (row.matched_skills_json) {
        try {
          matchedSkills = typeof row.matched_skills_json === 'string' ? JSON.parse(row.matched_skills_json) : row.matched_skills_json;
        } catch(e) {}
      } else if (row.student_skills_json) {
        try {
          matchedSkills = typeof row.student_skills_json === 'string' ? JSON.parse(row.student_skills_json) : row.student_skills_json;
        } catch(e) {}
      }

      let notifierLabel = "System Admin";
      if (row.notifier_email) {
        if (row.notifier_designation) {
          notifierLabel = `${row.notifier_designation} (${row.notifier_email})`;
        } else if (row.notifier_role_type === "SUB_HR") {
          notifierLabel = `Sub HR (${row.notifier_email})`;
        } else {
          notifierLabel = `Super HR (${row.notifier_email})`;
        }
      } else if (row.created_by) {
        notifierLabel = `Recruiter (ID ${row.created_by})`;
      } else {
        notifierLabel = "Not recorded";
      }

      return {
        notificationId: row.notification_id,
        jobId: row.job_id,
        jobTitle: row.job_title || "Job Requirement",
        jobLocation: row.job_location || "Remote",
        studentId: row.student_id,
        studentUserId: row.student_user_id,
        studentName: row.student_name || "Anonymous Student",
        studentEmail: row.student_email || "N/A",
        studentLocation: row.student_location || "N/A",
        collegeName: row.college_name || "N/A",
        matchScore: row.match_score !== null && row.match_score !== undefined && row.match_score > 0 ? row.match_score : "Not recorded",
        matchedSkills,
        recommendationReason: row.recommendation_reason || "Not recorded",
        notifiedAt: row.notified_at,
        notificationStatus: row.notification_status || "Already Notified",
        notifiedBy: notifierLabel,
        notifierRole: row.notifier_role_type || (row.notifier_designation ? "SUB_HR" : "SUPER_HR")
      };
    });

    res.json({ success: true, data });
  } catch (error: any) {
    console.error("Error fetching notified recommendations:", error);
    res.status(500).json({ success: false, message: error.message || "Error fetching notified candidates." });
  }
});

async function getCompanyContext(req: any, requiredPermission?: string) {
  const userId = req.user?.userId;
  if (!userId) throw new Error("Unauthorized");

  // Check if they are a Sub HR
  const [hrProfiles]: any = await db.query(
    "SELECT * FROM company_hr_profiles WHERE user_id = ?",
    [userId]
  );
  if (hrProfiles && hrProfiles.length > 0) {
    const hr = hrProfiles[0];
    const permissions = JSON.parse(hr.permissions || "[]");
    if (requiredPermission && !permissions.includes(requiredPermission)) {
      throw new Error(`Forbidden: Missing ${requiredPermission} permission`);
    }
    // Fetch company profile for name & status
    const [companies]: any = await db.query("SELECT * FROM company_profiles WHERE id = ?", [hr.company_id]);
    const company = companies[0];
    return {
      isSubHr: true,
      roleType: "SUB_HR",
      companyId: hr.company_id,
      userId,
      permissions,
      designation: hr.designation,
      email: req.user.email,
      actorName: `${hr.designation || "Sub HR"} (${req.user.email})`,
      companyName: company?.company_name || "Partner Company",
      companyStatus: company?.status || "APPROVED"
    };
  }

  // Otherwise, check Super HR (main company user)
  const [profiles]: any = await db.query(
    "SELECT * FROM company_profiles WHERE user_id = ?",
    [userId]
  );
  if (profiles && profiles.length > 0) {
    const company = profiles[0];
    return {
      isSubHr: false,
      roleType: "SUPER_HR",
      companyId: company.id,
      userId,
      permissions: [
        "Dashboard View",
        "Jobs View",
        "Create Jobs",
        "Edit Jobs",
        "End Jobs",
        "Applicants View",
        "Pipeline View",
        "Pipeline Manage",
        "Candidate Select/Reject",
        "Candidate Notify",
        "Interview View",
        "Schedule Interviews",
        "Assessments View",
        "Create/Edit Tests",
        "Recommendations View",
        "Send Recommendation Notifications",
        "Drops View",
        "Create/Edit Drops",
        "Analytics View",
        "Company Profile View",
        "Audit Trail View Own",
        "Audit Trail View All",
        "HR Management"
      ],
      designation: "Super HR",
      email: req.user.email,
      actorName: `Super HR (${req.user.email})`,
      companyName: company.company_name,
      companyStatus: company.status
    };
  }
  throw new Error("Company profile not found");
}

async function logCompanyAudit(
  companyId: number,
  actorUserId: number,
  actorName: string,
  actorRole: string,
  actionType: string,
  module: string,
  description: string,
  targetType: string | null = null,
  targetId: number | null = null,
  metadata: any = null
) {
  try {
    await db.query(`
      INSERT INTO company_audit_logs (
        company_id, actor_user_id, actor_name, actor_role, action_type, module, description, target_type, target_id, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      companyId,
      actorUserId,
      actorName,
      actorRole,
      actionType,
      module,
      description,
      targetType,
      targetId,
      metadata ? JSON.stringify(metadata) : null
    ]);
  } catch (err) {
    console.error("Error logging company audit:", err);
  }
}

// Update Candidate Assignment
router.post("/candidates/assign", authenticate, async (req: any, res) => {
  try {
    const ctx = await getCompanyContext(req, "Pipeline Manage");
    const { applicationIds, hrUserId, assignmentType } = req.body;
    if (!Array.isArray(applicationIds) || !hrUserId) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }
    // For each application, insert or update assignment
    for (const appId of applicationIds) {
      // Find the job_id
      const [apps]: any = await db.query("SELECT job_id FROM job_applications WHERE id = ?", [appId]);
      if (apps.length > 0) {
        const jobId = apps[0].job_id;
        // Remove existing assignment first since UNIQUE(application_id)
        await db.query("DELETE FROM company_application_assignments WHERE application_id = ?", [appId]);
        await db.query(`
          INSERT INTO company_application_assignments (company_id, job_id, application_id, assigned_hr_user_id, assigned_by_user_id, assignment_type)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [ctx.companyId, jobId, appId, hrUserId, ctx.userId, assignmentType || "MANUAL"]);
      }
    }
    await logCompanyAudit(
      ctx.companyId,
      ctx.userId,
      ctx.actorName,
      ctx.roleType,
      "ASSIGN_CANDIDATE",
      "Applicants",
      `Assigned ${applicationIds.length} candidate(s) to HR user ID ${hrUserId}.`,
      "job_applications",
      null,
      { applicationIds, hrUserId, assignmentType }
    );
    res.json({ success: true, message: "Candidates assigned successfully" });
  } catch (error: any) {
    console.error("Error in /candidates/assign:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Auto Distribute Candidates
router.post("/candidates/auto-distribute", authenticate, async (req: any, res) => {
  try {
    const ctx = await getCompanyContext(req, "Pipeline Manage");
    const { applicationIds, hrUserIds } = req.body;
    if (!Array.isArray(applicationIds) || !Array.isArray(hrUserIds) || hrUserIds.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid application list or empty HR list" });
    }
    // Distribute candidate applicationIds evenly among hrUserIds
    for (let i = 0; i < applicationIds.length; i++) {
      const appId = applicationIds[i];
      const hrUserId = hrUserIds[i % hrUserIds.length];
      const [apps]: any = await db.query("SELECT job_id FROM job_applications WHERE id = ?", [appId]);
      if (apps.length > 0) {
        const jobId = apps[0].job_id;
        await db.query("DELETE FROM company_application_assignments WHERE application_id = ?", [appId]);
        await db.query(`
          INSERT INTO company_application_assignments (company_id, job_id, application_id, assigned_hr_user_id, assigned_by_user_id, assignment_type)
          VALUES (?, ?, ?, ?, ?, 'AUTO')
        `, [ctx.companyId, jobId, appId, hrUserId, ctx.userId]);
      }
    }
    await logCompanyAudit(
      ctx.companyId,
      ctx.userId,
      ctx.actorName,
      ctx.roleType,
      "AUTO_DISTRIBUTE_CANDIDATES",
      "Applicants",
      `Auto-distributed ${applicationIds.length} candidate(s) among ${hrUserIds.length} selected HRs.`,
      "job_applications",
      null,
      { applicationIds, hrUserIds }
    );
    res.json({ success: true, message: "Candidates distributed successfully" });
  } catch (error: any) {
    console.error("Error in /candidates/auto-distribute:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all Candidate Assignments
router.get("/candidates/assignments", authenticate, async (req: any, res) => {
  try {
    const ctx = await getCompanyContext(req);
    const [assignments]: any = await db.query(`
      SELECT caa.*, u.email as assigned_hr_email, chp.designation as assigned_hr_designation
      FROM company_application_assignments caa
      JOIN users u ON caa.assigned_hr_user_id = u.id
      JOIN company_hr_profiles chp ON u.id = chp.user_id
      WHERE caa.company_id = ?
    `, [ctx.companyId]);
    res.json({ success: true, data: assignments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Company Notifications (Dynamic + Physical)
router.get("/notifications", authenticate, async (req: any, res) => {
  try {
    const ctx = await getCompanyContext(req);
    const userId = ctx.userId;
    const companyId = ctx.companyId;

    // 1. Fetch user-specific notifications from physical table
    const [physicalRows]: any = await db.query(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 100
    `, [userId]);

    // 2. Fetch application assignments if any (for Sub HR scoping)
    const [assignments]: any = await db.query(`
      SELECT application_id FROM company_application_assignments
      WHERE company_id = ? AND assigned_hr_user_id = ?
    `, [companyId, userId]);

    const isSubHr = ctx.roleType === 'SUB_HR';
    const hasAssignments = assignments.length > 0;
    const assignedAppIds = assignments.map((a: any) => a.application_id);

    // 3. Helper to filter app-specific notifications based on Sub HR assignment scope
    const isAppInScope = (appId: number) => {
      if (!isSubHr) return true; // Super HR sees everything
      if (!hasAssignments) return true; // Sub HR sees everything if no assignment scope is active
      return assignedAppIds.includes(appId);
    };

    const dynamicNotifications: any[] = [];

    // A. Generate "New Application" notifications
    const [newApps]: any = await db.query(`
      SELECT ja.id as app_id, ja.applied_at as created_at, j.title as job_title, s.full_name as student_name
      FROM job_applications ja
      JOIN jobs j ON ja.job_id = j.id
      JOIN student_profiles s ON ja.student_id = s.id
      WHERE j.company_id = ?
      ORDER BY ja.applied_at DESC
      LIMIT 50
    `, [companyId]);

    for (const app of newApps) {
      if (isAppInScope(app.app_id)) {
        dynamicNotifications.push({
          id: `app-${app.app_id}`,
          title: "New Application",
          desc: `${app.student_name} applied for "${app.job_title}"`,
          time: app.created_at,
          type: "success"
        });
      }
    }

    // B. Generate "Pipeline Update" notifications
    const [historyRows]: any = await db.query(`
      SELECT ah.id as hist_id, ah.created_at, ah.action, ah.notes, j.title as job_title, s.full_name as student_name, ja.id as app_id, js.stage_name
      FROM application_history ah
      JOIN job_applications ja ON ah.application_id = ja.id
      JOIN jobs j ON ja.job_id = j.id
      JOIN student_profiles s ON ja.student_id = s.id
      LEFT JOIN job_stages js ON ah.stage_id = js.id
      WHERE j.company_id = ?
      ORDER BY ah.created_at DESC
      LIMIT 50
    `, [companyId]);

    for (const h of historyRows) {
      if (isAppInScope(h.app_id)) {
        const stage = h.stage_name || "Next Phase";
        dynamicNotifications.push({
          id: `hist-${h.hist_id}`,
          title: "Pipeline Update",
          desc: `${h.student_name} was moved to stage "${stage}" for "${h.job_title}" (${h.action})`,
          time: h.created_at,
          type: "info"
        });
      }
    }

    // C. Generate "Interview Scheduled" notifications
    const [interviews]: any = await db.query(`
      SELECT i.id as int_id, i.scheduled_at, i.status, i.interview_type, j.title as job_title, s.full_name as student_name, ja.id as app_id
      FROM interview_schedules i
      JOIN job_applications ja ON i.application_id = ja.id
      JOIN jobs j ON ja.job_id = j.id
      JOIN student_profiles s ON ja.student_id = s.id
      WHERE j.company_id = ?
      ORDER BY i.scheduled_at DESC
      LIMIT 50
    `, [companyId]);

    for (const iv of interviews) {
      if (isAppInScope(iv.app_id)) {
        dynamicNotifications.push({
          id: `interview-${iv.int_id}`,
          title: "Interview Scheduled",
          desc: `${iv.interview_type} Interview scheduled with ${iv.student_name} for "${iv.job_title}" on ${new Date(iv.scheduled_at).toLocaleDateString()}`,
          time: iv.scheduled_at,
          type: "warning"
        });
      }
    }

    // D. Generate "Deadline Alert" notifications
    let expiringJobs: any[] = [];
    if (db.useMySQL) {
      try {
        const [rows]: any = await db.query(`
          SELECT id, title, deadline as application_deadline, DATEDIFF(deadline, CURRENT_DATE()) as days_left
          FROM jobs
          WHERE company_id = ? AND deadline >= CURRENT_DATE() AND deadline <= DATE_ADD(CURRENT_DATE(), INTERVAL 7 DAY)
        `, [companyId]);
        expiringJobs = rows || [];
      } catch (err) {
        console.error("Error running MySQL deadline alerts query:", err);
      }
    } else {
      try {
        const [rows]: any = await db.query(`
          SELECT id, title, deadline as application_deadline,
                 CAST((julianday(deadline) - julianday('now')) AS INTEGER) as days_left
          FROM jobs
          WHERE company_id = ? AND deadline >= date('now') AND deadline <= date('now', '+7 days')
        `, [companyId]);
        expiringJobs = rows || [];
      } catch (err) {
        console.error("Error running SQLite deadline alerts query:", err);
      }
    }

    for (const j of expiringJobs) {
      dynamicNotifications.push({
        id: `deadline-${j.id}`,
        title: "Deadline Alert",
        desc: `Job post "${j.title}" expires in ${j.days_left} days!`,
        time: j.application_deadline,
        type: "warning"
      });
    }

    // E. Map physical notifications to expected format
    const formattedPhysical = physicalRows.map((p: any) => ({
      id: `p-${p.id}`,
      title: p.title,
      desc: p.message,
      time: p.created_at,
      type: p.type === 'SUCCESS' ? 'success' : p.type === 'WARNING' ? 'warning' : 'info',
      is_read: p.is_read
    }));

    // Combine all and sort by time DESC
    let allNotifications = [...formattedPhysical, ...dynamicNotifications];
    allNotifications.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    // Deduplicate notifications by description
    const seenDesc = new Set();
    allNotifications = allNotifications.filter(n => {
      const key = `${n.title}-${n.desc}`;
      if (seenDesc.has(key)) return false;
      seenDesc.add(key);
      return true;
    });

    // Limit to most recent 40
    allNotifications = allNotifications.slice(0, 40);

    const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
    allNotifications = allNotifications.map(n => ({
      ...n,
      is_read: n.is_read !== undefined ? n.is_read : (new Date(n.time).getTime() < twoDaysAgo ? 1 : 0)
    }));

    res.json({ success: true, data: allNotifications });
  } catch (error: any) {
    console.error("Error fetching company notifications:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mark all company notifications as read
router.post("/notifications/read-all", authenticate, async (req: any, res) => {
  try {
    const ctx = await getCompanyContext(req);
    await db.query("UPDATE notifications SET is_read = 1 WHERE user_id = ?", [ctx.userId]);
    res.json({ success: true, message: "All notifications marked as read" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all Sub HRs
router.get("/sub-hr", authenticate, async (req: any, res) => {
  try {
    const ctx = await getCompanyContext(req, "HR Management");
    if (ctx.isSubHr) {
      return res.status(403).json({ success: false, message: "Only Super HR can manage Sub HR accounts." });
    }
    const [hrList]: any = await db.query(`
      SELECT u.id, u.id AS user_id, u.email, u.status, u.created_at, h.designation, h.permissions, h.role_type
      FROM users u
      JOIN company_hr_profiles h ON u.id = h.user_id
      WHERE h.company_id = ?
      ORDER BY u.created_at DESC
    `, [ctx.companyId]);
    const enrichedList = hrList.map((hr: any) => ({
      ...hr,
      permissions: JSON.parse(hr.permissions || "[]")
    }));
    res.json({ success: true, data: enrichedList });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create a Sub HR
router.post("/sub-hr", authenticate, async (req: any, res) => {
  try {
    let ctx;
    try {
      ctx = await getCompanyContext(req);
    } catch (ctxErr: any) {
      const msg = ctxErr.message || "";
      if (msg.includes("profile not found")) {
        return res.status(403).json({ success: false, message: "Company profile mapping was not found for this account." });
      }
      if (msg.includes("Forbidden") || msg.includes("Unauthorized")) {
        return res.status(403).json({ success: false, message: msg });
      }
      return res.status(403).json({ success: false, message: "Access denied. Only Super HR can perform this action." });
    }
    if (ctx.isSubHr) {
      return res.status(403).json({ success: false, message: "Only Super HR can create Sub HR accounts." });
    }
    // Check company status
    if (ctx.companyStatus === 'REJECTED' || ctx.companyStatus === 'SUSPENDED' || ctx.companyStatus === 'FROZEN') {
      return res.status(403).json({ success: false, message: "Company account is not allowed to create HR users in its current verification status." });
    }

    // Normalize designation
    const designation = String(req.body.designation || req.body.role || "Recruiter").trim();
    // Normalize and validate email presence and format
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required." });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address." });
    }
    // Check unique email case-sensitively
    const [existing]: any = await db.query("SELECT id FROM users WHERE LOWER(email) = LOWER(?)", [email]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: "A user with this email already exists." });
    }
    // Password auto-generation or validation
    let rawPassword = String(req.body.password || "").trim();
    if (!rawPassword) {
      const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
      const bytes = crypto.randomBytes(12);
      rawPassword = "";
      for (let i = 0; i < 12; i++) {
        rawPassword += chars.charAt(bytes[i] % chars.length);
      }
    } else {
      if (rawPassword.length < 6) {
        return res.status(400).json({ success: false, message: "Password must be at least 6 characters long." });
      }
    }
    // Normalize and check permissions list validity
    let permissions = req.body.permissions;
    if (typeof permissions === "string") {
      try {
        permissions = JSON.parse(permissions);
      } catch {
        permissions = permissions.split(",").map((p: string) => p.trim()).filter(Boolean);
      }
    }
    let normalizedPermissions: string[] = [];
    if (Array.isArray(permissions)) {
      normalizedPermissions = permissions.filter(Boolean);
    } else if (permissions && typeof permissions === "object") {
      normalizedPermissions = Object.keys(permissions).filter(key => (permissions as any)[key]);
    }
    if (!normalizedPermissions.length) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one permission for the HR user."
      });
    }
    const hashedPassword = await bcrypt.hash(rawPassword, 12);
    // Create user
    const [userRes]: any = await db.query(`
      INSERT INTO users (email, password_hash, role, status, is_verified)
      VALUES (?, ?, 'COMPANY', 'ACTIVE', 1)
    `, [email, hashedPassword]);
    const newUserId = userRes.insertId !== undefined ? userRes.insertId : userRes[0]?.insertId;
    // Create HR profile
    await db.query(`
      INSERT INTO company_hr_profiles (user_id, company_id, designation, permissions, role_type)
      VALUES (?, ?, ?, ?, 'SUB_HR')
    `, [newUserId, ctx.companyId, designation, JSON.stringify(normalizedPermissions)]);
    await logCompanyAudit(
      ctx.companyId,
      ctx.userId,
      ctx.actorName,
      ctx.roleType,
      "CREATE_SUB_HR",
      "HR Management",
      `Created Sub HR account for ${email} with designation ${designation}.`,
      "users",
      newUserId,
      { email, designation, permissions: normalizedPermissions }
    );
    // Email credentials to the new Sub HR
    const loginUrl = `${process.env.APP_URL || 'http://localhost:3000'}/login`;
    const emailSubject = "Your VEGA Recruiter Credentials";
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #4f46e5; text-align: center;">Welcome to VEGA!</h2>
        <p>Hello,</p>
        <p>Your recruiter / Sub HR account has been created by your Super HR Administrator at <strong>${ctx.companyName}</strong>.</p>
        <p>You can now log in, view candidate applications, manage jobs, and participate in placement pipelines!</p>
                <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
          <p style="margin: 5px 0;"><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
          <p style="margin: 5px 0;"><strong>Company:</strong> ${ctx.companyName}</p>
          <p style="margin: 5px 0;"><strong>Username / Email:</strong> ${email}</p>
          <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <code style="background: #eee; padding: 2px 5px; border-radius: 4px;">${rawPassword}</code></p>
          <p style="margin: 5px 0;"><strong>Designation:</strong> ${designation}</p>
        </div>
        <p style="color: #dc2626; font-weight: bold;">Note: For security reasons, please change your password after logging in for the first time.</p>
                <div style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Login to Recruitment Portal</a>
        </div>
        <p>If you have any questions, please contact your Super HR administrator.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #6b7280; text-align: center;">VEGA - Your Guiding Star for Success</p>
      </div>
    `;
    let emailStatus = "SENT";
    try {
      await sendEmail(email, emailSubject, emailHtml);
    } catch (mailErr) {
      console.error("Error sending credentials email:", mailErr);
      emailStatus = "FAILED";
    }
    if (emailStatus === "FAILED") {
      return res.json({ 
         success: true,
         message: "Sub HR created successfully, but credential email could not be sent.",
         emailStatus: "FAILED",
        temporaryPassword: rawPassword
      });
    }
    res.json({ 
       success: true,
       message: "Sub HR created successfully. Credentials emailed.",
      emailStatus: "SENT"
    });
  } catch (error: any) {
    console.error("Error in POST /sub-hr:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update an existing Sub HR
router.put("/sub-hr/:id", authenticate, async (req: any, res) => {
  try {
    const ctx = await getCompanyContext(req, "HR Management");
    if (ctx.isSubHr) {
      return res.status(403).json({ success: false, message: "Only Super HR can manage Sub HR accounts." });
    }
    const targetUserId = req.params.id;
    const { email, password, designation, permissions, status } = req.body;
    // Verify target Sub HR belongs to this company
    const [hrProfiles]: any = await db.query(
      "SELECT * FROM company_hr_profiles WHERE user_id = ? AND company_id = ?",
      [targetUserId, ctx.companyId]
    );
    if (hrProfiles.length === 0) {
      return res.status(404).json({ success: false, message: "Sub HR profile not found or does not belong to your company." });
    }
    // Verify email doesn't collide
    if (email) {
      const [existing]: any = await db.query("SELECT * FROM users WHERE email = ? AND id != ?", [email, targetUserId]);
      if (existing.length > 0) {
        return res.status(400).json({ success: false, message: "Email is already in use by another user." });
      }
      await db.query("UPDATE users SET email = ? WHERE id = ?", [email, targetUserId]);
    }
    if (status) {
      await db.query("UPDATE users SET status = ? WHERE id = ?", [status, targetUserId]);
    }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 12);
      await db.query("UPDATE users SET password_hash = ? WHERE id = ?", [hashedPassword, targetUserId]);
    }
    await db.query(`
      UPDATE company_hr_profiles
      SET designation = ?, permissions = ?
      WHERE user_id = ?
    `, [designation || "Sub HR", JSON.stringify(permissions || []), targetUserId]);
    await logCompanyAudit(
      ctx.companyId,
      ctx.userId,
      ctx.actorName,
      ctx.roleType,
      "UPDATE_SUB_HR",
      "HR Management",
      `Updated Sub HR account details for user ID ${targetUserId}.`,
      "users",
      Number(targetUserId),
      { email, designation, permissions, status }
    );
    res.json({ success: true, message: "Sub HR account updated successfully." });
  } catch (error: any) {
    console.error("Error in PUT /sub-hr:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete a Sub HR
router.delete("/sub-hr/:id", authenticate, async (req: any, res) => {
  try {
    const ctx = await getCompanyContext(req, "HR Management");
    if (ctx.isSubHr) {
      return res.status(403).json({ success: false, message: "Only Super HR can manage Sub HR accounts." });
    }
    const targetUserId = req.params.id;
    // Verify target Sub HR belongs to this company
    const [hrProfiles]: any = await db.query(
      "SELECT * FROM company_hr_profiles WHERE user_id = ? AND company_id = ?",
      [targetUserId, ctx.companyId]
    );
    if (hrProfiles.length === 0) {
      return res.status(404).json({ success: false, message: "Sub HR profile not found or does not belong to your company." });
    }
    await db.query("DELETE FROM users WHERE id = ?", [targetUserId]);
    await logCompanyAudit(
      ctx.companyId,
      ctx.userId,
      ctx.actorName,
      ctx.roleType,
      "DELETE_SUB_HR",
      "HR Management",
      `Deleted Sub HR account for user ID ${targetUserId}.`,
      "users",
      Number(targetUserId)
    );
    res.json({ success: true, message: "Sub HR account deleted successfully." });
  } catch (error: any) {
    console.error("Error in DELETE /sub-hr:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Audit Trail
router.get("/audit-trail", authenticate, async (req: any, res) => {
  try {
    const ctx = await getCompanyContext(req);
    let query = `
      SELECT * FROM company_audit_logs 
      WHERE company_id = ?
    `;
    const params: any[] = [ctx.companyId];
    if (ctx.isSubHr && !ctx.permissions?.includes("Audit Trail View All")) {
      query += ` AND actor_user_id = ?`;
      params.push(ctx.userId);
    }
    query += ` ORDER BY created_at DESC`;
    const [logs]: any = await db.query(query, params);
    res.json({ success: true, data: logs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Job Assignments
router.get("/jobs/:jobId/assignments", authenticate, async (req: any, res) => {
  try {
    const ctx = await getCompanyContext(req);
    const [assigned]: any = await db.query(`
      SELECT cja.*, u.email, chp.designation
      FROM company_job_assignments cja
      JOIN users u ON cja.assigned_hr_user_id = u.id
      JOIN company_hr_profiles chp ON u.id = chp.user_id
      WHERE cja.job_id = ? AND cja.company_id = ?
    `, [req.params.jobId, ctx.companyId]);
    res.json({ success: true, data: assigned });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update Job Assignments
router.post("/jobs/assign", authenticate, async (req: any, res) => {
  try {
    const ctx = await getCompanyContext(req, "HR Management");
    if (ctx.isSubHr) {
      return res.status(403).json({ success: false, message: "Only Super HR can manage job assignments." });
    }
    const { jobId, hrUserIds } = req.body;
    if (!jobId || !Array.isArray(hrUserIds)) {
      return res.status(400).json({ success: false, message: "Missing required fields: jobId or hrUserIds list" });
    }
    // Clear existing assignments for this job
    await db.query("DELETE FROM company_job_assignments WHERE job_id = ? AND company_id = ?", [jobId, ctx.companyId]);
    // Insert new assignments
    for (const hrUserId of hrUserIds) {
      await db.query(`
        INSERT INTO company_job_assignments (company_id, job_id, assigned_hr_user_id, assigned_by_user_id)
        VALUES (?, ?, ?, ?)
      `, [ctx.companyId, jobId, hrUserId, ctx.userId]);
    }
    await logCompanyAudit(
      ctx.companyId,
      ctx.userId,
      ctx.actorName,
      ctx.roleType,
      "ASSIGN_JOB",
      "Jobs",
      `Assigned job ID ${jobId} to ${hrUserIds.length} HRs.`,
      "jobs",
      Number(jobId),
      { hrUserIds }
    );
    res.json({ success: true, message: "Job assignments updated successfully" });
  } catch (error: any) {
    console.error("Error in /jobs/assign:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /settings/preferences
router.get("/settings/preferences", authenticate, async (req: any, res) => {
  try {
    const ctx = await getCompanyContext(req);
    const [rows]: any = await db.query(
      "SELECT timezone, email_notification_settings_json FROM company_preferences WHERE company_id = ?",
      [ctx.companyId]
    );
    if (rows.length === 0) {
      return res.json({
        success: true,
        preferences: {
          timezone: "Asia/Kolkata",
          emailNotifications: {
            newApplications: true,
            candidateStageUpdates: true,
            interviewReminders: true,
            assessmentSubmissions: true,
            jobExpiryAlerts: true,
            weeklyHiringSummary: false
          }
        }
      });
    }
    const row = rows[0];
    let emailNotifications = {
      newApplications: true,
      candidateStageUpdates: true,
      interviewReminders: true,
      assessmentSubmissions: true,
      jobExpiryAlerts: true,
      weeklyHiringSummary: false
    };
    if (row.email_notification_settings_json) {
      try {
        emailNotifications = typeof row.email_notification_settings_json === "string"
          ? JSON.parse(row.email_notification_settings_json)
          : row.email_notification_settings_json;
      } catch (e) {
        console.error("Error parsing email preferences JSON:", e);
      }
    }
    res.json({
      success: true,
      preferences: {
        timezone: row.timezone || "Asia/Kolkata",
        emailNotifications
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /settings/preferences
router.put("/settings/preferences", authenticate, async (req: any, res) => {
  try {
    const ctx = await getCompanyContext(req);
    if (ctx.isSubHr && !ctx.permissions.includes("HR Management")) {
      return res.status(403).json({ success: false, message: "Only Super HR or Sub HRs with HR Management permission can change preferences." });
    }
    const { timezone, emailNotifications } = req.body;
    if (!timezone) {
      return res.status(400).json({ success: false, message: "Timezone is required." });
    }
    const settingsJson = JSON.stringify(emailNotifications || {});
    
    const [exists]: any = await db.query("SELECT id FROM company_preferences WHERE company_id = ?", [ctx.companyId]);
    if (exists.length > 0) {
      await db.query(
        "UPDATE company_preferences SET timezone = ?, email_notification_settings_json = ?, updated_at = CURRENT_TIMESTAMP WHERE company_id = ?",
        [timezone, settingsJson, ctx.companyId]
      );
    } else {
      await db.query(
        "INSERT INTO company_preferences (company_id, timezone, email_notification_settings_json) VALUES (?, ?, ?)",
        [ctx.companyId, timezone, settingsJson]
      );
    }

    await logCompanyAudit(
      ctx.companyId,
      ctx.userId,
      ctx.actorName,
      ctx.roleType,
      "UPDATE_PREFERENCES",
      "Settings",
      `Updated company settings preferences. Timezone: ${timezone}.`,
      "company_preferences",
      ctx.companyId,
      { timezone, emailNotifications }
    );

    res.json({ success: true, message: "Settings preferences updated successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /settings/password
router.put("/settings/password", authenticate, async (req: any, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: "All password fields are required." });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: "New passwords do not match." });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: "New password must be at least 8 characters long." });
    }

    const [users]: any = await db.query("SELECT password_hash FROM users WHERE id = ?", [userId]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: "User account not found." });
    }

    const userObj = users[0];
    const isMatch = await bcrypt.compare(currentPassword, userObj.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid current password." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await db.query("UPDATE users SET password_hash = ? WHERE id = ?", [hashedPassword, userId]);

    try {
      const ctx = await getCompanyContext(req);
      await logCompanyAudit(
        ctx.companyId,
        ctx.userId,
        ctx.actorName,
        ctx.roleType,
        "CHANGE_PASSWORD",
        "Security",
        `Changed account password.`,
        "users",
        userId
      );
    } catch (e) {
      // Ignore context errors (e.g. if profile doesn't exist yet)
    }

    res.json({ success: true, message: "Password updated successfully" });
  } catch (error: any) {
    console.error("Error in password change:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /settings/billing
router.get("/settings/billing", authenticate, async (req: any, res) => {
  try {
    const ctx = await getCompanyContext(req);
    
    // Active jobs count
    const [jobsCountResult]: any = await db.query(
      "SELECT COUNT(*) AS count FROM jobs WHERE company_id = ? AND status = 'OPEN'",
      [ctx.companyId]
    );
    const activeJobs = jobsCountResult[0]?.count || 0;

    // Sub HR count
    const [subHrCountResult]: any = await db.query(
      "SELECT COUNT(*) AS count FROM company_hr_profiles WHERE company_id = ?",
      [ctx.companyId]
    );
    const subHrCount = subHrCountResult[0]?.count || 0;

    // Applications count
    const [appCountResult]: any = await db.query(
      `SELECT COUNT(*) AS count 
       FROM job_applications ja
       JOIN jobs j ON ja.job_id = j.id
       WHERE j.company_id = ?`,
      [ctx.companyId]
    );
    const totalApplications = appCountResult[0]?.count || 0;

    res.json({
      success: true,
      billing: {
        planName: "Standard Free Tier",
        status: "NOT_CONFIGURED",
        billingMessage: "No payment method configured. This company is operating on the standard default tier.",
        activeJobs,
        subHrCount,
        totalApplications,
        seatLimit: 10,
        jobPostingLimit: "Unlimited"
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /pending-actions
router.get("/pending-actions", authenticate, async (req: any, res) => {
  try {
    const ctx = await getCompanyContext(req);
    const [rows]: any = await db.query(
      "SELECT * FROM company_pending_actions WHERE company_id = ? ORDER BY created_at DESC",
      [ctx.companyId]
    );
    res.json({ success: true, data: rows });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /pending-actions
router.post("/pending-actions", authenticate, async (req: any, res) => {
  try {
    const ctx = await getCompanyContext(req);
    const { title, priority, sourceType, entityType, entityId, description } = req.body;
    
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Task title is required." });
    }

    const [result]: any = await db.query(`
      INSERT INTO company_pending_actions (
        company_id, created_by_user_id, source_type, entity_type, entity_id, title, description, priority, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      ctx.companyId,
      ctx.userId,
      sourceType || "MANUAL",
      entityType || null,
      entityId || null,
      title.trim(),
      description || null,
      priority || "NORMAL",
      "PENDING"
    ]);

    const newId = result.insertId;
    const [inserted]: any = await db.query("SELECT * FROM company_pending_actions WHERE id = ?", [newId]);

    await logCompanyAudit(
      ctx.companyId,
      ctx.userId,
      ctx.actorName,
      ctx.roleType,
      "CREATE_PENDING_ACTION",
      "Dashboard",
      `Created manual pending action: ${title.trim()}`,
      "company_pending_actions",
      newId,
      { title, priority }
    );

    res.json({ success: true, data: inserted[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /pending-actions/:id
router.delete("/pending-actions/:id", authenticate, async (req: any, res) => {
  try {
    const ctx = await getCompanyContext(req);
    const actionId = req.params.id;

    // Verify ownership
    const [actionRows]: any = await db.query(
      "SELECT * FROM company_pending_actions WHERE id = ? AND company_id = ?",
      [actionId, ctx.companyId]
    );

    if (actionRows.length === 0) {
      return res.status(404).json({ success: false, message: "Pending action not found or access denied." });
    }

    await db.query("DELETE FROM company_pending_actions WHERE id = ?", [actionId]);

    await logCompanyAudit(
      ctx.companyId,
      ctx.userId,
      ctx.actorName,
      ctx.roleType,
      "DELETE_PENDING_ACTION",
      "Dashboard",
      `Deleted pending action ID ${actionId}: ${actionRows[0].title}`,
      "company_pending_actions",
      Number(actionId),
      {}
    );

    res.json({ success: true, message: "Pending action deleted successfully." });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /pending-actions/:id/toggle
router.patch("/pending-actions/:id/toggle", authenticate, async (req: any, res) => {
  try {
    const ctx = await getCompanyContext(req);
    const actionId = req.params.id;

    // Verify ownership
    const [actionRows]: any = await db.query(
      "SELECT * FROM company_pending_actions WHERE id = ? AND company_id = ?",
      [actionId, ctx.companyId]
    );

    if (actionRows.length === 0) {
      return res.status(404).json({ success: false, message: "Pending action not found or access denied." });
    }

    const currentStatus = actionRows[0].status;
    const newStatus = currentStatus === "COMPLETED" ? "PENDING" : "COMPLETED";
    const completedAt = newStatus === "COMPLETED" ? new Date() : null;

    await db.query(
      "UPDATE company_pending_actions SET status = ?, completed_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [newStatus, completedAt, actionId]
    );

    res.json({ success: true, message: `Status updated to ${newStatus}.` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /company/todos - Get personal todos
router.get("/todos", authenticate, async (req: any, res) => {
  try {
    const ctx = await getCompanyContext(req);
    const userId = ctx.userId;
    const companyId = ctx.companyId;

    const [rows]: any = await db.query(
      "SELECT * FROM company_todos WHERE company_id = ? AND created_by_user_id = ? ORDER BY due_date ASC, due_time ASC",
      [companyId, userId]
    );

    res.json({ success: true, data: rows });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /company/todos - Create personal todo
router.post("/todos", authenticate, async (req: any, res) => {
  try {
    const ctx = await getCompanyContext(req);
    const userId = ctx.userId;
    const companyId = ctx.companyId;

    const { title, description, dueDate, dueTime } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Task title is required." });
    }
    if (!dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      return res.status(400).json({ success: false, message: "Valid due date (YYYY-MM-DD) is required." });
    }

    const [result]: any = await db.query(
      "INSERT INTO company_todos (company_id, created_by_user_id, title, description, due_date, due_time, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [companyId, userId, title.trim(), description || null, dueDate, dueTime || null, "PENDING"]
    );

    const newId = result.insertId;
    const [inserted]: any = await db.query("SELECT * FROM company_todos WHERE id = ?", [newId]);

    res.json({ success: true, data: inserted[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /company/todos/:id/toggle - Toggle todo status
router.patch("/todos/:id/toggle", authenticate, async (req: any, res) => {
  try {
    const ctx = await getCompanyContext(req);
    const userId = ctx.userId;
    const companyId = ctx.companyId;
    const todoId = req.params.id;

    // Verify ownership
    const [rows]: any = await db.query(
      "SELECT * FROM company_todos WHERE id = ? AND company_id = ? AND created_by_user_id = ?",
      [todoId, companyId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Todo not found or access denied." });
    }

    const newStatus = rows[0].status === "COMPLETED" ? "PENDING" : "COMPLETED";

    await db.query(
      "UPDATE company_todos SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [newStatus, todoId]
    );

    res.json({ success: true, message: `Status updated to ${newStatus}.` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /company/todos/:id - Delete todo
router.delete("/todos/:id", authenticate, async (req: any, res) => {
  try {
    const ctx = await getCompanyContext(req);
    const userId = ctx.userId;
    const companyId = ctx.companyId;
    const todoId = req.params.id;

    // Verify ownership
    const [rows]: any = await db.query(
      "SELECT * FROM company_todos WHERE id = ? AND company_id = ? AND created_by_user_id = ?",
      [todoId, companyId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Todo not found or access denied." });
    }

    await db.query("DELETE FROM company_todos WHERE id = ?", [todoId]);

    res.json({ success: true, message: "Todo deleted successfully." });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
