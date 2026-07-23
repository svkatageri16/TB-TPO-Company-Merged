import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { StudentSidebar } from './StudentSidebar.tsx';
import { useSidebar } from '../../context/SidebarContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';

export function StudentLayout() {
  const { isSidebarCollapsed } = useSidebar();
  const { profile } = useAuth();
  const location = useLocation();

  // If onboarding is not completed, redirect to /onboarding
  if (profile && (profile.onboarding_completed === 0 || !profile.onboarding_completed)) {
    if (location.pathname !== '/onboarding') {
      return <Navigate to="/onboarding" replace />;
    }
  }

  // Force student to complete their profile first. If completeness score is under 70%, redirect to /profile
  if (profile && (profile.completeness_score || 0) < 70) {
    if (location.pathname !== '/profile' && location.pathname !== '/onboarding') {
      return <Navigate to="/profile" replace />;
    }
  }

  return (
    <div className="flex bg-[#F8FAFC] min-h-screen pt-20">
      <StudentSidebar />
      <main className={`flex-1 p-4 lg:p-6 pb-12 overflow-x-hidden transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <Outlet />
      </main>
    </div>
  );
}
