import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, AlertTriangle, CheckCircle, X, Bell } from "lucide-react";

interface FeedbackConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateName: string;
  jobTitle: string;
  currentStageName?: string;
  actionType: "SELECTED" | "REJECTED";
  onConfirm: (feedbackText: string | null, notifyCandidate: boolean) => void;
  isSubmitting?: boolean;
}

export function FeedbackConfirmModal({
  isOpen,
  onClose,
  candidateName,
  jobTitle,
  currentStageName = "Applied",
  actionType,
  onConfirm,
  isSubmitting = false,
}: FeedbackConfirmModalProps) {
  const [feedback, setFeedback] = useState("");
  const [notifyCandidate, setNotifyCandidate] = useState(true);
  const maxLength = 1000;

  // Reset state when modal is opened
  useEffect(() => {
    if (isOpen) {
      setFeedback("");
      setNotifyCandidate(true);
    }
  }, [isOpen]);

  const handleSubmit = () => {
    onConfirm(feedback.trim() || null, notifyCandidate);
  };

  if (!isOpen) return null;

  const isReject = actionType === "REJECTED";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Modal Panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.4 }}
          className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden z-10 flex flex-col"
        >
          {/* Header */}
          <div className="p-6 pb-4 border-b border-slate-100 flex justify-between items-start">
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border ${
                  isReject
                    ? "bg-rose-50 text-rose-500 border-rose-100"
                    : "bg-emerald-50 text-emerald-500 border-emerald-100"
                }`}
              >
                {isReject ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-black text-slate-900 tracking-tight leading-tight">
                  {isReject ? "Reject Candidate" : "Select Candidate"}
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Candidate: <span className="font-bold text-slate-700">{candidateName}</span>
                </p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Job: <span className="font-bold text-slate-700">{jobTitle}</span> • Current Stage: <span className="font-bold text-slate-700">{currentStageName}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 py-4 flex-1 space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2 flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <MessageSquare size={14} className="text-slate-400" />
                  Feedback for candidate (optional)
                </span>
                <span
                  className={`font-black text-[10px] ${
                    feedback.length > maxLength ? "text-rose-500" : "text-slate-400"
                  }`}
                >
                  {feedback.length}/{maxLength}
                </span>
              </label>

              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value.slice(0, maxLength))}
                placeholder="Write candidate-facing feedback (optional)..."
                rows={4}
                disabled={isSubmitting}
                className={`w-full p-3.5 text-sm bg-slate-50/50 border rounded-2xl outline-none focus:bg-white focus:ring-4 transition-all resize-none text-slate-800 placeholder-slate-400 ${
                  isReject
                    ? "border-slate-200/80 focus:border-rose-500 focus:ring-rose-500/10"
                    : "border-slate-200/80 focus:border-emerald-500 focus:ring-emerald-500/10"
                }`}
              />
              <p className="text-[11px] text-slate-500 mt-1.5 font-medium leading-relaxed">
                This feedback will be visible to the candidate.
              </p>
            </div>

            {/* Notification Control Switch */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start justify-between gap-3">
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-1.5 font-extrabold text-xs text-slate-800">
                  <Bell size={14} className={notifyCandidate ? "text-blue-600" : "text-slate-400"} />
                  Notify candidate automatically
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug font-medium">
                  {notifyCandidate
                    ? "The candidate will be notified immediately after rejection."
                    : "The candidate will be marked as rejected, but HR must notify them manually later."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setNotifyCandidate(!notifyCandidate)}
                disabled={isSubmitting}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  notifyCandidate ? "bg-blue-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    notifyCandidate ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 pt-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-2.5 sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-3 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-2xl text-xs font-extrabold uppercase tracking-widest transition-all cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`px-5 py-3 text-white rounded-2xl text-xs font-extrabold uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-1.5 ${
                isReject
                  ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/15 cursor-pointer"
                  : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/15 cursor-pointer"
              }`}
            >
              {isSubmitting ? "Rejecting..." : isReject ? "Reject Candidate" : "Select Candidate"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export interface UndoConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateName: string;
  jobTitle: string;
  currentDecision: string;
  restorationStageName?: string;
  onConfirm: (reason: string | null, notifyCandidate: boolean) => void;
  isSubmitting?: boolean;
}

export function UndoConfirmModal({
  isOpen,
  onClose,
  candidateName,
  jobTitle,
  currentDecision,
  restorationStageName = "Previous Stage",
  onConfirm,
  isSubmitting = false,
}: UndoConfirmModalProps) {
  const [reason, setReason] = useState("");
  const [notifyCandidate, setNotifyCandidate] = useState(true);
  const maxLength = 1000;

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setNotifyCandidate(true);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Modal Panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.4 }}
          className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden z-10 flex flex-col"
        >
          {/* Header */}
          <div className="p-6 pb-4 border-b border-slate-100 flex justify-between items-start">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border bg-amber-50 text-amber-600 border-amber-100">
                <AlertTriangle size={20} />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-black text-slate-900 tracking-tight leading-tight">
                  Undo Candidate Decision
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Candidate: <span className="font-bold text-slate-700">{candidateName}</span>
                </p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Job: <span className="font-bold text-slate-700">{jobTitle}</span> • Current Decision: <span className="font-bold text-amber-700 uppercase">{currentDecision}</span>
                </p>
                <p className="text-xs text-indigo-600 font-bold mt-1">
                  Will restore to: <span className="underline">{restorationStageName}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 py-4 flex-1 space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2 flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <MessageSquare size={14} className="text-slate-400" />
                  Reason for undoing decision (optional)
                </span>
                <span className={`font-black text-[10px] ${reason.length > maxLength ? "text-rose-500" : "text-slate-400"}`}>
                  {reason.length}/{maxLength}
                </span>
              </label>

              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value.slice(0, maxLength))}
                placeholder="Reason for reversing decision (for internal audit trail)..."
                rows={3}
                disabled={isSubmitting}
                className="w-full p-3.5 text-sm bg-slate-50/50 border border-slate-200/80 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all resize-none text-slate-800 placeholder-slate-400"
              />
              <p className="text-[11px] text-slate-500 mt-1.5 font-medium leading-relaxed">
                This action restores the candidate to their previous pipeline stage. The original decision remains in the audit history.
              </p>
            </div>

            {/* Notification Control Switch */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start justify-between gap-3">
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-1.5 font-extrabold text-xs text-slate-800">
                  <Bell size={14} className={notifyCandidate ? "text-blue-600" : "text-slate-400"} />
                  Notify candidate about this correction
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug font-medium">
                  {notifyCandidate
                    ? "The candidate will receive an update notification regarding their restored application status."
                    : "The status will be restored in system, but no email or notification will be sent."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setNotifyCandidate(!notifyCandidate)}
                disabled={isSubmitting}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  notifyCandidate ? "bg-blue-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    notifyCandidate ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 pt-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-2.5 sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-3 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-2xl text-xs font-extrabold uppercase tracking-widest transition-all cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(reason.trim() || null, notifyCandidate)}
              disabled={isSubmitting}
              className="px-5 py-3 text-white bg-amber-600 hover:bg-amber-700 shadow-amber-600/15 rounded-2xl text-xs font-extrabold uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? "Undoing..." : "Undo Decision"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
