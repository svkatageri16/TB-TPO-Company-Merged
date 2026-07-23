import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, Settings, Users, Brain, Calendar, FileText, CheckCircle2, Plus, UploadCloud, X, Trash2, Search } from 'lucide-react';
import api from '../../../services/api';
import { toast } from 'react-hot-toast';
import Papa from 'papaparse';

export default function AssessmentWizard({ onComplete, onCancel, editTestId }: { onComplete: () => void, onCancel: () => void, editTestId?: string | null }) {
  const [step, setStep] = useState(1);
  const [colleges, setColleges] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Aptitude',
    difficulty: 'Medium',
    duration_minutes: 60,
    max_marks: 100,
    passing_marks: 40,
    negative_marking: 0,
    webcam_monitoring: false,
    randomize_questions: true,
    test_date: '',
    start_time: '',
    late_join_window: 10,
    college_id: '',
    batch_name: ''
  });

  const [questions, setQuestions] = useState<any[]>([]);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  
  const [manualQ, setManualQ] = useState({
    question_text: '',
    question_type: 'MCQ',
    options: ['','','',''],
    correct_answers: [0],
    marks: 1,
    difficulty: 'Medium',
    topic: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchColleges();
    if (editTestId) {
      loadTestDetails();
    }
  }, [editTestId]);

  const loadTestDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/assessments/tests/${editTestId}`);
      if (res.data.success) {
        const test = res.data.test;
        setFormData({
          title: test.title || '',
          description: test.description || '',
          category: test.category || 'Aptitude',
          difficulty: test.difficulty || 'Medium',
          duration_minutes: test.duration_minutes || 60,
          max_marks: test.max_marks || 100,
          passing_marks: test.passing_marks || 40,
          negative_marking: test.negative_marking || 0,
          webcam_monitoring: test.webcam_monitoring ? true : false,
          randomize_questions: test.randomize_questions ? true : false,
          test_date: test.test_date ? new Date(test.test_date).toISOString().split('T')[0] : '',
          start_time: test.start_time || '',
          late_join_window: test.late_join_window || 10,
          college_id: test.college_id ? String(test.college_id) : '',
          batch_name: test.batches && test.batches.length > 0 ? test.batches[0] : ''
        });
        if (test.college_id) {
          fetchBatches(test.college_id);
        }
        setQuestions(test.questions || []);
      }
    } catch (e) {
      toast.error('Failed to load test details for editing');
    } finally {
      setLoading(false);
    }
  };

  const fetchColleges = async () => {
    try {
      const res = await api.get('/tpo/colleges');
      if (res.data.success) setColleges(res.data.data);
    } catch (e) {}
  };

  const fetchBatches = async (collegeId: string) => {
    try {
      const res = await api.get(`/tpo/batches?college_id=${collegeId}`);
      if (res.data.success) setBatches(res.data.data);
    } catch (e) {}
  };

  const handleCollegeSelect = (val: string) => {
    setFormData({...formData, college_id: val, batch_name: ''});
    if (val) fetchBatches(val);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        ...formData,
        webcam_monitoring: formData.webcam_monitoring ? 1 : 0,
        randomize_questions: formData.randomize_questions ? 1 : 0,
        questions: questions,
        batches: formData.batch_name ? [formData.batch_name] : []
      };
      
      if (editTestId) {
        const res = await api.put(`/assessments/tests/${editTestId}`, payload);
        if (res.data.success) {
          toast.success('Assessment updated successfully!');
          onComplete();
        }
      } else {
        const res = await api.post('/tpo/tests', payload);
        if (res.data.success) {
          toast.success('Assessment created and scheduled successfully!');
          onComplete();
        }
      }
    } catch (e) {
      toast.error(editTestId ? 'Failed to update assessment' : 'Failed to create assessment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[80vh]">
      <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{editTestId ? 'Edit Assessment' : 'Create New Assessment'}</h2>
          <p className="text-sm font-bold text-slate-500 mt-1">{editTestId ? 'Modify configuration, schedule, and assign' : 'Configure, schedule, and assign'}</p>
        </div>
        <div className="flex gap-2">
          {[1,2,3,4].map(s => (
            <div key={s} className={`w-12 h-2 rounded-full ${step >= s ? 'bg-blue-600' : 'bg-slate-200'}`} />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {step === 1 && (
          <div className="max-w-2xl mx-auto space-y-6">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-6"><Settings className="text-blue-600" /> 1. Configuration</h3>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assessment Title</label>
              <input type="text" required className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" placeholder="e.g. Pre-Placement Mock Test" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                <select className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                  <option value="Aptitude">Aptitude</option>
                  <option value="Technical">Technical</option>
                  <option value="Coding">Coding</option>
                  <option value="Psychometric">Psychometric</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Difficulty</label>
                <select className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" value={formData.difficulty} onChange={e => setFormData({...formData, difficulty: e.target.value})}>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
               <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Duration (Min)</label>
                <input type="number" className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" value={formData.duration_minutes} onChange={e => setFormData({...formData, duration_minutes: Number(e.target.value)})} />
              </div>
               <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Max Marks</label>
                <input type="number" className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" value={formData.max_marks} onChange={e => setFormData({...formData, max_marks: Number(e.target.value)})} />
              </div>
               <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pass Marks</label>
                <input type="number" className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" value={formData.passing_marks} onChange={e => setFormData({...formData, passing_marks: Number(e.target.value)})} />
              </div>
            </div>
            
            <div className="flex gap-6 mt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.webcam_monitoring} onChange={e => setFormData({...formData, webcam_monitoring: e.target.checked})} className="w-5 h-5 text-blue-600 rounded" />
                <span className="text-sm font-bold text-slate-700">Enable Webcam Proctoring</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.randomize_questions} onChange={e => setFormData({...formData, randomize_questions: e.target.checked})} className="w-5 h-5 text-blue-600 rounded" />
                <span className="text-sm font-bold text-slate-700">Randomize Questions</span>
              </label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Brain className="text-purple-500" /> 2. Questions
              </h3>
              <div className="flex gap-2">
                <button onClick={() => setShowBulkModal(true)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-50 uppercase tracking-widest flex items-center gap-2">
                   <UploadCloud size={14} /> Bulk Import (CSV)
                </button>
                <button onClick={() => setShowManualModal(true)} className="px-4 py-2 bg-purple-50 text-purple-600 rounded-xl font-bold text-xs hover:bg-purple-100 uppercase tracking-widest flex items-center gap-2">
                   <Plus size={14} /> Add Manual
                </button>
              </div>
            </div>
            
            {questions.length === 0 ? (
              <div className="bg-slate-50 p-12 rounded-3xl border border-slate-100 text-center space-y-4">
                <FileText size={48} className="mx-auto text-slate-300" />
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">No questions added yet</p>
                <p className="text-xs font-semibold text-slate-400">Add manual questions or bulk import from CSV.</p>
                <button onClick={() => setShowManualModal(true)} className="mt-4 px-6 py-2 bg-blue-100 text-blue-600 font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-blue-200 transition-colors">
                  + Add Manual Question
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-sm font-black text-slate-700 uppercase tracking-widest">Total Questions: {questions.length}</span>
                  <span className="text-sm font-black text-slate-700 uppercase tracking-widest">Total Marks: {questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0)}</span>
                </div>
                {questions.map((q, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative group">
                    <button onClick={() => setQuestions(questions.filter((_, i) => i !== idx))} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase rounded">{q.question_type}</span>
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase rounded">{q.difficulty}</span>
                      <span className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase rounded">{q.marks} Marks</span>
                    </div>
                    <p className="font-bold text-slate-900 mb-3">{idx + 1}. {q.question_text}</p>
                    {q.question_type === 'MCQ' && (
                      <div className="grid grid-cols-2 gap-2">
                        {q.options.map((opt: string, oIdx: number) => (
                          <div key={oIdx} className={`px-3 py-2 rounded-lg text-sm font-semibold border ${q.correct_answers.includes(oIdx) ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                            {opt}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="max-w-2xl mx-auto space-y-6">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-6"><Calendar className="text-green-500" /> 3. Scheduling</h3>
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Test Date</label>
                <input type="date" required className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" value={formData.test_date} onChange={e => setFormData({...formData, test_date: e.target.value})} />
              </div>
               <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Time</label>
                <input type="time" required className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Late Entry Window (Minutes)</label>
              <input type="number" className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" value={formData.late_join_window} onChange={e => setFormData({...formData, late_join_window: Number(e.target.value)})} />
              <p className="text-xs text-slate-400 font-semibold mt-1 ml-1">Students cannot join after this window expires.</p>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="max-w-2xl mx-auto space-y-6">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-6"><Users className="text-orange-500" /> 4. Assignment</h3>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select College</label>
              <select className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" value={formData.college_id} onChange={e => handleCollegeSelect(e.target.value)}>
                <option value="">Choose College...</option>
                {colleges.map(c => <option key={c.id} value={c.id}>{c.college_name}</option>)}
              </select>
            </div>
            {formData.college_id && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Batch</label>
                <select className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" value={formData.batch_name} onChange={e => setFormData({...formData, batch_name: e.target.value})}>
                  <option value="">All Batches (Optional)</option>
                  {batches.map(b => <option key={b.id} value={b.batch_name}>{b.batch_name} ({b.department})</option>)}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between">
        <button onClick={onCancel} className="px-6 py-3 bg-white rounded-2xl font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
        <div className="flex gap-3">
          {step > 1 && (
             <button onClick={() => setStep(step - 1)} className="px-6 py-3 bg-white rounded-2xl font-bold text-slate-600 hover:bg-slate-100">Back</button>
          )}
          {step < 4 ? (
             <button disabled={(step === 1 && !formData.title) || (step === 2 && questions.length === 0)} onClick={() => setStep(step + 1)} className="px-6 py-3 bg-blue-600 rounded-2xl font-bold text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 flex items-center gap-2">Next Step <ChevronRight size={18} /></button>
          ) : (
             <button disabled={loading || !formData.college_id} onClick={handleSubmit} className="px-6 py-3 bg-green-600 rounded-2xl font-bold text-white hover:bg-green-700 shadow-lg shadow-green-600/20 flex items-center gap-2">{loading ? (editTestId ? 'Saving...' : 'Publishing...') : (editTestId ? 'Save Changes' : 'Publish Assessment')} <CheckCircle2 size={18} /></button>
          )}
        </div>
      </div>

      {/* Manual Question Modal */}
      {showManualModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Add Question</h3>
              <button onClick={() => setShowManualModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Question Text</label>
                <textarea className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm min-h-[100px]" value={manualQ.question_text} onChange={e => setManualQ({...manualQ, question_text: e.target.value})} placeholder="Enter the question here..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Question Type</label>
                  <select className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" value={manualQ.question_type} onChange={e => setManualQ({...manualQ, question_type: e.target.value})}>
                    <option value="MCQ">Multiple Choice</option>
                    <option value="SUBJECTIVE">Subjective</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Difficulty</label>
                  <select className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" value={manualQ.difficulty} onChange={e => setManualQ({...manualQ, difficulty: e.target.value})}>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Marks</label>
                  <input type="number" className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" value={manualQ.marks} onChange={e => setManualQ({...manualQ, marks: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Topic/Tag</label>
                  <input type="text" className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" value={manualQ.topic} onChange={e => setManualQ({...manualQ, topic: e.target.value})} placeholder="e.g. Arrays" />
                </div>
              </div>
              
              {manualQ.question_type === 'MCQ' && (
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Options</label>
                  {manualQ.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <input 
                        type="radio" 
                        name="correct_answer" 
                        checked={manualQ.correct_answers.includes(idx)} 
                        onChange={() => setManualQ({...manualQ, correct_answers: [idx]})}
                        className="w-5 h-5 text-blue-600"
                      />
                      <input 
                        type="text" 
                        className="flex-1 px-5 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" 
                        placeholder={`Option ${idx + 1}`} 
                        value={opt} 
                        onChange={e => {
                          const newOpts = [...manualQ.options];
                          newOpts[idx] = e.target.value;
                          setManualQ({...manualQ, options: newOpts});
                        }} 
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button onClick={() => setShowManualModal(false)} className="px-6 py-2.5 bg-white rounded-xl font-bold text-slate-600">Cancel</button>
              <button 
                onClick={() => {
                  if (!manualQ.question_text) return toast.error('Enter question text');
                  if (manualQ.question_type === 'MCQ' && manualQ.options.some(o => !o)) return toast.error('Fill all options');
                  setQuestions([...questions, manualQ]);
                  setShowManualModal(false);
                  setManualQ({ question_text: '', question_type: 'MCQ', options: ['','','',''], correct_answers: [0], marks: 1, difficulty: 'Medium', topic: '' });
                }} 
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700"
              >
                Add Question
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
            <button onClick={() => setShowBulkModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20} /></button>
            <div className="text-center space-y-4 mb-6">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl mx-auto flex items-center justify-center text-blue-600">
                <UploadCloud size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Bulk Import</h3>
                <p className="text-sm font-bold text-slate-500 mt-1">Upload CSV file with questions</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl text-xs font-semibold text-slate-600 space-y-2">
                <p className="font-bold text-slate-900 mb-1">CSV Format Required:</p>
                <p>question, option1, option2, option3, option4, correct_index (0-3), marks, difficulty, topic</p>
                <a href="data:text/csv;charset=utf-8,question,option1,option2,option3,option4,correct_index,marks,difficulty,topic%0AWhat is 2+2?,1,2,3,4,3,1,Easy,Math" download="template.csv" className="text-blue-600 hover:underline mt-2 inline-block">Download Template</a>
              </div>
              <input 
                type="file" 
                accept=".csv" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  Papa.parse(file, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                      try {
                        const parsedQ = results.data.map((row: any) => ({
                          question_text: row.question || row.question_text || '',
                          question_type: 'MCQ',
                          options: [row.option1 || '', row.option2 || '', row.option3 || '', row.option4 || ''],
                          correct_answers: [parseInt(row.correct_index || row.correct_answer || '0')],
                          marks: parseInt(row.marks || '1'),
                          difficulty: row.difficulty || 'Medium',
                          topic: row.topic || ''
                        })).filter(q => q.question_text);
                        
                        setQuestions(prev => [...prev, ...parsedQ]);
                        toast.success(`Imported ${parsedQ.length} questions`);
                        setShowBulkModal(false);
                      } catch (err) {
                        toast.error('Invalid CSV format');
                      }
                    }
                  });
                }}
              />
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
              >
                Select CSV File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
