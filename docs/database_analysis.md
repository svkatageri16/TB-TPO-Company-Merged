# VEGA Database Schema Analysis

## Executive Summary

VEGA uses a comprehensive relational database with 50+ tables supporting:
- **Multi-role user management** (Student, Company, Admin)
- **Complex job application pipeline** with multi-stage hiring
- **Gamification system** (XP, referrals, badges, leaderboard)
- **AI-powered features** (interview history, resume analysis)
- **Psychometric assessments** with anti-cheat tracking
- **Analytics & talent scoring** (100-point composite metric)
- **Community engagement** (posts, profiles, activity)
- **Admin moderation** (logs, verification workflows)

**Database Options:** MySQL (primary) or SQLite (fallback)

---

## 1. User & Authentication Schema

### users (Core)
Primary key for all system users

```sql
id INT PRIMARY KEY AUTO_INCREMENT
email VARCHAR(255) UNIQUE NOT NULL
password_hash VARCHAR(255) NOT NULL
role ENUM('STUDENT', 'COMPANY', 'ADMIN', 'SUPER_ADMIN') NOT NULL
status VARCHAR(50) DEFAULT 'ACTIVE'                    -- ACTIVE, SUSPENDED, DELETED
is_verified TINYINT DEFAULT 0

-- Security
failed_login_attempts INT DEFAULT 0                   -- Brute force tracking
locked_until DATETIME DEFAULT NULL                    -- Account lockout time

-- Gamification
xp_balance INT DEFAULT 0                              -- Current XP
free_mock_count INT DEFAULT 3                         -- Free mock interview attempts
referral_code VARCHAR(10) UNIQUE                      -- Unique referral code
last_reward_claimed_at DATETIME DEFAULT NULL          -- Daily reward tracking
login_streak INT DEFAULT 0                            -- Consecutive login days
total_earned_xp INT DEFAULT 0                         -- Lifetime earned XP
total_spent_xp INT DEFAULT 0                          -- Lifetime spent XP

created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

**Indices:** email, role, status, is_verified

### refresh_tokens (Authentication)
Stores JWT refresh tokens for token rotation

```sql
id INT PRIMARY KEY AUTO_INCREMENT
user_id INT NOT NULL FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE
token VARCHAR(500) NOT NULL                           -- Actual refresh token
expires_at DATETIME NOT NULL                          -- Token expiry
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

**Purpose:** Enables secure token refresh without storing secrets

### otps (Email Verification)
One-time passwords for email verification

```sql
id INT PRIMARY KEY AUTO_INCREMENT
email VARCHAR(255) NOT NULL
code VARCHAR(10) NOT NULL                             -- 6-digit OTP
expires_at DATETIME NOT NULL
```

**Lifecycle:** Created on registration, deleted after verification

### security_logs (Audit Trail)
Comprehensive security event logging

```sql
id INT PRIMARY KEY AUTO_INCREMENT
user_id INT DEFAULT NULL FOREIGN KEY
action VARCHAR(255) NOT NULL                          -- LOGIN, FAILED_LOGIN, PASSWORD_RESET, etc.
ip_address VARCHAR(45)                                -- IPv4/IPv6
user_agent TEXT                                       -- Browser/device info
details TEXT                                          -- Additional context
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

**Actions Logged:**
- LOGIN, FAILED_LOGIN (5 attempts = 15 min lockout)
- PASSWORD_RESET, PASSWORD_CHANGED
- EMAIL_VERIFIED, PROFILE_UPDATED
- FILE_UPLOADED, PAYMENT_PROCESSED

---

## 2. Student Profile Schema

### student_profiles (Core Student Data)
Comprehensive student information

```sql
id INT PRIMARY KEY AUTO_INCREMENT
user_id INT UNIQUE NOT NULL FOREIGN KEY              -- Links to users.id
full_name VARCHAR(255)
bio TEXT
dob DATE
gender VARCHAR(20)
address TEXT
profile_photo_url LONGTEXT                           -- Supports base64 encoding
aadhar_or_college_id VARCHAR(100)

-- Contact Information
contact VARCHAR(20)

-- Experience Level
experience_type VARCHAR(20) DEFAULT 'FRESHER'        -- FRESHER, EXPERIENCED

-- JSON Fields (normalized collections)
education_json JSON                                   -- Array of education records
experience_json JSON                                  -- Array of work experience
projects_json JSON                                    -- Array of projects
skills_json JSON                                      -- Array of skills
languages_json JSON                                   -- Array of languages known
social_links_json JSON                                -- LinkedIn, GitHub, etc.

