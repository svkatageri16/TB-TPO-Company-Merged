import express from "express";
import db from "../db.ts";
import { authenticate } from "../middleware/auth.ts";
import { calculateTalentScore, updateDailyTask, updateLoginStreak } from "../services/analyticsService.ts";
import multer from "multer";
import path from "path";
import fs from "fs";
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

// Simple in-memory cache for institution autocomplete queries
const institutionCache: Record<string, string[]> = {};

// Multer config for resume uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "./uploads/resumes";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "resume-" + uniqueSuffix + path.extname(file.originalname).toLowerCase());
  }
});

const isSafeExtension = (filename: string, allowedExts: string[]): boolean => {
  const ext = path.extname(filename).toLowerCase();
  const parts = filename.split('.');
  if (parts.length > 2) {
    const dangerousExts = ['.js', '.jsx', '.ts', '.tsx', '.sh', '.bash', '.php', '.exe', '.bat', '.cmd', '.py', '.pl', '.html', '.htm', '.jsp', '.asp', '.aspx'];
    for (const part of parts) {
      if (dangerousExts.includes('.' + part.toLowerCase())) {
        return false;
      }
    }
  }
  return allowedExts.includes(ext);
};

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf" && isSafeExtension(file.originalname, ['.pdf'])) {
      cb(null, true);
    } else {
      cb(new Error("Only safe, single-extension PDF files are allowed. Double extensions or malicious binaries are blocked."));
    }
  }
});

// Upload Resume File
router.post("/upload-resume/:userId", (req, res) => {
  upload.single("resume")(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: "Resume file is too large. Max size is 5MB." });
      }
      return res.status(400).json({ success: false, message: err.message });
    }
    
    const { userId } = req.params;
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
      }

      const { uploadToCloudBucket } = await import("../services/storageService.ts");
      const resumeUrl = await uploadToCloudBucket(req.file.path, req.file.originalname, req.file.mimetype);
      
      const [profiles]: any = await db.query("SELECT id FROM student_profiles WHERE user_id = ?", [userId]);
      if (profiles.length === 0) return res.status(404).json({ success: false, message: "Profile not found" });
      const studentId = profiles[0].id;

      await db.query("UPDATE student_profiles SET resume_url = ? WHERE id = ?", [resumeUrl, studentId]);

      // Recalculate Completeness Score
      const [finalProfile]: any = await db.query("SELECT * FROM student_profiles WHERE id = ?", [studentId]);
      const [finalEdu]: any = await db.query("SELECT * FROM student_education WHERE student_id = ?", [studentId]);
      const [finalProj]: any = await db.query("SELECT * FROM student_projects WHERE student_id = ?", [studentId]);
      const [finalExp]: any = await db.query("SELECT * FROM student_experience WHERE student_id = ?", [studentId]);
      const [finalCert]: any = await db.query("SELECT * FROM student_certifications WHERE student_id = ?", [studentId]);
      
      let score = 0;
      const p = finalProfile[0];
      
      if (p.full_name && p.contact && p.location && p.profile_photo_url) score += 15;
      if (p.preferred_job_role && p.preferred_location) score += 10;
      let eduCount = finalEdu.length;
      if (eduCount === 0 && p.education_json) {
         try { const j = JSON.parse(p.education_json); if(Array.isArray(j)) eduCount = j.length; } catch(e){}
      }
      if (eduCount > 0) score += 15;
      
      let skills = [];
      try { skills = JSON.parse(p.skills_json || "[]"); } catch(e) {}
      if (skills.length >= 3) score += 15;
      else if (skills.length > 0) score += 5;
      
      let projCount = finalProj.length;
      if (projCount === 0 && p.projects_json) {
         try { const j = JSON.parse(p.projects_json); if(Array.isArray(j)) projCount = j.length; } catch(e){}
      }
      if (projCount > 0) score += 15;
      
      if (p.bio && p.bio.length > 40) score += 10;
      if (p.resume_url) score += 15;
      
      const [finalExtra]: any = await db.query("SELECT * FROM extracurricular_activities WHERE user_id = ?", [userId]);
      let extraCount = finalExp.length + finalCert.length + finalExtra.length;
      if (extraCount === 0) {
         const hasExpJson = p.experience_json && p.experience_json !== "[]" && p.experience_json !== "null";
         const hasCertJson = p.custom_sections_json && p.custom_sections_json.includes('certifications');
         if (hasExpJson || hasCertJson) extraCount = 1;
      }
      if (extraCount > 0) score += 5;

      await db.query("UPDATE student_profiles SET completeness_score = ? WHERE id = ?", [score, studentId]);

      // Recalculate score
      await calculateTalentScore(Number(userId));
      
      res.json({ success: true, resumeUrl, score });
    } catch (error: any) {
      console.error("Resume upload error:", error);
      res.status(500).json({ success: false, message: error.message || "Failed to upload resume" });
    }
  });
});

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "./uploads/avatars";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "avatar-" + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadAvatar = multer({ 
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
    if (file.mimetype.startsWith("image/") && isSafeExtension(file.originalname, allowedExts)) {
      cb(null, true);
    } else {
      cb(new Error("Only standard images are allowed. Potential malicious double extensions are blocked."));
    }
  }
});

