import React from 'react';
import { Target, Clock, Zap, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";

export function HiringHealthPanel({ stats }: { stats?: any }) {
  const totalApps = stats?.totalApps || 0;
  const totalHires = stats?.totalHires || 0;
  const conversionRate = totalApps > 0 ? ((totalHires / totalApps) * 100).toFixed(1) : "0.0";

  return (
    <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-8">
      <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Hiring Health</h3>
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center"><Target size={20}/></div>
            <p className="text-xs font-black text-slate-800 uppercase">Conversion</p>
          </div>
          <p className="text-lg font-black text-emerald-600">{conversionRate}%</p>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><Clock size={20}/></div>
            <p className="text-xs font-black text-slate-800 uppercase">Time to Hire</p>
          </div>
          <p className="text-lg font-black text-blue-600">{stats?.avgTimeToHire || "No hires yet"}</p>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center"><Zap size={20}/></div>
            <p className="text-xs font-black text-slate-800 uppercase">Avg. Apps/Job</p>
          </div>
          <p className="text-lg font-black text-purple-600">{stats?.totalJobs ? (totalApps / stats.totalJobs).toFixed(1) : "0"}</p>
        </div>
      </div>

      <div className="pt-8 border-t border-slate-50">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 text-center italic">"Recruitment productivity based on real data"</p>
        <Link to="/company/analytics" className="w-full py-4 bg-slate-50 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
          Deep Analytics <BarChart3 size={16} />
        </Link>
      </div>
    </div>
  );
}
