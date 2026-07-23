import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Calendar,
  FileText, 
  BarChart3, 
  LogOut,
  BrainCircuit,
  Bell,
  CheckCircle2,
  PieChart
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTPOUI } from '../../context/TPOUIContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BRAND } from '../../brand';

export function TPOSidebar() {
  const { logout } = useAuth();
  const { isSidebarCollapsed, toggleSidebar } = useTPOUI();

  const navItems = [
    { to: '/tpo', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/tpo/students', icon: Users, label: 'Student Monitoring' },
    { to: '/tpo/colleges', icon: Building2, label: 'College Insights' },
    { to: '/tpo/events', icon: Calendar, label: 'Events & Drives' },
    { to: '/tpo/analytics', icon: PieChart, label: 'Placement Analytics' },
    { to: '/tpo/assessments', icon: FileText, label: 'Assessment Engine' },
    { to: '/tpo/skill-gap', icon: BrainCircuit, label: 'Skill Gap Analysis' },
    { to: '/tpo/reports', icon: FileText, label: 'Reports' },
    { to: '/tpo/notifications', icon: Bell, label: 'Notifications' },
  ];

  return (
    <div className={`
      ${isSidebarCollapsed ? 'w-20' : 'w-64'} 
      bg-slate-900 h-screen flex flex-col fixed left-0 top-0 z-50 transition-all duration-300
    `}>
      <div className={`p-6 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!isSidebarCollapsed && (
          <Link to="/tpo" className="block hover:opacity-80 transition-opacity">
            <h1 className="text-xl font-black text-white uppercase tracking-tighter italic">
              {BRAND.name}
              <span className="block text-[8px] tracking-[0.2em] text-slate-500 mt-1">TPO ECOSYSTEM</span>
            </h1>
          </Link>
        )}
        <button 
          onClick={toggleSidebar}
          className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
        >
          {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `
              flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-xl text-sm font-bold transition-all
              ${isActive 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                : 'text-slate-400 hover:bg-white/5 hover:text-white'}
            `}
            title={isSidebarCollapsed ? item.label : ''}
          >
            <item.icon size={18} className="shrink-0" />
            {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/5">
        <button 
          onClick={logout}
          className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-xl text-sm font-bold text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-all`}
          title={isSidebarCollapsed ? 'Logout' : ''}
        >
          <LogOut size={18} className="shrink-0" />
          {!isSidebarCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}
