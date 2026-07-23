import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, AlertTriangle, CheckCircle, X } from "lucide-react";

interface FeedbackConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateName: string;
  jobTitle: string;
  actionType: "SELECTED" | "REJECTED";
  onConfirm: (feedbackText: string | null) => void;
  isSubmitting?: boolean;
}

export function FeedbackConfirmModal({
  isOpen,
  onClose,
  candidateName,
  jobTitle,
  actionType,
  onConfirm,
  isSubmitting = false,
}: FeedbackConfirmModalProps) {
  const [feedback, setFeedback] = useState("");
  const maxLength = 1000;

  // Reset state when modal is opened
  useEffect(() => {
    if (isOpen) {
      setFeedback("");
    }
  }, [isOpen]);

  const handleConfirmWithFeedback = () => {
    onConfirm(feedback.trim() || null);
  };

  const handleContinueWithoutFeedback = () => {
    onConfirm(null);
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
          <div className="p-6 pb-4 border-b border-slate-50 flex justify-between items-start">
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
                  {isReject
                    ? "Add feedback before rejecting candidate?"
                    : "Add feedback before selecting candidate?"}
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  For <span className="font-bold text-slate-700">{candidateName}</span> applying to{" "}
                  <span className="font-bold text-slate-700">{jobTitle}</span>
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
          <div className="p-6 py-4 flex-1">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2.5 flex justify-between items-center">
              <span className="flex items-center gap-1.5">
                <MessageSquare size={14} className="text-slate-400" />
                Optional Candidate Feedback
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
              placeholder="Write optional feedback for the candidate... This will be sent directly to their notifications panel and email address to help them improve or understand next steps."
              rows={5}
              disabled={isSubmitting}
              className={`w-full p-4 text-sm bg-slate-50/50 border rounded-2xl outline-none focus:bg-white focus:ring-4 transition-all resize-none text-slate-800 placeholder-slate-400 ${
                isReject
                  ? "border-slate-200/80 focus:border-rose-500 focus:ring-rose-500/10"
                  : "border-slate-200/80 focus:border-emerald-500 focus:ring-emerald-500/10"
              }`}
            />
            <p className="text-[11px] text-slate-400 mt-2 font-medium leading-relaxed">
              If provided, this feedback is sent to the candidate to provide professional closure or onboarding insights. Leaving it empty sends a standard, templated update instead.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="p-6 pt-4 border-t border-slate-50 bg-slate-50/50 flex flex-col sm:flex-row gap-2.5 sm:justify-end">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-3 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-2xl text-xs font-extrabold uppercase tracking-widest transition-all cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              onClick={handleContinueWithoutFeedback}
              disabled={isSubmitting}
              className="px-5 py-3 bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-700 rounded-2xl text-xs font-extrabold uppercase tracking-widest transition-all cursor-pointer text-center"
            >
              Continue Without Feedback
            </button>
            <button
              onClick={handleConfirmWithFeedback}
              disabled={isSubmitting || feedback.trim().length === 0}
              className={`px-5 py-3 text-white rounded-2xl text-xs font-extrabold uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-1.5 ${
                feedback.trim().length === 0
                  ? "bg-slate-300 text-slate-400 cursor-not-allowed shadow-none"
                  : isReject
                  ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/15 cursor-pointer"
                  : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/15 cursor-pointer"
              }`}
            >
              {isSubmitting ? "Processing..." : "Confirm & Notify"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
