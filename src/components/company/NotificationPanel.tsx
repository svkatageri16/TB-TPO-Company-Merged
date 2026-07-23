import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Bell, CheckCircle, Clock, AlertCircle, X, Loader2 } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

interface NotificationPanelProps {
  onClose: () => void;
}

interface NotificationItem {
  id: string | number;
  title: string;
  desc: string;
  time: string;
  type: string;
  is_read: number;
}

function formatRelativeTime(dateString: string) {
  try {
    const diffMs = Date.now() - new Date(dateString).getTime();
    if (isNaN(diffMs) || diffMs < 0) return "Just now";
    const diffSecs = Math.floor(diffMs / 1000);
    if (diffSecs < 60) return "Just now";
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins} mins ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } catch (e) {
    return "Just now";
  }
}

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/company/notifications');
      if (res.data?.success) {
        setNotifications(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch company notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll notifications every 10 seconds for real-time behavior
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      const res = await api.post('/company/notifications/read-all');
      if (res.data?.success) {
        toast.success("All notifications marked as read");
        fetchNotifications();
      }
    } catch (err) {
      console.error("Failed to mark all as read:", err);
      toast.error("Failed to update notifications");
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return CheckCircle;
      case 'warning':
        return AlertCircle;
      default:
        return Clock;
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <>
      <div className="fixed inset-0 z-[100]" onClick={onClose} />
      <motion.div 
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        className="absolute top-20 right-10 w-96 bg-white rounded-[32px] shadow-2xl border border-slate-100 z-[101] overflow-hidden"
      >
        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Notifications</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              {loading ? "Syncing..." : `You have ${unreadCount} unread message${unreadCount !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-slate-600 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[400px] overflow-y-auto min-h-[150px] flex flex-col justify-start">
          {loading && notifications.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-2 text-indigo-600" />
              <p className="text-xs font-semibold uppercase tracking-wider">Loading inbox...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-400 text-center px-6">
              <Bell className="w-8 h-8 mb-2 text-slate-300" />
              <p className="text-xs font-black uppercase tracking-wider text-slate-600">Your Inbox is Clear</p>
              <p className="text-[10px] font-medium text-slate-400 mt-1 leading-relaxed">No new alerts or candidate status updates have been registered yet.</p>
            </div>
          ) : (
            notifications.map((n) => {
              const IconComp = getIcon(n.type);
              return (
                <div key={n.id} className={`p-5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 group cursor-pointer ${!n.is_read ? 'bg-indigo-50/20' : ''}`}>
                  <div className="flex gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      n.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
                      n.type === 'warning' ? 'bg-orange-50 text-orange-600' :
                      'bg-indigo-50 text-indigo-600'
                    }`}>
                      <IconComp size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">{n.title}</h4>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">{formatRelativeTime(n.time)}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">{n.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {notifications.length > 0 && (
          <div className="p-4 bg-slate-50/50 text-center border-t border-slate-50">
            <button 
              onClick={handleMarkAllRead}
              className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline cursor-pointer"
            >
              Mark all as read
            </button>
          </div>
        )}
      </motion.div>
    </>
  );
}
