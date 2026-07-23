import { initDb } from "./server/db.ts";

async function run() {
  try {
    await initDb();
    console.log("DB Init executed manually.");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