-- Resume & Builder
resume_url VARCHAR(255)                               -- URL to uploaded resume PDF
resume_builder_json JSON                              -- AI-generated resume data

-- Verification & Onboarding
completeness_score INT DEFAULT 0                      -- 0-100 profile completion %
email_verified TINYINT DEFAULT 0
phone_verified TINYINT DEFAULT 0
onboarding_completed TINYINT DEFAULT 0

-- Onboarding Details
onboarding_industry VARCHAR(100)                      -- Industry preference from wizard
onboarding_status VARCHAR(100)                        -- Status during onboarding
onboarding_source VARCHAR(100)                        -- Where student came from
onboarding_help_actions JSON                          -- Help actions taken during onboarding
```

**JSON Structure Examples:**
```json
skills_json: [
  { "name": "Python", "endorsements": 15, "years": 2 },
  { "name": "React", "endorsements": 8, "years": 1 }
]

education_json: [
  {
    "institution": "IIT Bombay",
    "degree": "B.Tech",
    "field": "CSE",
    "startDate": "2019-07-01",
    "endDate": "2023-06-30",
    "grade": "8.5"
  }
]
```

### student_education (Section-wise Education)
Normalized education history for easier querying

```sql
id INT PRIMARY KEY AUTO_INCREMENT
student_id INT NOT NULL FOREIGN KEY REFERENCES student_profiles(id) ON DELETE CASCADE
institution VARCHAR(255) NOT NULL
degree VARCHAR(255) NOT NULL                          -- B.Tech, M.Tech, etc.
field_of_study VARCHAR(255)
start_date DATE
end_date DATE
grade VARCHAR(50)
description TEXT
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

### student_experience (Work Experience)
Professional work history

```sql
id INT PRIMARY KEY AUTO_INCREMENT
student_id INT NOT NULL FOREIGN KEY
company VARCHAR(255) NOT NULL
role VARCHAR(255) NOT NULL
location VARCHAR(255)
start_date DATE
end_date DATE
is_current TINYINT DEFAULT 0                          -- Currently employed
description TEXT
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

### student_projects (Portfolio)
Coding projects and portfolio items

```sql
id INT PRIMARY KEY AUTO_INCREMENT
student_id INT NOT NULL FOREIGN KEY
title VARCHAR(255) NOT NULL
description TEXT
tech_stack TEXT                                       -- Comma-separated technologies
link TEXT                                             -- Project website/demo
github_link TEXT                                      -- GitHub repository
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

### student_certifications (Credentials)
Professional certifications and credentials

```sql
id INT PRIMARY KEY AUTO_INCREMENT
student_id INT NOT NULL FOREIGN KEY
name VARCHAR(255) NOT NULL                            -- e.g., "AWS Solutions Architect"
issuing_organization VARCHAR(255) NOT NULL
issue_date DATE
expiry_date DATE                                      -- NULL if no expiry
credential_id VARCHAR(255)                            -- e.g., AWS certification ID
credential_url TEXT                                   -- Verification URL
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

---

## 3. Company Profile Schema

### company_profiles (Core Company Data)
Comprehensive company information with verification

```sql
id INT PRIMARY KEY AUTO_INCREMENT
user_id INT UNIQUE NOT NULL FOREIGN KEY

-- Basic Information
company_name VARCHAR(255) NOT NULL
logo_url LONGTEXT                                     -- Base64 encoded logo
website VARCHAR(255)
company_email VARCHAR(255)
contact_number VARCHAR(20)

-- Company Details
company_type VARCHAR(100)                             -- Startup, MNC, Scale-up, etc.
industry VARCHAR(100)                                 -- Tech, Finance, etc.
company_size VARCHAR(100)                             -- 10-50, 51-200, etc.
year_established INT

-- Legal & Registration
business_name VARCHAR(255)
gst_no VARCHAR(50) UNIQUE                             -- India GST number
cin_no VARCHAR(50) UNIQUE                             -- Corporate Identification Number
pan_no VARCHAR(50) UNIQUE                             -- PAN number

-- Address Information
address TEXT                                          -- Registered address
operating_address TEXT                                -- Operational address
country VARCHAR(100)
state VARCHAR(100)
city VARCHAR(100)

