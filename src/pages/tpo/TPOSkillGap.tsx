import React, { useState, useEffect } from 'react';
import { 
  BrainCircuit, 
  Target, 
  Zap, 
  AlertCircle, 
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  Cpu
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

export default function TPOSkillGap() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSkillGap();
  }, []);

  const fetchSkillGap = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tpo/ai-skill-gap');
      if (res.data.success) {
        setReport(res.data.data);
      }
    } catch (error) {
      toast.error('AI Analysis failed. Make sure students have skills in their profiles.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="h-96 flex flex-col items-center justify-center space-y-6">
      <div className="relative">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
        <Cpu className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600" size={24} />
      </div>
      <div className="text-center">
        <h3 className="font-black text-slate-900 uppercase tracking-tight italic">AI is Analyzing Talent Pool</h3>
        <p className="text-slate-500 text-sm font-medium">Comparing student skills with live job market requirements...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <button 
          onClick={fetchSkillGap}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 transition-all"
        >
          <RefreshCw size={18} />
          Refresh Analysis
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Readiness Score */}
        <div className="lg:col-span-1 bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-3xl text-white shadow-xl shadow-blue-500/20 flex flex-col items-center justify-center text-center">
          <div className="relative mb-6">
            <svg className="w-40 h-40 transform -rotate-90">
              <circle cx="80" cy="80" r="70" stroke="rgba(255,255,255,0.1)" strokeWidth="12" fill="transparent" />
              <circle cx="80" cy="80" r="70" stroke="white" strokeWidth="12" fill="transparent" strokeDasharray={440} strokeDashoffset={440 - (440 * (report?.placement_readiness || 0)) / 100} strokeLinecap="round" />
            </svg>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <span className="text-4xl font-black italic">{report?.placement_readiness || 0}%</span>
            </div>
          </div>
          <h3 className="text-xl font-black uppercase tracking-tight">Placement Readiness</h3>
          <p className="text-blue-100 text-sm mt-2 font-medium">Overall match score for the entire college talent pool</p>
        </div>

        {/* Missing Skills */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
            <Zap className="text-orange-500" size={20} />
            Critical Skill Gaps
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report?.top_missing_skills?.map((skill: string, idx: number) => (
              <div key={idx} className="flex items-center gap-3 p-4 bg-orange-50 rounded-2xl border border-orange-100">
                <AlertCircle className="text-orange-500 shrink-0" size={20} />
                <span className="font-bold text-orange-900">{skill}</span>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Market Fit Analysis</h4>
            <p className="text-slate-600 font-medium leading-relaxed">{report?.market_fit_analysis}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Strengths & Weaknesses */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
            <Target className="text-blue-600" size={20} />
            SWOT Analysis
          </h3>
          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-2">Institutional Strengths</p>
              <div className="flex flex-wrap gap-2">
                {report?.college_strengths?.map((s: string, i: number) => (
                  <span key={i} className="px-3 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-bold border border-green-100">{s}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2">Areas for Improvement</p>
              <div className="flex flex-wrap gap-2">
                {report?.college_weaknesses?.map((w: string, i: number) => (
                  <span key={i} className="px-3 py-1 bg-red-50 text-red-700 rounded-lg text-xs font-bold border border-red-100">{w}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Training Roadmap */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
            <BrainCircuit className="text-purple-600" size={20} />
            AI Recommended Roadmap
          </h3>
          <div className="space-y-4">
            {report?.training_roadmap?.map((step: any, idx: number) => (
              <div key={idx} className="flex items-start gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-colors group">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-black shrink-0">{idx + 1}</div>
                <div>
                  <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{step.phase}</h4>
                  <p className="text-xs text-slate-500 font-medium">{step.focus} • {step.duration}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
