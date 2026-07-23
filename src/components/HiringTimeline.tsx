import React, { useState, useEffect } from "react";
import api from "../services/api.ts";
import { Check, Clock, X } from "lucide-react";
import { motion } from "motion/react";

interface Stage {
  id: number;
  stage_name: string;
  stage_order: number;
  stage_type: string;
}

interface HistoryItem {
  stage_id: number;
  action: string;
  created_at: string;
  notes: string;
}

export function HiringTimeline({ applicationId }: { applicationId: number }) {
  const [stages, setStages] = useState<Stage[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (applicationId) {
      fetchTimeline();
      const interval = setInterval(fetchTimeline, 30000);
      return () => clearInterval(interval);
    }
  }, [applicationId]);

  const fetchTimeline = async () => {
    if (!applicationId) return;
    try {
      const { data } = await api.get(`/jobs/application/${applicationId}/timeline`);
      if (data.success) {
        setStages(data.data.stages);
        setHistory(data.data.history);
        setApplication(data.data.application);
      }
    } catch (e) {
      console.error("Error fetching timeline:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="h-20 animate-pulse bg-slate-100 rounded-2xl" />;

  const isRejected = application?.status === 'REJECTED';
  const isSelected = application?.status === 'SELECTED';

  return (
    <div className="w-full mt-8 overflow-x-auto pb-4 scrollbar-hide">
      <div className="min-w-[600px] relative px-4">
        {/* Connection Line */}
        <div className="absolute top-4 left-8 right-8 h-1 bg-slate-100 rounded-full" />
        
        {/* Progress Line */}
        {!isRejected && (
          <motion.div 
            initial={{ width: 0 }}
            animate={{ 
              width: calculationProgressWidth(stages, application?.current_stage_id, isSelected)
            }}
            className="absolute top-4 left-8 h-1 bg-emerald-500 rounded-full z-0 transition-all duration-1000"
          />
        )}

        <div className="relative flex justify-between">
          {stages.map((stage) => {
            const stageHistory = history.filter(h => h.stage_id === stage.id);
            const isCompleted = isStageCompleted(stage, application?.current_stage_id, isSelected, stages);
            const isCurrent = application?.current_stage_id === stage.id && !isRejected;
            const isRejectedHere = isRejected && application?.current_stage_id === stage.id;
            const completionDate = stageHistory[stageHistory.length - 1]?.created_at;

            return (
              <div key={stage.id} className="flex flex-col items-center flex-1 z-10 px-2">
                <div 
                  className={`w-9 h-9 rounded-full flex items-center justify-center border-4 transition-all duration-500 ${
                    isCompleted 
                      ? "bg-emerald-500 border-emerald-50 text-white shadow-lg shadow-emerald-500/20" 
                      : isRejectedHere
                        ? "bg-red-500 border-red-50 text-white shadow-lg shadow-red-500/20"
                        : isCurrent
                          ? "bg-white border-emerald-500 text-emerald-500"
                          : "bg-white border-slate-200 text-slate-300"
                  }`}
                >
                  {isCompleted ? <Check size={16} strokeWidth={4} /> : isRejectedHere ? <X size={16} strokeWidth={4} /> : <div className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
                </div>

                <div className="mt-4 text-center">
                  <p className={`text-[11px] font-black uppercase tracking-widest ${isCurrent || isCompleted || isRejectedHere ? 'text-slate-900' : 'text-slate-400'}`}>
                    {stage.stage_name}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                    {completionDate ? new Date(completionDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : isCurrent ? "Ongoing" : "Pending"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function isStageCompleted(stage: Stage, currentStageId: number, isSelected: boolean, allStages: Stage[]) {
  if (isSelected) return true;
  const currentStage = allStages.find(s => s.id === currentStageId);
  if (!currentStage) return false;
  return stage.stage_order < currentStage.stage_order;
}

function calculationProgressWidth(stages: Stage[], currentStageId: number, isSelected: boolean) {
  if (isSelected) return "100%";
  if (stages.length <= 1) return "0%";
  
  const currentStage = stages.find(s => s.id === currentStageId);
  if (!currentStage) return "0%";
  
  const totalStages = stages.length;
  const currentIdx = stages.indexOf(currentStage);
  
  return `${(currentIdx / (totalStages - 1)) * 100}%`;
}
