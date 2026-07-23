import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Building2, 
  Briefcase, 
  FileText, 
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import api from '../../services/api';

export function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/analytics/admin/metrics');
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Loading Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  const metrics = stats?.metrics || {};

  const statCards = [
    { label: 'Total Students', value: metrics.students, icon: Users, color: 'blue' },
    { label: 'Verified Companies', value: metrics.companies, icon: Building2, color: 'emerald' },
    { label: 'Pending Verifications', value: metrics.pendingVerifications, icon: AlertCircle, color: 'orange', alert: metrics.pendingVerifications > 0 },
    { label: 'Active Jobs', value: metrics.totalJobs, icon: Briefcase, color: 'purple' },
    { label: 'Total Applications', value: metrics.totalApplications, icon: FileText, color: 'indigo' },
    { label: 'Shortlisted Cases', value: metrics.shortlisted, icon: CheckCircle2, color: 'rose' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Systems Overview</h1>
        <p className="text-slate-500 font-medium">Real-time platform metrics and analytics.</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden"
          >
            <div className={`p-3 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 w-fit mb-4`}>
              <stat.icon size={24} />
            </div>
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">{stat.label}</p>
            <h3 className="text-3xl font-black text-slate-900">{stat.value}</h3>
            
            {stat.alert && (
              <div className="absolute top-4 right-4 animate-pulse">
                <span className="flex h-2 w-2 rounded-full bg-orange-500" />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Trend Chart */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase">Application Trends</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Last 7 Days Activity</p>
            </div>
            <TrendingUp size={20} className="text-blue-600" />
          </div>
          
          <div className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <AreaChart data={stats?.trend || []}>
                   <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                         <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                   <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                      tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { weekday: 'short' })}
                   />
                   <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                   />
                   <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                   />
                   <Area 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#2563eb" 
                      strokeWidth={4} 
                      fillOpacity={1} 
                      fill="url(#colorCount)" 
                   />
                </AreaChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions / Recent Alerts */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
           <h3 className="text-lg font-black text-slate-900 uppercase mb-6">Recent Platform Stats</h3>
           <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-colors cursor-pointer group">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition-transform">
                      <Clock size={20} />
                  </div>
                  <div>
                      <h4 className="text-sm font-black text-slate-800 uppercase">Average Talent Score</h4>
                      <p className="text-xs text-slate-500 font-medium">Platform wide aggregate: {stats?.extraStats?.avgTalentScore || 0}%</p>
                  </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-colors cursor-pointer group">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm group-hover:scale-110 transition-transform">
                      <TrendingUp size={20} />
                  </div>
                  <div>
                      <h4 className="text-sm font-black text-slate-800 uppercase">Conversion Rate</h4>
                      <p className="text-xs text-slate-500 font-medium">Interview to Offer: {stats?.extraStats?.conversionRate || 0}%</p>
                  </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-colors cursor-pointer group">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-orange-600 shadow-sm group-hover:scale-110 transition-transform">
                      <AlertCircle size={20} />
                  </div>
                  <div>
                      <h4 className="text-sm font-black text-slate-800 uppercase">Spam Detection</h4>
                      <p className="text-xs text-slate-500 font-medium">{stats?.metrics?.pendingVerifications || 0} suspicious accounts flagged today</p>
                  </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
