import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { BrainCircuit, HeartHandshake, Users, Zap, CheckCircle2, Lock } from 'lucide-react';
import { ConsentModal } from '../../components/ConsentModal';

interface TestStatus {
  completed: boolean;
  score: number | null;
}

interface StatusData {
  pq: TestStatus;
  iq: TestStatus;
  eq: TestStatus;
  sq: TestStatus;
  ai_behavioral_summary: string | null;
}

export default function IntelligenceDashboard() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StatusData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [activeTestForConsent, setActiveTestForConsent] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchStatus = async () => {
    try {
      const { data } = await api.get('/intelligence/status');
      if (data.success) {
        setStatus(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const generateSummary = async () => {
    if (!allCompleted) return;
    setGenerating(true);
    try {
      await api.post('/intelligence/generate-summary');
      await fetchStatus();
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  if (loading || !status) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Initializing Protocol...</p>
      </div>
    );
  }

  const allCompleted = status.pq.completed && status.iq.completed && status.eq.completed && status.sq.completed;

  const testCards = [
    { type: 'pq', title: 'Personality Quotient (PQ)', icon: <Users className="w-8 h-8 text-indigo-500" />, desc: 'Analyze personality traits, leadership, and work style.', time: '15 Mins', questions: 20 },
    { type: 'iq', title: 'Intelligence Quotient (IQ)', icon: <BrainCircuit className="w-8 h-8 text-blue-500" />, desc: 'Logical reasoning, analytical thinking, and pattern recognition.', time: '20 Mins', questions: 25 },
    { type: 'eq', title: 'Emotional Quotient (EQ)', icon: <HeartHandshake className="w-8 h-8 text-rose-500" />, desc: 'Emotional control, empathy, and stress handling.', time: '15 Mins', questions: 20 },
    { type: 'sq', title: 'Social Quotient (SQ)', icon: <Zap className="w-8 h-8 text-amber-500" />, desc: 'Social behavior, collaboration, and networking ability.', time: '15 Mins', questions: 20 },
  ];

  return (
    <div className="max-w-6xl mx-auto py-2 space-y-6 font-sans text-slate-800">
      
      {/* Standardized Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 shrink-0">
              <BrainCircuit size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2.5xl sm:text-4xl font-black text-slate-900 uppercase tracking-tight leading-none">Intelligence Operations</h1>
              <p className="text-slate-500 font-bold text-[9px] sm:text-[10px] uppercase tracking-[0.3em] mt-2">COGNITIVE, EMOTIONAL & SOCIAL ASSESSMENT METRICS</p>
            </div>
          </div>
        </div>
        <div className="self-stretch md:self-auto flex items-center justify-between">
          {!allCompleted ? (
            <div className="flex items-center gap-2 bg-red-50 text-red-700 px-3.5 py-2 rounded-xl border border-red-150 text-[10px] font-black uppercase tracking-wider shadow-sm shrink-0">
              <Lock className="w-3.5 h-3.5 text-red-500 animate-pulse" />
              <span>Job Applications Locked</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 px-3.5 py-2 rounded-xl border border-emerald-150 text-[10px] font-black uppercase tracking-wider shadow-sm shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Assessments Completed</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {testCards.map((test) => {
          const testStatus = status[test.type as keyof StatusData] as TestStatus;
          return (
            <div key={test.type} className="bg-white border border-slate-150 rounded-2xl p-5 md:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.015)] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {test.icon}
                  </div>
                  {testStatus.completed ? (
                    <div className="w-12 h-12 rounded-full bg-indigo-50 border-2 border-indigo-150 flex items-center justify-center flex-col shadow-inner">
                      <span className="text-[8px] text-indigo-500 font-extrabold uppercase tracking-widest leading-none">Score</span>
                      <span className="text-sm font-black text-indigo-900">{testStatus.score}</span>
                    </div>
                  ) : (
                    <div className="bg-amber-50/70 px-3 py-1 rounded-full flex items-center gap-1.5 border border-amber-100/50">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                      <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Pending</span>
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1.5 leading-tight">{test.title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed mb-6">{test.desc}</p>
              </div>
              
              <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-auto">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>{test.questions} Qs</span><span>•</span><span>{test.time}</span>
                </div>
                 {testStatus.completed ? (
                  <button className="px-4 py-2 bg-slate-55 text-slate-400 font-bold text-xs uppercase tracking-widest rounded-lg cursor-not-allowed">
                    Completed
                  </button>
                ) : (
                  <button 
                    onClick={() => setActiveTestForConsent(test.type)}
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-600 transition-colors shadow-sm cursor-pointer"
                  >
                    Start Test
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

        {allCompleted && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 mt-6">
            <h2 className="text-xl font-black text-indigo-900 mb-4">AI Behavioral Summary</h2>
            {status.ai_behavioral_summary ? (
              <div className="bg-white p-5 rounded-xl shadow-sm text-slate-700 leading-relaxed font-medium text-xs sm:text-sm">
                {status.ai_behavioral_summary}
              </div>
            ) : (
              <div className="text-center py-6">
                <button 
                  onClick={generateSummary}
                  disabled={generating}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2 mx-auto disabled:opacity-50 cursor-pointer"
                >
                  <Zap className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
                  {generating ? 'Analyzing Scores...' : 'Generate AI Report'}
                </button>
              </div>
            )}
          </div>
        )}

      <ConsentModal
        isOpen={activeTestForConsent !== null}
        title="Assessment Consent Form"
        subtitle="Data Sharing & Cognitive Processing"
        consentMessage="By proceeding with this diagnostic module, you consent to the storage and multi-dimensional analysis of your cognitive patterns, logical reasoning choices, situational-behavioral traits, and emotional assessment answers. The resulting raw score mapping and structured metadata will be utilized to generate matching recruiter recommendations on the placement database."
        compulsoryWarning="Declining this consent will prevent you from initiating this cognitive assessment. Complete diagnostic scoring metrics are required by partnering corporations on recruitment streams to evaluate placement suitability."
        onAgree={() => {
          const t = activeTestForConsent;
          setActiveTestForConsent(null);
          if (t) navigate(`/student/intelligence/${t}`);
        }}
        onDisagreeClose={() => setActiveTestForConsent(null)}
      />
    </div>
  );
}
