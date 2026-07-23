# VEGA Video Interview Module SRS
## Software Requirements Specification (SRS) • Premium Real-Time video Recruitment Engine

---

## 1. Executive Summary & Context
The **Interactive Video Interview Module** is a core component of the **VEGA** recruitment portal, facilitating secure, real-time, proctored video sessions between recruiters (Companies) and students. It streamlines the hiring process by integrating auto-evaluation, real-time remote monitoring (cheating/tab-change prevention), speech-to-text transcript generation, and automated AI summary reports generated via the **Google Gemini API**.

---

## 2. System Architecture & Role Permissions
The module services **four distinct system roles**, each with tailor-made access control and operational flows:

| Role | Operational Scope | Key Features |
| :--- | :--- | :--- |
| **Student** | Candidate | View scheduled interviews on profile, receive real-time invitations, complete the proctored interview, and view completion status. |
| **Company (Recruiter)** | Evaluator / Host | Create/schedule interviews, screen candidate profiles, host the live video call room, view real-time proctoring alerts, generate AI feedback (Gemini), and finalize reports. |
| **TPO (Training & Placement Officer)** | Facilitator | Oversee placement analytics, invite companies, handle batch alerts, monitor student statistics, and verify compliance. |
| **Super Admin / Admin** | Moderation | Overall system health monitoring, credential administration, database auditing, and global configuration control. |

```
                       ┌──────────────────────────────────────┐
                       │           VEGA UI            │
                       │   (Students, Recruiters, TPOs)       │
                       └──────────────────┬───────────────────┘
                                          │  HTTP APIs & WebSocket
                                          ▼
                       ┌──────────────────────────────────────┐
                       │       Express Backend Server         │
                       │        (Authentication, CSRF)        │
                       └──────────────────┬───────────────────┘
                                          │
                  ┌───────────────────────┼───────────────────────┐
                  ▼                       ▼                       ▼
    ┌──────────────────────────┐┌──────────────────┐┌───────────────────────────┐
    │     SQLite Database      ││ Socket.io Server ││     Google Gemini API     │
    │  (Proctored Interviews,  ││ (Real-Time Comm, ││ (MOM, Transcripts &      │
    │   Profiles & Analytics)  ││ Proctoring Sync) ││ AI Evaluation Generating) │
    └──────────────────────────┘└──────────────────┘└───────────────────────────┘
```

---

## 3. Detailed Data Models & Schema Design
The sqlite database tables associated with the interview and notification loops are configured in `/server/db.ts` as follows:

### 3.1. `interviews`
Tracks the metadata of the scheduled and live meetings.
* **`id`** (`INTEGER PRIMARY KEY AUTOINCREMENT`): Unique identifier.
* **`company_id`** (`INTEGER NOT NULL`): References `company_profiles`.
* **`job_id`** (`INTEGER NOT NULL`): References `jobs`.
* **`student_id`** (`INTEGER NOT NULL`): References `student_profiles` (or `users`).
* **`title`** (`TEXT`): Session name (e.g., "Technical Assessment").
* **`interview_type`** (`TEXT`): Type (e.g., `VIDEO_CALL`, `MCQ`, `LIVE_CODING`).
* **`scheduled_start`** / **`scheduled_end`** (`DATETIME`): Session timing.
* **`status`** (`TEXT`): Progress state (`SCHEDULED`, `LIVE`, `COMPLETED`, `CANCELLED`).

### 3.2. `notifications`
Handles real-time and in-app informational notifications for students and recruiters.
* **`id`** (`INTEGER PRIMARY KEY AUTOINCREMENT`)
* **`user_id`** (`INTEGER NOT NULL`): The recipient user's ID.
* **`title`** (`TEXT`): Subject line.
* **`message`** (`TEXT`): Notification content.
* **`type`** (`TEXT`): Target route/topic (e.g., `INTERVIEW`, `ANNOUNCEMENT`, `JOB`).
* **`is_read`** (`INTEGER DEFAULT 0`): Status flag (unread: 0, read: 1).
* **`created_at`** (`DATETIME DEFAULT CURRENT_TIMESTAMP`)

### 3.3. `interview_transcript_segments`
Maintains speech-to-text transcript dialogue logs in real-time.
* **`id`** (`INTEGER PRIMARY KEY AUTOINCREMENT`)
* **`interview_id`** (`INTEGER NOT NULL`)
* **`speaker_role`** (`TEXT`): `STUDENT` or `INTERVIEWER`.
* **`text`** (`TEXT`): Transcribed message content.

