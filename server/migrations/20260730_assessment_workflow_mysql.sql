-- Migration: 20260730_assessment_workflow_mysql.sql
-- Additive & Idempotent migration for Assessment Workflow in MySQL (talentbridge01)

USE talentbridge01;

DELIMITER $$

-- Helper Procedure to safely add a column if it doesn't exist
DROP PROCEDURE IF EXISTS AddColumnIfNotExists$$
CREATE PROCEDURE AddColumnIfNotExists(
    IN p_tableName VARCHAR(64),
    IN p_columnName VARCHAR(64),
    IN p_columnDef VARCHAR(255)
)
BEGIN
    IF NOT EXISTS (
        SELECT NULL FROM information_schema.columns 
        WHERE table_schema = DATABASE() 
          AND table_name = p_tableName 
          AND column_name = p_columnName
    ) THEN
        SET @sql = CONCAT('ALTER TABLE `', p_tableName, '` ADD COLUMN `', p_columnName, '` ', p_columnDef);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

-- Helper Procedure to safely create an index if it doesn't exist
DROP PROCEDURE IF EXISTS CreateIndexIfNotExists$$
CREATE PROCEDURE CreateIndexIfNotExists(
    IN p_tableName VARCHAR(64),
    IN p_indexName VARCHAR(64),
    IN p_columns VARCHAR(255)
)
BEGIN
    IF NOT EXISTS (
        SELECT NULL FROM information_schema.statistics 
        WHERE table_schema = DATABASE() 
          AND table_name = p_tableName 
          AND index_name = p_indexName
    ) THEN
        SET @sql = CONCAT('CREATE INDEX `', p_indexName, '` ON `', p_tableName, '` (', p_columns, ')');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

DELIMITER ;

-- 1. Create assessment_idempotency_requests table if not existing
CREATE TABLE IF NOT EXISTS assessment_idempotency_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    operation VARCHAR(100) NOT NULL,
    idempotency_key VARCHAR(255) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    assessment_id INT DEFAULT NULL,
    response_json TEXT DEFAULT NULL,
    locked_at TIMESTAMP NULL DEFAULT NULL,
    completed_at TIMESTAMP NULL DEFAULT NULL,
    failed_at TIMESTAMP NULL DEFAULT NULL,
    failure_code VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL DEFAULT NULL,
    UNIQUE KEY idx_comp_op_key (company_id, operation, idempotency_key)
);
CALL AddColumnIfNotExists('assessment_idempotency_requests', 'locked_at', 'TIMESTAMP NULL DEFAULT NULL');
CALL AddColumnIfNotExists('assessment_idempotency_requests', 'completed_at', 'TIMESTAMP NULL DEFAULT NULL');
CALL AddColumnIfNotExists('assessment_idempotency_requests', 'failed_at', 'TIMESTAMP NULL DEFAULT NULL');
CALL AddColumnIfNotExists('assessment_idempotency_requests', 'failure_code', 'VARCHAR(100) DEFAULT NULL');

-- 1b. Create company_assessment_definitions table
CREATE TABLE IF NOT EXISTS company_assessment_definitions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    questions_json LONGTEXT NOT NULL,
    duration_minutes INT DEFAULT 30,
    cutoff_score DOUBLE DEFAULT 40,
    total_marks DOUBLE DEFAULT 100,
    status VARCHAR(50) DEFAULT 'DRAFT',
    version INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1c. Create company_assessment_assignments table
