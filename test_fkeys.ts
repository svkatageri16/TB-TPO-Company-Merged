import db, { initDb } from './server/db.ts';
async function test() {
  try {
    await initDb();
    const [stages] = await db.query('SELECT * FROM job_stages');
    const [apps] = await db.query('SELECT * FROM job_applications');
    console.log("Stages:", stages);
    console.log("Apps:", apps);
  } catch(e) {
    console.error("Error:", e);
  }
  process.exit();
}
test();
