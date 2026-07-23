# 🌐 VEGA — Core Features & Functional Specification

Welcome to the comprehensive feature catalog for **VEGA** — a unified, intelligent full-stack recruitment, technical assessment, and professional career development platform. This document outlines the complete capabilities, workflows, and pages across our three core workspace portals: the **Student (Candidate) Portal**, the **Company (Recruiter) Workspace**, and the **Admin Administration Suite**.

---

## 👨‍🎓 1. Student Portal (Candidate Workspace)
The Student Portal is designed to guide applicants from active learning and resume optimization all the way through automated coding synchronization, psychometric evaluations, AI mock interviews, and active job applications.

### 📊 dashboards & Profile Management
*   **Dynamic Student Dashboard** (`StudentDashboard.tsx`): 
    *   Provides quick metrics on application pipeline status (Pending, Interview, Offered).
    *   Highlights the candidate's gamified profile status: active XP points, current character Level (e.g., Level 5 Junior Developer), daily streak counters, and DSA mastery rating.
    *   Displays recent recruiter activities, personalized job recommendations, and upcoming interview times.
*   **Verified Profile Page** (`StudentProfile.tsx`): 
    *   Comprehensive candidate resume view including formal education timelines, professional projects, and core skill badges.
    *   Displays platform verification badges earned from mock interviews, competitive coding excellence, and intelligence tests.

### 💼 Job Search & Dynamic Applications
*   **Interactive Job Hub** (`AllJobsPage.tsx`): 
    *   Fast lookup with full-text search, compensation sliders, locations, and skills filters.
    *   Allows sorting by date posted, match percentage, level, or company size.
*   **Tracking Center** (`AppliedJobsPage.tsx`): 
    *   Allows students to view live candidate status along custom recruiting pipelines (e.g., Applied, Technical Round, Behavioral Evaluation, Offer Extended, and Closed).
    *   Allows completing required screening tests, answering follow-up questionnaires, and viewing feedback directly inside the interface.

### 🧠 AI Career Suite
*   **AI CV / Resume Builder** (`ResumeBuilder.tsx`): 
    *   Auto-analyzes uploaded or drafted resume summaries using the **Gemini 3.5 API**.
    *   Extracts structural details (Skills, Projects, Education) and maps them into optimized layouts for ATS compliance.
    *   Provides resume polishing tips, structural keywords, and auto-generates exportable professional PDF documents using `jsPDF` and `html2canvas`.
*   **AI Real-Time Mock Interviews** (`InterviewPage.tsx`, `InterviewEnded.tsx`): 
    *   Staged text-to-speech or text-based mock interview simulator powered by Gemini.
    *   Adapts dynamically to the chosen job role (e.g., Frontend, Backend, Data Engineer) and interview tone.
    *   Presents questions in succession and records the candidate's responses.
    *   Delivers an extensive performance review including a **Communication Index, Technical Confidence, Behavioral Fluency,** and actionable logs on key answers at completion.
*   **AI Smart Quizzes** (`QuizConfigPage.tsx`, `QuizSessionPage.tsx`, `QuizResultPage.tsx`): 
    *   Configurable, AI-generated DSA or programming concept assessments.
    *   Creates dynamically unique questions mapping requested topics (e.g., Array Manipulation, Graphs, OOP).
    *   Saves active session progress, logs timing data per question, and breaks down diagnostic results with correct answers and explanations.

### 💻 Competitive Coding & Portfolio Engine
*   **Multiversal Platform Connector** (`CodingConnectPage.tsx`): 
    *   Securely binds developer handles from top external systems: **LeetCode, Codeforces, HackerRank, GeeksforGeeks,** and **CodeChef**.
*   **Real-Time Analytics Dashboard** (`CodingAnalyticsDashboard.tsx`): 
    *   Retrieves verified profile metrics and syncs them automatically or via on-demand triggers.
    *   Visualizes quantitative counts (Problems Analyzed (Easy, Medium, Hard), current/longest streak, active days, rating points).
    *   Generates a fully interactive **Submission Activity Heatmap** visualizing consistency over the past year.
    *   **AI Cognitive Profiler Diagnostic**: Evaluates verified competitive statistics to assign an overall competitive rating, analyzes solved topic distributions, identifies architectural software strengths, and generates a detailed cognitive feedback roadmap.

### 🎯 Psychometric & Cognitive Assessments
*   **Cognitive Assessment Center** (`IntelligenceDashboard.tsx`, `IntelligenceTestView.tsx`): 
    *   Standardized online capability tests containing real spatial, logical, numeric, and language reasoning tasks.
*   **Psychometric Traits Simulator** (`PsychometricTest.tsx`): 
    *   Evaluates workplace soft traits, leadership capability, problem-solving mindset, and teamwork behavior.
    *   Draws user trait maps to present in recruiter summary profiles.

### 🎮 Gamified Motivation (The XP System)
*   **VEGA XP Wallet Centre** (`XPWallet.tsx`): 
    *   Records experience rewards for completing coding synchronizations, answering cognitive tests, or acing AI interviews.
    *   Logs transaction details demonstrating XP growth.
*   **XP Achievement Store** (`XPStore.tsx`): 
    *   Allows students to redeem points for platform bonuses (e.g., Resume Review tokens, extra Mock Interview tickets, profile color custom themes, and virtual badges).

---

## 🏢 2. Company Portal (Recruiter Workspace)
The Recruiter Workspace equips HR professionals, hiring managers, and enterprise leads with powerful dashboard metrics, live candidate tracking boards, and AI-assisted qualification summaries.

