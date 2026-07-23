import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import AntiCheatWrapper from '../../components/intelligence/AntiCheatWrapper';
import { Timer, AlertCircle } from 'lucide-react';

export default function IntelligenceTestView() {
  const { type } = useParams(); // pq, iq, eq, sq
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const { data } = await api.get(`/intelligence/questions/${type}`);
        if (data.success && data.questions.length > 0) {
          setQuestions(data.questions);
          // Set timer based on type. Example: IQ = 20 mins, others = 15 mins
          setTimeLeft(type === 'iq' ? 20 * 60 : 15 * 60);
        } else {
          alert('No questions available for this test yet. Contact Admin.');
          navigate('/student/intelligence');
        }
      } catch (e) {
        console.error(e);
        navigate('/student/intelligence');
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [type, navigate]);

  useEffect(() => {
    let timer: any;
    if (started && timeLeft > 0 && !submitting) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && started && !submitting) {
      handleSubmit();
    }
    return () => clearInterval(timer);
  }, [started, timeLeft, submitting]);

  const handleStart = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch(e) {
      console.warn("Fullscreen permission denied or not supported");
    }
    setStarted(true);
  };

  const handleSelectOption = (text: string) => {
    const newAnswers = [...answers];
    const existingIdx = newAnswers.findIndex(a => a.questionId === questions[currentIdx].id);
    if (existingIdx >= 0) {
      newAnswers[existingIdx].selectedOption = text;
    } else {
      newAnswers.push({ questionId: questions[currentIdx].id, selectedOption: text });
    }
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) setCurrentIdx(prev => prev + 1);
  };

  const handlePrev = () => {
    if (currentIdx > 0) setCurrentIdx(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    
    // Exit full screen if active
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch(e) {}
    }

    try {
      const { data } = await api.post(`/intelligence/submit/${type}`, {
        answers,
        timeTaken: (type === 'iq' ? 1200 : 900) - timeLeft
      });
      if (data.success) {
        navigate('/student/intelligence');
      }
    } catch(e) {
      console.error(e);
      alert('Error submitting test. Please contact support.');
      navigate('/student/intelligence');
    }
  };

  const handleViolation = () => {
    // handled inside AntiCheatWrapper (shows warning)
  };

  const handleMaxViolations = () => {
    alert("Test automatically submitted due to multiple severe security violations.");
    handleSubmit();
  };

  if (loading) return <div className="p-10 flex justify-center mt-20 font-mono text-slate-500">Initializing Assessment Protocol...</div>;
  if (!questions.length) return null;

  if (!started) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white font-sans selection:bg-indigo-500">
        <div className="max-w-xl w-full bg-slate-800 p-10 rounded-3xl border border-slate-700 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 via-amber-500 to-indigo-500"></div>
          <AlertCircle className="w-16 h-16 text-indigo-400 mb-6" />
          <h1 className="text-3xl font-black mb-4 uppercase tracking-tight">Security Protocol</h1>
          <div className="space-y-4 text-slate-300 mb-10 leading-relaxed font-medium">
            <p>You are about to start a monitored intelligence assessment.</p>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li>You MUST remain in full-screen mode.</li>
              <li>Switching tabs or minimizing the window is prohibited.</li>
              <li>Copy-pasting or right-clicking is disabled.</li>
              <li className="text-red-400 font-bold">Multiple violations will auto-submit the exam and penalize your score.</li>
            </ul>
          </div>
          <button 
            onClick={handleStart}
            className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 text-white font-black rounded-xl uppercase tracking-widest text-sm transition-all shadow-lg shadow-indigo-500/20"
          >
            I Understand, Start Assessment
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIdx];
  const answeredCurrent = answers.find(a => a.questionId === currentQ.id);

  return (
    <AntiCheatWrapper onViolation={handleViolation} onMaxViolations={handleMaxViolations} maxViolations={3}>
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        
        {/* Header */}
        <header className="bg-white border-b border-slate-200 py-4 px-8 flex items-center justify-between shadow-sm sticky top-0 z-10 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center font-black">
              {type?.toUpperCase()}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Intelligence Assessment</h2>
              <p className="text-xs text-slate-500 font-medium">Question {currentIdx + 1} of {questions.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-red-50 px-4 py-2 rounded-xl text-red-600 border border-red-100 font-mono font-bold">
            <Timer className="w-5 h-5" />
            <span>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
          </div>
        </header>

        {/* Question Area */}
        <div className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-10 flex flex-col">
          <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col mb-6">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4 block">Question {currentIdx + 1}</span>
            <h3 className="text-2xl md:text-3xl font-medium text-slate-800 leading-relaxed tracking-tight mb-10">
              {currentQ.question || currentQ.question_text}
            </h3>

            <div className="space-y-4 mt-auto">
              {(currentQ.options_json || []).map((opt: any, idx: number) => {
                const optText = opt.text || opt.title || opt; // fallback depending on how admin stores it
                const isSelected = answeredCurrent?.selectedOption === optText;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(optText)}
                    className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 flex items-center gap-4 ${
                      isSelected 
                        ? 'border-indigo-500 bg-indigo-50 shadow-md shadow-indigo-100/50' 
                        : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${isSelected ? 'border-indigo-500' : 'border-slate-300'}`}>
                      {isSelected && <div className="w-3 h-3 bg-indigo-500 rounded-full" />}
                    </div>
                    <span className={`text-lg ${isSelected ? 'text-indigo-900 font-medium' : 'text-slate-600'}`}>{optText}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <button 
              onClick={handlePrev}
              disabled={currentIdx === 0}
              className="px-6 py-3 font-bold text-slate-500 uppercase tracking-widest text-xs hover:text-slate-800 disabled:opacity-30 transition-colors"
            >
              Previous
            </button>
            
            {currentIdx === questions.length - 1 ? (
              <button 
                onClick={handleSubmit}
                disabled={submitting}
                className="px-8 py-4 bg-teal-500 hover:bg-teal-600 text-white font-black rounded-xl uppercase tracking-widest text-sm shadow-xl shadow-teal-500/20 transition-all disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Assessment'}
              </button>
            ) : (
              <button 
                onClick={handleNext}
                className="px-8 py-4 bg-indigo-900 hover:bg-indigo-800 text-white font-black rounded-xl uppercase tracking-widest text-sm shadow-xl shadow-indigo-900/20 transition-all"
              >
                Next Question
              </button>
            )}
          </div>
        </div>

      </div>
    </AntiCheatWrapper>
  );
}
