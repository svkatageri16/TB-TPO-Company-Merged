import express from "express";
import db from "../db.ts";
import { authenticate, isAdmin } from "../middleware/auth.ts";
import { XPService } from "../services/xpService.ts";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendTPOCredentials, sendStudentCredentials } from "../services/emailService.ts";

const router = express.Router();

// Apply admin protection to all routes
router.use(authenticate, isAdmin);

// Helper for activity logging
async function logAdminAction(adminId: number, action: string, details: any, req: express.Request) {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    await db.query(`
      INSERT INTO admin_logs (admin_id, action, details, ip_address)
      VALUES (?, ?, ?, ?)
    `, [adminId, action, typeof details === 'string' ? details : JSON.stringify(details), ip]);
  } catch (error) {
    console.error("Logging failed:", error);
  }
}

// --- COLLEGE MANAGEMENT ---

router.post("/colleges", async (req, res) => {
  try {
    const { 
      college_name, college_code, university, address, district, state, 
      country, website, contact_number, official_email, principal_name, 
      placement_head, college_logo, status 
    } = req.body;
    
    if (!college_name || !college_code) {
      return res.status(400).json({ success: false, message: "College name and code are required." });
    }

    if (contact_number) {
      const cleanContact = String(contact_number).replace(/\D/g, "");
      if (cleanContact.length < 10 || cleanContact.length > 15) {
        return res.status(400).json({ success: false, message: "Contact number must be between 10 and 15 digits." });
      }
    }

    const [result]: any = await db.query(`
      INSERT INTO college_master (
        college_name, college_code, university, address, district, state, 
        country, website, contact_number, official_email, principal_name, 
        placement_head, college_logo, status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      college_name, college_code, university || null, address || null, 
      district || null, state || null, country || "India", website || null, 
      contact_number || null, official_email || null, principal_name || null, 
      placement_head || null, college_logo || null, status || "ACTIVE"
    ]);

    await logAdminAction((req as any).user.userId, "CREATE_COLLEGE", { college_name, college_code }, req);

    res.json({ success: true, message: "College created successfully", collegeId: result.insertId });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY' || String(error.message).includes("UNIQUE")) {
      return res.status(400).json({ success: false, message: "College code already exists" });
    }
    console.error("Create College Error:", error);
    res.status(500).json({ success: false, message: "Error creating college" });
  }
});

router.put("/colleges/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      college_name, college_code, university, address, district, state, 
      country, website, contact_number, official_email, principal_name, 
      placement_head, college_logo, status 
    } = req.body;

    await db.query(`
      UPDATE college_master SET
        college_name = ?, college_code = ?, university = ?, address = ?, 
        district = ?, state = ?, country = ?, website = ?, contact_number = ?, 
        official_email = ?, principal_name = ?, placement_head = ?, 
        college_logo = ?, status = ?
      WHERE id = ?
    `, [
      college_name, college_code, university || null, address || null, 
      district || null, state || null, country || "India", website || null, 
      contact_number || null, official_email || null, principal_name || null, 
      placement_head || null, college_logo || null, status || "ACTIVE",
      id
    ]);

    await logAdminAction((req as any).user.userId, "UPDATE_COLLEGE", { collegeId: id, college_name }, req);

    res.json({ success: true, message: "College updated successfully" });
  } catch (error: any) {
    console.error("Update College Error:", error);
    res.status(500).json({ success: false, message: "Error updating college" });
  }
});

router.get("/colleges", async (req, res) => {
  try {
    const [colleges]: any = await db.query("SELECT * FROM college_master ORDER BY college_name ASC");
    res.json({ success: true, data: colleges });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching colleges" });
  }
});

router.delete("/colleges/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("UPDATE college_master SET status = 'INACTIVE' WHERE id = ?", [id]);
    await logAdminAction((req as any).user.userId, "DELETE_COLLEGE", { collegeId: id, mode: "SOFT_DELETE" }, req);
    res.json({ success: true, message: "College marked as INACTIVE successfully" });
  } catch (error) {
    console.error("Delete College Error:", error);
    res.status(500).json({ success: false, message: "Error deleting college." });
  }
});

// --- TPO MANAGEMENT ---

router.post("/tpos", async (req, res) => {
  try {
    const { email, full_name, contact_number, designation, employee_id, college_ids } = req.body;

    if (!email || !full_name) {
      return res.status(400).json({ success: false, message: "Email and full name are required." });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address." });
    }

    // Check if user already exists
    const [existingUsers]: any = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ success: false, message: "Email already exists" });
    }

    // Create User
    const tempPassword = crypto.randomBytes(8).toString("hex");
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const [userResult]: any = await db.query(`
      INSERT INTO users (email, password_hash, role, status, is_verified)
      VALUES (?, ?, 'TPO', 'ACTIVE', 1)
    `, [email, passwordHash]);

    const userId = userResult.insertId;

    // Create TPO Profile
    const [tpoResult]: any = await db.query(`
      INSERT INTO tpo_profiles (user_id, full_name, contact_number, designation, employee_id, phone, status)
      VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')
    `, [userId, full_name, contact_number || null, designation || null, employee_id || null, contact_number || null]);

    const tpoId = tpoResult.insertId;

    // Assign Colleges
    if (college_ids && Array.isArray(college_ids)) {
      for (const collegeId of college_ids) {
        await db.query("INSERT INTO tpo_colleges (tpo_id, college_id) VALUES (?, ?)", [tpoId, collegeId]);
      }
    }

    // Send SMTP Credentials & Log Email
    try {
      const loginUrl = `${process.env.APP_URL || 'http://localhost:3000'}/login`;
      await sendTPOCredentials(email, full_name, tempPassword, loginUrl);
      
      await db.query(`
        INSERT INTO email_logs (user_id, email_type, recipient, subject, status)
        VALUES (?, 'TPO_CREDENTIALS', ?, 'Welcome to VEGA - TPO Credentials', 'SENT')
      `, [userId, email]);
    } catch (emailErr) {
      console.error("Failed to send SMTP email:", emailErr);
    }

    await logAdminAction((req as any).user.userId, "CREATE_TPO", { email, full_name, college_ids }, req);

    res.json({ 
      success: true, 
      message: "TPO account created successfully and credentials sent to official email."
    });
  } catch (error: any) {
    console.error("Create TPO Error:", error);
    res.status(500).json({ success: false, message: "Error creating TPO account" });
  }
});

router.put("/tpos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, contact_number, designation, employee_id, college_ids, status } = req.body;

    const [tpoProfiles]: any = await db.query("SELECT user_id FROM tpo_profiles WHERE id = ?", [id]);
    if (tpoProfiles.length === 0) {
      return res.status(404).json({ success: false, message: "TPO profile not found" });
    }
    const userId = tpoProfiles[0].user_id;

    // Update profiles
    await db.query(`
      UPDATE tpo_profiles SET
        full_name = ?, contact_number = ?, designation = ?, employee_id = ?, phone = ?, status = ?
      WHERE id = ?
    `, [full_name, contact_number || null, designation || null, employee_id || null, contact_number || null, status || "ACTIVE", id]);

    // Update users table status
    if (status) {
      await db.query("UPDATE users SET status = ? WHERE id = ?", [status, userId]);
    }

    // Sync Colleges Assignment
    await db.query("DELETE FROM tpo_colleges WHERE tpo_id = ?", [id]);
    if (college_ids && Array.isArray(college_ids)) {
      for (const collegeId of college_ids) {
        await db.query("INSERT INTO tpo_colleges (tpo_id, college_id) VALUES (?, ?)", [id, collegeId]);
      }
    }

    await logAdminAction((req as any).user.userId, "UPDATE_TPO", { tpoId: id, full_name }, req);

    res.json({ success: true, message: "TPO updated successfully" });
  } catch (error) {
    console.error("Update TPO Error:", error);
    res.status(500).json({ success: false, message: "Error updating TPO" });
  }
});

router.delete("/tpos/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [tpoProfiles]: any = await db.query("SELECT user_id FROM tpo_profiles WHERE id = ?", [id]);
    if (tpoProfiles.length > 0) {
      const userId = tpoProfiles[0].user_id;
      await db.query("DELETE FROM users WHERE id = ?", [userId]);
    }

    await logAdminAction((req as any).user.userId, "DELETE_TPO", { tpoId: id }, req);

    res.json({ success: true, message: "TPO account deleted successfully" });
  } catch (error) {
    console.error("Delete TPO Error:", error);
    res.status(500).json({ success: false, message: "Error deleting TPO" });
  }
});

// --- BATCH MANAGEMENT ---

router.get("/batches", async (req, res) => {
  try {
    const { college_id } = req.query;
    let queryStr = `
      SELECT b.*, cm.college_name, tp.full_name as tpo_name,
             (SELECT COUNT(*) FROM student_batch sb WHERE sb.batch_id = b.id) as student_count
      FROM batches b
      JOIN college_master cm ON b.college_id = cm.id
      LEFT JOIN tpo_profiles tp ON b.assigned_tpo_id = tp.id
    `;
    const params = [];
    if (college_id) {
      queryStr += ` WHERE b.college_id = ?`;
      params.push(college_id);
    }
    queryStr += ` ORDER BY b.batch_name ASC`;

    const [batches]: any = await db.query(queryStr, params);
    res.json({ success: true, data: batches });
  } catch (error) {
    console.error("Fetch Batches Error:", error);
    res.status(500).json({ success: false, message: "Error fetching academic batches" });
  }
});

router.post("/batches", async (req, res) => {
  try {
    const { college_id, batch_name, department, academic_year, semester, assigned_tpo_id } = req.body;

    if (!college_id || !batch_name) {
      return res.status(400).json({ success: false, message: "College ID and Batch Name are required." });
    }

    // Verify uniqueness of batch under the college
    const [existing]: any = await db.query(
      "SELECT id FROM batches WHERE college_id = ? AND batch_name = ?", 
      [college_id, batch_name]
    );
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: "A batch with this name already exists under the selected college." });
    }

    const [result]: any = await db.query(`
      INSERT INTO batches (college_id, batch_name, department, academic_year, semester, assigned_tpo_id, status)
      VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')
    `, [college_id, batch_name, department || null, academic_year || null, semester || null, assigned_tpo_id || null]);

    await logAdminAction((req as any).user.userId, "CREATE_BATCH", { college_id, batch_name }, req);

    res.json({ success: true, message: "Batch created successfully", batchId: result.insertId });
  } catch (error) {
    console.error("Create Batch Error:", error);
    res.status(500).json({ success: false, message: "Error creating academic batch" });
  }
});

router.put("/batches/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { batch_name, department, academic_year, semester, assigned_tpo_id, status } = req.body;

    await db.query(`
      UPDATE batches SET
        batch_name = ?, department = ?, academic_year = ?, semester = ?, assigned_tpo_id = ?, status = ?
      WHERE id = ?
    `, [batch_name, department || null, academic_year || null, semester || null, assigned_tpo_id || null, status || "ACTIVE", id]);

    await logAdminAction((req as any).user.userId, "UPDATE_BATCH", { batchId: id, batch_name }, req);

    res.json({ success: true, message: "Batch updated successfully" });
  } catch (error) {
    console.error("Update Batch Error:", error);
    res.status(500).json({ success: false, message: "Error updating academic batch" });
  }
});

router.delete("/batches/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Delete batch
    await db.query("DELETE FROM batches WHERE id = ?", [id]);

    await logAdminAction((req as any).user.userId, "DELETE_BATCH", { batchId: id }, req);

    res.json({ success: true, message: "Batch deleted successfully" });
  } catch (error) {
    console.error("Delete Batch Error:", error);
    res.status(500).json({ success: false, message: "Error deleting batch" });
  }
});

// --- BATCH STUDENTS MANAGEMENT ---

router.get("/batches/:id/students", async (req, res) => {
  try {
    const { id } = req.params;
    const [students]: any = await db.query(`
      SELECT sp.id, sp.user_id, sp.full_name, sp.college_id, sp.batch_id, u.email, u.status as user_status, ts.overall_score as talent_score
      FROM student_profiles sp
      JOIN users u ON sp.user_id = u.id
      JOIN student_batch sb ON sp.id = sb.student_id
      LEFT JOIN talent_scores ts ON sp.user_id = ts.user_id
      WHERE sb.batch_id = ?
    `, [id]);
    res.json({ success: true, data: students });
  } catch (error) {
    console.error("Fetch Batch Students Error:", error);
    res.status(500).json({ success: false, message: "Error fetching batch students" });
  }
});

router.post("/batches/:id/students", async (req, res) => {
  try {
    const { id } = req.params; // batch_id
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: "Name and email are required." });
    }

    // Check duplicate user
    const [existing]: any = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: "Email already registered in the ecosystem." });
    }

    // Get batch and college info
    const [batches]: any = await db.query(`
      SELECT b.batch_name, b.college_id, cm.college_name 
      FROM batches b
      JOIN college_master cm ON b.college_id = cm.id
      WHERE b.id = ?
    `, [id]);

    if (batches.length === 0) {
      return res.status(404).json({ success: false, message: "Batch not found" });
    }

    const { batch_name, college_id, college_name } = batches[0];

    // Generate credentials
    const studentPass = crypto.randomBytes(8).toString("hex");
    const studentHash = await bcrypt.hash(studentPass, 10);

    // Create user
    const [userRes]: any = await db.query(`
      INSERT INTO users (email, password_hash, role, status, is_verified, xp_balance)
      VALUES (?, ?, 'STUDENT', 'ACTIVE', 1, 100)
    `, [email, studentHash]);

    const studentUserId = userRes.insertId;

    // Insert Student Profile
    const [profileRes]: any = await db.query(`
      INSERT INTO student_profiles (user_id, college_id, batch_id, full_name, batch, onboarding_completed, completeness_score)
      VALUES (?, ?, ?, ?, ?, 1, 40)
    `, [studentUserId, college_id, id, name, batch_name]);

    const studentProfileId = profileRes.insertId;

    // Add map to student_batch table
    await db.query(`
      INSERT INTO student_batch (student_id, batch_id)
      VALUES (?, ?)
    `, [studentProfileId, id]);

    // Update batch strength count (strength or student_count)
    const [successCount]: any = await db.query("SELECT COUNT(*) as count FROM student_batch WHERE batch_id = ?", [id]);
    await db.query("UPDATE batches SET strength = ? WHERE id = ?", [successCount[0].count, id]);

    // Send Email via SMTP
    try {
      const loginUrl = `${process.env.APP_URL || 'http://localhost:3000'}/login`;
      await sendStudentCredentials(email, name, studentPass, college_name, batch_name, loginUrl);
      
      await db.query(`
        INSERT INTO email_logs (user_id, email_type, recipient, subject, status)
        VALUES (?, 'STUDENT_CREDENTIALS', ?, 'Welcome to VEGA - Student Credentials', 'SENT')
      `, [studentUserId, email]);
    } catch (emailErr) {
      console.error(`Email dispatch failed for manual student ${email}:`, emailErr);
    }

    await logAdminAction((req as any).user.userId, "ADD_MANUAL_STUDENT", { batch_id: id, batch_name, student_email: email, student_name: name }, req);

    res.json({ success: true, message: "Student added successfully to the batch" });
  } catch (error: any) {
    console.error("Add Manual Student Error:", error);
    res.status(500).json({ success: false, message: "Error adding student to batch: " + error.message });
  }
});


// --- COLLEGE TREE WORKFLOWS ---

router.get("/college-tree", async (req, res) => {
  try {
    // 1. Fetch all colleges
    const [colleges]: any = await db.query(`
      SELECT id, college_name, college_code, district, state, status, website, official_email 
      FROM college_master 
      ORDER BY college_name ASC
    `);

    // 2. Fetch all batches
    const [batches]: any = await db.query(`
      SELECT b.*, tp.full_name as tpo_name
      FROM batches b
      LEFT JOIN tpo_profiles tp ON b.assigned_tpo_id = tp.id
      ORDER BY b.batch_name ASC
    `);

    // 3. Fetch all students with batch details
    const [students]: any = await db.query(`
      SELECT sp.id, sp.user_id, sp.full_name, sp.college_id, sp.batch_id, u.email, u.status as user_status, ts.overall_score as talent_score
      FROM student_profiles sp
      JOIN users u ON sp.user_id = u.id
      LEFT JOIN talent_scores ts ON sp.user_id = ts.user_id
    `);

    // Process Tree Map hierarchy
    const resultTree = colleges.map((college: any) => {
      const collegeBatches = batches.filter((b: any) => Number(b.college_id) === Number(college.id)).map((batch: any) => {
        const batchStudents = students.filter((s: any) => Number(s.batch_id) === Number(batch.id));
        return {
          id: batch.id,
          batch_name: batch.batch_name,
          department: batch.department,
          academic_year: batch.academic_year,
          semester: batch.semester,
          status: batch.status,
          tpo_name: batch.tpo_name,
          student_count: batchStudents.length,
          students: batchStudents
        };
      });

      const unassignedStudents = students.filter((s: any) => Number(s.college_id) === Number(college.id) && !s.batch_id);

      return {
        id: college.id,
        college_name: college.college_name,
        college_code: college.college_code,
        district: college.district,
        state: college.state,
        website: college.website,
        official_email: college.official_email,
        status: college.status,
        batches: collegeBatches,
        unassigned_students_count: unassignedStudents.length,
        unassigned_students: unassignedStudents
      };
    });

    res.json({ success: true, data: resultTree });
  } catch (error) {
    console.error("College Tree Fetch Error:", error);
    res.status(500).json({ success: false, message: "Error fetching college organizational tree structure" });
  }
});


// --- STUDENT BULK ONBOARDING ENGINE ---

router.post("/onboard-batch", async (req, res) => {
  try {
    const { college_id, batch_id, students } = req.body;
    
    if (!college_id || !batch_id || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ success: false, message: "College, Batch, and a list of students are required." });
    }

    // Validate college
    const [colleges]: any = await db.query("SELECT college_name FROM college_master WHERE id = ?", [college_id]);
    if (colleges.length === 0) {
      return res.status(404).json({ success: false, message: "College not found" });
    }
    const collegeName = colleges[0].college_name;

    // Validate batch
    const [batches]: any = await db.query("SELECT batch_name FROM batches WHERE id = ? AND college_id = ?", [batch_id, college_id]);
    if (batches.length === 0) {
      return res.status(404).json({ success: false, message: "Batch not found under this college" });
    }
    const batchName = batches[0].batch_name;

    const results = [];
    const loginUrl = `${process.env.APP_URL || 'http://localhost:3000'}/login`;

    for (const student of students) {
      const { name, email } = student;
      if (!email || !name) continue;

      try {
        // Check duplicate user
        const [existing]: any = await db.query("SELECT id FROM users WHERE email = ?", [email]);
        if (existing.length > 0) {
          results.push({ email, name, status: "SKIPPED", reason: "Email already registered in the ecosystem" });
          continue;
        }

        // Generate credentials
        const studentPass = crypto.randomBytes(8).toString("hex");
        const studentHash = await bcrypt.hash(studentPass, 10);

        // Transactional execution simulation (isolated try-catch blocks)
        const [userRes]: any = await db.query(`
          INSERT INTO users (email, password_hash, role, status, is_verified, xp_balance)
          VALUES (?, ?, 'STUDENT', 'ACTIVE', 1, 100)
        `, [email, studentHash]);

        const studentUserId = userRes.insertId;

        // Insert Student Profile
        const [profileRes]: any = await db.query(`
          INSERT INTO student_profiles (user_id, college_id, batch_id, full_name, batch, onboarding_completed, completeness_score)
          VALUES (?, ?, ?, ?, ?, 1, 40)
        `, [studentUserId, college_id, batch_id, name, batchName]);

        const studentProfileId = profileRes.insertId;

        // Add map to student_batch table
        await db.query(`
          INSERT INTO student_batch (student_id, batch_id)
          VALUES (?, ?)
        `, [studentProfileId, batch_id]);

        // Send Email via SMTP & Log Email
        try {
          await sendStudentCredentials(email, name, studentPass, collegeName, batchName, loginUrl);
          await db.query(`
            INSERT INTO email_logs (user_id, email_type, recipient, subject, status)
            VALUES (?, 'STUDENT_CREDENTIALS', ?, 'Welcome to VEGA - Student Credentials', 'SENT')
          `, [studentUserId, email]);
        } catch (emailErr) {
          console.error(`Email dispatch failed for student ${email}:`, emailErr);
        }

        results.push({ email, name, status: "SUCCESS" });
      } catch (err: any) {
        console.error(`Error registering student ${email}:`, err);
        results.push({ email, name, status: "FAILED", reason: err.message });
      }
    }

    // Increment strength of batch
    const [successCount]: any = await db.query("SELECT COUNT(*) as count FROM student_batch WHERE batch_id = ?", [batch_id]);
    await db.query("UPDATE batches SET strength = ? WHERE id = ?", [successCount[0].count, batch_id]);

    await logAdminAction((req as any).user.userId, "ONBOARD_BATCH", { college_id, collegeName, batch_id, batchName, total: students.length, results }, req);

    res.json({ 
      success: true, 
      message: `Batch '${batchName}' students onboarded successfully`, 
      results 
    });
  } catch (error: any) {
    console.error("Batch Onboarding Error:", error);
    res.status(500).json({ success: false, message: "Error onboarding batch students" });
  }
});


// --- ENTERPRISE AUDIT & SYSTEM ANALYTICS ---

router.get("/audit-logs", async (req, res) => {
  try {
    const [logs]: any = await db.query(`
      SELECT al.*, u.email as admin_email
      FROM admin_logs al
      LEFT JOIN users u ON al.admin_id = u.id
      ORDER BY al.created_at DESC
      LIMIT 100
    `);
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error("Fetch Audit Logs Error:", error);
    res.status(500).json({ success: false, message: "Error fetching enterprise audit logs" });
  }
});

router.get("/college-analytics", async (req, res) => {
  try {
    const [collegesCount]: any = await db.query("SELECT COUNT(*) as total FROM college_master WHERE status = 'ACTIVE'");
    const [tposCount]: any = await db.query("SELECT COUNT(*) as total FROM tpo_profiles WHERE status = 'ACTIVE'");
    const [batchesCount]: any = await db.query("SELECT COUNT(*) as total FROM batches WHERE status = 'ACTIVE'");
    const [studentsCount]: any = await db.query("SELECT COUNT(*) as total FROM student_profiles");
    const [placedCount]: any = await db.query("SELECT COUNT(*) as total FROM student_profiles WHERE is_placed = 1");

    res.json({
      success: true,
      data: {
        totalColleges: collegesCount[0]?.total || 0,
        totalTPOs: tposCount[0]?.total || 0,
        totalBatches: batchesCount[0]?.total || 0,
        totalStudents: studentsCount[0]?.total || 0,
        totalPlaced: placedCount[0]?.total || 0,
        overallPlacementRate: studentsCount[0]?.total > 0 ? ((placedCount[0]?.total / studentsCount[0]?.total) * 100).toFixed(1) : "0.0"
      }
    });
  } catch (error) {
    console.error("Analytics Fetch Error:", error);
    res.status(500).json({ success: false, message: "Error fetching system analytics" });
  }
});

// Seed High-Fidelity Mock Data for TPO Ecosystem
router.post("/seed-tpo-data-v2", async (req, res) => {
  try {
    // 1. Colleges
    const colleges = [
      { name: "Orchid College of Engineering", code: "ORCHID-01", city: "Solapur" },
      { name: "WIT Solapur (Walchand Institute of Technology)", code: "WIT-02", city: "Solapur" },
      { name: "BMIT (Brahmdevdada Mane Institute of Technology)", code: "BMIT-03", city: "Solapur" }
    ];

    const collegeIds = [];
    for (const c of colleges) {
      const [existing]: any = await db.query("SELECT id FROM college_master WHERE college_code = ?", [c.code]);
      if (existing.length > 0) {
        collegeIds.push(existing[0].id);
      } else {
        const [res]: any = await db.query(`
          INSERT INTO college_master (college_name, college_code, district, state)
          VALUES (?, ?, ?, 'Maharashtra')
        `, [c.name, c.code, c.city]);
        collegeIds.push(res.insertId);
      }
    }

    // 2. Ensure at least one TPO exists for events
    let tpoId;
    const [tpos]: any = await db.query("SELECT id FROM tpo_profiles LIMIT 1");
    if (tpos.length > 0) {
      tpoId = tpos[0].id;
    } else {
      // Create a dummy TPO for seeding
      const tempPassword = await bcrypt.hash("Admin@123", 10);
      const [u]: any = await db.query("INSERT INTO users (email, password_hash, role, is_verified) VALUES (?, ?, 'TPO', 1)", [`seed_tpo@vega.com`, tempPassword]);
      const [t]: any = await db.query("INSERT INTO tpo_profiles (user_id, full_name, designation) VALUES (?, 'System Seed TPO', 'Administrator')", [u.insertId]);
      tpoId = t.insertId;
      // Assign to all seeded colleges
      for (const cid of collegeIds) {
        await db.query("INSERT INTO tpo_colleges (tpo_id, college_id) VALUES (?, ?)", [tpoId, cid]);
      }
    }

    // 3. Students (20 High-Fidelity Profiles)
    const departments = ['CSE', 'ECE', 'Mechanical', 'Civil'];
    const years = ['Third Year', 'Final Year'];
    const names = ["Aditya", "Sneha", "Rohan", "Pooja", "Vikram", "Anjali", "Siddharth", "Nisha", "Sameer", "Riya", "Kunal", "Tanvi", "Pranav", "Ishita", "Yash", "Meera", "Abhishek", "Shweta", "Rahul", "Deepa"];

    for (let i = 0; i < 20; i++) {
      const email = `student${i + 100}@vega.com`;
      const [existing]: any = await db.query("SELECT id FROM users WHERE email = ?", [email]);
      if (existing.length > 0) continue;

      const passwordHash = await bcrypt.hash("Student123!", 10);
      const [u]: any = await db.query("INSERT INTO users (email, password_hash, role, is_verified) VALUES (?, ?, 'STUDENT', 1)", [email, passwordHash]);
      const userId = u.insertId;

      const dept = departments[i % 4];
      const year = years[i % 2];
      const collegeId = collegeIds[i % collegeIds.length];
      const score = 30 + Math.floor(Math.random() * 65); // 30-95

      await db.query(`
        INSERT INTO student_profiles (user_id, college_id, full_name, completeness_score, skills_json, education_json)
        VALUES (?, ?, ?, 100, ?, ?)
      `, [userId, collegeId, names[i] + " Patil", 100, JSON.stringify(['React', 'Node.js', 'SQL']), JSON.stringify({ department: dept, year: year })]);

      await db.query(`
        INSERT INTO talent_scores (user_id, overall_score, breakdown_json)
        VALUES (?, ?, ?)
      `, [userId, score, JSON.stringify({ technical: score, aptitude: score - 5, communication: score + 5 })]);
    }

    // 4. Companies & Drives
    const dateSql = db.useMySQL ? "DATE_ADD(NOW(), INTERVAL 7 DAY)" : "datetime('now', '+7 days')";
    const [driveRes]: any = await db.query(`
      INSERT INTO events (college_id, tpo_id, title, description, event_type, start_date, status)
      VALUES (?, ?, 'TCS Ninja Drive 2026', 'Campus recruitment for TCS Ninja role', 'PLACEMENT_DRIVE', ${dateSql}, 'UPCOMING')
    `, [collegeIds[0], tpoId]);
    
    const eventId = driveRes.insertId;
    await db.query(`
      INSERT INTO placement_drives (event_id, company_name, job_role, package_details)
      VALUES (?, 'TCS', 'System Engineer', '3.6 - 7.0 LPA')
    `, [eventId]);

    // 5. Update college analytics
    for (const cid of collegeIds) {
      const statsData = [cid, 7, 2, 69.2, 72.5, 65.0];
      if (db.useMySQL) {
        await db.query(`
          INSERT INTO college_analytics (college_id, total_students, placed_students, avg_talent_score, avg_coding_score, avg_interview_score)
          VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            total_students = VALUES(total_students), 
            placed_students = VALUES(placed_students), 
            avg_talent_score = VALUES(avg_talent_score),
            avg_coding_score = VALUES(avg_coding_score),
            avg_interview_score = VALUES(avg_interview_score)
        `, statsData);
      } else {
        await db.query(`
          INSERT INTO college_analytics (college_id, total_students, placed_students, avg_talent_score, avg_coding_score, avg_interview_score)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(college_id) DO UPDATE SET
            total_students = excluded.total_students,
            placed_students = excluded.placed_students,
            avg_talent_score = excluded.avg_talent_score,
            avg_coding_score = excluded.avg_coding_score,
            avg_interview_score = excluded.avg_interview_score
        `, statsData);
      }
    }

    res.json({ success: true, message: "Production-grade mock data seeded successfully" });
  } catch (error: any) {
    console.error("Seeding Error:", error);
    res.status(500).json({ success: false, message: `Seeding failed: ${error.message || 'Unknown error'}` });
  }
});

router.get("/tpos", async (req, res) => {
  try {
    const [tpos]: any = await db.query(`
      SELECT t.*, u.email, u.status as user_status, 
      GROUP_CONCAT(c.college_name) as assigned_colleges
      FROM tpo_profiles t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN tpo_colleges tc ON t.id = tc.tpo_id
      LEFT JOIN college_master c ON tc.college_id = c.id
      GROUP BY t.id
    `);
    res.json({ success: true, data: tpos });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching TPOs" });
  }
});

// Admin stats
router.get("/stats", async (req, res) => {
  try {
    const [userCount]: any = await db.query("SELECT COUNT(*) as total FROM users");
    const [studentCount]: any = await db.query("SELECT COUNT(*) as total FROM users WHERE role = 'STUDENT'");
    const [companyCount]: any = await db.query("SELECT COUNT(*) as total FROM users WHERE role = 'COMPANY'");
    const [pendingCompanies]: any = await db.query("SELECT COUNT(*) as total FROM company_profiles WHERE status = 'PENDING'");
    const [jobCount]: any = await db.query("SELECT COUNT(*) as total FROM jobs");
    const [appCount]: any = await db.query("SELECT COUNT(*) as total FROM job_applications");
    const [shortlistedCount]: any = await db.query("SELECT COUNT(*) as total FROM job_applications WHERE status = 'SHORTLISTED'");

    // Application trend (last 7 days)
    const trendQuery = db.useMySQL ? `
      SELECT DATE(applied_at) as date, COUNT(*) as count 
      FROM job_applications 
      WHERE applied_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY date
      ORDER BY date ASC
    ` : `
      SELECT date(applied_at) as date, COUNT(*) as count 
      FROM job_applications 
      WHERE applied_at >= date('now', '-7 days')
      GROUP BY date
      ORDER BY date ASC
    `;

    const [trend]: any = await db.query(trendQuery);

    res.json({
      success: true,
      data: {
        metrics: {
          totalUsers: userCount[0]?.total || 0,
          students: studentCount[0]?.total || 0,
          companies: companyCount[0]?.total || 0,
          pendingVerifications: pendingCompanies[0]?.total || 0,
          totalJobs: jobCount[0]?.total || 0,
          totalApplications: appCount[0]?.total || 0,
          shortlisted: shortlistedCount[0]?.total || 0
        },
        trend
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching stats" });
  }
});

// Get Student Activity Logs
router.get("/students/:userId/activity-logs", async (req, res) => {
  try {
    const { userId } = req.params;
    const [logs]: any = await db.query(`
      SELECT * FROM student_activity_logs 
      WHERE student_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1000
    `, [userId]);
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    res.status(500).json({ success: false, message: "Error fetching activity logs" });
  }
});

// Get Comprehensive Student Details
router.get("/students/:userId/details", async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if student exists
    const [userQuery]: any = await db.query("SELECT id, email, status, role, created_at FROM users WHERE id = ?", [userId]);
    if (userQuery.length === 0) return res.status(404).json({ success: false, message: "User not found" });
    const user = userQuery[0];

    const [profiles]: any = await db.query("SELECT * FROM student_profiles WHERE user_id = ?", [userId]);
    const profile = profiles[0] || null;

    if (!profile) {
      return res.json({ success: true, data: { user, profile: null } });
    }

    const studentId = profile.id;

    const [education]: any = await db.query("SELECT * FROM student_education WHERE student_id = ? ORDER BY start_date DESC", [studentId]);
    const [experience]: any = await db.query("SELECT * FROM student_experience WHERE student_id = ? ORDER BY start_date DESC", [studentId]);
    const [projects]: any = await db.query("SELECT * FROM student_projects WHERE student_id = ? ORDER BY created_at DESC", [studentId]);
    const [certifications]: any = await db.query("SELECT * FROM student_certifications WHERE student_id = ? ORDER BY issue_date DESC", [studentId]);
    const [extracurriculars]: any = await db.query("SELECT * FROM extracurricular_activities WHERE user_id = ? ORDER BY activity_date DESC", [userId]);
    
    const [applications]: any = await db.query(`
      SELECT a.id, a.status, a.applied_at, j.title as job_title, cp.company_name
      FROM job_applications a
      JOIN jobs j ON a.job_id = j.id
      JOIN company_profiles cp ON j.company_id = cp.id
      WHERE a.student_id = ?
      ORDER BY a.applied_at DESC
    `, [studentId]);

    const [activityLogs]: any = await db.query(`
      SELECT path, action, duration_seconds, created_at 
      FROM student_activity_logs 
      WHERE student_id = ? 
      ORDER BY created_at DESC 
      LIMIT 100
    `, [userId]);

    res.json({ 
      success: true, 
      data: {
        user,
        profile,
        education,
        experience,
        projects,
        certifications,
        extracurriculars,
        applications,
        activityLogs
      }
    });
  } catch (error) {
    console.error("Error fetching detailed student info:", error);
    res.status(500).json({ success: false, message: "Error fetching details" });
  }
});

// Get Comprehensive Company Details
router.get("/companies/:userId/details", async (req, res) => {
  try {
    const { userId } = req.params;
    
    const [userQuery]: any = await db.query("SELECT id, email, status, role, created_at FROM users WHERE id = ?", [userId]);
    if (userQuery.length === 0) return res.status(404).json({ success: false, message: "User not found" });
    const user = userQuery[0];

    const [profiles]: any = await db.query("SELECT * FROM company_profiles WHERE user_id = ?", [userId]);
    const profile = profiles[0] || null;

    if (!profile) {
      return res.json({ success: true, data: { user, profile: null } });
    }

    const companyId = profile.id;

    // Fetch jobs
    const [jobs]: any = await db.query("SELECT * FROM jobs WHERE company_id = ? ORDER BY created_at DESC", [companyId]);

    // Fetch documents
    const [documents]: any = await db.query("SELECT * FROM company_documents WHERE company_id = ?", [companyId]);

    // Fetch brief application stats
    const [applications]: any = await db.query(`
      SELECT a.status, COUNT(*) as count
      FROM job_applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE j.company_id = ?
      GROUP BY a.status
    `, [companyId]);

    res.json({ 
      success: true, 
      data: {
        user,
        profile,
        jobs,
        documents,
        applicationStats: applications
      }
    });

  } catch (error) {
    console.error("Error fetching detailed company info:", error);
    res.status(500).json({ success: false, message: "Error fetching details" });
  }
});

// List all users
router.get("/users", async (req, res) => {
  try {
    const [users]: any = await db.query(`
      SELECT u.id, u.email, u.role, u.status, u.created_at,
             cp.company_name, cp.status as company_status, cp.id as company_profile_id,
             cp.company_type, cp.industry, cp.city as location, cp.contact_number, cp.about as description,
             sp.full_name as student_name, sp.id as student_profile_id, sp.completeness_score
      FROM users u
      LEFT JOIN company_profiles cp ON u.id = cp.user_id
      LEFT JOIN student_profiles sp ON u.id = sp.user_id
      ORDER BY u.created_at DESC
    `);
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching users" });
  }
});

// Pending verification list with details
router.get("/companies/pending", async (req, res) => {
  try {
    const [pending]: any = await db.query(`
      SELECT C.*, U.email 
      FROM company_profiles C 
      JOIN users U ON C.user_id = U.id 
      WHERE C.status = 'PENDING'
      ORDER BY C.updated_at ASC
    `);

    // Fetch documents for each pending company
    const enriched = await Promise.all(pending.map(async (p: any) => {
      const [docs]: any = await db.query("SELECT id, doc_type, status FROM company_documents WHERE company_id = ?", [p.id]);
      return { ...p, documents: docs };
    }));

    res.json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching pending list" });
  }
});

// Approve/Reject Company
router.post("/companies/verify", async (req, res) => {
  const { companyId, status, reason } = req.body;
  const adminId = (req as any).user.userId;

  try {
    const verifiedAt = status === 'APPROVED' ? new Date() : null;
    
    await db.query(`
      UPDATE company_profiles 
      SET status = ?, rejection_reason = ?, verified_at = ?
      WHERE id = ?
    `, [status, status === 'REJECTED' ? reason : null, verifiedAt, companyId]);

    // Log the review
    await db.query(`
      INSERT INTO admin_reviews (company_id, admin_id, action, reason)
      VALUES (?, ?, ?, ?)
    `, [companyId, adminId, status, reason]);

    await logAdminAction(adminId, `VERIFY_COMPANY_${status}`, { companyId, reason }, req);

    res.json({ success: true, message: `Company ${status}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Verification failed" });
  }
});

// Applications Tracker (Global)
router.get("/applications", async (req, res) => {
  try {
    const [apps]: any = await db.query(`
      SELECT a.*, sp.full_name as student_name, j.title as job_title, cp.company_name
      FROM applications a
      JOIN student_profiles sp ON a.student_id = sp.id
      JOIN jobs j ON a.job_id = j.id
      JOIN company_profiles cp ON j.company_id = cp.id
      ORDER BY a.applied_at DESC
    `);
    res.json({ success: true, data: apps });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching applications" });
  }
});

// Talent Score Monitoring
router.get("/monitoring/talent-scores", async (req, res) => {
  try {
    const [scores]: any = await db.query(`
      SELECT sp.full_name, sp.id as profile_id, u.email, sp.completeness_score,
             (SELECT COUNT(*) FROM applications WHERE student_id = sp.id) as app_count
      FROM student_profiles sp
      JOIN users u ON sp.user_id = u.id
      ORDER BY sp.completeness_score DESC
      LIMIT 100
    `);
    res.json({ success: true, data: scores });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching talent scores" });
  }
});

// Admin Logs
router.get("/logs", async (req, res) => {
  try {
    const [logs]: any = await db.query(`
      SELECT al.*, u.email as admin_email
      FROM admin_logs al
      JOIN users u ON al.admin_id = u.id
      ORDER BY al.created_at DESC
      LIMIT 200
    `);
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching logs" });
  }
});

// Moderate jobs
router.get("/jobs", async (req, res) => {
  try {
    const [jobs]: any = await db.query(`
      SELECT j.*, cp.company_name 
      FROM jobs j
      JOIN company_profiles cp ON j.company_id = cp.id
      ORDER BY j.created_at DESC
    `);
    res.json({ success: true, data: jobs });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching jobs" });
  }
});

router.delete("/jobs/:id", async (req, res) => {
  const adminId = (req as any).user.userId;
  try {
    await db.query("DELETE FROM jobs WHERE id = ?", [req.params.id]);
    await logAdminAction(adminId, "DELETE_JOB", { jobId: req.params.id }, req);
    res.json({ success: true, message: "Job deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Delete failed" });
  }
});

// Update user account status (Ban/Unban)
router.patch("/users/:id/status", async (req, res) => {
  const { status } = req.body;
  const adminId = (req as any).user.userId;
  try {
    await db.query("UPDATE users SET status = ? WHERE id = ?", [status, req.params.id]);
    await logAdminAction(adminId, `USER_STATUS_${status}`, { userId: req.params.id }, req);
    res.json({ success: true, message: `User status updated to ${status}` });
  } catch (error) {
    res.status(500).json({ success: false, message: "Update failed" });
  }
});

// --- PSYCHOMETRIC QUESTION MANAGEMENT ---

// List all psychometric questions
router.get("/psychometric/questions", async (req, res) => {
  try {
    const [questions]: any = await db.query("SELECT * FROM psychometric_questions ORDER BY created_at DESC");
    res.json({ success: true, data: questions });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching psychometric questions" });
  }
});

// Add new psychometric question
router.post("/psychometric/questions", async (req, res) => {
  const { category, trait, question_text, options_json } = req.body;
  const adminId = (req as any).user.userId;
  try {
    const [result]: any = await db.query(
      "INSERT INTO psychometric_questions (category, trait, question_text, options_json) VALUES (?, ?, ?, ?)",
      [category, trait, question_text, JSON.stringify(options_json)]
    );
    await logAdminAction(adminId, "ADD_PSYCHOMETRIC_QUESTION", { id: result.insertId, category, trait }, req);
    res.json({ success: true, message: "Question added", id: result.insertId });
  } catch (error) {
    console.error("❌ Error adding psychometric question:", error);
    res.status(500).json({ success: false, message: "Error adding question: " + (error as any).message });
  }
});

// Update psychometric question
router.put("/psychometric/questions/:id", async (req, res) => {
  const { category, trait, question_text, options_json } = req.body;
  const adminId = (req as any).user.userId;
  try {
    await db.query(
      "UPDATE psychometric_questions SET category = ?, trait = ?, question_text = ?, options_json = ? WHERE id = ?",
      [category, trait, question_text, JSON.stringify(options_json), req.params.id]
    );
    await logAdminAction(adminId, "UPDATE_PSYCHOMETRIC_QUESTION", { id: req.params.id }, req);
    res.json({ success: true, message: "Question updated" });
  } catch (error) {
    console.error("❌ Error updating psychometric question:", error);
    res.status(500).json({ success: false, message: "Error updating question: " + (error as any).message });
  }
});

// Delete psychometric question
router.delete("/psychometric/questions/:id", async (req, res) => {
  const adminId = (req as any).user.userId;
  try {
    await db.query("DELETE FROM psychometric_questions WHERE id = ?", [req.params.id]);
    await logAdminAction(adminId, "DELETE_PSYCHOMETRIC_QUESTION", { id: req.params.id }, req);
    res.json({ success: true, message: "Question deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting question" });
  }
});

// --- DYNAMIC PRICING & SYSTEM CONFIGURATION MANAGEMENT ---

// Fetch all system configs
router.get("/config", async (req, res) => {
  try {
    const [configs] = await db.query("SELECT config_key, config_value, description FROM system_configs");
    res.json({ success: true, data: configs });
  } catch (error: any) {
    console.error("❌ Error fetching configuration:", error);
    res.status(500).json({ success: false, message: "Error fetching configs: " + error.message });
  }
});

// Update a system config key value
router.put("/config/:key", async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  const adminId = (req as any).user.userId;

  try {
    await db.query(
      "UPDATE system_configs SET config_value = ? WHERE config_key = ?",
      [String(value), key]
    );

    await logAdminAction(adminId, "UPDATE_SYSTEM_CONFIG", { key, value }, req);
    res.json({ success: true, message: `Config '${key}' updated successfully` });
  } catch (error: any) {
    console.error("❌ Error updating configuration:", error);
    res.status(500).json({ success: false, message: "Error updating config: " + error.message });
  }
});

