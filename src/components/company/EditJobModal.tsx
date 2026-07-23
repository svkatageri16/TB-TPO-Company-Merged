import React, { useState, useEffect } from 'react';
import { X, Save, FileText, ListOrdered, Calendar } from 'lucide-react';
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
        className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        id="edit-job-modal-content"
      >
        {/* Fixed Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 shrink-0">
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-blue-600">Company Portal</span>
            <h2 className="text-base font-black text-slate-800 uppercase tracking-tight mt-0.5">Edit Job Details</h2>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider truncate max-w-md">Role: {job.title}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer text-slate-400 hover:text-slate-600"
            id="close-edit-modal-btn"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body - Scrollable if long */}
        <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-5 space-y-3.5 overflow-y-auto flex-1">
            <div className="p-2.5 bg-blue-50/60 border border-blue-100/60 rounded-xl text-[11px] font-medium text-blue-800 leading-relaxed">
              Note: You can modify the <span className="font-bold text-blue-900">Job Description</span>, <span className="font-bold text-blue-900">Key Responsibilities</span>, and <span className="font-bold text-blue-900">Job Expiry Date</span>.
            </div>

            {/* Job Description */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600">
                  <FileText size={13} className="text-blue-600" />
                  Job Description
                </label>
                <span className="text-[9px] font-bold text-slate-400 uppercase">{description.length} chars</span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide a detailed description of the role and team..."
                rows={3}
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600/30 transition-all text-slate-700 resize-none"
              />
            </div>

            {/* Key Responsibilities */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600">
                  <ListOrdered size={13} className="text-blue-600" />
                  Key Responsibilities
                </label>
                <span className="text-[9px] font-bold text-slate-400 uppercase">{responsibilities.length} chars</span>
              </div>
              <textarea
                value={responsibilities}
                onChange={(e) => setResponsibilities(e.target.value)}
                placeholder="Outline the day-to-day duties and core tasks..."
                rows={3}
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600/30 transition-all text-slate-700 resize-none"
              />
            </div>

            {/* Job Expiry Date */}
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600">
                <Calendar size={13} className="text-blue-600" />
                Job Expiry Date
              </label>
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
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600/30 transition-all text-slate-700 cursor-pointer"
              />
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                Earliest allowed date is today ({todayStr}). Extending the expiry date updates the active posting deadline.
              </p>
            </div>
          </div>

          {/* Fixed Footer Buttons */}
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/80 flex justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all cursor-pointer"
              id="cancel-edit-btn"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all disabled:opacity-50 flex items-center gap-2 shadow-md shadow-blue-500/20 cursor-pointer"
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
