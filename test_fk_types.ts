import db, { initDb } from './server/db.ts';

async function setup() {
  await initDb();
  // Insert a mock company, job, and application just so fk constraints are happy
  const [comp]: any = await db.query(`INSERT INTO companies (name, recruiter_id) VALUES ('Test', 1)`);
  const cId = comp.insertId || 1;
  const [job]: any = await db.query(`INSERT INTO jobs (company_id, title) VALUES (?, 'Test Job')`, [cId]);
  const jId = job.insertId || 1;
  const [app]: any = await db.query(`INSERT INTO job_applications (job_id, student_id) VALUES (?, 1)`, [jId]);
  const aId = app.insertId || 1;
  const [stage]: any = await db.query(`INSERT INTO job_stages (job_id, stage_name) VALUES (?, 'Test Stage')`, [jId]);
  const sId = stage.insertId || 1;
  console.log(`Setup complete. App ID: ${aId}, Stage ID: ${sId}`);

  try {
     console.log("Trying to insert with string values format...");
     const ds = new Date('2023-01-01T00:00:00.000Z').toISOString().slice(0, 19).replace('T', ' ');
     await db.query(`
          INSERT INTO interview_schedules (application_id, stage_id, interview_type, location_or_link, scheduled_at, notes)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [aId, sId, 'INTERVIEW_ONLINE', 'Link', ds, '']);
     console.log("Success with strings!");
  } catch(e) {
     console.error("Failed with strings:", e);
  }
}
setup();
