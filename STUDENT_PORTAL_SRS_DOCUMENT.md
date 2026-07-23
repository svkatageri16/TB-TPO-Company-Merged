# SOFTWARE REQUIREMENTS SPECIFICATION (SRS)
## Project: VEGA Solapur — Smart Student & Placement Portal
**Document Version:** 1.0.0  
**Status:** Approved  
**Last Updated:** May 31, 2026  
**Author:** AI Systems Architect, Google AI Studio  

---

## TABLE OF CONTENTS
1. [INTRODUCTION](#1-introduction)
   - 1.1 Purpose
   - 1.2 Scope
   - 1.3 Intended Audience
   - 1.4 Definitions, Acronyms, and Abbreviations
2. [OVERALL DESCRIPTION](#2-overall-description)
   - 2.1 Product Perspective
   - 2.2 User Roles & Permissions Matrix
   - 2.3 General Constraints & Assumptions
3. [SYSTEM ARCHITECTURE & INTEGRATION FLOWS](#3-system-architecture--integration-flows)
   - 3.1 High-Level Architecture Diagram
   - 3.2 Key System Integrations
4. [PAGE-BY-PAGE DETAILED FUNCTIONAL SPECIFICATION](#4-page-by-page-detailed-functional-specification)
   - 4.1 Authentication & Public Pages
   - 4.2 Student Portal Pages
   - 4.3 AI Suite (Assessments, Resume & Interviews)
   - 4.4 Coding Practice Suite
   - 4.5 Company / Recruiter Portal Pages
   - 4.6 Psychometric & Pre-Employment Assessments
   - 4.7 Super Admin Console Pages
5. [DATABASE & DATA REQUIREMENTS](#5-database--data-requirements)
   - 5.1 Firestore Models & Collections Blueprints
   - 5.2 Security & Data Access Patterns
6. [NON-FUNCTIONAL REQUIREMENTS](#6-non-functional-requirements)
   - 6.1 Performance and Scaling constraints
   - 6.2 Availability and Reliability Rules
   - 6.3 Security of Client-Server Communication
7. [APPENDIX & SIGN-OFFS](#7-appendix--sign-offs)

---

## 1. INTRODUCTION

### 1.1 Purpose
This Software Requirements Specification (SRS) serves as the single source of truth for the **VEGA Solapur** platform. It provides a detailed, comprehensive blueprint of the system's architecture, user interfaces, functional components, security regulations, and data schemas. This document defines the exact workflow, expectations, and layouts of all modules within the platform to align developers, administrators, students, and member hiring companies.

### 1.2 Scope
**VEGA Solapur** is a next-generation AI-powered, gamified campus placement and learning platform designed to bridge the gap between aspirational tech students in Solapur and the global technology industry. The platform automates resume creation via interactive AI models, quantifies candidates' skills through dynamic coding environments, evaluates psychometric and cognitive abilities, manages hiring pipeline stages, and rewards skill acquisition with virtual experience currency (XP) redeemable in an in-platform store.

### 1.3 Intended Audience
This document is prepared for:
* **Frontend and Backend Developers** translating requirements into code.
* **UI/UX Designers** verifying layout workflows and responsive breakpoint behaviors.
* **Super Administrators** auditing access patterns, logging sequences, and monetization tiers.
* **Academic Placement Coordinators** tracking college placements, student readiness, and industry feedback.

### 1.4 Definitions, Acronyms, and Abbreviations
* **ATS (Applicant Tracking System):** Automated software used by employers to parse, rank, and track job applications.
* **SRS (Software Requirements Specification):** A description of a software system to be developed.
* **XP (Experience Points):** Inter-platform gamification points rewarded to students on task completion.
* **Gemini API:** Google's state-of-the-art multimodal artificial intelligence platform used for resume optimization and mock interviews.
* **SPA (Single Page Application):** Web application that interacts with the user by dynamically rewriting the current web page rather than loading entire new pages.
* **SDE (Software Development Engineer):** Standard engineering job role targeted by the platform's optimization suites.

---

## 2. OVERALL DESCRIPTION

### 2.1 Product Perspective
VEGA Solapur operates as a secure, sandboxed full-stack web application. The frontend is built on **React 18 with Vite**, styled entirely using **Tailwind CSS Utility Classes**, and animated smoothly with **motion/react**. The backend runs an **Express server** hosting API proxy routes for Gemini, compiler platforms, and intelligence tests. Primary server persistence and user state synchronization are powered by **Firebase Firestore** and **Firebase Authentication**.

### 2.2 User Roles & Permissions Matrix
The platform separates authorization boundaries into four distinct layers:
1. **Public Visitor / Guest**: Accesses public descriptions, company outlines, documentation, and handles register/sign-in flows.
2. **Student User**: Builds resumes, undergoes mock interviews, solves coding tasks, earns XP, browses and applies to jobs, views intelligence metrics, and spends XP in the store.
3. **Company / Recruiter User**: Posts job openings, updates hiring pipelines, creates selection criteria, manages pre-employment checkpoints, tracks applicant progress, and schedules interview reviews.
4. **Super Admin User**: Audits administrative logs, monitors CPU/memory metrics, manages students and corporate organizations, edits platform pricing models, configures test templates, and tracks portal success statistics.

### 2.3 General Constraints & Assumptions
* **Port Mapping:** The production and development server MUST exclusively run on `0.0.0.0:3000` to satisfy Cloud Run target ingress structures.
* **Runtime Sandbox:** The system executes inside secure containers. Local files are considered ephemeral; structured analytical outputs must be persistently committed to the cloud Firestore backend database.
* **Client Performance:** Pages must fully render inside modern viewport dimensions (adaptive from mobile 375px up to desktop 1920px grids). Interactive components like canvas configurations or mock dynamic queues must handle resize triggers gracefully.

---

## 3. SYSTEM ARCHITECTURE & INTEGRATION FLOWS

### 3.1 High-Level Architecture Diagram
The layout below illustrates how client interactions are mapped securely through the backend proxies, isolating secret keys from browser inspection:

```
+-----------------------------------------------------------------------------+
|                                CLIENT VIEW                                  |
|   +---------------------+  +---------------------+  +-------------------+   |
|   |   Student Portal    |  |   Recruiter Portal  |  |   Admin Console   |   |
|   +----------+----------+  +----------+----------+  +---------+---------+   |
+--------------|------------------------|-----------------------|-------------+
               |                        |                       |
               +------------------------+-----------------------+
                                        | (HTTPS / WSS on Port 3000)
                                        v
+-----------------------------------------------------------------------------+
|                               EXPRESS SERVER                                |
|   +---------------------------------------------------------------------+   |
|   |                         Vite SPA Middleware                         |   |
|   +---------------------------------------------------------------------+   |
|   |                         Secure API Proxies                          |   |
|   |  - /api/gemini/resume-ats      - /api/compiler-sandbox              |   |
|   |  - /api/gemini/mock-interview  - /api/psychometric-eval             |   |
|   +---------------------------------------------------------------------+   |
+--------------|--------------------------------------------|-----------------+
               |                                            |
               v (OAuth 2.0 Client Tokens)                  v (Private API Key)
+----------------------------------------+    +-------------------------------+
|         GOOGLE WORKSPACE / FIREBASE    |    |      GOOGLE GEMINI SUITE      |
|  - Auth Identity Access Tokens         |    |  - Resume Parsing Models      |
|  - Firestore Cloud Transactions        |    |  - Dynamic Audio / Speech     |
|  - Sheets / Meet / Docs Exports        |    |  - Coding Assessment Engine   |
+----------------------------------------+    +-------------------------------+
```

### 3.2 Key System Integrations
1. **Google Gemini (@google/genai SDK):** Leveraged server-side using `/api/gemini/...` endpoints. Analyzes professional summaries, suggests ATS keyword rewrites, drafts customized interview questions, and provides precise feedback in JSON structures.
2. **Firebase Auth & Firestore:** Handles registration verification, user profiles, application history status, and security limits. All client queries adhere to Firebase JSON security rules containing strict `request.auth` checks.
3. **Compiler Core Engine:** Runs, parses, and evaluates user code snippets against unit test modules, maintaining metrics for speed, correctness, and memory footprints.
4. **Google Workspace APIs (Calendar & Meet):** Initiated via Google OAuth scopes to auto-schedule interviews between corporate recruiters and students, populating mutual calendars with live Meet links.

---

## 4. PAGE-BY-PAGE DETAILED FUNCTIONAL SPECIFICATION

Explore the exhaustive page functional requirements across all major functional modules.

### 4.1 Authentication & Public Pages

#### 4.1.1 Home Page
* **File Location:** `/src/pages/Home.tsx`
* **Purpose:** The portal gateway establishing the marketing tone, branding highlights, and feature pathways.
* **Detailed Functionality:**
  * Displays high-impact hero headings styled in **Inter/Outfit** display combinations.
  * Contains separate structural action cards for "Aspirant Students", "Hiring Partners", and "University Coordinators".
  * Integrates interactive live placement stat tickers (total placement rates, top Solapur salaries, verified hiring companies).
  * Prompts floating auth navigation drawers.

#### 4.1.2 About Page
* **File Location:** `/src/pages/About.tsx`
* **Purpose:** Educates visitors, institutional partners, and tech applicants about the academic roots and AI vision of the Solapur initiative.
* **Detailed Functionality:**
  * Displays a historical timeline of platform milestones, institutional partnerships, and local SDE growth.
  * Highlights platform capabilities using custom bento grid layouts.

#### 4.1.3 Contact Page
* **File Location:** `/src/pages/Contact.tsx`
* **Purpose:** Form submission gateway for college partnership proposals, corporate registrations, and support requests.
* **Detailed Functionality:**
  * Standardized input form with detailed validation (Student Roll No/Corporate CIN, Name, Work Email, Message).
  * Links directly to Solapur campus address coordinates. Handles automated client feedback loops.

#### 4.1.4 Register Page
* **File Location:** `/src/pages/Register.tsx`
* **Purpose:** Registration engine validating candidate and company onboarding flows.
* **Detailed Functionality:**
  * Role selection switch (Student vs. Recruiter).
  * Collects Email, Password (with visual strength checking), Full Name, Contact Info, and Campus ID.
  * Initiates account validation flow in Firebase Authentication.

#### 4.1.5 Login Page
* **File Location:** `/src/pages/Login.tsx`
* **Purpose:** Primary system access node.
* **Detailed Functionality:**
  * Authenticates users through secure credentials.
  * Includes Google OAuth buttons for quick single-click student signing.
  * Uses contextual routing to dispatch logged-in sessions to respective Dashboards based on internal role states.

#### 4.1.6 Forgot Password Page
* **File Location:** `/src/pages/ForgotPassword.tsx`
* **Purpose:** Initiates structural account recovery workflows.
* **Detailed Functionality:**
  * Generates standard password reset instructions dispatched securely via email link, preventing username enumeration risks.

#### 4.1.7 Reset Password Page
* **File Location:** `/src/pages/ResetPassword.tsx`
* **Purpose:** Allows final assignment of new entry variables.
* **Detailed Functionality:**
  * Form for inputting new password with strict validation keys. Confirms execution on target server nodes.

#### 4.1.8 Verify Email Page
* **File Location:** `/src/pages/VerifyEmail.tsx`
* **Purpose:** Middle-state blocking view requiring email verification.
* **Detailed Functionality:**
  * Shows validation alerts, re-send options, and provides dynamic updates when verified state shifts.

#### 4.1.9 Terms & Conditions
* **File Location:** `/src/pages/TermsConditions.tsx`
* **Purpose:** Legal document stating user behavior codes and system rules.
* **Detailed Functionality:**
  * Scrollable textual framework detailing fair usage policies, non-disclosure requirements for pre-employment testing, and licensing limits.

#### 4.1.10 Privacy Policy
* **File Location:** `/src/pages/PrivacyPolicy.tsx`
* **Purpose:** Detailed explanation of data collection, storage, and processing.
* **Detailed Functionality:**
  * Outlines strict policies safeguarding student PII (Personally Identifiable Information) and details how AI engines utilize user resumes without sharing them.

#### 4.1.11 Community Page
* **File Location:** `/src/pages/Community.tsx`
* **Purpose:** Collaborative networking space for students, developers, and placement mentors of Solapur.
* **Detailed Functionality:**
  * Thread listing layout with category tags (e.g., `#InterviewPrep`, `#ReactDev`, `#SystemDesign`).
  * Supports creating discussion threads, writing rich text comments, and upvoting insightful developer answers.

#### 4.1.12 Company Profile Page
* **File Location:** `/src/pages/CompanyProfile.tsx`
* **Purpose:** Publicly accessible page highlighting hiring partners, available openings, and workspace cultures.
* **Detailed Functionality:**
  * Rich media sections with office descriptions, current placement batches, active lists of jobs, and direct recruitment contact avenues.

---

### 4.2 Student Portal Pages

#### 4.2.1 Student Dashboard
* **File Location:** `/src/pages/dashboards/StudentDashboard.tsx`
* **Purpose:** Central student command center providing personalized, high-density telemetry.
* **Detailed Functionality:**
  * Contains key metric visual cards: Overall Placement Readiness Score, Accumulated Coding Challenges Completed, Psychometric Completion, and Accumulated Gamified XP.
  * Features interactive quick-action buttons directly linking to:
    * **Go to AI Resume Builder**
    * **Solve Daily Coding Challenge**
    * **Initialize Mock Interview**
    * **Redeem XP Core Inventory**
  * Displays upcoming Placement Drives dynamically pulled from recruitment collections.

#### 4.2.2 Student Profile Page
* **File Location:** `/src/pages/StudentProfile.tsx`
* **Purpose:** Central student registration directory with persistent cloud file bindings.
* **Detailed Functionality:**
  * Editable sections: Contact Details, Education Details (solapur universities, CGPA), Projects, Work Experiences, and Skills arrays.
  * Direct PDF document upload handling with drag-and-drop actions.
  * Structured JSON schema integrations for parsed LinkedIn URLs.

#### 4.2.3 Intelligence Dashboard
* **File Location:** `/src/pages/student/IntelligenceDashboard.tsx`
* **Purpose:** Quantitative assessment tracker parsing cognitive results.
* **Detailed Functionality:**
  * Shows dynamic historical charts (using `recharts`) charting the candidate's development tracks: Numerical Logic, Spatial Relations, Analytical Thinking, and SDE Aptitude.
  * Offers insights comparing Solapur state levels with global candidate pools.

#### 4.2.4 Intelligence Test View
* **File Location:** `/src/pages/student/IntelligenceTestView.tsx`
* **Purpose:** Active cognitive/logical assessment module.
* **Detailed Functionality:**
  * A full-viewport, full-screen sandboxed layout containing adaptive logical questions.
  * Integrates interactive timing metrics, visual matrix manipulation grids, and immediate session termination triggers on platform tab focus changes (preventing academic dishonesty).

#### 4.2.5 All Jobs Board
* **File Location:** `/src/pages/student/AllJobsPage.tsx`
* **Purpose:** Job board displaying active career vectors in solapur and remote regions.
* **Detailed Functionality:**
  * Advanced real-time filtering: Job Type, Base Pay Range, Required Tech Stack, and Placement Type (On-Campus/Off-Campus).
  * Multi-stage search inputs parsing job descriptions instantly via local indices.
  * Integrated "Quick Apply" workflow.

#### 4.2.6 Applied Jobs Page
* **File Location:** `/src/pages/student/AppliedJobsPage.tsx`
* **Purpose:** Tracking interface for job candidates.
* **Detailed Functionality:**
  * Rendered as an interactive step-based timeline or a compact Kanban Board tracing submission stages: `Applied` ➔ `Shortlisted` ➔ `Assessment Stage` ➔ `Interview Panel` ➔ `Offer Granted / Declined`.
  * Allows downloading application forms and checking company-dispatched pipeline actions.

#### 4.2.7 Mock Interview History
* **File Location:** `/src/pages/student/MockHistoryPage.tsx`
* **Purpose:** Vault containing student mock-interview recordings and technical performance transcripts.
* **Detailed Functionality:**
  * Lists completed mock interview files containing dates, target role classifications, and general metrics.
  * Provides granular transcript reviews, sentiment analysis ratings, and section-by-section recommendation cards written by Gemini.

#### 4.2.8 VEGA XP Wallet Page
* **File Location:** `/src/pages/student/XPWallet.tsx`
* **Purpose:** Gamification balance ledger tracking student rewards.
* **Detailed Functionality:**
  * Displays current XP Balance, Level progression, daily task completions, and lists full chronological transaction logs (e.g., `+50 XP: Solved Daily Coding Loop`, `-200 XP: Mock Resume Review Unlock`).

#### 4.2.9 VEGA Rewards Center Page
* **File Location:** `/src/pages/XPStore.tsx`
* **Purpose:** Exchange portal converting gamification points into practical placement perks.
* **Detailed Functionality:**
  * Virtual storefront displaying redeemable items: Mock AI Premium Feedback sessions, Mock Placement Exams, Specialized Corporate Badges, and Campus Coffee Coupons.
  * Safe transaction processing. Confirms balances and updates Firestore profiles before completing purchases.

---

### 4.3 AI Suite (Assessments, Resume & Interviews)

#### 4.3.1 AI Resume Builder & ATS Auditor
* **File Location:** `/src/pages/ai/ResumeBuilder.tsx`
* **Purpose:** AI-driven document generator and real-time ATS optimization scanner.
* **Detailed Functionality:**
  * **Interactive Builder Inputs:** Simple form side-panels to quickly modify profile data, education profiles, experiences, and technical skill tags.
  * **Template Picker Node:** Contains scaled, compact, high-performance templates (Academic LaTeX, Classic ATS, Silicon Valley Tech, and Hybrid ATS Premium) rendered dynamically via CSS and JetBrains Mono styles.
  * **ATS Auditor Report Panel:**
    * Displays Layout Parse Safety ratings (100% Secure standard setups).
    * Validates section coverages (verifies email format, LinkedIn connections, standard header classifications).
    * Tracks Quantifiable SDE metric formats (checking for percentages, time parameters like "ms", and scale variables).
  * **Target Role SEO Matcher:**
    * Interrogates Gemini using server endpoints.
    * Recommends precise keywords for roles (e.g., *Frontend Specialist, Infrastructure Architect, Deep Learning Master*).
    * Shows live high-scoring sentence rewrites, replacing passive statements with metric-driven, action-focused phrasing.

#### 4.3.2 AI Mock Interview Page
* **File Location:** `/src/pages/ai/InterviewPage.tsx`
* **Purpose:** Real-time conversational mock-interview simulator.
* **Detailed Functionality:**
  * Requests camera and microphone frame permissions (configured cleanly inside `/metadata.json`).
  * Renders a real-time speech indicator and camera viewport.
  * Dispatches question-response loops using server-side Gemini streaming endpoints.
  * Displays transcript subtitle tracks, remaining session clocks, and collects audio frames securely.

#### 4.3.3 AI Interview Ended
* **File Location:** `/src/pages/ai/InterviewEnded.tsx`
* **Purpose:** Summary screen post-interview completion.
* **Detailed Functionality:**
  * Displays termination summaries, saves records to user folders, and routes users to the Mock History evaluation vaults.

#### 4.3.4 AI Quiz Config Page
* **File Location:** `/src/pages/ai/QuizConfigPage.tsx`
* **Purpose:** Setup panel for custom AI-generated quiz sessions.
* **Detailed Functionality:**
  * Standard config fields: Question Difficulty (Junior / Professional / Principal), Specific Tech Domain, and Time constraints per node.

#### 4.3.5 AI Quiz Session Page
* **File Location:** `/src/pages/ai/QuizSessionPage.tsx`
* **Purpose:** Handles active interactive technical evaluation sessions.
* **Detailed Functionality:**
  * Renders dynamic dynamic multiple-choice or single-answer technical assessments.
  * Features automated countdown clocks, question progression controls, and flag-for-review bookmarks.

#### 4.3.6 AI Quiz Result Page
* **File Location:** `/src/pages/ai/QuizResultPage.tsx`
* **Purpose:** Scorecards and quantitative analysis dashboard.
* **Detailed Functionality:**
  * Displays raw score ratios, percentile positioning amongst Solapur students, key question breakdowns, and links explanations for each correct/incorrect response.

#### 4.3.7 AI Quiz History Page
* **File Location:** `/src/pages/ai/QuizHistoryPage.tsx`
* **Purpose:** Archival directory for academic quizzes.
* **Detailed Functionality:**
  * Tracks conceptual progress trends over time, helping students identify persistent technical weaknesses.

---

### 4.4 Coding Practice Suite

#### 4.4.1 Coding Connect Page
* **File Location:** `/src/pages/coding/CodingConnectPage.tsx`
* **Purpose:** Code editor and dynamic problem-solving interface.
* **Detailed Functionality:**
  * Renders clean layout panels for coding challenge prompts, sample input/output scenarios, constraints checklists, and a code editor.
  * Supports choosing target SDE languages (JavaScript, TypeScript, Python, Java, C++).
  * Direct action controls to "Run Code Structure" and "Submit Solution".

#### 4.4.2 Coding Analytics Dashboard
* **File Location:** `/src/pages/coding/CodingAnalyticsDashboard.tsx`
* **Purpose:** Performance analytics portal.
* **Detailed Functionality:**
  * Charts compiler run speeds, memory utilization curves, language selection distributions, and ranks weekly challenge profiles on college leaderboards.

---

### 4.5 Company / Recruiter Portal Pages

#### 4.5.1 Company Dashboard
* **File Location:** `/src/pages/dashboards/CompanyDashboard.tsx`
* **Purpose:** Recruiter dashboard outlining performance metrics and active recruitment status.
* **Detailed Functionality:**
  * Direct KPI counters: Active Postings count, New Applicants, Interviews Scheduled Today, and Final Offers Outstanding.
  * Quick-access shortcuts to create new jobs, view pipeline boards, or configure pre-employment assessments.

#### 4.5.2 Job Posting Page
* **File Location:** `/src/pages/company/JobPostingPage.tsx`
* **Purpose:** Job creation wizard.
* **Detailed Functionality:**
  * Multi-field forms: Job Title, Experience Requirements, Tech Stack Array, Annual Compensation, Geographic Location, and Custom Pre-interview Test Requirements.

#### 4.5.3 Active Jobs Page
* **File Location:** `/src/pages/company/ActiveJobsPage.tsx`
* **Purpose:** Management panel for posted vacancies.
* **Detailed Functionality:**
  * Lists active job vacancies, allows archiving postings, updating title details, or copying raw application tracking links.

#### 4.5.4 Pipeline Board
* **File Location:** `/src/pages/company/PipelineBoard.tsx`
* **Purpose:** Visual applicant flow board (Kanban Layout).
* **Detailed Functionality:**
  * High-performance drag-and-drop board. Recruiter shifts applicant cards between stages like `Applied` ➔ `Screening Passed` ➔ `Assessment Stage` ➔ `Interviews` ➔ `Offered`.
  * Triggers automated background notifications to students on pipeline updates.

#### 4.5.5 Applicants Page
* **File Location:** `/src/pages/company/ApplicantsPage.tsx`
* **Purpose:** Grid search directory of all applicants.
* **Detailed Functionality:**
  * Rich profile cards containing direct access to candidate scores, AI evaluation outcomes, resumes, and coding evaluation transcripts.

#### 4.5.6 Interview Center
* **File Location:** `/src/pages/company/InterviewCenter.tsx`
* **Purpose:** Meeting coordinator page and technical dashboard.
* **Detailed Functionality:**
  * Unified view of booked calendar slots. Integrates direct recruitment actions: launch real-time video screen, record feedback notes, or score candidates across structural categories (technical skill, system architectural sense, soft skills).

#### 4.5.7 Job Tracking Dashboard
* **File Location:** `/src/pages/company/JobTrackingDashboard.tsx`
* **Purpose:** HR recruitment efficiency analytics.
* **Detailed Functionality:**
  * Interactive graphs measuring time-to-hire, drop-off rates across interview funnel steps, assessment difficulty calibrations, and recruiter efficiency trends.

#### 4.5.8 Company Settings Page
* **File Location:** `/src/pages/company/CompanySettingsPage.tsx`
* **Purpose:** Profile management for corporate organizations.
* **Detailed Functionality:**
  * Edits corporate info (CIN, Industry Class, LinkedIn Page, Office Coordinates), registers corporate logo designs, and manages team recruiter profiles.

#### 4.5.9 Job Stage Action Page
* **File Location:** `/src/pages/JobStageActionPage.tsx`
* **Purpose:** Trigger portal for managing applicant actions.
* **Detailed Functionality:**
  * Dispatches action triggers for scheduled candidates (e.g., emailing custom assessment invitations, initiating background checks, or releasing corporate offer templates).

---

### 4.6 Psychometric & Pre-Employment Assessments

#### 4.6.1 Psychometric Test Session
* **File Location:** `/src/pages/psychometric/PsychometricTest.tsx`
* **Purpose:** Psychometric evaluation module.
* **Detailed Functionality:**
  * Renders classic situational design prompts (e.g., "In a team dispute, you are likely to...").
  * Eliminates response tracking biases using dynamic Likert scale formats, capturing team cohesion, resilience under stress, SDE ethics, and technical focus parameters.

#### 4.6.2 Job Pre-employment Test
* **File Location:** `/src/pages/jobs/JobTest.tsx`
* **Purpose:** Position-specific screening assessment required by prospective employers.
* **Detailed Functionality:**
  * Combines rapid logical questions, specialized algorithmic challenges, and SQL database optimization inputs under strict sandboxed exam settings.

---

### 4.7 Super Admin Console Pages

#### 4.7.1 Admin Master Dashboard
* **File Location:** `/src/pages/admin/AdminDashboard.tsx`
* **Purpose:** System-wide operations dashboard.
* **Detailed Functionality:**
  * Showcases high-level KPI trends: Total Registered Students across Solapur, Corporate partner cohorts, Successful Placements rate, and monthly transactional volume.

#### 4.7.2 Student Management Page
* **File Location:** `/src/pages/admin/StudentManagement.tsx`
* **Purpose:** Operations directory of all student users.
* **Detailed Functionality:**
  * Manage profiles, edit verified academic status details, reset XP assets, block accounts violating SDE exam integrity, or export student rosters in XLSX/CSV schemas.

#### 4.7.3 Company Management Page
* **File Location:** `/src/pages/admin/CompanyManagement.tsx`
* **Purpose:** Portal auditing registered corporations.
* **Detailed Functionality:**
  * Approve or deny corporate onboarding submissions, modify custom priority flags, and set active posting caps for specific organizations.

#### 4.7.4 Job Management Page
* **File Location:** `/src/pages/admin/JobManagement.tsx`
* **Purpose:** Global job moderation console.
* **Detailed Functionality:**
  * Inspect, modify, or delete any company job opening. Assures compliance with campus wage baselines and fair recruitment listings.

#### 4.7.5 Pricing Management Page
* **File Location:** `/src/pages/admin/PricingManagement.tsx`
* **Purpose:** Tier structure and system billing manager.
* **Detailed Functionality:**
  * Adjusts transactional structures: configuring pricing formulas for corporate recruitment subscriptions, pricing premium AI resume reviews, and assigning base XP packages.

#### 4.7.6 Psychometric Management Page
* **File Location:** `/src/pages/admin/PsychometricManagement.tsx`
* **Purpose:** Custom test configuration node.
* **Detailed Functionality:**
  * Allows admins to author custom psychometric question arrays, modify response weight matrices, and calibrate logic evaluations.

#### 4.7.7 Application Tracking Console
* **File Location:** `/src/pages/admin/ApplicationTracking.tsx`
* **Purpose:** Super-admin level audit of active student application flows.
* **Detailed Functionality:**
  * Aggregated real-time stream of student applications across Solapur, tracking system performance and placement drive bottlenecks.

#### 4.7.8 Admin Intelligence Page
* **File Location:** `/src/pages/admin/AdminIntelligencePage.tsx`
* **Purpose:** Intelligence-test builder.
* **Detailed Functionality:**
  * Supports creating logical quiz components, editing graphic logical layouts, and monitoring average test performance matrices across campus branches.

#### 4.7.9 Admin Logs & Audit Trail
* **File Location:** `/src/pages/admin/AdminLogs.tsx`
* **Purpose:** System safety monitoring.
* **Detailed Functionality:**
  * Full-text search and filtering across admin actions (e.g., `User Blocked`, `Company Cleared`, `XP Balance Override`), including originating IP coordinates and timestamp variables.

#### 4.7.10 Admin Monitoring & Telemetry
* **File Location:** `/src/pages/admin/AdminMonitoring.tsx`
* **Purpose:** Server performance monitor.
* **Detailed Functionality:**
  * Visualizes server vitals: real-time CPU utilization sparklines, active browser websocket threads, request response latency, and storage size metrics.

---

## 5. DATABASE & DATA REQUIREMENTS

### 5.1 Firestore Models & Collections Blueprints
Persisted schema variables are structured within clean collections in Firebase Firestore.

#### 5.1.1 `users`
* Records user credentials, primary email, role, and levels.
```json
{
  "uid": "USER_ID_HEX",
  "email": "student@solapur.edu",
  "role": "student", // Options: ["student", "recruiter", "admin"]
  "createdAt": "TIMESTAMP",
  "lastLogin": "TIMESTAMP"
}
```

#### 5.1.2 `student_profiles`
* Contains detailed academic telemetry, resumes, and gamification balances.
```json
{
  "uid": "USER_ID_HEX",
  "fullName": "Sai Prasad",
  "rollNo": "CS-2026-081",
  "college": "Solapur Institute of Technology",
  "cgpa": 9.24,
  "skills": ["React", "TypeScript", "Node.js", "Python"],
  "social_links_json": {
    "linkedin": "https://linkedin.com/in/example",
    "github": "https://github.com/example"
  },
  "experiences": [
    {
      "company": "SDE Labs",
      "role": "Frontend Intern",
      "duration": "3 Months",
      "description": "Scaled performance metrics by 30% using React."
    }
  ],
  "projects_json": [
    {
      "title": "Smart SDE Compiler",
      "description": "Reduced API network overhead by 40% using debounced query logic."
    }
  ],
  "xpBalance": 4500,
  "level": 12,
  "readinessScore": 88
}
```

#### 5.1.3 `jobs`
* Records active corporate job openings.
```json
{
  "id": "JOB_ID_UUID",
  "companyId": "CORP_ID_HEX",
  "companyName": "Tech Solapur Corp",
  "title": "Full Stack SDE - React / Express",
  "compensation": "8,50,000 INR",
  "techStack": ["React", "Express", "Node.js", "TypeScript"],
  "description": "Develop high-scale portal applications...",
  "status360": "active", // Options: ["active", "archived"]
  "createdAt": "TIMESTAMP"
}
```

---

## 6. NON-FUNCTIONAL REQUIREMENTS

### 6.1 Performance and Scaling Constraints
* **Latency Limits:** Standard API responses must resolve inside **200ms**. AI suggestions parsing via server-side Gemini pipelines must establish stream responses in under **800ms**.
* **Responsive Assets:** Dynamic images generated dynamically inside the application must pass standard HTML JSX parameters including `referrerPolicy="no-referrer"` to prevent external frame execution blocks.
* **Lazy Module Rendering:** Front panels, deep dashboards, and compiler controls must use modern dynamic bundle-splitting to prevent chunk sizes exceeding standard memory variables in lower-end student machines.

### 6.2 Availability and Reliability Rules
* **Offline Fallbacks:** Form components and code configurations must leverage local storage cache engines to protect student data against sudden campus network interruptions.
* **Auto-Recovery Vitals:** Sandbox compiler execution threads must limit execution parameters to **2000ms**, automatically killing infinite loops or memory-leaking scripts safely to prevent container crashes.

### 6.3 Security of Client-Server Communication
* **Sealed Secrets:** At no point should any API Key or configuration variable be exposed directly to the client browser. No client variables may contain private prefixes unless explicitly designed for public analytical modules.
* **HTTPS Access:** Ingress routes must enforce TLS 1.3 protocol architectures, blocking unencrypted traffic flows automatically.

---

## 7. APPENDIX & SIGN-OFFS
This Software Requirements Specification document stands validated as of the current system compilation checkpoint. Any adjustments or future updates to page behaviors, database collection models, or administrative dashboards must be documented under new major/minor system release versions.

*Approved by the Campus VEGA Committee, Solapur Branch.*
