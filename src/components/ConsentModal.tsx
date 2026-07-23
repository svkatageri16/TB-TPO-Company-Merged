import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface ConsentModalProps {
  isOpen: boolean;
  title: string;
  subtitle: string;
  consentMessage: string;
  compulsoryWarning: string;
  onAgree: () => void;
  onDisagreeClose?: () => void;
}

export function ConsentModal({
  isOpen,
  title,
  subtitle,
  consentMessage,
  compulsoryWarning,
  onAgree,
  onDisagreeClose
}: ConsentModalProps) {
  const [showCompulsoryError, setShowCompulsoryError] = useState(false);

  const handleDisagree = () => {
    setShowCompulsoryError(true);
  };

  const handleCloseError = () => {
    setShowCompulsoryError(false);
    if (onDisagreeClose) {
      onDisagreeClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          {/* Main Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
          />

          {/* Consent Modal Box */}
          {!showCompulsoryError ? (
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-lg bg-white rounded-2xl border border-slate-150 p-6 md:p-8 shadow-2xl z-10 font-sans"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 border border-indigo-100 shrink-0">
                  <ShieldCheck size={22} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight leading-none">{title}</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">{subtitle}</p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-6">
                <p className="text-slate-650 text-xs sm:text-sm leading-relaxed font-medium">
                  {consentMessage}
                </p>
              </div>

              <div className="flex items-center gap-2 mb-6 bg-indigo-50/50 border border-indigo-100/50 rounded-xl p-3 text-indigo-850">
                <Info size={14} className="shrink-0 text-indigo-500" />
                <p className="text-[10px] font-bold uppercase tracking-wide">
                  Your privacy matters. Consent is required for AI-powered optimization features.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={handleDisagree}
                  className="flex-1 px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors cursor-pointer"
                >
                  Disagree
                </button>
                <button
                  type="button"
                  onClick={onAgree}
                  className="flex-1 px-4 py-3 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-colors cursor-pointer shadow-sm"
                >
                  Agree & Continue
                </button>
              </div>
            </motion.div>
          ) : (
            /* Compulsory Warning Popup */
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-sm bg-white rounded-2xl border border-red-150 p-6 shadow-2xl z-10 text-center font-sans"
            >
              <div className="w-12 h-12 bg-red-50 text-red-650 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                <AlertTriangle size={24} className="animate-bounce" />
              </div>

              <h4 className="text-md font-black text-rose-950 uppercase tracking-tight mb-2">Consent is Compulsory!</h4>
              <p className="text-slate-600 text-xs leading-relaxed mb-6 font-semibold">
                {compulsoryWarning}
              </p>

              <button
                type="button"
                onClick={handleCloseError}
                className="w-full px-4 py-3 bg-red-600 hover:bg-red-750 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-colors cursor-pointer shadow-sm"
              >
                Acknowledge & Retry
              </button>
            </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
}
