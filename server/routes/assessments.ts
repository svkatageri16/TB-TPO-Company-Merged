import express from "express";
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

    // Check attempt status
    const [attempts]: any = await db.query(`
      SELECT a.*, t.max_marks, t.passing_marks, t.negative_marking
      FROM assessment_attempts a
      JOIN assessment_tests t ON a.assessment_id = t.id
      WHERE a.id = ?
    `, [attemptId]);

    if (attempts.length === 0) return res.status(404).json({ success: false, message: "Attempt not found" });

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

export default router;
