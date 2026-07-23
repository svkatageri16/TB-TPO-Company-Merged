import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api.ts";
import { BrainCircuit, Briefcase, Code2, ArrowRight, History, ChevronDown, Award, Globe, HelpCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext.tsx";

const QUIZ_TYPES = [
  "Technical Quiz",
  "Aptitude Test",
  "Logical Reasoning",
  "Verbal Ability",
  "Mixed Assessment",
  "Management Quiz",
  "Behavioral Quiz"
];

const DOMAINS = [
  "Software Engineering",
  "Data Science & AI",
  "Management & Business",
  "UI/UX & Design",
  "Cybersecurity",
  "Finance & Operations"
];

const DIFFICULTY_LEVELS = [
  "Easy",
  "Medium",
  "Hard",
  "Company-Level"
];

const DOMAIN_ROLES: Record<string, { roles: string[]; defaultSkills: string[] }> = {
  "Software Engineering": {
    roles: [
      "Full Stack Developer",
      "Frontend Developer",
      "Backend Developer",
      "DevOps Engineer",
      "Mobile App Developer",
      "Quality Assurance Engineer",
      "Cloud Architect",
      "System Administrator",
      "Embedded Systems Engineer",
      "SRE (Site Reliability Engineer)"
    ],
    defaultSkills: [
      "React", "Node.js", "SQL", "JavaScript", "TypeScript", "Python",
      "Docker", "Java", "HTML", "CSS", "Git", "AWS", "Express", "MongoDB", "PostgreSQL"
    ]
  },
  "Data Science & AI": {
    roles: [
      "Data Scientist",
      "Machine Learning Engineer",
      "Data Analyst",
      "AI Researcher",
      "Data Engineer",
      "BI Analyst",
      "NLP Engineer",
      "Computer Vision Engineer"
    ],
    defaultSkills: [
      "Python", "SQL", "Machine Learning", "Deep Learning", "TensorFlow",
      "PyTorch", "Pandas", "Scikit-Learn", "R", "Tableau", "PowerBI", "NLP", "NumPy"
    ]
  },
  "Management & Business": {
    roles: [
      "Product Manager",
      "Project Manager",
      "Business Analyst",
      "Scrum Master",
      "Marketing Manager",
      "Operations Analyst",
      "Product Owner",
      "Management Consultant"
    ],
    defaultSkills: [
      "Agile", "Scrum", "Jira", "Product Strategy", "Market Research",
      "SQL", "Excel", "Data Analytics", "KPIs", "User Stories", "Product Roadmap"
    ]
  },
  "UI/UX & Design": {
    roles: [
      "UI/UX Designer",
      "Product Designer",
      "Visual Designer",
      "Graphic Designer",
      "Web Designer",
      "Interaction Designer",
      "UX Researcher"
    ],
    defaultSkills: [
      "Figma", "User Research", "Wireframing", "Prototyping", "Adobe XD",
      "Photoshop", "Illustrator", "Design Systems", "HTML/CSS", "Wireframes", "Usability Testing"
    ]
  },
  "Cybersecurity": {
    roles: [
      "Security Analyst",
      "Penetration Tester",
      "Security Architect",
      "Information Security Officer",
      "Incident Responder",
      "Network Security Engineer"
    ],
    defaultSkills: [
      "Network Security", "Ethical Hacking", "Linux", "Penetration Testing",
      "SIEM", "OWASP", "Wireshark", "Firewalls", "Cryptography", "SOC", "Vulnerability Management"
    ]
  },
  "Finance & Operations": {
    roles: [
      "Financial Analyst",
      "Investment Analyst",
      "Accountant",
      "Operations Manager",
      "Risk Analyst",
      "Portfolio Manager"
    ],
    defaultSkills: [
      "Financial Modeling", "Excel", "Accounting", "Valuation", "Risk Management",
      "Corporate Finance", "Taxation", "Python for Finance", "Data Analysis"
    ]
  }
};

// Autocomplete Component
interface AutocompleteInputProps {
  label: string;
  icon?: React.ReactNode;
  value: string;
  onChange: (val: string) => void;
  suggestions: string[];
  placeholder?: string;
}

function AutocompleteInput({ label, icon, value, onChange, suggestions, placeholder }: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filtered, setFiltered] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value) {
      setFiltered(suggestions);
    } else {
      setFiltered(
        suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase()))
      );
    }
  }, [value, suggestions]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">{label}</label>
      <div className="relative">
        {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>}
        <input
          type="text"
          value={value}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          placeholder={placeholder}
          className={`w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-3 font-semibold text-slate-755 outline-none focus:border-emerald-500 transition-all ${
            icon ? "pl-12 pr-10" : "pl-4 pr-10"
          }`}
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1"
        >
          <ChevronDown size={18} />
        </button>
      </div>
      {isOpen && filtered.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto py-1">
          {filtered.map((item, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                onChange(item);
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-sm"
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Skills Multi-suggest Autocomplete Component
interface SkillsAutocompleteProps {
  label: string;
  icon?: React.ReactNode;
  value: string;
  onChange: (val: string) => void;
  suggestions: string[];
  placeholder?: string;
}

function SkillsAutocomplete({ label, icon, value, onChange, suggestions, placeholder }: SkillsAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filtered, setFiltered] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentSkills = value.split(",").map(s => s.trim()).filter(Boolean);
  const lastSegment = currentSkills[currentSkills.length - 1] || "";

  useEffect(() => {
    const matched = suggestions.filter(s => 
      !currentSkills.includes(s) && 
      (!lastSegment || s.toLowerCase().includes(lastSegment.toLowerCase()))
    );
    setFiltered(matched);
  }, [value, suggestions]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectSkill = (skill: string) => {
    const current = [...currentSkills];
    if (current.length > 0 && lastSegment) {
      current[current.length - 1] = skill;
    } else {
      current.push(skill);
    }
    onChange(current.join(", ") + ", ");
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">{label}</label>
      <div className="relative">
        {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>}
        <input
          type="text"
          value={value}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          placeholder={placeholder}
          className={`w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-3 font-semibold text-slate-755 outline-none focus:border-emerald-500 transition-all ${
            icon ? "pl-12 pr-10" : "pl-4 pr-10"
          }`}
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1"
        >
          <ChevronDown size={18} />
        </button>
      </div>
      {isOpen && filtered.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto py-1">
          {filtered.map((item, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelectSkill(item)}
              className="w-full text-left px-4 py-2 font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-sm"
            >
              + {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function QuizConfigPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [historyCount, setHistoryCount] = useState<number | null>(null);

  // Dynamic config options from server
  const [perQuestionCost, setPerQuestionCost] = useState(5);
  const [xpBalance, setXpBalance] = useState<number | null>(null);

  const [domain, setDomain] = useState("Software Engineering");
  const [isCustomAmount, setIsCustomAmount] = useState(false);

  const [config, setConfig] = useState({
    type: "Technical Quiz",
    role: "Full Stack Developer",
    skills: "React, Node.js, SQL",
    difficulty: "Medium",
    amount: "10"
  });

  useEffect(() => {
    if (user?.id) {
      // Fetch assessment history count
      api.get(`/quiz/history/${user.id}`).then(res => {
        if (res.data?.success && Array.isArray(res.data.quizzes)) {
          setHistoryCount(res.data.quizzes.length);
        }
      }).catch(err => {
        console.error("Error fetching quiz history:", err);
      });

      // Fetch dynamic configuration values and user balance
      api.get("/xp/balance")
        .then(res => {
          if (res.data?.success) {
            if (res.data.configs?.QUIZ_QUESTION_COST) {
              setPerQuestionCost(res.data.configs.QUIZ_QUESTION_COST);
            }
            if (res.data.balance) {
              setXpBalance(res.data.balance.xp_balance);
            }
          }
        })
        .catch(err => {
          console.error("Error fetching XP balance and configs:", err);
        });
    }
  }, [user]);

  const handleDomainChange = (newDomain: string) => {
    setDomain(newDomain);
    const domainData = DOMAIN_ROLES[newDomain];
    if (domainData) {
      const defaultRole = domainData.roles[0];
      const defaultSkills = domainData.defaultSkills.slice(0, 3).join(", ");
      setConfig(prev => ({
        ...prev,
        role: defaultRole,
        skills: defaultSkills
      }));
    }
  };

  const getRolesSuggestions = () => {
    if (DOMAIN_ROLES[domain]) {
      return DOMAIN_ROLES[domain].roles;
    }
    const matchedDomain = Object.keys(DOMAIN_ROLES).find(d => 
      d.toLowerCase().includes(domain.toLowerCase())
    );
    if (matchedDomain) {
      return DOMAIN_ROLES[matchedDomain].roles;
    }
    return Object.values(DOMAIN_ROLES).flatMap(d => d.roles);
  };

  const getSkillsSuggestions = () => {
    if (DOMAIN_ROLES[domain]) {
      return DOMAIN_ROLES[domain].defaultSkills;
    }
    const matchedDomain = Object.keys(DOMAIN_ROLES).find(d => 
      d.toLowerCase().includes(domain.toLowerCase())
    );
    if (matchedDomain) {
      return DOMAIN_ROLES[matchedDomain].defaultSkills;
    }
    return Object.values(DOMAIN_ROLES).flatMap(d => d.defaultSkills);
  };

  const generateQuiz = async () => {
    setLoading(true);
    try {
      if (!user?.id) {
        alert("Please login first");
        setLoading(false);
        return;
      }
      
      const qAmount = parseInt(config.amount) || 0;
      if (qAmount <= 0) {
        alert("Please enter a valid number of questions");
        setLoading(false);
        return;
      }

      const totalCost = qAmount * perQuestionCost;
      if (xpBalance !== null && xpBalance < totalCost) {
        alert(`Insufficient XP balance. Attempting this quiz requires ${totalCost} XP.`);
        setLoading(false);
        return;
      }
      
      const response = await api.post("/quiz/generate", {
        userId: user.id,
        type: config.type,
        role: config.role,
        skills: config.skills.split(",").map(s => s.trim()).filter(Boolean),
        difficulty: config.difficulty,
        amount: qAmount
      });
      
      if (response.data?.success && response.data?.quizId) {
        navigate(`/ai-quiz/session/${response.data.quizId}`);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to generate quiz");
      setLoading(false);
    }
  };

  const totalCalculatedCost = (parseInt(config.amount) || 0) * perQuestionCost;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-10 text-center">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/10 animated-pulse">
          <BrainCircuit size={32} />
        </div>
        <h1 className="text-4xl font-black text-slate-800 tracking-tight">AI Assessment Engine</h1>
        <p className="text-slate-500 mt-2 font-medium">Generate dynamic, anti-cheat assessments powered by Gemini AI.</p>
        
        <button 
          onClick={() => navigate("/ai-quiz/history")}
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
        >
          <History size={14} className="text-emerald-600 animate-pulse shrink-0" />
          View Assessment History {historyCount !== null ? `(${historyCount})` : ""} <ArrowRight size={14} className="text-emerald-500" />
        </button>
      </div>

      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AutocompleteInput
              label="Quiz Type"
              value={config.type}
              onChange={(val) => setConfig({ ...config, type: val })}
              suggestions={QUIZ_TYPES}
              placeholder="e.g. Technical Quiz"
            />
            <AutocompleteInput
              label="Domain"
              icon={<Globe size={20} />}
              value={domain}
              onChange={handleDomainChange}
              suggestions={DOMAINS}
              placeholder="e.g. Software Engineering"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AutocompleteInput
              label="Target Role"
              icon={<Briefcase size={20} />}
              value={config.role}
              onChange={(val) => setConfig({ ...config, role: val })}
              suggestions={getRolesSuggestions()}
              placeholder="e.g. Full Stack Developer"
            />
            <AutocompleteInput
              label="Difficulty Level"
              icon={<Award size={20} />}
              value={config.difficulty}
              onChange={(val) => setConfig({ ...config, difficulty: val })}
              suggestions={DIFFICULTY_LEVELS}
              placeholder="e.g. Medium"
            />
          </div>

          <SkillsAutocomplete
            label="Key Skills"
            icon={<Code2 size={20} />}
            value={config.skills}
            onChange={(val) => setConfig({ ...config, skills: val })}
            suggestions={getSkillsSuggestions()}
            placeholder="e.g. React, Node.js, SQL"
          />

          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
             <label className="block text-sm font-black text-slate-700 mb-3 uppercase tracking-wide">Number of Questions</label>
             <div className="flex flex-wrap gap-2 mb-3">
               {["5", "10", "15", "20"].map(num => (
                 <button 
                   type="button"
                   key={num}
                   onClick={() => {
                     setIsCustomAmount(false);
                     setConfig({ ...config, amount: num });
                   }}
                   className={`flex-1 min-w-[70px] py-3 px-2 rounded-xl text-sm font-bold border-2 transition-all ${
                     !isCustomAmount && config.amount === num 
                       ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm" 
                       : "border-slate-200 bg-white text-slate-500 hover:border-slate-350"
                   }`}
                 >
                   {num} Qs
                 </button>
               ))}
               <button 
                 type="button"
                 onClick={() => {
                   setIsCustomAmount(true);
                   if (["5", "10", "15", "20"].includes(config.amount)) {
                     setConfig({ ...config, amount: "25" });
                   }
                 }}
                 className={`flex-1 min-w-[80px] py-3 px-2 rounded-xl text-sm font-bold border-2 transition-all ${
                   isCustomAmount 
                     ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm" 
                     : "border-slate-200 bg-white text-slate-500 hover:border-slate-350"
                 }`}
               >
                 Custom
               </button>
             </div>

             {isCustomAmount && (
               <div className="flex items-center gap-3 mt-4 p-3 bg-white border border-slate-200 rounded-xl transition-all">
                 <span className="text-sm font-black text-slate-500">Custom Amount:</span>
                 <input 
                   type="number" 
                   min="1" 
                   max="100"
                   value={config.amount}
                   onChange={(e) => setConfig({ ...config, amount: e.target.value })}
                   placeholder="Enter number (more than 20)"
                   className="w-28 bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 font-bold text-center text-slate-700 outline-none focus:border-emerald-500"
                 />
                 <span className="text-xs text-slate-400 font-bold">(Max: 100 questions)</span>
               </div>
             )}
          </div>

          <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100/80 text-emerald-700 rounded-xl flex items-center justify-center text-lg animate-bounce">
                ⚡
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pricing Estimation</p>
                <h4 className="text-sm font-bold text-slate-700">
                  {parseInt(config.amount) || 0} Questions × <span className="font-extrabold text-emerald-700">{perQuestionCost} XP</span>/Q ={" "}
                  <span className="text-emerald-700 font-black text-base">{totalCalculatedCost} XP</span>
                </h4>
              </div>
            </div>
            {xpBalance !== null && (
              <div className="flex flex-col items-center md:items-end">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Your balance</p>
                <p className="text-sm font-black text-slate-755">
                  {xpBalance} XP{" "}
                  {xpBalance < totalCalculatedCost ? (
                    <span className="text-red-500 font-extrabold text-xs bg-red-50 px-2.5 py-0.5 rounded-full ml-1 border border-red-100 animate-pulse">Insufficient</span>
                  ) : (
                    <span className="text-emerald-700 font-extrabold text-xs bg-emerald-100/55 px-2.5 py-0.5 rounded-full ml-1 border border-emerald-100">Ready</span>
                  )}
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button 
              type="button"
              onClick={() => navigate("/ai-quiz/history")}
              className="w-full sm:w-auto flex items-center justify-center gap-2 border-2 border-slate-200 hover:border-slate-350 bg-white hover:bg-slate-50 text-slate-705 font-bold uppercase tracking-wider text-xs px-6 py-4 rounded-2xl transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <History size={14} className="text-slate-500" />
              AI Quiz History {historyCount !== null ? `(${historyCount})` : ""}
            </button>
            <button 
              onClick={generateQuiz} 
              disabled={loading || (xpBalance !== null && xpBalance < totalCalculatedCost)}
              className="w-full sm:w-auto flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
            >
              {loading ? "Synthesizing AI Quiz (Takes ~10s)..." : "Generate & Start Assessment"}
              {!loading && <ArrowRight size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
