# VEGA Frontend Analysis Report

## Executive Summary

VEGA is a comprehensive talent acquisition platform built with React 19, featuring:
- **Multi-role support**: Students, Companies, Admins
- **AI-powered features**: Mock interviews, resume building, career mentorship
- **Gamification system**: VEGA XP Wallet, referrals, leaderboard
- **Advanced assessments**: Psychometric tests (PQ/IQ/EQ/SQ), dynamic quizzes, coding challenges
- **State Management**: React Context API (No Redux)
- **Validation**: Formik + Yup
- **Styling**: Tailwind CSS 4.1 + Motion animations
- **Internationalization**: English & Marathi

---

## 1. Page Structure

### Public Pages (Unauthenticated)
| Page | Route | Purpose |
|------|-------|---------|
| Home | / | Landing page with feature showcase and animated counters |
| Login | /login | User authentication with email/password |
| Register | /register | User registration with role selection (Student/Company) |
| Verify Email | /verify-email | OTP verification for email confirmation |
| Forgot Password | /forgot-password | Password reset initiation |
| Reset Password | /reset-password/:token | Complete password reset with token |
| About | /about | Platform information |
| Contact | /contact | Contact/feedback form |
| Privacy Policy | /privacy-policy | Legal privacy documentation |
| Terms & Conditions | /terms | Legal terms of service |

### Student Pages
| Page | Route | Purpose |
|------|-------|---------|
| Student Dashboard | /student | Main hub: metrics, job matches, AI mentorship |
| All Jobs | /student/jobs | Browse and filter available job listings |
| Applied Jobs | /student/applied-jobs | Track application status and test schedules |
| VEGA XP Wallet | /student/xp-wallet | XP balance, transactions, daily rewards |
| Mock History | /student/mock-history | Previous mock interview evaluations |
| Intelligence Dashboard | /student/intelligence | PQ/IQ/EQ/SQ test status and AI insights |
| Intelligence Test | /student/intelligence/test | Take psychometric assessment tests |
| Onboarding | /student/onboarding | Profile setup wizard |
| Profile | /student/profile | Comprehensive profile editor (education, experience, skills, resume, certificates) |

### Company Pages
| Page | Route | Purpose |
|------|-------|---------|
| Company Dashboard | /company | Main company hub with overview metrics |
| Active Jobs | /company/jobs | View all posted jobs |
| Job Posting | /company/jobs/new | Create/edit job listings with hiring stages |
| Applicants | /company/applicants | Review candidate applications |
| Pipeline Board | /company/pipeline | Kanban board for applicant stage management |
| Job Tracking | /company/job-tracking | Detailed job metrics and bulk actions |
| Interview Center | /company/interviews | Manage interview schedules and feedback |
| Analytics | /company/analytics | Hiring metrics and performance data |
| Settings | /company/settings | Company profile configuration |

### AI/Interview Pages
| Page | Route | Purpose |
|------|-------|---------|
| Interview | /ai/interview | Live AI mock interview with Gemini Live API |
| Interview Results | /ai/interview/end | Interview feedback and metrics |
| Resume Builder | /ai/resume | AI-powered resume generator with ATS optimization |
| Quiz Config | /ai/quiz/config | Configure AI-generated assessments |
| Quiz Session | /ai/quiz/:quizId | Take dynamic quiz |
| Quiz Results | /ai/quiz/result | View quiz performance metrics |
| Quiz History | /ai/quiz/history | Assessment history and analytics |

### Admin Pages
| Page | Route | Purpose |
|------|-------|---------|
| Admin Dashboard | /admin | Platform overview and KPIs |
| Student Management | /admin/students | Manage student accounts |
| Company Management | /admin/companies | Manage company accounts and verification |
| Job Management | /admin/jobs | Monitor all job postings |
| Application Tracking | /admin/applications | Track applications across platform |
| Intelligence Admin | /admin/intelligence | Manage psychometric tests |
| Monitoring | /admin/monitoring | Platform health and system status |
| Logs | /admin/logs | System activity logs and audit trail |
| Psychometric Mgmt | /admin/psychometric | Manage psychometric assessments |
| Pricing Mgmt | /admin/pricing | Manage XP packages and pricing |

