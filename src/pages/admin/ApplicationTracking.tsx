import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  FileText, 
  Search, 
  Filter, 
  User, 
  Briefcase, 
  Building2,
  ChevronRight
} from 'lucide-react';
import api from '../../services/api';

export function ApplicationTracking() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const { data } = await api.get('/admin/applications');
      if (data.success) {
        setApplications(data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SELECTED': return 'bg-emerald-100 text-emerald-700';
      case 'REJECTED': return 'bg-red-100 text-red-700';
      case 'SHORTLISTED': return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const filtered = applications.filter(app => 
    app.student_name?.toLowerCase().includes(search.toLowerCase()) || 
    app.job_title?.toLowerCase().includes(search.toLowerCase()) ||
    app.company_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Application pipeline</h1>
          <p className="text-slate-500 font-medium">Platform-wide hiring lifecycle tracking.</p>
        </div>
        <div className="relative w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search student, job or company..." 
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
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Candidate</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Opportunity</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Applied On</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((app, idx) => (
              <motion.tr 
                key={app.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="group hover:bg-slate-50/50 transition-all border-b border-slate-50 last:border-0"
              >
                <td className="p-6">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                         <User size={16} />
                      </div>
                      <div>
                         <h4 className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase leading-tight">{app.student_name}</h4>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">ID: {app.student_id}</p>
                      </div>
                   </div>
                </td>
                <td className="p-6">
                   <div className="flex items-center gap-2">
                      <div className="space-y-0.5">
                         <div className="flex items-center gap-1.5">
                            <Briefcase size={12} className="text-slate-400" />
                            <h4 className="text-sm font-black text-slate-900 uppercase leading-none">{app.job_title}</h4>
                         </div>
                         <div className="flex items-center gap-1.5 opacity-60">
                            <Building2 size={10} className="text-slate-400" />
                            <p className="text-[10px] font-bold text-slate-500 uppercase leading-none">{app.company_name}</p>
                         </div>
                      </div>
                   </div>
                </td>
                <td className="p-6">
                   <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase ${getStatusColor(app.status)}`}>
                      {app.status}
                   </span>
                </td>
                <td className="p-6">
                  <p className="text-[10px] font-black text-slate-900 uppercase">
                    {new Date(app.applied_at).toLocaleDateString()}
                  </p>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
