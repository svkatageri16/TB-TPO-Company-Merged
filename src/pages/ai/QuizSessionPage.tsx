import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api.ts";
import { AlertCircle, Clock, Save, ShieldAlert, SkipForward } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function QuizSessionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  
  const [timeLeft, setTimeLeft] = useState(0);
  const [violations, setViolations] = useState(0);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    fetchQuiz();
  }, [id]);

  const fetchQuiz = async () => {
    try {
      const res = await api.get(`/quiz/session/${id}`);
      if (res.data?.success) {
        setQuiz(res.data.quiz);
        setQuestions(res.data.questions);
        setTimeLeft(res.data.questions.length * 60); // 1 min per question
      }
    } catch(e) {
      alert("Failed to load quiz");
      navigate("/ai-quiz");
    } finally {
      setLoading(false);
    }
  };

  const startTest = () => {
    if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {});
    }
    setHasStarted(true);
  };

  // Timer Focus & Auto Submit
  useEffect(() => {
    if (loading || !quiz || !hasStarted) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          submitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, quiz, hasStarted]);

  // Anti-Cheat System
  useEffect(() => {
    if (loading || !quiz || !hasStarted) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation("Tab/Window Switch Detected! Auto-submitting assessment.");
        setTimeout(() => submitQuiz(), 1500);
      }
    };
    
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      handleViolation("Copy/Paste is strictly prohibited.");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handleCopy);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handleCopy);
    };
  }, [loading, quiz, hasStarted, violations]);

  const handleViolation = (msg: string) => {
    setWarningMessage(msg);
    setViolations(v => {
      const newV = v + 1;
      if (newV >= 3) {
        setTimeout(submitQuiz, 1000); // give time to see warning
      }
      return newV;
    });
    setTimeout(() => setWarningMessage(null), 3000);
  };

  const selectAnswer = (answer: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [questions[currentIndex].id]: answer
    }));
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const submitQuiz = async () => {
    try {
      const answersArray = Object.keys(userAnswers).map(qId => ({
        questionId: parseInt(qId),
        userAnswer: userAnswers[parseInt(qId)]
      }));
      
      const res = await api.post("/quiz/submit", {
        quizId: id,
        answers: answersArray,
        violations
      });

      if (document.fullscreenElement) {
        document.exitFullscreen().catch(()=>{});
      }

      if (res.data?.success) {
        navigate(`/ai-quiz/result/${id}`);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to submit test.");
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-bold">Loading Assessment Engine...</div>;
  }

  if (!quiz || questions.length === 0) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-800 font-bold">Quiz data unavailable or no questions found.</div>;
  }

  const currentQ = questions[currentIndex] || null;
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  return (
    <div ref={containerRef} className="min-h-screen bg-slate-50 flex flex-col items-center select-none relative">
      {!hasStarted ? (
        <div className="w-full h-screen bg-slate-900 flex items-center justify-center p-4">
           <div className="max-w-md w-full bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl text-center text-white">
              <ShieldAlert size={48} className="text-emerald-400 mx-auto mb-6" />
              <h2 className="text-2xl font-black mb-2 uppercase tracking-tight">System Check</h2>
              <p className="text-slate-400 text-sm font-medium mb-6">You are about to start a monitored AI Assessment. The following strict anti-cheat measures are active:</p>
              <ul className="text-left bg-slate-900 p-4 rounded-xl space-y-3 mb-8 border border-slate-700/50">
                <li className="flex items-center gap-2 text-sm text-slate-300 font-medium"><ShieldAlert size={14} className="text-red-400"/> Test runs in Full Screen Mode.</li>
                <li className="flex items-center gap-2 text-sm text-slate-300 font-medium"><ShieldAlert size={14} className="text-red-400"/> Changing tabs or windows will auto-submit.</li>
                <li className="flex items-center gap-2 text-sm text-slate-300 font-medium"><ShieldAlert size={14} className="text-red-400"/> Copy/Paste is strictly disabled.</li>
                <li className="flex items-center gap-2 text-sm text-slate-300 font-medium"><Clock size={14} className="text-blue-400"/> Timed execution ({Math.floor(timeLeft/60)} minutes).</li>
              </ul>
              <button onClick={startTest} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest py-4 rounded-xl shadow-xl shadow-emerald-900/50 transition-all flex items-center justify-center gap-3">
                I Understand, Start Test <SkipForward size={18} />
              </button>
           </div>
        </div>
      ) : (
        <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col mt-10 relative">
          {/* Header (Security & Timer) */}
          <div className="bg-slate-900 px-8 py-5 flex items-center justify-between text-white">
            <div className="flex items-center gap-6">
             <div>
               <h1 className="text-xl font-black">{quiz.quiz_type}</h1>
               <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{quiz.role}</p>
             </div>
          </div>
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-2 bg-red-500/20 text-red-400 px-4 py-2 rounded-xl font-bold border border-red-500/30">
                <ShieldAlert size={18} /> Anti-Cheat Active
                <span className="ml-2 text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">{violations}/3</span>
             </div>
             <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-xl font-mono text-lg font-bold border border-slate-700">
                <Clock size={18} className="text-blue-400" />
                {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
             </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-slate-100">
          <motion.div 
            initial={{ width: 0 }} 
            animate={{ width: `${progress}%` }} 
            className="h-full bg-emerald-500"
          />
        </div>

        {/* Warning Notification */}
        <AnimatePresence>
          {warningMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute top-24 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-8 py-4 rounded-2xl shadow-2xl font-bold flex items-center gap-3 border-4 border-red-900"
            >
              <AlertCircle size={24} />
              {warningMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Question Area */}
        <div className="flex-1 p-8 md:p-12">
            <div className="mb-8">
              <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Question {currentIndex + 1} of {questions.length}</span>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mt-2 leading-relaxed">
                {currentQ.question}
              </h2>
            </div>
            
            <div className="space-y-4">
              {currentQ.options.map((opt: string, idx: number) => {
                const isSelected = userAnswers[currentQ.id] === opt;
                return (
                  <button
                    key={idx}
                    onClick={() => selectAnswer(opt)}
                    className={`w-full text-left p-5 rounded-2xl border-2 transition-all font-medium text-lg flex items-start gap-4 ${isSelected ? 'bg-indigo-50 border-indigo-500 text-indigo-900 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-slate-50'}`}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}>
                       {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    {opt}
                  </button>
                )
              })}
            </div>
        </div>

        {/* Footer actions */}
        <div className="bg-slate-50 p-6 md:px-12 border-t border-slate-100 flex justify-between items-center">
            <button 
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex(c => c - 1)}
              className="font-bold text-slate-400 hover:text-slate-700 disabled:opacity-0 transition-colors uppercase text-sm tracking-widest"
            >
              Previous
            </button>
            
            {currentIndex === questions.length - 1 ? (
              <button 
                onClick={submitQuiz}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all shadow-xl shadow-emerald-500/20 active:scale-95"
              >
                Submit Exam <Save size={18} />
              </button>
            ) : (
              <button 
                onClick={nextQuestion}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all active:scale-95 shadow-xl shadow-slate-200"
              >
                Next <SkipForward size={18} />
              </button>
            )}
        </div>
      </div>
      )}
    </div>
  );
}
