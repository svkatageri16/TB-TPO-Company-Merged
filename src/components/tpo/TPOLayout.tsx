import React from 'react';
import { Outlet, Navigate, Link } from 'react-router-dom';
import { TPOSidebar } from './TPOSidebar';
import { useAuth } from '../../context/AuthContext';
import { useTPOUI, TPOUIProvider } from '../../context/TPOUIContext';
import { User, Bell, Search } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

function TPOLayoutContent() {
  const { user, logout } = useAuth();
  const { isSidebarCollapsed } = useTPOUI();
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const notificationRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking notifications as read');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - Fixed */}
      <TPOSidebar />

      {/* Main Content Area */}
      <div className={`flex-1 ${isSidebarCollapsed ? 'pl-20' : 'pl-64'} transition-all duration-300`}>
        {/* Content */}
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function TPOLayout() {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user || user.role !== 'TPO') {
    return <Navigate to="/login" replace />;
  }

  return (
    <TPOUIProvider>
      <TPOLayoutContent />
    </TPOUIProvider>
  );
}