-- Company Description
about TEXT                                            -- Company description
services TEXT                                         -- Services offered
linkedin_url VARCHAR(255)
github_url VARCHAR(255)

-- Verification Status
status ENUM('PENDING', 'APPROVED', 'REJECTED')
rejection_reason TEXT                                 -- Why was verification rejected
completeness_score INT DEFAULT 0                      -- 0-100
verified_at DATETIME

created_at DATETIME DEFAULT CURRENT_TIMESTAMP
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

### company_documents (Verification Documents)
Supporting documents for company verification

```sql
id INT PRIMARY KEY AUTO_INCREMENT
company_id INT NOT NULL FOREIGN KEY REFERENCES company_profiles(id) ON DELETE CASCADE
doc_type VARCHAR(100) NOT NULL                        -- GST_CERT, INCORPORATION, PAN_CERT, etc.
doc_url LONGTEXT NOT NULL                             -- Document URL/file path
status VARCHAR(50) DEFAULT 'PENDING'                  -- PENDING, VERIFIED, REJECTED
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

### admin_reviews (Company Verification)
Admin review history for company verification

```sql
id INT PRIMARY KEY AUTO_INCREMENT
company_id INT NOT NULL FOREIGN KEY
admin_id INT NOT NULL FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE
action ENUM('APPROVED', 'REJECTED') NOT NULL
reason TEXT                                           -- Approval or rejection reason
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

---

## 4. Job Management Schema

### jobs (Job Postings)
Complete job listing information

```sql
id INT PRIMARY KEY AUTO_INCREMENT
company_id INT NOT NULL FOREIGN KEY REFERENCES company_profiles(id) ON DELETE CASCADE

-- Job Details
title VARCHAR(255) NOT NULL                           -- e.g., "Senior React Developer"
description TEXT NOT NULL                             -- Full job description
skills_json JSON NOT NULL                             -- Required skills array
location VARCHAR(255)                                 -- Job location
job_type VARCHAR(100)                                 -- Internship, Full-time, Remote, Contract
experience_level VARCHAR(100)                         -- Fresher, 1-3 Years, 3+ Years, etc.
education_requirement TEXT                            -- Required education

-- Job Details
responsibilities TEXT
qualifications TEXT
additional_notes TEXT

-- Timeline
application_start_date DATE
deadline DATE

-- Status
status VARCHAR(50) DEFAULT 'OPEN'                     -- OPEN, CLOSED, ON_HOLD

created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

**Indices:** company_id, status, created_at

### job_stages (Hiring Pipeline)
Multi-stage hiring pipeline for each job

```sql
id INT PRIMARY KEY AUTO_INCREMENT
job_id INT NOT NULL FOREIGN KEY REFERENCES jobs(id) ON DELETE CASCADE
stage_name VARCHAR(255) NOT NULL                      -- e.g., "Technical Test"
stage_type ENUM(
  'APPLICATION',                                     -- Auto-move
  'TEST',                                            -- Assessment
  'INTERVIEW_ONLINE',                                -- Virtual interview
  'INTERVIEW_OFFLINE',                               -- In-person
  'CUSTOM'                                           -- Custom stage
) DEFAULT 'APPLICATION'

stage_order INT NOT NULL                              -- Order of execution (1, 2, 3...)
description TEXT                                      -- Stage instructions
config_json JSON                                      -- Stage-specific config
                                                      -- For TEST: { duration: 60, cutoff: 70 }
                                                      -- For INTERVIEW: { type: "technical", duration: 60 }
```

### test_questions (Assessment Questions)
Questions for test stages

```sql
id INT PRIMARY KEY AUTO_INCREMENT
stage_id INT NOT NULL FOREIGN KEY REFERENCES job_stages(id) ON DELETE CASCADE
question_text TEXT NOT NULL
options_json JSON NOT NULL                            -- Array of option objects
correct_answer VARCHAR(255)                           -- Correct option identifier

JSON Structure:
options_json: [
  { "id": "A", "text": "Option A" },
  { "id": "B", "text": "Option B" },
  ...
]
```

### job_applications (Application Records)
Student applications to jobs

```sql
id INT PRIMARY KEY AUTO_INCREMENT
job_id INT NOT NULL FOREIGN KEY REFERENCES jobs(id) ON DELETE CASCADE
student_id INT NOT NULL FOREIGN KEY REFERENCES student_profiles(id) ON DELETE CASCADE
current_stage_id INT FOREIGN KEY REFERENCES job_stages(id) ON DELETE SET NULL
status ENUM(
  'APPLIED',                                         -- Initial application
  'IN_PROGRESS',                                     -- Under evaluation
  'SELECTED',                                        -- Passed all stages
  'REJECTED'                                         -- Did not qualify
) DEFAULT 'APPLIED'

