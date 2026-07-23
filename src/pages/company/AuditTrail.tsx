import React, { useState, useEffect } from 'react';
import { 
  ScrollText, 
  Search, 
  Calendar, 
  User, 
  FileText, 
  Info, 
  Clock, 
  ShieldAlert, 
  X, 
  Filter,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

interface AuditLog {
  id: number;
  company_id: number;
  actor_user_id: number;
  actor_name: string;
  actor_role: string;
  action_type: string;
  module: string;
  description: string;
  target_type: string | null;
  target_id: number | null;
  metadata_json: string | null;
  created_at: string;
}

export function AuditTrail() {
  const { token, loading: authLoading, profile } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [selectedActionType, setSelectedActionType] = useState('ALL');
  const [error, setError] = useState<string | null>(null);

  // Selected Log for metadata detail inspection
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    if (!authLoading && token) {
      fetchLogs();
    } else if (!authLoading && !token) {
      setError("No authentication token found. Please log in.");
      setLoading(false);
    }
  }, [authLoading, token]);

  const fetchLogs = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/company/audit-trail', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.data.success) {
        setLogs(res.data.data || []);
      } else {
        setError(res.data.message || 'Failed to load audit logs.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error occurred while loading audit trails.');
    } finally {
      setLoading(false);
    }
  };

  // Get unique list of modules and action types for filters
  const modules = ['ALL', ...Array.from(new Set(logs.map(log => log.module)))];
  const actionTypes = ['ALL', ...Array.from(new Set(logs.map(log => log.action_type)))];

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.actor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.action_type && log.action_type.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesModule = selectedModule === 'ALL' || log.module === selectedModule;
    const matchesAction = selectedActionType === 'ALL' || log.action_type === selectedActionType;

    return matchesSearch && matchesModule && matchesAction;
  });

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'CREATE_SUB_HR':
        return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
      case 'DELETE_SUB_HR':
        return 'bg-rose-50 text-rose-600 border border-rose-100';
      case 'UPDATE_SUB_HR':
        return 'bg-blue-50 text-blue-600 border border-blue-100';
      case 'ASSIGN_JOB':
        return 'bg-blue-50 text-blue-600 border border-blue-100';
      case 'ASSIGN_CANDIDATE':
      case 'AUTO_DISTRIBUTE_CANDIDATES':
        return 'bg-purple-50 text-purple-600 border border-purple-100';
      default:
        return 'bg-slate-50 text-slate-600 border border-slate-100';
    }
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 bg-white rounded-3xl border border-slate-100 shadow-sm max-w-7xl mx-auto" id="audit-loading-spinner">
        <Loader2 className="text-blue-500 animate-spin" size={36} />
        <span className="text-slate-500 text-sm">Verifying session...</span>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-white rounded-3xl border border-slate-100 shadow-sm" id="audit-trail-viewport">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <ScrollText className="text-blue-600" size={32} />
            HR Audit Trail
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {profile?.isSubHr 
              ? "View your own recruitment operation logs, including candidate and stage changes."
              : "Analyze comprehensive company recruitment actions. Track activity records for all registered Sub HR accounts."}
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all duration-300 self-start sm:self-center shrink-0 cursor-pointer"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh Log
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-150 text-rose-700 p-4 rounded-2xl flex items-center gap-3" id="audit-error-alert">
          <ShieldAlert size={20} className="shrink-0 text-rose-600" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* FILTER CONTROLS */}
      <div className="bg-slate-50/50 border border-slate-150 rounded-3xl p-6 space-y-4">
        <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5 mb-2">
          <Filter size={14} />
          Search & Query Filters
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Keyword Search */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">Search keywords</label>
            <div className="flex items-center gap-2 bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl">
              <Search size={16} className="text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search description, recruiter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none text-slate-700 text-sm outline-none w-full placeholder-slate-400"
              />
            </div>
          </div>

          {/* Module Filter */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">Filter by system module</label>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-sm rounded-xl px-3.5 py-2.5 w-full outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {modules.map(mod => (
                <option key={mod} value={mod}>{mod === 'ALL' ? 'All Modules' : mod}</option>
              ))}
            </select>
          </div>

          {/* Action Type Filter */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">Filter by event action</label>
            <select
              value={selectedActionType}
              onChange={(e) => setSelectedActionType(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-sm rounded-xl px-3.5 py-2.5 w-full outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {actionTypes.map(act => (
                <option key={act} value={act}>{act === 'ALL' ? 'All Action Types' : act}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* AUDIT LOG LISTING */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3" id="audit-loading-spinner">
            <Loader2 className="text-blue-500 animate-spin" size={36} />
            <span className="text-slate-500 text-sm">Querying secure audit ledger...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-blue-200 m-6 rounded-2xl bg-blue-50/20" id="audit-empty-state">
            <ScrollText className="text-blue-500 mx-auto mb-3" size={40} />
            <h3 className="text-lg font-bold text-blue-600">No Activity Logs Found</h3>
            <p className="text-slate-500 text-sm max-w-sm mx-auto mt-1">
              There are no logged activity events matching your selected filters. Try broadening your keywords or selection.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="audit-trail-table">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-500 uppercase text-[10px] tracking-wider font-black">
                  <th className="py-4 px-6">Timestamp / Date</th>
                  <th className="py-4 px-6">Actor / Recruiter</th>
                  <th className="py-4 px-6">Action / Event</th>
                  <th className="py-4 px-6">Module</th>
                  <th className="py-4 px-6">Description</th>
                  <th className="py-4 px-6 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/40 transition-colors">
                    {/* Timestamp */}
                    <td className="py-4 px-6 text-slate-500 text-xs font-medium whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock size={13} className="text-slate-400" />
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </td>

                    {/* Actor */}
                    <td className="py-4 px-6 whitespace-nowrap font-semibold text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <User size={14} className="text-slate-400" />
                        <div>
                          <span>{log.actor_name}</span>
                          <span className="text-[10px] text-slate-400 block font-normal leading-none mt-0.5">{log.actor_role}</span>
                        </div>
                      </div>
                    </td>

                    {/* Action Type Badge */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${getActionBadgeColor(log.action_type)}`}>
                        {log.action_type || 'SYSTEM'}
                      </span>
                    </td>

                    {/* Module */}
                    <td className="py-4 px-6 text-slate-500 font-semibold text-xs whitespace-nowrap">
                      {log.module}
                    </td>

                    {/* Description */}
                    <td className="py-4 px-6 text-slate-600 max-w-sm truncate" title={log.description}>
                      {log.description}
                    </td>

                    {/* Details action button */}
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      {log.metadata_json ? (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="text-xs font-black text-blue-600 hover:text-blue-700 flex items-center gap-1 ml-auto bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                        >
                          <Info size={12} />
                          Inspect
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No details</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* METADATA INSPECT DETAILS MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[200]">
          <div className="bg-white border border-slate-100 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-white p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-blue-600 flex items-center gap-2">
                <FileText size={18} className="text-blue-600" />
                Inspect Log Payload Metadata
              </h3>
              <button 
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 bg-blue-50/20 border border-blue-100/50 p-4 rounded-2xl">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Actor Name</span>
                  <span className="text-sm font-semibold text-slate-800">{selectedLog.actor_name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Module</span>
                  <span className="text-sm font-semibold text-slate-800">{selectedLog.module}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Action Type</span>
                  <span className="text-sm font-semibold text-slate-800">{selectedLog.action_type}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Log ID</span>
                  <span className="text-sm font-semibold text-slate-800">#{selectedLog.id}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Detailed Description</span>
                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                  {selectedLog.description}
                </p>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Payload Metadata (JSON)</span>
                <pre className="text-xs font-mono text-blue-700 bg-blue-50/40 p-4 rounded-2xl overflow-x-auto max-h-[220px] custom-scrollbar border border-blue-100/50 shadow-inner">
                  {JSON.stringify(JSON.parse(selectedLog.metadata_json || '{}'), null, 2)}
                </pre>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all cursor-pointer shadow-sm shadow-blue-500/10"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
