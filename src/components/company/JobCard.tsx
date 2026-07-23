import React from 'react';
import { MapPin, Users, Calendar, ChevronRight, Briefcase, Edit3, Octagon } from "lucide-react";
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

  const formattedDeadline = isValidDeadline 
    ? new Date(job.deadline).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: 'numeric' })
    : 'N/A';

  return (
    <div className="@container bg-white rounded-[24px] border border-slate-100 p-6 flex flex-col @[440px]:flex-row justify-between items-stretch group hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all w-full gap-6 h-full">
      {/* Left Column: Job Info & Vertical Details */}
      <div className="flex-1 min-w-0 flex flex-col justify-between @[440px]:pr-6 @[440px]:border-r @[440px]:border-slate-100/80 pb-4 @[440px]:pb-0 border-b @[440px]:border-b-0 border-slate-100">
        <div>
          {/* Header Title & Active Badge */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight truncate max-w-[260px]" title={job.title}>
              {job.title}
            </h3>
            {isClosed ? (
              <span className="px-3 py-1 bg-rose-50 text-rose-600 text-[10px] font-black uppercase rounded-full border border-rose-100 tracking-wider shrink-0">
                Ended
              </span>
            ) : (
              <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase rounded-full border border-emerald-100 tracking-wider shrink-0">
                Active
              </span>
            )}
          </div>

          {/* Vertical Job Details List */}
          <div className="space-y-2.5 text-xs font-semibold text-slate-700">
            {/* Location */}
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100/70">
              <div className="w-7 h-7 bg-slate-50 text-slate-500 rounded-lg flex items-center justify-center shrink-0 border border-slate-100">
                <MapPin size={14} className="text-blue-600" />
              </div>
              <span className="truncate">{job.location || 'Remote'}</span>
            </div>

            {/* Applicants */}
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100/70">
              <div className="w-7 h-7 bg-slate-50 text-slate-500 rounded-lg flex items-center justify-center shrink-0 border border-slate-100">
                <Users size={14} className="text-blue-600" />
              </div>
              <span className="truncate">{applicantCount} Applicants</span>
            </div>

            {/* Openings */}
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100/70">
              <div className="w-7 h-7 bg-slate-50 text-slate-500 rounded-lg flex items-center justify-center shrink-0 border border-slate-100">
                <Briefcase size={14} className="text-blue-600" />
              </div>
              <span className="truncate">{job.openings || 1} Openings</span>
            </div>

            {/* Deadline / Ended */}
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100/70">
              <div className="w-7 h-7 bg-slate-50 text-slate-500 rounded-lg flex items-center justify-center shrink-0 border border-slate-100">
                <Calendar size={14} className={isClosed ? "text-rose-500" : "text-blue-600"} />
              </div>
              <span className={`truncate ${isClosed ? "text-rose-600 font-bold" : ""}`}>
                {isClosed && job.ended_at 
                  ? `Ended: ${new Date(job.ended_at).toLocaleDateString()}`
                  : `Exp: ${formattedDeadline}`}
              </span>
            </div>
          </div>
        </div>

        {/* View Details Link */}
        {onViewDetails && (
          <div className="mt-4 pt-1">
            <button 
              type="button"
              onClick={() => onViewDetails(job)}
              className="inline-flex items-center gap-1.5 text-xs font-black text-blue-600 hover:text-blue-700 transition-colors cursor-pointer group/link hover:underline"
              id={`view-details-btn-${job.id}`}
            >
              <span>View job details</span>
              <ChevronRight size={15} className="text-blue-600 group-hover/link:translate-x-1 transition-transform" />
            </button>
          </div>
        )}
      </div>

      {/* Right Column: Evenly Aligned Action Stack */}
      <div className="flex flex-col gap-2.5 w-full @[440px]:w-[170px] shrink-0 justify-center">
        {/* Track Pipeline */}
        <Link 
          to={`/company/pipeline?jobId=${job.id}`}
          className="w-full h-11 bg-slate-950 text-white hover:bg-blue-600 rounded-2xl font-black uppercase tracking-wider text-[10px] transition-all flex items-center justify-center gap-2 shadow-sm shrink-0"
        >
          <span>{isClosed ? "View History" : "Track Pipeline"}</span>
          <ChevronRight size={14} strokeWidth={3} />
        </Link>

        {/* Edit Job Details */}
        {!isClosed && onEditJob && (
          <button 
            type="button"
            onClick={() => onEditJob(job)}
            className="w-full h-11 bg-white hover:bg-blue-50/60 text-blue-600 border border-blue-200/80 rounded-2xl font-black uppercase tracking-wider text-[10px] transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-sm"
          >
            <Edit3 size={14} />
            <span>Edit Job Details</span>
          </button>
        )}

        {/* Assign HRs */}
        {!isClosed && onAssignHR && (
          <button 
            type="button"
            onClick={() => onAssignHR(job)}
            className="w-full h-11 bg-indigo-50/80 hover:bg-indigo-100/80 text-indigo-700 border border-indigo-100 rounded-2xl font-black uppercase tracking-wider text-[10px] transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-sm"
          >
            <Users size={14} />
            <span>Assign HRs</span>
          </button>
        )}

        {/* End Posting */}
        {!isClosed && onEndJob && (
          <button 
            type="button"
            onClick={() => onEndJob(job.id)}
            className="w-full h-11 bg-rose-50/80 hover:bg-rose-100/80 text-rose-600 border border-rose-100 rounded-2xl font-black uppercase tracking-wider text-[10px] transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-sm"
          >
            <Octagon size={14} />
            <span>End Posting</span>
          </button>
        )}
      </div>
    </div>
  );
}

