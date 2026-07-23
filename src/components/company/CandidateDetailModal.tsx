import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { 
  XCircle, Star, FileText, Sparkles, 
  GraduationCap, Briefcase, Mail, Clock,
  Globe, Github, Linkedin, ExternalLink,
  Info, ShieldAlert, ListChecks, History, Video,
  MessageSquare
} from "lucide-react";
import api from "../../services/api.ts";
import { HiringTimeline } from "../HiringTimeline.tsx";
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, 
  ResponsiveContainer
} from 'recharts';

interface CandidateDetailModalProps {
  candidate: any;
  onClose: () => void;
}

export function CandidateDetailModal({ candidate, onClose }: CandidateDetailModalProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [fullDetails, setFullDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const studentId = candidate.student_id || candidate.id;

  useEffect(() => {
    if (studentId) {
      fetchFullDetails();
    }
  }, [studentId]);

  const fetchFullDetails = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/jobs/student-full-details/${studentId}`);
      if (data.success) {
        setFullDetails(data.data);
      }
    } catch (e) {
      console.error("Failed to load candidate profile details", e);
    } finally {
      setLoading(false);
    }
  };

  const breakdown = typeof candidate.breakdown_json === 'string' ? JSON.parse(candidate.breakdown_json) : (candidate.breakdown_json || {});
  
  const radarData = React.useMemo(() => {
     try {
        const traits = typeof candidate.psychometric_traits === 'string' ? JSON.parse(candidate.psychometric_traits) : (candidate.psychometric_traits || {});
        return Object.entries(traits).map(([trait, value]) => ({
           trait: trait.replace(/_/g, ' '),
           value: value as number,
           fullMark: 100
        }));
     } catch (e) { return []; }
  }, [candidate]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'performance', label: 'Performance', icon: ListChecks },
    { id: 'mock-interviews', label: 'Mocks', icon: MessageSquare },
    { id: 'profile', label: 'Full Profile', icon: GraduationCap },
    { id: 'psychometric', label: 'Psychometric', icon: ShieldAlert }
  ];

  if (candidate.application_id) {
    tabs.push({ id: 'history', label: 'Hiring History', icon: History });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-6xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col h-[90vh]"
      >
        {/* Modal Header */}
        <div className="bg-slate-50/50 border-b border-slate-100 p-8 shrink-0">
           <div className="flex justify-between items-start">
              <div className="flex items-center gap-6">
                 <div className="w-20 h-20 rounded-3xl bg-white border border-slate-200 p-1 shadow-xl relative overflow-hidden group">
                    {candidate.profile_photo_url ? (
                      <img src={candidate.profile_photo_url} className="w-full h-full object-cover rounded-2xl group-hover:scale-110 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl font-black text-blue-600 bg-blue-50 rounded-2xl">
                         {candidate.full_name?.[0]}
                      </div>
                    )}
                 </div>
                 <div>
                    <div className="flex items-center gap-3 mb-1">
                       <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">{candidate.full_name}</h2>
                       {candidate.status && (
                         <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                           candidate.status === 'REJECTED' ? 'bg-red-50 text-red-600 border-red-100' :
                           candidate.status === 'SELECTED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                           'bg-blue-50 text-blue-600 border-blue-100'
                         }`}>
                            {candidate.status}
                         </span>
                       )}
                    </div>
                    <div className="flex items-center gap-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                       <span className="flex items-center gap-2"><Mail size={14} className="text-slate-300" /> {candidate.email}</span>
                       {candidate.applied_at && <span className="flex items-center gap-2"><Clock size={14} className="text-slate-300" /> Applied {new Date(candidate.applied_at).toLocaleDateString()}</span>}
                       <span className="flex items-center gap-2 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">{candidate.job_title || 'Candidate'}</span>
                    </div>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                 <div className="text-right mr-6 pr-6 border-r border-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Talent Score</p>
                    <div className="flex items-baseline gap-1">
                       <span className={`text-4xl font-black ${candidate.talent_score >= 80 ? 'text-emerald-600' : 'text-blue-600'}`}>{Math.round(candidate.talent_score || 0)}</span>
                       <span className="text-xs font-black text-slate-300">/100</span>
                    </div>
                 </div>
                 <button onClick={onClose} className="p-3 bg-white border border-slate-100 text-slate-400 hover:text-slate-600 rounded-2xl shadow-sm transition-all hover:scale-110 active:scale-95">
                    <XCircle size={24} />
                 </button>
              </div>
           </div>

           {/* Tabs */}
           <div className="flex items-center gap-2 mt-10 overflow-x-auto scrollbar-hide pb-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                    activeTab === tab.id 
                    ? 'bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-900/20' 
                    : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
           </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-10 bg-white">
           {loading ? (
             <div className="h-full flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Assembling full candidate intelligence...</p>
             </div>
           ) : (
             <AnimatePresence mode="wait">
               <motion.div
                 key={activeTab}
                 initial={{ opacity: 0, x: 10 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: -10 }}
                 transition={{ duration: 0.2 }}
                 className="h-full"
               >
                 {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                       <div className="lg:col-span-2 space-y-10">
                          <section>
                             <div className="flex items-center gap-3 mb-6">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Profile Insight</h3>
                             </div>
                             <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100">
                                <p className="text-sm text-slate-600 leading-relaxed font-medium italic">
                                   "{fullDetails?.profile?.bio || 'Candidate has not provided a bio summary.'}"
                                </p>
                             </div>
                          </section>

                          <div className="grid grid-cols-2 gap-6">
                             <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-xl hover:border-blue-100 transition-all">
                                <div className="flex items-center justify-between mb-4">
                                   <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><Star size={20}/></div>
                                   <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">Top 5%</span>
                                </div>
                                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Skill Proficiency</h4>
                                <p className="text-2xl font-black text-slate-900">Expert</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Based on test & mock data</p>
                             </div>
                             <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-xl hover:border-purple-100 transition-all">
                                <div className="flex items-center justify-between mb-4">
                                   <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center"><Briefcase size={20}/></div>
                                   <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded-lg">Ready</span>
                                </div>
                                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Employment Status</h4>
                                <p className="text-2xl font-black text-slate-900">{fullDetails?.profile?.experience_type || 'FRESHER'}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Immediate Joiner</p>
                             </div>
                          </div>

                          <section>
                             <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                   <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                   <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Key Competencies</h3>
                                </div>
                                <button className="text-[9px] font-black text-blue-600 uppercase tracking-widest">View Skill Cloud</button>
                             </div>
                             <div className="flex flex-wrap gap-2">
                                {(() => {
                                   let skills = [];
                                   try {
                                      const skillsData = fullDetails?.profile?.skills_json;
                                      if (Array.isArray(skillsData)) {
                                         skills = skillsData;
                                      } else if (typeof skillsData === 'string') {
                                         if (skillsData.startsWith('[') && skillsData.endsWith(']')) {
                                            skills = JSON.parse(skillsData);
                                         } else {
                                            skills = skillsData.split(',').filter(Boolean);
                                         }
                                      }
                                   } catch (e) {
                                      console.error("Error parsing skills:", e);
                                   }
                                   
                                   return skills.length > 0 ? skills.map((skill: any, idx: number) => {
                                      const skillName = typeof skill === 'string' ? skill : (skill.name || "");
                                      if (!skillName) return null;
                                      return (
                                         <span key={idx} className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-100 hover:border-blue-200 transition-colors">
                                            {skillName.trim()}
                                         </span>
                                      );
                                   }) : <p className="text-[10px] font-bold text-slate-400 italic">No specific skills listed</p>;
                                })()}
                             </div>
                          </section>
                       </div>

                       <div className="space-y-8">
                           <div className="bg-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden group">
                             <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
                             <div className="relative z-10">
                                <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-6">Employability Metrics</h4>
                                <div className="space-y-5">
                                   {[
                                     { label: 'Profile', val: breakdown.weights?.profile || 0, max: 10, color: 'bg-blue-500' },
                                     { label: 'Mock Interview', val: breakdown.weights?.interview || 0, max: 20, color: 'bg-indigo-500' },
                                     { label: 'Quiz/Test', val: breakdown.weights?.quiz || 0, max: 20, color: 'bg-violet-500' },
                                     { label: 'Coding Skills', val: breakdown.weights?.coding || 0, max: 20, color: 'bg-emerald-500' },
                                     { label: 'Psychometric', val: breakdown.weights?.psychometric || 0, max: 10, color: 'bg-amber-500' },
                                     { label: 'Leadership', val: breakdown.weights?.leadership || 0, max: 10, color: 'bg-rose-500' },
                                     { label: 'Consistency', val: breakdown.weights?.activity || 0, max: 10, color: 'bg-cyan-500' },
                                   ].map((item, idx) => (
                                     <div key={idx} className="flex items-center justify-between">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{item.label}</span>
                                        <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                           <div className={`h-full ${item.color}`} style={{ width: `${(item.val / (item.max || 1)) * 100}%` }}></div>
                                        </div>
                                     </div>
                                   ))}
                                </div>
                                <div className="mt-8 pt-8 border-t border-white/5">
                                   <p className="text-[10px] font-medium text-slate-400 italic leading-relaxed">
                                      "Overall Talent Score: {Math.round(candidate.talent_score || 0)}. Analyzed across 7 critical parameters."
                                   </p>
                                </div>
                             </div>
                          </div>

                          <div className="p-8 bg-white border border-slate-100 rounded-[32px] shadow-sm">
                             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Contact Channels</h4>
                             <div className="space-y-4">
                                <a href={`mailto:${candidate.email}`} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl hover:bg-blue-50 transition-colors group">
                                   <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors shadow-sm"><Globe size={18}/></div>
                                   <div>
                                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Official Email</p>
                                      <p className="text-xs font-black text-slate-900 lowercase">{candidate.email}</p>
                                   </div>
                                </a>
                                {fullDetails?.profile?.social_links_json && (
                                   <div className="flex gap-2">
                                      <button className="flex-1 flex items-center justify-center gap-2 py-4 bg-slate-50 text-slate-600 rounded-2xl hover:bg-slate-100 transition-all"><Linkedin size={16}/></button>
                                      <button className="flex-1 flex items-center justify-center gap-2 py-4 bg-slate-50 text-slate-600 rounded-2xl hover:bg-slate-100 transition-all"><Github size={16}/></button>
                                   </div>
                                )}
                             </div>
                          </div>
                       </div>
                    </div>
                 )}

                 {activeTab === 'performance' && (
                    <div className="space-y-10">
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="p-8 bg-blue-600 rounded-[32px] text-white">
                             <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-2">Latest Test Score</p>
                             <div className="flex items-baseline gap-2">
                                <h4 className="text-4xl font-black">{candidate.latest_test_score || 0}%</h4>
                                <span className="text-[10px] font-black text-blue-200 uppercase">Final Grade</span>
                             </div>
                          </div>
                          <div className="p-8 bg-white border border-slate-100 rounded-[32px] shadow-sm">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Integrity Status</p>
                             <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${candidate.latest_test_violations > 0 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                                <h4 className="text-xl font-black text-slate-900 uppercase">{candidate.latest_test_violations > 0 ? 'Flagged' : 'Clean'}</h4>
                             </div>
                             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{candidate.latest_test_violations || 0} Total Violations</p>
                          </div>
                          <div className="p-8 bg-white border border-slate-100 rounded-[32px] shadow-sm">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Test Format</p>
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center"><ShieldAlert size={20}/></div>
                                <h4 className="text-xl font-black text-slate-900 uppercase">Technical</h4>
                             </div>
                             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Adaptive Logic Enabled</p>
                          </div>
                       </div>
                    </div>
                 )}

                 {activeTab === 'mock-interviews' && (
                    <div className="space-y-10">
                       <div className="flex justify-between items-end">
                          <div>
                             <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Mock Interview History</h3>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Previous AI-led technical assessments and feedback</p>
                          </div>
                          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                             <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1">Average Mock Score</p>
                             <p className="text-xl font-black text-emerald-700">{(fullDetails?.mockInterviews?.reduce((acc: number, m: any) => acc + m.score, 0) / (fullDetails?.mockInterviews?.length || 1)).toFixed(1)}/10</p>
                          </div>
                       </div>

                       <div className="grid grid-cols-1 gap-6">
                          {fullDetails?.mockInterviews?.length > 0 ? (
                            fullDetails.mockInterviews.map((mock: any, i: number) => (
                               <div key={i} className="p-8 bg-slate-50 rounded-[32px] border border-slate-100 hover:shadow-xl transition-all group">
                                  <div className="flex justify-between items-start mb-8">
                                     <div className="flex items-center gap-6">
                                        <div className="w-14 h-14 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition-transform">
                                           <Video size={24} />
                                        </div>
                                        <div>
                                           <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">Technical Session #{fullDetails.mockInterviews.length - i}</h4>
                                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{new Date(mock.created_at).toLocaleDateString()} • {new Date(mock.created_at).toLocaleTimeString()}</p>
                                        </div>
                                     </div>
                                     <div className="text-right">
                                        <div className="text-3xl font-black text-blue-600">{mock.score}<span className="text-xs text-slate-300">/10</span></div>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Overall Performance</p>
                                     </div>
                                  </div>

                                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                                     {[
                                        { label: 'Comm.', val: mock.communication_score, color: 'blue' },
                                        { label: 'Conf.', val: mock.confidence_score, color: 'purple' },
                                        { label: 'Expl.', val: mock.explanation_score, color: 'emerald' },
                                        { label: 'Pres.', val: mock.presentation_score, color: 'orange' },
                                        { label: 'Know.', val: mock.knowledge_score, color: 'indigo' }
                                     ].map((mstat, j) => (
                                        <div key={j} className="bg-white p-3 rounded-2xl border border-slate-100 text-center">
                                           <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{mstat.label}</p>
                                           <p className={`text-sm font-black text-${mstat.color}-600`}>{mstat.val}/10</p>
                                        </div>
                                     ))}
                                  </div>
                               </div>
                            ))
                          ) : (
                             <div className="py-20 text-center bg-slate-50 rounded-[40px] border border-slate-100 border-dashed">
                                <Video size={48} className="mx-auto text-slate-200 mb-6" />
                                <h4 className="text-xl font-black text-slate-400 uppercase tracking-tight">No mock interview history</h4>
                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-2">Candidate hasn't completed any AI mock sessions yet.</p>
                             </div>
                          )}
                       </div>
                    </div>
                 )}

                 {activeTab === 'profile' && (
                    <div className="space-y-12">
                       {/* Education */}
                       <section>
                          <div className="flex items-center gap-3 mb-8">
                             <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-sm"><GraduationCap size={20}/></div>
                             <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Academic Background</h3>
                          </div>
                          <div className="space-y-4">
                             {fullDetails?.education?.length > 0 ? (
                               fullDetails.education.map((edu: any, i: number) => (
                                  <div key={i} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex justify-between items-start">
                                     <div>
                                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{edu.institution}</h4>
                                        <p className="text-[11px] font-bold text-slate-600 mt-1 uppercase tracking-widest">{edu.degree} in {edu.field_of_study}</p>
                                        <p className="text-[10px] font-medium text-slate-400 mt-2">{new Date(edu.start_date).getFullYear()} — {edu.end_date ? new Date(edu.end_date).getFullYear() : 'Present'}</p>
                                     </div>
                                     <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 text-center">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Grade/GPA</p>
                                        <p className="text-xs font-black text-blue-600">{edu.grade || 'N/A'}</p>
                                     </div>
                                  </div>
                               ))
                             ) : (
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-1">No education records found.</p>
                             )}
                          </div>
                       </section>

                       {/* Experience */}
                       <section>
                          <div className="flex items-center gap-3 mb-8">
                             <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shadow-sm"><Briefcase size={20}/></div>
                             <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Professional Experience</h3>
                          </div>
                          <div className="space-y-4">
                             {fullDetails?.experience?.length > 0 ? (
                               fullDetails.experience.map((exp: any, i: number) => (
                                  <div key={i} className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                     <div className="flex justify-between items-start mb-4">
                                        <div>
                                           <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{exp.role}</h4>
                                           <p className="text-[11px] font-bold text-blue-600 mt-1 uppercase tracking-widest">{exp.company}</p>
                                        </div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{new Date(exp.start_date).toLocaleDateString()} — {exp.end_date ? new Date(exp.end_date).toLocaleDateString() : 'Present'}</p>
                                     </div>
                                     <p className="text-xs text-slate-600 leading-relaxed font-medium">{exp.description}</p>
                                  </div>
                               ))
                             ) : (
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-1">No professional experience records.</p>
                             )}
                          </div>
                       </section>

                       {/* Projects */}
                       <section>
                          <div className="flex items-center gap-3 mb-8">
                             <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shadow-sm"><FileText size={20}/></div>
                             <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Technical Projects</h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             {fullDetails?.projects?.length > 0 ? (
                               fullDetails.projects.map((proj: any, i: number) => (
                                  <div key={i} className="p-8 bg-white border border-slate-100 rounded-[32px] shadow-sm hover:shadow-xl hover:border-emerald-100 transition-all group">
                                     <div className="flex justify-between items-start mb-4">
                                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight group-hover:text-emerald-600 transition-colors">{proj.title}</h4>
                                        {proj.link && <a href={proj.link} target="_blank" className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:text-blue-600 transition-colors"><ExternalLink size={14}/></a>}
                                     </div>
                                     <p className="text-xs text-slate-600 leading-relaxed font-medium mb-6 line-clamp-3">{proj.description}</p>
                                     <div className="flex flex-wrap gap-1.5">
                                        {proj.tech_stack?.split(',').map((tech: string, k: number) => (
                                           <span key={k} className="px-2 py-0.5 bg-slate-50 text-slate-400 rounded-md text-[8px] font-black uppercase tracking-widest border border-slate-100">
                                              {tech.trim()}
                                           </span>
                                        ))}
                                     </div>
                                  </div>
                               ))
                             ) : (
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-1">No technical projects showcased.</p>
                             )}
                          </div>
                       </section>

                       {/* Extracurriculars */}
                       <section>
                          <div className="flex items-center gap-3 mb-8">
                             <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shadow-sm"><Star size={20}/></div>
                             <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Extracurricular & Leadership</h3>
                          </div>
                          <div className="space-y-4">
                             {fullDetails?.extracurriculars?.length > 0 ? (
                               fullDetails.extracurriculars.map((activity: any, i: number) => (
                                  <div key={i} className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                     <div className="flex justify-between items-start mb-2">
                                        <div>
                                           <div className="flex items-center gap-2 mb-1">
                                             <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{activity.title}</h4>
                                             {activity.category && <span className="text-[8px] font-black uppercase tracking-widest bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded-full">{activity.category}</span>}
                                           </div>
                                           <p className="text-[11px] font-bold text-rose-600 uppercase tracking-widest">{activity.organization_name} {activity.achievement_rank ? `• ${activity.achievement_rank}` : ''}</p>
                                        </div>
                                        {activity.activity_date && <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{new Date(activity.activity_date).toLocaleDateString()}</p>}
                                     </div>
                                     <p className="text-xs text-slate-600 leading-relaxed font-medium">{activity.description}</p>
                                  </div>
                               ))
                             ) : (
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-1">No extracurricular records.</p>
                             )}
                          </div>
                       </section>
                    </div>
                 )}

                 {activeTab === 'psychometric' && (
                    <div className="space-y-10">
                       <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                          <div className="bg-slate-50 p-10 rounded-[40px] border border-slate-100 min-h-[500px] flex flex-col">
                             <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-10">Trait Analysis</h3>
                             <div className="flex-1 w-full min-h-[320px]">
                                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                   <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                      <PolarGrid stroke="#cbd5e1" />
                                      <PolarAngleAxis dataKey="trait" tick={{ fill: '#64748b', fontSize: 8, fontWeight: 900 }} />
                                      <Radar name="Candidate" dataKey="value" stroke="#2563eb" strokeWidth={3} fill="#2563eb" fillOpacity={0.2} />
                                   </RadarChart>
                                </ResponsiveContainer>
                             </div>
                          </div>

                          <div className="space-y-6">
                             <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Detailed Traits</h3>
                             <div className="grid grid-cols-1 gap-4">
                                {radarData.map((trait: any, i: number) => (
                                   <div key={i} className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                      <div className="flex justify-between items-center mb-3">
                                         <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{trait.trait}</h4>
                                         <span className="text-xs font-black text-blue-600">{trait.value}%</span>
                                      </div>
                                      <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden">
                                         <motion.div 
                                           initial={{ width: 0 }}
                                           animate={{ width: `${trait.value}%` }}
                                           className={`h-full ${trait.value >= 70 ? 'bg-emerald-500' : trait.value >= 40 ? 'bg-blue-500' : 'bg-orange-500'}`}
                                         />
                                      </div>
                                   </div>
                                ))}
                             </div>
                          </div>
                       </div>
                    </div>
                 )}

                 {activeTab === 'history' && candidate.application_id && (
                    <div className="space-y-10">
                       <div>
                          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Application Journey</h3>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Timeline of all actions and stage transitions</p>
                       </div>
                       <div className="bg-slate-50 p-10 rounded-[40px] border border-slate-100">
                          <HiringTimeline applicationId={candidate.application_id} />
                       </div>
                    </div>
                 )}
               </motion.div>
             </AnimatePresence>
           )}
        </div>

        {/* Modal Footer */}
        <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
           <div className="flex gap-4">
              {candidate.resume_url && (
                <a 
                  href={candidate.resume_url} 
                  target="_blank" 
                  className="flex items-center gap-2 px-6 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm"
                >
                  <FileText size={18} /> View Original Resume
                </a>
              )}
           </div>
           
           <button onClick={onClose} className="px-10 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-sm">
              Close Details
           </button>
        </div>
      </motion.div>
    </div>
  );
}