### Other Pages
| Page | Route | Purpose |
|------|-------|---------|
| Job Stage Actions | /job-stage-action/:stageId | Perform actions on job application stages |
| VEGA Rewards Center | /xp-store | Purchase XP points via Razorpay |
| Community | /community | Community posts, leaderboard, creator analytics |
| Psychometric Test | /psychometric | Personality and ability assessments |
| Coding Connect | /coding/connect | Coding challenge arena |
| Coding Analytics | /coding/analytics | Coding performance analytics |
| Company Profile | /company/profile | Company registration and document upload |

---

## 2. Component Architecture

### Layout Components
```
src/components/
├── Navbar.tsx                    # Main navigation bar with user menu
├── Footer.tsx                    # Footer component
├── HiringTimeline.tsx           # Visual timeline for hiring process
├── PreInterviewOnboarding.tsx    # Pre-interview setup and consent
├── ConsentModal.tsx              # Recording/data collection consent
```

### Student Feature Components
```
src/components/student/
├── StudentLayout.tsx             # Dashboard wrapper with sidebar
├── StudentSidebar.tsx            # Navigation sidebar for student
├── ReportModal.tsx               # Issue/feedback reporting modal
```

### Company Feature Components
```
src/components/company/
├── CompanyLayout.tsx             # Dashboard wrapper with sidebar
├── CompanySidebar.tsx            # Navigation sidebar for company
├── CandidateTable.tsx            # Table of job applicants
├── CandidateDetailModal.tsx      # Detailed candidate information modal
├── JobCard.tsx                   # Job listing card component
├── AnalyticsCard.tsx             # Hiring metrics card
├── AIInsightsPanel.tsx           # AI-powered hiring recommendations
├── HiringHealthPanel.tsx         # Pipeline health metrics visualization
├── NotificationPanel.tsx         # Notification management
```

### Admin Feature Components
```
src/components/admin/
├── AdminLayout.tsx               # Dashboard wrapper with sidebar
├── AdminSidebar.tsx              # Navigation sidebar for admin
```

### Specialized Components
```
src/components/ai/
├── AIFloatingCompanion.tsx       # Floating AI chat assistant

src/components/xp/
├── XPWalletCard.tsx              # XP balance display
├── ReferralSection.tsx           # Referral rewards section

src/components/intelligence/
├── AntiCheatWrapper.tsx          # Anti-cheat monitoring wrapper
```

---

## 3. API Integration & Data Flow

### API Service Architecture
- **Base URL**: `/api`
- **Request Interceptor**: Automatically injects `Authorization: Bearer {token}` header
- **Response Interceptor**: 
  - Handles 401 responses by attempting token refresh
  - Redirects to login on failed refresh
  - Logs all errors

### API Endpoint Categories

#### Authentication APIs
```
POST   /auth/login                  Login with email/password
POST   /auth/register               User registration
POST   /auth/verify-otp             Verify OTP sent to email
POST   /auth/send-otp               Send OTP to email
POST   /auth/forgot-password        Initiate password reset
POST   /auth/reset-password         Complete password reset
POST   /auth/logout                 Logout user
POST   /auth/refresh-token          Refresh JWT token
```

#### Student Profile APIs
```
GET    /students/profile/{userId}                    Get profile
PUT    /students/profile/{userId}/section/{name}     Update profile section
POST   /students/upload-resume/{userId}              Upload resume (multipart)
POST   /students/upload-avatar/{userId}              Upload avatar (multipart)
POST   /students/upload-certificate/{userId}         Upload certificate (multipart)
GET    /students/suggest-institutions                Institution autocomplete
PUT    /students/profile/{userId}/section/onboarding Complete onboarding
```

#### Company Profile APIs
```
GET    /companies/profile/{userId}              Get company profile
PUT    /companies/profile/{userId}              Update company profile
POST   /companies/profile/{userId}/documents    Upload documents
POST   /companies/profile/{userId}/submit       Submit for verification
```

#### Job Management APIs
```
POST   /jobs                              Create job posting
GET    /jobs                              List all jobs
GET    /jobs/{jobId}                      Get job details
GET    /jobs/{jobId}/applicants           Get job applicants
GET    /jobs/student/{studentId}          Get student's applied jobs
GET    /jobs/student/active-tests/{id}    Get active job tests
GET    /jobs/student-full-details/{id}    Get detailed student info
GET    /jobs/test-schedules/{jobId}       Get scheduled tests
GET    /companies/tests/{jobId}           Get company's tests
POST   /jobs/apply                        Apply to a job
POST   /jobs/update-stage                 Move applicant through pipeline
POST   /jobs/bulk-action                  Bulk update applicants
POST   /jobs/schedule-test                Schedule assessment test
POST   /jobs/applications/submit-test     Submit test responses
```

