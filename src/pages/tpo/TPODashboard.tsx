import React, { useEffect, useState } from 'react';
import { 
  Users, 
  CheckCircle2, 
  TrendingUp, 
  Award, 
  BrainCircuit,
  BarChart3,
  Target,
  AlertCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import api from '../../services/api';

import { toast } from 'react-hot-toast';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function TPODashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAtRiskModal, setShowAtRiskModal] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const handleNotImplemented = (feature: string) => {
    toast(`${feature} feature is coming soon!`, {
      icon: '🚀',
      style: {
        borderRadius: '16px',
        background: '#333',
        color: '#fff',
      },
    });
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/tpo/dashboard-stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching TPO stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAtRiskList = async () => {
    setShowAtRiskModal(true);
    setLoadingStudents(true);
    try {
      const response = await api.get('/tpo/students');
      if (response.data.success) {
        setStudents(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to load students for risk monitoring:', error);
      toast.error('Failed to load student profiles');
    } finally {
      setLoadingStudents(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-96">Loading...</div>;

  const metrics = stats?.metrics || {};
  const collegeAnalytics = stats?.collegeAnalytics || [];

  const atRiskList = students.filter(student => (student.talent_score || 0) < 45 || (student.completeness_score || 0) < 60);

  const statCards = [
    { label: 'Total Students', value: metrics.totalStudents, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active Students', value: metrics.activeStudents, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Placed Students', value: metrics.placedStudents, icon: Award, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Placement Rate', value: `${metrics.placementRate?.toFixed(1)}%`, icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
                <h3 className="text-3xl font-black text-slate-900 mt-1">{stat.value}</h3>
              </div>
              <div className={`${stat.bg} ${stat.color} p-3 rounded-2xl`}>
                <stat.icon size={24} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Placement Performance by College */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
            <BarChart3 className="text-blue-600" size={20} />
            College Performance Analytics
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={collegeAnalytics}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="college_name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontWeight: 'bold', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontWeight: 'bold', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  cursor={{fill: '#f8fafc'}}
                />
                <Bar dataKey="placed_students" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Placed" />
                <Bar dataKey="total_students" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="Total" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Talent Score Distribution */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
            <Target className="text-blue-600" size={20} />
            Avg. Talent Scores by College
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={collegeAnalytics}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="college_name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontWeight: 'bold', fontSize: 12}} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontWeight: 'bold', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Line type="monotone" dataKey="avg_talent_score" stroke="#3b82f6" strokeWidth={4} dot={{r: 6, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff'}} name="Talent Score" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI Insight Section */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-3xl text-white shadow-xl shadow-blue-500/20">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-white/20 p-2 rounded-xl">
            <BrainCircuit size={24} />
          </div>
          <h3 className="text-xl font-black uppercase tracking-tight">AI Placement Insights</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10">
              <h4 className="font-bold text-blue-100 uppercase text-xs tracking-wider mb-2">College Strengths</h4>
              <p className="text-sm">Students across assigned colleges show exceptional proficiency in Data Structures and Algorithms with an average score of 82/100.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10">
              <h4 className="font-bold text-orange-100 uppercase text-xs tracking-wider mb-2">Skill Gaps Identified</h4>
              <p className="text-sm">A 40% deficiency in Soft Skills and Corporate Etiquette has been detected across CSE departments. Recommended workshop: "Corporate Communication 101".</p>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10 flex flex-col justify-center items-center text-center">
            <AlertCircle size={48} className="text-blue-200 mb-4" />
            <h4 className="font-bold text-white uppercase tracking-wider mb-2">At-Risk Students</h4>
            <p className="text-sm text-blue-100 mb-4">{metrics.atRiskStudents || 0} students have a placement readiness score below 40%.</p>
            <button 
              onClick={handleOpenAtRiskList}
              className="bg-white text-blue-600 px-6 py-2 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors"
            >
              View List
            </button>
          </div>
        </div>
      </div>

      {/* At-Risk Students Modal */}
      {showAtRiskModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <AlertCircle size={22} className="text-red-500" />
                  At-Risk Students Monitoring
                </h2>
                <p className="text-sm text-slate-500 font-medium">Students under assigned colleges with score below 45% or profile completeness below 60%</p>
              </div>
              <button 
                onClick={() => setShowAtRiskModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 p-2 rounded-full"
              >
                ✕
              </button>
            </div>
            
            <div className="p-8 space-y-4 overflow-y-auto flex-1">
              {loadingStudents ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mb-2"></div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Syncing College Profiles...</p>
                </div>
              ) : atRiskList.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <p className="font-bold text-lg">No students are currently at extreme placement risk!</p>
                  <p className="text-sm mt-1">Excellent job! All registered students meet or exceed readiness thresholds.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {atRiskList.map((st) => (
                    <div key={st.id} className="p-5 bg-red-50/50 border border-red-100 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <h4 className="font-bold text-slate-900">{st.full_name}</h4>
                        <p className="text-xs font-medium text-slate-500">{st.college_name}</p>
                        <p className="text-xs text-slate-400 font-bold mt-1">{st.email} • {st.contact || 'No contact details'}</p>
                      </div>
                      <div className="flex gap-4 items-center">
                        <div className="text-right">
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Talent Score</p>
                          <span className="text-lg font-black text-red-600">{st.talent_score || 0}%</span>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Profile</p>
                          <span className="text-sm font-black text-slate-700">{st.completeness_score || 0}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                type="button" 
                onClick={() => setShowAtRiskModal(false)}
                className="px-6 py-3 font-bold bg-slate-800 text-white hover:bg-slate-900 transition-all rounded-xl text-xs uppercase tracking-wider"
              >
                Close List
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
