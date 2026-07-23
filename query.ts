import { db } from './server/db';
async function test() {
  const sqliteDb = (db as any).sqliteDb || require('better-sqlite3')('vega.db');
  console.log(sqliteDb.prepare("SELECT name FROM pragma_table_info('student_profiles')").all());
}
test();
