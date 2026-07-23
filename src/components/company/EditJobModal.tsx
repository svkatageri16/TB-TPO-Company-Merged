import React, { useState, useEffect } from 'react';
import { X, Save, FileText, ListOrdered, Calendar, Edit3, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../services/api.ts';

interface EditJobModalProps {
  job: any;
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: () => void;
}

export function EditJobModal({ job, isOpen, onClose, onSaveSuccess }: EditJobModalProps) {
  const [description, setDescription] = useState('');
  const [responsibilities, setResponsibilities] = useState('');
  const [deadline, setDeadline] = useState('');
  const [saving, setSaving] = useState(false);

  // Get today's date in YYYY-MM-DD format
  const getTodayStr = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getTodayStr();

  useEffect(() => {
    if (job) {
      setDescription(job.description || '');
      setResponsibilities(job.responsibilities || '');
      if (job.deadline) {
        try {
          const d = new Date(job.deadline);
          if (!isNaN(d.getTime())) {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            setDeadline(`${yyyy}-${mm}-${dd}`);
          } else {
            setDeadline(todayStr);
          }
        } catch {
          setDeadline(todayStr);
        }
      } else {
        setDeadline(todayStr);
      }
    }
  }, [job]);

  if (!isOpen || !job) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description.trim()) {
      toast.error("Job description is required.");
      return;
    }
    if (!responsibilities.trim()) {
      toast.error("Key responsibilities are required.");
      return;
    }

    if (description.trim().length < 10) {
      toast.error("Job description must be at least 10 characters long.");
      return;
    }
    if (responsibilities.trim().length < 10) {
      toast.error("Key responsibilities must be at least 10 characters long.");
      return;
    }

    if (!deadline) {
      toast.error("Job expiry date is required.");
      return;
    }

    if (deadline < todayStr) {
      toast.error("Job expiry date cannot be in the past.");
      return;
    }

    try {
      setSaving(true);
      const res = await api.patch(`/jobs/${job.id}`, {
        description: description.trim(),
        responsibilities: responsibilities.trim(),
        deadline: deadline
      });

      if (res.data.success) {
        toast.success("Job details updated successfully.");
        // Dispatch global update events so all pages re-sync automatically
        window.dispatchEvent(new CustomEvent('vega:job-updated'));
        window.dispatchEvent(new CustomEvent('vega:pipeline-updated'));
        onSaveSuccess();
        onClose();
      } else {
        toast.error(res.data.message || "Failed to update job details.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "An error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200" id="edit-job-modal-backdrop">
      <div 
        className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        id="edit-job-modal-content"
      >
        {/* Fixed Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100/70 text-blue-700 rounded-2xl">
              <Edit3 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-800 uppercase tracking-tight">Edit Job Details</h2>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[9px] font-black uppercase rounded-full border border-blue-100">
                  Role Update
                </span>
              </div>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mt-0.5 truncate max-w-md">
                Job Posting: <span className="text-slate-700">{job.title}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer text-slate-400 hover:text-slate-600"
            id="close-edit-modal-btn"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body - Scrollable if content is long */}
        <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
            {/* Info Banner */}
            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl text-[11px] font-medium text-blue-900 flex items-center gap-2.5">
              <AlertCircle size={16} className="text-blue-600 shrink-0" />
              <span>
                You are updating active job specifications for <span className="font-bold">{job.title}</span>. Changes to description, key responsibilities, and expiry date will apply immediately across all portal views.
              </span>
            </div>

            {/* Description & Responsibilities Stack */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Job Description */}
              <div className="space-y-2 flex flex-col">
                <div className="flex justify-between items-center">
                  <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-700">
                    <FileText size={14} className="text-blue-600" />
                    Job Description
                  </label>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">{description.length} chars</span>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide a detailed description of the role, responsibilities, and team..."
                  rows={8}
                  className="w-full flex-1 bg-slate-50/60 border border-slate-200 rounded-2xl p-3.5 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600/40 transition-all text-slate-800 leading-relaxed resize-none shadow-inner"
                />
              </div>

              {/* Key Responsibilities */}
              <div className="space-y-2 flex flex-col">
                <div className="flex justify-between items-center">
                  <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-700">
                    <ListOrdered size={14} className="text-blue-600" />
                    Key Responsibilities
                  </label>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">{responsibilities.length} chars</span>
                </div>
                <textarea
                  value={responsibilities}
                  onChange={(e) => setResponsibilities(e.target.value)}
                  placeholder="Outline day-to-day duties, core deliverables, and expectations..."
                  rows={8}
                  className="w-full flex-1 bg-slate-50/60 border border-slate-200 rounded-2xl p-3.5 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600/40 transition-all text-slate-800 leading-relaxed resize-none shadow-inner"
                />
              </div>
            </div>

            {/* Job Expiry Date - Clearly Separated Section */}
            <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl space-y-2.5">
              <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-700">
                <Calendar size={14} className="text-blue-600" />
                Job Expiry Date
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <input
                  type="date"
                  min={todayStr}
                  value={deadline}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val && val < todayStr) {
                      toast.error("Job expiry date cannot be in the past.");
                    }
                    setDeadline(val);
                  }}
                  className="w-full sm:w-64 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600/40 transition-all text-slate-800 cursor-pointer shadow-sm"
                />
                <p className="text-[10px] font-medium text-slate-500 leading-normal">
                  Earliest allowed date is today ({todayStr}). Extending the expiry date updates the active posting deadline for student submissions.
                </p>
              </div>
            </div>
          </div>

          {/* Fixed Footer Buttons */}
          <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 flex justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all cursor-pointer shadow-sm"
              id="cancel-edit-btn"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all disabled:opacity-50 flex items-center gap-2 shadow-md shadow-blue-500/20 cursor-pointer"
              id="save-edit-btn"
            >
              <Save size={13} />
              {saving ? "Saving..." : "Save Details"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