applied_at DATETIME DEFAULT CURRENT_TIMESTAMP

UNIQUE(student_id, job_id)                           -- One application per student per job
```

**Indices:** job_id, student_id, current_stage_id, status

### test_schedules (Test Scheduling)
Scheduled tests for job applications

```sql
id INT PRIMARY KEY AUTO_INCREMENT
job_id INT NOT NULL FOREIGN KEY
stage_id INT NOT NULL FOREIGN KEY
scheduled_at DATETIME NOT NULL                        -- When test should be taken
duration_minutes INT NOT NULL                         -- Test duration
cutoff_score INT DEFAULT 60                           -- Passing score
status VARCHAR(50) DEFAULT 'PENDING'                  -- PENDING, COMPLETED, EXPIRED
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

### test_submissions (Test Results)
Student test responses and scores

```sql
id INT PRIMARY KEY AUTO_INCREMENT
application_id INT NOT NULL FOREIGN KEY REFERENCES job_applications(id) ON DELETE CASCADE
student_id INT NOT NULL FOREIGN KEY REFERENCES student_profiles(id) ON DELETE CASCADE
stage_id INT NOT NULL FOREIGN KEY REFERENCES job_stages(id) ON DELETE CASCADE

-- Answers & Scoring
answers_json JSON                                      -- Student's answers
score DECIMAL(5,2)                                    -- Calculated score (0-100)

-- Anti-cheat Tracking
tab_switches INT DEFAULT 0                            -- Number of tab switches
violation_count INT DEFAULT 0                         -- Total violations
is_auto_submitted TINYINT DEFAULT 0                   -- Auto-submitted after timeout

status VARCHAR(50) DEFAULT 'COMPLETED'                -- COMPLETED, SUBMITTED, SUBMITTED_AUTO
submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

### interview_schedules (Interview Scheduling)
Scheduled interviews for candidates

```sql
id INT PRIMARY KEY AUTO_INCREMENT
application_id INT NOT NULL FOREIGN KEY
stage_id INT NOT NULL FOREIGN KEY
interview_type VARCHAR(50)                            -- PHONE, VIDEO, IN_PERSON
location_or_link TEXT                                 -- Video link or office address
scheduled_at DATETIME
notes TEXT
```

### application_history (Audit Trail)
History of application stage changes

```sql
id INT PRIMARY KEY AUTO_INCREMENT
application_id INT NOT NULL FOREIGN KEY
stage_id INT FOREIGN KEY REFERENCES job_stages(id) ON DELETE SET NULL
action VARCHAR(100)                                   -- MOVED_TO_STAGE, REJECTED, SELECTED, etc.
notes TEXT                                            -- Reason or feedback
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

---

## 5. AI & Interview Schema

### interview_history (Mock Interview Records)
Complete mock interview data and evaluation

```sql
id INT PRIMARY KEY AUTO_INCREMENT
student_id INT NOT NULL FOREIGN KEY REFERENCES student_profiles(id) ON DELETE CASCADE

-- Interview Transcript & Analysis
transcript_json JSON                                  -- Full interview transcript
score INT                                             -- Overall score (0-100)

-- Detailed Metrics
communication_score INT                               -- Communication skills (0-100)
confidence_score INT                                  -- Confidence level (0-100)
explanation_score INT                                 -- Explanation clarity (0-100)
presentation_score INT                                -- Presentation skills (0-100)
knowledge_score INT                                   -- Technical knowledge (0-100)

-- Feedback
feedback TEXT                                         -- AI-generated feedback
strengths_json JSON                                   -- Array of strengths
weaknesses_json JSON                                  -- Array of improvement areas
tips_json JSON                                        -- Array of tips

-- Questions & Answers
questions_answers_json JSON                           -- Q&A pairs with scoring

created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

**Indices:** student_id, created_at

### ai_conversations (Chatbot History)
AI career mentor conversation history

```sql
id INT PRIMARY KEY AUTO_INCREMENT
user_id INT NOT NULL FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE
role ENUM('USER', 'AI') NOT NULL
message TEXT NOT NULL
timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
```

### ai_memory (AI Context)
Persistent user context for AI recommendations

```sql
id INT PRIMARY KEY AUTO_INCREMENT
user_id INT UNIQUE NOT NULL FOREIGN KEY
preferences TEXT                                      -- User preferences JSON
weak_skills TEXT                                      -- Identified weak skills
goals TEXT                                            -- Career goals JSON
```

---

## 6. Assessment & Psychometric Schema

### psychometric_questions (Question Bank)
Psychometric assessment question pool

```sql
id INT PRIMARY KEY AUTO_INCREMENT
category ENUM(
  'PERSONALITY',                                     -- Big Five traits
  'COGNITIVE',                                       -- IQ-style questions
  'BEHAVIOR',                                        -- Behavioral scenarios
  'SITUATIONAL'                                      -- Situational judgment
) NOT NULL

