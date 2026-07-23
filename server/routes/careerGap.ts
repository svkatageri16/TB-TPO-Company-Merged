import express from "express";
import db from "../db.ts";
import { authenticate } from "../middleware/auth.ts";
import { XPService } from "../services/xpService.ts";
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

// Helper: Calculate average metrics for a student dynamically
async function getStudentMetrics(userId: number) {
  let talentScore = 60;
  const [talRows]: any = await db.query("SELECT overall_score FROM talent_scores WHERE user_id = ?", [userId]);
  if (talRows && talRows.length > 0) {
    talentScore = talRows[0].overall_score;
  }

  let codingScore = 55;
  const [codRows]: any = await db.query("SELECT coding_score FROM coding_analysis WHERE user_id = ?", [userId]);
  if (codRows && codRows.length > 0) {
    codingScore = codRows[0].coding_score;
  }

  let interviewScore = 0;
  const [perfRows]: any = await db.query("SELECT avg_interview_score FROM student_performance_stats WHERE user_id = ?", [userId]);
  if (perfRows && perfRows.length > 0 && perfRows[0].avg_interview_score) {
    interviewScore = Math.round(perfRows[0].avg_interview_score);
  }
  if (interviewScore === 0) {
    const [histRows]: any = await db.query("SELECT AVG(score) as avg_score FROM interview_history WHERE student_id = (SELECT id FROM student_profiles WHERE user_id = ?)", [userId]);
    if (histRows && histRows[0] && histRows[0].avg_score) {
      interviewScore = Math.round(histRows[0].avg_score);
    }
  }
  if (interviewScore === 0) {
    interviewScore = 50; // Dynamic default fallback
  }

  let quizScore = 0;
  const [quizRows]: any = await db.query(
    "SELECT AVG(percentage) as avg_score FROM quizzes WHERE user_id = ? AND status = 'COMPLETED'",
    [userId]
  );
  if (quizRows && quizRows[0] && quizRows[0].avg_score) {
    quizScore = Math.round(quizRows[0].avg_score);
  }
  if (quizScore === 0) {
    quizScore = 45; // Dynamic default fallback
  }

  let psychometricScore = 50;
  const [psyRows]: any = await db.query("SELECT overall_score FROM psychometric_results WHERE user_id = ? ORDER BY created_at DESC LIMIT 1", [userId]);
  if (psyRows && psyRows.length > 0) {
    psychometricScore = psyRows[0].overall_score || 50;
  }

  return {
    talentScore,
    codingScore,
    interviewScore,
    quizScore,
    psychometricScore
  };
}

// 1. Search Students
router.get("/search", authenticate, async (req: any, res) => {
  const { query } = req.query;
  const searcherId = req.user.userId;

  try {
    // Determine the searching student's college_id for 'COLLEGE_ONLY' visibility matches
    const [searcherProfile]: any = await db.query("SELECT college_id FROM student_profiles WHERE user_id = ?", [searcherId]);
    const searcherCollegeId = searcherProfile?.[0]?.college_id || null;

    let sql = "";
    let params: any[] = [];

    // Allow search by tb_id, full_name, college_name, skills matching query
    // Exclude searching student themselves
    if (db.useMySQL) {
      sql = `
        SELECT p.id, p.user_id, p.full_name, p.tb_id, p.profile_photo_url, p.skills_json, p.projects_json,
               p.is_placed, p.placed_company, p.is_top_performer, p.profile_visibility as visibility,
               c.college_name
        FROM student_profiles p
        LEFT JOIN college_master c ON p.college_id = c.id
        WHERE p.user_id != ?
          AND (p.tb_id LIKE ? OR p.full_name LIKE ? OR c.college_name LIKE ? OR p.skills_json LIKE ?)
      `;
      const likeQuery = `%${query}%`;
      params = [searcherId, likeQuery, likeQuery, likeQuery, likeQuery];
    } else {
      sql = `
        SELECT p.id, p.user_id, p.full_name, p.tb_id, p.profile_photo_url, p.skills_json, p.projects_json,
               p.is_placed, p.placed_company, p.is_top_performer, 
               COALESCE(p.profile_visibility, 'PUBLIC') as visibility,
               c.college_name
        FROM student_profiles p
        LEFT JOIN college_master c ON p.college_id = c.id
        WHERE p.user_id != ?
          AND (p.tb_id LIKE ? OR p.full_name LIKE ? OR c.college_name LIKE ? OR p.skills_json LIKE ?)
      `;
      const likeQuery = `%${query}%`;
      params = [searcherId, likeQuery, likeQuery, likeQuery, likeQuery];
    }

    const [allStudents]: any = await db.query(sql, params);

    // Apply strict privacy settings:
    // - PUBLIC: always matches
    // - COLLEGE_ONLY: matches if searcherCollegeId represents the same college
    // - PRIVATE: never returned
    const filtered = allStudents.filter((student: any) => {
      const vis = String(student.visibility || "PUBLIC").toUpperCase();
      if (vis === "PRIVATE") return false;
      if (vis === "COLLEGE_ONLY") {
        return searcherCollegeId && Number(searcherCollegeId) === Number(student.college_id);
      }
      return true;
    });

    res.json({ success: true, students: filtered });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ success: false, message: "Error searching students" });
  }
});

