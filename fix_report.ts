import { db } from './server/db';
async function fix() {
  const [reports]: any = await db.query("SELECT * FROM assessment_reports");
  console.log("Reports length:", reports.length);
  if (reports.length > 0) {
      console.log(reports[reports.length-1].report_json);
  }
}
fix().catch(console.error).finally(() => process.exit(0));
