import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api.ts";
import { useAuth } from "../../context/AuthContext.tsx";
import { motion } from "motion/react";
import { CheckCircle, Clock, AlertCircle } from "lucide-react";

export function JobTest() {
  const { jobId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [test, setTest] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 mins

  useEffect(() => {
    fetchTest();
  }, [jobId]);

  useEffect(() => {
    if (timeLeft > 0 && !submitted) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !submitted) {
      handleSubmit();
    }
  }, [timeLeft, submitted]);

  const fetchTest = async () => {
    try {
      const { data } = await api.get(`/companies/tests/${jobId}`);
      if (data.success && data.data) {
        setTest(data.data);
      } else {
        alert("No test found for this job");
        navigate("/student");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async () => {
    let score = 0;
    test.forEach((q: any) => {
      if (answers[q.id] === (typeof q.correct_answer === 'number' ? q.options_json[q.correct_answer] : q.correct_answer)) score += 1;
    });

    const finalScore = Math.round((score / test.length) * 100);

    try {
      await api.post("/jobs/applications/submit-test", { 
        studentId: user?.id, 
        jobId, 
        score: finalScore 
      });
      setSubmitted(true);
    } catch (err) {
      alert("Submission failed");
    }
  };

  if (!test) return <div className="flex items-center justify-center min-h-screen">Loading Test...</div>;

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card max-w-md w-full p-12 text-center text-slate-800">
           <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} />
           </div>
           <h2 className="text-3xl font-bold mb-4">Assessment Completed</h2>
           <p className="text-slate-500 mb-8">Your results have been sent to the company. They will contact you if shortlisted.</p>
           <button onClick={() => navigate("/student")} className="btn-primary w-full py-4">Return to Dashboard</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <header className="flex items-center justify-between mb-10 bg-white p-6 rounded-2xl border border-slate-200 sticky top-20 z-10 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold">Job Assessment</h2>
          <p className="text-sm text-slate-500">{test.length} Questions</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold ${timeLeft < 60 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-blue-50 text-blue-600'}`}>
          <Clock size={18} />
          {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        </div>
      </header>

      <div className="space-y-8">
        {test.map((q: any, i: number) => (
          <div key={q.id || i} className="glass-card p-8">
            <h4 className="text-lg font-bold mb-6 flex gap-3">
              <span className="text-blue-600">Q{i+1}.</span>
              {q.question_text}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(typeof q.options_json === 'string' ? JSON.parse(q.options_json) : q.options_json).map((opt: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setAnswers({...answers, [q.id]: opt})}
                  className={`p-4 text-left rounded-xl border transition-all ${answers[q.id] === opt ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20' : 'bg-slate-50 border-slate-200 hover:border-blue-400'}`}
                >
                  <span className="inline-block w-6 font-bold">{String.fromCharCode(65 + idx)}.</span>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="pt-8 flex justify-end">
          <button 
            onClick={handleSubmit}
            className="btn-primary px-12 py-4 text-lg"
          >
            Submit Assessment
          </button>
        </div>
      </div>
    </div>
  );
}
