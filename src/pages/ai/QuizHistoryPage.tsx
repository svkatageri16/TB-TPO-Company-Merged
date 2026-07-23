import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api.ts";
import { BrainCircuit, Clock, CheckCircle2, ChevronRight, Activity } from "lucide-react";
import { useAuth } from "../../context/AuthContext.tsx";

const parseLocalDate = (dateStr: string | Date | undefined) => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  const cleanStr = typeof dateStr === 'string' && dateStr.endsWith('Z') ? dateStr.slice(0, -1) : dateStr;
  return new Date(cleanStr);
};

export function QuizHistoryPage() {
  const { user } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const fetchHistory = async () => {
    try {
      if (!user?.id) return;
      
      const res = await api.get(`/quiz/history/${user.id}`);
      if (res.data?.success) {
        setHistory(res.data.quizzes);
      }
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-12 text-center font-bold">Loading Engine Data...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-10 flex items-center justify-between">
        <div>
           <div className="flex items-center gap-3 mb-2">
             <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
               <Activity size={20} />
             </div>
             <h1 className="text-3xl font-black text-slate-800">Intelligence Archives</h1>
           </div>
           <p className="text-slate-500 font-medium ml-14">Track your performance trajectory.</p>
        </div>
        <Link 
          to="/ai-quiz"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-md transition-colors"
        >
          New Assessment
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {history.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-slate-50 border border-slate-100 rounded-3xl text-slate-400 font-bold">
            No history recorded. Initialize your growth.
          </div>
        ) : (
          history.map(quiz => {
            const isPass = parseFloat(quiz.percentage) >= 60;
            return (
              <Link 
                to={`/ai-quiz/result/${quiz.id}`}
                key={quiz.id} 
                className="bg-white border flex flex-col border-slate-200 hover:border-indigo-400 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-1 rounded-md mb-2 inline-block">
                      {quiz.quiz_type}
                    </span>
                    <h3 className="text-lg font-bold text-slate-800 leading-tight">{quiz.role}</h3>
                  </div>
                  <div className={`text-2xl font-black w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border-2 ${isPass ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                    {Math.round(quiz.percentage)}
                  </div>
                </div>

                <div className="space-y-3 mb-6 flex-1">
                  <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                    <BrainCircuit size={16} className="text-slate-400" /> {quiz.difficulty} Level
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                    <CheckCircle2 size={16} className="text-slate-400" /> {quiz.score} / {quiz.total_questions} Correct
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                    <Clock size={16} className="text-slate-400" /> {parseLocalDate(quiz.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center justify-between text-indigo-600 pt-4 border-t border-slate-100">
                   <span className="text-xs font-black uppercase tracking-widest group-hover:tracking-[0.2em] transition-all">Review Analytics</span>
                   <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  );
}
