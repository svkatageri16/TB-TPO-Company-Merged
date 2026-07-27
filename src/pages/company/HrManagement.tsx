import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Mail, 
  Key, 
  Briefcase, 
  Shield, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  AlertCircle,
  Users,
  Search,
  CheckCircle,
  XCircle,
  Loader2,
  Workflow,
  Sparkles,
  ChevronRight,
  RefreshCw,
  Send,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';

interface SubHrUser {
  id: number;
  user_id: number; // actual users.id
  email: string;
  status: string;
  created_at: string;
  designation: string;
  permissions: string[];
  role_type: string;
}

interface CompanyJob {
  id: number;
  title: string;
  location: string;
  jobType: string;
  status: string;
}

interface JobApplicant {
  application_id: number;
  student_id: number;
  full_name: string;
  email: string;
  status: string;
  applied_at: string;
}

const ALL_PERMISSIONS = [
  { key: "Dashboard View", label: "Dashboard View", desc: "Access to view the company overview dashboard" },
  { key: "Jobs View", label: "Jobs View", desc: "View posted job opportunities" },
  { key: "Create Jobs", label: "Create Jobs", desc: "Post new jobs to the platform" },
  { key: "Edit Jobs", label: "Edit Jobs", desc: "Modify job descriptions and details" },
  { key: "End Jobs", label: "End Jobs", desc: "Archive or close active job postings" },
  { key: "Applicants View", label: "Applicants View", desc: "View the list of job applicants" },
  { key: "Pipeline View", label: "Pipeline View", desc: "Access the recruitment pipeline kanban" },
  { key: "Pipeline Manage", label: "Pipeline Manage", desc: "Move candidates between recruitment stages" },
  { key: "Candidate Select/Reject", label: "Candidate Select/Reject", desc: "Make selection or rejection decisions" },
  { key: "Candidate Notify", label: "Candidate Notify", desc: "Notify candidates about final application decisions" },
  { key: "Interview View", label: "Interview View", desc: "View scheduled interviews and feedback" },
  { key: "Schedule Interviews", label: "Schedule Interviews", desc: "Schedule or reschedule candidate interview slots" },
  { key: "Assessments View", label: "Assessments View", desc: "View test submissions and scoring details" },
  { key: "Create/Edit Tests", label: "Create/Edit Tests", desc: "Manage custom platform assessments and questionnaires" },
  { key: "Recommendations View", label: "Recommendations View", desc: "View AI recommendations and matches" },
  { key: "Drops View", label: "Drops View", desc: "Access drop management & view drops history" },
  { key: "Drops Create", label: "Drops Create", desc: "Post new company drops and updates" },
  { key: "Drops Edit", label: "Drops Edit", desc: "Modify published company drops" },
  { key: "Drops Delete", label: "Drops Delete", desc: "Remove published company drops" },
  { key: "Analytics View", label: "Analytics View", desc: "View recruitment statistics and reports" },
  { key: "Company Profile View", label: "Company Profile View", desc: "View and edit corporate details" },
  { key: "Audit Trail View Own", label: "Audit Trail View Own", desc: "View own activities/logs in the audit trail" }
];