### 3.4. `interview_reports`
Stores compiled metrics and Google Gemini analysis.
* **`id`** (`INTEGER PRIMARY KEY AUTOINCREMENT`)
* **`interview_id`** (`INTEGER NOT NULL`)
* **`report_json`** (`TEXT`): Detailed stringified JSON report conforming to standard layout criteria.
* **`generated_by_ai_model`** (`TEXT`): AI Model details (e.g., `gemini-3.5-flash`).

---

## 4. End-to-End Operational Flows

### 4.1. Core Scheduling & Invitation Flow
```
Recruiter Schedules Interview 
  ──> DB writes row in 'interviews' status='SCHEDULED' 
  ──> DB writes 'notifications' for user_id = studentUserId
  ──> Student logs in, real-time notification drops or navbar loads notifications
  ──> Student Profile loads 'Scheduled Interviews' containing the custom Join button
```

### 4.2. Proctoring & Real-Time Security Flow
When the student enters the **Live Video Interview Room**:
1. The client establishes a continuous WebSocket channel connected via Socket.io.
2. Web camera streams and audio are initialized inside the secure iFrame context.
3. If the student changes tabs or minimizes pages:
   * **`visibilitychange`** and **`blur`** events trigger on the client-side.
   * A payload `{ type: "TAB_SWITCH", timestamp: ... }` is sent to the backend.
   * The backend emits an instant alert **`proctoring_notification`** to the recruiter's active monitor panel in real-time.
   * Proctoring violations are securely logged to ensure exam integrity.

### 4.3. Evaluation & AI Report Compilation Flow
When the interview is completed:
1. All captured conversation transcripts are passed to the **Google Gemini API (using gemini-3.5-flash)**.
2. The AI generates detailed analytics enclosing **Communication Score, Technical Depth, Problem Solving, and Overall Fit**, paired with a faithful Q&A transcription audit.
3. The response is written into `interview_reports` inside the database.
4. The Recruiter reviews the final evaluation and publishes it, triggering an automated email notification regarding completion.

---

## 5. API Reference & Verbs

### 5.1. Interviews API (`/api/interviews`)

* **`GET /api/interviews/student`**
  * **Role**: Student
  * **Payload**: None
  * **Action**: Fetches all interviews mapped to the currently authenticated Student.
  * **Response**: `[ { "id": 6, "status": "SCHEDULED", "title": "Technical Interview - Room 6", ... } ]`

* **`POST /api/interviews/schedule`**
  * **Role**: Company
  * **Payload**: `{ "studentId": 4, "jobId": 1, "title": "...', ... }`
  * **Action**: Schedules and registers a room with standard notifications in the DB.

### 5.2. Notifications API (`/api/students/notifications`)

* **`GET /api/students/notifications/:userId`**
  * **Role**: All Roles
  * **Action**: Retrieves the notifications log for the given User ID.
  * **Response**: `{ "success": true, "data": [ { "id": 1, "title": "...", "is_read": 0 } ] }`

* **`POST /api/students/notifications/read/:id`**
  * **Role**: All Roles
  * **Action**: Marks the specific notification ID as read (`is_read = 1`).

* **`POST /api/students/notifications/read-all/:userId`**
  * **Role**: All Roles
  * **Action**: Marks all notifications of the given User ID as read.

---

## 6. Critical Fixes Applied for Production Integrity

During regression testing and production evaluation, the following critical improvements were successfully implemented:

1. **Deployment & Bundler Resolution (`server/routes/ai.ts`)**:
   * *Issue*: Underproduction bundles compiled with `esbuild`, `createRequire(import.meta.url)` crashed with `ERR_INVALID_ARG_VALUE` because `import.meta.url` returned `undefined` in CommonJS.
   * *Resolution*: Resolved by writing an automatic, sandboxed fallback utilizing standard commonJS variables (`__filename` or `process.cwd()`) to initialize `createRequire` securely, keeping the Cloud Run engine running flawlessly.

2. **Data Structure Standardizations (`server/routes/student.ts`)**:
   * *Issue*: When fetching student profiles, the SQLite database returned properties in `snake_case` (e.g., `tech_stack`, `is_current`, `issuing_organization`, `credential_url`), whereas the frontend visual modules in `StudentProfile.tsx` relied on `camelCase` representations (`techStack`, `isCurrent`, `issuingOrganization`, `credentialUrl`), resulting under empty data components on student pages.
   * *Resolution*: Standardized matching layers inside both the Express controller routes and the React components (`StudentProfile.tsx`) to support both `snake_case` and `camelCase` properties interchangeably.

3. **Seeding Environment Expansion (`server/db.ts`)**:
   * *Issue*: Developers running local environments with user accounts `svkatageri18@gmail.com` or `svkatageri19@gmail.com` were missing preset mock-rooms.
   * *Resolution*: Automatically seeds mock-rooms (Room 6 and Room 8) paired with pre-made unread notifications for both users, making the app runnable and auditable on external machines instantly.