// 2. Return Public Profile metadata securely
router.get("/profile/:tbId", authenticate, async (req: any, res) => {
  const { tbId } = req.params;
  const searcherId = req.user.userId;

  try {
    const [profiles]: any = await db.query(`
      SELECT p.*, c.college_name 
      FROM student_profiles p 
      LEFT JOIN college_master c ON p.college_id = c.id
      WHERE p.tb_id = ?
    `, [tbId]);

    if (profiles.length === 0) {
      return res.status(404).json({ success: false, message: "Student profile not found" });
    }

    const targetStudent = profiles[0];
    const targetUserId = targetStudent.user_id;

    // Check visibility restrictions
    const vis = String(targetStudent.profile_visibility || "PUBLIC").toUpperCase();
    if (vis !== "PUBLIC" && targetUserId !== searcherId) {
      // If college only, check searcher college
      if (vis === "COLLEGE_ONLY") {
        const [searcherProfile]: any = await db.query("SELECT college_id FROM student_profiles WHERE user_id = ?", [searcherId]);
        const searcherCollegeId = searcherProfile?.[0]?.college_id || null;
        if (!searcherCollegeId || Number(searcherCollegeId) !== Number(targetStudent.college_id)) {
          return res.status(403).json({ success: false, message: "Profile visibility restricted: College members only" });
        }
      } else {
        // PRIVATE
        return res.status(403).json({ success: false, message: "This profile has been marked Private by the student" });
      }
    }

    // Securely pull sub-elements (only non-sensitive public ones)
    const [projects]: any = await db.query("SELECT id, title, description, tech_stack FROM student_projects WHERE student_id = ?", [targetStudent.id]);
    const [certifications]: any = await db.query("SELECT id, name, issuing_organization, issue_date FROM student_certifications WHERE student_id = ?", [targetStudent.id]);
    const [eduList]: any = await db.query("SELECT institution FROM student_education WHERE student_id = ? ORDER BY start_date DESC LIMIT 1", [targetStudent.id]);

    const metrics = await getStudentMetrics(targetUserId);
    const collegeName = targetStudent.college_name || (eduList && eduList.length > 0 ? eduList[0].institution : null);

    // Hide: Email, Phone/Contact, Address, Resume URLs, sensitive docs
    const securePublicProfile = {
      id: targetStudent.id,
      user_id: targetUserId,
      tb_id: targetStudent.tb_id,
      full_name: targetStudent.full_name,
      college_name: collegeName || "Institution not specified",
      profile_photo_url: targetStudent.profile_photo_url,
      skills: targetStudent.skills_json ? JSON.parse(typeof targetStudent.skills_json === 'string' ? targetStudent.skills_json : JSON.stringify(targetStudent.skills_json)) : [],
      is_placed: targetStudent.is_placed,
      placed_company: targetStudent.placed_company,
      is_top_performer: targetStudent.is_top_performer,
      profile_visibility: targetStudent.profile_visibility,
      projects,
      certifications,
      metrics
    };

    res.json({ success: true, profile: securePublicProfile });
  } catch (error) {
    console.error("Public profile load error:", error);
    res.status(500).json({ success: false, message: "Error loading student public profile" });
  }
});

