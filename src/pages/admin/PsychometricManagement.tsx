import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  BrainCircuit, 
  Layout, 
  Target, 
  MessageSquare,
  Search,
  ChevronRight,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export function PsychometricManagement() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    category: 'PERSONALITY',
    trait: '',
    question_text: '',
    options: [
      { text: '', mapping: {} },
      { text: '', mapping: {} },
      { text: '', mapping: {} },
      { text: '', mapping: {} }
    ]
  });

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const { data } = await api.get('/admin/psychometric/questions');
      if (data.success) setQuestions(data.data);
    } catch (error) {
      toast.error("Failed to load questions");
    } finally {
      setLoading(false);
    }
  };

  const handleOptionChange = (idx: number, field: string, value: string) => {
    const newOptions = [...formData.options];
    if (field === 'text') {
      newOptions[idx].text = value;
    } else {
      // For mapping, we expect format: "Trait:Score, Trait2:Score"
      const mapping: any = {};
      value.split(',').forEach(item => {
        const [trait, score] = item.split(':');
        if (trait && score) mapping[trait.trim()] = parseInt(score.trim());
      });
      newOptions[idx].mapping = mapping;
    }
    setFormData({ ...formData, options: newOptions });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        options_json: formData.options
      };
      
      if (editingId) {
        await api.put(`/admin/psychometric/questions/${editingId}`, payload);
        toast.success("Question updated successfully");
      } else {
        await api.post('/admin/psychometric/questions', payload);
        toast.success("Question added successfully");
      }
      
      setIsAdding(false);
      setEditingId(null);
      setFormData({
        category: 'PERSONALITY',
        trait: '',
        question_text: '',
        options: [
          { text: '', mapping: {} },
          { text: '', mapping: {} },
          { text: '', mapping: {} },
          { text: '', mapping: {} }
        ]
      });
      fetchQuestions();
    } catch (error: any) {
      const msg = error.response?.data?.message || "Operation failed";
      toast.error(msg);
    }
  };

  const startEdit = (q: any) => {
    const options = typeof q.options_json === 'string' ? JSON.parse(q.options_json) : q.options_json;
    setFormData({
      category: q.category,
      trait: q.trait,
      question_text: q.question_text,
      options: options
    });
    setEditingId(q.id);
    setIsAdding(true);
  };

  const deleteQuestion = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this question?")) return;
    try {
      await api.delete(`/admin/psychometric/questions/${id}`);
      toast.success("Question deleted");
      fetchQuestions();
    } catch (error) {
      toast.error("Delete failed");
    }
  };

  const filteredQuestions = questions.filter(q => 
    q.question_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.trait.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Psychometric Lab</h1>
          <p className="text-slate-500 font-medium">Design and manage behavioral assessment questions.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center gap-2"
        >
          <Plus size={18} /> Create Question
        </button>
      </div>

      {/* Search & Stats */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
           <input 
              type="text" 
              placeholder="Search by question, trait or category..."
              className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
           />
        </div>
        <div className="px-6 py-4 bg-white border border-slate-200 rounded-2xl flex items-center gap-4">
           <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <BrainCircuit size={20} />
           </div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Questions</p>
              <p className="text-lg font-black text-slate-900">{questions.length}</p>
           </div>
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-white rounded-[40px] border border-slate-200 shadow-2xl overflow-hidden"
          >
            <form onSubmit={handleSubmit}>
              <div className="p-10 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                    {editingId ? 'Edit Question' : 'Design New Question'}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">Configure traits and behavioral mappings</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => { setIsAdding(false); setEditingId(null); }}
                  className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 shadow-sm transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Assessment Category</label>
                    <div className="grid grid-cols-2 gap-3">
                      {['PERSONALITY', 'COGNITIVE', 'BEHAVIOR', 'SITUATIONAL'].map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setFormData({...formData, category: cat})}
                          className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.category === cat ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'}`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Primary Trait (e.g., Leadership)</label>
                    <input 
                      required
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500/30 transition-all"
                      value={formData.trait}
                      onChange={e => setFormData({...formData, trait: e.target.value})}
                      placeholder="Enter core trait name..."
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Question Text</label>
                    <textarea 
                      required
                      rows={4}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500/30 transition-all resize-none"
                      value={formData.question_text}
                      onChange={e => setFormData({...formData, question_text: e.target.value})}
                      placeholder="Enter the behavioral scenario or question..."
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Response Options & Scoring</label>
                  {formData.options.map((opt, idx) => (
                    <div key={idx} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-xs font-black text-indigo-600 shadow-sm">{String.fromCharCode(65 + idx)}</span>
                        <input 
                          required
                          className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium outline-none"
                          placeholder="Option text..."
                          value={opt.text}
                          onChange={e => handleOptionChange(idx, 'text', e.target.value)}
                        />
                      </div>
                      <input 
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-bold text-slate-600 outline-none"
                        placeholder="Trait Mapping (e.g. Leadership:10, Teamwork:5)"
                        value={Object.entries(opt.mapping).map(([k, v]) => `${k}:${v}`).join(', ')}
                        onChange={e => handleOptionChange(idx, 'mapping', e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-10 bg-slate-50 flex justify-end gap-4">
                <button 
                  type="submit"
                  className="px-12 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center gap-2"
                >
                  <Save size={18} /> {editingId ? 'Save Changes' : 'Publish Question'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-6">
        {filteredQuestions.map((q, idx) => (
          <motion.div 
            key={q.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all group"
          >
            <div className="flex justify-between items-start">
               <div className="space-y-4 flex-1">
                  <div className="flex items-center gap-3">
                     <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-100">
                        {q.category}
                     </span>
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Target size={12} /> {q.trait}
                     </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 leading-snug pr-12">{q.question_text}</h3>
                  
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                     {(typeof q.options_json === 'string' ? JSON.parse(q.options_json) : q.options_json).map((opt: any, i: number) => (
                        <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                           <p className="text-[10px] font-bold text-slate-800 line-clamp-1 mb-1">{opt.text}</p>
                           <div className="flex flex-wrap gap-1">
                              {Object.entries(opt.mapping).map(([trait, score]: any) => (
                                 <span key={trait} className="text-[8px] font-black text-indigo-500 bg-indigo-50/50 px-1.5 py-0.5 rounded">+{score} {trait}</span>
                              ))}
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
               
               <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => startEdit(q)}
                    className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                  >
                     <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => deleteQuestion(q.id)}
                    className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-all"
                  >
                     <Trash2 size={18} />
                  </button>
               </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
