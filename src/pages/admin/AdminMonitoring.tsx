import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  Search, 
  User, 
  AlertTriangle, 
  ArrowUpRight,
  TrendingDown,
  BarChart4
} from 'lucide-react';
import api from '../../services/api';

export function AdminMonitoring() {
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScores();
  }, []);

  const fetchScores = async () => {
    try {
      const { data } = await api.get('/admin/monitoring/talent-scores');
      if (data.success) {
        setScores(data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const highPerformers = scores.filter(s => s.completeness_score >= 80);
  const lowPerformers = scores.filter(s => s.completeness_score < 40);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Talent Monitoring</h1>
        <p className="text-slate-500 font-medium">Analyze scoring distribution and platform health.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* High Performers */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
           <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                 <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <TrendingUp size={18} />
                 </div>
                 <h3 className="font-black text-slate-900 uppercase tracking-tight">Top Candidates</h3>
              </div>
              <span className="text-[10px] font-black px-2 py-1 bg-emerald-50 text-emerald-600 rounded uppercase">80%+ Score</span>
           </div>
           
           <div className="space-y-4">
              {highPerformers.slice(0, 5).map((student, idx) => (
                 <div key={student.profile_id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-black shadow-sm">
                          {student.full_name?.[0]}
                       </div>
                       <div>
                          <p className="text-sm font-black text-slate-900 uppercase leading-none">{student.full_name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{student.app_count} Apps</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-600 font-black">
                       <span className="text-lg">{student.completeness_score}%</span>
                       <ArrowUpRight size={14} />
                    </div>
                 </div>
              ))}
           </div>
        </div>

        {/* Low Performers / Inactive */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
           <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                 <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                    <TrendingDown size={18} />
                 </div>
                 <h3 className="font-black text-slate-900 uppercase tracking-tight">Requires Attention</h3>
              </div>
              <span className="text-[10px] font-black px-2 py-1 bg-red-50 text-red-600 rounded uppercase">&lt; 40% Score</span>
           </div>

           <div className="space-y-4">
              {lowPerformers.slice(0, 5).map((student, idx) => (
                 <div key={student.profile_id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-black shadow-sm">
                          {student.full_name?.[0] || '?'}
                       </div>
                       <div>
                          <p className="text-sm font-black text-slate-900 uppercase leading-none">{student.full_name || 'Incomplete'}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Registered Recently</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="text-right">
                          <p className="text-lg font-black text-slate-900 leading-none">{student.completeness_score}%</p>
                       </div>
                       <AlertTriangle size={16} className="text-orange-500" />
                    </div>
                 </div>
              ))}
              {lowPerformers.length === 0 && (
                <div className="p-12 text-center opacity-30">
                  <BarChart4 size={48} className="mx-auto mb-2" />
                  <p className="text-xs font-black uppercase">No low performing talent detected</p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