trait VARCHAR(100)                                    -- Leadership, Teamwork, etc.
question_text TEXT NOT NULL
options_json JSON NOT NULL                            -- Options with score mappings

JSON Structure:
[
  {
    "text": "Option A",
    "score_mapping": {
      "Leadership": 5,
      "Teamwork": 2
    }
  }
]

created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

### psychometric_attempts (Test Attempts)
Student psychometric test attempts

```sql
id INT PRIMARY KEY AUTO_INCREMENT
user_id INT NOT NULL FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE
status ENUM('STARTED', 'COMPLETED', 'FAILED')
started_at DATETIME DEFAULT CURRENT_TIMESTAMP
completed_at DATETIME
violation_count INT DEFAULT 0
tab_switches INT DEFAULT 0
```

### psychometric_results (Test Results)
Psychometric test results and analysis

```sql
id INT PRIMARY KEY AUTO_INCREMENT
user_id INT UNIQUE NOT NULL FOREIGN KEY
attempt_id INT NOT NULL FOREIGN KEY REFERENCES psychometric_attempts(id) ON DELETE CASCADE
overall_score DECIMAL(5,2)                            -- 0-100
traits_json JSON                                      -- { Leadership: 85, Teamwork: 70, ... }
personality_type VARCHAR(100)                         -- e.g., "INTJ"
behavioral_summary TEXT                               -- AI-generated summary
recommendation_tags JSON                              -- ["Leadership", "Communication"]
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

### psychometric_violations (Proctoring)
Anti-cheat violations during tests

```sql
id INT PRIMARY KEY AUTO_INCREMENT
attempt_id INT NOT NULL FOREIGN KEY
violation_type VARCHAR(100)                           -- TAB_SWITCH, EXIT_FULLSCREEN, FACE_NOT_DETECTED
details TEXT
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

### pq_questions (Personality Quotient)
PQ assessment question bank

```sql
id INT PRIMARY KEY AUTO_INCREMENT
question TEXT NOT NULL
options_json JSON NOT NULL
category VARCHAR(100)                                 -- Personality trait category
weight INT DEFAULT 1
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

### iq_questions (Intelligence Quotient)
IQ assessment question bank

```sql
id INT PRIMARY KEY AUTO_INCREMENT
question TEXT NOT NULL
options_json JSON NOT NULL
difficulty VARCHAR(50)                                -- EASY, MEDIUM, HARD
category VARCHAR(100)                                 -- Logic, Verbal, Numerical, etc.
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

---

## 7. Gamification & Analytics Schema

### xp_transactions (XP Ledger)
Complete XP transaction history

```sql
id INT PRIMARY KEY AUTO_INCREMENT
user_id INT NOT NULL FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE
type VARCHAR(50) NOT NULL                             -- LOGIN, INTERVIEW, QUIZ, CODING, REFERRAL, CLAIM_DAILY, COMMUNITY
amount INT NOT NULL                                   -- Positive or negative
description TEXT                                      -- Human-readable description
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

**Transaction Types & Amounts:**
- LOGIN: 50 XP (+ 10 per streak day)
- INTERVIEW: 50 XP
- QUIZ: 40 XP
- CODING: 30-100 XP
- REFERRAL: 60 XP (referrer)
- CLAIM_DAILY: 50-100 XP
- COMMUNITY: 1-15 XP
- MOCK_INTERVIEW_PAID: -125 XP

### referrals (Referral System)
Referral tracking and bonuses

```sql
id INT PRIMARY KEY AUTO_INCREMENT
referrer_id INT NOT NULL FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE
referred_user_id INT NOT NULL FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE
reward_given TINYINT DEFAULT 0                        -- Whether reward was distributed
created_at DATETIME DEFAULT CURRENT_TIMESTAMP