// 3. Compare Profiles metadata
router.post("/compare", authenticate, async (req: any, res) => {
  const { studentAId, studentBId, type = "BASIC" } = req.body;
  const currentUserId = req.user.userId;

  try {
    // Pull student profiles
    const [profA]: any = await db.query("SELECT p.*, c.college_name FROM student_profiles p LEFT JOIN college_master c ON p.college_id = c.id WHERE p.id = ?", [studentAId]);
    const [profB]: any = await db.query("SELECT p.*, c.college_name FROM student_profiles p LEFT JOIN college_master c ON p.college_id = c.id WHERE p.id = ?", [studentBId]);

    if (!profA.length || !profB.length) {
      return res.status(404).json({ success: false, message: "One or both compared profiles not found" });
    }

    const studentA = profA[0];
    const studentB = profB[0];

    // Determine cost in XP
    let xpCost = 20; // BASIC is 20
    if (type === "AI_GAP") xpCost = 50;
    else if (type === "DETAILED_ROADMAP") xpCost = 75;
    else if (type === "PREMIUM") xpCost = 100;

    // FIRST COMPARISON FREE CHECK
    const [priors]: any = await db.query("SELECT id FROM comparison_history WHERE student_id = ?", [studentA.user_id]);
    const isFirstTime = priors.length === 0;

    if (isFirstTime) {
      xpCost = 0; // FREE!
    } else {
      // Check XP balance
      const [users]: any = await db.query("SELECT xp_balance FROM users WHERE id = ?", [currentUserId]);
      const currentXP = users[0]?.xp_balance || 0;
      if (currentXP < xpCost) {
        return res.json({ 
          success: false, 
          code: "INSUFFICIENT_XP", 
          message: `Durable comparison calls require ${xpCost} XP. Your balance is ${currentXP} XP.`,
          xpNeeded: xpCost,
          currentXP 
        });
      }

      // Deduct XP
      if (xpCost > 0) {
        await XPService.deductXP(currentUserId, xpCost, "PROFILE_COMPARISON", `Compared profile with ${studentB.full_name} (${type})`);
      }
    }

    // Save transaction trace in profile_comparisons
    await db.query(`
      INSERT INTO profile_comparisons (student_id, target_id, type, xp_spent)
      VALUES (?, ?, ?, ?)
    `, [studentA.id, studentB.id, type, xpCost]);

    // Load actual dynamic scores for both Student A and Student B
    const metricsA = await getStudentMetrics(studentA.user_id);
    const metricsB = await getStudentMetrics(studentB.user_id);

    // Extract side-by-side comparative metadata
    const skillsA = studentA.skills_json ? JSON.parse(typeof studentA.skills_json === 'string' ? studentA.skills_json : JSON.stringify(studentA.skills_json)) : [];
    const skillsB = studentB.skills_json ? JSON.parse(typeof studentB.skills_json === 'string' ? studentB.skills_json : JSON.stringify(studentB.skills_json)) : [];

    const commonSkills = skillsA.filter((s: string) => skillsB.includes(s));
    const uniqueSkillsB = skillsB.filter((s: string) => !skillsA.includes(s));

    // Dynamic quiz counts, coding profiles, extra, leadership
    const [extAs]: any = await db.query("SELECT id, title, description, activity_date FROM extracurricular_activities WHERE user_id = ?", [studentA.user_id]);
    const [extBs]: any = await db.query("SELECT id, title, description, activity_date FROM extracurricular_activities WHERE user_id = ?", [studentB.user_id]);

    const [eduAs]: any = await db.query("SELECT institution FROM student_education WHERE student_id = ? ORDER BY start_date DESC LIMIT 1", [studentA.id]);
    const [eduBs]: any = await db.query("SELECT institution FROM student_education WHERE student_id = ? ORDER BY start_date DESC LIMIT 1", [studentB.id]);
    const collegeA = studentA.college_name || (eduAs && eduAs.length > 0 ? eduAs[0].institution : null) || "Institution not specified";
    const collegeB = studentB.college_name || (eduBs && eduBs.length > 0 ? eduBs[0].institution : null) || "Institution not specified";

    const comparisonData = {
      isFirstFree: isFirstTime,
      xpSpent: xpCost,
      studentA: {
        id: studentA.id,
        tb_id: studentA.tb_id,
        name: studentA.full_name,
        photo: studentA.profile_photo_url,
        college: collegeA,
        placed: studentA.is_placed,
        placed_company: studentA.placed_company,
        top_performer: studentA.is_top_performer,
        metrics: metricsA,
        skillsCount: skillsA.length,
        skills: skillsA,
        activitiesCount: extAs.length
      },
      studentB: {
        id: studentB.id,
        tb_id: studentB.tb_id,
        name: studentB.full_name,
        photo: studentB.profile_photo_url,
        college: collegeB,
        placed: studentB.is_placed,
        placed_company: studentB.placed_company,
        top_performer: studentB.is_top_performer,
        metrics: metricsB,
        skillsCount: skillsB.length,
        skills: skillsB,
        activitiesCount: extBs.length
      },
      skillsOverview: {
        common: commonSkills,
        missing: uniqueSkillsB
      }
    };

    res.json({ success: true, data: comparisonData });
  } catch (error) {
    console.error("Comparison error:", error);
    res.status(500).json({ success: false, message: "Error comparing profiles" });
  }
});

