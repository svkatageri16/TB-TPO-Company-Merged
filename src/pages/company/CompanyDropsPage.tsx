import React, { useState, useEffect } from 'react';
import { 
  Zap, Plus, Eye, MessageSquare, Share2, Calendar, 
  CheckCircle, X, Sparkles, AlertCircle, FileText, Globe,
  Image as ImageIcon, Edit2, Trash2, Heart, Upload, ShieldCheck
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../services/api.ts';

interface UploadedMediaItem {
  mediaId: number;
  mediaUrl: string;
  fileName: string;
  moderationStatus: string;
}

interface DropPost {
  id: number;
  title: string;
  type: string;
  custom_label?: string | null;
  description: string;
  status: string;
  views_count: number;
  likes_count?: number;
  comments_count: number;
  shares_count: number;
  created_at: string;
  job_id?: number | null;
  job_title?: string | null;
  image_url?: string | null;
  images?: string[];
  mediaItems?: Array<{ id: number; url: string; fileName?: string; moderationStatus?: string }>;
}

const DROP_TYPES = [
  { id: 'HIRING_ALERT', label: 'Hiring Alert', desc: 'Promote active roles & career tracks', color: 'indigo' },
  { id: 'TECH_UPDATE', label: 'Tech Update', desc: 'Share code, engineering & architecture', color: 'sky' },
  { id: 'CAMPUS_MEET', label: 'Campus Meet', desc: 'Invite students to webinars & hackathons', color: 'purple' },
  { id: 'MILESTONE', label: 'Milestone', desc: 'Celebrate funding, launches & growth', color: 'emerald' },
  { id: 'EVENT', label: 'Events', desc: 'Promote upcoming events, workshops and company sessions', color: 'amber' },
  { id: 'BLOG', label: 'Blogs', desc: 'Share professional insights, articles and thought leadership', color: 'rose' },
  { id: 'CUSTOM', label: 'Custom Drop', desc: 'Create a flexible update for any approved company announcement', color: 'slate' }
];

export function CompanyDropsPage() {
  const [drops, setDrops] = useState<DropPost[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewingDrop, setViewingDrop] = useState<DropPost | null>(null);
  const [editingDrop, setEditingDrop] = useState<DropPost | null>(null);
  const [deletingDropId, setDeletingDropId] = useState<number | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [selectedType, setSelectedType] = useState('HIRING_ALERT');
  const [customLabel, setCustomLabel] = useState('');
  const [description, setDescription] = useState('');
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [uploadedImages, setUploadedImages] = useState<UploadedMediaItem[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (uploadedImages.length + files.length > 4) {
      toast.error("Maximum 4 images allowed per drop.");
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!validTypes.includes(file.type)) {
        toast.error(`Invalid format: ${file.name}. Only JPEG, PNG and WebP are allowed.`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`File too large: ${file.name}. Max limit is 5MB.`);
        continue;
      }

      try {
        setUploadingImage(true);
        const formData = new FormData();
        formData.append("image", file);

        const uploadRes = await api.post("/jobs/drops/upload-image", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });

        const rawData = uploadRes.data || {};
        const returnedMediaId = rawData.mediaId || rawData.data?.mediaId;
        const validMediaId = Number(returnedMediaId);

        if (rawData.success && Number.isInteger(validMediaId) && validMediaId > 0) {
          const localPreviewUrl = URL.createObjectURL(file);
          const newItem: UploadedMediaItem = {
            mediaId: validMediaId,
            mediaUrl: localPreviewUrl,
            fileName: rawData.fileName || rawData.data?.fileName || file.name,
            moderationStatus: rawData.moderationStatus || rawData.data?.moderationStatus || "APPROVED"
          };
          setUploadedImages(prev => [...prev, newItem]);
          toast.success(`Uploaded and verified ${file.name}`);
        } else {
          toast.error(rawData.message || `Failed to upload ${file.name}`);
        }
      } catch (err: any) {
        console.error("Image upload error:", err);
        toast.error(err.response?.data?.message || `Failed to upload and moderate ${file.name}`);
      } finally {
        setUploadingImage(false);
      }
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => {
      const item = prev[index];
      if (item && item.mediaUrl && item.mediaUrl.startsWith('blob:')) {
        try { URL.revokeObjectURL(item.mediaUrl); } catch (e) {}
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const clearUploadedImages = () => {
    uploadedImages.forEach(item => {
      if (item && item.mediaUrl && item.mediaUrl.startsWith('blob:')) {
        try { URL.revokeObjectURL(item.mediaUrl); } catch (e) {}
      }
    });
    setUploadedImages([]);
  };

  const openCreateModal = () => {
    setTitle('');
    setSelectedType('HIRING_ALERT');
    setCustomLabel('');
    setDescription('');
    setSelectedJobId('');
    clearUploadedImages();
    setEditingDrop(null);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (drop: DropPost) => {
    setEditingDrop(drop);
    setTitle(drop.title);
    setSelectedType(drop.type.toUpperCase());
    setCustomLabel(drop.custom_label || '');
    setDescription(drop.description);
    setSelectedJobId(drop.job_id ? String(drop.job_id) : '');
    
    if (drop.mediaItems && Array.isArray(drop.mediaItems) && drop.mediaItems.length > 0) {
      setUploadedImages(drop.mediaItems.map((m: any) => ({
        mediaId: Number(m.id || m.mediaId),
        mediaUrl: m.url || m.mediaUrl || `/api/jobs/drops/media/${m.id || m.mediaId}`,
        fileName: m.fileName || '',
        moderationStatus: m.moderationStatus || 'APPROVED'
      })));
    } else if (drop.images && Array.isArray(drop.images)) {
      const extracted: UploadedMediaItem[] = [];
      for (const img of drop.images) {
        if (typeof img === 'string') {
          const match = img.match(/\/drops\/media\/(\d+)/);
          if (match) {
            const mId = parseInt(match[1], 10);
            extracted.push({
              mediaId: mId,
              mediaUrl: img,
              fileName: '',
              moderationStatus: 'APPROVED'
            });
          }
        }
      }
      setUploadedImages(extracted);
    } else {
      setUploadedImages([]);
    }
    setIsCreateModalOpen(true);
  };

  const handleSubmitDrop = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Drop title is required.");
      return;
    }
    if (title.trim().length < 5) {
      toast.error("Title must be at least 5 characters.");
      return;
    }
    if (selectedType === 'CUSTOM') {
      if (!customLabel.trim()) {
        toast.error("Custom label is required when Custom Drop is selected.");
        return;
      }
      if (customLabel.trim().length > 50) {
        toast.error("Custom label must be 50 characters or less.");
        return;
      }
    }
    if (!description.trim()) {
      toast.error("Drop content description is required.");
      return;
    }
    if (description.trim().length < 20) {
      toast.error("Content must be at least 20 characters.");
      return;
    }

    if (uploadingImage) {
      toast.error("Please wait for all images to finish uploading.");
      return;
    }

    try {
      setSubmitting(true);
      const validMediaIds = uploadedImages
        .map(item => Number(item.mediaId))
        .filter(id => Number.isInteger(id) && id > 0);
      const uniqueMediaIds = Array.from(new Set(validMediaIds));

      const payload = {
        title: title.trim(),
        type: selectedType,
        customLabel: selectedType === 'CUSTOM' ? customLabel.trim() : null,
        description: description.trim(),
        jobId: selectedJobId ? parseInt(selectedJobId, 10) : null,
        mediaIds: uniqueMediaIds
      };

      let res;
      if (editingDrop) {
        res = await api.patch(`/jobs/drops/${editingDrop.id}`, payload);
      } else {
        res = await api.post('/jobs/drops', payload);
      }

      if (res.data.success) {
        toast.success(editingDrop ? "Company Drop updated!" : "Update published with AI moderation!");
        setIsCreateModalOpen(false);
        setEditingDrop(null);
        fetchDropsAndJobs();
      } else {
        toast.error(res.data.message || "Failed to save Drop.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "An error occurred while saving.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDrop = async (dropId: number) => {
    try {
      const res = await api.delete(`/jobs/drops/${dropId}`);
      if (res.data.success) {
        toast.success("Drop deleted successfully.");
        setDeletingDropId(null);
        fetchDropsAndJobs();
      } else {
        toast.error(res.data.message || "Failed to delete drop.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "An error occurred while deleting.");
    }
  };

  // Compute Stats Totals
  const totalDrops = drops.length;
  const totalViews = drops.reduce((acc, curr) => acc + (curr.views_count || 0), 0);
  const totalEngagement = drops.reduce((acc, curr) => acc + (curr.likes_count || 0) + (curr.comments_count || 0) + (curr.shares_count || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 font-sans p-4 sm:p-6 md:p-8 w-full max-w-none" id="company-drops-page">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1">
            <Zap size={12} className="animate-pulse" /> Growth & Promotion
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight mt-0.5">Company Drops</h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-wider mt-0.5">
            Post real-time alerts, campus milestones, or hot job highlights directly to candidates.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/10 hover:-translate-y-0.5 cursor-pointer shrink-0"
          id="btn-post-new-drop"
        >
          <Plus size={16} strokeWidth={3} /> Post New Drop
        </button>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6" id="drops-stats-board">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
            <Zap size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Drops Posted</span>
            <h3 className="text-2xl font-black text-slate-800 mt-0.5">{totalDrops}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
            <Eye size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Views Generated</span>
            <h3 className="text-2xl font-black text-slate-800 mt-0.5">{totalViews}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center shrink-0">
            <Share2 size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Interactions</span>
            <h3 className="text-2xl font-black text-slate-800 mt-0.5">{totalEngagement}</h3>
          </div>
        </div>
      </div>

      {/* Drops History Block */}
      <div className="bg-white border border-slate-100 rounded-[28px] p-5 sm:p-6 shadow-sm">
        <div className="border-b border-slate-100 pb-4 mb-5 flex justify-between items-center">
          <h3 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
            History of Published Drops <Calendar size={16} className="text-slate-400" />
          </h3>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm font-bold uppercase tracking-widest">
            Loading your Drops history...
          </div>
        ) : drops.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-2xl">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Zap size={32} />
            </div>
            <h4 className="text-base font-black text-slate-700 uppercase tracking-tight">No Drops Published Yet</h4>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
              Start broadcasting instant updates to attract premium candidates.
            </p>
            <button
              onClick={openCreateModal}
              className="mt-5 px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all cursor-pointer"
            >
              Publish your first update &rarr;
            </button>
          </div>
        ) : (
          <div className="space-y-4" id="drops-history-list">
            {drops.map((drop) => {
              const imagesList = drop.images || (drop.image_url ? [drop.image_url] : []);
              return (
                <div 
                  key={drop.id} 
                  className="p-5 border border-slate-100 hover:border-indigo-100 bg-slate-50/20 hover:bg-slate-50/50 rounded-2xl transition-all flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4"
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-indigo-50 border border-indigo-100 text-indigo-600">
                        {drop.custom_label ? `CUSTOM: ${drop.custom_label}` : drop.type}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-50 border border-emerald-100 text-emerald-600">
                        {drop.status}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1 ml-1">
                        <Calendar size={12} /> {new Date(drop.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <h4 className="text-base font-black text-slate-800 uppercase tracking-tight truncate max-w-xl" title={drop.title}>
                      {drop.title}
                    </h4>
                    
                    <p className="text-xs text-slate-500 font-medium line-clamp-2 max-w-2xl leading-relaxed">
                      {drop.description}
                    </p>

                    {imagesList.length > 0 && (
                      <div className="flex items-center gap-2 pt-1">
                        {imagesList.slice(0, 3).map((img, idx) => (
                          <img 
                            key={idx} 
                            src={img} 
                            alt="Attachment" 
                            className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                          />
                        ))}
                        {imagesList.length > 3 && (
                          <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-500">
                            +{imagesList.length - 3}
                          </div>
                        )}
                      </div>
                    )}

                    {drop.job_title && (
                      <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-indigo-500 bg-indigo-50/50 px-2.5 py-1 rounded-md mt-1">
                        <FileText size={10} /> Linked Role: {drop.job_title}
                      </div>
                    )}
                  </div>

                  {/* Stats and Actions Container */}
                  <div className="flex flex-wrap items-center gap-4 shrink-0 self-stretch lg:self-auto justify-between lg:justify-end">
                    <div className="flex items-center gap-4 bg-white border border-slate-100 rounded-xl p-2.5 px-4 shadow-sm">
                      <div className="text-center">
                        <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider mb-0.5 flex items-center gap-1 justify-center">
                          <Eye size={10} /> Views
                        </span>
                        <span className="text-xs font-black text-slate-700 block">{drop.views_count || 0}</span>
                      </div>
                      <div className="h-5 w-px bg-slate-100" />
                      <div className="text-center">
                        <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider mb-0.5 flex items-center gap-1 justify-center">
                          <Heart size={10} /> Likes
                        </span>
                        <span className="text-xs font-black text-slate-700 block">{drop.likes_count || 0}</span>
                      </div>
                      <div className="h-5 w-px bg-slate-100" />
                      <div className="text-center">
                        <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider mb-0.5 flex items-center gap-1 justify-center">
                          <MessageSquare size={10} /> Comments
                        </span>
                        <span className="text-xs font-black text-slate-700 block">{drop.comments_count || 0}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setViewingDrop(drop)}
                        className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer"
                        title="View Drop Details"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => openEditModal(drop)}
                        className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all cursor-pointer"
                        title="Edit Drop"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setDeletingDropId(drop.id)}
                        className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                        title="Delete Drop"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Drop Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200" id="create-drop-backdrop">
          <div 
            className="bg-white rounded-[28px] border border-slate-100 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            id="create-drop-content"
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1">
                  <Sparkles size={12} className="animate-pulse" /> Instant Broadcast
                </span>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight mt-0.5">
                  {editingDrop ? "Edit Drop Post" : "Post a New Drop"}
                </h2>
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mt-0.5">
                  Engage candidate pools with interactive, real-time alerts.
                </p>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer text-slate-400 hover:text-slate-600"
                id="close-create-drop-btn"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitDrop} className="flex-1 overflow-y-auto p-5 space-y-5">
              
              {/* Drop Type Selection */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Select Update Category
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5" id="drop-types-selector-grid">
                  {DROP_TYPES.map(type => {
                    const isSelected = selectedType === type.id;
                    return (
                      <div
                        key={type.id}
                        onClick={() => setSelectedType(type.id)}
                        className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-2.5 ${
                          isSelected
                            ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                        id={`type-card-${type.id}`}
                      >
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center border mt-0.5 shrink-0 ${
                          isSelected ? 'border-indigo-400 bg-indigo-500 text-white' : 'border-slate-300'
                        }`}>
                          {isSelected && <CheckCircle size={10} className="text-white" />}
                        </div>
                        <div>
                          <h4 className={`text-xs font-black uppercase tracking-wide ${
                            isSelected ? 'text-white' : 'text-slate-800'
                          }`}>{type.label}</h4>
                          <p className={`text-[9px] font-medium leading-tight mt-0.5 ${
                            isSelected ? 'text-slate-300' : 'text-slate-500'
                          }`}>{type.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom Label Input (When Custom Drop is selected) */}
              {selectedType === 'CUSTOM' && (
                <div className="space-y-1.5 animate-in fade-in duration-150">
                  <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block">
                    Custom Category Label <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. CSR Leadership, Annual Hackathon, Product Launch"
                    maxLength={50}
                    value={customLabel}
                    onChange={e => setCustomLabel(e.target.value)}
                    className="w-full bg-slate-50/50 border border-indigo-200 rounded-xl px-4 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                  />
                  <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider px-1">
                    <span>Required for Custom Drop</span>
                    <span>{customLabel.length}/50 chars</span>
                  </div>
                </div>
              )}

              {/* Title */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Drop Header Title
                </label>
                <input 
                  type="text"
                  placeholder="e.g. Pune campus recruitment drive scheduled for final-year grads"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600/30 transition-all text-slate-700"
                />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block ml-1">
                  Make it catchy and descriptive. Min 5 characters.
                </span>
              </div>

              {/* Link to Job (Optional) */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Link Active Position (Optional)
                </label>
                <select
                  value={selectedJobId}
                  onChange={e => setSelectedJobId(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600/30 transition-all appearance-none cursor-pointer"
                >
                  <option value="">No position linked</option>
                  {jobs.filter(j => j.status !== 'CLOSED').map(job => (
                    <option key={job.id} value={job.id}>
                      {job.title} ({job.location || 'Remote'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Content Description */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Update Content & Body
                </label>
                <textarea
                  placeholder="Explain details of this drop. Highlight skills required, team, and instructions for how applicants can participate..."
                  rows={4}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600/30 transition-all text-slate-700 min-h-[100px]"
                />
                <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  <span>Min 20 characters</span>
                  <span>{description.length} chars</span>
                </div>
              </div>

              {/* Company Image Upload with AI Moderation Notice */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <ImageIcon size={12} /> Attach Image(s) (Optional - Max 4)
                  </label>
                  <span className="text-[9px] font-bold text-indigo-600 flex items-center gap-1">
                    <ShieldCheck size={11} /> Multimodal AI Safety Moderated
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {uploadedImages.map((imgItem, idx) => (
                    <div key={imgItem.mediaId || idx} className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-100">
                      <img src={imgItem.mediaUrl} alt={imgItem.fileName || "Drop media"} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 bg-slate-900/80 text-white rounded-full p-1 hover:bg-rose-600 transition-colors cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}

                  {uploadedImages.length < 4 && (
                    <label className="border-2 border-dashed border-slate-200 hover:border-indigo-300 bg-slate-50/50 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-colors aspect-video text-center">
                      <Upload size={18} className="text-slate-400 mb-1" />
                      <span className="text-[9px] font-bold uppercase text-slate-500">Upload Image</span>
                      <span className="text-[8px] text-slate-400 mt-0.5">JPEG, PNG, WebP &lt; 5MB</span>
                      <input 
                        type="file" 
                        accept="image/jpeg,image/png,image/webp" 
                        multiple 
                        onChange={handleImageUpload} 
                        className="hidden" 
                      />
                    </label>
                  )}
                </div>
              </div>

            </form>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={submitting}
                className="px-5 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all disabled:opacity-50 cursor-pointer"
                id="cancel-create-drop"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitDrop}
                disabled={submitting || uploadingImage}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all disabled:opacity-50 flex items-center gap-2 shadow-md shadow-indigo-500/10 cursor-pointer"
                id="submit-create-drop"
              >
                <Globe size={14} />
                {submitting ? "Moderating & Publishing..." : (editingDrop ? "Save Changes" : "Broadcast Update")}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* View Drop Detail Modal */}
      {viewingDrop && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-[28px] border border-slate-100 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md">
                  {viewingDrop.custom_label ? `CUSTOM: ${viewingDrop.custom_label}` : viewingDrop.type}
                </span>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mt-1">
                  {viewingDrop.title}
                </h3>
              </div>
              <button 
                onClick={() => setViewingDrop(null)}
                className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {viewingDrop.description}
              </p>

              {viewingDrop.images && viewingDrop.images.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {viewingDrop.images.map((img, idx) => (
                    <img key={idx} src={img} alt="Drop detail" className="w-full rounded-xl border border-slate-200 object-cover max-h-56" />
                  ))}
                </div>
              )}

              {viewingDrop.job_title && (
                <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl flex items-center gap-2 text-xs font-bold text-indigo-700">
                  <FileText size={14} /> Linked Role: {viewingDrop.job_title}
                </div>
              )}

              <div className="flex items-center gap-6 pt-3 border-t border-slate-100 text-xs font-bold text-slate-500">
                <span className="flex items-center gap-1.5"><Eye size={14} /> {viewingDrop.views_count} views</span>
                <span className="flex items-center gap-1.5"><Heart size={14} /> {viewingDrop.likes_count || 0} likes</span>
                <span className="flex items-center gap-1.5"><MessageSquare size={14} /> {viewingDrop.comments_count} comments</span>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setViewingDrop(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs uppercase cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingDropId !== null && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-100 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertCircle size={24} />
              <h3 className="text-base font-black uppercase">Confirm Drop Deletion</h3>
            </div>
            <p className="text-xs text-slate-600 font-medium">
              Are you sure you want to delete this drop? It will be permanently removed from candidate feeds and history.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeletingDropId(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteDrop(deletingDropId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs cursor-pointer"
              >
                Delete Drop
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
