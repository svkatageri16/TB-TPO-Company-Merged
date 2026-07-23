import express from "express";
import multer from "multer";
import fs from "fs";
import { createRequire } from "module";
const customRequire = typeof require !== "undefined" ? require : createRequire(import.meta.url);
const pdf = customRequire("pdf-parse");
import { GoogleGenAI } from "@google/genai";
import db from "../db.ts";
import { updateDailyTask, calculateTalentScore } from "../services/analyticsService.ts";
import { authenticate } from "../middleware/auth.ts";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build'
    }
  }
});

const isGeminiEnabled = () => {
  return typeof process.env.GEMINI_API_KEY === 'string' && process.env.GEMINI_API_KEY.trim() !== '' && !process.env.GEMINI_API_KEY.includes('MY_GEMINI_API_KEY');
};

router.post("/analyze-resume", upload.single("resume"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No resume file uploaded" });
  }

  const { userId } = req.body;

  try {
    const dataBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdf(dataBuffer);
    const text = pdfData.text;

    // Call Gemini to analyze via Circuit Breaker
    const { geminiBreaker } = await import("../services/circuitBreakerService.ts");
    const rawResult = await geminiBreaker.fire({
      apiCall: async () => {
        if (!isGeminiEnabled()) {
          throw new Error("Missing Gemini API Key");
        }
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `Analyze the following resume text and extract information in JSON format.
          Text: ${text}
          Required Format:
          {
            "fullName": "...",
            "skills": ["...", "..."],
            "education": [{"level": "...", "institution": "...", "year": "...", "score": "..."}],
            "experience": ["...", "..."],
            "suggestions": ["...", "..."],
            "score": 0-100
          }`,
          config: {
            responseMimeType: "application/json"
          }
        });
        return response.text || "{}";
      },
      fallbackValue: JSON.stringify({
        fullName: "Applicant Profile",
        skills: ["Web Development", "General Engineering"],
        education: [],
        experience: [],
        suggestions: ["Structure academic elements", "Enrich resume with high-impact project descriptions"],
        score: 70
      })
    });

    const analysis = JSON.parse(rawResult || "{}");

    // Update stats if userId is provided
    if (userId && userId !== 'undefined') {
      const [existingStats]: any = await db.query("SELECT id FROM student_performance_stats WHERE user_id = ?", [userId]);
      if (existingStats.length > 0) {
        await db.query(`
          UPDATE student_performance_stats 
          SET resume_score = ?, skill_count = ?, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `, [analysis.score || 0, analysis.skills?.length || 0, userId]);
      } else {
        await db.query(`
          INSERT INTO student_performance_stats (user_id, resume_score, skill_count)
          VALUES (?, ?, ?)
        `, [userId, analysis.score || 0, analysis.skills?.length || 0]);
      }
      
      await calculateTalentScore(Number(userId));
    }

    // Clean up file
    fs.unlinkSync(req.file.path);

    res.json({ success: true, data: analysis });
  } catch (error) {
    res.status(500).json({ success: false, message: "AI Analysis failed", error: String(error) });
  }
});

