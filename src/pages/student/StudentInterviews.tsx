import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  FileText, 
  Clock, 
  Target, 
  ChevronRight, 
  Trash2, 
  Users, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Video, 
  VideoOff, 
  Mic, 
  Briefcase, 
  Calendar, 
  GraduationCap, 
  Award, 
  AlertCircle 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../../services/api.ts';

interface Interview {
  id: string;
  companyName: string;
  roleTitle: string;
  date: string;
  time: string;
  type: 'Placement' | 'Mock Evaluator';
  status: 'Scheduled' | 'Completed' | 'Pending Decision' | 'No Show';
  interviewerName: string;
  isOnline?: boolean;
  notes?: string;
  grades?: {
    technical: number;
    communication: number;
    culture: number;
    comments: string;
  };
}

export function StudentInterviews() {
  const navigate = useNavigate();
  const [activeSegment, setActiveSegment] = useState<'upcoming' | 'history'>('upcoming');
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInterviews = async () => {
      try {
        const res = await api.get('/interviews/student');
        if (res.data.success && res.data.data) {
          const mappedList = res.data.data.map((item: any) => {
            const parsedTime = new Date(item.time);
            const dateStr = !isNaN(parsedTime.getTime()) 
              ? parsedTime.toLocaleDateString([], { dateStyle: 'medium' })
              : 'Upcoming';
            const timeStr = !isNaN(parsedTime.getTime())
              ? parsedTime.toLocaleTimeString([], { timeStyle: 'short' })
              : 'Scheduled';
            const isOnline = item.type === 'INTERVIEW_ONLINE' || 
                             item.location_or_link === 'WebRTC Live Call Room' ||
                             item.location_or_link === 'Online Interview' ||
                             (item.location_or_link && item.location_or_link.toLowerCase().includes('online')) ||
                             (item.location_or_link && item.location_or_link.toLowerCase().includes('webrtc'));
            
            return {
              id: item.id.toString(),
              companyName: item.company || 'Selected Partner',
              roleTitle: item.role || 'Placement Evaluation',
              date: dateStr,
              time: timeStr,
              type: 'Placement',
              status: item.status === 'COMPLETED' ? 'Completed' : 'Scheduled',
              interviewerName: item.interviewerName || 'Panel Specialist Partner',
              isOnline,
              notes: item.notes
            };
          });

          const defaultMocks: Interview[] = [
            {
              id: 'int-1',
              companyName: 'Stripe Co.',
              roleTitle: 'Frontend Development Internship',
              date: '2026-06-21',
              time: '3:00 PM - 4:00 PM',
              type: 'Placement',
              status: 'Scheduled',
              interviewerName: 'Sarah Jenkins (Engineering Manager)'
            },
            {
              id: 'int-2',
              companyName: 'VEGA Academy',
              roleTitle: 'Mock Technical Interview & Resume Sweep',
              date: '2026-06-25',
              time: '11:00 AM - 11:45 AM',
              type: 'Mock Evaluator',
              status: 'Scheduled',
              interviewerName: 'Prof. Manish Dixit (Alumni Panelist)'
            },
            {
              id: 'int-3',
              companyName: 'Google Cloud Platform Solutions',
              roleTitle: 'Associate Software Dev (Fresher Pool)',
              date: '2026-05-18',
              time: '10:00 AM - 11:00 AM',
              type: 'Placement',
              status: 'Completed',
              interviewerName: 'Devon Lee (Senior Staff Architect)',
              grades: {
                technical: 5,
                communication: 4,
                culture: 5,
                comments: 'Excellent demonstration of algorithmic design. Aaditya solved both problems with zero prompt warnings, wrote modular code and benchmarked time complexities with absolute clarity.'
              }
            },
            {
              id: 'int-4',
              companyName: 'Fintech Spark Inc.',
              roleTitle: 'Backend API Developer Internship',
              date: '2026-05-10',
              time: '4:00 PM - 4:45 PM',
              type: 'Placement',
              status: 'Completed',
              interviewerName: 'Vikas Rao (Tech Lead)',
              grades: {
                technical: 3,
                communication: 5,
                culture: 4,
                comments: 'Good understanding of general RESTful APIs, but was slightly stuck on relational database normalizations for tracking locks. Communication is exceptionally strong!'
              }
            }
          ];

          setInterviews([...mappedList, ...defaultMocks]);
        }
      } catch (e) {
        console.error("Failed to load interview list:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchInterviews();
  }, []);

  const handleJoinRoom = (id: string) => {
    toast.success('Initializing live secure WebRTC channels...');
    navigate(`/interview/live/${id}`);
  };

  const upcomingInterviews = interviews.filter(i => i.status === 'Scheduled');
  const pastInterviews = interviews.filter(i => i.status !== 'Scheduled');

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-8" id="student-interviews-pane">
      {/* Page Header banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight italic">
            Interview <span className="text-indigo-600 font-black">Center</span>
          </h1>
          <p className="text-slate-500 font-medium text-sm">Join active placements drives, take mock interviews, and review performance report summaries.</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveSegment('upcoming')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeSegment === 'upcoming' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Schedules ({upcomingInterviews.length})
          </button>
          <button
            onClick={() => setActiveSegment('history')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeSegment === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            History/Feedback ({pastInterviews.length})
          </button>
        </div>
      </div>

      {activeSegment === 'upcoming' ? (
        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex gap-3.5 items-start">
            <AlertCircle className="text-indigo-600 shrink-0 mt-0.5" size={18} />
            <div className="text-xs text-indigo-900 font-semibold leading-relaxed">
              <span className="font-bold">Protip:</span> Please join rooms 5 minutes before the scheduled time. Ensure your camera, microphone authorizations are granted, and you are logged into a workspace with high network stability.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {upcomingInterviews.length === 0 ? (
              <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-150 shadow-sm">
                <Calendar className="mx-auto text-slate-300 mb-2" size={48} />
                <h3 className="text-lg font-bold text-slate-800">No Scheduled Interviews</h3>
                <p className="text-slate-500 text-sm mt-1">Schedules appear here once a placement recruiter schedules an evaluation stage.</p>
              </div>
            ) : (
              upcomingInterviews.map(item => (
                <div key={item.id} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col justify-between hover:border-slate-200 transition-all">
                  <div>
                    <div className="flex justify-between items-start gap-4">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${item.type === 'Placement' ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'}`}>
                        {item.type}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-bold bg-indigo-50/50 px-2 py-1 rounded">
                        <Calendar size={13} /> {item.date}
                      </div>
                    </div>

                    <h3 className="text-xl font-black text-slate-900 mt-4 tracking-tight">{item.companyName}</h3>
                    <p className="text-sm text-slate-600 font-semibold mt-1 flex items-center gap-1.5">
                      <Briefcase size={14} className="text-slate-400" /> {item.roleTitle}
                    </p>

                    <div className="mt-4 p-3 bg-slate-50 rounded-2xl flex items-center gap-3">
                      <Clock size={16} className="text-slate-400 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-black">Time Slot Invitation</p>
                        <p className="text-xs font-bold text-slate-700">{item.time}</p>
                      </div>
                    </div>

                    <div className="mt-3.5 text-xs text-slate-500 font-medium flex items-center gap-1.5 px-1">
                      <Users size={14} className="text-slate-400" />
                      <span>Interviewer: <strong className="text-slate-700 font-semibold">{item.interviewerName}</strong></span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-50">
                    <button
                      onClick={() => handleJoinRoom(item.id)}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs shadow-lg shadow-indigo-600/15 flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Video size={14} /> Join Video Interview Workspace
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {pastInterviews.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-3xl border border-slate-150 shadow-sm">
                <Award className="mx-auto text-slate-300 mb-2" size={48} />
                <h3 className="text-lg font-bold text-slate-800">No Past Records Found</h3>
                <p className="text-slate-500 text-sm mt-1">Interviewer feedback and scorecards appear here after your final evaluations are archived.</p>
              </div>
            ) : (
              pastInterviews.map(item => (
                <div key={item.id} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:border-slate-200 transition-all space-y-4">
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 border-b border-slate-50 pb-4">
                    <div>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${item.type === 'Placement' ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'}`}>
                        {item.type}
                      </span>
                      <h3 className="text-xl font-black text-slate-900 mt-2 tracking-tight">
                        {item.companyName} <span className="text-slate-400 font-normal text-sm">({item.roleTitle})</span>
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-2 text-right">
                      <div className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5">
                        <Calendar size={13} /> Completed on {item.date}
                      </div>
                      <div className="text-xs text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg font-bold flex items-center gap-1">
                        <CheckCircle2 size={13} /> Evaluated
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Scores block */}
                    <div className="lg:col-span-4 bg-slate-50 p-4 rounded-2xl flex flex-col justify-center space-y-3">
                      <div>
                        <div className="flex justify-between text-xs font-semibold text-slate-500 mb-0.5">
                          <span>Technical Code Ability:</span>
                          <span className="font-mono text-slate-800 font-bold">{item.grades?.technical}/5</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-indigo-600 h-full" style={{ width: `${(item.grades?.technical || 0) * 20}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-semibold text-slate-500 mb-0.5">
                          <span>Communication & Delivery:</span>
                          <span className="font-mono text-slate-800 font-bold">{item.grades?.communication}/5</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-indigo-600 h-full" style={{ width: `${(item.grades?.communication || 0) * 20}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-semibold text-slate-500 mb-0.5">
                          <span>Cultural Alignment:</span>
                          <span className="font-mono text-slate-800 font-bold">{item.grades?.culture}/5</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-indigo-600 h-full" style={{ width: `${(item.grades?.culture || 0) * 20}%` }} />
                        </div>
                      </div>
                    </div>

                    {/* Detailed evaluation remarks */}
                    <div className="lg:col-span-8 flex flex-col justify-between">
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Official Recruiter Remarks & Advice</p>
                        <p className="text-sm font-medium text-slate-600 leading-relaxed italic bg-emerald-50/20 border-l-2 border-emerald-500 p-3.5 rounded-r-xl">
                          "{item.grades?.comments}"
                        </p>
                      </div>

                      <div className="mt-4 text-xs font-bold text-slate-400 flex items-center gap-1 px-1">
                        <Users size={13} />
                        <span>Evaluator feedback catalogued by: <strong className="text-slate-600 font-semibold">{item.interviewerName}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
