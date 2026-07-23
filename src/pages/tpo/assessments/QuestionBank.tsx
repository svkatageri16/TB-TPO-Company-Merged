import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, FileText, Trash2, Edit, Save, X, Brain } from 'lucide-react';
import api from '../../../services/api';
import { toast } from 'react-hot-toast';

export default function QuestionBank() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filterTopic, setFilterTopic] = useState('');
  
  const [newQ, setNewQ] = useState({
    topic: '',
    question_text: '',
    question_type: 'MCQ',
    difficulty: 'Medium',
    options: ['', '', '', ''],
    correct: 0,
    explanation: ''
  });

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const res = await api.get('/tpo/questions');
      if (res.data.success) setQuestions(res.data.data);
    } catch (e) {
      toast.error('Failed to load question bank');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...newQ,
        options_json: JSON.stringify(newQ.options),
        correct_answers_json: JSON.stringify([newQ.correct])
      };
      
      const res = await api.post('/tpo/questions', payload);
      if (res.data.success) {
        toast.success('Question added to bank');
        setShowCreate(false);
        fetchQuestions();
        setNewQ({ topic: '', question_text: '', question_type: 'MCQ', difficulty: 'Medium', options: ['', '', '', ''], correct: 0, explanation: '' });
      }
    } catch (e) {
      toast.error('Failed to save question');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Enterprise Question Bank</h2>
          <p className="text-sm font-bold text-slate-500 mt-1">Manage reusable questions across all assessments</p>
        </div>
        <button 
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 rounded-2xl font-bold text-white shadow-lg hover:bg-blue-700 transition-all"
        >
          <Plus size={18} /> Add Question
        </button>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search questions by text or topic..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border-none bg-slate-50 focus:ring-2 focus:ring-blue-500 font-medium"
              value={filterTopic}
              onChange={(e) => setFilterTopic(e.target.value)}
            />
          </div>
          <button className="flex items-center gap-2 px-6 py-3 bg-slate-50 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-all">
            <Brain size={18} className="text-purple-500" /> Auto Generate (AI)
          </button>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-slate-400 font-bold uppercase tracking-wider text-sm">Loading Questions...</div>
          ) : questions.filter(q => q.question_text.toLowerCase().includes(filterTopic.toLowerCase()) || (q.topic && q.topic.toLowerCase().includes(filterTopic.toLowerCase()))).map(q => (
            <div key={q.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex justify-between items-start group">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-[10px] font-black uppercase text-slate-600">{q.question_type}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${q.difficulty === 'Hard' ? 'bg-red-100 text-red-700' : q.difficulty === 'Easy' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{q.difficulty}</span>
                  {q.topic && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-black uppercase">{q.topic}</span>}
                </div>
                <p className="font-semibold text-slate-800 text-sm">{q.question_text}</p>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-2 bg-white rounded-xl text-slate-400 hover:text-blue-600 shadow-sm"><Edit size={16} /></button>
                <button className="p-2 bg-white rounded-xl text-slate-400 hover:text-red-600 shadow-sm"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
          {questions.length === 0 && !loading && (
             <div className="text-center py-12">
               <FileText size={48} className="mx-auto text-slate-200 mb-4" />
               <p className="text-slate-400 font-bold uppercase tracking-wider text-sm">Question Bank is empty</p>
             </div>
          )}
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">Add New Question</h3>
              <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-white rounded-xl transition-all"><X size={20} className="text-slate-400" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Topic</label>
                  <input type="text" className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" value={newQ.topic} onChange={e => setNewQ({...newQ, topic: e.target.value})} placeholder="e.g. Data Structures" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Difficulty</label>
                  <select className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" value={newQ.difficulty} onChange={e => setNewQ({...newQ, difficulty: e.target.value})}>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Question Text</label>
                <textarea className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm h-32 resize-none" value={newQ.question_text} onChange={e => setNewQ({...newQ, question_text: e.target.value})} placeholder="Enter question..." />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Options</label>
                {newQ.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <input type="radio" name="correct" checked={newQ.correct === i} onChange={() => setNewQ({...newQ, correct: i})} className="w-5 h-5 text-blue-600" />
                    <input type="text" className="flex-1 px-5 py-3.5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" value={opt} onChange={e => {
                      const newOpts = [...newQ.options];
                      newOpts[i] = e.target.value;
                      setNewQ({...newQ, options: newOpts});
                    }} placeholder={`Option ${i+1}`} />
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="px-6 py-3 bg-white rounded-2xl font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
              <button onClick={handleSave} className="px-6 py-3 bg-blue-600 rounded-2xl font-bold text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20">Save Question</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
