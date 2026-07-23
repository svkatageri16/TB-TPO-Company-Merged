import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Briefcase, Info, ListChecks, MessageSquare, CheckCircle2, XCircle, ChevronRight, Award } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../services/api.ts';

interface ApplicantHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: any;
}

export function ApplicantHistoryModal({ isOpen, onClose, candidate }: ApplicantHistoryModalProps) {
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const studentId = candidate?.student_id || candidate?.id;

  useEffect(() => {
    if (isOpen && studentId) {
      fetchHistory();
    }
  }, [isOpen, studentId]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/jobs/company/applicants/${studentId}/history`);
      if (res.data.success) {
        setHistoryList(res.data.data || []);
      } else {
        toast.error(res.data.message || "Failed to load history.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "An error occurred while fetching candidate history.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !candidate) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200" id="candidate-history-modal-backdrop">
      <div 
        className="bg-white rounded-[40px] border border-slate-100 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        id="candidate-history-modal-content"
      >
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Recruitment Archive</span>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mt-0.5">
              Hiring History — {candidate.full_name}
            </h2>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mt-0.5">
              Email: {candidate.email} | ID: {studentId}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2.5 hover:bg-slate-200/60 rounded-full transition-all cursor-pointer text-slate-400 hover:text-slate-600 hover:rotate-90 duration-200"
            id="close-history-modal-btn"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {loading ? (
            <div className="py-20 text-center text-slate-400 text-xs font-black uppercase tracking-widest flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              Retrieving Company Application Archive...
            </div>
          ) : historyList.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[32px] p-10 bg-slate-50/20">
              <div className="w-16 h-16 bg-slate-50 text-slate-350 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-sm">
                <Briefcase size={28} />
              </div>
              <h4 className="text-base font-black text-slate-700 uppercase tracking-tight">No hiring records found</h4>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-2 max-w-sm mx-auto leading-relaxed">
                No previous hiring history found for this candidate with your company.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-4 bg-indigo-50/40 border border-indigo-100/50 rounded-2xl text-[11px] font-bold text-indigo-800 uppercase tracking-wide leading-relaxed">
                Notice: Below matches indicate the candidate's historical interaction and pipeline events <span className="text-indigo-600 font-extrabold">exclusively</span> for positions posted by your enterprise.
              </div>

              <div className="space-y-6" id="history-items-container">
                {historyList.map((app, index) => {
                  const isAppSelected = app.application_status === 'SELECTED';
                  const isAppRejected = app.application_status === 'REJECTED';
                  
                  return (
                    <div 
                      key={app.application_id} 
                      className="border border-slate-100 rounded-3xl bg-white hover:border-slate-200 transition-all p-6 shadow-sm space-y-6 relative overflow-hidden"
                    >
                      {/* Left Border Accent depending on status */}
                      <div className={`absolute left-0 top-0 bottom-0 w-2 ${
                        isAppSelected ? 'bg-emerald-500' : isAppRejected ? 'bg-red-500' : 'bg-blue-500'
                      }`} />

                      {/* Top Header Row */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pl-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                              Application #{app.application_id}
                            </span>
                            <span className="text-[10px] text-slate-450 font-bold flex items-center gap-1">
                              <Calendar size={12} /> Applied on {new Date(app.applied_at).toLocaleDateString()}
                            </span>
                          </div>
                          <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                            {app.job_title}
                          </h4>
                          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                            <MapPin size={10} /> {app.job_location || 'Remote'}
                          </p>
                        </div>

                        {/* Badges */}
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                            isAppSelected ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm' :
                            isAppRejected ? 'bg-red-50 text-red-650 border-red-100' :
                            'bg-blue-50 text-blue-600 border-blue-100'
                          }`}>
                            {app.application_status}
                          </span>
                        </div>
                      </div>

                      {/* Current Pipeline Stage reached */}
                      <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 pl-6 space-y-3">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                          <div>
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Pipeline Stage Reached</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-xs font-black text-slate-800 uppercase tracking-tight">
                                {app.current_stage_name || app.current_stage_type || 'Applied'}
                              </span>
                              {app.current_stage_type && (
                                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-slate-200 text-slate-500">
                                  {app.current_stage_type}
                                </span>
                              )}
                            </div>
                          </div>

                          <div>
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block sm:text-right">Last Updated</span>
                            <span className="text-xs font-bold text-slate-600 block sm:text-right mt-0.5">
                              {new Date(app.lastUpdated).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Selected / Rejected Details */}
                        {app.rejectionEvent && (
                          <div className="flex gap-2 bg-red-50/50 border border-red-100/50 p-3 rounded-xl">
                            <XCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                            <div className="text-[11px] leading-relaxed">
                              <p className="font-black text-red-800 uppercase">Rejected at Phase: {app.rejectionEvent.phase}</p>
                              {app.rejectionEvent.notes && (
                                <p className="text-red-650 font-medium mt-0.5 italic">“{app.rejectionEvent.notes}”</p>
                              )}
                            </div>
                          </div>
                        )}

                        {app.selectionEvent && (
                          <div className="flex gap-2 bg-emerald-50/50 border border-emerald-100/50 p-3 rounded-xl">
                            <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                            <div className="text-[11px] leading-relaxed">
                              <p className="font-black text-emerald-800 uppercase">Selected at Stage: {app.selectionEvent.phase}</p>
                              {app.selectionEvent.notes && (
                                <p className="text-emerald-650 font-medium mt-0.5 italic">“{app.selectionEvent.notes}”</p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* General Notes or Feedback */}
                        {app.latestNotes && !app.rejectionEvent && !app.selectionEvent && (
                          <div className="flex gap-2 bg-slate-100/55 p-3 rounded-xl border border-slate-200/50">
                            <Info size={14} className="text-slate-500 shrink-0 mt-0.5" />
                            <div className="text-[11px] leading-relaxed">
                              <p className="font-black text-slate-700 uppercase">HR Feedback / Timeline Note</p>
                              <p className="text-slate-600 font-medium mt-0.5 italic">“{app.latestNotes}”</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Assessment & Interview Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-2">
                        {/* Assessments / Test Submissions */}
                        <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/10">
                          <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5 mb-3">
                            <ListChecks size={12} className="text-indigo-600" /> Assessment Performance
                          </h5>
                          {app.testSubmissions.length === 0 ? (
                            <p className="text-[10px] font-bold text-slate-400 uppercase italic">No assessments submitted</p>
                          ) : (
                            <div className="space-y-2">
                              {app.testSubmissions.map((sub: any, i: number) => (
                                <div key={i} className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-100">
                                  <div>
                                    <span className="text-[10px] font-black text-slate-700 block">Score: {Math.round(sub.score)}%</span>
                                    <span className="text-[8px] font-bold text-slate-400 block uppercase">
                                      {sub.is_auto_submitted ? 'Auto-Submitted' : 'Hand-In'} • {new Date(sub.submitted_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                  {sub.violation_count > 0 ? (
                                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-rose-50 border border-rose-100 text-rose-600 uppercase">
                                      {sub.violation_count} Violations
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-emerald-50 border border-emerald-100 text-emerald-600 uppercase">
                                      Violations Clean
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Interviews */}
                        <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/10">
                          <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5 mb-3">
                            <MessageSquare size={12} className="text-indigo-600" /> Interview Log
                          </h5>
                          {app.interviews.length === 0 ? (
                            <p className="text-[10px] font-bold text-slate-400 uppercase italic">No interviews conducted</p>
                          ) : (
                            <div className="space-y-2">
                              {app.interviews.map((int: any, i: number) => (
                                <div key={i} className="bg-white p-2 rounded-xl border border-slate-100 space-y-1.5">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-slate-700 uppercase">
                                      {int.interview_type} Round
                                    </span>
                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                                      int.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' :
                                      int.status === 'CANCELLED' ? 'bg-red-50 text-red-600' :
                                      'bg-orange-50 text-orange-605'
                                    }`}>
                                      {int.status}
                                    </span>
                                  </div>
                                  {int.rating !== null && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-[8px] font-bold uppercase text-slate-400">Score:</span>
                                      <span className="text-[10px] font-black text-slate-700">{int.rating}/10</span>
                                    </div>
                                  )}
                                  {int.feedback && (
                                    <p className="text-[9px] text-slate-500 font-medium italic border-t border-slate-50 pt-1">
                                      “{int.feedback}”
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 bg-slate-900 hover:bg-slate-850 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all cursor-pointer shadow-md"
            id="history-close-footer-btn"
          >
            Close History
          </button>
        </div>
      </div>
    </div>
  );
}