export function HrManagement() {
  const { token: contextToken, profile } = useAuth();

  // Robust token retrieval falling back safely if context is loading
  const getEffectiveToken = () => {
    if (contextToken) return contextToken;
    const authData = localStorage.getItem("vega_auth");
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        if (parsed && parsed.token) {
          return parsed.token;
        }
      } catch (e) {
        console.error("Auth parsing error", e);
      }
    }
    return localStorage.getItem('token') || '';
  };

  const [activeTab, setActiveTab] = useState<'accounts' | 'allocation'>('accounts');
  const [hrs, setHrs] = useState<SubHrUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHr, setEditingHr] = useState<SubHrUser | null>(null);
  
  // New Credentials & Password States
  const [showPassword, setShowPassword] = useState(false);
  const [credentialsModalOpen, setCredentialsModalOpen] = useState(false);
  const [createdHrEmail, setCreatedHrEmail] = useState('');
  const [createdHrPassword, setCreatedHrPassword] = useState('');
  
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [designation, setDesignation] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Candidate Allocation States
  const [jobs, setJobs] = useState<CompanyJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [applicants, setApplicants] = useState<JobApplicant[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [selectedAppIds, setSelectedAppIds] = useState<number[]>([]);
  
  // Recruiter Targets for assignment
  const [targetHrUserId, setTargetHrUserId] = useState<string>('');
  const [distributionHrUserIds, setDistributionHrUserIds] = useState<number[]>([]);
  const [allocating, setAllocating] = useState(false);

  useEffect(() => {
    fetchHrs();
  }, []);

  const fetchHrs = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getEffectiveToken();
      const response = await fetch('/api/company/sub-hr', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const resData = await response.json();
      if (resData.success) {
        setHrs(resData.data || []);
      } else {
        setError(resData.message || 'Failed to load Sub HR accounts.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching accounts.');
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      setLoadingJobs(true);
      const token = getEffectiveToken();
      const response = await fetch('/api/jobs/company-managed/all', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resData = await response.json();
      if (resData.success) {
        setJobs(resData.data || []);
      }
    } catch (err) {
      console.error("Error fetching jobs:", err);
    } finally {
      setLoadingJobs(false);
    }
  };

  const fetchApplicants = async (jobId: string) => {
    if (!jobId) return;
    try {
      setLoadingApplicants(true);
      setSelectedAppIds([]);
      const token = getEffectiveToken();
      const response = await fetch(`/api/jobs/applicants/${jobId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resData = await response.json();
      if (resData.success) {
        setApplicants(resData.data?.applicants || []);
      } else {
        toast.error(resData.message || "Failed to load candidates.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error loading job candidates.");
    } finally {
      setLoadingApplicants(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'allocation') {
      fetchJobs();
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedJobId) {
      fetchApplicants(selectedJobId);
    } else {
      setApplicants([]);
      setSelectedAppIds([]);
    }
  }, [selectedJobId]);

  const handleOpenCreateModal = () => {
    setEditingHr(null);
    setEmail('');
    setPassword('');
    setDesignation('Recruiter');
    setStatus('ACTIVE');
    setSelectedPermissions([
      "Dashboard View",
      "Jobs View",
      "Applicants View",
      "Pipeline View",
      "Interview View",
      "Audit Trail View Own"
    ]);
    setShowPassword(false);
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (hr: SubHrUser) => {
    setEditingHr(hr);
    setEmail(hr.email);
    setPassword(''); 
    setDesignation(hr.designation);
    setStatus(hr.status);
    setSelectedPermissions(hr.permissions);
    setShowPassword(false);
    setError(null);
    setIsModalOpen(true);
  };

  const handleDeleteHr = async (hrId: number) => {
    if (!window.confirm("Are you absolutely sure you want to delete this Sub HR account? This action is irreversible.")) {
      return;
    }

    try {
      const token = getEffectiveToken();
      const response = await fetch(`/api/company/sub-hr/${hrId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const resData = await response.json();
      if (resData.success) {
        toast.success('Sub HR account deleted successfully.');
        fetchHrs();
      } else {
        toast.error(resData.message || 'Failed to delete Sub HR.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error deleting Sub HR.');
    }
  };

  const handlePermissionToggle = (permKey: string) => {
    if (selectedPermissions.includes(permKey)) {
      setSelectedPermissions(selectedPermissions.filter(p => p !== permKey));
    } else {
      setSelectedPermissions([...selectedPermissions, permKey]);
    }
  };

  const handleSelectAllPermissions = () => {
    setSelectedPermissions(ALL_PERMISSIONS.map(p => p.key));
  };

  const handleClearAllPermissions = () => {
    setSelectedPermissions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please provide a valid email address.');
      return;
    }

    if (selectedPermissions.length === 0) {
      setError('At least one permission must be assigned to the Sub HR account.');
      return;
    }

    const trimmedPassword = password.trim();
    if (trimmedPassword && trimmedPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const token = getEffectiveToken();
      
      const payload = {
        email,
        password: trimmedPassword || undefined,
        designation,
        permissions: selectedPermissions,
        status: editingHr ? status : undefined
      };

      // When updating, we pass editingHr.user_id (with fallback to editingHr.id) to route PUT /sub-hr/:id
      let url = '/api/company/sub-hr';
      if (editingHr) {
        const subHrId = editingHr.user_id || editingHr.id;
        if (!subHrId) {
          setError('Unable to update HR permissions: missing Sub HR identifier.');
          toast.error('Unable to update HR permissions: missing Sub HR identifier.');
          return;
        }
        url = `/api/company/sub-hr/${subHrId}`;
      }
      
      const method = editingHr ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || "Failed to save Sub HR account.");
      }

      const resData = await response.json();
      if (resData.success) {
        if (!editingHr && resData.emailStatus === 'FAILED' && resData.temporaryPassword) {
          // Email failed - show credentials modal to copy manually
          setCreatedHrEmail(email);
          setCreatedHrPassword(resData.temporaryPassword);
          setCredentialsModalOpen(true);
        } else {
          const successMsg = editingHr 
            ? 'Sub HR account updated successfully!' 
            : 'Sub HR created successfully. Login credentials have been emailed.';
          toast.success(successMsg);
        }
        setIsModalOpen(false);
        // Reset form fields
        setEmail('');
        setPassword('');
        setDesignation('');
        fetchHrs();
      } else {
        setError(resData.message || 'Operation failed.');
        toast.error(resData.message || 'Operation failed.');
      }
    } catch (err: any) {
      setError(err.message || 'Error saving Sub HR account.');
      toast.error(err.message || 'Error saving Sub HR account.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Single Applicant checkbox
  const handleToggleApplicant = (appId: number) => {
    if (selectedAppIds.includes(appId)) {
      setSelectedAppIds(selectedAppIds.filter(id => id !== appId));
    } else {
      setSelectedAppIds([...selectedAppIds, appId]);
    }
  };

  // Toggle All Applicants checkboxes
  const handleToggleAllApplicants = () => {
    if (selectedAppIds.length === applicants.length) {
      setSelectedAppIds([]);
    } else {
      setSelectedAppIds(applicants.map(a => a.application_id));
    }
  };

  // Manual Candidate Assignment Submission
  const handleManualAssign = async () => {
    if (selectedAppIds.length === 0) {
      toast.error("Please select at least one candidate application.");
      return;
    }
    if (!targetHrUserId) {
      toast.error("Please select a target Sub HR team member.");
      return;
    }

    try {
      setAllocating(true);
      const token = getEffectiveToken();
      const response = await fetch('/api/company/candidates/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          applicationIds: selectedAppIds,
          hrUserId: Number(targetHrUserId),
          assignmentType: 'MANUAL'
        })
      });
      const resData = await response.json();
      if (resData.success) {
        toast.success(`Successfully assigned ${selectedAppIds.length} candidate(s) to recruiter.`);
        setSelectedAppIds([]);
      } else {
        toast.error(resData.message || "Failed to assign candidates.");
      }
    } catch (err: any) {
      toast.error(err.message || "Error assigning candidates.");
    } finally {
      setAllocating(false);
    }
  };

  // Auto-Distribution Candidate Submission
  const handleAutoDistribute = async () => {
    if (selectedAppIds.length === 0) {
      toast.error("Please select at least one candidate application.");
      return;
    }
    if (distributionHrUserIds.length === 0) {
      toast.error("Please check at least one Sub HR recruiter to include in the distribution pool.");
      return;
    }

    try {
      setAllocating(true);
      const token = getEffectiveToken();
      const response = await fetch('/api/company/candidates/auto-distribute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          applicationIds: selectedAppIds,
          hrUserIds: distributionHrUserIds
        })
      });
      const resData = await response.json();
      if (resData.success) {
        toast.success(`Successfully auto-distributed ${selectedAppIds.length} candidate(s) among recruiters.`);
        setSelectedAppIds([]);
        setDistributionHrUserIds([]);
      } else {
        toast.error(resData.message || "Failed to distribute candidates.");
      }
    } catch (err: any) {
      toast.error(err.message || "Error distributing candidates.");
    } finally {
      setAllocating(false);
    }
  };

  const handleToggleDistributionHr = (userId: number) => {
    if (distributionHrUserIds.includes(userId)) {
      setDistributionHrUserIds(distributionHrUserIds.filter(id => id !== userId));
    } else {
      setDistributionHrUserIds([...distributionHrUserIds, userId]);
    }
  };

  // If this user is not a Super HR, show elegant access restriction screen
  if (profile?.isSubHr) {
    return (
      <div className="p-8 max-w-4xl mx-auto mt-12 text-center" id="hr-management-forbidden">
        <div className="bg-[#10122e] border border-rose-500/30 rounded-3xl p-8 shadow-2xl">
          <AlertCircle size={48} className="text-rose-500 mx-auto mb-4 animate-bounce" />
          <h2 className="text-2xl font-black text-white tracking-tight mb-2">Access Restricted</h2>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            You do not have the necessary security credentials or authorizations to manage company-wide HR accounts. Please consult your recruitment organization's Super HR admin.
          </p>
        </div>
      </div>
    );
  }

  const filteredHrs = hrs.filter(hr => 
    hr.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    hr.designation.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-white rounded-3xl border border-slate-100 shadow-sm" id="hr-management-viewport">
      {/* Upper header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Users className="text-blue-600" size={32} />
            HR Workspace Center
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage recruiter profiles, configure custom permissions, and allocate applicants dynamically to multiple recruitment staff.
          </p>
        </div>

        {activeTab === 'accounts' && (
          <button
            onClick={handleOpenCreateModal}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/10 transition-all duration-300 cursor-pointer self-start md:self-auto"
            id="btn-create-sub-hr"
          >
            <UserPlus size={18} />
            Create Sub HR
          </button>
        )}
      </div>

      {/* Tabs Row */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`px-6 py-4 font-black uppercase tracking-widest text-[11px] border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'accounts' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Users size={14} />
          Recruiter Profiles
        </button>
        <button
          onClick={() => setActiveTab('allocation')}
          className={`px-6 py-4 font-black uppercase tracking-widest text-[11px] border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'allocation' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Workflow size={14} />
          Candidate Allocation Center
        </button>
      </div>

      {/* TAB 1: ACCOUNTS LIST */}
      {activeTab === 'accounts' && (
        <div className="bg-white rounded-3xl space-y-6">
          {/* Search bar */}
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl w-full max-w-md">
            <Search size={18} className="text-slate-400" />
            <input
              type="text"
              placeholder="Search HRs by email or designation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none text-slate-800 text-sm outline-none w-full placeholder-slate-400"
            />
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3" id="hr-loading-spinner">
              <Loader2 className="text-blue-500 animate-spin" size={36} />
              <span className="text-slate-500 text-sm">Fetching HR staff list...</span>
            </div>
          ) : filteredHrs.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-blue-200 bg-blue-50/20 rounded-2xl" id="hr-empty-state">
              <Users className="text-blue-500 mx-auto mb-3" size={40} />
              <h3 className="text-lg font-bold text-blue-600">No HR Accounts Found</h3>
              <p className="text-slate-500 text-sm max-w-sm mx-auto mt-1">
                {searchTerm ? "No Sub HR accounts matched your current search filters." : "You haven't registered any Sub HR staff accounts yet. Create one now to delegate recruitment activities."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="hr-accounts-grid">
              {filteredHrs.map((hr) => (
                <div 
                  key={hr.id}
                  className="bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 relative overflow-hidden group shadow-sm"
                >
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-blue-400 to-blue-600 opacity-60" />
                  
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="overflow-hidden">
                        <h4 className="text-sm font-bold text-slate-800 truncate" title={hr.email}>{hr.email}</h4>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Briefcase size={13} className="text-blue-500 shrink-0" />
                          <span className="text-xs text-slate-500 font-medium truncate">{hr.designation || 'Recruiter'}</span>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        hr.status === 'ACTIVE' 
                          ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {hr.status}
                      </span>
                    </div>

                    <div className="border-t border-slate-100 pt-3">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">
                        Permissions ({hr.permissions.length})
                      </span>
                      <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-855">
                        {hr.permissions.length === 0 ? (
                          <span className="text-[11px] text-slate-400 italic">No permissions assigned.</span>
                        ) : (
                          hr.permissions.map((perm) => (
                            <span 
                              key={perm}
                              className="text-[10px] bg-blue-50/50 text-blue-600 px-2 py-0.5 rounded-md font-medium border border-blue-100/60"
                            >
                              {perm}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 mt-4">
                    <button
                      onClick={() => handleOpenEditModal(hr)}
                      className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                      title="Edit account details"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      onClick={() => handleDeleteHr(hr.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all cursor-pointer"
                      title="Delete Sub HR account"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CANDIDATE ALLOCATION PANEL */}
      {activeTab === 'allocation' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 bg-white">
          
          {/* Left Column: Select Job Posting */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 lg:col-span-1">
            <div>
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-1.5">
                <Briefcase className="text-blue-500" size={18} />
                1. Select Job Posting
              </h3>
              <p className="text-xs text-slate-400 mt-1">Select a role to inspect applied candidates.</p>
            </div>

            {loadingJobs ? (
              <div className="flex items-center gap-2 text-slate-400 text-xs py-8 justify-center">
                <Loader2 className="animate-spin text-blue-500" size={16} />
                <span>Loading active roles...</span>
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">No active job posts found</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin">
                {jobs.map((job) => {
                  const isSelected = selectedJobId === String(job.id);
                  return (
                    <button
                       key={job.id}
                       onClick={() => setSelectedJobId(String(job.id))}
                       className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between ${
                         isSelected 
                           ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' 
                           : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-600'
                       }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-black uppercase tracking-tight truncate">{job.title}</p>
                        <p className="text-[10px] text-slate-400 font-bold tracking-wide mt-0.5">{job.location || 'Remote'} • {job.jobType}</p>
                      </div>
                      <ChevronRight size={14} className={isSelected ? 'text-blue-500' : 'text-slate-400'} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Center Column: Select Candidate Applications */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 lg:col-span-2 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-1.5">
                    <Users className="text-blue-500" size={18} />
                    2. Select Candidates ({selectedAppIds.length} chosen)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Check the applicants you want to distribute or assign.</p>
                </div>

                {applicants.length > 0 && (
                  <button
                    onClick={handleToggleAllApplicants}
                    className="text-[10px] font-black text-blue-600 hover:text-white uppercase tracking-widest border border-blue-200 px-3 py-1.5 rounded-xl bg-blue-50/50 hover:bg-blue-600 transition-all self-start sm:self-auto cursor-pointer"
                  >
                    {selectedAppIds.length === applicants.length ? "Deselect All" : "Select All"}
                  </button>
                )}
              </div>

              {!selectedJobId ? (
                <div className="text-center py-20 border border-dashed border-blue-200 rounded-2xl bg-blue-50/20">
                  <Workflow className="text-blue-500 mx-auto mb-2" size={32} />
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Select a job post from the left column</p>
                </div>
              ) : loadingApplicants ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="animate-spin text-blue-500" size={32} />
                  <span className="text-xs text-slate-400">Loading applicant data...</span>
                </div>
              ) : applicants.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-blue-200 rounded-2xl bg-blue-50/20">
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">No active candidates have applied for this role yet</p>
                </div>
              ) : (
                <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white">
                  <div className="max-h-[350px] overflow-y-auto scrollbar-thin divide-y divide-slate-100">
                    {applicants.map((app) => {
                      const isChecked = selectedAppIds.includes(app.application_id);
                      return (
                        <label
                          key={app.application_id}
                          className="flex items-center justify-between p-3.5 hover:bg-slate-50/50 cursor-pointer select-none transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleApplicant(app.application_id)}
                              className="w-4 h-4 text-blue-600 border-slate-300 bg-white rounded focus:ring-blue-500"
                            />
                            <div>
                              <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{app.full_name}</p>
                              <p className="text-[10px] text-slate-400 font-medium">{app.email}</p>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-600 text-[9px] font-black uppercase rounded-md tracking-wider">
                            {app.status}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Allocation actions at bottom */}
            {selectedAppIds.length > 0 && (
              <div className="mt-6 border border-slate-200 p-5 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/55 shadow-inner">
                
                {/* Method A: Manual Assignment */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-1">
                    <CheckCircle size={14} />
                    Method A: Manual Allocation
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Assign all {selectedAppIds.length} selected candidates directly to a single recruitment team officer.
                  </p>
                  <div className="flex gap-2">
                    <select
                      value={targetHrUserId}
                      onChange={(e) => setTargetHrUserId(e.target.value)}
                      className="bg-white border border-slate-200 text-slate-700 text-xs rounded-xl px-3.5 py-2.5 w-full outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">-- Choose Recruiter --</option>
                      {hrs.map((hr) => (
                        <option key={hr.id} value={hr.user_id}>{hr.email} ({hr.designation})</option>
                      ))}
                    </select>
                    <button
                      onClick={handleManualAssign}
                      disabled={allocating || !targetHrUserId}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-[10px] uppercase tracking-wider px-4 rounded-xl shrink-0 transition-colors cursor-pointer"
                    >
                      Assign
                    </button>
                  </div>
                </div>

                {/* Method B: Auto Distribution */}
                <div className="space-y-3 border-t md:border-t-0 md:border-l border-slate-200 pt-4 md:pt-0 md:pl-6">
                  <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-1">
                    <Sparkles size={14} className="text-blue-500 animate-pulse" />
                    Method B: Equal Auto-Distribution
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Select recruiters below. The {selectedAppIds.length} candidates will be distributed evenly among them.
                  </p>
                  
                  <div className="space-y-1.5 max-h-[80px] overflow-y-auto border border-slate-200 p-2.5 rounded-xl bg-white">
                    {hrs.map((hr) => {
                      const isChecked = distributionHrUserIds.includes(hr.user_id);
                      return (
                        <label key={hr.id} className="flex items-center gap-2 cursor-pointer py-0.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleDistributionHr(hr.user_id)}
                            className="w-3.5 h-3.5 text-blue-600 rounded bg-white border-slate-300"
                          />
                          <span className="text-[10px] text-slate-600 font-semibold truncate">{hr.email}</span>
                        </label>
                      );
                    })}
                  </div>

                  <button
                    onClick={handleAutoDistribute}
                    disabled={allocating || distributionHrUserIds.length === 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-[10px] uppercase tracking-widest py-2.5 rounded-xl transition-colors cursor-pointer"
                  >
                    Auto-Distribute Evenly
                  </button>
                </div>

              </div>
            )}
          </div>

        </div>
      )}

      {/* CREATE OR UPDATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[200] overflow-y-auto">
          <div className="bg-[#0b0d26] border border-[#1e2354] w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden my-8">
            <div className="bg-[#101235] p-6 border-b border-[#1c2253] flex items-center justify-between">
              <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Shield className="text-indigo-400" size={22} />
                {editingHr ? 'Edit Sub HR Credentials & Permissions' : 'Create Sub HR Staff Account'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-start gap-3">
                  <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={18} />
                  <div className="text-xs text-rose-200 leading-normal font-semibold">
                    {error}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Email field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-300 uppercase tracking-wider block">
                    Staff Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-2 bg-[#0e1136] border border-[#21285c] px-3.5 py-2.5 rounded-xl">
                    <Mail size={16} className="text-slate-500 shrink-0" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. recruit.officer@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-transparent border-none text-white text-sm outline-none w-full placeholder-slate-600"
                    />
                  </div>
                </div>

                {/* Designation field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-300 uppercase tracking-wider block">
                    Designation/Job Role
                  </label>
                  <div className="flex items-center gap-2 bg-[#0e1136] border border-[#21285c] px-3.5 py-2.5 rounded-xl">
                    <Briefcase size={16} className="text-slate-500 shrink-0" />
                    <input
                      type="text"
                      placeholder="e.g. Associate Recruiter"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      className="bg-transparent border-none text-white text-sm outline-none w-full placeholder-slate-600"
                    />
                  </div>
                </div>

                {/* Password field */}
                <div className="space-y-1.5 col-span-1 md:col-span-2">
                  <label className="text-xs font-black text-slate-300 uppercase tracking-wider block">
                    Account Password {editingHr ? '(Leave blank to keep unchanged)' : <span className="text-slate-400 font-bold">(Optional)</span>}
                  </label>
                  <div className="flex items-center gap-2 bg-[#0e1136] border border-[#21285c] px-3.5 py-2.5 rounded-xl">
                    <Key size={16} className="text-slate-500 shrink-0" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder={editingHr ? "••••••••" : "Leave blank to auto-generate a secure password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-transparent border-none text-white text-sm outline-none w-full placeholder-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-white focus:outline-none focus:ring-0 cursor-pointer shrink-0 ml-1"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal mt-1">
                    Leave blank to auto-generate a secure password, or enter a custom password with minimum 6 characters. Credentials will be emailed to the user, and if delivery fails, they will be shown to you once here.
                  </p>
                </div>

                {/* Status selection */}
                {editingHr && (
                  <div className="space-y-1.5 col-span-1 md:col-span-2">
                    <label className="text-xs font-black text-slate-300 uppercase tracking-wider block">
                      Account Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="bg-[#0e1136] border border-[#21285c] text-white text-sm rounded-xl px-3.5 py-2.5 w-full outline-none focus:border-indigo-500"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE / LOCKED</option>
                    </select>
                  </div>
                )}
              </div>

              {/* PERMISSIONS BOX */}
              <div className="border-t border-[#1c2253] pt-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div>
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Configure Role Permissions</h4>
                    <p className="text-xs text-slate-400">Select precisely which capabilities this staff member is authorized to access.</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleSelectAllPermissions}
                      className="text-[11px] font-black text-indigo-400 hover:text-white uppercase tracking-wider border border-indigo-500/20 px-2.5 py-1 rounded-lg hover:bg-indigo-500/10 transition-all cursor-pointer"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllPermissions}
                      className="text-[11px] font-black text-slate-400 hover:text-white uppercase tracking-wider border border-slate-500/20 px-2.5 py-1 rounded-lg hover:bg-slate-500/10 transition-all cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#0a0c2c] border border-[#1a1f4b] p-4 rounded-2xl max-h-[300px] overflow-y-auto custom-scrollbar">
                  {ALL_PERMISSIONS.map((perm) => {
                    const isChecked = selectedPermissions.includes(perm.key);
                    return (
                      <div 
                        key={perm.key}
                        onClick={() => handlePermissionToggle(perm.key)}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all duration-200 ${
                          isChecked 
                            ? 'bg-[#121644] border-indigo-500/50' 
                            : 'bg-[#0b0e35]/30 border-[#1c2253] hover:border-slate-700'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-md border shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                          isChecked ? 'bg-indigo-600 border-indigo-500' : 'border-slate-600 bg-[#0e1136]'
                        }`}>
                          {isChecked && <Check size={10} className="text-white font-black" />}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-white block leading-tight">{perm.label}</span>
                          <span className="text-[10px] text-slate-400 mt-0.5 block leading-normal">{perm.desc}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="border-t border-[#1c2253] pt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-transparent hover:bg-white/5 border border-slate-700 text-slate-300 font-bold py-2.5 px-5 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold py-2.5 px-6 rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/20 transition-all duration-300 cursor-pointer"
                >
                  {submitting && <Loader2 className="animate-spin" size={16} />}
                  {editingHr ? 'Update Sub HR' : 'Register Sub HR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREDENTIALS BACKUP DISPLAY MODAL */}
      {credentialsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[210]">
          <div className="bg-[#0b0d26] border border-[#21285c] w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-6 text-center animate-in fade-in zoom-in duration-200">
            <div className="bg-amber-500/10 border border-amber-500/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto">
              <Key className="text-amber-500" size={32} />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-white">Sub HR Created Successfully</h3>
              <p className="text-xs text-slate-400">
                The account was created, but the credential notification email could not be delivered. Please copy the temporary credentials below and share them with the user securely.
              </p>
            </div>

            <div className="bg-[#0e1136] border border-[#1c2253] p-4 rounded-2xl space-y-3 text-left">
              <div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Email Address</span>
                <span className="text-sm font-semibold text-white break-all">{createdHrEmail}</span>
              </div>
              <div className="border-t border-[#1c2253]/50 pt-2 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Temporary Password</span>
                  <span className="text-sm font-mono font-bold text-amber-400 select-all">{createdHrPassword}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(createdHrPassword);
                    toast.success("Password copied to clipboard!");
                  }}
                  className="bg-[#1c2253] hover:bg-indigo-600 text-white font-bold text-[10px] uppercase tracking-wider py-1.5 px-3 rounded-lg transition-colors cursor-pointer"
                >
                  Copy
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setCredentialsModalOpen(false);
                setCreatedHrEmail('');
                setCreatedHrPassword('');
              }}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-2.5 rounded-xl transition-all cursor-pointer"
            >
              Done & Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