// Upload Profile Photo
router.post("/upload-avatar/:userId", (req, res) => {
  uploadAvatar.single("avatar")(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: "Profile photo is too large. Max size is 5MB." });
      }
      return res.status(400).json({ success: false, message: err.message });
    }

    const { userId } = req.params;
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
      }

      const { uploadToCloudBucket } = await import("../services/storageService.ts");
      const avatarUrl = await uploadToCloudBucket(req.file.path, req.file.originalname, req.file.mimetype);
      
      const [profiles]: any = await db.query("SELECT id FROM student_profiles WHERE user_id = ?", [userId]);
      if (profiles.length === 0) return res.status(404).json({ success: false, message: "Profile not found" });
      const studentId = profiles[0].id;

      await db.query("UPDATE student_profiles SET profile_photo_url = ? WHERE id = ?", [avatarUrl, studentId]);
      
      // Recalculate Completeness Score
      const [finalProfile]: any = await db.query("SELECT * FROM student_profiles WHERE id = ?", [studentId]);
      const [finalEdu]: any = await db.query("SELECT * FROM student_education WHERE student_id = ?", [studentId]);
      const [finalProj]: any = await db.query("SELECT * FROM student_projects WHERE student_id = ?", [studentId]);
      const [finalExp]: any = await db.query("SELECT * FROM student_experience WHERE student_id = ?", [studentId]);
      const [finalCert]: any = await db.query("SELECT * FROM student_certifications WHERE student_id = ?", [studentId]);
      
      let score = 0;
      const p = finalProfile[0];
      
      if (p.full_name && p.contact && p.location && p.profile_photo_url) score += 15;
      if (p.preferred_job_role && p.preferred_location) score += 10;
      let eduCount = finalEdu.length;
      if (eduCount === 0 && p.education_json) {
         try { const j = JSON.parse(p.education_json); if(Array.isArray(j)) eduCount = j.length; } catch(e){}
      }
      if (eduCount > 0) score += 15;
      
      let skills = [];
      try { skills = JSON.parse(p.skills_json || "[]"); } catch(e) {}
      if (skills.length >= 3) score += 15;
      else if (skills.length > 0) score += 5;
      
      let projCount = finalProj.length;
      if (projCount === 0 && p.projects_json) {
         try { const j = JSON.parse(p.projects_json); if(Array.isArray(j)) projCount = j.length; } catch(e){}
      }
      if (projCount > 0) score += 15;
      
      if (p.bio && p.bio.length > 40) score += 10;
      if (p.resume_url) score += 15;
      
      const [finalExtra]: any = await db.query("SELECT * FROM extracurricular_activities WHERE user_id = ?", [userId]);
      let extraCount = finalExp.length + finalCert.length + finalExtra.length;
      if (extraCount === 0) {
         const hasExpJson = p.experience_json && p.experience_json !== "[]" && p.experience_json !== "null";
         const hasCertJson = p.custom_sections_json && p.custom_sections_json.includes('certifications');
         if (hasExpJson || hasCertJson) extraCount = 1;
      }
      if (extraCount > 0) score += 5;

      await db.query("UPDATE student_profiles SET completeness_score = ? WHERE id = ?", [score, studentId]);

      // Recalculate score
      await calculateTalentScore(Number(userId));
      
      res.json({ success: true, avatarUrl, score });
    } catch (error: any) {
      console.error("Avatar upload error:", error);
      res.status(500).json({ success: false, message: error.message || "Failed to upload avatar" });
    }
  });
});

const certStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "./uploads/certificates";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "cert-" + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadCert = multer({ 
  storage: certStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
    if ((file.mimetype === "application/pdf" || file.mimetype.startsWith("image/")) && isSafeExtension(file.originalname, allowedExts)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDFs and standard/safe Images are allowed."));
    }
  }
});

router.post("/upload-certificate/:userId", (req, res) => {
  uploadCert.single("certificate")(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: "Certificate is too large. Max size is 5MB." });
      }
      return res.status(400).json({ success: false, message: err.message });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
      }

      const { uploadToCloudBucket } = await import("../services/storageService.ts");
      const certificateUrl = await uploadToCloudBucket(req.file.path, req.file.originalname, req.file.mimetype);
      res.json({ success: true, certificateUrl });
    } catch (error: any) {
      console.error("Certificate upload error:", error);
      res.status(500).json({ success: false, message: error.message || "Failed to upload certificate" });
    }
  });
});

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

