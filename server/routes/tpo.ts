import express from "express";
import db from "../db.ts";
import { authenticate, authorize } from "../middleware/auth.ts";
import { GoogleGenAI } from "@google/genai";

const router = express.Router();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Apply TPO protection to all routes
router.use(authenticate, authorize(['TPO']));

// Helper to get TPO Profile and Assigned College IDs
async function getTPOContext(userId: number) {
  const [tpoProfiles]: any = await db.query("SELECT id FROM tpo_profiles WHERE user_id = ?", [userId]);
  if (tpoProfiles.length === 0) return null;
  const tpoId = tpoProfiles[0].id;

  // 1. Get colleges mapped in tpo_colleges
  const [colleges]: any = await db.query("SELECT college_id FROM tpo_colleges WHERE tpo_id = ?", [tpoId]);
  const collegeIdsSet = new Set<number>(colleges.map((c: any) => Number(c.college_id)));

  // 2. Get colleges from batches assigned to this TPO
  const [batchColleges]: any = await db.query("SELECT DISTINCT college_id FROM batches WHERE assigned_tpo_id = ?", [tpoId]);
  batchColleges.forEach((b: any) => collegeIdsSet.add(Number(b.college_id)));

  const collegeIds = Array.from(collegeIdsSet);

  return { tpoId, collegeIds };
}

// Dashboard Stats
router.get("/dashboard-stats", async (req: any, res) => {
  try {
    const context = await getTPOContext(req.user.userId);
    if (!context || context.collegeIds.length === 0) {
      return res.json({ 
        success: true, 
        data: { 
          metrics: {
            totalStudents: 0,
            activeStudents: 0,
            placedStudents: 0,
            placementRate: 0,
            avgTalentScore: 0,
            atRiskStudents: 0
          }, 
          collegeAnalytics: [] 
        } 
      });
    }

    const { collegeIds } = context;
    const placeholders = collegeIds.map(() => '?').join(',');

    // 1. Core Metrics
    const [studentStats]: any = await db.query(`
      SELECT COUNT(*) as totalStudents,
             SUM(CASE WHEN sp.completeness_score >= 80 THEN 1 ELSE 0 END) as activeStudents
      FROM student_profiles sp
      LEFT JOIN student_batch sb ON sp.id = sb.student_id
      LEFT JOIN batches b ON COALESCE(sp.batch_id, sb.batch_id) = b.id
      WHERE COALESCE(sp.college_id, b.college_id) IN (${placeholders})
    `, [...collegeIds]);

    const [placementStats]: any = await db.query(`
      SELECT COUNT(*) as placedStudents
      FROM event_registrations er
      JOIN student_profiles sp ON er.student_id = sp.id
      LEFT JOIN student_batch sb ON sp.id = sb.student_id
      LEFT JOIN batches b ON COALESCE(sp.batch_id, sb.batch_id) = b.id
      WHERE COALESCE(sp.college_id, b.college_id) IN (${placeholders}) AND er.status = 'SELECTED'
    `, [...collegeIds]);

    const [talentStats]: any = await db.query(`
      SELECT AVG(overall_score) as avgTalentScore,
             SUM(CASE WHEN overall_score < 40 THEN 1 ELSE 0 END) as atRiskStudents
      FROM talent_scores ts
      JOIN student_profiles sp ON ts.user_id = sp.user_id
      LEFT JOIN student_batch sb ON sp.id = sb.student_id
      LEFT JOIN batches b ON COALESCE(sp.batch_id, sb.batch_id) = b.id
      WHERE COALESCE(sp.college_id, b.college_id) IN (${placeholders})
    `, [...collegeIds]);

    // 2. College-wise Analytics
    const [collegeAnalytics]: any = await db.query(`
      SELECT cm.college_name, ca.*
      FROM college_analytics ca
      JOIN college_master cm ON ca.college_id = cm.id
      WHERE ca.college_id IN (${placeholders})
    `, [...collegeIds]);

    res.json({
      success: true,
      data: {
        metrics: {
          totalStudents: studentStats[0].totalStudents || 0,
          activeStudents: studentStats[0].activeStudents || 0,
          placedStudents: placementStats[0].placedStudents || 0,
          placementRate: studentStats[0].totalStudents > 0 ? (placementStats[0].placedStudents / studentStats[0].totalStudents) * 100 : 0,
          avgTalentScore: talentStats[0].avgTalentScore || 0,
          atRiskStudents: talentStats[0].atRiskStudents || 0
        },
        collegeAnalytics
      }
    });
  } catch (error) {
    console.error("TPO Dashboard Stats Error:", error);
    res.status(500).json({ success: false, message: "Error fetching dashboard stats" });
  }
});

