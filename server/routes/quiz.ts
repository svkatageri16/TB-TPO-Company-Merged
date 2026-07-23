import { Router } from "express";
import { db } from "../db.ts";
import { GoogleGenAI } from "@google/genai";
import { XPService } from "../services/xpService.ts";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const router = Router();

// Generate a new quiz
router.post("/generate", async (req, res) => {
  const { userId, type, role, skills, difficulty, amount } = req.body;

  if (!userId || !type || !role || !difficulty || !amount) {
    console.error("Missing fields:", { userId, type, role, difficulty, amount });
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  try {
    // Check dynamic XP cost (per question cost * amount of questions)
    const perQuestionCost = await XPService.getConfigValue('QUIZ_QUESTION_COST', 5);
    const cost = perQuestionCost * parseInt(amount.toString());
    const [users]: any = await db.query("SELECT xp_balance FROM users WHERE id = ?", [userId]);
    const xpBalance = users[0]?.xp_balance || 0;
    if (xpBalance < cost) {
      return res.status(403).json({ success: false, message: `Insufficient XP. Attempting this ${amount}-question quiz requires ${cost} XP (${perQuestionCost} XP per question).` });
    }

    // Deduct cost
    await XPService.deductXP(userId, cost, 'QUIZ_ATTEMPT', `AI Custom Quiz Assessment Session: ${role} (${amount} Qs)`);

    // Insert initial record
    const [result]: any = await db.query(`
      INSERT INTO quizzes (user_id, quiz_type, role, skills, difficulty, total_questions, status)
      VALUES (?, ?, ?, ?, ?, ?, 'GENERATING')
    `, [userId, type, role, JSON.stringify(skills || []), difficulty, amount]);

    const quizId = result.insertId;

    const prompt = `
Generate a professional assessment quiz.

Quiz Details:
- Quiz Type: ${type}
- Role: ${role}
- Skills: ${(skills || []).join(', ')}
- Difficulty: ${difficulty}
- Number of Questions: ${amount}

Rules:
- Generate realistic industry-level MCQs
- Questions must be unique
- Include 4 options
- Include correct answer
- Include detailed explanation
- Avoid duplicate questions
- Keep questions professional and practical

Return ONLY valid JSON.

Format:
[
 {
   "question": "",
   "options": ["", "", "", ""],
   "correctAnswer": "",
   "explanation": "",
   "difficulty": ""
 }
]
`;

    const aiResult = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const rawText = aiResult.text || "[]";
    const cleanedJson = rawText.replace(/```json\n?|```/gi, "").trim();
    const parsedQuestions = JSON.parse(cleanedJson);

    // Insert questions
    for (const q of parsedQuestions) {
      await db.query(`
        INSERT INTO quiz_questions (quiz_id, question, options_json, correct_answer, explanation)
        VALUES (?, ?, ?, ?, ?)
      `, [quizId, q.question, JSON.stringify(q.options), q.correctAnswer, q.explanation]);
    }

    await db.query("UPDATE quizzes SET status = 'READY' WHERE id = ?", [quizId]);

    res.json({ success: true, quizId });

  } catch (error) {
    console.error("Generate quiz error:", error);
    res.status(500).json({ success: false, message: "Failed to generate quiz", error: String(error) });
  }
});

// Get a quiz formulation
router.get("/session/:id", async (req, res) => {
  const quizId = req.params.id;
  try {
    const [quizRows]: any = await db.query("SELECT * FROM quizzes WHERE id = ?", [quizId]);
    if (quizRows.length === 0) return res.status(404).json({ success: false, message: "Quiz not found" });

    const [questions]: any = await db.query("SELECT id, question, options_json FROM quiz_questions WHERE quiz_id = ?", [quizId]);
    
    res.json({ 
      success: true, 
      quiz: quizRows[0], 
      questions: questions.map((q: any) => {
        let options = [];
        try { options = JSON.parse(q.options_json || "[]"); } catch(e) {}
        return { ...q, options };
      }) 
    });
  } catch (error) {
    console.error("Error fetching quiz:", error);
    res.status(500).json({ success: false, message: "Error fetching quiz", error: String(error) });
  }
});

// Submit quiz answers
router.post("/submit", async (req, res) => {
  const { quizId, answers, violations } = req.body;

  try {
    let score = 0;
    
    for (const ans of answers) {
      const [qRow]: any = await db.query("SELECT correct_answer FROM quiz_questions WHERE id = ?", [ans.questionId]);
      if (qRow.length > 0) {
        const correct = qRow[0].correct_answer === ans.userAnswer;
        if (correct) score++;
        
        await db.query(`
          UPDATE quiz_questions 
          SET user_answer = ?, is_correct = ?
          WHERE id = ?
        `, [ans.userAnswer, correct, ans.questionId]);
      }
    }

    const [quizRows]: any = await db.query("SELECT total_questions FROM quizzes WHERE id = ?", [quizId]);
    const total = quizRows[0]?.total_questions || answers.length;
    const percentage = (score / total) * 100;

    await db.query(`
      UPDATE quizzes 
      SET status = 'COMPLETED', score = ?, percentage = ?, violations = ?
      WHERE id = ?
    `, [score, percentage, violations || 0, quizId]);

    // XP rewards on quiz completion are disabled as requested
    let xpEarned = 0;
    
    // Fetch user id (kept for returning correctness or if future analytics needs it)
    const [qRow]: any = await db.query("SELECT user_id FROM quizzes WHERE id = ?", [quizId]);
    const studentUserId = qRow.length > 0 ? qRow[0].user_id : null;

    // Give some AI Feedback if needed
    res.json({ success: true, score, percentage, xpEarned });

  } catch (error) {
    console.error("Submit quiz error:", error);
    res.status(500).json({ success: false, message: "Error submitting quiz", error: String(error) });
  }
});

// Get results and analysis
router.get("/result/:id", async (req, res) => {
  const quizId = req.params.id;
  try {
    const [quizRows]: any = await db.query("SELECT * FROM quizzes WHERE id = ?", [quizId]);
    if (quizRows.length === 0) return res.status(404).json({ success: false, message: "Quiz not found" });

    const [questions]: any = await db.query("SELECT id, question, options_json, correct_answer, explanation, user_answer, is_correct FROM quiz_questions WHERE quiz_id = ?", [quizId]);
    
    res.json({ 
      success: true, 
      quiz: quizRows[0], 
      questions: questions.map((q: any) => {
        let options = [];
        try { options = JSON.parse(q.options_json || "[]"); } catch(e) {}
        return { ...q, options };
      }) 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching quiz result" });
  }
});

router.get("/history/:userId", async (req, res) => {
  const userId = req.params.userId;
  try {
    const [quizzes]: any = await db.query("SELECT * FROM quizzes WHERE user_id = ? ORDER BY created_at DESC", [userId]);
    res.json({ success: true, quizzes });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching quiz history" });
  }
});

export default router;
