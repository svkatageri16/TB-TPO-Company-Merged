import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Building2, 
  Users, 
  Mail, 
  Phone, 
  Trash2, 
  ExternalLink, 
  ShieldCheck, 
  ArrowRight, 
  Upload, 
  FileSpreadsheet, 
  AlertCircle,
  GraduationCap,
  Layers,
  ChevronDown,
  ChevronRight,
  Search,
  CheckCircle,
  Settings,
  Database,
  History,
  Activity,
  UserCheck,
  Edit2,
  FileText
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

export default function TPOManagement() {
  // Global View tabs
  const [activeTab, setActiveTab] = useState<'tree' | 'colleges' | 'tpos' | 'batches' | 'onboard' | 'logs'>('tree');
  
  // Data lists
  const [colleges, setColleges] = useState<any[]>([]);
  const [tpos, setTpos] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [treeData, setTreeData] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({
    totalColleges: 0,
    totalTPOs: 0,
    totalBatches: 0,
    totalStudents: 0,
    totalPlaced: 0,
    overallPlacementRate: '0.0'
  });

  // UI state managers
  const [loading, setLoading] = useState(true);
  const [expandedColleges, setExpandedColleges] = useState<Record<number, boolean>>({});
  const [expandedBatches, setExpandedBatches] = useState<Record<number, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Modals visibility
  const [showCollegeModal, setShowCollegeModal] = useState(false);
  const [showTpoModal, setShowTpoModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);

  // Edit contexts
  const [editingCollege, setEditingCollege] = useState<any | null>(null);
  const [editingTpo, setEditingTpo] = useState<any | null>(null);
  const [editingBatch, setEditingBatch] = useState<any | null>(null);

  // Forms state
  const [collegeForm, setCollegeForm] = useState({
    college_name: '',
    college_code: '',
    university: '',
    address: '',
    district: '',
    state: '',
    country: 'India',
    website: '',
    contact_number: '',
    official_email: '',
    principal_name: '',
    placement_head: '',
    status: 'ACTIVE'
  });

  const [tpoForm, setTpoForm] = useState({
    email: '',
    full_name: '',
    contact_number: '',
    designation: '',
    employee_id: '',
    college_ids: [] as number[],
    status: 'ACTIVE'
  });

  const [batchForm, setBatchForm] = useState({
    college_id: '',
    batch_name: '',
    department: '',
    academic_year: '',
    semester: '',
    assigned_tpo_id: '',
    status: 'ACTIVE'
  });

  // Bulk student onboarding form
  const [bulkCollegeId, setBulkCollegeId] = useState('');
  const [bulkBatchId, setBulkBatchId] = useState('');
  const [studentsText, setStudentsText] = useState('');
  const [parsedStudents, setParsedStudents] = useState<{ name: string; email: string }[]>([]);
  const [onboardingInProgress, setOnboardingInProgress] = useState(false);

  // Suggestions state (fuzzy institutional parser)
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Selected batch for students view / manual additions
  const [selectedBatchForStudents, setSelectedBatchForStudents] = useState<any | null>(null);
  const [batchStudents, setBatchStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [manualStudentForm, setManualStudentForm] = useState({ name: '', email: '' });
  const [savingManualStudent, setSavingManualStudent] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [collegesRes, tposRes, batchesRes, treeRes, analyticsRes, logsRes] = await Promise.all([
        api.get('/admin/colleges'),
        api.get('/admin/tpos'),
        api.get('/admin/batches'),
        api.get('/admin/college-tree'),
        api.get('/admin/college-analytics'),
        api.get('/admin/audit-logs')
      ]);

      if (collegesRes.data.success) setColleges(collegesRes.data.data);
      if (tposRes.data.success) setTpos(tposRes.data.data);
      if (batchesRes.data.success) setBatches(batchesRes.data.data);
      if (treeRes.data.success) setTreeData(treeRes.data.data);
      if (analyticsRes.data.success) setAnalytics(analyticsRes.data.data);
      if (logsRes.data.success) setAuditLogs(logsRes.data.data);
    } catch (error) {
      console.error('Error fetching CMS details:', error);
      toast.error('Could not fetch College Management System data');
    } finally {
      setLoading(false);
    }
  };

  // Parser helper function for students text / CSV
  const parseStudentsFromRawText = (text: string) => {
    const lines = text.split('\n');
    const list: { name: string; email: string }[] = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      // Split by comma, tab, or semicolon
      const parts = line.split(/[,\t;]+/);
      if (parts.length >= 2) {
        const emailIndex = parts.findIndex(part => part.includes('@'));
        if (emailIndex !== -1) {
          const email = parts[emailIndex].trim();
          const nameParts = parts.filter((_, idx) => idx !== emailIndex);
          const name = nameParts.join(' ').replace(/["']/g, '').trim();
          if (name && email) {
            list.push({ name, email });
          }
        } else {
          const name = parts[0].replace(/["']/g, '').trim();
          const email = parts[1].trim();
          if (name && email.includes('@')) {
            list.push({ name, email });
          }
        }
      } else if (parts.length === 1 && parts[0].includes('@')) {
        const email = parts[0].trim();
        const deducedName = email.split('@')[0].split(/[._+-]+/).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
        list.push({ name: deducedName, email });
      }
    }
    return list;
  };

  const handleStudentsTextChange = (text: string) => {
    setStudentsText(text);
    const parsed = parseStudentsFromRawText(text);
    setParsedStudents(parsed);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      handleStudentsTextChange(text);
      toast.success(`Successfully parsed ${parseStudentsFromRawText(text).length} students from roster file.`);
    };
    reader.readAsText(file);
  };

  // Fuzzy Institution Auto-Parser Suggestions
  const handleCollegeNameChange = (val: string) => {
    setCollegeForm({ ...collegeForm, college_name: val });
    if (!val) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const keywords = ['wit', 'orchid', 'bmit', 'iit', 'nit', 'vit', 'coep', 'walchand', 'mit'];
    const matches = keywords.filter(k => k.includes(val.toLowerCase()));
    
    const suggestedNames: string[] = [];
    if (val.toLowerCase().includes('wit') || val.toLowerCase().includes('walchand')) {
      suggestedNames.push('WIT Solapur (Walchand Institute of Technology)');
    }
    if (val.toLowerCase().includes('orchid')) {
      suggestedNames.push('Orchid College of Engineering & Technology, Solapur');
    }
    if (val.toLowerCase().includes('bmit')) {
      suggestedNames.push('BMIT (Brahmdevdada Mane Institute of Technology), Solapur');
    }
    if (val.toLowerCase().includes('coep')) {
      suggestedNames.push('COEP Technological University, Pune');
    }
    if (val.toLowerCase().includes('vit') || val.toLowerCase().includes('vellore')) {
      suggestedNames.push('VIT University, Vellore');
    }

    setSuggestions(suggestedNames);
    setShowSuggestions(suggestedNames.length > 0);
  };

  const selectCollegeSuggestion = (name: string) => {
    // Automatically generate clean codes and regional details based on selected name
    const upper = name.toUpperCase();
    let district = 'Mumbai';
    let state = 'Maharashtra';
    let university = 'University of Mumbai';
    let code = 'COL';

    if (upper.includes('WIT') || upper.includes('WALCHAND')) {
      district = 'Solapur';
      state = 'Maharashtra';
      university = 'Punyashlok Ahilyadevi Holkar Solapur University';
      code = 'WIT-SOLAPUR';
    } else if (upper.includes('ORCHID')) {
      district = 'Solapur';
      state = 'Maharashtra';
      university = 'Punyashlok Ahilyadevi Holkar Solapur University';
      code = 'ORCHID-SOL';
    } else if (upper.includes('BMIT')) {
      district = 'Solapur';
      state = 'Maharashtra';
      university = 'Punyashlok Ahilyadevi Holkar Solapur University';
      code = 'BMIT-SOL';
    } else if (upper.includes('COEP')) {
      district = 'Pune';
      state = 'Maharashtra';
      university = 'Savitribai Phule Pune University';
      code = 'COEP-PUNE';
    } else if (upper.includes('VIT') || upper.includes('VELLORE')) {
      district = 'Vellore';
      state = 'Tamil Nadu';
      university = 'VIT University';
      code = 'VIT-VELLORE';
    }

    setCollegeForm({
      ...collegeForm,
      college_name: name,
      college_code: code,
      university,
      district,
      state,
      country: 'India'
    });
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // CRUD handlers - Colleges
  const handleSaveCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCollege) {
        const res = await api.put(`/admin/colleges/${editingCollege.id}`, collegeForm);
        if (res.data.success) {
          toast.success('College updated successfully');
          setShowCollegeModal(false);
          fetchInitialData();
        }
      } else {
        const res = await api.post('/admin/colleges', collegeForm);
        if (res.data.success) {
          toast.success('College registered successfully');
          setShowCollegeModal(false);
          fetchInitialData();
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error saving college details');
    }
  };

  const handleEditCollegeClick = (col: any) => {
    setEditingCollege(col);
    setCollegeForm({
      college_name: col.college_name || '',
      college_code: col.college_code || '',
      university: col.university || '',
      address: col.address || '',
      district: col.district || '',
      state: col.state || '',
      country: col.country || 'India',
      website: col.website || '',
      contact_number: col.contact_number || '',
      official_email: col.official_email || '',
      principal_name: col.principal_name || '',
      placement_head: col.placement_head || '',
      status: col.status || 'ACTIVE'
    });
    setShowCollegeModal(true);
  };

  const handleDeleteCollege = async (id: number) => {
    if (!window.confirm('Are you sure you want to deactivate this college?')) return;
    try {
      const res = await api.delete(`/admin/colleges/${id}`);
      if (res.data.success) {
        toast.success('College marked as INACTIVE');
        fetchInitialData();
      }
    } catch (err: any) {
      toast.error('Error deactivating college');
    }
  };

  // CRUD handlers - TPOs
  const handleSaveTpo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTpo) {
        const res = await api.put(`/admin/tpos/${editingTpo.id}`, tpoForm);
        if (res.data.success) {
          toast.success('TPO profile updated successfully');
          setShowTpoModal(false);
          fetchInitialData();
        }
      } else {
        const res = await api.post('/admin/tpos', tpoForm);
        if (res.data.success) {
          toast.success('TPO registered and credentials dispatched via official SMTP');
          setShowTpoModal(false);
          fetchInitialData();
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error saving TPO profile');
    }
  };

  const handleEditTpoClick = (tpo: any) => {
    setEditingTpo(tpo);
    const assignedIds = tpo.assigned_college_ids ? String(tpo.assigned_college_ids).split(',').map(Number) : [];
    setTpoForm({
      email: tpo.email || '',
      full_name: tpo.full_name || '',
      contact_number: tpo.contact_number || '',
      designation: tpo.designation || '',
      employee_id: tpo.employee_id || '',
      college_ids: assignedIds,
      status: tpo.status || 'ACTIVE'
    });
    setShowTpoModal(true);
  };

  const handleDeleteTpo = async (id: number) => {
    if (!window.confirm('Are you sure you want to completely delete this TPO account? This is irreversible.')) return;
    try {
      const res = await api.delete(`/admin/tpos/${id}`);
      if (res.data.success) {
        toast.success('TPO account and profile deleted successfully');
        fetchInitialData();
      }
    } catch (err: any) {
      toast.error('Error deleting TPO account');
    }
  };

  // CRUD handlers - Batches
  const handleSaveBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBatch) {
        const res = await api.put(`/admin/batches/${editingBatch.id}`, batchForm);
        if (res.data.success) {
          toast.success('Academic batch updated');
          setShowBatchModal(false);
          fetchInitialData();
        }
      } else {
        const res = await api.post('/admin/batches', batchForm);
        if (res.data.success) {
          toast.success('Academic batch created successfully');
          setShowBatchModal(false);
          fetchInitialData();
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error saving academic batch');
    }
  };

  const handleEditBatchClick = (bat: any) => {
    setEditingBatch(bat);
    setBatchForm({
      college_id: String(bat.college_id),
      batch_name: bat.batch_name || '',
      department: bat.department || '',
      academic_year: bat.academic_year || '',
      semester: bat.semester || '',
      assigned_tpo_id: bat.assigned_tpo_id ? String(bat.assigned_tpo_id) : '',
      status: bat.status || 'ACTIVE'
    });
    setShowBatchModal(true);
  };

  const handleDeleteBatch = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this batch? All student relationships will be unlinked.')) return;
    try {
      const res = await api.delete(`/admin/batches/${id}`);
      if (res.data.success) {
        toast.success('Batch deleted successfully');
        fetchInitialData();
      }
    } catch (err: any) {
      toast.error('Error deleting batch');
    }
  };

  // Bulk student onboarding submit
  const handleBulkOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkCollegeId || !bulkBatchId || parsedStudents.length === 0) {
      toast.error('Please specify the Target College, Batch and supply a non-empty student roster.');
      return;
    }

    setOnboardingInProgress(true);
    try {
      const res = await api.post('/admin/onboard-batch', {
        college_id: Number(bulkCollegeId),
        batch_id: Number(bulkBatchId),
        students: parsedStudents
      });

      if (res.data.success) {
        toast.success(`Batch successfully onboarded! dispatched credentials via SMTP.`);
        setStudentsText('');
        setParsedStudents([]);
        setBulkCollegeId('');
        setBulkBatchId('');
        fetchInitialData();
        setActiveTab('tree');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error during batch student onboarding');
    } finally {
      setOnboardingInProgress(false);
    }
  };

  const handleViewStudentsClick = async (batch: any) => {
    setSelectedBatchForStudents(batch);
    setLoadingStudents(true);
    try {
      const res = await api.get(`/admin/batches/${batch.id}/students`);
      if (res.data.success) {
        setBatchStudents(res.data.data);
      } else {
        toast.error('Failed to load batch students');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error loading batch students');
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleAddManualStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchForStudents) return;
    if (!manualStudentForm.name || !manualStudentForm.email) {
      toast.error('Please enter name and email');
      return;
    }
    setSavingManualStudent(true);
    try {
      const res = await api.post(`/admin/batches/${selectedBatchForStudents.id}/students`, manualStudentForm);
      if (res.data.success) {
        toast.success('Student added successfully to the batch');
        setManualStudentForm({ name: '', email: '' });
        // Refresh the student list
        const studentsRes = await api.get(`/admin/batches/${selectedBatchForStudents.id}/students`);
        if (studentsRes.data.success) {
          setBatchStudents(studentsRes.data.data);
        }
        // Refresh the main batches list too, to update counts
        const batchesRes = await api.get('/admin/batches');
        if (batchesRes.data.success) {
          setBatches(batchesRes.data.data);
        }
      } else {
        toast.error(res.data.message || 'Failed to add student');
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Error adding student');
    } finally {
      setSavingManualStudent(false);
    }
  };

  // UI accordion toggle helpers
  const toggleCollegeExpand = (id: number) => {
    setExpandedColleges(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleBatchExpand = (id: number) => {
    setExpandedBatches(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Search filter
  const filteredTree = treeData.filter(col => {
    const searchLower = searchQuery.toLowerCase();
    return (
      col.college_name.toLowerCase().includes(searchLower) ||
      col.college_code.toLowerCase().includes(searchLower) ||
      (col.district && col.district.toLowerCase().includes(searchLower)) ||
      (col.state && col.state.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 p-6 md:p-10 font-sans selection:bg-blue-500 selection:text-white">
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200/80 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 text-xs font-black bg-blue-50 text-blue-600 rounded-full border border-blue-100 uppercase tracking-widest">
              Core Ecosystem
            </span>
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            VEGA College Management System
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Enterprise authority node for managing institutes, TPOs, academic batches, and automated student dispatches.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button 
            onClick={() => {
              setEditingCollege(null);
              setCollegeForm({
                college_name: '', college_code: '', university: '', address: '',
                district: '', state: '', country: 'India', website: '', contact_number: '',
                official_email: '', principal_name: '', placement_head: '', status: 'ACTIVE'
              });
              setShowCollegeModal(true);
            }} 
            className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-600/15"
          >
            <Building2 size={16} /> Add College
          </button>

          <button 
            onClick={() => {
              setEditingTpo(null);
              setTpoForm({
                email: '', full_name: '', contact_number: '', designation: '',
                employee_id: '', college_ids: [], status: 'ACTIVE'
              });
              setShowTpoModal(true);
            }} 
            className="px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm"
          >
            <Users size={16} /> Register TPO
          </button>

          <button 
            onClick={() => {
              setEditingBatch(null);
              setBatchForm({
                college_id: '', batch_name: '', department: '', academic_year: '',
                semester: '', assigned_tpo_id: '', status: 'ACTIVE'
              });
              setShowBatchModal(true);
            }} 
            className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/15"
          >
            <Layers size={16} /> Create Batch
          </button>
        </div>
      </header>

      {/* Analytics Bento Grid */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
        <div className="bg-white border border-slate-200/65 shadow-sm p-5 rounded-2xl flex items-center gap-4 transition-all hover:shadow-md">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <Building2 size={22} />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Colleges</span>
            <span className="text-2xl font-black text-slate-900">{analytics.totalColleges}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/65 shadow-sm p-5 rounded-2xl flex items-center gap-4 transition-all hover:shadow-md">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
            <UserCheck size={22} />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Active TPOs</span>
            <span className="text-2xl font-black text-slate-900">{analytics.totalTPOs}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/65 shadow-sm p-5 rounded-2xl flex items-center gap-4 transition-all hover:shadow-md">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
            <Layers size={22} />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Batches</span>
            <span className="text-2xl font-black text-slate-900">{analytics.totalBatches}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/65 shadow-sm p-5 rounded-2xl flex items-center gap-4 transition-all hover:shadow-md">
          <div className="p-3 bg-sky-50 text-sky-600 rounded-xl border border-sky-100">
            <GraduationCap size={22} />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Students</span>
            <span className="text-2xl font-black text-slate-900">{analytics.totalStudents}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/65 shadow-sm p-5 rounded-2xl col-span-2 lg:col-span-1 flex items-center gap-4 transition-all hover:shadow-md">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
            <Activity size={22} />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Placement Rate</span>
            <span className="text-2xl font-black text-slate-900">{analytics.overallPlacementRate}%</span>
          </div>
        </div>
      </section>

      {/* Main Panel Tabs */}
      <div className="flex border-b border-slate-200 mb-8 overflow-x-auto gap-2 scrollbar-none">
        <button 
          onClick={() => setActiveTab('tree')}
          className={`px-5 py-4 font-bold text-sm flex items-center gap-2 transition-all border-b-2 whitespace-nowrap ${activeTab === 'tree' ? 'border-blue-600 text-blue-600 bg-blue-50/30' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <Database size={16} /> College Organizational Tree
        </button>

        <button 
          onClick={() => setActiveTab('colleges')}
          className={`px-5 py-4 font-bold text-sm flex items-center gap-2 transition-all border-b-2 whitespace-nowrap ${activeTab === 'colleges' ? 'border-blue-600 text-blue-600 bg-blue-50/30' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <Building2 size={16} /> Manage Colleges
        </button>

        <button 
          onClick={() => setActiveTab('tpos')}
          className={`px-5 py-4 font-bold text-sm flex items-center gap-2 transition-all border-b-2 whitespace-nowrap ${activeTab === 'tpos' ? 'border-blue-600 text-blue-600 bg-blue-50/30' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <Users size={16} /> Manage TPOs
        </button>

        <button 
          onClick={() => setActiveTab('batches')}
          className={`px-5 py-4 font-bold text-sm flex items-center gap-2 transition-all border-b-2 whitespace-nowrap ${activeTab === 'batches' ? 'border-blue-600 text-blue-600 bg-blue-50/30' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <Layers size={16} /> Academic Batches
        </button>

        <button 
          onClick={() => setActiveTab('onboard')}
          className={`px-5 py-4 font-bold text-sm flex items-center gap-2 transition-all border-b-2 whitespace-nowrap ${activeTab === 'onboard' ? 'border-blue-600 text-blue-600 bg-blue-50/30' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <FileSpreadsheet size={16} /> Bulk Student Onboarding
        </button>

        <button 
          onClick={() => setActiveTab('logs')}
          className={`px-5 py-4 font-bold text-sm flex items-center gap-2 transition-all border-b-2 whitespace-nowrap ${activeTab === 'logs' ? 'border-blue-600 text-blue-600 bg-blue-50/30' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <History size={16} /> Audit Logs
        </button>
      </div>

      {/* RENDER CONTENT PANEL */}
      {loading ? (
        <div className="space-y-4 py-10">
          <div className="h-10 bg-slate-100 rounded-xl animate-pulse"></div>
          <div className="h-40 bg-slate-100 rounded-xl animate-pulse"></div>
          <div className="h-40 bg-slate-100 rounded-xl animate-pulse"></div>
        </div>
      ) : (
        <div className="transition-all duration-300">
          
          {/* TAB 1: ORGANIZATIONAL TREE */}
          {activeTab === 'tree' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-3 top-3.5 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Fuzzy search college, region, code..." 
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-medium placeholder-slate-400 transition-all"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  Structure: Admin &rarr; College &rarr; Batch &rarr; Students
                </div>
              </div>

              {filteredTree.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                  <Building2 className="mx-auto text-slate-300 mb-4" size={48} />
                  <h3 className="text-lg font-bold text-slate-800 mb-1">No colleges matching roster search</h3>
                  <p className="text-slate-400 text-xs">Create colleges or try another keyword</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTree.map(college => (
                    <div key={college.id} className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md">
                      
                      {/* College Accordion Header */}
                      <div 
                        onClick={() => toggleCollegeExpand(college.id)}
                        className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/55 transition-all select-none"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                            <Building2 size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-extrabold text-slate-800">{college.college_name}</h3>
                              <span className="px-2 py-0.5 text-[10px] bg-slate-100 border border-slate-200 text-slate-600 font-black rounded uppercase">
                                {college.college_code}
                              </span>
                            </div>
                            <span className="text-xs text-slate-500 mt-0.5 block font-semibold">
                              {college.district ? `${college.district}, ` : ''}{college.state || 'Maharashtra'} &bull; {college.batches?.length || 0} Batches Registered
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className={`px-2.5 py-1 text-[10px] font-black rounded-full border ${college.status === 'ACTIVE' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                            {college.status}
                          </span>
                          {expandedColleges[college.id] ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
                        </div>
                      </div>

                      {/* College Accordion Body */}
                      {expandedColleges[college.id] && (
                        <div className="border-t border-slate-100 bg-slate-50/35 p-6 space-y-6">
                          
                          {/* Batches Section */}
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-2">
                                <Layers size={14} className="text-amber-500" /> Academic Batches ({college.batches?.length || 0})
                              </h4>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setBatchForm({
                                    college_id: String(college.id), batch_name: '', department: '',
                                    academic_year: '', semester: '', assigned_tpo_id: '', status: 'ACTIVE'
                                  });
                                  setEditingBatch(null);
                                  setShowBatchModal(true);
                                }}
                                className="text-xs text-blue-600 hover:text-blue-500 font-bold flex items-center gap-1"
                              >
                                <Plus size={14} /> New Batch
                              </button>
                            </div>

                            {(!college.batches || college.batches.length === 0) ? (
                              <div className="p-6 text-center bg-slate-100/60 rounded-xl border border-slate-200 text-slate-500 text-xs">
                                No active academic batches defined for this college.
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {college.batches.map((batch: any) => (
                                  <div key={batch.id} className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
                                    
                                    {/* Batch Accordion Header */}
                                    <div 
                                      onClick={() => toggleBatchExpand(batch.id)}
                                      className="p-4 flex items-center justify-between hover:bg-slate-50/50 cursor-pointer select-none"
                                    >
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-extrabold text-sm text-slate-800">{batch.batch_name}</span>
                                          <span className="text-[10px] font-black text-slate-500 uppercase bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                                            {batch.department || 'General'}
                                          </span>
                                        </div>
                                        <span className="text-[11px] text-slate-500 font-semibold block mt-1">
                                          TPO: <span className="text-slate-800 font-bold">{batch.tpo_name || 'Not Assigned'}</span> &bull; {batch.student_count || 0} Students
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setBulkCollegeId(String(college.id));
                                            setBulkBatchId(String(batch.id));
                                            setStudentsText('');
                                            setParsedStudents([]);
                                            setActiveTab('onboard');
                                          }}
                                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-[10px] font-black border border-blue-100 tracking-wider uppercase transition-all"
                                        >
                                          Import
                                        </button>
                                        {expandedBatches[batch.id] ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                                      </div>
                                    </div>

                                     {/* Batch Accordion Body (Students List) */}
                                    {expandedBatches[batch.id] && (
                                      <div className="bg-slate-50/50 border-t border-slate-100 p-3">
                                        {(!batch.students || batch.students.length === 0) ? (
                                          <div className="p-4 text-center text-slate-500 text-[11px] font-semibold flex flex-col items-center gap-2">
                                            <span>No students onboarded in this academic batch.</span>
                                            <button 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleViewStudentsClick({
                                                  ...batch,
                                                  college_name: college.college_name
                                                });
                                              }}
                                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-lg text-[10px] uppercase tracking-wide transition-all"
                                            >
                                              + Add Student Manually
                                            </button>
                                          </div>
                                        ) : (
                                          <div>
                                            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs">
                                              {batch.students.map((student: any) => (
                                                <div key={student.id} className="py-2.5 px-2 flex items-center justify-between hover:bg-slate-100/50 transition-all rounded">
                                                  <div>
                                                    <div className="font-extrabold text-slate-800">{student.full_name}</div>
                                                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">{student.email}</div>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    {student.talent_score && (
                                                      <span className="px-1.5 py-0.5 bg-sky-50 text-sky-600 border border-sky-100 rounded font-black text-[9px]">
                                                        TS: {student.talent_score}
                                                      </span>
                                                    )}
                                                    <span className={`px-2 py-0.5 text-[9px] font-black rounded-full border ${student.user_status === 'ACTIVE' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                                                      {student.user_status}
                                                    </span>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                            <div className="pt-2.5 mt-1 border-t border-slate-150 flex justify-end">
                                              <button 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleViewStudentsClick({
                                                    ...batch,
                                                    college_name: college.college_name
                                                  });
                                                }}
                                                className="text-[10px] text-blue-600 hover:text-blue-500 font-extrabold flex items-center gap-1 bg-blue-50/50 hover:bg-blue-50 px-2.5 py-1 rounded-md transition-all uppercase tracking-wider"
                                              >
                                                Manage &bull; Add Manual
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MANAGE COLLEGES */}
          {activeTab === 'colleges' && (
            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-200/80 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="text-blue-600" /> College Directory Database
                </h2>
                <div className="text-xs text-slate-500 font-bold">
                  Total Records: {colleges.length}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-bold text-xs uppercase tracking-wider">
                      <th className="p-4">College details</th>
                      <th className="p-4">Location</th>
                      <th className="p-4">Primary Contact</th>
                      <th className="p-4">Authorities</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {colleges.map(college => (
                      <tr key={college.id} className="hover:bg-slate-50/30 transition-all">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-slate-100 text-slate-600 rounded-lg font-black border border-slate-200/60">
                              {college.college_code}
                            </div>
                            <div>
                              <div className="font-extrabold text-slate-850 text-sm">{college.college_name}</div>
                              <div className="text-[11px] text-slate-500 font-semibold mt-0.5">{college.university}</div>
                              {college.website && (
                                <a href={college.website} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline inline-flex items-center gap-1 mt-1">
                                  {college.website} <ExternalLink size={10} />
                                </a>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-slate-800 font-bold text-xs">{college.district || 'Not specified'}</div>
                          <div className="text-slate-500 text-[11px] mt-0.5">{college.state || 'Maharashtra'}, {college.country || 'India'}</div>
                        </td>
                        <td className="p-4">
                          {college.official_email && (
                            <div className="flex items-center gap-1.5 text-slate-700 text-xs">
                              <Mail size={12} className="text-slate-400" /> {college.official_email}
                            </div>
                          )}
                          {college.contact_number && (
                            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mt-1">
                              <Phone size={12} className="text-slate-400" /> {college.contact_number}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          {college.principal_name && (
                            <div className="text-slate-700 text-xs font-semibold">
                              Prin: <span className="font-bold">{college.principal_name}</span>
                            </div>
                          )}
                          {college.placement_head && (
                            <div className="text-slate-500 text-[11px] mt-0.5 font-semibold">
                              Head: <span className="font-bold">{college.placement_head}</span>
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 text-[10px] font-black rounded-full border ${college.status === 'ACTIVE' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                            {college.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => handleEditCollegeClick(college)}
                              className="p-2 bg-slate-50 hover:bg-slate-100 text-blue-600 rounded-lg transition-all border border-slate-200"
                              title="Edit College Profile"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteCollege(college.id)}
                              className="p-2 bg-slate-50 hover:bg-red-50 text-red-600 rounded-lg transition-all border border-slate-200 hover:border-red-100"
                              title="Deactivate College"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: MANAGE TPOS */}
          {activeTab === 'tpos' && (
            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-200/80 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Users className="text-blue-600" /> Training & Placement Officer (TPO) Registry
                </h2>
                <div className="text-xs text-slate-500 font-bold">
                  Total Registrants: {tpos.length}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-bold text-xs uppercase tracking-wider">
                      <th className="p-4">Officer profile</th>
                      <th className="p-4">Designation & ID</th>
                      <th className="p-4">Contact Detail</th>
                      <th className="p-4">Assigned Institutes</th>
                      <th className="p-4">Ecosystem Status</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tpos.map(tpo => (
                      <tr key={tpo.id} className="hover:bg-slate-50/30 transition-all">
                        <td className="p-4">
                          <div className="font-extrabold text-slate-850 text-sm">{tpo.full_name}</div>
                          <div className="text-[11px] text-blue-600 font-semibold mt-0.5 flex items-center gap-1">
                            <Mail size={10} /> {tpo.email}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-slate-800 font-bold text-xs">{tpo.designation || 'TPO Head'}</div>
                          <div className="text-slate-500 text-[11px] mt-0.5">Emp ID: {tpo.employee_id || 'N/A'}</div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5 text-slate-700 text-xs">
                            <Phone size={12} className="text-slate-400" /> {tpo.contact_number || 'No contact info'}
                          </div>
                        </td>
                        <td className="p-4">
                          {tpo.assigned_colleges ? (
                            <div className="flex flex-wrap gap-1.5 max-w-xs">
                              {String(tpo.assigned_colleges).split(',').map((name, i) => (
                                <span key={i} className="px-2 py-0.5 bg-slate-105 border border-slate-200 text-slate-600 rounded font-bold text-[10px] tracking-wide whitespace-nowrap">
                                  {name.trim()}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic">No colleges allocated</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 text-[10px] font-black rounded-full border ${tpo.user_status === 'ACTIVE' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                            {tpo.user_status}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => handleEditTpoClick(tpo)}
                              className="p-2 bg-slate-50 hover:bg-slate-100 text-blue-600 rounded-lg transition-all border border-slate-200"
                              title="Edit Profile & Allocations"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteTpo(tpo.id)}
                              className="p-2 bg-slate-50 hover:bg-red-50 text-red-600 rounded-lg transition-all border border-slate-200 hover:border-red-100"
                              title="Delete TPO Account"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: ACADEMIC BATCHES */}
          {activeTab === 'batches' && (
            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-200/80 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="text-blue-600" /> Academic Batches Directory
                </h2>
                <div className="text-xs text-slate-500 font-bold">
                  Total Batches: {batches.length}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-bold text-xs uppercase tracking-wider">
                      <th className="p-4">Batch details</th>
                      <th className="p-4">Parent College</th>
                      <th className="p-4">Assigned TPO</th>
                      <th className="p-4">Roster Strength</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {batches.map(batch => (
                      <tr key={batch.id} className="hover:bg-slate-50/30 transition-all">
                        <td className="p-4">
                          <div className="font-extrabold text-slate-850 text-sm">{batch.batch_name}</div>
                          <div className="text-[11px] text-slate-500 font-semibold mt-1">
                            Dept: <span className="text-slate-800 font-bold">{batch.department || 'N/A'}</span> &bull; Year: {batch.academic_year || 'N/A'} &bull; Sem: {batch.semester || 'N/A'}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-slate-800 font-bold text-xs">{batch.college_name}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-slate-800 text-xs font-semibold flex items-center gap-1.5">
                            <UserCheck size={12} className="text-slate-400" /> {batch.tpo_name || <span className="text-rose-600 font-bold">Unassigned</span>}
                          </div>
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => handleViewStudentsClick(batch)}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded border border-blue-100 hover:border-blue-200 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer"
                            title="Click to view and manage batch roster"
                          >
                            <Users size={12} />
                            {batch.student_count || 0} students
                          </button>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 text-[10px] font-black rounded-full border ${batch.status === 'ACTIVE' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                            {batch.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => handleViewStudentsClick(batch)}
                              className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg transition-all border border-slate-200"
                              title="View & Manage Students"
                            >
                              <Users size={14} />
                            </button>
                            <button 
                              onClick={() => handleEditBatchClick(batch)}
                              className="p-2 bg-slate-50 hover:bg-slate-100 text-blue-600 rounded-lg transition-all border border-slate-200"
                              title="Edit Academic Batch"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteBatch(batch.id)}
                              className="p-2 bg-slate-50 hover:bg-red-50 text-red-600 rounded-lg transition-all border border-slate-200 hover:border-red-100"
                              title="Delete Batch"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: BULK STUDENT ONBOARDING */}
          {activeTab === 'onboard' && (
            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden p-8 shadow-sm">
              <div className="border-b border-slate-200 pb-6 mb-8">
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <FileSpreadsheet className="text-emerald-600" /> Transactional Roster Onboarding Engine
                </h2>
                <p className="text-slate-500 text-xs mt-1">
                  Submit student email rosters to dynamically initiate core logins, inject starter XP balances, and trigger security dispatch systems.
                </p>
              </div>

              <form onSubmit={handleBulkOnboard} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Target Institutional College</label>
                    <select 
                      required
                      className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800"
                      value={bulkCollegeId}
                      onChange={e => {
                        setBulkCollegeId(e.target.value);
                        setBulkBatchId('');
                      }}
                    >
                      <option value="">Select Target College...</option>
                      {colleges.filter(c => c.status === 'ACTIVE').map(c => <option key={c.id} value={c.id}>{c.college_name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Target Academic Batch</label>
                    <select 
                      required
                      disabled={!bulkCollegeId}
                      className="w-full p-3 bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800"
                      value={bulkBatchId}
                      onChange={e => setBulkBatchId(e.target.value)}
                    >
                      <option value="">Select Academic Batch...</option>
                      {batches
                        .filter(b => String(b.college_id) === String(bulkCollegeId) && b.status === 'ACTIVE')
                        .map(b => <option key={b.id} value={b.id}>{b.batch_name}</option>)
                      }
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-555 uppercase tracking-widest flex items-center gap-1.5">
                      Option A: File Upload
                      <span className="text-[10px] text-emerald-600 font-black bg-emerald-50 px-2 py-0.5 border border-emerald-200 rounded uppercase">Roster File</span>
                    </label>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      Select any student roster `.csv` or text roster containing name and email columns.
                    </p>
                    <div className="relative flex items-center justify-center border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl bg-slate-50 p-8 text-center cursor-pointer transition-all duration-200 hover:bg-emerald-50/10">
                      <input 
                        type="file" 
                        accept=".csv,.txt"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleFileUpload}
                      />
                      <div className="space-y-2">
                        <Upload size={28} className="text-slate-400 mx-auto" />
                        <p className="text-xs font-bold text-slate-750">Choose Student Roster File</p>
                        <p className="text-[10px] text-slate-400 font-medium">Drag-and-drop or click to browse</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Option B: Copy-Paste Spreadsheet Rows</label>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      Copy rows from Excel, Word, or Sheets directly into the textbox below.
                    </p>
                    <textarea 
                      placeholder="Rahul Sharma, rahul@college.edu&#10;Sneha Patil, sneha@college.edu&#10;Amit Shinde, amit@college.edu"
                      rows={6}
                      className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 resize-none"
                      value={studentsText}
                      onChange={(e) => handleStudentsTextChange(e.target.value)}
                    />
                  </div>
                </div>

                {parsedStudents.length > 0 && (
                  <div className="bg-blue-50/50 border border-blue-100 p-6 rounded-2xl space-y-3 mt-6">
                    <div className="flex justify-between items-center text-blue-600 font-black text-xs uppercase tracking-wider">
                      <span>Detected Student Roster ({parsedStudents.length})</span>
                      <span className="text-[10px] bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded font-black border border-blue-100 uppercase">Valid Entries</span>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-slate-50 text-xs">
                      {parsedStudents.map((st, i) => (
                        <div key={i} className="px-4 py-2.5 flex justify-between font-semibold">
                          <span className="text-slate-800">{st.name}</span>
                          <span className="text-slate-500 font-mono text-[11px]">{st.email}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-blue-50/40 p-4 border border-blue-100 rounded-xl flex items-start gap-3 mt-6">
                  <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={18} />
                  <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                    Each valid student account is automatically registered with active status, credited with <span className="text-blue-600 font-black">100 bonus XP</span>, and dispatched security credentials via the enterprise SMTP module.
                  </p>
                </div>

                <div className="flex justify-end gap-4 pt-6 border-t border-slate-100">
                  <button 
                    type="submit" 
                    disabled={onboardingInProgress || parsedStudents.length === 0}
                    className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-600/15 transition-all flex items-center gap-2"
                  >
                    <FileSpreadsheet size={16} /> {onboardingInProgress ? 'Dispatched and processing emails...' : `Onboard ${parsedStudents.length} Students`}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 6: AUDIT LOGS */}
          {activeTab === 'logs' && (
            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-200/80 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <History className="text-blue-600" /> Enterprise Audit Trails & Action Logs
                </h2>
                <div className="text-xs text-slate-500 font-bold">
                  Security Log Limit: 100
                </div>
              </div>

              {auditLogs.length === 0 ? (
                <div className="text-center py-20 text-slate-400 text-sm">
                  No system logs available
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto font-mono text-xs">
                  {auditLogs.map(log => (
                    <div key={log.id} className="p-4 hover:bg-slate-50/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-slate-650">
                      <div className="flex items-start gap-3">
                        <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 rounded text-[10px] font-bold block shrink-0 mt-0.5">
                          #{log.id}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-blue-600 text-xs uppercase bg-blue-50 border border-blue-100 px-1.5 rounded">
                              {log.action}
                            </span>
                            <span className="text-slate-400 text-[10px]">{log.admin_email}</span>
                          </div>
                          <div className="text-slate-500 text-[11px] mt-1 break-all">
                            Payload: {log.details || '{}'}
                          </div>
                          {log.ip_address && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              IP: {log.ip_address} &bull; Browser: {log.user_agent}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-slate-400 text-[10px] shrink-0 font-bold">
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* COLLEGE MODAL */}
      {showCollegeModal && (
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-black text-slate-950 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="text-blue-600" />
                {editingCollege ? 'Update College Node' : 'Register New College'}
              </h2>
              <button onClick={() => setShowCollegeModal(false)} className="text-slate-400 hover:text-slate-600 font-extrabold text-sm">✕</button>
            </div>

            <form onSubmit={handleSaveCollege} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-sm">
              <div className="space-y-2 relative">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider">College/Institute Name</label>
                <input 
                  required 
                  type="text" 
                  placeholder="e.g. WIT Solapur" 
                  className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  value={collegeForm.college_name} 
                  onChange={e => handleCollegeNameChange(e.target.value)} 
                />
                
                {/* Autocomplete parser list */}
                {showSuggestions && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl overflow-hidden z-10 shadow-xl max-h-48 overflow-y-auto">
                    {suggestions.map((name, i) => (
                      <div 
                        key={i} 
                        onClick={() => selectCollegeSuggestion(name)}
                        className="p-3 hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700 hover:text-slate-950 transition-all border-b border-slate-100 last:border-0"
                      >
                        {name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Unique College Code</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="e.g. WIT-SOLAPUR" 
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    value={collegeForm.college_code} 
                    onChange={e => setCollegeForm({...collegeForm, college_code: e.target.value.toUpperCase()})} 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Affiliated University</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Solapur University" 
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    value={collegeForm.university} 
                    onChange={e => setCollegeForm({...collegeForm, university: e.target.value})} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">District</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Solapur" 
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    value={collegeForm.district} 
                    onChange={e => setCollegeForm({...collegeForm, district: e.target.value})} 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">State</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Maharashtra" 
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    value={collegeForm.state} 
                    onChange={e => setCollegeForm({...collegeForm, state: e.target.value})} 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Country</label>
                  <input 
                    type="text" 
                    placeholder="e.g. India" 
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    value={collegeForm.country} 
                    onChange={e => setCollegeForm({...collegeForm, country: e.target.value})} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Principal / Director Name</label>
                  <input 
                    type="text" 
                    placeholder="Principal's Name" 
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    value={collegeForm.principal_name} 
                    onChange={e => setCollegeForm({...collegeForm, principal_name: e.target.value})} 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">TPO Head Name</label>
                  <input 
                    type="text" 
                    placeholder="Placement Head" 
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    value={collegeForm.placement_head} 
                    onChange={e => setCollegeForm({...collegeForm, placement_head: e.target.value})} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Official Email Contact</label>
                  <input 
                    type="email" 
                    placeholder="e.g. info@college.edu" 
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    value={collegeForm.official_email} 
                    onChange={e => setCollegeForm({...collegeForm, official_email: e.target.value})} 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Primary Telephone</label>
                  <input 
                    type="text" 
                    placeholder="Phone number" 
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    value={collegeForm.contact_number} 
                    onChange={e => setCollegeForm({...collegeForm, contact_number: e.target.value})} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Official Web Portal</label>
                  <input 
                    type="text" 
                    placeholder="e.g. https://college.edu" 
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    value={collegeForm.website} 
                    onChange={e => setCollegeForm({...collegeForm, website: e.target.value})} 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Status Node</label>
                  <select 
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={collegeForm.status}
                    onChange={e => setCollegeForm({...collegeForm, status: e.target.value})}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowCollegeModal(false)} className="px-5 py-2.5 font-bold text-slate-500 hover:text-slate-700">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/10">Save Node</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TPO REGISTER / EDIT MODAL */}
      {showTpoModal && (
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-black text-slate-950 uppercase tracking-wider flex items-center gap-2">
                <Users className="text-blue-600" />
                {editingTpo ? 'Update TPO Profile' : 'Register New TPO User'}
              </h2>
              <button onClick={() => setShowTpoModal(false)} className="text-slate-400 hover:text-slate-600 font-extrabold text-sm">✕</button>
            </div>

            <form onSubmit={handleSaveTpo} className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Full Name</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="Officer Full Name" 
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-850 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    value={tpoForm.full_name} 
                    onChange={e => setTpoForm({...tpoForm, full_name: e.target.value})} 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Official Email ID</label>
                  <input 
                    required 
                    disabled={!!editingTpo}
                    type="email" 
                    placeholder="tpo@college.edu" 
                    className="w-full p-3 bg-slate-50 disabled:opacity-50 rounded-xl border border-slate-200 text-slate-850 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    value={tpoForm.email} 
                    onChange={e => setTpoForm({...tpoForm, email: e.target.value})} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Designation</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Training & Placement Head" 
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-850 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    value={tpoForm.designation} 
                    onChange={e => setTpoForm({...tpoForm, designation: e.target.value})} 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Employee ID</label>
                  <input 
                    type="text" 
                    placeholder="e.g. WIT-TPO-01" 
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-850 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    value={tpoForm.employee_id} 
                    onChange={e => setTpoForm({...tpoForm, employee_id: e.target.value})} 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Contact Phone</label>
                  <input 
                    type="text" 
                    placeholder="Primary contact" 
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-850 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    value={tpoForm.contact_number} 
                    onChange={e => setTpoForm({...tpoForm, contact_number: e.target.value})} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">Allocated Colleges / Institutes (Multiple Selection)</label>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-40 overflow-y-auto space-y-2">
                  {colleges.map(c => (
                    <label key={c.id} className="flex items-center gap-2.5 text-slate-700 font-semibold cursor-pointer hover:text-slate-900">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 bg-white" 
                        checked={tpoForm.college_ids.includes(c.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setTpoForm({ ...tpoForm, college_ids: [...tpoForm.college_ids, c.id] });
                          } else {
                            setTpoForm({ ...tpoForm, college_ids: tpoForm.college_ids.filter(id => id !== c.id) });
                          }
                        }}
                      />
                      <span>{c.college_name} <span className="text-slate-400 font-mono text-[10px]">({c.college_code})</span></span>
                    </label>
                  ))}
                </div>
              </div>

              {editingTpo && (
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Account Status</label>
                  <select 
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-850 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={tpoForm.status}
                    onChange={e => setTpoForm({...tpoForm, status: e.target.value})}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              )}

              <div className="bg-blue-50/40 p-4 border border-blue-100 rounded-xl flex items-start gap-3 mt-4">
                <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={16} />
                <p className="text-[11px] text-slate-500 leading-normal font-semibold">
                  Upon registration, TPO login credentials are generated securely. A secure email containing their username, temporary password, and system login portal address is immediately dispatched.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowTpoModal(false)} className="px-5 py-2.5 font-bold text-slate-500 hover:text-slate-700">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/10">Save TPO</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BATCH MODAL */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-black text-slate-950 uppercase tracking-wider flex items-center gap-2">
                <Layers className="text-blue-600" />
                {editingBatch ? 'Update Academic Batch' : 'Create Academic Batch'}
              </h2>
              <button onClick={() => setShowBatchModal(false)} className="text-slate-400 hover:text-slate-600 font-extrabold text-sm">✕</button>
            </div>

            <form onSubmit={handleSaveBatch} className="p-6 space-y-4 text-sm">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Target College / Institute</label>
                <select 
                  required
                  disabled={!!editingBatch}
                  className="w-full p-3 bg-slate-50 disabled:opacity-50 rounded-xl border border-slate-200 text-slate-850 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={batchForm.college_id}
                  onChange={e => setBatchForm({...batchForm, college_id: e.target.value})}
                >
                  <option value="">Select College...</option>
                  {colleges.filter(c => c.status === 'ACTIVE').map(c => <option key={c.id} value={c.id}>{c.college_name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Batch Name</label>
                <input 
                  required 
                  type="text" 
                  placeholder="e.g. Batch of 2026 CS-A" 
                  className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-850 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  value={batchForm.batch_name} 
                  onChange={e => setBatchForm({...batchForm, batch_name: e.target.value})} 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Department</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Computer Science" 
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-850 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    value={batchForm.department} 
                    onChange={e => setBatchForm({...batchForm, department: e.target.value})} 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Academic Year</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 2025-2026" 
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-850 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    value={batchForm.academic_year} 
                    onChange={e => setBatchForm({...batchForm, academic_year: e.target.value})} 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Semester</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Semester VIII" 
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-850 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    value={batchForm.semester} 
                    onChange={e => setBatchForm({...batchForm, semester: e.target.value})} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Assigned TPO Officer</label>
                  <select 
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-850 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={batchForm.assigned_tpo_id}
                    onChange={e => setBatchForm({...batchForm, assigned_tpo_id: e.target.value})}
                  >
                    <option value="">Select TPO...</option>
                    {tpos.filter(t => t.status === 'ACTIVE' || t.user_status === 'ACTIVE').map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Status Node</label>
                  <select 
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-850 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={batchForm.status}
                    onChange={e => setBatchForm({...batchForm, status: e.target.value})}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowBatchModal(false)} className="px-5 py-2.5 font-bold text-slate-500 hover:text-slate-700">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/10">Save Batch</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BATCH STUDENTS VIEW & MANUAL REGISTER MODAL */}
      {selectedBatchForStudents && (
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-5xl shadow-xl overflow-hidden h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <div>
                <h2 className="text-lg font-black text-slate-950 uppercase tracking-wider flex items-center gap-2 font-sans">
                  <Layers className="text-blue-600" />
                  {selectedBatchForStudents.batch_name} Students Directory
                </h2>
                <p className="text-xs text-slate-500 mt-1 font-semibold">
                  Dept: {selectedBatchForStudents.department || 'N/A'} &bull; Year: {selectedBatchForStudents.academic_year || 'N/A'} &bull; College: {selectedBatchForStudents.college_name || 'N/A'}
                </p>
              </div>
              <button 
                onClick={() => setSelectedBatchForStudents(null)} 
                className="text-slate-400 hover:text-slate-600 font-extrabold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left column: Add manual student */}
              <div className="lg:border-r lg:border-slate-100 lg:pr-6 space-y-4">
                <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 mb-3 font-sans">
                    <Plus size={16} className="text-blue-600" /> Add Student Manually
                  </h3>
                  <p className="text-[11px] text-slate-500 leading-normal mb-4 font-semibold">
                    Register a single student into this academic batch. Login credentials will be instantly sent to their email.
                  </p>

                  <form onSubmit={handleAddManualStudent} className="space-y-4 text-xs">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Student Full Name</label>
                      <input 
                        required 
                        type="text" 
                        placeholder="e.g. Rahul Sharma" 
                        className="w-full p-2.5 bg-white rounded-xl border border-slate-200 text-slate-850 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        value={manualStudentForm.name} 
                        onChange={e => setManualStudentForm({...manualStudentForm, name: e.target.value})} 
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Email Address</label>
                      <input 
                        required 
                        type="email" 
                        placeholder="e.g. rahul@wit.edu" 
                        className="w-full p-2.5 bg-white rounded-xl border border-slate-200 text-slate-850 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        value={manualStudentForm.email} 
                        onChange={e => setManualStudentForm({...manualStudentForm, email: e.target.value})} 
                      />
                    </div>

                    <button 
                      type="submit" 
                      disabled={savingManualStudent}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-md shadow-blue-500/10 flex items-center justify-center gap-2 transition-all font-sans cursor-pointer"
                    >
                      {savingManualStudent ? 'Saving...' : 'Add Student Node'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Right columns: Batch Students Table */}
              <div className="lg:col-span-2 flex flex-col h-full space-y-4">
                <div className="flex justify-between items-center bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl shrink-0">
                  <div className="text-xs text-slate-600 font-extrabold uppercase tracking-wide font-sans">
                    Enrolled Students ({batchStudents.length})
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Batch Code: #{selectedBatchForStudents.id}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto border border-slate-100 rounded-xl bg-white min-h-[250px]">
                  {loadingStudents ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                      <span className="text-xs font-semibold">Fetching batch roster...</span>
                    </div>
                  ) : batchStudents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center px-4">
                      <Users size={32} className="text-slate-300 mb-2" />
                      <span className="text-xs font-black text-slate-500 uppercase tracking-wider font-sans">No Students Found</span>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-xs font-semibold">
                        This batch is currently empty. Use the manual form on the left or Bulk Onboarding tab to populate this roster.
                      </p>
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-150 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                          <th className="p-3">Student Name</th>
                          <th className="p-3">Email Address</th>
                          <th className="p-3 text-center">Talent Score</th>
                          <th className="p-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {batchStudents.map(student => (
                          <tr key={student.id} className="hover:bg-slate-50/40 transition-all font-semibold">
                            <td className="p-3">
                              <div className="font-extrabold text-slate-850 text-sm">{student.full_name}</div>
                            </td>
                            <td className="p-3">
                              <div className="text-slate-500 font-mono text-xs">{student.email}</div>
                            </td>
                            <td className="p-3 text-center">
                              {student.talent_score !== null && student.talent_score !== undefined ? (
                                <span className="px-2 py-1 bg-sky-50 text-sky-600 border border-sky-100 rounded font-black text-[10px]">
                                  {student.talent_score}
                                </span>
                              ) : (
                                <span className="text-slate-400">&mdash;</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 text-[9px] font-black rounded-full border ${student.user_status === 'ACTIVE' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                                {student.user_status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
              <button 
                onClick={() => setSelectedBatchForStudents(null)} 
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close Portal
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