// Get Students for Assigned Colleges
router.get("/students", async (req: any, res) => {
  try {
    const context = await getTPOContext(req.user.userId);
    if (!context || context.collegeIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const { collegeIds } = context;
    const placeholders = collegeIds.map(() => '?').join(',');

    const [students]: any = await db.query(`
      SELECT sp.*, u.email, ts.overall_score as talent_score, cm.college_name,
             COALESCE(b.status, 'ACTIVE') as batch_status, COALESCE(b.batch_name, sp.batch) as batch_name
      FROM student_profiles sp
      JOIN users u ON sp.user_id = u.id
      LEFT JOIN student_batch sb ON sp.id = sb.student_id
      LEFT JOIN batches b ON COALESCE(sp.batch_id, sb.batch_id) = b.id
      LEFT JOIN college_master cm ON COALESCE(sp.college_id, b.college_id) = cm.id
      LEFT JOIN talent_scores ts ON sp.user_id = ts.user_id
      WHERE COALESCE(sp.college_id, b.college_id) IN (${placeholders})
      ORDER BY ts.overall_score DESC
    `, [...collegeIds]);

    res.json({ success: true, data: students });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching students" });
  }
});

// AI Skill Gap Analysis
router.get("/ai-skill-gap", async (req: any, res) => {
  try {
    const context = await getTPOContext(req.user.userId);
    if (!context || context.collegeIds.length === 0) {
      return res.status(400).json({ success: false, message: "No colleges assigned" });
    }

    const { collegeIds } = context;
    const placeholders = collegeIds.map(() => '?').join(',');

    // Get aggregated skills and scores from students
    const [studentData]: any = await db.query(`
      SELECT sp.skills_json, ts.overall_score, ts.breakdown_json, cs.topics_json
      FROM student_profiles sp
      LEFT JOIN student_batch sb ON sp.id = sb.student_id
      LEFT JOIN batches b ON COALESCE(sp.batch_id, sb.batch_id) = b.id
      LEFT JOIN talent_scores ts ON sp.user_id = ts.user_id
      LEFT JOIN coding_profiles cp ON sp.user_id = cp.user_id
      LEFT JOIN coding_stats cs ON cp.id = cs.profile_id
      WHERE COALESCE(sp.college_id, b.college_id) IN (${placeholders})
    `, [...collegeIds]);

    const allSkills = studentData.flatMap((s: any) => {
      try {
        return typeof s.skills_json === 'string' ? JSON.parse(s.skills_json) : (s.skills_json || []);
      } catch (e) { return []; }
    });

    // Aggregate skills frequency
    const skillFrequency: Record<string, number> = {};
    allSkills.forEach((s: string) => {
      skillFrequency[s] = (skillFrequency[s] || 0) + 1;
    });

    const avgScore = studentData.reduce((acc: number, curr: any) => acc + (curr.overall_score || 0), 0) / (studentData.length || 1);
    
    // Get latest job requirements
    const [jobs]: any = await db.query("SELECT title, skills_json FROM jobs WHERE status = 'OPEN' LIMIT 20");
    const jobReqs = jobs.map((j: any) => {
      const skills = typeof j.skills_json === 'string' ? JSON.parse(j.skills_json) : (j.skills_json || []);
      return `${j.title}: ${skills.join(', ')}`;
    }).join('\n');

    const prompt = `
      As an EdTech Placement Expert and AI Career Architect, analyze this college's talent pool data:
      
      COLLEGE DATA:
      - Total Students Analyzed: ${studentData.length}
      - Average Talent Score: ${avgScore.toFixed(2)}/100
      - Student Skill Frequency: ${JSON.stringify(skillFrequency)}
      
      CURRENT MARKET JOB REQUIREMENTS (OPEN POSITIONS):
      ${jobReqs}

      Generate a comprehensive Placement Intelligence Report in JSON format:
      {
        "placement_readiness": number (0-100),
        "top_missing_skills": string[],
        "college_strengths": string[],
        "college_weaknesses": string[],
        "branch_recommendations": string[],
        "training_roadmap": [
          { "phase": "string", "focus": "string", "duration": "string" }
        ],
        "market_fit_analysis": "string"
      }
    `;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    const text = result.text;
    
    // Production-grade JSON extraction
    let jsonReport;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : text;
      jsonReport = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("AI JSON Parse Error:", parseError, "Original Text:", text);
      return res.status(500).json({ 
        success: false, 
        message: "AI generated an invalid report format. Please try again.",
        retryable: true 
      });
    }

    res.json({ success: true, data: jsonReport });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error generating AI analysis" });
  }
});

