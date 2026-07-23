import React, { useEffect, useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  FileText, 
  ShieldCheck,
  Search,
  ExternalLink,
  Eye,
  AlertCircle,
  Clock,
  ThumbsDown,
  ThumbsUp,
  FileSearch,
  ChevronRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

export default function TPOVerification() {
  const [activeTab, setActiveTab] = useState('PENDING');
  const [verifications, setVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Rejection Dialog state
  const [rejectionTarget, setRejectionTarget] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submittingRejection, setSubmittingRejection] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/tpo/verifications');
      if (res.data && res.data.success) {
        setVerifications(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching verifications:', err);
      toast.error('Failed to load verification requests.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number, name: string) => {
    const originalToastId = toast.loading(`Approving document for ${name}...`);
    try {
      const res = await api.post(`/tpo/verifications/${id}/approve`);
      if (res.data && res.data.success) {
        toast.success(`Document verified successfully for ${name}!`, { id: originalToastId });
        fetchData();
      } else {
        toast.error('Could not complete approval task.', { id: originalToastId });
      }
    } catch (err) {
      console.error(err);
      toast.error('Error verifying document.', { id: originalToastId });
    }
  };

  const handleTriggerReject = (v: any) => {
    setRejectionTarget(v);
    setRejectionReason('');
  };

  const handleSubmitRejection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      return toast.error('Please specify a rejection reason');
    }
    setSubmittingRejection(true);
    const originalToastId = toast.loading(`Rejecting document for ${rejectionTarget.full_name}...`);
    try {
      const res = await api.post(`/tpo/verifications/${rejectionTarget.id}/reject`, {
        reason: rejectionReason
      });
      if (res.data && res.data.success) {
        toast.success(`Document rejected for ${rejectionTarget.full_name}`, { id: originalToastId });
        setRejectionTarget(null);
        fetchData();
      } else {
        toast.error('Could not reject request.', { id: originalToastId });
      }
    } catch (err) {
      console.error(err);
      toast.error('Error rejecting document.', { id: originalToastId });
    } finally {
      setSubmittingRejection(false);
    }
  };

  const viewDocument = (url: string) => {
    if (!url) {
      return toast.error('No document URL provided.');
    }
    toast('Opening document preview in a new window...');
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Filters
  const filteredDocs = verifications.filter((v: any) => {
    const matchesTab = v.status === activeTab;
    const matchesSearch = 
      (v.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.college_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.document_type || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight italic">
            Document <span className="text-blue-600">Verification</span>
          </h1>
          <p className="text-slate-500 font-medium">Review and verify student credentials for placement eligibility</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm self-start">
          {['PENDING', 'VERIFIED', 'REJECTED'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === tab 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex items-start gap-4">
        <ShieldCheck className="text-blue-600 shrink-0" size={24} />
        <div>
          <h4 className="font-black text-blue-900 text-sm uppercase tracking-tight animate-pulse">Dual-Verification Trust Protocol</h4>
          <p className="text-xs text-blue-700 font-semibold mt-1 leading-relaxed">
            Verified resumes & credentials receive the ❝Trust-Badge❞ which makes student records highly authoritative for premium recruiters & companies.
          </p>
        </div>
      </div>

      {/* Search & Statistics Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50 p-4 rounded-3xl border border-slate-100">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search student, college name or file type..." 
            className="w-full bg-white pl-11 pr-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-4 items-center font-bold text-xs text-slate-400 uppercase tracking-wider">
          <span>Active Requests: <strong className="text-slate-700 font-black">{verifications.filter(v => v.status === 'PENDING').length}</strong></span>
          •
          <span>Verified: <strong className="text-green-600 font-black">{verifications.filter(v => v.status === 'VERIFIED').length}</strong></span>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-slate-600 text-xs font-black uppercase tracking-widest animate-pulse">Loading Document Streams...</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Student & College</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Document Type</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Assigned College Status</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Submitted</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-16 text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <FileSearch size={40} className="text-slate-300" />
                        <p className="font-bold text-slate-500 text-sm">No verification requests found to show in this tab.</p>
                        <p className="text-xs text-slate-400">Any resume updates from students on your assigned colleges will instantly appear here dynamically!</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{doc.full_name}</p>
                        <p className="text-xs text-blue-600 font-extrabold uppercase mt-0.5 tracking-wide">{doc.college_name}</p>
                        <p className="text-[10px] text-slate-400 font-bold">{doc.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-blue-500 shrink-0" />
                          <span className="text-sm font-bold text-slate-700">{doc.document_type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-blue-50 text-blue-700 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-blue-150 tracking-wider">
                          EXCLUSIVE ASSIGNED
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-500">
                        {new Date(doc.created_at || Date.now()).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => viewDocument(doc.document_url)}
                            className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" 
                            title="Open Document in New Tab"
                          >
                            <Eye size={18} />
                          </button>

                          {doc.batch_status === 'INACTIVE' ? (
                            <span className="text-[10px] font-black text-red-600 flex items-center gap-1 bg-red-50/80 px-2.5 py-1.5 rounded-xl border border-red-100 uppercase tracking-wider" title="This student's academic batch has been disabled by the admin">
                              <AlertCircle size={12} className="text-red-500" /> Batch Inactive
                            </span>
                          ) : doc.status === 'PENDING' && (
                            <>
                              <button 
                                onClick={() => handleApprove(doc.id, doc.full_name)}
                                className="p-2.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all" 
                                title="Approve & Trust Document"
                              >
                                <CheckCircle2 size={18} />
                              </button>
                              <button 
                                onClick={() => handleTriggerReject(doc)}
                                className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" 
                                title="Reject & Provide Reason"
                              >
                                <XCircle size={18} />
                              </button>
                            </>
                          )}

                          {doc.status === 'REJECTED' && doc.rejection_reason && (
                            <span 
                              className="text-[11px] font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-xl border border-red-100 max-w-xs truncate block"
                              title={doc.rejection_reason}
                            >
                              Reason: {doc.rejection_reason}
                            </span>
                          )}

                          {doc.status === 'VERIFIED' && (
                            <span className="text-xs font-black text-green-600 flex items-center gap-1 bg-green-50 px-3 py-1.5 rounded-xl border border-green-150 uppercase tracking-wider">
                              <ShieldCheck size={14} /> Trust-Badge Active
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rejection Modal Option */}
      {rejectionTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden relative">
            <div className="p-8 border-b border-slate-100">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <AlertCircle size={22} className="text-red-500" />
                Reject Verification
              </h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">Student: {rejectionTarget.full_name}</p>
            </div>
            <form onSubmit={handleSubmitRejection}>
              <div className="p-8 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Rejection rationale/feedback</label>
                  <textarea
                    required
                    placeholder="e.g. Resume URL is corrupt or points to an invalid profile. Please update the resume in your profile setting to re-apply."
                    rows={4}
                    className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 font-medium focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                  />
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setRejectionTarget(null)}
                  className="px-5 py-2.5 font-bold text-slate-500 hover:text-slate-900 text-xs uppercase"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submittingRejection}
                  className="px-6 py-2.5 bg-red-600 rounded-xl font-bold text-white shadow-lg shadow-red-600/20 hover:bg-red-700 text-xs uppercase disabled:opacity-50"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
