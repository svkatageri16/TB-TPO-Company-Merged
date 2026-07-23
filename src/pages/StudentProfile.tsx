import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext.tsx";
import api from "../services/api.ts";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { ConsentModal } from "../components/ConsentModal.tsx";
import { 
  User, Mail, Phone, MapPin, Calendar, 
  Briefcase, GraduationCap, Award, FileText, 
  Settings, LogOut, ChevronRight, Pencil,
  Plus, Trash2, CheckCircle, AlertCircle,
  ExternalLink, Github, Building2, Trophy,
  FileDown, Check, X, Upload, Eye, Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// --- Types ---
interface Education {
  id?: number;
  institution: string;
  degree: string;
  field_of_study?: string;
  start_date?: string;
  end_date?: string;
  grade?: string;
  description?: string;
}

interface Project {
  id?: number;
  title: string;
  description?: string;
  techStack?: string;
  link?: string;
  githubLink?: string;
}

interface Experience {
  id?: number;
  company: string;
  role: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  isCurrent?: boolean;
  description?: string;
}

interface Certification {
  id?: number;
  name: string;
  issuingOrganization: string;
  issueDate?: string;
  expiryDate?: string;
  credentialId?: string;
  credentialUrl?: string;
}

interface ExtracurricularActivity {
  id?: number;
  category: string;
  title: string;
  description?: string;
  organization_name?: string;
  participation_level?: string;
  achievement_rank?: string;
  activity_date?: string;
  certificate_url?: string;
  ai_analysis_json?: string;
}

// --- Components ---

const CompletionBar = ({ score, nextStep }: { score: number, nextStep?: string }) => (
  <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 mb-8 overflow-hidden relative">
    <div className="flex justify-between items-end mb-4">
      <div>
        <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Profile Strength</h4>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black text-slate-900">{score}%</span>
          <span className="text-slate-400 font-bold text-sm">Complete</span>
        </div>
      </div>
      {nextStep && (
        <div className="text-right hidden md:block">
          <p className="text-xs font-bold text-slate-400 mb-1">Next Step</p>
          <p className="text-sm font-black text-blue-600">{nextStep}</p>
        </div>
      )}
    </div>
    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${score}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
        className={`h-full rounded-full ${
          score < 30 ? 'bg-red-500' : score < 70 ? 'bg-amber-500' : 'bg-emerald-500'
        }`}
      />
    </div>
    {score < 100 && (
      <div className="mt-4 flex items-center gap-2 text-amber-600">
        <AlertCircle size={14} />
        <p className="text-xs font-bold uppercase tracking-wide">Boost your profile to get 3x more recruiter views</p>
      </div>
    )}
  </div>
);

const SectionCard = ({ 
  title, 
  icon: Icon, 
  children, 
  onEdit, 
  isCompleted = false,
  description
}: { 
  title: string, 
  icon: any, 
  children: React.ReactNode, 
  onEdit?: () => void,
  isCompleted?: boolean,
  description?: string
}) => (
  <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-200 hover:border-slate-300 transition-all relative group" id={`section-${title.toLowerCase().replace(/\s+/g, '-')}`}>
    <div className="flex justify-between items-start mb-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-2xl ${isCompleted ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
          <Icon size={24} />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
            {title}
            {isCompleted && <CheckCircle size={16} className="text-emerald-500" />}
          </h3>
          {description && <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">{description}</p>}
        </div>
      </div>
      {onEdit && (
        <button 
          onClick={onEdit}
          className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all"
        >
          <Pencil size={20} />
        </button>
      )}
    </div>
    <div className="space-y-4">
      {children}
    </div>
  </div>
);

const EditModal = ({ title, isOpen, onClose, onSave, children, isSaveDisabled }: { 
  title: string, 
  isOpen: boolean, 
  onClose: () => void, 
  onSave: () => void,
  children: React.ReactNode,
  isSaveDisabled?: boolean
}) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden"
        >
          <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{title}</h2>
            <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-all text-slate-400 hover:text-slate-600"><X size={24} /></button>
          </div>
          <div className="p-10 max-h-[70vh] overflow-y-auto">
            {children}
          </div>
          <div className="p-8 border-t border-slate-100 flex gap-4 bg-slate-50/50">
            <button 
              onClick={onClose}
              className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={onSave}
              disabled={isSaveDisabled}
              className={`flex-1 py-4 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all ${isSaveDisabled ? 'bg-slate-300 shadow-none cursor-not-allowed text-slate-500' : 'bg-blue-600 shadow-blue-500/20 hover:bg-blue-700'}`}
            >
              Save Changes
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

// Autocomplete lists for India and localized schools/colleges
const COLLEGE_SUGGESTIONS = [
  "BRACT'S Vishwakarma Global Business School(VGBS), Pune",
  "BRACT's Vishwakarma Institute of Information Technology, Pune",
  "BRACTS Vishwakarma Institute Of Management, Pune",
  "Brahamdeo Muni Udasin Sanskrit College, Vaishali",
  "Brahma Kumaris University, Delhi",
  "Brahmachari Wadi Trust Institute of Business Administration, Ahmedabad",
  "Solapur Institute of Technology, Solapur",
  "Walchand Institute of Technology (WIT), Solapur",
  "Orchid College of Engineering, Solapur",
  "Indian Institute of Technology (IIT) Bombay, Mumbai",
  "Indian Institute of Technology (IIT) Delhi",
  "Indian Institute of Technology (IIT) Madras",
  "Indian Institute of Technology (IIT) Kharagpur",
  "Indian Institute of Technology (IIT) Roorkee",
  "Birla Institute of Technology and Science (BITS), Pilani",
  "Delhi University, Delhi",
  "Savitribai Phule Pune University, Pune",
  "College of Engineering Pune (COEP), Pune",
  "Veermata Jijabai Technological Institute (VJTI), Mumbai",
  "National Institute of Technology (NIT) Trichy",
  "Vellore Institute of Technology (VIT), Vellore",
  "Manipal Institute of Technology, Manipal",
  "Symbiosis International University, Pune",
  "Pune University, Pune",
  "Mumbai University, Mumbai",
  "Sharda University, Greater Noida",
  "Amity University, Noida",
  "Lovely Professional University (LPU), Phagwara",
  "Symbiosis Institute of Technology, Pune",
  "Nirma University, Ahmedabad",
  "RV College of Engineering, Bengaluru",
  "PES University, Bengaluru",
  "MS Ramaiah Institute of Technology, Bengaluru",
  "SRM Institute of Science and Technology, Chennai",
  "Kalinga Institute of Industrial Technology (KIIT), Bhubaneswar",
  "Thapar Institute of Engineering and Technology, Patiala",
  "PSG College of Technology, Coimbatore",
  "DA-IICT, Gandhinagar"
];

const SCHOOL_SUGGESTIONS = [
  "Central Board of Secondary Education (CBSE)",
  "Indian Certificate of Secondary Education (ICSE)",
  "Maharashtra State Board of Secondary and Higher Secondary Education (MSBSHSE)",
  "Solapur High School, Solapur",
  "Little Flower Convent School, Solapur",
  "DAV Public School, Pune",
  "St. Xavier's High School, Mumbai",
  "Ryan International School, Mumbai",
  "Delhi Public School (DPS), Delhi",
  "Army Public School, Pune",
  "Kendriya Vidyalaya, Solapur",
  "Podar International School, Solapur",
  "Loyola High School, Pune",
  "The Bishop's School, Pune",
  "St. Vincent's High School, Pune",
  "Cathedral and John Connon School, Mumbai",
  "Dhirubhai Ambani International School, Mumbai",
  "The Doon School, Dehradun",
  "La Martiniere College, Lucknow"
];

interface AutocompleteInputProps {
  value: string;
  onChange: (val: string) => void;
  suggestions?: string[];
  type?: "school" | "college";
  placeholder?: string;
  className?: string;
  id?: string;
}

export function AutocompleteInput({
  value,
  onChange,
  suggestions = [],
  type,
  placeholder = "",
  className = "",
  id
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestionsList, setSuggestionsList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const debounceRef = React.useRef<any>(null);

  useEffect(() => {
    if (!value || value.trim().length === 0) {
      setSuggestionsList([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    if (type) {
      // DYNAMIC FETCH MODE WITH DEBOUNCE
      setIsLoading(true);
      setIsOpen(true);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(async () => {
        try {
          const response = await api.get(`/students/suggest-institutions`, {
            params: { q: value, type }
          });
          if (response.data && response.data.success) {
            setSuggestionsList(response.data.suggestions || []);
          }
        } catch (err) {
          console.error("Institution dynamic suggestions failed", err);
          // Safe client-side fallback matching
          const matched = suggestions.filter(item => 
            item.toLowerCase().includes(value.toLowerCase())
          ).slice(0, 8);
          setSuggestionsList(matched);
        } finally {
          setIsLoading(false);
        }
      }, 300);
    } else {
      // BACKWARDS COMPATIBLE STATIC FILTER MODE
      const valUpper = value.toUpperCase();
      const filtered = suggestions.filter(item => 
        item.toUpperCase().includes(valUpper)
      ).slice(0, 8);

      setSuggestionsList(filtered);
      setIsOpen(filtered.length > 0);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, type, suggestions]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestionsList.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx(prev => (prev + 1) % suggestionsList.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(prev => (prev - 1 + suggestionsList.length) % suggestionsList.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx >= 0 && activeIdx < suggestionsList.length) {
        onChange(suggestionsList[activeIdx]);
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const highLightText = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, "gi"));
    return (
      <span>
        {parts.map((part, index) => 
          part.toLowerCase() === query.toLowerCase() ? (
            <strong key={index} className="text-blue-600 font-extrabold">{part}</strong>
          ) : (
            <span key={index} className="font-normal text-slate-700">{part}</span>
          )
        )}
      </span>
    );
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <input
        id={id}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
          setActiveIdx(-1);
        }}
        onFocus={() => {
          if (value && value.trim().length > 0) {
            setIsOpen(true);
          }
        }}
        onKeyDown={handleKeyDown}
        className={`w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${className}`}
      />
      
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-[20px] shadow-2xl z-[99] max-h-60 overflow-y-auto divide-y divide-slate-50 border-t border-b border-l border-r border-slate-200">
          {isLoading && (
            <div className="px-4 py-3.5 text-[10px] uppercase font-black tracking-widest text-slate-450 flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin"></span>
              Searching all institutions across India...
            </div>
          )}
          
          {!isLoading && suggestionsList.length === 0 && (
            <div className="px-5 py-4 text-[10px] uppercase font-black tracking-widest text-slate-400">
              No exact matches. Keep typing to fetch from Indian directories...
            </div>
          )}

          {!isLoading && suggestionsList.map((item, idx) => (
            <div
              key={idx}
              onClick={() => {
                onChange(item);
                setIsOpen(false);
              }}
              onMouseEnter={() => setActiveIdx(idx)}
              className={`px-4 py-3.5 cursor-pointer text-xs transition-colors flex items-center justify-between text-left ${
                idx === activeIdx ? "bg-blue-50/70" : "bg-white hover:bg-slate-50"
              }`}
            >
              <span className="font-bold text-slate-800 block truncate leading-tight">
                {highLightText(item, value)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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

// --- Main Page ---

export function StudentProfile() {
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [consentOpen, setConsentOpen] = useState(localStorage.getItem("consent_profile") !== "true");

  // Key Skills Autocomplete States
  const [studentSkillInput, setStudentSkillInput] = useState("");
  const [showStudentSkillsDropdown, setShowStudentSkillsDropdown] = useState(false);
  const [studentSkillsActiveIndex, setStudentSkillsActiveIndex] = useState(-1);
  const studentSkillsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (studentSkillsContainerRef.current && !studentSkillsContainerRef.current.contains(event.target as Node)) {
        setShowStudentSkillsDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Educational step states (High School is always compulsory, others toggle-able and compulsory if enabled)
  const [schoolInst, setSchoolInst] = useState("");
  const [schoolStart, setSchoolStart] = useState("");
  const [schoolEnd, setSchoolEnd] = useState("");
  const [schoolGrade, setSchoolGrade] = useState("");

  const [hasInter, setHasInter] = useState(false);
  const [interInst, setInterInst] = useState("");
  const [interStream, setInterStream] = useState("");
  const [interStart, setInterStart] = useState("");
  const [interEnd, setInterEnd] = useState("");
  const [interGrade, setInterGrade] = useState("");

  const [hasDiploma, setHasDiploma] = useState(false);
  const [diplInst, setDiplInst] = useState("");
  const [diplBranch, setDiplBranch] = useState("");
  const [diplStart, setDiplStart] = useState("");
  const [diplEnd, setDiplEnd] = useState("");
  const [diplGrade, setDiplGrade] = useState("");

  const [hasDegree, setHasDegree] = useState(false);
  const [degreeInst, setDegreeInst] = useState("");
  const [degreeName, setDegreeName] = useState("");
  const [degreeBranch, setDegreeBranch] = useState("");
  const [degreeStart, setDegreeStart] = useState("");
  const [degreeEnd, setDegreeEnd] = useState("");
  const [degreeGrade, setDegreeGrade] = useState("");

  const fetchProfile = async () => {
    try {
      const { data } = await api.get(`/students/profile/${user?.id}`);
      if (data.success) {
        setProfile(data.data);
        if (updateProfile) {
          updateProfile(data.data);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const parseJSON = (data: any, fallback: any = []) => {
    if (!data) return fallback;
    if (typeof data === 'object') return data;
    try {
      return JSON.parse(data);
    } catch (e) {
      return fallback;
    }
  };

  const handleEdit = (section: string) => {
    let initialData = {};
    const p = profile || {};

    if (section === 'personal') {
      initialData = { 
        fullName: p.full_name || "", 
        headline: p.headline || "",
        contact: p.contact || "",
        location: p.location || "",
        address: p.address || "",
        dob: p.dob || "",
        gender: p.gender || "",
        profilePhotoUrl: p.profile_photo_url || "",
        country: p.country || ""
      };
    } else if (section === 'preferences') {
      initialData = {
        preferredJobRole: p.preferred_job_role || "",
        preferredLocation: p.preferred_location || "",
        availability: p.availability || "",
        isPlaced: p.is_placed === 1,
        placedCompany: p.placed_company || "",
        isTopPerformer: p.is_top_performer === 1
      };
    } else if (section === 'skills') {
      initialData = { skills: parseJSON(p.skills_json) };
    } else if (section === 'summary') {
      initialData = { summary: p.bio || "" };
    } else if (section === 'education') {
      const eduList = p.education || [];
      initialData = { education: eduList };
      
      const isHighSchool = (d: string) => ["High School", "10th", "SSC", "Metric", "Matriculation"].includes(d);
      const isInter = (d: string) => ["Intermediate (12th)", "12th", "HSC", "Intermediate"].includes(d);
      const isDiploma = (d: string) => ["Diploma"].includes(d);

      const school = eduList.find((e: any) => isHighSchool(e.degree)) || {};
      const inter = eduList.find((e: any) => isInter(e.degree)) || {};
      const diploma = eduList.find((e: any) => isDiploma(e.degree)) || {};
      const degree = eduList.find((e: any) => e.degree && !isHighSchool(e.degree) && !isInter(e.degree) && !isDiploma(e.degree)) || {};

      setSchoolInst(school.institution || "");
      setSchoolStart(school.start_date ? school.start_date.split('T')[0] : "");
      setSchoolEnd(school.end_date ? school.end_date.split('T')[0] : "");
      setSchoolGrade(school.grade || "");

      const hasInt = eduList.some((e: any) => isInter(e.degree));
      setHasInter(hasInt);
      setInterInst(inter.institution || "");
      setInterStream(inter.field_of_study || "");
      setInterStart(inter.start_date ? inter.start_date.split('T')[0] : "");
      setInterEnd(inter.end_date ? inter.end_date.split('T')[0] : "");
      setInterGrade(inter.grade || "");

      const hasDipl = eduList.some((e: any) => isDiploma(e.degree));
      setHasDiploma(hasDipl);
      setDiplInst(diploma.institution || "");
      setDiplBranch(diploma.field_of_study || "");
      setDiplStart(diploma.start_date ? diploma.start_date.split('T')[0] : "");
      setDiplEnd(diploma.end_date ? diploma.end_date.split('T')[0] : "");
      setDiplGrade(diploma.grade || "");

      const hasDeg = eduList.some((e: any) => e.degree && !isHighSchool(e.degree) && !isInter(e.degree) && !isDiploma(e.degree));
      setHasDegree(hasDeg);
      setDegreeInst(degree.institution || "");
      setDegreeName(degree.degree || "B.Tech");
      setDegreeBranch(degree.field_of_study || "");
      setDegreeStart(degree.start_date ? degree.start_date.split('T')[0] : "");
      setDegreeEnd(degree.end_date ? degree.end_date.split('T')[0] : "");
      setDegreeGrade(degree.grade || "");
    } else if (section === 'projects') {
      initialData = { projects: p.projects || [] };
    } else if (section === 'experience') {
      initialData = { experience: p.experience || [] };
    } else if (section === 'certifications') {
      initialData = { certifications: p.certifications || [] };
    } else if (section === 'resume') {
      initialData = { resumeUrl: p.resume_url || "" };
    }
    
    setEditData(initialData);
    setActiveModal(section);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }

    const formData = new FormData();
    formData.append("resume", file);

    try {
      const { data } = await api.post(`/students/upload-resume/${user?.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (data.success) {
        toast.success("Resume uploaded successfully!");
        await fetchProfile(); // Refresh profile and completeness score
        setActiveModal(null);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Upload failed");
    }
  };

  const saveSection = async () => {
    if (activeModal === 'personal') {
      if (!editData.fullName?.trim()) return toast.error("Full Name is required");
      if (!editData.contact?.trim()) return toast.error("Contact Number is required");
      if (!/^\d{10}$/.test(editData.contact.replace(/\D/g, ""))) {
        return toast.error("Mobile number must be exactly 10 digits.");
      }
      if (!editData.location?.trim()) return toast.error("Location is required");
      if (editData.country && editData.country.trim()) {
        const countryVal = editData.country.trim();
        const hasLetters = /[a-zA-Z]/.test(countryVal);
        if (!hasLetters || /^[^\w\s.-]+$/.test(countryVal)) {
          return toast.error("Please select a valid country.");
        }
      }
    } else if (activeModal === 'preferences') {
      if (!editData.preferredJobRole?.trim()) return toast.error("Preferred Role is required");
      if (!editData.preferredLocation?.trim()) return toast.error("Preferred Location is required");
    } else if (activeModal === 'summary') {
      const summaryLength = (editData.summary || "").trim().length;
      if (summaryLength < 50) return toast.error("Profile summary must be at least 50 characters.");
      if (summaryLength > 5000) return toast.error("Profile summary cannot exceed 5000 characters.");
    } else if (activeModal === 'education') {
      if (!schoolInst.trim()) return toast.error("School name is required for High School");
      if (!schoolStart) return toast.error("Start Date is required for High School");
      if (!schoolEnd) return toast.error("End Date is required for High School");
      if (new Date(schoolStart) > new Date(schoolEnd)) {
        return toast.error("High School end date cannot be before start date");
      }

      if (hasInter) {
        if (!interInst.trim()) return toast.error("College/School name is required for Intermediate");
        if (!interStream.trim()) return toast.error("Stream/Field of Study is required for Intermediate");
        if (!interStart) return toast.error("Start Date is required for Intermediate");
        if (!interEnd) return toast.error("End Date is required for Intermediate");
        if (new Date(interStart) > new Date(interEnd)) {
          return toast.error("Intermediate end date cannot be before start date");
        }
      }

      if (hasDiploma) {
        if (!diplInst.trim()) return toast.error("College/Institute name is required for Diploma");
        if (!diplBranch.trim()) return toast.error("Branch/Field of Study is required for Diploma");
        if (!diplStart) return toast.error("Start Date is required for Diploma");
        if (!diplEnd) return toast.error("End Date is required for Diploma");
        if (new Date(diplStart) > new Date(diplEnd)) {
          return toast.error("Diploma end date cannot be before start date");
        }
      }

      if (hasDegree) {
        if (!degreeInst.trim()) return toast.error("College/University name is required for Degree");
        if (!degreeName.trim()) return toast.error("Degree Type (e.g. B.Tech) is required for Degree");
        if (!degreeBranch.trim()) return toast.error("Branch/Field of Study is required for Degree");
        if (!degreeStart) return toast.error("Start Date is required for Degree");
        if (!degreeEnd) return toast.error("End Date is required for Degree");
        if (new Date(degreeStart) > new Date(degreeEnd)) {
          return toast.error("Degree end date cannot be before start date");
        }
      }

      const builtList = [];
      builtList.push({
        institution: schoolInst.trim(),
        degree: "High School",
        field_of_study: "General",
        start_date: schoolStart,
        end_date: schoolEnd,
        grade: schoolGrade.trim() || ""
      });

      if (hasInter) {
        builtList.push({
          institution: interInst.trim(),
          degree: "Intermediate (12th)",
          field_of_study: interStream.trim(),
          start_date: interStart,
          end_date: interEnd,
          grade: interGrade.trim() || ""
        });
      }

      if (hasDiploma) {
        builtList.push({
          institution: diplInst.trim(),
          degree: "Diploma",
          field_of_study: diplBranch.trim(),
          start_date: diplStart,
          end_date: diplEnd,
          grade: diplGrade.trim() || ""
        });
      }

      if (hasDegree) {
        builtList.push({
          institution: degreeInst.trim(),
          degree: degreeName.trim(),
          field_of_study: degreeBranch.trim(),
          start_date: degreeStart,
          end_date: degreeEnd,
          grade: degreeGrade.trim() || ""
        });
      }

      editData.education = builtList;
    } else if (activeModal === 'projects') {
      for (const proj of editData.projects) {
        if (!proj.title?.trim()) return toast.error("Project Title is required for all entries");
        if (!proj.description?.trim()) return toast.error("Project Description is required for all entries");
      }
    } else if (activeModal === 'experience') {
      for (const exp of editData.experience) {
        if (!exp.role?.trim()) return toast.error("Role is required for all entries");
        if (!exp.company?.trim()) return toast.error("Company is required for all entries");
        if (!exp.isCurrent && exp.start_date && exp.end_date && new Date(exp.start_date) > new Date(exp.end_date)) {
          return toast.error("End date cannot be before start date for Experience");
        }
      }
    } else if (activeModal === 'certifications') {
      for (const cert of editData.certifications) {
        if (!cert.name?.trim()) return toast.error("Certification Name is required");
        if (!cert.issuingOrganization?.trim()) return toast.error("Issuing Organization is required");
      }
    }

    try {
      const { data } = await api.put(`/students/profile/${user?.id}/section/${activeModal}`, editData);
      if (data.success) {
        await fetchProfile();
        setActiveModal(null);
        toast.success(`${activeModal.charAt(0).toUpperCase() + activeModal.slice(1)} updated!`);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to save changes");
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Talent Profile...</p>
      </div>
    </div>
  );

  const score = profile?.completeness_score || 0;
  const nextStep = score < 15 ? 'Complete Personal Info' : 
                   score < 25 ? 'Set Career Preferences' :
                   score < 40 ? 'Add your Education' :
                   score < 55 ? 'List your Top 3 Skills' :
                   score < 70 ? 'Showcase 1 Project' :
                   score < 80 ? 'Add Professional Summary' :
                   score < 90 ? 'Upload your Resume' : 'Perfect Profile!';

  return (
    <div className="max-w-7xl mx-auto py-2 font-sans text-slate-800">
      <div className="w-full">
        {/* Standardized Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 pb-5 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 shrink-0">
                <User size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-2.5xl sm:text-4xl font-black text-slate-900 uppercase tracking-tight leading-none">Student Profile</h1>
                <p className="text-slate-500 font-bold text-[9px] sm:text-[10px] uppercase tracking-[0.3em] mt-2">OPTIMIZE COMPLETENESS TO BOOST RECRUITER DISCOVERY</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-slate-150 p-3 rounded-2xl shadow-sm self-stretch md:self-auto flex items-center justify-between gap-3">
            <div className="text-left md:text-right">
               <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Completeness Score</div>
               <div className="text-xs sm:text-sm font-black text-slate-800 leading-none">{score}% Complete</div>
            </div>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${
              score < 78 
                ? 'bg-red-50 text-red-600 border-red-100' 
                : 'bg-emerald-50 text-emerald-600 border-emerald-100'
            }`}>
               <CheckCircle size={18} />
            </div>
          </div>
        </div>

        {score < 70 && (
          <div className="mb-8 p-6 bg-gradient-to-r from-red-50 to-amber-50 border border-red-200/60 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm animate-pulse-slow">
            <div className="flex gap-4 items-start">
              <div className="p-3 bg-red-100 text-red-600 rounded-2xl shrink-0 mt-0.5">
                <AlertCircle size={22} />
              </div>
              <div>
                <h4 className="font-extrabold text-red-900 text-base">Complete Your Student Profile First</h4>
                <p className="text-sm font-semibold text-red-700/80 mt-1">Your profile is currently at {score}% completeness. Please complete the missing sections to reach at least 70% completeness to unlock all other pages, services, mock interviews, and job applications on VEGA.</p>
              </div>
            </div>
            <div className="shrink-0 bg-white border border-red-100 px-4 py-2 rounded-xl font-bold text-xs text-red-700 font-mono shadow-sm">
              Required: 70% • Current: {score}%
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Sidebar / Left Column */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* User Basic Info Card */}
            <div className="bg-white rounded-[40px] p-10 shadow-xl shadow-slate-200/50 border border-white text-center relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-blue-600 to-indigo-700 -z-10" />
              <div className="w-32 h-32 rounded-[40px] bg-white p-2 mx-auto mb-6 shadow-xl relative mt-4 group">
                <img 
                  src={profile?.profile_photo_url 
                    ? (profile.profile_photo_url.startsWith('http') ? profile.profile_photo_url : `${api.defaults.baseURL?.replace('/api', '')}${profile.profile_photo_url}`)
                    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} 
                  alt="Avatar" 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover rounded-[32px]"
                />
                <input 
                  type="file" 
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const formData = new FormData();
                    formData.append("avatar", file);
                    try {
                      const { data } = await api.post(`/students/upload-avatar/${user?.id}`, formData, {
                        headers: { "Content-Type": "multipart/form-data" }
                      });
                      if (data.success) {
                        toast.success("Profile photo updated!");
                        fetchProfile();
                      }
                    } catch (err: any) {
                      toast.error(err.response?.data?.message || "Failed to upload photo");
                    }
                  }}
                />
                <div className="absolute inset-0 bg-black/40 rounded-[32px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <Upload className="text-white" size={24} />
                </div>
              </div>
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-1 flex items-center justify-center gap-2">
                {profile?.full_name || "New Student"}
                <button onClick={() => handleEdit('personal')} className="text-slate-400 hover:text-blue-600 transition-colors pointer-events-auto">
                  <Pencil size={18} />
                </button>
              </h2>
              <p className="text-blue-600 font-black text-[10px] uppercase tracking-[0.2em] mb-3">{profile?.headline || "Fresh Talent"}</p>
              
              {profile?.tb_id && (
                <div className="mb-4">
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-100 rounded-full text-xs font-mono font-black tracking-wider shadow-sm">
                    <Sparkles size={11} className="text-blue-500 animate-pulse" />
                    TB ID: {profile.tb_id}
                  </span>
                </div>
              )}
              
              <div className="flex flex-col gap-3 text-left bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                <div className="flex items-center gap-3 text-slate-600 text-xs font-bold">
                  <Mail size={16} className="text-slate-400" /> {user?.email}
                </div>
                <div className="flex items-center gap-3 text-slate-600 text-xs font-bold">
                  <Phone size={16} className="text-slate-400" /> {profile?.contact || "Add number"}
                </div>
                <div className="flex items-center gap-3 text-slate-600 text-xs font-bold">
                  <MapPin size={16} className="text-slate-400" /> {profile?.location ? `${profile.location}${profile.country ? `, ${profile.country}` : ""}` : (profile?.country || "Add location")}
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col gap-2">
                <button onClick={logout} className="flex items-center justify-center gap-2 py-4 text-red-500 font-black uppercase tracking-widest text-[10px] hover:bg-red-50 rounded-2xl transition-all">
                  <LogOut size={16} /> Sign Out Account
                </button>
              </div>
            </div>

            {/* Quick Navigation Links */}
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-200">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-4">Profile Sections</h4>
              <nav className="space-y-1">
                {[
                  { id: 'personal', label: 'Personal Information', icon: User },
                  { id: 'preferences', label: 'Career Preferences', icon: Briefcase },
                  { id: 'education', label: 'Education Details', icon: GraduationCap },
                  { id: 'skills', label: 'Technical Skills', icon: Award },
                  { id: 'projects', label: 'Work & Projects', icon: Trophy },
                  { id: 'summary', label: 'Profile Summary', icon: FileText },
                  { id: 'resume', label: 'Resume/CV', icon: FileDown }
                ].map((item) => (
                  <button 
                    key={item.id}
                    onClick={() => document.getElementById(`section-${item.id}`)?.scrollIntoView({ behavior: 'smooth' })}
                    className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 text-slate-600 font-bold text-sm transition-all text-left"
                  >
                    <span className="flex items-center gap-3">
                      <item.icon size={18} className="text-slate-400" />
                      {item.label}
                    </span>
                    <ChevronRight size={14} className="text-slate-300" />
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content Column */}
          <div className="lg:col-span-8 space-y-10">
            
            {/* Completion Header */}
            <CompletionBar score={score} nextStep={nextStep} />

            {/* Career Preferences - Detailed */}
            <SectionCard 
              title="Career Preferences" 
              icon={Briefcase} 
              onEdit={() => handleEdit('preferences')}
              isCompleted={!!(profile?.preferred_job_role && profile?.preferred_location)}
              description="Help recruiters find you for right roles"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Preferred Role</p>
                  <p className="text-sm font-black text-slate-800">{profile?.preferred_job_role || "Not Set"}</p>
                </div>
                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Location</p>
                  <p className="text-sm font-black text-slate-800">{profile?.preferred_location || "Anywhere"}</p>
                </div>
                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Availability</p>
                  <p className="text-sm font-black text-slate-800">{profile?.availability || "Immediate"}</p>
                </div>
                {profile?.is_placed === 1 && (
                  <div className="p-5 bg-emerald-50 rounded-3xl border border-emerald-100 col-span-full flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Campus Placement Status</p>
                      <h4 className="text-base font-black text-emerald-900 flex items-center gap-2">
                        <CheckCircle size={18} className="text-emerald-500" />
                        Placed @ {profile?.placed_company || "N/A"}
                      </h4>
                    </div>
                    {profile?.is_top_performer === 1 && (
                      <span className="w-max inline-flex items-center gap-1 text-[10px] font-black uppercase py-1 px-3 bg-amber-500/10 text-amber-700 border border-amber-200 rounded-xl">
                        ⭐ Elite Performer
                      </span>
                    )}
                  </div>
                )}
              </div>
            </SectionCard>

            {/* Summary */}
            <SectionCard 
              title="Profile Summary" 
              icon={FileText} 
              onEdit={() => handleEdit('summary')}
              isCompleted={profile?.bio?.length > 50}
              description="A brief pitch about yourself"
            >
              <p className="text-slate-600 text-sm leading-relaxed font-medium whitespace-pre-wrap break-words overflow-hidden">
                {profile?.bio || "Describe your professional journey, goals, and passions..."}
              </p>
            </SectionCard>

            {/* Skills */}
            <SectionCard 
              title="Key Skills" 
              icon={Award} 
              onEdit={() => handleEdit('skills')}
              isCompleted={parseJSON(profile?.skills_json).length >= 3}
              description="Add technical and soft skills"
            >
              <div className="flex flex-wrap gap-3">
                {(() => {
                    const skills = parseJSON(profile?.skills_json);
                    return skills.length > 0 ? skills.map((skill: string) => (
                      <span key={skill} className="px-5 py-3 bg-blue-50 text-blue-700 rounded-2xl text-[11px] font-black uppercase tracking-widest border border-blue-100">
                        {skill}
                      </span>
                    )) : <p className="text-slate-400 text-xs italic">No skills added yet</p>;
                })()}
              </div>
            </SectionCard>

            {/* Education */}
            <SectionCard 
              title="Education" 
              icon={GraduationCap} 
              onEdit={() => handleEdit('education')}
              isCompleted={profile?.education?.length > 0}
              description="Your academic background"
            >
              <div className="space-y-6">
                {profile?.education && profile.education.length > 0 ? profile.education.map((edu: Education, idx: number) => (
                  <div key={idx} className="flex gap-6 relative">
                    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center shrink-0 border border-indigo-100">
                      <GraduationCap className="text-indigo-600" size={28} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">{edu.institution}</h4>
                      <p className="text-slate-500 font-bold text-sm mb-2">
                        {edu.degree} {edu.field_of_study ? `in ${edu.field_of_study}` : ''}
                      </p>
                      <div className="flex items-center gap-4 text-xs font-black text-slate-400 uppercase tracking-widest">
                        <span className="flex items-center gap-1"><Calendar size={12}/> {edu.start_date?.split('-')[0] || "N/A"} - {edu.end_date?.split('-')[0] || "Present"}</span>
                        {edu.grade && <span className="bg-slate-100 px-2 py-1 rounded text-slate-600">Grade: {edu.grade}</span>}
                      </div>
                    </div>
                  </div>
                )) : <p className="text-slate-400 text-xs italic">Add your high school, college, or other degrees</p>}
              </div>
            </SectionCard>

            {/* Experience */}
            <SectionCard 
              title="Internships & Work" 
              icon={Building2} 
              onEdit={() => handleEdit('experience')}
              isCompleted={profile?.experience?.length > 0}
              description="Real-world professional exposure"
            >
              <div className="space-y-8">
                {profile?.experience && profile.experience.length > 0 ? profile.experience.map((exp: Experience, idx: number) => (
                  <div key={idx} className="flex gap-6">
                    <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-100">
                      <Briefcase className="text-emerald-600" size={28} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">{exp.role}</h4>
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">{exp.isCurrent ? 'Current' : 'Completed'}</span>
                      </div>
                      <p className="text-slate-500 font-bold text-sm mb-2">{exp.company} • {exp.location}</p>
                      <p className="text-xs text-slate-600 leading-relaxed mb-4">{exp.description}</p>
                      <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <Calendar size={12}/> {exp.start_date || "Start"} - {exp.isCurrent ? "Present" : (exp.end_date || "End")}
                      </div>
                    </div>
                  </div>
                )) : <p className="text-slate-400 text-xs italic">Tell employers about internships or jobs you've had</p>}
              </div>
            </SectionCard>

            {/* Projects */}
            <SectionCard 
              title="Featured Projects" 
              icon={Trophy} 
              onEdit={() => handleEdit('projects')}
              isCompleted={profile?.projects?.length > 0}
              description="Showcase what you've built"
            >
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {profile?.projects && profile.projects.length > 0 ? profile.projects.map((proj: Project, idx: number) => (
                  <div key={idx} className="p-8 bg-slate-50 rounded-[32px] border border-slate-100 hover:border-blue-200 transition-all">
                    <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">{proj.title}</h4>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed mb-4 line-clamp-3">{proj.description}</p>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {proj.techStack?.split(',').map((tech: string) => (
                        <span key={tech} className="px-2 py-1 bg-white text-[9px] font-black text-slate-400 uppercase tracking-widest rounded border border-slate-200">{tech.trim()}</span>
                      ))}
                    </div>
                    <div className="flex gap-4">
                      {proj.githubLink && (
                        <a href={proj.githubLink} target="_blank" className="p-2 bg-white text-slate-400 rounded-xl border border-slate-200 hover:text-slate-900 transition-all">
                          <Github size={18}/>
                        </a>
                      )}
                      {proj.link && (
                        <a href={proj.link} target="_blank" className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 font-black text-[10px] uppercase tracking-widest rounded-xl border border-blue-100 hover:bg-blue-50 transition-all">
                          Live <ExternalLink size={14}/>
                        </a>
                      )}
                    </div>
                  </div>
                )) : <p className="text-slate-400 text-xs italic">Show off your coding projects, designs, or case studies</p>}
              </div>
            </SectionCard>

            {/* Certifications */}
            <SectionCard 
              title="Certifications" 
              icon={Award} 
              onEdit={() => handleEdit('certifications')}
              isCompleted={profile?.certifications?.length > 0}
              description="Courses and valid badges"
            >
              <div className="space-y-4">
                {profile?.certifications && profile.certifications.length > 0 ? profile.certifications.map((cert: Certification, idx: number) => (
                  <div key={idx} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200 shrink-0">
                      <Award className="text-blue-500" size={20} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">{cert.name}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{cert.issuingOrganization}</p>
                    </div>
                    {cert.credentialUrl && (
                      <a href={cert.credentialUrl} target="_blank" className="p-2 hover:bg-white rounded-lg text-blue-600 transition-all">
                        <ExternalLink size={16} />
                      </a>
                    )}
                  </div>
                )) : <p className="text-slate-400 text-xs italic">List your professional certifications</p>}
              </div>
            </SectionCard>

            {/* Extracurricular & Leadership */}
            <SectionCard 
              title="Extracurricular & Leadership" 
              icon={Trophy} 
              onEdit={() => handleEdit('extracurricular')}
              isCompleted={profile?.extracurriculars && profile.extracurriculars.length > 0}
              description="Leadership, sports, and volunteering"
            >
              <div className="space-y-4">
                {profile?.extracurriculars && profile.extracurriculars.length > 0 ? profile.extracurriculars.map((activity: ExtracurricularActivity, idx: number) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 bg-slate-50 rounded-3xl border border-slate-100">
                    <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center border border-rose-100 shrink-0">
                      <Trophy className="text-rose-500" size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">{activity.title}</h4>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-100">{activity.category}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-500 mb-2">{activity.organization_name} {activity.achievement_rank ? `• ${activity.achievement_rank}` : ''}</p>
                      <p className="text-xs text-slate-600 line-clamp-2">{activity.description}</p>
                    </div>
                    {activity.certificate_url && (
                      <a href={activity.certificate_url} target="_blank" className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 text-blue-600 transition-all shrink-0 self-start sm:self-center flex items-center justify-center">
                        <ExternalLink size={18} />
                      </a>
                    )}
                  </div>
                )) : <p className="text-slate-400 text-xs italic">Add your extracurricular activities and leadership roles</p>}
              </div>
            </SectionCard>

            {/* Resume Upload Section */}
            <SectionCard 
              title="Resume & Documents" 
              icon={FileDown} 
              onEdit={() => handleEdit('resume')}
              isCompleted={!!profile?.resume_url}
              description="Unlock job applications"
            >
              <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 flex flex-col md:flex-row items-center gap-6">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center border border-slate-200 shrink-0">
                  <FileText className={profile?.resume_url ? "text-emerald-500" : "text-slate-300"} size={32} />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h4 className="font-black text-slate-800 uppercase tracking-tight mb-1">{profile?.resume_url ? "Your Active Resume" : "No Resume Uploaded"}</h4>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {profile?.resume_url ? "Last updated recently • PDF Format" : "Upload your resume to apply for verified jobs"}
                  </p>
                </div>
                <div className="flex gap-3">
                  {profile?.resume_url ? (
                    <div className="flex items-center gap-3">
                      <a href={profile.resume_url} target="_blank" className="px-6 py-3 bg-white border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all">
                        Preview
                      </a>
                      <button onClick={() => handleEdit('resume')} className="px-6 py-3 bg-blue-50 text-blue-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-100 transition-all">
                        Update
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => handleEdit('resume')} className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">
                      Upload Now
                    </button>
                  )}
                </div>
              </div>
            </SectionCard>

          </div>
        </div>
      </div>

      {/* --- EDIT MODALS --- */}
      
      {/* Personal Info Modal */}
      <EditModal 
        title="Personal Information" 
        isOpen={activeModal === 'personal'} 
        onClose={() => setActiveModal(null)} 
        onSave={saveSection}
      >
        <div className="space-y-6">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Full Name</label>
            <input 
              type="text" 
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-800 focus:outline-none focus:border-blue-500"
              value={editData.fullName || ""}
              onChange={(e) => setEditData({...editData, fullName: e.target.value})}
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Profile Headline</label>
            <input 
              type="text" 
              placeholder="e.g. Full Stack Developer | UI Designer"
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-800 focus:outline-none focus:border-blue-500"
              value={editData.headline || ""}
              onChange={(e) => setEditData({...editData, headline: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Contact Number</label>
              <input 
                type="text" 
                maxLength={10}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-800 focus:outline-none focus:border-blue-500"
                value={editData.contact || ""}
                onChange={(e) => setEditData({...editData, contact: e.target.value.replace(/\D/g, "").slice(0, 10)})}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">City/Location</label>
              <input 
                type="text" 
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-800 focus:outline-none focus:border-blue-500"
                value={editData.location || ""}
                onChange={(e) => setEditData({...editData, location: e.target.value})}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Country</label>
              <select 
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-800 focus:outline-none focus:border-blue-500"
                value={editData.country || ""}
                onChange={(e) => setEditData({...editData, country: e.target.value})}
              >
                <option value="">Select Country</option>
                <option value="India">India</option>
                <option value="USA">USA</option>
                <option value="Europe / EU">Europe / EU</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="UAE">UAE</option>
                <option value="Saudi Arabia">Saudi Arabia</option>
                <option value="Canada">Canada</option>
                <option value="Australia">Australia</option>
                <option value="Singapore">Singapore</option>
                <option value="Germany">Germany</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div></div>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Address</label>
            <textarea 
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-800 focus:outline-none focus:border-blue-500 min-h-[100px]"
              value={editData.address || ""}
              onChange={(e) => setEditData({...editData, address: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-6">
             <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Date of Birth</label>
              <input 
                type="date" 
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-800 focus:outline-none focus:border-blue-500"
                value={editData.dob || ""}
                onChange={(e) => setEditData({...editData, dob: e.target.value})}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Gender</label>
              <select 
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-800 focus:outline-none focus:border-blue-500"
                value={editData.gender || ""}
                onChange={(e) => setEditData({...editData, gender: e.target.value})}
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>
      </EditModal>

      {/* Career Preferences Modal */}
      <EditModal 
        title="Career Preferences" 
        isOpen={activeModal === 'preferences'} 
        onClose={() => setActiveModal(null)} 
        onSave={saveSection}
      >
        <div className="space-y-6">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Preferred Job Role</label>
            <input 
              type="text" 
              placeholder="e.g. Software Engineer, UI Designer"
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-800 focus:outline-none focus:border-blue-500"
              value={editData.preferredJobRole || ""}
              onChange={(e) => setEditData({...editData, preferredJobRole: e.target.value})}
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Preferred Work Location</label>
            <input 
              type="text" 
              placeholder="e.g. Remote, Bangalore, Mumbai"
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-800 focus:outline-none focus:border-blue-500"
              value={editData.preferredLocation || ""}
              onChange={(e) => setEditData({...editData, preferredLocation: e.target.value})}
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Availability Status</label>
            <select 
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-800 focus:outline-none focus:border-blue-500"
              value={editData.availability || "Immediate"}
              onChange={(e) => setEditData({...editData, availability: e.target.value})}
            >
              <option value="Immediate">Available to start immediately</option>
              <option value="15 Days">Serving 15 days notice</option>
              <option value="1 Month">Serving 1 month notice</option>
              <option value="Non-urgent">Active but not urgent</option>
            </select>
          </div>

          <div className="border-t border-slate-100 pt-6 space-y-4">
            <h4 className="text-xs font-black text-slate-705 uppercase tracking-widest mb-2">Campus Placement Achievement</h4>
            
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div>
                <label className="text-xs font-black text-slate-800 block">Have you secured a campus placement?</label>
                <span className="text-[10px] text-slate-400 font-bold block">Toggling 'Yes' will showcase you in the Success Gallery first</span>
              </div>
              <button 
                type="button"
                onClick={() => setEditData({...editData, isPlaced: !editData.isPlaced})}
                className={`w-14 h-8 rounded-full p-1 transition-all ${editData.isPlaced ? 'bg-emerald-500' : 'bg-slate-200'} relative`}
              >
                <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-all ${editData.isPlaced ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            {editData.isPlaced && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-4"
              >
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Placement Company Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Google, Microsoft, TCS, Infosys"
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-150 rounded-2xl font-black text-slate-800 focus:outline-none focus:border-blue-500"
                    value={editData.placedCompany || ""}
                    onChange={(e) => setEditData({...editData, placedCompany: e.target.value})}
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <label className="text-xs font-black text-slate-800 block">Is this a top tier / elite role?</label>
                    <span className="text-[10px] text-slate-400 font-bold block">Designates an Elite Rank badge next to your success card</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setEditData({...editData, isTopPerformer: !editData.isTopPerformer})}
                    className={`w-14 h-8 rounded-full p-1 transition-all ${editData.isTopPerformer ? 'bg-indigo-500' : 'bg-slate-200'} relative`}
                  >
                    <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-all ${editData.isTopPerformer ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </EditModal>

      {/* Profile Summary Modal */}
      <EditModal 
        title="Profile Summary" 
        isOpen={activeModal === 'summary'} 
        onClose={() => setActiveModal(null)} 
        onSave={saveSection}
        isSaveDisabled={(editData.summary || "").trim().length < 50 || (editData.summary || "").trim().length > 5000}
      >
        <div className="space-y-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
            Write a clear, brief professional summary that highlights your background, top skills, and what you aim to achieve.
          </p>
          <textarea 
            className="w-full px-6 py-6 bg-slate-50 border border-slate-100 rounded-[32px] font-bold text-slate-600 focus:outline-none focus:border-blue-500 min-h-[250px] leading-relaxed"
            placeholder="Write your pitch here..."
            value={editData.summary || ""}
            maxLength={5000}
            onChange={(e) => setEditData({...editData, summary: e.target.value})}
          />
          <div className="flex justify-between items-center pt-2">
            <div>
              {(editData.summary || "").trim().length < 50 ? (
                <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">
                  Profile summary must be at least 50 characters.
                </span>
              ) : (editData.summary || "").trim().length > 5000 ? (
                <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">
                  Profile summary cannot exceed 5000 characters.
                </span>
              ) : (
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
                  Meets length requirement
                </span>
              )}
            </div>
            <span className={`text-[10px] font-black uppercase tracking-widest ${(editData.summary || "").trim().length >= 50 && (editData.summary || "").trim().length <= 5000 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {(editData.summary || "").trim().length} / 5000 characters
            </span>
          </div>
        </div>
      </EditModal>

      {/* Skills Modal */}
      <EditModal 
        title="Key Skills" 
        isOpen={activeModal === 'skills'} 
        onClose={() => {
          setActiveModal(null);
          setStudentSkillInput("");
          setShowStudentSkillsDropdown(false);
          setStudentSkillsActiveIndex(-1);
        }} 
        onSave={() => {
          saveSection();
          setStudentSkillInput("");
          setShowStudentSkillsDropdown(false);
          setStudentSkillsActiveIndex(-1);
        }}
      >
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2 mb-4 min-h-[60px] p-4 bg-slate-50 rounded-2xl border border-slate-100">
            {editData.skills?.map((skill: string, index: number) => (
              <span key={index} className="flex items-center gap-2 px-3 py-1.5 bg-white text-blue-600 font-bold text-sm rounded-xl border border-blue-100">
                {skill}
                <button 
                  onClick={() => {
                    const newSkills = [...editData.skills];
                    newSkills.splice(index, 1);
                    setEditData({...editData, skills: newSkills});
                  }}
                  className="p-1 hover:bg-slate-50 rounded-md text-slate-300 hover:text-red-500 transition-all"
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-4 items-stretch relative">
            <div className="flex-1 relative" ref={studentSkillsContainerRef}>
              <input 
                type="text" 
                placeholder="Add skill (e.g. React, Python)"
                value={studentSkillInput}
                onChange={(e) => {
                  setStudentSkillInput(e.target.value);
                  setShowStudentSkillsDropdown(true);
                  setStudentSkillsActiveIndex(-1);
                }}
                onFocus={() => setShowStudentSkillsDropdown(true)}
                onKeyDown={(e: any) => {
                  const filteredList = PREDEFINED_SKILLS.filter(skill => {
                    const isAlreadySelected = editData.skills?.some((s: string) => s.toLowerCase() === skill.toLowerCase());
                    if (isAlreadySelected) return false;
                    if (!e.target.value) return true;
                    return skill.toLowerCase().includes(e.target.value.toLowerCase());
                  });

                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (!showStudentSkillsDropdown) {
                      setShowStudentSkillsDropdown(true);
                      setStudentSkillsActiveIndex(0);
                    } else {
                      setStudentSkillsActiveIndex(prev => 
                        prev < filteredList.length - 1 ? prev + 1 : prev
                      );
                    }
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (showStudentSkillsDropdown) {
                      setStudentSkillsActiveIndex(prev => prev > 0 ? prev - 1 : 0);
                    }
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (showStudentSkillsDropdown && studentSkillsActiveIndex >= 0 && studentSkillsActiveIndex < filteredList.length) {
                      const selected = filteredList[studentSkillsActiveIndex];
                      if (!editData.skills?.includes(selected)) {
                        setEditData(prev => ({
                          ...prev,
                          skills: [...(prev.skills || []), selected]
                        }));
                      }
                      setStudentSkillInput("");
                      setShowStudentSkillsDropdown(false);
                      setStudentSkillsActiveIndex(-1);
                    } else if (studentSkillInput.trim()) {
                      const val = studentSkillInput.trim();
                      if (!editData.skills?.includes(val)) {
                        setEditData(prev => ({
                          ...prev,
                          skills: [...(prev.skills || []), val]
                        }));
                      }
                      setStudentSkillInput("");
                      setShowStudentSkillsDropdown(false);
                      setStudentSkillsActiveIndex(-1);
                    }
                  } else if (e.key === 'Escape') {
                    setShowStudentSkillsDropdown(false);
                    setStudentSkillsActiveIndex(-1);
                  }
                }}
                className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 focus:outline-none focus:border-blue-500"
              />
              {showStudentSkillsDropdown && (
                (() => {
                  const filteredList = PREDEFINED_SKILLS.filter(skill => {
                    const isAlreadySelected = editData.skills?.some((s: string) => s.toLowerCase() === skill.toLowerCase());
                    if (isAlreadySelected) return false;
                    if (!studentSkillInput) return true;
                    return skill.toLowerCase().includes(studentSkillInput.toLowerCase());
                  });

                  if (filteredList.length === 0) return null;

                  return (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-[20px] shadow-2xl max-h-48 overflow-y-auto z-50 py-2 divide-y divide-slate-50">
                      {filteredList.map((skill, idx) => (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => {
                            if (!editData.skills?.includes(skill)) {
                              setEditData(prev => ({
                                ...prev,
                                skills: [...(prev.skills || []), skill]
                              }));
                            }
                            setStudentSkillInput("");
                            setShowStudentSkillsDropdown(false);
                            setStudentSkillsActiveIndex(-1);
                          }}
                          className={`w-full text-left px-5 py-3 text-xs font-bold transition-all flex items-center justify-between cursor-pointer uppercase tracking-wider ${
                            idx === studentSkillsActiveIndex 
                              ? 'bg-blue-50 text-blue-600' 
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          <span>{skill}</span>
                          {idx === studentSkillsActiveIndex && <span className="text-[9px] font-black uppercase text-blue-400">Enter to select</span>}
                        </button>
                      ))}
                    </div>
                  );
                })()
              )}
            </div>
            <button 
              className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg border-2 border-white hover:bg-blue-700 transition-all cursor-pointer"
              onClick={() => {
                if (studentSkillInput.trim()) {
                  const val = studentSkillInput.trim();
                  if (!editData.skills?.includes(val)) {
                    setEditData(prev => ({
                      ...prev,
                      skills: [...(prev.skills || []), val]
                    }));
                  }
                  setStudentSkillInput("");
                  setShowStudentSkillsDropdown(false);
                  setStudentSkillsActiveIndex(-1);
                }
              }}
            >
              <Plus size={20} />
            </button>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center mt-4">
            Press Enter or click + to add multiple skills
          </p>
        </div>
      </EditModal>

      {/* Education Modal */}
      <EditModal 
        title="Education History" 
        isOpen={activeModal === 'education'} 
        onClose={() => setActiveModal(null)} 
        onSave={saveSection}
      >
        <div className="space-y-8 max-h-[70vh] overflow-y-auto pr-2">
          
          {/* High School Section */}
          <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-3">
              <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs shrink-0 font-mono">1</div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">High School Education (10th Grade)</h3>
              <span className="text-[9px] font-black uppercase text-red-500 bg-red-50 px-2.5 py-1 rounded-full border border-red-100 ml-auto">Compulsory</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">School Board / School Name</label>
                <AutocompleteInput 
                  value={schoolInst}
                  onChange={setSchoolInst}
                  suggestions={SCHOOL_SUGGESTIONS}
                  type="school"
                  placeholder="e.g. CBSE, ICSE, MSBSHSE or school name"
                />
              </div>
              <div className="col-span-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Start Date</label>
                <input 
                  type="date" 
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono text-xs"
                  value={schoolStart}
                  onChange={(e) => setSchoolStart(e.target.value)}
                />
              </div>
              <div className="col-span-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">End Date</label>
                <input 
                  type="date" 
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  value={schoolEnd}
                  onChange={(e) => setSchoolEnd(e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Grade / Percentage / CGPA</label>
                <input 
                  type="text" 
                  placeholder="e.g. 9.8 CGPA or 92%"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs"
                  value={schoolGrade}
                  onChange={(e) => setSchoolGrade(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Intermediate Section */}
          <div className={`p-6 rounded-[32px] border transition-all duration-300 ${hasInter ? "bg-slate-50 border-slate-200 shadow-sm" : "bg-white border-slate-100 opacity-60 hover:opacity-100 hover:border-slate-200"}`}>
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-200">
              <input 
                type="checkbox" 
                id="hasInter"
                checked={hasInter} 
                onChange={(e) => setHasInter(e.target.checked)} 
                className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="hasInter" className="text-xs font-black text-slate-850 uppercase tracking-wider cursor-pointer flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xs font-mono shrink-0">2</div>
                Add Higher Secondary / Intermediate (12th Grade)
              </label>
              {hasInter && <span className="text-[9px] font-black uppercase text-red-500 bg-red-50 px-2.5 py-1 rounded-full border border-red-100 ml-auto">Compulsory</span>}
            </div>
            
            {hasInter && (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Junior College / High School Name</label>
                  <AutocompleteInput 
                    value={interInst}
                    onChange={setInterInst}
                    suggestions={COLLEGE_SUGGESTIONS}
                    type="school"
                    placeholder="Search or enter college name"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Stream / Board</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Science, Commerce, Arts (State Board / CBSE)"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs"
                    value={interStream}
                    onChange={(e) => setInterStream(e.target.value)}
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Start Date</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono text-xs"
                    value={interStart}
                    onChange={(e) => setInterStart(e.target.value)}
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">End Date</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono text-xs"
                    value={interEnd}
                    onChange={(e) => setInterEnd(e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Grade / Percentage</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 88% or 8.8 CGPA"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs"
                    value={interGrade}
                    onChange={(e) => setInterGrade(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Diploma Section */}
          <div className={`p-6 rounded-[32px] border transition-all duration-300 ${hasDiploma ? "bg-slate-50 border-slate-200 shadow-sm" : "bg-white border-slate-100 opacity-60 hover:opacity-100 hover:border-slate-200"}`}>
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-200">
              <input 
                type="checkbox" 
                id="hasDiploma"
                checked={hasDiploma} 
                onChange={(e) => setHasDiploma(e.target.checked)} 
                className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="hasDiploma" className="text-xs font-black text-slate-850 uppercase tracking-wider cursor-pointer flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-xs font-mono shrink-0">3</div>
                Add Diploma / Polytechnic Details
              </label>
              {hasDiploma && <span className="text-[9px] font-black uppercase text-red-500 bg-red-50 px-2.5 py-1 rounded-full border border-red-100 ml-auto">Compulsory</span>}
            </div>
            
            {hasDiploma && (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Polytechnic / College Name</label>
                  <AutocompleteInput 
                    value={diplInst}
                    onChange={setDiplInst}
                    suggestions={COLLEGE_SUGGESTIONS}
                    type="college"
                    placeholder="Search or enter polytechnic name"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Branch / Field of Study</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Mechanical Engineering, Computer Engineering"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs"
                    value={diplBranch}
                    onChange={(e) => setDiplBranch(e.target.value)}
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Start Date</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono text-xs"
                    value={diplStart}
                    onChange={(e) => setDiplStart(e.target.value)}
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">End Date</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono text-xs"
                    value={diplEnd}
                    onChange={(e) => setDiplEnd(e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Grade / Percentage</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 9.1 CGPA or 85%"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs"
                    value={diplGrade}
                    onChange={(e) => setDiplGrade(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Undergrad/Postgrad Degree Section */}
          <div className={`p-6 rounded-[32px] border transition-all duration-300 ${hasDegree ? "bg-slate-50 border-slate-200 shadow-sm" : "bg-white border-slate-100 opacity-60 hover:opacity-100 hover:border-slate-200"}`}>
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-200">
              <input 
                type="checkbox" 
                id="hasDegree"
                checked={hasDegree} 
                onChange={(e) => setHasDegree(e.target.checked)} 
                className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="hasDegree" className="text-xs font-black text-slate-850 uppercase tracking-wider cursor-pointer flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xs font-mono shrink-0">4</div>
                Add Graduation / UG / PG Degree Details
              </label>
              {hasDegree && <span className="text-[9px] font-black uppercase text-red-500 bg-red-50 px-2.5 py-1 rounded-full border border-red-100 ml-auto">Compulsory</span>}
            </div>
            
            {hasDegree && (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Degree-Granting College / University Name</label>
                  <AutocompleteInput 
                    value={degreeInst}
                    onChange={setDegreeInst}
                    suggestions={COLLEGE_SUGGESTIONS}
                    type="college"
                    placeholder="Search or enter degree college name"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Degree Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. B.Tech, BCA, B.Sc"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs"
                    value={degreeName}
                    onChange={(e) => setDegreeName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Field of Study / Branch</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Computer Science & Engineering"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs"
                    value={degreeBranch}
                    onChange={(e) => setDegreeBranch(e.target.value)}
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Start Date</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono text-xs"
                    value={degreeStart}
                    onChange={(e) => setDegreeStart(e.target.value)}
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">End Date (or Expected)</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono text-xs"
                    value={degreeEnd}
                    onChange={(e) => setDegreeEnd(e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Grade / Percentage / CGPA</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 9.15 CGPA or 87%"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs"
                    value={degreeGrade}
                    onChange={(e) => setDegreeGrade(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

        </div>
      </EditModal>

      {/* Projects Modal */}
      <EditModal 
        title="Project Showcase" 
        isOpen={activeModal === 'projects'} 
        onClose={() => setActiveModal(null)} 
        onSave={saveSection}
      >
        <div className="space-y-8">
          {editData.projects?.map((proj: any, index: number) => (
            <div key={index} className="p-8 bg-slate-50 rounded-[40px] border border-slate-100 relative group">
               <button 
                onClick={() => {
                  const newList = [...editData.projects];
                  newList.splice(index, 1);
                  setEditData({...editData, projects: newList});
                }}
                className="absolute -top-2 -right-2 p-2 bg-white text-red-500 rounded-xl shadow-md border border-red-50 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 size={16} />
              </button>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Project Title</label>
                  <input 
                    type="text" 
                    className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl font-black text-slate-800"
                    value={proj.title}
                    onChange={(e) => {
                      const newList = [...editData.projects];
                      newList[index].title = e.target.value;
                      setEditData({...editData, projects: newList});
                    }}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Description</label>
                  <textarea 
                    className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl font-medium text-slate-600 min-h-[100px]"
                    value={proj.description}
                    onChange={(e) => {
                      const newList = [...editData.projects];
                      newList[index].description = e.target.value;
                      setEditData({...editData, projects: newList});
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Tech Stack (comma separated)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. React, Node, SQL"
                      className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700"
                      value={proj.techStack}
                      onChange={(e) => {
                        const newList = [...editData.projects];
                        newList[index].techStack = e.target.value;
                        setEditData({...editData, projects: newList});
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Live / Demo Link</label>
                    <input 
                      type="text" 
                      className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700"
                      value={proj.link}
                      onChange={(e) => {
                        const newList = [...editData.projects];
                        newList[index].link = e.target.value;
                        setEditData({...editData, projects: newList});
                      }}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">GitHub Link</label>
                    <input 
                      type="text" 
                      className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700"
                      value={proj.githubLink}
                      onChange={(e) => {
                        const newList = [...editData.projects];
                        newList[index].githubLink = e.target.value;
                        setEditData({...editData, projects: newList});
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
          <button 
            onClick={() => setEditData({...editData, projects: [...(editData.projects || []), { title: "", description: "", techStack: "", link: "", githubLink: "" }]})}
            className="w-full py-6 bg-blue-50 text-blue-600 rounded-[40px] border-2 border-dashed border-blue-200 font-black uppercase tracking-widest text-xs hover:bg-blue-100 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={18} /> Add New Project
          </button>
        </div>
      </EditModal>

      {/* Experience Modal */}
      <EditModal 
        title="Work Experience" 
        isOpen={activeModal === 'experience'} 
        onClose={() => setActiveModal(null)} 
        onSave={saveSection}
      >
        <div className="space-y-8">
          {editData.experience?.map((exp: any, index: number) => (
            <div key={index} className="p-8 bg-slate-50 rounded-[40px] border border-slate-100 relative group">
              <button 
                onClick={() => {
                  const newList = [...editData.experience];
                  newList.splice(index, 1);
                  setEditData({...editData, experience: newList});
                }}
                className="absolute -top-2 -right-2 p-2 bg-white text-red-500 rounded-xl shadow-md border border-red-50 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 size={16} />
              </button>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Role / Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Frontend Intern"
                    className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl font-black text-slate-800"
                    value={exp.role}
                    onChange={(e) => {
                      const newList = [...editData.experience];
                      newList[index].role = e.target.value;
                      setEditData({...editData, experience: newList});
                    }}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Company Name</label>
                  <input 
                    type="text" 
                    className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl font-black text-slate-800"
                    value={exp.company}
                    onChange={(e) => {
                      const newList = [...editData.experience];
                      newList[index].company = e.target.value;
                      setEditData({...editData, experience: newList});
                    }}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Start Date</label>
                  <input 
                    type="date" 
                    className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl font-black text-slate-800"
                    value={exp.start_date || ""}
                    onChange={(e) => {
                      const newList = [...editData.experience];
                      newList[index].start_date = e.target.value;
                      setEditData({...editData, experience: newList});
                    }}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">End Date</label>
                  <input 
                    type="date" 
                    className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl font-black text-slate-800"
                    value={exp.end_date || ""}
                    disabled={exp.is_current}
                    onChange={(e) => {
                      const newList = [...editData.experience];
                      newList[index].end_date = e.target.value;
                      setEditData({...editData, experience: newList});
                    }}
                  />
                </div>
                <div className="md:col-span-2 flex items-center gap-3">
                   <input 
                    type="checkbox" 
                    id={`current-${index}`}
                    className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500"
                    checked={exp.isCurrent}
                    onChange={(e) => {
                      const newList = [...editData.experience];
                      newList[index].isCurrent = e.target.checked;
                      if (e.target.checked) newList[index].end_date = "";
                      setEditData({...editData, experience: newList});
                    }}
                  />
                  <label htmlFor={`current-${index}`} className="text-xs font-black text-slate-500 uppercase tracking-widest cursor-pointer">I am currently working in this role</label>
                </div>
                <div className="md:col-span-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Description</label>
                  <textarea 
                    className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl font-medium text-slate-600 min-h-[100px]"
                    value={exp.description}
                    onChange={(e) => {
                      const newList = [...editData.experience];
                      newList[index].description = e.target.value;
                      setEditData({...editData, experience: newList});
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
          <button 
            onClick={() => setEditData({...editData, experience: [...(editData.experience || []), { role: "", company: "", description: "", start_date: "", end_date: "", isCurrent: false }]})}
            className="w-full py-6 bg-blue-50 text-blue-600 rounded-[40px] border-2 border-dashed border-blue-200 font-black uppercase tracking-widest text-xs hover:bg-blue-100 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={18} /> Add Experience
          </button>
        </div>
      </EditModal>

      {/* Resume Modal */}
      <EditModal 
        title="Upload Resume" 
        isOpen={activeModal === 'resume'} 
        onClose={() => setActiveModal(null)} 
        onSave={() => setActiveModal(null)}
      >
        <div className="space-y-6">
          <div className="p-10 border-4 border-dashed border-slate-100 rounded-[40px] flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-all group relative overflow-hidden">
            <input 
              type="file" 
              accept=".pdf" 
              className="absolute inset-0 opacity-0 cursor-pointer z-10"
              onChange={handleFileUpload}
            />
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-xl border border-white mb-6 group-hover:scale-110 transition-transform">
              <Upload className="text-blue-600" size={32} />
            </div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">Select Resume File</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center max-w-xs">
              Supports PDF files only. Max size 5MB.
            </p>
          </div>
          
          {profile?.resume_url && (
            <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-[32px] flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-emerald-500 border border-emerald-100">
                <FileText size={24} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Active Resume</p>
                <p className="text-xs font-bold text-slate-700 truncate">{profile.resume_url.split('/').pop()}</p>
              </div>
              <a href={profile.resume_url} target="_blank" className="p-3 bg-white text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all border border-emerald-100">
                <Eye size={18} />
              </a>
            </div>
          )}
        </div>
      </EditModal>

      {/* Certifications Modal */}
      <EditModal 
        title="Certifications & Badges" 
        isOpen={activeModal === 'certifications'} 
        onClose={() => setActiveModal(null)} 
        onSave={saveSection}
      >
        <div className="space-y-6">
          {editData.certifications?.map((cert: any, index: number) => (
            <div key={index} className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 relative group">
              <button 
                onClick={() => {
                  const newList = [...editData.certifications];
                  newList.splice(index, 1);
                  setEditData({...editData, certifications: newList});
                }}
                className="absolute -top-2 -right-2 p-2 bg-white text-red-500 rounded-xl shadow-md border border-red-50 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 size={16} />
              </button>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Certification Name</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                    value={cert.name}
                    onChange={(e) => {
                      const newList = [...editData.certifications];
                      newList[index].name = e.target.value;
                      setEditData({...editData, certifications: newList});
                    }}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Issuing Organization</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                    value={cert.issuingOrganization}
                    onChange={(e) => {
                      const newList = [...editData.certifications];
                      newList[index].issuingOrganization = e.target.value;
                      setEditData({...editData, certifications: newList});
                    }}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Issue Date</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                    value={cert.issueDate || ""}
                    onChange={(e) => {
                      const newList = [...editData.certifications];
                      newList[index].issueDate = e.target.value;
                      setEditData({...editData, certifications: newList});
                    }}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Expiry Date (Optional)</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                    value={cert.expiryDate || ""}
                    onChange={(e) => {
                      const newList = [...editData.certifications];
                      newList[index].expiryDate = e.target.value;
                      setEditData({...editData, certifications: newList});
                    }}
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Credential URL</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                    value={cert.credentialUrl}
                    onChange={(e) => {
                      const newList = [...editData.certifications];
                      newList[index].credentialUrl = e.target.value;
                      setEditData({...editData, certifications: newList});
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
          <button 
            onClick={() => setEditData({...editData, certifications: [...(editData.certifications || []), { name: "", issuingOrganization: "", credentialUrl: "", issueDate: "", expiryDate: "" }]})}
            className="w-full py-6 bg-blue-50 text-blue-600 rounded-[32px] border-2 border-dashed border-blue-200 font-black uppercase tracking-widest text-xs hover:bg-blue-100 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={18} /> Add Certification
          </button>
        </div>
      </EditModal>

      {/* Extracurricular Modal */}
      <EditModal 
        title="Extracurricular & Leadership" 
        isOpen={activeModal === 'extracurricular'} 
        onClose={() => setActiveModal(null)} 
        onSave={saveSection}
      >
        <div className="space-y-6">
          {editData.extracurriculars?.map((activity: any, index: number) => (
            <div key={index} className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 relative group">
              <button 
                onClick={() => {
                  const newList = [...editData.extracurriculars];
                  newList.splice(index, 1);
                  setEditData({...editData, extracurriculars: newList});
                }}
                className="absolute -top-2 -right-2 p-2 bg-white text-red-500 rounded-xl shadow-md border border-red-50 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 size={16} />
              </button>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Activity / Role Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Debate Club President, Hackathon Winner"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                    value={activity.title}
                    onChange={(e) => {
                      const newList = [...editData.extracurriculars];
                      newList[index].title = e.target.value;
                      setEditData({...editData, extracurriculars: newList});
                    }}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Category</label>
                  <select 
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                    value={activity.category || ''}
                    onChange={(e) => {
                      const newList = [...editData.extracurriculars];
                      newList[index].category = e.target.value;
                      setEditData({...editData, extracurriculars: newList});
                    }}
                  >
                     <option value="">Select Category</option>
                     <option value="Leadership">Leadership</option>
                     <option value="Sports">Sports</option>
                     <option value="Volunteering">Volunteering</option>
                     <option value="Event Organizer">Event Organizer</option>
                     <option value="Hackathon">Hackathon</option>
                     <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Organization / Event</label>
                  <input 
                    type="text" 
                    placeholder="e.g. College Fest, NGO Name"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                    value={activity.organization_name || ""}
                    onChange={(e) => {
                      const newList = [...editData.extracurriculars];
                      newList[index].organization_name = e.target.value;
                      setEditData({...editData, extracurriculars: newList});
                    }}
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Description</label>
                  <textarea 
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-medium text-slate-600 min-h-[80px]"
                    placeholder="Describe your responsibilities, impact, and achievements..."
                    value={activity.description || ""}
                    onChange={(e) => {
                      const newList = [...editData.extracurriculars];
                      newList[index].description = e.target.value;
                      setEditData({...editData, extracurriculars: newList});
                    }}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Achievement / Rank</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 1st Place, Best Speaker"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                    value={activity.achievement_rank || ""}
                    onChange={(e) => {
                      const newList = [...editData.extracurriculars];
                      newList[index].achievement_rank = e.target.value;
                      setEditData({...editData, extracurriculars: newList});
                    }}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Certificate (PDF/Image)</label>
                  <input 
                    type="file" 
                    accept="application/pdf,image/*"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append("certificate", file);
                      try {
                        const { data } = await api.post(`/students/upload-certificate/${user?.id}`, formData, {
                          headers: { "Content-Type": "multipart/form-data" }
                        });
                        const newList = [...editData.extracurriculars];
                        newList[index].certificate_url = data.certificateUrl;
                        setEditData({...editData, extracurriculars: newList});
                        toast.success("Certificate uploaded!");
                      } catch (err: any) {
                        toast.error(err.response?.data?.message || "Failed to upload");
                      }
                    }}
                  />
                  {activity.certificate_url && (
                    <a href={activity.certificate_url} target="_blank" className="text-[10px] text-blue-600 font-bold mt-2 inline-block uppercase tracking-widest">View Uploaded Certificate</a>
                  )}
                </div>
              </div>
            </div>
          ))}
          <button 
            onClick={() => setEditData({...editData, extracurriculars: [...(editData.extracurriculars || []), { title: "", category: "", organization_name: "", description: "", achievement_rank: "", certificate_url: "" }]})}
            className="w-full py-6 bg-rose-50 text-rose-600 rounded-[32px] border-2 border-dashed border-rose-200 font-black uppercase tracking-widest text-xs hover:bg-rose-100 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={18} /> Add Extracurricular Activity
          </button>
        </div>
      </EditModal>

      <ConsentModal
        isOpen={consentOpen}
        title="Profile Database Consent"
        subtitle="Recruiter Directory Visibility & Talent Pool Sharing"
        consentMessage="To register on the main placement server, you consent to the sharing of your professional experiences, profiles, diagnostic intelligence quotients, and resume attachments with verified HR recruiters and enterprise partners. Placement-ready scoring dashboards will be made searchable for matching job listings."
        compulsoryWarning="Declining this consent will prevent you from utilizing our recruitment services. Shared profile visibility is compulsory to enlist for ongoing active campus placements."
        onAgree={() => {
          localStorage.setItem("consent_profile", "true");
          setConsentOpen(false);
        }}
        onDisagreeClose={() => {
          navigate("/student");
        }}
      />

    </div>
  );
}
