import express from "express";
import db from "../db.ts";
import { calculateTalentScore } from "../services/analyticsService.ts";

const router = express.Router();

// GET all psychometric questions
router.get("/questions", async (req, res) => {
  try {
    const isSQLite = !process.env.DB_HOST;
    const orderBy = isSQLite ? "RANDOM()" : "RAND()";
    const [questions]: any = await db.query(`SELECT * FROM psychometric_questions ORDER BY ${orderBy}`);
    res.json({ success: true, data: questions });
  } catch (error) {
    console.error("Error fetching psychometric questions:", error);
    res.status(500).json({ success: false, message: "Error fetching questions" });
  }
});

// POST start a new attempt
router.post("/start", async (req, res) => {
  const { userId } = req.body;
  try {
    // Check if there's already a completed attempt
    const [existing]: any = await db.query(
      "SELECT id FROM psychometric_results WHERE user_id = ?",
      [userId]
    );
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: "Assessment already completed. Only one attempt is allowed." });
    }

    // Check for an active attempt
    const [active]: any = await db.query(
      "SELECT id FROM psychometric_attempts WHERE user_id = ? AND status = 'STARTED'",
      [userId]
    );

    let attemptId;
    if (active.length > 0) {
      attemptId = active[0].id;
    } else {
      const [result]: any = await db.query(
        "INSERT INTO psychometric_attempts (user_id, status) VALUES (?, 'STARTED')",
        [userId]
      );
      attemptId = result.insertId;
    }

    res.json({ success: true, attemptId });
  } catch (error) {
    console.error("Error starting psychometric attempt:", error);
    res.status(500).json({ success: false, message: "Error starting assessment" });
  }
});

// POST log a violation
router.post("/violation", async (req, res) => {
  const { attemptId, violationType, details } = req.body;
  try {
    await db.query(
      "INSERT INTO psychometric_violations (attempt_id, violation_type, details) VALUES (?, ?, ?)",
      [attemptId, violationType, details]
    );

    // Update violation count in attempt
    if (violationType === 'TAB_SWITCH') {
      await db.query(
        "UPDATE psychometric_attempts SET tab_switches = tab_switches + 1, violation_count = violation_count + 1 WHERE id = ?",
        [attemptId]
      );
    } else {
      await db.query(
        "UPDATE psychometric_attempts SET violation_count = violation_count + 1 WHERE id = ?",
        [attemptId]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error logging violation:", error);
    res.status(500).json({ success: false, message: "Error logging violation" });
  }
});

// POST submit test
router.post("/submit", async (req, res) => {
  const { userId, attemptId, answers } = req.body; // answers: { questionId: optionIndex }
  try {
    const [questions]: any = await db.query("SELECT * FROM psychometric_questions");
    const questionMap = questions.reduce((acc: any, q: any) => {
      acc[q.id] = q;
      return acc;
    }, {});

    const traitScores: any = {};
    const categories: any = {};

    Object.keys(answers).forEach((qId: string) => {
      const question = questionMap[qId];
      if (!question) return;

      const optionIndex = answers[qId];
      const options = typeof question.options_json === 'string' ? JSON.parse(question.options_json) : question.options_json;
      const selectedOption = options[optionIndex];

      if (selectedOption && selectedOption.mapping) {
        Object.keys(selectedOption.mapping).forEach(trait => {
          traitScores[trait] = (traitScores[trait] || 0) + selectedOption.mapping[trait];
        });
        categories[question.category] = (categories[question.category] || 0) + 1;
      }
    });

    // Normalize scores (0-100)
    // For simplicity, let's assume each trait could have a max score based on the number of questions it appeared in.
    // In a real system, this would be more complex.
    const normalizedTraits: any = {};
    Object.keys(traitScores).forEach(trait => {
      // Basic normalization: cap at 100 for now, or use a more sophisticated method if we had trait-question counts
      normalizedTraits[trait] = Math.min(Math.round(traitScores[trait] * 10), 100); 
    });

    const overallScore = Object.values(normalizedTraits).reduce((a: any, b: any) => a + b, 0) as number / Object.keys(normalizedTraits).length;

    // Determine Personality Type & Summary
    let personalityType = "Balanced Professional";
    if (normalizedTraits['Leadership'] > 80) personalityType = "Strategic Leader";
    else if (normalizedTraits['Teamwork'] > 80) personalityType = "Collaborative Expert";
    else if (normalizedTraits['Problem Solving'] > 80) personalityType = "Analytical Thinker";

    const behavioralSummary = `Candidate shows strong ${Object.keys(normalizedTraits).sort((a, b) => normalizedTraits[b] - normalizedTraits[a]).slice(0, 2).join(" and ")} capabilities.`;
    
    const recommendationTags = [];
    if (overallScore > 80) recommendationTags.push("High Potential", "Culturally Fit");
    if (normalizedTraits['Leadership'] > 75) recommendationTags.push("Leadership Material");

    // Save Results
    await db.query(
      "INSERT INTO psychometric_results (user_id, attempt_id, overall_score, traits_json, personality_type, behavioral_summary, recommendation_tags) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [userId, attemptId, overallScore, JSON.stringify(normalizedTraits), personalityType, behavioralSummary, JSON.stringify(recommendationTags)]
    );

    // Mark attempt as completed
    await db.query(
      "UPDATE psychometric_attempts SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP WHERE id = ?",
      [attemptId]
    );

    // Update VEGA Employability Score
    await calculateTalentScore(userId);

    res.json({ 
      success: true, 
      data: { 
        overallScore, 
        traits: normalizedTraits, 
        personalityType, 
        behavioralSummary, 
        recommendationTags 
      } 
    });
  } catch (error) {
    console.error("Error submitting psychometric test:", error);
    res.status(500).json({ success: false, message: "Error submitting assessment" });
  }
});

// GET result for a student
router.get("/result/:userId", async (req, res) => {
  try {
    const [results]: any = await db.query(
      "SELECT * FROM psychometric_results WHERE user_id = ?",
      [req.params.userId]
    );
    res.json({ success: true, data: results[0] || null });
  } catch (error) {
    console.error("Error fetching psychometric result:", error);
    res.status(500).json({ success: false, message: "Error fetching result" });
  }
});

export default router;