// --- Dynamic XP Packages Management ---

// Fetch all packages for editing/management
router.get("/packages", async (req, res) => {
  try {
    const [packages] = await db.query("SELECT * FROM xp_packages ORDER BY price_inr ASC");
    res.json({ success: true, data: packages });
  } catch (error: any) {
    console.error("❌ Error fetching packages:", error);
    res.status(500).json({ success: false, message: "Error fetching packages" });
  }
});

// Add a new package
router.post("/packages", async (req, res) => {
  const { name, xp_amount, price_inr, is_popular, is_best_value, mock_interviews_included, resume_reviews_included } = req.body;
  const adminId = (req as any).user.userId;

  try {
    const [result]: any = await db.query(
      "INSERT INTO xp_packages (name, xp_amount, price_inr, is_popular, is_best_value, mock_interviews_included, resume_reviews_included) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        name, 
        Number(xp_amount), 
        Number(price_inr), 
        is_popular ? 1 : 0, 
        is_best_value ? 1 : 0,
        mock_interviews_included !== undefined && mock_interviews_included !== null ? Number(mock_interviews_included) : null,
        resume_reviews_included !== undefined && resume_reviews_included !== null ? Number(resume_reviews_included) : null
      ]
    );

    await logAdminAction(adminId, "ADD_XP_PACKAGE", { name, xp_amount, price_inr }, req);
    res.json({ success: true, message: "XP package added successfully", id: result.insertId });
  } catch (error: any) {
    console.error("❌ Error adding package:", error);
    res.status(500).json({ success: false, message: "Error adding package: " + error.message });
  }
});