// Get Profile (Comprehensive)
router.get("/profile/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    await updateLoginStreak(Number(userId));
    const [profiles]: any = await db.query(
      `SELECT sp.*, COALESCE(sp.college_id, b.college_id) as actual_college_id, 
              COALESCE(b.batch_name, sp.batch) as actual_batch_name, 
              cm.college_name 
       FROM student_profiles sp 
       LEFT JOIN student_batch sb ON sp.id = sb.student_id 
       LEFT JOIN batches b ON COALESCE(sp.batch_id, sb.batch_id) = b.id 
       LEFT JOIN college_master cm ON COALESCE(sp.college_id, b.college_id) = cm.id 
       WHERE sp.user_id = ?`,
      [userId]
    );
    if (profiles.length === 0) {
      // Fallback: Create profile if missing
      const [users]: any = await db.query("SELECT id FROM users WHERE id = ? AND role = 'STUDENT'", [userId]);
      if (users.length > 0) {
        const tbId = `TB-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
        await db.query("INSERT INTO student_profiles (user_id, tb_id, profile_visibility) VALUES (?, ?, 'PUBLIC')", [userId, tbId]);
        const [newProfiles]: any = await db.query(
          `SELECT sp.*, COALESCE(sp.college_id, b.college_id) as actual_college_id, 
                  COALESCE(b.batch_name, sp.batch) as actual_batch_name, 
                  cm.college_name 
           FROM student_profiles sp 
           LEFT JOIN student_batch sb ON sp.id = sb.student_id 
           LEFT JOIN batches b ON COALESCE(sp.batch_id, sb.batch_id) = b.id 
           LEFT JOIN college_master cm ON COALESCE(sp.college_id, b.college_id) = cm.id 
           WHERE sp.user_id = ?`,
          [userId]
        );
        profiles.push(newProfiles[0]);
      } else {
        return res.json({ success: true, data: null });
      }
    }
    
    let profile = profiles[0];
    if (profile) {
      profile.college_id = profile.actual_college_id || profile.college_id;
      profile.batch_name = profile.actual_batch_name || profile.batch || '';
      profile.batch = profile.actual_batch_name || profile.batch || '';
    }
    if (!profile.tb_id) {
      const tbId = `TB-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
      await db.query("UPDATE student_profiles SET tb_id = ? WHERE id = ?", [tbId, profile.id]);
      profile.tb_id = tbId;
    }
    if (!profile.profile_visibility) {
      await db.query("UPDATE student_profiles SET profile_visibility = 'PUBLIC' WHERE id = ?", [profile.id]);
      profile.profile_visibility = 'PUBLIC';
    }
    const [visRows]: any = await db.query("SELECT * FROM student_visibility WHERE student_id = ?", [profile.id]);
    if (visRows.length === 0) {
      await db.query("INSERT INTO student_visibility (student_id, visibility) VALUES (?, 'PUBLIC')", [profile.id]);
    }

    // Fetch related data
    const [education]: any = await db.query("SELECT * FROM student_education WHERE student_id = ? ORDER BY start_date DESC", [profile.id]);
    const [projects]: any = await db.query("SELECT * FROM student_projects WHERE student_id = ? ORDER BY created_at DESC", [profile.id]);
    const [experience]: any = await db.query("SELECT * FROM student_experience WHERE student_id = ? ORDER BY start_date DESC", [profile.id]);
    const [certifications]: any = await db.query("SELECT * FROM student_certifications WHERE student_id = ? ORDER BY created_at DESC", [profile.id]);
    const [extracurriculars]: any = await db.query("SELECT * FROM extracurricular_activities WHERE user_id = ? ORDER BY activity_date DESC, id DESC", [userId]);

    let score = 0;
    if (profile.full_name && profile.contact && profile.location && profile.profile_photo_url) score += 15;
    if (profile.preferred_job_role && profile.preferred_location) score += 10;
    
    let eduCount = education.length;
    if (eduCount === 0 && profile.education_json) {
       try { const j = JSON.parse(profile.education_json); if(Array.isArray(j)) eduCount = j.length; } catch(e){}
    }
    if (eduCount > 0) score += 15;
    
    let skills = [];
    try { skills = JSON.parse(profile.skills_json || "[]"); } catch(e) {}
    if (skills.length >= 3) score += 15;
    else if (skills.length > 0) score += 5;
    
    let projCount = projects.length;
    if (projCount === 0 && profile.projects_json) {
       try { const j = JSON.parse(profile.projects_json); if(Array.isArray(j)) projCount = j.length; } catch(e){}
    }
    if (projCount > 0) score += 15;
    
    if (profile.bio && profile.bio.length > 40) score += 10;
    if (profile.resume_url) score += 15;
    
    let extraCount = experience.length + certifications.length + extracurriculars.length;
    if (extraCount === 0) {
       const hasExpJson = profile.experience_json && profile.experience_json !== "[]" && profile.experience_json !== "null";
       const hasCertJson = profile.custom_sections_json && profile.custom_sections_json.includes('certifications');
       if (hasExpJson || hasCertJson) extraCount = 1;
    }
    if (extraCount > 0) score += 5;

    // Update if different
    if (profile.completeness_score !== score) {
       await db.query("UPDATE student_profiles SET completeness_score = ? WHERE id = ?", [score, profile.id]);
       profile.completeness_score = score;
       await calculateTalentScore(Number(userId));
    }

    const metrics = await getStudentMetrics(Number(userId));

    res.json({ 
      success: true, 
      data: { 
        ...profile, 
        education, 
        projects, 
        experience, 
        certifications,
        extracurriculars,
        metrics
      } 
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ success: false, message: "Error fetching profile" });
  }
});