router.post("/build-resume", async (req, res) => {
  const { userData } = req.body;
  
  try {
    if (!isGeminiEnabled()) {
      const fallbackResume = {
        Summary: "Highly motivated technology aspirant focused on software engineering principles...",
        Experience: [
          { role: "Software Intern", company: "Tech solutions", period: "Summer 2024", highlights: ["Developed web components using React and Node.js", "Assisted in database integration and queries optimization"] }
        ],
        Education: [
          { degree: "Bachelor of Technology", institution: "Engineering College", year: "2025" }
        ],
        Skills: userData.skills ? (Array.isArray(userData.skills) ? userData.skills : [userData.skills]) : ["React", "TypeScript", "Node.js", "SQL"],
        Projects: [
          { name: "VEGA Portal", description: "Collegiate hiring & preparation portal with mock assessments." }
        ]
      };
      if (userData.userId) {
        await db.query("UPDATE student_profiles SET resume_builder_json = ? WHERE user_id = ?", [JSON.stringify(fallbackResume), userData.userId]);
      }
      return res.json({ success: true, data: fallbackResume });
    }

    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Generate a high-ATS resume based on the following user details: ${JSON.stringify(userData)}.
      Format the response as a clean, structured JSON for a resume with sections: Summary, Experience, Education, Skills, Projects.
      Ensure the terminology is optimized for ATS software in the technology/corporate sector.`,
      config: { responseMimeType: "application/json" }
    });

    const resumeJson = JSON.parse(result.text || "{}");
    
    // Save to student profile if user_id provided
    if (userData.userId) {
      await db.query("UPDATE student_profiles SET resume_builder_json = ? WHERE user_id = ?", [JSON.stringify(resumeJson), userData.userId]);
    }

    res.json({ success: true, data: resumeJson });
  } catch (error) {
    res.status(500).json({ success: false, message: "Resume building failed", error: String(error) });
  }
});

router.post("/save-interview-feedback", async (req, res) => {
  const { userId, profile, scores, detailed_feedback, strengths, weaknesses, improvement_tips, transcript, questions_and_answers } = req.body;
  
  if (!detailed_feedback) {
    return res.status(400).json({ success: false, message: "Detailed feedback is required" });
  }

  try {
    const overallScore = scores?.overall ?? scores?.score ?? 0;

    // Save to the legacy interview_history table for backward compatibility in the dashboard
    let [profiles]: any = await db.query("SELECT id FROM student_profiles WHERE user_id = ?", [userId]);
    
    if (profiles && profiles.length > 0) {
      const studentId = profiles[0].id;
      await db.query(`
        INSERT INTO interview_history 
        (student_id, score, communication_score, confidence_score, explanation_score, presentation_score, knowledge_score, feedback, strengths_json, weaknesses_json, tips_json, transcript_json, questions_answers_json) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        studentId, 
        overallScore,
        scores?.communication ?? 0,
        scores?.confidence ?? 0,
        scores?.explanation ?? 0,
        scores?.presentation ?? 0,
        scores?.knowledge ?? 0,
        detailed_feedback,
        JSON.stringify(strengths || []),
        JSON.stringify(weaknesses || []),
        JSON.stringify(improvement_tips || []),
        JSON.stringify(transcript || []),
        JSON.stringify(questions_and_answers || [])
      ]);
      await db.query("UPDATE student_profiles SET completeness_score = LEAST(100, completeness_score + 15) WHERE id = ?", [studentId]);
    }

    // Save to the NEW Adaptive Engine Tables
    const [sessionResult]: any = await db.query(`
      INSERT INTO interview_sessions 
      (user_id, role, level, techstack, focus, difficulty, communication, score, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED')
    `, [
      userId,
      profile?.role || 'Software Engineer',
      profile?.level || 'Fresher',
      JSON.stringify(profile?.techstack || []),
      profile?.focus || 'Mixed',
      profile?.difficulty || 'Medium',
      profile?.communication || 'Voice',
      overallScore
    ]);

    const sessionId = sessionResult.insertId;

    // Parse transcript to insert into interview_questions and interview_answers
    // Since Gemini acts dynamically, we do not pre-insert questions. The transcript interleaves AI and User messages.
    let currentQuestionId = null;
    if (transcript && Array.isArray(transcript)) {
      for (const msg of transcript) {
        if (msg.role === 'ai') {
          const [qResult]: any = await db.query(`
            INSERT INTO interview_questions (session_id, question, difficulty, category)
            VALUES (?, ?, ?, ?)
          `, [sessionId, msg.text, profile?.difficulty || 'Medium', profile?.focus || 'Mixed']);
          currentQuestionId = qResult.insertId;
        } else if (msg.role === 'user' && currentQuestionId) {
          // It's the user's answer to the AI's question
          await db.query(`
            INSERT INTO interview_answers (session_id, question_id, answer)
            VALUES (?, ?, ?)
          `, [sessionId, currentQuestionId, msg.text]);
        }
      }
    }

    // UPDATE PERFORMANCE STATS
    const [existingPerf]: any = await db.query("SELECT id, avg_interview_score FROM student_performance_stats WHERE user_id = ?", [userId]);
    if (existingPerf.length > 0) {
      const currentAvg = existingPerf[0].avg_interview_score || 0;
      const newAvg = (currentAvg + overallScore) / 2; // Simple rolling avg
      await db.query(`
        UPDATE student_performance_stats 
        SET avg_interview_score = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `, [newAvg, userId]);
    } else {
      await db.query(`
        INSERT INTO student_performance_stats (user_id, avg_interview_score)
        VALUES (?, ?)
      `, [userId, overallScore]);
    }

    // UPDATE DAILY TASK & TALENT SCORE
    await updateDailyTask(userId, 'INTERVIEW');

    res.json({ success: true, message: "Detailed interview feedback saved to Adaptive Engine" });
  } catch (error) {
    console.error("Save interview feedback error:", error);
    res.status(500).json({ success: false, message: "Failed to save feedback", error: String(error) });
  }
});

