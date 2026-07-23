import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Share2, Copy, CheckCircle2, Gift, Users, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api.ts';

interface ReferralSectionProps {
  referralCode: string;
}

export const ReferralSection: React.FC<ReferralSectionProps> = ({ referralCode }) => {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ count: 0, earned: 0 });
  const referralLink = `${window.location.origin}/register?ref=${referralCode || ''}`;

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/xp/referrals');
        if (data.success) {
          setStats({
            count: data.referrals.length,
            earned: data.referrals.length * 60 // Assuming 60 XP per referral
          });
        }
      } catch (err) {
        console.error('Error fetching referral stats:', err);
      } finally {
        setLoading(false);
      }
    };
    if (referralCode) fetchStats();
  }, [referralCode]);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join VEGA',
          text: `Use my referral code ${referralCode} to join VEGA and prep for placement!`,
          url: referralLink,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      handleCopy();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0f172a] border border-slate-800/80 rounded-[1.8rem] p-6 lg:p-7 relative overflow-hidden flex flex-col justify-between h-full min-h-[340px]"
    >
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-36 h-36 bg-purple-500/10 rounded-full blur-2xl pointer-events-none"></div>

      <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
        <div>
          <div className="flex items-center gap-3.5 mb-5">
            <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 shrink-0">
              <Gift className="w-5.5 h-5.5" />
            </div>
            <div>
              <h3 className="text-white font-extrabold text-base tracking-tight leading-none mb-1">Refer & Earn XP</h3>
              <p className="text-slate-400 text-xs">Spread the word, level up together</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-[9px] uppercase font-black tracking-widest text-[#94a3b8] block mb-1">Your Referral Reward</span>
                <div className="flex items-baseline gap-1.5 leading-none">
                  <span className="text-2xl font-black text-indigo-400">+60</span>
                  <span className="text-[10px] font-extrabold text-slate-350 uppercase">XP Per Friend</span>
                </div>
              </div>
              <div className="px-3 py-1.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-[10px] uppercase font-black tracking-wider text-indigo-300">
                ACTIVE
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] uppercase font-black tracking-widest text-[#475569]">Your Personal Invite URL</label>
              <div className="flex bg-slate-900/80 rounded-2xl border border-slate-800 p-1 group focus-within:border-indigo-500/50 transition-colors">
                <input 
                  type="text" 
                  readOnly 
                  value={referralLink}
                  className="bg-transparent border-none focus:ring-0 text-slate-350 text-[11px] font-mono flex-1 px-3 py-2 overflow-hidden text-ellipsis whitespace-nowrap outline-none"
                />
                <button 
                  onClick={handleCopy}
                  className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div>
          <button 
            onClick={handleShare}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-widest py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-indigo-950/40 cursor-pointer border border-indigo-500/30"
          >
            <Share2 className="w-4 h-4" />
            Share with Friends
          </button>

          <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono font-black uppercase tracking-widest text-slate-400">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>{loading ? "..." : stats.count} Registered</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>{loading ? "..." : stats.earned} XP Earned</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
