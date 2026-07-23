import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.tsx";
import api from "../../services/api.ts";
import { 
  Award, Calendar, ArrowRight, MessageSquare, BrainCircuit, Sparkles, Search, Filter, ChevronRight, Star, Clock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";
import { ReportModal } from "../../components/student/ReportModal.tsx";

const parseLocalDate = (dateStr: string | Date | undefined) => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  const cleanStr = typeof dateStr === 'string' && dateStr.endsWith('Z') ? dateStr.slice(0, -1) : dateStr;
  return new Date(cleanStr);
};

export function MockHistoryPage() {
  const { user } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (user?.id) {
      fetchHistory();
    }
  }, [user?.id]);

  const fetchHistory = async () => {
    try {
      const { data } = await api.get(`/ai/history/${user?.id}`);
      setHistory(data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter(h => 
    new Date(h.created_at).toLocaleDateString().includes(searchTerm) ||
    h.score.toString().includes(searchTerm)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                <BrainCircuit size={24} />
              </div>
              <div>
                <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight leading-none">AI Mock History</h1>
                <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">Comprehensive Performance Archives</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="SEARCH BY DATE OR SCORE..."
                className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-indigo-100 outline-none transition-all shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Link 
              to="/interview" 
              className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all shadow-xl active:scale-95 flex items-center gap-2 whitespace-nowrap"
            >
              <Sparkles size={16} /> Start New Mock
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Decoding Archives...</p>
        </div>
      ) : filteredHistory.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredHistory.map((report, i) => {
            const scorePercentage = Math.round((report.score || 0) * 10);
            const isPass = scorePercentage >= 60;
            return (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -8 }}
                onClick={() => setSelectedReport(report)}
                className="bg-white border flex flex-col border-slate-200 hover:border-indigo-400 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-1 rounded-md mb-2 inline-block">
                      AI Behavioral Analysis
                    </span>
                    <h3 className="text-lg font-bold text-slate-800 leading-tight">Mock Interview Session</h3>
                  </div>
                  <div className={`text-2xl font-black w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border-2 ${isPass ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-650 border-red-100'}`}>
                    {scorePercentage}
                  </div>
                </div>

                <div className="space-y-3 mb-6 flex-1">
                  <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                    <BrainCircuit size={16} className="text-slate-400" /> Adaptive Interview
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                    <MessageSquare size={16} className="text-slate-400" /> Comm: {report.communication_score || 0}/10 • Conf: {report.confidence_score || 0}/10
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                    <Clock size={16} className="text-slate-400" /> {parseLocalDate(report.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center justify-between text-indigo-600 pt-4 border-t border-slate-100">
                   <span className="text-xs font-black uppercase tracking-widest group-hover:tracking-[0.2em] transition-all">Review Analytics</span>
                   <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="py-32 text-center glass-card">
          <Award size={48} className="mx-auto text-slate-200 mb-6" />
          <h2 className="text-2xl font-black text-slate-400 uppercase tracking-tight">No Archives Found</h2>
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-2 italic">Start your first AI Mock session to begin your performance history.</p>
          <Link 
            to="/interview" 
            className="inline-flex items-center gap-3 mt-10 px-10 py-5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl"
          >
            Launch AI Mentor <ChevronRight size={16} />
          </Link>
        </div>
      )}

      {/* Portal to Analysis Modal */}
      <AnimatePresence>
        {selectedReport && (
          <ReportModal 
            report={selectedReport} 
            onClose={() => setSelectedReport(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
