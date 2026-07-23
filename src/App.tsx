import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import React, { Suspense, lazy } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext.tsx";
import { LanguageProvider } from "./context/LanguageContext.tsx";
import { AccessibilityProvider } from "./context/AccessibilityContext.tsx";
import { SidebarProvider } from "./context/SidebarContext.tsx";
import { Navbar } from "./components/Navbar.tsx";
import { Toaster } from "react-hot-toast";
import { AIFloatingCompanion } from "./components/ai/AIFloatingCompanion.tsx";
import { ActivityTracker } from "./components/ActivityTracker.tsx";
import { motion } from "motion/react";
import { Loader2, Sparkles, Cpu } from "lucide-react";

// Synchronous core/public pages
import { Home } from "./pages/Home.tsx";
import { About } from "./pages/About.tsx";
import { Contact } from "./pages/Contact.tsx";
import { PrivacyPolicy } from "./pages/PrivacyPolicy.tsx";
import { TermsConditions } from "./pages/TermsConditions.tsx";
import { Login } from "./pages/Login.tsx";
import { Register } from "./pages/Register.tsx";
import { VerifyEmail } from "./pages/VerifyEmail.tsx";
import { ForgotPassword } from "./pages/ForgotPassword.tsx";
import { ResetPassword } from "./pages/ResetPassword.tsx";
const ForcePasswordChange = lazy(() => import("./pages/ForcePasswordChange.tsx"));

// Lazy-loaded dashboard & specialized experience components (Frontend Optimization)
const StudentDashboard = lazy(() => import("./pages/dashboards/StudentDashboard.tsx").then(module => ({ default: module.StudentDashboard })));
const CompanyLayout = lazy(() => import("./components/company/CompanyLayout.tsx").then(module => ({ default: module.CompanyLayout })));
const CompanyDashboard = lazy(() => import("./pages/dashboards/CompanyDashboard.tsx").then(module => ({ default: module.CompanyDashboard })));
const ActiveJobsPage = lazy(() => import("./pages/company/ActiveJobsPage.tsx").then(module => ({ default: module.ActiveJobsPage })));
const ApplicantsPage = lazy(() => import("./pages/company/ApplicantsPage.tsx").then(module => ({ default: module.ApplicantsPage })));
const PipelineBoard = lazy(() => import("./pages/company/PipelineBoard.tsx").then(module => ({ default: module.PipelineBoard })));
const AnalyticsDashboard = lazy(() => import("./pages/company/AnalyticsDashboard.tsx").then(module => ({ default: module.AnalyticsDashboard })));
const InterviewCenter = lazy(() => import("./pages/company/InterviewCenter.tsx").then(module => ({ default: module.InterviewCenter })));
const JobPostingPage = lazy(() => import("./pages/company/JobPostingPage.tsx").then(module => ({ default: module.JobPostingPage })));
const JobTrackingDashboard = lazy(() => import("./pages/company/JobTrackingDashboard.tsx").then(module => ({ default: module.JobTrackingDashboard })));
const CompanyProfile = lazy(() => import("./pages/CompanyProfile.tsx").then(module => ({ default: module.CompanyProfile })));
const CompanySettingsPage = lazy(() => import("./pages/company/CompanySettingsPage.tsx").then(module => ({ default: module.CompanySettingsPage })));
const CompanyAssessments = lazy(() => import("./pages/company/CompanyAssessments.tsx"));
const CompanyDropsPage = lazy(() => import("./pages/company/CompanyDropsPage.tsx").then(module => ({ default: module.CompanyDropsPage })));
const RecommendationsTab = lazy(() => import("./pages/company/RecommendationsTab.tsx").then(module => ({ default: module.RecommendationsTab })));
const HrManagement = lazy(() => import("./pages/company/HrManagement.tsx").then(module => ({ default: module.HrManagement })));
const AuditTrail = lazy(() => import("./pages/company/AuditTrail.tsx").then(module => ({ default: module.AuditTrail })));