// Batches
router.get("/batches", async (req: any, res) => {
  try {
    const context = await getTPOContext(req.user.userId);
    if (!context) return res.status(403).json({ success: false, message: "Unauthorized" });
    
    const { college_id } = req.query;
    
    // 1. Fetch Admin academic batches
    let adminBatchesQuery = `SELECT * FROM batches WHERE 1=1`;
    let adminBatchesParams: any[] = [];
    if (college_id) {
      adminBatchesQuery += ` AND college_id = ?`;
      adminBatchesParams.push(Number(college_id));
    } else {
      if (context.collegeIds.length > 0) {
        adminBatchesQuery += ` AND college_id IN (${context.collegeIds.map(() => '?').join(',')})`;
        adminBatchesParams.push(...context.collegeIds);
      }
    }
    const [adminBatches]: any = await db.query(adminBatchesQuery, adminBatchesParams);

    // 2. Fetch TPO assessment batches
    let abQuery = `SELECT * FROM assessment_batches WHERE 1=1`;
    let abParams: any[] = [];
    if (college_id) {
      abQuery += ` AND college_id = ?`;
      abParams.push(Number(college_id));
    } else {
      if (context.collegeIds.length > 0) {
        abQuery += ` AND college_id IN (${context.collegeIds.map(() => '?').join(',')})`;
        abParams.push(...context.collegeIds);
      }
    }
    const [assessmentBatches]: any = await db.query(abQuery, abParams);
    
    // 3. Fetch dynamic batches from student profiles
    let spQuery = `
      SELECT DISTINCT COALESCE(b.batch_name, sp.batch) as batch_name, COALESCE(b.department, 'Unknown') as department, COALESCE(b.academic_year, '2024') as academic_year 
      FROM student_profiles sp
      LEFT JOIN student_batch sb ON sp.id = sb.student_id
      LEFT JOIN batches b ON COALESCE(sp.batch_id, sb.batch_id) = b.id
      WHERE COALESCE(b.batch_name, sp.batch) IS NOT NULL AND COALESCE(b.batch_name, sp.batch) != ''
    `;
    let spParams: any[] = [];
    if (college_id) {
      spQuery += ` AND sp.college_id = ?`;
      spParams.push(Number(college_id));
    } else {
      if (context.collegeIds.length > 0) {
        spQuery += ` AND sp.college_id IN (${context.collegeIds.map(() => '?').join(',')})`;
        spParams.push(...context.collegeIds);
      }
    }
    const [spBatches]: any = await db.query(spQuery, spParams);
    
    // Merge all batches, keyed by unique batch_name to avoid duplicates
    const mergedBatchesMap = new Map<string, any>();

    // Add admin batches (Academic Batches created by Admin)
    for (const b of adminBatches) {
      mergedBatchesMap.set(b.batch_name, {
        id: b.id,
        college_id: b.college_id,
        tpo_id: b.assigned_tpo_id || context.tpoId,
        department: b.department || 'General',
        academic_year: b.academic_year || '2024',
        batch_name: b.batch_name,
        semester: b.semester || 'N/A',
        strength: b.strength || 0,
        status: b.status || 'ACTIVE'
      });
    }

    // Add assessment batches
    for (const b of assessmentBatches) {
      if (!mergedBatchesMap.has(b.batch_name)) {
        mergedBatchesMap.set(b.batch_name, {
          id: b.id,
          college_id: b.college_id,
          tpo_id: b.tpo_id,
          department: b.department || 'General',
          academic_year: b.academic_year || '2024',
          batch_name: b.batch_name,
          semester: 'N/A',
          strength: 0,
          status: 'ACTIVE'
        });
      }
    }

    // Add dynamic student batches
    for (const spb of spBatches) {
      if (!mergedBatchesMap.has(spb.batch_name)) {
        mergedBatchesMap.set(spb.batch_name, {
          id: `sp_${spb.batch_name}`,
          college_id: Number(college_id) || (context.collegeIds[0] || 1),
          tpo_id: context.tpoId,
          department: spb.department || 'General',
          academic_year: spb.academic_year || '2024',
          batch_name: spb.batch_name,
          semester: 'N/A',
          strength: 0,
          status: 'ACTIVE'
        });
      }
    }
    
    const mergedBatches = Array.from(mergedBatchesMap.values());
    
    res.json({ success: true, data: mergedBatches });
  } catch (error) {
    console.error("Error fetching batches:", error);
    res.status(500).json({ success: false, message: "Error fetching batches" });
  }
});