// Edit existing package
router.put("/packages/:id", async (req, res) => {
  const { id } = req.params;
  const { name, xp_amount, price_inr, is_popular, is_best_value, mock_interviews_included, resume_reviews_included } = req.body;
  const adminId = (req as any).user.userId;

  try {
    await db.query(
      "UPDATE xp_packages SET name = ?, xp_amount = ?, price_inr = ?, is_popular = ?, is_best_value = ?, mock_interviews_included = ?, resume_reviews_included = ? WHERE id = ?",
      [
        name, 
        Number(xp_amount), 
        Number(price_inr), 
        is_popular ? 1 : 0, 
        is_best_value ? 1 : 0,
        mock_interviews_included !== undefined && mock_interviews_included !== null ? Number(mock_interviews_included) : null,
        resume_reviews_included !== undefined && resume_reviews_included !== null ? Number(resume_reviews_included) : null,
        id
      ]
    );

    await logAdminAction(adminId, "UPDATE_XP_PACKAGE", { id, name, xp_amount, price_inr }, req);
    res.json({ success: true, message: "XP package updated successfully" });
  } catch (error: any) {
    console.error("❌ Error updating package:", error);
    res.status(500).json({ success: false, message: "Error updating package: " + error.message });
  }
});

// Delete package
router.delete("/packages/:id", async (req, res) => {
  const { id } = req.params;
  const adminId = (req as any).user.userId;

  try {
    await db.query("DELETE FROM xp_packages WHERE id = ?", [id]);
    await logAdminAction(adminId, "DELETE_XP_PACKAGE", { id }, req);
    res.json({ success: true, message: "XP package deleted successfully" });
  } catch (error: any) {
    console.error("❌ Error deleting package:", error);
    res.status(500).json({ success: false, message: "Error deleting package" });
  }
});