const AdminLayout = lazy(() => import("./components/admin/AdminLayout.tsx").then(module => ({ default: module.AdminLayout })));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard.tsx").then(module => ({ default: module.AdminDashboard })));
const AdminIntelligencePage = lazy(() => import("./pages/admin/AdminIntelligencePage.tsx"));
const StudentManagement = lazy(() => import("./pages/admin/StudentManagement.tsx").then(module => ({ default: module.StudentManagement })));
const CompanyManagement = lazy(() => import("./pages/admin/CompanyManagement.tsx").then(module => ({ default: module.CompanyManagement })));
const JobManagement = lazy(() => import("./pages/admin/JobManagement.tsx").then(module => ({ default: module.JobManagement })));
const ApplicationTracking = lazy(() => import("./pages/admin/ApplicationTracking.tsx").then(module => ({ default: module.ApplicationTracking })));
const AdminMonitoring = lazy(() => import("./pages/admin/AdminMonitoring.tsx").then(module => ({ default: module.AdminMonitoring })));
const AdminLogs = lazy(() => import("./pages/admin/AdminLogs.tsx").then(module => ({ default: module.AdminLogs })));
const PsychometricManagement = lazy(() => import("./pages/admin/PsychometricManagement.tsx").then(module => ({ default: module.PsychometricManagement })));
const PricingManagement = lazy(() => import("./pages/admin/PricingManagement.tsx").then(module => ({ default: module.PricingManagement })));
const TPOManagement = lazy(() => import("./pages/admin/TPOManagement.tsx"));
const StaffManagement = lazy(() => import("./pages/admin/StaffManagement.tsx").then(module => ({ default: module.StaffManagement })));

// TPO specialized experience components
const TPOLayout = lazy(() => import("./components/tpo/TPOLayout.tsx").then(module => ({ default: module.TPOLayout })));
const TPODashboard = lazy(() => import("./pages/tpo/TPODashboard.tsx"));
const TPOStudents = lazy(() => import("./pages/tpo/TPOStudents.tsx"));
const TPOColleges = lazy(() => import("./pages/tpo/TPOColleges.tsx"));
const TPOEvents = lazy(() => import("./pages/tpo/TPOEvents.tsx"));
const TPOAnalytics = lazy(() => import("./pages/tpo/TPOAnalytics.tsx"));
const TPOAssessments = lazy(() => import("./pages/tpo/TPOAssessments.tsx"));
const TPOSkillGap = lazy(() => import("./pages/tpo/TPOSkillGap.tsx"));
const TPOVerification = lazy(() => import("./pages/tpo/TPOVerification.tsx"));
const TPOReports = lazy(() => import("./pages/tpo/TPOReports.tsx"));
const TPONotifications = lazy(() => import("./pages/tpo/TPONotifications.tsx"));

const XPStore = lazy(() => import("./pages/XPStore.tsx").then(module => ({ default: module.XPStore })));
const XPWallet = lazy(() => import("./pages/student/XPWallet.tsx").then(module => ({ default: module.XPWallet })));
const ReferAndEarn = lazy(() => import("./pages/student/ReferAndEarn.tsx").then(module => ({ default: module.ReferAndEarn })));
const InterviewPage = lazy(() => import("./pages/ai/InterviewPage.tsx").then(module => ({ default: module.InterviewPage })));
const InterviewEnded = lazy(() => import("./pages/ai/InterviewEnded.tsx").then(module => ({ default: module.InterviewEnded })));
const ResumeBuilder = lazy(() => import("./pages/ai/ResumeBuilder.tsx").then(module => ({ default: module.ResumeBuilder })));
const JobTest = lazy(() => import("./pages/jobs/JobTest.tsx").then(module => ({ default: module.JobTest })));
const StudentProfile = lazy(() => import("./pages/StudentProfile.tsx").then(module => ({ default: module.StudentProfile })));
const JobStageActionPage = lazy(() => import("./pages/JobStageActionPage.tsx").then(module => ({ default: module.JobStageActionPage })));
const AllJobsPage = lazy(() => import("./pages/student/AllJobsPage.tsx").then(module => ({ default: module.AllJobsPage })));
const AppliedJobsPage = lazy(() => import("./pages/student/AppliedJobsPage.tsx").then(module => ({ default: module.AppliedJobsPage })));
const StudentInterviews = lazy(() => import("./pages/student/StudentInterviews.tsx").then(module => ({ default: module.StudentInterviews })));
const MockHistoryPage = lazy(() => import("./pages/student/MockHistoryPage.tsx").then(module => ({ default: module.MockHistoryPage })));
const PsychometricTest = lazy(() => import("./pages/psychometric/PsychometricTest.tsx").then(module => ({ default: module.PsychometricTest })));
const IntelligenceDashboard = lazy(() => import("./pages/student/IntelligenceDashboard.tsx"));
const IntelligenceTestView = lazy(() => import("./pages/student/IntelligenceTestView.tsx"));
const OnboardingPage = lazy(() => import("./pages/student/OnboardingPage.tsx").then(module => ({ default: module.OnboardingPage })));
const CareerGapAnalyzer = lazy(() => import("./pages/student/CareerGapAnalyzer.tsx"));
const CollegeAssessments = lazy(() => import("./pages/student/CollegeAssessments.tsx"));

