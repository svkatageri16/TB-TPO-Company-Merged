import { db } from './server/db';
async function run() {
  const sqliteDb = (db as any).sqliteDb || require('better-sqlite3')('vega.db');
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS campus_notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tpo_id INTEGER NOT NULL,
      college_id INTEGER NOT NULL,
      batch_name TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log("Table created");
}
run();
