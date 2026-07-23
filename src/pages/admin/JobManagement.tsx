import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Briefcase, 
  Search, 
  Trash2, 
  Building2, 
  Clock, 
  MapPin,
  Eye,
  AlertOctagon
} from 'lucide-react';
import api from '../../services/api';

export function JobManagement() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const { data } = await api.get('/admin/jobs');
      if (data.success) {
        setJobs(data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (jobId: number) => {
    if (!confirm("Are you sure you want to remove this job posting? This action is permanent and will delete all associated applications.")) return;

    try {
      const { data } = await api.delete(`/admin/jobs/${jobId}`);
      if (data.success) {
        setJobs(jobs.filter(j => j.id !== jobId));
      }
    } catch (error) {
      alert("Failed to delete job");
    }
  };

  const filtered = jobs.filter(j => 
    j.title?.toLowerCase().includes(search.toLowerCase()) || 
    j.company_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Global Job Postings</h1>
          <p className="text-slate-500 font-medium">Monitor active career opportunities across all companies.</p>
        </div>
        <div className="relative w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search jobs or companies..." 
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
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Position & Company</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type / Location</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Deadline</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((job, idx) => {
              const isExpired = job.deadline ? new Date(job.deadline) < new Date() : false;
              return (
                <motion.tr 
                  key={job.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group hover:bg-slate-50/50 transition-all"
                >
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                        <Building2 size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 uppercase leading-tight group-hover:text-blue-600 transition-colors">
                          {job.title}
                        </h4>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{job.company_name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                     <div className="space-y-0.5">
                        <p className="text-[10px] font-black text-slate-900 uppercase">{job.job_type || 'Full-time'}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                           <MapPin size={10} /> {job.location || 'Remote'}
                        </p>
                     </div>
                  </td>
                  <td className="p-6">
                    <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase ${isExpired ? 'text-red-500' : 'text-slate-900'}`}>
                       <Clock size={12} />
                       {job.deadline ? new Date(job.deadline).toLocaleDateString() : 'No Limit'}
                       {isExpired && <span className="ml-1 px-1 bg-red-100 rounded text-[7px] tracking-widest">EXPIRED</span>}
                    </div>
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                          <Eye size={18} />
                       </button>
                       <button 
                          onClick={() => handleDelete(job.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                       >
                          <Trash2 size={18} />
                       </button>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
            {filtered.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="p-20 text-center">
                   <div className="flex flex-col items-center gap-4 opacity-40">
                      <AlertOctagon size={48} />
                      <p className="text-sm font-black uppercase tracking-widest">No Job Postings Found</p>
                   </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
