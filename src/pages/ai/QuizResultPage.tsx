import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api.ts";
import { CheckCircle2, XCircle, BrainCircuit, Play, ArrowRight } from "lucide-react";
import { motion } from "motion/react";

export function QuizResultPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, [id]);

  const fetchResults = async () => {
    try {
      const res = await api.get(`/quiz/result/${id}`);
      if (res.data?.success) {
        setData(res.data);
      }
    } catch(e) {
      alert("Failed to load results");
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) return <div className="p-12 text-center">Loading Performance Analytics...</div>;

  const { quiz, questions } = data;
  const isPass = quiz.percentage >= 60;

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      
      {/* Header Score Card */}
      <div className={`rounded-3xl p-8 mb-12 shadow-2xl overflow-hidden relative ${isPass ? 'bg-gradient-to-br from-emerald-600 to-emerald-900 text-white' : 'bg-gradient-to-br from-amber-500 to-amber-700 text-white'}`}>
         <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                 <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                   <BrainCircuit size={32} />
                 </div>
                 <h1 className="text-4xl font-black">{isPass ? 'Excellent Execution!' : 'Room for Growth.'}</h1>
              </div>
              <p className="text-white/80 font-medium text-lg leading-relaxed max-w-xl">
                 You have successfully completed the {quiz.quiz_type} for {quiz.role}. Review your analytics below to identify knowledge gaps.
              </p>
            </div>
            
            <div className="bg-white text-slate-900 p-8 rounded-3xl flex flex-col items-center justify-center min-w-[240px] shadow-2xl">
               <span className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Final Score</span>
               <div className="text-6xl font-black tracking-tighter">
                 {Math.round(quiz.percentage)}<span className="text-3xl text-slate-400">%</span>
               </div>
               <span className="text-sm font-bold text-slate-500 mt-2">{quiz.score} / {quiz.total_questions} Correct</span>
            </div>
         </div>
      </div>

      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-black text-slate-800">Detailed Review</h2>
        <button 
          onClick={() => navigate("/ai-quiz")}
          className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-md hover:bg-slate-800 transition-colors"
        >
          Take Another Test <ArrowRight size={16} />
        </button>
      </div>

      {/* Question Review List */}
      <div className="space-y-6">
        {questions.map((q: any, i: number) => {
          const isCorrect = q.is_correct === 1;
          return (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              key={q.id} 
              className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm"
            >
              <div className="flex items-start gap-4 mb-6">
                 <div className={`mt-1 shrink-0 ${isCorrect ? 'text-emerald-500' : 'text-red-500'}`}>
                    {isCorrect ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                 </div>
                 <div>
                   <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Question {i + 1}</span>
                   <h3 className="text-xl font-bold text-slate-800 mt-1">{q.question}</h3>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-10">
                 {q.options.map((opt: string, idx: number) => {
                   const isUserAns = q.user_answer === opt;
                   const isRealAns = q.correct_answer === opt;
                   
                   let borderClass = 'border-slate-200';
                   let bgClass = 'bg-slate-50';
                   let textClass = 'text-slate-600';
                   
                   if (isRealAns) {
                     borderClass = 'border-emerald-500';
                     bgClass = 'bg-emerald-50';
                     textClass = 'text-emerald-800 font-bold';
                   } else if (isUserAns && !isRealAns) {
                     borderClass = 'border-red-400';
                     bgClass = 'bg-red-50';
                     textClass = 'text-red-800 font-bold line-through';
                   }

                   return (
                     <div key={idx} className={`p-4 rounded-xl border-2 ${borderClass} ${bgClass} ${textClass}`}>
                       {opt}
                     </div>
                   );
                 })}
              </div>

              <div className="ml-10 mt-6 p-6 bg-slate-50 border border-slate-200 rounded-2xl">
                 <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">AI Explanation</p>
                 <p className="text-slate-700 font-medium leading-relaxed">{q.explanation}</p>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  );
}