Bonuses:
- Referrer: 60 XP when referred user registers
- Referred User: 200 XP on first login
```

### payments (Payment Records)
Razorpay payment records for VEGA Rewards Purchases

```sql
id INT PRIMARY KEY AUTO_INCREMENT
user_id INT NOT NULL FOREIGN KEY
razorpay_order_id VARCHAR(255) NOT NULL
razorpay_payment_id VARCHAR(255)
amount DECIMAL(10,2) NOT NULL                         -- Amount in INR
xp_added INT NOT NULL                                 -- XP credited
status VARCHAR(50) DEFAULT 'PENDING'                  -- PENDING, COMPLETED, FAILED
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

### xp_packages (VEGA Rewards Center)
Available XP packages for purchase

```sql
id INT PRIMARY KEY AUTO_INCREMENT
name VARCHAR(100) NOT NULL                            -- e.g., "Starter Package"
xp_amount INT NOT NULL                                -- XP included
price_inr INT NOT NULL                                -- Price in INR
is_popular TINYINT DEFAULT 0                          -- Featured package
is_best_value TINYINT DEFAULT 0                       -- Best value badge
mock_interviews_included INT                          -- Bonus mock interviews
resume_reviews_included INT                           -- Bonus resume reviews
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

### talent_scores (Composite Talent Metric)
Calculated talent score (100-point system)

```sql
id INT PRIMARY KEY AUTO_INCREMENT
user_id INT UNIQUE NOT NULL FOREIGN KEY
overall_score INT DEFAULT 0                           -- 0-100

-- Breakdown of score factors
breakdown_json JSON                                   -- Weighted breakdown
                                                      -- {
                                                      --   "profile": 20,
                                                      --   "interviews": 30,
                                                      --   "quizzes": 20,
                                                      --   "coding": 15,
                                                      --   "community": 10,
                                                      --   "extracurricular": 5
                                                      -- }

updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

**Calculation Formula:**
```
Talent Score = (Profile×0.2) + (Interview×0.3) + (Quiz×0.2) + (Coding×0.15) + (Community×0.1) + (Extra×0.05)
```

### student_performance_stats (Analytics)
Student performance aggregates

```sql
id INT PRIMARY KEY AUTO_INCREMENT
user_id INT UNIQUE NOT NULL FOREIGN KEY
resume_score INT DEFAULT 0
avg_interview_score FLOAT DEFAULT 0
skill_count INT DEFAULT 0
xp_points INT DEFAULT 0
current_streak INT DEFAULT 0
last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

### extracurricular_activities (Achievements)
Student extracurricular activities and achievements

```sql
id INT PRIMARY KEY AUTO_INCREMENT
user_id INT NOT NULL FOREIGN KEY
category VARCHAR(100)                                 -- Sports, Volunteering, Leadership, etc.
title VARCHAR(255) NOT NULL
description TEXT
organization_name VARCHAR(255)
participation_level VARCHAR(100)                      -- Participant, Organizer, Leader
achievement_rank VARCHAR(255)                         -- 1st, 2nd, 3rd, etc.
activity_date DATE
certificate_url TEXT
ai_analysis_json JSON                                 -- AI analysis of achievement
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

### leadership_analysis (Leadership Metrics)
Computed leadership metrics