// --- ADMIN COMMUNITY post & XP MANAGEMENT ---

// List all community posts
router.get("/community/posts", async (req, res) => {
  try {
    const queryStr = `
      SELECT p.*, u.email as creator_email, u.name as creator_name, u.photo as creator_photo
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `;
    const [posts] = await db.query(queryStr);
    res.json({ success: true, posts });
  } catch (error: any) {
    console.error("❌ Error loading admin posts:", error);
    res.status(500).json({ success: false, message: "Error loading community posts: " + error.message });
  }
});

// Toggle post verification / badge
router.put("/community/posts/:id/verify", async (req, res) => {
  const { id } = req.params;
  let { is_verified, send_reward } = req.body;
  if (is_verified === undefined) is_verified = true;
  if (send_reward === undefined) send_reward = true;
  const adminId = (req as any).user.userId;

  try {
    const [posts]: any = await db.query("SELECT * FROM posts WHERE id = ?", [id]);
    if (posts.length === 0) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }
    const post = posts[0];

    await db.query("UPDATE posts SET is_verified = ? WHERE id = ?", [is_verified ? 1 : 0, id]);

    if (is_verified && send_reward) {
      // Award Verification Bonus XP!
      await XPService.addXP(post.user_id, 100, "BONUS", `[Community] Double Verification Reward for post: "${post.title}"`);
    }

    await logAdminAction(adminId, "TOGGLE_COMMUNITY_POST_VERIFICATION", { id, is_verified, send_reward }, req);
    res.json({ success: true, message: `Post verification toggled successfully. ${is_verified && send_reward ? "100 XP award granted to user." : ""}` });
  } catch (error: any) {
    console.error("❌ Error toggling post verification:", error);
    res.status(500).json({ success: false, message: "Error toggling post verification: " + error.message });
  }
});

