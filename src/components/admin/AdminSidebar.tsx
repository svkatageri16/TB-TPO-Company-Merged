import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Briefcase, 
  FileText, 
  BarChart3, 
  ShieldAlert,
  LogOut,
  TrendingUp,
  BrainCircuit,
  Coins
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BRAND } from '../../brand';

export function AdminSidebar() {
  const { logout, user } = useAuth();

  const navItems = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/admin/staff', icon: ShieldAlert, label: 'Staff & Officers' },
    { to: '/admin/tpo', icon: Building2, label: 'TPO & Colleges' },
    { to: '/admin/students', icon: Users, label: 'Students' },
    { to: '/admin/companies', icon: Building2, label: 'Companies' },
    { to: '/admin/jobs', icon: Briefcase, label: 'Jobs' },
    { to: '/admin/applications', icon: FileText, label: 'Applications' },
    { to: '/admin/monitoring', icon: TrendingUp, label: 'Monitoring' },
    { to: '/admin/psychometric', icon: BrainCircuit, label: 'Psychometric Lab' },
    { to: '/admin/intelligence', icon: BrainCircuit, label: 'Intelligence Bank' },
    { to: '/admin/pricing', icon: Coins, label: 'Pricing & XP Setup' },
    { to: '/admin/logs', icon: ShieldAlert, label: 'Audit Logs' },
  ];

  // Dynamic dashboard filtering
  const filteredNavItems = React.useMemo(() => {
    // If user is SUPER_ADMIN, show everything
    if (user?.role === 'SUPER_ADMIN') {
      return navItems;
    }
    // If user is ADMIN with explicit permissions, filter links
    if (user?.sidebarPermissions && Array.isArray(user.sidebarPermissions)) {
      // Base Dashboard is always visible
      return navItems.filter(
        item => item.to === '/admin' || user.sidebarPermissions.includes(item.to)
      );
    }
    // Default fallback
    return navItems;
  }, [user]);

  return (
    <div className="w-64 bg-slate-900 h-screen flex flex-col fixed left-0 top-0">
      <div className="p-8 shrink-0">
        <h1 className="text-xl font-black text-white uppercase tracking-tighter italic">
          {BRAND.name}
          <span className="block text-[8px] tracking-[0.2em] text-slate-500 mt-1 font-bold">ADMIN PANEL</span>
        </h1>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto scrollbar-none">
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all
              ${isActive 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                : 'text-slate-400 hover:bg-white/5 hover:text-white'}
            `}
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/5 shrink-0">
        <button 
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-all"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  );
}