// Update Profile Section
router.put("/profile/:userId/section/:section", async (req, res) => {
  const { userId, section } = req.params;
  const data = req.body;

  try {
    const [profiles]: any = await db.query("SELECT id FROM student_profiles WHERE user_id = ?", [userId]);
    if (profiles.length === 0) return res.status(404).json({ success: false, message: "Profile not found" });
    const studentId = profiles[0].id;

const parseDate = (d: any) => d ? String(d).split('T')[0] : null;

    if (section === 'personal') {
      const dob = parseDate(data.dob);
      if (data.contact) {
        const cleanContact = String(data.contact).replace(/\D/g, "");
        if (cleanContact.length !== 10) {
          return res.status(400).json({ success: false, message: "Mobile number must be exactly 10 digits." });
        }
      }
      if (data.country && String(data.country).trim()) {
        const countryVal = String(data.country).trim();
        const hasLetters = /[a-zA-Z]/.test(countryVal);
        if (!hasLetters || /^[^\w\s.-]+$/.test(countryVal)) {
          return res.status(400).json({ success: false, message: "Please select a valid country." });
        }
      }
      await db.query(`
        UPDATE student_profiles 
        SET full_name = ?, headline = ?, dob = ?, gender = ?, address = ?, location = ?, contact = ?, profile_photo_url = ?, country = ?
        WHERE id = ?
      `, [data.fullName, data.headline, dob, data.gender, data.address, data.location, data.contact ? String(data.contact).replace(/\D/g, "").slice(0, 10) : "", data.profilePhotoUrl, data.country ? String(data.country).trim() : null, studentId]);
    } 
    else if (section === 'preferences') {
      const isPlaced = data.isPlaced ? 1 : 0;
      const placedCompany = data.isPlaced ? (data.placedCompany || null) : null;
      const isTopPerformer = (data.isPlaced && data.isTopPerformer) ? 1 : 0;

      await db.query(`
        UPDATE student_profiles 
        SET preferred_job_role = ?, preferred_location = ?, availability = ?,
            is_placed = ?, placed_company = ?, is_top_performer = ?
        WHERE id = ?
      `, [
        data.preferredJobRole, 
        data.preferredLocation, 
        data.availability, 
        isPlaced, 
        placedCompany, 
        isTopPerformer, 
        studentId
      ]);
    }
    else if (section === 'onboarding') {
      await db.query(`
        UPDATE student_profiles 
        SET onboarding_completed = ?, 
            onboarding_industry = ?, 
            onboarding_status = ?, 
            onboarding_source = ?, 
            onboarding_help_actions = ?
        WHERE id = ?
      `, [
        data.onboardingCompleted ? 1 : 0, 
        data.onboardingIndustry || null, 
        data.onboardingStatus || null, 
        data.onboardingSource || null, 
        JSON.stringify(data.onboardingHelpActions || []),
        studentId
      ]);
    }
    else if (section === 'skills') {
      await db.query(`UPDATE student_profiles SET skills_json = ? WHERE id = ?`, [JSON.stringify(data.skills), studentId]);
    }
    else if (section === 'summary') {
      const trimmedSummary = data.summary ? String(data.summary).trim() : "";
      if (trimmedSummary.length < 50) {
        return res.status(400).json({ success: false, message: "Profile summary must be at least 50 characters." });
      }
      if (trimmedSummary.length > 5000) {
        return res.status(400).json({ success: false, message: "Profile summary cannot exceed 5000 characters." });
      }
      await db.query(`UPDATE student_profiles SET bio = ? WHERE id = ?`, [trimmedSummary, studentId]);
    }
    else if (section === 'resume') {
      await db.query(`UPDATE student_profiles SET resume_url = ? WHERE id = ?`, [data.resumeUrl, studentId]);
    }
    else if (section === 'education') {
      // Transactional replace for simplicity in this dev environment
      await db.query("DELETE FROM student_education WHERE student_id = ?", [studentId]);
      let matchedCollegeId = null;
      let primaryEdu = null;

      if (Array.isArray(data.education)) {
        for (const edu of data.education) {
          // Skip empty entries
          if (!edu.institution || !edu.degree) continue;
          
          const startDate = parseDate(edu.start_date);
          const endDate = parseDate(edu.end_date);
          await db.query(`
            INSERT INTO student_education (student_id, institution, degree, field_of_study, start_date, end_date, grade, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [studentId, edu.institution, edu.degree, edu.field_of_study, startDate, endDate, edu.grade, edu.description || ""]);

          if (!primaryEdu) {
            primaryEdu = edu;
          }
        }

        // Try dynamically matching institutional names with colleges registered in college_master
        if (primaryEdu) {
          const instName = primaryEdu.institution.trim().toLowerCase();
          const [collegesList]: any = await db.query("SELECT id, college_name FROM college_master WHERE status = 'ACTIVE'");
          
          const matched = collegesList.find((c: any) => {
            const name = c.college_name.toLowerCase();
            return instName.includes(name) || name.includes(instName) || 
                   instName.replace(/[^a-z0-9]/g, '').includes(name.replace(/[^a-z0-9]/g, '')) ||
                   name.replace(/[^a-z0-9]/g, '').includes(instName.replace(/[^a-z0-9]/g, ''));
          });

          if (matched) {
            matchedCollegeId = matched.id;
          }
        }
      }

      const eduJson = primaryEdu ? { department: primaryEdu.field_of_study || 'General', year: 'Final Year' } : null;
      if (matchedCollegeId) {
        await db.query(
          "UPDATE student_profiles SET college_id = ?, education_json = ? WHERE id = ?",
          [matchedCollegeId, eduJson ? JSON.stringify(eduJson) : null, studentId]
        );
      } else {
        await db.query(
          "UPDATE student_profiles SET college_id = NULL, education_json = ? WHERE id = ?",
          [eduJson ? JSON.stringify(eduJson) : null, studentId]
        );
      }
    }
    else if (section === 'projects') {
      await db.query("DELETE FROM student_projects WHERE student_id = ?", [studentId]);
      if (Array.isArray(data.projects)) {
        for (const proj of data.projects) {
          if (!proj.title) continue;
          await db.query(`
            INSERT INTO student_projects (student_id, title, description, tech_stack, link, github_link)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [studentId, proj.title, proj.description || "", proj.techStack || "", proj.link || "", proj.githubLink || ""]);
        }
      }
    }
    else if (section === 'experience') {
      await db.query("DELETE FROM student_experience WHERE student_id = ?", [studentId]);
      if (Array.isArray(data.experience)) {
        for (const exp of data.experience) {
          if (!exp.company || !exp.role) continue;
          
          const startDate = parseDate(exp.start_date);
          const endDate = parseDate(exp.end_date);
          await db.query(`
            INSERT INTO student_experience (student_id, company, role, location, start_date, end_date, is_current, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [studentId, exp.company, exp.role, exp.location || "", startDate, endDate, exp.isCurrent ? 1 : 0, exp.description || ""]);
        }
      }
    }
    else if (section === 'certifications') {
      await db.query("DELETE FROM student_certifications WHERE student_id = ?", [studentId]);
      if (Array.isArray(data.certifications)) {
        for (const cert of data.certifications) {
          if (!cert.name || !cert.issuingOrganization) continue;
          
          const issueDate = parseDate(cert.issueDate);
          const expiryDate = parseDate(cert.expiryDate);
          await db.query(`
            INSERT INTO student_certifications (student_id, name, issuing_organization, issue_date, expiry_date, credential_id, credential_url)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [studentId, cert.name, cert.issuingOrganization, issueDate, expiryDate, cert.credentialId || "", cert.credentialUrl || ""]);
        }
      }
    }
    else if (section === 'extracurricular') {
      await db.query("DELETE FROM extracurricular_activities WHERE user_id = ?", [userId]);
      if (Array.isArray(data.extracurriculars)) {
        for (const act of data.extracurriculars) {
          if (!act.title || !act.category) continue;
          
          const activityDate = parseDate(act.activity_date);
          await db.query(`
            INSERT INTO extracurricular_activities (user_id, category, title, description, organization_name, participation_level, achievement_rank, activity_date, certificate_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [userId, act.category, act.title, act.description || "", act.organization_name || "", act.participation_level || "Member", act.achievement_rank || "", activityDate, act.certificate_url || ""]);
        }
      }
    }

    // Recalculate Completeness Score
    const [finalProfile]: any = await db.query("SELECT * FROM student_profiles WHERE id = ?", [studentId]);
    const [finalEdu]: any = await db.query("SELECT * FROM student_education WHERE student_id = ?", [studentId]);
    const [finalProj]: any = await db.query("SELECT * FROM student_projects WHERE student_id = ?", [studentId]);
    const [finalExp]: any = await db.query("SELECT * FROM student_experience WHERE student_id = ?", [studentId]);
    const [finalCert]: any = await db.query("SELECT * FROM student_certifications WHERE student_id = ?", [studentId]);
    const [finalExtra]: any = await db.query("SELECT * FROM extracurricular_activities WHERE user_id = ?", [userId]);
    
    let score = 0;
    const p = finalProfile[0];
    
    // 1. Personal Info (15%) - Name, Phone, Location, Photo
    if (p.full_name && p.contact && p.location && p.profile_photo_url) score += 15;
    
    // 2. Career Preferences (10%) - Role, Location
    if (p.preferred_job_role && p.preferred_location) score += 10;
    
    // 3. Education (15%) - Must have at least one degree
    let eduCount = finalEdu.length;
    if (eduCount === 0 && p.education_json) {
       try { const j = JSON.parse(p.education_json); if(Array.isArray(j)) eduCount = j.length; } catch(e){}
    }
    if (eduCount > 0) score += 15;
    
    // 4. Skills (15%) - Min 3 skills
    let skills = [];
    try { skills = JSON.parse(p.skills_json || "[]"); } catch(e) {}
    if (skills.length >= 3) score += 15;
    else if (skills.length > 0) score += 5;
    
    // 5. Projects (15%) - At least one
    let projCount = finalProj.length;
    if (projCount === 0 && p.projects_json) {
       try { const j = JSON.parse(p.projects_json); if(Array.isArray(j)) projCount = j.length; } catch(e){}
    }
    if (projCount > 0) score += 15;
    
    // 6. Summary/Bio (10%)
    if (p.bio && p.bio.length > 40) score += 10;
    
    // 7. Resume Upload (15%)
    if (p.resume_url) score += 15;
    
    // 8. Experience or Extracurricular or Certification (5% total)
    let extraCount = finalExp.length + finalCert.length + finalExtra.length;
    if (extraCount === 0) {
       const hasExpJson = p.experience_json && p.experience_json !== "[]" && p.experience_json !== "null";
       const hasCertJson = p.custom_sections_json && p.custom_sections_json.includes('certifications');
       if (hasExpJson || hasCertJson) extraCount = 1;
    }
    if (extraCount > 0) score += 5;

    await db.query("UPDATE student_profiles SET completeness_score = ? WHERE id = ?", [score, studentId]);
    
    await updateDailyTask(Number(userId), 'PROFILE');
    await calculateTalentScore(Number(userId));

    res.json({ success: true, message: "Section updated", score });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ success: false, message: "Error updating profile section" });
  }
});

// Get notifications
router.get("/notifications/:userId", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 20
    `, [req.params.userId]);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching notifications" });
  }
});

// Mark notification as read
router.post("/notifications/read/:id", async (req, res) => {
  try {
    await db.query("UPDATE notifications SET is_read = 1 WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error marking notification as read" });
  }
});

// Mark all notifications as read
router.post("/notifications/read-all/:userId", async (req, res) => {
  try {
    await db.query("UPDATE notifications SET is_read = 1 WHERE user_id = ?", [req.params.userId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error marking all notifications as read" });
  }
});

// --- DPDP & GDPR Privacy Consent Dashboard Compliance Endpoints ---

// Get consent settings
router.get("/privacy/:userId", async (req: express.Request, res: express.Response) => {
  try {
    const { userId } = req.params;
    const [profiles]: any = await db.query("SELECT onboarding_help_actions FROM student_profiles WHERE user_id = ?", [userId]);
    
    if (profiles.length === 0) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }
    
    let consents = {
      academic_sharing: true,
      employer_matching: true,
      ai_optimization: true,
      telemetry_tracking: false,
      timestamp: new Date().toISOString()
    };
    
    const rawActions = profiles[0].onboarding_help_actions;
    if (rawActions) {
      try {
        const parsed = typeof rawActions === 'string' ? JSON.parse(rawActions) : rawActions;
        if (parsed && typeof parsed === 'object' && 'consents' in parsed) {
          consents = parsed.consents;
        }
      } catch (e) {
        // use default state
      }
    }
    
    res.json({ success: true, consents });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching privacy consents" });
  }
});

// Update consent settings
router.post("/privacy/:userId", async (req: express.Request, res: express.Response) => {
  try {
    const { userId } = req.params;
    const { consents } = req.body;
    
    if (!consents) {
      return res.status(400).json({ success: false, message: "Consents config missing in body" });
    }
    
    const [profiles]: any = await db.query("SELECT id, onboarding_help_actions FROM student_profiles WHERE user_id = ?", [userId]);
    if (profiles.length === 0) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }
    
    const studentId = profiles[0].id;
    const payload = { consents };
    const serializedPayload = JSON.stringify(payload);
    
    await db.query("UPDATE student_profiles SET onboarding_help_actions = ? WHERE id = ?", [serializedPayload, studentId]);
    
    // Log security access log
    await db.query(`
      INSERT INTO security_logs (user_id, action, ip_address, user_agent, details)
      VALUES (?, 'UPDATE_PRIVACY_CONSENTS', ?, ?, 'Consents updated by student')
    `, [userId, req.ip || "127.0.0.1", req.headers['user-agent'] || "Unknown"]);
    
    res.json({ success: true, message: "Privacy consents and data processing preference updated successfully." });
  } catch (error) {
    console.error("Privacy update error:", error);
    res.status(500).json({ success: false, message: "Error updating privacy settings" });
  }
});

// Export profile data - DPDP Right to Data Portability
router.get("/privacy/:userId/export", async (req: express.Request, res: express.Response) => {
  try {
    const { userId } = req.params;
    
    // 1. Fetch user root info
    const [users]: any = await db.query("SELECT id, email, role, status, xp_balance, free_mock_count, login_streak, total_earned_xp, created_at FROM users WHERE id = ?", [userId]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: "User account not found." });
    }
    
    // 2. Fetch student profile
    const [profiles]: any = await db.query("SELECT * FROM student_profiles WHERE user_id = ?", [userId]);
    if (profiles.length === 0) {
      return res.status(404).json({ success: false, message: "Student profile record not found." });
    }
    
    const studentId = profiles[0].id;
    
    // Fetch related tables
    const [education]: any = await db.query("SELECT * FROM student_education WHERE student_id = ?", [studentId]);
    const [experience]: any = await db.query("SELECT * FROM student_experience WHERE student_id = ?", [studentId]);
    const [projects]: any = await db.query("SELECT * FROM student_projects WHERE student_id = ?", [studentId]);
    const [certifications]: any = await db.query("SELECT * FROM student_certifications WHERE student_id = ?", [studentId]);
    const [extracurriculars]: any = await db.query("SELECT * FROM extracurricular_activities WHERE user_id = ?", [userId]);
    const [interviewAttempts]: any = await db.query("SELECT * FROM interview_history WHERE student_id = ?", [studentId]);
    
    // Package into neat high-compliance export wrapper
    const exportedData = {
      compliance_framework: "DPDP (Digital Personal Data Protection Act - India) & GDPR (General Data Protection Regulation)",
      export_timestamp: new Date().toISOString(),
      user_account: users[0],
      profile: {
        ...profiles[0],
        education,
        experience,
        projects,
        certifications,
        extracurriculars
      },
      historical_assessments: {
        mock_interviews: interviewAttempts
      }
    };
    
    // Set response headers to force download as file attachment
    res.setHeader("Content-Disposition", `attachment; filename="vega-user-${userId}-profile-export.json"`);
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(exportedData, null, 2));
  } catch (error) {
    console.error("Privacy data export error:", error);
    res.status(500).json({ success: false, message: "Error assembling personal data export package." });
  }
});