// Question Bank
router.get("/questions", async (req: any, res) => {
  try {
    const context = await getTPOContext(req.user.userId);
    if (!context) return res.status(403).json({ success: false, message: "Unauthorized" });

    const [questions]: any = await db.query(
      `SELECT * FROM question_bank WHERE tpo_id = ? ORDER BY id DESC`,
      [context.tpoId]
    );
    res.json({ success: true, data: questions });
  } catch (error) {
    console.error("Error fetching question bank:", error);
    res.status(500).json({ success: false, message: "Error fetching questions" });
  }
});

router.post("/questions", async (req: any, res) => {
  try {
    const context = await getTPOContext(req.user.userId);
    if (!context) return res.status(403).json({ success: false, message: "Unauthorized" });

    const { topic, question_text, question_type, difficulty, options_json, correct_answers_json, explanation } = req.body;
    
    await db.query(`
      INSERT INTO question_bank (tpo_id, topic, question_text, question_type, difficulty, options_json, correct_answers_json, explanation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [context.tpoId, topic, question_text, question_type, difficulty, options_json, correct_answers_json, explanation]);
    
    res.json({ success: true, message: "Question added successfully" });
  } catch (error) {
    console.error("Error adding question:", error);
    res.status(500).json({ success: false, message: "Error adding question" });
  }
});

// Event Management
router.post("/events", async (req: any, res) => {
  try {
    const context = await getTPOContext(req.user.userId);
    if (!context) return res.status(403).json({ success: false, message: "TPO profile not found" });

    const { title, description, event_type, start_date, end_date, location_or_link, college_id, image_url } = req.body;

    const targetCollegeId = Number(college_id);
    if (!context.collegeIds.map((id: any) => Number(id)).includes(targetCollegeId)) {
      return res.status(403).json({ success: false, message: "Unauthorized for this college" });
    }

    const safeStartDate = start_date || null;
    const safeEndDate = end_date || null;

    const [result]: any = await db.query(`
      INSERT INTO events (college_id, tpo_id, title, description, event_type, start_date, end_date, location_or_link, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [targetCollegeId, context.tpoId, title, description, event_type, safeStartDate, safeEndDate, location_or_link, image_url || null]);

    res.json({ success: true, message: "Event created successfully", eventId: result.insertId });
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ success: false, message: "Error creating event" });
  }
});

router.get("/events", async (req: any, res) => {
  try {
    const context = await getTPOContext(req.user.userId);
    if (!context || context.collegeIds.length === 0) return res.json({ success: true, data: [] });

    const placeholders = context.collegeIds.map(() => '?').join(',');

    const [events]: any = await db.query(`
      SELECT e.*, cm.college_name,
             (SELECT COUNT(*) FROM event_registrations WHERE event_id = e.id) as registration_count
      FROM events e
      JOIN college_master cm ON e.college_id = cm.id
      WHERE e.college_id IN (${placeholders})
      ORDER BY e.start_date DESC
    `, [...context.collegeIds]);

    res.json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching events" });
  }
});

