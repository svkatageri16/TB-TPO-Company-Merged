import db, { initDb } from './server/db.ts';

async function test() {
  await initDb();
  try {
     const formattedScheduledAt = new Date('2026-06-22T10:10:00.000Z').toISOString().slice(0, 19).replace('T', ' ');
     await db.query(`
        INSERT INTO interview_schedules (application_id, stage_id, interview_type, location_or_link, scheduled_at, notes)
        VALUES (1, 1, 'INTERVIEW_ONLINE', 'Link', ?, '')
     `, [formattedScheduledAt]);
     console.log("Success with formattedScheduledAt!");
  } catch(e) {
     console.error("Failed:", e);
  }
  process.exit();
}
test();
