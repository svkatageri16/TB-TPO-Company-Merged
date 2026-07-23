import { motion } from "motion/react";
import { Award, X, MessageSquare, Star, CheckCircle, AlertTriangle, Lightbulb, HelpCircle, Sparkles } from "lucide-react";

export function ReportModal({ report, onClose }: { report: any, onClose: () => void }) {
  const scores = [
    { label: "Communication", value: report.communication_score, color: "bg-blue-600" },
    { label: "Confidence", value: report.confidence_score, color: "bg-emerald-600" },
    { label: "Explanation", value: report.explanation_score, color: "bg-purple-600" },
    { label: "Presentation", value: report.presentation_score, color: "bg-orange-600" },
    { label: "Knowledge", value: report.knowledge_score, color: "bg-pink-600" },
  ];

  const parseJson = (data: any) => {
    try { 
      if (!data) return [];
      if (typeof data !== 'string') return Array.isArray(data) ? data : [];
      const parsed = JSON.parse(data); 
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) { return []; }
  };

  const strengths = parseJson(report.strengths_json);
  const weaknesses = parseJson(report.weaknesses_json);
  const tips = parseJson(report.tips_json);
  const questionsAnswers = parseJson(report.questions_answers_json);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="p-8 bg-slate-900 text-white flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl -mr-32 -mt-32" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <Award className="text-blue-400" size={24} />
              <span className="text-xs font-black uppercase tracking-[0.3em] text-blue-400">Professional Report</span>
            </div>
            <h2 className="text-3xl font-bold">Interview Analysis Result</h2>
            <p className="text-slate-400 text-sm mt-1">{new Date(report.created_at).toLocaleDateString()} • Overall Rating {report.score}/10</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors relative z-10">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
          {/* Scores Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {scores.map((s, i) => (
              <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center space-y-2">
                <div className="text-2xl font-black text-slate-800">{s.value}<span className="text-xs text-slate-400">/10</span></div>
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">{s.label}</div>
                <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${s.value * 10}%` }}
                    className={`h-full ${s.color}`}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Feedback Section */}
          <section>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <MessageSquare size={14} className="text-blue-600" /> Executive Feedback
            </h3>
            <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100 text-sm leading-relaxed text-slate-700 italic">
              "{report.feedback}"
            </div>
          </section>

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section>
              <h3 className="text-xs font-black uppercase tracking-widest text-emerald-600 mb-4 flex items-center gap-2">
                <Star size={14} /> Core Strengths
              </h3>
              <div className="space-y-2">
                {strengths.map((s: string, i: number) => (
                  <div key={i} className="flex gap-3 p-3 bg-white border border-emerald-100 rounded-xl">
                    <CheckCircle className="text-emerald-500 shrink-0" size={16} />
                    <span className="text-xs font-medium text-slate-700">{s}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-black uppercase tracking-widest text-orange-600 mb-4 flex items-center gap-2">
                <AlertTriangle size={14} /> Areas for Improvement
              </h3>
              <div className="space-y-2">
                {weaknesses.map((w: string, i: number) => (
                  <div key={i} className="flex gap-3 p-3 bg-white border border-orange-100 rounded-xl">
                    <div className="w-4 h-4 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-600" />
                    </div>
                    <span className="text-xs font-medium text-slate-700">{w}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Questions and Answers Audit Section */}
          {questionsAnswers && questionsAnswers.length > 0 && (
            <section className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#4f46e5] mb-4 flex items-center gap-2">
                <HelpCircle size={14} className="text-[#4f46e5]" /> Question-by-Question Solution Guide
              </h3>
              
              <div className="space-y-6">
                {questionsAnswers.map((item: any, idx: number) => (
                  <div key={idx} className="bg-slate-50 border border-slate-100 rounded-2xl p-6 space-y-4 shadow-xs">
                    {/* Header index and question */}
                    <div className="flex gap-3 items-start">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 text-indigo-600 text-xs font-black leading-none">
                        Q{idx + 1}
                      </div>
                      <div className="pt-1">
                        <p className="text-sm font-bold text-slate-900 leading-normal">{item.question}</p>
                      </div>
                    </div>
                    
                    {/* User Answer */}
                    <div className="pl-10 space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Your Answer:</span>
                      <div className="bg-white border border-slate-150 p-4 rounded-xl text-xs text-slate-700 italic leading-relaxed">
                        "{item.user_answer || "No response recorded"}"
                      </div>
                    </div>

                    {/* Actual/Ideal Solution */}
                    <div className="pl-10 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Sparkles size={11} className="text-amber-500" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 block">Actual Ideal Answer Key:</span>
                      </div>
                      <div className="bg-amber-50/50 border border-amber-200/40 p-4 rounded-xl text-xs text-slate-800 leading-relaxed font-normal">
                        {item.actual_answer || "No standard answer provided"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Tips */}
          <section className="bg-slate-900 rounded-3xl p-8 text-white">
            <h3 className="text-xs font-black uppercase tracking-widest text-blue-400 mb-6 flex items-center gap-2">
              <Lightbulb size={16} /> Actionable Roadmap
            </h3>
            <div className="space-y-4">
              {tips.map((t: string, i: number) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="w-6 h-6 rounded-lg bg-blue-600/30 flex items-center justify-center shrink-0 text-blue-400 text-xs font-bold">
                    {i + 1}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed pt-1">{t}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </motion.div>
    </motion.div>
  );
}
