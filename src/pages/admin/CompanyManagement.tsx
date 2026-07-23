import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  Search, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Eye,
  Briefcase
} from 'lucide-react';
import api from '../../services/api';

export function CompanyManagement() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'REVIEW' | 'VIEW'>('VIEW');
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const { data } = await api.get('/admin/users');
      if (data.success) {
        setCompanies(data.data.filter((u: any) => u.role === 'COMPANY'));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (company: any, mode: 'REVIEW' | 'VIEW') => {
    try {
       const { data } = await api.get(`/admin/companies/${company.id}/details`);
       if (data.success) {
          setSelectedCompany({ ...company, detailedItem: data.data });
       }
    } catch (e) {
       setSelectedCompany(company);
    }
    setViewMode(mode);
  };

  const handleVerify = async (companyId: number, status: 'APPROVED' | 'REJECTED') => {
    if (status === 'REJECTED' && !reason) {
      alert("Please provide a reason for rejection");
      return;
    }

    try {
      const { data } = await api.post('/admin/companies/verify', { companyId, status, reason });
      if (data.success) {
        alert(`Company ${status.toLowerCase()} successfully`);
        setSelectedCompany(null);
        setReason('');
        fetchCompanies();
      }
    } catch (error) {
      alert("Verification update failed");
    }
  };

  const openVerificationFile = (docUrl: string, docType: string) => {
    try {
      if (!docUrl) {
        alert("No document file available.");
        return;
      }

      if (docUrl.startsWith("data:")) {
        const parts = docUrl.split(",");
        if (parts.length < 2) {
          alert("The uploaded document format is invalid.");
          return;
        }
        
        const meta = parts[0];
        const base64Data = parts[1];
        
        // Extract MIME type, e.g., "application/pdf" from "data:application/pdf;base64"
        const mimeMatch = meta.match(/data:([^;]+)/);
        const mimeType = mimeMatch ? mimeMatch[1] : "application/pdf";
        
        try {
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: mimeType });
          const blobUrl = URL.createObjectURL(blob);
          
          const newWindow = window.open(blobUrl, "_blank", "noopener,noreferrer");
          if (!newWindow) {
            alert("Popup blocked! Please allow popups to view the document.");
          }
        } catch (e) {
          console.error("Base64 decoding failed:", e);
          alert("The uploaded file could not be opened because it is corrupted or malformed.");
        }
      } else {
        const newWindow = window.open(docUrl, "_blank", "noopener,noreferrer");
        if (!newWindow) {
          alert("Popup blocked! Please allow popups to view the document.");
        }
      }
    } catch (err) {
      console.error("Error opening document:", err);
      alert("An error occurred while opening the document.");
    }
  };

  const filtered = companies.filter(c => 
    c.company_name?.toLowerCase().includes(search.toLowerCase()) || 
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Company Management</h1>
          <p className="text-slate-500 font-medium">Verify credentials and manage partnerships.</p>
        </div>
        <div className="relative w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search companies..." 
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Company</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type / Industry</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Verification</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((company, idx) => (
              <motion.tr 
                key={company.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="group hover:bg-slate-50/50 transition-all border-b border-slate-50 last:border-0"
              >
                <td className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                      <Building2 size={24} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 uppercase leading-tight">
                        {company.company_name || 'Incomplete Profile'}
                      </h4>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">{company.email}</p>
                    </div>
                  </div>
                </td>
                <td className="p-6">
                   <div className="space-y-0.5">
                      <p className="text-[10px] font-black text-slate-900 uppercase">{company.company_type || 'N/A'}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{company.industry || 'No Industry'}</p>
                   </div>
                </td>
                <td className="p-6">
                  <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase flex items-center gap-1 w-fit ${
                    company.company_status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 
                    company.company_status === 'PENDING' ? 'bg-orange-100 text-orange-700 animate-pulse' : 
                    'bg-red-100 text-red-700'
                  }`}>
                    {company.company_status === 'APPROVED' ? <CheckCircle2 size={10} /> : 
                     company.company_status === 'PENDING' ? <Clock size={10} /> : 
                     <XCircle size={10} />}
                    {company.company_status}
                  </span>
                </td>
                <td className="p-6 text-right">
                   <div className="flex items-center justify-end gap-3">
                      {company.company_status === 'PENDING' ? (
                        <button 
                          onClick={() => handleViewDetails(company, 'REVIEW')}
                          className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
                        >
                          Review <ExternalLink size={12} />
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleViewDetails(company, 'VIEW')}
                          className="p-2 text-slate-400 hover:text-blue-600 transition-all hover:bg-blue-50 rounded-lg"
                          title="View Profile"
                        >
                          <Eye size={16} />
                        </button>
                      )}
                      <div className="flex items-center gap-2">
                         <ShieldCheck size={16} className={company.company_status === 'APPROVED' ? 'text-emerald-500' : 'text-slate-200'} />
                      </div>
                   </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Review/View Modal */}
      <AnimatePresence>
        {selectedCompany && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
            >
               <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg">
                      <Building2 size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-900 uppercase">{selectedCompany.company_name || 'Incomplete Profile'}</h2>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-widest leading-none">{selectedCompany.email}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedCompany(null)} className="text-[10px] font-black text-slate-400 hover:text-slate-900 uppercase bg-white px-3 py-1.5 rounded-lg border border-slate-200">CLOSE</button>
               </div>

               <div className="p-8 overflow-y-auto space-y-8">
                  {viewMode === 'REVIEW' && (
                    <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 flex gap-4">
                       <AlertTriangle className="text-orange-500 shrink-0" size={24} />
                       <p className="text-xs font-medium text-orange-800">
                          Please verify all business documentation including PAN, GST, and CIN numbers before approval.
                       </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                     <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Company Type</label>
                        <p className="text-sm font-bold text-slate-900">{selectedCompany.company_type || 'N/A'}</p>
                     </div>
                     <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Industry</label>
                        <p className="text-sm font-bold text-slate-900">{selectedCompany.industry || 'N/A'}</p>
                     </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Business Description</label>
                    <p className="text-sm text-slate-600 leading-relaxed font-medium bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      {selectedCompany.description || 'No description provided by the company.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Location</label>
                        <p className="text-sm font-bold text-slate-900">{selectedCompany.location || 'N/A'}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Contact</label>
                        <p className="text-sm font-bold text-slate-900">{selectedCompany.contact_number || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Detailed Profile & Legal Verification */}
                  {selectedCompany.detailedItem?.profile && (
                    <div className="border-t border-slate-100 pt-8 space-y-6">
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <ShieldCheck size={16} className="text-indigo-600" />
                        Legal & Corporate Credentials
                      </h3>

                      {/* Automated Compliance & Risk Score Section */}
                      <div className="bg-slate-50 border border-slate-100 p-6 rounded-3xl space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <ShieldAlert size={14} className="text-amber-600" />
                          Automated Compliance & Risk Score
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-white p-4 rounded-2xl border border-slate-50 shadow-sm">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Risk Assessment</span>
                            <div className="flex items-baseline gap-2 mt-1">
                              <span className="text-lg font-black text-slate-800">
                                {selectedCompany.detailedItem.profile.risk_score || 0}
                              </span>
                              <span className="text-xs text-slate-400">/ 100</span>
                            </div>
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase block mt-1.5 w-fit ${
                              (selectedCompany.detailedItem.profile.risk_score || 0) >= 40 
                                ? 'bg-red-50 text-red-600 border border-red-100' 
                                : (selectedCompany.detailedItem.profile.risk_score || 0) >= 20 
                                ? 'bg-amber-50 text-amber-600 border border-amber-100' 
                                : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            }`}>
                              {(selectedCompany.detailedItem.profile.risk_score || 0) >= 40 
                                ? 'High Risk' 
                                : (selectedCompany.detailedItem.profile.risk_score || 0) >= 20 
                                ? 'Medium Risk' 
                                : 'Low Risk'}
                            </span>
                          </div>

                          <div className="bg-white p-4 rounded-2xl border border-slate-50 shadow-sm">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Domain Verification</span>
                            <span className={`text-xs font-bold block mt-1 ${
                              selectedCompany.detailedItem.profile.domain_checked === 1 ? 'text-emerald-600' : 'text-amber-600'
                            }`}>
                              {selectedCompany.detailedItem.profile.domain_checked === 1 ? 'Matched Corporate Domain' : 'Unverified/Free Domain'}
                            </span>
                            <span className="text-[9px] text-slate-400 block mt-2">
                              {selectedCompany.detailedItem.profile.company_email}
                            </span>
                          </div>

                          <div className="bg-white p-4 rounded-2xl border border-slate-50 shadow-sm">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Verification Level</span>
                            <span className="text-xs font-black text-slate-800 block mt-1 uppercase">
                              {selectedCompany.detailedItem.profile.verification_level || 'STANDARD'}
                            </span>
                            <p className="text-[8px] text-slate-400 font-medium leading-tight mt-1.5">
                              {(selectedCompany.detailedItem.profile.verification_level || 'STANDARD') === 'HIGH_RISK_MANUAL' 
                                ? 'Requires careful physical/notary document verification.' 
                                : 'Eligible for fast-track standard review.'}
                            </p>
                          </div>
                        </div>

                        {selectedCompany.detailedItem.profile.risk_flags ? (
                          <div className="bg-red-50/50 border border-red-100/50 p-4 rounded-2xl space-y-1">
                            <span className="text-[9px] font-black text-red-700 uppercase tracking-wider block">Compliance Flags Triggered:</span>
                            <div className="text-[10px] text-slate-600 font-semibold space-y-1">
                              {selectedCompany.detailedItem.profile.risk_flags.split(',').map((flag: string, index: number) => (
                                <p key={index} className="flex items-center gap-1.5 text-red-700">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 block"></span>
                                  {flag.trim()}
                                </p>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-emerald-50/30 border border-emerald-100/30 p-3 rounded-2xl">
                            <p className="text-[10px] text-emerald-700 font-bold flex items-center gap-1.5">
                              <CheckCircle2 size={12} /> No automated compliance risk flags triggered.
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
                          <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Registered Business Name</label>
                          <p className="text-sm font-bold text-slate-900">{selectedCompany.detailedItem.profile.business_name || 'N/A'}</p>
                        </div>
                        <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
                          <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Country of Registration</label>
                          <p className="text-sm font-bold text-slate-900">{selectedCompany.detailedItem.profile.country || 'India'}</p>
                        </div>
                        
                        {(selectedCompany.detailedItem.profile.country || "India") === "India" ? (
                          <>
                            <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
                              <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">GST Number</label>
                              <p className="text-sm font-mono font-bold text-indigo-700 bg-indigo-50/50 px-2 py-0.5 rounded-lg border border-indigo-100 w-fit">{selectedCompany.detailedItem.profile.gst_no || 'N/A'}</p>
                            </div>
                            <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
                              <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">CIN (Corporate ID)</label>
                              <p className="text-sm font-bold text-slate-900 font-mono">{selectedCompany.detailedItem.profile.cin_no || 'N/A'}</p>
                            </div>
                            <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
                              <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">PAN Number</label>
                              <p className="text-sm font-bold text-slate-900 font-mono">{selectedCompany.detailedItem.profile.pan_no || 'N/A'}</p>
                            </div>
                          </>
                        ) : (
                          <>
                            {selectedCompany.detailedItem.profile.entity_type && (
                              <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
                                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Entity Type</label>
                                <p className="text-sm font-bold text-slate-900">{selectedCompany.detailedItem.profile.entity_type}</p>
                              </div>
                            )}
                            {selectedCompany.detailedItem.profile.registry_number && (
                              <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
                                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Registry Number</label>
                                <p className="text-sm font-bold text-slate-900 font-mono">{selectedCompany.detailedItem.profile.registry_number}</p>
                              </div>
                            )}
                            {selectedCompany.detailedItem.profile.tax_id && (
                              <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
                                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Tax ID / EIN</label>
                                <p className="text-sm font-bold text-slate-900 font-mono">{selectedCompany.detailedItem.profile.tax_id}</p>
                              </div>
                            )}
                            {selectedCompany.detailedItem.profile.state_of_formation && (
                              <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
                                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">State of Formation</label>
                                <p className="text-sm font-bold text-slate-900">{selectedCompany.detailedItem.profile.state_of_formation}</p>
                              </div>
                            )}
                            {selectedCompany.detailedItem.profile.licensing_authority && (
                              <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
                                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Licensing Authority</label>
                                <p className="text-sm font-bold text-slate-900">{selectedCompany.detailedItem.profile.licensing_authority}</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100 space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase block">Registered Office Address</label>
                          <p className="text-xs font-semibold text-slate-700 leading-relaxed">{selectedCompany.detailedItem.profile.address || 'N/A'}</p>
                        </div>
                        <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100 space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase block">Operating/Branch Address</label>
                          <p className="text-xs font-semibold text-slate-700 leading-relaxed">{selectedCompany.detailedItem.profile.operating_address || 'N/A'}</p>
                        </div>
                      </div>

                      {/* Official Documents */}
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase block">Uploaded Verification Documents</label>
                        {selectedCompany.detailedItem.documents?.length > 0 ? (
                          <div className="grid grid-cols-1 divide-y divide-slate-100 bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                            {selectedCompany.detailedItem.documents.map((doc: any) => (
                              <div key={doc.id} className="p-4 bg-white hover:bg-slate-50/60 transition-all flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                                    <FileText size={18} />
                                  </div>
                                  <div>
                                    <h5 className="text-xs font-black text-slate-800 uppercase tracking-tight">{doc.doc_type}</h5>
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase flex items-center gap-1 mt-0.5">
                                      <CheckCircle2 size={10} /> Active Attachment
                                    </p>
                                  </div>
                                </div>
                                {doc.doc_url ? (
                                  <button 
                                    onClick={() => openVerificationFile(doc.doc_url, doc.doc_type)}
                                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-1.5 shadow-sm transition-all shadow-slate-900/10 hover:scale-105 active:scale-95 cursor-pointer"
                                  >
                                    Open File <ExternalLink size={12} />
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">No URL</span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-6 bg-slate-100/50 rounded-2xl border border-slate-200 border-dashed text-center">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">No legal documents uploaded yet.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedCompany.detailedItem && (
                    <div className="grid grid-cols-2 gap-8 border-t border-slate-100 pt-8">
                       <div className="space-y-4">
                          <h3 className="text-xs font-black text-slate-900 uppercase flex items-center gap-2">
                            <Briefcase size={14} className="text-blue-600" />
                            Active Jobs ({selectedCompany.detailedItem.jobs?.length || 0})
                          </h3>
                          {selectedCompany.detailedItem.jobs?.length > 0 ? (
                            <div className="space-y-3">
                              {selectedCompany.detailedItem.jobs.map((job: any) => (
                                <div key={job.id} className="p-4 bg-white border border-slate-100 shadow-sm rounded-2xl">
                                  <p className="text-sm font-bold text-slate-900">{job.title}</p>
                                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">{job.location} • {job.work_mode}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic">No active jobs posted.</p>
                          )}
                       </div>

                       <div className="space-y-4">
                          <h3 className="text-xs font-black text-slate-900 uppercase flex items-center gap-2">
                            <FileText size={14} className="text-blue-600" />
                            Application Stats
                          </h3>
                          {selectedCompany.detailedItem.applicationStats?.length > 0 ? (
                            <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                              {selectedCompany.detailedItem.applicationStats.map((stat: any) => (
                                <div key={stat.status} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100">
                                  <span className="text-[10px] font-black text-slate-500 uppercase">{stat.status}</span>
                                  <span className="text-sm font-bold text-slate-900">{stat.count}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic">No generic application stats found.</p>
                          )}
                       </div>
                    </div>
                  )}

                  {viewMode === 'REVIEW' && (
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                       <label className="text-xs font-black text-slate-900 uppercase mb-3 block italic tracking-tighter">Review Result Note</label>
                       <textarea 
                          placeholder="Provide context for rejection or internal notes for approval..."
                          className="w-full h-32 p-4 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                       />
                       <div className="flex gap-4">
                          <button 
                             onClick={() => handleVerify(selectedCompany.company_profile_id, 'REJECTED')}
                             className="flex-1 py-4 bg-red-100 text-red-700 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-red-200 transition-colors"
                          >
                             Reject Application
                          </button>
                          <button 
                             onClick={() => handleVerify(selectedCompany.company_profile_id, 'APPROVED')}
                             className="flex-1 py-4 bg-blue-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20"
                          >
                             Approve Partnership
                          </button>
                       </div>
                    </div>
                  )}
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
