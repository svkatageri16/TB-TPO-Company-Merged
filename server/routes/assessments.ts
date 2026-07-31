import express from "express";
import crypto from "crypto";
import db from "../db.ts";
import { authenticate, authorize } from "../middleware/auth.ts";
import { GoogleGenAI, Type } from "@google/genai";

const router = express.Router();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Helper: Get TPO profile & college
async function getTPOContext(userId: number) {
  const [tpoProfiles]: any = await db.query("SELECT id FROM tpo_profiles WHERE user_id = ?", [userId]);
  if (tpoProfiles.length === 0) return null;
  const tpoId = tpoProfiles[0].id;

  const [tpoColleges]: any = await db.query(
    "SELECT college_id FROM tpo_colleges WHERE tpo_id = ?",
    [tpoId]
  );
  let collegeId = tpoColleges.length > 0 ? tpoColleges[0].college_id : null;
  if (!collegeId) {
    const [batchColleges]: any = await db.query(
      "SELECT college_id FROM batches WHERE assigned_tpo_id = ? LIMIT 1",
      [tpoId]
    );
    if (batchColleges.length > 0) {
      collegeId = batchColleges[0].college_id;
    }
  }
  return { tpoId, collegeId };
}

// Helper: Get Student profile & college
async function getStudentContext(userId: number) {
  const [studentProfiles]: any = await db.query(`
    SELECT sp.id, COALESCE(sp.college_id, b.college_id) as college_id, COALESCE(b.batch_name, sp.batch) as batch, COALESCE(b.status, 'ACTIVE') as batch_status
    FROM student_profiles sp
    LEFT JOIN student_batch sb ON sp.id = sb.student_id
    LEFT JOIN batches b ON COALESCE(sp.batch_id, sb.batch_id) = b.id
    WHERE sp.user_id = ?
  `, [userId]);
  if (studentProfiles.length === 0) return null;
  return studentProfiles[0];
}

// Helper: Get Company profile
async function getCompanyContext(userId: number) {
  const [profiles]: any = await db.query("SELECT id FROM company_profiles WHERE user_id = ?", [userId]);
  if (profiles.length === 0) return null;
  return profiles[0];
}

// Helper: Reverse-Geocode coordinates to address
async function reverseGeocode(latitude: number | null | undefined, longitude: number | null | undefined): Promise<string> {
  if (!latitude || !longitude) return "Unknown Location (No coordinates)";
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'VEGA-CAMS/1.0'
      }
    });
    if (res.ok) {
      const data: any = await res.json();
      if (data && data.display_name) {
        return data.display_name;
      }
    }
  } catch (error: any) {
    console.error("Reverse geocoding failed:", error.message);
  }
  return `Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`;
}

// Helper: Get Location via IP address
async function getIpLocation(ip: string) {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    return {
      latitude: 12.9716, // Default Bengaluru coordinates
      longitude: 77.5946,
      address: "Bengaluru, Karnataka, India (Developer Loopback)"
    };
  }

  try {
    const res = await fetch(`http://ip-api.com/json/${ip}`);
    if (res.ok) {
      const data: any = await res.json();
      if (data && data.status === 'success') {
        return {
          latitude: data.lat,
          longitude: data.lon,
          address: `${data.city}, ${data.regionName}, ${data.country}`
        };
      }
    }
  } catch (error: any) {
    console.error("IP geolocation failed:", error.message);
  }
  return null;
}

// Helper: Parse User Agent
function parseUserAgent(userAgentStr: string) {
  let browser = "Unknown Browser";
  let device = "Desktop";

  if (!userAgentStr) return { browser, device };

  const ua = userAgentStr.toLowerCase();

  // Browser detection
  if (ua.includes("edg/")) {
    browser = "Microsoft Edge";
  } else if (ua.includes("chrome") || ua.includes("chromium")) {
    browser = "Google Chrome";
  } else if (ua.includes("firefox")) {
    browser = "Mozilla Firefox";
  } else if (ua.includes("safari")) {
    browser = "Apple Safari";
  } else if (ua.includes("opr/") || ua.includes("opera")) {
    browser = "Opera";
  }

  // Device detection
  if (ua.includes("android")) {
    device = "Android Device";
  } else if (ua.includes("iphone")) {
    device = "iPhone";
  } else if (ua.includes("ipad")) {
    device = "iPad";
  } else if (ua.includes("mobile")) {
    device = "Mobile Device";
  } else if (ua.includes("macintosh")) {
    device = "macOS Desktop";
  } else if (ua.includes("windows")) {
    device = "Windows PC";
  } else if (ua.includes("linux")) {
    device = "Linux PC";
  }

  return { browser, device };
}

