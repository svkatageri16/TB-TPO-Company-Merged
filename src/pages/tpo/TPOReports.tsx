import React from 'react';
import { 
  FileText, 
  Download, 
  PieChart, 
  Users, 
  TrendingUp,
  FileSpreadsheet,
  ArrowRight,
  Shield
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

export default function TPOReports() {
  const handleGenerate = async (title: string, type: string) => {
    toast.success(`Generating ${title}... Your download will start shortly.`, {
      icon: '📄',
      style: { borderRadius: '16px' }
    });

    try {
      const response = await api.get(`/tpo/reports/download?type=${type}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_report_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Failed to download report');
    }
  };

  const reportTemplates = [
    { title: 'Master Placement Blueprint', desc: 'Comprehensive PDF detailing department scores, active drive pipelines, and AI skill gaps.', icon: Shield, type: 'MASTER', color: 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' },
    { title: 'Placement Performance Summary', desc: 'Overview of selections, packages, and company participation.', icon: PieChart, type: 'SUMMARY', color: 'bg-blue-100 text-blue-600' },
    { title: 'Student Eligibility List', desc: 'Detailed list of students matching current placement criteria.', icon: Users, type: 'ELIGIBILITY', color: 'bg-green-100 text-green-600' },
    { title: 'Skill Gap & Training Needs', icon: TrendingUp, desc: 'AI-generated report on missing skills and training recommendations.', type: 'SKILLGAP', color: 'bg-purple-100 text-purple-600' },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportTemplates.map((report, idx) => (
          <div key={idx} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group cursor-pointer">
            <div className="flex items-start justify-between mb-6">
              <div className={`${report.color} p-4 rounded-2xl`}>
                <report.icon size={28} />
              </div>
              <span className="bg-slate-50 text-slate-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">PDF</span>
            </div>
            <h3 className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">{report.title}</h3>
            <p className="text-sm text-slate-500 font-medium mt-2 leading-relaxed">{report.desc}</p>
            <button 
              onClick={() => handleGenerate(report.title, report.type)}
              className="mt-8 w-full flex items-center justify-center gap-2 py-4 bg-slate-50 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-600 hover:text-white transition-all"
            >
              <Download size={16} />
              Generate Report
            </button>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 translate-x-1/4 translate-y-1/4">
          <FileText size={200} />
        </div>
        <div className="relative z-10 max-w-lg">
          <h3 className="text-xl font-black uppercase tracking-tight italic mb-4">Custom Data Export</h3>
          <p className="text-slate-400 text-sm font-medium mb-6 leading-relaxed">
            Need specific data for university audits or NAAC accreditation? Use our custom builder to filter and export any dataset.
          </p>
          <button 
            onClick={() => toast('Custom Report Builder is currently in development.')}
            className="flex items-center gap-2 px-8 py-3 bg-blue-600 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
          >
            Open Builder <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