// AI Quiz System
// Trigger file watcher refresh
const QuizConfigPage = lazy(() => import("./pages/ai/QuizConfigPage.tsx").then(module => ({ default: module.QuizConfigPage })));
const QuizSessionPage = lazy(() => import("./pages/ai/QuizSessionPage.tsx").then(module => ({ default: module.QuizSessionPage })));
const QuizResultPage = lazy(() => import("./pages/ai/QuizResultPage.tsx").then(module => ({ default: module.QuizResultPage })));
const QuizHistoryPage = lazy(() => import("./pages/ai/QuizHistoryPage.tsx").then(module => ({ default: module.QuizHistoryPage })));

// AI Coding Analysis System
const CodingConnectPage = lazy(() => import("./pages/coding/CodingConnectPage.tsx").then(module => ({ default: module.CodingConnectPage })));
const CodingAnalyticsDashboard = lazy(() => import("./pages/coding/CodingAnalyticsDashboard.tsx").then(module => ({ default: module.CodingAnalyticsDashboard })));
const Community = lazy(() => import("./pages/Community.tsx").then(module => ({ default: module.Community })));
const LiveInterviewRoom = lazy(() => import("./pages/interview/LiveInterviewRoom.tsx").then(module => ({ default: module.LiveInterviewRoom })));

import { StudentLayout } from "./components/student/StudentLayout.tsx";