router.get("/events/:id/registrations", async (req: any, res) => {
  try {
    const context = await getTPOContext(req.user.userId);
    if (!context || context.collegeIds.length === 0) return res.status(403).json({ success: false, message: "Unauthorized" });

    const eventId = Number(req.params.id);

    // Verify if this event belongs to the TPO's colleges
    const [eventRow]: any = await db.query(`SELECT college_id FROM events WHERE id = ?`, [eventId]);
    if (eventRow.length === 0 || !context.collegeIds.map((id: any) => Number(id)).includes(Number(eventRow[0].college_id))) {
      return res.status(403).json({ success: false, message: "Unauthorized for this event" });
    }

    const [registrations]: any = await db.query(`
      SELECT er.id as registration_id, er.status, er.registered_at, 
             sp.id as student_id, sp.full_name, sp.contact, sp.profile_photo_url, sp.resume_url, sp.aadhar_or_college_id
      FROM event_registrations er
      JOIN student_profiles sp ON er.student_id = sp.id
      WHERE er.event_id = ?
      ORDER BY er.registered_at DESC
    `, [eventId]);

    res.json({ success: true, data: registrations });
  } catch (error) {
    console.error("Error fetching event registrations:", error);
    res.status(500).json({ success: false, message: "Error fetching registrations" });
  }
});

router.put("/events/:id/registrations/:regId", async (req: any, res) => {
  try {
    const context = await getTPOContext(req.user.userId);
    if (!context || context.collegeIds.length === 0) return res.status(403).json({ success: false, message: "Unauthorized" });

    const eventId = Number(req.params.id);
    const regId = Number(req.params.regId);
    const { status } = req.body;

    // Verify if this event belongs to the TPO's colleges
    const [eventRow]: any = await db.query(`SELECT college_id FROM events WHERE id = ?`, [eventId]);
    if (eventRow.length === 0 || !context.collegeIds.map((id: any) => Number(id)).includes(Number(eventRow[0].college_id))) {
      return res.status(403).json({ success: false, message: "Unauthorized for this event" });
    }

    await db.query(`
      UPDATE event_registrations 
      SET status = ? 
      WHERE id = ? AND event_id = ?
    `, [status, regId, eventId]);

    res.json({ success: true, message: "Registration status updated successfully" });
  } catch (error) {
    console.error("Error updating event registration status:", error);
    res.status(500).json({ success: false, message: "Error updating registration status" });
  }
});

// --- ASSESSMENT ENGINE ---

router.post("/tests", async (req: any, res) => {
  try {
    const context = await getTPOContext(req.user.userId);
    if (!context) return res.status(403).json({ success: false, message: "Unauthorized" });

    const { 
      title, description, category, difficulty, duration_minutes, max_marks, passing_marks, 
      negative_marking, webcam_monitoring, randomize_questions, test_date, start_time, 
      late_join_window, college_id, batch_name, questions
    } = req.body;
    
    // Set status based on test_date
    let status = 'UPCOMING';
    
    const [result]: any = await db.query(`
      INSERT INTO assessment_tests (
        tpo_id, college_id, title, description, category, difficulty, duration_minutes, 
        max_marks, passing_marks, negative_marking, webcam_monitoring, randomize_questions, 
        test_date, start_time, late_join_window, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      context.tpoId, college_id, title, description || '', category || 'Aptitude', difficulty || 'Medium', duration_minutes || 60,
      max_marks || 100, passing_marks || 40, negative_marking || 0, webcam_monitoring ? 1 : 0, randomize_questions ? 1 : 0,
      test_date || null, start_time || null, late_join_window || 10, status
    ]);

    const testId = result.insertId;

    if (batch_name) {
      await db.query(`
        INSERT INTO assessment_assignments (assessment_id, batch_name)
        VALUES (?, ?)
      `, [testId, batch_name]);
    }

    if (questions && Array.isArray(questions) && questions.length > 0) {
      for (const q of questions) {
        await db.query(`
          INSERT INTO assessment_questions (
            assessment_id, question_text, question_type, options_json, correct_answers_json, marks, difficulty, topic
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          testId, q.question_text, q.question_type || 'MCQ', JSON.stringify(q.options || []), JSON.stringify(q.correct_answers || []), q.marks || 1, q.difficulty || 'Medium', q.topic || ''
        ]);
      }
    }

    res.json({ success: true, message: "Assessment created successfully", testId });
  } catch (error) {
    console.error("Error creating assessment:", error);
    res.status(500).json({ success: false, message: "Error creating assessment" });
  }
});

