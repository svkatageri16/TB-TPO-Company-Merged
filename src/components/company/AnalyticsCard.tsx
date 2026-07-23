import React from 'react';
import { TrendingUp, TrendingDown } from "lucide-react";

interface AnalyticsCardProps {
  label: string;
  value: string | number;
  trend: string;
  trendUp: boolean;
  icon: React.ReactNode;
  color: 'blue' | 'purple' | 'emerald' | 'orange';
}

export function AnalyticsCard({ label, value, trend, trendUp, icon, color }: AnalyticsCardProps) {
  const colors = {
    blue: "text-blue-600 bg-blue-50 border-blue-100",
    purple: "text-purple-600 bg-purple-50 border-purple-100",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
    orange: "text-orange-600 bg-orange-50 border-orange-100"
  };

  return (
    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all">
      <div className={`p-3 rounded-2xl w-fit mb-4 ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
      <div className="flex items-end gap-3">
        <h3 className="text-3xl font-black text-slate-900 leading-none">{value}</h3>
        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border ${trendUp ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
          {trendUp ? <TrendingUp size={10} className="inline mr-1"/> : <TrendingDown size={10} className="inline mr-1"/>}
          {trend}
        </span>
      </div>
      <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:scale-110 transition-transform">
        {React.isValidElement(icon) && React.cloneElement(icon as React.ReactElement<any>, { size: 100 })}
      </div>
    </div>
  );
}