### 📈 Workspace Command Center
*   **Recruiter Dashboard** (`CompanyDashboard.tsx`): 
    *   Captures high-level performance indicators: active postings, open spots, incoming application rates, and upcoming scheduled interviews.
    *   Highlights candidates requiring urgent stage screening or interview reviews.
*   **Hiring Analytics** (`AnalyticsDashboard.tsx`): 
    *   Compiles analytical charts tracking funnel conversion rates, sourcing efficiency, and typical time-to-hire distributions.

### 📋 Enterprise & Listing Management
*   **Job Posting wizard** (`JobPostingPage.tsx`): 
    *   Configures structural requirements, base compensation fields, on-site/remote nature, target skills, education thresholds, and optional psychometric rules.
*   **Listing Inventory** (`ActiveJobsPage.tsx`, `JobTrackingDashboard.tsx`): 
    *   Unified list to control, edit, pause, or close corporate postings.
    *   Displays direct counts of new applications, candidate pipelines, and screening pass rates per role.

### 🚀 Candidate Pipeline & Evaluation Board
*   **Kanban Pipeline Board** (`PipelineBoard.tsx`): 
    *   Interactive drag-and-drop application interface which moves candidates from Applied through Screening, Interviewing, Offered, or Archived stages.
    *   Allows immediate actions (Extend offer, Reject candidate, Send a direct message, schedule an interview) during pipeline state changes.
*   **Full Applicant Overview** (`ApplicantsPage.tsx`): 
    *   Allows searching and sorting across all applicants for a specific role based on skills, credentials, or interview grading.
*   **Deep Evaluation Modal Container**: 
    *   **Interactive CP profile analyzer**: Enables recruiters to inspect synchronized competitive coding counts, heatmaps, and AI DSA capability analyses directly on the applicant's record.
    *   **Psychometric Traits Evaluation**: Summarizes applicant mindset trends, logic scores, and work-fitness metrics inside interactive spider charts.
    *   **AI Interview Transcript Viewer & Feedback Log**: Full review of technical results, recording details, communication grading, and question commentary summaries generated during the candidate's AI Mock sessions.
*   **Interview Scheduling Hub** (`InterviewCenter.tsx`): 
    *   Allows management of scheduled interview calendar items, coordinates with candidates, and logs private interviewer scoring panels.

---

## 🛡️ 3. Admin Portal (Administration & Governance Suite)
The central control center for platform owners, moderators, and operations staff to manage resources, keep systems secure, auditable, and update dynamic content models.

### 👑 System Operations Control
*   **Operations Overview** (`AdminDashboard.tsx`): 
    *   Displays high-level operational statistics: Total active students, corporate partners, active postings, and system-wide real-time test configurations.
*   **Audits & Activity Logbook** (`AdminLogs.tsx`): 
    *   Maintains a immutable log of platform activities (User authentications, profile changes, account deletions, schema actions, or permission checks).
*   **Diagnostics Monitoring Panel** (`AdminMonitoring.tsx`): 
    *   Visualizes API response times, database connection states, file uploads metrics, caching logs, and storage directories capacity.

### 👥 Registry & Verification Moderation
*   **Student Registry Manager** (`StudentManagement.tsx`): 
    *   Manage student profile directories, review flagged profiles, and issue/verify custom candidate certificates and platform excellence badges.
*   **Enterprise Moderator** (`CompanyManagement.tsx`): 
    *   Review corporate registries, assess incorporation documentation, verify recruiter requests, or block system abusers.
*   **Moderation Board** (`JobManagement.tsx`): 
    *   A central moderation queue to monitor listings, audit screening compliance, ensure fair competition guidelines, and flags false, outdated, or scam postings.

### 🔬 Cognitive & Intelligence Administration
*   **Test Matrix Manager** (`PsychometricManagement.tsx`): 
    *   Full question-bank management for psychometric, logical, numerical, and spatial aptitude evaluations.
    *   Configure multiple choice choices, map traits to choices, and configure scoring weight variables.
*   **Cognitive Performance Tracker** (`ApplicationTracking.tsx`): 
    *   Review analytics tracking overall student pass rates, high-achieving developer pools, and overall assessment balance.
*   **System AI Intelligence Planner** (`AdminIntelligencePage.tsx`): 
    *   Configure standard guidelines, baseline benchmarks, and diagnostic prompts used by GenAI algorithms across student cognitive scoring and recruiter pipeline tools.

---

## ⚙️ 4. Core Architecture Integrations
VEGA combines a modern React and Node.js micro-framework with specialized external API clients:
1.  **AI Engine**: Powered edge-to-edge by **Gemini (@google/genai)** to conduct mock interview conversations, analyze cognitive profiles, draft resumes, and build dynamic evaluation maps.
2.  **External Competitive Coding Connector**: Pulls live competitive records from top platforms using cheerio scraping routines and custom platform API clients to preserve diagnostic validity.
3.  **Local Relational File Engine**: Leverages highly optimized `Better-SQLite3` for clean, auditable transactions and instant state-reloading under extreme multi-user testing conditions.
4.  **Flexible Printing & Document Exporter**: Integrated document parsing utilizing client-side scripts `jsPDF` and `html2canvas` to deliver high-fidelity outputs for application resumes.
5.  **Multi-Language Interface**: Configured with `i18next` localized structures to seamlessly accommodate global talent pools and multicultural hiring procedures.
