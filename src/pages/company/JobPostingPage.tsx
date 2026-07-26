import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext.tsx";
import api from "../../services/api.ts";
import { 
  Plus, X, Calendar, MapPin, Sparkles, ChevronLeft, LayoutGrid, CheckCircle, Clock, ShieldCheck, 
  BrainCircuit, Briefcase, GraduationCap, Target, Settings, Zap, ArrowRight, Copy, Save, ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const PREDEFINED_SKILLS = [
  // Technical skills
  "JavaScript", "TypeScript", "React", "Node.js", "Python", "Java", "Spring Boot", "SQL", "MySQL", "MongoDB", "Docker", "Kubernetes", "AWS", "Azure", "Git", "HTML", "CSS", "Tailwind CSS", "FastAPI", "Express.js",
  // Communication skills
  "Communication", "Public Speaking", "Presentation", "Negotiation", "Business Writing", "Email Etiquette", "Client Communication",
  // Sales skills
  "Lead Generation", "CRM", "Cold Calling", "B2B Sales", "B2C Sales", "Inside Sales", "Field Sales", "Sales Strategy", "Customer Handling",
  // Finance skills
  "Accounting", "Tally", "GST", "Taxation", "Financial Analysis", "Excel", "Budgeting", "Auditing", "Payroll", "Investment Analysis",
  // Marketing skills
  "Digital Marketing", "SEO", "SEM", "Social Media Marketing", "Content Marketing", "Email Marketing", "Branding", "Market Research",
  // HR skills
  "Recruitment", "Screening", "Interviewing", "Onboarding", "HR Operations", "Employee Engagement",
  // Design skills
  "UI Design", "UX Design", "Figma", "Adobe XD", "Photoshop", "Illustrator", "Canva",
  // Operations skills
  "Operations Management", "Vendor Management", "Inventory Management", "MIS Reporting", "Process Improvement",
  // Data skills
  "Data Analysis", "Power BI", "Tableau", "Pandas", "NumPy", "Machine Learning", "Data Visualization",
  // Soft skills
  "Leadership", "Teamwork", "Problem Solving", "Critical Thinking", "Time Management", "Adaptability"
];

const LOCATION_OPTIONS = [
  "Remote",
  "Hybrid",
  "On-site",
  "Pune",
  "Mumbai",
  "Bengaluru",
  "Hyderabad",
  "Chennai",
  "Delhi NCR",
  "Noida",
  "Gurugram",
  "Kolkata",
  "Ahmedabad",
  "Jaipur",
  "Nagpur",
  "Nashik",
  "Solapur",
  "Other"
];

export function JobPostingPage() {
  const { profile } = useAuth();
  const isFrozen = profile?.status === 'PENDING_REVERIFICATION' || profile?.status === 'PENDING';
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState<string | null>(null);
  const [questionEditorStage, setQuestionEditorStage] = useState<number | null>(null);

  useEffect(() => {
    if (profile?.id && isFrozen) {
      toast.error("Your company profile is pending verification. Access to posting new roles is frozen.");
      navigate("/company/jobs");
    }
  }, [profile?.id, isFrozen]);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    location: "Remote",
    jobType: "Full-time",
    experienceLevel: "Entry Level",
    skills: [] as string[],
    skillInput: "",
    description: "",
    responsibilities: "",
    qualifications: "",
    additionalNotes: "",
    startDate: new Date().toISOString().split('T')[0],
    deadline: "",
    salaryRange: "",
    salaryCurrency: "INR",
    aiMatchCutoff: 60, // AI Screening Cutoff
    autoReject: false,
    publishDestination: "JOB_ONLY",
    openings: 1
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [showSkillsDropdown, setShowSkillsDropdown] = useState(false);
  const [skillsActiveIndex, setSkillsActiveIndex] = useState(-1);
  const skillsContainerRef = useRef<HTMLDivElement>(null);

  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const locationContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (skillsContainerRef.current && !skillsContainerRef.current.contains(event.target as Node)) {
        setShowSkillsDropdown(false);
      }
      if (locationContainerRef.current && !locationContainerRef.current.contains(event.target as Node)) {
        setShowLocationDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Substep navigation for multi-part steps (Steps 2, 3, 4)
  const [subStep, setSubStep] = useState<1 | 2>(1);

  const isFormDirty = () => {
    return (
      formData.title.trim() !== "" ||
      formData.description.trim() !== "" ||
      formData.responsibilities.trim() !== "" ||
      formData.qualifications.trim() !== "" ||
      formData.additionalNotes.trim() !== "" ||
      formData.skills.length > 0 ||
      formData.salaryRange.trim() !== ""
    );
  };

  const handleClose = () => {
    if (isFormDirty()) {
      const confirmDiscard = window.confirm("Discard this job post? Your entered details will be lost.");
      if (!confirmDiscard) return;
    }
    navigate("/company/jobs");
  };

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) {
      newErrors.title = "Job Title is required.";
    }
    if (!formData.location.trim()) {
      newErrors.location = "Location & Workplace is required.";
    }
    const openingsNum = parseInt(formData.openings?.toString() || "1");
    if (isNaN(openingsNum) || openingsNum < 1 || openingsNum > 999) {
      newErrors.openings = "Number of Openings must be between 1 and 999.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2A = () => {
    const newErrors: Record<string, string> = {};
    const desc = formData.description.trim();
    if (!desc) {
      newErrors.description = "Job Description is required.";
    } else if (desc.length < 50) {
      newErrors.description = `Job Description is too short (current: ${desc.length} chars, minimum: 50).`;
    } else if (desc.length > 2000) {
      newErrors.description = `Job Description cannot exceed 2000 characters (current: ${desc.length} chars).`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    return validateStep2A();
  };

  const validateStep3 = () => {
    if (stages.length < 2) {
      toast.error("Please define at least 2 stages for your recruitment pipeline.");
      return false;
    }
    return true;
  };

  // Hiring Stages State
  const [stages, setStages] = useState([
    { id: 1, name: "Applied", description: "Initial resume screening via AI", type: "APPLICATION", canDelete: false, config: {}, questions: [] },
    { id: 2, name: "Technical Assessment", description: "Coding & Logic round", type: "TEST", canDelete: true, config: { duration: 45, passScore: 70 }, questions: [] },
    { id: 3, name: "Technical Interview", description: "Live face-to-face evaluation", type: "INTERVIEW_ONLINE", canDelete: true, config: {}, questions: [] },
    { id: 4, name: "HR Interview", description: "Cultural fit & package discussion", type: "INTERVIEW_ONLINE", canDelete: true, config: {}, questions: [] },
    { id: 5, name: "Offer & Selected", description: "Final hiring decision", type: "APPLICATION", canDelete: false, config: {}, questions: [] }
  ]);

  const handleAddSkill = (e: any) => {
    e.preventDefault();
    if (formData.skillInput.trim() && !formData.skills.includes(formData.skillInput.trim())) {
      setFormData({
        ...formData,
        skills: [...formData.skills, formData.skillInput.trim()],
        skillInput: ""
      });
    }
    setShowSkillsDropdown(false);
    setSkillsActiveIndex(-1);
  };

  const removeSkill = (skill: string) => {
    setFormData({ ...formData, skills: formData.skills.filter(s => s !== skill) });
  };

  const addStage = () => {
    const newStage = { id: Date.now(), name: "New Round", description: "", type: "APPLICATION", canDelete: true, config: {}, questions: [] };
    const selectedIdx = stages.findIndex(s => s.name.includes("Selected") || !s.canDelete && s.id !== 1);
    const newStages = [...stages];
    if (selectedIdx !== -1) {
       newStages.splice(selectedIdx, 0, newStage);
    } else {
       newStages.push(newStage);
    }
    setStages(newStages);
  };

  const generateWithAI = async (field: 'description' | 'responsibilities' | 'qualifications') => {
    if (!formData.title) {
       toast.error("Please enter a Job Title first for AI context.");
       return;
    }
    setIsGeneratingAI(field);
    
    // Simulate AI generation delay
    await new Promise(r => setTimeout(r, 1500));
    
    let generated = "";
    if (field === 'description') {
       generated = `We are seeking an exceptional ${formData.title} to join our dynamic team. You will play a crucial role in shaping our core product experience, working alongside a talented cross-functional team of engineers and designers to build scalable, high-performance solutions. If you are passionate about innovation and user-centric problem solving, this is the perfect opportunity.`;
    } else if (field === 'responsibilities') {
       generated = `• Architect, build, and maintain highly scalable web applications.\n• Collaborate with cross-functional teams to define and launch new features.\n• Ensure the technical feasibility of UI/UX designs.\n• Optimize application for maximum speed and scalability.\n• Participate in code reviews and mentor junior developers.`;
    } else if (field === 'qualifications') {
       generated = `• Proven experience working as a ${formData.title} or similar role.\n• Deep understanding of modern web architectures and frameworks.\n• Strong problem resolution skills and algorithmic thinking.\n• Excellent communication skills and ability to work in a fast-paced agile environment.\n• BS/MS in Computer Science or relevant real-world experience.`;
    }
    
    setFormData(prev => ({ ...prev, [field]: generated }));
    setIsGeneratingAI(null);
    toast.success(`AI Generated ${field} successfully!`);
  };

  const autoSuggestSkills = () => {
     if (!formData.title) return toast.error("Enter a job title first");
     const role = formData.title.toLowerCase();
     let suggestions = ['Communication', 'Teamwork', 'Agile'];
     if (role.includes('react') || role.includes('frontend')) suggestions = [...suggestions, 'React.js', 'TypeScript', 'Tailwind CSS', 'Redux'];
     if (role.includes('node') || role.includes('backend')) suggestions = [...suggestions, 'Node.js', 'Express', 'MongoDB', 'PostgreSQL'];
     if (role.includes('data')) suggestions = [...suggestions, 'Python', 'SQL', 'Machine Learning', 'Pandas'];
     
     const newSkills = [...new Set([...formData.skills, ...suggestions])];
     setFormData(prev => ({...prev, skills: newSkills}));
     toast.success("AI suggested skills added!");
  };

  const loadWorkflowTemplate = (type: string) => {
     if(type === 'engineering') {
        setStages([
           { id: 1, name: "Applied", description: "AI Match Screening", type: "APPLICATION", canDelete: false, config: {}, questions: [] },
           { id: 2, name: "Take-home Assessment", description: "Algorithm & System Design", type: "TEST", canDelete: true, config: { duration: 90, passScore: 75 }, questions: [] },
           { id: 3, name: "Technical Deep Dive", description: "1-on-1 with Staff Engineer", type: "INTERVIEW_ONLINE", canDelete: true, config: {}, questions: [] },
           { id: 4, name: "Culture Fit", description: "HR & Founder chat", type: "INTERVIEW_ONLINE", canDelete: true, config: {}, questions: [] },
           { id: 5, name: "Offer", description: "Final decision", type: "APPLICATION", canDelete: false, config: {}, questions: [] }
        ]);
     } else if (type === 'campus') {
        setStages([
           { id: 1, name: "Applied", description: "Initial screening", type: "APPLICATION", canDelete: false, config: {}, questions: [] },
           { id: 2, name: "Aptitude & Logic", description: "Basic problem solving test", type: "TEST", canDelete: true, config: { duration: 45, passScore: 60 }, questions: [] },
           { id: 3, name: "Group Discussion", description: "Communication assessment", type: "INTERVIEW_OFFLINE", canDelete: true, config: {}, questions: [] },
           { id: 4, name: "Technical Interview", description: "Core concepts", type: "INTERVIEW_OFFLINE", canDelete: true, config: {}, questions: [] },
           { id: 5, name: "Selected", description: "Final decision", type: "APPLICATION", canDelete: false, config: {}, questions: [] }
        ]);
     }
     toast.success(`${type.toUpperCase()} Template applied!`);
  };

  const handleSubmit = async () => {
    if (loading) return;
    if (isFrozen) {
      toast.error("Your company profile is pending verification. Please wait for Admin approval.");
      return;
    }
    if (!formData.title.trim()) {
      toast.error("Job Title is required.");
      setStep(1);
      return;
    }
    if (!formData.location.trim()) {
      toast.error("Location & Workplace is required.");
      setStep(1);
      return;
    }
    if (!formData.description.trim()) {
      toast.error("Job Description is required.");
      setStep(2);
      return;
    }
    if (!formData.deadline) {
      toast.error("Application End Deadline is required.");
      setStep(4);
      return;
    }

    const openingsNum = parseInt(formData.openings?.toString() || "1");
    if (isNaN(openingsNum) || openingsNum < 1 || openingsNum > 999) {
      toast.error("Number of Openings must be between 1 and 999.");
      setStep(1);
      return;
    }

    const startD = new Date(formData.startDate);
    const deadD = new Date(formData.deadline);
    if (isNaN(startD.getTime())) {
      toast.error("Invalid Application Start Date.");
      setStep(4);
      return;
    }
    if (isNaN(deadD.getTime())) {
      toast.error("Invalid Application End Deadline.");
      setStep(4);
      return;
    }
    if (deadD < startD) {
      toast.error("Application End Deadline cannot be before Start Date.");
      setStep(4);
      return;
    }

    if (stages.length < 2) {
      toast.error("Please define at least 2 stages for your recruitment pipeline.");
      setStep(3);
      return;
    }

    setLoading(true);
    try {
      await api.post("/jobs", {
        ...formData,
        salaryRange: formData.salaryRange ? `${formData.salaryCurrency} ${formData.salaryRange}` : "",
        stages: stages.map(s => ({ 
          name: s.name, 
          description: s.description, 
          type: s.type, 
          config: s.config, 
          questions: s.questions
        }))
      });
      toast.success("Job Opportunity published successfully!");
      window.dispatchEvent(new CustomEvent('vega:job-created'));
      window.dispatchEvent(new CustomEvent('vega:pipeline-updated'));
      
      navigate("/company/jobs");
    } catch (err: any) {
      console.error("Job creation error details:", err);
      const serverMessage = err.response?.data?.message || err.message || "Failed to post job.";
      toast.error(`Failed to post job: ${serverMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col bg-slate-50 font-sans">
      <div className="max-w-[1400px] w-full mx-auto px-4 lg:px-6 py-2 flex flex-col min-h-0 flex-1">
        
        {/* Header Navigation */}
        <header className="flex justify-between items-center bg-white p-3.5 px-6 rounded-2xl border border-slate-200 shadow-sm shrink-0 mb-4 z-40">
          <button onClick={handleClose} className="flex items-center gap-2 text-slate-500 hover:text-rose-600 transition-all font-black text-[11px] uppercase tracking-widest cursor-pointer">
            <ChevronLeft size={16} /> Cancel & Exit
          </button>
          
          <div className="flex gap-4 items-center">
            {/* 4-Step Indicator */}
            <div className="flex gap-1.5 sm:gap-2.5 items-center">
              {[
                { num: 1, label: 'Basic Info' },
                { num: 2, label: 'Content' },
                { num: 3, label: 'ATS Workflow' },
                { num: 4, label: 'Review & Publish' }
              ].map(s => (
                <div key={s.num} className="flex items-center">
                   <button 
                     onClick={() => {
                       if (s.num < step) { setStep(s.num); setSubStep(1); }
                       else if (s.num === 2 && validateStep1()) { setStep(2); setSubStep(1); }
                       else if (s.num === 3 && validateStep1() && validateStep2()) { setStep(3); setSubStep(1); }
                       else if (s.num === 4 && validateStep1() && validateStep2() && validateStep3()) { setStep(4); setSubStep(1); }
                     }}
                     className={`h-7 sm:h-8 px-2.5 sm:px-3.5 rounded-xl flex items-center justify-center font-bold text-[10px] sm:text-xs transition-all cursor-pointer ${step === s.num ? 'bg-indigo-600 text-white shadow-md' : step > s.num ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' : 'bg-slate-100 text-slate-400'}`}
                   >
                      <span className="hidden sm:inline mr-1">{s.num}.</span> {s.label}
                   </button>
                   {s.num < 4 && <div className={`w-3 sm:w-5 h-px mx-0.5 sm:mx-1 ${step > s.num ? 'bg-indigo-300' : 'bg-slate-200'}`} />}
                </div>
              ))}
            </div>
            <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer" title="Cancel creation">
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="flex gap-6 items-start flex-1 min-h-0 overflow-hidden">
           
           {/* Main Content Area */}
           <motion.div 
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             className="flex-1 bg-white rounded-[24px] sm:rounded-[28px] border border-slate-200 shadow-xl shadow-indigo-900/5 overflow-hidden flex flex-col h-full"
           >
             {/* Header Banner */}
             <div className="p-5 sm:p-6 px-6 border-b border-slate-100 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50/30 shrink-0 relative overflow-hidden">
               <div className="relative z-10 flex justify-between items-center">
                    <div className="flex gap-4 items-center">
                      <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/20">
                         <Briefcase size={22} />
                      </div>
                      <div>
                         <h1 className="text-lg font-black text-slate-900 tracking-tight">Create Job Requisition</h1>
                         <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                           {step === 1 && "Step 1 of 4 — Basic Information & Role Setup"}
                           {step === 2 && subStep === 1 && "Step 2A of 4 — Posting Destination & Job Description"}
                           {step === 2 && subStep === 2 && "Step 2B of 4 — Key Responsibilities & Qualifications"}
                           {step === 3 && subStep === 1 && "Step 3A of 4 — Pipeline Templates & Initial Stages"}
                           {step === 3 && subStep === 2 && "Step 3B of 4 — Final Stages & Custom Pipeline Builder"}
                           {step === 4 && subStep === 1 && "Step 4A of 4 — AI Screening Rules & Application Dates"}
                           {step === 4 && subStep === 2 && "Step 4B of 4 — Final Requisition Summary & Publish"}
                         </p>
                      </div>
                    </div>
                    <div className="hidden sm:block text-right">
                       <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-100">
                          Step {step}{step > 1 ? (subStep === 1 ? 'A' : 'B') : ''} of 4
                       </span>
                    </div>
               </div>
             </div>

             {/* Dynamic Step Content Container */}
             <div className="p-6 sm:p-8 flex-1 overflow-y-auto scrollbar-thin">
               <AnimatePresence mode="wait">
                 {/* STEP 1: Basic Information */}
                 {step === 1 && (
                   <motion.div key="step1" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <FormGroup label="Job Title" required>
                           <input className={`form-input text-base font-bold ${errors.title ? 'border-rose-500 bg-rose-50/20' : ''}`} placeholder="e.g. Senior Frontend Engineer" value={formData.title} onChange={e => { setFormData({ ...formData, title: e.target.value }); if (errors.title) setErrors(prev => ({ ...prev, title: '' })); }} />
                           {errors.title && <p className="text-rose-500 text-[10px] font-bold mt-1 ml-1">{errors.title}</p>}
                        </FormGroup>

                        <FormGroup label="Location & Workplace" required ref={locationContainerRef}>
                           <div className="relative w-full">
                             <div className="space-y-2 w-full">
                               <div className="relative">
                                 <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" size={16} />
                                 <button
                                   type="button"
                                   onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                                   className={`w-full bg-slate-50 border border-slate-200 rounded-[12px] pl-10 pr-9 py-3 outline-none text-left font-bold text-sm text-slate-800 transition-all hover:bg-slate-100/50 flex items-center justify-between cursor-pointer ${errors.location ? 'border-rose-500 bg-rose-50/20' : ''}`}
                                 >
                                   <span>{LOCATION_OPTIONS.includes(formData.location) ? formData.location : (formData.location ? "Other" : "Select Location")}</span>
                                   <ChevronDown size={16} className={`text-slate-400 transition-transform ${showLocationDropdown ? 'rotate-180' : ''}`} />
                                 </button>
                                 
                                 {showLocationDropdown && (
                                   <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-[12px] shadow-2xl max-h-52 overflow-y-auto z-50 py-1 divide-y divide-slate-50">
                                     {LOCATION_OPTIONS.map(opt => (
                                       <button
                                         key={opt}
                                         type="button"
                                         onClick={() => {
                                           if (opt === "Other") {
                                             setFormData({ ...formData, location: "" });
                                           } else {
                                             setFormData({ ...formData, location: opt });
                                           }
                                           setShowLocationDropdown(false);
                                         }}
                                         className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                                           (formData.location === opt || (opt === "Other" && !LOCATION_OPTIONS.includes(formData.location)))
                                             ? 'bg-indigo-50 text-indigo-600'
                                             : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                         }`}
                                       >
                                         {opt}
                                       </button>
                                     ))}
                                   </div>
                                 )}
                               </div>
                               {(!LOCATION_OPTIONS.includes(formData.location) || formData.location === "") && (
                                 <input 
                                   className="form-input pl-3.5 py-2.5" 
                                   placeholder="Type your custom location..." 
                                   value={formData.location} 
                                   onChange={e => setFormData({ ...formData, location: e.target.value })} 
                                 />
                                )}
                             </div>
                           </div>
                        </FormGroup>

                        <div className="grid grid-cols-2 gap-3">
                            <FormGroup label="Job Type">
                               <select className="form-input appearance-none bg-slate-50 py-3" value={formData.jobType} onChange={e => setFormData({ ...formData, jobType: e.target.value })}>
                                 <option>Full-time</option><option>Internship</option><option>Contract</option>
                               </select>
                            </FormGroup>
                            <FormGroup label="Experience">
                               <select className="form-input appearance-none bg-slate-50 py-3" value={formData.experienceLevel} onChange={e => setFormData({ ...formData, experienceLevel: e.target.value })}>
                                 <option>Fresher (0 yrs)</option><option>Entry (1-3 yrs)</option><option>Mid (3-5 yrs)</option><option>Senior (5+ yrs)</option>
                               </select>
                            </FormGroup>
                        </div>

                        <FormGroup label="Salary Range">
                           <div className="flex gap-2">
                              <select 
                                className="form-input w-24 bg-slate-50 border border-slate-200 rounded-[12px] px-2.5 py-3 outline-none text-xs font-bold text-slate-800 cursor-pointer"
                                value={formData.salaryCurrency}
                                onChange={e => setFormData({ ...formData, salaryCurrency: e.target.value })}
                              >
                                <option value="INR">₹ (INR)</option>
                                <option value="USD">$ (USD)</option>
                                <option value="EUR">€ (EUR)</option>
                                <option value="GBP">£ (GBP)</option>
                              </select>
                              <input className="form-input flex-1 py-3" placeholder="e.g. 8,00,000 - 12,00,000" value={formData.salaryRange} onChange={e => setFormData({ ...formData, salaryRange: e.target.value })} />
                            </div>
                        </FormGroup>

                        <FormGroup label="Number of Openings" required>
                            <input 
                              type="number" 
                              min="1" 
                              max="999" 
                              className={`form-input py-3 ${errors.openings ? 'border-rose-500 bg-rose-50/20' : ''}`}
                              placeholder="e.g. 5" 
                              value={formData.openings} 
                              onChange={e => setFormData({ ...formData, openings: parseInt(e.target.value) || 1 })} 
                            />
                            {errors.openings && <p className="text-rose-500 text-[10px] font-bold mt-1 ml-1">{errors.openings}</p>}
                        </FormGroup>
                      </div>

                      <div className="h-px bg-slate-100 my-4" />

                      <FormGroup label="Required Skills">
                         <div className="flex gap-2.5 mb-3 items-stretch relative">
                           <div className="relative flex-1" ref={skillsContainerRef}>
                             <input 
                               className="w-full p-3.5 text-xs rounded-[14px] border border-slate-200 bg-white focus:border-indigo-400 focus:ring-indigo-500/10 outline-none focus:ring-4 transition-all shadow-sm" 
                               placeholder="Type skill and press enter..." 
                               value={formData.skillInput} 
                               onChange={e => {
                                 setFormData({ ...formData, skillInput: e.target.value });
                                 setShowSkillsDropdown(true);
                                 setSkillsActiveIndex(-1);
                               }} 
                               onFocus={() => setShowSkillsDropdown(true)}
                               onKeyDown={(e: any) => {
                                 const filteredList = PREDEFINED_SKILLS.filter(skill => {
                                   const isAlreadySelected = formData.skills.some(s => s.toLowerCase() === skill.toLowerCase());
                                   if (isAlreadySelected) return false;
                                   if (!e.target.value) return true;
                                   return skill.toLowerCase().includes(e.target.value.toLowerCase());
                                 });

                                 if (e.key === 'ArrowDown') {
                                   e.preventDefault();
                                   if (!showSkillsDropdown) {
                                     setShowSkillsDropdown(true);
                                     setSkillsActiveIndex(0);
                                   } else {
                                     setSkillsActiveIndex(prev => 
                                       prev < filteredList.length - 1 ? prev + 1 : prev
                                     );
                                   }
                                 } else if (e.key === 'ArrowUp') {
                                   e.preventDefault();
                                   if (showSkillsDropdown) {
                                     setSkillsActiveIndex(prev => prev > 0 ? prev - 1 : 0);
                                   }
                                 } else if (e.key === 'Enter') {
                                   e.preventDefault();
                                   if (showSkillsDropdown && skillsActiveIndex >= 0 && skillsActiveIndex < filteredList.length) {
                                     const selected = filteredList[skillsActiveIndex];
                                     if (!formData.skills.includes(selected)) {
                                       setFormData(prev => ({
                                         ...prev,
                                         skills: [...prev.skills, selected],
                                         skillInput: ""
                                       }));
                                     }
                                     setShowSkillsDropdown(false);
                                     setSkillsActiveIndex(-1);
                                   } else if (formData.skillInput.trim()) {
                                     const val = formData.skillInput.trim();
                                     if (!formData.skills.includes(val)) {
                                       setFormData(prev => ({
                                         ...prev,
                                         skills: [...prev.skills, val],
                                         skillInput: ""
                                       }));
                                     }
                                     setShowSkillsDropdown(false);
                                     setSkillsActiveIndex(-1);
                                   }
                                 } else if (e.key === 'Escape') {
                                   setShowSkillsDropdown(false);
                                   setSkillsActiveIndex(-1);
                                 }
                               }}
                             />
                             {showSkillsDropdown && (
                               (() => {
                                 const filteredList = PREDEFINED_SKILLS.filter(skill => {
                                   const isAlreadySelected = formData.skills.some(s => s.toLowerCase() === skill.toLowerCase());
                                   if (isAlreadySelected) return false;
                                   if (!formData.skillInput) return true;
                                   return skill.toLowerCase().includes(formData.skillInput.toLowerCase());
                                 });

                                 if (filteredList.length === 0) return null;

                                 return (
                                   <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-[14px] shadow-2xl max-h-40 overflow-y-auto z-50 py-1 divide-y divide-slate-50">
                                     {filteredList.map((skill, idx) => (
                                       <button
                                         key={skill}
                                         type="button"
                                         onClick={() => {
                                           if (!formData.skills.includes(skill)) {
                                             setFormData(prev => ({
                                               ...prev,
                                               skills: [...prev.skills, skill],
                                               skillInput: ""
                                             }));
                                           }
                                           setShowSkillsDropdown(false);
                                           setSkillsActiveIndex(-1);
                                         }}
                                         className={`w-full text-left px-4 py-2 text-[11px] font-bold transition-all flex items-center justify-between cursor-pointer uppercase tracking-wider ${
                                           idx === skillsActiveIndex 
                                             ? 'bg-indigo-50 text-indigo-600' 
                                             : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                         }`}
                                       >
                                         <span>{skill}</span>
                                         {idx === skillsActiveIndex && <span className="text-[9px] font-black uppercase text-indigo-400">Enter</span>}
                                       </button>
                                     ))}
                                   </div>
                                 );
                               })()
                             )}
                           </div>
                           <button onClick={handleAddSkill} className="px-5 bg-slate-100 text-slate-700 rounded-[14px] font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200 shadow-sm cursor-pointer">Add</button>
                           <button onClick={autoSuggestSkills} className="px-5 bg-indigo-50 text-indigo-700 rounded-[14px] font-black text-[10px] uppercase tracking-widest hover:bg-indigo-100 transition-all border border-indigo-200 shadow-sm flex items-center gap-1.5 cursor-pointer">
                               <Sparkles size={13}/> AI Suggest
                           </button>
                         </div>
                         <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                           {formData.skills.map(s => (
                             <span key={s} className="px-2.5 py-1 bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm">
                               {s} <button onClick={() => removeSkill(s)} className="text-slate-400 hover:text-white"><X size={12} /></button>
                             </span>
                           ))}
                           {formData.skills.length === 0 && <span className="text-xs text-slate-400 font-bold px-1 py-0.5">No skills added yet.</span>}
                         </div>
                      </FormGroup>

                      <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                         <button onClick={handleClose} className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all cursor-pointer">
                           Cancel
                         </button>
                         <button onClick={() => { if (validateStep1()) { setStep(2); setSubStep(1); } }} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center gap-2 cursor-pointer">
                           Next: Content (Destination & Description) <ArrowRight size={14} />
                         </button>
                      </div>
                   </motion.div>
                 )}

                 {/* STEP 2: Content & Posting Destination */}
                 {step === 2 && (
                   <motion.div key={`step2-${subStep}`} initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }} className="space-y-5">
                      
                      {/* Step 2A: Posting Destination + Job Description */}
                      {subStep === 1 && (
                        <>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                              <Zap size={12} className="text-indigo-500 animate-pulse" /> Posting Destination
                            </label>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div 
                                onClick={() => setFormData({ ...formData, publishDestination: 'JOB_ONLY' })}
                                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                                  formData.publishDestination === 'JOB_ONLY'
                                    ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                                    : 'bg-white border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <div>
                                  <div className="flex justify-between items-center mb-1">
                                    <h4 className="text-xs font-black uppercase tracking-tight">Job Section Only</h4>
                                    <div className={`w-4 h-4 rounded-full flex items-center justify-center border ${
                                      formData.publishDestination === 'JOB_ONLY' ? 'border-indigo-400 bg-indigo-500 text-white' : 'border-slate-300'
                                    }`}>
                                      {formData.publishDestination === 'JOB_ONLY' && <CheckCircle size={10} className="text-white" />}
                                    </div>
                                  </div>
                                  <p className={`text-[11px] font-medium ${formData.publishDestination === 'JOB_ONLY' ? 'text-slate-300' : 'text-slate-500'}`}>
                                    Post as a regular job listing.
                                  </p>
                                </div>
                                <span className={`text-[9px] font-bold uppercase tracking-widest mt-2 block ${formData.publishDestination === 'JOB_ONLY' ? 'text-indigo-400' : 'text-indigo-600'}`}>
                                  Standard Reach
                                </span>
                              </div>

                              <div 
                                onClick={() => setFormData({ ...formData, publishDestination: 'JOB_AND_DROPS' })}
                                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                                  formData.publishDestination === 'JOB_AND_DROPS'
                                    ? 'bg-indigo-950 border-indigo-500 text-white shadow-md'
                                    : 'bg-white border-slate-200 hover:border-slate-300'
                                 }`}
                               >
                                <div>
                                  <div className="flex justify-between items-center mb-1">
                                    <h4 className="text-xs font-black uppercase tracking-tight">Job Section + Drops Section</h4>
                                    <div className={`w-4 h-4 rounded-full flex items-center justify-center border ${
                                      formData.publishDestination === 'JOB_AND_DROPS' ? 'border-indigo-400 bg-indigo-500 text-white' : 'border-slate-300'
                                    }`}>
                                      {formData.publishDestination === 'JOB_AND_DROPS' && <CheckCircle size={10} className="text-white" />}
                                    </div>
                                  </div>
                                  <p className={`text-[11px] font-medium ${formData.publishDestination === 'JOB_AND_DROPS' ? 'text-slate-300' : 'text-slate-500'}`}>
                                    Also promote this job as a drop/update for better reach.
                                  </p>
                                </div>
                                <span className={`text-[9px] font-bold uppercase tracking-widest mt-2 block ${formData.publishDestination === 'JOB_AND_DROPS' ? 'text-indigo-400' : 'text-indigo-600'}`}>
                                  🔥 Maximum Reach & Exposure
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="h-px bg-slate-100 my-2" />

                          <div className="relative group flex flex-col">
                              <div className="flex justify-between items-end mb-2">
                                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                    <Briefcase size={12}/> Job Description <span className="text-rose-500">*</span>
                                 </label>
                                 <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-bold text-slate-400">
                                      {formData.description.length}/2000
                                    </span>
                                    <button 
                                       onClick={() => generateWithAI('description')}
                                       disabled={!!isGeneratingAI}
                                       className="text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md flex items-center gap-1 border border-indigo-100 disabled:opacity-50 cursor-pointer"
                                    >
                                       {isGeneratingAI === 'description' ? <><BrainCircuit size={10} className="animate-pulse" /> AI...</> : <><Sparkles size={10} /> Auto-Draft AI</>}
                                    </button>
                                 </div>
                              </div>
                              <textarea 
                                maxLength={2000}
                                className={`w-full h-48 sm:h-56 p-4 text-xs leading-relaxed rounded-[16px] border ${errors.description ? 'border-rose-500 bg-rose-50/10 focus:ring-rose-500/15' : 'border-slate-200 bg-white focus:border-indigo-400 focus:ring-indigo-500/10'} outline-none focus:ring-2 transition-all shadow-sm`}
                                placeholder="Enter job description... Minimum 50 characters required."
                                value={formData.description}
                                onChange={e => {
                                  setFormData({ ...formData, description: e.target.value });
                                  if (errors.description) setErrors(prev => ({ ...prev, description: '' }));
                                }}
                              />
                              {errors.description && <p className="text-rose-500 text-[10px] font-bold mt-1 ml-1">{errors.description}</p>}
                          </div>

                          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                             <button onClick={() => { setStep(1); setSubStep(1); }} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all cursor-pointer">
                               Back
                             </button>
                             <button onClick={() => { if (validateStep2A()) setSubStep(2); }} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center gap-2 cursor-pointer">
                               Next: Responsibilities & Qualifications <ArrowRight size={14} />
                             </button>
                          </div>
                        </>
                      )}

                      {/* Step 2B: Responsibilities & Qualifications */}
                      {subStep === 2 && (
                        <>
                          <div className="space-y-4">
                            {[
                               { id: 'responsibilities', label: 'Key Responsibilities', icon: Target, height: 'h-36 sm:h-40' },
                               { id: 'qualifications', label: 'Qualifications', icon: GraduationCap, height: 'h-36 sm:h-40' },
                            ].map(field => (
                                <div key={field.id} className="relative group flex flex-col">
                                    <div className="flex justify-between items-end mb-1.5">
                                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                          <field.icon size={12}/> {field.label}
                                       </label>
                                       <button 
                                          onClick={() => generateWithAI(field.id as any)}
                                          disabled={!!isGeneratingAI}
                                          className="text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md flex items-center gap-1 border border-indigo-100 disabled:opacity-50 cursor-pointer"
                                       >
                                          {isGeneratingAI === field.id ? <><BrainCircuit size={10} className="animate-pulse" /> AI...</> : <><Sparkles size={10} /> Auto-Draft AI</>}
                                       </button>
                                    </div>
                                    <textarea 
                                      className={`w-full ${field.height} p-3.5 text-xs leading-relaxed rounded-[14px] border border-slate-200 bg-white focus:border-indigo-400 focus:ring-indigo-500/10 outline-none focus:ring-2 transition-all shadow-sm`}
                                      placeholder={`Enter ${field.label.toLowerCase()}...`}
                                      value={(formData as any)[field.id]}
                                      onChange={e => setFormData({ ...formData, [field.id]: e.target.value })}
                                    />
                                </div>
                            ))}
                          </div>

                          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                             <button onClick={() => setSubStep(1)} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all cursor-pointer">
                               Back
                             </button>
                             <button onClick={() => { if (validateStep2()) { setStep(3); setSubStep(1); } }} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center gap-2 cursor-pointer">
                               Continue to ATS Workflow <ArrowRight size={14} />
                             </button>
                          </div>
                        </>
                      )}
                   </motion.div>
                 )}

                 {/* STEP 3: ATS Workflow Builder */}
                 {step === 3 && (
                   <motion.div key={`step3-${subStep}`} initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }} className="space-y-5">
                      
                      {/* Step 3A: Pipeline Templates & First Stage Group */}
                      {subStep === 1 && (
                        <>
                          <div className="flex justify-between items-center bg-slate-900 rounded-[16px] p-4 text-white shadow-md">
                             <div>
                                <h3 className="text-sm font-black tracking-tight flex items-center gap-2">Custom Hiring Pipeline (Part 1) <LayoutGrid size={16} className="text-indigo-400"/></h3>
                                <p className="text-[10px] text-slate-400 mt-0.5">Design initial stages applicants move through.</p>
                             </div>
                             <div className="flex gap-2">
                                <button onClick={() => loadWorkflowTemplate('engineering')} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold rounded-lg border border-slate-700 transition-colors cursor-pointer">Engineering Template</button>
                                <button onClick={() => loadWorkflowTemplate('campus')} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold rounded-lg border border-slate-700 transition-colors cursor-pointer">Campus Template</button>
                             </div>
                          </div>
                          
                          <div className="space-y-3">
                            {stages.slice(0, 3).map((stage, index) => (
                              <div key={index} className="flex gap-3 items-start group">
                                <div className="flex flex-col items-center mt-1.5 relative z-10 shrink-0">
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-[11px] shadow-sm ${stage.name.includes('Selected') ? 'bg-emerald-500 text-white' : 'bg-white border-2 border-slate-200 text-slate-500'}`}>
                                    {index + 1}
                                  </div>
                                  {index < Math.min(3, stages.length) - 1 && <div className="absolute top-7 bottom-[-20px] w-[2px] bg-slate-200 -z-10" />}
                                </div>
                                
                                <div className={`flex-1 bg-white p-3.5 rounded-[16px] border shadow-sm transition-all ${stage.name.includes('Selected') ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 hover:border-indigo-300'}`}>
                                   <div className="flex justify-between items-center gap-2 mb-2">
                                      <div className="flex-1 flex gap-2 items-center min-w-0">
                                        <input 
                                          className="bg-transparent border-none outline-none font-black text-slate-800 uppercase tracking-tight text-xs flex-1 p-0 focus:ring-0 truncate"
                                          value={stage.name}
                                          disabled={!stage.canDelete}
                                          onChange={e => {
                                             const newStages = [...stages];
                                             newStages[index].name = e.target.value;
                                             setStages(newStages);
                                          }}
                                        />
                                        <select 
                                          className="bg-slate-100 border border-slate-200 outline-none text-[9px] font-black uppercase text-slate-600 rounded px-2 py-1 cursor-pointer shrink-0"
                                          value={stage.type}
                                          onChange={e => {
                                             const newStages = [...stages];
                                             newStages[index].type = e.target.value;
                                             setStages(newStages);
                                          }}
                                          disabled={!stage.canDelete}
                                        >
                                          <option value="APPLICATION">Resume Review</option>
                                          <option value="TEST">Skill Assessment</option>
                                          <option value="INTERVIEW_ONLINE">Video Interview</option>
                                          <option value="INTERVIEW_OFFLINE">In-Person Interview</option>
                                        </select>
                                      </div>
                                      {stage.canDelete && (
                                        <button onClick={() => setStages(stages.filter((_, i) => i !== index))} className="w-6 h-6 rounded-full bg-slate-50 hover:bg-rose-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors shrink-0 cursor-pointer">
                                          <X size={12} />
                                        </button>
                                      )}
                                   </div>
                                   
                                   <input 
                                      className="w-full bg-slate-50 border border-slate-200 outline-none text-xs text-slate-600 px-3 py-1.5 rounded-lg focus:bg-white focus:border-indigo-300 transition-colors"
                                      placeholder="Stage instructions or description for recruiters..."
                                      value={stage.description}
                                      onChange={e => {
                                         const newStages = [...stages];
                                         newStages[index].description = e.target.value;
                                         setStages(newStages);
                                      }}
                                   />

                                   {stage.type === 'TEST' && (
                                      <div className="mt-2.5 bg-indigo-50/80 p-2.5 rounded-lg border border-indigo-100 flex flex-wrap gap-3 items-center justify-between">
                                          <div className="flex gap-3 items-center">
                                             <div>
                                                <span className="block text-[8px] font-black text-indigo-500 uppercase tracking-widest mb-0.5">Duration (m)</span>
                                                <input type="number" className="w-16 h-7 bg-white border border-indigo-200 rounded px-2 py-1 text-xs font-bold text-indigo-900 focus:outline-none" value={stage.config.duration || 45} onChange={e => { const s=[...stages]; s[index].config.duration=Number(e.target.value); setStages(s); }} />
                                             </div>
                                             <div>
                                                <span className="block text-[8px] font-black text-indigo-500 uppercase tracking-widest mb-0.5">Pass %</span>
                                                <input type="number" className="w-16 h-7 bg-white border border-indigo-200 rounded px-2 py-1 text-xs font-bold text-indigo-900 focus:outline-none" value={stage.config.passScore || 70} onChange={e => { const s=[...stages]; s[index].config.passScore=Number(e.target.value); setStages(s); }} />
                                             </div>
                                          </div>
                                          <button onClick={() => setQuestionEditorStage(stage.id)} className="px-3 h-7 bg-white text-indigo-600 text-[9px] font-black uppercase tracking-widest rounded border border-indigo-200 shadow-sm hover:bg-indigo-600 hover:text-white transition-all cursor-pointer">
                                             Configure Test ({stage.questions?.length || 0} Qs)
                                          </button>
                                      </div>
                                   )}
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                             <button onClick={() => { setStep(2); setSubStep(2); }} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all cursor-pointer">Back</button>
                             <button onClick={() => setSubStep(2)} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center gap-2 cursor-pointer">
                               Next: Remaining Pipeline Stages ({Math.max(0, stages.length - 3)} remaining) <ArrowRight size={14} />
                             </button>
                          </div>
                        </>
                      )}

                      {/* Step 3B: Remaining Stages & Add Stage */}
                      {subStep === 2 && (
                        <>
                          <div className="flex justify-between items-center bg-slate-900 rounded-[16px] p-4 text-white shadow-md">
                             <div>
                                <h3 className="text-sm font-black tracking-tight flex items-center gap-2">Custom Hiring Pipeline (Part 2) <LayoutGrid size={16} className="text-indigo-400"/></h3>
                                <p className="text-[10px] text-slate-400 mt-0.5">Configure remaining interview rounds and add custom stages.</p>
                             </div>
                             <span className="px-3 py-1 bg-indigo-900/60 text-indigo-300 text-[10px] font-bold rounded-lg border border-indigo-700/50">
                                Total: {stages.length} Stages
                             </span>
                          </div>

                          <div className="space-y-3">
                            {stages.slice(3).map((stage, actualIndex) => {
                              const index = actualIndex + 3;
                              return (
                                <div key={index} className="flex gap-3 items-start group">
                                  <div className="flex flex-col items-center mt-1.5 relative z-10 shrink-0">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-[11px] shadow-sm ${stage.name.includes('Selected') ? 'bg-emerald-500 text-white' : 'bg-white border-2 border-slate-200 text-slate-500'}`}>
                                      {index + 1}
                                    </div>
                                    {index < stages.length - 1 && <div className="absolute top-7 bottom-[-20px] w-[2px] bg-slate-200 -z-10" />}
                                  </div>
                                  
                                  <div className={`flex-1 bg-white p-3.5 rounded-[16px] border shadow-sm transition-all ${stage.name.includes('Selected') ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 hover:border-indigo-300'}`}>
                                     <div className="flex justify-between items-center gap-2 mb-2">
                                        <div className="flex-1 flex gap-2 items-center min-w-0">
                                          <input 
                                            className="bg-transparent border-none outline-none font-black text-slate-800 uppercase tracking-tight text-xs flex-1 p-0 focus:ring-0 truncate"
                                            value={stage.name}
                                            disabled={!stage.canDelete}
                                            onChange={e => {
                                               const newStages = [...stages];
                                               newStages[index].name = e.target.value;
                                               setStages(newStages);
                                            }}
                                          />
                                          <select 
                                            className="bg-slate-100 border border-slate-200 outline-none text-[9px] font-black uppercase text-slate-600 rounded px-2 py-1 cursor-pointer shrink-0"
                                            value={stage.type}
                                            onChange={e => {
                                               const newStages = [...stages];
                                               newStages[index].type = e.target.value;
                                               setStages(newStages);
                                            }}
                                            disabled={!stage.canDelete}
                                          >
                                            <option value="APPLICATION">Resume Review</option>
                                            <option value="TEST">Skill Assessment</option>
                                            <option value="INTERVIEW_ONLINE">Video Interview</option>
                                            <option value="INTERVIEW_OFFLINE">In-Person Interview</option>
                                          </select>
                                        </div>
                                        {stage.canDelete && (
                                          <button onClick={() => setStages(stages.filter((_, i) => i !== index))} className="w-6 h-6 rounded-full bg-slate-50 hover:bg-rose-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors shrink-0 cursor-pointer">
                                            <X size={12} />
                                          </button>
                                        )}
                                     </div>
                                     
                                     <input 
                                        className="w-full bg-slate-50 border border-slate-200 outline-none text-xs text-slate-600 px-3 py-1.5 rounded-lg focus:bg-white focus:border-indigo-300 transition-colors"
                                        placeholder="Stage instructions or description for recruiters..."
                                        value={stage.description}
                                        onChange={e => {
                                           const newStages = [...stages];
                                           newStages[index].description = e.target.value;
                                           setStages(newStages);
                                        }}
                                     />

                                     {stage.type === 'TEST' && (
                                        <div className="mt-2.5 bg-indigo-50/80 p-2.5 rounded-lg border border-indigo-100 flex flex-wrap gap-3 items-center justify-between">
                                            <div className="flex gap-3 items-center">
                                               <div>
                                                  <span className="block text-[8px] font-black text-indigo-500 uppercase tracking-widest mb-0.5">Duration (m)</span>
                                                  <input type="number" className="w-16 h-7 bg-white border border-indigo-200 rounded px-2 py-1 text-xs font-bold text-indigo-900 focus:outline-none" value={stage.config.duration || 45} onChange={e => { const s=[...stages]; s[index].config.duration=Number(e.target.value); setStages(s); }} />
                                               </div>
                                               <div>
                                                  <span className="block text-[8px] font-black text-indigo-500 uppercase tracking-widest mb-0.5">Pass %</span>
                                                  <input type="number" className="w-16 h-7 bg-white border border-indigo-200 rounded px-2 py-1 text-xs font-bold text-indigo-900 focus:outline-none" value={stage.config.passScore || 70} onChange={e => { const s=[...stages]; s[index].config.passScore=Number(e.target.value); setStages(s); }} />
                                               </div>
                                            </div>
                                            <button onClick={() => setQuestionEditorStage(stage.id)} className="px-3 h-7 bg-white text-indigo-600 text-[9px] font-black uppercase tracking-widest rounded border border-indigo-200 shadow-sm hover:bg-indigo-600 hover:text-white transition-all cursor-pointer">
                                               Configure Test ({stage.questions?.length || 0} Qs)
                                            </button>
                                        </div>
                                     )}
                                  </div>
                                </div>
                              );
                            })}

                            {stages.length < 4 && (
                              <p className="text-xs text-slate-400 italic text-center py-2">
                                All primary stages are configured in Part 1. You can add extra pipeline stages below.
                              </p>
                            )}

                            <div className="pl-10 pt-1">
                               <button onClick={addStage} className="w-full py-2.5 border-2 border-dashed border-slate-300 rounded-[14px] text-slate-500 flex items-center justify-center gap-2 hover:bg-slate-50 hover:border-indigo-300 hover:text-indigo-600 transition-all font-black uppercase text-[10px] tracking-widest cursor-pointer">
                                 <Plus size={14} /> Add Pipeline Stage
                               </button>
                            </div>
                          </div>

                          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                             <button onClick={() => setSubStep(1)} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all cursor-pointer">Back</button>
                             <button onClick={() => { if (validateStep3()) { setStep(4); setSubStep(1); } }} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center gap-2 cursor-pointer">
                               Next: Review & Publish <ArrowRight size={14} />
                             </button>
                          </div>
                        </>
                      )}
                   </motion.div>
                 )}

                 {/* STEP 4: Review, Rules & Publish */}
                 {step === 4 && (
                   <motion.div key={`step4-${subStep}`} initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }} className="space-y-5">
                      
                      {/* Step 4A: AI Screening Rules, Application Dates & Notes */}
                      {subStep === 1 && (
                        <>
                          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-[18px] p-5 text-white relative overflow-hidden shadow-md">
                             <div className="relative z-10">
                                <h3 className="text-sm font-black uppercase tracking-tight mb-1 flex items-center gap-2"><BrainCircuit className="text-indigo-400" size={16} /> AI Applicant Screening Rules</h3>
                                <p className="text-xs text-indigo-200/80 mb-3">
                                   Set screening criteria for automated AI match scoring.
                                </p>

                                <div className="bg-white/10 p-4 rounded-xl border border-white/10">
                                   <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs font-bold text-white">Minimum AI Match Cutoff</span>
                                      <div className="bg-indigo-950 px-2.5 py-1 rounded-lg text-center font-black text-sm text-indigo-300 border border-indigo-800">{formData.aiMatchCutoff}%</div>
                                   </div>
                                   <input type="range" min="0" max="100" step="5" value={formData.aiMatchCutoff} onChange={e=>setFormData({...formData, aiMatchCutoff: Number(e.target.value)})} className="w-full accent-indigo-500 mb-3 cursor-pointer" />

                                   <label className="flex items-center gap-2.5 cursor-pointer">
                                      <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${formData.autoReject ? 'bg-indigo-500' : 'bg-slate-700/50 border border-slate-600'}`}>
                                         {formData.autoReject && <CheckCircle size={12} className="text-white" />}
                                      </div>
                                      <span className="text-xs font-bold text-white">Auto-Reject candidates below {formData.aiMatchCutoff}% match</span>
                                      <input type="checkbox" className="hidden" checked={formData.autoReject} onChange={(e) => setFormData({...formData, autoReject: e.target.checked})} />
                                   </label>
                                </div>
                             </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormGroup label="Start Accepting Applications">
                               <div className="relative">
                                 <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                                 <input type="date" className="form-input pl-10 py-2.5" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
                               </div>
                            </FormGroup>
                            <FormGroup label="Application End Deadline" required>
                               <div className="relative">
                                 <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-rose-400" size={15} />
                                 <input type="date" className="form-input pl-10 py-2.5 border-rose-200 bg-rose-50/30 text-rose-900 focus:ring-rose-100" value={formData.deadline} onChange={e => setFormData({ ...formData, deadline: e.target.value })} />
                               </div>
                            </FormGroup>
                          </div>

                          <FormGroup label="Internal Recruiter Notes (Private)">
                             <textarea className="form-input bg-slate-50 h-16 py-2.5 text-xs resize-none" placeholder="Budget info, fast-track rules, or internal notes..." value={formData.additionalNotes} onChange={e => setFormData({ ...formData, additionalNotes: e.target.value })} />
                          </FormGroup>

                          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                             <button onClick={() => { setStep(3); setSubStep(2); }} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all cursor-pointer">Back</button>
                             <button onClick={() => setSubStep(2)} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center gap-2 cursor-pointer">
                               Next: Final Review & Publish <ArrowRight size={14} />
                             </button>
                          </div>
                        </>
                      )}

                      {/* Step 4B: Requisition Review & Publish */}
                      {subStep === 2 && (
                        <>
                          <div className="p-5 bg-gradient-to-br from-slate-900 to-indigo-950 border border-slate-800 rounded-[20px] text-white shadow-lg space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                              <div>
                                <h3 className="font-black text-sm uppercase tracking-wider text-indigo-300">Requisition Summary Review</h3>
                                <p className="text-[11px] text-slate-400 mt-0.5">Please verify details before publishing your job opportunity.</p>
                              </div>
                              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-widest rounded-full">
                                Ready to Publish
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                               <div className="bg-white/5 p-3 rounded-xl border border-white/5"><span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Role Title</span> <strong className="text-white text-xs">{formData.title || 'Untitled'}</strong></div>
                               <div className="bg-white/5 p-3 rounded-xl border border-white/5"><span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Location</span> <strong className="text-white text-xs">{formData.location}</strong></div>
                               <div className="bg-white/5 p-3 rounded-xl border border-white/5"><span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Openings</span> <strong className="text-indigo-300 text-xs">{formData.openings} Openings</strong></div>
                               <div className="bg-white/5 p-3 rounded-xl border border-white/5"><span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Pipeline</span> <strong className="text-emerald-400 text-xs">{stages.length} Stages</strong></div>
                            </div>

                            <div className="bg-white/5 p-3.5 rounded-xl border border-white/5 space-y-2 text-xs">
                              <div className="flex justify-between text-slate-300">
                                <span>Posting Destination:</span>
                                <strong className="text-white">{formData.publishDestination === 'JOB_AND_DROPS' ? 'Job Section + Drops Section' : 'Job Section Only'}</strong>
                              </div>
                              <div className="flex justify-between text-slate-300">
                                <span>Salary / Compensation:</span>
                                <strong className="text-white">{formData.salaryRange ? `${formData.salaryCurrency} ${formData.salaryRange}` : 'Not disclosed'}</strong>
                              </div>
                              <div className="flex justify-between text-slate-300">
                                <span>AI Cutoff & Auto-Reject:</span>
                                <strong className="text-white">{formData.aiMatchCutoff}% {formData.autoReject ? '(Auto-Reject Active)' : '(Manual Review)'}</strong>
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                             <button onClick={() => setSubStep(1)} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all cursor-pointer">Back</button>
                             <button 
                               onClick={handleSubmit} 
                               disabled={loading}
                               className="px-10 py-3 bg-emerald-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:bg-slate-300 disabled:shadow-none cursor-pointer"
                             >
                               {loading ? 'Publishing...' : 'Publish Job & Go Live'} <CheckCircle size={14} />
                             </button>
                          </div>
                        </>
                      )}

                   </motion.div>
                 )}
               </AnimatePresence>
             </div>
           </motion.div>
           
           {/* Summary Side Panel */}
           <div className="w-[300px] shrink-0 space-y-4 hidden lg:flex flex-col h-full overflow-y-auto">
              <div className="bg-white rounded-[20px] border border-slate-200 p-5 shadow-sm">
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 border-b border-slate-100 pb-2">Draft Summary</h4>
                 <div className="space-y-3">
                    <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase mb-0.5">Job Title</span>
                        <span className="text-xs font-extrabold text-slate-900 tracking-tight block truncate">{formData.title || 'Not specified'}</span>
                    </div>
                    <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase mb-0.5">Location & Type</span>
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1"><MapPin size={12} className="text-slate-400"/> {formData.location} • {formData.jobType}</span>
                    </div>
                    <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase mb-0.5">Openings</span>
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 inline-block">{formData.openings} {formData.openings === 1 ? 'Opening' : 'Openings'}</span>
                    </div>
                    <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase mb-0.5">Pipeline Stages</span>
                        <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block">{stages.length} Stages</span>
                    </div>
                    {formData.skills.length > 0 && (
                      <div>
                          <span className="text-[10px] text-slate-400 font-bold block uppercase mb-1">Skills</span>
                          <div className="flex flex-wrap gap-1">
                            {formData.skills.slice(0, 5).map(s => (
                              <span key={s} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded">{s}</span>
                            ))}
                            {formData.skills.length > 5 && (
                              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded">+{formData.skills.length - 5}</span>
                            )}
                          </div>
                      </div>
                    )}
                 </div>
              </div>

              <div className="bg-indigo-50/80 border border-indigo-100 rounded-[20px] p-5 text-indigo-900">
                 <div className="flex gap-2.5 mb-2 text-indigo-600 items-center">
                    <ShieldCheck size={20} />
                    <h4 className="font-black text-xs uppercase tracking-tight">Enterprise Grade ATS</h4>
                 </div>
                 <p className="text-[11px] font-medium leading-relaxed opacity-80 mb-3">
                    Automatic AI screening and candidate matching will be active upon launch.
                 </p>
                 <div className="flex items-center gap-2 text-[9px] font-black uppercase text-indigo-600 tracking-widest bg-white/80 px-2.5 py-1.5 rounded-lg border border-indigo-200">
                    STATUS: {profile?.status === 'APPROVED' ? 'READY' : 'PENDING'}
                 </div>
              </div>
           </div>
        </div>

      </div>

      {questionEditorStage !== null && (
         <QuestionEditor 
            stage={stages.find(s => s.id === questionEditorStage)!}
            onClose={() => setQuestionEditorStage(null)}
            onSave={(questions) => {
               const newStages = [...stages];
               const idx = newStages.findIndex(s => s.id === questionEditorStage);
               newStages[idx].questions = questions;
               setStages(newStages);
               setQuestionEditorStage(null);
            }}
         />
      )}

      <style>{`
        .form-input {
          @apply w-full bg-slate-50 border border-slate-200 rounded-[14px] px-4 py-3.5 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 text-sm font-bold text-slate-800 transition-all hover:bg-slate-100/50;
        }
        .form-input::placeholder {
          @apply text-slate-400 font-medium;
        }
      `}</style>
    </div>
  );
}

function QuestionEditor({ stage, onClose, onSave }: { stage: any, onClose: () => void, onSave: (q: any[]) => void }) {
  const [questions, setQuestions] = useState<any[]>(stage.questions || []);
  const [activeTab, setActiveTab] = useState<'MANUAL' | 'BULK' | 'AI'>('MANUAL');
  
  // Bulk Import State
  const [bulkText, setBulkText] = useState("");
  
  // AI Generator State
  const [aiTopic, setAiTopic] = useState("");
  const [aiCount, setAiCount] = useState(5);
  const [aiDifficulty, setAiDifficulty] = useState("Intermediate");
  const [isGenerating, setIsGenerating] = useState(false);

  const processBulkImport = () => {
     if (!bulkText.trim()) return toast.error("Please paste data first");
     const lines = bulkText.split('\n');
     const parsed = lines.map(line => {
        const parts = line.split('\t'); // TSV from Google Sheets/Excel
        if (parts.length >= 5) { // Q, Opt1, Opt2, Opt3, Opt4, Correct
            const qText = parts[0].trim();
            const opts = [parts[1]?.trim()||"", parts[2]?.trim()||"", parts[3]?.trim()||"", parts[4]?.trim()||""];
            const correctOpt = parts[5]?.trim() || opts[0]; // fallback
            if (qText) {
                return { text: qText, options: opts, correctAnswer: correctOpt };
            }
        } else if (parts.length >= 2) {
            // simpler format: Q, Answer
            return { text: parts[0].trim(), options: [parts[1].trim(), "False", "Other", "None"], correctAnswer: parts[1].trim() };
        }
        return null;
     }).filter(q => q !== null);
     
     if (parsed.length > 0) {
        setQuestions([...questions, ...parsed]);
        setBulkText("");
        setActiveTab('MANUAL');
        toast.success(`Successfully imported ${parsed.length} questions`);
     } else {
        toast.error("Could not parse data. Ensure it's tab-separated (pasted from Excel).");
     }
  };

  const processAIGeneration = async () => {
      if (!aiTopic) return toast.error("Please enter a topic");
      setIsGenerating(true);
      await new Promise(r => setTimeout(r, 2000)); // simulate AI
      
      const newQs = Array.from({ length: aiCount }).map((_, i) => ({
          text: `Sample ${aiDifficulty} question about ${aiTopic} #${i+1}?`,
          options: ["Option A", "Option B", "Option C", "Option D"],
          correctAnswer: "Option B"
      }));
      setQuestions([...questions, ...newQs]);
      setIsGenerating(false);
      setActiveTab('MANUAL');
      toast.success(`Generated ${aiCount} AI questions!`);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
       <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={onClose} />
       <motion.div 
         initial={{ opacity: 0, scale: 0.95, y: 20 }}
         animate={{ opacity: 1, scale: 1, y: 0 }}
         exit={{ opacity: 0, scale: 0.95, y: 20 }}
         className="relative w-full max-w-4xl bg-slate-50 rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
       >
         <div className="p-6 bg-white border-b border-slate-200 shrink-0">
            <div className="flex justify-between items-center mb-6">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
                     <Target size={24} />
                  </div>
                  <div>
                     <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Assessment Builder</h2>
                     <p className="text-xs font-bold text-slate-400 tracking-widest uppercase mt-0.5">Stage: {stage.name}</p>
                  </div>
               </div>
               <button onClick={onClose} className="w-10 h-10 rounded-full border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"><X size={18}/></button>
            </div>

            <div className="flex gap-2">
               <button onClick={() => setActiveTab('MANUAL')} className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'MANUAL' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                  Manual Editor ({questions.length})
               </button>
               <button onClick={() => setActiveTab('BULK')} className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'BULK' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                  <Copy size={16} /> Bulk Import (Sheet)
               </button>
               <button onClick={() => setActiveTab('AI')} className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'AI' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                  <Sparkles size={16} /> Generate with AI
               </button>
            </div>
         </div>

         <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/50">
            {activeTab === 'MANUAL' && (
               <div className="space-y-6">
                  {questions.length === 0 && (
                     <div className="text-center py-20 bg-white border border-slate-200 rounded-[24px] border-dashed">
                        <Target size={48} className="mx-auto text-slate-300 mb-4" />
                        <h3 className="text-slate-500 font-bold mb-2">No Questions Added</h3>
                        <p className="text-xs text-slate-400 mb-6">Switch tabs to Bulk Import from Excel or Generate via AI</p>
                        <button onClick={() => setQuestions([...questions, { text: "", options: ["", "", "", ""], correctAnswer: "" }])} className="px-6 py-3 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-100 transition-all shadow-sm">
                           + Add First Question
                        </button>
                     </div>
                  )}

                  {questions.map((q, qIdx) => (
                     <div key={qIdx} className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm relative group transition-all hover:border-indigo-300 focus-within:border-indigo-500 focus-within:shadow-md">
                        <button onClick={() => setQuestions(questions.filter((_, i) => i !== qIdx))} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-50 hover:bg-rose-50 flex items-center justify-center text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 border border-slate-200"><X size={14} /></button>
                        <label className="flex items-center gap-2 text-[10px] font-black uppercase text-indigo-500 mb-3 tracking-widest">
                           <span className="w-5 h-5 rounded bg-indigo-100 flex items-center justify-center text-indigo-700">{qIdx + 1}</span> Question Text
                        </label>
                        <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-800 mb-5 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder-slate-400" value={q.text} onChange={e => {const n=[...questions]; n[qIdx].text=e.target.value; setQuestions(n);}} placeholder="Enter the question properly formatted..." />
                        
                        <div className="grid grid-cols-2 gap-4">
                           {q.options.map((opt: string, oIdx: number) => (
                              <div key={oIdx} className={`p-1.5 rounded-[16px] border-[1.5px] flex items-center gap-3 transition-all ${q.correctAnswer === opt && opt ? 'bg-emerald-50 border-emerald-400 shadow-sm shadow-emerald-500/10' : 'bg-white border-slate-200 hover:border-indigo-200'}`}>
                                 <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center border cursor-pointer transition-colors ${q.correctAnswer === opt && opt ? 'bg-emerald-500 border-emerald-600 text-white shadow-inner' : 'bg-slate-50 border-slate-300 text-slate-400'}`} onClick={() => {const n=[...questions]; n[qIdx].correctAnswer=opt; setQuestions(n);}}>
                                    {q.correctAnswer === opt && opt ? <CheckCircle size={18} className="drop-shadow-sm" /> : <div className="w-4 h-4 rounded-full border-2 border-slate-300" />}
                                 </div>
                                 <input className="bg-transparent border-none outline-none font-bold text-sm w-full py-2 placeholder-slate-300" value={opt} onChange={e => {const n=[...questions]; n[qIdx].options[oIdx]=e.target.value; setQuestions(n);}} placeholder={`Option ${String.fromCharCode(65 + oIdx)}`} />
                              </div>
                           ))}
                        </div>
                     </div>
                  ))}
                  
                  {questions.length > 0 && (
                     <button onClick={() => setQuestions([...questions, { text: "", options: ["", "", "", ""], correctAnswer: "" }])} className="w-full py-5 border-2 border-dashed border-indigo-200 rounded-[24px] text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100 transition-all font-black uppercase text-xs tracking-widest flex justify-center items-center gap-2 shadow-sm">
                        <Plus size={18}/> Add Another Question
                     </button>
                  )}
               </div>
            )}

            {activeTab === 'BULK' && (
               <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm">
                  <div className="mb-6">
                     <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-2 flex items-center gap-2"><LayoutGrid size={16} className="text-indigo-500" /> Paste from Spreadsheet</h3>
                     <p className="text-xs text-slate-500 leading-relaxed font-medium">Copy raw rows directly from Google Sheets or Excel and paste them below. The columns should be formatted as:<br/>
                     <strong className="text-slate-700 bg-slate-100 px-1 py-0.5 rounded ml-1 mt-1 inline-block">[Question Text] &nbsp;|&nbsp; [Option A] &nbsp;|&nbsp; [Option B] &nbsp;|&nbsp; [Option C] &nbsp;|&nbsp; [Option D] &nbsp;|&nbsp; [Correct Option Text]</strong></p>
                  </div>
                  <textarea 
                     className="w-full h-64 bg-slate-900 border border-slate-700 rounded-xl p-4 text-xs font-mono text-emerald-400 placeholder-slate-600 focus:ring-4 focus:ring-indigo-500/20 outline-none shadow-inner"
                     placeholder={`What is React?\tA Library\tA Framework\tA DB\tOS\tA Library\nWhen was standard released?\t1990\t1995\t2000\t2005\t1995`}
                     value={bulkText}
                     onChange={e => setBulkText(e.target.value)}
                  />
                  <div className="mt-4 flex justify-end">
                     <button onClick={processBulkImport} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-md hover:bg-indigo-700 transition-all flex items-center gap-2">
                        <CheckCircle size={16} /> Process Import
                     </button>
                  </div>
               </div>
            )}

            {activeTab === 'AI' && (
               <div className="bg-gradient-to-br from-indigo-900 to-slate-900 border border-slate-800 rounded-[24px] p-8 shadow-xl text-white relative overflow-hidden">
                  <div className="absolute right-0 top-0 opacity-10 pointer-events-none"><BrainCircuit size={200} /></div>
                  <div className="relative z-10 max-w-xl">
                     <h3 className="text-lg font-black tracking-tight mb-2 flex items-center gap-2 text-indigo-400"><Sparkles size={20} /> AI Agent Question Creator</h3>
                     <p className="text-xs text-indigo-200/80 leading-relaxed mb-8">Generate rigorous multiple-choice questions instantly tailored to specific technologies, languages, or scenarios using Gemini.</p>
                     
                     <div className="space-y-5">
                        <div>
                           <label className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-2 block">Technology / Topic</label>
                           <input className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-white placeholder-slate-500 focus:bg-slate-700 focus:border-indigo-500 outline-none transition-all" placeholder="e.g. Node.js Event Loop, Advanced React Hooks..." value={aiTopic} onChange={e=>setAiTopic(e.target.value)} />
                        </div>
                        <div className="flex gap-4">
                           <div className="flex-1">
                              <label className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-2 block">Difficulty</label>
                              <select className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none appearance-none cursor-pointer focus:border-indigo-500" value={aiDifficulty} onChange={e=>setAiDifficulty(e.target.value)}>
                                 <option>Beginner</option>
                                 <option>Intermediate</option>
                                 <option>Advanced</option>
                                 <option>Expert / Conceptual</option>
                              </select>
                           </div>
                           <div className="w-1/3">
                              <label className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-2 block">Count</label>
                              <input type="number" min="1" max="50" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-indigo-500" value={aiCount} onChange={e=>setAiCount(Number(e.target.value))} />
                           </div>
                        </div>
                        
                        <div className="pt-4">
                           <button onClick={processAIGeneration} disabled={isGenerating} className="w-full py-4 bg-indigo-600 border border-indigo-500 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-2">
                              {isGenerating ? <><BrainCircuit size={16} className="animate-spin" /> Analyzing Knowledge Graph...</> : <><Sparkles size={16} /> Generate {aiCount} Questions</>}
                           </button>
                        </div>
                     </div>
                  </div>
               </div>
            )}
         </div>

         <div className="p-6 bg-white border-t border-slate-200 flex justify-between items-center shrink-0">
            <div className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
               {questions.length} Questions Drafted
            </div>
            <div className="flex gap-3">
               <button onClick={onClose} className="px-8 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all">Cancel</button>
               <button onClick={() => onSave(questions)} className="px-8 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-white bg-slate-900 border border-slate-800 hover:bg-slate-800 shadow-xl shadow-slate-900/20 transition-all flex items-center gap-2">
                  <Save size={16}/> Save Configuration
               </button>
            </div>
         </div>
       </motion.div>
    </div>
  );
}

function FormGroup({ label, children, required, className = "" }: any) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
        {label} {required && <span className="text-rose-500 text-lg leading-none">*</span>}
      </label>
      {children}
    </div>
  );
}