function getTestStatus(test: any): string {
  if (test.status === 'DRAFT') {
    return 'DRAFT';
  }
  if (!test.test_date || !test.start_time) {
    return test.status || 'UPCOMING';
  }
  try {
    const now = new Date();
    let dateStr = "";
    if (test.test_date instanceof Date) {
      const year = test.test_date.getFullYear();
      const month = String(test.test_date.getMonth() + 1).padStart(2, '0');
      const day = String(test.test_date.getDate()).padStart(2, '0');
      dateStr = `${year}-${month}-${day}`;
    } else if (typeof test.test_date === 'string') {
      dateStr = test.test_date.split('T')[0];
    } else {
      dateStr = String(test.test_date).split('T')[0];
    }

    const startStr = `${dateStr}T${test.start_time}:00`;
    const startDt = new Date(startStr);
    
    let endDt: Date;
    if (test.end_time) {
      const endStr = `${dateStr}T${test.end_time}:00`;
      endDt = new Date(endStr);
    } else {
      const duration = parseInt(test.duration_minutes || 60);
      endDt = new Date(startDt.getTime() + duration * 60 * 1000);
    }

    if (now >= startDt && now <= endDt) {
      return 'ONGOING';
    } else if (now > endDt) {
      return 'COMPLETED';
    } else {
      return 'UPCOMING';
    }
  } catch (err) {
    return test.status || 'UPCOMING';
  }
}

router.get("/tests", async (req: any, res) => {
  try {
    const context = await getTPOContext(req.user.userId);
    if (!context || context.collegeIds.length === 0) return res.json({ success: true, data: [] });

    const placeholders = context.collegeIds.map(() => '?').join(',');

    const [tests]: any = await db.query(`
      SELECT t.*, cm.college_name
      FROM assessment_tests t
      JOIN college_master cm ON t.college_id = cm.id
      WHERE t.college_id IN (${placeholders})
      ORDER BY t.created_at DESC
    `, [...context.collegeIds]);

    const updatedTests = tests.map((t: any) => {
      t.status = getTestStatus(t);
      return t;
    });

    res.json({ success: true, data: updatedTests });
  } catch (error) {
    console.error("Error fetching tests:", error);
    res.status(500).json({ success: false, message: "Error fetching tests" });
  }
});

router.get("/colleges", async (req: any, res) => {
  try {
    const context = await getTPOContext(req.user.userId);
    if (!context || context.collegeIds.length === 0) return res.json({ success: true, data: [] });

    const placeholders = context.collegeIds.map(() => '?').join(',');
    const [colleges]: any = await db.query(`
      SELECT id, college_name, college_code, district, state 
      FROM college_master 
      WHERE id IN (${placeholders}) AND status = 'ACTIVE'
    `, [...context.collegeIds]);

    res.json({ success: true, data: colleges });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching assigned colleges" });
  }
});