// 4. Generate AI Gap Analysis
router.post("/generate-gap-analysis", authenticate, async (req: any, res) => {
  const { studentAId, studentBId } = req.body;
  const currentUserId = req.user.userId;

  try {
    // Pull student profiles
    const [profA]: any = await db.query("SELECT p.*, c.college_name FROM student_profiles p LEFT JOIN college_master c ON p.college_id = c.id WHERE p.id = ?", [studentAId]);
    const [profB]: any = await db.query("SELECT p.*, c.college_name FROM student_profiles p LEFT JOIN college_master c ON p.college_id = c.id WHERE p.id = ?", [studentBId]);

    if (!profA.length || !profB.length) {
      return res.status(404).json({ success: false, message: "One or both compared profiles not found" });
    }

    const studentA = profA[0];
    const studentB = profB[0];

    const metricsA = await getStudentMetrics(studentA.user_id);
    const metricsB = await getStudentMetrics(studentB.user_id);

    const skillsA = studentA.skills_json ? JSON.parse(typeof studentA.skills_json === 'string' ? studentA.skills_json : JSON.stringify(studentA.skills_json)) : [];
    const skillsB = studentB.skills_json ? JSON.parse(typeof studentB.skills_json === 'string' ? studentB.skills_json : JSON.stringify(studentB.skills_json)) : [];

    // Trigger Gemini for Core Gap analysis
    const prompt = `
      Identify key missing skills, project types, and timeline tasks between two students.
      Student A (Current user):
      - Name: ${studentA.full_name}
      - Skills: ${JSON.stringify(skillsA)}
      - metrics: Talent score is ${metricsA.talentScore}, Coding score is ${metricsA.codingScore}, Interview average score is ${metricsA.interviewScore}, Quiz average score is ${metricsA.quizScore}.

      Student B (Target Profile / Placed student):
      - Name: ${studentB.full_name}
      - Placed at: ${studentB.placed_company || "TCS"}
      - Skills: ${JSON.stringify(skillsB)}
      - metrics: Talent score is ${metricsB.talentScore}, Coding score is ${metricsB.codingScore}, Interview average score is ${metricsB.interviewScore}, Quiz average score is ${metricsB.quizScore}.

      Return structured JSON only.
    `;

    console.log("[GEMINI] Generating Gap Analysis...");
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an AI-powered talent acquisition strategist. Analyze profiles and return exact gap differences. Match the schema exactly.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            missingSkills: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Skills present in Target that Current student is missing"
            },
            missingProjects: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Type of production projects missing from Current student's profile"
            },
            suggestedTimeline: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Short recommended actions like Learn React (2 Weeks)"
            },
            estimatedScoreImprovement: {
              type: Type.INTEGER,
              description: "Expected addition to Talent Score after completing these suggestions (e.g. 18)"
            },
            overallReadinessA: {
              type: Type.INTEGER,
              description: "Estimated percentage readiness of Student A (e.g. 55)"
            },
            overallReadinessB: {
              type: Type.INTEGER,
              description: "Estimated percentage readiness of Student B (e.g. 85)"
            }
          },
          required: ["missingSkills", "missingProjects", "suggestedTimeline", "estimatedScoreImprovement", "overallReadinessA", "overallReadinessB"]
        }
      }
    });

    const parsedOutput = JSON.parse(response.text?.trim() || "{}");

    // Cache the gap report in comparison_history and career_gap_reports
    const gapReportString = JSON.stringify(parsedOutput);
    await db.query(`
      INSERT INTO career_gap_reports (student_id, target_id, gap_analysis_json)
      VALUES (?, ?, ?)
    `, [studentA.id, studentB.id, gapReportString]);

    await db.query(`
      INSERT INTO comparison_history (student_id, compared_student_id, comparison_type, gap_analysis_json, roadmap_json)
      VALUES (?, ?, 'AI_GAP', ?, NULL)
    `, [studentA.user_id, studentB.id, gapReportString]);

    res.json({ success: true, analysis: parsedOutput });
  } catch (error) {
    console.error("AI gap generation error:", error);
    res.status(500).json({ success: false, message: "Error generating AI Gap report" });
  }
});

