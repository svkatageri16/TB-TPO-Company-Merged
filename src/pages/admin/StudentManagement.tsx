import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Search, 
  MoreVertical, 
  ShieldCheck, 
  ShieldAlert,
  Eye,
  FileText,
  UserX,
  UserCheck
} from 'lucide-react';
import api from '../../services/api';

export function StudentManagement() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [modalTab, setModalTab] = useState<'profile' | 'activity'>('profile');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const { data } = await api.get('/admin/users');
      if (data.success) {
        setStudents(data.data.filter((u: any) => u.role === 'STUDENT'));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (student: any) => {
    try {
       const { data } = await api.get(`/admin/students/${student.id}/details`);
       if (data.success) {
          setSelectedStudent(data.data);
       }
    } catch (e) {
       setSelectedStudent({ user: student, profile: null });
    }
  };

  const handleStatusChange = async (userId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    if (!confirm(`Are you sure you want to ${newStatus === 'ACTIVE' ? 'unban' : 'suspend'} this student?`)) return;

    try {
      const { data } = await api.patch(`/admin/users/${userId}/status`, { status: newStatus });
      if (data.success) {
        setStudents(students.map(s => s.id === userId ? { ...s, status: newStatus } : s));
      }
    } catch (error) {
       alert("Action failed");
    }
  };

  const filtered = students.filter(s => 
    s.student_name?.toLowerCase().includes(search.toLowerCase()) || 
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Student Management</h1>
          <p className="text-slate-500 font-medium">Monitor and moderate student activities.</p>
        </div>
        <div className="relative w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search students..." 
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Talent Score</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Joined</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((student, idx) => (
              <motion.tr 
                key={student.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="group hover:bg-slate-50/50 transition-all"
              >
                <td className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-black text-xs">
                      {student.student_name?.[0] || student.email[0].toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase leading-tight">
                        {student.student_name || 'Incomplete Profile'}
                      </h4>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">{student.email}</p>
                    </div>
                  </div>
                </td>
                <td className="p-6 text-center">
                   <div className="flex flex-col items-start gap-1">
                      <div className="w-full max-w-[100px] h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${student.completeness_score > 70 ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${student.completeness_score}%` }} />
                      </div>
                      <span className="text-[10px] font-black text-slate-900">{student.completeness_score || 0}%</span>
                   </div>
                </td>
                <td className="p-6">
                  <span className={`text-[8px] font-black px-2 py-1 rounded uppercase flex items-center gap-1 w-fit ${
                    student.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {student.status === 'ACTIVE' ? <ShieldCheck size={10} /> : <ShieldAlert size={10} />}
                    {student.status}
                  </span>
                </td>
                <td className="p-6">
                  <p className="text-[10px] font-black text-slate-900 uppercase">
                    {new Date(student.created_at).toLocaleDateString()}
                  </p>
                </td>
                <td className="p-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => handleViewDetails(student)}
                      className="p-2 text-slate-400 hover:text-blue-600 transition-all hover:bg-blue-50 rounded-lg" 
                      title="View Profile"
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      onClick={() => handleStatusChange(student.id, student.status)}
                      className={`p-2 transition-all rounded-lg ${
                        student.status === 'ACTIVE' ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50 shadow-sm'
                      }`} 
                      title={student.status === 'ACTIVE' ? 'Suspend' : 'Unsuspend'}
                    >
                      {student.status === 'ACTIVE' ? <UserX size={16} /> : <UserCheck size={16} />}
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
            {filtered.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="p-20 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <Users size={48} className="text-slate-200" />
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">No students matched your search</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Student Details Modal */}
      <AnimatePresence>
        {selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
            >
               <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-lg overflow-hidden">
                      {selectedStudent.profile?.profile_photo_url ? (
                        <img src={api.defaults.baseURL?.replace('/api', '') + selectedStudent.profile.profile_photo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        selectedStudent.profile?.full_name?.[0] || '?'
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-900 uppercase">{selectedStudent.profile?.full_name || selectedStudent.user?.email || 'Unknown User'}</h2>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-widest leading-none">{selectedStudent.user?.email}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedStudent(null)} className="text-[10px] font-black text-slate-400 hover:text-slate-900 uppercase bg-white px-3 py-1.5 rounded-lg border border-slate-200">CLOSE</button>
               </div>
               
               <div className="flex px-8 border-b border-slate-100/60 bg-slate-50/50">
                 <button 
                   onClick={() => setModalTab('profile')}
                   className={`uppercase text-[10px] font-black px-4 py-3 tracking-widest border-b-2 ${modalTab === 'profile' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                 >
                   Profile details
                 </button>
                 <button 
                   onClick={() => setModalTab('activity')}
                   className={`uppercase text-[10px] font-black px-4 py-3 tracking-widest border-b-2 ${modalTab === 'activity' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                 >
                   Activity Logs
                 </button>
               </div>

               <div className="p-8 overflow-y-auto space-y-8">
                  {modalTab === 'profile' ? (
                    <>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                         <div className="space-y-1 p-4 bg-slate-50 rounded-2xl">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Talent Score</p>
                        <p className="text-xl font-black text-blue-600">{selectedStudent.profile?.completeness_score || 0}%</p>
                     </div>
                     <div className="space-y-1 p-4 bg-slate-50 rounded-2xl">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Account Status</p>
                        <p className={`text-sm font-black ${selectedStudent.user?.status === 'ACTIVE' ? 'text-emerald-600' : 'text-red-600'}`}>
                           {selectedStudent.user?.status}
                        </p>
                     </div>
                     <div className="space-y-1 p-4 bg-slate-50 rounded-2xl">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Total Applications</p>
                        <p className="text-xl font-black text-slate-900">{selectedStudent.applications?.length || 0}</p>
                     </div>
                     <div className="space-y-1 p-4 bg-slate-50 rounded-2xl">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Role Preference</p>
                        <p className="text-sm font-black text-slate-900">{selectedStudent.profile?.preferred_job_role || 'Not Set'}</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <h3 className="text-xs font-black text-slate-900 uppercase flex items-center gap-2">
                           <FileText size={14} className="text-blue-600" />
                           Bio & Skills
                        </h3>
                        <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4">
                           <div>
                             <p className="text-[10px] font-black text-slate-400 uppercase">Bio / About</p>
                             <p className="text-sm font-medium text-slate-600 mt-1">{selectedStudent.profile?.bio || 'No bio provided'}</p>
                           </div>
                           <hr className="border-slate-50" />
                           <div>
                             <p className="text-[10px] font-black text-slate-400 uppercase">Skills & Competencies</p>
                             <div className="flex flex-wrap gap-2 mt-2">
                                {(() => {
                                   let skills = [];
                                   try {
                                      if (typeof selectedStudent.profile?.skills_json === 'string') {
                                         skills = JSON.parse(selectedStudent.profile.skills_json);
                                      }
                                   } catch (e) {
                                      // ignore
                                   }
                                   if (skills.length === 0) return <p className="text-xs italic text-slate-400">No skills listed</p>;
                                   return skills.map((skill: string) => (
                                      <span key={skill} className="px-2 py-1 bg-slate-50 border border-slate-200 text-[9px] font-black uppercase text-slate-600 rounded">
                                         {skill}
                                      </span>
                                   ));
                                })()}
                             </div>
                           </div>
                        </div>

                        {selectedStudent.experience?.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="text-xs font-black text-slate-900 uppercase">Experience</h3>
                            {selectedStudent.experience.map((exp: any) => (
                              <div key={exp.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-sm font-bold text-slate-900">{exp.role} @ {exp.company}</p>
                                <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">
                                  {exp.start_date ? new Date(exp.start_date).getFullYear() : ''} - 
                                  {exp.is_current ? 'Present' : (exp.end_date ? new Date(exp.end_date).getFullYear() : '')}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        {selectedStudent.education?.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="text-xs font-black text-slate-900 uppercase">Education</h3>
                            {selectedStudent.education.map((edu: any) => (
                              <div key={edu.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-sm font-bold text-slate-900">{edu.degree} {edu.field_of_study ? `in ${edu.field_of_study}` : ''}</p>
                                <p className="text-xs text-slate-600">{edu.institution}</p>
                              </div>
                            ))}
                          </div>
                        )}
                    </div>

                    <div className="space-y-6">
                       {/* Onboarding Preferences Section */}
                       <div className="space-y-4">
                          <h3 className="text-xs font-black text-slate-900 uppercase flex items-center gap-2">
                             <span className="text-violet-500 font-extrabold">✨</span>
                             Onboarding Preferences
                          </h3>
                          <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4">
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                   <p className="text-[10px] font-black text-slate-400 uppercase">Target Industry</p>
                                   <p className="text-xs font-black text-slate-700 capitalize mt-1">
                                      {selectedStudent.profile?.onboarding_industry || 'Not Onboarded'}
                                   </p>
                                </div>
                                <div>
                                   <p className="text-[10px] font-black text-slate-400 uppercase">Job Search Status</p>
                                   <p className="text-xs font-black text-slate-700 capitalize mt-1">
                                      {selectedStudent.profile?.onboarding_status === 'actively_looking' ? 'Actively Looking' : 
                                       selectedStudent.profile?.onboarding_status === 'open' ? 'Open to Offers' : 
                                       selectedStudent.profile?.onboarding_status === 'closed' ? 'Closed to Offers' : 'Not Onboarded'}
                                   </p>
                                </div>
                                <div>
                                   <p className="text-[10px] font-black text-slate-400 uppercase">Acquisition Channel</p>
                                   <p className="text-xs font-black text-slate-700 capitalize mt-1">
                                      {selectedStudent.profile?.onboarding_source || 'Not Onboarded'}
                                   </p>
                                </div>
                                <div>
                                   <p className="text-[10px] font-black text-slate-400 uppercase">Completed Onboarding</p>
                                   <span className={`inline-flex px-2 py-0.5 text-[9px] font-black uppercase rounded mt-1 ${
                                      selectedStudent.profile?.onboarding_completed 
                                         ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                                         : 'bg-slate-50 text-slate-500 border border-slate-200'
                                   }`}>
                                      {selectedStudent.profile?.onboarding_completed ? 'COMPLETE' : 'PENDING'}
                                   </span>
                                </div>
                             </div>
                             
                             {selectedStudent.profile?.onboarding_help_actions && (
                                <div className="pt-2 border-t border-slate-50">
                                   <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Help Objectives</p>
                                   <div className="flex flex-wrap gap-2">
                                      {(() => {
                                         let actions = [];
                                         try {
                                            if (typeof selectedStudent.profile.onboarding_help_actions === 'string') {
                                               actions = JSON.parse(selectedStudent.profile.onboarding_help_actions);
                                            } else if (Array.isArray(selectedStudent.profile.onboarding_help_actions)) {
                                               actions = selectedStudent.profile.onboarding_help_actions;
                                            }
                                         } catch(e) {}
                                         if (actions.length === 0) return <p className="text-[10px] italic text-slate-400">None selected</p>;
                                         return actions.map((act: string) => (
                                            <span key={act} className="px-2 py-0.5 bg-violet-50 text-violet-600 border border-violet-100 text-[9px] font-black uppercase rounded">
                                               {act === 'resume' ? 'Build ATS Resume' : act === 'jobs' ? 'Track Applications' : act}
                                            </span>
                                         ));
                                      })()}
                                   </div>
                                </div>
                             )}
                          </div>
                       </div>

                      <div className="space-y-4">
                        <h3 className="text-xs font-black text-slate-900 uppercase flex items-center gap-2">
                           <Users size={14} className="text-blue-600" />
                           Recent Applications
                        </h3>
                        {selectedStudent.applications?.length > 0 ? (
                          <div className="space-y-3">
                            {selectedStudent.applications.slice(0, 5).map((app: any) => (
                              <div key={app.id} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
                                <div>
                                  <p className="text-sm font-bold text-slate-900">{app.job_title}</p>
                                  <p className="text-xs text-slate-500">{app.company_name}</p>
                                </div>
                                <span className={`text-[9px] font-black uppercase px-2 py-1 rounded bg-slate-100 text-slate-600`}>
                                  {app.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                           <div className="bg-slate-50 p-6 rounded-2xl text-center">
                              <p className="text-xs font-medium text-slate-500">No applications submitted yet.</p>
                           </div>
                        )}
                      </div>

                      {selectedStudent.projects?.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="text-xs font-black text-slate-900 uppercase">Projects</h3>
                          {selectedStudent.projects.map((proj: any) => (
                            <div key={proj.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                              <p className="text-sm font-bold text-slate-900">{proj.title}</p>
                              <p className="text-xs text-slate-600 line-clamp-2 mt-1">{proj.description}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  </>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div>
                          <p className="text-xs font-black text-slate-500 uppercase">Total Tracked Actions</p>
                          <p className="text-lg font-black text-slate-900">{selectedStudent.activityLogs?.length || 0}</p>
                        </div>
                      </div>
                      
                      {selectedStudent.activityLogs?.length > 0 ? (
                        <div className="space-y-3">
                          {selectedStudent.activityLogs.map((log: any, idx: number) => (
                            <div key={idx} className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div>
                                <p className="text-sm font-bold text-slate-900 font-mono bg-slate-100 px-2 py-1 rounded inline-block">{log.path}</p>
                                <p className="text-xs text-slate-500 mt-1 uppercase font-bold tracking-wider">{log.action}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-black text-slate-900">{log.duration_seconds}s</p>
                                <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">{new Date(log.created_at).toLocaleString()}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-slate-50 p-6 rounded-2xl text-center border border-dashed border-slate-200">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">No activity tracked yet.</p>
                        </div>
                      )}
                    </div>
                  )}
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