function GlobalSpinner() {
  return (
    <div className="min-h-screen bg-[#070b19] flex flex-col items-center justify-center p-6 relative overflow-hidden select-none">
      {/* Futurist Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35" />
      
      {/* Dynamic Glowing Accents */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 flex flex-col items-center max-w-sm">
        {/* Pulsing Outer Shield with rotating gradient border */}
        <div className="relative mb-8 select-none">
          {/* Pulsing glow background */}
          <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur-xl opacity-20 animate-pulse" />
          
          {/* Spinning gradient ring */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
            className="absolute -inset-[1.5px] bg-gradient-to-tr from-indigo-500 via-transparent to-purple-600 rounded-2xl"
          />
          
          {/* Central icon container */}
          <div className="relative w-16 h-16 bg-[#0c1224] border border-[#202c54] rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-950/50">
            <Cpu size={26} className="text-indigo-400 animate-pulse" />
          </div>
          
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full flex items-center justify-center shadow-lg border border-[#070b19]">
            <Sparkles size={11} className="fill-white text-indigo-400" />
          </div>
        </div>

        {/* Elegant Display Labels */}
        <h2 className="text-base font-black text-slate-100 uppercase tracking-[0.25em] mb-2 leading-none">
          VEGA Career
        </h2>
        
        <div className="flex items-center gap-2 justify-center mb-6">
          <Loader2 size={13} className="text-indigo-400 animate-spin" />
          <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest leading-none">
            Assembling intelligent views...
          </p>
        </div>

        {/* Minimal Stretched Progress Line */}
        <div className="w-44 h-[2px] bg-slate-900 border border-slate-800/10 rounded-full overflow-hidden relative">
          <motion.div 
            animate={{ 
              x: ["-100%", "100%"] 
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 1.5, 
              ease: "easeInOut" 
            }}
            className="absolute top-0 bottom-0 left-0 w-24 bg-gradient-to-r from-transparent via-indigo-400 to-transparent rounded-full"
          />
        </div>
      </div>
    </div>
  );
}

function PrivateRoute({ children, role }: { children: any, role?: string }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <GlobalSpinner />;
  }

  if (!user) return <Navigate to="/login" replace />;
  if (role) {
    if (role === "ADMIN" && (user.role === "ADMIN" || user.role === "SUPER_ADMIN")) return children;
    if (user.role !== role) return <Navigate to="/" replace />;
  }
  return children;
}

import CollegeUpdates from './pages/student/CollegeUpdates.tsx';

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AccessibilityProvider>
          <Toaster position="top-right" />
      <Router>
        <ActivityTracker />
        <SidebarProvider>
          <div className="min-h-screen bg-brand-bg relative">
          <Navbar />
          <Suspense fallback={<GlobalSpinner />}>
            <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsConditions />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/force-password-change" element={<ForcePasswordChange />} />
            
            <Route element={
              <PrivateRoute role="STUDENT">
                <StudentLayout />
              </PrivateRoute>
            }>
              <Route path="/student" element={<StudentDashboard />} />
              <Route path="/student/college" element={<CollegeUpdates />} />
              <Route path="/student/mock-history" element={<MockHistoryPage />} />
              <Route path="/xp-store" element={<XPStore />} />
              <Route path="/xp-wallet" element={<XPWallet />} />
              <Route path="/refer-and-earn" element={<ReferAndEarn />} />
              <Route path="/interview" element={<InterviewPage />} />
              <Route path="/interview-ended" element={<InterviewEnded />} />
              <Route path="/resume-builder" element={<ResumeBuilder />} />
              <Route path="/ai-quiz" element={<QuizConfigPage />} />
              <Route path="/ai-quiz/session/:id" element={<QuizSessionPage />} />
              <Route path="/ai-quiz/result/:id" element={<QuizResultPage />} />
              <Route path="/ai-quiz/history" element={<QuizHistoryPage />} />
              <Route path="/coding-connect" element={<CodingConnectPage />} />
              <Route path="/coding-analytics" element={<CodingAnalyticsDashboard />} />
              <Route path="/psychometric-test" element={<PsychometricTest />} />
              <Route path="/student/intelligence" element={<IntelligenceDashboard />} />
              <Route path="/student/intelligence/:type" element={<IntelligenceTestView />} />
              <Route path="/career-gap" element={<CareerGapAnalyzer />} />
              <Route path="/student/college-assessments" element={<CollegeAssessments />} />
              <Route path="/test/:jobId" element={<JobTest />} />
              <Route path="/profile" element={<StudentProfile />} />
              <Route path="/student/application/:appId" element={<JobStageActionPage />} />
              <Route path="/jobs" element={<AllJobsPage />} />
              <Route path="/applied-jobs" element={<AppliedJobsPage />} />
              <Route path="/student/interviews" element={<StudentInterviews />} />
              <Route path="/community" element={<Community />} />
            </Route>

            <Route path="/onboarding" element={
              <PrivateRoute role="STUDENT">
                <OnboardingPage />
              </PrivateRoute>
            } />

            <Route path="/company" element={<CompanyLayout />}>
              <Route index element={<CompanyDashboard />} />
              <Route path="profile" element={<CompanyProfile />} />
              <Route path="settings" element={<CompanySettingsPage />} />
              <Route path="jobs" element={<ActiveJobsPage />} />
              <Route path="jobs/new" element={<JobPostingPage />} />
              <Route path="jobs/tracking/:jobId" element={<JobTrackingDashboard />} />
              <Route path="applicants" element={<ApplicantsPage />} />
              <Route path="pipeline" element={<PipelineBoard />} />
              <Route path="analytics" element={<AnalyticsDashboard />} />
              <Route path="interviews" element={<InterviewCenter />} />
              <Route path="assessments" element={<CompanyAssessments />} />
              <Route path="drops" element={<CompanyDropsPage />} />
              <Route path="recommendations" element={<RecommendationsTab />} />
              <Route path="hr-management" element={<HrManagement />} />
              <Route path="audit-trail" element={<AuditTrail />} />
            </Route>

            <Route path="/interview/live/:interviewId" element={
              <PrivateRoute>
                <LiveInterviewRoom />
              </PrivateRoute>
            } />

            <Route path="/tpo" element={<TPOLayout />}>
                <Route index element={<TPODashboard />} />
                <Route path="students" element={<TPOStudents />} />
                <Route path="colleges" element={<TPOColleges />} />
                <Route path="events" element={<TPOEvents />} />
                <Route path="analytics" element={<TPOAnalytics />} />
                <Route path="assessments" element={<TPOAssessments />} />
                <Route path="skill-gap" element={<TPOSkillGap />} />
                <Route path="verification" element={<TPOVerification />} />
                <Route path="reports" element={<TPOReports />} />
                <Route path="notifications" element={<TPONotifications />} />
              </Route>
            
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="staff" element={<StaffManagement />} />
              <Route path="tpo" element={<TPOManagement />} />
              <Route path="students" element={<StudentManagement />} />
              <Route path="companies" element={<CompanyManagement />} />
              <Route path="jobs" element={<JobManagement />} />
              <Route path="applications" element={<ApplicationTracking />} />
              <Route path="monitoring" element={<AdminMonitoring />} />
              <Route path="psychometric" element={<PsychometricManagement />} />
              <Route path="intelligence" element={<AdminIntelligencePage />} />
              <Route path="pricing" element={<PricingManagement />} />
              <Route path="logs" element={<AdminLogs />} />
            </Route>
          </Routes>
          </Suspense>
          <AIFloatingCompanion />
        </div>
        </SidebarProvider>
      </Router>
        </AccessibilityProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}