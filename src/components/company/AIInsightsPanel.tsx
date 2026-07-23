import React from 'react';
import { Sparkles, ArrowRight } from "lucide-react";

export function AIInsightsPanel({ jobs = [] }: { jobs?: any[] }) {
  const topJob = jobs.length > 0 ? jobs[0].title : "Software Engineer";

  return (
    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 rounded-[40px] text-white shadow-2xl shadow-indigo-500/20 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32 group-hover:scale-110 transition-transform" />
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md border border-white/30">
            <Sparkles size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-black uppercase tracking-tight">AI Matching</h3>
            <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest">Smart Talent Cloud</p>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="p-5 bg-white/10 rounded-3xl border border-white/10 backdrop-blur-sm">
            <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-2">Elite Matches</p>
            <p className="text-sm font-bold leading-relaxed">Top candidates map above 80% for your {topJob} role.</p>
          </div>
          <div className="p-5 bg-white/10 rounded-3xl border border-white/10 backdrop-blur-sm">
            <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-2">Skill Trend</p>
            <p className="text-sm font-bold leading-relaxed">AI indicates high demand matching recent applicant skills in your sector.</p>
          </div>
        </div>

        <button className="w-full mt-10 py-4 bg-white text-indigo-600 rounded-[20px] font-black uppercase text-xs tracking-widest hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 shadow-lg">
          Review AI Picks <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
