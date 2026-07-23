import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(process.cwd(), 'vega.db'));

console.log('--- BATChES ---');
console.log(db.prepare('SELECT * FROM batches').all());

console.log('--- STUDENT_PROFILES ---');
console.log(db.prepare('SELECT id, user_id, college_id, batch_id, full_name, batch FROM student_profiles').all());

console.log('--- STUDENT_BATCH ---');
console.log(db.prepare('SELECT * FROM student_batch').all());

console.log('--- USERS ---');
console.log(db.prepare('SELECT id, email, role FROM users').all());

console.log('--- TPO_PROFILES ---');
console.log(db.prepare('SELECT * FROM tpo_profiles').all());

console.log('--- TPO_COLLEGES ---');
console.log(db.prepare('SELECT * FROM tpo_colleges').all());

console.log('--- COLLEGE_MASTER ---');
console.log(db.prepare('SELECT * FROM college_master').all());

console.log('--- ASSESSMENT_BATCHES ---');
try {
  console.log(db.prepare('SELECT * FROM assessment_batches').all());
} catch (e) {
  console.log('No assessment_batches table');
}

db.close();
