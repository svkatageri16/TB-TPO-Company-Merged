import React, { useEffect, useState } from 'react';
import { X, Briefcase, MapPin, DollarSign, Users, Calendar, Layers, Award, Clock, FileText, CheckCircle2, AlertCircle, Edit3 } from 'lucide-react';
import api from '../../services/api.ts';

interface ViewJobDetailsModalProps {
  job: any;
  isOpen: boolean;
  onClose: () => void;
  onOpenEditModal?: (job: any) => void;
}

export function ViewJobDetailsModal({ job, isOpen, onClose, onOpenEditModal }: ViewJobDetailsModalProps) {
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (job?.id && isOpen) {
      fetchJobDetails();
    } else {
      setDetails(job);
    }
  }, [job, isOpen]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/jobs/${job.id}`);
      if (res.data.success && res.data.data) {
        setDetails(res.data.data);
      } else {
        setDetails(job);
      }
    } catch (e) {
      console.error("Error fetching detailed job view:", e);
      setDetails(job);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !job) return null;

  const currentData = details || job;

  // Format skills
  let skillsList: string[] = [];
  if (Array.isArray(currentData.skills)) {
    skillsList = currentData.skills;
  } else if (currentData.skills_json) {
    try {
      skillsList = typeof currentData.skills_json === 'string' ? JSON.parse(currentData.skills_json) : currentData.skills_json;
    } catch {
      skillsList = [];
    }
  }

  // Format dates
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Not set';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const isExpired = currentData.deadline && new Date(currentData.deadline).setHours(23, 59, 59, 999) < new Date().getTime();
  const statusLabel = currentData.status === 'CLOSED' ? 'Ended / History' : (isExpired ? 'Expired' : 'Active / Open');
  const statusBg = currentData.status === 'CLOSED' ? 'bg-slate-100 text-slate-700 border-slate-200' : (isExpired ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200');

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200" id="view-job-details-modal-backdrop">
      <div 
        className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        id="view-job-details-modal-content"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100/70 text-blue-700 rounded-xl">
              <Briefcase size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-800 uppercase tracking-tight truncate max-w-sm">{currentData.title}</h2>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${statusBg}`}>
                  {statusLabel}
                </span>
              </div>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mt-0.5">
                {currentData.company_name || 'Company Role'} • Posted: {formatDate(currentData.created_at || currentData.application_start_date)}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer text-slate-400 hover:text-slate-600"
            id="close-view-modal-btn"
          >
            <X size={18} />
          </button>
        </div>

        {/* Compact Content Grid */}
        <div className="p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-slate-50/70 border border-slate-150 rounded-2xl">
            <div className="space-y-0.5">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                <MapPin size={10} className="text-blue-600" /> Location
              </span>
              <p className="font-bold text-slate-800 truncate">{currentData.location || 'Remote / Unspecified'}</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                <Briefcase size={10} className="text-blue-600" /> Job Type
              </span>
              <p className="font-bold text-slate-800 truncate">{currentData.job_type || currentData.jobType || 'Full-time'}</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                <DollarSign size={10} className="text-blue-600" /> Salary
              </span>
              <p className="font-bold text-slate-800 truncate">{currentData.salary_range || currentData.salaryRange || 'Competitive'}</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                <Users size={10} className="text-blue-600" /> Applicants
              </span>
              <p className="font-bold text-blue-700">{currentData.total_applicants ?? currentData.applicant_count ?? 0} candidates</p>
            </div>
          </div>

          {/* Secondary Attributes Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[11px]">
            <div className="p-2.5 bg-slate-50/40 border border-slate-100 rounded-xl">
              <span className="text-[9px] font-black uppercase text-slate-400 block">Experience Level</span>
              <span className="font-bold text-slate-700">{currentData.experience_level || currentData.experienceLevel || 'Entry Level'}</span>
            </div>
            <div className="p-2.5 bg-slate-50/40 border border-slate-100 rounded-xl">
              <span className="text-[9px] font-black uppercase text-slate-400 block">Department / Ed. Req.</span>
              <span className="font-bold text-slate-700 truncate block">{currentData.education_requirement || currentData.department || 'Engineering / General'}</span>
            </div>
            <div className="p-2.5 bg-slate-50/40 border border-slate-100 rounded-xl col-span-2 sm:col-span-1">
              <span className="text-[9px] font-black uppercase text-slate-400 block flex items-center gap-1">
                <Clock size={10} className="text-blue-600" /> Expiry Date (Deadline)
              </span>
              <span className="font-bold text-slate-900">{formatDate(currentData.deadline)}</span>
            </div>
          </div>

          {/* Required Skills Chips */}
          {skillsList.length > 0 && (
            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Required Skills</span>
              <div className="flex flex-wrap gap-1.5">
                {skillsList.map((skill: string, idx: number) => (
                  <span key={idx} className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-100/80 rounded-lg text-[10px] font-bold">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Two-Column Description & Responsibilities */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-slate-50/50 border border-slate-150 rounded-2xl space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                <FileText size={12} className="text-blue-600" /> Job Description
              </span>
              <p className="text-slate-700 text-[11px] leading-relaxed font-medium whitespace-pre-line">
                {currentData.description || 'No description provided.'}
              </p>
            </div>

            <div className="p-3 bg-slate-50/50 border border-slate-150 rounded-2xl space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                <CheckCircle2 size={12} className="text-blue-600" /> Key Responsibilities
              </span>
              <p className="text-slate-700 text-[11px] leading-relaxed font-medium whitespace-pre-line">
                {currentData.responsibilities || 'No responsibilities specified.'}
              </p>
            </div>
          </div>

          {/* Pipeline Stages & Assigned HRs summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentData.stages && currentData.stages.length > 0 && (
              <div className="p-2.5 bg-slate-50/50 border border-slate-150 rounded-xl">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                  Recruitment Pipeline ({currentData.stages.length} Stages)
                </span>
                <div className="flex flex-wrap gap-1">
                  {currentData.stages.map((stg: any, i: number) => (
                    <span key={i} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-bold text-slate-700">
                      {i + 1}. {stg.stage_name || stg.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {currentData.assigned_hrs && currentData.assigned_hrs.length > 0 && (
              <div className="p-2.5 bg-slate-50/50 border border-slate-150 rounded-xl">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                  Assigned HR Recruiters ({currentData.assigned_hrs.length})
                </span>
                <div className="flex flex-wrap gap-1">
                  {currentData.assigned_hrs.map((hr: any, i: number) => (
                    <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded text-[9px] font-bold">
                      {hr.designation || hr.email}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Mandatory Requirement Note */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <p className="text-[11px] text-slate-500 font-medium italic">
              Note: To modify this job, use the “Edit Job Details” option.
            </p>
            {onOpenEditModal && currentData.status !== 'CLOSED' && !isExpired && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEditModal(currentData);
                }}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Edit3 size={12} /> Edit Job Details
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/80 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all cursor-pointer"
            id="close-view-job-details-btn"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
