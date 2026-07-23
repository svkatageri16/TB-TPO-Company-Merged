import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.tsx";
import { useLanguage, DynamicText } from "../../context/LanguageContext.tsx";
import api from "../../services/api.ts";
import toast from "react-hot-toast";
import { 
  FileUp, Search, Briefcase, FileText, CheckCircle, BrainCircuit, 
  Sparkles, Clock, Trophy, Eye, X, Star, AlertTriangle, Lightbulb,
  FileUser, MessageSquare, Award, Flame, BarChart3, Target, Calendar, ArrowRight, ShieldCheck, TrendingUp,
  MapPin, Check, Shield, Trash2, Download, Lock, Gauge
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Link, useNavigate } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

function AIMentorWidget({ profile, analytics, applications }: { profile: any, analytics: any, applications: any[] }) {
  const { t } = useLanguage();
  const [insight, setInsight] = useState<{ text: string, highlight: string, action: string, type: string }>({
    text: "Analyzing your profile...",
    highlight: "",
    action: "Update Profile",
    type: "PROFILE"
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profile || !analytics) return;

    const fetchInsight = async () => {
      setLoading(true);
      try {
        const { data } = await api.post("/ai/career-mentor", { profile, analytics, applications });
        if (data.success && data.insight) {
          setInsight(data.insight);
          return;
        }
      } catch (err) {
        console.error("Failed to fetch AI Mentor insight:", err);
      } finally {
        setLoading(false);
      }

      // Fallback
      setInsight({
        text: `Continue taking AI mock interviews to sharpen your communication and technical explanation skills.`,
        highlight: "AI mock interviews",
        action: "Start Mock",
        type: "MOCK"
      });
    };

    fetchInsight();
  }, [profile, analytics, applications]);

  return (
    <div className="h-full bg-slate-950 border border-slate-900 rounded-3xl p-5 text-white relative overflow-hidden group shadow-lg flex flex-col justify-between">
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32 transition-all duration-1000 group-hover:scale-110" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -ml-32 -mb-32 transition-all duration-1000 group-hover:scale-110" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10 shadow-inner">
               <BrainCircuit size={20} className={`text-indigo-400 ${loading ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">{t('ai_mentor')}</h3>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{t('personalized_strategy')}</p>
            </div>
          </div>
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse hidden sm:block" />
        </div>
        
        {loading ? (
           <div className="flex flex-col items-center justify-center py-6 gap-3">
             <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
             <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400/80">Synthesizing Advice...</p>
           </div>
        ) : (
            <div className="mb-4 bg-white/5 border border-white-[0.05] rounded-2xl p-4 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-[8px] font-black text-cyan-300 uppercase tracking-widest">Recommended Insight</span>
              </div>
              <p className="text-xs md:text-sm text-slate-300 font-medium leading-relaxed font-sans">
                "<DynamicText text={insight.text} />"
              </p>
            </div>
        )}
      </div>

      <div className="relative z-10 grid grid-cols-2 gap-3 mt-auto pt-2">
        <Link 
          to={insight.type === 'SKILL' || insight.type === 'PROFILE' ? "/profile" : insight.type === 'MOCK' ? "/interview" : "/profile"} 
          className="py-2.5 bg-indigo-600 hover:bg-slate-900 border border-transparent hover:border-slate-800 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all text-center flex items-center justify-center shadow-md shadow-indigo-900/10 hover:scale-[1.02] active:scale-[0.98] duration-200"
        >
          {insight.action}
        </Link>
        <button className="py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all text-white backdrop-blur-md">
          {t('view_roadmap')}
        </button>
      </div>
    </div>
  );
}

function TalentScoreWidget({ talent, psychometric }: { talent: any, psychometric: any }) {
  const { t } = useLanguage();
  const breakdown = typeof talent.breakdown_json === 'string' 
    ? JSON.parse(talent.breakdown_json) 
    : (talent.breakdown_json || {});
    
  const radarData = [
    { subject: 'Profile', A: breakdown.profile || 0, fullMark: 100 },
    { subject: 'Interview', A: breakdown.interview || 0, fullMark: 100 },
    { subject: 'Quiz/Test', A: breakdown.quiz || 0, fullMark: 100 },
    { subject: 'Coding', A: breakdown.coding || 0, fullMark: 100 },
    { subject: 'Psychometric', A: breakdown.psychometric || 0, fullMark: 100 },
    { subject: 'Leadership', A: breakdown.leadership || 0, fullMark: 100 },
    { subject: 'Activity', A: breakdown.activity || 0, fullMark: 100 },
  ];
  
  return (
    <div className="h-full bg-white border border-slate-100/80 rounded-3xl p-5 relative overflow-hidden group shadow-md shadow-slate-200/45 flex flex-col justify-between hover:shadow-lg transition-all duration-300">
      <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-50/60 rounded-full blur-3xl -mr-16 -mt-16 transition-transform duration-1000 group-hover:scale-125" />
      
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-0.5">{t('employability_score')}</h3>
            <div className="flex items-baseline gap-1.55">
              <span className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{talent.overall_score || 0}</span>
              <span className="text-xs font-bold text-slate-400">/ 100</span>
            </div>
          </div>
          <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shadow-inner border border-indigo-100/40 shrink-0">
            <Gauge size={18} className="text-indigo-650" />
          </div>
        </div>
      </div>
      
      <div className="relative z-10 w-full h-[150px] my-1">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="62%" data={radarData}>
            <defs>
              <radialGradient id="radarNeonGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#c7d2fe" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#818cf8" stopOpacity={0.15} />
              </radialGradient>
            </defs>
            <PolarGrid stroke="#f1f5f9" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 8, fontWeight: 700 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar
              name="Student"
              dataKey="A"
              stroke="#6366f1"
              strokeWidth={1.5}
              fill="url(#radarNeonGlow)"
              fillOpacity={0.75}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="relative z-10 mt-auto pt-1">
        <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Profile', val: breakdown.weights?.profile || 0, max: 10, color: 'bg-blue-500' },
              { label: 'Mock Interview', val: breakdown.weights?.interview || 0, max: 20, color: 'bg-indigo-500' },
              { label: 'Quiz/Test', val: breakdown.weights?.quiz || 0, max: 20, color: 'bg-violet-500' },
              { label: 'Coding Skills', val: breakdown.weights?.coding || 0, max: 20, color: 'bg-emerald-500' },
              { label: 'Psychometric', val: breakdown.weights?.psychometric || 0, max: 10, color: 'bg-amber-500' },
              { label: 'Leadership', val: breakdown.weights?.leadership || 0, max: 10, color: 'bg-rose-500' },
              { label: 'Consistency', val: breakdown.weights?.activity || 0, max: 10, color: 'bg-cyan-500' },
            ].slice(0, 4).map((item, i) => (
              <div key={i} className="bg-slate-50 p-1.5 rounded-xl border border-slate-100/70">
                <div className="flex justify-between text-[8px] font-black uppercase mb-1">
                  <span className="text-slate-500 truncate mr-1">{item.label}</span>
                  <span className="text-slate-800">{item.val}/{item.max}</span>
                </div>
                <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(item.val / (item.max || 1)) * 100}%` }}
                    className={`h-full ${item.color}`}
                  />
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function ApplicationTracker({ applications }: { applications: any[] }) {
  const { t } = useLanguage();
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SELECTED': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'SHORTLISTED': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'REJECTED': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'TEST_TAKEN': return 'bg-amber-50 text-amber-700 border-amber-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  return (
    <div className="h-full bg-white border border-slate-100/80 rounded-3xl overflow-hidden flex flex-col shadow-md shadow-slate-200/40">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
         <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <Briefcase size={14} className="text-indigo-600" /> {t('hiring_pipeline')}
         </h3>
         <Link to="/applied-jobs" className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800 transition-colors bg-indigo-50 px-2.5 py-1 rounded-full">{t('explore_all')}</Link>
      </div>
      <div className="flex-1 overflow-auto p-1.5 scrollbar-hide">
        {applications.length > 0 ? (
          <div className="space-y-1.5 p-2">
            {applications.slice(0, 4).map((app, i) => (
              <div key={i} className="flex p-2 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 items-center justify-between gap-3 text-xs">
                 <div className="flex items-center gap-2.5 min-w-0 flex-1">
                   <div className="w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center shrink-0 border border-slate-100">
                      <Briefcase size={16} className="text-slate-400" />
                   </div>
                   <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-800 truncate uppercase tracking-tight"><DynamicText text={app.job_title} /></h4>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate"><DynamicText text={app.company_name} /></p>
                   </div>
                 </div>
                 <div className="flex items-center gap-3 shrink-0">
                    <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${getStatusColor(app.status)}`}>
                      {app.status === 'SELECTED' ? 'HIRED!' : app.status}
                    </span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest hidden sm:block">
                       <DynamicText text={app.current_stage_name || t('applied')} />
                    </span>
                 </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6">
             <Target size={28} className="text-slate-200 mb-2 animate-pulse" />
             <p className="text-[10px] font-black uppercase tracking-widest mb-1">{t('no_active_pipeline')}</p>
             <p className="text-[8px] font-medium text-center max-w-[180px] text-slate-400">{t('no_active_pipeline_desc')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function WelcomeBanner({ profile, applications }: { profile: any, applications: any[] }) {
  const { t } = useLanguage();
  const selectedApps = applications.filter(a => a.status === 'SELECTED');
  
  if (selectedApps.length > 0) {
    return (
      <div className="col-span-1 md:col-span-12 relative overflow-hidden bg-gradient-to-r from-emerald-600 to-teal-800 rounded-3xl p-6 md:p-8 text-white shadow-lg shadow-emerald-950/25 mb-4 border border-emerald-500/30">
         <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mt-48 -mr-48" />
         <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 justify-between">
            <div className="flex items-center gap-4">
               <div className="w-16 h-16 bg-white shadow-xl rounded-2xl flex items-center justify-center shrink-0">
                  <Trophy size={32} className="text-emerald-600" />
               </div>
               <div>
                 <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200 mb-1">{t('milestone_unlocked')}</p>
                 <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter leading-none mb-1.5">
                    {t('youve_been_selected')}
                 </h1>
                 <p className="text-xs md:text-sm text-emerald-100 font-medium max-w-2xl">
                    {t('hired_desc_pt1')}<b><DynamicText text={selectedApps[0].job_title} /></b>{t('hired_desc_pt2')}<b><DynamicText text={selectedApps[0].company_name} /></b>{t('hired_desc_pt3')}
                 </p>
               </div>
            </div>
            <Link to={`/student/application/${selectedApps[0].id}`} className="px-6 py-3 bg-white text-emerald-800 rounded-xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all flex items-center gap-2 whitespace-nowrap hidden md:flex shrink-0 shadow-md">
               {t('view_offer')} <ArrowRight size={14} />
            </Link>
         </div>
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('good_morning') : hour < 17 ? t('good_afternoon') : t('good_evening');

  return (
    <div className="col-span-1 md:col-span-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 mt-1">
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">{t('command_center_active')}</p>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">
          {greeting}, <span className="text-indigo-600"><DynamicText text={profile?.full_name?.split(' ')[0] || t('talent')} /></span>
        </h1>
      </div>
      <div className="flex gap-3 w-full md:w-auto">
        <Link to="/resume-builder" className="flex-1 md:flex-none px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-slate-50 transition-colors shadow-sm flex items-center justify-center gap-2">
           <FileText size={13} /> {t('resume_builder_btn')}
        </Link>
        <Link to="/jobs" className="flex-1 md:flex-none px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200/50 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] duration-200">
           <Search size={13} /> {t('find_jobs')}
        </Link>
      </div>
    </div>
  );
}

function ActiveInterviewsBanner({ interviews }: { interviews: any[] }) {
  const navigate = useNavigate();
  const active = interviews.filter(i => i.status !== 'COMPLETED');
  if (active.length === 0) return null;

  return (
    <div className="col-span-1 md:col-span-12 space-y-3 mb-1">
      {active.map(interview => {
        const parsedTime = new Date(interview.time);
        const isOnline = interview.type === 'INTERVIEW_ONLINE' || 
          interview.location_or_link === 'WebRTC Live Call Room' ||
          interview.location_or_link === 'Online Interview' ||
          (interview.location_or_link && interview.location_or_link.toLowerCase().includes('online')) ||
          (interview.location_or_link && interview.location_or_link.toLowerCase().includes('webrtc'));

        return (
          <motion.div 
            key={interview.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden bg-gradient-to-r from-slate-900 to-indigo-950 border border-slate-800 rounded-3xl p-5 md:p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-start gap-4 z-10">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-indigo-405 shrink-0 border border-white/10">
                <Calendar size={22} className="animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[9px] font-black tracking-widest text-[#93c5fd] uppercase bg-indigo-950/80 border border-indigo-900/60 px-2.5 py-0.5 rounded">
                    Interview Schedule
                  </span>
                  {interview.status === 'LIVE' && (
                    <span className="text-[9px] font-black tracking-widest text-emerald-400 bg-emerald-950/80 border border-emerald-900/60 px-2.5 py-0.5 rounded animate-pulse">
                      ● Active Live Call
                    </span>
                  )}
                </div>
                <h4 className="text-base font-black tracking-tight mt-1.5 uppercase text-white">
                  Join Recruiter Discussion: <span className="text-cyan-400 font-extrabold">{interview.company}</span>
                </h4>
                <p className="text-xs font-semibold text-indigo-200 mt-1 flex items-center gap-1.5">
                  <Clock size={13} className="text-indigo-400" />
                  {isNaN(parsedTime.getTime()) ? 'Upcoming slot' : parsedTime.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
            </div>

            <div className="z-10 w-full md:w-auto self-center">
              {isOnline ? (
                <button 
                  onClick={() => {
                    toast.success("Ready to connect...");
                    navigate(`/interview/live/${interview.id}`);
                  }}
                  className="w-full md:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-600 font-black uppercase text-[10px] tracking-widest rounded-xl text-white transition-all shadow-md shrink-0 cursor-pointer hover:scale-105 active:scale-95"
                >
                  Join Live Room
                </button>
              ) : (
                <div className="w-full md:w-auto px-4 py-2 bg-white/10 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-300 text-center">
                  Location: {interview.location_or_link || 'In-Person'}
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export function ProfileCompactCard({ profile }: { profile: any }) {
  const { t } = useLanguage();
  const score = profile?.completeness_score || 0;

  // Compute status for each section based on the db schema criteria
  const getSectionsList = () => {
    const p = profile || {};
    
    // 1. Personal Details (15%)
    const personalComplete = !!(p.full_name && p.contact && p.location && p.profile_photo_url);
    
    // 2. Career Preferences (10%)
    const prefsComplete = !!(p.preferred_job_role && p.preferred_location);
    
    // 3. Education Info (15%)
    let hasEdu = false;
    try {
      if (Array.isArray(p.education) && p.education.length > 0) {
        hasEdu = true;
      } else if (p.education_json) {
        const parsed = typeof p.education_json === 'string' ? JSON.parse(p.education_json) : p.education_json;
        hasEdu = Array.isArray(parsed) && parsed.length > 0;
      }
    } catch(e) {}
    
    // 4. Skills (15%)
    let skillsCount = 0;
    try {
      if (p.skills_json) {
        const parsed = typeof p.skills_json === 'string' ? JSON.parse(p.skills_json) : p.skills_json;
        skillsCount = Array.isArray(parsed) ? parsed.length : 0;
      }
    } catch(e) {}
    const skillsComplete = skillsCount >= 3;
    
    // 5. Relevant Projects (15%)
    let hasProj = false;
    try {
      if (Array.isArray(p.projects) && p.projects.length > 0) {
        hasProj = true;
      } else if (p.projects_json) {
        const parsed = typeof p.projects_json === 'string' ? JSON.parse(p.projects_json) : p.projects_json;
        hasProj = Array.isArray(parsed) && parsed.length > 0;
      }
    } catch(e) {}
    
    // 6. Bio/Summary (10%)
    const hasBio = !!(p.bio && p.bio.length > 40);
    
    // 7. Resume Document (15%)
    const hasResume = !!p.resume_url;

    // 8. Additional Context (5%)
    let hasExtra = false;
    if ((p.experience && p.experience.length > 0) || (p.certifications && p.certifications.length > 0) || (p.extracurriculars && p.extracurriculars.length > 0)) {
       hasExtra = true;
    } else {
       // fallback to json arrays if populated from old structure
       const hasExpJson = p.experience_json && p.experience_json !== "[]" && p.experience_json !== "null";
       const hasCertJson = p.custom_sections_json && p.custom_sections_json.includes('certifications');
       if (hasExpJson || hasCertJson) hasExtra = true;
    }

    return [
      { id: "personal", name: t('personal_details') || "Personal Details", weight: 15, isComplete: personalComplete },
      { id: "education", name: t('education_info') || "Education Info", weight: 15, isComplete: hasEdu },
      { id: "skills", name: t('key_skills') || "3+ Key Skills", weight: 15, isComplete: skillsComplete },
      { id: "projects", name: t('projects_showcase') || "Project Links", weight: 15, isComplete: hasProj },
      { id: "resume", name: t('resume_doc') || "Resume PDF", weight: 15, isComplete: hasResume },
      { id: "preferences", name: t('career_prefs') || "Career Prefs", weight: 10, isComplete: prefsComplete },
      { id: "bio", name: t('professional_bio') || "Professional Bio", weight: 10, isComplete: hasBio },
      { id: "extra", name: t('experience_cert') || "Experience / Certs", weight: 5, isComplete: hasExtra },
    ];
  };

  const sectionsList = getSectionsList();

  return (
    <div className="h-full bg-white border border-slate-100 rounded-3xl p-5 text-center relative overflow-hidden group shadow-md shadow-slate-200/40 flex flex-col justify-between hover:shadow-xl transition-all duration-500">
       {/* Background decorative design */}
       <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-indigo-50/60 to-transparent -z-0" />
       
       <div className="relative z-10 flex flex-col items-center mb-3">
         {/* Profile Photo with premium rings */}
         <div className="relative mb-2">
           <div className={`w-16 h-16 rounded-full p-[2.5px] bg-gradient-to-tr ${score >= 100 ? 'from-emerald-400 to-teal-500' : 'from-indigo-500 via-purple-500 to-pink-500'} shadow-md relative z-10 overflow-hidden shrink-0`}>
             <div className="w-full h-full rounded-full bg-white p-[1.5px] overflow-hidden">
               {profile?.profile_photo_url ? (
                 <img src={profile.profile_photo_url.startsWith('http') ? profile.profile_photo_url : `${api.defaults.baseURL?.replace('/api', '')}${profile.profile_photo_url}`} referrerPolicy="no-referrer" className="w-full h-full object-cover rounded-full" />
               ) : (
                 <div className="w-full h-full rounded-full bg-indigo-50 flex items-center justify-center">
                   <FileUser size={28} className="text-indigo-400" />
                 </div>
               )}
             </div>
           </div>
           
           
         </div>

         {/* Student Name */}
         <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-0.5 max-w-full truncate px-1">
           <DynamicText text={profile?.full_name || t('my_profile')} />
         </h2>
         
         {/* Headline */}
         <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest max-w-full truncate px-4">
           <DynamicText text={profile?.headline || t('setup_headline')} />
         </p>
       </div>

       {/* Profile strength visual indicator bar */}
       <div className="w-full bg-slate-50 border border-slate-100/70 rounded-2xl p-3 mb-4 text-left relative z-10">
          <div className="flex justify-between items-baseline mb-1.5">
             <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">{t('profile_strength') || "Profile Strength"}</span>
             <div className="flex items-center gap-1">
               <span className={`text-xs font-extrabold ${score < 40 ? 'text-red-500' : score < 70 ? 'text-amber-500' : 'text-emerald-500'}`}>{score}%</span>
               {score < 40 ? <span className="text-[8px] font-black text-red-600 bg-red-100/50 px-1 py-0.5 rounded uppercase">{t('low') || "Low"}</span> : score < 70 ? <span className="text-[8px] font-black text-amber-600 bg-amber-100/50 px-1 py-0.5 rounded uppercase">{t('medium') || "Medium"}</span> : <span className="text-[8px] font-black text-emerald-600 bg-emerald-100/50 px-1 py-0.5 rounded uppercase">{t('completed') || "Active"}</span>}
             </div>
          </div>
          
          {/* Beautiful glowing gradient progress track */}
          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden relative shadow-inner">
             <div 
               className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${
                 score < 40 ? 'bg-gradient-to-r from-red-500 to-rose-500 shadow-red-200/50' :
                 score < 70 ? 'bg-gradient-to-r from-yellow-400 to-amber-500 shadow-yellow-100' :
                 'bg-gradient-to-r from-green-400 to-emerald-500 shadow-emerald-250'
               }`} 
               style={{ width: `${score}%` }} 
             />
          </div>
       </div>

       {/* Detailed Checklist Sections (Gives dynamic % breakdown as requested) */}
       <div className="w-full text-left relative z-10 mb-4">
         <div className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1.5 flex justify-between px-1">
           <span>{t('section_breakdown') || "Section Weights"}</span>
           <span>{t('status') || "Status"}</span>
         </div>
         
         <div className="grid grid-cols-2 gap-1.5 select-none">
           {sectionsList.map((sect) => (
             <div 
               key={sect.id} 
               className={`flex items-center gap-1 p-1 rounded-lg text-[9px] font-bold transition-all border ${
                 sect.isComplete 
                   ? 'bg-emerald-55/30 border-emerald-100/30 text-slate-700' 
                   : 'bg-slate-50/60 border-slate-100/30 text-slate-400 hover:bg-slate-50'
               }`}
             >
               <div className={`w-3.5 h-3.5 rounded-md flex items-center justify-center shrink-0 ${
                 sect.isComplete ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
               }`}>
                 {sect.isComplete ? <Check size={8} strokeWidth={3} /> : <span className="text-[7.5px] font-black font-mono">+{sect.weight}</span>}
               </div>
               <span className="truncate text-[9px] font-semibold flex-1 leading-tight">{sect.name}</span>
               {sect.isComplete ? (
                 <span className="w-1 h-1 rounded-full bg-emerald-500 shrink-0 opacity-85" title="Completed" />
               ) : (
                 <Link to="/profile" className="text-[9px] font-black text-indigo-500 hover:text-indigo-600 shrink-0 cursor-pointer" title="Add Info">
                   +
                 </Link>
               )}
             </div>
           ))}
         </div>
       </div>

       {/* Action navigation button */}
       <Link 
         to="/profile" 
         className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-indigo-600 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-1 mt-auto shadow-sm"
       >
         {t('edit_profile') || "Update Profile"} <ArrowRight size={12} />
       </Link>
    </div>
  );
}

function DailyTasksWidget({ 
  tasks, 
  xp, 
  streak, 
  onCheckIn, 
  dailyRewardBase = 50, 
  streakBonusStep = 10 
}: { 
  tasks: any, 
  xp: number, 
  streak: number, 
  onCheckIn: () => void, 
  dailyRewardBase?: number, 
  streakBonusStep?: number 
}) {
  const { t, language } = useLanguage();
  
  // Display the static daily reward base amount
  const displayXP = `+${dailyRewardBase} XP`;

  return (
    <div className="h-full bg-white border border-slate-100 rounded-3xl p-5 shadow-md shadow-slate-200/40 flex flex-col relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50/50 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
      <div className="flex justify-between items-center mb-4 relative z-10">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{t('daily_quests')}</h3>
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-orange-50 text-orange-600 rounded-full text-[8px] font-black border border-orange-100/60 shadow-sm">
          <Flame size={10} className="fill-orange-500 text-orange-500" /> {streak} {t('day_streak')}
        </div>
      </div>

      <div className={`flex-1 p-4 rounded-2xl flex flex-col justify-center items-center text-center transition-all duration-300 border relative z-10 ${
          tasks?.is_check_in_completed 
            ? 'bg-emerald-50/50 border-emerald-100' 
            : 'bg-slate-50 border-slate-100 hover:border-slate-200'
        }`}>
         <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-colors ${
            tasks?.is_check_in_completed ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200' : 'bg-white shadow-md text-slate-450 border border-slate-100'
          }`}>
            <CheckCircle size={22} />
         </div>
         <h4 className="text-xs font-black text-slate-800 tracking-tight uppercase mb-1">{t('daily_checkin')}</h4>
         <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mb-4">{t('login_maintain_streak')}</p>
         
         {tasks?.is_check_in_completed ? (
            <div className="px-5 py-2 bg-emerald-100 text-emerald-700 border border-emerald-200/60 rounded-xl text-[8px] font-black uppercase tracking-widest select-none">
               {language === 'mr' ? `पूर्ण झाले (${displayXP})` : `Completed (${displayXP})`}
            </div>
         ) : (
            <button 
              onClick={(e) => { e.preventDefault(); onCheckIn(); }}
              className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 transition-colors shadow-md shadow-indigo-100 hover:scale-[1.02] active:scale-[0.98] duration-200 animate-pulse"
            >
               {language === 'mr' ? `मिळवा (${displayXP})` : `Claim (${displayXP})`}
            </button>
         )}
      </div>
    </div>
  );
}

function JobCard({ job, completeness, studentProfileId, applications, onApplySuccess }: { job: any, completeness: number, studentProfileId: number | undefined, applications: any[], onApplySuccess: () => void }) {
  const { t } = useLanguage();
  const [showIncompleteWarn, setShowIncompleteWarn] = useState(false);

  const handleApply = async () => {
    if (completeness < 70) {
      setShowIncompleteWarn(true);
      return;
    }
    if (job.deadline && new Date(job.deadline) < new Date()) {
       alert("Application deadline has passed.");
       return;
    }
    try {
      if (!studentProfileId) {
         alert("Please complete your profile before applying.");
         return;
      }
      const { data } = await api.post("/jobs/apply", { jobId: job.id, studentId: studentProfileId });
      if (data.success) {
         alert("Application submitted successfully!");
         window.dispatchEvent(new CustomEvent('vega:pipeline-updated'));
         onApplySuccess(); 
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Already applied or something went wrong!");
    }
  };

  const userApp = applications.find(a => a.job_id === job.id);
  const applied = !!userApp;
  const isExpired = job.deadline ? new Date(job.deadline) < new Date() : false;

  return (
    <div className={`bg-white border ${applied ? 'border-emerald-200 bg-emerald-50/10' : 'border-slate-100/80'} rounded-3xl p-5 flex flex-col justify-between hover:shadow-lg hover:shadow-slate-200/30 transition-all duration-300 group ${isExpired ? 'opacity-75 grayscale-[0.2]' : 'h-full'}`}>
      <AnimatePresence>
        {showIncompleteWarn && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-20 bg-slate-900/95 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-6 text-center text-white"
          >
            <AlertTriangle className="text-orange-400 mb-3" size={32} />
            <h4 className="text-base font-black uppercase mb-1">{t('profile_incomplete')}</h4>
            <p className="text-[10px] text-slate-300 mb-5 font-medium">{t('profile_incomplete_desc_pt1')}{completeness}{t('profile_incomplete_desc_pt2')}</p>
            <div className="flex gap-3">
              <Link to="/profile" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors">{t('complete_now')}</Link>
              <button onClick={() => setShowIncompleteWarn(false)} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors">{t('close')}</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 pr-3">
             <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                <span className="px-2 py-0.5 bg-slate-100 text-slate-650 text-[8px] font-black uppercase tracking-widest rounded-md">{job.job_type}</span>
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[8px] font-black uppercase tracking-widest rounded-md">{job.openings || 1} Openings</span>
                {applied && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase tracking-widest rounded-md flex items-center gap-0.5"><Check size={8} /> {t('applied')}</span>}
             </div>
             <h4 className="font-black text-base text-slate-900 uppercase tracking-tight leading-snug mb-1 group-hover:text-blue-600 transition-colors line-clamp-1"><DynamicText text={job.title} /></h4>
             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 flex-wrap">
                <DynamicText text={job.company_name} /> <span className="w-1 h-1 rounded-full bg-slate-300" /> <span><DynamicText text={job.location || 'Remote'} /></span>
             </p>
          </div>
          <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center border border-slate-150 p-1 shadow-sm overflow-hidden shrink-0">
             {job.logo_url ? <img src={job.logo_url} className="w-full h-full object-contain p-1" /> : <Briefcase size={20} className="text-slate-300" />}
          </div>
        </div>
        
        <p className="text-[10px] text-slate-550 leading-relaxed font-medium line-clamp-2 mb-3 bg-slate-50/60 p-3 rounded-xl">
          {job.description}
        </p>

        <div className="flex flex-wrap gap-1.5 mb-4">
           {(() => {
             try {
               const skills = typeof job.skills_json === 'string' ? JSON.parse(job.skills_json) : (job.skills_json || []);
               return skills.slice(0, 3).map((s: string) => (
                 <span key={s} className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-500">
                   {s}
                 </span>
               ));
             } catch (e) { return null; }
           })()}
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-auto">
        <div className="flex flex-col">
           <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{t('closes_on')}</span>
           <span className={`text-[9px] font-black uppercase ${isExpired ? 'text-red-500' : 'text-slate-800'}`}>
              {job.deadline ? new Date(job.deadline).toLocaleDateString() : t('rolling')}
           </span>
        </div>
        <button 
          disabled={applied || isExpired}
          onClick={handleApply}
          className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            applied ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 
            isExpired ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 
            'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-95'
          }`}
        >
          {applied ? t('applied') : isExpired ? t('closed') : t('apply_now')}
        </button>
      </div>
    </div>
  );
}

function ReferAndEarnWidget({ user }: { user: any }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const referralCode = user?.referral_code || "TALENT2025";
  
  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full bg-slate-950 border border-slate-900 rounded-3xl p-5 flex flex-col justify-between shadow-lg group relative overflow-hidden">
      <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-505/10 rounded-full blur-2xl -ml-16 -mt-16 group-hover:bg-indigo-500/15 transition-all duration-500" />
      <div className="relative z-10 flex flex-col items-center text-center h-full">
        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-3 border border-white/10 group-hover:scale-105 transition-transform text-indigo-400 shrink-0">
          <Sparkles size={20} />
        </div>
        <h3 className="text-xs font-black text-white uppercase tracking-tight mb-1">{t('refer_and_earn_xp')}</h3>
        <p className="text-[9px] text-slate-400 font-medium uppercase tracking-widest leading-relaxed mb-4" dangerouslySetInnerHTML={{__html: t('invite_friends_desc').replace('+60 XP', '<span class="text-indigo-400 font-black">+60 XP</span>').replace('+६० XP', '<span class="text-indigo-400 font-black">+६० XP</span>')}} />
        
        <div className="mt-auto w-full relative">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between shadow-inner backdrop-blur-sm group-hover:border-indigo-500/25 transition-colors">
            <span className="text-xs font-black text-indigo-300 tracking-widest font-mono ml-2">{referralCode}</span>
            <button 
              onClick={(e) => { e.preventDefault(); handleCopy(); }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white p-1.5 rounded-lg transition-colors cursor-pointer"
            >
              {copied ? <Check size={14} /> : <FileUp size={14} style={{transform: "rotate(180deg)"}} />}
            </button>
          </div>
          {copied && <p className="text-[8px] font-bold text-emerald-400 uppercase mt-1 absolute w-full text-center bottom-[-16px] select-none">{t('copied')}</p>}
        </div>
      </div>
    </div>
  );
}

function ReferBanner({ user }: { user: any }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const referralCode = user?.referral_code || "TALENT2025";
  const shareText = `Join VEGA and use my referral code ${referralCode} to earn exciting rewards! Sign up here: ${window.location.origin}/signup?ref=${referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="mt-12 bg-blue-700 rounded-[32px] overflow-hidden flex flex-col md:flex-row items-center justify-between p-8 md:p-12 relative shadow-2xl shadow-blue-900/20">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl -mr-32 -mt-32" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/30 rounded-full blur-3xl -ml-32 -mb-32" />
      
      <div className="relative z-10 max-w-2xl text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-md mb-6">
          <span className="text-red-500 text-xs">🎁</span>
          <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">{t('refer_and_earn_program')}</span>
        </div>
        <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-4">
          {t('refer_friends_earn_rewards')}
        </h2>
        <p className="text-sm md:text-base text-blue-100 font-medium leading-relaxed mb-8 max-w-xl">
          {t('refer_friends_desc')}
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button 
            onClick={handleCopy}
            className="w-full sm:w-auto px-8 py-3.5 bg-white text-blue-900 rounded-full font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-colors shadow-xl shadow-black/10"
          >
            {copied ? t('copied') : t('refer_and_earn_now')}
          </button>
          <button 
            onClick={handleShareWhatsApp}
            className="w-full sm:w-auto px-8 py-3.5 bg-transparent border-2 border-white text-white rounded-full font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.662-2.062-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
            </svg>
            {t('share_on_whatsapp')}
          </button>
        </div>
      </div>
      
      <div className="relative z-10 w-full md:w-auto h-72 md:h-96 mt-8 md:mt-0 flex justify-center items-center pointer-events-none">
        <div className="absolute right-0 -mr-10 md:-mr-20 translate-y-6 md:translate-y-12 flex items-center justify-center">
          {/* Enhanced Circle Backgrounds */}
          <div className="absolute w-[300px] h-[300px] md:w-[450px] md:h-[450px] bg-indigo-500/20 rounded-full animate-ping shadow-[0_0_80px_rgba(79,70,229,0.3)]" style={{animationDuration: '4s'}} />
          <div className="absolute w-[320px] h-[320px] md:w-[420px] md:h-[420px] bg-gradient-to-tr from-blue-400/30 to-indigo-500/30 rounded-full backdrop-blur-3xl shadow-inner border border-white/20" style={{ animation: 'spin 20s linear infinite' }} />
          <div className="absolute w-[280px] h-[280px] md:w-[380px] md:h-[380px] bg-gradient-to-bl from-white/50 to-blue-300/20 rounded-full backdrop-blur-md shadow-[inset_0_0_50px_rgba(255,255,255,0.6)] border-4 border-white/40" />
          
          {/* Main Image Container */}
          <div className="relative w-[260px] h-[260px] md:w-[350px] md:h-[350px] rounded-full overflow-hidden flex items-center justify-center" style={{ animation: 'bounce 4s infinite', boxShadow: 'inset 0 0 0 10px rgba(255,255,255,0.2)' }}>
             <img src="/refer.png" className="w-full h-full object-cover rounded-full z-20" alt="Refer and Earn Enhanced" />
          </div>
          
          {/* Floating decorative elements */}
          <div className="absolute top-10 left-0 text-3xl" style={{ animation: 'bounce 3s infinite', animationDelay: '0.2s' }}>🎁</div>
          <div className="absolute top-20 right-10 text-3xl" style={{ animation: 'bounce 3s infinite', animationDelay: '0.7s' }}>💰</div>
          <div className="absolute bottom-10 left-10 text-4xl" style={{ animation: 'bounce 4s infinite', animationDelay: '1.2s' }}>✨</div>
        </div>
      </div>
    </div>
  );
}

function JobApplyFrequencyCard({ applications }: { applications: any[] }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [selectedYear, setSelectedYear] = useState(2026);
  const [activeType, setActiveType] = useState<'JOB_APPLY' | 'AI_MOCK_INTERVIEW' | 'AI_QUIZ' | 'DAILY_STREAK'>('JOB_APPLY');

  const [mockInterviews, setMockInterviews] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [checkins, setCheckins] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.id) return;

    const loadInterviews = async () => {
      try {
        const { data } = await api.get(`/ai/history/${user.id}`);
        if (data.success && Array.isArray(data.data)) {
          setMockInterviews(data.data);
        }
      } catch (err) {
        console.error("Failed to load interview history:", err);
      }
    };

    const loadQuizzes = async () => {
      try {
        const { data } = await api.get(`/quiz/history/${user.id}`);
        if (data.success && Array.isArray(data.quizzes)) {
          setQuizzes(data.quizzes);
        }
      } catch (err) {
        console.error("Failed to load quiz history:", err);
      }
    };

    const loadCheckins = async () => {
      try {
        const { data } = await api.get(`/analytics/student/${user.id}/check-ins`);
        if (data.success && Array.isArray(data.data)) {
          setCheckins(data.data);
        }
      } catch (err) {
        console.error("Failed to load check-ins history:", err);
      }
    };

    loadInterviews();
    loadQuizzes();
    loadCheckins();
  }, [user?.id]);

  const getLocalDateString = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const r = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${r}`;
  };

  const activeCounts: Record<string, number> = {};

  if (activeType === 'JOB_APPLY') {
    applications.forEach(app => {
      if (app.applied_at) {
        try {
          const d = new Date(app.applied_at);
          if (!isNaN(d.getTime())) {
            const key = getLocalDateString(d);
            activeCounts[key] = (activeCounts[key] || 0) + 1;
          }
        } catch (e) { console.error(e); }
      }
    });
  } else if (activeType === 'AI_MOCK_INTERVIEW') {
    mockInterviews.forEach(interview => {
      const dateToUse = interview.created_at || interview.scheduled_at;
      if (dateToUse) {
        try {
          const d = new Date(dateToUse);
          if (!isNaN(d.getTime())) {
            const key = getLocalDateString(d);
            activeCounts[key] = (activeCounts[key] || 0) + 1;
          }
        } catch (e) { console.error(e); }
      }
    });
  } else if (activeType === 'AI_QUIZ') {
    quizzes.forEach(quiz => {
      if (quiz.created_at) {
        try {
          const d = new Date(quiz.created_at);
          if (!isNaN(d.getTime())) {
            const key = getLocalDateString(d);
            activeCounts[key] = (activeCounts[key] || 0) + 1;
          }
        } catch (e) { console.error(e); }
      }
    });
  } else if (activeType === 'DAILY_STREAK') {
    checkins.forEach(ci => {
      if (ci.task_date) {
        try {
          const d = new Date(ci.task_date);
          if (!isNaN(d.getTime())) {
            const key = getLocalDateString(d);
            activeCounts[key] = (activeCounts[key] || 0) + 1;
          }
        } catch (e) { console.error(e); }
      }
    });
  }

  const calculateStreak = (activeDates: Set<string>) => {
    let streak = 0;
    const today = new Date("2026-06-10T10:00:00Z");
    const checkDate = new Date(today);
    
    for (let i = 0; i < 365; i++) {
      const dateStr = getLocalDateString(checkDate);
      if (activeDates.has(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (i === 0) {
        // Check yesterday as fallback if today has no submissions yet
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  };

  const activeDatesList = Object.keys(activeCounts).filter(k => activeCounts[k] > 0);
  const activeDatesSet = new Set(activeDatesList);
  const currentStreak = calculateStreak(activeDatesSet);

  const totalCount = Object.values(activeCounts).reduce((acc, curr) => acc + curr, 0);

  let peakDay = "None";
  let peakFreq = 0;
  Object.entries(activeCounts).forEach(([date, count]) => {
    if (count > peakFreq) {
      peakFreq = count;
      peakDay = date;
    }
  });

  const jan1 = new Date(selectedYear, 0, 1);
  const jan1Day = jan1.getDay();
  const startDate = new Date(jan1);
  startDate.setDate(jan1.getDate() - jan1Day);

  const monthHeaders: { index: number; label: string }[] = [];
  let lastMonth = -1;
  for (let c = 0; c < 53; c++) {
    const wDate = new Date(startDate);
    wDate.setDate(startDate.getDate() + c * 7 + 3);
    const m = wDate.getMonth();
    if (m !== lastMonth) {
      monthHeaders.push({ index: c, label: wDate.toLocaleString('en-US', { month: 'short' }) });
      lastMonth = m;
    }
  }

  const [tooltip, setTooltip] = useState<{
    date: string;
    count: number;
    x: number;
    y: number;
  } | null>(null);

  const getCellBgClass = (count: number) => {
    if (count === 0) return "bg-slate-100 hover:bg-slate-200 border-transparent";
    
    if (activeType === 'JOB_APPLY') {
      if (count === 1) return "bg-[#dedeff] hover:bg-indigo-200 border-[#c7d2fe]/30";
      if (count === 2) return "bg-[#9c93f9] hover:bg-[#818cf8]/80 border-[#9c93f9]";
      if (count === 3) return "bg-[#766bf6] hover:bg-[#6366f1]/80 border-[#766bf6]";
      return "bg-[#5f5af6] hover:bg-[#4f46e5] border-[#5f5af6]";
    } else if (activeType === 'AI_MOCK_INTERVIEW') {
      if (count === 1) return "bg-amber-100 hover:bg-amber-200 border-amber-200/30";
      if (count === 2) return "bg-amber-300 hover:bg-amber-400 border-amber-300";
      if (count === 3) return "bg-amber-500 hover:bg-amber-600 border-amber-500";
      return "bg-amber-600 hover:bg-amber-700 border-amber-600";
    } else if (activeType === 'AI_QUIZ') {
      if (count === 1) return "bg-violet-100 hover:bg-violet-200 border-violet-200/30";
      if (count === 2) return "bg-violet-300 hover:bg-violet-400 border-violet-300";
      if (count === 3) return "bg-violet-500 hover:bg-violet-600 border-violet-500";
      return "bg-violet-600 hover:bg-violet-700 border-violet-600";
    } else { // DAILY_STREAK
      if (count === 1) return "bg-emerald-100 hover:bg-emerald-200 border-emerald-200/30";
      if (count === 2) return "bg-emerald-300 hover:bg-emerald-400 border-emerald-300";
      if (count === 3) return "bg-emerald-500 hover:bg-emerald-600 border-emerald-500";
      return "bg-emerald-600 hover:bg-emerald-700 border-[#059669]";
    }
  };

  const getLabelForTooltip = () => {
    if (activeType === 'JOB_APPLY') return "Application";
    if (activeType === 'AI_MOCK_INTERVIEW') return "Mock Interview";
    if (activeType === 'AI_QUIZ') return "AI Quiz";
    return "Check-in";
  };

  const formattedPeakDay = peakDay !== "None" 
    ? new Date(peakDay).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : "No records";

  const performanceTypes = [
    { id: 'JOB_APPLY', label: 'Job Applied', icon: Briefcase, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
    { id: 'AI_MOCK_INTERVIEW', label: 'AI Interviews', icon: MessageSquare, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { id: 'AI_QUIZ', label: 'AI Quizzes', icon: BrainCircuit, color: 'text-violet-600 bg-violet-50 border-violet-200' },
    { id: 'DAILY_STREAK', label: 'Daily Streak', icon: Flame, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  ];

  const getMetricTitle = () => {
    if (activeType === 'JOB_APPLY') return "Job apply frequency";
    if (activeType === 'AI_MOCK_INTERVIEW') return "AI Interview activity";
    if (activeType === 'AI_QUIZ') return "AI Quiz performance";
    return "Daily login check-ins";
  };

  return (
    <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-md shadow-slate-200/40 relative overflow-hidden transition-all duration-300">
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
             <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Performance Metrics</h3>
          </div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">{getMetricTitle()}</h2>
        </div>
        
        <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-start">
           <select 
             value={selectedYear}
             onChange={(e) => setSelectedYear(Number(e.target.value))}
             className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer text-slate-700"
           >
             <option value={2026}>2026</option>
             <option value={2025}>2025</option>
           </select>
        </div>
      </div>

      {/* Premium Performance Filters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {performanceTypes.map((type) => {
          const IconComponent = type.icon;
          const isActive = activeType === type.id;
          return (
            <button
              key={type.id}
              onClick={() => {
                setActiveType(type.id as any);
                setTooltip(null);
              }}
              className={`flex items-center justify-center gap-2 px-3 py-3 rounded-2xl border text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                isActive 
                  ? `${type.color} shadow-sm font-black scale-[1.02]` 
                  : 'bg-white border-slate-150 text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <IconComponent size={14} className={isActive ? 'animate-pulse' : ''} />
              <span>{type.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        <div className="col-span-1 lg:col-span-8 overflow-visible relative">
           <div className="overflow-x-auto scrollbar-thin pb-4">
              <div className="min-w-[780px] select-none relative" id="heatmap-grid-viewport">
                 
                 <div className="h-6 w-full relative mb-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                   {monthHeaders.map((header, idx) => (
                     <span 
                       key={idx} 
                       className="absolute transform -translate-x-1/2" 
                       style={{ left: `calc(${(header.index / 53) * 100}% + 42px)` }}
                     >
                       {header.label}
                     </span>
                   ))}
                 </div>

                 <div className="flex gap-4 items-center">
                    
                    <div className="flex gap-3 items-center w-10 shrink-0">
                       <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-350 font-mono -rotate-90 whitespace-nowrap translate-x-[-4px]">
                          {selectedYear}
                       </div>

                       <div className="flex flex-col justify-between h-[104px] text-[9px] font-black text-slate-400 uppercase tracking-widest pt-[14px]">
                          <span>Mon</span>
                          <span>Wed</span>
                          <span>Fri</span>
                       </div>
                    </div>

                    <div className="flex-1 flex gap-[3.2px] relative" onMouseLeave={() => setTooltip(null)}>
                       
                       {tooltip && (
                         <div 
                           className="absolute z-30 bg-slate-900 text-white rounded-lg px-3 py-1.5 text-center text-[10px] font-black tracking-wide pointer-events-none shadow-xl border border-slate-800 flex flex-col gap-0.5 whitespace-nowrap"
                           style={{ 
                             left: `${tooltip.x}px`, 
                             top: `${tooltip.y}px`, 
                             transform: "translateX(-50%)",
                             transition: "left 0.1s ease-out, top 0.1s ease-out"
                           }}
                         >
                           <span className="text-slate-400 uppercase text-[8px] tracking-widest font-bold">{tooltip.date}</span>
                           <span>
                             {tooltip.count === 0 
                               ? `No ${getLabelForTooltip().toLowerCase()}s` 
                               : `${tooltip.count} ${getLabelForTooltip()}${tooltip.count > 1 ? (activeType === 'AI_QUIZ' ? 'zes' : 's') : ''}`}
                           </span>
                           <div className="absolute bottom-[-4px] left-1/2 transform -translate-x-1/2 w-2 h-2 bg-slate-900 border-r border-b border-slate-800 rotate-45" />
                         </div>
                       )}

                       {Array.from({ length: 53 }).map((_, cIndex) => (
                         <div key={cIndex} className="flex flex-col gap-[3.2px]">
                            {Array.from({ length: 7 }).map((_, rIndex) => {
                              const cellDate = new Date(startDate);
                              cellDate.setDate(startDate.getDate() + cIndex * 7 + rIndex);
                              const dateStringKey = getLocalDateString(cellDate);
                              
                              const count = activeCounts[dateStringKey] || 0;
                              const isCurrentYear = cellDate.getFullYear() === selectedYear;

                              return (
                                <div 
                                  key={rIndex}
                                  className={`w-[12px] h-[12px] rounded-[3px] border transition-all duration-150 shrink-0 cursor-crosshair ${
                                    isCurrentYear ? getCellBgClass(count) : 'bg-transparent border-transparent pointer-events-none'
                                  } ${isCurrentYear && 'hover:scale-125'}`}
                                  onMouseEnter={(e) => {
                                    if (!isCurrentYear) return;
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const viewport = document.getElementById("heatmap-grid-viewport");
                                    if (viewport) {
                                      const vpRect = viewport.getBoundingClientRect();
                                      setTooltip({
                                        date: cellDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                                        count,
                                        x: rect.left - vpRect.left + rect.width / 2,
                                        y: rect.top - vpRect.top - 46
                                      });
                                    }
                                  }}
                                />
                              );
                            })}
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
           </div>

           <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-2 border-t border-slate-50 pt-4">
              <div className="flex items-center gap-1.5 flex-wrap">
                 <span>Less</span>
                 <div className="w-3 h-3 bg-slate-100 rounded-[3px] border border-transparent" />
                 {activeType === 'JOB_APPLY' && (
                    <>
                      <div className="w-3 h-3 bg-[#dedeff] rounded-[3px] border border-[#c7d2fe]/30" />
                      <div className="w-3 h-3 bg-[#9c93f9] rounded-[3px] border border-[#9c93f9]" />
                      <div className="w-3 h-3 bg-[#766bf6] rounded-[3px] border border-[#766bf6]" />
                      <div className="w-3 h-3 bg-[#5f5af6] rounded-[3px] border border-[#5f5af6]" />
                    </>
                 )}
                 {activeType === 'AI_MOCK_INTERVIEW' && (
                    <>
                      <div className="w-3 h-3 bg-amber-100 rounded-[3px] border border-transparent" />
                      <div className="w-3 h-3 bg-amber-300 rounded-[3px] border border-transparent" />
                      <div className="w-3 h-3 bg-amber-500 rounded-[3px] border border-transparent" />
                      <div className="w-3 h-3 bg-amber-600 rounded-[3px] border border-transparent" />
                    </>
                 )}
                 {activeType === 'AI_QUIZ' && (
                    <>
                      <div className="w-3 h-3 bg-violet-100 rounded-[3px] border border-transparent" />
                      <div className="w-3 h-3 bg-violet-300 rounded-[3px] border border-transparent" />
                      <div className="w-3 h-3 bg-violet-500 rounded-[3px] border border-transparent" />
                      <div className="w-3 h-3 bg-violet-600 rounded-[3px] border border-transparent" />
                    </>
                 )}
                 {activeType === 'DAILY_STREAK' && (
                    <>
                      <div className="w-3 h-3 bg-emerald-100 rounded-[3px] border border-transparent" />
                      <div className="w-3 h-3 bg-emerald-300 rounded-[3px] border border-transparent" />
                      <div className="w-3 h-3 bg-emerald-500 rounded-[3px] border border-transparent" />
                      <div className="w-3 h-3 bg-emerald-600 rounded-[3px] border border-transparent" />
                    </>
                 )}
                 <span>More</span>
              </div>
              <div className="text-[9px] font-bold text-slate-400">
                 Hover over any square to view metrics
              </div>
           </div>
        </div>

        <div className="col-span-1 lg:col-span-4 bg-slate-50 rounded-2xl p-4 md:p-5 border border-slate-100 flex flex-col justify-between h-full w-full">
           <div>
              <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-4 flex items-center gap-2">
                 <Award size={13} className="text-indigo-600" /> Career Preparation Intelligence
              </h3>
              
              <div className="space-y-4">
                 
                 <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-150">
                    <div>
                       <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
                         {activeType === 'JOB_APPLY' ? 'Total Submissions' : 
                          activeType === 'AI_MOCK_INTERVIEW' ? 'Interviews Evaluated' :
                          activeType === 'AI_QUIZ' ? 'Quizzes Completed' : 'Total Check-ins'}
                       </p>
                       <p className="text-xl font-black text-slate-800 leading-none">{totalCount}</p>
                    </div>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      activeType === 'JOB_APPLY' ? 'bg-indigo-50 text-indigo-600' :
                      activeType === 'AI_MOCK_INTERVIEW' ? 'bg-amber-50 text-amber-600' :
                      activeType === 'AI_QUIZ' ? 'bg-violet-50 text-violet-600' : 'bg-emerald-50 text-emerald-600'
                    }`}>
                       {activeType === 'JOB_APPLY' ? <Target size={16} /> :
                        activeType === 'AI_MOCK_INTERVIEW' ? <MessageSquare size={14} /> :
                        activeType === 'AI_QUIZ' ? <BrainCircuit size={14} /> : <Trophy size={14} />}
                    </div>
                 </div>

                 <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-150">
                    <div>
                       <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Activity Streak</p>
                       <div className="flex items-center gap-1.5">
                          <p className="text-xl font-black text-slate-800 leading-none">{currentStreak} Days</p>
                          {currentStreak > 0 && <Flame size={14} className="text-orange-500 fill-orange-500 animate-pulse" />}
                       </div>
                    </div>
                    <div className="w-8 h-8 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center">
                       <Flame size={16} />
                    </div>
                 </div>

                 <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-150">
                    <div>
                       <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Peak Performance Day</p>
                       <p className="text-xs font-black text-slate-700 tracking-tight">{formattedPeakDay}</p>
                       {peakFreq > 0 && <p className="text-[8px] font-black uppercase text-emerald-600 mt-0.5">{peakFreq} sessions / day max</p>}
                    </div>
                    <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                       <Calendar size={16} />
                    </div>
                 </div>
              </div>
           </div>

           <div className="mt-5 pt-4 border-t border-slate-200/60 text-left">
              <div className="flex items-start gap-2.5 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/50">
                 <Trophy size={14} className="text-indigo-600 shrink-0 mt-0.5" />
                 <div>
                    <h4 className="text-[9px] font-black text-indigo-800 uppercase tracking-wider mb-0.5">Consistency Bonus</h4>
                    <p className="text-[10px] text-indigo-700 leading-relaxed font-semibold">
                      {totalCount < 5 
                        ? "Increase your active frequency to hit a 5-day streak and boost your talent score views by up to 2.5x!"
                        : "Outstanding consistency! Keeping your career prep streak alive grants you a 1.25x community multiplier."}
                    </p>
                 </div>
              </div>
           </div>
        </div>

      </div>

    </div>
  );
}

function PrivacyComplianceWidget({ user }: { user: any }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [consents, setConsents] = useState({
    academic_sharing: true,
    employer_matching: true,
    ai_optimization: true,
    telemetry_tracking: false,
    timestamp: ""
  });

  useEffect(() => {
    if (!user?.id) return;
    const fetchConsents = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/students/privacy/${user.id}`);
        if (data.success && data.consents) {
          setConsents(data.consents);
        }
      } catch (err) {
        console.error("Failed to load privacy consents:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchConsents();
  }, [user?.id]);

  const handleToggle = async (key: keyof typeof consents) => {
    if (key === 'timestamp') return;
    const updated = {
      ...consents,
      [key]: !consents[key],
      timestamp: new Date().toISOString()
    };
    setConsents(updated);
    setSaving(true);
    try {
      await api.post(`/students/privacy/${user.id}`, { consents: updated });
    } catch (err) {
      console.error("Failed to save privacy consents:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const response = await api.get(`/students/privacy/${user.id}/export`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `vega-personal-data-${user.id}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Data portability export failed:", err);
      alert("Error generating download package. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== "ERASE") {
      alert("Please enter the verification word 'ERASE' exactly to proceed.");
      return;
    }
    
    setLoading(true);
    try {
      const { data } = await api.delete(`/students/privacy/${user.id}/delete-account`);
      if (data.success) {
        alert("Personal records, profiles, and authenticated sessions are forever anonymized and hard-purged. We wish you great career successes.");
        if (logout) {
          await logout();
        } else {
          localStorage.clear();
          sessionStorage.clear();
        }
        window.location.href = "/login";
      }
    } catch (err) {
      console.error("Erasure failed:", err);
      alert("Error purging user record. Contact data compliance safety team.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-105 rounded-3xl p-6 shadow-md shadow-slate-200/40 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-50/50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
      
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 border border-indigo-100/40 shadow-inner shrink-0">
            <Shield size={20} className="fill-indigo-100" />
          </div>
          <div>
            <h3 className="text-base font-black uppercase text-slate-900 tracking-tight flex items-center gap-2">
              Privacy & Consent Control Panel
              <span className="px-2 py-0.5 bg-indigo-500 text-white text-[8px] font-black tracking-widest uppercase rounded-full border border-indigo-600">
                DPDP/GDPR Active Compliance
              </span>
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              Control consents, exercise your Right to erasure, and request complete data portability downloads
            </p>
          </div>
        </div>
        
        <div className="flex gap-2.5 items-center">
          {saving && (
             <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500 animate-pulse">
               Syncing Preference...
             </span>
          )}
          <button
            onClick={handleExportData}
            disabled={exporting}
            className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 text-slate-700"
          >
            <Download size={12} className={exporting ? 'animate-bounce' : ''} />
            {exporting ? "Compiling..." : "Export Profile (JSON)"}
          </button>
          
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
          >
            <Trash2 size={12} />
            Erase My Identity
          </button>
        </div>
      </div>

      {confirmDelete ? (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-rose-50/50 border border-rose-200 rounded-2xl p-5"
        >
          <div className="flex gap-3 items-start">
             <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={20} />
             <div>
                <h4 className="text-xs font-black text-rose-900 uppercase tracking-wide">Are you absolutely sure you want to hard delete your account?</h4>
                <p className="text-[10px] font-medium text-rose-650 max-w-3xl mt-1 leading-relaxed">
                  In compliance with the **Digital Personal Data Protection (DPDP) Act of 2023** and **GDPR Right to Erasure**, identifying records, uploaded resumes, skills assessment scorecards, certificates, mock interview session transcripts, and token credits will be irrevocably purged from the active server pool. This action is **permanent** and cannot be reversed.
                </p>
                <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                   <div className="relative flex-1">
                      <input 
                        type="text"
                        value={deleteInput}
                        onChange={(e) => setDeleteInput(e.target.value)}
                        placeholder="Type 'ERASE' to verify"
                        className="w-full px-3.5 py-2 border border-rose-350 rounded-xl text-xs bg-white text-rose-900 placeholder-rose-300 font-bold tracking-widest focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
                      />
                   </div>
                   <div className="flex gap-2 shrink-0">
                      <button
                        onClick={handleDeleteAccount}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest disabled:opacity-50 transition"
                        disabled={deleteInput !== "ERASE" || loading}
                      >
                         Yes, Delete Everything
                      </button>
                      <button 
                        onClick={() => { setConfirmDelete(false); setDeleteInput(""); }}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-650 hover:bg-slate-50 transition"
                      >
                         Cancel
                      </button>
                   </div>
                </div>
             </div>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           {/* Academic Data Sharing Toggle */}
           <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                 <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Academic & Credentials Share</span>
                    <button 
                      onClick={() => handleToggle('academic_sharing')}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${consents.academic_sharing ? 'bg-indigo-650' : 'bg-slate-300'}`}
                    >
                       <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${consents.academic_sharing ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                 </div>
                 <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-2">Consent Status: {consents.academic_sharing ? "Granted ✅" : "Revoked ❌"}</p>
                 <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                    Allows academic institutions to audit, match, and reward your curriculum compliance credentials and extracurricular profiles.
                 </p>
              </div>
           </div>

           {/* Employer Viewing Toggle */}
           <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                 <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Employer Talent Board Matching</span>
                    <button 
                      onClick={() => handleToggle('employer_matching')}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-250 ease-in-out focus:outline-none ${consents.employer_matching ? 'bg-indigo-650' : 'bg-slate-300'}`}
                    >
                       <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${consents.employer_matching ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                 </div>
                 <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-2">Consent Status: {consents.employer_matching ? "Granted ✅" : "Revoked ❌"}</p>
                 <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                    Authorizes verified companies and corporate talent acquisition pipelines to discover, screen, and inspect your employability indices.
                 </p>
              </div>
           </div>

           {/* AI Profiling Optimization Toggle */}
           <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                 <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">AI Matching & Career Tuning</span>
                    <button 
                      onClick={() => handleToggle('ai_optimization')}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${consents.ai_optimization ? 'bg-indigo-650' : 'bg-slate-300'}`}
                    >
                       <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${consents.ai_optimization ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                 </div>
                 <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-2">Consent Status: {consents.ai_optimization ? "Granted ✅" : "Revoked ❌"}</p>
                 <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                    Allows Gemini LLM to cluster-analyze your profile, provide personalized mentoring prompts, and configure adaptive test structures.
                 </p>
              </div>
           </div>
        </div>
      )}
      
      {consents.timestamp && (
        <div className="mt-4 flex items-center justify-end gap-1.5 text-[8px] font-bold tracking-widest uppercase text-slate-400">
           <Lock size={10} /> Last digital signature recorded: {new Date(consents.timestamp).toLocaleString()}
        </div>
      )}
    </div>
  );
}

export function StudentDashboard() {
  const { user, profile: initialProfile, updateProfile } = useAuth();
  const { t } = useLanguage();
  const [profile, setProfile] = useState(initialProfile);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [psychometric, setPsychometric] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (user?.id) {
        setRefreshing(true);
        await Promise.all([
          fetchJobs(),
          fetchProfile(),
          fetchAnalytics(),
          fetchApplications(),
          fetchInterviews(),
          fetchPsychometric()
        ]);
        setRefreshing(false);
      }
    };
    init();
  }, [user?.id]);

  useEffect(() => {
    const handleXPUpdate = () => {
      fetchAnalytics();
    };
    window.addEventListener("xp_updated", handleXPUpdate);
    return () => window.removeEventListener("xp_updated", handleXPUpdate);
  }, [user?.id]);

  const fetchPsychometric = async () => {
    try {
      const { data } = await api.get(`/psychometric/result/${user?.id}`);
      if (data.success) setPsychometric(data.data);
    } catch (e) { console.error(e); }
  };

  const fetchAnalytics = async () => {
    try {
      const { data } = await api.get(`/analytics/student/${user?.id}`);
      if (data.success) setAnalytics(data.data);
    } catch (e) { console.error(e); }
  };

  const fetchApplications = async () => {
    try {
      const { data } = await api.get(`/analytics/student/${user?.id}/applications`);
      if (data.success) setApplications(data.data);
    } catch (e) { console.error(e); }
  };

  const fetchInterviews = async () => {
    try {
      const res = await api.get('/interviews/student');
      if (res.data.success) setInterviews(res.data.data || []);
    } catch (e) { console.error("Error loading student interviews in dashboard:", e); }
  };

  const handleCheckIn = async () => {
    try {
      const { data } = await api.post("/analytics/check-in", { userId: user?.id });
      if (data.success) {
        toast.success(data.message || "Daily check-in successful!");
        fetchAnalytics();
        window.dispatchEvent(new CustomEvent('xp_updated'));
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.message || "Check-in failed. Please try again.");
    }
  };

  const fetchProfile = async () => {
    try {
      const { data } = await api.get(`/students/profile/${user?.id}`);
      if (data.success && data.data) {
        setProfile(data.data);
        updateProfile(data.data);
      }
    } catch (e) {
      console.error("Error fetching profile:", e);
    }
  };

  const fetchJobs = async () => {
    try {
      const { data } = await api.get("/jobs");
      setJobs(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  if (refreshing && !profile) {
     return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="w-full font-sans text-slate-800">
      <div className="max-w-[1400px] mx-auto py-2">
        
        {/* Bento Grid Container */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 lg:gap-6 auto-rows-min">
          
          <WelcomeBanner profile={profile} applications={applications} />

          <ActiveInterviewsBanner interviews={interviews} />

          {/* Row 1: Profile (3), AI Mentor (5), Talent Score (4) */}
          <div className="col-span-1 md:col-span-4 lg:col-span-3">
             <ProfileCompactCard profile={profile} />
          </div>
          <div className="col-span-1 md:col-span-8 lg:col-span-5">
             <AIMentorWidget profile={profile} analytics={analytics} applications={applications} />
          </div>
          <div className="col-span-1 md:col-span-12 lg:col-span-4">
             <TalentScoreWidget talent={analytics?.talentScore || {}} psychometric={psychometric} />
          </div>

          {/* Row 2: Applications (Full-width) */}
          <div className="col-span-1 md:col-span-12 lg:col-span-12 lg:h-[350px]">
             <ApplicationTracker applications={applications} />
          </div>

          {/* Job Apply Frequency Heatmap */}
          <div className="col-span-1 md:col-span-12">
            <JobApplyFrequencyCard applications={applications} />
          </div>

          {/* Spacer */}
          <div className="col-span-1 md:col-span-12 mt-4 mb-2">
             <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h2 className="text-lg md:text-xl font-black uppercase tracking-tighter text-slate-800 flex items-center gap-3">
                   <Target className="text-indigo-600" size={20} /> {t('recommended_drops')}
                </h2>
                <Link to="/jobs" className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors hidden sm:block">
                   {t('view_all_jobs')}
                </Link>
             </div>
          </div>

          {/* Row 3: Jobs Layout */}
          {jobs.length > 0 ? jobs.slice(0, 3).map((job: any, index: number) => (
             <div key={job.id} className={`col-span-1 md:col-span-6 lg:col-span-4`}>
                <JobCard 
                  job={job} 
                  completeness={profile?.completeness_score || 0}
                  studentProfileId={profile?.id}
                  applications={applications}
                  onApplySuccess={() => {
                    fetchApplications();
                    fetchAnalytics();
                  }}
                />
             </div>
          )) : (
             <div className="col-span-1 md:col-span-12 py-12 bg-white border border-slate-100 rounded-3xl text-center">
                <Briefcase size={32} className="mx-auto text-slate-200 mb-2" />
                <p className="text-slate-400 font-medium uppercase text-[10px] font-black tracking-widest">{t('no_jobs')}</p>
             </div>
          )}

          <div className="col-span-1 md:col-span-12 mt-4">
            <ReferBanner user={user} />
          </div>

          <div className="col-span-1 md:col-span-12 mt-4">
            <PrivacyComplianceWidget user={user} />
          </div>

        </div>
      </div>
    </div>
  );
}
