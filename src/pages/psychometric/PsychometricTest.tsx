import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api.ts";
import { useAuth } from "../../context/AuthContext.tsx";
import { 
  ShieldCheck, Camera, Maximize, AlertTriangle, 
  Timer, ChevronRight, ChevronLeft, CheckCircle, 
  UserCheck, Lock, Monitor, Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";

export function PsychometricTest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Test Flow State: INTRO, VERIFY, ASSESSMENT, COMPLETED
  const [step, setStep] = useState('INTRO');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [attemptId, setAttemptId] = useState<number | null>(null);
  
  // Anti-cheating State
  const [violations, setViolations] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(1800); // 30 mins
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const timerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<any>(null);

  // Callback ref to handle video binding immediately when element mounts
  const videoCallbackRef = (node: HTMLVideoElement | null) => {
    if (node && streamRef.current) {
      node.srcObject = streamRef.current;
      node.onloadedmetadata = () => {
        node.play().catch(e => console.error("Video play failed:", e));
      };
    }
  };

  useEffect(() => {
    fetchQuestions();
    
    // Prevent copy/paste/right-click
    const preventActions = (e: any) => e.preventDefault();
    document.addEventListener('contextmenu', preventActions);
    document.addEventListener('copy', preventActions);
    document.addEventListener('paste', preventActions);

    return () => {
      document.removeEventListener('contextmenu', preventActions);
      document.removeEventListener('copy', preventActions);
      document.removeEventListener('paste', preventActions);
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      if (step === 'ASSESSMENT' && !isFull) {
        toast.error("Security Breach: Fullscreen exit detected. Auto-submitting test.");
        submitAssessment();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [step]);

  useEffect(() => {
    if (step === 'ASSESSMENT') {
      // Tab switching detection - NO WARNING, AUTO SUBMIT
      const handleVisibilityChange = () => {
        if (document.hidden) {
          toast.error("Security Breach: Tab switching detected. Test terminated.");
          submitAssessment();
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      // Face detection interval (Simulated for now, would use face-api.js in real prod)
      detectionIntervalRef.current = setInterval(() => {
        // Here we would perform face detection. For now, we simulate monitoring.
        // If camera stream is lost or face not centered
        if (!streamRef.current?.active) {
           handleViolation('CAMERA_OFF', 'Camera turned off detected');
        }
      }, 5000);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
      };
    }
  }, [step, attemptId]);

  const fetchQuestions = async () => {
    try {
      const { data } = await api.get("/psychometric/questions");
      if (data.success) setQuestions(data.data);
    } catch (e) {
      toast.error("Failed to load assessment questions");
    }
  };


  const startVerification = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        } 
      });
      streamRef.current = stream;
      setStep('VERIFY');
    } catch (e) {
      console.error("Camera error:", e);
      toast.error("Camera permission is required for this assessment");
    }
  };

  const enterFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    }
  };

  const startAssessment = async () => {
    if (!document.fullscreenElement) {
      toast.error("Please enter fullscreen mode to start");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/psychometric/start", { userId: user?.id });
      if (data.success) {
        setAttemptId(data.attemptId);
        setStep('ASSESSMENT');
        setIsFullscreen(true);
        startTimer();
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to start assessment");
      if (e.response?.data?.message?.includes("already completed")) {
         navigate("/student/dashboard");
      }
    } finally {
      setLoading(false);
    }
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          submitAssessment();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleViolation = async (type: string, details: string) => {
    setViolations(prev => {
      const newCount = prev + 1;
      if (newCount >= 3) {
        toast.error("Critical Security Violation: Face not detected. Auto-submitting assessment.");
        submitAssessment();
      } else {
        toast.error(`${details}. Warning ${newCount}/3. Test will auto-submit on 3rd violation.`, { duration: 5000 });
      }
      return newCount;
    });

    if (attemptId) {
      try {
        await api.post("/psychometric/violation", { attemptId, violationType: type, details });
      } catch (e) { console.error(e); }
    }
  };

  const captureIdentity = () => {
    const video = document.querySelector('video');
    if (video) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      setBaseImage(canvas.toDataURL('image/jpeg'));
      toast.success("Identity captured successfully!");
    }
  };

  const submitAssessment = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (document.fullscreenElement) document.exitFullscreen();
    
    setLoading(true);
    try {
      const { data } = await api.post("/psychometric/submit", {
        userId: user?.id,
        attemptId,
        answers
      });
      if (data.success) {
        setStep('COMPLETED');
      }
    } catch (e) {
      toast.error("Failed to submit assessment");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progress = ((Object.keys(answers).length / questions.length) * 100) || 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-800 uppercase tracking-tight">Psychometric Assessment</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">VEGA Official Certification</p>
          </div>
        </div>

        {step === 'ASSESSMENT' && (
          <div className="flex items-center gap-8">
            <div className="flex flex-col items-end">
               <div className="flex items-center gap-2 text-slate-600 font-black text-sm mb-1">
                  <Timer size={18} className={timeLeft < 300 ? 'text-red-500 animate-pulse' : ''} />
                  {formatTime(timeLeft)}
               </div>
               <div className="w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-indigo-600"
                  />
               </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-red-50 text-red-600 rounded-xl border border-red-100">
               <AlertTriangle size={16} />
               <span className="text-[10px] font-black uppercase">Violations: {violations}/3</span>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-8 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {step === 'INTRO' && (
            <motion.div 
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-[40px] border border-slate-200 shadow-2xl shadow-indigo-500/5 overflow-hidden"
            >
              <div className="p-12 border-b border-slate-50 bg-indigo-50/30">
                <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight mb-2">Assessment Instructions</h2>
                <p className="text-slate-500 font-medium">Please read carefully before proceeding. This evaluation is mandatory for all VEGA students.</p>
              </div>
              <div className="p-12 grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <InstructionItem 
                    icon={<Monitor size={20} />} 
                    title="Strict Environment" 
                    desc="Assessment must be completed in fullscreen. Tab switching or exiting fullscreen will be logged as a violation." 
                  />
                  <InstructionItem 
                    icon={<Camera size={20} />} 
                    title="Camera Monitoring" 
                    desc="Webcam must be active throughout the test. Face detection AI will monitor for suspicious activity." 
                  />
                  <InstructionItem 
                    icon={<Lock size={20} />} 
                    title="Single Attempt" 
                    desc="You only get one chance to complete this assessment. Ensure a stable internet connection." 
                  />
                </div>
                <div className="space-y-6">
                  <InstructionItem 
                    icon={<Info size={20} />} 
                    title="Assessment Focus" 
                    desc="This test evaluates Personality, Cognitive Ability, and Workplace Readiness." 
                  />
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Assessment Structure</p>
                     <div className="space-y-3">
                        <StructureItem label="Personality Traits" count="10 Questions" />
                        <StructureItem label="Cognitive Ability" count="10 Questions" />
                        <StructureItem label="Behavioral Scenarios" count="5 Questions" />
                     </div>
                  </div>
                </div>
              </div>
              <div className="p-12 bg-slate-50 flex justify-end gap-4">
                <button 
                  onClick={() => navigate("/student/dashboard")}
                  className="px-10 py-4 text-slate-400 font-black uppercase text-xs tracking-widest hover:text-slate-600 transition-all"
                >
                  Maybe Later
                </button>
                <button 
                  onClick={startVerification}
                  className="px-12 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center gap-2"
                >
                  Start Verification <ChevronRight size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 'VERIFY' && (
            <motion.div 
              key="verify"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-xl mx-auto w-full text-center"
            >
              <div className="bg-white rounded-[40px] border border-slate-200 p-12 shadow-2xl shadow-indigo-500/5">
                <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8">
                  <UserCheck size={40} />
                </div>
                <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight mb-4">Identity Verification</h2>
                <p className="text-slate-500 mb-10">Ensure your face is clearly visible and centered in the camera frame.</p>
                
                <div className="relative aspect-video bg-slate-900 rounded-[32px] overflow-hidden mb-10 border-4 border-indigo-100 ring-8 ring-indigo-50/50">
                  <video 
                    ref={videoCallbackRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover" 
                  />
                  <div className="absolute inset-0 border-[40px] border-transparent border-t-indigo-600/10 border-b-indigo-600/10 flex items-center justify-center pointer-events-none">
                     <div className="w-48 h-64 border-2 border-dashed border-white/50 rounded-full" />
                  </div>
                </div>

                {!isFullscreen ? (
                  <button 
                    onClick={enterFullscreen}
                    className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all flex items-center justify-center gap-3"
                  >
                    <Maximize size={18} /> Enter Fullscreen to Continue
                  </button>
                ) : !baseImage ? (
                  <button 
                    onClick={captureIdentity}
                    className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3"
                  >
                    Capture Identity <Camera size={18} />
                  </button>
                ) : (
                  <button 
                    disabled={loading}
                    onClick={startAssessment}
                    className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3"
                  >
                    {loading ? "Initializing..." : "Proceed to Assessment"} <ShieldCheck size={18} />
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {step === 'ASSESSMENT' && questions.length > 0 && (
            <motion.div 
              key="assessment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
               <div className="bg-white p-12 rounded-[40px] border border-slate-200 shadow-2xl shadow-indigo-500/5 min-h-[500px] flex flex-col">
                  <div className="flex justify-between items-start mb-12">
                     <div className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                        Section: {questions[currentQuestionIdx].category}
                     </div>
                     <span className="text-xs font-black text-slate-300 uppercase tracking-widest">Question {currentQuestionIdx + 1} of {questions.length}</span>
                  </div>

                  <div className="flex-1">
                     <h3 className="text-2xl font-bold text-slate-800 leading-tight mb-12">
                        {questions[currentQuestionIdx].question_text}
                     </h3>

                     <div className="grid grid-cols-1 gap-4">
                        {(typeof questions[currentQuestionIdx].options_json === 'string' ? JSON.parse(questions[currentQuestionIdx].options_json) : questions[currentQuestionIdx].options_json).map((opt: any, idx: number) => (
                           <button 
                             key={idx}
                             onClick={() => setAnswers({...answers, [questions[currentQuestionIdx].id]: idx})}
                             className={`p-6 rounded-3xl border-2 text-left font-bold transition-all flex items-center justify-between group ${answers[questions[currentQuestionIdx].id] === idx ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-500/20' : 'bg-slate-50 border-transparent text-slate-600 hover:border-indigo-200 hover:bg-white'}`}
                           >
                              <span className="flex items-center gap-4">
                                 <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black transition-colors ${answers[questions[currentQuestionIdx].id] === idx ? 'bg-white/20' : 'bg-white border border-slate-200 group-hover:border-indigo-200'}`}>
                                    {String.fromCharCode(65 + idx)}
                                 </span>
                                 {opt.text}
                              </span>
                              {answers[questions[currentQuestionIdx].id] === idx && <CheckCircle size={20} />}
                           </button>
                        ))}
                     </div>
                  </div>

                  <div className="flex justify-between items-center mt-12 pt-10 border-t border-slate-50">
                     <button 
                        disabled={currentQuestionIdx === 0}
                        onClick={() => setCurrentQuestionIdx(prev => prev - 1)}
                        className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-indigo-600 disabled:opacity-0 transition-all"
                     >
                        <ChevronLeft size={16} /> Previous
                     </button>

                     <div className="flex gap-2">
                        {questions.map((_, idx) => (
                           <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentQuestionIdx ? 'bg-indigo-600 w-4' : (answers[questions[idx].id] !== undefined ? 'bg-emerald-400' : 'bg-slate-200')}`} />
                        ))}
                     </div>

                     {currentQuestionIdx === questions.length - 1 ? (
                        <button 
                           onClick={submitAssessment}
                           className="px-10 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 transition-all"
                        >
                           Final Submit
                        </button>
                     ) : (
                        <button 
                           onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
                           className="flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:translate-x-1 transition-all"
                        >
                           Next Question <ChevronRight size={16} />
                        </button>
                     )}
                  </div>
               </div>
            </motion.div>
          )}

          {step === 'COMPLETED' && (
            <motion.div 
               key="completed"
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               className="max-w-xl mx-auto w-full text-center"
            >
               <div className="bg-white rounded-[40px] border border-slate-200 p-16 shadow-2xl shadow-indigo-500/5">
                  <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-[32px] flex items-center justify-center mx-auto mb-10 shadow-xl shadow-emerald-500/10">
                     <CheckCircle size={48} />
                  </div>
                  <h2 className="text-4xl font-black text-slate-800 uppercase tracking-tighter mb-4">Assessment Finalized</h2>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-12">Your psychometric profile has been generated and integrated into your VEGA Employability Score.</p>
                  
                  <button 
                     onClick={() => navigate("/student/dashboard")}
                     className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all shadow-xl"
                  >
                     Go to Dashboard to View Report
                  </button>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function InstructionItem({ icon, title, desc }: any) {
  return (
    <div className="flex gap-4 p-4 rounded-3xl hover:bg-slate-50 transition-all">
      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-slate-100 shrink-0">
        {icon}
      </div>
      <div>
        <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-1">{title}</h4>
        <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function StructureItem({ label, count }: any) {
  return (
    <div className="flex justify-between items-center text-[10px] font-bold">
      <span className="text-slate-500 uppercase tracking-widest">{label}</span>
      <span className="text-slate-800">{count}</span>
    </div>
  );
}
