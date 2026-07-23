# System Requirement Specification (SRS) - Video Interview Feature
## Project Name: VEGA Online Video Interview Module

### 1. Introduction
This document details the specifications, system design, architectural choices, and flows for the end-to-end securely proctored on-platform video interview module integrated into the VEGA Job Portal.

---

### 2. Architecture & Design Principles

#### 2.1 WebRTC with Socket.IO Signaling
The interview utilizes standard **room-based WebRTC peer-to-peer (or SFU-compatible peer-mesh)** media streaming.
- **Signaling**: Integrated inside the existing Socket.IO server.
- **Authentication**: JWT-based room authorization where only the scheduled Student and Company/PANEL users matched in database have signaling rights.
- **Privacy**: No media streams flow through the application server; signaling matches ICE candidates directly. No recording is saved unless consent/recording feature flag is enabled.

#### 2.2 Proctoring Precautions (Privacy-Friendly & Safe)
- **Tab/Window Focus**: Logs blur events with a timestamped metadata entry.
- **Fullscreen Enforcement**: Requests fullscreen upon joining, logs fullscreen exit events with severity `WARNING`.
- **Media Controls**: Monitors when track muted/camera disabled, logging occurrences in `interview_proctoring_events` with timestamps.
- **Screen Share**: Prompts for screen share if specified in instructions.

#### 2.3 AI MOM & Evaluation Engine (Gemini API)
- **Engine**: Invokes `gemini-3.5-flash` to process structural transcripts and question logs.
- **Output Validation**: Enforces structured JSON output matching exact guidelines, with safety fallbacks on parsing errors.

---

### 3. Database Schema

The module introduces several highly index-optimized tables:

1. **`interviews`**
   - Holds scheduled events for companies and students.
2. **`interview_participants`**
   - Manages who is authorized to join the WebRTC channel.
3. **`interview_room_sessions`**
   - Active calls, timestamps, and overall call logs.
4. **`interview_questions`**
   - Chronological logs of questions asked or fetched from templates.
5. **`interview_transcript_segments`**
   - Line-by-line dialog transcripts mapping speakers.
6. **`interview_proctoring_events`**
   - Logs cheating prevention signals during the call.
7. **`interview_reports`**
   - AI and human finalized Minutes of Meeting (MOM).
8. **`interview_notifications`**
   - Track emailed and in-app alerts.

---

### 4. Functional Walkthrough & Flow

```
[Company schedules Interview]
       │
       ▼
[System sends notification emails (Nodemailer) & creates Platform Alerts]
       │
       ▼
[Student & Interviewer enter Pre-Join Lobby -> Device Setup/Checks & Consent]
       │
       ▼
[WebRTC Room Session starts -> Realtime WebRTC communication + Signaling]
       ├─► Proctoring monitors Tab Actions, Camera status, and logs warnings
       └─► Speech-to-Text / Chat Transcript records conversations chronologically
       │
       ▼
[Interviewer ends session -> Backend generates structured AI report (Gemini)]
       │
       ▼
[Review/Finalize report -> Emails sent out with secure results and platform links]
```

---

### 5. API Definition

- `POST /api/interviews`: (Respected limits, Company-only) Schedule a session.
- `GET /api/interviews/company`: Retrieve interviews for the company user.
- `GET /api/interviews/student`: Retrieve interviews for the student user.
- `GET /api/interviews/:id`: Retrieve single interview details.
- `PUT /api/interviews/:id/reschedule`: Reschedule scheduled interview.
- `PUT /api/interviews/:id/cancel`: Cancel scheduled interview.
- `POST /api/interviews/:id/join-token`: Authorize joining, return room access credentials.
- `POST /api/interviews/:id/start`: Start room session (Company only).
- `POST /api/interviews/:id/end`: End session (Company only).
- `POST /api/interviews/:id/questions`: Add customized verbal/written question log.
- `POST /api/interviews/:id/transcript`: Add speech transcript chunk recursively.
- `POST /api/interviews/:id/generate-report`: Invoke Gemini generator.
- `PUT /api/interviews/:id/report/finalize`: Save draft and send notification emails.
- `GET /api/interviews/:id/report`: View MOM results.
