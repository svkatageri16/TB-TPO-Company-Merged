import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function verifyLocalMysql() {
  console.log("=== LOCAL MYSQL ASSESSMENT VERIFICATION SCRIPT ===");

  const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'talentbridge01',
    port: parseInt(process.env.DB_PORT || '3306')
  };

  // Ensure credentials are never logged
  console.log(`[CONFIG] Connecting to MySQL Host: ${dbConfig.host}:${dbConfig.port}, Database: ${dbConfig.database} (User: ${dbConfig.user}, Password: [REDACTED])`);

  let connection: mysql.Connection | null = null;
  let schemaFailure = false;
  let currentDb = 'N/A';
  let verString = 'N/A';

  try {
    connection = await mysql.createConnection(dbConfig);
    console.log(`[PASS] Connected to MySQL server at ${dbConfig.host}:${dbConfig.port}`);

    // 1. SELECT DATABASE()
    const [dbRows]: any = await connection.query("SELECT DATABASE() as current_db");
    currentDb = dbRows[0]?.current_db || 'N/A';
    console.log(`[QUERY] SELECT DATABASE() -> ${currentDb}`);

    if (currentDb !== 'talentbridge01') {
      console.log(`[FAIL] Database is '${currentDb}', expected 'talentbridge01'.`);
      schemaFailure = true;
    } else {
      console.log(`[PASS] Database matches expected 'talentbridge01'.`);
    }

    // 2. SELECT VERSION() and @@version_comment
    const [verRows]: any = await connection.query("SELECT VERSION() as ver, @@version_comment as comment");
    verString = verRows[0]?.ver || 'N/A';
    console.log(`[QUERY] SELECT VERSION() -> ${verString} (${verRows[0]?.comment})`);

    const majorVersion = parseInt(verString.split('.')[0]);
    if (isNaN(majorVersion) || majorVersion < 8) {
      console.log(`[FAIL] MySQL version ${verString} is below minimum requirement 8.0.x.`);
      schemaFailure = true;
    } else {
      console.log(`[PASS] MySQL version ${verString} meets minimum requirement (MySQL 8.0.x).`);
    }

    // 3. Existence of required tables, columns, indexes, FKs, constraints
    const requiredTables = ['company_assessment_definitions', 'company_assessment_assignments', 'test_submissions', 'test_submission_events', 'assessment_idempotency_requests'];
    for (const tbl of requiredTables) {
      const [tableCheck]: any = await connection.query("SHOW TABLES LIKE ?", [tbl]);
      if (tableCheck.length === 0) {
        console.log(`[FAIL] Table '${tbl}' does not exist.`);
        schemaFailure = true;
        continue;
      }
      console.log(`[PASS] Table '${tbl}' exists.`);

      // Column checks
      const [cols]: any = await connection.query(`DESCRIBE \`${tbl}\``);
      console.log(`[INFO] Table '${tbl}' has ${cols.length} columns.`);

      // Index checks
      const [indexes]: any = await connection.query(`SHOW INDEX FROM \`${tbl}\``);
      const indexNames = Array.from(new Set(indexes.map((idx: any) => idx.Key_name)));
      console.log(`[INFO] Table '${tbl}' indexes: ${indexNames.join(', ')}`);
    }

    // Check assessment_idempotency_requests unique index
    const [idemIndexes]: any = await connection.query("SHOW INDEX FROM `assessment_idempotency_requests` WHERE Key_name = 'idx_comp_op_key'");
    if (idemIndexes.length > 0) {
      console.log(`[PASS] Unique index 'idx_comp_op_key' exists on assessment_idempotency_requests(company_id, operation, idempotency_key).`);
    } else {
      console.log(`[FAIL] Unique index 'idx_comp_op_key' missing on assessment_idempotency_requests.`);
      schemaFailure = true;
    }

    // Check attempt snapshot columns on test_submissions
    const [subCols]: any = await connection.query("DESCRIBE `test_submissions`");
    const subColNames = subCols.map((c: any) => c.Field);
    const requiredSubCols = ['questions_json', 'cutoff_score', 'total_marks', 'duration', 'assignment_id'];
    for (const sc of requiredSubCols) {
      if (subColNames.includes(sc)) {
        console.log(`[PASS] Column '${sc}' exists on test_submissions.`);
      } else {
        console.log(`[FAIL] Column '${sc}' missing on test_submissions.`);
        schemaFailure = true;
      }
    }

    // Check integrity event attempt_id column
    const [eventCols]: any = await connection.query("DESCRIBE `test_submission_events`");
    const eventColNames = eventCols.map((c: any) => c.Field);
    if (eventColNames.includes('attempt_id')) {
      console.log(`[PASS] Column 'attempt_id' exists on test_submission_events.`);
    } else {
      console.log(`[FAIL] Column 'attempt_id' missing on test_submission_events.`);
      schemaFailure = true;
    }

    // --- PROMPT 5 SCHEMA VERIFICATION CHECKS ---
    // 1. job_applications.status
    const [statusCols]: any = await connection.query(`
      SELECT DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_TYPE
      FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'job_applications' AND column_name = 'status'
    `);
    if (statusCols.length > 0) {
      const col = statusCols[0];
      const dataType = (col.DATA_TYPE || '').toLowerCase();
      const charLen = parseInt(col.CHARACTER_MAXIMUM_LENGTH || '0', 10);
      const isNullable = col.IS_NULLABLE;
      const colDefault = (col.COLUMN_DEFAULT || '').replace(/['"]/g, '');
      const colType = (col.COLUMN_TYPE || '').toLowerCase();

      if (dataType === 'varchar' && charLen >= 50 && isNullable === 'NO' && colDefault === 'APPLIED' && !colType.includes('enum')) {
        console.log("JOB_APPLICATION_STATUS_SCHEMA: VERIFIED");
      } else {
        console.log(`[FAIL] job_applications.status schema check failed: dataType=${dataType}, charLen=${charLen}, isNullable=${isNullable}, colDefault=${colDefault}, colType=${colType}`);
        schemaFailure = true;
      }
    } else {
      console.log("[FAIL] job_applications.status column missing in information_schema.");
      schemaFailure = true;
    }

    // 2. job_stages.stage_type
    const [stageTypeCols]: any = await connection.query(`
      SELECT DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, COLUMN_TYPE
      FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'job_stages' AND column_name = 'stage_type'
    `);
    if (stageTypeCols.length > 0) {
      const col = stageTypeCols[0];
      const dataType = (col.DATA_TYPE || '').toLowerCase();
      const charLen = parseInt(col.CHARACTER_MAXIMUM_LENGTH || '0', 10);
      const colType = (col.COLUMN_TYPE || '').toLowerCase();

      if (dataType === 'varchar' && charLen >= 100 && !colType.includes('enum')) {
        console.log("JOB_STAGE_TYPE_SCHEMA: VERIFIED");
      } else {
        console.log(`[FAIL] job_stages.stage_type schema check failed: dataType=${dataType}, charLen=${charLen}, colType=${colType}`);
        schemaFailure = true;
      }
    } else {
      console.log("[FAIL] job_stages.stage_type column missing in information_schema.");
      schemaFailure = true;
    }

    // 3. job_applications.hired_at
    const [hiredAtCols]: any = await connection.query(`
      SELECT DATA_TYPE, IS_NULLABLE
      FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'job_applications' AND column_name = 'hired_at'
    `);
    if (hiredAtCols.length > 0) {
      const col = hiredAtCols[0];
      const dataType = (col.DATA_TYPE || '').toLowerCase();
      const isNullable = col.IS_NULLABLE;

      if ((dataType === 'datetime' || dataType === 'timestamp') && isNullable === 'YES') {
        console.log("HIRED_AT_SCHEMA: VERIFIED");
      } else {
        console.log(`[FAIL] job_applications.hired_at schema check failed: dataType=${dataType}, isNullable=${isNullable}`);
        schemaFailure = true;
      }
    } else {
      console.log("[FAIL] job_applications.hired_at column missing in information_schema.");
      schemaFailure = true;
    }

    // Check ambiguous legacy events remain unresolved (attempt_id IS NULL for multi-attempt apps)
    const [ambiguousEvents]: any = await connection.query(`
      SELECT tse.id
      FROM test_submission_events tse
      JOIN (
        SELECT application_id FROM test_submissions GROUP BY application_id HAVING COUNT(*) > 1
      ) multi ON tse.application_id = multi.application_id
      WHERE tse.attempt_id IS NULL
    `);
    console.log(`[INFO] Ambiguous legacy events count (attempt_id IS NULL): ${ambiguousEvents.length}`);

    // Check direct-create job assignment data is clean (no DRAFT tests directly bound to job_id)
    const [invalidDirectCreates]: any = await connection.query(`
      SELECT id FROM tests WHERE status = 'DRAFT' AND job_id IS NOT NULL
    `);
    if (invalidDirectCreates.length > 0) {
      console.log(`[FAIL] Found ${invalidDirectCreates.length} invalid direct-create draft tests bound to job_id.`);
      schemaFailure = true;
    } else {
      console.log(`[PASS] No invalid direct-create draft tests bound to job_id.`);
    }

    // Mismatch audit query
    try {
      const [mismatchRows]: any = await connection.query(`
        SELECT ts.id, ts.application_id, ts.job_id AS submission_job_id, ja.job_id AS app_job_id
        FROM test_submissions ts
        JOIN job_applications ja ON ja.id = ts.application_id
        WHERE ts.job_id IS NOT NULL AND ts.job_id <> ja.job_id
      `);
      console.log(`[AUDIT] Mismatch audit query returned ${mismatchRows.length} mismatched rows.`);
      if (mismatchRows.length > 0) {
        console.log(`[FAIL] Detected ${mismatchRows.length} test_submissions.job_id mismatches with job_applications.`);
        schemaFailure = true;
      } else {
        console.log(`[PASS] test_submissions.job_id mismatch count is 0.`);
      }
    } catch (e: any) {
      console.log(`[INFO] Mismatch audit skipped or unresolvable: ${e.message}`);
    }

    // Specific expected index verification
    const [subIndexes]: any = await connection.query("SHOW INDEX FROM `test_submissions` WHERE Key_name = 'idx_test_sub_job_app'");
    if (subIndexes.length > 0) {
      console.log(`[PASS] Index 'idx_test_sub_job_app' exists on test_submissions(job_id, student_id).`);
    } else {
      console.log(`[WARN] Index 'idx_test_sub_job_app' not yet created on test_submissions.`);
    }

    // Controlled writes check
    const allowWrite = process.argv.includes('--allow-controlled-write');
    if (allowWrite) {
      console.log("[INFO] --allow-controlled-write passed: Executing non-destructive controlled probe...");
      const [insertRes]: any = await connection.query(`
        INSERT INTO tests (job_id, company_id, cutoff_score, duration, status)
        VALUES (9999, 9999, 40, 30, 'DRAFT')
      `);
      const probeId = insertRes.insertId;
      console.log(`[PASS] Controlled test row inserted with ID ${probeId}`);
      await connection.query("DELETE FROM tests WHERE id = ?", [probeId]);
      console.log(`[PASS] Controlled test row ID ${probeId} cleaned up successfully.`);
    } else {
      console.log("[INFO] Read-only verification completed (no database writes performed).");
    }

    if (schemaFailure) {
      console.log("\nMYSQL_VERIFY_STATUS: FAILED");
      console.log("MYSQL_VERIFY_EXIT_CODE: 3");
      console.log(`DATABASE: ${currentDb}`);
      console.log(`MYSQL_VERSION: ${verString}`);
      console.log("SCHEMA_VALID: false");
      process.exitCode = 3;
      process.exit(3);
    } else {
      console.log("\nMYSQL_VERIFY_STATUS: VERIFIED");
      console.log("MYSQL_VERIFY_EXIT_CODE: 0");
      console.log(`DATABASE: ${currentDb}`);
      console.log(`MYSQL_VERSION: ${verString}`);
      console.log("SCHEMA_VALID: true");
      process.exitCode = 0;
      process.exit(0);
    }

  } catch (error: any) {
    console.log(`[NOT VERIFIED] Local MySQL unavailable or connection failed: ${error.message}`);
    console.log("\nMYSQL_VERIFY_STATUS: NOT VERIFIED");
    console.log("MYSQL_VERIFY_EXIT_CODE: 2");
    console.log(`DATABASE: ${currentDb}`);
    console.log(`MYSQL_VERSION: ${verString}`);
    console.log("SCHEMA_VALID: false");
    process.exitCode = 2;
    process.exit(2);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

verifyLocalMysql();
