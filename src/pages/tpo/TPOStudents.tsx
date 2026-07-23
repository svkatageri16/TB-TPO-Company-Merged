import React, { useEffect, useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Download, 
  ChevronRight, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  FileText,
  Eye,
  XCircle,
  LayoutGrid,
  ArrowLeft
} from 'lucide-react';
import api from '../../services/api';

import { toast } from 'react-hot-toast';

export default function TPOStudents() {
  const [viewMode, setViewMode] = useState<'BATCHES' | 'STUDENTS'>('BATCHES');
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  const [students, setStudents] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    dept: '',
    year: '',
    status: '',
    batch: ''
  });
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  const handleNotImplemented = (feature: string) => {
    toast(`${feature} feature is coming soon!`, {
      icon: '🚀',
      style: {
        borderRadius: '16px',
        background: '#333',
        color: '#fff',
      },
    });
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const [studentsRes, batchesRes] = await Promise.all([
        api.get('/tpo/students'),
        api.get('/tpo/batches')
      ]);
      if (studentsRes.data.success) {
        setStudents(studentsRes.data.data);
      }
      if (batchesRes.data.success) {
        setBatches(batchesRes.data.data);
      }
    } catch (error) {
      console.error('Error fetching students and batches:', error);
    } finally {
      setLoading(false);
    }
  };

  const getReadinessBadge = (score: number) => {
    if (score >= 80) return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase">High Readiness</span>;
    if (score >= 50) return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase">Medium Readiness</span>;
    return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold uppercase">At Risk</span>;
  };

  const batchStats = useMemo(() => {
    const stats = new Map();
    
    // Pre-populate with actual academic batches from TPO/Admin
    batches.forEach(b => {
      stats.set(b.batch_name, {
        id: b.batch_name,
        name: b.batch_name,
        status: b.status || 'ACTIVE',
        count: 0,
        highReadiness: 0,
        atRisk: 0,
        department: b.department,
        academic_year: b.academic_year
      });
    });

    // Default No Batch Assigned card
    stats.set('UNASSIGNED', { id: 'UNASSIGNED', name: 'No Batch Assigned', status: 'ACTIVE', count: 0, highReadiness: 0, atRisk: 0 });
    
    students.forEach(s => {
      const bId = s.batch_name || 'UNASSIGNED';
      if (!stats.has(bId)) {
        stats.set(bId, { id: bId, name: s.batch_name || bId, status: s.batch_status || 'ACTIVE', count: 0, highReadiness: 0, atRisk: 0 });
      }
      const b = stats.get(bId);
      b.count++;
      if ((s.talent_score || 0) >= 80) b.highReadiness++;
      if ((s.talent_score || 0) < 50) b.atRisk++;
    });

    const result = Array.from(stats.values()).filter(b => b.count > 0 || b.id !== 'UNASSIGNED');
    return result.sort((a, b) => {
      if (a.id === 'UNASSIGNED') return 1;
      if (b.id === 'UNASSIGNED') return -1;
      return a.name.localeCompare(b.name);
    });
  }, [students, batches]);

  const batchesForFilter = batchStats.filter(b => b.id !== 'UNASSIGNED');

  const filteredStudents = students.filter(s => {
    if (selectedBatchId) {
      const sBatchId = s.batch_name || 'UNASSIGNED';
      if (sBatchId !== selectedBatchId) return false;
    }

    const matchesSearch = s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.college_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Parse education_json for dept/year
    let edu: any = {};
    try { edu = typeof s.education_json === 'string' ? JSON.parse(s.education_json) : s.education_json || {}; } catch(e) {}
    
    const matchesDept = !filters.dept || edu.department === filters.dept;
    const matchesYear = !filters.year || edu.year === filters.year;
    const matchesBatch = !filters.batch || (s.batch_name || s.batch) === filters.batch;
    
    const matchesStatus = !filters.status || (
      filters.status === 'high' ? ((s.talent_score || 0) >= 80) :
      filters.status === 'medium' ? ((s.talent_score || 0) >= 50 && (s.talent_score || 0) < 80) :
      filters.status === 'at-risk' ? ((s.talent_score || 0) < 50) : true
    );
    
    return matchesSearch && matchesDept && matchesYear && matchesBatch && matchesStatus;
  });

  const handleBatchClick = (batchId: string) => {
    setSelectedBatchId(batchId);
    setViewMode('STUDENTS');
  };

  const handleBackToBatches = () => {
    setSelectedBatchId(null);
    setViewMode('BATCHES');
  };

  return (
    <div className="space-y-8">
      {viewMode === 'BATCHES' ? (
        <>
          <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Academic Batches</h2>
              <p className="text-sm font-bold text-slate-500 mt-1">Select a batch to view its students</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <LayoutGrid size={24} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full text-center py-12 text-slate-500 font-bold uppercase tracking-wider text-sm">
                Loading Batches...
              </div>
            ) : batchStats.length === 0 ? (
              <div className="col-span-full text-center py-12 text-slate-500 font-bold uppercase tracking-wider text-sm">
                No Batches Found
              </div>
            ) : (
              batchStats.map(batch => (
                <div 
                  key={batch.id}
                  onClick={() => handleBatchClick(batch.id)}
                  className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black group-hover:scale-110 transition-transform">
                        <Users size={24} />
                      </div>
                      {batch.status === 'INACTIVE' ? (
                        <span className="bg-red-50 text-red-600 border border-red-100 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                          <AlertTriangle size={12} />
                          Disabled
                        </span>
                      ) : batch.id === 'UNASSIGNED' ? (
                        <span className="bg-slate-100 text-slate-500 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider">
                          Default
                        </span>
                      ) : (
                        <span className="bg-green-50 text-green-600 border border-green-100 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider">
                          Active
                        </span>
                      )}
                    </div>
                    <h3 className="font-black text-lg text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">
                      {batch.name}
                    </h3>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mt-1 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                      {batch.count} Students
                    </p>
                  </div>

                  <div className="mt-6 space-y-3">
                    <div className="flex justify-between items-center bg-slate-50 rounded-xl p-3">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">High Readiness</span>
                      <span className="text-xs font-black text-green-600">{batch.highReadiness}</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-50 rounded-xl p-3">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">At Risk</span>
                      <span className="text-xs font-black text-red-600">{batch.atRisk}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <button
              onClick={handleBackToBatches}
              className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-sm uppercase tracking-wider transition-colors w-fit"
            >
              <ArrowLeft size={16} /> Back to Batches
            </button>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
              {selectedBatchId === 'UNASSIGNED' ? 'Unassigned Students' : (batchStats.find(b => b.id === selectedBatchId)?.name || 'Batch Students')}
            </h2>
          </div>

          {/* Filters & Search */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name, email, college or batch..."
            className="w-full pl-12 pr-4 py-3 rounded-xl border-none bg-slate-50 focus:ring-2 focus:ring-blue-500 font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative group">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-500 transition-colors" size={16} />
            <select 
              className="w-full pl-10 pr-4 py-3 rounded-xl border-none bg-slate-50 focus:ring-2 focus:ring-blue-500 font-bold text-xs uppercase tracking-widest text-slate-600 appearance-none cursor-pointer hover:bg-slate-100 transition-all"
              value={filters.dept}
              onChange={(e) => setFilters({...filters, dept: e.target.value})}
            >
              <option value="">All Departments</option>
              <option value="CSE">CSE</option>
              <option value="ECE">ECE</option>
              <option value="Mechanical">Mechanical</option>
              <option value="Civil">Civil</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
               <ChevronRight className="rotate-90 text-slate-400" size={14} />
            </div>
          </div>

          <div className="relative group">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-500 transition-colors" size={16} />
            <select 
              className="w-full pl-10 pr-4 py-3 rounded-xl border-none bg-slate-50 focus:ring-2 focus:ring-blue-500 font-bold text-xs uppercase tracking-widest text-slate-600 appearance-none cursor-pointer hover:bg-slate-100 transition-all"
              value={filters.batch}
              onChange={(e) => setFilters({...filters, batch: e.target.value})}
            >
              <option value="">All Batches</option>
              {batchesForFilter.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.status === 'INACTIVE' ? '(INACTIVE)' : ''}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
               <ChevronRight className="rotate-90 text-slate-400" size={14} />
            </div>
          </div>

          <div className="relative group">
            <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-500 transition-colors" size={16} />
            <select 
              className="w-full pl-10 pr-4 py-3 rounded-xl border-none bg-slate-50 focus:ring-2 focus:ring-blue-500 font-bold text-xs uppercase tracking-widest text-slate-600 appearance-none cursor-pointer hover:bg-slate-100 transition-all"
              value={filters.year}
              onChange={(e) => setFilters({...filters, year: e.target.value})}
            >
              <option value="">All Years</option>
              <option value="First Year">First Year</option>
              <option value="Second Year">Second Year</option>
              <option value="Third Year">Third Year</option>
              <option value="Final Year">Final Year</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
               <ChevronRight className="rotate-90 text-slate-400" size={14} />
            </div>
          </div>

          <div className="relative group">
            <AlertTriangle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-500 transition-colors" size={16} />
            <select 
              className="w-full pl-10 pr-4 py-3 rounded-xl border-none bg-slate-50 focus:ring-2 focus:ring-blue-500 font-bold text-xs uppercase tracking-widest text-slate-600 appearance-none cursor-pointer hover:bg-slate-100 transition-all"
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
            >
              <option value="">All Readiness</option>
              <option value="high">High Readiness</option>
              <option value="medium">Medium Readiness</option>
              <option value="at-risk">At Risk</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
               <ChevronRight className="rotate-90 text-slate-400" size={14} />
            </div>
          </div>
        </div>
      </div>

      {/* Student Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">College & Batch</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Talent Score</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Placement Readiness</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium">Loading students...</td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium">No students found</td></tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black">
                          {student.full_name?.[0] || 'S'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{student.full_name || 'Incomplete Profile'}</p>
                          <p className="text-xs text-slate-500 font-medium">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-700">{student.college_name}</p>
                      {student.batch_status === 'INACTIVE' ? (
                        <div className="flex flex-col gap-1 items-start">
                          <span className="inline-block mt-0.5 bg-red-50 text-red-600 text-[10px] font-black uppercase px-2 py-0.5 rounded border border-red-100">
                            {student.batch_name || student.batch || 'Batch Inactive'}
                          </span>
                          <span className="text-[9px] font-bold text-red-500 uppercase tracking-wider">Restricted by Admin</span>
                        </div>
                      ) : student.batch ? (
                        <span className="inline-block mt-0.5 bg-blue-50 text-blue-600 text-[10px] font-black uppercase px-2 py-0.5 rounded">
                          {student.batch_name || student.batch}
                        </span>
                      ) : (
                        <span className="inline-block mt-0.5 bg-slate-100 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded">
                          No Batch Assigned
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500" 
                            style={{width: `${student.talent_score || 0}%`}}
                          />
                        </div>
                        <span className="text-sm font-black text-slate-700">{student.talent_score || 0}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getReadinessBadge(student.talent_score || 0)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedStudent(student)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="View Student details"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* Student Details Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xl shadow-inner">
                  {selectedStudent.full_name?.[0] || 'S'}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 leading-tight uppercase tracking-tight">{selectedStudent.full_name || 'Incomplete Profile'}</h3>
                  <p className="text-xs text-slate-400 font-bold mt-0.5">{selectedStudent.email}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedStudent(null)}
                className="text-slate-400 hover:text-slate-600 font-bold bg-white border border-slate-200 hover:bg-slate-50 p-2.5 rounded-full"
              >
                ✕
              </button>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto flex-1">
              {selectedStudent.batch_status === 'INACTIVE' && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
                  <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
                  <div>
                    <h5 className="font-black text-red-900 text-xs uppercase tracking-wider">Academic Batch Disabled</h5>
                    <p className="text-[11px] text-red-700 font-semibold mt-1">
                      This student belongs to an INACTIVE academic batch ({selectedStudent.batch_name || selectedStudent.batch}). TPO side interactions and placement operations are currently suspended.
                    </p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Institutional Affiliation</h4>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-xs font-black text-slate-900 uppercase">{selectedStudent.college_name}</p>
                    <p className="text-xs font-bold text-slate-500 mt-2">
                      Department: {(() => {
                        try {
                          const edu = typeof selectedStudent.education_json === 'string' ? JSON.parse(selectedStudent.education_json) : selectedStudent.education_json;
                          return edu?.department || 'Computer Science & Engineering';
                        } catch (e) {
                          return 'Computer Science & Engineering';
                        }
                      })()}
                    </p>
                    <p className="text-xs text-slate-400 font-bold mt-1">Status: Regular / Final Year</p>
                    {selectedStudent.batch && (
                      <p className="text-xs mt-2">
                        <span className="font-bold text-slate-500">Batch:</span>{' '}
                        <span className="bg-blue-50 border border-blue-100 text-blue-600 px-2 py-0.5 rounded text-[10px] font-black uppercase inline-block">
                          {selectedStudent.batch_name || selectedStudent.batch}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Placement Readiness</h4>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-slate-500">Talent Assessment Score</span>
                        <span className="text-xs font-black text-blue-600">{selectedStudent.talent_score || 0}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{width: `${selectedStudent.talent_score || 0}%`}} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-slate-500">Profile Completeness</span>
                        <span className="text-xs font-black text-green-600">{selectedStudent.completeness_score || 0}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500" style={{width: `${selectedStudent.completeness_score || 0}%`}} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Skills Inventory</h4>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    try {
                      const arr = typeof selectedStudent.skills_json === 'string' ? JSON.parse(selectedStudent.skills_json) : (selectedStudent.skills_json || []);
                      if (Array.isArray(arr) && arr.length > 0) {
                        return arr.map((sk: string, idx) => (
                          <span key={idx} className="bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-xl">
                            {sk}
                          </span>
                        ));
                      }
                    } catch(e) {}
                    return ['React', 'Node.js', 'SQL', 'Python', 'Critical Thinking'].map((sk, idx) => (
                      <span key={idx} className="bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold px-3 py-1.5 rounded-xl">
                        {sk}
                      </span>
                    ));
                  })()}
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Professional Documents</h4>
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
                      <FileText size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Standard Resume Document</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mt-0.5">Format: PDF (A4 Single page)</p>
                    </div>
                  </div>
                  {selectedStudent.resume_url ? (
                    <a 
                      href={selectedStudent.resume_url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow hover:bg-blue-700 transition"
                    >
                      View Resume
                    </a>
                  ) : (
                    <button 
                      onClick={() => toast('No resume file has been uploaded by the student yet.')}
                      className="px-4 py-2 bg-slate-200 text-slate-500 rounded-xl text-xs font-bold uppercase tracking-wider cursor-not-allowed"
                    >
                      Unavailable
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setSelectedStudent(null)}
                className="px-6 py-3 font-bold bg-slate-800 hover:bg-slate-900 text-white transition-all rounded-xl text-xs uppercase tracking-wider"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