// Complete Account Deletion - DPDP Right to Be Forgotten
router.delete("/privacy/:userId/delete-account", async (req: express.Request, res: express.Response) => {
  try {
    const { userId } = req.params;
    
    const [users]: any = await db.query("SELECT id FROM users WHERE id = ?", [userId]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: "User account does not exist or has already been anonymous-deleted." });
    }
    
    // Execute a cascading transaction delete
    await db.query("DELETE FROM users WHERE id = ?", [userId]);
    
    res.json({ 
      success: true, 
      message: "Under Right to Be Forgotten / Right to Erasure, all active credentials, profiles, records, and linked metadata have been deleted from the primary cluster." 
    });
  } catch (error) {
    console.error("Privacy erase error:", error);
    res.status(500).json({ success: false, message: "Error deleting and purging personal data record." });
  }
});

// Autocomplete and fetch all matching educational institutions (schools & colleges) in India dynamically using Gemini
router.get("/suggest-institutions", async (req, res) => {
  const { q, type } = req.query;
  const queryText = typeof q === 'string' ? q.trim() : "";
  const instType = typeof type === 'string' ? type.trim() : "school";

  if (!queryText) {
    return res.json({ success: true, suggestions: [] });
  }

  // Check cache first to avoid redundant API calls
  const cacheKey = `${instType}:${queryText.toLowerCase()}`;
  if (institutionCache[cacheKey]) {
    return res.json({ success: true, suggestions: institutionCache[cacheKey] });
  }

  try {
    const prompt = `
You are a helpful database assistant specialized in Indian Education. 
Your task is to act as an auto-completion engine for names of educational institutions in India.

User Input Prefix: "${queryText}"
Institution Type: "${instType === 'school' ? 'school (High School / Higher Secondary / Junior College / boards like CBSE, ICSE, State Boards / Vidyalayas)' : 'college (Undergraduate / Postgraduate / Polytechnic / Engineering / Arts & Science / Masters / Universities)'}"

Rules:
1. Return exactly 6 to 10 highly relevant, real existing ${instType === 'school' ? 'schools' : 'colleges'} in India matching or containing this text prefix/pattern.
2. Ensure their names are accurate, well-formatted, and localized to India (e.g. including their city, state, or board abbreviation to be extremely clear and precise, e.g. "Delhi Public School (DPS), Dwarka", "DAV Public School, Solapur", "Walchand Institute of Technology (WIT), Solapur", "Indian Institute of Technology (IIT) Bombay, Mumbai").
3. Ensure to spell out or format the names elegantly, avoiding generic repeating names.
4. If the input is super short (like "V" or "D"), suggest famous Indian institutions starting with that letter.
5. You must output a raw JSON array of strings only. No markdown formatting, no explanation, no backticks.

Example format:
[
  "Institution Name 1, City",
  "Institution Name 2, City"
]
`;

    const aiResult = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const rawText = aiResult.text || "[]";
    const cleanedJson = rawText.replace(/```json\n?|```/gi, "").trim();
    let suggestions = JSON.parse(cleanedJson);

    if (!Array.isArray(suggestions)) {
      suggestions = [];
    }

    // Cache the result
    institutionCache[cacheKey] = suggestions;

    res.json({ success: true, suggestions });
  } catch (error) {
    console.error("Institution suggestion error:", error);
    // Return a safe matching fallback list if AI fails (e.g. key/rate issues)
    const fallbackList = instType === 'school' ? [
      "Central Board of Secondary Education (CBSE)",
      "Indian Certificate of Secondary Education (ICSE)",
      "Maharashtra State Board of Secondary and Higher Secondary Education (MSBSHSE)",
      "DAV Public School, Pune",
      "DAV Public School, Solapur",
      "Delhi Public School (DPS)",
      "Kendriya Vidyalaya, Solapur",
      "St. Xavier's High School, Mumbai",
      "Little Flower Convent School, Solapur",
      "Podar International School, Solapur"
    ] : [
      "Walchand Institute of Technology (WIT), Solapur",
      "Solapur Institute of Technology, Solapur",
      "Orchid College of Engineering, Solapur",
      "Indian Institute of Technology (IIT) Bombay, Mumbai",
      "Savitribai Phule Pune University, Pune",
      "College of Engineering Pune (COEP), Pune",
      "Veermata Jijabai Technological Institute (VJTI), Mumbai",
      "Vellore Institute of Technology (VIT), Vellore",
      "SRM Institute of Science and Technology, Chennai",
      "Symbiosis Institute of Technology, Pune"
    ];

    const filteredFallback = fallbackList.filter(item => 
      item.toLowerCase().includes(queryText.toLowerCase())
    );

    res.json({ success: true, suggestions: filteredFallback.length > 0 ? filteredFallback : fallbackList.slice(0, 5) });
  }
});