// Adjust rating / manual scoring
router.put("/community/posts/:id/update-score", async (req, res) => {
  const { id } = req.params;
  const { content_score, quality_analysis } = req.body;
  const adminId = (req as any).user.userId;

  try {
    await db.query(
      "UPDATE posts SET content_score = ?, quality_analysis = ? WHERE id = ?",
      [Number(content_score), quality_analysis, id]
    );

    await logAdminAction(adminId, "UPDATE_COMMUNITY_POST_SCORE", { id, content_score }, req);
    res.json({ success: true, message: "Content score and evaluation updated successfully." });
  } catch (error: any) {
    console.error("❌ Error updating post score:", error);
    res.status(500).json({ success: false, message: "Error updating post score: " + error.message });
  }
});

// Delete community post
router.delete("/community/posts/:id", async (req, res) => {
  const { id } = req.params;
  const adminId = (req as any).user.userId;

  try {
    await db.query("DELETE FROM posts WHERE id = ?", [id]);
    await logAdminAction(adminId, "DELETE_COMMUNITY_POST", { id }, req);
    res.json({ success: true, message: "Post deleted successfully" });
  } catch (error: any) {
    console.error("❌ Error deleting community post:", error);
    res.status(500).json({ success: false, message: "Error deleting community post" });
  }
});

