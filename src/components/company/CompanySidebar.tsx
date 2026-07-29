import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  GitBranch, 
  ClipboardCheck, 
  Video, 
  BarChart3, 
  Settings,
  Lock,
  LogOut,
  Zap,
  Sparkles,
  ScrollText,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'motion/react';
import { BRAND } from '../../brand';

interface CompanySidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export function CompanySidebar({ isCollapsed = false, onToggle }: CompanySidebarProps) {
  const { user, profile, logout } = useAuth();
  const isApproved = profile?.status === 'APPROVED';

  interface NavItem {
    to: string;
    icon: React.ComponentType<{ className?: string; size?: number }>;
    label: string;
    end?: boolean;
    isNew?: boolean;
    badgeCount?: number;
  }

  const navItems: NavItem[] = [
    { to: '/company', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/company/jobs', icon: Briefcase, label: 'Jobs' },
    { to: '/company/recommendations', icon: Sparkles, label: 'Hiring Copilot', isNew: true },
    { to: '/company/drops', icon: Zap, label: 'Drops' },
    { to: '/company/applicants', icon: Users, label: 'Applicants' },
    { to: '/company/pipeline', icon: GitBranch, label: 'Pipeline' },
    { to: '/company/interviews', icon: Video, label: 'Interviews' },
    { to: '/company/assessments', icon: ClipboardCheck, label: 'Assessments' },
    { to: '/company/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/company/hr-management', icon: Users, label: 'HR Management' },
    { to: '/company/audit-trail', icon: ScrollText, label: 'Audit Trail' },
    { to: '/company/settings', icon: Settings, label: 'Settings' },
  ];

  const permissionMapping: Record<string, string> = {
    '/company': 'Dashboard View',
    '/company/jobs': 'Jobs View',
    '/company/recommendations': 'Recommendations View',
    '/company/drops': 'Drops View',
    '/company/applicants': 'Applicants View',
    '/company/pipeline': 'Pipeline View',
    '/company/interviews': 'Interview View',
    '/company/assessments': 'Assessments View',
    '/company/analytics': 'Analytics View',
    '/company/hr-management': 'HR Management',
    '/company/audit-trail': 'Audit Trail View Own',
    '/company/settings': 'Company Profile View'
  };

  const allowedNavItems = navItems.filter(item => {
    // If user is a Super HR (not a Sub HR), they have all permissions
    if (profile && !profile.isSubHr) {
      return true;
    }

    // If no permission array is present, show all standard items by default
    if (!profile || !profile.permissions) {
      if (item.to === '/company/hr-management' || item.to === '/company/audit-trail') {
        return false; // Hide new management pages for uninitialized profiles
      }
      return true;
    }
    
    const requiredPermission = permissionMapping[item.to];
    if (!requiredPermission) return true;

    if (item.to === '/company/audit-trail') {
      return profile.permissions.includes('Audit Trail View Own') || profile.permissions.includes('Audit Trail View All');
    }

    return profile.permissions.includes(requiredPermission);
  });

  return (
    <div className={`bg-[#090b21] text-white h-screen flex flex-col fixed left-0 top-0 border-r border-[#151939] z-40 shadow-[4px_0_30px_rgba(0,0,0,0.3)] transition-all duration-300 ${
      isCollapsed ? 'w-20' : 'w-72'
    }`}>
      {/* Dynamic Branding Header */}
      <div className={`p-4 border-b border-[#151939]/30 ${isCollapsed ? 'flex flex-col items-center gap-4 py-6' : 'p-6 pb-4'}`}>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-700 via-indigo-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/15 shrink-0">
              <span className="font-sans font-black text-white text-xl tracking-tight">{BRAND.name[0]}</span>
            </div>
            {!isCollapsed && (
              <span className="text-xl font-bold tracking-tight text-white block truncate">
                {BRAND.name}
              </span>
            )}
          </div>
          
          {!isCollapsed && onToggle && (
            <button 
              onClick={onToggle} 
              className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
              title="Collapse Sidebar"
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {isCollapsed && onToggle && (
          <button 
            onClick={onToggle} 
            className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Expand Sidebar"
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>

      {/* Navigation list */}
      <nav className={`flex-1 space-y-1 overflow-y-auto scrollbar-hide py-3 ${isCollapsed ? 'px-2' : 'px-4'}`}>
        {allowedNavItems.map((item) => {
          const IconComponent = item.icon;
          if (!isApproved && item.to !== '/company/profile') {
            return (
              <div
                key={item.to}
                className={`flex items-center rounded-xl text-slate-500 cursor-not-allowed text-[13px] font-semibold opacity-50 bg-[#0e1131]/20 border border-[#161a3e]/30 ${
                  isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3.5 py-2.5'
                }`}
                title="Account verification required."
              >
                <IconComponent size={18} className="shrink-0" />
                {!isCollapsed && <span className="flex-1 text-left truncate">{item.label}</span>}
                {!isCollapsed && <Lock size={12} className="shrink-0" />}
              </div>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={isCollapsed ? item.label : undefined}
              className={({ isActive }) => `
                flex items-center rounded-xl text-[13px] font-medium transition-all group relative
                ${isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3.5 py-2.5'}
                ${isActive 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/10 font-bold' 
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'}
              `}
            >
              {({ isActive }) => (
                <>
                  <IconComponent 
                    size={18} 
                    className={`shrink-0 transition-transform group-hover:scale-105 duration-200 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                    }`} 
                  />
                  {!isCollapsed && <span className="flex-1 truncate">{item.label}</span>}
                  
                  {!isCollapsed && item.isNew && (
                    <span className="px-2 py-0.5 text-[9px] font-black tracking-wider text-white bg-indigo-550 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-md shadow-sm shadow-indigo-500/30 shrink-0">
                      New
                    </span>
                  )}
                  
                  {!isCollapsed && item.badgeCount && (
                    <span className="w-5 h-5 flex items-center justify-center text-[10px] font-black text-rose-100 bg-[#3519c1] rounded-full shrink-0">
                      {item.badgeCount}
                    </span>
                  )}

                  {isActive && !isCollapsed && (
                    <motion.div 
                      layoutId="company-sidebar-active"
                      className="absolute right-2 w-1.5 h-1.5 rounded-full bg-white/80"
                    />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Small Hiring Copilot Benefit Card */}
      {!isCollapsed && (
        <div className="mx-4 my-3 p-4 bg-gradient-to-br from-indigo-950/40 via-[#0e1131] to-purple-950/40 border border-indigo-500/20 rounded-2xl relative overflow-hidden shrink-0">
          <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center gap-1.5">
            <Sparkles size={12} className="text-indigo-400 animate-pulse" />
            <h4 className="text-[11px] font-black text-white uppercase tracking-wider">
              AI Hiring Copilot
            </h4>
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-1 leading-relaxed">
            Find better-fit candidates faster with VEGA AI.
          </p>
          <NavLink
            to="/company/recommendations"
            className="inline-flex items-center gap-1 mt-2.5 text-[10px] font-black text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest"
          >
            Start Copilot <ChevronRight size={10} />
          </NavLink>
        </div>
      )}

      {/* Bottom Profile Block */}
      <div className={`bg-[#07081a] border-t border-[#121636] flex items-center justify-between gap-3 ${isCollapsed ? 'flex-col py-4 px-2' : 'p-4'}`}>
        {!isCollapsed ? (
          <div className="text-left overflow-hidden min-w-0">
            <span className="text-[11px] font-black uppercase tracking-wider text-indigo-400 block truncate">
              {profile?.isSubHr ? (profile?.designation || 'Sub HR') : 'Super HR'}
            </span>
          </div>
        ) : null}
        <button 
          onClick={logout}
          title="Logout"
          className={`text-slate-400 hover:text-rose-500 hover:bg-white/5 rounded-xl transition-colors flex items-center gap-2 font-black uppercase text-[10px] tracking-widest cursor-pointer ${isCollapsed ? 'p-3' : 'px-3 py-2 bg-white/[0.02] border border-white/[0.04]'}`}
        >
          <LogOut size={16} className="shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}
