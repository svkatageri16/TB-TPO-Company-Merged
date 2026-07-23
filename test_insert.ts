import db, { initDb } from './server/db.ts';
async function test() {
  try {
    await initDb();
    const companyId = 1;
    const title = "Test Software Engineer";
    const description = "Test Description";
    const skills = ["React", "TypeScript"];
    const location = "Remote";
    const jobType = "Full-time";
    const experienceLevel = "Entry Level";
    const salaryRange = "$80k - $100k / Year";
    const educationRequirement = undefined; // from frontend
    const responsibilities = "Test Responsibilities";
    const qualifications = "Test Qualifications";
    const additionalNotes = "Test Notes";
    const startDate = "2026-06-23";
    const deadline = "2026-06-30";

    const [result]: any = await db.query(`
      INSERT INTO jobs (
        company_id, title, description, skills_json, location, job_type,
        experience_level, salary_range, education_requirement, responsibilities,
        qualifications, additional_notes, application_start_date, deadline
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      companyId, title, description, JSON.stringify(skills), location, jobType,
      experienceLevel, salaryRange || "", educationRequirement, responsibilities,
      qualifications, additionalNotes, startDate, deadline
    ]);
    console.log("Success! Inserted Job ID:", result.insertId);
  } catch(e) {
    console.error("Error:", e);
  }
  process.exit();
}
test();
