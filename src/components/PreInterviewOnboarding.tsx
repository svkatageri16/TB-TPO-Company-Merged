import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ArrowRight, Briefcase, GraduationCap, Code2, Target, Zap, Mic, Type, 
  Check, ChevronRight, Shield, Sparkles, Building2, Plus, X 
} from "lucide-react";

export interface InterviewProfile {
  role: string;
  company: string;
  level: string;
  techstack: string[];
  focus: string;
  difficulty: string;
  communication: string;
}

const STEP_LABELS = [
  { label: "Target Role", desc: "Select career path" },
  { label: "Experience Level", desc: "Define seniority" },
  { label: "Tech Stack", desc: "Key competencies" },
  { label: "Interview Type", desc: "Select assessment mode" },
  { label: "Difficulty", desc: "Rigor intensity" },
  { label: "Comm Mode", desc: "Language media" }
];

const POPULAR_ROLES = [
  { title: "Full Stack Developer", icon: "💻" },
  { title: "Backend Engineer", icon: "⚙️" },
  { title: "Frontend Engineer", icon: "🎨" },
  { title: "Data Scientist", icon: "📊" },
  { title: "Product Manager", icon: "🚀" }
];

const POPULAR_COMPANIES = ["Google", "Amazon", "Microsoft", "Meta", "TCS"];

const POPULAR_SKILLS = [
  "React", "Node.js", "TypeScript", "Python", 
  "Java", "SQL", "AWS", "Docker", "Git", "Go"
];

const EXPERIENCE_LEVELS = [
  { level: "Fresher", desc: "No professional experience, focused on academic & personal projects", emoji: "🌱" },
  { level: "Junior (1-2 yrs)", desc: "Some professional exposure, comfortable with core library tools", emoji: "⚡" },
  { level: "Mid-level (3-5 yrs)", desc: "Experienced with modular clean code, testing, and architecture", emoji: "🛡️" },
  { level: "Senior (5+ yrs)", desc: "Deep design patterns, system scaling, and dev leadership", emoji: "👑" }
];

const FOCUS_AREAS = [
  { title: "Technical Interview", desc: "Deep technical questions, coding, architecture, tech stack fundamentals, debugging, and edge cases.", emoji: "💻" },
  { title: "HR Interview", desc: "Behavioral questions, core values, motivations, culture fit, situational prompts, and career goals.", emoji: "👔" },
  { title: "Managerial Interview", desc: "Project management, leadership under pressure, conflict resolution, developer growth, delegation, and operational strategy.", emoji: "🤝" },
  { title: "Introduction Mock Interview", desc: "Learn and practice your self-introduction/elevator pitch. The interviewer will guide you on how it must be structured and provide customized coaching.", emoji: "👋" },
  { title: "Salary Negotiation / Compensation Discussion", desc: "Practicing critical negotiation scenarios, countering offers, base vs bonus discussion, benefits, and value articulation.", emoji: "💰" }
];

const DIFFICULTIES = [
  { level: "Easy", desc: "Covers standard fundamentals, simple theory, and welcoming questions" },
  { level: "Medium", desc: "Core production-grade standards, industry-standard interview problems" },
  { level: "Hard", desc: "Deep dive questions checking edge cases, structural scaling, and advanced concepts" },
  { level: "Company-level (FAANG)", desc: "Highly competitive, ultra-rigorous algorithmic, architecture and system design" }
];

