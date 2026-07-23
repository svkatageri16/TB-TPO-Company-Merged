import db from "./db.ts";

async function run() {
  try {
    const [tpo_profiles] = await db.query("SELECT * FROM tpo_profiles");
    console.log("=== TPO PROFILES ===");
    console.log(tpo_profiles);

    const [tpo_colleges] = await db.query("SELECT * FROM tpo_colleges");
    console.log("=== TPO COLLEGES ===");
    console.log(tpo_colleges);

    const [college_master] = await db.query("SELECT * FROM college_master");
    console.log("=== COLLEGE MASTER ===");
    console.log(college_master);

    const [batches] = await db.query("SELECT * FROM batches");
    console.log("=== BATCHES ===");
    console.log(batches);

    const [student_profiles] = await db.query("SELECT * FROM student_profiles");
    console.log("=== STUDENT PROFILES ===");
    console.log(student_profiles);

    const [users] = await db.query("SELECT id, email, role, status FROM users");
    console.log("=== USERS ===");
    console.log(users);
  } catch (e) {
    console.error("Diagnosis error:", e);
  }
}

run();
