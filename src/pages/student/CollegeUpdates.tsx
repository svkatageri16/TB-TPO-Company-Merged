import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Users, 
  Target, 
  Activity, 
  MapPin, 
  Building2, 
  BookOpen, 
  Clock, 
  Megaphone, 
  ClipboardList,
  Sparkles,
  ChevronRight,
  HelpCircle,
  Bell,
  ArrowRight
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import CollegeAssessments from './CollegeAssessments';

export default function CollegeUpdates() {
  const [activeTab, setActiveTab] = useState<'updates' | 'assessments'>('updates');
  const [updates, setUpdates] = useState<{events: any[], tests: any[], notices: any[]}>({ events: [], tests: [], notices: [] });
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUpdates();
  }, []);

  const fetchUpdates = async () => {
    try {
      setLoading(true);
      const res = await api.get('/students/college-updates');
      if (res.data.success) {
        setUpdates(res.data.data);
      }
    } catch (error) {
      toast.error('Failed to load college updates');
    } finally {
      setLoading(false);
    }
  };

  if (!profile?.college_id) {
    return (
      <div className="max-w-7xl mx-auto p-6 md:p-12 flex flex-col items-center justify-center min-h-[75vh] text-center bg-white border border-slate-150 rounded-3xl shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-6">
          <Building2 size={32} className="text-indigo-600 animate-pulse" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-3">College Hub Restricted</h2>
        <p className="text-slate-500 font-semibold max-w-lg mb-6 leading-relaxed">
          This exclusive hub is only available for students who have registered through their college Training & Placement Office (TPO). 
        </p>
        <div className="text-xs text-slate-400 font-medium bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100 max-w-md">
          Please contact your college TPO administrator or update your profile to link with your registered institution.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
      
      {/* Immersive College Portal Welcome Header */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-6 md:p-10 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="absolute left-1/3 bottom-0 w-48 h-48 bg-purple-500/5 blur-[80px] rounded-full pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 w-max">
                <Sparkles size={11} className="animate-pulse" /> Active TPO Student
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase">
              {profile?.college_name || 'My Campus Portal'}
            </h1>
            <p className="text-indigo-200 text-sm max-w-2xl font-medium leading-relaxed">
              Welcome to your dedicated TPO Hub. Stay connected with live Training & Placement announcements, schedule updates, dynamic workshops, and proctored assessment tests assigned by your college administrator.
            </p>
          </div>
          
          <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-4 flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-300">
              <Building2 size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-indigo-300 tracking-wider">Registered Batch</p>
              <p className="text-sm font-extrabold text-white">{profile?.batch_name || 'Class of WIT'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation tab bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('updates')}
            className={`px-6 py-3 rounded-xl font-black text-xs tracking-wider uppercase transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'updates' 
                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10' 
                : 'hover:bg-slate-100 text-slate-500 font-bold'
            }`}
          >
            <Megaphone size={14} className={activeTab === 'updates' ? 'text-indigo-400' : 'text-slate-400'} />
            TPO Updates & Notices
          </button>
          
          <button
            onClick={() => setActiveTab('assessments')}
            className={`px-6 py-3 rounded-xl font-black text-xs tracking-wider uppercase transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'assessments' 
                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10' 
                : 'hover:bg-slate-100 text-slate-500 font-bold'
            }`}
          >
            <ClipboardList size={14} className={activeTab === 'assessments' ? 'text-indigo-400' : 'text-slate-400'} />
            Assigned College Exams
          </button>
        </div>

        {activeTab === 'updates' && (
          <button 
            onClick={fetchUpdates}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 px-4 py-2 rounded-xl transition-colors cursor-pointer"
          >
            Refresh Feed
          </button>
        )}
      </div>

      {/* Primary Tab Contents */}
      <div className="transition-all duration-300">
        {activeTab === 'updates' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Events & Announcements Noticeboard */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-200 pb-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Calendar size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-wider">Campus Notice Board</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recent events, drives & updates</p>
                </div>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-100 shadow-xs">
                  <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-indigo-600 animate-spin mb-4"></div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Syncing TPO news...</span>
                </div>
              ) : updates.events.length === 0 && updates.notices?.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-slate-150 shadow-xs">
                  <Bell size={40} className="mx-auto text-slate-200 mb-4" />
                  <p className="font-bold text-slate-800">Your TPO Feed is Quiet</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">There are no recent announcements, recruitment notices, or workshops scheduled at this moment.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {[...(updates.notices || []).map(n => ({...n, _type: 'notice'})), ...updates.events.map(e => ({...e, _type: 'event'}))].sort((a, b) => new Date(b.created_at || b.start_date || 0).getTime() - new Date(a.created_at || a.start_date || 0).getTime()).map((item, idx) => (
                    <div key={`${item._type}-${item.id}-${idx}`} className="bg-white rounded-3xl p-6 border border-slate-150 hover:border-indigo-200 transition-all shadow-xs relative group overflow-hidden">
                      <div className={`absolute top-0 left-0 bottom-0 w-[4px] rounded-l-full ${item._type === 'notice' ? 'bg-amber-500' : 'bg-indigo-500'}`}></div>
                      
                      <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${item._type === 'notice' ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}>
                          {item._type === 'notice' ? 'CAMPUS NOTICE' : (item.event_type || 'PLACEMENT DRIVE')}
                        </span>
                        
                        {(item.start_date || item.created_at) && (
                          <span className="text-xs font-bold text-slate-500 flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg">
                            <Clock size={13} className="text-slate-400" /> 
                            {new Date(item.start_date || item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        )}
                      </div>

                      <h3 className={`text-lg font-black text-slate-900 transition-colors mb-2 leading-tight ${item._type === 'notice' ? 'group-hover:text-amber-600' : 'group-hover:text-indigo-600'}`}>
                        {item.title}
                      </h3>
                      
                      {item._type === 'notice' && item.batch_name && (
                        <div className="mb-3">
                          <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-600 text-[9px] font-black uppercase tracking-widest rounded-full">
                            Target Audience: {item.batch_name}
                          </span>
                        </div>
                      )}
                      
                      <p className={`text-sm text-slate-600 font-semibold mb-4 leading-relaxed ${item._type === 'notice' ? 'whitespace-pre-wrap' : 'line-clamp-3'}`}>
                        {item.message || item.description}
                      </p>
                      
                      {item._type === 'event' && item.location_or_link && (
                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50/50 px-3.5 py-2.5 rounded-xl border border-indigo-100/50 w-max max-w-full">
                          <MapPin size={14} className="text-indigo-500 shrink-0" />
                          <span className="truncate">{item.location_or_link}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Mini Checklist or Fast Actions */}
            <div className="space-y-6">
              
              <div className="flex items-center gap-3 border-b border-slate-200 pb-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Target size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-wider">Placement Progress</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active assignments check</p>
                </div>
              </div>

              {/* Swift Assessments Summary Card */}
              <div className="bg-gradient-to-b from-white to-slate-50 border border-slate-150 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase">Assigned Tests</span>
                  <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-full uppercase tracking-wider">
                    {updates.tests.length} Active
                  </span>
                </div>
                
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Your Training & Placement Office administers examinations, coding benchmarks, and mock interview prep cycles directly. Always check the exams tab to avoid missing vital windows.
                </p>

                <button 
                  onClick={() => setActiveTab('assessments')}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  Go to Assigned Exams <ArrowRight size={14} />
                </button>
              </div>

              {/* TPO Advice Banner */}
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-3xl p-6 space-y-3">
                <h4 className="text-xs font-black text-indigo-900 uppercase tracking-widest flex items-center gap-1.5">
                  <Activity size={14} className="text-indigo-600 animate-pulse" /> Student Guidelines
                </h4>
                <ul className="space-y-2 text-xs text-indigo-950 font-bold leading-relaxed list-disc list-inside">
                  <li>Verify and maintain profile accuracy to ensure accurate drive scheduling.</li>
                  <li>Arrive 10 minutes early for all dynamic tests and workshops.</li>
                  <li>Enable proctoring logs (camera/geolocation) when demanded by your examiner.</li>
                </ul>
              </div>

            </div>

          </div>
        ) : (
          /* Embed the full dynamic assessments engine components */
          <div className="bg-white border border-slate-150 rounded-3xl p-2 md:p-6 shadow-xs">
            <CollegeAssessments />
          </div>
        )}
      </div>

    </div>
  );
}