export function PreInterviewOnboarding({ onComplete }: { onComplete: (profile: InterviewProfile) => void }) {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<InterviewProfile>({
    role: "",
    company: "",
    level: "",
    techstack: [],
    focus: "",
    difficulty: "",
    communication: "Voice"
  });

  const [techInput, setTechInput] = useState("");

  const updateProfile = (key: keyof InterviewProfile, value: any) => {
    setProfile(prev => ({ ...prev, [key]: value }));
  };

  const addTech = (techName: string) => {
    const cleanTech = techName.trim();
    if (cleanTech && !profile.techstack.some(t => t.toLowerCase() === cleanTech.toLowerCase())) {
      setProfile(prev => ({ ...prev, techstack: [...prev.techstack, cleanTech] }));
    }
  };

  const removeTech = (tech: string) => {
    setProfile(prev => ({ ...prev, techstack: prev.techstack.filter(t => t !== tech) }));
  };

  const handleNext = () => {
    if (step === 1 && !profile.role) return;
    if (step === 2 && !profile.level) return;
    if (step === 3 && profile.techstack.length === 0) return;
    if (step === 4 && !profile.focus) return;
    if (step === 5 && !profile.difficulty) return;
    if (step === 6 && !profile.communication) return;
    
    if (step < 6) {
      setStep(prev => prev + 1);
    } else {
      onComplete(profile);
    }
  };

  return (
    <div className="max-w-5xl mx-auto w-full bg-white rounded-[32px] shadow-2xl overflow-hidden border border-slate-200/80 flex flex-col md:flex-row">
      
      {/* Left Sidebar Layout for Stepper (desktop only) */}
      <div className="md:w-76 bg-slate-50 p-8 border-b md:border-b-0 md:border-r border-slate-100 flex flex-col justify-between shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/25">
              <Sparkles size={18} />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">AI EVALUATOR</h4>
              <p className="text-[10px] font-bold text-slate-400">SESSION ONBOARDING</p>
            </div>
          </div>

          <div className="space-y-6">
            {STEP_LABELS.map((item, idx) => {
              const num = idx + 1;
              const isCompleted = step > num;
              const isActive = step === num;
              return (
                <div key={num} className="flex items-center gap-3.5 group">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                    isCompleted 
                      ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' 
                      : isActive 
                        ? 'bg-indigo-600 text-white font-black shadow-md shadow-indigo-500/20 ring-4 ring-indigo-50' 
                        : 'bg-white text-slate-400 border border-slate-200 group-hover:border-slate-350'
                  }`}>
                    {isCompleted ? <Check size={14} className="stroke-[3]" /> : <span className="text-xs font-black">{num}</span>}
                  </div>
                  <div className="hidden md:block">
                    <p className={`text-[11px] font-black uppercase tracking-wider leading-none mb-0.5 ${isActive ? 'text-indigo-600' : isCompleted ? 'text-slate-600' : 'text-slate-400'}`}>
                      {item.label}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 leading-none">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 mt-8 py-3 px-4 bg-slate-100 rounded-xl border border-slate-200 text-slate-500">
          <Shield size={14} className="text-indigo-500" />
          <span className="text-[9px] font-black uppercase tracking-wider">SECURE EVALUATION</span>
        </div>
      </div>

      {/* Main Form Area */}
      <div className="flex-1 flex flex-col justify-between min-h-[520px]">
        
        {/* Top Progress Bar for Mobile */}
        <div className="flex md:hidden bg-slate-50 border-b border-slate-100">
          {STEP_LABELS.map((_, idx) => (
            <div key={idx} className={`flex-1 h-1.5 ${step >= idx + 1 ? 'bg-indigo-600' : 'bg-slate-200'}`} />
          ))}
        </div>

        {/* Dynamic Step Content */}
        <div className="p-8 md:p-12 flex-1 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25 }}
              className="w-full"
            >
              {/* STEP 1: Role & Company */}
              {step === 1 && (
                <div>
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 border border-indigo-100">
                    <Briefcase size={22} />
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">What role are you preparing for?</h2>
                  <p className="text-slate-500 text-sm mb-6 max-w-lg leading-relaxed">Let our artificial intelligence design custom questions tailored specifically for your career track and target workplace.</p>
                  
                  <div className="space-y-4 max-w-xl">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Target Job Title</label>
                      <input 
                        type="text" 
                        value={profile.role}
                        onChange={(e) => updateProfile("role", e.target.value)}
                        placeholder="E.g., Full Stack Developer, Data Analyst..."
                        className="w-full text-lg py-3.5 px-5 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:bg-white outline-none transition-all shadow-inner focus:ring-4 focus:ring-indigo-100"
                        onKeyPress={(e) => e.key === "Enter" && handleNext()}
                        autoFocus
                      />
                    </div>

                    {/* Popular Job Title Suggestion Chips */}
                    <div className="py-1">
                      <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">Or select a popular route:</span>
                      <div className="flex flex-wrap gap-2">
                        {POPULAR_ROLES.map((item) => (
                          <button
                            key={item.title}
                            type="button"
                            onClick={() => updateProfile("role", item.title)}
                            className={`px-3 py-1.5 rounded-xl border text-[11px] font-extrabold flex items-center gap-1.5 cursor-pointer transition-all ${
                              profile.role.toLowerCase() === item.title.toLowerCase()
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/10'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-650 hover:border-slate-300'
                            }`}
                          >
                            <span>{item.icon}</span>
                            {item.title}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Target Company (Optional)</label>
                      <div className="relative">
                        <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="text" 
                          value={profile.company}
                          onChange={(e) => updateProfile("company", e.target.value)}
                          placeholder="E.g., Google, Amazon, Deloitte..."
                          className="w-full pl-11 pr-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:bg-white outline-none transition-all"
                          onKeyPress={(e) => e.key === "Enter" && handleNext()}
                        />
                      </div>
                    </div>

                    {/* Popular Companies */}
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Popular:</span>
                      {POPULAR_COMPANIES.map((comp) => (
                        <button
                          key={comp}
                          type="button"
                          onClick={() => updateProfile("company", comp)}
                          className="text-[10px] bg-slate-100 hover:bg-slate-200 hover:text-slate-900 border border-slate-200 text-slate-500 font-extrabold px-2.5 py-0.5 rounded-lg transition-colors cursor-pointer"
                        >
                          {comp}
                        </button>
                      ))}
                    </div>

                  </div>
                </div>
              )}

              {/* STEP 2: Experience Level */}
              {step === 2 && (
                <div>
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 border border-indigo-100">
                    <GraduationCap size={22} />
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">experience seniority</h2>
                  <p className="text-slate-500 text-sm mb-6 max-w-lg leading-relaxed">Let the evaluation set realistic expectations. We optimize theoretical depth and logic checking based on career years.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                    {EXPERIENCE_LEVELS.map(levelObj => (
                      <button
                        key={levelObj.level}
                        onClick={() => { updateProfile("level", levelObj.level); setTimeout(handleNext, 200); }}
                        className={`p-5 text-left rounded-2xl border-2 transition-all flex gap-4 cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${
                          profile.level === levelObj.level 
                            ? "border-indigo-600 bg-indigo-50/50 shadow-md shadow-indigo-500/5" 
                            : "border-slate-200 hover:border-indigo-300 bg-white shadow-sm"
                        }`}
                      >
                        <span className="text-2xl mt-0.5 shrink-0 select-none">{levelObj.emoji}</span>
                        <div>
                          <span className={`block font-black uppercase tracking-wider text-[12px] leading-tight mb-1 ${
                            profile.level === levelObj.level ? "text-indigo-600" : "text-slate-800"
                          }`}>{levelObj.level}</span>
                          <span className="text-[11px] font-medium text-slate-500 leading-snug block">{levelObj.desc}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 3: Tech Stack */}
              {step === 3 && (
                <div>
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 border border-indigo-100">
                    <Code2 size={22} />
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Technologies and Skills</h2>
                  <p className="text-slate-500 text-sm mb-6 max-w-lg leading-relaxed">Identify core frameworks, languages, or tools you are confident with. The AI interviewer will tailor questions around these.</p>
                  
                  <div className="max-w-xl">
                    <div className="flex gap-2.5 mb-4">
                      <input 
                        type="text" 
                        value={techInput}
                        onChange={(e) => setTechInput(e.target.value)}
                        placeholder="Type a technology (e.g., Python, AWS)..."
                        className="flex-1 py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:bg-white outline-none transition-all shadow-inner"
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (techInput.trim()) {
                              addTech(techInput);
                              setTechInput("");
                            }
                          }
                        }}
                        autoFocus
                      />
                      <button 
                        onClick={() => {
                          if (techInput.trim()) {
                            addTech(techInput);
                            setTechInput("");
                          }
                        }}
                        className="px-5 bg-indigo-600 text-white font-extrabold uppercase text-xs tracking-wider rounded-xl hover:bg-indigo-700 transition flex items-center gap-1 cursor-pointer shadow-lg shadow-indigo-600/10"
                      >
                        <Plus size={14} className="stroke-[3]" /> Add
                      </button>
                    </div>

                    {/* Skill Quick Suggestions */}
                    <div className="mb-6">
                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">Recommended Suggestions (Click to add):</p>
                      <div className="flex flex-wrap gap-1.5">
                        {POPULAR_SKILLS.map(skill => {
                          const exists = profile.techstack.some(t => t.toLowerCase() === skill.toLowerCase());
                          return (
                            <button
                              key={skill}
                              type="button"
                              onClick={() => {
                                if (exists) {
                                  removeTech(skill);
                                } else {
                                  addTech(skill);
                                }
                              }}
                              className={`text-[10px] font-bold px-3 py-1 rounded-lg border transition-all cursor-pointer ${
                                exists
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-extrabold shadow-sm'
                                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-500'
                              }`}
                            >
                              {skill} {exists && "✓"}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Chosen Tags display */}
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">
                        Your Tech Stack ({profile.techstack.length} Added):
                      </p>
                      {profile.techstack.length === 0 ? (
                        <div className="py-4 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                          No tech stacks added. Choose from standard suggestions above or type your own.
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 bg-slate-50/50 rounded-xl border border-slate-100">
                          {profile.techstack.map(tech => (
                            <div key={tech} className="px-3.5 py-1.5 bg-indigo-50 border border-indigo-150 text-indigo-700 rounded-xl flex items-center gap-2 text-xs font-bold shadow-sm">
                              <span>{tech}</span>
                              <button 
                                onClick={() => removeTech(tech)} 
                                className="text-indigo-400 hover:text-indigo-700 transition-colors w-4 h-4 rounded-full flex items-center justify-center hover:bg-indigo-100"
                              >
                                <X size={12} className="stroke-[3]" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              )}

              {/* STEP 4: Interview Type Selection */}
              {step === 4 && (
                <div>
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 border border-indigo-100">
                    <Target size={22} />
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Select Interview Type</h2>
                  <p className="text-slate-500 text-sm mb-6 max-w-lg leading-relaxed">Choose the specific type of mock interview you want to simulate. Our AI adapts its entire behavior, questioning style, and evaluation schema to your selection.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                    {FOCUS_AREAS.map(item => (
                      <button
                        key={item.title}
                        onClick={() => { updateProfile("focus", item.title); setTimeout(handleNext, 200); }}
                        className={`p-5 text-left rounded-2xl border-2 transition-all flex gap-4 cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${
                          profile.focus === item.title 
                            ? "border-indigo-600 bg-indigo-50/50 shadow-md shadow-indigo-500/5" 
                            : "border-slate-200 hover:border-indigo-300 bg-white shadow-sm"
                        }`}
                      >
                        <span className="text-2xl mt-0.5 shrink-0 select-none">{item.emoji}</span>
                        <div>
                          <span className={`block font-black uppercase tracking-wider text-[12px] leading-tight mb-1 ${
                            profile.focus === item.title ? "text-indigo-600" : "text-slate-800"
                          }`}>{item.title}</span>
                          <span className="text-[11px] font-medium text-slate-500 leading-snug block">{item.desc}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 5: Difficulty */}
              {step === 5 && (
                <div>
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 border border-indigo-100">
                    <Zap size={22} className="animate-pulse text-indigo-600" />
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">difficulty assessment standard</h2>
                  <p className="text-slate-500 text-sm mb-6 max-w-lg leading-relaxed">Select how intense you want the inquiry to be. Real evaluation systems matching live tech companies of all scales.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                    {DIFFICULTIES.map(item => {
                      const isActive = profile.difficulty === item.level;
                      const isFaang = item.level.includes("FAANG");
                      return (
                        <button
                          key={item.level}
                          onClick={() => { updateProfile("difficulty", item.level); setTimeout(handleNext, 200); }}
                          className={`p-5 text-left rounded-2xl border-2 transition-all flex flex-col justify-between cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${
                            isActive 
                              ? isFaang 
                                ? "border-amber-500 bg-amber-50/30 shadow-md shadow-amber-500/5"
                                : "border-indigo-600 bg-indigo-50/50 shadow-md shadow-indigo-500/5" 
                              : "border-slate-200 hover:border-indigo-300 bg-white shadow-sm"
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className={`block font-black uppercase tracking-wider text-[12px] leading-tight ${
                                isActive ? (isFaang ? "text-amber-700 font-extrabold" : "text-indigo-600") : "text-slate-800"
                              }`}>{item.level}</span>
                              {isFaang && (
                                <span className="bg-amber-100 text-amber-800 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded">HIGH DEMAND</span>
                              )}
                            </div>
                            <span className="text-[11px] font-medium text-slate-500 leading-snug block">{item.desc}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 6: Communication mode */}
              {step === 6 && (
                <div>
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 border border-indigo-100">
                    <Mic size={22} />
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">choose communication mode</h2>
                  <p className="text-slate-500 text-sm mb-6 max-w-lg leading-relaxed">Choose voice conversations with real-time speech analytics for the maximum fidelity evaluation, or choose convenient text messaging.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-xl">
                    <button
                      onClick={() => { updateProfile("communication", "Voice"); }}
                      className={`p-6 text-left flex items-start gap-4 rounded-2xl border-2 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${
                        profile.communication === "Voice" 
                          ? "border-indigo-600 bg-indigo-50/50 shadow-md" 
                          : "border-slate-200 hover:border-indigo-300 bg-white"
                      }`}
                    >
                      <div className={`p-3 rounded-xl shrink-0 ${profile.communication === "Voice" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                        <Mic size={22} />
                      </div>
                      <div>
                        <span className={`block font-black uppercase tracking-wider text-[12.5px] leading-tight mb-1 ${
                          profile.communication === "Voice" ? "text-indigo-600" : "text-slate-800"
                        }`}>Voice Conversation</span>
                        <span className="text-[11px] font-medium text-slate-500 leading-normal block">Speak directly using mic. Assesses clarity, vocabulary, accent, and dynamic confidence.</span>
                      </div>
                    </button>

                    <button
                      onClick={() => { updateProfile("communication", "Text"); }}
                      className={`p-6 text-left flex items-start gap-4 rounded-2xl border-2 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${
                        profile.communication === "Text" 
                          ? "border-indigo-600 bg-indigo-50/50 shadow-md" 
                          : "border-slate-200 hover:border-indigo-300 bg-white"
                      }`}
                    >
                      <div className={`p-3 rounded-xl shrink-0 ${profile.communication === "Text" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                        <Type size={22} />
                      </div>
                      <div>
                        <span className={`block font-black uppercase tracking-wider text-[12.5px] leading-tight mb-1 ${
                          profile.communication === "Text" ? "text-indigo-600" : "text-slate-800"
                        }`}>Text Message</span>
                        <span className="text-[11px] font-medium text-slate-500 leading-normal block">Type your submissions inside chat window. Best for quiet spaces or detailed code.</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Form Bottom Controller */}
        <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center rounded-b-[32px]">
          <button 
            onClick={() => setStep(prev => Math.max(1, prev - 1))}
            className={`px-5 py-2.5 font-black uppercase text-[11px] tracking-wider text-slate-400 hover:text-slate-700 transition-colors cursor-pointer rounded-xl ${
              step === 1 ? 'opacity-0 pointer-events-none' : 'hover:bg-slate-100'
            }`}
          >
            Back
          </button>
          <button 
            onClick={handleNext}
            disabled={
              (step === 1 && !profile.role) ||
              (step === 2 && !profile.level) ||
              (step === 3 && profile.techstack.length === 0) ||
              (step === 4 && !profile.focus) ||
              (step === 5 && !profile.difficulty)
            }
            className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold uppercase text-[11px] tracking-widest rounded-xl disabled:opacity-50 disabled:grayscale transition-all shadow-lg shadow-indigo-600/15 cursor-pointer hover:translate-x-0.5 active:scale-95"
          >
            <span>{step === 6 ? "PROCEED TO REAL-TIME PREP" : "CONTINUE ONBOARDING"}</span> 
            {step === 6 ? <Sparkles size={14} className="animate-spin text-indigo-200. " /> : <ArrowRight size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