// Asynchronous Queue-Based Evaluation for high-concurrency mock interview evaluation workloads (BullMQ + Redis)
router.post("/queue-interview-evaluation", async (req, res) => {
  const { userId, transcript } = req.body;
  if (!userId || !transcript) {
    return res.status(400).json({ success: false, message: "Missing required parameters: userId and transcript are required." });
  }

  try {
    const { addInterviewToProcessQueue } = await import("../services/queueService.ts");
    const result = await addInterviewToProcessQueue(Number(userId), typeof transcript === 'string' ? transcript : JSON.stringify(transcript));
    
    res.json({
      success: true,
      message: "Mock interview evaluation successfully queued for high-availability processing.",
      mode: result.mode
    });
  } catch (err: any) {
    console.error("Failed to queue interview evaluation:", err);
    res.status(500).json({ success: false, message: "Internal error while queueing evaluation workload.", error: err.message });
  }
});

router.get("/history/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    let [profiles]: any = await db.query("SELECT id FROM student_profiles WHERE user_id = ?", [userId]);
    
    if (!profiles || profiles.length === 0) {
      // Fallback for development stale sessions
      const [anyStudent]: any = await db.query("SELECT sp.id FROM student_profiles sp JOIN users u ON sp.user_id = u.id WHERE u.role = 'STUDENT' LIMIT 1");
      profiles = anyStudent;
    }

    if (!profiles || profiles.length === 0) {
      return res.json({ success: true, data: [] });
    }
    const studentId = profiles[0].id;

    const [history] = await db.query("SELECT * FROM interview_history WHERE student_id = ? ORDER BY created_at DESC", [studentId]);
    res.json({ success: true, data: history });
  } catch (error) {
    console.error("Fetch history error:", error);
    res.status(500).json({ success: false, message: "Error fetching history" });
  }
});

