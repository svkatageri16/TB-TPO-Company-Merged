import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api.ts";
import { 
  Clock, CheckCircle, AlertTriangle, 
  ChevronRight, ArrowLeft, Timer, Shield, History, Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { HiringTimeline } from "../components/HiringTimeline.tsx";

export function JobStageActionPage() {
  const { appId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [timeline, setTimeline] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState('INTRO'); // INTRO, TEST, SCHEDULE, COMPLETED
  
  // Test State
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [testResult, setTestResult] = useState<any>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    fetchStatus();
    fetchTimeline();
  }, [appId]);

  const fetchStatus = async () => {
    try {
      const { data: statusRes } = await api.get(`/jobs/application-status/${appId}`);
      if (statusRes.success) {
        setData(statusRes.data);
        const config = typeof statusRes.data.config_json === 'string' ? JSON.parse(statusRes.data.config_json) : (statusRes.data.config_json || {});
        setTimeLeft((config.duration || 30) * 60);
      }
    } catch (e) {
      console.error(e);
      navigate("/applied-jobs");
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeline = async () => {
    try {
      const { data: timelineRes } = await api.get(`/jobs/application/${appId}/timeline`);
      if (timelineRes.success) {
        setTimeline(timelineRes.data);
      }
    } catch (e) {
      console.error("Error fetching timeline:", e);
    }
  };

  const startTest = () => {
    setStep('TEST');
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          submitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Anti-cheat
    window.addEventListener('blur', () => {
       alert("Tab switching is detected. Your test will be auto-submitted.");
       submitTest();
    });
  };

  const submitTest = async () => {
    clearInterval(timerRef.current);
    try {
      const res = await api.post("/jobs/applications/submit-test", {
        applicationId: appId,
        stageId: data.current_stage_id,
        answers
      });
      setTestResult(res.data);
      setStep('COMPLETED');
    } catch (e) {
      alert("Failed to submit test");
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
  </div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <button 
           onClick={() => navigate("/student/dashboard")}
           className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-all font-black text-[10px] uppercase tracking-widest mb-10"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <AnimatePresence mode="wait">
          {step === 'INTRO' && (
            <motion.div 
               key="intro"
               initial={{ opacity: 0, scale: 0.98 }}
               animate={{ opacity: 1, scale: 1 }}
               className="space-y-8"
            >
               {/* Timeline Header */}
               <div className="bg-white rounded-[40px] border border-slate-200 p-10 shadow-sm">
                  <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">Hiring Progress</h4>
                  <HiringTimeline applicationId={Number(appId)} />
               </div>

               <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-2xl shadow-indigo-500/5">
                  <div className="p-12 border-b border-slate-50">
                     <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-indigo-600 text-white rounded-2xl">
                           {data.stage_type === 'TEST' ? <Timer size={24} /> : <Shield size={24} />}
                        </div>
                        <div>
                           <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight">{data.stage_name}</h1>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hiring Pipeline Step {data.stage_order}</p>
                        </div>
                     </div>
                  </div>

                  <div className="p-12 space-y-8">
                     <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-4">Instructions</h3>
                        <p className="text-slate-500 text-sm leading-relaxed mb-6">
                           {data.description || "Please follow the instructions for this stage carefully to proceed further in the hiring process."}
                        </p>
                        
                        {data.stage_type === 'TEST' && (
                           <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                 <div className="bg-white p-4 rounded-2xl border border-indigo-50 flex items-center gap-4">
                                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center"><Clock size={18}/></div>
                                    <div>
                                       <p className="text-[9px] font-black text-slate-400 uppercase">Duration</p>
                                       <p className="text-xs font-black text-indigo-600 uppercase tracking-tight">{timeLeft/60} Minutes</p>
                                    </div>
                                 </div>
                                 <div className="bg-white p-4 rounded-2xl border border-indigo-50 flex items-center gap-4">
                                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center"><CheckCircle size={18}/></div>
                                    <div>
                                       <p className="text-[9px] font-black text-slate-400 uppercase">Questions</p>
                                       <p className="text-xs font-black text-indigo-600 uppercase tracking-tight">{data.content.questions?.length || 0} MCQ</p>
                                    </div>
                                 </div>
                              </div>

                              {data.content.schedule && (
                                <div className="p-6 bg-indigo-600 rounded-3xl text-white shadow-xl shadow-indigo-500/20">
                                   <p className="text-[10px] font-black uppercase tracking-widest mb-4 opacity-70">Scheduled Test Time</p>
                                   <div className="flex items-center gap-6">
                                      <div>
                                         <p className="text-[10px] font-bold opacity-60 uppercase mb-1">Date & Time</p>
                                         <p className="text-lg font-black uppercase">{new Date(data.content.schedule.scheduled_at).toLocaleString()}</p>
                                         {(() => {
                                            const diff = new Date(data.content.schedule.scheduled_at).getTime() - new Date().getTime();
                                            if (diff > 0) {
                                               const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                                               const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                               const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                                               return (
                                                  <p className="text-[9px] font-bold bg-white/20 px-2 py-0.5 rounded-full mt-2 inline-block">
                                                     Starts in: {days > 0 ? `${days}d ` : ''}{hours}h {mins}m
                                                  </p>
                                               );
                                            }
                                            return null;
                                         })()}
                                      </div>
                                   </div>
                                </div>
                              )}
                           </div>
                        )}

                        {data.stage_type.startsWith('INTERVIEW') && data.content.schedule && (
                          <div className="p-6 bg-indigo-600 rounded-3xl text-white shadow-xl shadow-indigo-500/20">
                             <p className="text-[10px] font-black uppercase tracking-widest mb-4 opacity-70">Scheduled Interview</p>
                             <div className="flex items-center gap-6">
                                <div>
                                   <p className="text-[10px] font-bold opacity-60 uppercase mb-1">Date & Time</p>
                                   <p className="text-lg font-black uppercase">{new Date(data.content.schedule.scheduled_at).toLocaleString()}</p>
                                   {(() => {
                                      const diff = new Date(data.content.schedule.scheduled_at).getTime() - new Date().getTime();
                                      if (diff > 0) {
                                         const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                                         const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                         const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                                         return (
                                            <p className="text-[9px] font-bold bg-white/20 px-2 py-0.5 rounded-full mt-2 inline-block">
                                               Starts in: {days > 0 ? `${days}d ` : ''}{hours}h {mins}m
                                            </p>
                                         );
                                      }
                                      return null;
                                   })()}
                                </div>
                                {data.stage_type === 'INTERVIEW_ONLINE' && (
                                   <a 
                                     href={data.content.schedule.location_or_link} 
                                     target="_blank"
                                     className="ml-auto px-6 py-3 bg-white text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg"
                                   >
                                     Join Meeting
                                   </a>
                                )}
                                {data.stage_type === 'INTERVIEW_OFFLINE' && (
                                   <div className="ml-auto flex flex-col items-end">
                                      <p className="text-[10px] font-bold opacity-60 uppercase mb-1">Office Location</p>
                                      <p className="text-sm font-black whitespace-pre-line">{data.content.schedule.location_or_link}</p>
                                   </div>
                                )}
                             </div>
                             {data.content.schedule.notes && (
                                <div className="mt-4 pt-4 border-t border-white/20">
                                   <p className="text-[10px] font-bold opacity-60 uppercase mb-2">Important Instructions</p>
                                   <p className="text-xs">{data.content.schedule.notes}</p>
                                </div>
                             )}
                          </div>
                        )}
                     </div>

                     <div className="flex justify-end pt-4">
                        {data.stage_type === 'TEST' ? (
                          <button 
                            disabled={data.content.schedule && new Date(data.content.schedule.scheduled_at).getTime() > new Date().getTime()}
                            onClick={startTest}
                            className="px-12 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {data.content.schedule && new Date(data.content.schedule.scheduled_at).getTime() > new Date().getTime() 
                               ? `Starts at ${new Date(data.content.schedule.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
                               : "Start Evaluation"} 
                            <ChevronRight size={16} />
                          </button>
                        ) : (
                          <button 
                            onClick={() => navigate("/applied-jobs")}
                            className="px-12 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all"
                          >
                            Understood
                          </button>
                        )}
                     </div>
                  </div>
               </div>

               {/* History Section */}
               {timeline?.history && timeline.history.length > 0 && (
                  <div className="bg-white rounded-[40px] border border-slate-200 p-10 shadow-sm mt-8">
                     <div className="flex items-center gap-3 mb-8">
                        <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white">
                           <History size={16} />
                        </div>
                        <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">Application Activity</h4>
                     </div>
                     <div className="space-y-6">
                        {timeline.history.map((item: any, i: number) => {
                           const stage = timeline.stages.find((s: any) => s.id === item.stage_id);
                           return (
                              <div key={i} className="flex gap-6 relative">
                                 {i !== timeline.history.length - 1 && (
                                    <div className="absolute left-4 top-8 bottom-[-24px] w-0.5 bg-slate-100" />
                                 )}
                                 <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${
                                    item.action === 'REJECTED' ? 'bg-red-50 text-red-500' :
                                    item.action === 'APPLIED' ? 'bg-slate-900 text-white' :
                                    'bg-emerald-50 text-emerald-500'
                                 }`}>
                                    {item.action === 'REJECTED' ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
                                 </div>
                                 <div className="flex-1 pb-6 border-b border-slate-50 last:border-0 last:pb-0">
                                    <div className="flex items-center justify-between mb-1">
                                       <p className="text-sm font-black text-slate-800 uppercase tracking-tight">
                                          {item.action === 'REJECTED' ? 'Application Rejected' : (stage?.stage_name || item.action)}
                                       </p>
                                       <span className="text-[10px] font-bold text-slate-400 uppercase">
                                          {new Date(item.created_at).toLocaleDateString()}
                                       </span>
                                    </div>
                                    <p className="text-xs text-slate-500 leading-relaxed">{item.notes}</p>
                                 </div>
                              </div>
                           );
                        })}
                     </div>
                  </div>
               )}
            </motion.div>
          )}

          {step === 'TEST' && (
             <motion.div 
               key="test"
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               className="space-y-8"
             >
                <div className="flex justify-between items-center bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm mb-4">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black">?</div>
                      <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">{data.stage_name}</h2>
                   </div>
                   <div className={`px-6 py-3 rounded-2xl flex items-center gap-3 font-black text-lg ${timeLeft < 60 ? 'bg-red-50 text-red-500 animate-pulse' : 'bg-slate-50 text-slate-600'}`}>
                      <Timer size={20} /> {formatTime(timeLeft)}
                   </div>
                </div>

                <div className="space-y-6">
                   {data.content.questions.map((q: any, i: number) => (
                      <div key={q.id} className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm">
                         <div className="flex gap-6">
                            <span className="text-2xl font-black text-indigo-100">{i + 1}</span>
                            <div className="flex-1">
                               <p className="text-lg font-bold text-slate-800 mb-8">{q.question_text}</p>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {JSON.parse(q.options_json).map((opt: string) => (
                                     <button 
                                       key={opt}
                                       onClick={() => setAnswers({...answers, [q.id]: opt})}
                                       className={`p-6 rounded-3xl border-2 text-left font-black text-xs uppercase tracking-tight transition-all ${answers[q.id] === opt ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-500/20' : 'bg-slate-50 border-transparent text-slate-500 hover:border-indigo-200'}`}
                                     >
                                        {opt}
                                     </button>
                                  ))}
                               </div>
                            </div>
                         </div>
                      </div>
                   ))}
                </div>

                <div className="flex justify-end pt-10">
                   <button 
                     onClick={submitTest}
                     className="px-12 py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase text-sm tracking-widest shadow-2xl shadow-indigo-500/30 hover:bg-indigo-700 transition-all"
                   >
                     Submit Evaluation
                   </button>
                </div>
             </motion.div>
          )}

          {step === 'COMPLETED' && (
             <motion.div 
               key="completed"
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               className="bg-white rounded-[40px] p-16 text-center border border-slate-200 shadow-2xl shadow-indigo-500/5"
             >
                <div className={`w-24 h-24 mx-auto rounded-[32px] flex items-center justify-center text-white mb-10 ${testResult.passed ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-red-500 shadow-red-500/20'} shadow-2xl`}>
                   {testResult.passed ? <CheckCircle size={48} /> : <AlertTriangle size={48} />}
                </div>
                <h2 className="text-4xl font-black text-slate-800 uppercase tracking-tighter mb-4">
                  {testResult.passed ? 'Assessment Passed' : 'Evaluation Result'}
                </h2>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-8">
                  {testResult.passed ? 'You have successfully moved to the next stage' : 'Unfortunately you did not meet the required criteria'}
                </p>
                
                <div className="max-w-xs mx-auto p-8 bg-slate-50 rounded-[32px] border border-slate-100 mb-12">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Your Final Score</p>
                   <p className={`text-5xl font-black ${testResult.passed ? 'text-emerald-600' : 'text-red-600'}`}>
                      {Math.round(testResult.score)}%
                   </p>
                </div>

                <button 
                  onClick={() => navigate("/student/dashboard")}
                  className="px-12 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all"
                >
                  Return to Dashboard
                </button>
             </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