CREATE TABLE IF NOT EXISTS company_assessment_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    definition_version_id INT NOT NULL,
    job_id INT NOT NULL,
    stage_id INT DEFAULT NULL,
    cutoff_score DOUBLE DEFAULT 40,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_comp_job (company_id, job_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1. Ensure tests table exists and has assessment metadata columns
CREATE TABLE IF NOT EXISTS tests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    company_id INT DEFAULT NULL,
    job_id INT DEFAULT NULL,
    stage_id INT DEFAULT NULL,
    cutoff_score DOUBLE DEFAULT 40,
    duration INT DEFAULT 30,
    status VARCHAR(50) DEFAULT 'PUBLISHED',
    version INT DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CALL AddColumnIfNotExists('tests', 'assessment_id', 'INT DEFAULT NULL');
CALL AddColumnIfNotExists('tests', 'company_id', 'INT DEFAULT NULL');
CALL AddColumnIfNotExists('tests', 'stage_id', 'INT DEFAULT NULL');
CALL AddColumnIfNotExists('tests', 'cutoff_score', 'DOUBLE DEFAULT 40');
CALL AddColumnIfNotExists('tests', 'duration', 'INT DEFAULT 30');
CALL AddColumnIfNotExists('tests', 'status', 'VARCHAR(50) DEFAULT \'PUBLISHED\'');
CALL AddColumnIfNotExists('tests', 'version', 'INT DEFAULT 1');

-- 2. Ensure test_submissions table exists and has job_id, assignment_id, score and proctoring tracking columns
CREATE TABLE IF NOT EXISTS test_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    test_id INT DEFAULT NULL,
    assignment_id INT DEFAULT NULL,
    assessment_version_id INT DEFAULT NULL,
    job_id INT DEFAULT NULL,
    application_id INT DEFAULT NULL,
    score DOUBLE DEFAULT 0,
    percentage DOUBLE DEFAULT 0,
    passed TINYINT(1) DEFAULT 0,
    cutoff_score DOUBLE DEFAULT 0,
    total_marks DOUBLE DEFAULT 100,
    duration INT DEFAULT 30,
    questions_json LONGTEXT DEFAULT NULL,
    violations_count INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'SUBMITTED',
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CALL AddColumnIfNotExists('test_submissions', 'assignment_id', 'INT DEFAULT NULL');
CALL AddColumnIfNotExists('test_submissions', 'assessment_version_id', 'INT DEFAULT NULL');
CALL AddColumnIfNotExists('test_submissions', 'job_id', 'INT DEFAULT NULL');
CALL AddColumnIfNotExists('test_submissions', 'application_id', 'INT DEFAULT NULL');
CALL AddColumnIfNotExists('test_submissions', 'attempt_number', 'INT DEFAULT 1');
CALL AddColumnIfNotExists('test_submissions', 'assessment_version', 'INT DEFAULT 1');
CALL AddColumnIfNotExists('test_submissions', 'questions_json', 'LONGTEXT DEFAULT NULL');
CALL AddColumnIfNotExists('test_submissions', 'percentage', 'DOUBLE DEFAULT 0');
CALL AddColumnIfNotExists('test_submissions', 'passed', 'TINYINT(1) DEFAULT 0');
CALL AddColumnIfNotExists('test_submissions', 'cutoff_score', 'DOUBLE DEFAULT 0');
CALL AddColumnIfNotExists('test_submissions', 'total_marks', 'DOUBLE DEFAULT 100');
CALL AddColumnIfNotExists('test_submissions', 'violations_count', 'INT DEFAULT 0');
CALL AddColumnIfNotExists('test_submissions', 'status', 'VARCHAR(50) DEFAULT \'SUBMITTED\'');
CALL AddColumnIfNotExists('test_submissions', 'duration', 'INT DEFAULT 30');

CREATE TABLE IF NOT EXISTS test_submission_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    attempt_id INT DEFAULT NULL,
    application_id INT NOT NULL,
    student_id INT DEFAULT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data LONGTEXT DEFAULT NULL,
    idempotency_key VARCHAR(255) DEFAULT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CALL AddColumnIfNotExists('test_submission_events', 'attempt_id', 'INT DEFAULT NULL');
CALL AddColumnIfNotExists('test_submission_events', 'event_data', 'LONGTEXT DEFAULT NULL');

-- Unambiguous legacy attempt_id backfill for test_submission_events where exactly one attempt exists
UPDATE test_submission_events tse
JOIN (
    SELECT application_id, MIN(id) as attempt_id, COUNT(*) as cnt
    FROM test_submissions
    GROUP BY application_id
    HAVING cnt = 1
) unambiguous ON tse.application_id = unambiguous.application_id
SET tse.attempt_id = unambiguous.attempt_id
WHERE tse.attempt_id IS NULL;

-- Backfill job_id and assignment_id safely from job_applications & tests to resolve nulls and correct non-null mismatches from authoritative application row
UPDATE test_submissions ts 
JOIN job_applications ja ON ts.application_id = ja.id 
SET ts.job_id = ja.job_id 
WHERE ts.job_id IS NULL OR ts.job_id != ja.job_id;

UPDATE test_submissions ts 
JOIN tests t ON ts.job_id = t.job_id 
SET ts.assignment_id = t.id 
WHERE ts.assignment_id IS NULL;

-- 3. Ensure assessment_tests table supports company ownership and job linkage
CALL AddColumnIfNotExists('assessment_tests', 'company_id', 'INT DEFAULT NULL');
CALL AddColumnIfNotExists('assessment_tests', 'job_id', 'INT DEFAULT NULL');
CALL AddColumnIfNotExists('assessment_tests', 'stage_id', 'INT DEFAULT NULL');
CALL AddColumnIfNotExists('assessment_tests', 'cutoff_score', 'DOUBLE DEFAULT 40');
CALL AddColumnIfNotExists('assessment_tests', 'version', 'INT DEFAULT 1');

-- 4. Ensure assessment_attempts table tracks job application and proctoring
CALL AddColumnIfNotExists('assessment_attempts', 'job_id', 'INT DEFAULT NULL');
CALL AddColumnIfNotExists('assessment_attempts', 'application_id', 'INT DEFAULT NULL');
CALL AddColumnIfNotExists('assessment_attempts', 'cutoff_score', 'DOUBLE DEFAULT 40');
CALL AddColumnIfNotExists('assessment_attempts', 'violations_count', 'INT DEFAULT 0');

-- 5. Create indexes safely for fast history and pipeline score queries
CALL CreateIndexIfNotExists('test_submissions', 'idx_test_sub_job_app', 'job_id, student_id');
CALL CreateIndexIfNotExists('test_submissions', 'idx_test_sub_app', 'application_id');
CALL CreateIndexIfNotExists('tests', 'idx_tests_company', 'company_id');
CALL CreateIndexIfNotExists('tests', 'idx_tests_job', 'job_id');

-- Clean up helper stored procedures
DROP PROCEDURE IF EXISTS AddColumnIfNotExists;
DROP PROCEDURE IF EXISTS CreateIndexIfNotExists;
