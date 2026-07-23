import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { CheckCircle2, LayoutDashboard, Brain, Sparkles, TrendingUp } from "lucide-react";

export function InterviewEnded() {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-100 flex flex-col md:flex-row"
      >
        {/* Left Side: Illustration & Success */}
        <div className="md:w-5/12 bg-slate-900 p-12 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl -ml-24 -mb-24" />
          
          <div className="relative z-10">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 12, delay: 0.2 }}
              className="w-20 h-20 bg-emerald-500 rounded-2xl flex items-center justify-center text-white mb-8 shadow-xl shadow-emerald-500/20"
            >
              <CheckCircle2 size={40} />
            </motion.div>
            <h1 className="text-4xl font-black mb-4 leading-tight">Session<br />Terminated.</h1>
            <p className="text-slate-400 text-lg font-medium leading-relaxed">
              Your professional technical interview has been successfully processed by Aoede AI.
            </p>
          </div>

          <div className="relative z-10 mt-12 pt-12 border-t border-white/10">
             <div className="flex items-center gap-3 text-emerald-400 text-sm font-black uppercase tracking-widest">
                <Sparkles size={18} />
                AI Analysis Complete
             </div>
          </div>
        </div>

        {/* Right Side: Actions & Information */}
        <div className="md:w-7/12 p-12 flex flex-col justify-center space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">What happens next?</h2>
            <p className="text-slate-500 text-sm">Our AI has analyzed your performance across multiple dimensions including technical depth, communication, and confidence.</p>
          </div>

          <div className="space-y-4">
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                <TrendingUp size={20} />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm mb-1">Performance Benchmarking</h4>
                <p className="text-xs text-slate-500 leading-relaxed">Your results compared against industry standards are now synced to your career profile.</p>
              </div>
            </div>

            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-start gap-4">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 shrink-0">
                <Brain size={20} />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm mb-1">Personalized Roadmap</h4>
                <p className="text-xs text-slate-500 leading-relaxed">View specific improvement points and study recommendations derived from your session.</p>
              </div>
            </div>
          </div>

          <div className="pt-6 space-y-4">
            <Link 
              to="/student" 
              className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-blue-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-600/20"
            >
              <LayoutDashboard size={18} /> Access Student Dashboard
            </Link>
            <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Data synchronized successfully with your talent profile
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
