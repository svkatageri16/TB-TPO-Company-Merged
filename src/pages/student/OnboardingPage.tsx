import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../../context/AuthContext.tsx";
import api from "../../services/api.ts";
import toast from "react-hot-toast";
import { 
  Heart, 
  Megaphone, 
  PieChart, 
  Code2, 
  Coins, 
  Puzzle, 
  Mail, 
  Ban, 
  Search, 
  MessageSquare, 
  Globe, 
  Music, 
  Users, 
  Linkedin, 
  Instagram, 
  FileText, 
  Briefcase,
  ChevronRight,
  Sparkles,
  CheckCircle,
  Award
} from "lucide-react";

export function OnboardingPage() {
  const { user, profile, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [selectedIndustry, setSelectedIndustry] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedSource, setSelectedSource] = useState("");
  const [selectedActions, setSelectedActions] = useState<string[]>(["resume", "jobs"]);

  const handleActionToggle = (action: string) => {
    setSelectedActions(prev => 
      prev.includes(action) 
        ? prev.filter(a => a !== action) 
        : [...prev, action]
    );
  };

  const handleNext = () => {
    if (currentStep === 1 && !selectedIndustry) {
      toast.error("Please select an industry to continue");
      return;
    }
    if (currentStep === 2 && !selectedStatus) {
      toast.error("Please select your job search status to continue");
      return;
    }
    if (currentStep === 3 && !selectedSource) {
      toast.error("Please select how you heard about us to continue");
      return;
    }
    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      const response = await api.put(`/students/profile/${user?.id}/section/onboarding`, {
        onboardingCompleted: true,
        onboardingIndustry: selectedIndustry,
        onboardingStatus: selectedStatus,
        onboardingSource: selectedSource,
        onboardingHelpActions: selectedActions
      });

      if (response.data.success) {
        toast.success("Welcome aboard! Let's shape your future career.");
        
        // Update the profile context so changes propagate
        const updatedProfile = {
          ...profile,
          onboarding_completed: 1,
          onboarding_industry: selectedIndustry,
          onboarding_status: selectedStatus,
          onboarding_source: selectedSource,
          onboarding_help_actions: JSON.stringify(selectedActions)
        };
        updateProfile(updatedProfile);
        
        // Navigate to the student profile page
        navigate("/profile");
      } else {
        toast.error(response.data.message || "Failed to save options");
      }
    } catch (e) {
      console.error(e);
      toast.error("An error occurred while saving your preferences. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Progress Calculations
  const progressPercent = (currentStep / 3) * 100;

  return (
    <div className="min-h-screen bg-slate-50/75 flex flex-col justify-between p-6 md:p-12 relative overflow-hidden select-none">
      
      {/* Decorative Mock Elements in Background replicating the screenshots */}
      <div className="absolute top-[8%] left-[5%] opacity-20 hidden md:block select-none pointer-events-none transform -rotate-12 border border-slate-300 bg-white shadow-md p-4 rounded-xl w-48">
        <div className="h-4 w-32 bg-slate-200 rounded mb-2" />
        <div className="h-3 w-24 bg-slate-100 rounded" />
      </div>

      <div className="absolute top-[8%] right-[8%] opacity-20 hidden md:block select-none pointer-events-none transform rotate-12 border border-slate-300 bg-white shadow-md p-4 rounded-xl w-48">
        <div className="flex items-center gap-2 mb-2">
          <Award size={16} className="text-violet-500" />
          <div className="h-4 w-20 bg-slate-200 rounded" />
        </div>
        <div className="h-3 w-28 bg-slate-100 rounded" />
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-3xl mx-auto my-auto relative z-10 flex flex-col items-center">
        
        {/* Welcome Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-violet-50 text-violet-600 px-4 py-1.5 rounded-full text-xs font-bold mb-4 border border-violet-100">
            <Sparkles size={13} className="fill-violet-200" />
            <span>Personalized Career Journey</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight flex items-center justify-center gap-2.5">
            👋 Welcome to VEGA!
          </h1>
          <p className="text-slate-500 text-sm mt-2.5 font-medium max-w-md mx-auto leading-relaxed">
            Let's personalize your experience! Help us understand your preferences.
          </p>
        </div>

        {/* Progress Bar Container */}
        <div className="w-full max-w-2xl bg-slate-200/60 rounded-full h-2.5 mb-12 relative overflow-hidden">
          <motion.div 
            className="bg-gradient-to-r from-indigo-500 to-violet-600 h-full rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>

        {/* Form Container with animated shifts */}
        <div className="w-full max-w-2.5xl min-h-[300px]">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: Industry Selector */}
            {currentStep === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="w-full"
              >
                <h2 className="text-2xl font-black text-slate-800 tracking-tight text-center md:text-left mb-8">
                  What industry are you looking to work in?
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { id: "healthcare", label: "Healthcare", icon: Heart, color: "text-rose-500 bg-rose-50 border-rose-100" },
                    { id: "marketing", label: "Marketing", icon: Megaphone, color: "text-amber-500 bg-amber-50 border-amber-100" },
                    { id: "management", label: "Management", icon: PieChart, color: "text-cyan-500 bg-cyan-50 border-cyan-100" },
                    { id: "tech", label: "Tech", icon: Code2, color: "text-indigo-500 bg-indigo-50 border-indigo-100" },
                    { id: "finance", label: "Finance", icon: Coins, color: "text-emerald-500 bg-emerald-50 border-emerald-100" },
                    { id: "other", label: "Other", icon: Puzzle, color: "text-purple-500 bg-purple-50 border-purple-100" },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = selectedIndustry === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setSelectedIndustry(item.id)}
                        className={`flex items-center gap-4 p-5 rounded-2xl border text-left transition-all duration-300 w-full group ${
                          isSelected 
                            ? "bg-white border-violet-500 shadow-md shadow-violet-100 ring-2 ring-violet-500/20" 
                            : "bg-white hover:bg-slate-50/50 border-slate-100 hover:border-slate-300 shadow-sm"
                        }`}
                      >
                        <div className={`p-3 rounded-xl border ${item.color} group-hover:scale-110 transition-transform duration-300`}>
                          <Icon size={20} className="stroke-[2.5]" />
                        </div>
                        <span className="font-extrabold text-slate-700 text-sm">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* STEP 2: Job Search Status */}
            {currentStep === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="w-full"
              >
                <h2 className="text-2xl font-black text-slate-800 tracking-tight text-center md:text-left mb-8">
                  What's your current job search status?
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { id: "open", label: "Not looking but open to offers", icon: Mail, color: "text-sky-500 bg-sky-50" },
                    { id: "closed", label: "Not looking and closed to offers", icon: Ban, color: "text-slate-400 bg-slate-50" },
                    { id: "actively_looking", label: "Actively looking", icon: Search, color: "text-violet-500 bg-violet-50" },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = selectedStatus === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setSelectedStatus(item.id)}
                        className={`flex items-center gap-4 p-5 rounded-2xl border text-left transition-all duration-300 w-full group ${
                          isSelected 
                            ? "bg-white border-violet-500 shadow-md shadow-violet-100 ring-2 ring-violet-500/20" 
                            : "bg-white hover:bg-slate-50/50 border-slate-100 hover:border-slate-200 shadow-sm"
                        }`}
                      >
                        <div className={`p-3 rounded-xl ${item.color} group-hover:scale-110 transition-transform duration-300`}>
                          <Icon size={20} className="stroke-[2.5]" />
                        </div>
                        <span className="font-extrabold text-slate-700 text-sm">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* STEP 3: Referrer Source */}
            {currentStep === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="w-full"
              >
                <h2 className="text-2xl font-black text-slate-800 tracking-tight text-center md:text-left mb-8">
                  How did you hear about VEGA?
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { id: "reddit", label: "Reddit", icon: MessageSquare, color: "text-orange-500 bg-orange-50" },
                    { id: "chromestore", label: "Chrome Web store", icon: Globe, color: "text-teal-500 bg-teal-50" },
                    { id: "tiktok", label: "TikTok", icon: Music, color: "text-rose-500 bg-rose-50" },
                    { id: "friend", label: "Friend/Mentor", icon: Users, color: "text-violet-500 bg-violet-50" },
                    { id: "linkedin", label: "LinkedIn", icon: Linkedin, color: "text-blue-500 bg-blue-50" },
                    { id: "instagram", label: "Instagram", icon: Instagram, color: "text-fuchsia-500 bg-fuchsia-50" },
                    { id: "google", label: "Google Search", icon: Globe, color: "text-red-500 bg-red-50" },
                    { id: "other", label: "Other", icon: Puzzle, color: "text-slate-500 bg-slate-50" },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = selectedSource === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setSelectedSource(item.id)}
                        className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-300 w-full group ${
                          isSelected 
                            ? "bg-white border-violet-500 shadow-md shadow-violet-100 ring-2 ring-violet-500/20" 
                            : "bg-white hover:bg-slate-50/50 border-slate-100 hover:border-slate-200 shadow-sm"
                        }`}
                      >
                        <div className={`p-2.5 rounded-lg ${item.color} group-hover:scale-110 transition-transform duration-300`}>
                          <Icon size={18} className="stroke-[2.2]" />
                        </div>
                        <span className="font-extrabold text-slate-700 text-xs">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Dynamic Nav Buttons */}
        <div className="w-full flex items-center justify-between mt-12 pt-6 border-t border-slate-200/50 max-w-2.5xl">
          {currentStep > 1 ? (
            <button
              onClick={handleBack}
              disabled={submitting}
              className="px-6 py-3 border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-700 bg-white shadow-sm rounded-xl text-xs font-bold transition-all duration-200"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {currentStep < 3 ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-extrabold rounded-xl text-xs shadow-md shadow-violet-100 hover:shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Next</span>
              <ChevronRight size={13} className="stroke-[2.5]" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={submitting}
              className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-[#7c3aed] hover:from-indigo-700 hover:to-[#6d28d9] text-white font-extrabold rounded-xl text-xs shadow-md shadow-violet-200 hover:shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? "Getting Started..." : "Get Started"}
              <CheckCircle size={13} className="stroke-[2.5]" />
            </button>
          )}
        </div>

      </div>

      {/* Aesthetic layout footnotes replicating screens */}
      <footer className="w-full text-center text-[10px] font-mono font-bold text-slate-400 select-none pointer-events-none mt-8">
        VEGA CAREER PLATFORM &copy; 2026 &bull; SECURE MULTI-ROLE ENCLAVE
      </footer>
    </div>
  );
}
