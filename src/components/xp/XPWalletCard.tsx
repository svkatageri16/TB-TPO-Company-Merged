import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Coins, Flame, Zap, ArrowUpRight, ChevronRight, Sparkles, AlertCircle } from 'lucide-react';
import { xpService } from '../../services/xpService';
import toast from 'react-hot-toast';

export const XPWalletCard: React.FC = () => {
  const [balanceData, setBalanceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  const fetchBalance = async () => {
    try {
      const data = await xpService.getBalance();
      setBalanceData(data.balance);
    } catch (error) {
      console.error("Error fetching balance:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleUpdate = () => {
      fetchBalance();
    };
    fetchBalance();
    window.addEventListener('xp_updated', handleUpdate);
    return () => window.removeEventListener('xp_updated', handleUpdate);
  }, []);

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const res = await xpService.claimDailyReward();
      toast.success(`Claimed ${res.rewardAmount} XP! Streak: ${res.newStreak} days`);
      fetchBalance();
      window.dispatchEvent(new CustomEvent('xp_updated'));
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to claim reward");
    } finally {
      setClaiming(false);
    }
  };

  if (loading) return (
    <div className="h-64 bg-slate-900/40 border border-slate-800/80 animate-pulse rounded-3xl flex flex-col items-center justify-center gap-3">
      <Coins className="w-8 h-8 text-amber-500/50 animate-spin" />
      <span className="text-xs text-slate-500 font-bold tracking-widest uppercase">Calculating balance...</span>
    </div>
  );

  const isClaimable = () => {
    if (!balanceData?.last_reward_claimed_at) return true;
    const lastClaim = new Date(balanceData.last_reward_claimed_at);
    const now = new Date();
    const isSameDay = lastClaim.getUTCFullYear() === now.getUTCFullYear() &&
                      lastClaim.getUTCMonth() === now.getUTCMonth() &&
                      lastClaim.getUTCDate() === now.getUTCDate();
    return !isSameDay;
  };

  // Calculate generic progress for current streak level (e.g. up to 7 days max for standard design indicators)
  const streakProgress = Math.min(((balanceData?.login_streak || 0) / 7) * 100, 100);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden group rounded-3xl"
    >
      {/* Dynamic Ambient Backlight Glow */}
      <div className="absolute -inset-1.5 bg-gradient-to-r from-amber-500 via-yellow-600 to-indigo-600 rounded-[2rem] blur opacity-25 group-hover:opacity-40 transition duration-700 group-hover:duration-300"></div>
      
      <div className="relative bg-[#0d1321] border border-slate-800/80 rounded-[1.8rem] p-6 lg:p-7 shadow-2xl overflow-hidden flex flex-col justify-between h-full min-h-[340px]">
        
        {/* Subtle high-tech diagonal lines and circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-amber-500/10 via-transparent to-transparent rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-48 h-48 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>
        
        {/* Top bar: Balance & Streak Info */}
        <div className="relative z-10 space-y-5">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 text-black shrink-0 relative">
                <Coins className="w-6 h-6 animate-pulse" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#0d1321]"></span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none block mb-1">Available Funds</span>
                <div className="flex items-baseline gap-1.5 leading-tight">
                  <span className="text-4xl font-extrabold text-white tracking-tighter tabular-nums">
                    {(balanceData?.xp_balance || 0).toLocaleString()}
                  </span>
                  <span className="text-amber-400 font-black text-xs uppercase tracking-wider">XP</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 to-orange-600/20 text-amber-300 px-3 py-1.5 rounded-2xl text-[10px] uppercase font-black border border-amber-500/30 shadow-md">
                <Flame className="w-3.5 h-3.5 fill-current text-amber-400 animate-bounce" />
                <span>{balanceData?.login_streak || 0} Day Streak</span>
              </div>
              <p className="text-[9px] text-slate-500 mt-2 font-mono uppercase tracking-widest font-black">
                Mocks Remaining: <span className="text-slate-300 font-bold">{balanceData?.free_mock_count || 0}</span>
              </p>
            </div>
          </div>

          {/* Streak Progress visual element */}
          <div className="space-y-2 pt-1">
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1"><Sparkles size={11} className="text-amber-400" /> Daily Login Streak Progress</span>
              <span className="text-amber-400">{balanceData?.login_streak || 0}/7 Days</span>
            </div>
            <div className="h-2 bg-slate-900 rounded-full overflow-hidden p-[2px] border border-slate-800/80">
              <div 
                className="h-full bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full transition-all duration-1000 ease-out shadow-inner"
                style={{ width: `${streakProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Dynamic Key Information Metrics */}
        <div className="relative z-10 grid grid-cols-2 gap-4 my-5">
          <div className="bg-slate-950/60 rounded-2xl p-3.5 border border-slate-800/80 flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400">XP Utility</span>
            </div>
            <p className="text-xs text-white font-bold leading-none mt-2">1 Interview = 125 XP</p>
          </div>
          <div className="bg-slate-950/60 rounded-2xl p-3.5 border border-slate-800/80 flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400">Top Earning Method</span>
            </div>
            <p className="text-xs text-white font-bold leading-none mt-2">Referral = 60 XP</p>
          </div>
        </div>

        {/* Action Controls Section */}
        <div className="relative z-10 flex gap-3 mt-1.5">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleClaim}
            disabled={!isClaimable() || claiming}
            className={`flex-1 flex items-center justify-center gap-2.5 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-xl ${
              isClaimable() 
              ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-black shadow-amber-500/10 hover:shadow-amber-500/20 hover:brightness-105 active:brightness-95' 
              : 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed shadow-inner'
            }`}
          >
            {claiming ? (
              <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            ) : isClaimable() ? (
              <>
                <Sparkles size={14} className="animate-spin text-black" />
                Claim Daily XP Reward
              </>
            ) : (
              <div className="flex items-center gap-1.5 text-slate-500">
                <AlertCircle size={13} className="text-slate-600" />
                <span>Claimed for Today</span>
              </div>
            )}
          </motion.button>
          
          <button 
            onClick={() => window.location.href = "/xp-store"}
            title="Go to store"
            className="p-4 bg-slate-900/80 hover:bg-slate-850 text-slate-350 hover:text-white rounded-2xl border border-slate-800/80 transition-all shadow-lg cursor-pointer group/btn duration-150 flex items-center justify-center"
          >
            <ChevronRight className="w-5 h-5 group-hover/btn:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
