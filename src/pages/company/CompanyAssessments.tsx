import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  FileText, 
  Clock, 
  Target, 
  ChevronRight, 
  Trash2, 
  Users, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Save, 
  Layout, 
  HelpCircle, 
  Check, 
  Play, 
  AlertCircle,
  Eye,
  Edit3,
  Calendar,
  Filter,
  X,
  PlusCircle,
  Award,
  Upload,
  ChevronDown
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from "../../context/AuthContext.tsx";

interface Question {
  id: string;
  type: 'MCQ' | 'CODING';
  questionText: string;
  options: string[];
  correctOption: number; // index 0-3
  points: number;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
}

interface DBTestHistory {
  id: string; // test ID
  job_id: number;
  job_title: string;
  title: string;
  created_by: string;
  created_date: string;
  questions_count: number;
  duration: number; // in minutes
  status: 'Active' | 'Archived';
  assigned_count: number;
  submissions_count: number;
  average_score: number;
  questions: Question[];
  instructions?: string;
}

export default function CompanyAssessments() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'list' | 'builder' | 'attempts'>('list');
  const [loading, setLoading] = useState(false);
  
  // Real DB state
  const [dbTests, setDbTests] = useState<DBTestHistory[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  
  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJobFilter, setSelectedJobFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // View & Edit Modals state
  const [viewingTest, setViewingTest] = useState<DBTestHistory | null>(null);
  const [editingTest, setEditingTest] = useState<DBTestHistory | null>(null);

  // Workflow tracking states
  const [workflowState, setWorkflowState] = useState<'IDLE' | 'DRAFT_CREATED' | 'PUBLISHED_UNASSIGNED' | 'ASSIGNED' | 'ASSIGNMENT_FAILED'>('IDLE');
  const [createdAssessmentId, setCreatedAssessmentId] = useState<string | null>(null);
  const [workflowError, setWorkflowError] = useState<string | null>(null);

  // Retry handlers for partial workflow failures
  const handleRetryPublish = async (assessmentId: string) => {
    try {
      setLoading(true);
      setWorkflowError(null);
      await api.post('/assessments/company/publish', { assessmentId });
      setWorkflowState('PUBLISHED_UNASSIGNED');
      toast.success('Assessment published successfully!');
      
      if (newJobId) {
        await handleRetryAssign(assessmentId);
      } else {
        await fetchTestData();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Publish failed';
      setWorkflowError(`Publish failed: ${msg}`);
      toast.error(`Publish failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRetryAssign = async (assessmentId: string) => {
    if (!newJobId) {
      toast.error('Please select a target job for assignment');
      return;
    }
    try {
      setLoading(true);
      setWorkflowError(null);
      await api.post('/assessments/company/assign', {
        assessmentId,
        jobId: parseInt(newJobId),
        stageId: newStageId ? parseInt(newStageId) : undefined,
        cutoffScore: newCutoffScore
      }, {
        headers: { 'Idempotency-Key': `ASSIGN:${assessmentId}:${newJobId}` }
      });
      setWorkflowState('ASSIGNED');
      toast.success('Assessment assigned successfully!');
      await fetchTestData();
      clientRequestIdRef.current = crypto.randomUUID();
      setCreatedAssessmentId(null);
      setWorkflowError(null);
      setWorkflowState('IDLE');
      setNewTestTitle('');
      setActiveTab('list');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Assignment failed';
      setWorkflowState('ASSIGNMENT_FAILED');
      setWorkflowError(`Assignment failed: ${msg}`);
      toast.error(`Assignment failed: ${msg}`);
      await fetchTestData();
    } finally {
      setLoading(false);
    }
  };

  // Form states for NEW test builder
  const [newJobId, setNewJobId] = useState('');
  const [selectedJobStages, setSelectedJobStages] = useState<any[]>([]);
  const [newStageId, setNewStageId] = useState<string>('');
  const [newTestTitle, setNewTestTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Technical MCQ');
  const [newInstructions, setNewInstructions] = useState('Please answer all questions carefully. There is no negative marking.');
  const [newDuration, setNewDuration] = useState(30);

  // Fetch job stages when newJobId changes
  useEffect(() => {
    const fetchStages = async () => {
      if (!newJobId) {
        setSelectedJobStages([]);
        setNewStageId('');
        return;
      }
      try {
        const res = await api.get(`/jobs/${newJobId}`);
        if (res.data?.success && res.data.data?.stages) {
          setSelectedJobStages(res.data.data.stages);
          if (res.data.data.stages.length > 0) {
            setNewStageId(String(res.data.data.stages[0].id));
          } else {
            setNewStageId('');
          }
        } else {
          setSelectedJobStages([]);
          setNewStageId('');
        }
      } catch (err) {
        console.error('Failed to fetch stages for job:', err);
        setSelectedJobStages([]);
        setNewStageId('');
      }
    };
    fetchStages();
  }, [newJobId]);
  const [newQuestions, setNewQuestions] = useState<Question[]>([
    {
      id: 'q-init-1',
      type: 'MCQ',
      questionText: '',
      options: ['', '', '', ''],
      correctOption: 0,
      points: 10,
      difficulty: 'MEDIUM'
    }
  ]);

  // Cutoff Score & Bulk Import States
  const [newCutoffScore, setNewCutoffScore] = useState<number>(40);
  const [bulkRawText, setBulkRawText] = useState('');
  const [bulkImportPreview, setBulkImportPreview] = useState<Question[] | null>(null);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);

  // Authenticated History & Scores attempts state
  const [attempts, setAttempts] = useState<any[]>([]);

  // Stale request & idempotency tracking refs
  const fetchSeqRef = React.useRef(0);
  const clientRequestIdRef = React.useRef<string>(crypto.randomUUID());

  // Fetch data on load with stale response protection
  const fetchTestData = async () => {
    if (!user?.id) return;
    const currentSeq = ++fetchSeqRef.current;
    try {
      setLoading(true);
      const [testsRes, jobsRes, attemptsRes] = await Promise.all([
        api.get('/assessments/company/tests').catch((err) => {
          console.error("Error fetching company tests:", err);
          return { data: { success: false, data: [] } };
        }),
        api.get('/jobs').catch(() => ({ data: { success: false, data: [] } })),
        api.get('/assessments/company/history').catch((err) => {
          console.error("Error fetching assessment history:", err);
          return { data: { success: false, data: [] } };
        })
      ]);

      if (currentSeq !== fetchSeqRef.current) return;

      if (testsRes.data?.success) {
        setDbTests(testsRes.data.data);
      }
      if (jobsRes.data?.success) {
        const companyJobs = jobsRes.data.data.filter((j: any) => j.company_id === profile?.id);
        setJobs(companyJobs.length > 0 ? companyJobs : jobsRes.data.data);
        if (companyJobs.length > 0) {
          setNewJobId(String(companyJobs[0].id));
        }
      }
      if (attemptsRes.data?.success) {
        setAttempts(attemptsRes.data.data || []);
      }
    } catch (err) {
      if (currentSeq !== fetchSeqRef.current) return;
      console.error('Failed to fetch assessment history:', err);
      toast.error('Could not load test histories.');
    } finally {
      if (currentSeq === fetchSeqRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchTestData();
  }, [user?.id, profile?.id]);

  // Handle Create Test (Submit to DB with idempotency)
  const handleCreateTestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTestTitle.trim()) {
      toast.error('Test title is required');
      return;
    }

    // Validate questions
    for (let i = 0; i < newQuestions.length; i++) {
      const q = newQuestions[i];
      if (!q.questionText.trim()) {
        toast.error(`Question ${i + 1} has empty text`);
        return;
      }
      if (!q.options || q.options.length !== 4) {
        toast.error(`Question ${i + 1} must have exactly 4 options`);
        return;
      }
      const hasEmptyOption = q.options.some(opt => !opt.trim());
      if (hasEmptyOption) {
        toast.error(`Question ${i + 1} has empty choice options`);
        return;
      }
      if (q.correctOption === undefined || q.correctOption < 0 || q.correctOption > 3) {
        toast.error(`Question ${i + 1} requires a valid correct answer selection`);
        return;
      }
      if (!q.points || q.points <= 0) {
        toast.error(`Question ${i + 1} points must be greater than 0`);
        return;
      }
    }

    // Calculate total score
    const totalScore = newQuestions.reduce((acc, q) => acc + (Number(q.points) || 10), 0);
    if (newCutoffScore < 0 || newCutoffScore >= totalScore) {
      toast.error(`Cutoff score must be >= 0 and strictly less than total score (${totalScore}).`);
      return;
    }

    try {
      setLoading(true);
      setWorkflowError(null);
      const formattedQuestions = newQuestions.map(q => ({
        ...q,
        instructions: newInstructions,
        category: newCategory,
        duration: newDuration,
        testTitle: newTestTitle
      }));

      const createRes = await api.post('/assessments/company/create', {
        clientRequestId: clientRequestIdRef.current,
        title: newTestTitle,
        duration: newDuration,
        questions: formattedQuestions,
        instructions: newInstructions
      }, {
        headers: {
          'Idempotency-Key': clientRequestIdRef.current
        }
      });

      if (!createRes.data?.success || !createRes.data?.data?.id) {
        toast.error(createRes.data?.message || 'Failed to create Draft Assessment');
        return;
      }

      const createdId = String(createRes.data.data.id);
      setCreatedAssessmentId(createdId);
      setWorkflowState('DRAFT_CREATED');
      await fetchTestData(); // Immediately preserve and display created draft in Manage Tests!

      if (!newJobId) {
        toast.success('Draft Assessment created successfully!');
        clientRequestIdRef.current = crypto.randomUUID();
        setNewTestTitle('');
        setActiveTab('list');
        return;
      }

      // Step 2: Publish
      try {
        await api.post('/assessments/company/publish', { assessmentId: createdId });
        setWorkflowState('PUBLISHED_UNASSIGNED');
        await fetchTestData();
      } catch (pubErr: any) {
        const msg = pubErr.response?.data?.message || pubErr.message || 'Publish failed';
        setWorkflowError(`Draft created, but Publish failed: ${msg}`);
        toast.error(`Draft saved, but publishing failed: ${msg}`);
        return;
      }

      // Step 3: Assign
      try {
        await api.post('/assessments/company/assign', {
          assessmentId: createdId,
          jobId: parseInt(newJobId),
          stageId: newStageId ? parseInt(newStageId) : undefined,
          cutoffScore: newCutoffScore
        }, {
          headers: { 'Idempotency-Key': `ASSIGN:${createdId}:${newJobId}` }
        });
        setWorkflowState('ASSIGNED');
        toast.success('Assessment published and assigned successfully!');
        clientRequestIdRef.current = crypto.randomUUID();
        setWorkflowError(null);
        setCreatedAssessmentId(null);
        setWorkflowState('IDLE');
        setNewTestTitle('');
        setActiveTab('list');
        await fetchTestData();
      } catch (assignErr: any) {
        const msg = assignErr.response?.data?.message || assignErr.message || 'Assignment failed';
        setWorkflowState('ASSIGNMENT_FAILED');
        setWorkflowError(`Published, but Job Assignment failed: ${msg}`);
        toast.error(`Published, but job assignment failed: ${msg}`);
        await fetchTestData();
      }
    } catch (err: any) {
      console.error('Error creating assessment test:', err);
      const errMsg = err.response?.data?.message || 'Failed to create assessment test.';
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Handle Edit Test Questions / Details
  const handleSaveEditTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTest) return;

    // Validate
    if (!editingTest.title.trim()) {
      toast.error('Test title is required');
      return;
    }

    for (let i = 0; i < editingTest.questions.length; i++) {
      const q = editingTest.questions[i];
      if (!q.questionText.trim()) {
        toast.error(`Question ${i + 1} statement is empty`);
        return;
      }
      if (q.options.some(opt => !opt.trim())) {
        toast.error(`Question ${i + 1} has empty options`);
        return;
      }
    }

    try {
      setLoading(true);
      // Propagate instruction/duration details inside questions if needed
      const formattedQuestions = editingTest.questions.map(q => ({
        ...q,
        instructions: editingTest.instructions || 'Please answer carefully.',
        testTitle: editingTest.title,
        duration: editingTest.duration
      }));

      const res = await api.put(`/assessments/company/tests/${editingTest.id}`, {
        companyUserId: user?.id,
        questions: formattedQuestions
      });

      if (res.data?.success) {
        toast.success('Assessment updated successfully!');
        setEditingTest(null);
        fetchTestData();
      } else {
        toast.error(res.data?.message || 'Failed to update test');
      }
    } catch (err: any) {
      console.error('Error updating assessment:', err);
      const errMsg = err.response?.data?.message || 'Failed to update assessment test';
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions for new question builder
  const addQuestionField = () => {
    const newQ: Question = {
      id: `q-${Date.now()}-${newQuestions.length}`,
      type: 'MCQ',
      questionText: '',
      options: ['', '', '', ''],
      correctOption: 0,
      points: 10,
      difficulty: 'MEDIUM'
    };
    setNewQuestions([...newQuestions, newQ]);
  };

  const removeQuestionField = (index: number) => {
    if (newQuestions.length === 1) {
      toast.error('At least one question is required');
      return;
    }
    setNewQuestions(newQuestions.filter((_, i) => i !== index));
  };

  const updateNewQuestionField = (index: number, key: keyof Question, value: any) => {
    const updated = [...newQuestions];
    updated[index] = { ...updated[index], [key]: value };
    setNewQuestions(updated);
  };

  const updateNewQuestionOption = (qIndex: number, optIndex: number, value: string) => {
    const updated = [...newQuestions];
    const opts = [...updated[qIndex].options];
    opts[optIndex] = value;
    updated[qIndex] = { ...updated[qIndex], options: opts };
    setNewQuestions(updated);
  };

  // Helper functions for editing existing questions
  const addEditQuestionField = () => {
    if (!editingTest) return;
    const newQ: Question = {
      id: `q-edit-${Date.now()}-${editingTest.questions.length}`,
      type: 'MCQ',
      questionText: '',
      options: ['', '', '', ''],
      correctOption: 0,
      points: 10,
      difficulty: 'MEDIUM'
    };
    setEditingTest({
      ...editingTest,
      questions: [...editingTest.questions, newQ]
    });
  };

  const removeEditQuestionField = (index: number) => {
    if (!editingTest) return;
    if (editingTest.questions.length === 1) {
      toast.error('At least one question is required');
      return;
    }
    setEditingTest({
      ...editingTest,
      questions: editingTest.questions.filter((_, i) => i !== index)
    });
  };

  const updateEditQuestionField = (index: number, key: keyof Question, value: any) => {
    if (!editingTest) return;
    const updated = [...editingTest.questions];
    updated[index] = { ...updated[index], [key]: value };
    setEditingTest({
      ...editingTest,
      questions: updated
    });
  };

  const updateEditQuestionOption = (qIndex: number, optIndex: number, value: string) => {
    if (!editingTest) return;
    const updated = [...editingTest.questions];
    const opts = [...updated[qIndex].options];
    opts[optIndex] = value;
    updated[qIndex] = { ...updated[qIndex], options: opts };
    setEditingTest({
      ...editingTest,
      questions: updated
    });
  };

  // Dynamic calculations for stat cards
  const totalSubmissions = dbTests.reduce((acc, t) => acc + t.submissions_count, 0);
  const totalAssigned = dbTests.reduce((acc, t) => acc + t.assigned_count, 0);
  const globalAverageScore = dbTests.length > 0 
    ? Math.round(dbTests.reduce((acc, t) => acc + t.average_score, 0) / dbTests.length) 
    : 0;

  // Filter lists dynamically
  const filteredDbTests = dbTests.filter(test => {
    const matchesSearch = 
      test.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.job_title.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesJob = selectedJobFilter === 'all' || String(test.job_id) === selectedJobFilter;
    const matchesStatus = selectedStatusFilter === 'all' || test.status.toLowerCase() === selectedStatusFilter.toLowerCase();

    let matchesDate = true;
    if (dateFrom || dateTo) {
      const testDate = new Date(test.created_date);
      if (dateFrom && testDate < new Date(dateFrom)) matchesDate = false;
      if (dateTo && testDate > new Date(dateTo + 'T23:59:59')) matchesDate = false;
    }

    return matchesSearch && matchesJob && matchesStatus && matchesDate;
  });

  return (
    <div className="space-y-5 w-full max-w-[1550px] mx-auto px-2 sm:px-4 lg:px-6" id="company-assessments-container">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight italic">
            Placement <span className="text-indigo-600">Assessments</span>
          </h1>
          <p className="text-slate-500 font-medium text-xs sm:text-sm">Design automated assessment rules, evaluate candidate MCQs, and track participant standings.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-xl font-bold transition-all text-sm cursor-pointer ${activeTab === 'list' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
          >
            Manage Tests
          </button>
          <button
            onClick={() => setActiveTab('builder')}
            className={`px-4 py-2 rounded-xl font-bold transition-all text-sm flex items-center gap-1.5 cursor-pointer ${activeTab === 'builder' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
          >
            <Plus size={16} />
            Create Test
          </button>
          <button
            onClick={() => setActiveTab('attempts')}
            className={`px-4 py-2 rounded-xl font-bold transition-all text-sm cursor-pointer ${activeTab === 'attempts' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
          >
            History & Scores
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-orange-50 text-orange-600">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Tests</p>
            <p className="text-2xl font-black text-slate-800">{dbTests.length}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Submissions</p>
            <p className="text-2xl font-black text-slate-800">{totalSubmissions}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <Users size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Assigned</p>
            <p className="text-2xl font-black text-slate-800">{totalAssigned}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
            <Target size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Avg MCQ Score</p>
            <p className="text-2xl font-black text-slate-800">{globalAverageScore}%</p>
          </div>
        </div>
      </div>

      {activeTab === 'list' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-700 font-extrabold text-xs uppercase tracking-wider">
                <Filter size={14} className="text-indigo-600" />
                Filter Assessments History
              </div>
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setSelectedJobFilter('all');
                  setSelectedStatusFilter('all');
                  setDateFrom('');
                  setDateTo('');
                }}
                className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase cursor-pointer"
              >
                Reset Filters
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {/* Search input */}
              <div className="relative md:col-span-2">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by test title or job title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Job filter dropdown */}
              <div>
                <select
                  value={selectedJobFilter}
                  onChange={(e) => setSelectedJobFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="all">All Jobs</option>
                  {jobs.map(j => (
                    <option key={j.id} value={j.id}>{j.title}</option>
                  ))}
                </select>
              </div>

              {/* Status filter */}
              <div>
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              {/* Date Inputs Toggle/Container */}
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={dateFrom}
                  title="Created Date From"
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-semibold text-slate-700 outline-none"
                />
                <span className="text-[10px] text-slate-400 font-bold uppercase">To</span>
                <input
                  type="date"
                  value={dateTo}
                  title="Created Date To"
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-semibold text-slate-700 outline-none"
                />
              </div>
            </div>
          </div>

          {/* List layout */}
          {loading ? (
            <div className="py-24 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-slate-500 text-sm font-bold">Synchronizing assessments with database...</p>
            </div>
          ) : filteredDbTests.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
              <AlertCircle className="mx-auto text-slate-300 mb-2" size={48} />
              <h3 className="text-lg font-bold text-slate-800">No Assessment Records Found</h3>
              <p className="text-slate-500 text-sm mt-1">Try resetting filters or create a new test to launch your evaluation pipeline!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredDbTests.map(item => {
                // calculate total points
                const totalPoints = item.questions?.reduce((sum, q) => sum + (q.points || 0), 0) || 0;
                
                return (
                  <div key={item.id} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col justify-between hover:border-slate-200 hover:shadow-md transition-all">
                    <div>
                      <div className="flex justify-between items-start gap-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                          {item.job_title}
                        </span>
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${item.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {item.status}
                        </span>
                      </div>
                      <h3 className="text-xl font-extrabold text-slate-900 mt-3 tracking-tight">{item.title}</h3>
                      <p className="text-xs text-slate-400 font-bold mt-1">
                        Created by <span className="text-slate-600">{item.created_by}</span> on {item.created_date}
                      </p>

                      <div className="grid grid-cols-3 gap-2 mt-6 p-3 bg-slate-50 rounded-2xl text-center">
                        <div>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Questions</p>
                          <p className="text-sm font-black text-slate-800">{item.questions_count}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total Marks</p>
                          <p className="text-sm font-black text-slate-800">{totalPoints} pts</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Time Limit</p>
                          <p className="text-sm font-black text-slate-800">{item.duration}m</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-2 p-3 bg-[#f8fafd] rounded-2xl text-center border border-slate-50">
                        <div>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Assigned</p>
                          <p className="text-sm font-black text-indigo-600">{item.assigned_count} candidates</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Submissions</p>
                          <p className="text-sm font-black text-emerald-600">{item.submissions_count} submissions</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Avg score</p>
                          <p className="text-sm font-black text-slate-800">{item.average_score}%</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex gap-2 pt-4 border-t border-slate-100">
                      <button
                        onClick={() => setViewingTest(item)}
                        className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Eye size={12} /> View Details
                      </button>
                      <button
                        onClick={() => setEditingTest(item)}
                        className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Edit3 size={12} /> Edit Test
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'builder' && (
        <form onSubmit={handleCreateTestSubmit} className="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Assessment Protocol Builder</h2>
            <p className="text-xs text-slate-500 font-medium">Link evaluation parameters and customize multiple-choice questions for specific jobs.</p>
          </div>

          {workflowError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-red-700 font-bold text-xs">
                <AlertCircle size={16} />
                <span>{workflowError} (Status: {workflowState})</span>
              </div>
              <div className="flex items-center gap-2">
                {workflowState === 'DRAFT_CREATED' && createdAssessmentId && (
                  <button
                    type="button"
                    onClick={() => handleRetryPublish(createdAssessmentId)}
                    disabled={loading}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Retry Publish
                  </button>
                )}
                {(workflowState === 'PUBLISHED_UNASSIGNED' || workflowState === 'ASSIGNMENT_FAILED') && createdAssessmentId && (
                  <button
                    type="button"
                    onClick={() => handleRetryAssign(createdAssessmentId)}
                    disabled={loading}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Retry Assignment
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Target Job Listing</label>
              <select
                value={newJobId}
                onChange={(e) => setNewJobId(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-semibold text-sm outline-none focus:border-indigo-500 transition-colors text-slate-800"
              >
                <option value="">-- Select Job --</option>
                {jobs.map(j => (
                  <option key={j.id} value={j.id}>{j.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Target Pipeline Stage/Phase</label>
              <select
                value={newStageId}
                onChange={(e) => setNewStageId(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-semibold text-sm outline-none focus:border-indigo-500 transition-colors text-slate-800"
              >
                <option value="">-- Select Stage/Phase --</option>
                {selectedJobStages.map(stg => (
                  <option key={stg.id} value={stg.id}>{stg.stage_name} ({stg.stage_type})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Test Display Title</label>
              <input
                type="text"
                placeholder="e.g. JavaScript Coding & Logic Test"
                value={newTestTitle}
                onChange={(e) => setNewTestTitle(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-semibold text-sm outline-none focus:border-indigo-500 transition-colors text-slate-800"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Duration (Minutes)</label>
              <input
                type="number"
                min={5}
                max={180}
                value={newDuration}
                onChange={(e) => setNewDuration(parseInt(e.target.value) || 30)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-semibold text-sm outline-none focus:border-indigo-500 transition-colors text-slate-800"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Assignment Cutoff Score (Passing Mark)</label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={newQuestions.reduce((acc, q) => acc + (Number(q.points) || 10), 0) - 1 || 100}
                  value={newCutoffScore}
                  onChange={(e) => setNewCutoffScore(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-semibold text-sm outline-none focus:border-indigo-500 transition-colors text-slate-800"
                />
                <span className="absolute right-3 top-3 text-xs font-bold text-slate-400">
                  Total: {newQuestions.reduce((acc, q) => acc + (Number(q.points) || 10), 0)} pts
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                Must be strictly less than total score ({newQuestions.reduce((acc, q) => acc + (Number(q.points) || 10), 0)} pts).
              </p>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Topic Focus / Category</label>
              <input
                type="text"
                placeholder="e.g. Data Structures & Algorithms"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-semibold text-sm outline-none focus:border-indigo-500 transition-colors text-slate-800"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Instructions for Candidate</label>
              <textarea
                rows={2}
                placeholder="Instructions displayed to candidates before starting the test..."
                value={newInstructions}
                onChange={(e) => setNewInstructions(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-semibold text-sm outline-none focus:border-indigo-500 transition-colors text-slate-800"
              />
            </div>
          </div>

          {/* Questions Editor Header */}
          <div className="flex justify-between items-center pt-6 border-t border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-800">MCQ Questions Setup ({newQuestions.length})</h3>
              <p className="text-xs text-slate-500">Provide direct MCQs with corresponding weight points and difficulty parameters.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowBulkImportModal(true)}
                className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer border border-emerald-200"
              >
                <Upload size={14} /> Bulk Import Questions
              </button>
              <button
                type="button"
                onClick={addQuestionField}
                className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus size={14} /> Add Question
              </button>
            </div>
          </div>

          {/* Questions Fields Map */}
          <div className="space-y-6">
            {newQuestions.map((q, qIndex) => (
              <div key={q.id} className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    Question #{qIndex + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeQuestionField(qIndex)}
                    className="text-slate-400 hover:text-red-500 transition-all p-1 cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Question Text</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Which of the following is not a primitive data type in JS?"
                    value={q.questionText}
                    onChange={(e) => updateNewQuestionField(qIndex, 'questionText', e.target.value)}
                    required
                    className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3 font-medium text-sm outline-none focus:border-indigo-500 text-slate-800"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                    Option Choices (Exactly 4 choices)
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {q.options.map((opt, optIndex) => (
                      <div key={optIndex} className="flex items-center bg-white rounded-xl border border-slate-100 px-3 py-1.5 gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 font-black text-xs flex items-center justify-center shrink-0">
                          {String.fromCharCode(65 + optIndex)}
                        </span>
                        <input
                          type="text"
                          placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                          value={opt}
                          onChange={(e) => updateNewQuestionOption(qIndex, optIndex, e.target.value)}
                          required
                          className="bg-transparent border-none outline-none w-full text-slate-800 text-xs font-semibold placeholder-slate-400 py-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100/60 space-y-2">
                  <label className="text-[10px] font-black text-indigo-900 uppercase tracking-wider block">
                    Correct Answer
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                    {[0, 1, 2, 3].map((optIndex) => (
                      <label
                        key={optIndex}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all text-xs font-bold ${
                          q.correctOption === optIndex
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`new-correct-for-q-${q.id || qIndex}`}
                          checked={q.correctOption === optIndex}
                          onChange={() => updateNewQuestionField(qIndex, 'correctOption', optIndex)}
                          className="text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span className="font-extrabold">{String.fromCharCode(65 + optIndex)}</span> — <span className="truncate">{q.options[optIndex] || `Option ${String.fromCharCode(65 + optIndex)}`}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Points/Marks</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={q.points}
                      onChange={(e) => updateNewQuestionField(qIndex, 'points', parseInt(e.target.value) || 10)}
                      required
                      className="w-full bg-white border border-slate-100 rounded-xl px-4 py-2 font-semibold text-sm outline-none text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Difficulty</label>
                    <select
                      value={q.difficulty || 'MEDIUM'}
                      onChange={(e) => updateNewQuestionField(qIndex, 'difficulty', e.target.value)}
                      className="w-full bg-white border border-slate-100 rounded-xl px-4 py-2.5 font-semibold text-sm outline-none text-slate-800"
                    >
                      <option value="EASY">Easy</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HARD">Hard</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className="px-6 py-3 border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-colors text-sm cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save size={18} /> {loading ? "Publishing..." : "Publish Assessment"}
            </button>
          </div>
        </form>
      )}

      {activeTab === 'attempts' && (
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm overflow-hidden space-y-4">
          <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Candidate History & Scores</h2>
              <p className="text-xs text-slate-500 font-medium">Verified database records of student assessment attempts and integrity status.</p>
            </div>
            <button
              onClick={fetchTestData}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              Refresh Scores
            </button>
          </div>

          {attempts.length === 0 ? (
            <div className="p-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-3">
              <Users size={36} className="mx-auto text-slate-300" />
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">No Submissions Recorded</h3>
              <p className="text-xs text-slate-400 font-medium max-w-md mx-auto">
                Candidates moved to the Assessment stage for your company's active jobs will complete tests and their evaluated scores will automatically appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="py-3 px-4 text-[10px] uppercase font-black text-slate-400 tracking-wider">Candidate Name</th>
                    <th className="py-3 px-4 text-[10px] uppercase font-black text-slate-400 tracking-wider">Applied Position</th>
                    <th className="py-3 px-4 text-[10px] uppercase font-black text-slate-400 tracking-wider text-center">Cutoff & Total</th>
                    <th className="py-3 px-4 text-[10px] uppercase font-black text-slate-400 tracking-wider text-center">Score Earned</th>
                    <th className="py-3 px-4 text-[10px] uppercase font-black text-slate-400 tracking-wider text-center">Result Status</th>
                    <th className="py-3 px-4 text-[10px] uppercase font-black text-slate-400 tracking-wider text-right">Completion Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {attempts.map(att => {
                    const cutoff = att.cutoffScore !== undefined ? att.cutoffScore : (att.passingScore || 40);
                    const isPassed = att.isPassed !== undefined ? att.isPassed : (att.status === 'Passed' || att.score >= cutoff);

                    return (
                      <tr key={att.id} className="hover:bg-slate-50/50">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900 text-sm">{att.candidateName}</p>
                          {att.candidateEmail && <p className="text-[11px] text-slate-400 font-medium">{att.candidateEmail}</p>}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-600 text-sm">{att.jobTitle || att.assessmentTitle}</td>
                        <td className="py-3.5 px-4 text-center text-xs font-semibold text-slate-600">
                          Cutoff: <span className="font-bold text-indigo-600">{cutoff}</span> / {att.totalMarks || 100}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`font-mono font-black text-sm ${isPassed ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {att.score} pts ({att.percentage || 0}%)
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${isPassed ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                            {isPassed ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                            {isPassed ? 'Passed' : 'Failed'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right text-xs text-slate-400 font-bold">{att.completedAt}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- MODAL A: VIEW DETAILS --- */}
      {viewingTest && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-slate-100 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/80">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  {viewingTest.job_title}
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-2">{viewingTest.title}</h3>
                <p className="text-xs text-slate-400 font-bold">Created: {viewingTest.created_date}</p>
              </div>
              <button 
                onClick={() => setViewingTest(null)}
                className="p-1.5 hover:bg-slate-150 rounded-xl text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
              {viewingTest.instructions && (
                <div className="p-4 bg-amber-50/65 rounded-2xl border border-amber-100/50">
                  <p className="text-[10px] font-black uppercase text-amber-800 tracking-wider flex items-center gap-1">
                    <HelpCircle size={12} /> Test Instructions
                  </p>
                  <p className="text-xs text-amber-900/80 font-semibold mt-1 leading-relaxed">{viewingTest.instructions}</p>
                </div>
              )}

              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-1.5">
                  Questions Pool ({viewingTest.questions?.length || 0})
                </h4>
                {viewingTest.questions?.map((q, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100/50 space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <span>Question #{idx + 1}</span>
                      <div className="flex gap-1.5">
                        <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded">{q.points || 10} pts</span>
                        {q.difficulty && <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{q.difficulty}</span>}
                      </div>
                    </div>
                    <p className="text-sm font-bold text-slate-900 leading-snug">{q.questionText}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
                      {q.options?.map((opt, optIdx) => (
                        <div 
                          key={optIdx} 
                          className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                            q.correctOption === optIdx 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                              : 'bg-white border-slate-100 text-slate-600'
                          }`}
                        >
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${
                            q.correctOption === optIdx 
                              ? 'bg-emerald-500 text-white' 
                              : 'bg-slate-100 text-slate-400'
                          }`}>
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="truncate">{opt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setViewingTest(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL B: EDIT TEST --- */}
      {editingTest && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleSaveEditTest}
            className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-100 flex flex-col"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/80">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  Edit Assessment
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-1">Configure Assessment Content</h3>
                <p className="text-xs text-slate-400 font-bold">Submissions checking: Submissions lock editing to preserve historical integrity.</p>
              </div>
              <button 
                type="button"
                onClick={() => setEditingTest(null)}
                className="p-1.5 hover:bg-slate-150 rounded-xl text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Test Title</label>
                  <input
                    type="text"
                    value={editingTest.title}
                    onChange={(e) => setEditingTest({ ...editingTest, title: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 font-semibold text-xs outline-none focus:border-indigo-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Duration (Minutes)</label>
                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={editingTest.duration}
                    onChange={(e) => setEditingTest({ ...editingTest, duration: parseInt(e.target.value) || 30 })}
                    required
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 font-semibold text-xs outline-none focus:border-indigo-500 text-slate-800"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Instructions</label>
                  <textarea
                    rows={2}
                    value={editingTest.instructions || ''}
                    onChange={(e) => setEditingTest({ ...editingTest, instructions: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 font-semibold text-xs outline-none focus:border-indigo-500 text-slate-800"
                  />
                </div>
              </div>

              {/* Questions Area */}
              <div className="space-y-4 pt-4 border-t border-slate-150">
                <div className="flex justify-between items-center pb-2">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Questions List ({editingTest.questions?.length || 0})
                  </h4>
                  <button
                    type="button"
                    onClick={addEditQuestionField}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold rounded-lg text-[10px] transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={12} /> Add Question
                  </button>
                </div>

                <div className="space-y-5">
                  {editingTest.questions?.map((q, qIndex) => (
                    <div key={q.id || qIndex} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          Question #{qIndex + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeEditQuestionField(qIndex)}
                          className="text-slate-400 hover:text-red-500 transition-all p-1 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Question Statement</label>
                        <textarea
                          rows={2}
                          value={q.questionText}
                          onChange={(e) => updateEditQuestionField(qIndex, 'questionText', e.target.value)}
                          required
                          className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2 font-medium text-xs outline-none focus:border-indigo-500 text-slate-800"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Option Choices (Exactly 4 choices)</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {q.options?.map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center bg-white rounded-xl border border-slate-100 px-2.5 py-1 gap-2">
                              <span className="w-5 h-5 rounded bg-indigo-50 text-indigo-600 font-black text-[10px] flex items-center justify-center shrink-0">
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => updateEditQuestionOption(qIndex, optIdx, e.target.value)}
                                required
                                className="bg-transparent border-none outline-none w-full text-slate-800 text-xs font-semibold py-0.5"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/60 space-y-1.5">
                        <label className="text-[9px] font-black text-indigo-900 uppercase tracking-wider block">
                          Correct Answer
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-1.5">
                          {[0, 1, 2, 3].map((optIdx) => (
                            <label
                              key={optIdx}
                              className={`flex items-center gap-1.5 p-2 rounded-lg border cursor-pointer transition-all text-xs font-bold ${
                                q.correctOption === optIdx
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`edit-correct-for-q-${q.id || qIndex}`}
                                checked={q.correctOption === optIdx}
                                onChange={() => updateEditQuestionField(qIndex, 'correctOption', optIdx)}
                                className="text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              />
                              <span className="font-extrabold">{String.fromCharCode(65 + optIdx)}</span> — <span className="truncate">{q.options[optIdx] || `Option ${String.fromCharCode(65 + optIdx)}`}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Marks/Points</label>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={q.points}
                            onChange={(e) => updateEditQuestionField(qIndex, 'points', parseInt(e.target.value) || 10)}
                            required
                            className="w-full bg-white border border-slate-100 rounded-xl px-3 py-1.5 font-semibold text-xs outline-none text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Difficulty</label>
                          <select
                            value={q.difficulty || 'MEDIUM'}
                            onChange={(e) => updateEditQuestionField(qIndex, 'difficulty', e.target.value)}
                            className="w-full bg-white border border-slate-100 rounded-xl px-3 py-1.5 font-semibold text-xs outline-none text-slate-800"
                          >
                            <option value="EASY">Easy</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HARD">Hard</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingTest(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Save size={12} /> {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- MODAL C: BULK IMPORT QUESTIONS --- */}
      {showBulkImportModal && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-slate-100 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <Upload size={18} className="text-emerald-600" /> Bulk Import Question Bank
                </h3>
                <p className="text-xs text-slate-500 font-medium">Import MCQs via CSV, JSON, TXT, XLSX, DOCX, or structured text format.</p>
              </div>
              <button 
                onClick={() => { setShowBulkImportModal(false); setBulkImportPreview(null); setBulkRawText(''); }}
                className="p-1.5 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Template Download & Format Guide */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">Format Standard</span>
                  <p className="text-xs text-slate-600 font-medium">CSV Format: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-800 text-[11px]">Question, Option A, Option B, Option C, Option D, Correct Option (A/B/C/D)</code></p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(
                      "Question Text,Option A,Option B,Option C,Option D,Correct Option,Points,Difficulty\n" +
                      "What is the time complexity of binary search?,O(n),O(log n),O(n^2),O(1),B,10,EASY\n" +
                      "Which keyword declares a block-scoped variable in JS?,var,let,global,define,B,10,MEDIUM"
                    );
                    const link = document.createElement("a");
                    link.setAttribute("href", csvContent);
                    link.setAttribute("download", "assessment_questions_template.csv");
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  <FileText size={14} className="text-emerald-600" /> Download CSV Template
                </button>
              </div>

              {/* Raw Text Input */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Paste Raw Content (CSV / JSON / Text)</label>
                <textarea
                  rows={6}
                  placeholder={`Paste content here...\nExample:\nWhat is SQL?,Structured Query Language,Sequential Query Logic,Server Quality Language,System Query List,A,10,EASY`}
                  value={bulkRawText}
                  onChange={(e) => setBulkRawText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-mono outline-none focus:border-indigo-500 text-slate-800"
                />
              </div>

              <div className="flex justify-between items-center pt-1">
                <button
                  type="button"
                  disabled={!bulkRawText.trim() || loading}
                  onClick={async () => {
                    try {
                      setLoading(true);
                      const res = await api.post('/assessments/company/bulk-import-questions', {
                        rawText: bulkRawText
                      });
                      if (res.data?.success && Array.isArray(res.data.questions)) {
                        setBulkImportPreview(res.data.questions);
                        toast.success(`Extracted ${res.data.questions.length} questions for preview.`);
                      } else {
                        toast.error(res.data?.message || 'Failed to parse questions.');
                      }
                    } catch (err: any) {
                      toast.error(err.response?.data?.message || 'Error parsing bulk questions.');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Search size={14} /> Parse & Preview
                </button>
              </div>

              {/* Preview Table */}
              {bulkImportPreview && (
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-600" /> Validated Preview ({bulkImportPreview.length} Questions)
                  </h4>
                  <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                    {bulkImportPreview.map((pq, idx) => (
                      <div key={idx} className="p-3 text-xs space-y-1.5 bg-slate-50/50">
                        <div className="flex justify-between font-bold text-slate-800">
                          <span>#{idx + 1}. {pq.questionText}</span>
                          <span className="text-indigo-600">{pq.points || 10} pts</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600">
                          {pq.options.map((opt, oIdx) => (
                            <div key={oIdx} className={`px-2 py-0.5 rounded border ${oIdx === pq.correctOption ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold' : 'bg-white border-slate-150'}`}>
                              {String.fromCharCode(65 + oIdx)}. {opt} {oIdx === pq.correctOption ? '✓' : ''}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowBulkImportModal(false); setBulkImportPreview(null); setBulkRawText(''); }}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!bulkImportPreview || bulkImportPreview.length === 0}
                onClick={() => {
                  if (bulkImportPreview && bulkImportPreview.length > 0) {
                    setNewQuestions(prev => [...prev, ...bulkImportPreview]);
                    toast.success(`Appended ${bulkImportPreview.length} questions to assessment!`);
                    setShowBulkImportModal(false);
                    setBulkImportPreview(null);
                    setBulkRawText('');
                  }
                }}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Plus size={14} /> Confirm & Append Questions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
