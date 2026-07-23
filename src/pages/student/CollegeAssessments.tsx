import React, { useState, useEffect, useRef } from 'react';
// Trigger file watcher refresh for local Vite dev server
import { 
  FileText, 
  Clock, 
  Target, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Eye, 
  MapPin, 
  Hourglass, 
  Calendar,
  Compass,
  ArrowRight,
  Bookmark,
  Award,
  BookOpen,
  Info,
  ChevronRight,
  HelpCircle,
  TrendingUp,
  XCircle,
  Activity
} from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const CountdownTimer = ({ testDate, startTime }: { testDate: string, startTime: string }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!testDate) {
      setTimeLeft('TBA');
      return;
    }
    const testDateStr = testDate.split('T')[0];
    const startStr = `${testDateStr}T${startTime || '00:00'}:00`;
    const startDt = new Date(startStr).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const distance = startDt - now;

      if (distance <= 0) {
        setTimeLeft('Starting shortly...');
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      const parts = [];
      if (days > 0) parts.push(`${days}d`);
      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0) parts.push(`${minutes}m`);
      parts.push(`${seconds}s`);

      setTimeLeft(`Starts in: ${parts.join(' ')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [testDate, startTime]);

  return <span>{timeLeft}</span>;
}

export default function CollegeAssessments() {
  const [activeTab, setActiveTab] = useState<'UPCOMING' | 'LIVE' | 'COMPLETED' | 'MISSED'>('LIVE');
  const [loading, setLoading] = useState(true);
  const [isBatchInactive, setIsBatchInactive] = useState(false);
  
  // Lists
  const [upcomingTests, setUpcomingTests] = useState<any[]>([]);
  const [liveTests, setLiveTests] = useState<any[]>([]);
  const [completedTests, setCompletedTests] = useState<any[]>([]);
  const [missedTests, setMissedTests] = useState<any[]>([]);

  // Selected test context for active exam
  const [activeExam, setActiveExam] = useState<any>(null);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [currentQuestions, setCurrentQuestions] = useState<any[]>([]);
  const [activeQIndex, setActiveQIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({}); // question_id -> answers
  const [warningCount, setWarningCount] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  
  // Post-submission Report View
  const [report, setReport] = useState<any>(null);

  // Timers and Proctoring Refs
  const timerRef = useRef<any>(null);
  const attemptIdRef = useRef<number | null>(null);
  const warningCountRef = useRef<number>(0);

  useEffect(() => {
    attemptIdRef.current = attemptId;
  }, [attemptId]);

  useEffect(() => {
    warningCountRef.current = warningCount;
  }, [warningCount]);

  useEffect(() => {
    fetchMyAssessments();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!attemptId) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        registerViolation('TAB_SWITCH', 'Switched focus away from the active exam screen.');
      }
    };

    const handleBlur = () => {
      registerViolation('BLUR', 'Attempted to minimize window or open external developer panels.');
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [attemptId]);

  const fetchMyAssessments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/assessments/tests');
      if (res.data.success) {
        if (res.data.isBatchInactive) {
          setIsBatchInactive(true);
        } else {
          setIsBatchInactive(false);
        }
        const allTests = res.data.tests || [];
        
        // Categorize based on test date & status
        const upcoming: any[] = [];
        const live: any[] = [];
        const completed: any[] = [];
        const missed: any[] = [];
        
        const now = new Date();

        allTests.forEach((t: any) => {
          const isAttemptFinished = t.attempt && (t.attempt.status === 'COMPLETED' || t.attempt.status === 'VIOLATED' || t.attempt.status === 'SUBMITTED');
          if (isAttemptFinished || t.status === 'COMPLETED') {
            completed.push(t);
          } else if (t.status === 'PUBLISHED' || t.status === 'UPCOMING' || t.status === 'ACTIVE' || t.status === 'ONGOING') {
            let startDt: Date;
            let endDt: Date;

            if (t.test_date) {
              const testDateStr = t.test_date.split('T')[0];
              const startStr = `${testDateStr}T${t.start_time || '00:00'}:00`;
              const endStr = `${testDateStr}T${t.end_time || '23:59'}:00`;
              startDt = new Date(startStr);
              endDt = new Date(endStr);
            } else {
              // Fallback if no test date is specified: treat as active/live
              startDt = new Date(now.getTime() - 24 * 60 * 60 * 1000);
              endDt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            }

            if (t.status === 'ONGOING' || t.status === 'ACTIVE') {
              live.push(t);
            } else if (now >= startDt && now <= endDt) {
              live.push(t);
            } else if (now < startDt) {
              upcoming.push(t);
            } else {
              missed.push(t);
            }
          }
        });

        setUpcomingTests(upcoming);
        setLiveTests(live);
        setCompletedTests(completed);
        setMissedTests(missed);
      }
    } catch (err) {
      toast.error('Failed to load assessments roster');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // START EXAM FLOW
  // -------------------------------------------------------------------------
  const startExamHandler = async (test: any) => {
    // 1. Verify late join window
    const now = new Date();
    const testDateStr = test.test_date ? test.test_date.split('T')[0] : '';
    const startStr = `${testDateStr}T${test.start_time || '00:00'}:00`;
    const startDt = new Date(startStr);
    
    const diffMs = now.getTime() - startDt.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins > test.late_join_window) {
      return toast.error(`Late Entry Window expired! You cannot join after ${test.late_join_window} minutes of test commencement.`);
    }

    // 2. Request Location Permission if required
    let coords = { latitude: 0, longitude: 0 };
    if (test.location_mandatory) {
      try {
        const pos: any = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      } catch (err) {
        return toast.error('Geo-location permission is mandatory to unlock this exam.');
      }
    }

    // 3. Request webcam/audio permission if webcam_monitoring is configured
    if (test.webcam_monitoring) {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        toast.success('Webcam connected successfully');
      } catch (err) {
        return toast.error('Webcam streaming is mandatory for this proctored exam. Please enable permissions.');
      }
    }

    // 4. Initialize Attempt on Backend
    try {
      const res = await api.post('/assessments/student/start', {
        testId: test.id,
        latitude: coords.latitude,
        longitude: coords.longitude
      });

      if (res.data.success) {
        const attempt = res.data.attempt;
        setAttemptId(attempt.id);
        setCurrentQuestions(res.data.questions || []);
        setActiveExam(test);
        setWarningCount(0);
        setSecondsRemaining(test.duration_minutes * 60);
        
        // Enter Fullscreen if supported
        try {
          if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
          }
        } catch (e) {}

        // Start countdown timer
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          setSecondsRemaining((prev) => {
            if (prev <= 1) {
              clearInterval(timerRef.current);
              autoSubmitExam();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        toast.success('Exam session initialized. Lock on Fullscreen is enabled.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not initiate test session');
    }
  };

  // -------------------------------------------------------------------------
  // PROCTORING VIOLATION TRIGGERS
  // -------------------------------------------------------------------------
  const registerViolation = async (vType: string, description: string) => {
    const activeId = attemptIdRef.current;
    if (!activeId) return;

    const nextWarnings = warningCountRef.current + 1;
    setWarningCount(nextWarnings);

    toast.error(`SECURITY WARNING (${nextWarnings}/3): ${description}`, { duration: 5000 });

    try {
      await api.post('/assessments/student/violation', {
        attemptId: activeId,
        violationType: vType,
        description
      });
    } catch (e) {}

    if (nextWarnings >= 3) {
      toast.error('Multiple security violations registered. Auto-submitting assessment.', { duration: 6000 });
      autoSubmitExam();
    }
  };

  // -------------------------------------------------------------------------
  // ANSWER SAVE MECHANICAL ENGINE
  // -------------------------------------------------------------------------
  const saveAnswerHandler = async (questionId: number, answerText: string) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: answerText
    }));

    const activeId = attemptIdRef.current;
    if (!activeId) return;

    try {
      await api.post('/assessments/student/save-answer', {
        attemptId: activeId,
        questionId,
        answerText
      });
    } catch (e) {
      // Slient fail - will retry on select
    }
  };

  // -------------------------------------------------------------------------
  // EXAM SUBMISSION
  // -------------------------------------------------------------------------
  const submitExamHander = async () => {
    submitExamFinal();
  };

  const autoSubmitExam = () => {
    submitExamFinal();
  };

  const submitExamFinal = async () => {
    const activeId = attemptIdRef.current;
    if (!activeId) return;
    try {
      // Exit Fullscreen if supported
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen();
        }
      } catch (e) {}

      if (timerRef.current) clearInterval(timerRef.current);

      const res = await api.post(`/assessments/student/submit/${activeId}`);
      if (res.data.success) {
        toast.success('Assessment evaluated! Detailed reports generated.');
        setReport(res.data.report);
        setActiveExam(null);
        setAttemptId(null);
        fetchMyAssessments();
      }
    } catch (err: any) {
      toast.error('Failed to submit: ' + (err.response?.data?.message || err.message));
    }
  };

  // Formatting helpers
  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-10 space-y-8 font-sans">
      
      {/* -------------------------------------------------------------
          REPORT / COMPLETED VIEW WITH AI STRENGTH RADAR
          ------------------------------------------------------------- */}
      {report && (
        <div className="max-w-4xl mx-auto space-y-8 bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 w-max">
                <CheckCircle2 size={13} /> Evaluation Ready
              </span>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1.5">Your Assessment Score Report</h2>
              <p className="text-slate-400 text-sm font-semibold mt-0.5">Comprehensive correct/wrong breakdowns, accuracy thresholds, and strengths insights.</p>
            </div>
            <button 
              onClick={() => setReport(null)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-md"
            >
              Done Reviewing
            </button>
          </div>

          {/* Scores Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl text-center">
              <div className="text-2xl font-black text-slate-800">{report.score} / {report.max_marks}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Score Obtained</div>
            </div>
            <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl text-center">
              <div className="text-2xl font-black text-slate-800">{report.accuracy}%</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Accuracy %</div>
            </div>
            <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl text-center">
              <div className="text-2xl font-black text-emerald-600">{report.correct_count} Correct</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Answers Matches</div>
            </div>
            <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl text-center">
              <div className={`text-2xl font-black ${report.passed ? 'text-emerald-600' : 'text-red-500'}`}>
                {report.passed ? 'PASSED' : 'FAILED'}
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Evaluation status</div>
            </div>
          </div>

          {/* Detailed Question Review List */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Question Breakdown & Explanation review</h3>
            <div className="space-y-4">
              {report.answers_review?.map((ans: any, idx: number) => (
                <div key={idx} className="border border-slate-100 rounded-2xl p-5 bg-slate-50/50 space-y-3">
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-[9px] font-black tracking-widest uppercase text-slate-400">Question {idx + 1}</span>
                    <span className={`text-[10px] font-black tracking-widest uppercase px-2.5 py-0.5 rounded-full ${
                      ans.is_correct ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {ans.is_correct ? 'CORRECT' : 'WRONG'}
                    </span>
                  </div>
                  
                  <p className="font-bold text-slate-800 text-sm leading-relaxed">{ans.question_text}</p>
                  
                  <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                    <div className="bg-white border border-slate-100 p-2.5 rounded-xl">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase">Your Answer</span>
                      <span className="text-slate-800">{ans.student_answer || 'Skipped'}</span>
                    </div>
                    <div className="bg-white border border-slate-100 p-2.5 rounded-xl">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase">Correct Answer</span>
                      <span className="text-emerald-600">{ans.correct_answer || 'Not specified'}</span>
                    </div>
                  </div>

                  {ans.explanation && (
                    <div className="bg-blue-50/30 border border-blue-100/50 p-3 rounded-xl text-xs text-slate-500 font-semibold leading-relaxed flex gap-2">
                      <Info size={14} className="text-blue-500 shrink-0" />
                      <span><b>Explanation:</b> {ans.explanation}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          ACTIVE EXAM TAKING CANVAS (FULL LOBBY)
          ------------------------------------------------------------- */}
      {activeExam && currentQuestions.length > 0 && (
        <div className="fixed inset-0 bg-slate-900 z-[9999] text-slate-100 flex flex-col font-sans select-none animate-fade-in">
          {/* Header */}
          <div className="bg-slate-950 border-b border-slate-800 p-5 flex justify-between items-center">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-blue-400 bg-blue-950/50 px-2.5 py-0.5 rounded-full border border-blue-900 uppercase tracking-wider">Exam Environment</span>
              <h2 className="text-lg font-black tracking-tight text-white">{activeExam.title}</h2>
            </div>

            <div className="flex items-center gap-6">
              {warningCount > 0 && (
                <div className="flex items-center gap-1 text-red-400 bg-red-950/40 border border-red-900/60 px-3 py-1.5 rounded-xl text-xs font-bold animate-pulse">
                  <AlertTriangle size={14} />
                  <span>{warningCount} / 3 Warnings logged</span>
                </div>
              )}

              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-2xl">
                <Clock size={16} className="text-blue-400" />
                <span className="text-sm font-black font-mono tracking-wider text-white">{formatTime(secondsRemaining)}</span>
              </div>
            </div>
          </div>

          {/* Exam core splitting */}
          <div className="flex-1 flex overflow-hidden">
            
            {/* Sidebar question grid navigation (3 cols width) */}
            <div className="w-64 border-r border-slate-800 bg-slate-950 p-5 flex flex-col justify-between hidden md:flex">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Question Navigation</h3>
                <div className="grid grid-cols-5 gap-2">
                  {currentQuestions.map((q, idx) => {
                    const isAnswered = selectedAnswers[q.id] !== undefined;
                    const isActive = activeQIndex === idx;
                    return (
                      <button
                        key={idx}
                        onClick={() => setActiveQIndex(idx)}
                        className={`w-9 h-9 rounded-xl font-bold text-xs transition-all flex items-center justify-center ${
                          isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 scale-105' :
                          isAnswered ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' :
                          'bg-slate-900 hover:bg-slate-850 text-slate-400 border border-slate-800'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4 border-t border-slate-800 pt-5">
                <div className="text-xs text-slate-400 leading-relaxed font-semibold">
                  Do not switch tabs, exit full-screen mode, or minimize the browser window. Our advanced AI security engine logs every violation.
                </div>
                <button 
                  onClick={submitExamHander}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl transition-all"
                >
                  Finish & Submit Test
                </button>
              </div>
            </div>

            {/* Main Question Display panel (takes remainder) */}
            <div className="flex-1 bg-slate-900 p-8 overflow-y-auto flex flex-col justify-between">
              <div className="max-w-2xl mx-auto w-full space-y-6">
                
                {/* Question Info */}
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black tracking-widest uppercase text-blue-400">Question {activeQIndex + 1} of {currentQuestions.length}</span>
                    <span className="text-[10px] font-black tracking-widest uppercase bg-slate-800 text-slate-300 px-2 py-0.5 rounded-lg">{currentQuestions[activeQIndex]?.marks} Marks</span>
                  </div>
                  <h3 className="text-xl font-bold leading-relaxed text-white">{currentQuestions[activeQIndex]?.question_text}</h3>
                </div>

                {/* Multiple choice options */}
                {currentQuestions[activeQIndex]?.question_type === 'MCQ' && (
                  <div className="space-y-3">
                    {currentQuestions[activeQIndex]?.options?.map((option: string, oIdx: number) => {
                      const isSelected = selectedAnswers[currentQuestions[activeQIndex].id] === option;
                      return (
                        <button
                          key={oIdx}
                          onClick={() => saveAnswerHandler(currentQuestions[activeQIndex].id, option)}
                          className={`w-full text-left p-4 rounded-xl border font-bold text-sm transition-all flex items-center justify-between ${
                            isSelected 
                              ? 'bg-blue-950/40 border-blue-600 text-white shadow-xs shadow-blue-900' 
                              : 'bg-slate-950/30 border-slate-800 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <span className="flex items-center gap-3">
                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black tracking-widest uppercase ${
                              isSelected ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-500'
                            }`}>{String.fromCharCode(65 + oIdx)}</span>
                            {option}
                          </span>
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-700'
                          }`}>
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Other question types input placeholder */}
                {currentQuestions[activeQIndex]?.question_type !== 'MCQ' && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Type Your Answer</label>
                    <textarea 
                      rows={5}
                      placeholder="Input your written solution or response text details..."
                      value={selectedAnswers[currentQuestions[activeQIndex]?.id] || ''}
                      onChange={(e) => saveAnswerHandler(currentQuestions[activeQIndex].id, e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950/40 border border-slate-800 rounded-xl focus:outline-none focus:border-blue-600 text-slate-200 font-medium text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Navigation button deck */}
              <div className="max-w-2xl mx-auto w-full flex justify-between items-center border-t border-slate-800/80 pt-6 mt-12">
                <button
                  onClick={() => setActiveQIndex(prev => Math.max(0, prev - 1))}
                  disabled={activeQIndex === 0}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl font-bold text-xs transition-all disabled:opacity-30"
                >
                  Previous
                </button>

                <div className="flex md:hidden gap-2">
                  <button 
                    onClick={submitExamHander}
                    className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl"
                  >
                    Submit Test
                  </button>
                </div>

                {activeQIndex === currentQuestions.length - 1 ? (
                  <button
                    onClick={submitExamHander}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs transition-all"
                  >
                    Finish & Submit Test
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveQIndex(prev => Math.min(currentQuestions.length - 1, prev + 1))}
                    disabled={activeQIndex === currentQuestions.length - 1}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-all disabled:opacity-30"
                  >
                    Next Question
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          STUDENT PORTAL MAIN DASHBOARD & TABS
          ------------------------------------------------------------- */}
      {!activeExam && !report && (
        <div className="space-y-8">
          
          {/* Welcome Banner */}
          <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-48 h-48 bg-indigo-500/10 blur-3xl rounded-full"></div>
            
            <div className="space-y-2">
              <span className="text-xs font-black bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 w-max">
                <Compass size={13} /> College Assessment Hub
              </span>
              <h2 className="text-3xl font-black tracking-tight">Your Assigned College Assessments</h2>
              <p className="text-slate-300 text-sm font-medium">Verify timelines, practice, and complete active proctored examinations assigned by TPOs.</p>
            </div>
          </div>

          {isBatchInactive && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3 mt-4">
              <ShieldAlert className="text-red-500 shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="font-black text-red-900 text-sm uppercase tracking-wider">Academic Batch Disabled</h4>
                <p className="text-xs text-red-700 font-semibold mt-1">
                  Your academic batch has been disabled or marked inactive by the system administrator. 
                  You cannot view or participate in college assessments until your batch is reactivated.
                </p>
              </div>
            </div>
          )}

          {/* Navigation tabs */}
          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
            {[
              { id: 'LIVE', label: 'Live Test Lobby', count: liveTests.length, color: 'text-blue-600' },
              { id: 'UPCOMING', label: 'Upcoming', count: upcomingTests.length, color: 'text-amber-600' },
              { id: 'COMPLETED', label: 'Completed Review', count: completedTests.length, color: 'text-emerald-600' },
              { id: 'MISSED', label: 'Missed Schedules', count: missedTests.length, color: 'text-red-500' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-all flex items-center gap-2 ${
                    isActive 
                      ? 'bg-slate-900 text-white shadow-md' 
                      : 'hover:bg-slate-100 text-slate-500'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>{tab.count}</span>
                </button>
              );
            })}
          </div>

          {/* Grid list of assessments */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Live Tests Tab List */}
            {activeTab === 'LIVE' && (
              <>
                {liveTests.map((t) => (
                  <div key={t.id} className="bg-white border border-slate-200 hover:border-blue-500 transition-all rounded-3xl p-6 shadow-sm flex flex-col justify-between gap-6 group relative">
                    <span className="absolute top-4 right-4 text-[9px] font-black tracking-widest uppercase bg-red-50 text-red-700 px-2 py-0.5 rounded-full animate-pulse">LIVE NOW</span>
                    
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl w-max"><FileText size={22} /></div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg group-hover:text-blue-600 transition-colors line-clamp-1">{t.title}</h3>
                        <p className="text-slate-400 text-xs font-semibold leading-relaxed line-clamp-2 mt-1">{t.description || 'Proctored college evaluation assessment'}</p>
                      </div>
                    </div>

                    <div className="space-y-4 border-t border-slate-100 pt-4">
                      <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
                        <span className="flex items-center gap-1"><Clock size={13} /> {t.duration_minutes} Mins</span>
                        <span className="flex items-center gap-1"><Target size={13} /> {t.max_marks} Marks</span>
                      </div>

                      <button
                        onClick={() => startExamHandler(t)}
                        className="w-full flex items-center justify-center gap-1.5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl transition-all shadow-md shadow-blue-600/10"
                      >
                        <Play size={13} /> Start Examination
                      </button>
                    </div>
                  </div>
                ))}
                {liveTests.length === 0 && (
                  <div className="col-span-full text-center py-16 bg-white border border-slate-100 rounded-3xl">
                    <Hourglass size={48} className="mx-auto text-slate-200 mb-4" />
                    <h3 className="font-bold text-slate-900 text-lg">No Active Live Exams</h3>
                    <p className="text-slate-400 text-sm max-w-sm mx-auto mt-1">There are no live exams configured or currently running for your batch.</p>
                  </div>
                )}
              </>
            )}

            {/* Upcoming Tests */}
            {activeTab === 'UPCOMING' && (
              <>
                {upcomingTests.map((t) => (
                  <div key={t.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between gap-6 group relative">
                    <div className="space-y-3">
                      <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl w-max"><Calendar size={22} /></div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg line-clamp-1">{t.title}</h3>
                        <p className="text-slate-400 text-xs font-semibold mt-1">Scheduled for: <b>{new Date(t.test_date).toLocaleDateString()}</b> at <b>{t.start_time} - {t.end_time || 'End'}</b></p>
                      </div>
                    </div>

                    <div className="space-y-4 border-t border-slate-100 pt-4">
                      <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
                        <span className="flex items-center gap-1"><Clock size={13} /> {t.duration_minutes} Mins</span>
                        <span className="flex items-center gap-1"><Target size={13} /> {t.max_marks} Marks</span>
                      </div>

                      <button
                        disabled
                        className="w-full flex justify-center py-3 bg-slate-100 text-slate-500 font-bold text-xs rounded-2xl cursor-not-allowed text-center"
                      >
                        <Hourglass size={14} className="mr-2" />
                        <CountdownTimer testDate={t.test_date} startTime={t.start_time} />
                      </button>
                    </div>
                  </div>
                ))}
                {upcomingTests.length === 0 && (
                  <div className="col-span-full text-center py-16 bg-white border border-slate-100 rounded-3xl">
                    <Calendar size={48} className="mx-auto text-slate-200 mb-4" />
                    <h3 className="font-bold text-slate-900 text-lg">No Upcoming Exams Scheduled</h3>
                    <p className="text-slate-400 text-sm max-w-sm mx-auto mt-1">You do not have any scheduled placements examinations configured at this stage.</p>
                  </div>
                )}
              </>
            )}

            {/* Completed Tests */}
            {activeTab === 'COMPLETED' && (
              <>
                {completedTests.map((t) => (
                  <div key={t.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between gap-6 group relative">
                    <div className="space-y-3">
                      <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl w-max"><CheckCircle2 size={22} /></div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg line-clamp-1">{t.title}</h3>
                        <p className="text-slate-400 text-xs font-semibold mt-1">Assessment completed and finalized by AI evaluator engines.</p>
                      </div>
                    </div>

                    <div className="space-y-4 border-t border-slate-100 pt-4">
                      <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
                        <span className="flex items-center gap-1"><Clock size={13} /> {t.duration_minutes} Mins</span>
                        <span className="flex items-center gap-1"><Target size={13} /> {t.max_marks} Marks</span>
                      </div>

                      {t.attempt && (
                        <div className="flex justify-between items-center bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100/30 mt-1">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block leading-none mb-1">Score Obtained</span>
                            <span className="text-sm font-black text-slate-800">{t.attempt.score} / {t.max_marks} Marks</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block leading-none mb-1">Percentage</span>
                            <span className="text-sm font-black text-emerald-600">{Math.round(t.attempt.percentage)}%</span>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={async () => {
                          const loadingToast = toast.loading('Fetching scorecard...');
                          try {
                            const res = await api.get(`/assessments/student/report/${t.id}`);
                            toast.dismiss(loadingToast);
                            if (res.data.success) {
                              setReport(res.data.report);
                            } else {
                              toast.error('Failed to load scorecard');
                            }
                          } catch (err: any) {
                            toast.dismiss(loadingToast);
                            toast.error(err.response?.data?.message || 'Failed to load scorecard');
                          }
                        }}
                        className="w-full py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-1"
                      >
                        <Eye size={13} /> Review Scorecard
                      </button>
                    </div>
                  </div>
                ))}
                {completedTests.length === 0 && (
                  <div className="col-span-full text-center py-16 bg-white border border-slate-100 rounded-3xl">
                    <CheckCircle2 size={48} className="mx-auto text-slate-200 mb-4" />
                    <h3 className="font-bold text-slate-900 text-lg">No Completed Exams on Tally</h3>
                    <p className="text-slate-400 text-sm max-w-sm mx-auto mt-1">Once you complete a scheduled examination, your detailed score report card will load here.</p>
                  </div>
                )}
              </>
            )}

            {/* Missed Schedules */}
            {activeTab === 'MISSED' && (
              <>
                {missedTests.map((t) => (
                  <div key={t.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between gap-6 group relative">
                    <div className="space-y-3">
                      <div className="p-3 bg-red-50 text-red-500 rounded-2xl w-max"><XCircle size={22} /></div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg line-clamp-1">{t.title}</h3>
                        <p className="text-slate-400 text-xs font-semibold mt-1">Scheduled Date: <b>{t.test_date}</b></p>
                      </div>
                    </div>

                    <div className="space-y-4 border-t border-slate-100 pt-4">
                      <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
                        <span className="flex items-center gap-1"><Clock size={13} /> {t.duration_minutes} Mins</span>
                        <span className="flex items-center gap-1"><Target size={13} /> {t.max_marks} Marks</span>
                      </div>

                      <div className="w-full py-2.5 bg-red-50 text-red-700 font-bold text-xs rounded-2xl text-center border border-red-100">
                        Missed Assessment Window
                      </div>
                    </div>
                  </div>
                ))}
                {missedTests.length === 0 && (
                  <div className="col-span-full text-center py-16 bg-white border border-slate-100 rounded-3xl">
                    <XCircle size={48} className="mx-auto text-slate-200 mb-4" />
                    <h3 className="font-bold text-slate-900 text-lg">No Missed Exams on Tally</h3>
                    <p className="text-slate-400 text-sm max-w-sm mx-auto mt-1">Awesome! You have kept perfect compliance with all scheduled placements examinations.</p>
                  </div>
                )}
              </>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
