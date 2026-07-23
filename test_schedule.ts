import db, { initDb } from './server/db.ts';

async function test() {
  try {
    await initDb();
    const [res] = await db.query('SELECT * FROM interview_schedules');
    console.log(res);
  } catch(e) {
    console.error('Error:', e);
  }
  process.exit();
}

test();