#### AI & Resume APIs
```
GET    /ai/live-key                       Fetch Gemini Live API key
POST   /ai/analyze-sentence               Analyze spoken response
POST   /ai/career-mentor                  Get AI career guidance
POST   /ai/analyze-resume-text            Analyze resume text
POST   /ai/queue-interview-evaluation     Submit interview for evaluation
GET    /ai/history/{userId}               Get mock interview history
POST   /ai/optimize-keywords              Optimize resume keywords
```

#### Quiz & Assessment APIs
```
POST   /quiz/generate                     Generate AI quiz
GET    /quiz/history/{userId}             Get quiz history
POST   /quiz/submit                       Submit quiz responses
GET    /psychometric/questions            Get psychometric questions
POST   /psychometric/start                Start test attempt
POST   /psychometric/submit               Submit test
POST   /psychometric/violation            Report test violation
GET    /intelligence/questions/{type}     Get intelligence questions
POST   /intelligence/submit/{type}        Submit intelligence test
GET    /intelligence/status               Get test status
POST   /intelligence/generate-summary     Generate AI summary
```

#### XP & Gamification APIs
```
GET    /xp/balance                        Get current XP balance
GET    /xp/transactions                   Get transaction history
POST   /xp/claim-daily                    Claim daily reward
GET    /xp/referrals                      Get referral bonuses
GET    /xp/packages                       Get VEGA Rewards Purchase packages
POST   /xp/purchase/order                 Create payment order
POST   /xp/purchase/verify                Verify payment
```

#### Coding APIs
```
POST   /coding/connect                    Connect to coding arena
POST   /coding/run-tests                  Execute code tests
```

#### Analytics APIs
```
GET    /analytics/student/1               Get student analytics
GET    /analytics/employer/{userId}       Get company analytics
POST   /analytics/profile-view            Log profile view
POST   /analytics/check-in                Log daily check-in
GET    /analytics/admin/metrics           Get platform metrics
```

#### Community APIs
```
GET    /community/leaderboard             Get leaderboard
GET    /community/creator/analytics       Get creator stats
POST   /community/posts                   Create post
POST   /community/posts/validate          Validate post content
POST   /community/posts/validate-media    Validate media
```

#### Other APIs
```
GET    /resume/templates                  Get resume templates
POST   /resume/generate                   Generate resume
GET    /admin/companies/pending           Get pending verifications
GET    /admin/users                       Get all users
GET    /admin/jobs                        Get all jobs
POST   /admin/companies/verify            Verify company
GET    /accessibility/settings            Get accessibility settings
POST   /accessibility/settings            Save accessibility settings
```

---

## 4. State Management

### Context API Architecture
```
App.tsx
├── AuthProvider          # User, token, profile, login/logout
├── LanguageProvider      # Language selection (en/mr)
├── AccessibilityProvider # Accessibility settings
└── SidebarProvider       # Sidebar toggle state
```

### AuthContext Schema
```typescript
{
  user: {
    id: number
    email: string
    role: 'STUDENT' | 'COMPANY' | 'ADMIN' | 'SUPER_ADMIN'
    is_verified: boolean
  }
  token: string              // JWT access token
  refreshToken: string       // 7-day refresh token
  profile: {
    id: number
    name: string
    avatar: string
    // ... role-specific data
  }
  loading: boolean           // Initial load state
  login: (email, password) => Promise
  logout: () => void
  updateProfile: (data) => Promise
}
```

### Storage
- **localStorage.vega_auth**: Persists user session
- **sessionStorage**: Interview session resumption data
- **localStorage**: Consent preferences

---

## 5. Authentication Flow

### User Registration
1. Fill registration form (email, password, role)
2. Formik validation (password strength: min 8 chars, uppercase, lowercase, number, special char)
3. POST `/auth/register` → Returns success message
4. Redirect to email verification page
5. Receive OTP via email
6. Enter OTP → POST `/auth/verify-otp` → Account verified