router.get("/reports/download", async (req: any, res) => {
  try {
    const { type } = req.query;
    // Mock PDF generation - in a real app, use a library like PDFKit or puppeteer
    // For this demo, we return a mock blob
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${type}_report.pdf`);
    res.send(Buffer.from("Mock PDF Content - VEGA Report Engine"));
  } catch (error) {
    res.status(500).json({ success: false, message: "Error generating report" });
  }
});

// Get Verifications for Assigned Colleges
router.get("/verifications", async (req: any, res) => {
  try {
    const context = await getTPOContext(req.user.userId);
    if (!context || context.collegeIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const { collegeIds } = context;
    const placeholders = collegeIds.map(() => '?').join(',');

    // 1. Proactive auto-generation of verification rows for student profiles who uploaded resumes but don't have records
    const [eligibleStudents]: any = await db.query(`
      SELECT sp.id, sp.resume_url, sp.aadhar_or_college_id
      FROM student_profiles sp
      LEFT JOIN student_batch sb ON sp.id = sb.student_id
      LEFT JOIN batches b ON COALESCE(sp.batch_id, sb.batch_id) = b.id
      WHERE COALESCE(sp.college_id, b.college_id) IN (${placeholders}) 
        AND (sp.resume_url IS NOT NULL AND sp.resume_url != '')
    `, [...collegeIds]);

    for (const student of eligibleStudents) {
      if (student.resume_url) {
        const [existing]: any = await db.query(
          "SELECT id FROM tpo_verifications WHERE student_id = ? AND document_type = 'Resume'",
          [student.id]
        );
        if (existing.length === 0) {
          await db.query(`
            INSERT INTO tpo_verifications (student_id, document_type, document_url, status)
            VALUES (?, 'Resume', ?, 'PENDING')
          `, [student.id, student.resume_url]);
        }
      }
    }

    // Checking for Aadhar / College ID Card
    const [eligibleIdStudents]: any = await db.query(`
      SELECT sp.id, sp.aadhar_or_college_id
      FROM student_profiles sp
      LEFT JOIN student_batch sb ON sp.id = sb.student_id
      LEFT JOIN batches b ON COALESCE(sp.batch_id, sb.batch_id) = b.id
      WHERE COALESCE(sp.college_id, b.college_id) IN (${placeholders}) 
        AND (sp.aadhar_or_college_id IS NOT NULL AND sp.aadhar_or_college_id != '')
    `, [...collegeIds]);

    for (const student of eligibleIdStudents) {
      if (student.aadhar_or_college_id) {
        const [existing]: any = await db.query(
          "SELECT id FROM tpo_verifications WHERE student_id = ? AND document_type = 'College ID Card'",
          [student.id]
        );
        if (existing.length === 0) {
          let url = student.aadhar_or_college_id;
          if (!url.startsWith('http') && !url.startsWith('/')) {
            url = `/id-proof-text-declaration?id=${encodeURIComponent(url)}`;
          }
          await db.query(`
            INSERT INTO tpo_verifications (student_id, document_type, document_url, status)
            VALUES (?, 'College ID Card', ?, 'PENDING')
          `, [student.id, url]);
        }
      }
    }

    // 2. Fetch all verification records for assigned colleges
    const [verifications]: any = await db.query(`
      SELECT v.*, sp.full_name, cm.college_name as college_name, u.email,
             COALESCE(b.status, 'ACTIVE') as batch_status
      FROM tpo_verifications v
      JOIN student_profiles sp ON v.student_id = sp.id
      JOIN users u ON sp.user_id = u.id
      LEFT JOIN student_batch sb ON sp.id = sb.student_id
      LEFT JOIN batches b ON COALESCE(sp.batch_id, sb.batch_id) = b.id
      LEFT JOIN college_master cm ON COALESCE(sp.college_id, b.college_id) = cm.id
      WHERE COALESCE(sp.college_id, b.college_id) IN (${placeholders})
      ORDER BY v.created_at DESC
    `, [...collegeIds]);

    res.json({ success: true, data: verifications });
  } catch (error) {
    console.error("Verification retrieval error:", error);
    res.status(500).json({ success: false, message: "Error fetching verification requests" });
  }
});

// Approve Verification
router.post("/verifications/:id/approve", async (req: any, res) => {
  try {
    const { id } = req.params;
    const context = await getTPOContext(req.user.userId);
    if (!context || context.collegeIds.length === 0) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { collegeIds } = context;
    const placeholders = collegeIds.map(() => '?').join(',');

    // Ensure verification belongs to a student of TPO's assigned colleges
    const [verification]: any = await db.query(`
      SELECT v.id, v.student_id, COALESCE(b.status, 'ACTIVE') as batch_status
      FROM tpo_verifications v
      JOIN student_profiles sp ON v.student_id = sp.id
      LEFT JOIN student_batch sb ON sp.id = sb.student_id
      LEFT JOIN batches b ON COALESCE(sp.batch_id, sb.batch_id) = b.id
      WHERE v.id = ? AND COALESCE(sp.college_id, b.college_id) IN (${placeholders})
    `, [id, ...collegeIds]);

    if (verification.length === 0) {
      return res.status(403).json({ success: false, message: "Verification record not found or access denied" });
    }

    if (verification[0].batch_status === 'INACTIVE') {
      return res.status(400).json({ success: false, message: "Interaction blocked. Student belongs to an INACTIVE/DISABLED academic batch." });
    }

    const now = new Date();
    await db.query(
      "UPDATE tpo_verifications SET status = 'VERIFIED', verified_at = ? WHERE id = ?",
      [now, id]
    );

    res.json({ success: true, message: "Document verified successfully" });
  } catch (error) {
    console.error("Verification approve error:", error);
    res.status(500).json({ success: false, message: "Error approving verification" });
  }
});

// Reject Verification
router.post("/verifications/:id/reject", async (req: any, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const context = await getTPOContext(req.user.userId);
    if (!context || context.collegeIds.length === 0) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { collegeIds } = context;
    const placeholders = collegeIds.map(() => '?').join(',');

    // Ensure verification belongs to a student of TPO's assigned colleges
    const [verification]: any = await db.query(`
      SELECT v.id, v.student_id, COALESCE(b.status, 'ACTIVE') as batch_status
      FROM tpo_verifications v
      JOIN student_profiles sp ON v.student_id = sp.id
      LEFT JOIN student_batch sb ON sp.id = sb.student_id
      LEFT JOIN batches b ON COALESCE(sp.batch_id, sb.batch_id) = b.id
      WHERE v.id = ? AND COALESCE(sp.college_id, b.college_id) IN (${placeholders})
    `, [id, ...collegeIds]);

    if (verification.length === 0) {
      return res.status(403).json({ success: false, message: "Verification record not found or access denied" });
    }

    if (verification[0].batch_status === 'INACTIVE') {
      return res.status(400).json({ success: false, message: "Interaction blocked. Student belongs to an INACTIVE/DISABLED academic batch." });
    }

    await db.query(
      "UPDATE tpo_verifications SET status = 'REJECTED', rejection_reason = ? WHERE id = ?",
      [reason || 'Incorrect document or low resolution', id]
    );

    res.json({ success: true, message: "Document verification rejected" });
  } catch (error) {
    console.error("Verification reject error:", error);
    res.status(500).json({ success: false, message: "Error rejecting verification" });
  }
});

// -------------------------------------------------------------
// 10. Campus Notices
// -------------------------------------------------------------

router.get("/notices", authenticate, authorize(["TPO"]), async (req: any, res) => {
  try {
    const tpoId = req.user.userId;
    const [notices]: any = await db.query(
      "SELECT * FROM campus_notices WHERE tpo_id = ? ORDER BY created_at DESC",
      [tpoId]
    );
    res.json({ success: true, data: notices });
  } catch (error) {
    console.error("Error fetching notices:", error);
    res.status(500).json({ success: false, message: "Error fetching notices" });
  }
});

router.post("/notices", authenticate, authorize(["TPO"]), async (req: any, res) => {
  try {
    const tpoId = req.user.userId;
    const { batch_name, title, message, is_public } = req.body;
    
    // Get college_id
    const [tpoCollege]: any = await db.query(
      "SELECT college_id FROM tpo_colleges WHERE tpo_id = ? LIMIT 1",
      [tpoId]
    );
    
    const collegeId = tpoCollege[0]?.college_id || 1;

    await db.query(`
      INSERT INTO campus_notices (tpo_id, college_id, batch_name, title, message, is_public)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [tpoId, collegeId, batch_name || 'ALL', title, message, is_public ? 1 : 0]);

    res.json({ success: true, message: "Notice posted successfully" });
  } catch (error) {
    console.error("Error posting notice:", error);
    res.status(500).json({ success: false, message: "Error posting notice" });
  }
});

export default router;
