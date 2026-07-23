import db, { initDb } from './server/db.ts';
console.log("DB_HOST", process.env.DB_HOST);
async function check() {
  try {
    await initDb();
    const [users]: any = await db.query(`SELECT id, email, role FROM users`);
    console.log("Users:", users);
    const [companies]: any = await db.query(`SELECT * FROM company_profiles`);
    console.log("Companies:", companies);
  } catch (e) {
    console.error(e);
  }
}
check();
