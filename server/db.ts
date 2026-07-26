import mysql from "mysql2/promise";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

let mysqlHost = process.env.DB_HOST || process.env.MYSQLHOST;
let mysqlUser = process.env.DB_USER || process.env.MYSQLUSER;
let mysqlPassword = process.env.DB_PASSWORD || process.env.MYSQLPASSWORD;
let mysqlDatabase = process.env.DB_NAME || process.env.MYSQLDATABASE;
let mysqlPort = process.env.DB_PORT || process.env.MYSQLPORT;

const mysqlUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;
if (mysqlUrl) {
  try {
    const parsedUrl = new URL(mysqlUrl);
    mysqlHost = parsedUrl.hostname;
    mysqlPort = parsedUrl.port || "3306";
    if (parsedUrl.username) {
      mysqlUser = decodeURIComponent(parsedUrl.username);
    }
    if (parsedUrl.password) {
      mysqlPassword = decodeURIComponent(parsedUrl.password);
    }
    if (parsedUrl.pathname) {
      mysqlDatabase = decodeURIComponent(parsedUrl.pathname.replace(/^\//, ""));
    }
    console.log(`Parsed database connection URL. Host: ${mysqlHost}, Database: ${mysqlDatabase}`);
  } catch (err) {
    console.error("Error parsing database connection URL:", err);
  }
}

let isProduction = process.env.NODE_ENV === "production";
const dbTypeEnv = (process.env.DB_TYPE || "").toLowerCase();
const mysqlRequested = (dbTypeEnv === "mysql") || (!dbTypeEnv && (!!mysqlHost || !!process.env.MYSQL_URL || !!process.env.DATABASE_URL));
let useMySQL = dbTypeEnv === "sqlite" ? false : mysqlRequested;

let pool: any = null;
let sqliteDb: any = null;

function setupSQLite() {
  if (!sqliteDb) {
    sqliteDb = new Database(path.join(process.cwd(), "vega.db"));
    try {
      sqliteDb.pragma('journal_mode = WAL');
      sqliteDb.pragma('synchronous = NORMAL');
      sqliteDb.pragma('busy_timeout = 10000');
      sqliteDb.pragma('temp_store = MEMORY');
    } catch (e) {
      console.warn("Could not set SQLite performance pragmas:", e);
    }
    console.log("📦 SQLite Database initialized (WAL mode & busy_timeout=10s active)");
  }
}

function initializeMySQLPool() {
  pool = mysql.createPool({
    host: mysqlHost || "localhost",
    user: mysqlUser || "root",
    password: mysqlPassword || "",
    database: mysqlDatabase || "vega_preserved_fallback",
    port: parseInt((mysqlPort || "3306").toString()),
    waitForConnections: true,
    connectionLimit: 150, // Optimal high-concurrency connection pool limit
    maxIdle: 50,
    idleTimeout: 30000, // 30 seconds idle release
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    queueLimit: 0,
    connectTimeout: 10000,
    timezone: 'Z' // Ensure all dates are treated as UTC
  });
}

if (useMySQL) {
  initializeMySQLPool();
} else {
  setupSQLite();
}

function isSelectQuery(sql: string): boolean {
  const clean = sql.trim().toLowerCase();
  // Strip starting comments (both block comments and line comments) if they exist
  const withoutComments = clean
    .replace(/\/\*[\s\S]*?\*\//g, '') // remove block comments
    .replace(/--.*$/gm, '')           // remove inline comments
    .trim();
  
  return withoutComments.startsWith("select") || 
         withoutComments.startsWith("with") || 
         withoutComments.startsWith("show") || 
         withoutComments.startsWith("pragma") || 
         withoutComments.startsWith("explain") || 
         withoutComments.startsWith("describe") || 
         withoutComments.startsWith("(");
}

function logSafeConnectionError(err: any, context: string) {
  console.error("================================================================================");
  console.error(`🚨 CRITICAL DATABASE CONNECTION ERROR [${context}]`);
  console.error(`👉 MySQL configuration exists but connection failed!`);
  console.error(`👉 Configured Host: ${mysqlHost || 'not set'}`);
  console.error(`👉 Configured Port: ${mysqlPort || '3306'}`);
  console.error(`👉 Configured User: ${mysqlUser || 'not set'}`);
  console.error(`👉 Configured Database: ${mysqlDatabase || 'not set'}`);
  console.error(`👉 Error Details: ${err.message || err}`);
  console.error(`👉 ACTION TAKEN: Falling back to SQLite database (vega.db).`);
  console.error(`👉 WARNING: SQLite contains separate local records and may show 0 or empty lists if unpopulated!`);
  console.error("================================================================================");
}

// Unified query function for both DBs
async function performQuery(sql: string, params: any[] = []) {
  const startTime = Date.now();
  let result: any;
  try {
    const processedParams = params.map(p => {
      if (p instanceof Date) {
        if (useMySQL) {
          // Format as 'YYYY-MM-DD HH:mm:ss' for MySQL DATETIME
          return p.toISOString().slice(0, 19).replace('T', ' ');
        }
        return p.toISOString();
      }
      return p;
    });
    if (useMySQL && pool) {
      try {
        const [results] = await pool.execute(sql, processedParams);
        result = [results];
        return result;
      } catch (e: any) {
        const isConnectionError = ['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ETIMEDOUT', 'ECONNRESET', 'EHOSTUNREACH', 'PROTOCOL_CONNECTION_LOST'].includes(e.code) || e.message?.includes('getaddrinfo') || e.message?.includes('connect ETIMEDOUT');
        if (isConnectionError) {
          if (mysqlRequested) {
            console.error("================================================================================");
            console.error(`🚨 FATAL DATABASE QUERY CONNECTION ERROR: MySQL connection failed!`);
            console.error(`👉 Query: ${sql}`);
            console.error(`👉 Error Details: ${e.message || e}`);
            console.error("================================================================================");
            throw e;
          }
          logSafeConnectionError(e, "QUERY_FALLBACK");
          useMySQL = false;
          if (!sqliteDb) setupSQLite();
          const stmt = sqliteDb.prepare(sql);
          if (isSelectQuery(sql)) {
            const results = stmt.all(...processedParams);
            result = [results];
            return result;
          } else {
            const res = stmt.run(...processedParams);
            result = [{ insertId: res.lastInsertRowid, affectedRows: res.changes }];
            return result;
          }
        }
        throw e;
      }
    } else {
      if (!sqliteDb) setupSQLite();
      // Basic SQLite compatibility: handle result structures
      const stmt = sqliteDb.prepare(sql);
      if (isSelectQuery(sql)) {
        const results = stmt.all(...processedParams);
        result = [results]; // Return as [rows] to match mysql2 structure
        return result;
      } else {
        const res = stmt.run(...processedParams);
        result = [{ insertId: res.lastInsertRowid, affectedRows: res.changes }];
        return result;
      }
    }
  } finally {
    const duration = Date.now() - startTime;
    if (duration > 500) {
      console.warn(`⚠️ [SLOW DB QUERY] ${duration}ms | Query: ${sql.trim().substring(0, 150).replace(/\s+/g, ' ')}`);
    }
  }
}

export const db = {
  query: performQuery,
  execute: performQuery, // Alias for mysql2 compatibility
  get useMySQL() { return useMySQL; }
};

export const queryLogger = async (queryText: string, execution: () => Promise<any>) => {
  const startTime = Date.now();
  const result = await execution();
  const duration = Date.now() - startTime;
  if (duration > 500) { // Log any query that takes longer than 500ms as SLOW
    console.warn(`⚠️ [SLOW DB QUERY] ${duration}ms | Query: ${queryText.substring(0, 100)}`);
  }
  return result;
};

export async function initDb() {
  if (useMySQL) {
    console.log(`🗄️ Database Engine: MySQL | Host: ${mysqlHost || 'localhost'} | Port: ${mysqlPort || '3306'} | User: ${mysqlUser || 'not set'} | Database: ${mysqlDatabase || 'not set'}`);
    let connection;
    try {
      let retries = 5;
      let delayMs = 3000;
      while (retries > 0) {
        try {
          connection = await pool.getConnection();
          console.log(`📡 Successfully connected to MySQL Database (${mysqlDatabase || 'default'})`);
          break;
        } catch (err: any) {
          retries--;
          console.warn(`⚠️ MySQL Connection attempt failed: ${err.message || err}. Retrying in ${delayMs / 1000}s... (${retries} attempts left)`);
          if (retries === 0) {
            console.error("================================================================================");
            console.error(`🚨 FATAL: MySQL connection failed after 5 retries!`);
            console.error(`👉 Host: ${mysqlHost || 'localhost'}, Port: ${mysqlPort || '3306'}, Database: ${mysqlDatabase || 'not set'}`);
            console.error(`👉 Error Details: ${err.message || err}`);
            console.error(`👉 MySQL is configured; server startup is aborted (no SQLite fallback).`);
            console.error("================================================================================");
            throw err;
          }
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
      
      await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT PRIMARY KEY AUTO_INCREMENT,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role ENUM('STUDENT', 'COMPANY', 'TPO', 'ADMIN', 'SUPER_ADMIN') NOT NULL,
          status VARCHAR(50) DEFAULT 'ACTIVE',
          is_verified TINYINT DEFAULT 0,
          failed_login_attempts INT DEFAULT 0,
          locked_until DATETIME DEFAULT NULL,
          xp_balance INT DEFAULT 0,
          free_mock_count INT DEFAULT 3,
          referral_code VARCHAR(10) UNIQUE,
          last_reward_claimed_at DATETIME DEFAULT NULL,
          login_streak INT DEFAULT 0,
          total_earned_xp INT DEFAULT 0,
          total_spent_xp INT DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await connection.query(`
        CREATE TABLE IF NOT EXISTS xp_transactions (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          type VARCHAR(50) NOT NULL,
          amount INT NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);
      try {
        await connection.query(`
          ALTER TABLE xp_transactions MODIFY COLUMN type VARCHAR(50) NOT NULL
        `);
        console.log("✅ Successfully migrated xp_transactions type column to VARCHAR(50)");
      } catch (err: any) {
        console.warn("⚠️ Migration warning for xp_transactions column type modification:", err.message);
      }
      await connection.query(`
        CREATE TABLE IF NOT EXISTS referrals (
          id INT PRIMARY KEY AUTO_INCREMENT,
          referrer_id INT NOT NULL,
          referred_user_id INT NOT NULL,
          reward_given TINYINT DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);
      await connection.query(`
        CREATE TABLE IF NOT EXISTS payments (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          razorpay_order_id VARCHAR(255) NOT NULL,
          razorpay_payment_id VARCHAR(255),
          amount DECIMAL(10, 2) NOT NULL,
          xp_added INT NOT NULL,
          status VARCHAR(50) DEFAULT 'PENDING',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);
      await connection.query(`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          token VARCHAR(500) NOT NULL,
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);
      await connection.query(`
        CREATE TABLE IF NOT EXISTS security_logs (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT,
          action VARCHAR(255) NOT NULL,
          ip_address VARCHAR(45),
          user_agent TEXT,
          details TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await connection.query(`
        CREATE TABLE IF NOT EXISTS otps (
          id INT PRIMARY KEY AUTO_INCREMENT,
          email VARCHAR(255) NOT NULL,
          code VARCHAR(10) NOT NULL,
          expires_at DATETIME NOT NULL
        );
      `);
      
      await connection.query(`
        CREATE TABLE IF NOT EXISTS ai_conversations (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          role ENUM('USER', 'AI') NOT NULL,
          message TEXT NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS ai_memory (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT UNIQUE NOT NULL,
          preferences TEXT,
          weak_skills TEXT,
          goals TEXT,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS student_profiles (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT UNIQUE NOT NULL,
          college_id INT,
          full_name VARCHAR(255),
          bio TEXT,
          dob DATE,
          gender VARCHAR(20),
          address TEXT,
          profile_photo_url VARCHAR(255),
          aadhar_or_college_id VARCHAR(100),
          contact VARCHAR(20),
          experience_type VARCHAR(20) DEFAULT 'FRESHER',
          education_json JSON,
          experience_json JSON,
          projects_json JSON,
          skills_json JSON,
          languages_json JSON,
          social_links_json JSON,
          resume_url VARCHAR(255),
          resume_builder_json JSON,
          completeness_score INT DEFAULT 0,
          email_verified TINYINT DEFAULT 0,
          phone_verified TINYINT DEFAULT 0,
          onboarding_completed TINYINT DEFAULT 0,
          onboarding_industry VARCHAR(100),
          onboarding_status VARCHAR(100),
          onboarding_source VARCHAR(100),
          onboarding_help_actions JSON,
          batch VARCHAR(100) DEFAULT NULL,
          country VARCHAR(100) NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS admin_logs (
          id INT PRIMARY KEY AUTO_INCREMENT,
          admin_id INT NOT NULL,
          action VARCHAR(255) NOT NULL,
          details TEXT,
          ip_address VARCHAR(45),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS admin_sidebar_permissions (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT UNIQUE NOT NULL,
          allowed_pages TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS company_profiles (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT UNIQUE NOT NULL,
          company_name VARCHAR(255) NOT NULL,
          logo_url LONGTEXT,
          website VARCHAR(255),
          company_email VARCHAR(255),
          contact_number VARCHAR(20),
          company_type VARCHAR(100),
          industry VARCHAR(100),
          company_size VARCHAR(100),
          year_established INT,
          registration_date VARCHAR(50) NULL,
          business_name VARCHAR(255),
          gst_no VARCHAR(50) UNIQUE,
          cin_no VARCHAR(50) UNIQUE,
          pan_no VARCHAR(50) UNIQUE,
          address TEXT,
          operating_address TEXT,
          country VARCHAR(100),
          state VARCHAR(100),
          city VARCHAR(100),
          about TEXT,
          services TEXT,
          linkedin_url VARCHAR(255),
          github_url VARCHAR(255),
          status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
          rejection_reason TEXT,
          completeness_score INT DEFAULT 0,
          is_submitted INT DEFAULT 0,
          verified_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      // --- TPO & COLLEGE MANAGEMENT TABLES ---
      await connection.query(`
        CREATE TABLE IF NOT EXISTS college_master (
          id INT PRIMARY KEY AUTO_INCREMENT,
          college_name VARCHAR(255) NOT NULL,
          college_code VARCHAR(100) UNIQUE NOT NULL,
          university VARCHAR(255),
          address TEXT,
          district VARCHAR(100),
          state VARCHAR(100),
          website VARCHAR(255),
          contact_number VARCHAR(20),
          status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Add new college_master columns dynamically for production-grade College Management
      const collegeColumns = [
        { name: "country", definition: "VARCHAR(100) DEFAULT 'India'" },
        { name: "official_email", definition: "VARCHAR(255) NULL" },
        { name: "principal_name", definition: "VARCHAR(255) NULL" },
        { name: "placement_head", definition: "VARCHAR(255) NULL" },
        { name: "college_logo", definition: "LONGTEXT NULL" }
      ];
      for (const col of collegeColumns) {
        try {
          await connection.query(`ALTER TABLE college_master ADD COLUMN ${col.name} ${col.definition}`);
        } catch (e) {}
      }

      // Add TPO Profile columns
      const tpoColumns = [
        { name: "employee_id", definition: "VARCHAR(100) NULL" },
        { name: "phone", definition: "VARCHAR(20) NULL" }
      ];
      for (const col of tpoColumns) {
        try {
          await connection.query(`ALTER TABLE tpo_profiles ADD COLUMN ${col.name} ${col.definition}`);
        } catch (e) {}
      }

      // Create batches table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS batches (
          id INT PRIMARY KEY AUTO_INCREMENT,
          college_id INT NOT NULL,
          batch_name VARCHAR(100) NOT NULL,
          department VARCHAR(100),
          academic_year VARCHAR(50),
          semester VARCHAR(20),
          strength INT DEFAULT 0,
          status VARCHAR(50) DEFAULT 'ACTIVE',
          assigned_tpo_id INT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (college_id) REFERENCES college_master(id) ON DELETE CASCADE
        );
      `);

      // Create student_batch table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS student_batch (
          id INT PRIMARY KEY AUTO_INCREMENT,
          student_id INT NOT NULL UNIQUE,
          batch_id INT NOT NULL,
          assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE,
          FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
        );
      `);

      // Add batch_id to student_profiles
      try {
        await connection.query(`ALTER TABLE student_profiles ADD COLUMN batch_id INT NULL`);
      } catch (e) {}

      // Create audit_logs table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NULL,
          action VARCHAR(255) NOT NULL,
          details TEXT,
          ip_address VARCHAR(45),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create password_reset table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS password_reset (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          token VARCHAR(255) UNIQUE NOT NULL,
          expires_at DATETIME NOT NULL,
          used TINYINT DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      // Create email_logs table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS email_logs (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NULL,
          email_type VARCHAR(100) NOT NULL,
          recipient VARCHAR(255) NOT NULL,
          subject VARCHAR(255) NOT NULL,
          status VARCHAR(50) DEFAULT 'SENT',
          sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS tpo_profiles (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT UNIQUE NOT NULL,
          full_name VARCHAR(255) NOT NULL,
          contact_number VARCHAR(20),
          designation VARCHAR(100),
          status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
          first_login TINYINT DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS tpo_colleges (
          id INT PRIMARY KEY AUTO_INCREMENT,
          tpo_id INT NOT NULL,
          college_id INT NOT NULL,
          assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(tpo_id, college_id),
          FOREIGN KEY (tpo_id) REFERENCES tpo_profiles(id) ON DELETE CASCADE,
          FOREIGN KEY (college_id) REFERENCES college_master(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS tpo_verifications (
          id INT PRIMARY KEY AUTO_INCREMENT,
          student_id INT NOT NULL,
          document_type VARCHAR(100) NOT NULL,
          document_url VARCHAR(255) NOT NULL,
          status VARCHAR(20) DEFAULT 'PENDING',
          rejection_reason TEXT,
          verified_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS events (
          id INT PRIMARY KEY AUTO_INCREMENT,
          college_id INT NOT NULL,
          tpo_id INT NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          event_type VARCHAR(100) NOT NULL,
          start_date DATETIME NOT NULL,
          end_date DATETIME,
          location_or_link TEXT,
          image_url LONGTEXT,
          status ENUM('UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED') DEFAULT 'UPCOMING',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (college_id) REFERENCES college_master(id) ON DELETE CASCADE,
          FOREIGN KEY (tpo_id) REFERENCES tpo_profiles(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS placement_drives (
          id INT PRIMARY KEY AUTO_INCREMENT,
          event_id INT UNIQUE NOT NULL,
          company_name VARCHAR(255),
          job_role VARCHAR(255),
          eligibility_criteria TEXT,
          package_details VARCHAR(255),
          FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS event_registrations (
          id INT PRIMARY KEY AUTO_INCREMENT,
          event_id INT NOT NULL,
          student_id INT NOT NULL,
          status ENUM('REGISTERED', 'ATTENDED', 'SELECTED', 'REJECTED') DEFAULT 'REGISTERED',
          registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(event_id, student_id),
          FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
          FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS college_analytics (
          id INT PRIMARY KEY AUTO_INCREMENT,
          college_id INT UNIQUE NOT NULL,
          total_students INT DEFAULT 0,
          placed_students INT DEFAULT 0,
          avg_talent_score FLOAT DEFAULT 0,
          avg_coding_score FLOAT DEFAULT 0,
          avg_interview_score FLOAT DEFAULT 0,
          last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (college_id) REFERENCES college_master(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS company_documents (
          id INT PRIMARY KEY AUTO_INCREMENT,
          company_id INT NOT NULL,
          doc_type VARCHAR(100) NOT NULL,
          doc_url LONGTEXT NOT NULL,
          status VARCHAR(50) DEFAULT 'PENDING',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES company_profiles(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS admin_reviews (
          id INT PRIMARY KEY AUTO_INCREMENT,
          company_id INT NOT NULL,
          admin_id INT NOT NULL,
          action ENUM('APPROVED', 'REJECTED') NOT NULL,
          reason TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES company_profiles(id) ON DELETE CASCADE,
          FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS jobs (
          id INT PRIMARY KEY AUTO_INCREMENT,
          company_id INT NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          skills_json JSON NOT NULL,
          location VARCHAR(255),
          job_type VARCHAR(100), -- Internship, Full-time, Remote
          experience_level VARCHAR(100),
          salary_range VARCHAR(100),
          education_requirement TEXT,
          responsibilities TEXT,
          qualifications TEXT,
          additional_notes TEXT,
          application_start_date DATE,
          deadline DATE,
          openings INT NOT NULL DEFAULT 1,
          status VARCHAR(50) DEFAULT 'OPEN',
          ended_at DATETIME DEFAULT NULL,
          end_reminder_sent_at DATETIME DEFAULT NULL,
          pipeline_ended_at DATETIME DEFAULT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES company_profiles(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS job_stages (
          id INT PRIMARY KEY AUTO_INCREMENT,
          job_id INT NOT NULL,
          stage_name VARCHAR(255) NOT NULL,
          stage_type ENUM('APPLICATION', 'TEST', 'INTERVIEW_ONLINE', 'INTERVIEW_OFFLINE', 'CUSTOM') DEFAULT 'APPLICATION',
          stage_order INT NOT NULL,
          description TEXT,
          config_json JSON,
          FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS test_questions (
          id INT PRIMARY KEY AUTO_INCREMENT,
          stage_id INT NOT NULL,
          question_text TEXT NOT NULL,
          options_json JSON NOT NULL,
          correct_answer VARCHAR(255),
          FOREIGN KEY (stage_id) REFERENCES job_stages(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          type VARCHAR(50) DEFAULT 'INFO',
          is_read TINYINT DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS test_schedules (
          id INT PRIMARY KEY AUTO_INCREMENT,
          job_id INT NOT NULL,
          stage_id INT NOT NULL,
          scheduled_at DATETIME NOT NULL,
          duration_minutes INT NOT NULL,
          cutoff_score INT DEFAULT 60,
          status VARCHAR(50) DEFAULT 'PENDING',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
          FOREIGN KEY (stage_id) REFERENCES job_stages(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS job_applications (
          id INT PRIMARY KEY AUTO_INCREMENT,
          job_id INT NOT NULL,
          student_id INT NOT NULL,
          current_stage_id INT,
          status ENUM('APPLIED', 'IN_PROGRESS', 'SELECTED', 'REJECTED') DEFAULT 'APPLIED',
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(student_id, job_id),
          FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
          FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE
          -- current_stage_id foreign key added later to avoid circular dependency
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS drops (
          id INT PRIMARY KEY AUTO_INCREMENT,
          company_id INT NOT NULL,
          job_id INT DEFAULT NULL,
          title VARCHAR(255) NOT NULL,
          type VARCHAR(100) NOT NULL,
          description TEXT NOT NULL,
          location VARCHAR(255) DEFAULT NULL,
          scheduled_at DATETIME DEFAULT NULL,
          status VARCHAR(50) DEFAULT 'ACTIVE',
          views_count INT DEFAULT 0,
          comments_count INT DEFAULT 0,
          shares_count INT DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES company_profiles(id) ON DELETE CASCADE,
          FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS test_submissions (
          id INT PRIMARY KEY AUTO_INCREMENT,
          application_id INT NOT NULL,
          student_id INT NOT NULL,
          stage_id INT NOT NULL,
          answers_json JSON,
          score DECIMAL(5,2),
          tab_switches INT DEFAULT 0,
          violation_count INT DEFAULT 0,
          is_auto_submitted TINYINT DEFAULT 0,
          status VARCHAR(50) DEFAULT 'COMPLETED',
          submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (application_id) REFERENCES job_applications(id) ON DELETE CASCADE,
          FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE,
          FOREIGN KEY (stage_id) REFERENCES job_stages(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS interview_schedules (
          id INT PRIMARY KEY AUTO_INCREMENT,
          application_id INT NOT NULL,
          stage_id INT NOT NULL,
          interview_type VARCHAR(50),
          location_or_link TEXT,
          scheduled_at DATETIME,
          notes TEXT,
          status VARCHAR(50) DEFAULT 'UPCOMING',
          duration INT DEFAULT 30,
          interviewer_name VARCHAR(255) DEFAULT NULL,
          instructions TEXT DEFAULT NULL,
          FOREIGN KEY (application_id) REFERENCES job_applications(id) ON DELETE CASCADE,
          FOREIGN KEY (stage_id) REFERENCES job_stages(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS application_history (
          id INT PRIMARY KEY AUTO_INCREMENT,
          application_id INT NOT NULL,
          stage_id INT,
          action VARCHAR(100),
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (application_id) REFERENCES job_applications(id) ON DELETE CASCADE,
          FOREIGN KEY (stage_id) REFERENCES job_stages(id) ON DELETE SET NULL
        );
      `);

      // Add missing current_stage_id foreign key to job_applications
      try {
        await connection.query(`
          ALTER TABLE job_applications ADD CONSTRAINT fk_current_stage 
          FOREIGN KEY (current_stage_id) REFERENCES job_stages(id) ON DELETE SET NULL
        `);
      } catch (err) { /* ignore if already exists */ }

      await connection.query(`
        CREATE TABLE IF NOT EXISTS tests (
          id INT PRIMARY KEY AUTO_INCREMENT,
          job_id INT UNIQUE NOT NULL,
          questions_json JSON NOT NULL,
          FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS applications (
          id INT PRIMARY KEY AUTO_INCREMENT,
          student_id INT NOT NULL,
          job_id INT NOT NULL,
          status ENUM('APPLIED', 'TEST_TAKEN', 'SHORTLISTED', 'REJECTED') DEFAULT 'APPLIED',
          test_score INT,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(student_id, job_id),
          FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE,
          FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS interview_history (
          id INT PRIMARY KEY AUTO_INCREMENT,
          student_id INT NOT NULL,
          transcript_json JSON,
          score INT,
          communication_score INT,
          confidence_score INT,
          explanation_score INT,
          presentation_score INT,
          knowledge_score INT,
          feedback TEXT,
          strengths_json JSON,
          weaknesses_json JSON,
          tips_json JSON,
          questions_answers_json JSON,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS resume_history (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          template_id VARCHAR(50) NOT NULL,
          summary TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      // --- NEW ANALYTICS & GAMIFICATION TABLES ---
      await connection.query(`
        CREATE TABLE IF NOT EXISTS student_performance_stats (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT UNIQUE NOT NULL,
          resume_score INT DEFAULT 0,
          avg_interview_score FLOAT DEFAULT 0,
          skill_count INT DEFAULT 0,
          xp_points INT DEFAULT 0,
          current_streak INT DEFAULT 0,
          last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS talent_scores (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT UNIQUE NOT NULL,
          overall_score INT DEFAULT 0,
          breakdown_json JSON,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS extracurricular_activities (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          category VARCHAR(100),
          title VARCHAR(255) NOT NULL,
          description TEXT,
          organization_name VARCHAR(255),
          participation_level VARCHAR(100),
          achievement_rank VARCHAR(255),
          activity_date DATE,
          certificate_url TEXT,
          ai_analysis_json JSON,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS leadership_analysis (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT UNIQUE NOT NULL,
          leadership_score INT DEFAULT 0,
          ai_feedback TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS activity_tracking (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT UNIQUE NOT NULL,
          streak_days INT DEFAULT 0,
          last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
          consistency_score INT DEFAULT 0,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);


      await connection.query(`
        CREATE TABLE IF NOT EXISTS student_activity_logs (
          id INT PRIMARY KEY AUTO_INCREMENT,
          student_id INT NOT NULL,
          path TEXT NOT NULL,
          action VARCHAR(100) NOT NULL,
          duration_seconds INT DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS daily_tasks (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          task_date DATE NOT NULL,
          is_check_in_completed TINYINT DEFAULT 0,
          is_interview_completed TINYINT DEFAULT 0,
          is_profile_updated TINYINT DEFAULT 0,
          xp_earned INT DEFAULT 0,
          UNIQUE(user_id, task_date),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS profile_views (
          id INT PRIMARY KEY AUTO_INCREMENT,
          student_id INT NOT NULL,
          company_id INT NOT NULL,
          viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE,
          FOREIGN KEY (company_id) REFERENCES company_profiles(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS user_badges (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          badge_name VARCHAR(100) NOT NULL,
          badge_type ENUM('BEGINNER', 'INTERMEDIATE', 'PRO') DEFAULT 'BEGINNER',
          earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, badge_name),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      // --- SECTION-WISE PROFILE TABLES ---
      await connection.query(`
        CREATE TABLE IF NOT EXISTS student_education (
          id INT PRIMARY KEY AUTO_INCREMENT,
          student_id INT NOT NULL,
          institution VARCHAR(255) NOT NULL,
          degree VARCHAR(255) NOT NULL,
          field_of_study VARCHAR(255),
          start_date DATE,
          end_date DATE,
          grade VARCHAR(50),
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS student_projects (
          id INT PRIMARY KEY AUTO_INCREMENT,
          student_id INT NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          tech_stack TEXT,
          link TEXT,
          github_link TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS student_experience (
          id INT PRIMARY KEY AUTO_INCREMENT,
          student_id INT NOT NULL,
          company VARCHAR(255) NOT NULL,
          role VARCHAR(255) NOT NULL,
          location VARCHAR(255),
          start_date DATE,
          end_date DATE,
          is_current TINYINT DEFAULT 0,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS student_certifications (
          id INT PRIMARY KEY AUTO_INCREMENT,
          student_id INT NOT NULL,
          name VARCHAR(255) NOT NULL,
          issuing_organization VARCHAR(255) NOT NULL,
          issue_date DATE,
          expiry_date DATE,
          credential_id VARCHAR(255),
          credential_url TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS system_configs (
          config_key VARCHAR(100) PRIMARY KEY,
          config_value VARCHAR(255) NOT NULL,
          description VARCHAR(255)
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS xp_packages (
          id INT PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(100) NOT NULL,
          xp_amount INT NOT NULL,
          price_inr INT NOT NULL,
          is_popular TINYINT DEFAULT 0,
          is_best_value TINYINT DEFAULT 0,
          mock_interviews_included INT DEFAULT NULL,
          resume_reviews_included INT DEFAULT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS student_visibility (
          id INT PRIMARY KEY AUTO_INCREMENT,
          student_id INT UNIQUE NOT NULL,
          visibility VARCHAR(50) DEFAULT 'PUBLIC',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS profile_comparisons (
          id INT PRIMARY KEY AUTO_INCREMENT,
          student_id INT NOT NULL,
          target_id INT NOT NULL,
          type VARCHAR(50) DEFAULT 'BASIC',
          xp_spent INT DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS comparison_history (
          id INT PRIMARY KEY AUTO_INCREMENT,
          student_id INT NOT NULL,
          compared_student_id INT NOT NULL,
          comparison_type VARCHAR(50) NOT NULL,
          xp_spent INT DEFAULT 0,
          gap_analysis_json LONGTEXT,
          roadmap_json LONGTEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS career_gap_reports (
          id INT PRIMARY KEY AUTO_INCREMENT,
          student_id INT NOT NULL,
          target_id INT NOT NULL,
          gap_analysis_json LONGTEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS ai_roadmaps (
          id INT PRIMARY KEY AUTO_INCREMENT,
          student_id INT NOT NULL,
          target_id INT NOT NULL,
          roadmap_json LONGTEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS recommendation_notifications (
          id INT PRIMARY KEY AUTO_INCREMENT,
          company_id INT NOT NULL,
          job_id INT NOT NULL,
          student_user_id INT NOT NULL,
          match_score INT,
          notified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_by INT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES company_profiles(id) ON DELETE CASCADE,
          FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
          FOREIGN KEY (student_user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      // Ensure columns exist for older schemas
      const [columns]: any = await connection.query("SHOW COLUMNS FROM interview_history");
      const columnNames = columns.map((c: any) => c.Field);
      
      const requiredColumns = [
        { name: "transcript_json", type: "JSON", after: "student_id" },
        { name: "score", type: "INT", after: "transcript_json" },
        { name: "communication_score", type: "INT", after: "score" },
        { name: "confidence_score", type: "INT", after: "communication_score" },
        { name: "explanation_score", type: "INT", after: "confidence_score" },
        { name: "presentation_score", type: "INT", after: "explanation_score" },
        { name: "knowledge_score", type: "INT", after: "presentation_score" },
        { name: "feedback", type: "TEXT", after: "knowledge_score" },
        { name: "strengths_json", type: "JSON", after: "feedback" },
        { name: "weaknesses_json", type: "JSON", after: "strengths_json" },
        { name: "tips_json", type: "JSON", after: "weaknesses_json" },
        { name: "questions_answers_json", type: "JSON", after: "tips_json" }
      ];

      for (const col of requiredColumns) {
        if (!columnNames.includes(col.name)) {
          console.log(`📡 Adding missing column ${col.name} to interview_history...`);
          try {
            await connection.query(`ALTER TABLE interview_history ADD COLUMN ${col.name} ${col.type} AFTER ${col.after}`);
          } catch (err) {
            console.warn(`⚠️ Could not add column ${col.name} after ${col.after}, trying without AFTER:`, err);
            await connection.query(`ALTER TABLE interview_history ADD COLUMN ${col.name} ${col.type}`);
          }
        }
      }

      // Add student_profiles columns if missing
      const [studentCols]: any = await connection.query("SHOW COLUMNS FROM student_profiles");
      const studentColNames = studentCols.map((c: any) => c.Field);
      const requiredStudentCols = [
        { name: "college_id", type: "INT" },
        { name: "bio", type: "TEXT" },
        { name: "dob", type: "DATE" },
        { name: "gender", type: "VARCHAR(20)" },
        { name: "address", type: "TEXT" },
        { name: "profile_photo_url", type: "LONGTEXT" },
        { name: "experience_type", type: "VARCHAR(20) DEFAULT 'FRESHER'" },
        { name: "headline", type: "VARCHAR(255)" },
        { name: "location", type: "VARCHAR(255)" },
        { name: "preferred_job_role", type: "VARCHAR(255)" },
        { name: "preferred_location", type: "VARCHAR(255)" },
        { name: "availability", type: "VARCHAR(100)" },
        { name: "experience_json", type: "JSON" },
        { name: "projects_json", type: "JSON" },
        { name: "languages_json", type: "JSON" },
        { name: "social_links_json", type: "JSON" },
        { name: "email_verified", type: "TINYINT DEFAULT 0" },
        { name: "phone_verified", type: "TINYINT DEFAULT 0" },
        { name: "onboarding_completed", type: "TINYINT DEFAULT 0" },
        { name: "onboarding_industry", type: "VARCHAR(100)" },
        { name: "onboarding_status", type: "VARCHAR(100)" },
        { name: "onboarding_source", type: "VARCHAR(100)" },
        { name: "onboarding_help_actions", type: "JSON" },
        { name: "last_resume_reset_at", type: "DATETIME DEFAULT CURRENT_TIMESTAMP" },
        { name: "daily_resume_count", type: "INT DEFAULT 0" },
        { name: "batch", type: "VARCHAR(100)" },
        { name: "tb_id", type: "VARCHAR(100)" },
        { name: "profile_visibility", type: "VARCHAR(50) DEFAULT 'PUBLIC'" },
        { name: "is_placed", type: "TINYINT DEFAULT 0" },
        { name: "placed_company", type: "VARCHAR(255) DEFAULT NULL" },
        { name: "is_top_performer", type: "TINYINT DEFAULT 0" },
        { name: "country", type: "VARCHAR(100) NULL" },
        { name: "aadhar_or_college_id", type: "VARCHAR(100) NULL" }
      ];

      for (const col of requiredStudentCols) {
        try {
          if (!studentColNames.includes(col.name)) {
            console.log(`📡 Adding missing column ${col.name} to student_profiles...`);
            await connection.query(`ALTER TABLE student_profiles ADD COLUMN ${col.name} ${col.type}`);
          } else if (col.name === "profile_photo_url") {
            // Force update to LONGTEXT if it's currently VARCHAR to support base64
            await connection.query(`ALTER TABLE student_profiles MODIFY COLUMN profile_photo_url LONGTEXT`);
          }
        } catch (e) {
          console.error(`Error migrating student_profiles column ${col.name}:`, e);
        }
      }

      // Add company_profiles columns if missing
      const [compCols]: any = await connection.query("SHOW COLUMNS FROM company_profiles");
      const compColNames = compCols.map((c: any) => c.Field);
      const requiredCompCols = [
        { name: "logo_url", type: "LONGTEXT" },
        { name: "company_email", type: "VARCHAR(255)" },
        { name: "contact_number", type: "VARCHAR(20)" },
        { name: "company_type", type: "VARCHAR(100)" },
        { name: "industry", type: "VARCHAR(100)" },
        { name: "company_size", type: "VARCHAR(100)" },
        { name: "year_established", type: "INT" },
        { name: "registration_date", type: "VARCHAR(50) NULL" },
        { name: "business_name", type: "VARCHAR(255)" },
        { name: "gst_no", type: "VARCHAR(50)" },
        { name: "cin_no", type: "VARCHAR(50)" },
        { name: "pan_no", type: "VARCHAR(50)" },
        { name: "address", type: "TEXT" },
        { name: "operating_address", type: "TEXT" },
        { name: "country", type: "VARCHAR(100)" },
        { name: "state", type: "VARCHAR(100)" },
        { name: "city", type: "VARCHAR(100)" },
        { name: "about", type: "TEXT" },
        { name: "services", type: "TEXT" },
        { name: "linkedin_url", type: "VARCHAR(255)" },
        { name: "github_url", type: "VARCHAR(255)" },
        { name: "rejection_reason", type: "TEXT" },
        { name: "completeness_score", type: "INT DEFAULT 0" },
        { name: "is_submitted", type: "INT DEFAULT 0" },
        { name: "verified_at", type: "DATETIME" }
      ];

      for (const col of requiredCompCols) {
        try {
          if (!compColNames.includes(col.name)) {
            console.log(`📡 Adding missing column ${col.name} to company_profiles...`);
            await connection.query(`ALTER TABLE company_profiles ADD COLUMN ${col.name} ${col.type}`);
          }
        } catch (e) {
          console.error(`Error migrating company_profiles column ${col.name}:`, e);
        }
      }

      // Ensure role column supports 'TPO' and other roles in the ENUM
      try {
        console.log("📡 Ensuring users 'role' column ENUM values support 'TPO'...");
        await connection.query(`
          ALTER TABLE users MODIFY COLUMN role ENUM('STUDENT', 'COMPANY', 'TPO', 'ADMIN', 'SUPER_ADMIN') NOT NULL
        `);
      } catch (err: any) {
        console.warn("⚠️ Migration warning for users role enum:", err.message);
      }

      // Add missing users columns
      const [userCols]: any = await connection.query("SHOW COLUMNS FROM users");
      const userColNames = userCols.map((c: any) => c.Field);
      const requiredUserCols = [
        { name: "is_verified", type: "TINYINT DEFAULT 0" },
        { name: "failed_login_attempts", type: "INT DEFAULT 0" },
        { name: "locked_until", type: "DATETIME DEFAULT NULL" },
        { name: "xp_balance", type: "INT DEFAULT 0" },
        { name: "free_mock_count", type: "INT DEFAULT 3" },
        { name: "referral_code", type: "VARCHAR(10)" },
        { name: "last_reward_claimed_at", type: "DATETIME" },
        { name: "login_streak", type: "INT DEFAULT 0" },
        { name: "total_earned_xp", type: "INT DEFAULT 0" },
        { name: "total_spent_xp", type: "INT DEFAULT 0" }
      ];

      for (const col of requiredUserCols) {
        try {
          if (!userColNames.includes(col.name)) {
            console.log(`📡 Adding missing column ${col.name} to users...`);
            await connection.query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
          }
        } catch (e) {
          console.error(`Error migrating users column ${col.name}:`, e);
        }
      }

      // Add test_submissions columns if missing
      const [testSubCols]: any = await connection.query("SHOW COLUMNS FROM test_submissions");
      const testSubColNames = testSubCols.map((c: any) => c.Field);
      const requiredTestSubCols = [
        { name: "tab_switches", type: "INT DEFAULT 0" },
        { name: "violation_count", type: "INT DEFAULT 0" },
        { name: "is_auto_submitted", type: "TINYINT DEFAULT 0" }
      ];

      for (const col of requiredTestSubCols) {
        try {
          if (!testSubColNames.includes(col.name)) {
            console.log(`📡 Adding missing column ${col.name} to test_submissions...`);
            await connection.query(`ALTER TABLE test_submissions ADD COLUMN ${col.name} ${col.type}`);
          }
        } catch (e) {
          console.error(`Error migrating test_submissions column ${col.name}:`, e);
        }
      }

      // Ensure interview_schedules columns are migrated for MySQL
      try {
        const [schedCols]: any = await connection.query("SHOW COLUMNS FROM interview_schedules");
        const schedColNames = schedCols.map((c: any) => c.Field);
        const requiredSchedCols = [
          { name: "status", type: "VARCHAR(50) DEFAULT 'UPCOMING'" },
          { name: "duration", type: "INT DEFAULT 30" },
          { name: "interviewer_name", type: "VARCHAR(255) DEFAULT NULL" },
          { name: "instructions", type: "TEXT DEFAULT NULL" },
          { name: "scheduler_hr_name", type: "VARCHAR(255) DEFAULT NULL" }
        ];

        for (const col of requiredSchedCols) {
          if (!schedColNames.includes(col.name)) {
            console.log(`📡 Adding missing column ${col.name} to interview_schedules...`);
            await connection.query(`ALTER TABLE interview_schedules ADD COLUMN ${col.name} ${col.type}`);
          }
        }
      } catch (e) {
        console.error("Error migrating interview_schedules columns:", e);
      }

      // --- ENTERPRISE INTERVIEW PLATFORM TABLES (MySQL Versions) ---
      try {
        await connection.query(`
          CREATE TABLE IF NOT EXISTS interview_transcripts (
            id INT PRIMARY KEY AUTO_INCREMENT,
            interview_id INT NOT NULL,
            speaker VARCHAR(50),
            message TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (interview_id) REFERENCES interview_schedules(id) ON DELETE CASCADE
          );
        `);

        await connection.query(`
          CREATE TABLE IF NOT EXISTS interview_recordings (
            id INT PRIMARY KEY AUTO_INCREMENT,
            interview_id INT NOT NULL,
            recording_url LONGTEXT,
            duration INT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (interview_id) REFERENCES interview_schedules(id) ON DELETE CASCADE
          );
        `);

        await connection.query(`
          CREATE TABLE IF NOT EXISTS interview_events (
            id INT PRIMARY KEY AUTO_INCREMENT,
            interview_id INT NOT NULL,
            event_type VARCHAR(100),
            details TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (interview_id) REFERENCES interview_schedules(id) ON DELETE CASCADE
          );
        `);

        await connection.query(`
          CREATE TABLE IF NOT EXISTS interview_warnings (
            id INT PRIMARY KEY AUTO_INCREMENT,
            interview_id INT NOT NULL,
            warning_type VARCHAR(100),
            message TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (interview_id) REFERENCES interview_schedules(id) ON DELETE CASCADE
          );
        `);

        await connection.query(`
          CREATE TABLE IF NOT EXISTS interview_evaluations (
            id INT PRIMARY KEY AUTO_INCREMENT,
            interview_id INT NOT NULL,
            technical_knowledge INT DEFAULT 0,
            communication INT DEFAULT 0,
            confidence INT DEFAULT 0,
            leadership INT DEFAULT 0,
            problem_solving INT DEFAULT 0,
            cultural_fit INT DEFAULT 0,
            comments TEXT,
            saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (interview_id) REFERENCES interview_schedules(id) ON DELETE CASCADE
          );
        `);

        await connection.query(`
          CREATE TABLE IF NOT EXISTS interview_ai_analysis (
            id INT PRIMARY KEY AUTO_INCREMENT,
            interview_id INT NOT NULL,
            communication_score DOUBLE DEFAULT 0,
            confidence_score DOUBLE DEFAULT 0,
            technical_understanding_score DOUBLE DEFAULT 0,
            problem_solving_score DOUBLE DEFAULT 0,
            leadership_score DOUBLE DEFAULT 0,
            overall_recommendation TEXT,
            strengths TEXT,
            weaknesses TEXT,
            key_discussion_points TEXT,
            areas_of_improvement TEXT,
            hiring_recommendation TEXT,
            analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (interview_id) REFERENCES interview_schedules(id) ON DELETE CASCADE
          );
        `);

        await connection.query(`
          CREATE TABLE IF NOT EXISTS interview_reports (
            id INT PRIMARY KEY AUTO_INCREMENT,
            interview_id INT NOT NULL,
            report_data TEXT,
            pdf_url LONGTEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (interview_id) REFERENCES interview_schedules(id) ON DELETE CASCADE
          );
        `);

        await connection.query(`
          CREATE TABLE IF NOT EXISTS interview_attendees (
            id INT PRIMARY KEY AUTO_INCREMENT,
            interview_id INT NOT NULL,
            name VARCHAR(255) DEFAULT NULL,
            email VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (interview_id) REFERENCES interview_schedules(id) ON DELETE CASCADE
          );
        `);
      } catch (err) {
        console.error("Error creating custom interview tracking tables in MySQL:", err);
      }

      // --- PSYCHOMETRIC ASSESSMENT TABLES ---
      await connection.query(`
        CREATE TABLE IF NOT EXISTS psychometric_questions (
          id INT PRIMARY KEY AUTO_INCREMENT,
          category ENUM('PERSONALITY', 'COGNITIVE', 'BEHAVIOR', 'SITUATIONAL') NOT NULL,
          trait VARCHAR(100), -- Leadership, Teamwork, etc.
          question_text TEXT NOT NULL,
          options_json JSON NOT NULL, -- [{text: "...", score_mapping: { Leadership: 5, Teamwork: 2 }}]
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS psychometric_attempts (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          status ENUM('STARTED', 'COMPLETED', 'FAILED') DEFAULT 'STARTED',
          started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          completed_at DATETIME,
          violation_count INT DEFAULT 0,
          tab_switches INT DEFAULT 0,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS psychometric_results (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT UNIQUE NOT NULL,
          attempt_id INT NOT NULL,
          overall_score DECIMAL(5,2),
          traits_json JSON, -- { Leadership: 85, Communication: 70, ... }
          personality_type VARCHAR(100),
          behavioral_summary TEXT,
          recommendation_tags JSON,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (attempt_id) REFERENCES psychometric_attempts(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS psychometric_violations (
          id INT PRIMARY KEY AUTO_INCREMENT,
          attempt_id INT NOT NULL,
          violation_type VARCHAR(100), -- TAB_SWITCH, EXIT_FULLSCREEN, FACE_NOT_DETECTED
          details TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (attempt_id) REFERENCES psychometric_attempts(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS accessibility_preferences (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT UNIQUE NOT NULL,
          accessibility_mode TINYINT DEFAULT 0,
          voice_enabled TINYINT DEFAULT 0,
          contrast_mode VARCHAR(50) DEFAULT 'NORMAL',
          font_size VARCHAR(20) DEFAULT 'MEDIUM',
          last_used_voice VARCHAR(100),
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS voice_command_logs (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          command TEXT NOT NULL,
          intent VARCHAR(100),
          confidence FLOAT,
          success TINYINT DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS pq_questions (
          id INT PRIMARY KEY AUTO_INCREMENT,
          question TEXT NOT NULL,
          options_json JSON NOT NULL,
          category VARCHAR(100),
          weight INT DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS iq_questions (
          id INT PRIMARY KEY AUTO_INCREMENT,
          question TEXT NOT NULL,
          options_json JSON NOT NULL,
          answer TEXT NOT NULL,
          difficulty VARCHAR(50),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS eq_questions (
          id INT PRIMARY KEY AUTO_INCREMENT,
          question TEXT NOT NULL,
          options_json JSON NOT NULL,
          emotional_trait VARCHAR(100),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS sq_questions (
          id INT PRIMARY KEY AUTO_INCREMENT,
          question TEXT NOT NULL,
          options_json JSON NOT NULL,
          social_trait VARCHAR(100),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS student_assessment_results (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT UNIQUE NOT NULL,
          pq_score INT,
          iq_score INT,
          eq_score INT,
          sq_score INT,
          pq_details_json JSON,
          iq_details_json JSON,
          eq_details_json JSON,
          sq_details_json JSON,
          ai_behavioral_summary TEXT,
          completed_at DATETIME,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS ai_assistant_memory (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT UNIQUE NOT NULL,
          preferences_json JSON,
          recent_actions_json JSON,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS interview_sessions (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          role VARCHAR(255),
          level VARCHAR(100),
          techstack TEXT,
          focus VARCHAR(100),
          difficulty VARCHAR(100),
          communication VARCHAR(100),
          score INT DEFAULT 0,
          status VARCHAR(50) DEFAULT 'IN_PROGRESS',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS interview_questions (
          id INT PRIMARY KEY AUTO_INCREMENT,
          session_id INT NOT NULL,
          question TEXT NOT NULL,
          difficulty VARCHAR(50),
          category VARCHAR(100),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES interview_sessions(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS interview_answers (
          id INT PRIMARY KEY AUTO_INCREMENT,
          session_id INT NOT NULL,
          question_id INT NOT NULL,
          answer TEXT,
          ai_feedback TEXT,
          score INT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES interview_sessions(id) ON DELETE CASCADE,
          FOREIGN KEY (question_id) REFERENCES interview_questions(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS quizzes (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          quiz_type VARCHAR(100),
          role VARCHAR(255),
          skills TEXT,
          difficulty VARCHAR(50),
          total_questions INT,
          score INT DEFAULT 0,
          percentage DECIMAL(5,2) DEFAULT 0,
          violations INT DEFAULT 0,
          status VARCHAR(50) DEFAULT 'GENERATING',
          ai_feedback TEXT,
          strengths_json TEXT,
          weaknesses_json TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS quiz_questions (
          id INT PRIMARY KEY AUTO_INCREMENT,
          quiz_id INT NOT NULL,
          question TEXT NOT NULL,
          options_json TEXT NOT NULL,
          correct_answer TEXT NOT NULL,
          explanation TEXT NOT NULL,
          user_answer TEXT,
          is_correct BOOLEAN,
          FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS coding_profiles (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          platform VARCHAR(100) NOT NULL,
          profile_url VARCHAR(500) NOT NULL,
          username VARCHAR(255) NOT NULL,
          is_verified TINYINT DEFAULT 1,
          last_synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, platform),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS coding_stats (
          id INT PRIMARY KEY AUTO_INCREMENT,
          profile_id INT UNIQUE NOT NULL,
          problems_solved INT DEFAULT 0,
          contest_rating INT DEFAULT 0,
          streak INT DEFAULT 0,
          difficulty_breakdown_json JSON,
          topics_json JSON,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (profile_id) REFERENCES coding_profiles(id) ON DELETE CASCADE
        );
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS coding_analysis (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT UNIQUE NOT NULL,
          coding_score INT DEFAULT 0,
          strengths_json JSON,
          weaknesses_json JSON,
          ai_feedback TEXT,
          recommendations_json JSON,
          analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      // Seed psychometric questions if empty
      const [existingQuestions]: any = await connection.query("SELECT COUNT(*) as count FROM psychometric_questions");
      if (existingQuestions[0].count === 0) {
        console.log("🌱 Seeding psychometric questions...");
        const questions = [
          // Personality - Leadership
          {
            category: 'PERSONALITY',
            trait: 'Leadership',
            text: 'When working in a group, I prefer to take charge of organizing the tasks.',
            options: [
              { text: 'Strongly Agree', mapping: { Leadership: 10, Confidence: 5 } },
              { text: 'Agree', mapping: { Leadership: 7, Confidence: 3 } },
              { text: 'Neutral', mapping: { Leadership: 5, Confidence: 2 } },
              { text: 'Disagree', mapping: { Leadership: 2, Confidence: 0 } }
            ]
          },
          // Personality - Teamwork
          {
            category: 'PERSONALITY',
            trait: 'Teamwork',
            text: 'I find it easy to cooperate with others to achieve a common goal.',
            options: [
              { text: 'Strongly Agree', mapping: { Teamwork: 10, Adaptability: 5 } },
              { text: 'Agree', mapping: { Teamwork: 7, Adaptability: 3 } },
              { text: 'Neutral', mapping: { Teamwork: 5, Adaptability: 2 } },
              { text: 'Disagree', mapping: { Teamwork: 2, Adaptability: 0 } }
            ]
          },
          // Cognitive - Problem Solving
          {
            category: 'COGNITIVE',
            trait: 'Problem Solving',
            text: 'Which number should come next in the pattern: 2, 4, 8, 16, ...?',
            options: [
              { text: '32', mapping: { 'Problem Solving': 10, 'Logical Reasoning': 5 } },
              { text: '24', mapping: { 'Problem Solving': 0, 'Logical Reasoning': 0 } },
              { text: '20', mapping: { 'Problem Solving': 0, 'Logical Reasoning': 0 } },
              { text: '64', mapping: { 'Problem Solving': 2, 'Logical Reasoning': 1 } }
            ]
          },
          // Situational
          {
            category: 'SITUATIONAL',
            trait: 'Decision Making',
            text: 'How would you respond if a team member misses a critical deadline?',
            options: [
              { text: 'Schedule a meeting to understand the cause and help them catch up.', mapping: { 'Leadership': 8, 'Teamwork': 10, 'Communication': 7 } },
              { text: 'Report them immediately to the supervisor.', mapping: { 'Leadership': 2, 'Professional Ethics': 5 } },
              { text: 'Do their work yourself to ensure the deadline is met.', mapping: { 'Responsibility': 10, 'Teamwork': 2 } },
              { text: 'Ignore it and focus on your own tasks.', mapping: { 'Professional Ethics': 0, 'Teamwork': 0 } }
            ]
          }
        ];

        for (const q of questions) {
          await connection.query(
            "INSERT INTO psychometric_questions (category, trait, question_text, options_json) VALUES (?, ?, ?, ?)",
            [q.category, q.trait, q.text, JSON.stringify(q.options)]
          );
        }
      }

      // Migration for interactive job stages
    try {
      if (useMySQL && pool) {
        await pool.query("ALTER TABLE job_stages ADD COLUMN stage_type VARCHAR(100) DEFAULT 'APPLICATION' AFTER stage_name");
        await pool.query("ALTER TABLE job_stages ADD COLUMN config_json JSON AFTER description");
      } else {
        sqliteDb.exec("ALTER TABLE job_stages ADD COLUMN stage_type TEXT DEFAULT 'APPLICATION'");
        sqliteDb.exec("ALTER TABLE job_stages ADD COLUMN config_json TEXT");
      }
    } catch (e) { /* existing */ }

    // Migration for new job columns
    try {
      const columnsToAdd = [
        { name: "location", type: "VARCHAR(255)" },
        { name: "job_type", type: "VARCHAR(100)" },
        { name: "experience_level", type: "VARCHAR(100)" },
        { name: "salary_range", type: "VARCHAR(100)" },
        { name: "education_requirement", type: "TEXT" },
        { name: "responsibilities", type: "TEXT" },
        { name: "qualifications", type: "TEXT" },
        { name: "additional_notes", type: "TEXT" },
        { name: "application_start_date", type: "DATE" },
        { name: "deadline", type: "DATE" },
        { name: "ended_at", type: "DATETIME" },
        { name: "end_reminder_sent_at", type: "DATETIME" },
        { name: "pipeline_ended_at", type: "DATETIME" },
        { name: "publish_destination", type: "VARCHAR(100) DEFAULT 'JOB_ONLY'" },
        { name: "openings", type: "INT NOT NULL DEFAULT 1" }
      ];

      for (const col of columnsToAdd) {
        try {
          if (useMySQL && pool) {
            await pool.query(`ALTER TABLE jobs ADD COLUMN ${col.name} ${col.type}`);
          } else {
            sqliteDb.exec(`ALTER TABLE jobs ADD COLUMN ${col.name} ${col.type.replace("VARCHAR(255)", "TEXT").replace("VARCHAR(100)", "TEXT")}`);
          }
        } catch (e) { /* ignore if column exists */ }
      }
    } catch (e) { console.error("Job table migration failed:", e); }

    // Alter events table for event_type format and optional image_url
    try {
      if (useMySQL && pool) {
        try {
          await pool.query("ALTER TABLE events MODIFY COLUMN event_type VARCHAR(100) NOT NULL");
        } catch (e) {}
        try {
          await pool.query("ALTER TABLE events ADD COLUMN image_url LONGTEXT DEFAULT NULL");
        } catch (e) {
          try {
            await pool.query("ALTER TABLE events MODIFY COLUMN image_url LONGTEXT DEFAULT NULL");
          } catch (err) {}
        }
      }
    } catch (e) { console.error("Events table modification failed:", e); }

    // Create CAMS (College Assessment Management System) Tables on MySQL
    if (useMySQL && pool) {
      try {
        await connection.query(`
          CREATE TABLE IF NOT EXISTS assessment_batches (
            id INT AUTO_INCREMENT PRIMARY KEY,
            college_id INT NOT NULL,
            tpo_id INT DEFAULT NULL,
            department VARCHAR(100) NOT NULL,
            academic_year VARCHAR(50) NOT NULL,
            batch_name VARCHAR(100) NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
      } catch (err: any) {
        console.error("Error creating assessment_batches:", err.message);
      }

      // Ensure college_id exists on assessment_batches (MySQL)
      try {
        await connection.query("SELECT college_id FROM assessment_batches LIMIT 1");
      } catch (columnErr) {
        try {
          await connection.query("ALTER TABLE assessment_batches ADD COLUMN college_id INT NOT NULL AFTER id");
          console.log("Successfully added college_id column to assessment_batches on MySQL");
        } catch (alterErr: any) {
          console.error("Failed to add college_id to assessment_batches on MySQL:", alterErr.message);
        }
      }

      try {
        await connection.query(`
          CREATE TABLE IF NOT EXISTS assessment_tests (
            id INT AUTO_INCREMENT PRIMARY KEY,
            tpo_id INT NOT NULL,
            college_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            instructions TEXT,
            category VARCHAR(100) DEFAULT 'Aptitude',
            difficulty VARCHAR(50) DEFAULT 'Medium',
            language VARCHAR(50) DEFAULT 'English',
            department VARCHAR(100) DEFAULT NULL,
            max_marks INT DEFAULT 100,
            passing_marks INT DEFAULT 40,
            negative_marking TINYINT DEFAULT 0,
            randomize_questions TINYINT DEFAULT 0,
            randomize_options TINYINT DEFAULT 0,
            calculator_allowed TINYINT DEFAULT 0,
            status VARCHAR(50) DEFAULT 'DRAFT',
            test_date DATE DEFAULT NULL,
            start_time VARCHAR(20) DEFAULT NULL,
            end_time VARCHAR(20) DEFAULT NULL,
            late_join_window INT DEFAULT 10,
            duration_minutes INT DEFAULT 60,
            webcam_monitoring TINYINT DEFAULT 0,
            camera_required TINYINT DEFAULT 0,
            microphone_required TINYINT DEFAULT 0,
            location_mandatory TINYINT DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
      } catch (err: any) {
        console.error("Error creating assessment_tests:", err.message);
      }

      try {
        await connection.query(`
          CREATE TABLE IF NOT EXISTS assessment_assignments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            assessment_id INT NOT NULL,
            batch_name VARCHAR(100) NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (assessment_id) REFERENCES assessment_tests(id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
      } catch (err: any) {
        console.error("Error creating assessment_assignments:", err.message);
      }

      try {
        await connection.query(`
          CREATE TABLE IF NOT EXISTS assessment_questions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            assessment_id INT NOT NULL,
            question_text TEXT NOT NULL,
            question_type VARCHAR(100) NOT NULL,
            options_json TEXT,
            correct_answers_json TEXT,
            marks INT DEFAULT 1,
            negative_marks REAL DEFAULT 0.0,
            explanation TEXT,
            image_url TEXT,
            topic VARCHAR(255) DEFAULT NULL,
            difficulty VARCHAR(50) DEFAULT 'Medium',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (assessment_id) REFERENCES assessment_tests(id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
      } catch (err: any) {
        console.error("Error creating assessment_questions:", err.message);
      }

      try {
        await connection.query(`
          CREATE TABLE IF NOT EXISTS question_bank (
            id INT AUTO_INCREMENT PRIMARY KEY,
            tpo_id INT NOT NULL,
            topic VARCHAR(255) DEFAULT NULL,
            question_text TEXT NOT NULL,
            question_type VARCHAR(100) NOT NULL,
            difficulty VARCHAR(50) DEFAULT 'Medium',
            options_json TEXT,
            correct_answers_json TEXT,
            explanation TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
      } catch (err: any) {
        console.error("Error creating question_bank:", err.message);
      }

      try {
        await connection.query(`
          CREATE TABLE IF NOT EXISTS assessment_attempts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            assessment_id INT NOT NULL,
            student_user_id INT NOT NULL,
            status VARCHAR(50) DEFAULT 'STARTED',
            score REAL DEFAULT 0,
            percentage REAL DEFAULT 0,
            rank_val INT DEFAULT NULL,
            is_passed TINYINT DEFAULT 0,
            started_at DATETIME NOT NULL,
            submitted_at DATETIME DEFAULT NULL,
            total_time_taken_seconds INT DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (assessment_id) REFERENCES assessment_tests(id) ON DELETE CASCADE,
            FOREIGN KEY (student_user_id) REFERENCES users(id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
      } catch (err: any) {
        console.error("Error creating assessment_attempts:", err.message);
      }

      try {
        await connection.query(`
          CREATE TABLE IF NOT EXISTS assessment_answers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            attempt_id INT NOT NULL,
            question_id INT NOT NULL,
            student_answer_json TEXT,
            is_correct TINYINT DEFAULT 0,
            marks_obtained REAL DEFAULT 0,
            time_spent_seconds INT DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (attempt_id) REFERENCES assessment_attempts(id) ON DELETE CASCADE,
            FOREIGN KEY (question_id) REFERENCES assessment_questions(id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
      } catch (err: any) {
        console.error("Error creating assessment_answers:", err.message);
      }

      try {
        await connection.query(`
          CREATE TABLE IF NOT EXISTS assessment_violations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            attempt_id INT NOT NULL,
            violation_type VARCHAR(100) NOT NULL,
            warning_count INT DEFAULT 1,
            details TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (attempt_id) REFERENCES assessment_attempts(id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
      } catch (err: any) {
        console.error("Error creating assessment_violations:", err.message);
      }

      try {
        await connection.query(`
          CREATE TABLE IF NOT EXISTS assessment_location (
            id INT AUTO_INCREMENT PRIMARY KEY,
            attempt_id INT NOT NULL,
            latitude REAL DEFAULT NULL,
            longitude REAL DEFAULT NULL,
            accuracy REAL DEFAULT NULL,
            ip_address VARCHAR(100) DEFAULT NULL,
            browser VARCHAR(255) DEFAULT NULL,
            device VARCHAR(255) DEFAULT NULL,
            location_address TEXT DEFAULT NULL,
            captured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (attempt_id) REFERENCES assessment_attempts(id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
      } catch (err: any) {
        console.error("Error creating assessment_location:", err.message);
      }

      // Ensure location_address exists on assessment_location (MySQL)
      try {
        await connection.query("SELECT location_address FROM assessment_location LIMIT 1");
      } catch (columnErr) {
        try {
          await connection.query("ALTER TABLE assessment_location ADD COLUMN location_address TEXT DEFAULT NULL");
          console.log("Successfully added location_address column to assessment_location on MySQL");
        } catch (alterErr: any) {
          console.error("Failed to add location_address to assessment_location on MySQL:", alterErr.message);
        }
      }

      try {
        await connection.query(`
          CREATE TABLE IF NOT EXISTS assessment_reports (
            id INT AUTO_INCREMENT PRIMARY KEY,
            assessment_id INT NOT NULL,
            student_user_id INT NOT NULL,
            report_json TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (assessment_id) REFERENCES assessment_tests(id) ON DELETE CASCADE,
            FOREIGN KEY (student_user_id) REFERENCES users(id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
      } catch (err: any) {
        console.error("Error creating assessment_reports:", err.message);
      }

      try {
        await connection.query(`
          CREATE TABLE IF NOT EXISTS assessment_notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            is_read TINYINT DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
      } catch (err: any) {
        console.error("Error creating assessment_notifications:", err.message);
      }
    }

    // Apply High-Coverage Performance Indices for MySQL
    console.log("📡 Guaranteeing database indexes are configured on MySQL...");
    try {
      if (useMySQL && pool) {
        try {
          await connection.query("CREATE INDEX idx_student_profiles_user_id ON student_profiles(user_id);");
        } catch (err) { /* ignore if already exists */ }
        try {
          await connection.query("CREATE INDEX idx_student_profiles_onboarding ON student_profiles(onboarding_completed, onboarding_status);");
        } catch (err) { /* ignore if already exists */ }
        try {
          await connection.query("CREATE INDEX idx_jobs_status_created ON jobs(status, created_at DESC);");
        } catch (err) { /* ignore if already exists */ }
        try {
          await connection.query("CREATE INDEX idx_job_applications_student_job ON job_applications(student_id, job_id);");
        } catch (err) { /* ignore if already exists */ }
        try {
          await connection.query("CREATE INDEX idx_performance_stats_xp ON student_performance_stats(xp_points DESC);");
        } catch (err) { /* ignore if already exists */ }
      }
    } catch (e) { console.error("Index migration failed:", e); }

    console.log("✅ Database migration checks completed");
      } catch (err: any) {
        if (mysqlRequested) {
          console.error("================================================================================");
          console.error(`🚨 FATAL DATABASE INITIALIZATION/MIGRATION ERROR [INIT_FALLBACK]`);
          console.error(`👉 MySQL was explicitly requested but failed during connection or migration!`);
          console.error(`👉 Configured Host: ${mysqlHost || 'not set'}`);
          console.error(`👉 Configured Port: ${mysqlPort || '3306'}`);
          console.error(`👉 Configured User: ${mysqlUser || 'not set'}`);
          console.error(`👉 Configured Database: ${mysqlDatabase || 'not set'}`);
          console.error(`👉 Error Details: ${err.message || err}`);
          console.error(`👉 Action: Terminating startup to prevent running on fallback SQLite database.`);
          console.error("================================================================================");
          process.exit(1);
        }
        logSafeConnectionError(err, "INIT_FALLBACK");
        useMySQL = false;
        setupSQLite();
        return initDb(); // Re-run as SQLite
      } finally {
        if (connection) connection.release();
      }
    } else {
      await runSqliteInit();
    }

  // Initialize company preferences table
  try {
    await performQuery(`
      CREATE TABLE IF NOT EXISTS company_preferences (
        id INTEGER PRIMARY KEY ${useMySQL ? 'AUTO_INCREMENT' : 'AUTOINCREMENT'},
        company_id INT NOT NULL,
        timezone VARCHAR(100) DEFAULT 'Asia/Kolkata',
        email_notification_settings_json ${useMySQL ? 'JSON' : 'TEXT'} NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (company_id)
      )
    `);
    console.log("⚙️ company_preferences table initialized successfully.");
  } catch (err) {
    console.error("❌ Failed to initialize company_preferences table:", err);
  }

  // Initialize company pending actions table
  try {
    await performQuery(`
      CREATE TABLE IF NOT EXISTS company_pending_actions (
        id INTEGER PRIMARY KEY ${useMySQL ? 'AUTO_INCREMENT' : 'AUTOINCREMENT'},
        company_id INT NOT NULL,
        created_by_user_id INT NULL,
        assigned_to_user_id INT NULL,
        source_type VARCHAR(50) DEFAULT 'MANUAL',
        entity_type VARCHAR(50) NULL,
        entity_id INT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        priority VARCHAR(20) DEFAULT 'NORMAL',
        status VARCHAR(20) DEFAULT 'PENDING',
        due_at DATETIME NULL,
        completed_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("📋 company_pending_actions table initialized successfully.");
  } catch (err) {
    console.error("❌ Failed to initialize company_pending_actions table:", err);
  }

  // Initialize company todos table
  try {
    await performQuery(`
      CREATE TABLE IF NOT EXISTS company_todos (
        id INTEGER PRIMARY KEY ${useMySQL ? 'AUTO_INCREMENT' : 'AUTOINCREMENT'},
        company_id INT NOT NULL,
        created_by_user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        due_date VARCHAR(10) NOT NULL,
        due_time VARCHAR(10) NULL,
        status VARCHAR(20) DEFAULT 'PENDING',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("📋 company_todos table initialized successfully.");
  } catch (err) {
    console.error("❌ Failed to initialize company_todos table:", err);
  }

  // Initialize company HR profiles table
  try {
    await performQuery(`
      CREATE TABLE IF NOT EXISTS company_hr_profiles (
        id INTEGER PRIMARY KEY ${useMySQL ? 'AUTO_INCREMENT' : 'AUTOINCREMENT'},
        user_id INT NOT NULL,
        company_id INT NOT NULL,
        designation VARCHAR(255) NULL,
        permissions TEXT NULL,
        role_type VARCHAR(50) DEFAULT 'SUB_HR',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id)
      )
    `);
    console.log("👥 company_hr_profiles table initialized successfully.");
  } catch (err) {
    console.error("❌ Failed to initialize company_hr_profiles table:", err);
  }

  // Initialize company job assignments table
  try {
    await performQuery(`
      CREATE TABLE IF NOT EXISTS company_job_assignments (
        id INTEGER PRIMARY KEY ${useMySQL ? 'AUTO_INCREMENT' : 'AUTOINCREMENT'},
        company_id INT NOT NULL,
        job_id INT NOT NULL,
        assigned_hr_user_id INT NOT NULL,
        assigned_by_user_id INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("📋 company_job_assignments table initialized successfully.");
  } catch (err) {
    console.error("❌ Failed to initialize company_job_assignments table:", err);
  }

  // Initialize company application assignments table
  try {
    await performQuery(`
      CREATE TABLE IF NOT EXISTS company_application_assignments (
        id INTEGER PRIMARY KEY ${useMySQL ? 'AUTO_INCREMENT' : 'AUTOINCREMENT'},
        company_id INT NOT NULL,
        job_id INT NOT NULL,
        application_id INT NOT NULL,
        assigned_hr_user_id INT NOT NULL,
        assigned_by_user_id INT NOT NULL,
        assignment_type VARCHAR(50) DEFAULT 'MANUAL',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("📋 company_application_assignments table initialized successfully.");
  } catch (err) {
    console.error("❌ Failed to initialize company_application_assignments table:", err);
  }

  // Initialize company audit logs table
  try {
    await performQuery(`
      CREATE TABLE IF NOT EXISTS company_audit_logs (
        id INTEGER PRIMARY KEY ${useMySQL ? 'AUTO_INCREMENT' : 'AUTOINCREMENT'},
        company_id INT NOT NULL,
        actor_user_id INT NOT NULL,
        actor_name VARCHAR(255) NOT NULL,
        actor_role VARCHAR(50) NOT NULL,
        action_type VARCHAR(100) NOT NULL,
        module VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        target_type VARCHAR(100) NULL,
        target_id INT NULL,
        metadata_json ${useMySQL ? 'JSON' : 'TEXT'} NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("🧾 company_audit_logs table initialized successfully.");
  } catch (err) {
    console.error("❌ Failed to initialize company_audit_logs table:", err);
  }

  // Seed Default Super Admin
  const adminEmail = "admin@vega.com";
  const [admins]: any = await performQuery("SELECT * FROM users WHERE email = ?", [adminEmail]);
  if (admins.length === 0) {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.default.hash("admin123", 10);
    await performQuery("INSERT INTO users (email, password_hash, role, is_verified) VALUES (?, ?, ?, 1)", [adminEmail, hash, "SUPER_ADMIN"]);
    console.log("👤 Default Super Admin created: admin@vega.com / admin123");
  }

  // Seed Default Approved Company
  const companyEmail = "company@vega.com";
  const [companies]: any = await performQuery("SELECT * FROM users WHERE email = ?", [companyEmail]);
  if (companies.length === 0) {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.default.hash("company123", 10);
    // Insert into users
    await performQuery("INSERT INTO users (email, password_hash, role, is_verified) VALUES (?, ?, ?, 1)", [companyEmail, hash, "COMPANY"]);
    
    // Get the user ID
    const [companyUser]: any = await performQuery("SELECT id FROM users WHERE email = ?", [companyEmail]);
    const companyUserId = companyUser[0].id;
    
    // Insert into company_profiles with APPROVED status
    await performQuery(`
      INSERT INTO company_profiles (
        user_id, company_name, status, completeness_score, is_submitted, verified_at,
        website, company_email, contact_number, company_type, industry, company_size,
        year_established, business_name, gst_no, cin_no, pan_no, address, operating_address,
        country, state, city, about, services, linkedin_url, github_url
      ) VALUES (
        ?, ?, 'APPROVED', 100, 1, CURRENT_TIMESTAMP,
        'https://google.com', 'hr@vega.com', '9876543210', 'Private Limited', 'Information Technology', '500-1000',
        2015, 'Google Inc', '27AAAAA1111A1Z1', 'L01110MH2015PLC012345', 'ABCDE1234F', '1600 Amphitheatre Pkwy', '1600 Amphitheatre Pkwy',
        'India', 'Maharashtra', 'Mumbai', 'Leading tech solution company provider.', 'AI, Cloud, Database Solutions', 'https://linkedin.com', 'https://github.com'
      )
    `, [companyUserId, "Google Recruiting Team"]);
    console.log("🏢 Default approved company created: company@vega.com / company123");
  }

  // Seed Default System Configs
  try {
    await performQuery("DELETE FROM system_configs WHERE config_key = 'QUIZ_GENERATION_COST'");
  } catch (err) {
    console.error("Failed to delete legacy config key:", err);
  }

  const [existingConfigs]: any = await performQuery("SELECT COUNT(*) as count FROM system_configs");
  const configCount = existingConfigs[0]?.count || 0;
  
  const defaultConfigValues = [
    { key: 'DAILY_REWARD_BASE', value: '50', desc: 'Base daily login reward in XP' },
    { key: 'STREAK_BONUS_STEP', value: '10', desc: 'Bonus XP added for active stream step' },
    { key: 'REFERRAL_REWARD', value: '60', desc: 'XP points given to referrer' },
    { key: 'MOCK_INTERVIEW_COST', value: '125', desc: 'XP deducted to attempt mock interview' },
    { key: 'RESUME_ANALYSIS_COST', value: '50', desc: 'XP deducted to create resume draft' },
    { key: 'XP_PER_RUPEE', value: '5', desc: 'Conversion rate of XP points per 1 INR' },
    { key: 'COMMUNITY_POST_XP_REWARD_BASE', value: '10', desc: 'Base XP rewarded for publishing an experience article' },
    { key: 'COMMUNITY_POST_XP_REWARD_HIGH_SCORE', value: '15', desc: 'High quality content XP bonus (Score >= 90)' },
    { key: 'COMMUNITY_LIKE_XP_REWARD', value: '1', desc: 'XP rewarded to author per post like' },
    { key: 'COMMUNITY_COMMENT_XP_REWARD', value: '2', desc: 'XP rewarded to author per comment' },
    { key: 'COMMUNITY_UNLOCK_XP_REWARD', value: '5', desc: 'XP rewarded to author per premium unlock purchase' },
    { key: 'QUIZ_QUESTION_COST', value: '5', desc: 'XP deducted per dynamic AI quiz question' },
  ];

  if (configCount === 0) {
    console.log("🌱 Seeding default system configurations...");
    for (const item of defaultConfigValues) {
      await performQuery(
        "INSERT INTO system_configs (config_key, config_value, description) VALUES (?, ?, ?)",
        [item.key, item.value, item.desc]
      );
    }
  } else {
    // Standalone check to guarantee new parameters are active on already-initialized databases
    for (const item of defaultConfigValues) {
      const [found]: any = await performQuery("SELECT * FROM system_configs WHERE config_key = ?", [item.key]);
      if (found.length === 0) {
        await performQuery(
          "INSERT INTO system_configs (config_key, config_value, description) VALUES (?, ?, ?)",
          [item.key, item.value, item.desc]
        );
        console.log(`🌱 Seeded missing configuration: ${item.key}`);
      }
    }
  }

  // Migrate existing xp_packages if needed
  try {
    await performQuery("ALTER TABLE xp_packages ADD COLUMN mock_interviews_included INT DEFAULT NULL");
  } catch (err) { /* column may exist */ }
  try {
    await performQuery("ALTER TABLE xp_packages ADD COLUMN resume_reviews_included INT DEFAULT NULL");
  } catch (err) { /* column may exist */ }

  // Seed Default XP Packages
  const [existingPackages]: any = await performQuery("SELECT COUNT(*) as count FROM xp_packages");
  const pkgCount = existingPackages[0]?.count || 0;
  if (pkgCount === 0) {
    console.log("🌱 Seeding default XP packages...");
    const defaultPackages = [
      { name: 'Starter Pack', xp: 500, price: 99, popular: 0, bestValue: 0, mock: 4, resume: 10 },
      { name: 'Value Pack', xp: 1200, price: 199, popular: 1, bestValue: 0, mock: 9, resume: 24 },
      { name: 'Elite Pack', xp: 2500, price: 399, popular: 0, bestValue: 1, mock: 20, resume: 50 }
    ];
    for (const pkg of defaultPackages) {
      await performQuery(
        "INSERT INTO xp_packages (name, xp_amount, price_inr, is_popular, is_best_value, mock_interviews_included, resume_reviews_included) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [pkg.name, pkg.xp, pkg.price, pkg.popular, pkg.bestValue, pkg.mock, pkg.resume]
      );
    }
  } else {
    // Backfill any existing packages that have null fields
    try {
      await performQuery("UPDATE xp_packages SET mock_interviews_included = CAST(xp_amount / 125 AS SIGNED) WHERE mock_interviews_included IS NULL");
      await performQuery("UPDATE xp_packages SET resume_reviews_included = CAST(xp_amount / 50 AS SIGNED) WHERE resume_reviews_included IS NULL");
    } catch (sqliteErr) {
      try {
        await performQuery("UPDATE xp_packages SET mock_interviews_included = CAST(xp_amount / 125 AS INTEGER) WHERE mock_interviews_included IS NULL");
        await performQuery("UPDATE xp_packages SET resume_reviews_included = CAST(xp_amount / 50 AS INTEGER) WHERE resume_reviews_included IS NULL");
      } catch (e) {
        console.error("Failed to backfill package limits:", e);
      }
    }
  }

  // Community DB setup
  try {
    const isMysql = useMySQL;
    const pkType = isMysql ? "INT PRIMARY KEY AUTO_INCREMENT" : "INTEGER PRIMARY KEY AUTOINCREMENT";
    const textBlobType = "TEXT";
    const mediaBlobType = isMysql ? "LONGTEXT" : "TEXT";
    
    await performQuery(`
      CREATE TABLE IF NOT EXISTS posts (
        id ${pkType},
        user_id INT NOT NULL,
        type VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        content ${textBlobType} NOT NULL,
        preview_text ${textBlobType} NOT NULL,
        xp_unlock_cost INT DEFAULT 0,
        company_name VARCHAR(100) DEFAULT NULL,
        is_verified TINYINT DEFAULT 0,
        author_role VARCHAR(50) DEFAULT 'STUDENT',
        author_badge VARCHAR(100) DEFAULT NULL,
        content_score INT DEFAULT 80,
        quality_analysis ${textBlobType} DEFAULT NULL,
        tags VARCHAR(255) DEFAULT '',
        likes_count INT DEFAULT 0,
        comments_count INT DEFAULT 0,
        unlock_count INT DEFAULT 0,
        proof_url VARCHAR(255) DEFAULT NULL,
        image_url ${mediaBlobType} DEFAULT NULL,
        video_url ${mediaBlobType} DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    try {
      await performQuery(`ALTER TABLE posts ADD COLUMN image_url ${mediaBlobType} DEFAULT NULL`);
    } catch (e) { /* column may exist */ }
    try {
      await performQuery(`ALTER TABLE posts ADD COLUMN video_url ${mediaBlobType} DEFAULT NULL`);
    } catch (e) { /* column may exist */ }

    await performQuery(`
      CREATE TABLE IF NOT EXISTS post_likes (
        id ${pkType},
        post_id INT NOT NULL,
        user_id INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await performQuery(`
      CREATE TABLE IF NOT EXISTS post_comments (
        id ${pkType},
        post_id INT NOT NULL,
        user_id INT NOT NULL,
        comment ${textBlobType} NOT NULL,
        parent_comment_id INT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await performQuery(`
      CREATE TABLE IF NOT EXISTS unlocked_posts (
        id ${pkType},
        user_id INT NOT NULL,
        post_id INT NOT NULL,
        unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await performQuery(`
      CREATE TABLE IF NOT EXISTS post_bookmarks (
        id ${pkType},
        post_id INT NOT NULL,
        user_id INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await performQuery(`
      CREATE TABLE IF NOT EXISTS user_follows (
        id ${pkType},
        follower_id INT NOT NULL,
        following_id INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Clean up seeded demo batches to ensure "no static data"
    try {
      await performQuery(`DELETE FROM assessment_batches WHERE batch_name IN ('CS-2024', 'IT-2024', 'ECE-2024')`);
      console.log("🧹 Cleaned up demo batches from assessment_batches table.");
    } catch (e) {}

    console.log("🚀 Custom Community Tables Initialized Successfully.");
  } catch (err) {
    console.error("❌ Error setting up Community tables:", err);
  }
}

async function runSqliteInit() {
  if (!sqliteDb) setupSQLite();
  
  // Standard tables
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT DEFAULT 'ACTIVE',
      is_verified INTEGER DEFAULT 0,
      failed_login_attempts INTEGER DEFAULT 0,
      locked_until DATETIME DEFAULT NULL,
      xp_balance INTEGER DEFAULT 0,
      free_mock_count INTEGER DEFAULT 3,
      referral_code TEXT UNIQUE,
      last_reward_claimed_at DATETIME DEFAULT NULL,
      login_streak INTEGER DEFAULT 0,
      total_earned_xp INTEGER DEFAULT 0,
      total_spent_xp INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS xp_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS referrals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referrer_id INTEGER NOT NULL,
      referred_user_id INTEGER NOT NULL,
      reward_given INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      razorpay_order_id TEXT NOT NULL,
      razorpay_payment_id TEXT,
      amount REAL NOT NULL,
      xp_added INTEGER NOT NULL,
      status TEXT DEFAULT 'PENDING',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS security_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS otps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at DATETIME NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'INFO',
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ai_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      message TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ai_memory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      preferences TEXT,
      weak_skills TEXT,
      goals TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS student_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      college_id INTEGER,
      full_name TEXT,
      bio TEXT,
      dob DATE,
      gender TEXT,
      address TEXT,
      profile_photo_url TEXT,
      aadhar_or_college_id TEXT,
      contact TEXT,
      experience_type TEXT DEFAULT 'FRESHER',
      headline TEXT,
      location TEXT,
      preferred_job_role TEXT,
      preferred_location TEXT,
      availability TEXT,
      education_json TEXT, 
      experience_json TEXT,
      projects_json TEXT,
      skills_json TEXT,
      languages_json TEXT,
      social_links_json TEXT,
      resume_url TEXT,
      resume_builder_json TEXT, 
      completeness_score INTEGER DEFAULT 0,
      email_verified INTEGER DEFAULT 0,
      phone_verified INTEGER DEFAULT 0,
      onboarding_completed INTEGER DEFAULT 0,
      onboarding_industry TEXT,
      onboarding_status TEXT,
      onboarding_source TEXT,
      onboarding_help_actions TEXT,
      batch TEXT,
      country TEXT,
      last_resume_reset_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      daily_resume_count INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS company_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      company_name TEXT NOT NULL,
      logo_url TEXT,
      website TEXT,
      company_email TEXT,
      contact_number TEXT,
      company_type TEXT,
      industry TEXT,
      company_size TEXT,
      year_established INTEGER,
      registration_date TEXT,
      business_name TEXT,
      gst_no TEXT UNIQUE,
      cin_no TEXT UNIQUE,
      pan_no TEXT UNIQUE,
      address TEXT,
      operating_address TEXT,
      country TEXT,
      state TEXT,
      city TEXT,
      about TEXT,
      services TEXT,
      linkedin_url TEXT,
      github_url TEXT,
      status TEXT DEFAULT 'PENDING',
      rejection_reason TEXT,
      completeness_score INTEGER DEFAULT 0,
      is_submitted INTEGER DEFAULT 0,
      verified_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- TPO & COLLEGE MANAGEMENT TABLES
    CREATE TABLE IF NOT EXISTS college_master (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      college_name TEXT NOT NULL,
      college_code TEXT UNIQUE NOT NULL,
      university TEXT,
      address TEXT,
      district TEXT,
      state TEXT,
      website TEXT,
      contact_number TEXT,
      country TEXT DEFAULT 'India',
      official_email TEXT,
      principal_name TEXT,
      placement_head TEXT,
      college_logo TEXT,
      status TEXT DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      college_id INTEGER NOT NULL,
      batch_name TEXT NOT NULL,
      department TEXT,
      academic_year TEXT,
      semester TEXT,
      strength INTEGER DEFAULT 0,
      status TEXT DEFAULT 'ACTIVE',
      assigned_tpo_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (college_id) REFERENCES college_master(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS student_batch (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL UNIQUE,
      batch_id INTEGER NOT NULL,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS password_reset (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS email_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      email_type TEXT NOT NULL,
      recipient TEXT NOT NULL,
      subject TEXT NOT NULL,
      status TEXT DEFAULT 'SENT',
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS tpo_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      contact_number TEXT,
      designation TEXT,
      status TEXT DEFAULT 'ACTIVE',
      first_login INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tpo_colleges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tpo_id INTEGER NOT NULL,
      college_id INTEGER NOT NULL,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(tpo_id, college_id),
      FOREIGN KEY (tpo_id) REFERENCES tpo_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (college_id) REFERENCES college_master(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tpo_verifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      document_type TEXT NOT NULL,
      document_url TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING',
      rejection_reason TEXT,
      verified_at TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      college_id INTEGER NOT NULL,
      tpo_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      event_type TEXT NOT NULL,
      start_date DATETIME NOT NULL,
      end_date DATETIME,
      location_or_link TEXT,
      image_url TEXT,
      status TEXT DEFAULT 'UPCOMING',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (college_id) REFERENCES college_master(id) ON DELETE CASCADE,
      FOREIGN KEY (tpo_id) REFERENCES tpo_profiles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS placement_drives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER UNIQUE NOT NULL,
      company_name TEXT,
      job_role TEXT,
      eligibility_criteria TEXT,
      package_details TEXT,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS event_registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      status TEXT DEFAULT 'REGISTERED',
      registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(event_id, student_id),
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS college_analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      college_id INTEGER UNIQUE NOT NULL,
      total_students INTEGER DEFAULT 0,
      placed_students INTEGER DEFAULT 0,
      avg_talent_score REAL DEFAULT 0,
      avg_coding_score REAL DEFAULT 0,
      avg_interview_score REAL DEFAULT 0,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (college_id) REFERENCES college_master(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tpo_tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tpo_id INTEGER NOT NULL,
      college_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      duration_minutes INTEGER DEFAULT 60,
      total_marks INTEGER DEFAULT 100,
      questions_json TEXT NOT NULL, -- Array of {question, options, correct, weight}
      status TEXT DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tpo_id) REFERENCES tpo_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (college_id) REFERENCES college_master(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS student_test_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      test_id INTEGER NOT NULL,
      score_obtained REAL DEFAULT 0,
      time_taken_minutes INTEGER,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (test_id) REFERENCES tpo_tests(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS company_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      doc_type TEXT NOT NULL,
      doc_url TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES company_profiles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS admin_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      admin_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES company_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      skills_json TEXT NOT NULL,
      location TEXT,
      job_type TEXT,
      experience_level TEXT,
      salary_range TEXT,
      education_requirement TEXT,
      responsibilities TEXT,
      qualifications TEXT,
      additional_notes TEXT,
      application_start_date DATE,
      deadline DATE,
      openings INTEGER DEFAULT 1,
      status TEXT DEFAULT 'OPEN',
      ended_at DATETIME DEFAULT NULL,
      end_reminder_sent_at DATETIME DEFAULT NULL,
      pipeline_ended_at DATETIME DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES company_profiles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS job_stages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      stage_name TEXT NOT NULL,
      stage_type TEXT DEFAULT 'APPLICATION',
      stage_order INTEGER NOT NULL,
      description TEXT,
      config_json TEXT,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS test_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stage_id INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      options_json TEXT NOT NULL,
      correct_answer TEXT,
      FOREIGN KEY (stage_id) REFERENCES job_stages(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS job_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      current_stage_id INTEGER,
      status TEXT DEFAULT 'APPLIED',
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(student_id, job_id),
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (current_stage_id) REFERENCES job_stages(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS drops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      job_id INTEGER DEFAULT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      location TEXT DEFAULT NULL,
      scheduled_at DATETIME DEFAULT NULL,
      status TEXT DEFAULT 'ACTIVE',
      views_count INTEGER DEFAULT 0,
      comments_count INTEGER DEFAULT 0,
      shares_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES company_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS test_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      stage_id INTEGER NOT NULL,
      answers_json TEXT,
      score REAL,
      status TEXT DEFAULT 'COMPLETED',
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES job_applications(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (stage_id) REFERENCES job_stages(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS interview_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL,
      stage_id INTEGER NOT NULL,
      interview_type TEXT,
      location_or_link TEXT,
      scheduled_at DATETIME,
      notes TEXT,
      FOREIGN KEY (application_id) REFERENCES job_applications(id) ON DELETE CASCADE,
      FOREIGN KEY (stage_id) REFERENCES job_stages(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS application_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL,
      stage_id INTEGER,
      action TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES job_applications(id) ON DELETE CASCADE,
      FOREIGN KEY (stage_id) REFERENCES job_stages(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER UNIQUE NOT NULL,
      questions_json TEXT NOT NULL, 
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS resume_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      template_id TEXT NOT NULL,
      summary TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS interview_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      transcript_json TEXT,
      score INTEGER,
      communication_score INTEGER,
      confidence_score INTEGER,
      explanation_score INTEGER,
      presentation_score INTEGER,
      knowledge_score INTEGER,
      feedback TEXT,
      strengths_json TEXT,
      weaknesses_json TEXT,
      tips_json TEXT,
      questions_answers_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS student_performance_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      resume_score INTEGER DEFAULT 0,
      avg_interview_score REAL DEFAULT 0,
      skill_count INTEGER DEFAULT 0,
      xp_points INTEGER DEFAULT 0,
      current_streak INTEGER DEFAULT 0,
      last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS talent_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      overall_score INTEGER DEFAULT 0,
      breakdown_json TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS extracurricular_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category TEXT,
      title TEXT NOT NULL,
      description TEXT,
      organization_name TEXT,
      participation_level TEXT,
      achievement_rank TEXT,
      activity_date DATE,
      certificate_url TEXT,
      ai_analysis_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS leadership_analysis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      leadership_score INTEGER DEFAULT 0,
      ai_feedback TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activity_tracking (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      streak_days INTEGER DEFAULT 0,
      last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
      consistency_score INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS student_activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      path TEXT NOT NULL,
      action TEXT NOT NULL,
      duration_seconds INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS daily_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      task_date DATE NOT NULL,
      is_check_in_completed INTEGER DEFAULT 0,
      is_interview_completed INTEGER DEFAULT 0,
      is_profile_updated INTEGER DEFAULT 0,
      xp_earned INTEGER DEFAULT 0,
      UNIQUE(user_id, task_date),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS profile_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      company_id INTEGER NOT NULL,
      viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (company_id) REFERENCES company_profiles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      badge_name TEXT NOT NULL,
      badge_type TEXT DEFAULT 'BEGINNER',
      earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, badge_name),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS student_education (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      institution TEXT NOT NULL,
      degree TEXT NOT NULL,
      field_of_study TEXT,
      start_date DATE,
      end_date DATE,
      grade TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS student_projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      tech_stack TEXT,
      link TEXT,
      github_link TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS student_experience (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      company TEXT NOT NULL,
      role TEXT NOT NULL,
      location TEXT,
      start_date DATE,
      end_date DATE,
      is_current INTEGER DEFAULT 0,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS student_certifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      issuing_organization TEXT NOT NULL,
      issue_date DATE,
      expiry_date DATE,
      credential_id TEXT,
      credential_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS admin_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS admin_sidebar_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      allowed_pages TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS psychometric_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      trait TEXT,
      question_text TEXT NOT NULL,
      options_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS psychometric_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      status TEXT DEFAULT 'STARTED',
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      violation_count INTEGER DEFAULT 0,
      tab_switches INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS psychometric_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      attempt_id INTEGER NOT NULL,
      overall_score REAL,
      traits_json TEXT,
      personality_type TEXT,
      behavioral_summary TEXT,
      recommendation_tags TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (attempt_id) REFERENCES psychometric_attempts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS psychometric_violations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attempt_id INTEGER NOT NULL,
      violation_type TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (attempt_id) REFERENCES psychometric_attempts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS accessibility_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      accessibility_mode INTEGER DEFAULT 0,
      voice_enabled INTEGER DEFAULT 0,
      contrast_mode TEXT DEFAULT 'NORMAL',
      font_size TEXT DEFAULT 'MEDIUM',
      last_used_voice TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS voice_command_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      command TEXT NOT NULL,
      intent TEXT,
      confidence REAL,
      success INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pq_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      options_json TEXT NOT NULL,
      category TEXT,
      weight INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS iq_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      options_json TEXT NOT NULL,
      answer TEXT NOT NULL,
      difficulty TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS eq_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      options_json TEXT NOT NULL,
      emotional_trait TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sq_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      options_json TEXT NOT NULL,
      social_trait TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS student_assessment_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      pq_score INTEGER,
      iq_score INTEGER,
      eq_score INTEGER,
      sq_score INTEGER,
      pq_details_json TEXT,
      iq_details_json TEXT,
      eq_details_json TEXT,
      sq_details_json TEXT,
      ai_behavioral_summary TEXT,
      completed_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ai_assistant_memory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      preferences_json TEXT,
      recent_actions_json TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS interview_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      role TEXT,
      level TEXT,
      techstack TEXT,
      focus TEXT,
      difficulty TEXT,
      communication TEXT,
      score INTEGER DEFAULT 0,
      status TEXT DEFAULT 'IN_PROGRESS',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS interview_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      question TEXT NOT NULL,
      difficulty TEXT,
      category TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES interview_sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS interview_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      answer TEXT,
      ai_feedback TEXT,
      score INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES interview_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES interview_questions(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      quiz_type TEXT,
      role TEXT,
      skills TEXT,
      difficulty TEXT,
      total_questions INTEGER,
      score INTEGER DEFAULT 0,
      percentage REAL DEFAULT 0,
      violations INTEGER DEFAULT 0,
      status TEXT DEFAULT 'GENERATING',
      ai_feedback TEXT,
      strengths_json TEXT,
      weaknesses_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS quiz_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id INTEGER NOT NULL,
      question TEXT NOT NULL,
      options_json TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      explanation TEXT NOT NULL,
      user_answer TEXT,
      is_correct BOOLEAN,
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS coding_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      platform TEXT NOT NULL,
      profile_url TEXT NOT NULL,
      username TEXT NOT NULL,
      is_verified INTEGER DEFAULT 1,
      last_synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, platform),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS coding_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER UNIQUE NOT NULL,
      problems_solved INTEGER DEFAULT 0,
      contest_rating INTEGER DEFAULT 0,
      streak INTEGER DEFAULT 0,
      difficulty_breakdown_json TEXT,
      topics_json TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (profile_id) REFERENCES coding_profiles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS coding_analysis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      coding_score INTEGER DEFAULT 0,
      strengths_json TEXT,
      weaknesses_json TEXT,
      ai_feedback TEXT,
      recommendations_json TEXT,
      analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS system_configs (
      config_key TEXT PRIMARY KEY,
      config_value TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS xp_packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      xp_amount INTEGER NOT NULL,
      price_inr INTEGER NOT NULL,
      is_popular INTEGER DEFAULT 0,
      is_best_value INTEGER DEFAULT 0,
      mock_interviews_included INTEGER DEFAULT NULL,
      resume_reviews_included INTEGER DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS student_visibility (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER UNIQUE NOT NULL,
      visibility TEXT DEFAULT 'PUBLIC',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS profile_comparisons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      target_id INTEGER NOT NULL,
      type TEXT DEFAULT 'BASIC',
      xp_spent INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS comparison_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      compared_student_id INTEGER NOT NULL,
      comparison_type TEXT NOT NULL,
      xp_spent INTEGER DEFAULT 0,
      gap_analysis_json TEXT,
      roadmap_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS career_gap_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      target_id INTEGER NOT NULL,
      gap_analysis_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ai_roadmaps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      target_id INTEGER NOT NULL,
      roadmap_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS recommendation_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      job_id INTEGER NOT NULL,
      student_user_id INTEGER NOT NULL,
      match_score INTEGER,
      notified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES company_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      FOREIGN KEY (student_user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Extra migrations/checks for SQLite
  try {
    const studentCols = sqliteDb.prepare("PRAGMA table_info(student_profiles)").all();
    const studentColNames = studentCols.map((c: any) => c.name);
    if (!studentColNames.includes("college_id")) sqliteDb.exec("ALTER TABLE student_profiles ADD COLUMN college_id INTEGER");
    
    const collegeCols = sqliteDb.prepare("PRAGMA table_info(college_master)").all();
    const collegeColNames = collegeCols.map((c: any) => c.name);
    if (!collegeColNames.includes("status")) sqliteDb.exec("ALTER TABLE college_master ADD COLUMN status TEXT DEFAULT 'ACTIVE'");

    if (!studentColNames.includes("headline")) sqliteDb.exec("ALTER TABLE student_profiles ADD COLUMN headline TEXT");
    if (!studentColNames.includes("location")) sqliteDb.exec("ALTER TABLE student_profiles ADD COLUMN location TEXT");
    if (!studentColNames.includes("preferred_job_role")) sqliteDb.exec("ALTER TABLE student_profiles ADD COLUMN preferred_job_role TEXT");
    if (!studentColNames.includes("preferred_location")) sqliteDb.exec("ALTER TABLE student_profiles ADD COLUMN preferred_location TEXT");
    if (!studentColNames.includes("availability")) sqliteDb.exec("ALTER TABLE student_profiles ADD COLUMN availability TEXT");
    if (!studentColNames.includes("onboarding_completed")) sqliteDb.exec("ALTER TABLE student_profiles ADD COLUMN onboarding_completed INTEGER DEFAULT 0");
    if (!studentColNames.includes("onboarding_industry")) sqliteDb.exec("ALTER TABLE student_profiles ADD COLUMN onboarding_industry TEXT");
    if (!studentColNames.includes("onboarding_status")) sqliteDb.exec("ALTER TABLE student_profiles ADD COLUMN onboarding_status TEXT");
    if (!studentColNames.includes("onboarding_source")) sqliteDb.exec("ALTER TABLE student_profiles ADD COLUMN onboarding_source TEXT");
    if (!studentColNames.includes("onboarding_help_actions")) sqliteDb.exec("ALTER TABLE student_profiles ADD COLUMN onboarding_help_actions TEXT");
    if (!studentColNames.includes("batch")) sqliteDb.exec("ALTER TABLE student_profiles ADD COLUMN batch TEXT");
    if (!studentColNames.includes("tb_id")) sqliteDb.exec("ALTER TABLE student_profiles ADD COLUMN tb_id TEXT DEFAULT NULL");
    if (!studentColNames.includes("profile_visibility")) sqliteDb.exec("ALTER TABLE student_profiles ADD COLUMN profile_visibility TEXT DEFAULT 'PUBLIC'");
    if (!studentColNames.includes("is_placed")) sqliteDb.exec("ALTER TABLE student_profiles ADD COLUMN is_placed INTEGER DEFAULT 0");
    if (!studentColNames.includes("placed_company")) sqliteDb.exec("ALTER TABLE student_profiles ADD COLUMN placed_company TEXT DEFAULT NULL");
    if (!studentColNames.includes("is_top_performer")) sqliteDb.exec("ALTER TABLE student_profiles ADD COLUMN is_top_performer INTEGER DEFAULT 0");
    if (!studentColNames.includes("country")) sqliteDb.exec("ALTER TABLE student_profiles ADD COLUMN country TEXT");
    if (!studentColNames.includes("batch_id")) sqliteDb.exec("ALTER TABLE student_profiles ADD COLUMN batch_id INTEGER");
    if (!studentColNames.includes("aadhar_or_college_id")) sqliteDb.exec("ALTER TABLE student_profiles ADD COLUMN aadhar_or_college_id TEXT");

    const tpoCols = sqliteDb.prepare("PRAGMA table_info(tpo_profiles)").all();
    const tpoColNames = tpoCols.map((c: any) => c.name);
    if (!tpoColNames.includes("employee_id")) sqliteDb.exec("ALTER TABLE tpo_profiles ADD COLUMN employee_id TEXT");
    if (!tpoColNames.includes("phone")) sqliteDb.exec("ALTER TABLE tpo_profiles ADD COLUMN phone TEXT");

    const collegeCheckCols2 = sqliteDb.prepare("PRAGMA table_info(college_master)").all();
    const collegeCheckColNames2 = collegeCheckCols2.map((c: any) => c.name);
    if (!collegeCheckColNames2.includes("country")) sqliteDb.exec("ALTER TABLE college_master ADD COLUMN country TEXT DEFAULT 'India'");
    if (!collegeCheckColNames2.includes("official_email")) sqliteDb.exec("ALTER TABLE college_master ADD COLUMN official_email TEXT");
    if (!collegeCheckColNames2.includes("principal_name")) sqliteDb.exec("ALTER TABLE college_master ADD COLUMN principal_name TEXT");
    if (!collegeCheckColNames2.includes("placement_head")) sqliteDb.exec("ALTER TABLE college_master ADD COLUMN placement_head TEXT");
    if (!collegeCheckColNames2.includes("college_logo")) sqliteDb.exec("ALTER TABLE college_master ADD COLUMN college_logo TEXT");
    
    const userCols = sqliteDb.prepare("PRAGMA table_info(users)").all();
    const userColNames = userCols.map((c: any) => c.name);
    if (!userColNames.includes("xp_balance")) sqliteDb.exec("ALTER TABLE users ADD COLUMN xp_balance INTEGER DEFAULT 0");
    if (!userColNames.includes("free_mock_count")) sqliteDb.exec("ALTER TABLE users ADD COLUMN free_mock_count INTEGER DEFAULT 3");
    if (!userColNames.includes("referral_code")) sqliteDb.exec("ALTER TABLE users ADD COLUMN referral_code TEXT");
    if (!userColNames.includes("last_reward_claimed_at")) sqliteDb.exec("ALTER TABLE users ADD COLUMN last_reward_claimed_at DATETIME DEFAULT NULL");
    if (!userColNames.includes("login_streak")) sqliteDb.exec("ALTER TABLE users ADD COLUMN login_streak INTEGER DEFAULT 0");
    if (!userColNames.includes("total_earned_xp")) sqliteDb.exec("ALTER TABLE users ADD COLUMN total_earned_xp INTEGER DEFAULT 0");
    if (!userColNames.includes("total_spent_xp")) sqliteDb.exec("ALTER TABLE users ADD COLUMN total_spent_xp INTEGER DEFAULT 0");

    const interviewHistoryCols = sqliteDb.prepare("PRAGMA table_info(interview_history)").all();
    const interviewHistoryColNames = interviewHistoryCols.map((c: any) => c.name);
    if (!interviewHistoryColNames.includes("questions_answers_json")) {
      sqliteDb.exec("ALTER TABLE interview_history ADD COLUMN questions_answers_json TEXT");
    }

    const eventCols = sqliteDb.prepare("PRAGMA table_info(events)").all();
    const eventColNames = eventCols.map((c: any) => c.name);
    if (!eventColNames.includes("image_url")) {
      sqliteDb.exec("ALTER TABLE events ADD COLUMN image_url TEXT DEFAULT NULL");
    }

    const companyCheckCols = sqliteDb.prepare("PRAGMA table_info(company_profiles)").all();
    const companyCheckColNames = companyCheckCols.map((c: any) => c.name);
    if (!companyCheckColNames.includes("is_submitted")) {
      sqliteDb.exec("ALTER TABLE company_profiles ADD COLUMN is_submitted INTEGER DEFAULT 0");
    }
    const newGlobalCompCols = [
      { name: "entity_type", type: "TEXT" },
      { name: "registry_number", type: "TEXT" },
      { name: "tax_id", type: "TEXT" },
      { name: "state_of_formation", type: "TEXT" },
      { name: "licensing_authority", type: "TEXT" },
      { name: "risk_score", type: "INTEGER DEFAULT 0" },
      { name: "risk_flags", type: "TEXT" },
      { name: "domain_checked", type: "INTEGER DEFAULT 0" },
      { name: "verification_level", type: "TEXT DEFAULT 'STANDARD'" },        
      { name: "registration_date", type: "TEXT" }
    ];
    for (const col of newGlobalCompCols) {
      if (!companyCheckColNames.includes(col.name)) {
        sqliteDb.exec(`ALTER TABLE company_profiles ADD COLUMN ${col.name} ${col.type}`);
      }
    }

    // Enterprise Interview Platform Schema Migrations
    const scheduleCols = sqliteDb.prepare("PRAGMA table_info(interview_schedules)").all();
    const scheduleColNames = scheduleCols.map((c: any) => c.name);
    if (!scheduleColNames.includes("status")) {
      sqliteDb.exec("ALTER TABLE interview_schedules ADD COLUMN status TEXT DEFAULT 'UPCOMING'");
    }
    if (!scheduleColNames.includes("duration")) {
      sqliteDb.exec("ALTER TABLE interview_schedules ADD COLUMN duration INTEGER DEFAULT 30");
    }
    if (!scheduleColNames.includes("interviewer_name")) {
      sqliteDb.exec("ALTER TABLE interview_schedules ADD COLUMN interviewer_name TEXT DEFAULT NULL");
    }
    if (!scheduleColNames.includes("instructions")) {
      sqliteDb.exec("ALTER TABLE interview_schedules ADD COLUMN instructions TEXT DEFAULT NULL");
    }
    if (!scheduleColNames.includes("scheduler_hr_name")) {
      sqliteDb.exec("ALTER TABLE interview_schedules ADD COLUMN scheduler_hr_name TEXT DEFAULT NULL");
    }

    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS interview_attendees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        interview_id INTEGER NOT NULL,
        name TEXT DEFAULT NULL,
        email TEXT NOT NULL,
        role TEXT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (interview_id) REFERENCES interview_schedules(id) ON DELETE CASCADE
      );
    `);

    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS interview_transcripts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        interview_id INTEGER NOT NULL,
        speaker TEXT,
        message TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (interview_id) REFERENCES interview_schedules(id) ON DELETE CASCADE
      );
    `);

    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS interview_recordings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        interview_id INTEGER NOT NULL,
        recording_url TEXT,
        duration INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (interview_id) REFERENCES interview_schedules(id) ON DELETE CASCADE
      );
    `);

    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS interview_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        interview_id INTEGER NOT NULL,
        event_type TEXT,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (interview_id) REFERENCES interview_schedules(id) ON DELETE CASCADE
      );
    `);

    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS interview_warnings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        interview_id INTEGER NOT NULL,
        warning_type TEXT,
        message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (interview_id) REFERENCES interview_schedules(id) ON DELETE CASCADE
      );
    `);

    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS interview_evaluations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        interview_id INTEGER NOT NULL,
        technical_knowledge INTEGER DEFAULT 0,
        communication INTEGER DEFAULT 0,
        confidence INTEGER DEFAULT 0,
        leadership INTEGER DEFAULT 0,
        problem_solving INTEGER DEFAULT 0,
        cultural_fit INTEGER DEFAULT 0,
        comments TEXT,
        saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (interview_id) REFERENCES interview_schedules(id) ON DELETE CASCADE
      );
    `);

    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS interview_ai_analysis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        interview_id INTEGER NOT NULL,
        communication_score REAL DEFAULT 0,
        confidence_score REAL DEFAULT 0,
        technical_understanding_score REAL DEFAULT 0,
        problem_solving_score REAL DEFAULT 0,
        leadership_score REAL DEFAULT 0,
        overall_recommendation TEXT,
        strengths TEXT,
        weaknesses TEXT,
        key_discussion_points TEXT,
        areas_of_improvement TEXT,
        hiring_recommendation TEXT,
        analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (interview_id) REFERENCES interview_schedules(id) ON DELETE CASCADE
      );
    `);

    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS interview_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        interview_id INTEGER NOT NULL,
        report_data TEXT,
        pdf_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (interview_id) REFERENCES interview_schedules(id) ON DELETE CASCADE
      );
    `);

    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS assessment_batches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        college_id INTEGER NOT NULL,
        tpo_id INTEGER DEFAULT NULL,
        department TEXT NOT NULL,
        academic_year TEXT NOT NULL,
        batch_name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS assessment_tests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tpo_id INTEGER NOT NULL,
        college_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        instructions TEXT,
        category TEXT DEFAULT 'Aptitude',
        difficulty TEXT DEFAULT 'Medium',
        language TEXT DEFAULT 'English',
        department TEXT DEFAULT NULL,
        max_marks INTEGER DEFAULT 100,
        passing_marks INTEGER DEFAULT 40,
        negative_marking INTEGER DEFAULT 0,
        randomize_questions INTEGER DEFAULT 0,
        randomize_options INTEGER DEFAULT 0,
        calculator_allowed INTEGER DEFAULT 0,
        status TEXT DEFAULT 'DRAFT',
        test_date DATE DEFAULT NULL,
        start_time TEXT DEFAULT NULL,
        end_time TEXT DEFAULT NULL,
        late_join_window INTEGER DEFAULT 10,
        duration_minutes INTEGER DEFAULT 60,
        webcam_monitoring INTEGER DEFAULT 0,
        camera_required INTEGER DEFAULT 0,
        microphone_required INTEGER DEFAULT 0,
        location_mandatory INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS assessment_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assessment_id INTEGER NOT NULL,
        batch_name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assessment_id) REFERENCES assessment_tests(id) ON DELETE CASCADE
      );
    `);

    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS assessment_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assessment_id INTEGER NOT NULL,
        question_text TEXT NOT NULL,
        question_type TEXT NOT NULL,
        options_json TEXT,
        correct_answers_json TEXT,
        marks INTEGER DEFAULT 1,
        negative_marks REAL DEFAULT 0.0,
        explanation TEXT,
        image_url TEXT,
        topic TEXT DEFAULT NULL,
        difficulty TEXT DEFAULT 'Medium',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assessment_id) REFERENCES assessment_tests(id) ON DELETE CASCADE
      );
    `);

    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS question_bank (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tpo_id INTEGER NOT NULL,
        topic TEXT DEFAULT NULL,
        question_text TEXT NOT NULL,
        question_type TEXT NOT NULL,
        difficulty TEXT DEFAULT 'Medium',
        options_json TEXT,
        correct_answers_json TEXT,
        explanation TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS assessment_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assessment_id INTEGER NOT NULL,
        student_user_id INTEGER NOT NULL,
        status TEXT DEFAULT 'STARTED',
        score REAL DEFAULT 0,
        percentage REAL DEFAULT 0,
        rank_val INTEGER DEFAULT NULL,
        is_passed INTEGER DEFAULT 0,
        started_at DATETIME NOT NULL,
        submitted_at DATETIME DEFAULT NULL,
        total_time_taken_seconds INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assessment_id) REFERENCES assessment_tests(id) ON DELETE CASCADE,
        FOREIGN KEY (student_user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS assessment_answers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        attempt_id INTEGER NOT NULL,
        question_id INTEGER NOT NULL,
        student_answer_json TEXT,
        is_correct INTEGER DEFAULT 0,
        marks_obtained REAL DEFAULT 0,
        time_spent_seconds INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (attempt_id) REFERENCES assessment_attempts(id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES assessment_questions(id) ON DELETE CASCADE
      );
    `);

    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS assessment_violations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        attempt_id INTEGER NOT NULL,
        violation_type TEXT NOT NULL,
        warning_count INTEGER DEFAULT 1,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (attempt_id) REFERENCES assessment_attempts(id) ON DELETE CASCADE
      );
    `);

    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS assessment_location (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        attempt_id INTEGER NOT NULL,
        latitude REAL DEFAULT NULL,
        longitude REAL DEFAULT NULL,
        accuracy REAL DEFAULT NULL,
        ip_address TEXT DEFAULT NULL,
        browser TEXT DEFAULT NULL,
        device TEXT DEFAULT NULL,
        location_address TEXT DEFAULT NULL,
        captured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (attempt_id) REFERENCES assessment_attempts(id) ON DELETE CASCADE
      );
    `);

    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS assessment_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assessment_id INTEGER NOT NULL,
        student_user_id INTEGER NOT NULL,
        report_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assessment_id) REFERENCES assessment_tests(id) ON DELETE CASCADE,
        FOREIGN KEY (student_user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS assessment_notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS campus_notices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tpo_id INTEGER NOT NULL,
        college_id INTEGER NOT NULL,
        batch_name TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_public INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Apply High-Coverage Performance Indices for SQLite
    sqliteDb.exec("CREATE INDEX IF NOT EXISTS idx_student_profiles_user_id ON student_profiles(user_id);");
    sqliteDb.exec("CREATE INDEX IF NOT EXISTS idx_student_profiles_onboarding ON student_profiles(onboarding_completed, onboarding_status);");
    sqliteDb.exec("CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON jobs(status, created_at);");
    sqliteDb.exec("CREATE INDEX IF NOT EXISTS idx_job_applications_student_job ON job_applications(student_id, job_id);");
    sqliteDb.exec("CREATE INDEX IF NOT EXISTS idx_performance_stats_xp ON student_performance_stats(xp_points);");

    // Ensure assessment_batches has college_id on SQLite
    const batchCols = sqliteDb.prepare("PRAGMA table_info(assessment_batches)").all();
    const batchColNames = batchCols.map((c: any) => c.name);
    if (batchColNames.length > 0 && !batchColNames.includes("college_id")) {
      sqliteDb.exec("ALTER TABLE assessment_batches ADD COLUMN college_id INTEGER NOT NULL DEFAULT 1");
    }

    // Ensure assessment_location has location_address on SQLite
    const locCols = sqliteDb.prepare("PRAGMA table_info(assessment_location)").all();
    const locColNames = locCols.map((c: any) => c.name);
    if (locColNames.length > 0 && !locColNames.includes("location_address")) {
      sqliteDb.exec("ALTER TABLE assessment_location ADD COLUMN location_address TEXT DEFAULT NULL");
    }
    // Clean up seeded demo batches to ensure "no static data"
    try {
      sqliteDb.exec("DELETE FROM assessment_batches WHERE batch_name IN ('CS-2024', 'IT-2024', 'ECE-2024')");
    } catch (e) {}
  } catch (e) { 
    console.error("SQLite migration error:", e);
  }

  console.log("✅ SQLite Database initialized");
}

export default db;
