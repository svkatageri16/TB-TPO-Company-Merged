import React from 'react';
import { MapPin, Users, Calendar, ChevronRight, Briefcase, Edit3 } from "lucide-react";
import { Link } from "react-router-dom";

interface JobCardProps {
  job: any;
  onEndJob?: (jobId: number) => void;
  onEditJob?: (job: any) => void;
  onViewDetails?: (job: any) => void;
  onAssignHR?: (job: any) => void;
}

export function JobCard({ job, onEndJob, onEditJob, onViewDetails, onAssignHR }: JobCardProps) {
  const isValidDeadline = job.deadline && 
    job.deadline !== 'null' && 
    job.deadline !== 'undefined' && 
    job.deadline.toString().trim() !== '' && 
    job.deadline !== '0000-00-00' && 
    !isNaN(new Date(job.deadline).getTime());
  const isExpired = isValidDeadline && new Date(job.deadline).setHours(23, 59, 59, 999) < new Date().getTime();
  const isClosed = job.status === 'CLOSED' || isExpired;
  const applicantCount = job.total_applicants !== undefined ? job.total_applicants : (job.applicant_count || 0);

  return (
    <div className="bg-white rounded-[20px] border border-slate-100 p-5 flex flex-col sm:flex-row justify-between items-stretch group hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/5 transition-all w-full gap-5 h-full">
      {/* Left Column: Job Info & View Details Link */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2.5">
            <h4 className="text-base font-black text-slate-800 uppercase tracking-tight truncate max-w-[280px]" title={job.title}>{job.title}</h4>
            {isClosed ? (
              <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[8px] font-black uppercase rounded-md border border-rose-100">Ended</span>
            ) : (
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase rounded-md border border-emerald-100">Active</span>
            )}
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span className="flex items-center gap-1.5 truncate"><MapPin size={12} className="text-slate-400 shrink-0" /> {job.location || 'Remote'}</span>
            <span className="flex items-center gap-1.5 truncate"><Users size={12} className="text-slate-400 shrink-0" /> {applicantCount} Applicants</span>
            <span className="flex items-center gap-1.5 truncate"><Briefcase size={12} className="text-slate-400 shrink-0" /> {job.openings || 1} Openings</span>
            {isClosed && job.ended_at ? (
              <span className="flex items-center gap-1.5 text-rose-500 truncate"><Calendar size={12} className="shrink-0" /> Ended: {new Date(job.ended_at).toLocaleDateString()}</span>
            ) : (
              <span className="flex items-center gap-1.5 text-slate-400 truncate"><Calendar size={12} className="shrink-0" /> Exp: {job.deadline ? new Date(job.deadline).toLocaleDateString() : 'N/A'}</span>
            )}
          </div>

          {/* View Details Link */}
          {onViewDetails && (
            <div className="mt-2.5">
              <button 
                type="button"
                onClick={() => onViewDetails(job)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 transition-colors hover:underline cursor-pointer group/link"
                id={`view-details-btn-${job.id}`}
              >
                <span>View job details</span>
                <ChevronRight size={13} className="text-blue-600 group-hover/link:translate-x-0.5 transition-transform" />
              </button>
            </div>
          )}
        </div>
        
        {job.skills && job.skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {job.skills.slice(0, 3).map((s: string) => (
              <span key={s} className="px-2 py-0.5 bg-slate-50 text-slate-500 text-[9px] font-bold rounded border border-slate-100 truncate max-w-[120px]">{s}</span>
            ))}
            {job.skills.length > 3 && (
              <span className="px-1.5 py-0.5 bg-slate-50 text-slate-400 text-[9px] font-bold rounded border border-slate-100">+{job.skills.length - 3}</span>
            )}
          </div>
        )}
      </div>
      
      {/* Right Column: Button Stack */}
      <div className="flex flex-col gap-2 w-full sm:w-[150px] shrink-0 justify-start">
        <Link 
          to={`/company/pipeline?jobId=${job.id}`}
          className="w-full py-2 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-blue-600 transition-all flex items-center justify-center gap-1 shadow-sm"
        >
          {isClosed ? "View History" : "Track Pipeline"} <ChevronRight size={12} strokeWidth={3} />
        </Link>

        {!isClosed && onEditJob && (
          <button 
            type="button"
            onClick={() => onEditJob(job)}
            className="w-full py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all font-black uppercase tracking-widest text-[9px] rounded-xl border border-blue-100 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Edit3 size={12} /> Edit Job Details
          </button>
        )}

        {!isClosed && onAssignHR && (
          <button 
            type="button"
            onClick={() => onAssignHR(job)}
            className="w-full py-2 bg-indigo-50 text-[#4c51bf] hover:bg-indigo-100 transition-all font-black uppercase tracking-widest text-[9px] rounded-xl border border-indigo-100 flex items-center justify-center gap-1 cursor-pointer"
          >
            Assign HRs
          </button>
        )}

        {!isClosed && onEndJob && (
          <button 
            type="button"
            onClick={() => onEndJob(job.id)}
            className="w-full py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all font-black uppercase tracking-widest text-[9px] rounded-xl border border-rose-100 flex items-center justify-center gap-1 cursor-pointer"
          >
            End Posting
          </button>
        )}
      </div>
    </div>
  );
}
