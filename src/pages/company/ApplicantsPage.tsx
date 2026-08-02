import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import api from '../../services/api.ts';
import { Search, Download, History } from 'lucide-react';
import { CandidateTable } from '../../components/company/CandidateTable.tsx';
import { CandidateDetailModal } from '../../components/company/CandidateDetailModal.tsx';
import { ApplicantHistoryModal } from '../../components/company/ApplicantHistoryModal.tsx';
import { AnimatePresence } from 'motion/react';

export function ApplicantsPage() {
  const { user } = useAuth();
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  
  // History Modal State
  const [historyCandidate, setHistoryCandidate] = useState<any>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const isFetchingRef = useRef(false);

  const fetchApplicants = async () => {
    if (!user?.id || isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/analytics/employer/${user.id}`);
      if (res.data && res.data.success) {
        setApplicants(res.data.data.applicants || []);
      } else {
        setError(res.data?.message || 'Failed to fetch applicants');
      }
    } catch (e: any) {
      console.error(e);
      setError(e?.response?.data?.message || e?.message || 'Failed to fetch applicants');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchApplicants();
    }
  }, [user?.id]);

  useEffect(() => {
    const handlePipelineUpdate = () => {
      fetchApplicants();
    };
    window.addEventListener('vega:pipeline-updated', handlePipelineUpdate);
    return () => {
      window.removeEventListener('vega:pipeline-updated', handlePipelineUpdate);
    };
  }, [user?.id]);

  // Search filtering
  const filteredApplicants = applicants.filter(app => {
    const q = searchQuery.toLowerCase();
    const fullName = (app.full_name || '').toLowerCase();
    const jobTitle = (app.job_title || '').toLowerCase();
    const email = (app.email || '').toLowerCase();
    let skillsStr = '';
    try {
      const skills = typeof app.skills_json === 'string' ? JSON.parse(app.skills_json) : (app.skills_json || []);
      skillsStr = skills.join(' ').toLowerCase();
    } catch (e) {}

    return fullName.includes(q) || jobTitle.includes(q) || email.includes(q) || skillsStr.includes(q);
  });

  // Reset page to 1 when search or page size changes
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  // Pagination Calculations
  const totalItems = filteredApplicants.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedApplicants = filteredApplicants.slice(startIndex, endIndex);

  // Trigger history modal open
  const handleOpenHistory = (cand: any) => {
    setHistoryCandidate(cand);
    setIsHistoryOpen(true);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredApplicants.length === 0) return;
    
    const headers = ['Candidate Name', 'Email', 'Target Role', 'Talent Score', 'Status', 'Applied At'];
    const rows = filteredApplicants.map(app => [
      `"${app.full_name}"`,
      `"${app.email}"`,
      `"${app.job_title || 'General Applicant'}"`,
      `"${Math.round(app.talent_score || 0)}%"`,
      `"${app.status || 'APPLIED'}"`,
      `"${new Date(app.applied_at).toLocaleDateString()}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `applicants_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="company-applicants-container">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">All Applicants</h1>
          <p className="text-slate-500 font-medium text-sm italic mt-1">Review and manage all candidates who applied to your job postings.</p>
        </div>
        <div className="flex gap-3 shrink-0">
          <button 
            onClick={handleExportCSV}
            disabled={filteredApplicants.length === 0}
            className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search by name, role, email, or skills..." 
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full bg-white border border-slate-100 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-600/20 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Table Container */}
      {loading ? (
        <div className="py-24 text-center text-slate-400 text-xs font-black uppercase tracking-widest flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          Loading company applicant list...
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-[30px] p-8 text-center my-6 space-y-4">
          <p className="text-sm font-bold text-rose-700">{error}</p>
          <button
            onClick={fetchApplicants}
            className="px-5 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-700 transition-all cursor-pointer shadow-sm"
          >
            Retry
          </button>
        </div>
      ) : filteredApplicants.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-[30px] p-12 text-center text-slate-400 my-6">
          <p className="text-sm font-bold uppercase tracking-wider">No applicants found for the selected scope.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <CandidateTable 
            applicants={paginatedApplicants} 
            onViewCandidate={setSelectedCandidate} 
            onOpenHistory={handleOpenHistory}
          />

          {/* Pagination Controls */}
          {filteredApplicants.length > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white border border-slate-100 rounded-[30px] p-6 shadow-sm">
              {/* Stats */}
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Showing <span className="text-slate-700 font-extrabold">{startIndex + 1}</span> to <span className="text-slate-700 font-extrabold">{endIndex}</span> of <span className="text-slate-800 font-black">{totalItems}</span> applicants
              </div>

              {/* Controls */}
              <div className="flex items-center gap-6">
                {/* Rows Per Page */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Rows per page</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-600/20 transition-all cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                {/* Page Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={safeCurrentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="px-4 py-2.5 bg-slate-50 border border-slate-150 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-slate-50 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer select-none"
                  >
                    Prev
                  </button>

                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const pageNum = idx + 1;
                    const isSelected = safeCurrentPage === pageNum;
                    
                    if (totalPages > 5 && Math.abs(pageNum - safeCurrentPage) > 1 && pageNum !== 1 && pageNum !== totalPages) {
                      if (pageNum === 2 || pageNum === totalPages - 1) {
                        return <span key={pageNum} className="text-slate-350 px-1 font-bold">...</span>;
                      }
                      return null;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-9 h-9 rounded-xl text-xs font-black uppercase transition-all select-none cursor-pointer flex items-center justify-center ${
                          isSelected 
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/15'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    disabled={safeCurrentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="px-4 py-2.5 bg-slate-50 border border-slate-150 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-slate-50 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer select-none"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Candidate Details Drawer / Modal */}
      <AnimatePresence>
        {selectedCandidate && (
          <CandidateDetailModal 
            candidate={selectedCandidate} 
            onClose={() => setSelectedCandidate(null)} 
          />
        )}
      </AnimatePresence>

      {/* Detailed Application History Modal */}
      <ApplicantHistoryModal 
        isOpen={isHistoryOpen}
        onClose={() => {
          setIsHistoryOpen(false);
          setHistoryCandidate(null);
        }}
        candidate={historyCandidate}
      />
    </div>
  );
}

