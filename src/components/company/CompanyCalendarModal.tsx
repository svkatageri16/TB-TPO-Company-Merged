import React, { useState, useEffect } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin, 
  Video, 
  Calendar as CalendarIcon, 
  ExternalLink, 
  User, 
  Briefcase, 
  AlertTriangle,
  CheckCircle2, 
  Activity,
  FileText
} from 'lucide-react';
import api from '../../services/api';

interface CompanyCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
}

interface InterviewEvent {
  id: number;
  application_id: number;
  type: string;
  location_or_link: string;
  time: string; // ISO string
  role: string;
  candidate: string;
  photo?: string;
  candidate_email?: string;
  notes?: string;
  duration?: number;
  interviewer_name?: string;
  instructions?: string;
  status?: string;
}

interface PendingTask {
  jobId: number;
  jobTitle: string;
  stageId: number;
  stageName: string;
  heldCount: number;
  oldestWaitingDays: number;
  actionPath: string;
}

export function CompanyCalendarModal({ isOpen, onClose, userId }: CompanyCalendarModalProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [interviews, setInterviews] = useState<InterviewEvent[]>([]);
  const [tasks, setTasks] = useState<PendingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<InterviewEvent | null>(null);

  useEffect(() => {
    if (isOpen && userId) {
      fetchCalendarData();
    }
  }, [isOpen, userId]);

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Interviews
      const resInterviews = await api.get(`/analytics/employer/${userId}/interviews`);
      if (resInterviews.data.success) {
        setInterviews(resInterviews.data.data || []);
      }

      // 2. Fetch General Employer Analytics for Bottlenecks/Tasks
      const resAnalytics = await api.get(`/analytics/employer/${userId}`);
      if (resAnalytics.data.success) {
        setTasks(resAnalytics.data.data.heldCandidateTasks || []);
      }
    } catch (error) {
      console.error("Error loading calendar data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get first day of month (0 = Sunday, ..., 6 = Saturday)
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  // Get total days in current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Get total days in previous month
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const prevMonthDays = [];
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    prevMonthDays.push(daysInPrevMonth - i);
  }

  const currentMonthDays = [];
  for (let i = 1; i <= daysInMonth; i++) {
    currentMonthDays.push(i);
  }

  // Total visible grid spots is usually 35 or 42 (6 rows of 7 days)
  const totalVisible = 42;
  const nextMonthDaysCount = totalVisible - (prevMonthDays.length + currentMonthDays.length);
  const nextMonthDays = [];
  for (let i = 1; i <= nextMonthDaysCount; i++) {
    nextMonthDays.push(i);
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('default', { month: 'long', year: 'numeric' });
  };

  // Helper to format key for grouping
  const getLocalDateKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getEventDateKey = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return getLocalDateKey(d);
    } catch (e) {
      return '';
    }
  };

  // Group interviews by local date key
  const interviewsByDate: { [key: string]: InterviewEvent[] } = {};
  interviews.forEach(event => {
    const key = getEventDateKey(event.time);
    if (key) {
      if (!interviewsByDate[key]) {
        interviewsByDate[key] = [];
      }
      interviewsByDate[key].push(event);
    }
  });

  const selectedDateKey = getLocalDateKey(selectedDate);
  const selectedDateInterviews = interviewsByDate[selectedDateKey] || [];

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[250] overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-[32px] shadow-2xl border border-slate-100 flex flex-col md:flex-row overflow-hidden my-8 max-h-[90vh]">
        
        {/* Left Side: Calendar Grid */}
        <div className="flex-1 p-6 md:p-8 flex flex-col border-b md:border-b-0 md:border-r border-slate-100 bg-white">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <CalendarIcon className="text-blue-600" size={24} />
                Recruitment Schedule
              </h2>
              <p className="text-slate-400 font-medium text-xs mt-1">Navigate days to track online assessments and client panel interviews.</p>
            </div>
            
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
              <button 
                onClick={handlePrevMonth}
                className="p-2 hover:bg-white rounded-xl text-slate-600 hover:text-blue-600 hover:shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={handleToday}
                className="px-3.5 py-1.5 hover:bg-white rounded-xl text-xs font-black uppercase tracking-wider text-slate-700 hover:text-blue-600 hover:shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                Month
              </button>
              <button 
                onClick={handleNextMonth}
                className="p-2 hover:bg-white rounded-xl text-slate-600 hover:text-blue-600 hover:shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="text-lg font-black text-slate-800 uppercase tracking-wide mb-4 flex items-center justify-between">
            <span>{formatMonthYear(currentDate)}</span>
            {loading && <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />}
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <span key={day} className="text-[10px] font-black text-slate-400 uppercase tracking-wider py-1">
                {day}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5 flex-1 select-none">
            {/* Previous Month Days */}
            {prevMonthDays.map((d, index) => {
              const dayDate = new Date(year, month - 1, d);
              const key = getLocalDateKey(dayDate);
              const hasEvents = interviewsByDate[key]?.length > 0;
              return (
                <div 
                  key={`prev-${index}`}
                  onClick={() => setSelectedDate(dayDate)}
                  className={`aspect-square p-2 border border-slate-50 rounded-2xl flex flex-col justify-between cursor-pointer transition-all ${
                    selectedDateKey === key 
                      ? 'bg-blue-50/50 border-blue-200' 
                      : 'bg-slate-50/40 text-slate-350 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-[10px] font-bold">{d}</span>
                  {hasEvents && (
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Current Month Days */}
            {currentMonthDays.map(d => {
              const dayDate = new Date(year, month, d);
              const key = getLocalDateKey(dayDate);
              const dayEvents = interviewsByDate[key] || [];
              const isSelected = selectedDateKey === key;
              const isToday = getLocalDateKey(new Date()) === key;

              return (
                <div 
                  key={`curr-${d}`}
                  onClick={() => {
                    setSelectedDate(dayDate);
                    setSelectedEvent(null);
                  }}
                  className={`aspect-square p-2 border rounded-2xl flex flex-col justify-between cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20 hover:bg-blue-700' 
                      : isToday
                      ? 'bg-blue-50 text-blue-600 border-blue-200 font-extrabold hover:bg-blue-100/50'
                      : 'bg-slate-50/50 hover:bg-slate-100/60 text-slate-700 border-slate-100/40'
                  }`}
                >
                  <span className="text-xs font-black">{d}</span>
                  {dayEvents.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-blue-500 text-white'
                      }`}>
                        {dayEvents.length}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Next Month Days */}
            {nextMonthDays.map((d, index) => {
              const dayDate = new Date(year, month + 1, d);
              const key = getLocalDateKey(dayDate);
              const hasEvents = interviewsByDate[key]?.length > 0;
              return (
                <div 
                  key={`next-${index}`}
                  onClick={() => setSelectedDate(dayDate)}
                  className={`aspect-square p-2 border border-slate-50 rounded-2xl flex flex-col justify-between cursor-pointer transition-all ${
                    selectedDateKey === key 
                      ? 'bg-blue-50/50 border-blue-200' 
                      : 'bg-slate-50/40 text-slate-350 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-[10px] font-bold">{d}</span>
                  {hasEvents && (
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Day Details & Active Tasks Panel */}
        <div className="w-full md:w-96 p-6 md:p-8 bg-slate-50/60 flex flex-col overflow-y-auto max-h-full">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              {selectedDate.toLocaleDateString('default', { weekday: 'long', month: 'short', day: 'numeric' })}
            </h3>
            <button 
              onClick={onClose}
              className="p-1.5 bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-800 rounded-xl shadow-sm border border-slate-100 cursor-pointer active:scale-95 transition-all"
            >
              <X size={18} />
            </button>
          </div>

          {/* Details Tabs */}
          {selectedEvent ? (
            /* Selected Event Detailed Panel */
            <div className="space-y-5 animate-fadeIn">
              <button 
                onClick={() => setSelectedEvent(null)}
                className="text-[10px] font-black text-blue-600 hover:underline uppercase tracking-widest flex items-center gap-1 cursor-pointer"
              >
                &larr; Back to day list
              </button>

              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <div className="space-y-1">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    selectedEvent.type?.toLowerCase() === 'online' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                  }`}>
                    {selectedEvent.type?.toLowerCase() === 'online' ? <Video size={10} /> : <MapPin size={10} />}
                    {selectedEvent.type || 'Standard'} Interview
                  </span>
                  <h4 className="text-base font-black text-slate-900 leading-snug mt-1">{selectedEvent.candidate}</h4>
                  <p className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                    <Briefcase size={12} className="text-slate-400" />
                    Role: {selectedEvent.role}
                  </p>
                </div>

                <div className="border-t border-slate-100 pt-3.5 space-y-2.5 text-xs">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Clock size={14} className="text-slate-400 shrink-0" />
                    <span className="font-bold">
                      {new Date(selectedEvent.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {selectedEvent.duration ? ` (${selectedEvent.duration} mins)` : ''}
                    </span>
                  </div>

                  {selectedEvent.interviewer_name && (
                    <div className="flex items-center gap-2 text-slate-700">
                      <User size={14} className="text-slate-400 shrink-0" />
                      <span>Interviewer: <strong className="font-extrabold">{selectedEvent.interviewer_name}</strong></span>
                    </div>
                  )}

                  {selectedEvent.location_or_link && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/80 space-y-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Meeting Details</span>
                      {selectedEvent.type?.toLowerCase() === 'online' ? (
                        <a 
                          href={selectedEvent.location_or_link.startsWith('http') ? selectedEvent.location_or_link : `https://${selectedEvent.location_or_link}`}
                          target="_blank" 
                          rel="noreferrer"
                          className="text-blue-600 hover:underline font-bold flex items-center gap-1"
                        >
                          Join Meeting <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span className="text-slate-700 font-medium">{selectedEvent.location_or_link}</span>
                      )}
                    </div>
                  )}

                  {selectedEvent.notes && (
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Coordinator Notes</span>
                      <p className="text-slate-600 italic bg-white p-2.5 border border-slate-100 rounded-xl leading-relaxed">{selectedEvent.notes}</p>
                    </div>
                  )}

                  {selectedEvent.instructions && (
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Instructions</span>
                      <p className="text-slate-600 bg-white p-2.5 border border-slate-100 rounded-xl leading-relaxed">{selectedEvent.instructions}</p>
                    </div>
                  )}

                  <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                    <span className="text-[10px] font-bold text-slate-400">Status</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                      selectedEvent.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' :
                      selectedEvent.status === 'LIVE' ? 'bg-rose-50 text-rose-600 animate-pulse' :
                      'bg-blue-50 text-blue-600'
                    }`}>
                      {selectedEvent.status || 'Scheduled'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Day Event List & Tasks Panel */
            <div className="space-y-6">
              {/* Interviews Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Activity size={14} className="text-blue-500" />
                  Interviews ({selectedDateInterviews.length})
                </h4>

                {selectedDateInterviews.length === 0 ? (
                  <div className="p-4 text-center bg-white border border-slate-100/80 rounded-2xl text-xs text-slate-400 font-medium italic">
                    No interviews scheduled for this date.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {selectedDateInterviews.map(evt => (
                      <button
                        key={evt.id}
                        onClick={() => setSelectedEvent(evt)}
                        className="w-full text-left bg-white hover:bg-slate-50 p-3.5 rounded-2xl border border-slate-100 shadow-sm transition-all flex flex-col gap-1.5 group cursor-pointer"
                      >
                        <div className="flex justify-between items-start w-full">
                          <span className="text-[10px] font-black text-slate-400">
                            {new Date(evt.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                            evt.type?.toLowerCase() === 'online' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
                          }`}>
                            {evt.type || 'Standard'}
                          </span>
                        </div>
                        <div>
                          <h5 className="text-xs font-black text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1">{evt.candidate}</h5>
                          <span className="text-[10px] text-slate-500 font-semibold line-clamp-1">Role: {evt.role}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Tasks Bottlenecks Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-amber-500" />
                  Pending HR Tasks & Bottlenecks ({tasks.length})
                </h4>

                {tasks.length === 0 ? (
                  <div className="p-4 text-center bg-white border border-slate-100/80 rounded-2xl text-xs text-slate-400 font-medium italic">
                    No active HR task action alerts.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {tasks.map((task, idx) => (
                      <div 
                        key={idx}
                        className="bg-amber-50/50 p-3.5 rounded-2xl border border-amber-100 flex flex-col gap-2"
                      >
                        <div>
                          <h5 className="text-xs font-black text-slate-800 line-clamp-1">{task.jobTitle}</h5>
                          <p className="text-[11px] font-bold text-amber-700 mt-0.5">
                            {task.heldCount} candidate(s) waiting in <span className="underline font-black">{task.stageName}</span>
                          </p>
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-400 font-bold italic">Oldest waiting: {task.oldestWaitingDays} days</span>
                          <a 
                            href={task.actionPath}
                            onClick={onClose}
                            className="text-blue-600 font-black uppercase tracking-widest hover:underline flex items-center"
                          >
                            Advance Pipeline &rarr;
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