### User Login
1. Enter email and password
2. POST `/auth/login` → Returns:
   ```json
   {
     "user": { "id", "email", "role", "is_verified" },
     "token": "access_token",
     "refreshToken": "refresh_token",
     "profile": { /* profile data */ }
   }
   ```
3. Store in localStorage as `vega_auth`
4. Redirect based on role:
   - STUDENT → `/student`
   - COMPANY → `/company`
   - ADMIN/SUPER_ADMIN → `/admin`

### Token Management
- **Access Token**: 15-minute expiration
- **Refresh Token**: 7-day expiration
- **Refresh Flow**: 
  - On 401 response, attempt refresh with `refreshToken`
  - POST `/auth/refresh-token` → Returns new `token`
  - Retry original request
  - If refresh fails, logout and redirect to login

### Session Persistence
- On page load, check `localStorage.vega_auth`
- If exists, auto-login without requiring credentials
- Global `AuthProvider` manages this during app initialization

---

## 6. Form Validation Patterns

### Framework & Libraries
- **Formik**: Form state management
- **Yup**: Schema validation
- **Location**: `src/pages` and `src/components`

### Key Form Schemas

#### Login Form
```typescript
email: yup.string().email().required(),
password: yup.string().required(),
rememberMe: yup.boolean()
```

#### Registration Form
```typescript
email: yup.string().email().required(),
password: yup.string()
  .min(8, 'Min 8 characters')
  .matches(/[A-Z]/, 'Must have uppercase')
  .matches(/[a-z]/, 'Must have lowercase')
  .matches(/[0-9]/, 'Must have number')
  .matches(/[^a-zA-Z0-9]/, 'Must have special char')
  .required(),
companyName: yup.string().when('role', {
  is: 'COMPANY',
  then: yup.string().required()
}),
role: yup.string().oneOf(['STUDENT', 'COMPANY']).required()
```

#### Job Posting Form
- Multi-step form: Basic Info → Hiring Pipeline → Questions → Review
- Validates job title, location, experience level
- Dynamic hiring stages with stage-specific questions

#### Student Profile Form
- Modal-based section editing
- Validates education history, work experience, skills
- Resume upload with PDF validation
- Avatar upload with image format validation
- Certificate uploads

---

## 7. UI/UX Characteristics

### Design System
- **Framework**: Tailwind CSS 4.1
- **Color Scheme**: Professional dark/light theme support
- **Typography**: Responsive text sizing
- **Spacing**: Consistent padding/margin scale

### Animations & Motion
- **Library**: Motion (Framer Motion v12.23)
- **Common Animations**:
  - Page transitions
  - Fade in/out effects
  - Slide animations
  - Hover state animations
  - Loading spinners

### Responsive Design
- **Mobile-first approach**
- **Breakpoints**: tailwindcss responsive prefixes (sm, md, lg, xl)
- **Layout**: Flex/grid-based layouts
- **Navigation**: Hamburger menu on mobile, full sidebar on desktop

### User Feedback
- **Toast Notifications**: `react-hot-toast` for success/error/info messages
- **Loading States**: Global spinner during auth
- **Modal Dialogs**: For consent, confirmations, details
- **Form Errors**: Inline Formik error messages

---

## 8. Internationalization (i18n)

### Supported Languages
- English (en)
- Marathi (mr)

### Implementation
- **Library**: i18next + react-i18next
- **Translation Files**: `src/locales/{en,mr}.json`
- **Context**: LanguageProvider for global language switching
- **Usage**: `const { t } = useTranslation()` hook in components

---

## 9. Accessibility Features

### Implementation
- **Context**: AccessibilityProvider for settings management
- **Screen Reader Support**: ARIA labels, semantic HTML
- **Keyboard Navigation**: All interactive elements keyboard-accessible
- **Color Contrast**: Sufficient contrast ratios
- **Focus Management**: Visible focus indicators

---

## 10. Advanced Features

### AI Mock Interview
- **Real-time transcription** with TensorFlow.js face detection
- **Gemini Live API** for conversational AI
- **Anti-cheat monitoring**:
  - Face detection: Continuous monitoring
  - Tab switching detection: Alert user on multiple switches
  - Violation logging: Track violations in database
