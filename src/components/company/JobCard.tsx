import React from 'react';
import { MapPin, Users, Calendar, ChevronRight, Briefcase, Eye, Edit3 } from "lucide-react";
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
    <div className="bg-white rounded-[20px] border border-slate-100 p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center group hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/5 transition-all w-full gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <h4 className="text-base font-black text-slate-800 uppercase tracking-tight truncate max-w-[220px]" title={job.title}>{job.title}</h4>
          {isClosed ? (
            <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[8px] font-black uppercase rounded-md border border-rose-100">Ended</span>
          ) : (
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase rounded-md border border-emerald-100">Active</span>
          )}
        </div>
        
        <div className="flex flex-col gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <span className="flex items-center gap-1"><MapPin size={12} className="text-slate-400" /> {job.location || 'Remote'}</span>
          <span className="flex items-center gap-1"><Users size={12} className="text-slate-400" /> {applicantCount} Applicants</span>
          <span className="flex items-center gap-1"><Briefcase size={12} className="text-slate-400" /> {job.openings || 1} Openings</span>
          {isClosed && job.ended_at ? (
            <span className="flex items-center gap-1 text-rose-500"><Calendar size={12} /> Ended: {new Date(job.ended_at).toLocaleDateString()}</span>
          ) : (
            <span className="flex items-center gap-1 text-slate-400"><Calendar size={12} /> Exp: {job.deadline ? new Date(job.deadline).toLocaleDateString() : 'N/A'}</span>
          )}
        </div>
        
        {job.skills && job.skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {job.skills.slice(0, 3).map((s: string) => (
              <span key={s} className="px-2 py-0.5 bg-slate-50 text-slate-500 text-[9px] font-bold rounded border border-slate-100">{s}</span>
            ))}
            {job.skills.length > 3 && (
              <span className="px-1.5 py-0.5 bg-slate-50 text-slate-400 text-[9px] font-bold rounded border border-slate-100">+{job.skills.length - 3}</span>
            )}
          </div>
        )}
      </div>
      
      <div className="flex flex-col gap-2 w-full sm:w-[150px] shrink-0">
        <Link 
          to={`/company/pipeline?jobId=${job.id}`}
          className="w-full py-2 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-blue-600 transition-all flex items-center justify-center gap-1 shadow-sm"
        >
          {isClosed ? "View History" : "Track Pipeline"} <ChevronRight size={12} strokeWidth={3} />
        </Link>
        
        {onViewDetails && (
          <button 
            type="button"
            onClick={() => onViewDetails(job)}
            className="w-full py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all font-black uppercase tracking-widest text-[9px] rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Eye size={12} /> View Details
          </button>
        )}

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