```sql
id INT PRIMARY KEY AUTO_INCREMENT
user_id INT UNIQUE NOT NULL FOREIGN KEY
leadership_score INT DEFAULT 0                        -- 0-100
ai_feedback TEXT                                      -- AI-generated feedback
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

### activity_tracking (Activity Metrics)
User activity and consistency tracking

```sql
id INT PRIMARY KEY AUTO_INCREMENT
user_id INT UNIQUE NOT NULL FOREIGN KEY
streak_days INT DEFAULT 0                             -- Current login streak
last_active DATETIME DEFAULT CURRENT_TIMESTAMP
consistency_score INT DEFAULT 0                       -- 0-100 consistency metric
```

### daily_tasks (Task Tracking)
Daily task completion tracking

```sql
id INT PRIMARY KEY AUTO_INCREMENT
user_id INT NOT NULL FOREIGN KEY
task_date DATE NOT NULL
is_check_in_completed TINYINT DEFAULT 0
is_interview_completed TINYINT DEFAULT 0
is_profile_updated TINYINT DEFAULT 0
xp_earned INT DEFAULT 0
UNIQUE(user_id, task_date)
```

---

## 8. Community & Social Schema

### user_badges (Achievement Badges)
Earned badges and achievements

```sql
id INT PRIMARY KEY AUTO_INCREMENT
user_id INT NOT NULL FOREIGN KEY
badge_name VARCHAR(100) NOT NULL                      -- e.g., "Perfect Score", "Community Star"
badge_type ENUM('BEGINNER', 'INTERMEDIATE', 'PRO')
earned_at DATETIME DEFAULT CURRENT_TIMESTAMP
UNIQUE(user_id, badge_name)
```

**Badge Types:**
- BEGINNER: Basic achievements (first quiz, first interview)
- INTERMEDIATE: Skill milestones (100+ XP, 5 interviews)
- PRO: Expert level (500+ XP, 10 perfect scores)

### profile_views (Analytics)
Profile view tracking for recruiting analytics

```sql
id INT PRIMARY KEY AUTO_INCREMENT
student_id INT NOT NULL FOREIGN KEY REFERENCES student_profiles(id) ON DELETE CASCADE
company_id INT NOT NULL FOREIGN KEY REFERENCES company_profiles(id) ON DELETE CASCADE
viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

---

## 9. Accessibility & Admin Schema

### accessibility_preferences (Accessibility Settings)
User accessibility configuration

```sql
id INT PRIMARY KEY AUTO_INCREMENT
user_id INT UNIQUE NOT NULL FOREIGN KEY
accessibility_mode TINYINT DEFAULT 0                  -- Enable/disable
voice_enabled TINYINT DEFAULT 0                       -- Text-to-speech
contrast_mode VARCHAR(50) DEFAULT 'NORMAL'            -- NORMAL, HIGH, DARK
font_size VARCHAR(20) DEFAULT 'MEDIUM'                -- SMALL, MEDIUM, LARGE, XLARGE
last_used_voice VARCHAR(100)                          -- Preferred voice
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

### voice_command_logs (Voice Command Analytics)
Voice command usage analytics

```sql
id INT PRIMARY KEY AUTO_INCREMENT
user_id INT NOT NULL FOREIGN KEY
command TEXT NOT NULL
intent VARCHAR(100)                                   -- Parsed intent
confidence FLOAT                                      -- Voice recognition confidence (0-1)
success TINYINT DEFAULT 1                             -- Was command executed successfully
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

### admin_logs (Admin Activity)
Comprehensive admin action logging

```sql
id INT PRIMARY KEY AUTO_INCREMENT
admin_id INT NOT NULL FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE
action VARCHAR(255) NOT NULL                          -- VERIFIED_COMPANY, SUSPENDED_USER, etc.
details TEXT
ip_address VARCHAR(45)
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

### notifications (In-app Notifications)
User notifications

```sql
id INT PRIMARY KEY AUTO_INCREMENT
user_id INT NOT NULL FOREIGN KEY
title VARCHAR(255) NOT NULL
message TEXT NOT NULL
type VARCHAR(50) DEFAULT 'INFO'                       -- INFO, SUCCESS, WARNING, ERROR
is_read TINYINT DEFAULT 0
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

### system_configs (Configuration)
Platform-wide configuration

```sql
config_key VARCHAR(100) PRIMARY KEY
config_value VARCHAR(255) NOT NULL
description VARCHAR(255)

Examples:
- "MAX_MOCK_INTERVIEWS": "3"
- "MOCK_INTERVIEW_XP_COST": "125"
- "DAILY_REWARD_XP": "50"
- "REFERRAL_BONUS": "60"
```

---

## 10. Related Tables

### tests (Test Templates)
Legacy table for job-specific tests

```sql
id INT PRIMARY KEY AUTO_INCREMENT
job_id INT UNIQUE NOT NULL FOREIGN KEY
questions_json JSON NOT NULL
```

### applications (Legacy)
Legacy application tracking (mostly replaced by job_applications)

```sql
id INT PRIMARY KEY AUTO_INCREMENT
student_id INT NOT NULL FOREIGN KEY
job_id INT NOT NULL FOREIGN KEY
status ENUM('APPLIED', 'TEST_TAKEN', 'SHORTLISTED', 'REJECTED')
test_score INT
applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
UNIQUE(student_id, job_id)
```

### resume_history (Resume Versions)
Resume generation history