// Grant or deduct User XP directly
router.post("/community/users/:id/grant-xp", async (req, res) => {
  const { id } = req.params;
  const { amount, description } = req.body;
  const adminId = (req as any).user.userId;

  try {
    const amt = Number(amount);
    if (isNaN(amt) || amt === 0) {
      return res.status(400).json({ success: false, message: "Invalid amount value." });
    }

    if (amt > 0) {
      await XPService.addXP(Number(id), amt, "BONUS", description || "[Community] Admin Community Bonus award");
      await logAdminAction(adminId, "GRANT_USER_XP", { id, amount: amt, description }, req);
    } else {
      // For backwards compatibility let's safeguard DB. This does not crash even if client sends deductXP or we do it directly
      await db.query(`
        UPDATE users 
        SET xp_balance = MAX(0, xp_balance - ?)
        WHERE id = ?
      `, [Math.abs(amt), Number(id)]);
      await logAdminAction(adminId, "DEDUCT_USER_XP", { id, amount: Math.abs(amt), description }, req);
    }

    res.json({ success: true, message: "User XP updated successfully." });
  } catch (error: any) {
    console.error("❌ Error adjusting user XP:", error);
    res.status(500).json({ success: false, message: "Error adjusting user XP: " + error.message });
  }
});

// --- STAFF/ADMIN OFFICER PERMISSIONS & DYNAMIC DASHBOARD ---