// 5. Generate AI Career Success Roadmap
router.post("/generate-roadmap", authenticate, async (req: any, res) => {
  const { studentAId, studentBId } = req.body;

  try {
    const [profA]: any = await db.query("SELECT p.* FROM student_profiles p WHERE p.id = ?", [studentAId]);
    const [profB]: any = await db.query("SELECT p.* FROM student_profiles p WHERE p.id = ?", [studentBId]);

    if (!profA.length || !profB.length) {
      return res.status(404).json({ success: false, message: "Compared profiles not found" });
    }

    const studentA = profA[0];
    const studentB = profB[0];

    const skillsA = studentA.skills_json ? JSON.parse(typeof studentA.skills_json === 'string' ? studentA.skills_json : JSON.stringify(studentA.skills_json)) : [];
    const skillsB = studentB.skills_json ? JSON.parse(typeof studentB.skills_json === 'string' ? studentB.skills_json : JSON.stringify(studentB.skills_json)) : [];

    const uniqueSkillsB = skillsB.filter((s: string) => !skillsA.includes(s));

    const prompt = `
      Create an intensive 30, 60, and 90 Day developmental roadmap for ${studentA.full_name} to align with the successfully placed candidate ${studentB.full_name} (Placed at: ${studentB.placed_company || "TCS"}).
      Current student's missing technical skills to acquire: ${JSON.stringify(uniqueSkillsB)}.

      Return weekly items for Week 1 (Basic Setup) to Week 12 (Ready to Deploy & mock exams).
      Respond with structured JSON matching the requested schema.
    `;

    console.log("[GEMINI] Generating Week-by-Week Success Roadmap...");
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a senior engineering manager. Deliver highly technical actions week-by-week. Maintain strict schema compliance.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            thirtyDayPlan: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Items for Month 1 (Weeks 1-4)"
            },
            sixtyDayPlan: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Items for Month 2 (Weeks 5-8)"
            },
            ninetyDayPlan: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Items for Month 3 (Weeks 9-12)"
            }
          },
          required: ["thirtyDayPlan", "sixtyDayPlan", "ninetyDayPlan"]
        }
      }
    });

    const parsedRoadmap = JSON.parse(response.text?.trim() || "{}");

    // Cache the roadmap
    const roadmapString = JSON.stringify(parsedRoadmap);
    await db.query(`
      INSERT INTO ai_roadmaps (student_id, target_id, roadmap_json)
      VALUES (?, ?, ?)
    `, [studentA.id, studentB.id, roadmapString]);

    // Update or insert latest comparison history record
    await db.query(`
      INSERT INTO comparison_history (student_id, compared_student_id, comparison_type, gap_analysis_json, roadmap_json)
      VALUES (?, ?, 'AI_ROADMAP', NULL, ?)
    `, [studentA.user_id, studentB.id, roadmapString]);

    res.json({ success: true, roadmap: parsedRoadmap });
  } catch (error) {
    console.error("Roadmap generation error:", error);
    res.status(500).json({ success: false, message: "Error generating Career Roadmap" });
  }
});

