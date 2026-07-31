import React from 'react';
import { ShieldAlert, Award, Mail, History } from 'lucide-react';

interface CandidateTableProps {
  applicants: any[];
  onViewCandidate: (candidate: any) => void;
  onOpenHistory: (candidate: any) => void;
}

export function CandidateTable({ applicants, onViewCandidate, onOpenHistory }: CandidateTableProps) {
  
  const getExactPipelinePhase = (app: any) => {
    const status = app.status || 'APPLIED';
    const stageName = app.current_stage_name;
    const stageType = app.current_stage_type;

    if (status === 'REJECTED') {
      if (stageName) return `Rejected at ${stageName}`;
      if (stageType) {
        const typeClean = stageType === 'TECHNICAL' ? 'Technical Interview' :
                          stageType === 'HR' ? 'HR Interview' :
                          stageType === 'ASSESSMENT' ? 'Assessment' : stageType;
        return `Rejected at ${typeClean}`;
      }
      return 'Rejected';
    }

    if (status === 'SELECTED') {
      return 'Selected';
    }

    if (stageName) {
      return stageName;
    }

    if (status === 'INTERVIEW') return 'Interview';
    if (status === 'TESTING' || status === 'ASSESSMENT') return 'Assessment';
    
    // Capitalize first letter of status
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  return (
    <div className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-max">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Candidate Profile</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Target Role</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Skills Matrix</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Talent Rating</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Trust Integrity</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Hiring History</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Stage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {applicants.map((app, i) => {
              const violationCount = Number(app.latest_test_violations_count ?? app.latest_test_violations ?? 0);
              const talentScore = Math.round(app.talent_score || 0);
              
              const getScoreBand = () => {
                if (talentScore >= 85) return { text: 'Expert Match', pill: 'bg-emerald-50 text-emerald-700 border-emerald-100 font-extrabold' };
                if (talentScore >= 70) return { text: 'Strong Fit', pill: 'bg-indigo-50 text-indigo-700 border-indigo-100' };
                if (talentScore >= 50) return { text: 'Core Potential', pill: 'bg-blue-50 text-blue-700 border-blue-100' };
                return { text: 'Developing', pill: 'bg-slate-50 text-slate-500 border-slate-100' };
              };
              const band = getScoreBand();
              const exactPhase = getExactPipelinePhase(app);

              return (
                <tr 
                  key={i} 
                  className="hover:bg-slate-50/40 transition-colors group cursor-pointer" 
                  onClick={() => onViewCandidate(app)}
                >
                  {/* Candidate Profile */}
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-lg overflow-hidden border-2 shadow-sm group-hover:scale-110 transition-transform ${
                        violationCount > 0 ? 'border-red-200' : 'border-slate-50'
                      }`}>
                        {app.profile_photo_url ? (
                          <img src={app.profile_photo_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          app.full_name?.[0]?.toUpperCase() || 'C'
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-black text-slate-800 uppercase tracking-tight group-hover:text-blue-600 transition-colors">{app.full_name}</p>
                          {talentScore >= 85 && <Award size={14} className="text-amber-500 fill-amber-100" />}
                        </div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
                          <Mail size={10} className="text-slate-350" />
                          <span>{app.email}</span>
                        </p>
                      </div>
                    </div>
                  </td>
                  
                  {/* Target Role */}
                  <td className="px-8 py-5">
                    <p className="text-xs font-black text-slate-650 uppercase tracking-widest">{app.job_title || 'General Applicant'}</p>
                  </td>

                  {/* Skills Matrix */}
                  <td className="px-8 py-5">
                    <div className="flex flex-wrap gap-1 max-w-[240px]">
                      {(() => {
                        try {
                          const skills = typeof app.skills_json === 'string' ? JSON.parse(app.skills_json) : (app.skills_json || []);
                          if (skills.length === 0) return <span className="text-[9px] text-slate-400 font-medium italic">No listed skills</span>;
                          return skills.slice(0, 3).map((s: string, idx: number) => (
                            <span key={idx} className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-lg text-[9px] text-slate-500 font-bold uppercase">
                              {s}
                            </span>
                          ));
                        } catch (e) { 
                          return <span className="text-[9px] text-slate-400 font-medium italic">No listed skills</span>; 
                        }
                      })()}
                    </div>
                  </td>

                  {/* Talent Rating */}
                  <td className="px-8 py-5">
                    <div className="flex flex-col items-center">
                      <span className={`text-[11px] px-2 py-0.5 rounded-md border text-center ${band.pill}`}>
                        {band.text} ({talentScore}%)
                      </span>
                      <div className="w-16 h-1 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            talentScore >= 85 ? 'bg-emerald-500' : talentScore >= 70 ? 'bg-indigo-500' : 'bg-blue-500'
                          }`} 
                          style={{ width: `${Math.min(talentScore, 100)}%` }} 
                        />
                      </div>
                    </div>
                  </td>

                  {/* Trust Integrity */}
                  <td className="px-8 py-5 text-center">
                    {violationCount > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-full animate-pulse">
                        <ShieldAlert size={12} /> {violationCount} Violations
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                        Secure Verify
                      </span>
                    )}
                  </td>

                  {/* Hiring History Button */}
                  <td className="px-8 py-5 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onOpenHistory(app)}
                      className="px-4 py-2 bg-indigo-50 border border-indigo-100 text-indigo-650 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-100 hover:border-indigo-200 transition-all shadow-sm flex items-center gap-1.5 mx-auto cursor-pointer"
                      id={`btn-history-${app.student_id || app.id || i}`}
                      title="View complete application history for this candidate within this company"
                    >
                      <History size={12} strokeWidth={2.5} /> History
                    </button>
                  </td>

                  {/* Exact Pipeline Stage */}
                  <td className="px-8 py-5 text-right whitespace-nowrap min-w-[170px] align-middle">
                    <span className={`inline-flex items-center justify-end whitespace-nowrap px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                      app.status === 'SELECTED' ? 'bg-emerald-50 text-emerald-750 border-emerald-150 shadow-sm' :
                      app.status === 'REJECTED' ? 'bg-rose-50 text-rose-650 border-rose-100' :
                      app.status === 'INTERVIEW' ? 'bg-orange-50 text-orange-650 border-orange-100' :
                      app.status === 'TESTING' || app.status === 'ASSESSMENT' ? 'bg-purple-50 text-purple-650 border-purple-100' :
                      'bg-blue-50 text-blue-650 border-blue-100'
                    }`}
                    title={`Current precise status: ${exactPhase}`}
                    >
                      {exactPhase}
                    </span>
                  </td>
                </tr>
              );
            })}

            {applicants.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-20 text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-widest">No candidates found in filtered list</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}