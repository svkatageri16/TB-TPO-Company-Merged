import React, { useState, useEffect } from 'react';
import { Plus, FileText, Clock, Target, Users, Search, Brain, Activity, Settings, LayoutGrid, Eye, Edit, Trash2, X, Check } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import AssessmentWizard from './assessments/AssessmentWizard';
import QuestionBank from './assessments/QuestionBank';
import LiveMonitoring from './assessments/LiveMonitoring';

export default function TPOAssessments() {
  const [activeView, setActiveView] = useState<'DASHBOARD' | 'WIZARD' | 'QUESTION_BANK' | 'LIVE_MONITORING'>('DASHBOARD');
  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedTestDetails, setSelectedTestDetails] = useState<any | null>(null);
  const [fetchingDetails, setFetchingDetails] = useState(false);

  useEffect(() => {
    if (activeView === 'DASHBOARD') {
      fetchTests();
    }
  }, [activeView]);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tpo/tests');
      if (res.data.success) setTests(res.data.data);
    } catch (error) {
      toast.error('Failed to fetch tests');
    } finally {
      setLoading(false);
    }
  };

  const handleMonitor = (testId: string) => {
    setActiveTestId(testId);
    setActiveView('LIVE_MONITORING');
  };

  const handleViewDetails = async (testId: string) => {
    setFetchingDetails(true);
    try {
      const res = await api.get(`/assessments/tests/${testId}`);
      if (res.data.success) {
        setSelectedTestDetails(res.data.test);
      } else {
        toast.error('Failed to load test details');
      }
    } catch (err) {
      toast.error('Failed to load test details');
    } finally {
      setFetchingDetails(false);
    }
  };

  const handlePublishTest = async (testId: string) => {
    try {
      const res = await api.post(`/assessments/tests/${testId}/publish`);
      if (res.data.success) {
        toast.success(res.data.message || 'Assessment published successfully!');
        fetchTests();
      } else {
        toast.error(res.data.message || 'Failed to publish assessment');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error publishing assessment');
    }
  };

  const handleDeleteTest = async (testId: string) => {
    if (!window.confirm('Are you absolutely sure you want to delete this assessment? This action cannot be undone and will delete all associated questions, assignments, and results.')) {
      return;
    }
    try {
      const res = await api.delete(`/assessments/tests/${testId}`);
      if (res.data.success) {
        toast.success('Assessment deleted successfully');
        fetchTests();
        if (selectedTestDetails?.id === testId) {
          setSelectedTestDetails(null);
        }
      } else {
        toast.error('Failed to delete assessment');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete assessment');
    }
  };

  const filteredTests = tests.filter(test => 
    (test.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (test.category || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (activeView === 'WIZARD') {
    return (
      <AssessmentWizard 
        onComplete={() => { setActiveView('DASHBOARD'); setActiveTestId(null); }}
        onCancel={() => { setActiveView('DASHBOARD'); setActiveTestId(null); }}
        editTestId={activeTestId}
      />
    );
  }

  if (activeView === 'QUESTION_BANK') {
    return (
      <div className="space-y-6">
         <div className="flex gap-4 border-b border-slate-200 pb-2">
            <button onClick={() => setActiveView('DASHBOARD')} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-900 uppercase tracking-widest transition-colors">Dashboard</button>
            <button className="px-4 py-2 text-sm font-bold text-blue-600 border-b-2 border-blue-600 uppercase tracking-widest">Question Bank</button>
         </div>
         <QuestionBank />
      </div>
    );
  }

  if (activeView === 'LIVE_MONITORING' && activeTestId) {
    return (
      <LiveMonitoring 
        assessmentId={activeTestId} 
        onBack={() => { setActiveView('DASHBOARD'); setActiveTestId(null); }} 
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Header & Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Assessment Management</h1>
          <p className="text-sm font-bold text-slate-500 mt-1">Enterprise testing & evaluation engine</p>
        </div>
        <div className="flex gap-3">
           <button 
             onClick={() => setActiveView('QUESTION_BANK')}
             className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 transition-all"
           >
             <Brain size={18} className="text-purple-500" />
             Question Bank
           </button>
           <button 
             onClick={() => { setActiveTestId(null); setActiveView('WIZARD'); }}
             className="flex items-center gap-2 px-6 py-3 bg-blue-600 rounded-2xl font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
           >
             <Plus size={18} />
             Create Assessment
           </button>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center"><Target size={24} /></div>
          <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Tests</p><h3 className="text-2xl font-black text-slate-900 leading-none">{tests.length}</h3></div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center"><Activity size={24} /></div>
          <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Now</p><h3 className="text-2xl font-black text-slate-900 leading-none">{tests.filter(t => t.status === 'ONGOING').length}</h3></div>
        </div>
      </div>

      {/* Tests Grid */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-6 space-y-6">
        <div className="flex justify-between items-center">
           <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest flex items-center gap-2"><LayoutGrid className="text-blue-600" /> All Assessments</h3>
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
             <input 
               type="text" 
               placeholder="Search tests..." 
               value={searchQuery}
               onChange={e => setSearchQuery(e.target.value)}
               className="pl-10 pr-4 py-2 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-semibold text-sm w-64" 
             />
           </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-sm">Loading Data...</div>
          ) : filteredTests.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <FileText size={48} className="mx-auto text-slate-200 mb-4" />
              <h3 className="text-lg font-bold text-slate-900">No Assessments Found</h3>
              <p className="text-slate-500 font-semibold mt-1">{searchQuery ? 'Try matching another search query.' : 'Create your first assessment to get started.'}</p>
            </div>
          ) : (
            filteredTests.map(test => (
              <div 
                key={test.id} 
                className="bg-slate-50 rounded-2xl p-6 border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all group flex flex-col justify-between cursor-pointer"
                onClick={() => handleViewDetails(test.id)}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                      test.status === 'ONGOING' ? 'bg-green-100 text-green-700' :
                      test.status === 'COMPLETED' ? 'bg-slate-200 text-slate-600' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {test.status}
                    </span>
                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                      <Clock size={14} /> {test.duration_minutes}m
                    </span>
                  </div>
                  <h3 className="font-black text-slate-900 text-lg mb-2 group-hover:text-blue-600 transition-colors">{test.title}</h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-[10px] font-bold text-slate-500">{test.category}</span>
                    <span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-[10px] font-bold text-slate-500">{test.max_marks} Marks</span>
                  </div>
                </div>
                
                <div 
                  className="flex justify-between items-center pt-4 border-t border-slate-200 mt-4"
                  onClick={e => e.stopPropagation()} // Prevent card click triggering details when clicking buttons
                >
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleViewDetails(test.id)}
                      className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      onClick={() => { setActiveTestId(test.id); setActiveView('WIZARD'); }}
                      className="text-slate-400 hover:text-amber-600 transition-colors p-1"
                      title="Edit Assessment"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteTest(test.id)}
                      className="text-slate-400 hover:text-red-600 transition-colors p-1"
                      title="Delete Assessment"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  {test.status === 'DRAFT' ? (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handlePublishTest(test.id); }}
                      className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-xl transition-colors flex items-center gap-2"
                    >
                      Publish <Check size={14} />
                    </button>
                  ) : (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleMonitor(test.id); }}
                      className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-colors flex items-center gap-2"
                    >
                      Monitor <Activity size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Loading overlay for fetching details */}
      {fetchingDetails && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-3xl shadow-xl flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="font-bold text-slate-700 text-sm">Fetching Test Details...</span>
          </div>
        </div>
      )}

      {/* Beautiful details modal */}
      {selectedTestDetails && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase inline-block mb-1 ${
                  selectedTestDetails.status === 'ONGOING' ? 'bg-green-100 text-green-700' :
                  selectedTestDetails.status === 'COMPLETED' ? 'bg-slate-200 text-slate-600' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {selectedTestDetails.status}
                </span>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{selectedTestDetails.title}</h3>
                <p className="text-xs font-bold text-slate-400 mt-0.5">Category: <span className="text-slate-600">{selectedTestDetails.category}</span></p>
              </div>
              <button onClick={() => setSelectedTestDetails(null)} className="text-slate-400 hover:text-slate-600 p-1"><X size={24} /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Test Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Duration</span>
                  <span className="text-sm font-black text-slate-800 flex items-center gap-1 mt-0.5"><Clock size={16} className="text-blue-500" /> {selectedTestDetails.duration_minutes} mins</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Max Marks</span>
                  <span className="text-sm font-black text-slate-800 flex items-center gap-1 mt-0.5"><Target size={16} className="text-green-500" /> {selectedTestDetails.max_marks} Marks</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Passing Marks</span>
                  <span className="text-sm font-black text-slate-800 flex items-center gap-1 mt-0.5"><Check size={16} className="text-purple-500" /> {selectedTestDetails.passing_marks} Marks</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Proctoring</span>
                  <span className="text-xs font-black text-slate-800 block mt-1.5 uppercase tracking-wider">{selectedTestDetails.webcam_monitoring ? '✅ ENABLED' : '❌ DISABLED'}</span>
                </div>
              </div>

              {/* Description & Timing */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                {selectedTestDetails.description && (
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</h4>
                    <p className="text-sm font-semibold text-slate-700 mt-1">{selectedTestDetails.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Test Date</h4>
                    <p className="text-sm font-black text-slate-800 mt-1">{selectedTestDetails.test_date ? new Date(selectedTestDetails.test_date).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Start Time</h4>
                    <p className="text-sm font-black text-slate-800 mt-1">{selectedTestDetails.start_time || 'N/A'}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned Batch</h4>
                    <p className="text-sm font-black text-slate-800 mt-1 uppercase">{selectedTestDetails.batches && selectedTestDetails.batches.length > 0 ? selectedTestDetails.batches.join(', ') : 'All Batches'}</p>
                  </div>
                </div>
              </div>

              {/* Questions Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">Questions ({selectedTestDetails.questions?.length || 0})</h4>
                {!selectedTestDetails.questions || selectedTestDetails.questions.length === 0 ? (
                  <p className="text-sm font-bold text-slate-400 text-center py-6">No questions added to this test.</p>
                ) : (
                  <div className="space-y-4">
                    {selectedTestDetails.questions.map((q: any, idx: number) => (
                      <div key={q.id || idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[9px] font-black uppercase rounded">{q.question_type}</span>
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[9px] font-black uppercase rounded">{q.difficulty}</span>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-black uppercase rounded">{q.marks} Marks</span>
                          {q.topic && <span className="text-[10px] font-bold text-slate-400 ml-auto">#{q.topic}</span>}
                        </div>
                        <p className="font-bold text-slate-800 text-sm mb-3">{idx + 1}. {q.question_text}</p>
                        {q.question_type === 'MCQ' && q.options && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {q.options.map((opt: string, oIdx: number) => {
                              const isCorrect = q.correct_answers && q.correct_answers.includes(oIdx);
                              return (
                                <div key={oIdx} className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center justify-between ${
                                  isCorrect ? 'bg-green-50 border-green-200 text-green-800 font-extrabold' : 'bg-white border-slate-100 text-slate-600'
                                }`}>
                                  <span>{opt}</span>
                                  {isCorrect && <Check size={14} className="text-green-600 shrink-0" />}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    const testId = selectedTestDetails.id;
                    setSelectedTestDetails(null);
                    setActiveTestId(testId);
                    setActiveView('WIZARD');
                  }} 
                  className="px-5 py-2.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                >
                  <Edit size={14} /> Edit Assessment
                </button>
                <button 
                  onClick={() => handleDeleteTest(selectedTestDetails.id)} 
                  className="px-5 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 size={14} /> Delete Assessment
                </button>
              </div>
              <button onClick={() => setSelectedTestDetails(null)} className="px-6 py-2.5 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 text-xs uppercase tracking-wider">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

