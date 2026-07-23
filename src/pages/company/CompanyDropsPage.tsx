import React, { useState, useEffect } from 'react';
import { 
  Zap, Plus, Eye, MessageSquare, Share2, Calendar, 
  CheckCircle, ArrowRight, X, Sparkles, AlertCircle, FileText, Globe
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../services/api.ts';

interface DropPost {
  id: number;
  title: string;
  type: string;
  description: string;
  status: string;
  views_count: number;
  comments_count: number;
  shares_count: number;
  created_at: string;
  job_id?: number | null;
  job_title?: string | null;
}

const DROP_TYPES = [
  { id: 'HIRING', label: 'Hiring Alert', desc: 'Promote active roles & career tracks', color: 'indigo' },
  { id: 'TECH', label: 'Tech Update', desc: 'Share code, engineering & architecture', color: 'sky' },
  { id: 'EVENT', label: 'Campus Meet', desc: 'Invite students to webinars & hackathons', color: 'purple' },
  { id: 'MILESTONE', label: 'Milestone', desc: 'Celebrate funding, launches & growth', color: 'emerald' }
];

export function CompanyDropsPage() {
  const [drops, setDrops] = useState<DropPost[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // New Drop Form State
  const [title, setTitle] = useState('');
  const [selectedType, setSelectedType] = useState('HIRING');
  const [description, setDescription] = useState('');
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDropsAndJobs();
  }, []);

  const fetchDropsAndJobs = async () => {
    setLoading(true);
    try {
      const [dropsRes, jobsRes] = await Promise.all([
        api.get('/jobs/drops/all'),
        api.get('/jobs')
      ]);

      if (dropsRes.data.success) {
        setDrops(dropsRes.data.data || []);
      }
      if (jobsRes.data.data) {
        setJobs(jobsRes.data.data || []);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load drops or active positions.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDrop = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Drop title is required.");
      return;
    }
    if (title.trim().length < 5) {
      toast.error("Title must be at least 5 characters.");
      return;
    }
    if (!description.trim()) {
      toast.error("Drop content description is required.");
      return;
    }
    if (description.trim().length < 20) {
      toast.error("Content must be at least 20 characters.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title: title.trim(),
        type: selectedType,
        description: description.trim(),
        jobId: selectedJobId ? parseInt(selectedJobId, 10) : null
      };

      const res = await api.post('/jobs/drops', payload);

      if (res.data.success) {
        toast.success("Update published as a talent Drop!");
        setTitle('');
        setDescription('');
        setSelectedJobId('');
        setSelectedType('HIRING');
        setIsModalOpen(false);
        fetchDropsAndJobs();
      } else {
        toast.error(res.data.message || "Failed to create Drop.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "An error occurred while publishing.");
    } finally {
      setSubmitting(false);
    }
  };

  // Compute Stats Totals
  const totalDrops = drops.length;
  const totalViews = drops.reduce((acc, curr) => acc + (curr.views_count || 0), 0);
  const totalEngagement = drops.reduce((acc, curr) => acc + (curr.comments_count || 0) + (curr.shares_count || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 font-sans p-8 md:p-12" id="company-drops-page">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1">
            <Zap size={12} className="animate-pulse" /> Growth & Promotion
          </span>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight mt-1">Company Drops</h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-wider mt-1">
            Post real-time alerts, campus milestones, or hot job highlights directly to candidates.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/10 hover:-translate-y-0.5 cursor-pointer"
          id="btn-post-new-drop"
        >
          <Plus size={16} strokeWidth={3} /> Post New Drop
        </button>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10" id="drops-stats-board">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
            <Zap size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Drops Posted</span>
            <h3 className="text-2xl font-black text-slate-800 mt-0.5">{totalDrops}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
            <Eye size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Views Generated</span>
            <h3 className="text-2xl font-black text-slate-800 mt-0.5">{totalViews}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center">
            <Share2 size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Engagement Points</span>
            <h3 className="text-2xl font-black text-slate-800 mt-0.5">{totalEngagement}</h3>
          </div>
        </div>
      </div>

      {/* Drops History Block */}
      <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm">
        <div className="border-b border-slate-100 pb-5 mb-6 flex justify-between items-center">
          <h3 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
            History of Published Drops <Calendar size={16} className="text-slate-400" />
          </h3>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm font-bold uppercase tracking-widest">
            Loading your Drops history...
          </div>
        ) : drops.length === 0 ? (
          <div className="py-24 text-center border-2 border-dashed border-slate-100 rounded-2xl">
            <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Zap size={36} />
            </div>
            <h4 className="text-lg font-black text-slate-700 uppercase tracking-tight">No Drops Published Yet</h4>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">
              Start broadcasting instant updates to attract premium candidates.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-6 px-6 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all cursor-pointer"
            >
              Publish your first update &rarr;
            </button>
          </div>
        ) : (
          <div className="space-y-4" id="drops-history-list">
            {drops.map((drop) => (
              <div 
                key={drop.id} 
                className="p-5 border border-slate-100 hover:border-indigo-100 bg-slate-50/20 hover:bg-slate-50/50 rounded-2xl transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider bg-indigo-550 border border-indigo-100 text-indigo-600 bg-indigo-50">
                      {drop.type}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider bg-emerald-50 border border-emerald-100 text-emerald-600">
                      {drop.status}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1 ml-1">
                      <Calendar size={12} /> {new Date(drop.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <h4 className="text-base font-black text-slate-800 uppercase tracking-tight truncate max-w-lg" title={drop.title}>
                    {drop.title}
                  </h4>
                  
                  <p className="text-xs text-slate-500 font-medium line-clamp-2 max-w-2xl leading-relaxed">
                    {drop.description}
                  </p>

                  {drop.job_title && (
                    <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-indigo-500 bg-indigo-50/50 px-2.5 py-1 rounded-md mt-1">
                      <FileText size={10} /> Linked Role: {drop.job_title}
                    </div>
                  )}
                </div>

                {/* Stats Container */}
                <div className="flex items-center gap-5 shrink-0 bg-white border border-slate-100 rounded-xl p-3 px-4 shadow-sm self-stretch md:self-auto justify-around">
                  <div className="text-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider mb-1 flex items-center gap-1 justify-center">
                      <Eye size={10} /> Views
                    </span>
                    <span className="text-sm font-black text-slate-700 block">{drop.views_count || 0}</span>
                  </div>
                  <div className="h-6 w-px bg-slate-100" />
                  <div className="text-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider mb-1 flex items-center gap-1 justify-center">
                      <MessageSquare size={10} /> Comments
                    </span>
                    <span className="text-sm font-black text-slate-700 block">{drop.comments_count || 0}</span>
                  </div>
                  <div className="h-6 w-px bg-slate-100" />
                  <div className="text-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider mb-1 flex items-center gap-1 justify-center">
                      <Share2 size={10} /> Shares
                    </span>
                    <span className="text-sm font-black text-slate-700 block">{drop.shares_count || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create New Drop Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200" id="create-drop-backdrop">
          <div 
            className="bg-white rounded-[32px] border border-slate-100 shadow-2xl max-w-2xl w-full max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            id="create-drop-content"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1">
                  <Sparkles size={12} className="animate-pulse" /> Instant Broadcast
                </span>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight mt-0.5">Post a New Drop</h2>
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mt-0.5">
                  Engage candidate pools with interactive, real-time alerts.
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer text-slate-400 hover:text-slate-600"
                id="close-create-drop-btn"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateDrop} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Drop Type - Visually Highlighted Selected Options */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Select Update Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="drop-types-selector-grid">
                  {DROP_TYPES.map(type => {
                    const isSelected = selectedType === type.id;
                    return (
                      <div
                        key={type.id}
                        onClick={() => setSelectedType(type.id)}
                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                          isSelected
                            ? 'bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-900/15'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                        id={`type-card-${type.id}`}
                      >
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center border mt-0.5 ${
                          isSelected ? 'border-indigo-400 bg-indigo-500 text-white' : 'border-slate-300'
                        }`}>
                          {isSelected && <CheckCircle size={12} className="text-white" />}
                        </div>
                        <div>
                          <h4 className={`text-xs font-black uppercase tracking-wide ${
                            isSelected ? 'text-white' : 'text-slate-800'
                          }`}>{type.label}</h4>
                          <p className={`text-[10px] font-medium leading-normal mt-0.5 ${
                            isSelected ? 'text-slate-300' : 'text-slate-500'
                          }`}>{type.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Drop Header Title
                </label>
                <input 
                  type="text"
                  placeholder="e.g. Pune campus recruitment drive scheduled for final-year grads"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-600/30 transition-all text-slate-700"
                />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block ml-1">
                  Make it catchy and descriptive. Min 5 characters.
                </span>
              </div>

              {/* Link to Job (Optional) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Link Active Position (Optional)
                </label>
                <div className="relative">
                  <select
                    value={selectedJobId}
                    onChange={e => setSelectedJobId(e.target.value)}
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-600/30 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">No position linked</option>
                    {jobs.filter(j => j.status !== 'CLOSED').map(job => (
                      <option key={job.id} value={job.id}>
                        {job.title} ({job.location || 'Remote'})
                      </option>
                    ))}
                  </select>
                </div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block ml-1">
                  Candidates will see a direct application button on the update.
                </span>
              </div>

              {/* Content Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Update Content & Body
                </label>
                <textarea
                  placeholder="Explain details of this drop. Highlight skills required, team, and instructions for how applicants can participate..."
                  rows={5}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-600/30 transition-all text-slate-700 min-h-[120px]"
                />
                <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  <span>Min 20 characters</span>
                  <span>{description.length} chars</span>
                </div>
              </div>

            </form>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={submitting}
                className="px-6 py-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all disabled:opacity-50 cursor-pointer"
                id="cancel-create-drop"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateDrop}
                disabled={submitting}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-500/10 cursor-pointer"
                id="submit-create-drop"
              >
                <Globe size={14} />
                {submitting ? "Publishing..." : "Broadcast Update"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