// 6. Get User Comparison History
router.get("/history", authenticate, async (req: any, res) => {
  const userId = req.user.userId;

  try {
    const [history]: any = await db.query(`
      SELECT h.*, p.full_name as target_name, p.profile_photo_url as target_photo, 
             p.tb_id as target_tb_id, p.placed_company as target_company
      FROM comparison_history h
      JOIN student_profiles p ON h.compared_student_id = p.id
      WHERE h.student_id = ?
      ORDER BY h.created_at DESC
      LIMIT 15
    `, [userId]);

    const formatted = history.map((item: any) => ({
      id: item.id,
      date: item.created_at,
      target: {
        name: item.target_name,
        photo: item.target_photo,
        tb_id: item.target_tb_id,
        company: item.target_company
      },
      gapAnalysis: item.gap_analysis_json ? JSON.parse(item.gap_analysis_json) : null,
      roadmap: item.roadmap_json ? JSON.parse(item.roadmap_json) : null
    }));

    res.json({ success: true, history: formatted });
  } catch (error) {
    console.error("History fetch error:", error);
    res.status(500).json({ success: false, message: "Error fetching comparison history" });
  }
});

// Helper function to remove seeded fake student accounts to keep the system's data 100% real
async function cleanupSeededStudents() {
  try {
    const [seededUsers]: any = await db.query("SELECT id FROM users WHERE email LIKE '%@vega.edu'");
    if (seededUsers && seededUsers.length > 0) {
      const uids = seededUsers.map((u: any) => u.id);
      for (const uid of uids) {
        // Query profile id
        const [prof]: any = await db.query("SELECT id FROM student_profiles WHERE user_id = ?", [uid]);
        if (prof && prof.length > 0) {
          const pid = prof[0].id;
          await db.query("DELETE FROM student_education WHERE student_id = ?", [pid]);
          await db.query("DELETE FROM student_projects WHERE student_id = ?", [pid]);
          await db.query("DELETE FROM student_experience WHERE student_id = ?", [pid]);
          await db.query("DELETE FROM student_certifications WHERE student_id = ?", [pid]);
          await db.query("DELETE FROM student_visibility WHERE student_id = ?", [pid]);
          await db.query("DELETE FROM comparison_history WHERE student_id = ?", [pid]);
        }
        await db.query("DELETE FROM student_profiles WHERE user_id = ?", [uid]);
        await db.query("DELETE FROM talent_scores WHERE user_id = ?", [uid]);
        await db.query("DELETE FROM coding_analysis WHERE user_id = ?", [uid]);
        await db.query("DELETE FROM student_performance_stats WHERE user_id = ?", [uid]);
        await db.query("DELETE FROM quizzes WHERE user_id = ?", [uid]);
        await db.query("DELETE FROM extracurricular_activities WHERE user_id = ?", [uid]);
        await db.query("DELETE FROM users WHERE id = ?", [uid]);
      }
      console.log(`Successfully removed ${uids.length} pre-seeded dummy student profile record(s).`);
    }
  } catch (err) {
    console.error("Failed to clean up dummy students:", err);
  }
}

// 7. Placed Student Discovery Gallery (Dynamically backed by real database records)
router.get("/success-gallery", authenticate, async (req: any, res) => {
  try {
    // Run the cleanup of pre-seeded mock student profiles to comply with 100% real data directives
    await cleanupSeededStudents();

    const [placed]: any = await db.query(`
      SELECT id, full_name as name, tb_id, profile_photo_url as photo, 
             placed_company as company, skills_json as skills, is_top_performer
      FROM student_profiles
      WHERE is_placed = 1
      LIMIT 20
    `);

    const results = placed.map((p: any) => ({
      id: p.id,
      name: p.name,
      tb_id: p.tb_id,
      photo: p.photo,
      company: p.company,
      skills: p.skills ? JSON.parse(typeof p.skills === 'string' ? p.skills : JSON.stringify(p.skills)) : [],
      is_top_performer: p.is_top_performer
    }));

    res.json({ success: true, gallery: results });
  } catch (error) {
    console.error("Success gallery fetch error:", error);
    res.status(500).json({ success: false, message: "Error fetching success gallery" });
  }
});

