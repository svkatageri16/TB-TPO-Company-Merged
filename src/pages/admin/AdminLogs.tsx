import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ShieldAlert, 
  Search, 
  Clock, 
  Terminal,
  Activity,
  Globe
} from 'lucide-react';
import api from '../../services/api';

export function AdminLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const { data } = await api.get('/admin/logs');
      if (data.success) {
        setLogs(data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Audit Logs</h1>
        <p className="text-slate-500 font-medium">Traceable history of all administrative actions.</p>
      </div>

      <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
           <div className="flex items-center gap-3">
              <Terminal size={18} className="text-blue-500" />
              <h3 className="text-xs font-black text-white uppercase tracking-widest">System Audit Trail</h3>
           </div>
           <button onClick={fetchLogs} className="text-[10px] font-black text-slate-500 hover:text-white transition-colors uppercase">Refresh Logs</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.01] border-b border-white/5">
                <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Admin</th>
                <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Action</th>
                <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Details</th>
                <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Origin</th>
                <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {logs.map((log, idx) => (
                <motion.tr 
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.01 }}
                  className="hover:bg-white/[0.02] transition-colors"
                >
                  <td className="p-5">
                    <p className="text-[11px] font-bold text-blue-400">{log.admin_email}</p>
                  </td>
                  <td className="p-5">
                    <span className="text-[10px] font-black px-2 py-0.5 bg-white/5 text-white rounded uppercase">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-5">
                    <p className="text-[10px] text-slate-400 truncate max-w-xs">{log.details}</p>
                  </td>
                  <td className="p-5">
                    <div className="flex items-center gap-2 text-slate-500">
                       <Globe size={10} />
                       <span className="text-[10px]">{log.ip_address || '127.0.0.1'}</span>
                    </div>
                  </td>
                  <td className="p-5">
                    <div className="flex items-center gap-2 text-slate-500">
                       <Clock size={10} />
                       <span className="text-[10px]">{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {logs.length === 0 && !loading && (
                <tr>
                   <td colSpan={5} className="p-20 text-center text-slate-600 font-bold uppercase tracking-widest text-xs">
                      No activity logs found in the system.
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
