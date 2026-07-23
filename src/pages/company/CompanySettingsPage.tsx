import React, { useState, useEffect } from 'react';
import { Settings, Shield, Bell, Key, Briefcase, Mail, Loader2, Eye, EyeOff, Users, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface TeamMember {
  id: number;
  user_id: number;
  email: string;
  status: string;
  created_at: string;
  designation: string;
  permissions: string[];
  role_type: string;
}

interface BillingInfo {
  planName: string;
  status: string;
  billingMessage: string;
  activeJobs: number;
  subHrCount: number;
  totalApplications: number;
  seatLimit: number;
  jobPostingLimit: string;
}

export function CompanySettingsPage() {
  const [activeTab, setActiveTab] = useState('account');
  const { user, token: contextToken } = useAuth();
  const navigate = useNavigate();

  // Token helper
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
        console.error(e);
      }
    }
    return "";
  };

  // Preferences State
  const [preferences, setPreferences] = useState({
    timezone: "Asia/Kolkata",
    emailNotifications: {
      newApplications: true,
      candidateStageUpdates: true,
      interviewReminders: true,
      assessmentSubmissions: true,
      jobExpiryAlerts: true,
      weeklyHiringSummary: false
    }
  });
  const [loadingPrefs, setLoadingPrefs] = useState(true);

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secLoading, setSecLoading] = useState(false);
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Team Members State
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);

  // Billing State
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [loadingBilling, setLoadingBilling] = useState(false);

  // Fetch preferences on load
  const fetchPreferences = async () => {
    try {
      setLoadingPrefs(true);
      const token = getEffectiveToken();
      const response = await fetch('/api/company/settings/preferences', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const resData = await response.json();
      if (resData.success && resData.preferences) {
        setPreferences({
          timezone: resData.preferences.timezone || "Asia/Kolkata",
          emailNotifications: {
            newApplications: resData.preferences.emailNotifications?.newApplications ?? true,
            candidateStageUpdates: resData.preferences.emailNotifications?.candidateStageUpdates ?? true,
            interviewReminders: resData.preferences.emailNotifications?.interviewReminders ?? true,
            assessmentSubmissions: resData.preferences.emailNotifications?.assessmentSubmissions ?? true,
            jobExpiryAlerts: resData.preferences.emailNotifications?.jobExpiryAlerts ?? true,
            weeklyHiringSummary: resData.preferences.emailNotifications?.weeklyHiringSummary ?? false
          }
        });
      }
    } catch (err: any) {
      console.error("Error fetching settings preferences:", err);
    } finally {
      setLoadingPrefs(false);
    }
  };

  // Save preferences
  const savePreferences = async (updatedPrefs: typeof preferences) => {
    try {
      const token = getEffectiveToken();
      const response = await fetch('/api/company/settings/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedPrefs)
      });
      const resData = await response.json();
      if (resData.success) {
        toast.success('Preferences saved successfully.');
      } else {
        toast.error(resData.message || 'Failed to update preferences.');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred while saving.');
    }
  };

  // Fetch Team Members
  const fetchTeamMembers = async () => {
    try {
      setLoadingTeam(true);
      const token = getEffectiveToken();
      const response = await fetch('/api/company/sub-hr', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const resData = await response.json();
      if (resData.success) {
        setTeamMembers(resData.data || []);
      }
    } catch (err) {
      console.error("Error fetching team:", err);
    } finally {
      setLoadingTeam(false);
    }
  };

  // Fetch Billing Info
  const fetchBillingInfo = async () => {
    try {
      setLoadingBilling(true);
      const token = getEffectiveToken();
      const response = await fetch('/api/company/settings/billing', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const resData = await response.json();
      if (resData.success) {
        setBillingInfo(resData.billing);
      }
    } catch (err) {
      console.error("Error fetching billing:", err);
    } finally {
      setLoadingBilling(false);
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, []);

  useEffect(() => {
    if (activeTab === 'team') {
      fetchTeamMembers();
    } else if (activeTab === 'billing') {
      fetchBillingInfo();
    }
  }, [activeTab]);

  const handleToggle = (key: keyof typeof preferences.emailNotifications) => {
    const updated = {
      ...preferences,
      emailNotifications: {
        ...preferences.emailNotifications,
        [key]: !preferences.emailNotifications[key]
      }
    };
    setPreferences(updated);
    savePreferences(updated);
  };

  const handleTimezoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const updated = {
      ...preferences,
      timezone: e.target.value
    };
    setPreferences(updated);
    savePreferences(updated);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('All fields are required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long.');
      return;
    }

    try {
      setSecLoading(true);
      const token = getEffectiveToken();
      const response = await fetch('/api/company/settings/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
      });
      const resData = await response.json();
      if (resData.success) {
        toast.success('Password updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(resData.message || 'Failed to update password.');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred.');
    } finally {
      setSecLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Organization Settings</h1>
          <p className="text-slate-500 font-medium text-sm italic mt-1">Manage notifications, billing, and team access.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-10">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
          {[
            { id: 'account', icon: Briefcase, label: 'Account Info' },
            { id: 'security', icon: Shield, label: 'Security' },
            { id: 'notifications', icon: Bell, label: 'Notifications' },
            { id: 'billing', icon: Key, label: 'Billing & Plans' },
            { id: 'team', icon: Mail, label: 'Team Members' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/10'
                  : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50 hover:border-slate-200'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Panel */}
        <div className="flex-1 bg-white rounded-[40px] border border-slate-100 p-10 shadow-sm relative overflow-hidden min-h-[450px]">
          {loadingPrefs && activeTab === 'account' && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-20">
              <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
            </div>
          )}

          {/* Account Info Tab */}
          {activeTab === 'account' && (
            <div className="space-y-8 relative z-10">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Account Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Primary Email</label>
                  <input type="email" disabled value={user?.email || ''} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-medium text-slate-500 cursor-not-allowed" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Timezone</label>
                  <select 
                    value={preferences.timezone}
                    onChange={handleTimezoneChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/5 transition-all text-slate-800"
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                    <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                  </select>
                </div>
              </div>
              <div className="pt-6 border-t border-slate-50">
                <button 
                  onClick={() => toast.error("Deactivation request must be raised directly to platform support.")}
                  className="bg-red-50 text-red-600 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-100 transition-colors"
                >
                  Deactivate Account
                </button>
              </div>
            </div>
          )}

          {/* Security (Password Change) Tab */}
          {activeTab === 'security' && (
            <div className="space-y-8 relative z-10">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Security Credentials</h2>
              
              <form onSubmit={handlePasswordChange} className="space-y-6 max-w-lg">
                <div className="space-y-2 relative">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Current Password</label>
                  <div className="relative">
                    <input 
                      type={showCurrentPass ? "text" : "password"} 
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-5 pr-12 py-3.5 text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/5 transition-all text-slate-800"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2 relative">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">New Password (Min 8 chars)</label>
                  <div className="relative">
                    <input 
                      type={showNewPass ? "text" : "password"} 
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-5 pr-12 py-3.5 text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/5 transition-all text-slate-800"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2 relative">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Confirm New Password</label>
                  <div className="relative">
                    <input 
                      type={showConfirmPass ? "text" : "password"} 
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-5 pr-12 py-3.5 text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/5 transition-all text-slate-800"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={secLoading}
                  className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-colors flex items-center gap-2 disabled:opacity-55"
                >
                  {secLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Update Password
                </button>
              </form>
            </div>
          )}

          {/* Email Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-8 relative z-10">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Email Notifications</h2>
              
              <div className="space-y-4">
                {[
                  { key: 'newApplications', title: 'New Applications', desc: 'Receive an email when a new candidate applies.' },
                  { key: 'candidateStageUpdates', title: 'Candidate Stage Updates', desc: 'Get notified when candidates advance or fail a stage.' },
                  { key: 'interviewReminders', title: 'Interview Reminders', desc: 'Get reminded 24 hours before a scheduled interview.' },
                  { key: 'assessmentSubmissions', title: 'Assessment Submissions', desc: 'Get notified when custom test submissions are completed.' },
                  { key: 'jobExpiryAlerts', title: 'Job Expiry Alerts', desc: 'Receive alerts when job postings are close to their deadlines.' },
                  { key: 'weeklyHiringSummary', title: 'Weekly Hiring Digest', desc: 'Receive a weekly performance analytics summary.' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-6 border border-slate-100 rounded-3xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <div>
                      <h3 className="text-sm font-black text-slate-800 uppercase">{item.title}</h3>
                      <p className="text-xs text-slate-500 font-medium mt-1">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={preferences.emailNotifications[item.key as keyof typeof preferences.emailNotifications] ?? false}
                        onChange={() => handleToggle(item.key as keyof typeof preferences.emailNotifications)}
                      />
                      <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Billing & Plans Tab */}
          {activeTab === 'billing' && (
            <div className="space-y-8 relative z-10">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Billing & subscription</h2>
                  <p className="text-slate-500 font-medium text-xs mt-1">Real-time resource and seat utilization metrics.</p>
                </div>
              </div>

              {loadingBilling ? (
                <div className="flex justify-center items-center h-48">
                  <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
                </div>
              ) : billingInfo ? (
                <div className="space-y-8">
                  {/* Active plan card */}
                  <div className="p-8 border border-slate-200 rounded-[30px] bg-slate-50 relative overflow-hidden">
                    <div className="absolute right-0 top-0 bg-blue-600 text-white font-black uppercase text-[9px] tracking-widest px-4 py-2 rounded-bl-2xl">
                      ACTIVE TIER
                    </div>
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">CURRENT PLAN</span>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mt-1">{billingInfo.planName}</h3>
                    <p className="text-slate-500 font-semibold text-xs mt-2 max-w-md">{billingInfo.billingMessage}</p>
                  </div>

                  {/* Resource usage statistics */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="p-6 border border-slate-100 rounded-2xl bg-white shadow-sm">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Active Jobs</span>
                      <span className="text-2xl font-black text-slate-800 block mt-1">{billingInfo.activeJobs}</span>
                      <span className="text-[10px] text-slate-500 font-medium mt-1 block">Limit: {billingInfo.jobPostingLimit}</span>
                    </div>

                    <div className="p-6 border border-slate-100 rounded-2xl bg-white shadow-sm">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Sub HR Seats</span>
                      <span className="text-2xl font-black text-slate-800 block mt-1">{billingInfo.subHrCount}</span>
                      <span className="text-[10px] text-slate-500 font-medium mt-1 block">Limit: {billingInfo.seatLimit} seats</span>
                    </div>

                    <div className="p-6 border border-slate-100 rounded-2xl bg-white shadow-sm">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Applications</span>
                      <span className="text-2xl font-black text-slate-800 block mt-1">{billingInfo.totalApplications}</span>
                      <span className="text-[10px] text-slate-500 font-medium mt-1 block">All active job postings</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
                    <span className="text-slate-500 font-medium">To configure custom contract parameters, reach out to your Account Executive.</span>
                    <button 
                      onClick={() => toast.success("platform-billing-service: Contact admin@vega.com for quota extensions.")}
                      className="text-blue-600 font-black uppercase tracking-wider hover:underline"
                    >
                      Request seat extension
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center p-12 text-slate-400 font-semibold text-sm">
                  Failed to load billing metrics.
                </div>
              )}
            </div>
          )}

          {/* Team Members Tab */}
          {activeTab === 'team' && (
            <div className="space-y-8 relative z-10">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Authorized Team</h2>
                  <p className="text-slate-500 font-medium text-xs mt-1">Authorized Sub HR / Recruiter accounts mapped to your company.</p>
                </div>
                <button 
                  onClick={() => navigate('/company/hr-management')}
                  className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-lg shadow-slate-900/10"
                >
                  Manage Team
                  <ArrowRight size={14} />
                </button>
              </div>

              {loadingTeam ? (
                <div className="flex justify-center items-center h-48">
                  <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
                </div>
              ) : teamMembers.length === 0 ? (
                <div className="border-2 border-dashed border-slate-100 rounded-[30px] p-12 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mb-4">
                    <Users size={30} />
                  </div>
                  <h3 className="text-sm font-black text-slate-800 uppercase">No Sub HR Accounts Mapped</h3>
                  <p className="text-xs text-slate-500 max-w-sm mt-1 font-semibold leading-relaxed">
                    You have not mapped any Sub HR recruiter accounts yet. Head over to HR Management to add custom sub-recruiters.
                  </p>
                  <button 
                    onClick={() => navigate('/company/hr-management')}
                    className="mt-5 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-colors"
                  >
                    Configure First Seat
                  </button>
                </div>
              ) : (
                <div className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                          <th className="py-4 px-6">Name / Email</th>
                          <th className="py-4 px-6">Designation</th>
                          <th className="py-4 px-6">Role Type</th>
                          <th className="py-4 px-6">Permissions</th>
                          <th className="py-4 px-6">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-xs text-slate-700 font-semibold">
                        {teamMembers.map((member) => (
                          <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 px-6">
                              <span className="text-slate-800 font-bold block">{member.email}</span>
                              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                                Joined {new Date(member.created_at).toLocaleDateString()}
                              </span>
                            </td>
                            <td className="py-4 px-6">{member.designation || 'Recruiter'}</td>
                            <td className="py-4 px-6">
                              <span className="bg-blue-50 text-blue-700 font-black text-[9px] uppercase px-2.5 py-1 rounded-full tracking-widest">
                                {member.role_type || 'SUB_HR'}
                              </span>
                            </td>
                            <td className="py-4 px-6 max-w-xs">
                              <div className="flex flex-wrap gap-1">
                                {member.permissions && member.permissions.length > 0 ? (
                                  member.permissions.slice(0, 2).map((perm, pIdx) => (
                                    <span key={pIdx} className="bg-slate-100 text-slate-600 text-[8px] font-bold uppercase px-2 py-0.5 rounded">
                                      {perm}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-slate-400 text-[10px] italic">None</span>
                                )}
                                {member.permissions && member.permissions.length > 2 && (
                                  <span className="bg-slate-200 text-slate-700 text-[8px] font-black px-1.5 py-0.5 rounded">
                                    +{member.permissions.length - 2}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${
                                member.status === 'ACTIVE' ? 'text-emerald-600' : 'text-red-500'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  member.status === 'ACTIVE' ? 'bg-emerald-600 animate-pulse' : 'bg-red-500'
                                }`}></span>
                                {member.status || 'ACTIVE'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