- **Session resumption**: Can refresh and continue interview
- **Performance metrics**: Technical depth, confidence, fluency, communication

### Resume AI Builder
- **Template selection** from predefined templates
- **AI analysis** of existing resume
- **ATS keyword optimization** for job relevance
- **PDF generation** for download
- **Multi-format export**

### Psychometric Testing
- **Test Types**: PQ (Personality), IQ (Intelligence), EQ (Emotional), SQ (Social/Spiritual)
- **Question bank** randomization
- **Anti-cheat**: Violation detection and logging
- **AI-generated summary** of personality traits and recommendations

### Dynamic Quiz Generation
- **AI-powered** question generation
- **Configurable difficulty**: Easy, Medium, Hard
- **Multiple question types**: MCQ, true/false, short-answer
- **Instant results** with explanations
- **History tracking** for performance analytics

### Coding Arena
- **Live code execution** environment
- **Test case validation**
- **Performance analytics** (speed, accuracy)
- **Leaderboard integration**

### Gamification System
- **XP Currency**: Earn through activities (login, interviews, quizzes, referrals)
- **Daily Rewards**: 50 XP base + 10 XP per streak day
- **Referral System**: 60 XP for referrer, 200 XP for new user
- **Leaderboard**: Global rankings
- **VEGA Rewards Center**: Purchase with Razorpay payment

---

## 11. Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19.0.1 |
| Router | React Router 7.14.2 |
| State | React Context API |
| Forms | Formik 2.4.9 + Yup 1.7.1 |
| Styling | Tailwind CSS 4.1.14 |
| Animations | Motion 12.23.24 (Framer Motion) |
| HTTP | Axios 1.16.1 |
| Notifications | React Hot Toast 2.6.0 |
| i18n | i18next 26.0.9 + react-i18next 17.0.6 |
| PDF | jsPDF 4.2.1 + html2canvas 1.4.1 |
| Excel | XLSX 0.18.5 |
| AI APIs | Google Gemini Live API |
| Face Detection | TensorFlow.js + MediaPipe |
| Payment | Razorpay (for VEGA Rewards Center) |
| Build Tool | Vite 6.2.3 |
| Language | TypeScript 5.8.2 |

---

## 12. Key Insights for Flutter Migration

### Critical Features to Port
1. **Multi-role authentication** with token refresh mechanism
2. **Complex profile management** with file uploads
3. **AI mock interview** with real-time transcription
4. **Psychometric testing** with anti-cheat monitoring
5. **Job application pipeline** with multi-stage tracking
6. **XP gamification** with payment integration
7. **Dynamic AI quizzes** from backend
8. **Community features** with leaderboard
9. **Internationalization** for multi-language support
10. **Accessibility features** for inclusive design

### UI Complexity Indicators
- **Heavy use of modals**: For candidate details, confirmations
- **Kanban board**: Drag-and-drop pipeline visualization
- **Real-time updates**: Job matches, notifications, interview events
- **Chart visualizations**: Analytics dashboards (via Recharts)
- **Animations**: Smooth transitions throughout the app

### State Management Considerations
- Simple Context API (no Redux) → Direct adaptation to Provider in Flutter
- User session persistence in localStorage → Flutter secure_storage
- Role-based navigation → GoRouter with guards
- Auto-refresh token mechanism → OkHttp/Dio interceptors

---

## 13. Developer Notes

### File Organization
```
src/
├── pages/           # Route components (one per page)
├── components/      # Reusable UI components
├── context/         # Context providers
├── services/        # API services, utilities
├── locales/         # Translation files
└── App.tsx          # Root component with routing
```

### API Call Pattern
```typescript
// Typically in useEffect or event handlers
try {
  const response = await axios.post('/api/endpoint', data);
  setData(response.data);
} catch (error) {
  toast.error(error.response?.data?.message || 'Error');
}
```

### Styling Pattern
```typescript
// Tailwind classes directly in JSX
<div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow">
```

---

## 14. Migration Ready Checklist

- [x] All pages documented
- [x] All API endpoints catalogued
- [x] Component hierarchy mapped
- [x] State management understood
- [x] Form validation rules extracted
- [x] Authentication flow documented
- [x] UI/UX patterns identified
- [x] Advanced features catalogued
- [x] Technology stack analyzed

**Ready for Phase 2: Flutter Architecture Design**
