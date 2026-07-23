import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.tsx";
import { useLanguage } from "../context/LanguageContext.tsx";
import { useSidebar } from "../context/SidebarContext.tsx";
import { BRAND } from "../brand.ts";
import api from "../services/api.ts";
import { 
  Briefcase, User, LogOut, LayoutDashboard, Shield, BrainCircuit,
  FileText, ChevronDown, Bell, Menu, X, Sparkles, Building, Languages, CheckCircle,
  Award, Calendar, MessageSquare, ArrowRight, ChevronRight, Zap, Code2, Gift,
  AlertTriangle, Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useState, useRef, useEffect } from "react";
import { ReportModal } from "./student/ReportModal.tsx";

export function Navbar() {
  const { user, profile, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [showJobsMenu, setShowJobsMenu] = useState(false);
  const [showInterviewMenu, setShowInterviewMenu] = useState(false);
  const [showCodingMenu, setShowCodingMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [history, setHistory] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [xpBalance, setXpBalance] = useState<number | null>(null);
  
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  
  const userMenuRef = useRef<HTMLDivElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const notificationsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.role === "STUDENT") {
      fetchHistory();
      fetchXPBalance();
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user?.id]);

  // Periodic notifications check
  useEffect(() => {
    if (!user?.id) return;
    const interval = setInterval(() => {
      fetchNotifications();
    }, 45000);
    return () => clearInterval(interval);
  }, [user?.id]);

  useEffect(() => {
    const handleXPUpdate = () => {
      if (user?.role === "STUDENT") {
        fetchXPBalance();
      }
    };
    window.addEventListener("xp_updated", handleXPUpdate);
    return () => window.removeEventListener("xp_updated", handleXPUpdate);
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      setLoadingNotifications(true);
      const { data } = await api.get(`/students/notifications/${user.id}`);
      if (data && data.success) {
        setNotifications(data.data || []);
        const unreads = (data.data || []).filter((n: any) => !n.is_read).length;
        setUnreadCount(unreads);
      }
    } catch (e) {
      console.error("Failed to fetch notifications", e);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await api.post(`/students/notifications/read/${id}`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error("Failed to mark notification as read", e);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      await api.post(`/students/notifications/read-all/${user.id}`);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (e) {
      console.error("Failed to mark all as read", e);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'SUCCESS':
        return { icon: CheckCircle, bg: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
      case 'REJECT':
        return { icon: X, bg: 'bg-rose-50 text-rose-600 border-rose-100' };
      case 'WARNING':
        return { icon: AlertTriangle, bg: 'bg-amber-50 text-amber-600 border-amber-100' };
      case 'XP':
        return { icon: Zap, bg: 'bg-indigo-50 text-indigo-600 border-indigo-100' };
      default:
        return { icon: Bell, bg: 'bg-blue-50 text-blue-600 border-blue-100' };
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return t ? t('just_now') || "Just now" : "Just now";
      if (diffMins < 60) return `${diffMins}m`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d`;
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const fetchXPBalance = async () => {
    try {
      const { data } = await api.get('/xp/balance');
      if (data && data.balance) {
        setXpBalance(data.balance.xp_balance);
      }
    } catch (e) {
      console.error("Failed to fetch XP match", e);
    }
  };

  const fetchHistory = async () => {
    try {
      const { data } = await api.get(`/ai/history/${user?.id}`);
      setHistory(data.data || []);
    } catch (e) { console.error(e); }
  };

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setShowLangMenu(false);
      }
      if (notificationsMenuRef.current && !notificationsMenuRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/");
    setShowUserMenu(false);
    setIsMobileMenuOpen(false);
  };

  const profilePhoto = user?.role === "STUDENT" && profile?.profile_photo_url 
    ? (profile.profile_photo_url.startsWith('http') ? profile.profile_photo_url : `${api.defaults.baseURL?.replace('/api', '')}${profile.profile_photo_url}`)
    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`;

  const hideNavbarPaths = [
    '/company', 
    '/admin', 
    '/tpo', 
    '/test/', 
    '/interview/live'
  ];
  const shouldHideNavbar = hideNavbarPaths.some(p => location.pathname.startsWith(p));
  if (shouldHideNavbar) {
    return null;
  }

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm">
      <div className={`${user && user.role === "STUDENT" ? "w-full px-6 lg:px-8" : "max-w-7xl mx-auto px-4"} h-20 flex items-center justify-between`}>
        
        {/* Logo and Sidebar Toggle */}
        <div className="flex items-center gap-3">
          {user && user.role === "STUDENT" && (
            <button 
              onClick={toggleSidebar}
              className="flex items-center justify-center p-2.5 bg-white border border-slate-200/80 shadow-sm hover:bg-slate-50 hover:border-slate-300 rounded-xl transition-all duration-200 focus:outline-none lg:hidden"
              aria-label="Toggle Side Menu"
            >
              <div className="w-5 h-4 flex flex-col justify-between relative">
                <span 
                  className={`h-0.5 w-full bg-slate-600 rounded-full transition-all duration-300 ease-out origin-center
                    ${isSidebarOpen ? "rotate-45 translate-y-[7.5px]" : ""}
                  `} 
                />
                <span 
                  className={`h-0.5 w-full bg-slate-600 rounded-full transition-all duration-200 ease-out
                    ${isSidebarOpen ? "opacity-0 scale-x-0" : ""}
                  `} 
                />
                <span 
                  className={`h-0.5 w-full bg-slate-600 rounded-full transition-all duration-300 ease-out origin-center
                    ${isSidebarOpen ? "-rotate-45 -translate-y-[7.5px]" : ""}
                  `} 
                />
              </div>
            </button>
          )}

          <Link to={user?.role === 'TPO' ? '/tpo' : user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' ? '/admin' : '/'} className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-md group-hover:shadow-blue-500/30 transition-all duration-300">
              {BRAND.name[0]}
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900 hidden sm:block">
              {BRAND.name}
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-6 ml-6 border-l border-slate-200 pl-6">
            <Link to="/about" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">
              About
            </Link>
            <Link to="/contact" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">
              Contact
            </Link>
            {/* Drops Hover Dropdown */}
            <div className="relative group/drops">
              <button className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-1 cursor-pointer py-2 focus:outline-none">
                <span>Drops</span>
                <ChevronDown size={14} className="group-hover/drops:rotate-180 transition-transform duration-200 text-slate-400" />
              </button>
              <div className="absolute top-full left-0 mt-0 w-44 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 overflow-hidden z-50 opacity-0 invisible group-hover/drops:opacity-100 group-hover/drops:visible transition-all duration-200">
                <Link to="/community?tab=all" className="block w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all">
                  All
                </Link>
                <Link to="/community?tab=post" className="block w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all">
                  Post
                </Link>
                <Link to="/community?tab=experience" className="block w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all">
                  Experience
                </Link>
                <Link to="/community?tab=events" className="block w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all">
                  Events
                </Link>
                <Link to="/community?tab=blogs" className="block w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all">
                  Blogs
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Navigation & Actions */}
        <div className="flex items-center gap-2 md:gap-6">
          {/* Language Switcher */}
          <div className="relative" ref={langMenuRef}>
            <button 
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 hover:text-blue-600 transition-all flex items-center gap-2 border border-slate-100"
            >
              <Languages size={18} />
              <span className="text-xs font-black uppercase tracking-widest hidden sm:block">{language}</span>
            </button>
            
            <AnimatePresence>
              {showLangMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full right-0 mt-2 w-40 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 overflow-hidden z-50"
                >
                  <button 
                    onClick={() => { setLanguage('en'); setShowLangMenu(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${language === 'en' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    English {language === 'en' && <CheckCircle size={14} />}
                  </button>
                  <button 
                    onClick={() => { setLanguage('mr'); setShowLangMenu(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${language === 'mr' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    मराठी {language === 'mr' && <CheckCircle size={14} />}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {!user ? (
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">
                {t('login')}
              </Link>
              <Link to="/register" className="bg-blue-600 text-white py-2.5 px-6 rounded-xl text-sm font-semibold hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 transition-all duration-300">
                {t('get_started')}
              </Link>
            </div>
          ) : (
            <>
              {/* Desktop Links */}
              <div className="hidden md:flex items-center gap-6">
                {user.role === "COMPANY" && (
                  <Link to="/company" className="text-sm font-bold text-slate-700 hover:text-blue-600 transition-colors">
                    {t('hiring_portal')}
                  </Link>
                )}

                {user.role === "TPO" && (
                  <Link to="/tpo" className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1.5 bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 shadow-sm shadow-blue-500/10">
                    <LayoutDashboard size={16} /> TPO Dashboard
                  </Link>
                )}

                {(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && (
                  <Link to="/admin" className="text-sm font-bold text-amber-600 hover:text-amber-700 transition-colors flex items-center gap-1.5">
                    <Shield size={16} /> {t('admin_panel')}
                  </Link>
                )}
              </div>

              {/* Reports Modal Portal */}
              <AnimatePresence>
                {selectedReport && (
                  <ReportModal 
                    report={selectedReport} 
                    onClose={() => setSelectedReport(null)} 
                  />
                )}
              </AnimatePresence>

              {/* Notifications */}
              <div className="relative" ref={notificationsMenuRef}>
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors relative focus:outline-none"
                  aria-label="Toggle notifications"
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: 12, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 12, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 origin-top-right"
                    >
                      {/* Header */}
                      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-slate-800">Notifications</h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                            {unreadCount} Unread
                          </p>
                        </div>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline transition-all bg-transparent border-none cursor-pointer p-0"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      {/* List */}
                      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                        {loadingNotifications && notifications.length === 0 ? (
                          <div className="p-8 text-center flex flex-col items-center justify-center">
                            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                            <p className="text-xs text-slate-500 mt-2">Loading notifications...</p>
                          </div>
                        ) : notifications.length === 0 ? (
                          <div className="p-8 text-center flex flex-col items-center justify-center">
                            <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mb-3">
                              <Bell className="w-5 h-5 text-slate-400" />
                            </div>
                            <p className="text-sm font-bold text-slate-800">No Notifications</p>
                            <p className="text-xs text-slate-400 mt-1">We'll alert you when there's an update!</p>
                          </div>
                        ) : (
                          notifications.map((n) => {
                            const details = getNotificationIcon(n.type);
                            const IconComp = details.icon;
                            return (
                              <div
                                key={n.id}
                                onClick={() => n.is_read ? null : markAsRead(n.id)}
                                className={`p-4 flex gap-3 hover:bg-slate-50/80 transition-colors cursor-pointer text-left relative ${!n.is_read ? 'bg-blue-50/10' : ''}`}
                              >
                                <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${details.bg}`}>
                                  <IconComp size={16} />
                                </div>
                                <div className="flex-1 min-w-0 pr-2">
                                  <div className="flex items-start justify-between gap-2 mb-0.5">
                                    <p className="text-xs font-bold text-slate-800 truncate">{n.title}</p>
                                    <p className="text-[9px] font-semibold text-slate-400 shrink-0 uppercase tracking-wider">
                                      {formatTime(n.created_at)}
                                    </p>
                                  </div>
                                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed break-words">{n.message}</p>
                                </div>
                                {!n.is_read && (
                                  <div className="absolute top-1/2 -translate-y-1/2 right-3 w-1.5 h-1.5 bg-blue-600 rounded-full" />
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Refer & Earn Button */}
              {user.role === "STUDENT" && (
                <Link 
                  to="/refer-and-earn" 
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 border border-emerald-500/20 text-emerald-700 font-bold text-xs rounded-full transition-all group scale-95 shadow-sm shadow-emerald-100"
                >
                  <Gift size={12} className="text-emerald-600 group-hover:scale-110 transition-transform duration-200" />
                  <span>Refer & Earn</span>
                </Link>
              )}

              {/* VEGA Rewards Center/Balance Badge */}
              {user.role === "STUDENT" && (
                <Link 
                  to="/xp-store" 
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-700 hover:bg-slate-800 rounded-full transition-all group scale-95"
                >
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 shadow-[0_0_8px_rgba(251,191,36,0.5)]">
                    <Zap size={10} className="text-amber-950 fill-amber-950" />
                  </div>
                  <span className="text-xs font-black tracking-widest text-white uppercase pr-1">
                    {xpBalance !== null ? `${xpBalance} XP` : "Store"}
                  </span>
                </Link>
              )}

              {/* User Pill Button */}
              <div className="relative" ref={userMenuRef}>
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1.5 pl-3 border border-slate-200 rounded-full hover:border-slate-300 hover:shadow-sm transition-all bg-white"
                >
                  <span className="text-sm font-medium text-slate-600 hidden sm:block px-1">
                    {user?.role === "STUDENT" && profile?.full_name ? profile.full_name : user.email?.split('@')[0]}
                  </span>
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
                      <img 
                        src={profilePhoto} 
                        alt="Profile" 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {!user.is_verified && (
                      <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full flex items-center justify-center text-white border-2 border-white">
                        <Shield size={8} />
                      </div>
                    )}
                  </div>
                </button>

                {/* Desktop User Dropdown */}
                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full right-0 mt-3 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 overflow-hidden z-50"
                    >
                      <div className="p-3 border-b border-slate-100 mb-2">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{t('signed_in_as')}</p>
                        <p className="text-sm font-bold text-slate-900 truncate">{user.email}</p>
                      </div>

                      {!user.is_verified && (
                        <Link 
                          to={`/verify-email?email=${encodeURIComponent(user.email)}`}
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors mx-1 mb-2"
                        >
                          <Shield size={16} className="text-amber-500" />
                          {t('verify_account')}
                        </Link>
                      )}

                      {user.role === "STUDENT" && (
                        <>
                          <Link to="/profile" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600 rounded-xl transition-colors">
                            <User size={16} /> {t('view_profile')}
                          </Link>
                          <Link to="/student" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600 rounded-xl transition-colors">
                            <LayoutDashboard size={16} /> {t('dashboard')}
                          </Link>
                          <Link to="/xp-wallet" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600 rounded-xl transition-colors">
                            <Gift size={16} /> Refer and Earn XP
                          </Link>
                        </>
                      )}

                      {user.role === "COMPANY" && (
                        <Link to="/company/profile" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600 rounded-xl transition-colors">
                          <Building size={16} /> {t('company_profile')}
                        </Link>
                      )}

                      <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors mt-1"
                      >
                        <LogOut size={16} /> {t('sign_out')}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Mobile Menu Toggle Button */}
              {user.role !== "STUDENT" && (
                <button 
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="md:hidden flex items-center justify-center p-2.5 text-slate-700 hover:bg-slate-100 rounded-xl transition-all duration-200 focus:outline-none"
                  aria-label="Toggle Menu"
                >
                  <div className="w-5 h-4 flex flex-col justify-between relative">
                    <span 
                      className={`h-0.5 w-full bg-slate-700 rounded-full transition-all duration-300 ease-out origin-center
                        ${isMobileMenuOpen ? "rotate-45 translate-y-[7px]" : ""}
                      `} 
                    />
                    <span 
                      className={`h-0.5 w-full bg-slate-700 rounded-full transition-all duration-200 ease-out
                        ${isMobileMenuOpen ? "opacity-0 scale-x-0" : ""}
                      `} 
                    />
                    <span 
                      className={`h-0.5 w-full bg-slate-700 rounded-full transition-all duration-300 ease-out origin-center
                        ${isMobileMenuOpen ? "-rotate-45 -translate-y-[7px]" : ""}
                      `} 
                    />
                  </div>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && user && user.role !== "STUDENT" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden border-t border-slate-100 bg-white"
          >
            <div className="px-4 py-4 space-y-1">
              {user.role === "COMPANY" && (
                <MobileNavLink to="/company" icon={<Building size={18} />}>{t('hiring_portal')}</MobileNavLink>
              )}

              {user.role === "TPO" && (
                <MobileNavLink to="/tpo" icon={<LayoutDashboard size={18} />} className="text-blue-600">TPO Dashboard</MobileNavLink>
              )}

              {(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && (
                <MobileNavLink to="/admin" icon={<Shield size={18} />} className="text-amber-600">{t('admin_panel')}</MobileNavLink>
              )}
              
              <div className="pt-4 mt-4 border-t border-slate-100">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                >
                  <LogOut size={18} /> {t('sign_out')}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

// Helper component for mobile nav links
function MobileNavLink({ to, icon, children, className = "" }: { to: string, icon: React.ReactNode, children: React.ReactNode, className?: string }) {
  return (
    <Link 
      to={to} 
      className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 rounded-xl transition-colors ${className}`}
    >
      {icon}
      {children}
    </Link>
  );
}