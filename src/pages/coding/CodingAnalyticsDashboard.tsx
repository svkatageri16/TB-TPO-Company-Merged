import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  User, Activity, Trophy, Code2, Target, Code, Flame,
  CheckCircle2, Terminal, Database, ShieldCheck, ArrowRight, X, Laptop, Network, Plus,
  ExternalLink, RefreshCw, Sparkles, Brain, Compass, Cpu, Lightbulb, AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const PLATFORMS = [
  { id: "leetcode", name: "LeetCode", icon: Code2, color: "text-orange-500", bg: "bg-orange-50", border: "border-orange-100", example: "https://leetcode.com/username" },
  { id: "codechef", name: "CodeChef", icon: Terminal, color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-100", example: "https://www.codechef.com/users/username" },
  { id: "hackerrank", name: "HackerRank", icon: Network, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100", example: "https://www.hackerrank.com/username" },
  { id: "gfg", name: "GeeksForGeeks", icon: Database, color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-100", example: "https://auth.geeksforgeeks.org/user/username" },
  { id: "codeforces", name: "Codeforces", icon: Activity, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100", example: "https://codeforces.com/profile/username" },
];

export function CodingAnalyticsDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // States for Link/Connection forms
  const [platform, setPlatform] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError] = useState("");
  const [connectSuccess, setConnectSuccess] = useState("");

  // State for Add Handle Modal (for users who already have profiles linked)
  const [isModalOpen, setIsModalOpen] = useState(false);

  // States for Manual Sync and AI Analysis
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [syncLoadingId, setSyncLoadingId] = useState<number | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<number | null>(null);
  const [analysisError, setAnalysisError] = useState("");
  const [analysisSuccess, setAnalysisSuccess] = useState("");

  const handleDisconnect = async (profileId: number) => {
    if (!window.confirm("Are you sure you want to disconnect this coding profile? This will remove all cached statistics for this account from your profile.")) return;
    setDeleteLoadingId(profileId);
    try {
      const res = await api.delete(`/coding/profile/${profileId}`);
      if (res.data.success) {
        await fetchAnalytics();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const handleManualSync = async (profileId: number) => {
    setSyncLoadingId(profileId);
    try {
      const res = await api.post(`/coding/sync/${profileId}`);
      if (res.data.success) {
        await fetchAnalytics();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSyncLoadingId(null);
    }
  };

  const handleGenerateAnalysis = async () => {
    if (!user) return;
    setAnalysisLoading(true);
    setAnalysisError("");
    setAnalysisSuccess("");
    try {
      const res = await api.post('/coding/analyze', { userId: user.id });
      if (res.data.success) {
        setAnalysisSuccess("Expert AI profile analysis updated!");
        await fetchAnalytics();
        setTimeout(() => setAnalysisSuccess(""), 4000);
      } else {
        setAnalysisError(res.data.message || "Failed to compile AI insights.");
      }
    } catch (err: any) {
      console.error(err);
      setAnalysisError(err?.response?.data?.message || err?.message || "An error occurred during AI extraction.");
    } finally {
      setAnalysisLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [user]);

  const fetchAnalytics = async () => {
    if (!user) return;
    try {
      const res = await api.get(`/coding/analytics/${user.id}`);
      if (res.data?.success) setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!platform || !profileUrl) {
      setConnectError("Please select a platform and enter your profile URL.");
      return;
    }

    setConnectLoading(true);
    setConnectError("");
    setConnectSuccess("");

    try {
      const res = await api.post("/coding/connect", {
        userId: user?.id,
        platform,
        profileUrl
      });

      if (res.data.success) {
        setConnectSuccess(res.data.message || "Profile connected and synced successfully!");
        setPlatform("");
        setProfileUrl("");
        await fetchAnalytics(); // Reactive re-fetch automatically updates the layout!
        setTimeout(() => {
          setConnectSuccess("");
          setIsModalOpen(false);
        }, 2500);
      } else {
        setConnectError(res.data.message || "Failed to connect profile.");
      }
    } catch (err: any) {
      setConnectError(err?.response?.data?.message || err?.message || "An error occurred.");
    } finally {
      setConnectLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-zinc-50 flex items-center justify-center text-zinc-500 font-medium">Loading analytics...</div>;

  const profiles = data?.profiles || [];
  const stats = data?.stats || [];

  // Flow A: No profiles linked yet. Show the beautifully engineered setup & link page first.
  if (profiles.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-4xl mx-auto space-y-10">
          
          {/* Creative Display Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center p-4 bg-indigo-50 border border-indigo-100 rounded-2xl shadow-sm mb-2 text-indigo-600">
              <Laptop size={36} />
            </div>
            <h1 className="text-4xl font-extrabold text-zinc-900 tracking-tight sm:text-5xl uppercase">
              AI Coding Footprint
            </h1>
            <p className="text-base text-zinc-500 max-w-xl mx-auto font-medium text-center">
              Link your coding profiles first. Our AI engines will analyze your metrics and unlock your dashboard analytics.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            
            {/* Left side info block */}
            <div className="md:col-span-12 lg:col-span-5 space-y-6">
              <div className="bg-slate-900 text-slate-100 p-8 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
                <div className="absolute -right-12 -bottom-12 w-40 h-40 bg-zinc-700/20 rounded-full blur-3xl pointer-events-none" />
                <h3 className="text-lg font-black uppercase tracking-wider text-white mb-6">Why Link Profiles?</h3>
                
                <ul className="space-y-5 text-sm font-medium">
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mt-0.5 shrink-0 border border-indigo-500/20">
                      <CheckCircle2 size={12} />
                    </div>
                    <div>
                      <span className="text-white font-bold block mb-0.5">Verified Solved Problems</span>
                      <span className="text-slate-400">Pulls your real metrics and highlights your problem-solving level.</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mt-0.5 shrink-0 border border-indigo-500/20">
                      <CheckCircle2 size={12} />
                    </div>
                    <div>
                      <span className="text-white font-bold block mb-0.5">Competitive Streaks</span>
                      <span className="text-slate-400">Display active streaks and total submissions across systems.</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mt-0.5 shrink-0 border border-indigo-500/20">
                      <CheckCircle2 size={12} />
                    </div>
                    <div>
                      <span className="text-white font-bold block mb-0.5">Topic Map Generation</span>
                      <span className="text-slate-400">Classify core concepts and present them cleanly to top tech recruiters.</span>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Notice Banner */}
              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 text-xs font-semibold text-amber-800 flex gap-3">
                <ShieldCheck className="text-amber-600 shrink-0 mt-0.5" size={16} />
                <div>
                  <p className="font-bold uppercase tracking-wide mb-1">Authentic Integrations</p>
                  <p className="text-amber-700/90 leading-relaxed">Ensure you enter a valid public profile link. The background job will query external APIs safely to generate metrics.</p>
                </div>
              </div>
            </div>

            {/* Connection Card Form */}
            <div className="md:col-span-12 lg:col-span-7 bg-white p-8 rounded-3xl border border-zinc-200 shadow-md relative overflow-hidden">
              <h2 className="text-xl font-bold text-zinc-900 mb-6 flex items-center gap-2">
                Add Coding Profile
              </h2>

              {/* Status alerts */}
              {connectError && (
                <div className="mb-6 bg-rose-50 text-rose-700 p-4 rounded-2xl border border-rose-100 flex items-center gap-3 text-sm font-semibold">
                  <ShieldCheck className="text-rose-500 shrink-0" size={18} /> {connectError}
                </div>
              )}
              {connectSuccess && (
                <div className="mb-6 bg-emerald-50 text-emerald-700 p-4 rounded-2xl border border-emerald-100 flex items-center gap-3 text-sm font-semibold">
                  <CheckCircle2 className="text-emerald-500 shrink-0" size={18} /> {connectSuccess}
                </div>
              )}

              <form onSubmit={handleConnect} className="space-y-6">
                
                <div className="space-y-3">
                  <label className="block text-xs font-black uppercase tracking-wider text-zinc-500">Select Platform</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-semibold">
                    {PLATFORMS.map((p) => {
                      const isSelected = platform === p.id;
                      const Icon = p.icon;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPlatform(p.id)}
                          className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                            isSelected 
                            ? 'border-indigo-600 bg-indigo-50 shadow-inner text-indigo-900 font-extrabold' 
                            : 'border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50 bg-white text-zinc-600'
                          }`}
                        >
                          <Icon size={24} className={`mb-2 ${isSelected ? 'text-indigo-600' : 'text-zinc-400'}`} />
                          <span className={`text-xs uppercase tracking-tight text-center ${isSelected ? 'font-black text-indigo-900' : 'font-bold'}`}>
                            {p.name}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-black uppercase tracking-wider text-zinc-500">Profile URL</label>
                  <input
                    type="url"
                    value={profileUrl}
                    onChange={(e) => setProfileUrl(e.target.value)}
                    placeholder={PLATFORMS.find(p => p.id === platform)?.example || "e.g., https://leetcode.com/username"}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-4 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-medium"
                    required
                  />
                  {platform && (
                    <p className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      Example structure: {PLATFORMS.find(p => p.id === platform)?.example}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={connectLoading || !platform || !profileUrl}
                  className="w-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white font-black uppercase tracking-wider py-4 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs cursor-pointer"
                >
                  {connectLoading ? "Verifying & Syncing Handle..." : "Connect Profile"}
                </button>
              </form>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // Flow B: At least one profile is connected. Show the primary stateful dashboard.
  let totalSolved = 0, currentStreak = 0, maxStreak = 0;
  let diffTotals = { easy: 0, medium: 0, hard: 0, unsolved: 0 };
  let fundamentals = { gfg: 0, hr: 0 };
  let topics: any = {};
  let totalActiveDays = 0;
  let submissionCalendar: any = {};

  stats.forEach((s: any) => {
    const pInfo = profiles.find((p:any) => p.id === s.profile_id);
    totalSolved += s.problems_solved || 0;
    if (s.streak > maxStreak) maxStreak = s.streak;
    if (s.streak > currentStreak) currentStreak = s.streak;
    
    if (pInfo?.platform === 'gfg') fundamentals.gfg = s.problems_solved || 0;
    if (pInfo?.platform === 'hackerrank') fundamentals.hr = s.problems_solved || 0;

    try {
      const d = s.difficulty_breakdown_json 
        ? (typeof s.difficulty_breakdown_json === 'string' ? JSON.parse(s.difficulty_breakdown_json) : s.difficulty_breakdown_json) 
        : {};
      diffTotals.easy += d.easy || 0;
      diffTotals.medium += d.medium || 0;
      diffTotals.hard += d.hard || 0;
      diffTotals.unsolved += d.unsolved || 0;
      if (d.activeDays) totalActiveDays += d.activeDays;
      if (d.submissionCalendar) {
         try {
             const calObj = typeof d.submissionCalendar === 'string' ? JSON.parse(d.submissionCalendar) : d.submissionCalendar;
             Object.assign(submissionCalendar, calObj);
         } catch(e){}
      }
      if (d.rawTopics) {
         ['fundamental', 'intermediate', 'advanced'].forEach(level => {
            if (d.rawTopics[level]) {
                d.rawTopics[level].forEach((t:any) => {
                    topics[t.tagName] = (topics[t.tagName] || 0) + (t.problemsSolved || 0);
                });
            }
         });
      }
    } catch(e){}
  });

  if (Object.keys(topics).length === 0) {
     stats.forEach((s: any) => {
        try {
          const t = s.topics_json 
            ? (typeof s.topics_json === 'string' ? JSON.parse(s.topics_json) : s.topics_json) 
            : [];
          t.forEach((topic: string) => topics[topic] = (topics[topic] || 0) + 1);
        } catch(e){}
     });
  }

  const topicChartData = Object.entries(topics).map(([name, count]) => ({ name, count: Number(count) })).sort((a:any, b:any) => b.count - a.count).slice(0, 5);
  const maxTopicVal = topicChartData[0]?.count || 1;
  const totalSubmissions = totalSolved + diffTotals.unsolved;
  const activeDays = totalActiveDays > 0 ? totalActiveDays : Math.floor(totalSubmissions * 0.4);

  const ringChartData = [
    { name: 'Easy', value: diffTotals.easy || 0, color: '#10B981' },
    { name: 'Medium', value: diffTotals.medium || 0, color: '#F59E0B' },
    { name: 'Hard', value: diffTotals.hard || 0, color: '#EF4444' }
  ];
  const dsaTotal = ringChartData.reduce((acc, curr) => acc + curr.value, 0);

  const funData = [
    { name: 'GFG', value: fundamentals.gfg || 0, color: '#10B981' },
    { name: 'HackerRank', value: fundamentals.hr || 0, color: '#F59E0B' }
  ];
  const funTotal = funData.reduce((acc, curr) => acc + curr.value, 0);

  const monthMap = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthCounts = Array(12).fill(0);
  if (Object.keys(submissionCalendar).length > 0) {
      for (const [tsStr, count] of Object.entries(submissionCalendar)) {
          const d = new Date(parseInt(tsStr, 10) * 1000);
          monthCounts[d.getMonth()] += (count as number);
      }
  } else {
     [40,50,30,80,95,110].forEach((v, i) => monthCounts[i] = v); // skeleton
  }
  const activityData = monthMap.map((m, i) => ({ name: m, submissions: monthCounts[i] }));
  const currentMonth = new Date().getMonth();
  const recentActivityData = [];
  for(let i=5; i>=0; i--) {
     const idx = (currentMonth - i + 12) % 12;
     recentActivityData.push(activityData[idx]);
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-20 pt-8 font-sans">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between pb-2 gap-4">
           <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 uppercase">Analytics</h1>
              <p className="text-zinc-500 mt-1 font-medium text-xs uppercase tracking-wider">Your global coding footprint across multiple platforms.</p>
           </div>
           <div className="flex items-center gap-3">
               <div className="flex -space-x-3">
                 {profiles.map((p:any) => (
                    <div key={p.id} className="w-10 h-10 rounded-full border-[3px] border-zinc-50 bg-white flex items-center justify-center shadow-sm" title={p.platform}>
                       {p.platform === 'leetcode' && <img src="https://upload.wikimedia.org/wikipedia/commons/1/19/LeetCode_logo_black.png" className="w-5 h-5" alt="LC"/>}
                       {p.platform === 'hackerrank' && <img src="https://upload.wikimedia.org/wikipedia/commons/4/40/HackerRank_Icon-1000px.png" className="w-5 h-5" alt="HR"/>}
                       {p.platform === 'gfg' && <img src="https://media.geeksforgeeks.org/gfg-gg-logo.svg" className="w-5 h-5" alt="GFG"/>}
                       {p.platform === 'codechef' && <span className="text-[10px] font-black uppercase text-amber-800">CC</span>}
                       {p.platform === 'codeforces' && <span className="text-[10px] font-black uppercase text-blue-600">CF</span>}
                    </div>
                 ))}
               </div>
               
               {/* Link Another Platform Action */}
               <button
                  onClick={() => {
                    setConnectError("");
                    setConnectSuccess("");
                    setIsModalOpen(true);
                  }}
                  className="text-xs font-black uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-full flex items-center gap-1.5 shadow-sm transition-all shrink-0 font-bold cursor-pointer"
               >
                 <Plus size={14} /> Link Another
               </button>

               <span className="text-xs font-black uppercase tracking-wider text-zinc-800 bg-white border border-zinc-200 rounded-full px-4 py-2.5 flex items-center gap-1.5 shadow-sm shrink-0">
                 <User size={14} className="text-zinc-400" />
                 {(user as any)?.name || (user as any)?.email?.split('@')[0]}
               </span>
           </div>
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-1">
           {[ 
             { label: 'Total Solved', value: totalSolved, icon: <Trophy className="text-indigo-500" size={18} /> },
             { label: 'Active Days', value: activeDays, icon: <Activity className="text-emerald-500" size={18} /> },
             { label: 'Max Streak', value: maxStreak, icon: <Flame className="text-orange-500" size={18} /> },
             { label: 'Total Submissions', value: totalSubmissions, icon: <Target className="text-pink-500" size={18} /> },
           ].map((stat, i) => (
             <div key={i} className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm flex flex-col justify-between relative overflow-hidden transition-all hover:shadow-md hover:border-zinc-300">
                <div className="flex items-center justify-between mb-4">
                   <p className="text-zinc-500 text-[10px] font-black uppercase tracking-wider">{stat.label}</p>
                   <div className="p-2 bg-zinc-50 rounded-xl">{stat.icon}</div>
                </div>
                <h2 className="text-3xl font-extrabold text-zinc-900 tracking-tight leading-none">{stat.value}</h2>
             </div>
           ))}
        </div>

        {/* Main Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           
           {/* Problem Breakdown (DSA & Fundamentals) */}
           <div className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm flex flex-col">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-800 mb-8 flex items-center gap-2 leading-none"><Code size={16} className="text-zinc-400" /> Platform Mastery</h3>
              
              <div className="flex-1 flex flex-col gap-10 justify-center pb-4">
                  {/* LeetCode BreakDown */}
                  <div>
                    <div className="flex items-end justify-between mb-3">
                       <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest whitespace-nowrap">DSA Solved</span>
                       <span className="text-3xl font-black text-zinc-800 leading-none">{dsaTotal}</span>
                    </div>
                    <div className="flex h-3.5 rounded-full overflow-hidden w-full bg-zinc-100 ring-1 ring-zinc-200/50">
                      {ringChartData.map((d, i) => d.value > 0 ? (
                        <div key={i} style={{width: `${(d.value / Math.max(1, dsaTotal)) * 100}%`, backgroundColor: d.color}} className="h-full border-r border-white/20 last:border-0" title={`${d.name}: ${d.value}`} />
                      ) : null)}
                    </div>
                    <div className="flex flex-wrap gap-4 mt-4 text-xs font-bold text-zinc-700">
                       {ringChartData.map((d, i) => (
                         <div key={i} className="flex items-center gap-1.5">
                           <span className="w-2.5 h-2.5 rounded-full shadow-inner" style={{backgroundColor: d.color}} />
                           <span>{d.value} <span className="text-zinc-400 uppercase text-[10px]">{d.name}</span></span>
                         </div>
                       ))}
                    </div>
                  </div>

                  {/* Fundamentals */}
                  <div>
                    <div className="flex items-end justify-between mb-3">
                       <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest whitespace-nowrap">Fundamentals</span>
                       <span className="text-3xl font-black text-zinc-800 leading-none">{funTotal}</span>
                    </div>
                    <div className="flex h-3.5 rounded-full overflow-hidden w-full bg-zinc-100 ring-1 ring-zinc-200/50">
                      {funData.map((d, i) => d.value > 0 ? (
                        <div key={i} style={{width: `${(d.value / Math.max(1, funTotal)) * 100}%`, backgroundColor: d.color}} className="h-full border-r border-white/20 last:border-0" title={`${d.name}: ${d.value}`} />
                      ) : null)}
                    </div>
                    <div className="flex flex-wrap gap-4 mt-4 text-xs font-bold text-zinc-700">
                       {funData.map((d, i) => (
                         <div key={i} className="flex items-center gap-1.5">
                           <span className="w-2.5 h-2.5 rounded-full shadow-inner" style={{backgroundColor: d.color}} />
                           <span>{d.value} <span className="text-zinc-400 uppercase text-[10px]">{d.name}</span></span>
                         </div>
                       ))}
                    </div>
                  </div>
              </div>
           </div>

           {/* Activity Area Chart */}
           <div className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm lg:col-span-2 flex flex-col">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-800 mb-6 flex items-center gap-2 leading-none"><Activity size={16} className="text-indigo-500" /> Submission Activity</h3>
              <div className="flex-1 w-full h-[280px] mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={recentActivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSubmissions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#a1a1aa', fontSize: 11, fontWeight: 900}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#a1a1aa', fontSize: 11, fontWeight: 900}} />
                    <Tooltip 
                       contentStyle={{borderRadius: '0.75rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', fontWeight: 'bold'}}
                       itemStyle={{color: '#4f46e5'}}
                       labelStyle={{color: '#71717a'}}
                       formatter={(value: any) => [`${value} Submissions`, 'Total']}
                    />
                    <Area type="monotone" dataKey="submissions" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorSubmissions)" activeDot={{r: 6, stroke: '#fff', strokeWidth: 3}} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
           </div>

           {/* Top Topics Chart */}
           <div className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm lg:col-span-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-800 mb-8 flex items-center gap-2 leading-none"><Target size={16} className="text-orange-500" /> Top Concepts Mastery</h3>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-y-8 gap-x-12 uppercase">
                 {topicChartData.map((topic, i) => (
                    <div key={topic.name} className="flex flex-col gap-3 group">
                       <div className="flex items-end justify-between">
                         <span className="text-xs font-black text-zinc-700 truncate max-w-[140px] uppercase tracking-wide group-hover:text-zinc-900 transition-colors">{topic.name}</span>
                         <span className="text-xs font-black text-zinc-800">{topic.count}</span>
                       </div>
                       <div className="w-full bg-zinc-100 h-2.5 rounded-full overflow-hidden shadow-inner">
                         <div className="bg-zinc-800 h-full rounded-full transition-all duration-1000 ease-out group-hover:bg-indigo-600" style={{width: `${Math.max(4, (topic.count / maxTopicVal) * 100)}%`}} />
                       </div>
                    </div>
                  ))}
                  {topicChartData.length === 0 && (
                     <div className="col-span-5 text-center text-xs font-bold uppercase tracking-wider text-zinc-400 py-4">No topic data available yet. Solve more problems to categorize them.</div>
                  )}
              </div>
           </div>

        </div>

        {/* Connected Profiles Links & Sync Center */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-800 flex items-center gap-2">
                <Laptop size={16} className="text-zinc-400" /> Connected Platform Handles
              </h3>
              <p className="text-[11px] text-zinc-400 font-bold uppercase mt-0.5">Manage your linked competitive profiles, view profile source URLs, and run on-demand metric synchronization.</p>
            </div>
            <div className="text-xs font-black uppercase tracking-wider text-zinc-500 bg-zinc-50 border border-zinc-200/60 px-3.5 py-1.5 rounded-full">
              Total Connected: {profiles.length}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map((p: any) => {
              const platformInfo = PLATFORMS.find(plat => plat.id === p.platform);
              const Icon = platformInfo?.icon || Code2;
              const isSyncing = syncLoadingId === p.id;
              const isDeleting = deleteLoadingId === p.id;
              
              // Find matching statistics to display total solved inside the badge
              const pStats = stats.find((s: any) => s.profile_id === p.id);

              return (
                <div key={p.id} className="border border-zinc-200 rounded-xl p-5 hover:border-zinc-300 transition-all bg-zinc-50/50 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${platformInfo?.bg || 'bg-zinc-100'} ${platformInfo?.color || 'text-zinc-600'}`}>
                          <Icon size={16} />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-800">{platformInfo?.name || p.platform}</span>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 bg-white border border-zinc-200 px-2 py-0.5 rounded-md">
                        {pStats ? `${pStats.problems_solved || 0} Solved` : 'No Stats'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-black text-zinc-950 truncate">@{p.username}</p>
                      <a 
                        href={p.profile_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 font-mono tracking-tight group truncate"
                      >
                        <span className="truncate max-w-[200px]">{p.profile_url}</span>
                        <ExternalLink size={10} className="shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </a>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-zinc-100 flex items-center justify-between gap-2">
                    <span className="text-[9px] uppercase font-black tracking-wider text-zinc-400">
                      Sync: {p.last_synced_at ? new Date(p.last_synced_at).toLocaleTimeString() : 'Never'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleManualSync(p.id)}
                        disabled={isSyncing || isDeleting}
                        title="Sync Account Metrics"
                        className="p-1 px-2.5 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-all text-zinc-600 text-[10px] mt-0 text-center uppercase tracking-wider font-extrabold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw size={10} className={`${isSyncing ? 'animate-spin text-indigo-600' : ''}`} />
                        {isSyncing ? 'Syncing...' : 'Sync'}
                      </button>
                      <button
                        onClick={() => handleDisconnect(p.id)}
                        disabled={isSyncing || isDeleting}
                        title="Disconnect Profile"
                        className="p-1 px-2.5 bg-rose-50 border border-rose-100 text-rose-600 rounded-lg hover:bg-rose-100 transition-all text-[10px] uppercase tracking-wider font-extrabold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        {isDeleting ? 'Removing...' : 'Disconnect'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Insight Analyst Diagnostic */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm space-y-6 overflow-hidden relative">
          
          {/* Subtle grid pattern background accent */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-zinc-50 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 opacity-40" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-5 relative z-10">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-800 flex items-center gap-2">
                <Sparkles size={16} className="text-indigo-500 animate-pulse" /> AI Expert Cognitive Diagnostic
              </h3>
              <p className="text-[11px] text-zinc-400 font-bold uppercase mt-0.5">Autonomous evaluation of your competitive footprint, DSA consistency, and coding maturity index.</p>
            </div>
            
            <button
              onClick={handleGenerateAnalysis}
              disabled={analysisLoading}
              className="text-xs font-black uppercase tracking-wider bg-zinc-955 hover:bg-zinc-900 disabled:bg-zinc-200 text-white disabled:text-zinc-400 px-5 py-3 rounded-full flex items-center gap-2 shadow-sm transition-all font-bold cursor-pointer disabled:cursor-not-allowed"
            >
              <RefreshCw size={12} className={`${analysisLoading ? 'animate-spin' : ''}`} />
              {data?.analysis ? "Re-Run Diagnostic" : "Initialize Cognitive Diagnostic"}
            </button>
          </div>

          {analysisError && (
            <div className="bg-rose-50 text-rose-700 p-4 rounded-xl border border-rose-100 flex items-center gap-3 text-xs font-semibold">
              <AlertCircle className="text-rose-500 shrink-0" size={16} /> {analysisError}
            </div>
          )}
          {analysisSuccess && (
            <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl border border-emerald-100 flex items-center gap-3 text-xs font-semibold animate-pulse">
              <CheckCircle2 className="text-emerald-500 shrink-0" size={16} /> {analysisSuccess}
            </div>
          )}

          {analysisLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-4 border-zinc-100 border-t-indigo-600 animate-spin" />
                <Sparkles size={18} className="absolute inset-0 m-auto text-indigo-500 animate-pulse" />
              </div>
              <div className="space-y-1 max-w-md">
                <p className="text-xs font-black uppercase text-zinc-700">Synthesizing Cognitive Metrics...</p>
                <p className="text-[11px] text-zinc-400 font-medium leading-relaxed uppercase">Gemini is auditing your verified solved logs, consistency maps, and overall difficulty indexes across LeetCode, Codeforces, HackerRank, GeeksForGeeks, and CodeChef.</p>
              </div>
            </div>
          ) : data?.analysis ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
              
              {/* Score breakdown left column */}
              <div className="lg:col-span-4 bg-zinc-50 border border-zinc-200/60 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">DSA Maturity Score</p>
                
                <div className="relative flex items-center justify-center">
                  <svg className="w-36 h-36 transform -rotate-90">
                    <circle 
                      cx="72" cy="72" r="62" 
                      stroke="#f4f4f5" strokeWidth="10" 
                      fill="transparent" 
                    />
                    <circle 
                      cx="72" cy="72" r="62" 
                      stroke="#4f46e5" strokeWidth="10" 
                      fill="transparent" 
                      strokeDasharray={2 * Math.PI * 62}
                      strokeDashoffset={(1 - (data.analysis.coding_score || 0) / 100) * (2 * Math.PI * 62)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-4xl font-black text-zinc-800 tracking-tight leading-none">{data.analysis.coding_score || 0}</span>
                    <span className="text-[10px] font-extrabold uppercase text-indigo-500 mt-1 tracking-wider">INDEX</span>
                  </div>
                </div>

                <div className="max-w-xs">
                  <p className="text-[11px] text-zinc-500 font-bold uppercase leading-relaxed">
                    "This index evaluates your problem category versatility, structural complexity depth, and streak velocity across connected handles."
                  </p>
                </div>
              </div>

              {/* Insights section right column */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Prose Summary */}
                <div className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-6 space-y-2">
                  <h4 className="text-xs font-black uppercase text-indigo-900 flex items-center gap-2 leading-none">
                    <Brain size={14} className="text-indigo-500" /> Executive AI Commentary
                  </h4>
                  <p className="text-zinc-700 text-xs font-semibold leading-relaxed">
                    {data.analysis.ai_feedback}
                  </p>
                </div>

                {/* Grid for Strengths & Weaknesses */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Strengths Card */}
                  <div className="bg-emerald-50/20 border border-emerald-100/50 rounded-2xl p-6 space-y-4">
                    <h5 className="text-[10px] font-black uppercase text-emerald-800 tracking-widest flex items-center gap-1.5 leading-none">
                      <Compass size={14} className="text-emerald-500" /> Architectural Strengths
                    </h5>
                    <ul className="space-y-2.5">
                      {(() => {
                        let strList = [];
                        try { strList = JSON.parse(data.analysis.strengths_json || "[]"); } catch(e){}
                        if (!Array.isArray(strList)) strList = [];
                        return strList.map((item: string, idx: number) => (
                          <li key={idx} className="text-[11px] font-bold text-zinc-700 flex items-start gap-2 uppercase tracking-tight">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                            <span>{item}</span>
                          </li>
                        ));
                      })()}
                    </ul>
                  </div>

                  {/* Weaknesses Card */}
                  <div className="bg-amber-50/20 border border-amber-100/50 rounded-2xl p-6 space-y-4">
                    <h5 className="text-[10px] font-black uppercase text-amber-800 tracking-widest flex items-center gap-1.5 leading-none">
                      <Cpu size={14} className="text-amber-500" /> Vulnerabilities / Growth Paths
                    </h5>
                    <ul className="space-y-2.5">
                      {(() => {
                        let weakList = [];
                        try { weakList = JSON.parse(data.analysis.weaknesses_json || "[]"); } catch(e){}
                        if (!Array.isArray(weakList)) weakList = [];
                        return weakList.map((item: string, idx: number) => (
                          <li key={idx} className="text-[11px] font-bold text-zinc-700 flex items-start gap-2 uppercase tracking-tight">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                            <span>{item}</span>
                          </li>
                        ));
                      })()}
                    </ul>
                  </div>

                </div>

                {/* Recommendations timeline */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-zinc-805 flex items-center gap-1.5 leading-none">
                    <Lightbulb size={14} className="text-indigo-500" /> Dynamic Actionable Roadmap
                  </h4>
                  <div className="border border-zinc-200 rounded-2xl p-5 bg-zinc-50/30 divide-y divide-zinc-200/60 font-semibold uppercase tracking-tight">
                    {(() => {
                      let recList = [];
                      try { recList = JSON.parse(data.analysis.recommendations_json || "[]"); } catch(e){}
                      if (!Array.isArray(recList)) recList = [];
                      return recList.map((item: string, idx: number) => (
                        <div key={idx} className="py-3 first:pt-0 last:pb-0 flex items-start gap-3.5">
                          <span className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 text-[10px] font-black text-indigo-600 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="text-[11px] text-zinc-600 self-center">{item}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="py-12 border-2 border-dashed border-zinc-200 rounded-3xl flex flex-col items-center justify-center space-y-4 text-center">
              <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-zinc-400">
                <Brain size={32} />
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h4 className="text-sm font-black uppercase text-zinc-805">No Assessment Data Yet</h4>
                <p className="text-xs text-zinc-400 font-bold uppercase leading-relaxed">
                  Generate your global cognitive evaluation profile safely. We will query your platform records and establish structural strengths and training recommendations.
                </p>
              </div>
              <button
                onClick={handleGenerateAnalysis}
                disabled={analysisLoading}
                className="text-xs font-black uppercase tracking-wider bg-zinc-900 hover:bg-zinc-800 text-white px-6 py-3 rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Sparkles size={14} /> Calculate Cognitive Profile
              </button>
            </div>
          )}

        </div>

      </div>

      {/* Link Handle Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsModalOpen(false)}
          />
          
          {/* Content Box */}
          <div className="relative bg-white rounded-3xl border border-zinc-200 shadow-2xl p-8 max-w-xl w-full z-10 space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <h3 className="text-lg font-extrabold text-zinc-900 uppercase">Link Competitive Account</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 transition-colors rounded-lg bg-zinc-50 hover:bg-zinc-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Status alerts */}
            {connectError && (
              <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl border border-rose-100 flex items-center gap-3 text-sm font-semibold">
                <ShieldCheck className="text-rose-500 shrink-0" size={18} /> {connectError}
              </div>
            )}
            {connectSuccess && (
              <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl border border-emerald-100 flex items-center gap-3 text-sm font-semibold">
                <CheckCircle2 className="text-emerald-500 shrink-0" size={18} /> {connectSuccess}
              </div>
            )}

            <form onSubmit={handleConnect} className="space-y-6">
              
              <div className="space-y-3">
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-500">Select Platform</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {PLATFORMS.map((p) => {
                    const isSelected = platform === p.id;
                    const Icon = p.icon;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPlatform(p.id)}
                        className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border-2 transition-all ${
                          isSelected 
                          ? 'border-indigo-600 bg-indigo-50 shadow-inner' 
                          : 'border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50 bg-white'
                        }`}
                      >
                        <Icon size={20} className={`mb-1.5 ${isSelected ? 'text-indigo-600' : 'text-zinc-400'}`} />
                        <span className={`text-[10px] font-black uppercase tracking-tight text-center ${isSelected ? 'text-indigo-900' : 'text-zinc-600'}`}>
                          {p.name}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-500 font-black">Profile URL</label>
                <input
                  type="url"
                  value={profileUrl}
                  onChange={(e) => setProfileUrl(e.target.value)}
                  placeholder={PLATFORMS.find(p => p.id === platform)?.example || "e.g., https://leetcode.com/username"}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-3 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-medium"
                  required
                />
                {platform && (
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    Example structure: {PLATFORMS.find(p => p.id === platform)?.example}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={connectLoading || !platform || !profileUrl}
                className="w-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white font-black uppercase tracking-wider py-4 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs cursor-pointer"
              >
                {connectLoading ? "Verifying & Syncing Handle..." : "Connect Profile"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
