import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, AlertTriangle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  onViolation: () => void;
  onMaxViolations: () => void;
  maxViolations?: number;
}

export default function AntiCheatWrapper({ children, onViolation, onMaxViolations, maxViolations = 2 }: Props) {
  const [violations, setViolations] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");

  const triggerViolation = (reason: string) => {
    setViolations(prev => {
      const updated = prev + 1;
      if (updated >= maxViolations) {
        onMaxViolations();
      } else {
        setWarningMessage(`Warning ${updated}/${maxViolations}: ${reason}`);
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 5000);
        onViolation();
      }
      return updated;
    });
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation("Tab switching away from the test is prohibited.");
      }
    };

    const handleBlur = () => {
      triggerViolation("Window lost focus.");
    };

    const handleCopyPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      triggerViolation("Copy-pasting is not allowed.");
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("copy", handleCopyPaste);
    document.addEventListener("paste", handleCopyPaste);
    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("copy", handleCopyPaste);
      document.removeEventListener("paste", handleCopyPaste);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  return (
    <div className="relative w-full h-full min-h-screen">
      {showWarning && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <AlertTriangle className="w-6 h-6" />
          <div className="flex flex-col">
            <span className="font-bold tracking-wide">SECURITY WARNING</span>
            <span className="text-sm text-red-100">{warningMessage}</span>
          </div>
        </div>
      )}
      
      {/* We could force full screen here, but modern browsers require user interaction to trigger requestFullscreen.
          Typically this is done via a "Start Test" button. */}

      <div className="select-none h-full">
        {children}
      </div>
    </div>
  );
}
