import React, { useEffect, useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Globe, 
  Phone, 
  Users, 
  Award,
  ArrowRight,
  TrendingUp,
  BrainCircuit
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

export default function TPOColleges() {
  const [colleges, setColleges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchColleges();
  }, []);

  const fetchColleges = async () => {
    try {
      const response = await api.get('/tpo/dashboard-stats');
      if (response.data.success) {
        setColleges(response.data.data.collegeAnalytics || []);
      }
    } catch (error) {
      toast.error('Failed to fetch college insights');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : colleges.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-100 shadow-sm text-center">
          <Building2 size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-900">No Colleges Assigned</h3>
          <p className="text-slate-500 max-w-md mx-auto mt-2">
            You haven't been assigned any colleges yet. Please contact the administrator to get access to institutional data.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {colleges.map((college, idx) => (
            <div key={idx} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-8">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex items-start gap-6">
                    <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
                      <Building2 size={32} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{college.college_name}</h2>
                      <div className="flex flex-wrap items-center gap-4 mt-2">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                          <TrendingUp size={14} className="text-blue-500" />
                          Placement Rate: {((college.placed_students / (college.total_students || 1)) * 100).toFixed(1)}%
                        </span>
                        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                          <BrainCircuit size={14} className="text-purple-500" />
                          Avg. Talent Score: {college.avg_talent_score?.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 lg:gap-8">
                    <div className="text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</p>
                      <h4 className="text-xl font-black text-slate-900">{college.total_students}</h4>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Placed</p>
                      <h4 className="text-xl font-black text-green-600">{college.placed_students}</h4>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending</p>
                      <h4 className="text-xl font-black text-orange-500">{college.total_students - college.placed_students}</h4>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-4">Coding Performance</h4>
                    <div className="flex items-end gap-2">
                      <span className="text-2xl font-black text-slate-900">{college.avg_coding_score?.toFixed(1)}</span>
                      <span className="text-xs font-bold text-slate-400 mb-1">/ 100</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div className="bg-blue-500 h-full" style={{width: `${college.avg_coding_score}%`}} />
                    </div>
                  </div>

                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-4">Interview Success</h4>
                    <div className="flex items-end gap-2">
                      <span className="text-2xl font-black text-slate-900">{college.avg_interview_score?.toFixed(1)}</span>
                      <span className="text-xs font-bold text-slate-400 mb-1">/ 100</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div className="bg-green-500 h-full" style={{width: `${college.avg_interview_score}%`}} />
                    </div>
                  </div>

                  <div className="p-6 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20 text-white flex flex-col justify-between">
                    <div>
                      <h4 className="text-[10px] font-black text-blue-100 uppercase tracking-wider mb-1">AI Recommendation</h4>
                      <p className="text-sm font-bold leading-tight">Focus on Java and System Design for the upcoming Google drive.</p>
                    </div>
                    <button 
                      onClick={() => toast('Detailed reports are being generated by AI...')}
                      className="flex items-center gap-2 text-xs font-black uppercase tracking-wider mt-4 hover:gap-3 transition-all"
                    >
                      View Report <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