// Activity Logging Endpoint
router.post("/activity", authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { path, action, duration } = req.body;
    
    // Only track if valid numeric duration (or 0)
    const durSecs = Math.max(0, parseInt(duration) || 0);

    await db.query(`
      INSERT INTO student_activity_logs (student_id, path, action, duration_seconds)
      VALUES (?, ?, ?, ?)
    `, [userId, path, action || 'page_view', durSecs]);

    res.json({ success: true });
  } catch (err: any) {
    console.error("Activity tracking error:", err);
    res.status(500).json({ success: false });
  }
});

router.get("/college-updates", authenticate, async (req: any, res) => {
  try {
    console.log("Fetching college updates for user:", req.user.userId);
    const [profiles]: any = await db.query(`
      SELECT COALESCE(sp.college_id, b.college_id) as college_id, 
             COALESCE(b.batch_name, sp.batch, 'ALL') as batch_name
      FROM student_profiles sp
      LEFT JOIN student_batch sb ON sp.id = sb.student_id
      LEFT JOIN batches b ON COALESCE(sp.batch_id, sb.batch_id) = b.id
      WHERE sp.user_id = ?
    `, [req.user.userId]);

    console.log("Profiles found:", profiles);
    if (profiles.length === 0 || !profiles[0].college_id) {
      return res.json({ success: true, data: { events: [], tests: [], notices: [] } });
    }

    const collegeId = profiles[0].college_id;
    const batchName = profiles[0].batch_name;
    console.log("CollegeId:", collegeId, "BatchName:", batchName);

    const [events]: any = await db.query(
      `SELECT * FROM events WHERE college_id = ? ORDER BY created_at DESC LIMIT 20`,
      [collegeId]
    );

    const [tests]: any = await db.query(
      `SELECT * FROM assessment_tests WHERE college_id = ? AND status IN ('UPCOMING', 'ONGOING', 'PUBLISHED') ORDER BY created_at DESC LIMIT 20`,
      [collegeId]
    );

    const [notices]: any = await db.query(
      `SELECT * FROM campus_notices WHERE college_id = ? AND (batch_name = ? OR batch_name = 'ALL') AND is_public = 1 ORDER BY created_at DESC LIMIT 20`,
      [collegeId, batchName]
    );

    console.log("Notices found:", notices.length);
    res.json({ success: true, data: { events, tests, notices } });
  } catch (error) {
    console.error("Error fetching college updates:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

export default router;
