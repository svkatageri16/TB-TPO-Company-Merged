import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.tsx";
import api from "../services/api.ts";
import { 
  ArrowLeft, Save, Building2, Globe, Mail, Phone, 
  MapPin, Linkedin, Github, CheckCircle2, AlertCircle, 
  Upload, FileText, ChevronRight, ChevronLeft, LayoutGrid, 
  Factory, Users, Calendar, ShieldCheck, Briefcase, FileCheck, X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";

const FRONTEND_COUNTRY_RULES: Record<string, {
  identifiers: { key: string; label: string; placeholder: string; required: boolean }[];
  requiredDocs: string[];
}> = {
  "India": {
    identifiers: [
      { key: "gst_no", label: "GST Number", placeholder: "22AAAAA0000A1Z5", required: false },
      { key: "cin_no", label: "CIN Number", placeholder: "U72200MH2021PTC...", required: false },
      { key: "pan_no", label: "PAN Number", placeholder: "ABCDE1234F", required: true }
    ],
    requiredDocs: ["GST Certificate", "Business Registration Certificate", "PAN Card"]
  },
  "USA": {
    identifiers: [
      { key: "tax_id", label: "EIN / TIN", placeholder: "12-3456789", required: true },
      { key: "registry_number", label: "State Entity Number", placeholder: "C1234567", required: true },
      { key: "state_of_formation", label: "State of Formation", placeholder: "Delaware", required: true }
    ],
    requiredDocs: ["Articles of Incorporation", "EIN Letter / W-9"]
  },
  "Europe / EU": {
    identifiers: [
      { key: "registry_number", label: "Local Company Registration Number", placeholder: "HRB 12345", required: true },
      { key: "tax_id", label: "VAT Number", placeholder: "DE123456789", required: false }
    ],
    requiredDocs: ["Local Company Registration Extract", "Registered Address Proof"]
  },
  "United Kingdom": {
    identifiers: [
      { key: "registry_number", label: "Companies House Company Number", placeholder: "01234567", required: true },
      { key: "tax_id", label: "VAT Number", placeholder: "GB123456789", required: false }
    ],
    requiredDocs: ["Companies House Extract", "Registered Address Proof"]
  },
  "UAE": {
    identifiers: [
      { key: "registry_number", label: "Trade Licence Number", placeholder: "123456", required: true },
      { key: "licensing_authority", label: "Licensing Authority / Free-Zone", placeholder: "DED Dubai / DMCC", required: true },
      { key: "tax_id", label: "TRN/VAT", placeholder: "100XXXXXXXXX003", required: false }
    ],
    requiredDocs: ["Trade Licence", "MoA/AoA"]
  },
  "Saudi Arabia": {
    identifiers: [
      { key: "registry_number", label: "Commercial Registration Number", placeholder: "1010XXXXXX", required: true },
      { key: "tax_id", label: "VAT/ZATCA Number", placeholder: "300XXXXXXXXXXXX", required: false }
    ],
    requiredDocs: ["Commercial Registration Certificate", "VAT/ZATCA Certificate"]
  },
  "Qatar": {
    identifiers: [
      { key: "registry_number", label: "Commercial Registration Number", placeholder: "123456", required: true }
    ],
    requiredDocs: ["Commercial Registration Extract", "Commercial Permit/Licence"]
  },
  "Oman": {
    identifiers: [
      { key: "registry_number", label: "Commercial Registration Number", placeholder: "1234567", required: true }
    ],
    requiredDocs: ["Commercial Registration", "Business Licence"]
  },
  "Bahrain": {
    identifiers: [
      { key: "registry_number", label: "Sijilat CR Number", placeholder: "123456-1", required: true }
    ],
    requiredDocs: ["Sijilat CR Extract", "Activity Licence"]
  },
  "Kuwait": {
    identifiers: [
      { key: "registry_number", label: "Commercial Registration Number", placeholder: "123456", required: true }
    ],
    requiredDocs: ["Commercial licence", "Commercial Registration Certificate"]
  },
  "Australia": {
    identifiers: [
      { key: "tax_id", label: "ABN", placeholder: "12 345 678 901", required: true },
      { key: "registry_number", label: "ACN/ASIC Company Number", placeholder: "123 456 789", required: true }
    ],
    requiredDocs: ["ABN Certificate", "ACN/ASIC Extract"]
  },
  "New Zealand": {
    identifiers: [
      { key: "tax_id", label: "NZBN", placeholder: "94290XXXXXXXX", required: true },
      { key: "registry_number", label: "Companies Office Number", placeholder: "1234567", required: true }
    ],
    requiredDocs: ["NZBN/Companies Office Extract", "Registered Address Proof"]
  }
};

export function CompanyProfile() {
  const { user, profile, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    company_name: "",
    logo_url: "",
    website: "",
    company_email: "",
    contact_number: "",
    company_type: "",
    industry: "",
    company_size: "",
    year_established: "" as any,
    registration_date: "",
    business_name: "",
    gst_no: "",
    cin_no: "",
    pan_no: "",
    address: "",
    operating_address: "",
    country: "India",
    state: "",
    city: "",
    about: "",
    services: "",
    linkedin_url: "",
    github_url: "",
    entity_type: "",
    registry_number: "",
    tax_id: "",
    state_of_formation: "",
    licensing_authority: ""
  });

  const [documents, setDocuments] = useState<any[]>([]);
  const [completeness, setCompleteness] = useState(0);

  useEffect(() => {
    if (profile?.status === 'APPROVED' || profile?.status === 'PENDING' || profile?.status === 'PENDING_REVERIFICATION') {
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  }, [profile]);

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    try {
      const { data } = await api.get(`/companies/profile/${user.id}`);
      if (data.success && data.data) {
        const p = data.data;
        setFormData({
          company_name: p.company_name || "",
          logo_url: p.logo_url || "",
          website: p.website || "",
          company_email: p.company_email || "",
          contact_number: p.contact_number || "",
          company_type: p.company_type || "",
          industry: p.industry || "",
          company_size: p.company_size || "",
          year_established: p.year_established || "",
          registration_date: p.registration_date ? p.registration_date.substring(0, 10) : (p.year_established ? `${p.year_established}-01-01` : ""),
          business_name: p.business_name || "",
          gst_no: p.gst_no || "",
          cin_no: p.cin_no || "",
          pan_no: p.pan_no || "",
          address: p.address || "",
          operating_address: p.operating_address || "",
          country: p.country || "India",
          state: p.state || "",
          city: p.city || "",
          about: p.about || "",
          services: p.services || "",
          linkedin_url: p.linkedin_url || "",
          github_url: p.github_url || "",
          entity_type: p.entity_type || "",
          registry_number: p.registry_number || "",
          tax_id: p.tax_id || "",
          state_of_formation: p.state_of_formation || "",
          licensing_authority: p.licensing_authority || ""
        });
        setDocuments(p.documents || []);
        setCompleteness(p.completeness_score || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateDynamicCompleteness = () => {
    let score = 0;
    
    // 1. Basic Identity (20%)
    if (formData.company_name) score += 5;
    if (formData.logo_url) score += 5;
    if (formData.website) score += 5;
    if (formData.company_email && formData.contact_number) score += 5;

    const country = formData.country || "India";
    const rules = FRONTEND_COUNTRY_RULES[country] || FRONTEND_COUNTRY_RULES["India"];

    // 2. Business & Legal Details (30%)
    if (formData.business_name) score += 5;
    if (formData.address && formData.city) score += 10;

    // Country specific identifiers
    let identifierPoints = 0;
    if (country === "India") {
      if (formData.gst_no) identifierPoints += 10;
      if (formData.cin_no || formData.pan_no) identifierPoints += 5;
    } else {
      let filledCount = 0;
      const totalFields = rules.identifiers.length;
      rules.identifiers.forEach(id => {
        if ((formData as any)[id.key]) {
          filledCount++;
        }
      });
      identifierPoints = totalFields > 0 ? Math.round((filledCount / totalFields) * 15) : 15;
    }
    score += identifierPoints;

    // 3. Verification Documents (30%)
    let docPoints = 0;
    if (country === "India") {
      const hasGst = documents.some(d => d.doc_type === 'GST Certificate');
      const hasReg = documents.some(d => d.doc_type === 'Business Registration Certificate');
      const hasPan = documents.some(d => d.doc_type === 'PAN Card');
      if (hasGst) docPoints += 10;
      if (hasReg) docPoints += 10;
      if (hasPan) docPoints += 10;
    } else {
      const reqDocs = rules.requiredDocs;
      let uploadedCount = 0;
      reqDocs.forEach(reqDocType => {
        if (documents.some(d => d.doc_type === reqDocType)) {
          uploadedCount++;
        }
      });
      docPoints = reqDocs.length > 0 ? Math.round((uploadedCount / reqDocs.length) * 30) : 30;
    }
    score += docPoints;

    // 4. Company Narrative & Social (20%)
    if (formData.about && formData.about.length > 200) score += 10;
    else if (formData.about && formData.about.length > 50) score += 5;
    
    if (formData.linkedin_url || formData.github_url) score += 10;

    return Math.min(100, score);
  };

  useEffect(() => {
    setCompleteness(calculateDynamicCompleteness());
  }, [formData, documents]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      if (type === 'logo') {
        setFormData(prev => ({ ...prev, logo_url: base64 }));
      } else {
        try {
          const { data } = await api.post(`/companies/profile/${user?.id}/documents`, {
            doc_type: type,
            doc_url: base64
          });
          if (data.success) {
            setDocuments(prev => {
              const others = prev.filter(d => d.doc_type !== type);
              return [...others, { doc_type: type, status: 'PENDING' }];
            });
            setCompleteness(data.score);
            if (data.newStatus) {
              updateProfile({ ...profile, status: data.newStatus });
            }
            alert("Document uploaded successfully!");
          }
        } catch (err) {
          alert("Failed to upload document");
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDocDelete = async (type: string) => {
    const confirmDelete = window.confirm(`Are you sure you want to remove your ${type}?`);
    if (!confirmDelete) return;

    try {
      const { data } = await api.delete(`/companies/profile/${user?.id}/documents/${type}`);
      if (data.success) {
        setDocuments(prev => prev.filter(d => d.doc_type !== type));
        setCompleteness(data.score);
        if (data.newStatus) {
          updateProfile({ ...profile, status: data.newStatus });
        }
        alert("Document deleted successfully!");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete document");
    }
  };

  const handleSave = async (silent = false) => {
    // Company name validation
    if (!formData.company_name || !formData.company_name.trim()) {
      alert("Please enter a valid business name.");
      return;
    } else {
      const company_name = formData.company_name.trim();
      const allowedRegex = /^[a-zA-Z0-9\s.&'()-]+$/;
      const hasAlphanumeric = /[a-zA-Z0-9]/.test(company_name);
      if (!allowedRegex.test(company_name) || !hasAlphanumeric) {
        alert("Please enter a valid business name.");
        return;
      }
    }

    // Business Name validation (if filled)
    if (formData.business_name && formData.business_name.trim()) {
      const business_name = formData.business_name.trim();
      const allowedRegex = /^[a-zA-Z0-9\s.&'()-]+$/;
      const hasAlphanumeric = /[a-zA-Z0-9]/.test(business_name);
      if (!allowedRegex.test(business_name) || !hasAlphanumeric) {
        alert("Please enter a valid business name.");
        return;
      }
    }

    // 1. Mobile / Contact number validation
    if (formData.contact_number) {
      const cleanContact = formData.contact_number.replace(/\D/g, "");
      if (cleanContact.length !== 10) {
        alert("Mobile number must be exactly 10 digits.");
        return;
      }
    }

    // 2. Email format validation
    if (formData.company_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.company_email)) {
      alert("Please enter a valid official email address.");
      return;
    }

    // Website validation
    if (formData.website) {
      const websiteUrl = formData.website.trim();
      const urlRegex = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/;
      if (!urlRegex.test(websiteUrl)) {
        alert("Please enter a valid website URL.");
        return;
      }
    }

    // 3. India specific identifiers format validations
    if (formData.country === "India") {
      if (formData.pan_no && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(formData.pan_no)) {
        alert("PAN must be in valid format, for example ABCDE1234F.");
        return;
      }
      if (formData.gst_no && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i.test(formData.gst_no)) {
        alert("GST number must be a valid 15-character GSTIN.");
        return;
      }
      if (formData.cin_no && !/^[A-Z0-9]{21}$/i.test(formData.cin_no)) {
        alert("CIN must be a valid 21-character company identification number.");
        return;
      }
    }

    // City and State validations
    if (formData.city && formData.city.trim()) {
      const cityStr = formData.city.trim();
      if (!/^[a-zA-Z\s-]+$/.test(cityStr)) {
        alert("Please enter a valid city/state name.");
        return;
      }
    }
    if (formData.state && formData.state.trim()) {
      const stateStr = formData.state.trim();
      if (!/^[a-zA-Z\s-]+$/.test(stateStr)) {
        alert("Please enter a valid city/state name.");
        return;
      }
    }

    // 4. Registration Date / Year Established validation
    if (formData.registration_date) {
      const regDateObj = new Date(formData.registration_date);
      if (isNaN(regDateObj.getTime())) {
        alert("Company registration date cannot be in the future.");
        return;
      }
      const todayStr = new Date().toISOString().split("T")[0];
      if (formData.registration_date > todayStr) {
        alert("Company registration date cannot be in the future.");
        return;
      }
    } else if (formData.year_established) {
      const year = parseInt(formData.year_established);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1800 || year > currentYear) {
        alert("Please enter a valid Year Established.");
        return;
      }
    }

    setSaving(true);
    try {
      const { data } = await api.put(`/companies/profile/${user?.id}`, formData);
      if (data.success) {
        if (!silent) alert("Progress saved!");
        const updated = { ...profile, ...formData, completeness_score: data.score };
        updateProfile(updated);
      }
    } catch (err) {
      console.error(err);
      if (!silent) alert("Failed to save progress");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitVerification = async () => {
    if (completeness < 80) {
      alert("Please complete at least 80% of your profile including mandatory documents to submit for verification.");
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post(`/companies/profile/${user?.id}/submit`);
      if (data.success) {
        alert("Profile submitted successfully! Admin will review your details.");
        updateProfile({ ...profile, status: 'PENDING', is_submitted: 1 });
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Submission failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <div>
               <h1 className="text-lg font-black text-slate-800 uppercase tracking-tight">Company Hub</h1>
               <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div animate={{ width: `${completeness}%` }} className="h-full bg-blue-600" />
                  </div>
                  <span className="text-[10px] font-black text-blue-600 uppercase">{completeness}% Complete</span>
               </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
             {isEditing && (profile?.status === 'APPROVED' || profile?.status === 'PENDING' || profile?.status === 'PENDING_REVERIFICATION') && (
               <button 
                 onClick={() => setIsEditing(false)}
                 className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all cursor-pointer"
               >
                 View Profile Details
               </button>
             )}
             {isEditing ? (
               <>
                 <button 
                   onClick={() => handleSave()}
                   disabled={saving}
                   className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all disabled:opacity-50 cursor-pointer"
                 >
                   Save Progress
                 </button>
                 {completeness >= 80 && profile?.status !== 'PENDING' && profile?.status !== 'APPROVED' && (
                   <button 
                    onClick={handleSubmitVerification}
                    className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all cursor-pointer"
                   >
                     Submit for Verification
                   </button>
                 )}
               </>
             ) : (
               <button 
                 onClick={() => setIsEditing(true)}
                 className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all cursor-pointer shadow-lg shadow-blue-500/10"
               >
                 Edit Profile Details
               </button>
             )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 mt-12">
        {/* Verification Status Banner */}
        {profile?.status !== 'APPROVED' && (
          <div className="mb-8 p-6 bg-amber-50/70 border border-amber-200/60 rounded-3xl backdrop-blur-sm shadow-sm flex items-start gap-4">
            <div className="p-3 bg-amber-500 text-white rounded-2xl shrink-0">
              <ShieldCheck size={24} className="animate-pulse" />
            </div>
            <div className="space-y-1">
              {profile?.status === 'PENDING' ? (
                <>
                  <h3 className="text-sm font-black text-amber-900 uppercase tracking-wider">Verification in Progress</h3>
                  <p className="text-xs text-amber-700 font-medium leading-relaxed">
                    Your company profile has been submitted and is currently being reviewed by our administrative board. We are validating your GST details, corporate registry (CIN), and physical workspace details. During this period, other workspace dashboards remain locked.
                  </p>
                </>
              ) : profile?.status === 'PENDING_REVERIFICATION' ? (
                <>
                  <h3 className="text-sm font-black text-amber-900 uppercase tracking-wider">Re-Verification Required</h3>
                  <p className="text-xs text-amber-700 font-medium leading-relaxed">
                    You have updated or removed one of your major company documents. Operations on your dashboard are temporarily frozen. Please complete your profile revisions and click "Submit to Admin" on step 5 of the profile editor to request re-verification.
                  </p>
                </>
              ) : profile?.status === 'REJECTED' ? (
                <div className="space-y-1.5">
                  <h3 className="text-sm font-black text-red-800 uppercase tracking-wider">Verification Rejected</h3>
                  <p className="text-xs text-red-600 font-medium leading-relaxed">
                    Our administrative team has rejected your verification request. Please review and update your credentials and submit again.
                  </p>
                  {profile?.rejection_reason && (
                    <div className="mt-2 p-3 bg-red-100/50 border border-red-200 rounded-xl">
                      <p className="text-xs font-mono font-bold text-red-700">Reason: {profile.rejection_reason}</p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Account Locked • Verification Required</h3>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                    To activate your brand's recruiter workspace and build premium pipelines, please complete your profile details to at least <strong className="text-blue-600">80% progress</strong> (representing GST registration, business address, and required verification stamps), and click <strong className="text-slate-900">"Submit for Verification"</strong> in the header controls.
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {!isEditing ? (
          /* ==================== VIEW PROFILE DETAILS STATE ==================== */
          <div className="space-y-8">
            {/* Overview Card */}
            <div className="bg-white rounded-[40px] border border-slate-200/85 p-10 shadow-xl shadow-slate-200/40 relative overflow-hidden flex flex-col md:flex-row items-center md:items-start gap-8">
              <div className="w-28 h-28 rounded-3xl bg-slate-50 border border-slate-100 p-2 flex items-center justify-center shrink-0 shadow-inner">
                {formData.logo_url ? (
                  <img src={formData.logo_url} className="w-full h-full object-contain" alt="Company Logo" referrerPolicy="no-referrer" />
                ) : (
                  <Building2 size={48} className="text-slate-300" />
                )}
              </div>
              
              <div className="flex-1 min-w-0 text-center md:text-left space-y-2">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{formData.company_name || profile?.company_name || 'Organization Name'}</h2>
                  {profile?.status === 'APPROVED' ? (
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest rounded-full border border-emerald-100 flex items-center gap-1">
                      <CheckCircle2 size={10} /> Verified Company
                    </span>
                  ) : profile?.status === 'PENDING' || profile?.status === 'PENDING_REVERIFICATION' ? (
                    <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[9px] font-black uppercase tracking-widest rounded-full border border-amber-100 flex items-center gap-1">
                      <AlertCircle size={10} className="animate-pulse" /> Verification Pending
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded-full border border-slate-200">
                      Unverified Organization
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {formData.industry && <span>{formData.industry}</span>}
                  {formData.company_type && <span>&bull; {formData.company_type}</span>}
                  {formData.company_size && <span>&bull; {formData.company_size} Employees</span>}
                  {formData.year_established && <span>&bull; Est. {formData.year_established}</span>}
                </div>

                {formData.website && (
                  <a 
                    href={formData.website} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex items-center gap-1.5 text-xs font-black text-blue-600 uppercase tracking-widest hover:underline mt-1"
                  >
                    <Globe size={14} /> Visit Website &rarr;
                  </a>
                )}
              </div>

              <button 
                onClick={() => setIsEditing(true)}
                className="md:absolute md:top-10 md:right-10 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 cursor-pointer flex items-center gap-2"
              >
                <Building2 size={14} /> Edit Profile
              </button>
            </div>

            {/* Profile Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Left Col (Story) */}
              <div className="md:col-span-2 space-y-8">
                <div className="bg-white rounded-[32px] border border-slate-200/80 p-8 space-y-4 shadow-sm">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">About Organization</h3>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">
                    {formData.about || "No organizational bio filled yet. Click 'Edit Profile' to write your company story."}
                  </p>
                </div>

                <div className="bg-white rounded-[32px] border border-slate-200/80 p-8 space-y-4 shadow-sm">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Core Products & Services</h3>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">
                    {formData.services || "No products or services documented yet."}
                  </p>
                </div>
              </div>

              {/* Right Col (Credentials & Contact) */}
              <div className="space-y-8">
                {/* Business Credentials */}
                <div className="bg-white rounded-[32px] border border-slate-200/80 p-8 space-y-6 shadow-sm">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Business Credentials</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Country of Registration</span>
                      <span className="text-xs font-bold text-slate-700">{formData.country || "India"}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Registered Legal Name</span>
                      <span className="text-xs font-bold text-slate-700">{formData.business_name || "Not Filled"}</span>
                    </div>
                    {formData.country === "India" ? (
                      <>
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">GST Identification Number</span>
                          <span className="text-xs font-bold text-slate-700">{formData.gst_no || "Not Filled"}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Corporate Identification Number (CIN)</span>
                          <span className="text-xs font-bold text-slate-700">{formData.cin_no || "Not Filled"}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Permanent Account Number (PAN)</span>
                          <span className="text-xs font-bold text-slate-700">{formData.pan_no || "Not Filled"}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        {formData.entity_type && (
                          <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Entity Type</span>
                            <span className="text-xs font-bold text-slate-700">{formData.entity_type}</span>
                          </div>
                        )}
                        {(FRONTEND_COUNTRY_RULES[formData.country] || FRONTEND_COUNTRY_RULES["India"]).identifiers.map((field) => (
                          <div key={field.key}>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">{field.label}</span>
                            <span className="text-xs font-bold text-slate-700">{(formData as any)[field.key] || "Not Filled"}</span>
                          </div>
                        ))}
                      </>
                    )}
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Registered Address</span>
                      <span className="text-xs font-semibold text-slate-500 leading-relaxed block">{formData.address || "Not Filled"}</span>
                      {formData.city && <span className="text-xs font-bold text-slate-700 block mt-1">{formData.city}, {formData.state}</span>}
                    </div>
                  </div>
                </div>

                {/* Contact Details & Channels */}
                <div className="bg-white rounded-[32px] border border-slate-200/80 p-8 space-y-6 shadow-sm">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Contact & Socials</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Official Email</span>
                      <span className="text-xs font-bold text-slate-700 block truncate">{formData.company_email || "Not Filled"}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Contact Helpline</span>
                      <span className="text-xs font-bold text-slate-700 block">{formData.contact_number || "Not Filled"}</span>
                    </div>
                    
                    <div className="h-px bg-slate-100 my-2" />

                    <div className="space-y-3">
                      {formData.linkedin_url && (
                        <a href={formData.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors uppercase tracking-wider">
                          <Linkedin size={16} /> LinkedIn Organization
                        </a>
                      )}
                      {formData.github_url && (
                        <a href={formData.github_url} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-wider">
                          <Github size={16} /> GitHub Workspace
                        </a>
                      )}
                      {!formData.linkedin_url && !formData.github_url && (
                        <span className="text-[10px] text-slate-400 font-bold italic">No social media links provided.</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Active Uploaded Files */}
                <div className="bg-white rounded-[32px] border border-slate-200/80 p-8 space-y-4 shadow-sm">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Uploaded Documents</h3>
                  
                  {documents.length === 0 ? (
                    <span className="text-xs font-bold text-slate-400 italic block">No corporate files uploaded.</span>
                  ) : (
                    <div className="space-y-2">
                      {documents.map(doc => (
                        <div key={doc.id || doc.doc_type} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileCheck size={16} className="text-emerald-500 shrink-0" />
                            <span className="text-[10px] font-bold text-slate-700 truncate">{doc.doc_type}</span>
                          </div>
                          {doc.doc_url && (
                            <a href={doc.doc_url} target="_blank" rel="noreferrer" className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline shrink-0">
                              View
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ==================== MULTI-STEP EDIT FORM STATE ==================== */
          <>
            <div className="mb-12 flex justify-between relative bg-white/40 p-4 rounded-2xl backdrop-blur">
               <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 -translate-y-1/2 -z-10" />
               {[1, 2, 3, 4, 5].map((s) => (
                 <div 
                   key={s} 
                   onClick={() => setStep(s)}
                   className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all border-4 ${step === s ? 'bg-blue-600 text-white border-blue-100 scale-125' : s < step ? 'bg-emerald-500 text-white border-emerald-100' : 'bg-white text-slate-400 border-slate-50'}`}
                 >
                   {s < step ? <CheckCircle2 size={20} /> : <span className="font-black text-sm">{s}</span>}
                 </div>
               ))}
            </div>

            <div className="bg-white rounded-[40px] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-12"
                >
                  {step === 1 && (
                    <div className="space-y-8">
                       <div className="flex items-center gap-4 mb-4">
                          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                             <Building2 size={32} />
                          </div>
                          <div>
                             <h2 className="text-3xl font-black text-slate-800 tracking-tight">Basic Information</h2>
                             <p className="text-slate-500 text-sm">Tell us the public details about your organization.</p>
                          </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="md:col-span-2 flex items-center gap-8 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                             <div className="relative group">
                                <div className="w-24 h-24 bg-white rounded-3xl overflow-hidden border-2 border-slate-200 shadow-sm flex items-center justify-center">
                                   {formData.logo_url ? <img src={formData.logo_url} className="w-full h-full object-contain" /> : <Building2 size={32} className="text-slate-300" />}
                                </div>
                                <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                                   <Upload size={14} />
                                   <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'logo')} />
                                </label>
                             </div>
                             <div>
                                <h3 className="font-black text-slate-800 text-lg">Company Logo</h3>
                                <p className="text-xs text-slate-500">SVG, PNG, or JPG (max 2MB)</p>
                             </div>
                          </div>

                          <Input label="Company Name" placeholder="e.g. Acme Innovations" value={formData.company_name} onChange={v => setFormData({...formData, company_name: v})} icon={<Building2 size={16} />} />
                          <Input label="Official Website" placeholder="https://acme.com" value={formData.website} onChange={v => setFormData({...formData, website: v})} icon={<Globe size={16} />} />
                          <Input label="Official Email" placeholder="hr@acme.com" value={formData.company_email} onChange={v => setFormData({...formData, company_email: v})} icon={<Mail size={16} />} />
                          <Input label="Contact Number" placeholder="+91 XXXXX XXXXX" value={formData.contact_number} onChange={(v: string) => setFormData({...formData, contact_number: v.replace(/\D/g, "").slice(0, 10)})} icon={<Phone size={16} />} />
                          
                          <Select 
                            label="Company Type" 
                            value={formData.company_type} 
                            onChange={v => setFormData({...formData, company_type: v})}
                            options={['Startup', 'MNC', 'SME', 'Government', 'Agency']}
                            icon={<LayoutGrid size={16} />}
                          />
                          <Select 
                            label="Industry" 
                            value={formData.industry} 
                            onChange={v => setFormData({...formData, industry: v})}
                            options={['IT & Software', 'Finance', 'Healthcare', 'Education', 'Manufacturing', 'Retail']}
                            icon={<Factory size={16} />}
                          />
                          <Select 
                            label="Company Size" 
                            value={formData.company_size} 
                            onChange={v => setFormData({...formData, company_size: v})}
                            options={['1-10', '10-50', '50-200', '200-500', '500+']}
                            icon={<Users size={16} />}
                          />
                          <Input 
                            label="Company Registration Date" 
                            type="date"
                            placeholder="Select date" 
                            value={formData.registration_date || ""} 
                            onChange={(v: string) => {
                              const year = v ? new Date(v).getFullYear() : "";
                              setFormData({...formData, registration_date: v, year_established: year});
                            }} 
                            icon={<Calendar size={16} />} 
                          />
                       </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-8">
                       <div className="flex items-center gap-4 mb-4">
                          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                             <ShieldCheck size={32} />
                          </div>
                          <div>
                             <h2 className="text-3xl font-black text-slate-800 tracking-tight">Business Details</h2>
                             <p className="text-slate-500 text-sm">Required for tax and verification purposes.</p>
                          </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="md:col-span-2">
                            <Select 
                              label="Country of Registration" 
                              value={formData.country} 
                              onChange={v => setFormData({...formData, country: v})}
                              options={Object.keys(FRONTEND_COUNTRY_RULES)}
                              icon={<Globe size={16} />}
                            />
                          </div>

                          <Input label="Registered Business Name" placeholder="As per official registration" value={formData.business_name} onChange={v => setFormData({...formData, business_name: v})} icon={<Building2 size={16} />} />
                          
                          {formData.country === "India" ? (
                            <>
                              <Input label="GST Number" placeholder="22AAAAA0000A1Z5" value={formData.gst_no} onChange={(v: string) => setFormData({...formData, gst_no: v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15)})} icon={<ShieldCheck size={16} />} />
                              <Input label="CIN Number (Optional)" placeholder="U72200MH2021PTC..." value={formData.cin_no} onChange={(v: string) => setFormData({...formData, cin_no: v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 21)})} icon={<ShieldCheck size={16} />} />
                              <Input label="PAN Number" placeholder="ABCDE1234F" value={formData.pan_no} onChange={(v: string) => setFormData({...formData, pan_no: v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10)})} icon={<ShieldCheck size={16} />} />
                            </>
                          ) : (
                            <>
                              <Select
                                label="Legal Entity Type"
                                value={formData.entity_type}
                                onChange={v => setFormData({...formData, entity_type: v})}
                                options={["LLC / Limited Liability Company", "Corporation (Inc./Corp.)", "Partnership (LLP/LP)", "Sole Proprietor", "Other"]}
                                icon={<LayoutGrid size={16} />}
                              />
                              {(FRONTEND_COUNTRY_RULES[formData.country] || FRONTEND_COUNTRY_RULES["India"]).identifiers.map((field) => (
                                <Input 
                                  key={field.key}
                                  label={`${field.label}${field.required ? ' *' : ' (Optional)'}`} 
                                  placeholder={field.placeholder} 
                                  value={(formData as any)[field.key] || ""} 
                                  onChange={v => setFormData({...formData, [field.key]: v})} 
                                  icon={<ShieldCheck size={16} />} 
                                />
                              ))}
                            </>
                          )}
                          
                          <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Registered Address</label>
                            <textarea 
                              rows={3} 
                              value={formData.address}
                              onChange={e => setFormData({...formData, address: e.target.value})}
                              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-blue-50 text-sm font-medium resize-none transition-all"
                              placeholder="Full registered office address..."
                            />
                          </div>

                          <Input label="City" placeholder="Mumbai" value={formData.city} onChange={v => setFormData({...formData, city: v})} icon={<MapPin size={16} />} />
                          <Input label="State" placeholder="Maharashtra" value={formData.state} onChange={v => setFormData({...formData, state: v})} icon={<MapPin size={16} />} />
                       </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-8">
                       <div className="flex items-center gap-4 mb-4">
                          <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                             <FileText size={32} />
                          </div>
                          <div>
                             <h2 className="text-3xl font-black text-slate-800 tracking-tight">Company Story</h2>
                             <p className="text-slate-500 text-sm">Tell potential employees why they should join you.</p>
                          </div>
                       </div>

                       <div className="space-y-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between">
                              <span>About Company</span>
                              <span className={formData.about?.length >= 200 ? 'text-emerald-500' : 'text-slate-400'}>
                                 {Math.min(100, Math.round((formData.about?.length || 0) / 2))}% towards goal
                              </span>
                            </label>
                            <textarea 
                              rows={8} 
                              value={formData.about}
                              onChange={e => setFormData({...formData, about: e.target.value})}
                              className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-6 py-6 outline-none focus:ring-4 focus:ring-blue-50 text-sm font-medium leading-relaxed transition-all"
                              placeholder="Describe your company values, history, and mission... (Min 100 words/500 characters recommended)"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Products & Services</label>
                            <textarea 
                              rows={4} 
                              value={formData.services}
                              onChange={e => setFormData({...formData, services: e.target.value})}
                              className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-6 py-6 outline-none focus:ring-4 focus:ring-blue-50 text-sm font-medium resize-none transition-all"
                              placeholder="What does your company build or provide?"
                            />
                          </div>
                       </div>
                    </div>
                  )}

                  {step === 4 && (
                    <div className="space-y-8">
                       <div className="flex items-center gap-4 mb-4">
                          <div className="p-3 bg-slate-100 text-slate-600 rounded-2xl">
                             <LayoutGrid size={32} />
                          </div>
                          <div>
                             <h2 className="text-3xl font-black text-slate-800 tracking-tight">Online Presence</h2>
                             <p className="text-slate-500 text-sm">Help us verify your authenticity via social channels.</p>
                          </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <Input label="LinkedIn Page" placeholder="linkedin.com/company/acme" value={formData.linkedin_url} onChange={v => setFormData({...formData, linkedin_url: v})} icon={<Linkedin size={16} />} />
                          <Input label="GitHub Organization" placeholder="github.com/acme" value={formData.github_url} onChange={v => setFormData({...formData, github_url: v})} icon={<Github size={16} />} />
                       </div>
                    </div>
                  )}

                   {step === 5 && (
                    <div className="space-y-8">
                       <div className="flex items-center gap-4 mb-4">
                          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                             <FileCheck size={32} />
                          </div>
                          <div>
                             <h2 className="text-3xl font-black text-slate-800 tracking-tight">Verification Documents ({formData.country})</h2>
                             <p className="text-slate-500 text-sm">Upload official certificates for quick approval.</p>
                          </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         {formData.country === "India" ? (
                           <>
                             <DocUpload 
                               label="GST Certificate" 
                               required 
                               active={documents.some(d => d.doc_type === 'GST Certificate')} 
                               onUpload={(e) => handleFileChange(e, 'GST Certificate')}
                               onDelete={() => handleDocDelete('GST Certificate')}
                             />
                             <DocUpload 
                               label="Registration Cert" 
                               required 
                               active={documents.some(d => d.doc_type === 'Business Registration Certificate')} 
                               onUpload={(e) => handleFileChange(e, 'Business Registration Certificate')}
                               onDelete={() => handleDocDelete('Business Registration Certificate')}
                             />
                             <DocUpload 
                               label="PAN Card Copy" 
                               active={documents.some(d => d.doc_type === 'PAN Card')} 
                               onUpload={(e) => handleFileChange(e, 'PAN Card')}
                               onDelete={() => handleDocDelete('PAN Card')}
                             />
                             <DocUpload 
                               label="Incorporation Cert" 
                               active={documents.some(d => d.doc_type === 'Incorporation Certificate')} 
                               onUpload={(e) => handleFileChange(e, 'Incorporation Certificate')}
                               onDelete={() => handleDocDelete('Incorporation Certificate')}
                             />
                           </>
                         ) : (
                           (FRONTEND_COUNTRY_RULES[formData.country] || FRONTEND_COUNTRY_RULES["India"]).requiredDocs.map((docType) => (
                             <DocUpload 
                               key={docType}
                               label={docType} 
                               required 
                               active={documents.some(d => d.doc_type === docType)} 
                               onUpload={(e) => handleFileChange(e, docType)}
                               onDelete={() => handleDocDelete(docType)}
                             />
                           ))
                         )}
                       </div>
                       
                       <div className="p-6 bg-amber-50 border border-amber-100 rounded-3xl flex gap-4">
                          <AlertCircle className="text-amber-500 shrink-0" size={24} />
                          <div className="space-y-1">
                             <h4 className="font-bold text-amber-900 text-sm uppercase tracking-tight">Important Note</h4>
                             <p className="text-xs text-amber-700 leading-relaxed">
                                Upload documents in PDF format only. Maximum file size allowed is 5MB. Clear, original scans ensure 2x faster verification. Self-attested copies are preferred.
                             </p>
                          </div>
                       </div>
                    </div>
                  )}

                  <div className="mt-12 pt-12 border-t border-slate-100 flex items-center justify-between">
                     <button 
                       disabled={step === 1}
                       onClick={() => setStep(step - 1)}
                       className="flex items-center gap-2 text-slate-400 hover:text-slate-600 font-bold uppercase tracking-widest text-xs disabled:opacity-0 transition-all cursor-pointer"
                     >
                       <ChevronLeft size={16} /> Back
                     </button>
                     
                     {step < 5 ? (
                       <button 
                         onClick={() => setStep(step + 1)}
                         className="flex items-center gap-3 bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all cursor-pointer"
                       >
                         Continue <ChevronRight size={16} />
                       </button>
                     ) : (
                       <button 
                         onClick={handleSubmitVerification}
                         className="flex items-center gap-3 bg-slate-900 text-white px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all cursor-pointer"
                       >
                         Submit to Admin <CheckCircle2 size={16} />
                       </button>
                     ) }
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Input({ label, placeholder, value, onChange, icon, type = "text" }: any) {
  return (
    <div className="space-y-2 group">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{label}</label>
      <div className="relative">
         <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
            {icon}
         </div>
         <input 
           type={type}
           value={value}
           onChange={e => onChange(e.target.value)}
           placeholder={placeholder}
           max={type === "date" ? new Date().toISOString().split("T")[0] : undefined}
           className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-5 py-4 outline-none focus:ring-4 focus:ring-blue-50 text-sm font-medium transition-all hover:border-slate-300"
         />
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options, icon }: any) {
  return (
    <div className="space-y-2 group">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{label}</label>
      <div className="relative">
         <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors pointer-events-none">
            {icon}
         </div>
         <select 
           value={value}
           onChange={e => onChange(e.target.value)}
           className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-5 py-4 outline-none focus:ring-4 focus:ring-blue-50 text-sm font-medium transition-all hover:border-slate-300 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236B7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_1.25rem_center] bg-no-repeat cursor-pointer"
         >
           <option value="">Select {label}</option>
           {options.map((o: any) => <option key={o} value={o}>{o}</option>)}
         </select>
      </div>
    </div>
  );
}

function DocUpload({ label, required, active, onUpload, onDelete }: any) {
  return (
    <div className={`p-6 rounded-3xl border-2 transition-all group ${active ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-100 hover:border-blue-400 hover:bg-white border-dashed'}`}>
       <div className="flex items-center justify-between mb-4">
          <div className={`p-2 rounded-xl ${active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
             <FileText size={20} />
          </div>
          <div className="flex items-center gap-2">
             {required ? (
               active ? (
                 <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Uploaded</span>
               ) : (
                 <span className="text-[9px] font-black uppercase text-red-500 bg-red-50 px-2 py-0.5 rounded">Required</span>
               )
             ) : (
               active && <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Uploaded</span>
             )}
             {active && onDelete && (
               <button 
                 onClick={onDelete}
                 className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                 title="Delete Document"
               >
                 <X size={14} />
               </button>
             )}
          </div>
       </div>
       <h4 className="font-bold text-slate-800 text-sm">{label}</h4>
       {active ? (
         <div className="mt-3 flex items-center justify-between">
           <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-[10px] uppercase">
              <CheckCircle2 size={12} /> Uploaded Successfully
           </div>
           <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest cursor-pointer hover:underline">
              Replace
              <input type="file" className="hidden" accept=".pdf" onChange={onUpload} />
           </label>
         </div>
       ) : (
         <label className="mt-3 block text-[10px] font-black text-blue-600 uppercase tracking-widest cursor-pointer hover:underline">
            Click to upload PDF
            <input type="file" className="hidden" accept=".pdf" onChange={onUpload} />
         </label>
       )}
    </div>
  );
}