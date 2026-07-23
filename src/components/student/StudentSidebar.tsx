import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Briefcase, 
  FileText, 
  UserCircle,
  Award,
  Sparkles,
  BrainCircuit,
  BarChart3,
  Code2,
  X,
  LogOut,
  ShieldCheck,
  Users,
  ChevronLeft,
  ChevronRight,
  Gift,
  Calendar
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useSidebar } from '../../context/SidebarContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import api from '../../services/api.ts';

export function StudentSidebar() {
  const { t } = useLanguage();
  const { isSidebarOpen, setSidebarOpen, isSidebarCollapsed, toggleSidebarCollapse } = useSidebar();
  const { user, profile: authProfile, updateProfile, logout } = useAuth();
  const [profile, setProfile] = useState(authProfile);
  const navigate = useNavigate();
  const location = useLocation();
  const [xpBalance, setXpBalance] = useState<number>(0);

  const fetchProfileAndXP = async () => {
    if (user?.id) {
      try {
        const profilePromise = api.get(`/students/profile/${user.id}`);
        const xpPromise = api.get('/xp/balance');
        
        const [profileRes, xpRes] = await Promise.allSettled([profilePromise, xpPromise]);
        
        if (profileRes.status === 'fulfilled' && profileRes.value?.data?.success && profileRes.value?.data?.data) {
          setProfile(profileRes.value.data.data);
          updateProfile(profileRes.value.data.data);
        }
        
        if (xpRes.status === 'fulfilled' && xpRes.value?.data?.balance) {
          setXpBalance(xpRes.value.data.balance.xp_balance || 0);
        }
      } catch (e) {
        console.error("Error fetching student profile and XP in sidebar:", e);
      }
    }
  };

  useEffect(() => {
    fetchProfileAndXP();
  }, [user?.id]);

  useEffect(() => {
    const handleXPUpdate = () => {
      fetchProfileAndXP();
    };
    window.addEventListener("xp_updated", handleXPUpdate);
    return () => window.removeEventListener("xp_updated", handleXPUpdate);
  }, [user?.id]);

  const handleLogout = () => {
    logout();
    navigate('/');
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const menuSections = [
    {
      title: 'Career Hub',
      items: [
        { to: '/student', icon: LayoutDashboard, label: t('dashboard'), end: true },
        { to: '/jobs', icon: Briefcase, label: t('browse_jobs') },
        { to: '/applied-jobs', icon: FileText, label: t('my_applications') },
        { to: '/student/interviews', icon: Calendar, label: 'Interviews' },
      ]
    },
    ...(profile?.college_id ? [{
      title: 'Campus Portal',
      items: [
        { to: '/student/college', icon: Users, label: 'My College Hub' },
      ]
    }] : []),
    {
      title: 'Preparation',
      items: [
        { to: '/resume-builder', icon: UserCircle, label: t('resume_nav') },
        { to: '/interview', icon: Sparkles, label: t('ai_mock') },
        { to: '/career-gap', icon: Sparkles, label: 'AI Gap Analyzer™' },
        { to: '/student/mock-history', icon: BarChart3, label: t('performance_archives') },
      ]
    },
    {
      title: 'Assessments',
      items: [
        { to: '/ai-quiz', icon: BrainCircuit, label: t('ai_quiz') },
        { to: '/student/intelligence', icon: BrainCircuit, label: 'Intelligence Test' },
        { to: '/coding-analytics', icon: Code2, label: 'Coding Analytics' },
      ]
    },
    {
      title: 'Rewards',
      items: [
        { to: '/xp-store', icon: Award, label: 'VEGA Rewards Center' },
        { to: '/refer-and-earn', icon: Gift, label: 'Refer & Earn' },
      ]
    }
  ];

  // Resolve profile photo from backend database or fallback
  const profilePhoto = profile?.profile_photo_url 
    ? (profile.profile_photo_url.startsWith('http') ? profile.profile_photo_url : `${api.defaults.baseURL?.replace('/api', '')}${profile.profile_photo_url}`)
    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`;

  // XP level calculations helper
  const currentXP = xpBalance;
  const level = Math.floor(currentXP / 1000) + 1;
  const xpProgressPercent = Math.min(100, Math.floor((currentXP % 1000) / 10));

  return (
    <>
      {/* Backdrop overlay for mobile screen view */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div 
        id="student-sidebar"
        className={`
          ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'} w-64 bg-[#070b19] border-r border-[#19223d]/80 flex flex-col 
          fixed left-0 top-[80px] bottom-0 z-45 flex-shrink-0 shadow-[0_15px_50px_rgba(0,0,0,0.6)] transition-all duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Subtle Neon Radial Glow Highlights */}
        <div className="absolute top-1/10 left-1/2 -translate-x-1/2 w-48 h-48 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none select-none"></div>
        <div className="absolute bottom-1/5 left-1/2 -translate-x-1/2 w-56 h-56 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none select-none"></div>

        {/* Floating Side Toggle Button - High Fidelity SaaS Style */}
        <button
          onClick={toggleSidebarCollapse}
          className="hidden lg:flex absolute top-6 -right-[13px] w-6.5 h-6.5 items-center justify-center text-slate-400 hover:text-white bg-[#0e162e] rounded-full border border-[#212f5c] shadow-[0_4px_16px_rgba(0,0,0,0.5),_0_0_8px_rgba(99,102,241,0.15)] hover:shadow-[0_0_15px_rgba(99,102,241,0.4)] z-50 transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer"
          title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isSidebarCollapsed ? <ChevronRight size={13} className="text-indigo-400" /> : <ChevronLeft size={13} className="text-indigo-400" />}
        </button>

        {/* User Profile Header (Glassmorphic Container When Expanded) */}
        <div className={`p-4 border-b border-[#131a31] relative ${isSidebarCollapsed ? 'flex flex-col items-center py-2' : 'px-5 py-5'}`}>
          {isSidebarCollapsed ? (
            /* Minimized State Avatar with Achievement Glow */
            <div className="relative group/avatar cursor-pointer">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 p-[1.5px] transition-transform duration-300 group-hover/avatar:scale-105 shadow-[0_0_12px_rgba(99,102,241,0.2)]">
                <div className="w-full h-full rounded-[7px] overflow-hidden bg-slate-950">
                  <img 
                    src={profilePhoto} 
                    alt="Profile" 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              {user?.is_verified && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full flex items-center justify-center border-[1.5px] border-[#070b19] shadow-[0_1px_5px_rgba(0,0,0,0.5)]">
                  <ShieldCheck size={7} className="fill-white text-indigo-600" />
                </div>
              )}

              {/* Enhanced Hover Achievements Flyout */}
              <div className="absolute left-14 top-0 bg-gradient-to-br from-[#0c1224] to-[#060a15] border border-[#202c54]/80 rounded-2xl p-4.5 shadow-[0_15px_40px_rgba(0,0,0,0.7),_inset_0_1px_1px_rgba(255,255,255,0.05),_0_0_20px_rgba(99,102,241,0.1)] opacity-0 scale-95 origin-left group-hover/avatar:opacity-100 group-hover/avatar:scale-100 transition-all duration-300 pointer-events-none w-56 z-50">
                <div className="flex items-center gap-2 mb-3">
                  <Award size={14} className="text-indigo-400" />
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Aspirant Stats</span>
                </div>
                <p className="text-xs font-black text-slate-100 truncate">{profile?.full_name || user?.email?.split('@')[0]}</p>
                <p className="text-[10px] text-slate-500 font-medium truncate mb-3">{user?.email}</p>
                
                <div className="p-2 bg-slate-950/80 rounded-xl border border-[#1a254a]/50">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold mb-1.5">
                    <span className="flex items-center gap-1"><Award size={10} className="text-indigo-400" /> Lvl {level}</span>
                    <span className="text-indigo-400">{currentXP} XP</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full" style={{ width: `${xpProgressPercent}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Expanded Elegant Glassmorphic Profile Card */
            <div className="bg-gradient-to-br from-[#121a36]/50 via-[#0a1024]/30 to-transparent border border-[#212f5a]/30 rounded-2xl p-3.5 shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)] relative overflow-hidden group/profile">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 opacity-0 group-hover/profile:opacity-100 transition-opacity duration-300"></div>
              
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-[1.5px] shadow-[0_0_12px_rgba(99,102,241,0.15)]">
                    <div className="w-full h-full rounded-[10px] overflow-hidden bg-slate-950">
                      <img 
                        src={profilePhoto} 
                        alt="Profile" 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  {user?.is_verified && (
                    <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full flex items-center justify-center border-2 border-[#121a36] shadow-md animate-pulse">
                      <ShieldCheck size={10} className="fill-white text-indigo-600" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-slate-100 truncate tracking-wide leading-none mb-1">
                    {profile?.full_name || user?.email?.split('@')[0]}
                  </p>
                  <p className="text-[10px] text-slate-500 font-bold truncate">
                    {user?.email}
                  </p>
                </div>
              </div>

              {/* Gamification Level State Progress Bar Widget */}
              <div className="mt-3 pt-3 border-t border-[#1b2545]/40">
                <div className="flex justify-between items-center mb-1 text-[9px] font-bold">
                  <span className="text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Award size={10} className="text-indigo-400" /> Level {level}
                  </span>
                  <span className="text-indigo-400">{currentXP} XP</span>
                </div>
                <div className="w-full h-[5px] bg-[#070b19] rounded-full overflow-hidden p-[1px]">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.6)]" 
                    style={{ width: `${xpProgressPercent}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Header indicator */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1b2545]/40 lg:hidden bg-slate-950/30">
          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Candidate Navigation</span>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg transition-colors border border-transparent hover:border-slate-800"
          >
            <X size={15} />
          </button>
        </div>

        {/* Navigation Core Panel */}
        <nav className={`flex-1 ${isSidebarCollapsed ? 'px-2 py-1.5 overflow-visible space-y-1.5' : 'px-4 py-4 overflow-y-auto space-y-4'} [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]`}>
          {menuSections.map((section, idx) => (
            <div key={section.title} className={idx > 0 ? "pt-1" : ""}>
              
              {/* Heading or Separator Dot */}
              {isSidebarCollapsed ? (
                <div className="w-8 h-[1px] bg-gradient-to-r from-transparent via-slate-800 to-transparent mx-auto my-1 shadow-[0_0_10px_rgba(99,102,241,0.05)]"></div>
              ) : (
                <div className="mb-2.5 px-3 flex items-center justify-between">
                  <h2 className="text-[9px] font-extrabold text-slate-500 uppercase tracking-[0.18em] leading-none">{section.title}</h2>
                </div>
              )}

              <div className={isSidebarCollapsed ? "space-y-0.5" : "space-y-1"}>
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => {
                      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                        setSidebarOpen(false);
                      }
                    }}
                    className={({ isActive }) => {
                      const baseClasses = "flex items-center rounded-xl text-xs font-bold transition-all duration-300 relative group overflow-visible cursor-pointer focus:outline-none focus:ring-0 focus-visible:outline-none";
                      if (isSidebarCollapsed) {
                        return `${baseClasses} justify-center w-9 h-9 mx-auto ${
                          isActive 
                            ? 'bg-indigo-600/15 text-[#818cf8] border border-indigo-500/40 shadow-[0_0_12px_rgba(99,102,241,0.2)]' 
                            : 'text-slate-500 hover:bg-[#0c1226] hover:text-white border border-transparent'
                        }`;
                      } else {
                        return `${baseClasses} gap-3 px-3.5 py-2.5 mx-1 ${
                          isActive 
                            ? 'bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent text-white border border-indigo-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.02),_0_4px_15px_rgba(99,102,241,0.1)]' 
                            : 'text-slate-400 hover:bg-[#0d142a]/60 hover:text-white border border-transparent'
                        }`;
                      }
                    }}
                  >
                    {({ isActive }) => (
                      <>
                        {/* Neon line selector on left */}
                        {isActive && !isSidebarCollapsed && (
                          <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-gradient-to-b from-indigo-400 to-purple-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.6)]"></div>
                        )}

                        <item.icon 
                          size={16.5} 
                          className={`
                            shrink-0 transition-all duration-300
                            ${isActive 
                              ? 'text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)] scale-105' 
                              : 'text-slate-500 group-hover:text-indigo-400 group-hover:scale-105'}
                          `} 
                        />
                        
                        {!isSidebarCollapsed && (
                          <span className={`relative transition-colors duration-200 ${isActive ? 'text-slate-100 font-extrabold' : 'text-slate-400 group-hover:text-white'}`}>
                            {item.label}
                          </span>
                        )}

                        {/* Speech Bubble Hover Tooltip for Collapsed State */}
                        {isSidebarCollapsed && (
                          <div className="absolute left-13 top-1/2 -translate-y-1/2 bg-gradient-to-r from-[#5f5af6] to-[#7c3aed] text-white text-xs font-bold px-4 py-2.5 rounded-2xl opacity-0 translate-x-4 scale-90 group-hover:opacity-100 group-hover:translate-x-0 group-hover:scale-100 transition-all duration-300 ease-out pointer-events-none whitespace-nowrap z-50 shadow-[0_10px_25px_-5px_rgba(95,90,246,0.5),_0_8px_16px_-6px_rgba(95,90,246,0.3),_0_0_15px_rgba(95,90,246,0.2)] flex items-center">
                            {/* Speech bubble tail pointer */}
                            <div className="absolute right-full top-1/2 -translate-y-1/2 border-y-[6px] border-y-transparent border-r-[6px] border-r-[#5f5af6] mr-[-1px]"></div>
                            <span className="tracking-wide select-none">{item.label}</span>
                          </div>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        
        {/* Footnote Sign Out Block */}
        <div className={`p-4 border-t border-[#131a31] bg-slate-950/20 overflow-visible relative mt-auto flex flex-col ${isSidebarCollapsed ? 'items-center justify-center py-1.5 px-1' : 'p-4 gap-3'}`}>
          
          {/* Level Badge for Collapsed Sidebar Footer */}
          {isSidebarCollapsed && (
            <div className="mb-1 w-7.5 h-7.5 rounded-full bg-indigo-950/40 border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-[8px] font-black group/lvl pointer-events-auto relative cursor-pointer shadow-lg hover:border-indigo-400 hover:text-white transition-colors select-none">
              L{level}
              <div className="absolute left-9 top-1/2 -translate-y-1/2 bg-gradient-to-br from-[#0c1224] to-[#060a15] border border-[#202c54] text-[10px] text-slate-300 rounded-lg px-2.5 py-1.5 opacity-0 group-hover/lvl:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl font-bold">
                Level {level} Explorer ({currentXP} XP)
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className={`
              flex items-center justify-center gap-2 bg-rose-500/5 hover:bg-rose-500/15 text-rose-400 hover:text-rose-300 border border-rose-500/10 hover:border-rose-500/30 rounded-xl text-xs font-bold transition-all duration-200 outline-none cursor-pointer focus:outline-none focus:ring-0
              ${isSidebarCollapsed ? 'w-9 h-9 p-0 rounded-lg' : 'w-full px-4 py-2.5'}
            `}
            title="Sign Out"
          >
            <LogOut size={isSidebarCollapsed ? 13 : 13} className={isSidebarCollapsed ? "text-rose-400 hover:scale-110 transition-transform" : ""} />
            {!isSidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </div>
    </>
  );
}
