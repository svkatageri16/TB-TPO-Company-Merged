import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import api from '../../services/api.ts';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { 
  Users, Briefcase, Target, Calendar, Download, 
  Clock, ShieldAlert, CheckCircle2, ListFilter,
  ChevronRight
} from 'lucide-react';

const COLORS = ['#2563eb', '#8b5cf6', '#3b82f6', '#10b981', '#ec4899', '#f59e0b', '#ef4444'];

function formatCount(val: any): number {
  if (typeof val === 'number' && !isNaN(val)) return val;
  return 0;
}

function formatPercent(val: any): string {
  if (val !== null && val !== undefined && typeof val === 'number' && !isNaN(val)) {
    return `${val}%`;
  }
  return 'N/A';
}

function formatDays(val: any): string {
  if (val !== null && val !== undefined && typeof val === 'number' && !isNaN(val)) {
    return `${val} ${val === 1 ? 'day' : 'days'}`;
  }
  return 'N/A';
}

export function AnalyticsDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [days, setDays] = useState('all');
  const [jobId, setJobId] = useState('all');
  const [hrUserId, setHrUserId] = useState('all');
  const [jobStatus, setJobStatus] = useState('all');

  const requestGenRef = useRef(0);

  useEffect(() => {
    if (user?.id) {
      fetchAnalytics();
    }
  }, [user?.id, days, jobId, hrUserId, jobStatus]);

  const fetchAnalytics = async () => {
    if (!user?.id) return;
    const currentGen = ++requestGenRef.current;
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/analytics/employer/${user.id}`, {
        params: { days, jobId, hrUserId, jobStatus }
      });
      if (currentGen !== requestGenRef.current) return;
      if (res.data.success) {
        setData(res.data.data);
      } else {
        setError(res.data.message || "Failed to load analytics");
      }
    } catch (e: any) {
      if (currentGen !== requestGenRef.current) return;
      console.error(e);
      setError("An error occurred while loading recruiter analytics. Please verify your credentials and try again.");
    } finally {
      if (currentGen === requestGenRef.current) {
        setLoading(false);
      }
    }
  };

  const handleExport = () => {
    const reportData = {
      exported_at: new Date().toISOString(),
      company_id: user?.id,
      filters: { days, jobId, hrUserId, jobStatus },
      stats: data?.stats
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `VEGA_Company_Analytics_${days}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const stats = data?.stats || {};
  const filterOptions = data?.filterOptions || { jobs: [], hrTeam: [] };
  const funnelData = data?.funnelData || [];
  const jobwiseApplications = data?.jobwiseApplications || [];
  const stageConversion = data?.stageConversion || [];
  const timeInStage = data?.timeInStage || [];
  const timeToHire = data?.timeToHire || { overallAvgDays: null, hiredCount: 0, shortestDays: null, longestDays: null, jobWise: [] };
  const topPerformingJobs = data?.topPerformingJobs || [];
  const lowPerformingJobs = data?.lowPerformingJobs || [];
  const dropsAnalytics = data?.dropsAnalytics || [];
  const candidateHoldAlerts = data?.candidateHoldAlerts || data?.heldCandidateTasks || [];

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4" id="loading-container">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-500 font-medium text-xs tracking-widest uppercase animate-pulse">Analyzing workspace metrics...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-6 max-w-lg mx-auto" id="error-container">
      <div className="w-16 h-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center">
        <ShieldAlert size={32} />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Analytics Error</h2>
        <p className="text-slate-500 text-sm mt-2 font-medium">{error}</p>
      </div>
      <button 
        onClick={fetchAnalytics}
        className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg"
      >
        Retry Fetch
      </button>
    </div>
  );

  return (
    <div className="space-y-6" id="company-analytics-page">
      {/* Header and Action Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight" id="main-title">Company Analytics</h1>
          <p className="text-slate-500 font-medium text-sm mt-1" id="sub-title">Track hiring funnel, job performance, bottlenecks, and post engagement.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={handleExport}
            disabled={!data}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all shadow-lg shadow-slate-900/10"
            id="export-btn"
          >
            <Download size={16} /> Export Report
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-100 p-4 rounded-3xl shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center" id="filter-bar">
        {/* Date Range Selector */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Date Range</label>
          <div className="relative">
            <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer appearance-none"
              id="days-filter"
            >
              <option value="all">All Time</option>
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
            </select>
          </div>
        </div>

        {/* Job Filter */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Job Posting</label>
          <div className="relative">
            <Briefcase size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer appearance-none"
              id="job-filter"
            >
              <option value="all">All Jobs</option>
              {filterOptions.jobs.map((job: any) => (
                <option key={job.id} value={job.id}>{job.title}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Recruiter Owner Filter */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Recruiter Owner</label>
          <div className="relative">
            <Users size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={hrUserId}
              onChange={(e) => setHrUserId(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer appearance-none"
              id="recruiter-filter"
            >
              <option value="all">All Recruiters</option>
              {filterOptions.hrTeam.map((hr: any) => (
                <option key={hr.id} value={hr.id}>{hr.name} ({hr.role_type})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Job Status Filter */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Job Status</label>
          <div className="relative">
            <ListFilter size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={jobStatus}
              onChange={(e) => setJobStatus(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer appearance-none"
              id="status-filter"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active (OPEN) Only</option>
              <option value="ended">Ended (CLOSED) Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Compact KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-summary-strip">
        {[
          { label: 'Total Applications', value: formatCount(stats.totalApps), icon: Users, color: 'blue' },
          { label: 'In-Pipeline Active', value: formatCount(stats.candidatesInPipeline), icon: Target, color: 'purple' },
          { label: 'Total Hires', value: formatCount(stats.totalHires), icon: CheckCircle2, color: 'emerald' },
          { label: 'Active Postings', value: formatCount(stats.activeJobs), icon: Briefcase, color: 'orange' },
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm group hover:shadow-md transition-all duration-300">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                card.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                card.color === 'purple' ? 'bg-purple-50 text-purple-600' :
                card.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                'bg-orange-50 text-orange-600'
              }`}>
                <Icon size={18} />
              </div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
              <h3 className="text-xl font-black text-slate-900">{card.value}</h3>
            </div>
          );
        })}
      </div>

      {/* Main Grid: 2-Column Dashboard on Desktop, 1-Column on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="infographics-grid">
        
        {/* INFOGRAPHIC 1: Hiring Funnel Overview */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-between" id="widget-hiring-funnel">
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg font-black uppercase tracking-wider">01</span>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Hiring Funnel Overview</h3>
            </div>
            <p className="text-slate-400 font-medium text-xs mt-1">Total distribution of candidates across Normalized pipeline stage categories.</p>
          </div>
          <div className="h-64 w-full">
            {funnelData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs font-semibold text-slate-400 italic">No funnel data matches filters.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} margin={{ bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 900, fill: '#64748b' }} interval={0} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]}>
                    {funnelData.map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* INFOGRAPHIC 2: Job-wise Application Performance */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-between" id="widget-jobwise-performance">
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg font-black uppercase tracking-wider">02</span>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Job-wise Application Performance</h3>
            </div>
            <p className="text-slate-400 font-medium text-xs mt-1">Comparison of application counts, pipeline movement, and hires per posting.</p>
          </div>
          <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
            {jobwiseApplications.length === 0 ? (
              <div className="py-12 text-center text-xs font-semibold text-slate-400 italic">No job postings recorded.</div>
            ) : (
              jobwiseApplications.map((job: any, idx: number) => {
                const jobTitle = job.jobTitle || 'Untitled Job';
                const lifecycleStatus = job.lifecycleStatus || 'ACTIVE';
                const totalApps = formatCount(job.totalApplications);
                const openings = formatCount(job.openings);
                const currentInPipeline = formatCount(job.currentInPipeline);
                const currentInInterview = formatCount(job.currentInInterview);
                const shortlisted = formatCount(job.shortlisted);
                const hired = formatCount(job.hired);
                const rejected = formatCount(job.rejected);
                const hireConversionStr = formatPercent(job.applicationToHirePercentage);
                const openingFillStr = formatPercent(job.openingFillPercentage);
                const avgProgressStr = formatDays(job.averageDaysToFirstProgress);
                const avgHireStr = formatDays(job.averageDaysToHire);

                return (
                  <div key={idx} className="p-3.5 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-2.5">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h4 className="text-xs font-black text-slate-800 line-clamp-1">{jobTitle}</h4>
                        <span className={`inline-block text-[8px] font-black uppercase tracking-widest mt-1 px-1.5 py-0.5 rounded ${
                          lifecycleStatus === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          {lifecycleStatus}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-black text-slate-400 uppercase block">Hire Conversion</span>
                        <span className="text-xs font-black text-blue-600">{hireConversionStr}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] bg-white p-2 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 font-medium block">Applications</span>
                        <span className="font-black text-slate-800">{totalApps}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block">Openings</span>
                        <span className="font-black text-slate-800">{openings}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block">In Pipeline</span>
                        <span className="font-black text-purple-600">{currentInPipeline}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block">In Interview</span>
                        <span className="font-black text-blue-600">{currentInInterview}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block">Shortlisted</span>
                        <span className="font-black text-indigo-600">{shortlisted}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block">Hired</span>
                        <span className="font-black text-emerald-600">{hired}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block">Rejected</span>
                        <span className="font-black text-slate-500">{rejected}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block">Opening Fill</span>
                        <span className="font-black text-emerald-600">{openingFillStr}</span>
                      </div>
                    </div>

                    <div className="flex justify-between text-[9px] text-slate-500 font-medium pt-1 border-t border-slate-100">
                      <span>Avg Progress: <strong className="text-slate-700">{avgProgressStr}</strong></span>
                      <span>Avg Hire: <strong className="text-slate-700">{avgHireStr}</strong></span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* INFOGRAPHIC 3: Stage Conversion Rate */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-between" id="widget-stage-conversion">
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg font-black uppercase tracking-wider">03</span>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Stage Conversion Rate</h3>
            </div>
            <p className="text-slate-400 font-medium text-xs mt-1">Step-by-step conversion and drop-off percentages between sequential pipeline stages.</p>
          </div>
          <div className="space-y-3.5">
            {stageConversion.length === 0 ? (
              <div className="py-12 text-center text-xs font-semibold text-slate-400 italic">No conversion data recorded.</div>
            ) : (
              stageConversion.map((stg: any, idx: number) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-bold text-slate-700 uppercase tracking-wide">{stg.stage}</span>
                    <span className="font-black text-blue-600 bg-blue-50/50 px-2 py-0.5 rounded-lg text-xs">{stg.rate}% Rate</span>
                  </div>
                  <div className="w-full h-2 bg-slate-50 border border-slate-100/50 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${stg.rate}%` }} />
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-400 font-medium">
                    <span>From: {formatCount(stg.fromCount)} candidates</span>
                    <span>To: {formatCount(stg.toCount)} candidates</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* INFOGRAPHIC 4: Time-to-Hire */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-between" id="widget-time-to-hire">
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg font-black uppercase tracking-wider">04</span>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Time-to-Hire Analytics</h3>
            </div>
            <p className="text-slate-400 font-medium text-xs mt-1">Average days from initial application to confirmed hire.</p>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/40 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block">Overall Average Time-to-Hire</span>
                <span className="text-2xl font-black text-emerald-900">
                  {formatDays(timeToHire.overallAvgDays)}
                </span>
                <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                  Confirmed Hires: {formatCount(timeToHire.hiredCount)}
                </span>
              </div>
              <div className="p-2.5 bg-emerald-500 text-white rounded-xl">
                <Clock size={20} />
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Hire Speed by Postings</span>
              {(!timeToHire.jobWise || timeToHire.jobWise.length === 0 || formatCount(timeToHire.hiredCount) === 0) ? (
                <div className="py-6 text-center text-xs font-semibold text-slate-400 italic">
                  No confirmed hires yet under the selected filters.
                </div>
              ) : (
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {timeToHire.jobWise
                    .filter((jw: any) => jw.hiredCount > 0 && jw.avgDays !== null)
                    .map((jw: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100/50">
                        <div>
                          <span className="text-xs font-black text-slate-700 line-clamp-1 max-w-[200px]">{jw.jobTitle}</span>
                          <span className="text-[9px] font-medium text-slate-400 block">{jw.hiredCount} confirmed hire(s)</span>
                        </div>
                        <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">{jw.avgDays} days avg</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* INFOGRAPHIC 5: Time-in-Stage */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-between" id="widget-time-in-stage">
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg font-black uppercase tracking-wider">05</span>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Time-in-Stage Metrics</h3>
            </div>
            <p className="text-slate-400 font-medium text-xs mt-1">Average days spent by active candidates in each pipeline stage before transition.</p>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {timeInStage.length === 0 ? (
              <div className="py-12 text-center text-xs font-semibold text-slate-400 italic">No pipeline metrics logged.</div>
            ) : (
              timeInStage.map((stg: any, idx: number) => (
                <div key={idx} className="p-3 bg-slate-50/50 rounded-2xl border border-slate-100/50 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-slate-800">{stg.stage}</span>
                    <span className="text-xs font-black text-blue-600">{stg.avgDays} days avg</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span className="font-medium">Longest wait: {stg.longestWait} days</span>
                    {stg.delayedCount > 0 ? (
                      <span className="text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                        {stg.delayedCount} Delayed (&gt;7d)
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">Moving Smoothly</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* INFOGRAPHIC 6: Candidate Hold Alerts */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-between" id="widget-hold-alerts">
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg font-black uppercase tracking-wider">06</span>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Candidate Hold Alerts</h3>
            </div>
            <p className="text-slate-400 font-medium text-xs mt-1">Urgent alerts identifying candidate batches held/stuck in stages despite forward momentum.</p>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {candidateHoldAlerts.length === 0 ? (
              <div className="p-6 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center h-48">
                <CheckCircle2 size={32} className="text-emerald-500 mb-2" />
                <span className="text-xs font-black text-slate-700 uppercase tracking-widest block">No Bottlenecks</span>
                <p className="text-slate-400 text-[11px] mt-1 text-center max-w-xs">All candidate pathways are advancing cleanly. No pending actions or stale candidates detected.</p>
              </div>
            ) : (
              candidateHoldAlerts.map((alert: any, idx: number) => {
                const candidateName = alert.candidateName || alert.candidate || 'Candidate';
                const jobTitle = alert.jobTitle || 'Job';
                const currentStage = alert.currentStage || alert.stageName || 'Stage';
                const daysInStage = alert.daysInStage ?? alert.oldestWaitingDays ?? 0;
                const lastTransitionDate = alert.lastTransitionDate || 'N/A';
                const responsibleHr = alert.responsibleHr || 'Unassigned';
                const reason = alert.reason || `${candidateName} has been held in ${currentStage} for ${daysInStage} days.`;

                return (
                  <div key={idx} className="p-3.5 bg-amber-50/50 border border-amber-100 rounded-2xl flex flex-col justify-between gap-2.5">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h4 className="text-xs font-black text-slate-800 line-clamp-1">{candidateName} - {jobTitle}</h4>
                        <p className="text-[11px] font-bold text-amber-800 mt-1">
                          Stage: <span className="underline">{currentStage}</span> ({daysInStage} days held)
                        </p>
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-wider bg-amber-100/80 text-amber-800 px-1.5 py-0.5 rounded shrink-0">
                        Action Required
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-600 font-medium italic bg-white/60 p-2 rounded-xl border border-amber-100/50">
                      {reason}
                    </p>

                    <div className="flex justify-between items-center text-[10px] pt-1 text-slate-500 border-t border-amber-100/50">
                      <span>HR: <strong className="text-slate-700">{responsibleHr}</strong></span>
                      <span>Last Transition: <strong className="text-slate-700">{lastTransitionDate}</strong></span>
                      {alert.actionPath && (
                        <a 
                          href={alert.actionPath}
                          className="text-blue-600 font-black uppercase tracking-widest hover:underline flex items-center gap-0.5"
                        >
                          Pipeline <ChevronRight size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* INFOGRAPHIC 7: Top Performing Jobs */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-between" id="widget-top-jobs">
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg font-black uppercase tracking-wider">07</span>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Top Performing Jobs</h3>
            </div>
            <p className="text-slate-400 font-medium text-xs mt-1">High conversion campaigns with healthy applicant pools and strong hiring speeds.</p>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {topPerformingJobs.length === 0 ? (
              <div className="py-12 text-center text-xs font-semibold text-slate-400 italic">No job activity recorded.</div>
            ) : (
              topPerformingJobs.map((job: any, idx: number) => {
                const rank = job.rank ?? (idx + 1);
                const jobTitle = job.jobTitle || 'Job';
                const hires = formatCount(job.hiredCount ?? job.hired);
                const openings = formatCount(job.openings);
                const apps = formatCount(job.totalApplications);
                const conversionStr = formatPercent(job.applicationToHirePercentage);
                const fillStr = formatPercent(job.openingFillPercentage);
                const avgHireDaysStr = formatDays(job.averageDaysToHire);
                const label = job.performanceLabel || (hires > 0 ? 'Good' : 'Needs Improvement');
                const reasons = Array.isArray(job.performanceReasons) ? job.performanceReasons : [];

                return (
                  <div key={idx} className="p-3.5 bg-emerald-50/30 border border-emerald-100/50 rounded-2xl flex flex-col gap-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 bg-emerald-600 text-white rounded-full text-[10px] font-black flex items-center justify-center shrink-0">
                          #{rank}
                        </span>
                        <h4 className="text-xs font-black text-slate-800 line-clamp-1">{jobTitle}</h4>
                      </div>
                      <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shrink-0 ${
                        label === 'Excellent' ? 'bg-emerald-100 text-emerald-800' :
                        label === 'Good' ? 'bg-blue-100 text-blue-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px] text-slate-600 font-medium bg-white/70 p-2 rounded-xl border border-emerald-100/40">
                      <div>Hires: <strong className="text-emerald-700">{hires}/{openings}</strong></div>
                      <div>Apps: <strong className="text-slate-800">{apps}</strong></div>
                      <div>Hire Conv: <strong className="text-blue-600">{conversionStr}</strong></div>
                      <div>Fill Rate: <strong className="text-emerald-600">{fillStr}</strong></div>
                    </div>

                    <div className="text-[10px] text-slate-500 font-medium">
                      <span>Avg Hire Time: <strong className="text-slate-700">{avgHireDaysStr}</strong></span>
                    </div>

                    {reasons.length > 0 && (
                      <ul className="text-[10px] text-slate-600 bg-emerald-50/60 p-2 rounded-xl list-disc list-inside space-y-0.5">
                        {reasons.map((r: string, rIdx: number) => (
                          <li key={rIdx}>{r}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* INFOGRAPHIC 8: Low Performing Jobs */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-between" id="widget-low-jobs">
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg font-black uppercase tracking-wider">08</span>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Low Performing Jobs</h3>
            </div>
            <p className="text-slate-400 font-medium text-xs mt-1">Positions experiencing rejections, slow response times, or low candidate volume.</p>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {lowPerformingJobs.length === 0 ? (
              <div className="py-12 text-center text-xs font-semibold text-slate-400 italic">No low performing jobs detected.</div>
            ) : (
              lowPerformingJobs.map((job: any, idx: number) => {
                const jobTitle = job.jobTitle || 'Job';
                const reasons = Array.isArray(job.performanceReasons) ? job.performanceReasons.join(' ') : (job.problemReason || 'Low performance');
                const comp = job.comparisons || {};
                const medianStr = comp.companyMedianApplications != null ? `Company Median: ${comp.companyMedianApplications} apps` : '';
                const jobAppsStr = comp.jobTotalApplications != null ? `Job Apps: ${comp.jobTotalApplications}` : '';
                const metrics = job.metrics || {};
                const suggestions = Array.isArray(job.suggestions) ? job.suggestions.join(' ') : (job.suggestedAction || 'Review job posting.');

                return (
                  <div key={idx} className="p-3.5 bg-red-50/20 border border-red-100/40 rounded-2xl flex flex-col gap-2">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="text-xs font-black text-slate-800 line-clamp-1">{jobTitle}</h4>
                      <span className="text-[8px] font-black uppercase tracking-widest bg-red-100/80 text-red-800 px-1.5 py-0.5 rounded shrink-0">
                        Needs Review
                      </span>
                    </div>

                    <div className="text-[11px] text-red-700/90 font-bold">
                      Measured Issue: {reasons}
                    </div>

                    {(jobAppsStr || medianStr) && (
                      <div className="text-[10px] text-slate-500 font-medium">
                        Comparison: <strong className="text-slate-700">{jobAppsStr} vs {medianStr}</strong>
                      </div>
                    )}

                    <div className="flex justify-between text-[10px] text-slate-600 bg-white/60 p-1.5 rounded-lg border border-red-100/30">
                      <span>Total Apps: <strong>{formatCount(metrics.totalApplications)}</strong></span>
                      <span>Hires: <strong>{formatCount(metrics.hiredCount)} / {formatCount(metrics.openings)}</strong></span>
                      <span>Fill: <strong>{formatPercent(metrics.openingFillPercentage)}</strong></span>
                    </div>

                    <div className="text-[10px] text-slate-600 bg-white/80 p-2 border border-slate-100 rounded-xl font-medium">
                      <span className="font-black uppercase tracking-wider text-slate-400 block text-[8px] mb-0.5">Suggested Action</span>
                      {suggestions}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* INFOGRAPHIC 9: Drops/Post Analytics (Full-Width Section) */}
      <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm" id="widget-drops-analytics">
        <div className="mb-6 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg font-black uppercase tracking-wider">09</span>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Drops & Brand Post Engagement</h3>
          </div>
          <p className="text-slate-400 font-medium text-xs mt-1">Cumulative views, likes, comments, shares, and calculated interaction engagement rates of corporate brand posts.</p>
        </div>

        {dropsAnalytics.length === 0 ? (
          <div className="p-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <Users size={32} className="text-slate-400 mx-auto mb-2" />
            <span className="text-xs font-black text-slate-700 uppercase tracking-widest block">No Corporate Drops Released</span>
            <p className="text-slate-400 text-xs mt-1">Post interactive corporate announcements, tech insights, or full-time opportunities to trigger student interest.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Post Topic / Campaign</th>
                  <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                  <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Views</th>
                  <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Likes</th>
                  <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Comments</th>
                  <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Shares</th>
                  <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Engagement Rate</th>
                  <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Engagement Score</th>
                </tr>
              </thead>
              <tbody>
                {dropsAnalytics.map((drop: any, idx: number) => {
                  const views = formatCount(drop.views);
                  const likes = formatCount(drop.likes);
                  const comments = formatCount(drop.comments);
                  const shares = formatCount(drop.shares);
                  const viewPctile = formatPercent(drop.viewPercentile);
                  const likePctile = formatPercent(drop.likePercentile);
                  const commentPctile = formatPercent(drop.commentPercentile);
                  const engRateStr = formatPercent(drop.engagementRate);
                  const engScore = formatCount(drop.engagementScore);
                  const engLabel = drop.engagementLabel || 'Average';

                  return (
                    <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-all duration-200">
                      <td className="py-3.5 px-4 font-black text-xs text-slate-800 max-w-xs truncate">{drop.title}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 rounded text-[9px] font-black uppercase tracking-widest">
                          {drop.postCategoryLabel || drop.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center text-xs font-bold text-slate-600">
                        {views} <span className="text-[9px] text-slate-400 block font-normal">({viewPctile} tile)</span>
                      </td>
                      <td className="py-3.5 px-4 text-center text-xs font-bold text-slate-600">
                        {likes} <span className="text-[9px] text-slate-400 block font-normal">({likePctile} tile)</span>
                      </td>
                      <td className="py-3.5 px-4 text-center text-xs font-bold text-slate-600">
                        {comments} <span className="text-[9px] text-slate-400 block font-normal">({commentPctile} tile)</span>
                      </td>
                      <td className="py-3.5 px-4 text-center text-xs font-bold text-slate-600">{shares}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-xs font-black text-slate-700">{engRateStr}</span>
                          <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                            <div className="h-full bg-blue-600" style={{ width: `${Math.min(100, (drop.engagementRate || 0) * 4)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-xs text-slate-900">
                        {engScore} <span className="text-[9px] text-slate-500 font-medium block">({engLabel})</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
