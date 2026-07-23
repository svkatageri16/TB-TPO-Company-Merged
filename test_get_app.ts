import db, { initDb } from './server/db.ts';

async function test() {
  try {
    await initDb();
    const [apps]: any = await db.query('SELECT * FROM job_applications');
    console.log("Apps:", apps);
    process.exit(0);
  } catch (err: any) {
    console.error(err);
    process.exit(1);
  }
}

test();