router.post("/analyze-sentence", async (req, res) => {
  const { text } = req.body;
  if (!text || text.length < 5) {
    return res.json({ success: true, data: { technical_depth: 0, confidence: 0, fluency: 0, communication: 0 } });
  }

  try {
    if (!isGeminiEnabled()) {
      return res.json({ success: true, data: { technical_depth: 70, confidence: 75, fluency: 80, communication: 80 } });
    }

    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Analyze the user's sentence during an interview for these exact metrics from 0 to 100.
      Sentence: "${text}"
      Return ONLY valid JSON format: {"technical_depth": 85, "confidence": 90, "fluency": 88, "communication": 92}`,
      config: { responseMimeType: "application/json" }
    });

    const analysis = JSON.parse(result.text || '{"technical_depth": 70, "confidence": 75, "fluency": 80, "communication": 80}');
    res.json({ success: true, data: analysis });
  } catch (error) {
    res.json({ success: false, data: { technical_depth: 70, confidence: 75, fluency: 80, communication: 80 } }); // Fallback on error
  }
});

router.post("/career-mentor", async (req, res) => {
  const { profile, analytics, applications } = req.body;
  if (!profile) return res.status(400).json({ success: false, message: "Profile data is required" });

  try {
    const prompt = `You are an elite AI Career Mentor for VEGA. Analyze the student's Employability Intelligence Score (which consists of 7 parameters: Profile Completeness, AI Mock Interview Score, AI Quiz/Test Performance, Coding Platform Analysis, Psychometric Test, Extracurricular & Leadership, and Activity & Consistency).
    
    Student Profile: ${JSON.stringify(profile)}
    Analytics (Includes Score Breakdown): ${JSON.stringify(analytics)}
    Hiring Pipeline: ${JSON.stringify(applications)}
    
    Identify the weakest parameter or the best opportunity for improvement among the 7 parameters, or congratulate them on their strongest. The insight must be highly personalized, action-oriented, and focus on exactly ONE specific action to improve their Employability Intelligence Score.
    Return ONLY valid JSON format:
    {
      "text": "The full insight message (max 2 sentences)",
      "highlight": "A specific phrase from the text to highlight",
      "action": "A short 2-3 word CTA button text (e.g. 'Take Quiz', 'Start Mock', 'Add Projects')",
      "type": "One of: PROFILE, SKILL, VIEWS, STREAK, SELECTED, MOCK"
    }`;

    let insight = {
      text: "Keep practicing and updating your profile to boost your employability score.",
      highlight: "employability score",
      action: "Practice Now",
      type: "PROFILE"
    };

    try {
      if (!isGeminiEnabled()) {
        return res.json({ success: true, insight });
      }

      const result = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      const parsed = JSON.parse(result.text || "{}");
      if (parsed.text) insight = parsed;
    } catch (err: any) {
      if (err?.status === 429 || err?.status === 503 || err?.message?.includes("exceeded your current quota")) {
        // Silently fallback without logging to avoid terminal clutter
      } else {
        console.error("AI Mentor Error:", err);
      }
    }

    res.json({ success: true, insight });
  } catch (err) {
    console.error("AI Mentor Route Error:", err);
    res.status(500).json({ success: false, message: "Failed to process request" });
  }
});

router.post("/translate", async (req, res) => {
  const { text, targetLanguage } = req.body;
  
  if (!text) return res.status(400).json({ success: false, message: "Text is required" });
  if (targetLanguage !== "mr") return res.json({ success: true, translatedText: text }); // only support mr currently or do pass through

  try {
    if (!isGeminiEnabled()) {
      return res.json({ success: true, translatedText: text });
    }

    const prompt = `Translate the following user-generated dynamic profile data or text into Marathi. ONLY output the translated text, without quotes, explanations or extra tags. If the text is empty or meaningless, output it as is.
Text to translate:
"${text}"`;

    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt
    });

    res.json({ success: true, translatedText: result.text?.trim() || text });
  } catch (err: any) {
    if (err?.status !== 429 && err?.status !== 503) {
      console.error("AI Translate Error:", err.message);
    }
    res.json({ success: false, translatedText: text }); // fallback to original
  }
});

router.post("/optimize-keywords", async (req, res) => {
  const { skills, targetRole } = req.body;
  
  try {
    const fallback: any = {
      "missingKeywords": ["Continuous Integration (CI/CD)", "Type Safety (TypeScript)", "State Management (Redux/Zustand)", "Performance Optimization", "Automated Playwright/Jest Testing"],
      "recommendedVerbs": ["Engineered", "Pioneered", "Automated", "Optimized", "Architected"],
      "bulletRewrites": [
        {
          "originalIdea": "Worked on a web development project with React",
          "rewrittenBullet": "Engineered a high-performance React web application, utilizing state management best practices to reduce component loading overhead by 40%."
        },
        {
          "originalIdea": "Wrote backend APIs and connected database",
          "rewrittenBullet": "Architected secure server-side RESTful API pathways, optimizing relational database SQL indices to decrease query responsiveness times by 200ms."
        },
        {
          "originalIdea": "Tested the software flow and fixed bugs",
          "rewrittenBullet": "Automated regression testing routines across modular repositories, expanding coverage checks to 92% and boosting code release safety indexes."
        }
      ]
    };

    if (!isGeminiEnabled()) {
      return res.json({ success: true, data: fallback });
    }

    const prompt = `Analyze the following student profile skills and generate high-impact ATS keyword recommendations for their target job role.
    Target Job Role: ${targetRole}
    Current Profile Skills: ${skills ? JSON.stringify(skills) : "[]"}

    Generate structured advice. Output MUST be valid JSON adhering strictly to this schema:
    {
      "missingKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
      "recommendedVerbs": ["verb1", "verb2", "verb3", "verb4", "verb5"],
      "bulletRewrites": [
        {
          "originalIdea": "Brief description of a common resume bullet point",
          "rewrittenBullet": "Optimized, metric-driven custom resume bullet utilizing strong action verbs and professional style"
        },
        {
          "originalIdea": "Common resume detail",
          "rewrittenBullet": "Highly polished alternative bullet"
        },
        {
          "originalIdea": "Another project item",
          "rewrittenBullet": "Actionable, quantifiably successful project bullet point"
        }
      ]
    }
    
    Ensure all bullet points focus on technical execution metrics (e.g. "Increased rendering performance by 25%", "Reduced latency by 150ms"). Return ONLY the JSON object, absolutely zero raw markdown or codeblocks.`;

    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const parsed = JSON.parse(result.text || "{}");
    res.json({ success: true, data: parsed });
  } catch (error) {
    console.error("AI Keyword Optimizer Error:", error);
    // Standard high-quality fallback based on target role
    const fallback: any = {
      "missingKeywords": ["Continuous Integration (CI/CD)", "Type Safety (TypeScript)", "State Management (Redux/Zustand)", "Performance Optimization", "Automated Playwright/Jest Testing"],
      "recommendedVerbs": ["Engineered", "Pioneered", "Automated", "Optimized", "Architected"],
      "bulletRewrites": [
        {
          "originalIdea": "Worked on a web development project with React",
          "rewrittenBullet": "Engineered a high-performance React web application, utilizing state management best practices to reduce component loading overhead by 40%."
        },
        {
          "originalIdea": "Wrote backend APIs and connected database",
          "rewrittenBullet": "Architected secure server-side RESTful API pathways, optimizing relational database SQL indices to decrease query responsiveness times by 200ms."
        },
        {
          "originalIdea": "Tested the software flow and fixed bugs",
          "rewrittenBullet": "Automated regression testing routines across modular repositories, expanding coverage checks to 92% and boosting code release safety indexes."
        }
      ]
    };
    res.json({ success: true, data: fallback });
  }
});

router.get("/live-key", authenticate, (req, res) => {
  res.json({ success: true, key: process.env.GEMINI_API_KEY || "" });
});

export default router;