// Create a new staff officer
router.post("/staff", async (req, res) => {
  try {
    const { email, password, allowed_pages } = req.body;

    if (!email || !password || !Array.isArray(allowed_pages)) {
      return res.status(400).json({ success: false, message: "Missing required fields: email, password, or allowed_pages" });
    }

    // Check if email already exists
    const [existingUsers]: any = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const [userResult]: any = await db.query(`
      INSERT INTO users (email, password_hash, role, status, is_verified)
      VALUES (?, ?, 'ADMIN', 'ACTIVE', 1)
    `, [email, hashedPassword]);

    const userId = userResult.insertId;

    // Save sidebar permissions
    await db.query(`
      INSERT INTO admin_sidebar_permissions (user_id, allowed_pages)
      VALUES (?, ?)
    `, [userId, JSON.stringify(allowed_pages)]);

    await logAdminAction((req as any).user.userId, "CREATE_STAFF_OFFICER", { email, allowed_pages }, req);

    res.json({ success: true, message: "Staff Officer account created successfully", userId });
  } catch (error: any) {
    console.error("Error creating staff account:", error);
    res.status(500).json({ success: false, message: "Error creating staff account: " + error.message });
  }
});

// Get all staff officers & their sidebar access
router.get("/staff", async (req, res) => {
  try {
    const [staffList]: any = await db.query(`
      SELECT u.id, u.email, u.status, u.created_at, p.allowed_pages
      FROM users u
      LEFT JOIN admin_sidebar_permissions p ON u.id = p.user_id
      WHERE u.role = 'ADMIN' OR u.role = 'SUPER_ADMIN'
      ORDER BY u.created_at DESC
    `);

    // Parse the allowed_pages JSON list
    const enrichedStaff = staffList.map((s: any) => {
      let allowedPages = [];
      if (s.allowed_pages) {
        try {
          allowedPages = JSON.parse(s.allowed_pages);
        } catch (e) {
          allowedPages = [];
        }
      }
      return {
        id: s.id,
        email: s.email,
        status: s.status,
        created_at: s.created_at,
        allowed_pages: allowedPages
      };
    });

    res.json({ success: true, data: enrichedStaff });
  } catch (error: any) {
    console.error("Error listing staff:", error);
    res.status(500).json({ success: false, message: "Error fetching staff accounts: " + error.message });
  }
});

