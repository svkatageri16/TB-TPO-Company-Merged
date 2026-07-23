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
    <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 flex flex-col justify-between group hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/5 transition-all w-full h-full">
      {/* Top Section: Header, 2x2 Grid, and View Details Link */}
      <div className="flex flex-col gap-3">
        {/* Header: Title & Status Badge */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <h3 
            className="text-base font-black text-slate-900 uppercase tracking-tight truncate flex-1 min-w-0" 
            title={job.title}
          >
            {job.title}
          </h3>
          {isClosed ? (
            <span className="px-2.5 py-0.5 bg-rose-50 text-rose-600 text-[9px] font-black uppercase rounded-full border border-rose-100 tracking-wider shrink-0">
              Ended
            </span>
          ) : (
            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase rounded-full border border-emerald-100 tracking-wider shrink-0">
              Active
            </span>
          )}
        </div>

        {/* 2x2 Metadata Grid */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs font-semibold text-slate-700 bg-slate-50/80 p-3 rounded-xl border border-slate-100/80">
          {/* Location */}
          <div className="flex items-center gap-2 min-w-0">
            <MapPin size={14} className="text-blue-600 shrink-0" />
            <span className="truncate text-[11px] text-slate-700" title={job.location || 'Remote'}>
              {job.location || 'Remote'}
            </span>
          </div>

          {/* Applicants */}
          <div className="flex items-center gap-2 min-w-0">
            <Users size={14} className="text-blue-600 shrink-0" />
            <span className="truncate whitespace-nowrap text-[11px] text-slate-700">
              {applicantCount} Applicants
            </span>
          </div>

          {/* Openings */}
          <div className="flex items-center gap-2 min-w-0">
            <Briefcase size={14} className="text-blue-600 shrink-0" />
            <span className="truncate whitespace-nowrap text-[11px] text-slate-700">
              {job.openings || 1} Openings
            </span>
          </div>

          {/* Expiry Date */}
          <div className="flex items-center gap-2 min-w-0">
            <Calendar size={14} className={isClosed ? "text-rose-500 shrink-0" : "text-blue-600 shrink-0"} />
            <span className={`truncate whitespace-nowrap text-[11px] ${isClosed ? "text-rose-600 font-bold" : "text-slate-700"}`}>
              {isClosed && job.ended_at 
                ? `Ended: ${new Date(job.ended_at).toLocaleDateString()}`
                : `Exp: ${formattedDeadline}`}
            </span>
          </div>
        </div>

        {/* View Details Link */}
        {onViewDetails && (
          <div className="pt-0.5">
            <button 
              type="button"
              onClick={() => onViewDetails(job)}
              className="inline-flex items-center gap-1 text-[11px] font-black text-blue-600 hover:text-blue-700 transition-colors cursor-pointer group/link hover:underline"
              id={`view-details-btn-${job.id}`}
            >
              <span>View job details</span>
              <ChevronRight size={13} className="text-blue-600 group-hover/link:translate-x-0.5 transition-transform" />
            </button>
          </div>
        )}
      </div>

      {/* Bottom Action Stack */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
        {/* Track Pipeline Full-Width Primary Button */}
        <Link 
          to={`/company/pipeline?jobId=${job.id}`}
          className="w-full h-9 bg-slate-900 text-white hover:bg-blue-600 rounded-xl font-black uppercase tracking-wider text-[10px] transition-all flex items-center justify-center gap-1.5 shadow-sm"
        >
          <span>{isClosed ? "View History" : "Track Pipeline"}</span>
          <ChevronRight size={13} strokeWidth={3} />
        </Link>

        {/* Secondary Compact Actions Row */}
        {!isClosed && (onEditJob || onAssignHR || onEndJob) && (
          <div className="flex items-center gap-1.5">
            {onEditJob && (
              <button 
                type="button"
                onClick={() => onEditJob(job)}
                className="flex-1 h-8 bg-blue-50/80 hover:bg-blue-100 text-blue-700 border border-blue-100 rounded-lg font-black uppercase tracking-wider text-[9px] transition-all flex items-center justify-center gap-1 cursor-pointer truncate px-1"
                title="Edit Job Details"
              >
                <Edit3 size={11} className="shrink-0" />
                <span className="truncate">Edit Details</span>
              </button>
            )}

            {onAssignHR && (
              <button 
                type="button"
                onClick={() => onAssignHR(job)}
                className="flex-1 h-8 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 rounded-lg font-black uppercase tracking-wider text-[9px] transition-all flex items-center justify-center gap-1 cursor-pointer truncate px-1"
                title="Assign HRs"
              >
                <Users size={11} className="shrink-0" />
                <span className="truncate">Assign HRs</span>
              </button>
            )}

            {onEndJob && (
              <button 
                type="button"
                onClick={() => onEndJob(job.id)}
                className="flex-1 h-8 bg-rose-50/80 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-lg font-black uppercase tracking-wider text-[9px] transition-all flex items-center justify-center gap-1 cursor-pointer truncate px-1"
                title="End Posting"
              >
                <Octagon size={11} className="shrink-0" />
                <span className="truncate">End Posting</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

