import React, { useState } from 'react';
import api from '../../services/api';
import { BrainCircuit, Filter, Plus, Save, Trash, Edit, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

export default function AdminIntelligencePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pq');
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState<any[]>([{ text: "", value: 1 }]);
  const [category, setCategory] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [existingQuestions, setExistingQuestions] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [importMode, setImportMode] = useState<'manual' | 'bulk'>('manual');
  const [bulkQuestions, setBulkQuestions] = useState<any[]>([]);
  const [dragActive, setDragActive] = useState(false);

  if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
    return <div className="p-10 text-center">Unauthorized. Admin required.</div>;
  }

  React.useEffect(() => {
    fetchQuestions();
    resetForm();
  }, [activeTab]);

  const fetchQuestions = async () => {
    try {
      const { data } = await api.get(`/intelligence/admin/questions/${activeTab}`);
      if (data.success) {
        setExistingQuestions(data.questions);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const resetForm = () => {
    setQuestionText("");
    setOptions([{text: "", value: 1}]);
    setCategory("");
    setAnswer("");
    setEditingId(null);
    setBulkQuestions([]);
  };

  const parseExcelRows = (jsonData: any[]): any[] => {
    return jsonData.map((row: any, idx: number) => {
      const findValue = (keys: string[]) => {
        const foundKey = Object.keys(row).find(k => 
          keys.some(key => k.trim().toLowerCase() === key.toLowerCase())
        );
        return foundKey ? row[foundKey] : undefined;
      };

      const rawQuestionText = findValue(['question_text', 'question text', 'question', 'text', 'scenario']);
      const rawCategory = findValue(['category', 'trait', 'trait_evaluated', 'emotional_trait', 'social_trait', 'difficulty', 'difficulty_level', 'difficulty level', 'trait evaluated', 'difficulty_val', 'difficultyval']);
      
      const optA = findValue(['option_a', 'option a', 'a', 'optiona']);
      const optB = findValue(['option_b', 'option b', 'b', 'optionb']);
      const optC = findValue(['option_c', 'option c', 'c', 'optionc']);
      const optD = findValue(['option_d', 'option d', 'd', 'optiond']);

      const rawCorrectAnswer = findValue(['correct_answer', 'correct answer', 'correct', 'answer']);
      const rawScoreValue = findValue(['score_value', 'score value', 'score', 'value', 'weight']);

      const extractedOptions: any[] = [];
      if (optA !== undefined) extractedOptions.push({ text: String(optA), value: 1 });
      if (optB !== undefined) extractedOptions.push({ text: String(optB), value: 2 });
      if (optC !== undefined) extractedOptions.push({ text: String(optC), value: 3 });
      if (optD !== undefined) extractedOptions.push({ text: String(optD), value: 4 });

      if (extractedOptions.length === 0) {
        const rawOptionsStr = findValue(['options']);
        if (rawOptionsStr) {
          const splitOpts = String(rawOptionsStr).split(',').map(s => s.trim());
          splitOpts.forEach((o, i) => {
            extractedOptions.push({ text: o, value: i + 1 });
          });
        } else {
          extractedOptions.push({ text: "Option A", value: 1 });
          extractedOptions.push({ text: "Option B", value: 2 });
          extractedOptions.push({ text: "Option C", value: 3 });
          extractedOptions.push({ text: "Option D", value: 4 });
        }
      }

      let finalAnswerText = "";
      let finalCorrectLetter = "";
      if (rawCorrectAnswer !== undefined) {
        const ansStr = String(rawCorrectAnswer).trim();
        const matchLetter = ansStr.toUpperCase();
        if (matchLetter === 'A' || matchLetter === 'OPTION_A' || matchLetter === 'OPTION A') {
          finalAnswerText = extractedOptions[0]?.text || ansStr;
          finalCorrectLetter = 'A';
        } else if (matchLetter === 'B' || matchLetter === 'OPTION_B' || matchLetter === 'OPTION B') {
          finalAnswerText = extractedOptions[1]?.text || ansStr;
          finalCorrectLetter = 'B';
        } else if (matchLetter === 'C' || matchLetter === 'OPTION_C' || matchLetter === 'OPTION C') {
          finalAnswerText = extractedOptions[2]?.text || ansStr;
          finalCorrectLetter = 'C';
        } else if (matchLetter === 'D' || matchLetter === 'OPTION_D' || matchLetter === 'OPTION D') {
          finalAnswerText = extractedOptions[3]?.text || ansStr;
          finalCorrectLetter = 'D';
        } else {
          finalAnswerText = ansStr;
          const matchingIdx = extractedOptions.findIndex(o => o.text.toLowerCase() === ansStr.toLowerCase());
          if (matchingIdx !== -1) {
            finalCorrectLetter = ['A', 'B', 'C', 'D'][matchingIdx];
          }
        }
      }

      const scoreVal = rawScoreValue !== undefined ? Number(rawScoreValue) : 1;
      if (activeTab !== 'iq' && finalCorrectLetter) {
        const corrIdx = ['A', 'B', 'C', 'D'].indexOf(finalCorrectLetter);
        extractedOptions.forEach((opt, oIdx) => {
          opt.value = (oIdx === corrIdx) ? scoreVal : 0;
        });
      }

      return {
        rowNumber: idx + 2,
        question: rawQuestionText ? String(rawQuestionText).trim() : `Blank question text (Row ${idx + 2})`,
        options: extractedOptions.map(opt => ({ text: opt.text, value: opt.value })),
        category: rawCategory ? String(rawCategory).trim() : (activeTab === 'iq' ? 'MEDIUM' : (activeTab === 'pq' ? 'General' : activeTab === 'eq' ? 'Empathy' : 'Collaboration')),
        answer: finalAnswerText,
        weight: scoreVal,
        difficulty: rawCategory ? String(rawCategory).toUpperCase() : 'MEDIUM',
        trait: rawCategory ? String(rawCategory).trim() : (activeTab === 'eq' ? 'Empathy' : 'Collaboration')
      };
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result as ArrayBuffer;
        const data = new Uint8Array(bstr);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          alert("The Excel sheet is empty or has no rows.");
          return;
        }

        const parsedQuestions = parseExcelRows(jsonData);
        setBulkQuestions(parsedQuestions);
        alert(`Success! Successfully parsed ${parsedQuestions.length} questions from the spreadsheet. You can review them in the "Spreadsheet Preview" below and save.`);
      } catch (err) {
        console.error(err);
        alert("Error parsing file. Please check that it is a valid Excel/CSV spreadsheet.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result as ArrayBuffer;
        const data = new Uint8Array(bstr);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          alert("The Excel sheet is empty or has no rows.");
          return;
        }

        const parsedQuestions = parseExcelRows(jsonData);
        setBulkQuestions(parsedQuestions);
        alert(`Success! Successfully parsed ${parsedQuestions.length} questions from the spreadsheet. You can review them in the "Spreadsheet Preview" below and save.`);
      } catch (err) {
        console.error(err);
        alert("Error parsing file. Please check that it is a valid Excel/CSV spreadsheet.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleBulkSubmit = async () => {
    if (bulkQuestions.length === 0) return alert("No questions to import.");
    setLoading(true);
    try {
      const { data } = await api.post(`/intelligence/admin/questions/${activeTab}/bulk`, {
        questions: bulkQuestions
      });
      if (data.success) {
        alert(`Successfully imported ${bulkQuestions.length} questions!`);
        setBulkQuestions([]);
        setImportMode('manual');
        fetchQuestions();
      } else {
        alert(data.message || "Failed to import questions.");
      }
    } catch (e) {
      console.error(e);
      alert("Error executing bulk import.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (q: any) => {
    setEditingId(q.id);
    setQuestionText(q.question || q.question_text || "");
    setCategory(q.category || q.emotional_trait || q.social_trait || q.difficulty || "");
    setAnswer(activeTab === 'iq' ? (q.answer || "") : "");
    if (q.options_json && q.options_json.length > 0) {
      setOptions(q.options_json.map((opt: any) => ({
        text: opt.text || opt.title || opt.toString(),
        value: typeof opt.value === 'number' ? opt.value : 1
      })));
    } else {
      setOptions([{ text: "", value: 1 }]);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteClick = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this question?")) return;
    try {
      const { data } = await api.delete(`/intelligence/admin/questions/${activeTab}/${id}`);
      if (data.success) {
        fetchQuestions();
        if (editingId === id) resetForm();
      }
    } catch (e) {
      console.error(e);
      alert("Error deleting question.");
    }
  };


  const handleAddOption = () => {
    setOptions([...options, { text: "", value: 1 }]);
  };

  const handleOptionChange = (idx: number, field: string, val: any) => {
    const newOptions = [...options];
    newOptions[idx] = { ...newOptions[idx], [field]: val };
    setOptions(newOptions);
  };

  const handleSubmit = async () => {
    if (!questionText) return alert("Question required.");
    setLoading(true);
    try {
      const payload: any = {
        question: questionText,
        options,
      };

      if (activeTab === 'pq') {
        payload.category = category || 'General';
      } else if (activeTab === 'iq') {
        payload.answer = answer || options[0]?.text;
        payload.difficulty = category || 'MEDIUM';
      } else if (activeTab === 'eq') {
        payload.trait = category || 'Empathy';
      } else if (activeTab === 'sq') {
        payload.trait = category || 'Collaboration';
      }

      if (editingId) {
        const { data } = await api.put(`/intelligence/admin/questions/${activeTab}/${editingId}`, payload);
        if (data.success) {
          alert("Question updated!");
          resetForm();
          fetchQuestions();
        }
      } else {
        const { data } = await api.post(`/intelligence/admin/questions/${activeTab}`, payload);
        if (data.success) {
          alert("Question added!");
          resetForm();
          fetchQuestions();
        }
      }
    } catch(e) {
      console.error(e);
      alert("Error saving question.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-10">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Intelligence Bank</h1>
              <p className="text-slate-500 font-medium">Manage PQ, IQ, EQ, and SQ Assessment Questions</p>
            </div>
          </div>
        </header>

        <div className="flex items-center gap-2 mb-8 bg-white p-2 rounded-2xl shadow-sm border border-slate-100 max-w-min">
          {['pq', 'iq', 'eq', 'sq'].map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-6 py-2 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${activeTab === t ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            {editingId ? <Edit className="w-5 h-5 text-indigo-500" /> : <Plus className="w-5 h-5 text-indigo-500" />}
            {editingId ? `Edit ${activeTab.toUpperCase()} Question` : `Add New ${activeTab.toUpperCase()} Question`}
          </h2>

          {!editingId && (
            <div className="flex border-b border-slate-200 mb-8 gap-6">
              <button
                onClick={() => setImportMode('manual')}
                className={`pb-3 px-2 font-bold text-sm border-b-2 transition-all cursor-pointer ${importMode === 'manual' ? 'border-slate-900 text-slate-900 font-extrabold' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Manual Entry
              </button>
              <button
                onClick={() => setImportMode('bulk')}
                className={`pb-3 px-2 font-bold text-sm border-b-2 transition-all cursor-pointer ${importMode === 'bulk' ? 'border-slate-900 text-slate-900 font-extrabold' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Excel / CSV Bulk Import
              </button>
            </div>
          )}

          {importMode === 'manual' || editingId ? (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Question Text</label>
                <textarea 
                  className="w-full border-2 border-slate-200 rounded-xl p-4 text-slate-800 focus:border-indigo-500 focus:ring-0 transition-colors bg-slate-50"
                  rows={3}
                  value={questionText}
                  onChange={e => setQuestionText(e.target.value)}
                  placeholder="Enter the scenario or question..."
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                    {activeTab === 'iq' ? 'Difficulty' : (activeTab === 'pq' ? 'Category' : 'Trait Evaluated')}
                  </label>
                  <input 
                    type="text"
                    className="w-full border-2 border-slate-200 rounded-xl p-3 text-slate-800 focus:border-indigo-500 bg-slate-50"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    placeholder={activeTab === 'iq' ? 'e.g., HARD' : 'e.g., Leadership'}
                  />
                </div>

                {activeTab === 'iq' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Correct Answer String</label>
                    <input 
                      type="text"
                      className="w-full border-2 border-slate-200 rounded-xl p-3 text-slate-800 focus:border-indigo-500 bg-slate-50"
                      value={answer}
                      onChange={e => setAnswer(e.target.value)}
                      placeholder="Must exactly match an option text"
                    />
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Options</label>
                  <button onClick={handleAddOption} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add Option
                  </button>
                </div>
                
                <div className="space-y-3">
                  {options.map((opt, i) => (
                    <div key={i} className="flex gap-4">
                      <input 
                        type="text"
                        className="flex-1 border-2 border-slate-200 rounded-xl p-3 text-slate-800 focus:border-indigo-500 bg-slate-50"
                        value={opt.text}
                        onChange={e => handleOptionChange(i, 'text', e.target.value)}
                        placeholder={`Option ${i + 1}`}
                      />
                      {activeTab !== 'iq' && (
                        <input 
                          type="number"
                          className="w-24 border-2 border-slate-200 rounded-xl p-3 text-slate-800 focus:border-indigo-500 bg-slate-50"
                          value={opt.value}
                          onChange={e => handleOptionChange(i, 'value', parseInt(e.target.value))}
                          placeholder="Value"
                          min={0}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end gap-4">
                {editingId && (
                  <button 
                    onClick={resetForm} 
                    disabled={loading}
                    className="px-8 py-3 bg-white text-slate-700 border-2 border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    Cancel Edit
                  </button>
                )}
                <button 
                  onClick={handleSubmit} 
                  disabled={loading}
                  className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-lg shadow-slate-200 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Saving...' : (editingId ? 'Update Question' : 'Save Question')}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 text-xs text-indigo-905 space-y-2">
                <p className="font-bold flex items-center gap-1.5 text-indigo-800 text-sm">
                  <AlertCircle className="w-4 h-4 text-indigo-600" />
                  Excel / CSV Spreadsheet Column Requirements:
                </p>
                <p className="text-indigo-700 font-semibold mb-2">Please structure your spreadsheet with the following headers (as pictured in your prompt context):</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 font-mono text-[11px] bg-white p-4 rounded-xl border border-indigo-200 text-slate-700">
                  <div>• <strong>Question_Text</strong> : Question scenario text</div>
                  <div>• <strong>Category</strong> / <strong>Difficulty_level</strong> : Question topic or difficulty tag</div>
                  <div>• <strong>Option_A</strong> / <strong>Option_B</strong> : Primary option texts</div>
                  <div>• <strong>Option_C</strong> / <strong>Option_D</strong> : Alternate option texts</div>
                  <div>• <strong>Correct_Answer</strong> : Correct answer code (e.g., A, B, C, D) or direct text</div>
                  <div>• <strong>Score_Value</strong> : Points or score weight (optional)</div>
                </div>
              </div>

              {/* Drag and drop card */}
              <div 
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                onDrop={(e) => { e.preventDefault(); setDragActive(false); handleDrop(e); }}
                onClick={() => document.getElementById('file-upload-input')?.click()}
                className={`border-3 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${dragActive ? 'border-indigo-600 bg-indigo-50/50 scale-[0.99]' : 'border-slate-200 hover:border-indigo-500 bg-slate-50'}`}
              >
                <input 
                  id="file-upload-input"
                  type="file" 
                  accept=".xlsx, .xls, .csv" 
                  className="hidden" 
                  onChange={handleFileUpload}
                />
                <FileSpreadsheet className="w-14 h-14 text-slate-400 mb-4 animate-bounce" />
                <p className="text-md font-bold text-slate-800">Drag & drop your Excel or CSV sheet here</p>
                <p className="text-xs text-slate-500 mt-1">or click anywhere to browse from your device</p>
                <div className="mt-4 px-3 py-1 bg-slate-200/60 rounded-full text-[10px] font-bold tracking-wider text-slate-600 uppercase">Supports XLSX, XLS, and CSV</div>
              </div>

              {bulkQuestions.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">Spreadsheet Content Preview</h3>
                      <p className="text-xs text-slate-500">Successfully interpreted {bulkQuestions.length} questions from your file.</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setBulkQuestions([])}
                        className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-100 transition-colors"
                      >
                        Clear File
                      </button>
                      <button 
                        onClick={handleBulkSubmit}
                        disabled={loading}
                        className="px-5 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-md disabled:opacity-50"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {loading ? 'Importing...' : 'Save and Import All'}
                      </button>
                    </div>
                  </div>

                  <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100 bg-white shadow-inner">
                    {bulkQuestions.map((q, idx) => (
                      <div key={idx} className="p-4 text-xs space-y-3 hover:bg-slate-50/55 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">Row {q.rowNumber}</span>
                          <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-1 rounded-md font-bold">
                            {activeTab === 'iq' ? `Difficulty: ${q.category}` : `Trait: ${q.category}`}
                          </span>
                        </div>
                        <p className="font-bold text-slate-800 leading-relaxed text-sm">{q.question}</p>
                        
                        <div className="grid grid-cols-2 gap-2 pl-1.5">
                          {q.options.map((opt: any, oIdx: number) => {
                            const isCorrect = activeTab === 'iq' && opt.text === q.answer;
                            return (
                              <div key={oIdx} className={`p-2 rounded-xl border ${isCorrect ? 'border-green-300 bg-green-50 text-green-900 font-bold shadow-sm' : 'border-slate-100 bg-slate-50 text-slate-600'}`}>
                                <span className="text-[10px] uppercase font-bold text-slate-400 mr-1.5">{String.fromCharCode(65 + oIdx)}.</span>
                                {opt.text}
                                {activeTab !== 'iq' && opt.value !== undefined ? (
                                  <span className="ml-1 text-[10px] text-indigo-500 font-extrabold bg-indigo-50 px-1 rounded">+{opt.value}</span>
                                ) : null}
                              </div>
                            )
                          })}
                        </div>

                        {activeTab === 'iq' && q.answer && (
                          <div className="text-green-700 font-extrabold pl-2 flex items-center gap-1.5 mt-2 bg-green-50/40 p-2 rounded-xl border border-green-100">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            Correct Answer text match: {q.answer}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm mt-8">
          <h2 className="text-xl font-bold text-slate-800 mb-6">
            Existing {activeTab.toUpperCase()} Questions
          </h2>
          <div className="space-y-4">
            {existingQuestions.length === 0 ? (
              <p className="text-slate-500">No questions found for this category.</p>
            ) : (
              existingQuestions.map((q, idx) => (
                <div key={q.id || idx} className="p-4 border border-slate-200 rounded-xl bg-slate-50 relative group">
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleEditClick(q)} 
                      className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteClick(q.id)} 
                      className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="font-bold text-slate-800 mb-2 pr-16">{q.question || q.question_text}</p>
                  <p className="text-sm text-slate-500 mb-2">Category/Trait: {q.category || q.emotional_trait || q.social_trait || q.difficulty}</p>
                  <div className="space-y-1">
                    {(q.options_json || []).map((opt: any, i: number) => {
                      const text = opt.text || opt.title || opt;
                      const value = opt.value;
                      return (
                        <div key={i} className={`text-sm ${activeTab === 'iq' && q.answer === text ? 'text-green-600 font-bold' : 'text-slate-600'}`}>
                          • {text} {value !== undefined && activeTab !== 'iq' ? `(Value: ${value})` : ''}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