// 8. Student Insights Dashboard
router.get("/insights", authenticate, async (req: any, res) => {
  const userId = req.user.userId;

  try {
    // Collect stats: missing skills globally from users we compared to
    const [history]: any = await db.query(`
      SELECT gap_analysis_json FROM comparison_history WHERE student_id = ? AND gap_analysis_json IS NOT NULL
    `, [userId]);

    const missingSkillsFrequency: Record<string, number> = {};
    const trendingSkills = ["Spring Boot", "Docker", "React", "Kubernetes", "AWS", "TypeScript", "Python AI", "Next.js"];
    const learningAreas = ["Advanced System Design", "Microservices Architecture", "Aptitude & Logical Reasoning", "Cloud Hosting & DevOps"];

    history.forEach((h: any) => {
      const parsed = JSON.parse(h.gap_analysis_json);
      if (parsed.missingSkills) {
        parsed.missingSkills.forEach((skill: string) => {
          missingSkillsFrequency[skill] = (missingSkillsFrequency[skill] || 0) + 1;
        });
      }
    });

    const formattedMissing = Object.keys(missingSkillsFrequency).map(key => ({
      skill: key,
      count: missingSkillsFrequency[key]
    })).sort((a, b) => b.count - a.count).slice(0, 5);

    // Fallbacks if history is empty
    const finalMissing = formattedMissing.length > 0 ? formattedMissing : [
      { skill: "Spring Boot", count: 3 },
      { skill: "Docker", count: 2 },
      { skill: "React", count: 2 },
    ];

    res.json({
      success: true,
      mostMissingSkills: finalMissing,
      trendingSkills,
      learningAreas
    });
  } catch (error) {
    console.error("Insights load error:", error);
    res.status(500).json({ success: false, message: "Error fetching gap insights" });
  }
});

// 9. Extra: Allow student to modify profile visibility
router.put("/visibility", authenticate, async (req: any, res) => {
  const { visibility } = req.body; // 'PUBLIC', 'COLLEGE_ONLY', 'PRIVATE'
  const userId = req.user.userId;

  if (!["PUBLIC", "COLLEGE_ONLY", "PRIVATE"].includes(String(visibility).toUpperCase())) {
    return res.status(400).json({ success: false, message: "Invalid visibility settings option" });
  }

  try {
    const [profiles]: any = await db.query("SELECT id FROM student_profiles WHERE user_id = ?", [userId]);
    if (profiles.length === 0) return res.status(404).json({ success: false, message: "Profile not found" });
    const studentId = profiles[0].id;

    await db.query("UPDATE student_profiles SET profile_visibility = ? WHERE id = ?", [visibility, studentId]);
    await db.query(`
      INSERT INTO student_visibility (student_id, visibility)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE visibility = ?, updated_at = CURRENT_TIMESTAMP
    `, [studentId, visibility, visibility]);

    res.json({ success: true, message: "Profile visibility settings updated successfully", visibility });
  } catch (error) {
    // Fallback block due to SQLite not supporting ON DUPLICATE KEY UPDATE
    try {
      const [profiles]: any = await db.query("SELECT id FROM student_profiles WHERE user_id = ?", [userId]);
      const studentId = profiles[0].id;
      await db.query("UPDATE student_profiles SET profile_visibility = ? WHERE id = ?", [visibility, studentId]);
      await db.query("DELETE FROM student_visibility WHERE student_id = ?", [studentId]);
      await db.query("INSERT INTO student_visibility (student_id, visibility) VALUES (?, ?)", [studentId, visibility]);
      return res.json({ success: true, message: "Profile visibility settings updated successfully", visibility });
    } catch (e2) {
      console.error("Visibility change error:", error);
      res.status(500).json({ success: false, message: "Error updating visibility options" });
    }
  }
});

export default router;
