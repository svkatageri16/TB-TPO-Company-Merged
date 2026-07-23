import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Send,
  Building2, 
  User, 
  CheckCircle2, 
  AlertTriangle,
  Clock,
  MoreHorizontal,
  Megaphone,
  Type,
  AlignLeft,
  Users
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

export default function TPONotifications() {
  const [activeTab, setActiveTab] = useState<'system' | 'notices'>('system');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Notice Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [batchName, setBatchName] = useState('ALL');
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      try {
        const res = await api.get('/notifications');
        if (res.data.success) setNotifications(res.data.data);
      } catch(e) {}
      
      const noticesRes = await api.get('/tpo/notices');
      if (noticesRes.data.success) setNotices(noticesRes.data.data);

      const batchesRes = await api.get('/tpo/batches');
      if (batchesRes.data.success) setBatches(batchesRes.data.data);

    } catch (error) {
      console.error('Error fetching data');
    } finally {
      setLoading(false);
    }
  };

  const handlePostNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) {
      toast.error("Please fill all required fields");
      return;
    }
    try {
      const res = await api.post('/tpo/notices', { title, message, batch_name: batchName, is_public: isPublic });
      if (res.data.success) {
        toast.success("Notice posted successfully to Campus Notice Board");
        setTitle('');
        setMessage('');
        setBatchName('ALL');
        setIsPublic(true);
        fetchData(); // Refresh list
      }
    } catch (error) {
      toast.error("Failed to post notice");
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      toast.success('All notifications marked as read');
    } catch (error) {}
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab('system')}
            className={`pb-4 px-2 font-black text-xs uppercase tracking-widest transition-colors relative ${activeTab === 'system' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            System Notifications
            {activeTab === 'system' && (
              <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600 rounded-t-full"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('notices')}
            className={`pb-4 px-2 font-black text-xs uppercase tracking-widest transition-colors relative ${activeTab === 'notices' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Campus Notice Board
            {activeTab === 'notices' && (
              <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600 rounded-t-full"></div>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'notices' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Post Notice Form */}
          <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm h-max">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
                <Megaphone size={24} />
              </div>
              <h3 className="font-black text-slate-900 text-xl tracking-tight">Post Notice</h3>
            </div>
            
            <form onSubmit={handlePostNotice} className="space-y-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  <Users size={12} /> Target Audience (Batch)
                </label>
                <select
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm text-slate-700"
                >
                  <option value="ALL">All Students</option>
                  {batches.map((b: any) => (
                    <option key={b.id} value={b.batch_name}>{b.batch_name} ({b.department})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  <Type size={12} /> Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Upcoming Placement Drive"
                  className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm text-slate-700"
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  <AlignLeft size={12} /> Message
                </label>
                <textarea
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your notice here..."
                  className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm text-slate-700 resize-none"
                />
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="isPublic"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-5 h-5 accent-blue-600 rounded"
                />
                <label htmlFor="isPublic" className="text-sm font-bold text-slate-700">Make this notice public</label>
              </div>
              <button
                type="submit"
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-sm rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Send size={18} /> Broadcast Notice
              </button>
            </form>
          </div>

          {/* List of Previous Notices */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="font-black text-slate-900 text-xl tracking-tight mb-6">Recent Notices</h3>
            {notices.length === 0 ? (
              <div className="p-16 text-center bg-white rounded-3xl border border-slate-200">
                <Megaphone className="mx-auto text-slate-200 mb-6" size={64} />
                <h3 className="text-xl font-black text-slate-900">No Notices Posted</h3>
                <p className="text-slate-500 mt-3 font-medium">Use the form to post campus notices to your students.</p>
              </div>
            ) : (
              notices.map((n) => (
                <div key={n.id} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative hover:shadow-md transition-shadow">
                  <span className="absolute top-8 right-8 flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <Clock size={14} />
                    {new Date(n.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex gap-6">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl h-max">
                      <Megaphone size={24} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-black text-slate-900 text-lg">{n.title}</h4>
                      <div className="flex items-center gap-2 mt-3">
                        <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-full">
                          Target: {n.batch_name}
                        </span>
                        {n.is_public && (
                          <span className="inline-block px-3 py-1 bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-widest rounded-full">
                            Public
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 font-medium mt-4 leading-relaxed whitespace-pre-wrap">{n.message}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'system' && (
        <>
          <div className="flex items-center justify-end">
            <button 
              onClick={markAllAsRead}
              className="text-xs font-black text-blue-600 uppercase tracking-widest hover:underline"
            >
              Mark all as read
            </button>
          </div>
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm divide-y divide-slate-50">
            {loading ? (
              <div className="p-20 text-center font-bold text-slate-400 uppercase tracking-widest italic">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-20 text-center">
                 <Bell className="mx-auto text-slate-200 mb-6" size={64} />
                 <h3 className="text-xl font-black text-slate-900">No Notifications</h3>
                 <p className="text-slate-500 mt-3 font-medium">You're all caught up!</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div key={notif.id} className={`p-8 flex items-start gap-6 hover:bg-slate-50/50 transition-colors group cursor-pointer ${!notif.is_read ? 'bg-blue-50/20' : ''}`}>
                  <div className={`p-4 rounded-2xl shrink-0 ${!notif.is_read ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                    <Bell size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className="font-black text-slate-900 text-base group-hover:text-blue-600 transition-colors">{notif.title}</h4>
                      <span className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <Clock size={14} />
                        {new Date(notif.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 font-medium mt-2 leading-relaxed">{notif.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
