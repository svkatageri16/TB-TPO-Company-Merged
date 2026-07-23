import React from 'react';
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { CompanySidebar } from './CompanySidebar.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import api from '../../services/api.ts';
import { CandidateDetailModal } from './CandidateDetailModal.tsx';
import { 
  Bell, 
  Search, 
  Plus, 
  ChevronDown, 
  LayoutDashboard,
  Calendar,
  MessageSquare,
  X,
  AlertCircle,
  Building2,
  Settings,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationPanel } from './NotificationPanel.tsx';
import toast from 'react-hot-toast';
import { CompanyCalendarModal } from './CompanyCalendarModal.tsx';

export function CompanyLayout() {
  const { user, profile, loading, logout } = useAuth();
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);
  const [showCalendar, setShowCalendar] = React.useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(() => {
    return localStorage.getItem('company_sidebar_collapsed') === 'true';
  });

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('company_sidebar_collapsed', String(next));
      return next;
    });
  };
  const location = useLocation();
  const navigate = useNavigate();

  // Real-time search states
  const [searchQuery, setSearchQuery] = React.useState('');
  const [allJobs, setAllJobs] = React.useState<any[]>([]);
  const [allApplicants, setAllApplicants] = React.useState<any[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [focusedCandidate, setFocusedCandidate] = React.useState<any>(null);

  React.useEffect(() => {
    document.documentElement.classList.add('scrollbar-hide');
    return () => {
      document.documentElement.classList.remove('scrollbar-hide');
    };
  }, []);

  React.useEffect(() => {
    if (user?.id) {
      api.get(`/jobs`)
        .then(res => {
          const companyJobs = (res.data.data || []).filter((j: any) => j.company_id === profile?.id);
          setAllJobs(companyJobs);
        })
        .catch(err => console.error("Error fetching jobs in layout", err));

      api.get(`/analytics/employer/${user.id}`)
        .then(res => {
          if (res.data.success) {
            setAllApplicants(res.data.data.applicants || []);
          }
        })
        .catch(err => console.error("Error fetching applicants in layout", err));
    }
  }, [user?.id, profile?.id]);

  if (loading) return null;
  
  if (!user || user.role !== 'COMPANY') {
    return <Navigate to="/login" replace />;
  }

  // Lock out and force redirect to /company/profile if not approved or pending review
  const isAllowedToBrowse = profile?.status === 'APPROVED' || profile?.status === 'PENDING_REVERIFICATION' || profile?.status === 'PENDING';
  if (!isAllowedToBrowse && location.pathname !== '/company/profile') {
    return <Navigate to="/company/profile" replace />;
  }

  // Permission Enforcement for Sub HR direct URL access
  if (profile && profile.isSubHr && profile.permissions) {
    const permissionMapping: Record<string, string> = {
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

    const matchedPath = Object.keys(permissionMapping).find(p => {
      return location.pathname === p || location.pathname.startsWith(p + '/');
    });

    if (matchedPath) {
      const requiredPermission = permissionMapping[matchedPath];
      let hasPerm = false;
      if (matchedPath === '/company/audit-trail') {
        hasPerm = profile.permissions.includes('Audit Trail View Own') || profile.permissions.includes('Audit Trail View All');
      } else {
        hasPerm = profile.permissions.includes(requiredPermission);
      }

      if (!hasPerm) {
        return <Navigate to="/company" replace />;
      }
    }
  }

  const filteredSearchJobs = allJobs.filter(j => 
    j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (j.location && j.location.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredSearchApplicants = allApplicants.filter(a => 
    a.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.job_title && a.job_title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex bg-[#F8FAFC] min-h-screen font-sans selection:bg-blue-100 selection:text-blue-600">
      <CompanySidebar isCollapsed={isSidebarCollapsed} onToggle={handleToggleSidebar} />
      
      <div className={`flex-1 flex flex-col min-h-screen overflow-x-hidden transition-all duration-300 ${
        isSidebarCollapsed ? 'ml-20 max-w-[calc(100vw-80px)]' : 'ml-72 max-w-[calc(100vw-288px)]'
      }`}>
        {/* Unified Sticky Header & Banner Container */}
        <div className="sticky top-0 z-30 flex flex-col w-full">
          {/* Top Navigation */}
          <header className="h-24 bg-white/70 backdrop-blur-xl border-b border-slate-100/50 px-12 flex items-center justify-between shadow-[0_4px_30px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-8 flex-1">
             <div className="relative w-[450px] group">
                <div className="absolute inset-0 bg-slate-100/50 rounded-2xl group-focus-within:bg-white group-focus-within:ring-4 group-focus-within:ring-blue-500/10 transition-all duration-300" />
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors z-10" size={20} />
                <input 
                  type="text" 
                  placeholder="Quick search talent, jobs, or market reports..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearching(true)}
                  className="w-full bg-transparent border-none rounded-2xl pl-14 pr-12 py-3.5 text-sm font-semibold outline-none transition-all relative z-10 placeholder:text-slate-300 text-slate-800"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10 opacity-0 group-focus-within:opacity-100 transition-opacity">
                   <kbd className="px-1.5 py-0.5 bg-slate-100 text-[10px] font-black text-slate-400 rounded-md border border-slate-200">⌘</kbd>
                   <kbd className="px-1.5 py-0.5 bg-slate-100 text-[10px] font-black text-slate-400 rounded-md border border-slate-200">K</kbd>
                </div>

                {isSearching && searchQuery.trim() !== '' && (
                  <>
                    <div className="fixed inset-x-0 bottom-0 top-[96px] z-40 cursor-default" onClick={() => setIsSearching(false)} />
                    <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-100/80 rounded-2xl shadow-2xl p-4 z-50 max-h-[380px] overflow-y-auto space-y-4">
                      {/* Active Jobs Matches */}
                      <div>
                        <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2 px-2">
                          Matches in Positions ({filteredSearchJobs.length})
                        </div>
                        {filteredSearchJobs.length === 0 ? (
                          <div className="text-xs text-slate-400 font-medium py-1 px-2">No matching jobs found</div>
                        ) : (
                          <div className="space-y-1">
                            {filteredSearchJobs.map(job => (
                              <button
                                key={job.id}
                                onClick={() => {
                                  setSearchQuery('');
                                  setIsSearching(false);
                                  window.location.href = `/company/pipeline?jobId=${job.id}`;
                                }}
                                className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-between"
                              >
                                <div>
                                  <span className="text-xs font-bold text-slate-800 block">{job.title}</span>
                                  <span className="text-[10px] text-slate-400 font-medium block">{job.location || 'Remote'} &bull; {job.job_type}</span>
                                </div>
                                <span className="text-[9px] font-black text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded">Track &rarr;</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="h-px bg-slate-100" />

                      {/* Candidates Matches */}
                      <div>
                        <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2 px-2">
                          Matches in Candidates & Talent ({filteredSearchApplicants.length})
                        </div>
                        {filteredSearchApplicants.length === 0 ? (
                          <div className="text-xs text-slate-400 font-medium py-1 px-2">No matching candidates found</div>
                        ) : (
                          <div className="space-y-1">
                            {filteredSearchApplicants.map(applicant => (
                              <button
                                key={applicant.id || applicant.student_id}
                                onClick={() => {
                                  setSearchQuery('');
                                  setIsSearching(false);
                                  setFocusedCandidate(applicant);
                                }}
                                className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-3"
                              >
                                <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden shrink-0">
                                  {applicant.profile_photo_url ? (
                                    <img src={applicant.profile_photo_url} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full text-xs font-black bg-indigo-105 bg-indigo-50 text-indigo-600 flex items-center justify-center uppercase">
                                      {applicant.full_name?.[0] || 'C'}
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="text-xs font-bold text-slate-800 block truncate">{applicant.full_name}</span>
                                  <span className="text-[10px] text-slate-500 font-semibold block truncate">Job: {applicant.job_title} &bull; Score: {applicant.talent_score || 0}%</span>
                                </div>
                                <span className="text-[9px] font-extrabold text-emerald-600 uppercase bg-emerald-50 px-2.5 py-0.5 rounded">View Profile</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
             </div>
          </div>

          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3 bg-slate-50/50 p-1.5 rounded-2xl border border-slate-100/50">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center relative transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer ${
                    showNotifications ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white text-slate-500 hover:text-blue-600 shadow-sm'
                  }`}
                >
                   <Bell size={20} />
                   {!showNotifications && <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-bounce" />}
                </button>
                <button 
                  onClick={() => setShowCalendar(true)}
                  className="w-11 h-11 rounded-xl bg-white text-slate-500 hover:text-blue-600 hover:scale-105 active:scale-95 shadow-sm transition-all duration-300 flex items-center justify-center cursor-pointer"
                >
                   <Calendar size={20} />
                </button>
                <button 
                  onClick={() => toast.success("Real-time Chat and Candidate Messages synced!")}
                  className="w-11 h-11 rounded-xl bg-white text-slate-500 hover:text-blue-600 hover:scale-105 active:scale-95 shadow-sm transition-all duration-300 flex items-center justify-center cursor-pointer"
                >
                   <MessageSquare size={20} />
                </button>
             </div>

             <AnimatePresence>
                {showNotifications && (
                   <NotificationPanel onClose={() => setShowNotifications(false)} />
                )}
             </AnimatePresence>

             <div className="h-10 w-px bg-slate-100 mx-2" />

             {/* Company Profile Dropdown */}
             <div className="relative">
                <button 
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-4 pl-2 pr-4 py-2 bg-slate-50/50 hover:bg-white rounded-[24px] border border-transparent hover:border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500 group cursor-pointer"
                >
                   <div className="w-11 h-11 bg-gradient-to-br from-[#4f46e5] to-[#312e81] rounded-2xl overflow-hidden flex items-center justify-center text-white font-black shadow-lg shadow-[#4f46e5]/20 group-hover:scale-105 transition-transform duration-500">
                      {profile?.logo_url ? <img src={profile.logo_url} className="w-full h-full object-cover" alt="logo" referrerPolicy="no-referrer" /> : (profile?.company_name?.[0] || 'T')}
                   </div>
                   <div className="text-left hidden lg:block">
                      <p className="text-[11px] font-black text-slate-900 uppercase tracking-tighter leading-none">{profile?.company_name || 'TechNova Solutions'}</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                         <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                         <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em] leading-none">Premium Workspace</p>
                      </div>
                   </div>
                   <ChevronDown size={16} className="text-slate-400 group-hover:text-[#4f46e5] group-hover:translate-y-0.5 transition-all" />
                </button>

                <AnimatePresence>
                   {showProfileMenu && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute right-0 mt-3 w-56 bg-white border border-slate-100 rounded-2xl shadow-2xl p-2 z-50 space-y-1"
                        >
                          <button
                            onClick={() => {
                              setShowProfileMenu(false);
                              navigate("/company/profile");
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-bold text-xs uppercase tracking-wider transition-colors text-left cursor-pointer"
                          >
                            <Building2 size={16} className="text-slate-400" />
                            Company Profile
                          </button>
                          <button
                            onClick={() => {
                              setShowProfileMenu(false);
                              navigate("/company/settings");
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-bold text-xs uppercase tracking-wider transition-colors text-left cursor-pointer"
                          >
                            <Settings size={16} className="text-slate-400" />
                            Workspace Settings
                          </button>
                          <div className="h-px bg-slate-100 my-1" />
                          <button
                            onClick={() => {
                              setShowProfileMenu(false);
                              logout();
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-rose-50 text-rose-600 hover:text-rose-700 font-bold text-xs uppercase tracking-wider transition-colors text-left cursor-pointer"
                          >
                            <LogOut size={16} className="text-rose-400" />
                            Logout
                          </button>
                        </motion.div>
                      </>
                   )}
                </AnimatePresence>
             </div>
          </div>
        </header>

        {/* Verification Warning Banner */}
        {(profile?.status === 'PENDING_REVERIFICATION' || profile?.status === 'PENDING') && (
          <div className="bg-amber-500 text-white px-12 py-3.5 flex items-center justify-between gap-4 font-sans border-b border-amber-600/20 shadow-inner relative z-20">
             <div className="flex items-center gap-3">
                <AlertCircle size={20} className="shrink-0 animate-pulse text-amber-100" />
                <p className="text-xs font-black uppercase tracking-wider">
                   Company verification pending. Some actions are disabled until Admin approval.
                </p>
             </div>
             <p className="text-[10px] font-mono font-black uppercase tracking-widest bg-amber-600 px-3 py-1 rounded-full border border-amber-700/30">
                Frozen State
             </p>
          </div>
        )}
        </div>

        {/* Main Dashboard Content */}
        <main className="pt-5 pb-12 px-12 max-w-[1600px] mx-auto w-full">
          <Outlet />
        </main>
      </div>

      <AnimatePresence>
        {focusedCandidate && (
          <CandidateDetailModal 
            candidate={focusedCandidate} 
            onClose={() => setFocusedCandidate(null)} 
          />
        )}
      </AnimatePresence>

      <CompanyCalendarModal 
        isOpen={showCalendar} 
        onClose={() => setShowCalendar(false)} 
        userId={user?.id || 0} 
      />
    </div>
  );
}