// -------------------------------------------------------------
// 1. TPO Batches Management
// -------------------------------------------------------------
router.get("/batches", authenticate, async (req: any, res) => {
  try {
    const isTPO = req.user.role === "TPO";
    let collegeId = null;

    if (isTPO) {
      const context = await getTPOContext(req.user.userId);
      if (!context) return res.status(404).json({ success: false, message: "TPO profile not found" });
      collegeId = context.collegeId;
    } else if (req.user.role === "STUDENT") {
      const context = await getStudentContext(req.user.userId);
      if (!context) return res.status(404).json({ success: false, message: "Student profile not found" });
      collegeId = context.college_id;
    } else {
      // Admin or others
      const [colleges]: any = await db.query("SELECT id FROM college_master LIMIT 1");
      collegeId = colleges[0]?.id;
    }

    if (!collegeId) {
      return res.json({ success: true, batches: [] });
    }

    // 1. Academic batches from admin batches table
    const [academicBatches]: any = await db.query(
      "SELECT DISTINCT batch_name as batch FROM batches WHERE college_id = ?",
      [collegeId]
    );

    // 2. Dynamic batches from student profiles
    const [studentBatches]: any = await db.query(`
      SELECT DISTINCT COALESCE(b.batch_name, sp.batch) as batch 
      FROM student_profiles sp
      LEFT JOIN student_batch sb ON sp.id = sb.student_id
      LEFT JOIN batches b ON COALESCE(sp.batch_id, sb.batch_id) = b.id
      WHERE COALESCE(sp.college_id, b.college_id) = ? AND COALESCE(b.batch_name, sp.batch) IS NOT NULL AND COALESCE(b.batch_name, sp.batch) != ''
    `, [collegeId]);

    // 3. Explicit assessment batches
    const [definedBatches]: any = await db.query(
      "SELECT DISTINCT batch_name as batch FROM assessment_batches WHERE college_id = ?",
      [collegeId]
    );

    const allBatchesSet = new Set<string>();
    academicBatches.forEach((b: any) => b.batch && allBatchesSet.add(b.batch));
    studentBatches.forEach((b: any) => b.batch && allBatchesSet.add(b.batch));
    definedBatches.forEach((b: any) => b.batch && allBatchesSet.add(b.batch));

    res.json({
      success: true,
      batches: Array.from(allBatchesSet).sort(),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/batches", authenticate, authorize(["TPO", "SUPER_ADMIN"]), async (req: any, res) => {
  try {
    const { department, academic_year, batch_name } = req.body;
    if (!department || !academic_year || !batch_name) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const context = await getTPOContext(req.user.userId);
    if (!context) return res.status(404).json({ success: false, message: "TPO context not found" });

    await db.query(
      "INSERT INTO assessment_batches (college_id, tpo_id, department, academic_year, batch_name) VALUES (?, ?, ?, ?, ?)",
      [context.collegeId, context.tpoId, department, academic_year, batch_name]
    );

    res.json({ success: true, message: "Batch registered successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 2. Question Bank CRUD
// -------------------------------------------------------------
router.get("/question-bank", authenticate, authorize(["TPO"]), async (req: any, res) => {
  try {
    const context = await getTPOContext(req.user.userId);
    if (!context) return res.status(404).json({ success: false, message: "TPO not found" });

    const [questions]: any = await db.query(
      "SELECT * FROM question_bank WHERE tpo_id = ? ORDER BY created_at DESC",
      [context.tpoId]
    );
    res.json({ success: true, questions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/question-bank", authenticate, authorize(["TPO"]), async (req: any, res) => {
  try {
    const { topic, question_text, question_type, difficulty, options, correct_answers, explanation } = req.body;
    const context = await getTPOContext(req.user.userId);
    if (!context) return res.status(404).json({ success: false, message: "TPO not found" });

    await db.query(`
      INSERT INTO question_bank (tpo_id, topic, question_text, question_type, difficulty, options_json, correct_answers_json, explanation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      context.tpoId,
      topic || "General",
      question_text,
      question_type,
      difficulty || "Medium",
      JSON.stringify(options || []),
      JSON.stringify(correct_answers || []),
      explanation || ""
    ]);

    res.json({ success: true, message: "Question saved to bank successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 3. AI Question Generator using Gemini
// -------------------------------------------------------------
router.post("/ai-generate-questions", authenticate, authorize(["TPO"]), async (req: any, res) => {
  try {
    const { topic, difficulty, questionCount, type } = req.body;
    const count = parseInt(questionCount || 5);
    const qType = type || "MCQ"; // MCQ, True/False, Short Answer, etc.

    const prompt = `Generate exactly ${count} educational questions on the topic "${topic}" with difficulty level "${difficulty}" and question type "${qType}".
Format the response strictly as a JSON array of objects. Each object must have these exact fields:
- question_text: string
- question_type: string (value must be '${qType}')
- options: array of strings (provide 4 option strings if MCQ or 2 strings ["True", "False"] if True/False, otherwise empty array)
- correct_answers: array of strings (for MCQ, provide the exact matching string of the correct option from the options array. For True/False, provide either ["True"] or ["False"]. For fill-in-blank or short-answer, provide acceptable text answer strings)
- explanation: string (a short detailed conceptual explanation)
- topic: string (use "${topic}")
- difficulty: string (use "${difficulty}")
Do not include any wrapper or markdown formatting other than pure valid JSON.`;

    const modelName = "gemini-2.5-flash";
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text || "[]";
    const parsedQuestions = JSON.parse(text.trim());

    res.json({
      success: true,
      questions: parsedQuestions
    });
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    res.status(500).json({ success: false, message: "Failed to generate questions. " + error.message });
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

// -------------------------------------------------------------
// 4. Assessment Test CRUD & Wizard Flow
// -------------------------------------------------------------
router.get("/tests", authenticate, async (req: any, res) => {
  try {
    const isTPO = req.user.role === "TPO";
    const isStudent = req.user.role === "STUDENT";

    if (isTPO) {
      const context = await getTPOContext(req.user.userId);
      if (!context) return res.status(404).json({ success: false, message: "TPO profile not found" });

      const [tests]: any = await db.query(
        "SELECT * FROM assessment_tests WHERE tpo_id = ? ORDER BY created_at DESC",
        [context.tpoId]
      );

      // Fetch batch assignments for each test
      for (const t of tests) {
        const [batches]: any = await db.query(
          "SELECT batch_name FROM assessment_assignments WHERE assessment_id = ?",
          [t.id]
        );
        t.batches = batches.map((b: any) => b.batch_name);
        t.status = getTestStatus(t);
      }

      res.json({ success: true, tests });
    } else if (isStudent) {
      const context = await getStudentContext(req.user.userId);
      if (!context) return res.status(404).json({ success: false, message: "Student profile not found" });

      if (context.batch_status === 'INACTIVE') {
        return res.json({ success: true, tests: [], isBatchInactive: true });
      }

      // Fetch assessments that are assigned to this student's batch
      const [tests]: any = await db.query(`
        SELECT DISTINCT t.* 
        FROM assessment_tests t
        JOIN assessment_assignments a ON t.id = a.assessment_id
        WHERE a.batch_name = ? AND t.status != 'DRAFT'
        ORDER BY t.test_date DESC, t.start_time DESC
      `, [context.batch]);

      // Check current student's attempts for these tests
      for (const t of tests) {
        const [attempts]: any = await db.query(
          "SELECT id, status, score, percentage, submitted_at FROM assessment_attempts WHERE assessment_id = ? AND student_user_id = ?",
          [t.id, req.user.userId]
        );
        t.attempt = attempts[0] || null;
        t.status = getTestStatus(t);
      }

      res.json({ success: true, tests });
    } else {
      const [tests]: any = await db.query("SELECT * FROM assessment_tests ORDER BY created_at DESC");
      for (const t of tests) {
        t.status = getTestStatus(t);
      }
      res.json({ success: true, tests });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/tests", authenticate, authorize(["TPO"]), async (req: any, res) => {
  try {
    const context = await getTPOContext(req.user.userId);
    if (!context) return res.status(404).json({ success: false, message: "TPO not found" });

    const {
      title, description, instructions, category, difficulty, language, department,
      max_marks, passing_marks, negative_marking, randomize_questions, randomize_options,
      calculator_allowed, test_date, start_time, end_time, late_join_window, duration_minutes,
      webcam_monitoring, camera_required, microphone_required, location_mandatory, batches, questions,
      college_id
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: "Assessment title is required" });
    }

    const targetCollegeId = college_id ? Number(college_id) : context.collegeId;

    // Insert basic info
    const [testResult]: any = await db.query(`
      INSERT INTO assessment_tests (
        tpo_id, college_id, title, description, instructions, category, difficulty, language, department,
        max_marks, passing_marks, negative_marking, randomize_questions, randomize_options, calculator_allowed,
        status, test_date, start_time, end_time, late_join_window, duration_minutes,
        webcam_monitoring, camera_required, microphone_required, location_mandatory
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      context.tpoId, targetCollegeId, title, description || "", instructions || "", category || "Aptitude",
      difficulty || "Medium", language || "English", department || "", parseInt(max_marks || 100), parseInt(passing_marks || 40),
      negative_marking ? 1 : 0, randomize_questions ? 1 : 0, randomize_options ? 1 : 0, calculator_allowed ? 1 : 0,
      test_date || null, start_time || null, end_time || null, parseInt(late_join_window || 10), parseInt(duration_minutes || 60),
      webcam_monitoring ? 1 : 0, camera_required ? 1 : 0, microphone_required ? 1 : 0, location_mandatory ? 1 : 0
    ]);

    const testId = testResult.insertId;

    // Assign Batches
    if (batches && Array.isArray(batches)) {
      for (const batchName of batches) {
        await db.query(
          "INSERT INTO assessment_assignments (assessment_id, batch_name) VALUES (?, ?)",
          [testId, batchName]
        );
      }
    }

    // Add Questions if specified
    if (questions && Array.isArray(questions)) {
      for (const q of questions) {
        await db.query(`
          INSERT INTO assessment_questions (
            assessment_id, question_text, question_type, options_json, correct_answers_json, marks, negative_marks, explanation, topic, difficulty
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          testId,
          q.question_text,
          q.question_type,
          JSON.stringify(q.options || []),
          JSON.stringify(q.correct_answers || []),
          parseInt(q.marks || 1),
          parseFloat(q.negative_marks || 0.0),
          q.explanation || "",
          q.topic || "General",
          q.difficulty || "Medium"
        ]);
      }
    }

    res.json({ success: true, testId, message: "Assessment created successfully as DRAFT" });
  } catch (error: any) {
    console.error("Test creation error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/tests/:id", authenticate, async (req: any, res) => {
  try {
    const isTPO = req.user.role === "TPO";
    const isStudent = req.user.role === "STUDENT";
    const testId = req.params.id;

    const [tests]: any = await db.query("SELECT * FROM assessment_tests WHERE id = ?", [testId]);
    if (tests.length === 0) return res.status(404).json({ success: false, message: "Test not found" });

    const test = tests[0];

    // Fetch batch assignments
    const [batches]: any = await db.query("SELECT batch_name FROM assessment_assignments WHERE assessment_id = ?", [testId]);
    test.batches = batches.map((b: any) => b.batch_name);

    // Fetch questions
    const [questions]: any = await db.query("SELECT * FROM assessment_questions WHERE assessment_id = ?", [testId]);
    
    // Parse JSON safely
    questions.forEach((q: any) => {
      try {
        q.options = JSON.parse(q.options_json || "[]");
      } catch (e) {
        q.options = [];
      }

      // SECURITY: If student is fetching test BEFORE completion, do NOT return correct answers!
      if (isStudent && test.status !== "COMPLETED") {
        q.correct_answers = [];
        delete q.correct_answers_json;
        delete q.explanation;
      } else {
        try {
          q.correct_answers = JSON.parse(q.correct_answers_json || "[]");
        } catch (e) {
          q.correct_answers = [];
        }
      }
    });

    test.questions = questions;

    res.json({ success: true, test });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/tests/:id", authenticate, authorize(["TPO"]), async (req: any, res) => {
  try {
    const testId = req.params.id;
    const {
      title, description, instructions, category, difficulty, language, department,
      max_marks, passing_marks, negative_marking, randomize_questions, randomize_options,
      calculator_allowed, test_date, start_time, end_time, late_join_window, duration_minutes,
      webcam_monitoring, camera_required, microphone_required, location_mandatory, batches, status, questions,
      college_id
    } = req.body;

    const targetCollegeId = college_id ? Number(college_id) : null;

    // Fetch the existing test details to preserve the current status
    const [existingTests]: any = await db.query("SELECT status FROM assessment_tests WHERE id = ?", [testId]);
    if (existingTests.length === 0) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }
    const currentStatus = existingTests[0].status;

    await db.query(`
      UPDATE assessment_tests SET
        title = ?, description = ?, instructions = ?, category = ?, difficulty = ?, language = ?, department = ?,
        max_marks = ?, passing_marks = ?, negative_marking = ?, randomize_questions = ?, randomize_options = ?, calculator_allowed = ?,
        status = ?, test_date = ?, start_time = ?, end_time = ?, late_join_window = ?, duration_minutes = ?,
        webcam_monitoring = ?, camera_required = ?, microphone_required = ?, location_mandatory = ?,
        college_id = COALESCE(?, college_id)
      WHERE id = ?
    `, [
      title || "",
      description || "",
      instructions || "",
      category || "Aptitude",
      difficulty || "Medium",
      language || "English",
      department || "",
      parseInt(max_marks || 100),
      parseInt(passing_marks || 40),
      negative_marking ? 1 : 0,
      randomize_questions ? 1 : 0,
      randomize_options ? 1 : 0,
      calculator_allowed ? 1 : 0,
      status || currentStatus || "UPCOMING",
      test_date || null,
      start_time || null,
      end_time || null,
      parseInt(late_join_window || 10),
      parseInt(duration_minutes || 60),
      webcam_monitoring ? 1 : 0,
      camera_required ? 1 : 0,
      microphone_required ? 1 : 0,
      location_mandatory ? 1 : 0,
      targetCollegeId,
      testId
    ]);

    // Update Batches (Clear & Reinsert)
    await db.query("DELETE FROM assessment_assignments WHERE assessment_id = ?", [testId]);
    if (batches && Array.isArray(batches)) {
      for (const batchName of batches) {
        await db.query(
          "INSERT INTO assessment_assignments (assessment_id, batch_name) VALUES (?, ?)",
          [testId, batchName]
        );
      }
    }

    // Update Questions (Clear & Reinsert for simplicity in Wizard PUT editing)
    if (questions && Array.isArray(questions)) {
      await db.query("DELETE FROM assessment_questions WHERE assessment_id = ?", [testId]);
      for (const q of questions) {
        await db.query(`
          INSERT INTO assessment_questions (
            assessment_id, question_text, question_type, options_json, correct_answers_json, marks, negative_marks, explanation, topic, difficulty
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          testId,
          q.question_text || "",
          q.question_type || "MCQ",
          JSON.stringify(q.options || []),
          JSON.stringify(q.correct_answers || []),
          parseInt(q.marks || 1),
          parseFloat(q.negative_marks || 0.0),
          q.explanation || "",
          q.topic || "General",
          q.difficulty || "Medium"
        ]);
      }
    }

    res.json({ success: true, message: "Assessment updated successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/tests/:id", authenticate, authorize(["TPO"]), async (req: any, res) => {
  try {
    const testId = req.params.id;
    await db.query("DELETE FROM assessment_tests WHERE id = ?", [testId]);
    res.json({ success: true, message: "Assessment deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 5. Test Publishing and Notifications
// -------------------------------------------------------------
router.post("/tests/:id/publish", authenticate, authorize(["TPO"]), async (req: any, res) => {
  try {
    const testId = req.params.id;

    // Fetch the test details
    const [tests]: any = await db.query("SELECT title, college_id FROM assessment_tests WHERE id = ?", [testId]);
    if (tests.length === 0) return res.status(404).json({ success: false, message: "Test not found" });
    const test = tests[0];

    // Change status to PUBLISHED
    await db.query("UPDATE assessment_tests SET status = 'PUBLISHED' WHERE id = ?", [testId]);

    // Fetch assigned batch names
    const [assignments]: any = await db.query("SELECT batch_name FROM assessment_assignments WHERE assessment_id = ?", [testId]);
    const batchNames = assignments.map((a: any) => a.batch_name);

    if (batchNames.length > 0) {
      // Find students belonging to these batches and college
      const placeholders = batchNames.map(() => "?").join(",");
      const [students]: any = await db.query(`
        SELECT user_id FROM student_profiles 
        WHERE college_id = ? AND batch IN (${placeholders})
      `, [test.college_id, ...batchNames]);

      // Create internal notifications
      for (const s of students) {
        await db.query(`
          INSERT INTO assessment_notifications (user_id, title, message)
          VALUES (?, ?, ?)
        `, [
          s.user_id,
          "New College Assessment Published",
          `The assessment "${test.title}" is now available for your batch. Please schedule/attempt it accordingly.`
        ]);
      }

      console.log(`📡 SMTP/Email System Stubs: Sent ${students.length} notification emails for published test: ${test.title}`);
    }

    res.json({ success: true, message: "Assessment published successfully! Notifications sent." });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 6. Student Test Attempting Mechanics
// -------------------------------------------------------------
router.post("/student/start", authenticate, authorize(["STUDENT"]), async (req: any, res) => {
  try {
    if (req.body.applicationId) {
      return handleCompanyStudentStart(req, res);
    }
    const { latitude, longitude, accuracy, ip_address, browser, device } = req.body;
    const assessment_id = req.body.assessment_id || req.body.testId;

    if (!assessment_id) {
      return res.status(400).json({ success: false, message: "Assessment ID is required" });
    }

    const context = await getStudentContext(req.user.userId);
    if (!context) {
      return res.status(404).json({ success: false, message: "Student profile not found" });
    }
    if (context.batch_status === 'INACTIVE') {
      return res.status(400).json({ success: false, message: "Interaction blocked. Your academic batch has been disabled by the administrator/TPO." });
    }

    // Fetch and sanitize questions for student
    const [questions]: any = await db.query(
      "SELECT id, question_text, question_type, options_json, marks, negative_marks, topic, difficulty FROM assessment_questions WHERE assessment_id = ?",
      [assessment_id]
    );

    questions.forEach((q: any) => {
      try {
        q.options = JSON.parse(q.options_json || "[]");
      } catch (e) {
        q.options = [];
      }
    });

    // Check if there is an active attempt
    const [existingAttempts]: any = await db.query(
      "SELECT * FROM assessment_attempts WHERE assessment_id = ? AND student_user_id = ?",
      [assessment_id, req.user.userId]
    );

    if (existingAttempts.length > 0) {
      const active = existingAttempts[0];
      if (active.status === "STARTED") {
        return res.json({
          success: true,
          attemptId: active.id,
          attempt: { id: active.id },
          questions,
          message: "Resuming existing active attempt session"
        });
      } else {
        return res.status(400).json({ success: false, message: "You have already completed or submitted this test" });
      }
    }

    // Start a fresh attempt
    const [result]: any = await db.query(`
      INSERT INTO assessment_attempts (assessment_id, student_user_id, status, started_at)
      VALUES (?, ?, 'STARTED', ?)
    `, [assessment_id, req.user.userId, new Date()]);

    const attemptId = result.insertId;

    // Resolve client metadata
    let reqIp = ip_address;
    if (!reqIp) {
      reqIp = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '').split(',')[0].trim();
      if (reqIp.startsWith('::ffff:')) {
        reqIp = reqIp.substring(7);
      }
    }

    let reqBrowser = browser;
    let reqDevice = device;
    if (!reqBrowser || !reqDevice) {
      const uaStr = req.headers['user-agent'] || '';
      const parsedUA = parseUserAgent(uaStr);
      if (!reqBrowser) reqBrowser = parsedUA.browser;
      if (!reqDevice) reqDevice = parsedUA.device;
    }

    let finalLat = latitude || null;
    let finalLon = longitude || null;
    let address = "Unknown Location";

    // If we have actual GPS coordinates, use them
    if (finalLat && finalLon && (finalLat !== 0 || finalLon !== 0)) {
      address = await reverseGeocode(finalLat, finalLon);
    } else {
      // Try IP-based location fallback
      const ipLoc = await getIpLocation(reqIp);
      if (ipLoc) {
        finalLat = ipLoc.latitude;
        finalLon = ipLoc.longitude;
        address = ipLoc.address;
      } else {
        address = "Captured (No coordinates)";
      }
    }

    // Save location capture details
    await db.query(`
      INSERT INTO assessment_location (attempt_id, latitude, longitude, accuracy, ip_address, browser, device, location_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [attemptId, finalLat, finalLon, accuracy || null, reqIp, reqBrowser, reqDevice, address]);

    res.json({
      success: true,
      attemptId,
      attempt: { id: attemptId },
      questions,
      message: "Test attempt session started"
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/student/save-answer", authenticate, authorize(["STUDENT"]), async (req: any, res) => {
  try {
    const attempt_id = req.body.attempt_id || req.body.attemptId;
    const question_id = req.body.question_id || req.body.questionId;
    const student_answer = req.body.student_answer !== undefined ? req.body.student_answer : req.body.answerText;
    const time_spent_seconds = req.body.time_spent_seconds !== undefined ? req.body.time_spent_seconds : req.body.timeSpentSeconds;

    if (!attempt_id || !question_id) {
      return res.status(400).json({ success: false, message: "Attempt ID and Question ID are required" });
    }

    // Check if attempt is still active
    const [attempts]: any = await db.query("SELECT status FROM assessment_attempts WHERE id = ?", [attempt_id]);
    if (attempts.length === 0 || attempts[0].status !== "STARTED") {
      return res.status(400).json({ success: false, message: "Test attempt session is not active or already submitted" });
    }

    // Check if answer already exists
    const [existing]: any = await db.query(
      "SELECT id FROM assessment_answers WHERE attempt_id = ? AND question_id = ?",
      [attempt_id, question_id]
    );

    let answerArray = [];
    if (Array.isArray(student_answer)) {
      answerArray = student_answer;
    } else if (student_answer !== undefined && student_answer !== null) {
      answerArray = [student_answer];
    }
    const answerJson = JSON.stringify(answerArray);

    if (existing.length > 0) {
      await db.query(`
        UPDATE assessment_answers SET
          student_answer_json = ?,
          time_spent_seconds = time_spent_seconds + ?
        WHERE id = ?
      `, [answerJson, parseInt(time_spent_seconds || 0), existing[0].id]);
    } else {
      await db.query(`
        INSERT INTO assessment_answers (attempt_id, question_id, student_answer_json, time_spent_seconds)
        VALUES (?, ?, ?, ?)
      `, [attempt_id, question_id, answerJson, parseInt(time_spent_seconds || 0)]);
    }

    res.json({ success: true, message: "Answer saved successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/student/violation", authenticate, authorize(["STUDENT"]), async (req: any, res) => {
  try {
    const attempt_id = req.body.attempt_id || req.body.attemptId;
    const violation_type = req.body.violation_type || req.body.violationType;
    const details = req.body.details || req.body.description;

    if (!attempt_id || !violation_type) {
      return res.status(400).json({ success: false, message: "Attempt ID and Violation Type are required" });
    }

    // Log the violation
    const [existing]: any = await db.query(
      "SELECT id, warning_count FROM assessment_violations WHERE attempt_id = ? AND violation_type = ?",
      [attempt_id, violation_type]
    );

    let currentWarning = 1;

    if (existing.length > 0) {
      currentWarning = existing[0].warning_count + 1;
      await db.query(
        "UPDATE assessment_violations SET warning_count = ?, details = ? WHERE id = ?",
        [currentWarning, details || "", existing[0].id]
      );
    } else {
      await db.query(
        "INSERT INTO assessment_violations (attempt_id, violation_type, warning_count, details) VALUES (?, ?, 1, ?)",
        [attempt_id, violation_type, details || ""]
      );
    }

    // Fetch total warnings across all violations for this attempt
    const [totals]: any = await db.query(
      "SELECT SUM(warning_count) as total_warnings FROM assessment_violations WHERE attempt_id = ?",
      [attempt_id]
    );

    const totalWarnings = parseInt(totals[0].total_warnings || 0);

    // Auto submit if warnings exceed 3
    let autoSubmitted = false;
    if (totalWarnings >= 3) {
      await db.query(
        "UPDATE assessment_attempts SET status = 'VIOLATED', submitted_at = ? WHERE id = ?",
        [new Date(), attempt_id]
      );
      autoSubmitted = true;
    }

    res.json({
      success: true,
      warningCount: currentWarning,
      totalWarnings,
      autoSubmitted,
      message: autoSubmitted ? "Test auto-submitted due to security violation threshold." : "Violation warning logged"
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/student/submit/:attemptId", authenticate, authorize(["STUDENT"]), async (req: any, res) => {
  try {
    const attemptId = req.params.attemptId;

    // Check if this is a Company Hiring submission in test_submissions
    const [subRows]: any = await db.query("SELECT id FROM test_submissions WHERE id = ? OR application_id = ?", [attemptId, attemptId]).catch(() => []);
    if (subRows && subRows.length > 0) {
      const companyResult = await submitAssessmentAttempt(attemptId, req.user, req.body.answers);
      return res.status(companyResult.status).json(companyResult.data);
    }

    // Check TPO attempt status
    const [attempts]: any = await db.query(`
      SELECT a.*, COALESCE(t.total_marks, 100) as max_marks
      FROM assessment_attempts a
      JOIN assessment_tests t ON a.assessment_id = t.id
      WHERE a.id = ?
    `, [attemptId]).catch(() => []);

    if (!attempts || attempts.length === 0) return res.status(404).json({ success: false, message: "Attempt not found" });

    const attempt = attempts[0];
    if (attempt.status === "COMPLETED") {
      return res.json({ success: true, message: "Attempt already finalized and evaluated" });
    }

    // Mark attempt as completed if it wasn't already force-violated
    const nextStatus = attempt.status === "VIOLATED" ? "VIOLATED" : "COMPLETED";

    // Evaluation Engine
    const [questions]: any = await db.query(
      "SELECT id, question_text, question_type, options_json, correct_answers_json, marks, negative_marks, explanation FROM assessment_questions WHERE assessment_id = ?",
      [attempt.assessment_id]
    );

    const [answers]: any = await db.query(
      "SELECT id, question_id, student_answer_json FROM assessment_answers WHERE attempt_id = ?",
      [attemptId]
    );

    const answersMap = new Map<number, any>();
    answers.forEach((ans: any) => {
      try {
        answersMap.set(ans.question_id, JSON.parse(ans.student_answer_json || "[]"));
      } catch (e) {
        answersMap.set(ans.question_id, []);
      }
    });

    let totalScore = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;
    const answersReview: any[] = [];

    for (const q of questions) {
      let correctAnswers: any[] = [];
      try {
        correctAnswers = JSON.parse(q.correct_answers_json || "[]");
      } catch (e) {}
      
      let options: string[] = [];
      try {
        options = JSON.parse(q.options_json || "[]");
      } catch (e) {}
      
      // If correct answers are numbers (indices), we need to map them to actual option text for MCQ/MULTIPLE_SELECT
      if (['MCQ', 'TRUE_FALSE', 'MULTIPLE_SELECT'].includes(q.question_type) && options.length > 0) {
        correctAnswers = correctAnswers.map(ans => {
          if (typeof ans === 'number' && options[ans] !== undefined) {
            return options[ans];
          } else if (typeof ans === 'string' && !isNaN(parseInt(ans)) && options[parseInt(ans)] !== undefined) {
            // It might be stored as a string number "0" instead of 0
            // But we should be careful not to match an option that happens to be a number string if they didn't mean index
            // Since our system saves index as number [0] mostly, we handle string numbers as indices if they map to options and are typical
            return options[parseInt(ans)];
          }
          return ans;
        });
      }

      const studentAns = answersMap.get(q.id);

      if (!studentAns || studentAns.length === 0) {
        skippedCount++;
        answersReview.push({
          question_text: q.question_text,
          is_correct: false,
          student_answer: "Skipped",
          correct_answer: correctAnswers.join(", "),
          explanation: q.explanation || ""
        });
        continue;
      }

      // Check correctness
      let isCorrect = false;

      if (q.question_type === "MCQ" || q.question_type === "TRUE_FALSE") {
        isCorrect = studentAns[0] === correctAnswers[0];
      } else if (q.question_type === "MULTIPLE_SELECT") {
        const setCorrect = new Set(correctAnswers);
        const setStudent = new Set(studentAns);
        isCorrect = setCorrect.size === setStudent.size && [...setCorrect].every(val => setStudent.has(val));
      } else {
        // Text/Short answer checks (trim and ignore case)
        const studentClean = studentAns[0]?.toString().trim().toLowerCase();
        const correctClean = correctAnswers.map((ans: any) => ans?.toString().trim().toLowerCase());
        isCorrect = correctClean.includes(studentClean);
      }

      const qMarks = parseInt(q.marks || 1);
      const qNeg = parseFloat(q.negative_marks || 0.0);

      let obtained = 0;
      if (isCorrect) {
        obtained = qMarks;
        totalScore += qMarks;
        correctCount++;
      } else {
        obtained = -qNeg;
        totalScore -= qNeg;
        wrongCount++;
      }

      answersReview.push({
        question_text: q.question_text,
        is_correct: isCorrect,
        student_answer: studentAns.join(", "),
        correct_answer: correctAnswers.join(", "),
        explanation: q.explanation || ""
      });

      // Save marks obtained for the answer record
      await db.query(`
        UPDATE assessment_answers SET
          is_correct = ?,
          marks_obtained = ?
        WHERE attempt_id = ? AND question_id = ?
      `, [isCorrect ? 1 : 0, obtained, attemptId, q.id]);
    }

    if (totalScore < 0) totalScore = 0;

    const percentage = attempt.max_marks > 0 ? (totalScore / attempt.max_marks) * 100 : 0;
    const isPassed = totalScore >= attempt.passing_marks ? 1 : 0;

    // Calculate time taken
    const startTime = new Date(attempt.started_at);
    const endTime = new Date();
    const timeTakenSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

    // Update attempt metrics
    await db.query(`
      UPDATE assessment_attempts SET
        status = ?,
        score = ?,
        percentage = ?,
        is_passed = ?,
        submitted_at = ?,
        total_time_taken_seconds = ?
      WHERE id = ?
    `, [nextStatus, totalScore, percentage, isPassed, endTime, timeTakenSeconds, attemptId]);

    // Construct a custom report
    const accuracy = (correctCount + wrongCount) > 0 ? (correctCount / (correctCount + wrongCount)) * 100 : 0;
    const reportData = {
      score: totalScore,
      max_marks: attempt.max_marks,
      percentage: Math.round(percentage),
      correctCount,
      correct_count: correctCount, // Frontend compatibility
      wrongCount,
      skippedCount,
      accuracy: Math.round(accuracy),
      timeTakenSeconds,
      status: nextStatus,
      isPassed,
      passed: isPassed === 1, // Frontend compatibility
      answers_review: answersReview
    };

    await db.query(`
      INSERT INTO assessment_reports (assessment_id, student_user_id, report_json)
      VALUES (?, ?, ?)
    `, [attempt.assessment_id, req.user.userId, JSON.stringify(reportData)]);

    res.json({
      success: true,
      message: "Assessment evaluation complete",
      report: reportData
    });
  } catch (error: any) {
    console.error("Submission Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/student/report/:testId", authenticate, authorize(["STUDENT"]), async (req: any, res) => {
  try {
    const testId = req.params.testId;
    const [reports]: any = await db.query(
      "SELECT report_json FROM assessment_reports WHERE assessment_id = ? AND student_user_id = ? ORDER BY id DESC LIMIT 1",
      [testId, req.user.userId]
    );

    if (reports.length === 0) {
      return res.status(404).json({ success: false, message: "No scorecard report was found for this assessment." });
    }

    const reportData = JSON.parse(reports[0].report_json || "{}");
    res.json({
      success: true,
      report: reportData
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 7. Live Test Monitoring for TPOs
// -------------------------------------------------------------
router.get("/monitor/:testId", authenticate, authorize(["TPO"]), async (req: any, res) => {
  try {
    const testId = req.params.testId;

    const [testInfo]: any = await db.query(
      "SELECT title FROM assessment_tests WHERE id = ?",
      [testId]
    );
    const testTitle = testInfo[0]?.title || "Assessment Test";

    const [totalQResult]: any = await db.query(
      "SELECT COUNT(*) as count FROM assessment_questions WHERE assessment_id = ?",
      [testId]
    );
    const totalQuestions = totalQResult[0]?.count || 0;

    const [attempts]: any = await db.query(`
      SELECT a.id, a.status, a.started_at, a.submitted_at, a.score, a.percentage, a.total_time_taken_seconds,
             u.email, sp.full_name, sp.batch,
             t.max_marks
      FROM assessment_attempts a
      JOIN users u ON a.student_user_id = u.id
      JOIN student_profiles sp ON u.id = sp.user_id
      JOIN assessment_tests t ON a.assessment_id = t.id
      WHERE a.assessment_id = ?
      ORDER BY a.started_at DESC
    `, [testId]);

    for (const a of attempts) {
      // Find violations count
      const [violations]: any = await db.query(
        "SELECT violation_type, warning_count FROM assessment_violations WHERE attempt_id = ?",
        [a.id]
      );
      a.violations = violations;
      a.warning_count = violations.reduce((acc: number, curr: any) => acc + curr.warning_count, 0);

      // Find location capture info
      const [loc]: any = await db.query(
        "SELECT ip_address, browser, device, latitude, longitude, location_address, captured_at FROM assessment_location WHERE attempt_id = ?",
        [a.id]
      );
      a.location = loc[0] || null;

      // Find answers count
      const [answersCountResult]: any = await db.query(
        "SELECT COUNT(*) as count FROM assessment_answers WHERE attempt_id = ?",
        [a.id]
      );
      const answeredCount = answersCountResult[0]?.count || 0;

      a.total_questions = totalQuestions;
      a.answered_questions = answeredCount;
      a.progress = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
    }

    res.json({
      success: true,
      title: testTitle,
      students: attempts
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 8. TPO Reports and Analytics
// -------------------------------------------------------------
router.get("/analytics", authenticate, authorize(["TPO"]), async (req: any, res) => {
  try {
    const context = await getTPOContext(req.user.userId);
    if (!context) return res.status(404).json({ success: false, message: "TPO not found" });

    // Summary of metrics
    const [metrics]: any = await db.query(`
      SELECT 
        COUNT(DISTINCT t.id) as totalTests,
        SUM(CASE WHEN t.status = 'PUBLISHED' THEN 1 ELSE 0 END) as liveTests,
        SUM(CASE WHEN t.status = 'COMPLETED' THEN 1 ELSE 0 END) as completedTests,
        SUM(CASE WHEN t.status = 'DRAFT' THEN 1 ELSE 0 END) as draftTests
      FROM assessment_tests t
      WHERE t.tpo_id = ?
    `, [context.tpoId]);

    const [attemptsMetrics]: any = await db.query(`
      SELECT 
        COUNT(DISTINCT a.id) as studentsAppeared,
        AVG(a.score) as avgScore,
        MAX(a.score) as highestScore,
        MIN(a.score) as lowestScore,
        AVG(a.percentage) as avgPercentage
      FROM assessment_attempts a
      JOIN assessment_tests t ON a.assessment_id = t.id
      WHERE t.tpo_id = ? AND a.status != 'STARTED'
    `, [context.tpoId]);

    const [qBankSize]: any = await db.query(
      "SELECT COUNT(*) as qBankSize FROM question_bank WHERE tpo_id = ?",
      [context.tpoId]
    );

    // Batch Wise Performance Comparison
    const [batchPerf]: any = await db.query(`
      SELECT sp.batch, AVG(a.score) as avgScore, COUNT(a.id) as totalAppeared
      FROM assessment_attempts a
      JOIN users u ON a.student_user_id = u.id
      JOIN student_profiles sp ON u.id = sp.user_id
      JOIN assessment_tests t ON a.assessment_id = t.id
      WHERE t.tpo_id = ? AND a.status != 'STARTED'
      GROUP BY sp.batch
    `, [context.tpoId]);

    // Recent Activites
    const [recentLogs]: any = await db.query(`
      SELECT a.id, a.status, a.score, a.percentage, a.submitted_at, sp.full_name, t.title
      FROM assessment_attempts a
      JOIN users u ON a.student_user_id = u.id
      JOIN student_profiles sp ON u.id = sp.user_id
      JOIN assessment_tests t ON a.assessment_id = t.id
      WHERE t.tpo_id = ?
      ORDER BY a.submitted_at DESC, a.started_at DESC
      LIMIT 10
    `, [context.tpoId]);

    // Top performers
    const [topPerformers]: any = await db.query(`
      SELECT sp.full_name, sp.batch, AVG(a.percentage) as avgPercentage, SUM(a.score) as totalScore
      FROM assessment_attempts a
      JOIN users u ON a.student_user_id = u.id
      JOIN student_profiles sp ON u.id = sp.user_id
      JOIN assessment_tests t ON a.assessment_id = t.id
      WHERE t.tpo_id = ? AND a.status != 'STARTED'
      GROUP BY u.id, sp.full_name, sp.batch
      ORDER BY avgPercentage DESC, totalScore DESC
      LIMIT 10
    `, [context.tpoId]);

    // Low Performers (At Risk)
    const [weakStudents]: any = await db.query(`
      SELECT sp.full_name, sp.batch, AVG(a.percentage) as avgPercentage, SUM(a.score) as totalScore
      FROM assessment_attempts a
      JOIN users u ON a.student_user_id = u.id
      JOIN student_profiles sp ON u.id = sp.user_id
      JOIN assessment_tests t ON a.assessment_id = t.id
      WHERE t.tpo_id = ? AND a.status != 'STARTED'
      GROUP BY u.id, sp.full_name, sp.batch
      ORDER BY avgPercentage ASC
      LIMIT 10
    `, [context.tpoId]);

    res.json({
      success: true,
      metrics: {
        totalTests: metrics[0]?.totalTests || 0,
        liveTests: metrics[0]?.liveTests || 0,
        completedTests: metrics[0]?.completedTests || 0,
        draftTests: metrics[0]?.draftTests || 0,
        studentsAppeared: attemptsMetrics[0]?.studentsAppeared || 0,
        avgScore: parseFloat((attemptsMetrics[0]?.avgScore || 0).toFixed(2)),
        highestScore: attemptsMetrics[0]?.highestScore || 0,
        lowestScore: attemptsMetrics[0]?.lowestScore || 0,
        avgPercentage: parseFloat((attemptsMetrics[0]?.avgPercentage || 0).toFixed(2)),
        qBankSize: qBankSize[0]?.qBankSize || 0
      },
      batchPerformance: batchPerf,
      recentLogs,
      topPerformers,
      weakStudents
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 9. AI Smart Recommendations & Insights using Gemini
// -------------------------------------------------------------
router.get("/ai-insights", authenticate, authorize(["TPO"]), async (req: any, res) => {
  try {
    const context = await getTPOContext(req.user.userId);
    if (!context) return res.status(404).json({ success: false, message: "TPO not found" });

    // Fetch summaries of student performance
    const [avgScores]: any = await db.query(`
      SELECT q.topic, AVG(CASE WHEN ans.is_correct = 1 THEN 1 ELSE 0 END) * 100 as accuracy
      FROM assessment_answers ans
      JOIN assessment_questions q ON ans.question_id = q.id
      JOIN assessment_tests t ON q.assessment_id = t.id
      WHERE t.tpo_id = ?
      GROUP BY q.topic
    `, [context.tpoId]);

    const [violStats]: any = await db.query(`
      SELECT v.violation_type, COUNT(v.id) as count
      FROM assessment_violations v
      JOIN assessment_attempts a ON v.attempt_id = a.id
      JOIN assessment_tests t ON a.assessment_id = t.id
      WHERE t.tpo_id = ?
      GROUP BY v.violation_type
    `, [context.tpoId]);

    const topicAccuracyText = avgScores.map((s: any) => `${s.topic}: ${parseFloat(s.accuracy || 0).toFixed(1)}% accuracy`).join(", ");
    const violationText = violStats.map((v: any) => `${v.violation_type}: ${v.count} total occurrences`).join(", ");

    const prompt = `Analyze this college placement training performance overview and provide strategic placement training insights:
- Performance by Topic: ${topicAccuracyText || "No data yet"}
- Test Security Violations: ${violationText || "No security logs recorded"}

Format the response strictly as a JSON object with these fields:
- weakTopics: array of strings (topics with low accuracy)
- commonMistakes: array of strings (conceptual hurdles or issues)
- studentRiskAnalysis: string (strategic insight on students at risk of underperforming)
- recommendedTraining: array of strings (workshops, practice schedules, or interventions)
- suggestedPracticeTests: array of strings (specific test focus areas)
Do not include any formatting other than pure JSON.`;

    const modelName = "gemini-2.5-flash";
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const parsed = JSON.parse((response.text || "{}").trim());
    res.json({
      success: true,
      insights: parsed
    });
  } catch (error: any) {
    console.error("AI Insights Error:", error);
    res.status(500).json({ success: false, message: "Failed to generate AI insights: " + error.message });
  }
});

// -------------------------------------------------------------
// 10. TPO Detailed Test Reports
// -------------------------------------------------------------
router.get("/tpo/test-report/:testId", authenticate, authorize(["TPO"]), async (req: any, res) => {
  try {
    const testId = req.params.testId;

    // 1. Fetch test info
    const [testInfo]: any = await db.query(
      "SELECT id, title, category, max_marks, passing_marks, duration_minutes, status, created_at FROM assessment_tests WHERE id = ?",
      [testId]
    );

    if (testInfo.length === 0) {
      return res.status(404).json({ success: false, message: "Assessment test not found" });
    }
    const test = testInfo[0];

    // 2. Fetch assigned batches
    const [batches]: any = await db.query(
      "SELECT batch_name FROM assessment_assignments WHERE assessment_id = ?",
      [testId]
    );

    // 3. Fetch all attempts for this test
    const [attempts]: any = await db.query(`
      SELECT a.id as attempt_id, a.status, a.started_at, a.submitted_at, a.score, a.percentage, a.total_time_taken_seconds,
             u.id as student_user_id, u.email, sp.full_name, sp.batch, sp.aadhar_or_college_id as roll_no,
             (CASE WHEN a.score >= ? THEN 1 ELSE 0 END) as passed
      FROM assessment_attempts a
      JOIN users u ON a.student_user_id = u.id
      JOIN student_profiles sp ON u.id = sp.user_id
      WHERE a.assessment_id = ?
      ORDER BY a.score DESC, sp.full_name ASC
    `, [test.passing_marks, testId]);

    // 4. Fetch warnings count for each attempt in one go
    const [violationsResult]: any = await db.query(`
      SELECT a.id as attempt_id, COALESCE(SUM(v.warning_count), 0) as warning_count
      FROM assessment_attempts a
      LEFT JOIN assessment_violations v ON a.id = v.attempt_id
      WHERE a.assessment_id = ?
      GROUP BY a.id
    `, [testId]);

    const violationsMap = new Map();
    violationsResult.forEach((v: any) => {
      violationsMap.set(v.attempt_id, Number(v.warning_count));
    });

    // 5. Compile collective metrics
    let totalAppeared = 0;
    let passedCount = 0;
    let highestScore = 0;
    let lowestScore = attempts.length > 0 ? 1000000 : 0;
    let sumScore = 0;
    let sumPercentage = 0;
    let sumTimeTaken = 0;
    let totalWarnings = 0;

    const completedAttempts = attempts.filter((a: any) => a.status === "COMPLETED" || a.status === "VIOLATED" || a.status === "SUBMITTED");

    completedAttempts.forEach((a: any) => {
      totalAppeared++;
      const score = Number(a.score || 0);
      const pct = Number(a.percentage || 0);
      sumScore += score;
      sumPercentage += pct;
      sumTimeTaken += Number(a.total_time_taken_seconds || 0);

      if (score >= Number(test.passing_marks)) {
        passedCount++;
      }
      if (score > highestScore) highestScore = score;
      if (score < lowestScore) lowestScore = score;

      const warns = violationsMap.get(a.attempt_id) || 0;
      a.warning_count = warns;
      totalWarnings += warns;
    });

    if (lowestScore === 1000000) lowestScore = 0;

    const avgScore = totalAppeared > 0 ? parseFloat((sumScore / totalAppeared).toFixed(2)) : 0;
    const avgPercentage = totalAppeared > 0 ? parseFloat((sumPercentage / totalAppeared).toFixed(2)) : 0;
    const passRate = totalAppeared > 0 ? parseFloat(((passedCount / totalAppeared) * 100).toFixed(2)) : 0;
    const avgTimeTakenSeconds = totalAppeared > 0 ? Math.round(sumTimeTaken / totalAppeared) : 0;

    // Compile Score Distribution for charts
    let range_0_20 = 0;
    let range_21_40 = 0;
    let range_41_60 = 0;
    let range_61_80 = 0;
    let range_81_100 = 0;

    completedAttempts.forEach((a: any) => {
      const pct = Number(a.percentage || 0);
      if (pct >= 0 && pct <= 20) range_0_20++;
      else if (pct > 20 && pct <= 40) range_21_40++;
      else if (pct > 40 && pct <= 60) range_41_60++;
      else if (pct > 60 && pct <= 80) range_61_80++;
      else if (pct > 80 && pct <= 100) range_81_100++;
    });

    const scoreDistribution = [
      { range: "0-20%", count: range_0_20 },
      { range: "21-40%", count: range_21_40 },
      { range: "41-60%", count: range_41_60 },
      { range: "61-80%", count: range_61_80 },
      { range: "81-100%", count: range_81_100 },
    ];

    // Compile Batch-wise Comparison
    const batchStatsMap = new Map();
    completedAttempts.forEach((a: any) => {
      const bName = a.batch || "Unknown";
      if (!batchStatsMap.has(bName)) {
        batchStatsMap.set(bName, { batch: bName, sumScore: 0, count: 0 });
      }
      const current = batchStatsMap.get(bName);
      current.sumScore += Number(a.score || 0);
      current.count += 1;
    });

    const batchPerformance = Array.from(batchStatsMap.values()).map((b: any) => ({
      batch: b.batch,
      avgScore: parseFloat((b.sumScore / b.count).toFixed(2)),
      totalAppeared: b.count
    }));

    // Attach warning count to remaining/ongoing students
    attempts.forEach((a: any) => {
      if (a.warning_count === undefined) {
        a.warning_count = violationsMap.get(a.attempt_id) || 0;
      }
    });

    res.json({
      success: true,
      test,
      batches: batches.map((b: any) => b.batch_name),
      stats: {
        totalAppeared,
        passedCount,
        failedCount: totalAppeared - passedCount,
        passRate,
        avgScore,
        avgPercentage,
        highestScore,
        lowestScore,
        avgTimeTakenSeconds,
        totalWarnings
      },
      scoreDistribution,
      batchPerformance,
      students: attempts
    });
  } catch (error: any) {
    console.error("Error fetching TPO test report:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/tpo/student-attempt-report/:attemptId", authenticate, authorize(["TPO"]), async (req: any, res) => {
  try {
    const attemptId = req.params.attemptId;

    // 1. Fetch attempt and test metadata
    const [attempts]: any = await db.query(`
      SELECT a.id as attempt_id, a.assessment_id, a.status, a.started_at, a.submitted_at, a.score, a.percentage, a.total_time_taken_seconds,
             t.title as test_title, t.max_marks, t.passing_marks, t.category, t.duration_minutes,
             u.id as student_user_id, u.email, sp.full_name, sp.batch, sp.aadhar_or_college_id as roll_no
      FROM assessment_attempts a
      JOIN users u ON a.student_user_id = u.id
      JOIN student_profiles sp ON u.id = sp.user_id
      JOIN assessment_tests t ON a.assessment_id = t.id
      WHERE a.id = ?
    `, [attemptId]);

    if (attempts.length === 0) {
      return res.status(404).json({ success: false, message: "Attempt details not found" });
    }
    const attempt = attempts[0];

    // 2. Fetch proctor violations
    const [violations]: any = await db.query(
      "SELECT violation_type, warning_count, created_at as captured_at FROM assessment_violations WHERE attempt_id = ?",
      [attemptId]
    );

    // 3. Fetch location diagnostics
    const [locResult]: any = await db.query(
      "SELECT ip_address, browser, device, latitude, longitude, location_address, captured_at FROM assessment_location WHERE attempt_id = ?",
      [attemptId]
    );
    const location = locResult[0] || null;

    // 4. Fetch or construct scorecard answers review
    const [reports]: any = await db.query(
      "SELECT report_json FROM assessment_reports WHERE assessment_id = ? AND student_user_id = ? ORDER BY id DESC LIMIT 1",
      [attempt.assessment_id, attempt.student_user_id]
    );

    let answersReview: any[] = [];
    if (reports.length > 0) {
      try {
        const reportData = JSON.parse(reports[0].report_json || "{}");
        answersReview = reportData.answers_review || [];
      } catch (e) {}
    }

    // Dynamic reconstruction fallback if report doesn't exist or is empty
    if (answersReview.length === 0) {
      const [questions]: any = await db.query(`
        SELECT id, question_text, question_type, correct_answers_json, marks, explanation, topic 
        FROM assessment_questions 
        WHERE assessment_id = ?
      `, [attempt.assessment_id]);

      const [answers]: any = await db.query(`
        SELECT question_id, student_answer_json, is_correct 
        FROM assessment_answers 
        WHERE attempt_id = ?
      `, [attemptId]);

      const answersMap = new Map();
      answers.forEach((ans: any) => {
        try {
          answersMap.set(ans.question_id, {
            student_answer: JSON.parse(ans.student_answer_json || "[]"),
            is_correct: ans.is_correct === 1
          });
        } catch (e) {
          answersMap.set(ans.question_id, { student_answer: [], is_correct: false });
        }
      });

      answersReview = questions.map((q: any) => {
        let correctAnswers: string[] = [];
        try {
          correctAnswers = JSON.parse(q.correct_answers_json || "[]");
        } catch (e) {}

        const ansData = answersMap.get(q.id);
        const hasAnswered = ansData !== undefined;
        const studentAnsArray = hasAnswered ? ansData.student_answer : [];
        const isCorrect = hasAnswered ? ansData.is_correct : false;

        return {
          question_text: q.question_text,
          topic: q.topic || "General Concepts",
          marks: q.marks,
          is_correct: isCorrect,
          student_answer: studentAnsArray.length > 0 ? studentAnsArray.join(", ") : "Skipped",
          correct_answer: correctAnswers.join(", "),
          explanation: q.explanation || "No explanation provided."
        };
      });
    }

    // 5. Generate dynamic strategic feedback using Gemini AI
    let aiFeedback = {
      strength: "The candidate shows basic comprehension but would benefit from deep-diving into practical problem solving.",
      areaOfImprovement: "Improve accuracy under timed constraints and focus on core syntax or structural concepts.",
      actionPlan: [
        "Revise the underlying theory for questions missed in this test.",
        "Take daily focused topic-wise micro-quizzes.",
        "Practice building small proof-of-concept projects to consolidate learning."
      ]
    };

    try {
      const topicStats: any = {};
      answersReview.forEach((item: any) => {
        const top = item.topic || "General Concepts";
        if (!topicStats[top]) {
          topicStats[top] = { correct: 0, total: 0 };
        }
        topicStats[top].total++;
        if (item.is_correct) {
          topicStats[top].correct++;
        }
      });

      const topicPerfText = Object.entries(topicStats).map(([topic, stat]: any) => {
        const pct = ((stat.correct / stat.total) * 100).toFixed(1);
        return `${topic}: ${stat.correct}/${stat.total} (${pct}%)`;
      }).join(", ");

      const prompt = `Analyze this student's assessment attempt:
Test Title: "${attempt.test_title}" (${attempt.category})
Score: ${attempt.score} / ${attempt.max_marks} (${attempt.percentage}%)
Passing Marks: ${attempt.passing_marks}
Time Taken: ${Math.round(attempt.total_time_taken_seconds / 60)} minutes
Proctoring Warnings: ${violations.length} total warnings
Topic Performance Breakdown: ${topicPerfText || "N/A"}

Please generate personalized strategic tutoring feedback for this student. Format your response STRICTLY as a JSON object with these fields:
- strength: string (1-2 encouraging sentences outlining what topics they excelled in or what they did right)
- areaOfImprovement: string (1-2 actionable sentences focusing on topics they struggled with or speed/accuracy concerns)
- actionPlan: array of strings (exactly 3 short actionable milestones/recommendations to help this student excel)

No extra characters, no markdown codeblock tags (like \`\`\`json), just the raw JSON object itself.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      if (response && response.text) {
        const parsed = JSON.parse(response.text.trim());
        if (parsed.strength && parsed.areaOfImprovement && parsed.actionPlan) {
          aiFeedback = parsed;
        }
      }
    } catch (e) {
      console.error("Failed to generate AI feedback for individual student:", e);
    }

    res.json({
      success: true,
      attempt,
      violations,
      location,
      answersReview,
      aiFeedback
    });
  } catch (error: any) {
    console.error("Error fetching student detailed report:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 4. Company & Student Assessment Workflow Endpoints
// -------------------------------------------------------------

// Helper to resolve company ID for user
async function resolveCompanyIdForUser(user: any) {
  if (!user) return null;
  if (user.role === "COMPANY" || user.role === "COMPANY_HR" || user.role === "COMPANY_SUB_HR" || user.role === "COMPANY_ADMIN") {
    const [profiles]: any = await db.query("SELECT id FROM company_profiles WHERE user_id = ?", [user.id || user.userId]);
    if (profiles.length > 0) return profiles[0].id;

    const [hrProfiles]: any = await db.query("SELECT company_id FROM company_hr_profiles WHERE user_id = ?", [user.id || user.userId]);
    if (hrProfiles.length > 0) return hrProfiles[0].company_id;
  }
  return null;
}

// GET /api/assessments/company/tests
router.get("/company/tests", authenticate, async (req: any, res) => {
  try {
    const companyId = await resolveCompanyIdForUser(req.user);
    if (!companyId) {
      return res.json({ success: true, data: [] });
    }

    const [profiles]: any = await db.query("SELECT company_name FROM company_profiles WHERE id = ?", [companyId]);
    const companyName = profiles[0]?.company_name || "Company";

    // Query definitions from company_assessment_definitions
    const [defs]: any = await db.query(`
      SELECT * FROM company_assessment_definitions
      WHERE company_id = ?
      ORDER BY id DESC
    `, [companyId]);

    const results: any[] = [];

    for (const def of defs) {
      const qs = typeof def.questions_json === "string" ? JSON.parse(def.questions_json) : (def.questions_json || []);

      // Find assignments
      const [assignments]: any = await db.query(`
        SELECT caa.*, j.title as job_title, js.stage_name
        FROM company_assessment_assignments caa
        JOIN jobs j ON caa.job_id = j.id
        LEFT JOIN job_stages js ON caa.stage_id = js.id
        WHERE caa.definition_version_id = ? AND caa.status = 'ACTIVE'
      `, [def.id]);

      let submissionsCount = 0;
      let avgScore = 0;
      let assignedCount = 0;

      if (assignments.length > 0) {
        const assignmentIds = assignments.map((a: any) => a.id);
        const placeholders = assignmentIds.map(() => "?").join(",");

        const [subStats]: any = await db.query(`
          SELECT COUNT(*) as count, AVG(score) as avg_score
          FROM test_submissions
          WHERE assignment_id IN (${placeholders})
        `, assignmentIds);
        submissionsCount = subStats[0]?.count || 0;
        avgScore = Math.round(subStats[0]?.avg_score || 0);

        const jobIds = [...new Set(assignments.map((a: any) => a.job_id))];
        const jobPlaceholders = jobIds.map(() => "?").join(",");
        const [appStats]: any = await db.query(`
          SELECT COUNT(*) as count FROM job_applications
          WHERE job_id IN (${jobPlaceholders}) AND status != 'REJECTED' AND status != 'CANCELLED'
        `, jobIds);
        assignedCount = appStats[0]?.count || 0;
      }

      const mappedQuestions = qs.map((q: any, i: number) => ({
        id: q.id || `q-${def.id}-${i}`,
        type: q.type || 'MCQ',
        questionText: q.questionText || q.question || q.text || '',
        options: Array.isArray(q.options) ? q.options : (q.options_json || ['', '', '', '']),
        correctOption: q.correctOption !== undefined ? Number(q.correctOption) : 0,
        points: Number(q.points || q.marks) || 10,
        difficulty: q.difficulty || 'MEDIUM'
      }));

      const totalMarks = def.total_marks || mappedQuestions.reduce((acc: number, q: any) => acc + (q.points || 10), 0) || 100;
      const primaryJobTitle = assignments.length > 0 ? assignments[0].job_title : "Unassigned";

      results.push({
        id: String(def.id),
        job_id: assignments.length > 0 ? assignments[0].job_id : null,
        job_title: primaryJobTitle,
        title: def.title,
        description: def.description || '',
        created_by: companyName,
        created_date: def.created_at ? new Date(def.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        questions_count: qs.length,
        duration: def.duration_minutes || 30,
        cutoff_score: def.cutoff_score !== undefined ? Number(def.cutoff_score) : 40,
        total_marks: totalMarks,
        status: def.status || 'DRAFT',
        version: def.version || 1,
        assigned_count: assignedCount,
        submissions_count: submissionsCount,
        average_score: avgScore,
        questions: mappedQuestions,
        instructions: "Please answer all questions carefully.",
        assignments: assignments.map((a: any) => ({
          id: a.id,
          jobId: a.job_id,
          jobTitle: a.job_title,
          stageId: a.stage_id,
          stageName: a.stage_name,
          cutoffScore: Number(a.cutoff_score)
        }))
      });
    }

    res.json({ success: true, data: results });
  } catch (error: any) {
    console.error("Error in GET /api/assessments/company/tests:", error);
    res.status(500).json({ success: false, message: "Failed to fetch company tests" });
  }
});

// GET /api/assessments/company/history
router.get("/company/history", authenticate, async (req: any, res) => {
  try {
    const companyId = await resolveCompanyIdForUser(req.user);
    if (!companyId) {
      return res.json({ success: true, data: [], pagination: { total: 0, page: 1, limit: 20 } });
    }

    const { jobId, searchQuery, status, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(String(page)));
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit))));
    const offset = (pageNum - 1) * limitNum;

    let sql = `
      SELECT 
        ts.id as attempt_id,
        ts.job_id,
        ts.application_id,
        ts.student_id,
        ts.score,
        ts.total_marks,
        ts.percentage,
        ts.passed,
        ts.cutoff_score,
        ts.violations_count,
        ts.status as submission_status,
        ts.submitted_at,
        ts.submitted_at as started_at,
        ts.assessment_version,
        sp.full_name as candidate_name,
        u.email as candidate_email,
        j.title as job_title,
        cad.id as definition_id,
        cad.title as test_title,
        ts.questions_json
      FROM test_submissions ts
      JOIN company_assessment_assignments caa ON ts.assignment_id = caa.id
      JOIN company_assessment_definitions cad ON ts.assessment_version_id = cad.id
      JOIN job_applications a ON ts.application_id = a.id
      JOIN jobs j ON caa.job_id = j.id
      JOIN student_profiles sp ON ts.student_id = sp.id
      JOIN users u ON sp.user_id = u.id
      WHERE caa.company_id = ?
    `;

    const params: any[] = [companyId];

    if (jobId && jobId !== 'all') {
      sql += ` AND ts.job_id = ?`;
      params.push(Number(jobId));
    }

    if (status && status !== 'all') {
      if (status === 'passed') {
        sql += ` AND (ts.passed = 1 OR ts.score >= ts.cutoff_score)`;
      } else if (status === 'failed') {
        sql += ` AND (ts.passed = 0 AND ts.score < ts.cutoff_score)`;
      }
    }

    if (searchQuery) {
      sql += ` AND (sp.full_name LIKE ? OR u.email LIKE ? OR j.title LIKE ?)`;
      const q = `%${searchQuery}%`;
      params.push(q, q, q);
    }

    sql += ` ORDER BY ts.submitted_at DESC LIMIT ? OFFSET ?`;
    params.push(limitNum, offset);

    const [rows]: any = await db.query(sql, params);

    const attemptsList = await Promise.all((rows || []).map(async (row: any) => {
      const qs = typeof row.questions_json === "string" ? JSON.parse(row.questions_json) : (row.questions_json || []);
      const testTitle = row.test_title || `${row.job_title} Assessment`;
      const totalScore = row.total_marks || (qs.length * 10) || 100;
      const cutoff = row.cutoff_score !== undefined ? Number(row.cutoff_score) : 40;
      const isPassed = row.passed === 1 || row.score >= cutoff;

      let eventCount = row.violations_count || 0;
      try {
        const [evRows]: any = await db.query("SELECT COUNT(*) as count FROM test_submission_events WHERE attempt_id = ?", [row.attempt_id]);
        if (evRows.length > 0 && evRows[0].count > 0) {
          eventCount = evRows[0].count;
        }
      } catch (e) {}

      return {
        id: String(row.attempt_id),
        attemptId: String(row.attempt_id),
        applicationId: row.application_id,
        jobId: row.job_id,
        jobTitle: row.job_title,
        candidateName: row.candidate_name,
        candidateEmail: row.candidate_email,
        assessmentTitle: testTitle,
        version: row.assessment_version || 1,
        score: Math.round(row.score || 0),
        totalMarks: totalScore,
        percentage: Math.round(row.percentage || ((row.score / totalScore) * 100) || 0),
        cutoffScore: cutoff,
        status: isPassed ? 'Passed' : 'Failed',
        isPassed,
        violationsCount: eventCount,
        integrityReviewFlag: eventCount > 2,
        startedAt: row.started_at ? new Date(row.started_at).toLocaleString() : new Date().toLocaleString(),
        completedAt: row.submitted_at ? new Date(row.submitted_at).toLocaleString() : new Date().toLocaleString()
      };
    }));

    res.json({
      success: true,
      data: attemptsList,
      pagination: {
        total: attemptsList.length,
        page: pageNum,
        limit: limitNum
      }
    });
  } catch (error: any) {
    console.error("Error in GET /api/assessments/company/history:", error);
    res.status(500).json({ success: false, message: "Failed to fetch assessment history" });
  }
});

// GET /api/assessments/company/attempts (Alias)
router.get("/company/attempts", authenticate, async (req: any, res) => {
  return res.redirect(307, "/api/assessments/company/history");
});

function computeAssessmentCreateHash(body: any): string {
  const normalizedQuestions = (Array.isArray(body.questions) ? body.questions : []).map((q: any) => ({
    questionText: (q.questionText || q.question || q.text || '').trim(),
    options: (Array.isArray(q.options) ? q.options : []).map((o: any) => String(o).trim()),
    correctOption: Number(q.correctOption),
    points: Number(q.points || q.marks) || 10
  }));

  const payload = {
    title: (body.title || '').trim(),
    description: (body.description || '').trim(),
    duration: Number(body.duration || body.duration_minutes) || 30,
    questions: normalizedQuestions
  };

  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

// POST /api/assessments/company/create
router.post("/company/create", authenticate, async (req: any, res) => {
  const companyId = await resolveCompanyIdForUser(req.user);
  if (!companyId) {
    return res.status(403).json({ success: false, message: "Company profile not found" });
  }

  try {
    const {
      jobId, job_id, stageId, stage_id, cutoffScore, cutoff_score,
      attemptsAllowed, availabilityStart, availabilityEnd,
      title, description, duration = 30, questions
    } = req.body;

    // Reject assignment fields in creation
    if (
      jobId !== undefined || job_id !== undefined ||
      stageId !== undefined || stage_id !== undefined ||
      cutoffScore !== undefined || cutoff_score !== undefined ||
      attemptsAllowed !== undefined ||
      availabilityStart !== undefined || availabilityEnd !== undefined
    ) {
      return res.status(400).json({
        success: false,
        code: "ASSIGNMENT_FIELDS_NOT_ALLOWED",
        message: "Job/stage assignment fields are not permitted during assessment creation. Create the Draft Assessment first, publish it, and assign it through the Assessment assignment endpoint."
      });
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: "At least one question is required" });
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const qText = q.questionText || q.question || q.text || '';
      if (!qText.trim()) {
        return res.status(400).json({ success: false, message: `Question ${i + 1} text cannot be empty` });
      }
      const opts = Array.isArray(q.options) ? q.options : [];
      if (opts.length !== 4 || opts.some((o: any) => typeof o !== 'string' || !o.trim())) {
        return res.status(400).json({ success: false, message: `Question ${i + 1} must have 4 non-empty options` });
      }
      if (q.correctOption === undefined || q.correctOption === null) {
        return res.status(400).json({ success: false, message: `Question ${i + 1} requires correctOption` });
      }
      const corr = Number(q.correctOption);
      if (isNaN(corr) || corr < 0 || corr > 3) {
        return res.status(400).json({ success: false, message: `Question ${i + 1} correctOption must be between 0 and 3` });
      }
      const pts = Number(q.points || q.marks || 10);
      if (isNaN(pts) || pts <= 0) {
        return res.status(400).json({ success: false, message: `Question ${i + 1} points must be greater than 0` });
      }
    }

    const totalScore = questions.reduce((sum: number, q: any) => sum + (Number(q.points || q.marks) || 10), 0);

    const idempotencyKey = req.headers['idempotency-key'] || req.body.clientRequestId || req.body.idempotencyKey;

    if (idempotencyKey) {
      const requestHash = computeAssessmentCreateHash(req.body);
      const [existingRows]: any = await db.query(
        "SELECT * FROM assessment_idempotency_requests WHERE company_id = ? AND operation = 'CREATE_ASSESSMENT' AND idempotency_key = ?",
        [companyId, idempotencyKey]
      );

      if (existingRows && existingRows.length > 0) {
        const existingRow = existingRows[0];
        if (existingRow.request_hash !== requestHash) {
          return res.status(409).json({
            success: false,
            code: "IDEMPOTENCY_KEY_REUSED",
            message: "Idempotency key reused with different request payload"
          });
        }
        if (existingRow.status === 'COMPLETED' && existingRow.response_json) {
          return res.status(201).json(typeof existingRow.response_json === 'string' ? JSON.parse(existingRow.response_json) : existingRow.response_json);
        }
      } else {
        try {
          await db.query(
            "INSERT INTO assessment_idempotency_requests (company_id, operation, idempotency_key, request_hash, status, locked_at) VALUES (?, 'CREATE_ASSESSMENT', ?, ?, 'PENDING', CURRENT_TIMESTAMP)",
            [companyId, idempotencyKey, requestHash]
          );
        } catch (err: any) {}
      }
    }

    const formattedQuestions = questions.map((q: any, i: number) => ({
      id: q.id || `q-${Date.now()}-${i}`,
      type: q.type || 'MCQ',
      questionText: (q.questionText || q.question || q.text || '').trim(),
      options: q.options.map((o: any) => String(o).trim()),
      correctOption: Number(q.correctOption),
      points: Number(q.points || q.marks) || 10,
      difficulty: q.difficulty || 'MEDIUM'
    }));

    const questionsJson = JSON.stringify(formattedQuestions);

    const responsePayload = await db.transaction(async (tx) => {
      const [insertRes]: any = await tx.query(`
        INSERT INTO company_assessment_definitions (company_id, title, description, questions_json, duration_minutes, cutoff_score, total_marks, version, status)
        VALUES (?, ?, ?, ?, ?, 40.00, ?, 1, 'DRAFT')
      `, [companyId, title || 'Draft Assessment', description || '', questionsJson, Number(duration), totalScore]);

      const newId = insertRes.insertId;

      return {
        success: true,
        message: "Assessment draft saved successfully!",
        data: {
          id: String(newId),
          title: title || 'Draft Assessment',
          description: description || '',
          questions_count: formattedQuestions.length,
          duration: Number(duration),
          cutoff_score: 40,
          total_marks: totalScore,
          status: 'DRAFT',
          version: 1,
          questions: formattedQuestions
        }
      };
    });

    if (idempotencyKey) {
      await db.query(
        "UPDATE assessment_idempotency_requests SET status = 'COMPLETED', assessment_id = ?, response_json = ?, completed_at = CURRENT_TIMESTAMP WHERE company_id = ? AND operation = 'CREATE_ASSESSMENT' AND idempotency_key = ?",
        [responsePayload.data.id, JSON.stringify(responsePayload), companyId, idempotencyKey]
      );
    }

    res.status(201).json(responsePayload);
  } catch (error: any) {
    console.error("Error in POST /api/assessments/company/create:", error);
    if (error.code === 'ER_NO_SUCH_TABLE' || error.message?.includes("doesn't exist") || error.message?.includes("no such table")) {
      return res.status(503).json({
        success: false,
        code: "ASSESSMENT_SCHEMA_NOT_READY",
        message: "Assessment system database table is missing or migration is pending."
      });
    }
    res.status(500).json({ success: false, message: error.message || "Failed to create assessment" });
  }
});

// PUT /api/assessments/company/tests/:id (Edit definition)
router.put("/company/tests/:id", authenticate, async (req: any, res) => {
  try {
    const companyId = await resolveCompanyIdForUser(req.user);
    if (!companyId) {
      return res.status(403).json({ success: false, message: "Company profile not found" });
    }

    const definitionId = req.params.id;
    const { title, description, duration, questions } = req.body;

    const [defs]: any = await db.query("SELECT * FROM company_assessment_definitions WHERE id = ?", [definitionId]);
    if (defs.length === 0) {
      return res.status(404).json({ success: false, message: "Assessment definition not found" });
    }

    const def = defs[0];
    if (Number(def.company_id) !== Number(companyId)) {
      return res.status(403).json({ success: false, message: "Unauthorized: Assessment belongs to another company" });
    }

    const formattedQuestions = (questions || []).map((q: any, i: number) => ({
      id: q.id || `q-${Date.now()}-${i}`,
      type: q.type || 'MCQ',
      questionText: (q.questionText || q.question || q.text || '').trim(),
      options: (q.options || []).map((o: any) => String(o).trim()),
      correctOption: Number(q.correctOption),
      points: Number(q.points || q.marks) || 10,
      difficulty: q.difficulty || 'MEDIUM'
    }));

    const questionsJson = JSON.stringify(formattedQuestions);
    const totalScore = formattedQuestions.reduce((sum: number, q: any) => sum + (q.points || 10), 0) || 100;
    const durMinutes = Number(duration || def.duration_minutes) || 30;

    if (def.status === 'DRAFT') {
      // Update DRAFT in place
      await db.query(`
        UPDATE company_assessment_definitions
        SET title = ?, description = ?, questions_json = ?, duration_minutes = ?, total_marks = ?
        WHERE id = ?
      `, [title || def.title, description !== undefined ? description : def.description, questionsJson, durMinutes, totalScore, definitionId]);

      return res.json({
        success: true,
        message: "Draft assessment updated successfully",
        data: {
          id: String(definitionId),
          title: title || def.title,
          status: 'DRAFT',
          version: def.version,
          questions: formattedQuestions
        }
      });
    } else {
      // Create new DRAFT version when editing PUBLISHED definition
      const newVersion = def.version + 1;
      const [insertRes]: any = await db.query(`
        INSERT INTO company_assessment_definitions (company_id, title, description, questions_json, duration_minutes, cutoff_score, total_marks, version, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT')
      `, [companyId, title || def.title, description !== undefined ? description : def.description, questionsJson, durMinutes, def.cutoff_score, totalScore, newVersion]);

      return res.status(201).json({
        success: true,
        message: `New draft version v${newVersion} created from published assessment`,
        data: {
          id: String(insertRes.insertId),
          title: title || def.title,
          status: 'DRAFT',
          version: newVersion,
          questions: formattedQuestions
        }
      });
    }
  } catch (error: any) {
    console.error("Error in PUT /api/assessments/company/tests/:id:", error);
    res.status(500).json({ success: false, message: "Failed to update assessment definition" });
  }
});

// POST /api/assessments/company/publish
router.post("/company/publish", authenticate, async (req: any, res) => {
  try {
    const companyId = await resolveCompanyIdForUser(req.user);
    if (!companyId) {
      return res.status(403).json({ success: false, message: "Company profile not found" });
    }

    const { assessmentId, id, assessment_id } = req.body;
    const targetId = assessmentId || id || assessment_id;

    if (!targetId) {
      return res.status(400).json({ success: false, message: "Assessment ID is required for publishing" });
    }

    const [defs]: any = await db.query("SELECT * FROM company_assessment_definitions WHERE id = ?", [targetId]);
    if (defs.length === 0) {
      return res.status(404).json({ success: false, message: "Assessment definition not found" });
    }

    const def = defs[0];
    if (Number(def.company_id) !== Number(companyId)) {
      return res.status(403).json({ success: false, message: "Unauthorized: Assessment belongs to another company" });
    }

    const qs = typeof def.questions_json === "string" ? JSON.parse(def.questions_json) : (def.questions_json || []);
    if (!Array.isArray(qs) || qs.length === 0) {
      return res.status(400).json({ success: false, message: "Cannot publish assessment with no questions" });
    }

    await db.query("UPDATE company_assessment_definitions SET status = 'PUBLISHED' WHERE id = ?", [targetId]);

    res.json({
      success: true,
      message: "Assessment published successfully",
      data: {
        id: String(targetId),
        title: def.title,
        version: def.version,
        status: 'PUBLISHED'
      }
    });
  } catch (error: any) {
    console.error("Error in POST /api/assessments/company/publish:", error);
    res.status(500).json({ success: false, message: "Failed to publish assessment" });
  }
});

// POST /api/assessments/company/assign
router.post("/company/assign", authenticate, async (req: any, res) => {
  try {
    const { assessmentId, jobId, stageId, cutoffScore } = req.body;
    const companyId = await resolveCompanyIdForUser(req.user);

    if (!companyId) {
      return res.status(403).json({ success: false, message: "Company profile not found" });
    }

    if (!assessmentId || !jobId) {
      return res.status(400).json({ success: false, message: "Assessment ID and Job ID are required" });
    }

    // Verify definition is published
    const [defs]: any = await db.query("SELECT * FROM company_assessment_definitions WHERE id = ?", [assessmentId]);
    if (defs.length === 0) {
      return res.status(404).json({ success: false, message: "Assessment definition not found" });
    }

    const def = defs[0];
    if (Number(def.company_id) !== Number(companyId)) {
      return res.status(403).json({ success: false, message: "Unauthorized: Assessment belongs to another company" });
    }

    if (def.status === 'DRAFT') {
      return res.status(400).json({ success: false, message: "Draft assessment cannot be assigned until published" });
    }

    // Verify job belongs to company and is active
    const [jobs]: any = await db.query("SELECT * FROM jobs WHERE id = ?", [jobId]);
    if (jobs.length === 0) {
      return res.status(404).json({ success: false, message: "Target job not found" });
    }
    const job = jobs[0];
    if (Number(job.company_id) !== Number(companyId)) {
      return res.status(403).json({ success: false, message: "Unauthorized: Job belongs to another company" });
    }
    const isEnded = String(job.status || '').toUpperCase() === 'ENDED' || String(job.status || '').toUpperCase() === 'CLOSED';
    if (isEnded) {
      return res.status(400).json({ success: false, code: "JOB_ENDED_READ_ONLY", message: "Candidates in an ended job are read-only." });
    }

    // Verify stage belongs to job and is testing stage
    let verifiedStageId = stageId;
    if (stageId) {
      const [stages]: any = await db.query("SELECT * FROM job_stages WHERE id = ?", [stageId]);
      if (stages.length === 0 || Number(stages[0].job_id) !== Number(jobId)) {
        return res.status(400).json({ success: false, message: "Specified stage does not belong to target job" });
      }
      const stName = String(stages[0].stage_name || '').toUpperCase();
      const stType = String(stages[0].stage_type || '').toUpperCase();
      const isTesting = stType === 'TEST' || stType === 'TESTING' || stType === 'ASSESSMENT' || stName.includes('TEST') || stName.includes('ASSESS');
      if (!isTesting) {
        return res.status(400).json({ success: false, message: "Assessment can only be assigned to a TESTING stage" });
      }
    }

    const numCutoff = cutoffScore !== undefined ? Number(cutoffScore) : Number(def.cutoff_score || 40);
    const totalMarks = Number(def.total_marks || 100);
    if (isNaN(numCutoff) || numCutoff < 0 || numCutoff >= totalMarks) {
      return res.status(400).json({ success: false, message: "Cutoff score must be at least 0 and strictly less than total marks" });
    }

    // Upsert assignment in company_assessment_assignments
    const [existingAssn]: any = await db.query(`
      SELECT id FROM company_assessment_assignments
      WHERE job_id = ? AND status = 'ACTIVE'
    `, [jobId]);

    let assignmentId;
    if (existingAssn.length > 0) {
      assignmentId = existingAssn[0].id;
      await db.query(`
        UPDATE company_assessment_assignments
        SET definition_version_id = ?, stage_id = ?, cutoff_score = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [assessmentId, verifiedStageId || null, numCutoff, assignmentId]);
    } else {
      const [insertRes]: any = await db.query(`
        INSERT INTO company_assessment_assignments (company_id, definition_version_id, job_id, stage_id, cutoff_score, status)
        VALUES (?, ?, ?, ?, ?, 'ACTIVE')
      `, [companyId, assessmentId, jobId, verifiedStageId || null, numCutoff]);
      assignmentId = insertRes.insertId;
    }

    res.json({
      success: true,
      message: `Assessment assigned to job ${job.title} successfully.`,
      assignment: {
        id: assignmentId,
        assessmentId,
        jobId,
        stageId: verifiedStageId || null,
        cutoffScore: numCutoff,
        version: def.version
      }
    });
  } catch (error: any) {
    console.error("Error in POST /api/assessments/company/assign:", error);
    res.status(500).json({ success: false, message: "Failed to assign assessment" });
  }
});

// GET /api/assessments/student/eligible
router.get("/student/eligible", authenticate, async (req: any, res) => {
  try {
    const studentCtx = await getStudentContext(req.user.userId || req.user.id);
    if (!studentCtx) {
      return res.status(404).json({ success: false, message: "Student profile not found" });
    }

    const [apps]: any = await db.query(`
      SELECT 
        a.id as application_id,
        a.job_id,
        a.current_stage_id,
        j.title as job_title,
        cp.company_name,
        caa.id as assignment_id,
        caa.cutoff_score as assignment_cutoff,
        cad.id as definition_id,
        cad.title as test_title,
        cad.questions_json,
        cad.duration_minutes,
        cad.total_marks,
        cad.version,
        ts.id as submission_id,
        ts.score,
        ts.passed,
        ts.submitted_at
      FROM job_applications a
      JOIN jobs j ON a.job_id = j.id
      JOIN company_profiles cp ON j.company_id = cp.id
      JOIN company_assessment_assignments caa ON caa.job_id = a.job_id AND caa.status = 'ACTIVE' AND (caa.stage_id IS NULL OR caa.stage_id = a.current_stage_id)
      JOIN company_assessment_definitions cad ON caa.definition_version_id = cad.id
      LEFT JOIN test_submissions ts ON ts.application_id = a.id AND ts.assignment_id = caa.id
      WHERE a.student_id = ? AND a.status = 'IN_PROGRESS'
    `, [studentCtx.id]);

    const eligibleList = (apps || []).map((app: any) => {
      const qs = typeof app.questions_json === "string" ? JSON.parse(app.questions_json) : (app.questions_json || []);

      return {
        applicationId: app.application_id,
        jobId: app.job_id,
        jobTitle: app.job_title,
        companyName: app.company_name,
        assignmentId: app.assignment_id,
        testId: app.definition_id,
        testTitle: app.test_title,
        questionsCount: qs.length,
        duration: app.duration_minutes || 30,
        totalMarks: app.total_marks || 100,
        cutoffScore: Number(app.assignment_cutoff || 40),
        isSubmitted: !!app.submission_id,
        score: app.score !== null ? app.score : null,
        passed: app.passed === 1,
        submittedAt: app.submitted_at
      };
    });

    res.json({ success: true, assessments: eligibleList });
  } catch (error: any) {
    console.error("Error in GET /api/assessments/student/eligible:", error);
    res.status(500).json({ success: false, message: "Failed to fetch student eligible assessments" });
  }
});

async function handleCompanyStudentStart(req: any, res: any) {
  try {
    const { applicationId, assignmentId, testId } = req.body;
    const targetAppId = applicationId;
    const studentCtx = await getStudentContext(req.user.userId || req.user.id);

    if (!targetAppId) {
      return res.status(400).json({ success: false, message: "Application ID is required" });
    }

    const [apps]: any = await db.query(`
      SELECT a.id as application_id, a.job_id, a.student_id, a.current_stage_id,
             caa.id as assignment_id, caa.cutoff_score as assignment_cutoff,
             cad.id as definition_id, cad.questions_json, cad.duration_minutes, cad.total_marks, cad.version
      FROM job_applications a
      JOIN company_assessment_assignments caa ON caa.job_id = a.job_id AND caa.status = 'ACTIVE' AND (caa.stage_id IS NULL OR caa.stage_id = a.current_stage_id)
      JOIN company_assessment_definitions cad ON caa.definition_version_id = cad.id
      WHERE a.id = ?
    `, [targetAppId]);

    if (apps.length === 0) {
      return res.status(404).json({ success: false, message: "Active assessment assignment not found for this application" });
    }

    const appRow = apps[0];
    if (studentCtx && appRow.student_id !== studentCtx.id) {
      return res.status(403).json({ success: false, message: "Unauthorized attempt access" });
    }

    let attemptId;
    let fullQuestions: any[] = [];
    const cutoffScore = Number(appRow.assignment_cutoff || 40);

    const [existingSub]: any = await db.query(`
      SELECT * FROM test_submissions WHERE application_id = ? AND assignment_id = ?
    `, [targetAppId, appRow.assignment_id]);

    if (existingSub.length > 0) {
      attemptId = existingSub[0].id;
      fullQuestions = typeof existingSub[0].questions_json === "string" ? JSON.parse(existingSub[0].questions_json) : existingSub[0].questions_json;
    } else {
      fullQuestions = typeof appRow.questions_json === "string" ? JSON.parse(appRow.questions_json) : (appRow.questions_json || []);
      const totalMarks = appRow.total_marks || fullQuestions.reduce((sum: number, q: any) => sum + (Number(q.points) || 10), 0) || 100;

      const [insertRes]: any = await db.query(`
        INSERT INTO test_submissions (assignment_id, assessment_version_id, application_id, student_id, job_id, stage_id, score, total_marks, percentage, passed, cutoff_score, assessment_version, questions_json, status)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?, 0, 0, ?, ?, ?, 'IN_PROGRESS')
      `, [appRow.assignment_id, appRow.definition_id, targetAppId, appRow.student_id, appRow.job_id, appRow.current_stage_id, totalMarks, cutoffScore, appRow.version, JSON.stringify(fullQuestions)]);

      attemptId = insertRes.insertId;
    }

    // Sanitize questions for student: strip correct answers and explanations
    const sanitizedQuestions = fullQuestions.map((q: any, i: number) => ({
      id: q.id || `q-${i}`,
      type: q.type || 'MCQ',
      questionText: q.questionText || q.question || q.text || '',
      options: q.options || ['', '', '', ''],
      points: Number(q.points) || 10,
      sortOrder: i + 1
    }));

    res.json({
      success: true,
      attemptId: String(attemptId),
      applicationId: targetAppId,
      assignmentId: appRow.assignment_id,
      assessmentId: appRow.definition_id,
      assessmentVersion: appRow.version,
      durationMinutes: appRow.duration_minutes || 30,
      totalMarks: appRow.total_marks || 100,
      questions: sanitizedQuestions
    });
  } catch (error: any) {
    console.error("Error in POST /api/assessments/student/start:", error);
    res.status(500).json({ success: false, message: "Failed to start assessment attempt" });
  }
}

// POST /api/assessments/student/start
router.post("/student/start", authenticate, handleCompanyStudentStart);

// POST /api/assessments/student/event
router.post("/student/event", authenticate, async (req: any, res) => {
  try {
    const { applicationId, attemptId, eventType, idempotencyKey } = req.body;
    const targetAttemptId = attemptId;
    const studentCtx = await getStudentContext(req.user.userId || req.user.id);

    if (!applicationId || !eventType) {
      return res.status(400).json({ success: false, message: "Application ID and eventType are required" });
    }

    const [apps]: any = await db.query("SELECT id, student_id FROM job_applications WHERE id = ?", [applicationId]);
    if (apps.length === 0) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    if (studentCtx && apps[0].student_id !== studentCtx.id) {
      return res.status(403).json({ success: false, message: "Unauthorized attempt access" });
    }

    let exactAttemptId = targetAttemptId || null;
    if (!exactAttemptId) {
      const [subRows]: any = await db.query("SELECT id FROM test_submissions WHERE application_id = ? ORDER BY id DESC LIMIT 1", [applicationId]);
      if (subRows.length > 0) exactAttemptId = subRows[0].id;
    }

    try {
      await db.query(`
        INSERT INTO test_submission_events (attempt_id, application_id, student_id, event_type, idempotency_key)
        VALUES (?, ?, ?, ?, ?)
      `, [exactAttemptId, applicationId, studentCtx ? studentCtx.id : apps[0].student_id, eventType, idempotencyKey || null]);
    } catch (e) {
      return res.status(409).json({ success: false, message: "Duplicate event key blocked" });
    }

    if (exactAttemptId) {
      await db.query(`
        UPDATE test_submissions
        SET violations_count = violations_count + 1
        WHERE id = ?
      `, [exactAttemptId]);
    }

    res.json({
      success: true,
      message: `Integrity event ${eventType} recorded successfully.`,
      applicationId,
      attemptId: exactAttemptId,
      eventType
    });
  } catch (error: any) {
    console.error("Error in POST /api/assessments/student/event:", error);
    res.status(500).json({ success: false, message: "Failed to log integrity event" });
  }
});

// Canonical submission handler
export async function submitAssessmentAttempt(attemptId: any, reqUser: any, answers: any) {
  const studentCtx = await getStudentContext(reqUser.userId || reqUser.id);

  const [subs]: any = await db.query("SELECT * FROM test_submissions WHERE id = ? OR application_id = ?", [attemptId, attemptId]);
  if (subs.length === 0) {
    return { status: 404, data: { success: false, message: "Attempt not found" } };
  }

  const sub = subs[0];
  if (studentCtx && sub.student_id !== studentCtx.id) {
    return { status: 403, data: { success: false, message: "Unauthorized submission" } };
  }

  if (sub.status === 'COMPLETED') {
    return {
      status: 200,
      data: {
        success: true,
        message: "Assessment submitted successfully!",
        earnedScore: Number(sub.score),
        totalMarks: Number(sub.total_marks),
        percentage: Number(sub.percentage),
        cutoffScore: Number(sub.cutoff_score),
        isPassed: sub.passed === 1,
        submittedAt: sub.submitted_at
      }
    };
  }

  const questions = typeof sub.questions_json === "string" ? JSON.parse(sub.questions_json) : (sub.questions_json || []);
  let earnedScore = 0;
  const totalMarks = sub.total_marks || 100;

  questions.forEach((q: any) => {
    const qPts = Number(q.points) || 10;
    const studentAns = answers ? answers[q.id] : undefined;
    if (studentAns !== undefined && Number(studentAns) === Number(q.correctOption)) {
      earnedScore += qPts;
    }
  });

  const cutoff = Number(sub.cutoff_score || 40);
  const percentage = totalMarks > 0 ? Math.round((earnedScore / totalMarks) * 100) : 0;
  const isPassed = earnedScore >= cutoff ? 1 : 0;

  let eventCount = sub.violations_count || 0;
  try {
    const [evRows]: any = await db.query("SELECT COUNT(*) as count FROM test_submission_events WHERE attempt_id = ?", [sub.id]);
    if (evRows.length > 0) eventCount = Math.max(eventCount, evRows[0].count);
  } catch (e) {}

  await db.query(`
    UPDATE test_submissions
    SET score = ?, total_marks = ?, percentage = ?, passed = ?, violations_count = ?, answers_json = ?, status = 'COMPLETED', submitted_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [earnedScore, totalMarks, percentage, isPassed, eventCount, JSON.stringify(answers || {}), sub.id]);

  return {
    status: 200,
    data: {
      success: true,
      message: "Assessment submitted successfully!",
      earnedScore,
      totalMarks,
      percentage,
      cutoffScore: cutoff,
      isPassed: isPassed === 1
    }
  };
}

// POST /api/assessments/student/submit/:attemptId
router.post("/student/submit/:attemptId", authenticate, async (req: any, res) => {
  try {
    const attemptId = req.params.attemptId || req.body.applicationId;
    const { answers } = req.body;

    if (!attemptId) {
      return res.status(400).json({ success: false, message: "Attempt ID is required" });
    }

    const result = await submitAssessmentAttempt(attemptId, req.user, answers);
    res.status(result.status).json(result.data);
  } catch (error: any) {
    console.error("Error in POST /api/assessments/student/submit/:attemptId:", error);
    res.status(500).json({ success: false, message: "Failed to process submission" });
  }
});

// POST /api/assessments/student/submit
router.post("/student/submit", authenticate, async (req: any, res) => {
  try {
    const { applicationId, attemptId, answers } = req.body;
    const targetId = attemptId || applicationId;

    if (!targetId) {
      return res.status(400).json({ success: false, message: "Attempt ID or Application ID is required" });
    }

    const result = await submitAssessmentAttempt(targetId, req.user, answers);
    res.status(result.status).json(result.data);
  } catch (error: any) {
    console.error("Error in POST /api/assessments/student/submit:", error);
    res.status(500).json({ success: false, message: "Failed to process submission" });
  }
});

// POST /api/assessments/company/bulk-advance
router.post("/company/bulk-advance", authenticate, async (req: any, res) => {
  try {
    const { applications, applicationIds, expectedCurrentStageId, targetStageId, companyId, jobId } = req.body;
    const companyCtx = await getCompanyContext(req.user.userId || req.user.id);

    if (targetStageId !== undefined || companyId !== undefined || jobId !== undefined) {
      return res.status(400).json({
        success: false,
        message: "Legacy payload fields (targetStageId, companyId, jobId) are not allowed."
      });
    }

    if (expectedCurrentStageId !== undefined && Array.isArray(applicationIds) && applicationIds.length > 1) {
      return res.status(400).json({
        success: false,
        message: "Shared top-level expectedCurrentStageId for multi-job batch is rejected. Provide application-specific expectedCurrentStageId inside applications array."
      });
    }

    let itemsToProcess: { applicationId: number; expectedCurrentStageId?: number }[] = [];
    if (Array.isArray(applications) && applications.length > 0) {
      itemsToProcess = applications;
    } else if (Array.isArray(applicationIds) && applicationIds.length > 0) {
      itemsToProcess = applicationIds.map((id: number) => ({
        applicationId: id,
        expectedCurrentStageId: expectedCurrentStageId
      }));
    } else {
      return res.status(400).json({ success: false, message: "applications array is required" });
    }

    const results: any[] = [];

    for (const item of itemsToProcess) {
      const appId = item.applicationId;
      try {
        const [appRows]: any = await db.query(`
          SELECT a.id, a.job_id, a.current_stage_id, a.status as app_status, j.company_id, j.status as job_status
          FROM job_applications a
          JOIN jobs j ON a.job_id = j.id
          WHERE a.id = ?
        `, [appId]);

        if (appRows.length === 0) {
          results.push({ applicationId: appId, success: false, message: "Application not found" });
          continue;
        }

        const app = appRows[0];
        if (companyCtx && app.company_id !== companyCtx.id) {
          results.push({ applicationId: appId, success: false, message: "Company unauthorized" });
          continue;
        }

        if (String(app.job_status || '').toUpperCase() === 'ENDED' || String(app.job_status || '').toUpperCase() === 'CLOSED') {
          results.push({ applicationId: appId, success: false, code: "JOB_ENDED_READ_ONLY", message: "Candidates in an ended job are read-only." });
          continue;
        }

        if (app.app_status === 'REJECTED' || app.app_status === 'CANCELLED' || app.app_status === 'OFFERED' || app.app_status === 'SELECTED' || app.app_status === 'HIRED') {
          results.push({ applicationId: appId, success: false, message: "Cannot advance candidate in terminal status" });
          continue;
        }

        if (item.expectedCurrentStageId !== undefined && item.expectedCurrentStageId !== null && app.current_stage_id !== item.expectedCurrentStageId) {
          results.push({ applicationId: appId, success: false, message: `Stale stage detected: expected stage ${item.expectedCurrentStageId} but candidate is at stage ${app.current_stage_id}` });
          continue;
        }

        // Verify active assignment
        const [assns]: any = await db.query(`
          SELECT caa.id, caa.cutoff_score FROM company_assessment_assignments caa
          WHERE caa.job_id = ? AND caa.status = 'ACTIVE' AND (caa.stage_id IS NULL OR caa.stage_id = ?)
        `, [app.job_id, app.current_stage_id]);

        if (assns.length === 0) {
          results.push({ applicationId: appId, success: false, message: "No active assessment assignment found for candidate stage" });
          continue;
        }

        // Verify completed passing attempt in test_submissions
        const [subs]: any = await db.query(`
          SELECT * FROM test_submissions
          WHERE application_id = ? AND status = 'COMPLETED'
          ORDER BY id DESC LIMIT 1
        `, [appId]);

        if (subs.length === 0) {
          results.push({ applicationId: appId, success: false, message: "Candidate has not completed assessment" });
          continue;
        }

        const sub = subs[0];
        const requiredCutoff = assns[0]?.cutoff_score !== undefined ? Number(assns[0].cutoff_score) : Number(sub.cutoff_score || 0);
        if (sub.passed !== 1 && Number(sub.score) < requiredCutoff) {
          results.push({ applicationId: appId, success: false, message: "Candidate failed assessment cutoff score" });
          continue;
        }

        // Fetch stages and advance
        const [stages]: any = await db.query("SELECT id, stage_order FROM job_stages WHERE job_id = ? ORDER BY stage_order ASC, id ASC", [app.job_id]);
        const currentIdx = stages.findIndex((s: any) => Number(s.id) === Number(app.current_stage_id));

        if (currentIdx === -1 || currentIdx >= stages.length - 1) {
          results.push({ applicationId: appId, success: false, message: "No next stage available" });
          continue;
        }

        const nextStage = stages[currentIdx + 1];

        await db.query("UPDATE job_applications SET current_stage_id = ? WHERE id = ?", [nextStage.id, appId]);
        await db.query(`
          INSERT INTO application_history (application_id, stage_id, action, notes)
          VALUES (?, ?, 'BULK_ADVANCE', 'Advanced candidate via Bulk Assessment Advance')
        `, [appId, nextStage.id]);

        results.push({ applicationId: appId, success: true, previousStageId: app.current_stage_id, newStageId: nextStage.id });
      } catch (err: any) {
        results.push({ applicationId: appId, success: false, message: err.message });
      }
    }

    res.json({
      success: true,
      message: `Processed bulk advance for ${itemsToProcess.length} candidates.`,
      results
    });
  } catch (error: any) {
    console.error("Error in POST /api/assessments/company/bulk-advance:", error);
    res.status(500).json({ success: false, message: "Failed to perform bulk advance" });
  }
});

export default router;