```sql
id INT PRIMARY KEY AUTO_INCREMENT
user_id INT NOT NULL FOREIGN KEY
template_id VARCHAR(50) NOT NULL
summary TEXT
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

---

## 11. Database Indices

Critical indices for query performance:

```sql
-- Authentication
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_verified ON users(is_verified);

-- Jobs & Applications
CREATE INDEX idx_jobs_company_id ON jobs(company_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_job_apps_student_id ON job_applications(student_id);
CREATE INDEX idx_job_apps_job_id ON job_applications(job_id);
CREATE INDEX idx_job_apps_status ON job_applications(status);

-- Profiles
CREATE INDEX idx_student_profiles_user_id ON student_profiles(user_id);
CREATE INDEX idx_company_profiles_user_id ON company_profiles(user_id);

-- Analytics
CREATE INDEX idx_profile_views_student_id ON profile_views(student_id);
CREATE INDEX idx_xp_transactions_user_id ON xp_transactions(user_id);
CREATE INDEX idx_talent_scores_user_id ON talent_scores(user_id);

-- Timestamps
CREATE INDEX idx_jobs_created_at ON jobs(created_at);
CREATE INDEX idx_applications_applied_at ON job_applications(applied_at);
```

---

## 12. Key Relationships

### User → Profile
```
users (1) ──→ (1) student_profiles
users (1) ──→ (1) company_profiles
```

### Student → Applications → Jobs
```
student_profiles (1) ──→ (*) job_applications (many)
jobs (1) ──→ (*) job_applications (many)
```

### Job → Stages → Tests → Submissions
```
jobs (1) ──→ (*) job_stages
job_stages (1) ──→ (*) test_questions
job_stages (1) ──→ (*) test_submissions
```

### User → Assessments
```
users (1) ──→ (*) psychometric_attempts
users (1) ──→ (*) interview_history
users (1) ──→ (*) xp_transactions
```

---

## 13. Data Constraints & Validations

### Unique Constraints
- users.email: Unique email per user
- users.referral_code: Unique referral code
- student_profiles.user_id: One student profile per user
- company_profiles.user_id: One company profile per user
- job_applications: Unique(student_id, job_id) - One application per student per job
- company_documents: One document set per company
- user_badges: Unique(user_id, badge_name)
- talent_scores: One talent score per user
- psychometric_results: One result per user

### Enum Constraints
- users.role: Only STUDENT, COMPANY, ADMIN, SUPER_ADMIN
- job_applications.status: Only APPLIED, IN_PROGRESS, SELECTED, REJECTED
- job_stages.stage_type: Only valid stage types
- company_profiles.status: Only PENDING, APPROVED, REJECTED

### Referential Integrity
- All foreign keys cascade on delete
- `ON DELETE CASCADE` ensures data consistency when users/companies deleted

---

## 14. Performance Considerations

### Query Patterns
```
High-frequency queries:
1. Get student profile by user_id
2. Get company jobs
3. Get job applicants
4. Get application status
5. Get XP balance
6. Get talent score
7. Get interview history
```

### Optimization Strategies
- Connection pooling: 150 connections for MySQL
- Query timeout: 30 seconds
- Slow query logging: Queries >500ms logged
- Caching: Redis for frequently accessed data
- Partitioning: Large tables (interview_history, xp_transactions) by user_id
- Archival: Old data (>2 years) moved to cold storage

### SQLite Fallback
- Automatic fallback if MySQL unavailable
- WAL mode enabled for concurrent access
- Busy timeout: 10 seconds
- In-memory temp storage for performance

---

## 15. Migration Notes for Flutter

### Key Considerations
1. **Profile JSON fields** (education_json, skills_json, etc.) need special handling
2. **File uploads** (resume, avatar) require S3 integration in Flutter
3. **Complex queries** (talent score calculation) should stay backend
4. **XP transactions** require atomic operations
5. **Anti-cheat tracking** (tab_switches, violations) not applicable on mobile
6. **Job stages** need proper state machine implementation
7. **Test submissions** require session management
8. **Referrals** need unique code generation

---

## 16. Database Initialization Checklist

- [x] 50+ tables documented
- [x] All relationships mapped
- [x] Constraints and validations defined
- [x] Indices for performance identified
- [x] JSON field structures explained
- [x] Foreign key relationships documented
- [x] Fallback strategy (MySQL ↔ SQLite) explained

**Ready for Flutter database model generation**
