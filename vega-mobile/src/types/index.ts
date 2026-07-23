export interface User {
  id: number;
  email: string;
  role: "STUDENT" | "COMPANY" | "ADMIN";
  fullName?: string;
  token?: string;
  refreshToken?: string;
}

export interface TalentScoreBreakdown {
  skills: number;
  interview: number;
  coding: number;
  psychometric: number;
  academic: number;
}

export interface StudentDashboardData {
  talentScore: number;
  talentScoreBreakdown: TalentScoreBreakdown;
  xpBalance: number;
  streak: number;
  recommendedJobsCount: number;
  upcomingInterviews: Array<{
    id: number;
    companyName: string;
    role: string;
    scheduledAt: string;
    joinUrl?: string;
  }>;
}

export interface CodeProfile {
  platform: "LeetCode" | "CodeChef" | "Codeforces" | "GitHub" | "HackerRank";
  username: string;
  globalScore: number;
  solvedCount: number;
  updatedAt: string;
}

export interface Job {
  id: number;
  title: string;
  companyName: string;
  location: string;
  type: string; // Full-time, Internship, etc
  description: string;
  salary?: string;
  skillsRequired: string[];
}

export interface ApplicationTrackerStage {
  stage: "APPLIED" | "TEST" | "TECHNICAL_INTERVIEW" | "HR_INTERVIEW" | "SELECTED" | "REJECTED";
  completedAt?: string;
  comments?: string;
  status: "COMPLETED" | "ACTIVE" | "PENDING";
}

export interface RecruiterAnalytics {
  activeJobsCount: number;
  totalApplicants: number;
  interviewSchedules: number;
  funnelStages: {
    applied: number;
    test: number;
    technical: number;
    hr: number;
    hired: number;
  };
}

export interface Post {
  id: number;
  authorName: string;
  authorSub: string;
  title: string;
  content: string;
  likesCount: number;
  commentsCount: number;
  isUnlocked: boolean;
  xpUnlockCost?: number;
}