// Update an existing staff officer
router.put("/staff/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { email, password, allowed_pages, status } = req.body;

    if (!email || !Array.isArray(allowed_pages)) {
      return res.status(400).json({ success: false, message: "Missing email or allowed_pages" });
    }

    // Verify email doesn't collide with other users
    const [existing]: any = await db.query("SELECT * FROM users WHERE email = ? AND id != ?", [email, id]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: "Email is already in use by another user" });
    }

    // Update user properties
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 12);
      await db.query("UPDATE users SET email = ?, password_hash = ?, status = ? WHERE id = ?", [email, hashedPassword, status || 'ACTIVE', id]);
    } else {
      await db.query("UPDATE users SET email = ?, status = ? WHERE id = ?", [email, status || 'ACTIVE', id]);
    }

    // Upsert sidebar permissions
    const [perms]: any = await db.query("SELECT * FROM admin_sidebar_permissions WHERE user_id = ?", [id]);
    if (perms.length > 0) {
      await db.query("UPDATE admin_sidebar_permissions SET allowed_pages = ? WHERE user_id = ?", [JSON.stringify(allowed_pages), id]);
    } else {
      await db.query("INSERT INTO admin_sidebar_permissions (user_id, allowed_pages) VALUES (?, ?)", [id, JSON.stringify(allowed_pages)]);
    }

    await logAdminAction((req as any).user.userId, "UPDATE_STAFF_OFFICER", { id, email, allowed_pages, status }, req);

    res.json({ success: true, message: "Staff Officer updated successfully" });
  } catch (error: any) {
    console.error("Error updating staff account:", error);
    res.status(500).json({ success: false, message: "Error updating staff: " + error.message });
  }
});

// Delete a staff officer
router.delete("/staff/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Safety: prevent self-deletion
    if (Number(id) === Number((req as any).user.userId)) {
      return res.status(400).json({ success: false, message: "You cannot delete your own account" });
    }

    // Perform deletion
    await db.query("DELETE FROM users WHERE id = ?", [id]);
    // foreign key with ON DELETE CASCADE will handle admin_sidebar_permissions in DB

    await logAdminAction((req as any).user.userId, "DELETE_STAFF_OFFICER", { id }, req);

    res.json({ success: true, message: "Staff Officer deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting staff account:", error);
    res.status(500).json({ success: false, message: "Error deleting staff user" });
  }
});

export default router;
